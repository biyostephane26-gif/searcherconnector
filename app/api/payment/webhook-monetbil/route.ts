// Webhook Monetbil — activation automatique après confirmation MTN/Orange
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
        await supabase.from('users_profiles').update({ plan }).eq('id', userId)
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
      }
    }
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ received: true })
  }
}
