// =================================================================
// API FONDATEUR — Télémétrie Sources & Scraping
// Stats réelles depuis Supabase cache_opportunities et scraper_sessions
// =================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
  // Next.js met en cache les fetch() des route handlers — sans no-store,
  // le dashboard fondateur affichait des stats vieilles de plusieurs jours.
  { global: { fetch: (url: any, init: any) => fetch(url, { ...init, cache: 'no-store' }) } }
)

export async function GET(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est founder
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer toutes les opportunités depuis le cache
    // (count exact séparé : Supabase plafonne à 1000 lignes par requête,
    // donc data.length sous-estimait le total dès que le cache dépassait 1000)
    const { data: opportunities, error: oppError, count: totalOppCount } = await supabase
      .from('cache_opportunities')
      .select('source_platform, created_at, source_type', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10000)

    if (oppError) throw oppError

    // Récupérer les sessions de scraping
    const { data: sessions, error: sessionsError } = await supabase
      .from('scraper_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (sessionsError) throw sessionsError

    // Analyser les sources
    const sourceStats: Record<string, {
      name: string
      totalOpportunities: number
      last24h: number
      lastSeen: string
      isPaid: boolean
      status: 'active' | 'warning' | 'error'
      errorCount: number
    }> = {}

    const now = Date.now()
    const last24h = now - 24 * 60 * 60 * 1000
    const last7d = now - 7 * 24 * 60 * 60 * 1000

    opportunities?.forEach((opp: any) => {
      const source = opp.source_platform || 'unknown'
      const createdTime = new Date(opp.created_at).getTime()

      if (!sourceStats[source]) {
        sourceStats[source] = {
          name: source,
          totalOpportunities: 0,
          last24h: 0,
          lastSeen: opp.created_at,
          isPaid: opp.source_type === 'premium',
          status: 'active',
          errorCount: 0
        }
      }

      sourceStats[source].totalOpportunities++
      
      if (createdTime >= last24h) {
        sourceStats[source].last24h++
      }

      // Mettre à jour lastSeen si plus récent
      if (new Date(opp.created_at) > new Date(sourceStats[source].lastSeen)) {
        sourceStats[source].lastSeen = opp.created_at
      }
    })

    // Déterminer le statut de chaque source
    Object.values(sourceStats).forEach(source => {
      const lastSeenTime = new Date(source.lastSeen).getTime()
      const hoursSinceLastSeen = (now - lastSeenTime) / (1000 * 60 * 60)

      if (hoursSinceLastSeen > 48) {
        source.status = 'error'
      } else if (hoursSinceLastSeen > 24) {
        source.status = 'warning'
      } else {
        source.status = 'active'
      }
    })

    // Calculer les stats globales
    const totalSources = Object.keys(sourceStats).length
    const activeSources = Object.values(sourceStats).filter(s => s.status === 'active').length
    const warningSources = Object.values(sourceStats).filter(s => s.status === 'warning').length
    const errorSources = Object.values(sourceStats).filter(s => s.status === 'error').length
    const paidSources = Object.values(sourceStats).filter(s => s.isPaid).length
    const freeSources = totalSources - paidSources

    // Stats sessions
    const recentSessions = sessions?.slice(0, 20) || []
    const successfulScans = sessions?.filter(s => s.status === 'completed').length || 0
    const failedScans = sessions?.filter(s => s.status === 'failed').length || 0
    const totalOpportunitiesFound = totalOppCount ?? (opportunities?.length || 0)

    // Opportunités par jour (derniers 7 jours)
    const opportunitiesByDay: Record<string, number> = {}
    opportunities?.forEach((opp: any) => {
      const createdTime = new Date(opp.created_at).getTime()
      if (createdTime >= last7d) {
        const day = new Date(opp.created_at).toISOString().slice(0, 10)
        opportunitiesByDay[day] = (opportunitiesByDay[day] || 0) + 1
      }
    })

    const chartData = Object.entries(opportunitiesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({
        date: new Date(day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        count
      }))

    return NextResponse.json({
      success: true,
      summary: {
        totalSources,
        activeSources,
        warningSources,
        errorSources,
        paidSources,
        freeSources,
        totalOpportunitiesFound,
        successfulScans,
        failedScans
      },
      sources: Object.values(sourceStats).sort((a, b) => b.last24h - a.last24h),
      recentSessions,
      chartData
    })
  } catch (error: any) {
    console.error('[founder/telemetry] Erreur:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
