// =================================================================
// CRON — Retour automatique au plan Free à l'expiration
// Le dashboard Founder permet d'activer un plan payant temporairement
// (essai, paiement manuel avec durée limitée) via plan_expiry. Sans ce
// job, l'expiration affichée dans l'UI ne faisait jamais rien de
// concret : le plan restait payant indéfiniment une fois activé.
// Exécuté toutes les heures via scheduler.js.
// =================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { data: expired, error: fetchError } = await supabase
      .from('users_profiles')
      .select('id, email, plan')
      .not('plan_expiry', 'is', null)
      .lt('plan_expiry', new Date().toISOString())
      .neq('plan', 'free')
      .neq('role', 'founder')

    if (fetchError) throw fetchError
    if (!expired || expired.length === 0) {
      return NextResponse.json({ success: true, revertedCount: 0 })
    }

    const ids = expired.map(u => u.id)
    const { error: updateError } = await supabase
      .from('users_profiles')
      .update({ plan: 'free', plan_expiry: null })
      .in('id', ids)

    if (updateError) throw updateError

    await supabase.from('notifications').insert(
      expired.map(u => ({
        user_id: u.id,
        type: 'plan_expired',
        title: 'Ton plan est revenu à Free',
        message: `Ta période ${u.plan} temporaire est terminée. Passe à un plan supérieur pour continuer à en profiter.`,
      }))
    )

    return NextResponse.json({ success: true, revertedCount: expired.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
