// =================================================================
// CONTEXTE POUR L'EXTENSION NAVIGATEUR
// L'extension appelle ceci avec son token perso + l'URL de la page sur
// laquelle l'utilisateur se trouve — retourne les infos de profil et,
// si un message a déjà été généré pour cette offre précise, ce message
// exact (cohérence avec ce que l'utilisateur voit déjà dans /applications).
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Compare origine + chemin, en ignorant les paramètres de tracking
// (utm_source, ?ref=..., etc.) qui font souvent diverger l'URL affichée
// dans le navigateur de celle stockée lors du scan.
function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    return `${u.origin}${u.pathname}`.replace(/\/$/, '').toLowerCase()
  } catch { return raw.toLowerCase() }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const pageUrl = req.nextUrl.searchParams.get('url')
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 401 })

  const { data: tokenRow } = await supabase
    .from('extension_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) return NextResponse.json({ error: 'Token invalide — régénère-le dans Paramètres.' }, { status: 401 })

  supabase.from('extension_tokens').update({ last_used_at: new Date().toISOString() }).eq('token', token).then(() => {})

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('full_name, email, whatsapp_number, portfolio_url, github_url, linkedin_url, bio, domain')
    .eq('id', tokenRow.user_id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  let message: string | null = null
  let matchedTitle: string | null = null
  let matchedCompany: string | null = null

  if (pageUrl) {
    const normalized = normalizeUrl(pageUrl)
    // On ne peut pas faire une recherche SQL "normalisée" directement —
    // on récupère les candidatures récentes de l'utilisateur et on
    // compare côté serveur (volume raisonnable, jamais des milliers).
    const { data: recentApps } = await supabase
      .from('applications_sent')
      .select('job_title, company, cover_message, original_url')
      .eq('user_id', tokenRow.user_id)
      .not('original_url', 'is', null)
      .order('applied_at', { ascending: false })
      .limit(200)

    const match = recentApps?.find(a => a.original_url && normalizeUrl(a.original_url) === normalized)
    if (match) {
      message = match.cover_message
      matchedTitle = match.job_title
      matchedCompany = match.company
    }
  }

  // Repli — aucun message déjà généré pour cette page précise : un texte
  // générique minimal reste mieux que rien, l'utilisateur ajuste lui-même.
  if (!message) {
    message = `Bonjour,\n\nJe suis intéressé(e) par cette opportunité et pense que mon profil en ${profile.domain || 'ce domaine'} correspond bien à vos besoins.\n\n${(profile.bio || '').slice(0, 200)}\n\nJe reste disponible pour échanger.\n\nCordialement,\n${profile.full_name || ''}`
  }

  return NextResponse.json({
    full_name:      profile.full_name || '',
    email:           profile.email || '',
    phone:            profile.whatsapp_number || '',
    portfolio_url:    profile.portfolio_url || '',
    github_url:       profile.github_url || '',
    linkedin_url:     profile.linkedin_url || '',
    message,
    matched:          !!matchedTitle,
    matched_title:    matchedTitle,
    matched_company:  matchedCompany,
  })
}
