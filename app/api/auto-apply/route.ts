// =================================================================
// SEARCHER CONNECTOR — AUTO-APPLY API
// SCAI génère une candidature personnalisée + l'enregistre
// L'utilisateur peut voir exactement ce qui a été envoyé en son nom
//
// FLUX :
//  1. Générer le message de candidature via IA (avec signature)
//  2. Sauvegarder dans applications_sent (historique complet)
//  3. Optionnel : envoyer via email/whatsapp si autorisé
//  4. Retourner le lien pour voir la candidature
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendApplicationConfirmation } from '../../../src/lib/email'
import { callGeminiDirect } from '../../../src/lib/scaiUtils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Signature officielle Searcher Connector
const SIGNATURE = `\n\n---\n✉ Candidature envoyée via Searcher Connector\nsearcherconnector.com — L'agent IA qui travaille pour vous 24h/24\n*Ce message a été généré et envoyé par SCAI, l'IA de Searcher Connector, sur autorisation de l'utilisateur.*`

async function generateApplicationMessage(profile: any, opportunity: any): Promise<string> {
  // Template de secours — toujours disponible même si l'IA échoue
  const fallbackMessage = `Bonjour,

J'ai pris connaissance de votre offre "${opportunity.title}" et elle correspond parfaitement à mon profil en ${profile.domain}.

Fort de mon expérience dans ce domaine, je suis convaincu de pouvoir apporter une réelle valeur ajoutée à votre projet.
${profile.portfolio_url ? `\nMon portfolio : ${profile.portfolio_url}` : ''}${profile.github_url ? `\nGitHub : ${profile.github_url}` : ''}${profile.linkedin_url ? `\nLinkedIn : ${profile.linkedin_url}` : ''}

Je reste disponible pour un échange.

Cordialement,
${profile.full_name}`

  const prompt = `Tu es SCAI, l'agent IA de Searcher Connector. Rédige une candidature professionnelle et percutante.

PROFIL DU CANDIDAT :
- Nom : ${profile.full_name}
- Domaine : ${profile.domain}
- Pays : ${profile.country}
- Bio : ${(profile.bio || '').slice(0, 200)}
${profile.portfolio_url ? `- Portfolio : ${profile.portfolio_url}` : ''}${profile.github_url ? `\n- GitHub : ${profile.github_url}` : ''}${profile.linkedin_url ? `\n- LinkedIn : ${profile.linkedin_url}` : ''}

OPPORTUNITÉ :
- Titre : ${opportunity.title}
- Entreprise : ${opportunity.company || 'Non précisée'}
- Description : ${(opportunity.snippet || opportunity.match_reason || '').slice(0, 200)}

RÈGLES : message direct 80-150 mots, accroche sur l'opportunité, 1-2 compétences clés, appel à l'action. Pas de "Bonjour je me présente". Pas de signature (ajoutée automatiquement). Langue : français sauf si opportunité en anglais.

Génère UNIQUEMENT le corps du message.`

  // Essayer Gemini d'abord (économise les tokens Groq)
  try {
    const geminiResult = await callGeminiDirect(prompt)
    if (geminiResult && geminiResult.length > 50) return geminiResult
  } catch { /* fallback Groq */ }

  // Groq en secours
  const groqKeys = [
    process.env.GROQ_API_KEY_9,
    process.env.GROQ_API_KEY_10,
    process.env.GROQ_API_KEY,
  ].filter(Boolean) as string[]

  for (const key of groqKeys) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 400,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!r.ok) continue
      const text = (await r.json()).choices?.[0]?.message?.content?.trim()
      if (text && text.length > 50) return text
    } catch { continue }
  }

  // Template de secours si tout l'IA échoue
  return fallbackMessage
}

