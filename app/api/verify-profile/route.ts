import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callGeminiDirect } from '../../../src/lib/scaiUtils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json().catch(() => ({}))
    if (!userId) return NextResponse.json({ error: 'userId manquant' }, { status: 400 })

    const { data: profile } = await supabase
      .from('users_profiles').select('*').eq('id', userId).single()

    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    // ── Founder gets GENIUS automatically, always ──────────────
    const founderEmails = [
      'biyostephane26@gmail.com',
      'stephanenana.pro@gmail.com',
      process.env.NEXT_PUBLIC_FOUNDER_EMAIL || '',
    ].filter(Boolean).map((e: string) => e.toLowerCase())

    if (founderEmails.includes((profile.email || '').toLowerCase())) {
      await supabase.from('users_profiles').update({
        verification_status: 'genius',
        refusal_reason: null,
      }).eq('id', userId)
      return NextResponse.json({ status: 'genius' })
    }

    // Ne pas re-analyser si déjà genius
    if (profile.verification_status === 'genius') {
      return NextResponse.json({ status: 'genius' })
    }
    if (profile.verification_status === 'refused') {
      // Re-analyser si l'utilisateur a ajouté des docs depuis
      const { data: newDocs } = await supabase.from('uploaded_documents').select('id').eq('user_id', userId)
      if (!newDocs || newDocs.length === 0) {
        return NextResponse.json({ status: 'refused' })
      }
    }

    // Récupérer les documents uploadés
    let docs: any[] = []
    try {
      const { data } = await supabase.from('uploaded_documents').select('*').eq('user_id', userId)
      docs = data || []
    } catch { docs = [] }

    const hasDocs    = docs.length > 0
    const hasLinks   = !!(profile.portfolio_url || profile.github_url || profile.linkedin_url)
    const bio        = profile.bio || ''
    const hasDomain  = !!(profile.domain?.length > 2)
    const hasCountry = !!(profile.country?.length > 1)

    // Refus immédiat si données de base manquantes — mais seulement si AUCUNE preuve
    // Un document uploadé compense un profil incomplet
    if (!hasDomain || !hasCountry) {
      if (!hasDocs) {
        await supabase.from('users_profiles').update({
          verification_status: 'pending',
          refusal_reason: 'Domaine ou pays manquant. Remplis ces informations dans les paramètres.',
        }).eq('id', userId)
        return NextResponse.json({ status: 'pending', reason: 'Remplis ton domaine et ton pays dans les paramètres.' })
      }
      // Si docs présents mais domaine/pays manquants → on devine depuis le nom du fichier
    }

    // Analyse Gemini — prend tout le temps nécessaire
    let status = 'pending'
    let reason = ''

    const prompt = `Tu es le moteur de vérification de Searcher Connector. Analyse ce profil et décide du niveau d'accès.

TYPE DE PROFIL : ${profile.profile_type || 'non défini'}

${profile.profile_type === 'investor' ? `
═══ RÈGLES SPÉCIALES INVESTISSEUR ═══
Pour un INVESTISSEUR, les critères de vérification sont différents :
- "genius" : portfolio d'investissement documenté (deals passés, tickets investis, secteurs), réseau établi (AngelList/LinkedIn), capacité financière démontrée
- "verified" : profil LinkedIn sérieux + bio investisseur crédible, OU lien vers portfolio/fond/structure d'investissement
- "pending" : profil incomplet, pas assez d'éléments pour juger la capacité d'investissement
- "refused" : faux profil, zéro crédibilité, spam

Un investisseur N'A PAS besoin d'un CV classique. Il a besoin de prouver sa capacité à investir.
` : profile.profile_type === 'business' ? `
═══ RÈGLES SPÉCIALES ENTREPRISE ═══
Pour un profil ENTREPRISE / RECRUTEUR :
- "genius" : entreprise établie avec site web, nom de l'entreprise clair, secteur identifiable, budget de recrutement probable
- "verified" : profil professionnel sérieux avec bio claire sur l'activité de l'entreprise, OU lien vers site web/LinkedIn entreprise
- "pending" : description vague de l'activité, pas assez d'infos pour confirmer qu'il s'agit d'une vraie entreprise
- "refused" : spam, faux recruteur, arnaque probable

