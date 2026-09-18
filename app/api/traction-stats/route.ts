// =================================================================
// STATS DE TRACTION — page publique /traction, consultable par un
// acheteur potentiel pour vérifier lui-même l'activité réelle de la
// plateforme (au lieu de devoir croire des chiffres dans un document).
// =================================================================
// Clé service_role : contourne RLS (données privées par utilisateur),
// mais on n'expose ici que des COMPTAGES agrégés et des dates de
// création — jamais le contenu d'un profil ou d'une opportunité.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Regroupe une liste de dates ISO en série quotidienne sur les N derniers
// jours (jours sans donnée = 0, pas absents — nécessaire pour un graphe propre).
function dailySeries(dates: string[], days: number): { date: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const d of dates) {
    const day = (d || '').slice(0, 10)
    if (day) counts[day] = (counts[day] || 0) + 1
  }
  const series: { date: string; count: number }[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    series.push({ date: key, count: counts[key] || 0 })
  }
  return series
}

export async function GET() {
  try {
    const since30d = new Date(Date.now() - 30 * 86400000).toISOString()

    const [usersCount, oppsCount, appsCount, actionsCount, usersRecent, oppsRecent] = await Promise.all([
      supabase.from('users_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('opportunities').select('id', { count: 'exact', head: true }),
      supabase.from('applications_sent').select('id', { count: 'exact', head: true }),
      supabase.from('agent_actions').select('id', { count: 'exact', head: true }),
      supabase.from('users_profiles').select('created_at').gte('created_at', since30d),
      supabase.from('opportunities').select('created_at').gte('created_at', since30d),
    ])

    return NextResponse.json({
      total_users: usersCount.count || 0,
      total_opportunities: oppsCount.count || 0,
      total_applications_sent: appsCount.count || 0,
      total_agent_actions: actionsCount.count || 0,
      users_growth_30d: dailySeries((usersRecent.data || []).map((r: any) => r.created_at), 30),
      opportunities_growth_30d: dailySeries((oppsRecent.data || []).map((r: any) => r.created_at), 30),
      generated_at: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}
