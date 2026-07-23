// =================================================================
// CRON — Reset mensuel des crédits vocaux SCAI Voice
// Recharge chaque compte selon son plan (free 0 / starter 60 / pro 300,
// fondateur illimité) le 1er de chaque mois. Empêche l'abus (plafond
// mensuel) sans blocage définitif (les crédits se rechargent).
// Appelé par scheduler.js — la fonction SQL reset_monthly_voice_credits()
// est définie dans supabase/migrations/consolidate_voice_credits.sql.
// =================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    // Reset QUOTIDIEN (Free 5 · Pro 30 · Premium 100). Repli sur le reset
    // mensuel si la fonction daily n'est pas encore migrée.
    let { data, error } = await supabase.rpc('reset_daily_voice_credits')
    if (error) {
      const fallback = await supabase.rpc('reset_monthly_voice_credits')
      data = fallback.data; error = fallback.error
    }
    if (error) throw error
    return NextResponse.json({ success: true, accountsReset: data ?? null })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
