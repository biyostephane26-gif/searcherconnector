// Webhook Monetbil — activation automatique après confirmation MTN/Orange
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPaymentConfirmation } from '../../../../src/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData()
    const status    = body.get('status')?.toString()
    const paymentRef = body.get('payment_ref')?.toString() || body.get('item_ref')?.toString() || ''

    if (status === 'success' && paymentRef) {
      // Extraire userId et plan depuis la référence SC_plan_userId_timestamp
      const parts = paymentRef.split('_')
      const plan   = parts[1]
      const userId = parts[2]

      if (userId && plan) {
        const { error: planError } = await supabase.from('users_profiles').update({ plan }).eq('id', userId)
        if (planError) {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/monitoring`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'system_error', source: 'monetbil_webhook', severity: 'critical',
              message: `Paiement Monetbil confirmé (réf ${paymentRef}, plan ${plan}, user ${userId}) mais activation du plan échouée: ${planError.message}`,
            }),
          }).catch(() => {})
        }
        await supabase.from('payment_attempts').update({
          status:       'completed',
          activated_at: new Date().toISOString(),
        }).eq('payment_ref', paymentRef)

        await supabase.from('notifications').insert({
          user_id:  userId,
          type:     'system',
          title:    `✅ Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)} activé !`,
          message:  `Paiement Mobile Money confirmé. Ton plan est actif.`,
          is_read:  false,
        })

        const { data: profile } = await supabase
          .from('users_profiles').select('email, full_name').eq('id', userId).single()
        if (profile?.email) {
          sendPaymentConfirmation({
            to: profile.email, name: profile.full_name || 'Cher utilisateur',
            plan, amount: '', currency: 'XAF', paymentRef, method: 'monetbil',
          }).catch(() => {})
        }
      }
    }
    return NextResponse.json({ received: true })
  } catch (error: any) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/monitoring`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'system_error', source: 'monetbil_webhook', severity: 'critical',
        message: `Webhook Monetbil: exception non gérée: ${error.message}`,
      }),
    }).catch(() => {})
    return NextResponse.json({ received: true })
  }
}
