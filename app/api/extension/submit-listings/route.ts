// =================================================================
// SOUMISSION DE MISSIONS LUES PAR L'EXTENSION (plateformes verrouillées)
// =================================================================
// L'extension lit une page de résultats déjà rendue dans LA SESSION DE
// L'UTILISATEUR (Comet, Crème de la Crème, etc. — aucun contenu public,
// donc aucun serveur ne peut les scraper) et remonte les items trouvés
// ici. Chaque utilisateur est responsable de son propre compte/session —
// Searcher Connector ne stocke ni ne gère aucun mot de passe de ces
// plateformes tierces, jamais.
//
// Alimente le MÊME cache_opportunities que le scan de fond, donc visible
// par tous les utilisateurs payants (redistribution assumée par le
// fondateur — cf. décision du 2026-07-27).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { planTier } from '../../../../src/lib/planUtils'
import { planConfig } from '../../../../src/lib/planConfig'
import { normalizeMissionKey } from '../../../../src/lib/scraper/missionFreshness'
import { LISTING_CONFIGS } from '../../../../src/lib/scraper/listingConfigs'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KNOWN_PLATFORMS = new Set(LISTING_CONFIGS.map(c => c.platform))

function fingerprintOf(title: string, source: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return `${title}::${source}::${day}`.slice(0, 400)
}

// Un utilisateur ne peut pas noyer le cache — ni servir de vecteur
// d'abus (données fausses en masse). Plafond volontairement large : une
// vraie page de résultats contient rarement plus de 50 missions.
const MAX_ITEMS_PER_SUBMISSION = 50
const MAX_SUBMISSIONS_PER_PLATFORM_PER_DAY = 20

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    token?: string; platform?: string
    items?: Array<{ title?: string; link?: string; snippet?: string; date?: string; company?: string }>
  } | null
  if (!body?.token) return NextResponse.json({ error: 'Token manquant' }, { status: 401 })
  if (!body.platform || !KNOWN_PLATFORMS.has(body.platform)) {
    return NextResponse.json({ error: 'Plateforme non reconnue' }, { status: 400 })
  }

  const { data: tokenRow } = await supabase
    .from('extension_tokens')
    .select('user_id')
    .eq('token', body.token)
    .maybeSingle()
  if (!tokenRow) return NextResponse.json({ error: 'Token invalide' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('plan, role')
    .eq('id', tokenRow.user_id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const isFounder = profile.role === 'founder'
  if (!isFounder && !planConfig(planTier(profile as any)).extensionAccess) {
    return NextResponse.json({ error: 'Réservé aux plans Pro et Premium.', requiresUpgrade: true }, { status: 403 })
  }

  // Rate-limit anti-abus, par utilisateur et par plateforme
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count: recentCount } = await supabase
    .from('extension_listing_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', tokenRow.user_id)
    .eq('platform', body.platform)
    .gte('created_at', since)
  if ((recentCount || 0) >= MAX_SUBMISSIONS_PER_PLATFORM_PER_DAY) {
    return NextResponse.json({ error: 'Limite quotidienne atteinte pour cette plateforme.' }, { status: 429 })
  }

  const items = (body.items || []).slice(0, MAX_ITEMS_PER_SUBMISSION)
  const rows = items
    .filter(it => it.title && it.link)
    .map(it => ({
      fingerprint:      fingerprintOf(it.title!.slice(0, 200), body.platform!),
      title:            it.title!.slice(0, 200),
      company:          (it.company || '').slice(0, 150),
      location:         '',
      country:          '',
      description:      (it.snippet || '').slice(0, 500),
      original_url:     it.link,
      mission_key:      normalizeMissionKey(it.title || '', it.company || ''),
      source_platform:  `extension:${body.platform}`,
      source_category:  'freelance',
      source_type:      'free' as const,
      category:         'freelance-general',
      published_at:     it.date || new Date().toISOString(),
    }))

  if (rows.length === 0) {
    return NextResponse.json({ success: true, inserted: 0, reason: 'no_valid_items' })
  }

  const { error } = await supabase
    .from('cache_opportunities')
    .upsert(rows, { onConflict: 'fingerprint', ignoreDuplicates: true })

  // mission_key n'existe que si add_mission_freshness.sql a tourné — même
  // repli que cache-scan/route.ts : ne pas perdre la soumission entière
  // pour une colonne optionnelle manquante.
  if (error?.message?.includes('mission_key')) {
    const stripped = rows.map(({ mission_key, ...r }) => r)
    await supabase.from('cache_opportunities').upsert(stripped, { onConflict: 'fingerprint', ignoreDuplicates: true })
  }

  await supabase.from('extension_listing_submissions').insert({
    user_id: tokenRow.user_id, platform: body.platform, item_count: rows.length,
  })

  return NextResponse.json({ success: true, inserted: rows.length })
}