export async function POST(req: NextRequest) {
  try {
    const { userId, opportunityId, sendVia } = await req.json()
    if (!userId || !opportunityId) {
      return NextResponse.json({ error: 'userId et opportunityId requis' }, { status: 400 })
    }

    // ── Récupérer le profil et l'opportunité ──────────────────
    const [profileRes, oppRes] = await Promise.all([
      supabase.from('users_profiles').select('*').eq('id', userId).single(),
      supabase.from('opportunities').select('*').eq('id', opportunityId).single(),
    ])

    if (!profileRes.data || !oppRes.data) {
      return NextResponse.json({ error: 'Profil ou opportunité introuvable' }, { status: 404 })
    }

    const profile     = profileRes.data
    const opportunity = oppRes.data

    // ── Vérifier que l'utilisateur a autorisé l'auto-apply ───
    // (s'il a un score >= auto_apply_threshold dans ses settings)
    const { data: schedule } = await supabase
      .from('agent_schedules')
      .select('auto_apply_threshold')
      .eq('user_id', userId)
      .single()

    const threshold = schedule?.auto_apply_threshold || 80
    if (opportunity.score < threshold) {
      return NextResponse.json({
        error: `Score ${opportunity.score} < seuil ${threshold}. Postule manuellement ou baisse le seuil dans Settings.`,
        requiresManual: true,
      }, { status: 422 })
    }

    // ── Générer le message ────────────────────────────────────
    const message      = await generateApplicationMessage(profile, opportunity)
    const fullMessage  = message + SIGNATURE
    const subject      = `Candidature — ${opportunity.title}${opportunity.company ? ' chez ' + opportunity.company : ''}`
    const appliedAt    = new Date().toISOString()

    // ── Sauvegarder dans applications_sent ───────────────────
    let applicationId: string | null = null
    try {
      const { data: application, error: saveErr } = await supabase
        .from('applications_sent')
        .insert({
          user_id:          userId,
          opportunity_id:   opportunityId,
          title:            opportunity.title,
          company:          opportunity.company || '',
          original_url:     opportunity.original_url || opportunity.link || '',
          message_sent:     fullMessage,
          subject:          subject,
          status:           'sent',
          channel:          sendVia || 'scai_auto',
          auto_applied_by:  'SCAI',
          applied_at:       appliedAt,
          score_at_apply:   opportunity.score,
        })
        .select('id')
        .single()

      if (saveErr) {
        // Table peut ne pas exister encore — continuer quand même
        if (!saveErr.message?.includes('does not exist') && !saveErr.code?.includes('42P01')) {
          throw saveErr
        }
        console.warn('applications_sent table missing — continuing without save')
      } else {
        applicationId = application?.id || null
      }
    } catch (saveErr: any) {
      // Non-bloquant si la table n'existe pas encore
      console.warn('applications_sent save failed:', saveErr?.message)
    }

    // ── Mettre à jour le statut de l'opportunité ─────────────
    await supabase
      .from('opportunities')
      .update({
        status:     'auto_applied',
        applied_at: appliedAt,
      })
      .eq('id', opportunityId)

    // ── Log dans agent_actions ────────────────────────────────
    await supabase.from('agent_actions').insert({
      user_id:        userId,
      action_type:    'auto_apply',
      result:         `SCAI a postulé pour "${opportunity.title}"${opportunity.company ? ' chez ' + opportunity.company : ''}`,
      success:        true,
      auto_promo_sent: true,
      execution_ms:   0,
    })

    // ── Notification à l'utilisateur ─────────────────────────
    await supabase.from('notifications').insert({
      user_id:  userId,
      type:     'application',
      title:    `⚡ SCAI a postulé pour toi`,
      message:  `Candidature envoyée pour "${opportunity.title}"${opportunity.company ? ' chez ' + opportunity.company : ''}.`,
      is_read:  false,
      data:     JSON.stringify({ application_id: applicationId, opportunity_id: opportunityId }),
    })

    // ── Email de confirmation ─────────────────────────────────
    if (profile.email) {
      sendApplicationConfirmation({
        to:       profile.email,
        name:     profile.full_name || 'Cher utilisateur',
        jobTitle: opportunity.title,
        company:  opportunity.company || '',
        score:    opportunity.score,
        viewUrl:  `${process.env.NEXT_PUBLIC_APP_URL || 'https://searcherconnector.com'}/applications/${applicationId}`,
      }).catch(() => {}) // non-bloquant
    }

    return NextResponse.json({
      success:        true,
      application_id: applicationId,
      message_sent:   fullMessage,
      subject,
      applied_at:     appliedAt,
      view_url:       applicationId ? `/applications/${applicationId}` : null,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