Un profil Entreprise cherche des workers/talents, pas un emploi.
` : `
═══ RÈGLES STANDARD (FREELANCE / JOB SEEKER) ═══
- "genius" : documents officiels (diplôme, certification) + portfolio impressionnant + bio détaillée + expériences vérifiables
- "verified" : au moins UN élément solide — document uploadé, lien portfolio/github/linkedin, bio 100+ mots
- "pending" : profil incomplet mais non frauduleux
- "refused" : profil vide, faux, spam, incohérent
`}

PROFIL ANALYSÉ :
- Nom : ${profile.full_name || 'Non renseigné'}
- Domaine : ${profile.domain}
- Pays : ${profile.country}
- Bio (${bio.length} chars) : ${bio.slice(0, 400)}
- Portfolio : ${profile.portfolio_url || 'Non fourni'}
- GitHub : ${profile.github_url || 'Non fourni'}
- LinkedIn : ${profile.linkedin_url || 'Non fourni'}
- Documents : ${hasDocs ? `${docs.length} fichier(s) — ${docs.map((d: any) => d.file_name || 'doc').join(', ')}` : 'Aucun'}

Réponds UNIQUEMENT en JSON valide, une seule ligne :
{"status":"verified","reason":"Explication courte en français"}`

    const response = await callGeminiDirect(prompt)

    if (response) {
      try {
        const s = response.indexOf('{')
        const e = response.lastIndexOf('}')
        if (s !== -1 && e !== -1) {
          const parsed = JSON.parse(response.slice(s, e + 1))
          if (['genius', 'verified', 'pending', 'refused'].includes(parsed.status)) {
            status = parsed.status
            reason = parsed.reason || ''
          }
        }
      } catch { /* garder pending */ }
    }

    // Fallback local si Gemini indisponible — adapté par type de profil
    if (status === 'pending') {
      const profileType = profile.profile_type || 'freelance'
      if (profileType === 'investor' || profileType === 'business') {
        const hasBusinessProof = !!(profile.linkedin_url || profile.portfolio_url || (profile as any).website_url)
        if (hasBusinessProof || bio.length >= 80) {
          status = 'verified'
          reason = 'Profil professionnel crédible — accès accordé.'
        }
      } else {
        if (hasDocs || hasLinks) {
          status = 'verified'
          reason = 'Preuves fournies — accès accordé.'
        } else if (bio.length >= 80) {
          status = 'verified'
          reason = 'Bio professionnelle — accès accordé.'
        }
      }
    }

    // Dernier filet — si des docs sont présents, TOUJOURS accorder au minimum verified
    if (status === 'pending' && hasDocs) {
      status = 'verified'
      reason = `${docs.length} document(s) soumis — accès accordé.`
    }

    // Sauvegarder
    await supabase.from('users_profiles').update({
      verification_status: status,
      refusal_reason: status === 'refused' ? reason : null,
    }).eq('id', userId)

    // Notification
    await supabase.from('notifications').insert({
      user_id:  userId,
      type:     'system',
      title:    status === 'genius'   ? '🔱 Statut GENIUS accordé !'
               : status === 'verified' ? '✅ Profil vérifié — accès complet'
               : status === 'refused'  ? '❌ Vérification refusée'
               : '⏳ Analyse en cours',
      message:  status === 'verified' ? `${reason || 'Accès complet accordé. Bienvenue sur Searcher Connector.'}`
               : status === 'genius'   ? `${reason || 'SCAI a identifié ton profil comme exceptionnel.'}`
               : status === 'refused'  ? reason
               : 'Complète ton profil pour finaliser.',
      is_read:  false,
    }).catch(() => {})

    return NextResponse.json({ status, reason })

  } catch (err: any) {
    return NextResponse.json({ status: 'pending', error: err.message }, { status: 200 })
  }
}
