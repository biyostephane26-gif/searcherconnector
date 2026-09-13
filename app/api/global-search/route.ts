// =================================================================
// Recherche globale : personnes, opportunités, communautés, articles
// =================================================================
// GET ?q=… (session requise). Les pages, outils et réglages sont
// cherchés côté client (liste statique) ; ici uniquement la base.
// Aucune donnée privée des autres membres n'est renvoyée (pas d'email,
// pas de téléphone).
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../src/lib/supabaseAdmin'
import { requireUser } from '../../../src/lib/server/requireUser'

export const dynamic = 'force-dynamic'

// Échappe les caractères spéciaux de ILIKE et de la syntaxe .or() PostgREST.
const pattern = (q: string) => `%${q.replace(/[\\%_]/g, m => `\\${m}`).replace(/[,()]/g, ' ')}%`

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 80)
  if (q.length < 2) return NextResponse.json({ people: [], opportunities: [], groups: [], articles: [] })
  const like = pattern(q)

  const [people, opportunities, groups, articles] = await Promise.all([
    supabaseAdmin.from('users_profiles')
      .select('id, full_name, domain, country, avatar_url, verification_status')
      .or(`full_name.ilike.${like},domain.ilike.${like}`)
      .neq('id', auth.user.id)
      .limit(6),
    supabaseAdmin.from('opportunities')
      .select('id, title, company, source_platform, score')
      .eq('user_id', auth.user.id)
      .or(`title.ilike.${like},company.ilike.${like}`)
      .order('score', { ascending: false })
      .limit(6),
    supabaseAdmin.from('groups')
      .select('id, name, category, members_count, visibility')
      .or(`name.ilike.${like},description.ilike.${like}`)
      .neq('visibility', 'secret')
      .limit(5),
    supabaseAdmin.from('articles')
      .select('id, title')
      .ilike('title', like)
      .limit(5),
  ])

  return NextResponse.json({
    people: people.data || [],
    opportunities: opportunities.data || [],
    groups: groups.data || [],
    articles: articles.data || [],
  })
}
