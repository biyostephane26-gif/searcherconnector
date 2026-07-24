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
import { checkRateLimit } from '../../../src/lib/rateLimiter'
import { planTier } from '../../../src/lib/planUtils'
import { planConfig } from '../../../src/lib/planConfig'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Signature officielle Searcher Connector
// Discrète et professionnelle — ce message part vers un recruteur/employeur
// réel. Pas de redondance "via X powered by Y" : un seul mention, sobre.
const SIGNATURE = `\n\n---\nPowered by Searcher Connector · SCAI\nsearcherconnector.com`

async function generateApplicationMessage(profile: any, opportunity: any): Promise<string> {
  // Template de secours — toujours disponible même si l'IA échoue
  const fallbackMessage = `Bonjour,

J'ai pris connaissance de votre offre "${opportunity.title}" et elle correspond parfaitement à mon profil en ${profile.domain}.

Fort de mon expérience dans ce domaine, je suis convaincu de pouvoir apporter une réelle valeur ajoutée à votre projet.
${profile.portfolio_url ? `\nMon portfolio : ${profile.portfolio_url}` : ''}${profile.github_url ? `\nGitHub : ${profile.github_url}` : ''}${profile.linkedin_url ? `\nLinkedIn : ${profile.linkedin_url}` : ''}

Contact : ${profile.email}${profile.whatsapp_number ? ` · WhatsApp : ${profile.whatsapp_number}` : ''}

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
- Contact : ${profile.email}${profile.whatsapp_number ? ` (WhatsApp : ${profile.whatsapp_number})` : ''}

OPPORTUNITÉ :
- Titre : ${opportunity.title}
- Entreprise : ${opportunity.company || 'Non précisée'}
- Description : ${(opportunity.snippet || opportunity.match_reason || '').slice(0, 200)}
${profile.response_template ? `\nSTYLE DU CANDIDAT — exemple d'un message que lui-même a déjà écrit. Imite son ton, son registre et ses tournures de phrase, ne le recopie pas mot pour mot :\n"""\n${profile.response_template.slice(0, 500)}\n"""\n` : ''}
RÈGLES : message direct 80-150 mots, accroche sur l'opportunité, 1-2 compétences clés, appel à l'action. Pas de "Bonjour je me présente". Pas de signature (ajoutée automatiquement). LANGUE : détecte la langue du titre/de la description de l'opportunité ci-dessus et écris le message dans CETTE langue (anglais, espagnol, allemand, etc.) — pas systématiquement en français.

Génère UNIQUEMENT le corps du message.`

  // Essayer Gemini d'abord (économise les tokens Groq)
  try {
    const geminiResult = await callGeminiDirect(prompt)
    if (geminiResult && geminiResult.length > 50) return geminiResult
  } catch (e: any) {
    console.warn('[auto-apply] Gemini a échoué, tentative Groq:', e?.message)
  }

  // Groq en secours
  const groqKeys = [
    process.env.GROQ_API_KEY_9,
    process.env.GROQ_API_KEY_10,
    process.env.GROQ_API_KEY,
  ].filter(Boolean) as string[]

  // Avant ce fix : erreurs Gemini/Groq totalement silencieuses (catch vide)
  // — impossible de savoir si le fallback statique était utilisé parce que
  // les clés API manquaient (c'était le cas — GEMINI_API_KEY et
  // GROQ_API_KEY* absentes) ou pour une autre raison. Résultat en prod :
  // 100% des candidatures auto envoyaient le MÊME message générique,
  // jamais une vraie génération IA.
  if (groqKeys.length === 0) {
    console.warn('[auto-apply] Aucune clé Groq configurée (GROQ_API_KEY_9/10/plain) — message de secours statique utilisé.')
  }

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
      if (!r.ok) { console.warn('[auto-apply] Groq HTTP', r.status, await r.text().catch(() => '')); continue }
      const text = (await r.json()).choices?.[0]?.message?.content?.trim()
      if (text && text.length > 50) return text
    } catch (e: any) {
      console.warn('[auto-apply] Groq a échoué:', e?.message)
      continue
    }
  }

  // Template de secours si tout l'IA échoue
  console.warn('[auto-apply] IA indisponible (Gemini + Groq) — message de secours statique envoyé.')
  return fallbackMessage
}

export async function POST(req: NextRequest) {
  try {
    const { userId, opportunityId, sendVia } = await req.json()
    if (!userId || !opportunityId) {
      return NextResponse.json({ error: 'userId et opportunityId requis' }, { status: 400 })
    }

    // Anti-abus : 30 préparations de candidature / heure max par utilisateur
    if (!checkRateLimit(`auto-apply:${userId}`, 30, 3600_000)) {
      return NextResponse.json({ error: 'Trop de candidatures préparées cette heure. Réessaie plus tard.' }, { status: 429 })
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

    // ── Quota d'auto-candidature par plan (candidatures AUTO de SCAI) ──
    // Pro : ≤10/jour · Premium : ≤50/jour · Free : 0 (manuel uniquement).
    // Le fondateur n'a aucune limite. Au-delà = l'utilisateur clique manuellement.
    const isFounder = profile.role === 'founder'
    const isAuto    = sendVia === 'scai_auto'
    if (isAuto && !isFounder) {
      const cfg = planConfig(planTier(profile))
      if (cfg.autoApplyPerDay <= 0) {
        return NextResponse.json({
          error: 'Ton plan ne permet pas la rédaction automatique de candidatures. Postule manuellement ou passe à un plan payant.',
          requiresManual: true, upgrade_url: '/pricing',
        }, { status: 403 })
      }
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
      try {
        const { count: autoToday } = await supabase
          .from('applications_sent')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('sent_via', 'scai_auto')
          .gte('applied_at', dayStart.toISOString())
        if ((autoToday || 0) >= cfg.autoApplyPerDay) {
          return NextResponse.json({
            error: `Limite d'auto-candidatures atteinte (${cfg.autoApplyPerDay}/jour sur le plan ${cfg.label}). Les suivantes sont à envoyer manuellement.`,
            quota_used: autoToday, quota_limit: cfg.autoApplyPerDay, requiresManual: true,
          }, { status: 429 })
        }
      } catch { /* colonne sent_via pas encore migrée → on ne bloque pas */ }
    }

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
    const message = await generateApplicationMessage(profile, opportunity)
    // On ne compte pas sur le LLM pour respecter la consigne "inclue le
    // contact" — on l'ajoute nous-mêmes s'il n'y est pas déjà.
    const contactLine = `Contact : ${profile.email}${profile.whatsapp_number ? ` · WhatsApp : ${profile.whatsapp_number}` : ''}`
    const messageWithContact = message.includes(profile.email) ? message : `${message}\n\n${contactLine}`
    const fullMessage  = messageWithContact + SIGNATURE
    const subject      = `Candidature — ${opportunity.title}${opportunity.company ? ' chez ' + opportunity.company : ''}`
    const appliedAt    = new Date().toISOString()

    // ── Sauvegarder dans applications_sent (colonnes réelles) ──
    let applicationId: string | null = null
    try {
      const { data: application, error: saveErr } = await supabase
        .from('applications_sent')
        .insert({
          user_id:        userId,
          opportunity_id: opportunityId,
          job_title:      opportunity.title,
          company:        opportunity.company || '',
          cover_message:  fullMessage,
          applied_at:     appliedAt,
          response_status: 'waiting',
          sent_via:       sendVia || 'manual',
          // Figé à l'instant T — survit à la purge de la ligne opportunities
          // (cache-cleanup cron), contrairement à la FK opportunity_id seule.
          original_url:   opportunity.original_url || null,
        })
        .select('id')
        .single()

      if (saveErr) throw saveErr
      applicationId = application?.id || null
    } catch (saveErr: any) {
      // Non-bloquant — l'essentiel (message généré, opportunité mise à jour,
      // notification, email) doit continuer même si cette table pose souci.
      console.warn('applications_sent save failed:', saveErr?.message)
    }

    // ── Mettre à jour le statut de l'opportunité ─────────────
    // 'ready_to_send' — SCAI a rédigé le message mais ne l'a envoyé à
    // personne (aucun canal de livraison réel vers l'employeur n'existe
    // pour la découverte web). Distinct de 'auto_applied' qui reste
    // réservé aux envois réels via Cowork (email/WhatsApp effectivement
    // délivrés). Voir couche notif ci-dessous pour l'action utilisateur.
    const { error: updateErr } = await supabase
      .from('opportunities')
      .update({ status: 'ready_to_send' })
      .eq('id', opportunityId)
    if (updateErr) console.warn('opportunity status update failed:', updateErr.message)

    // ── Log dans agent_actions (colonnes réelles) ─────────────
    const { error: actionErr } = await supabase.from('agent_actions').insert({
      user_id:      userId,
      action_type:  'auto_apply',
      opportunity_id: opportunityId,
      result:       `SCAI a préparé une candidature pour "${opportunity.title}"${opportunity.company ? ' chez ' + opportunity.company : ''}`,
      success:      true,
      execution_ms: 0,
    })
    if (actionErr) console.warn('agent_actions log failed:', actionErr.message)

    // ── Notification à l'utilisateur (colonnes réelles) ───────
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id:      userId,
      type:         'application',
      title:        `📝 SCAI a préparé ta candidature`,
      message:      `Message prêt pour "${opportunity.title}"${opportunity.company ? ' chez ' + opportunity.company : ''}. Relis-le et envoie-le en un clic.`,
      is_read:      false,
      action_url:   applicationId ? `/applications/${applicationId}` : (opportunity.original_url || null),
      action_label: 'Relire et envoyer',
    })
    if (notifErr) console.warn('notification insert failed:', notifErr.message)

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
