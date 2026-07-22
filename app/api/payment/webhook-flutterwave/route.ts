// =================================================================
// WEBHOOK FLUTTERWAVE — Activation automatique du plan
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPaymentConfirmation } from '../../../../src/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  // Flutterwave redirige ici après paiement avec les paramètres en query
  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const txRef    = searchParams.get('tx_ref')    // notre paymentRef
  const transId  = searchParams.get('transaction_id')

  if (status !== 'successful' || !txRef) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pricing?payment=failed`)
  }

  try {
    // Vérifier le paiement auprès de Flutterwave
    const flwKey = process.env.FLUTTERWAVE_SECRET_KEY || ''
    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transId}/verify`, {
      headers: { 'Authorization': `Bearer ${flwKey}` },
    })
    const verifyData = await verifyRes.json()

    if (verifyData.status === 'success' && verifyData.data?.status === 'successful') {
      const meta    = verifyData.data.meta
      const userId  = meta?.user_id || txRef.split('_')[2]
      const plan    = meta?.plan    || txRef.split('_')[1]

      if (userId && plan) {
        // Activer le plan immédiatement
        const { error: planError } = await supabase.from('users_profiles').update({ plan }).eq('id', userId)
        if (planError) {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/monitoring`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'system_error', source: 'flutterwave_webhook', severity: 'critical',
              message: `Paiement Flutterwave confirmé (réf ${txRef}, plan ${plan}, user ${userId}) mais activation du plan échouée: ${planError.message}`,
            }),
          }).catch(() => {})
        }

        await supabase.from('payment_attempts').update({
          status:       'completed',
          activated_at: new Date().toISOString(),
          transaction_id: transId || '',
        }).eq('payment_ref', txRef)

        // Notification in-app
        await supabase.from('notifications').insert({
          user_id:  userId,
          type:     'system',
          title:    `✅ Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)} activé !`,
          message:  `Paiement confirmé. Ton abonnement est actif — profite de toutes les fonctionnalités premium.`,
          is_read:  false,
        })

        // Email de confirmation au client
        const { data: profile } = await supabase
          .from('users_profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (profile?.email) {
          await sendPaymentConfirmation({
            to:         profile.email,
            name:       profile.full_name || 'Cher utilisateur',
            plan,
            amount:     verifyData.data?.amount?.toString() || '',
            currency:   verifyData.data?.currency || 'XAF',
            paymentRef: txRef,
            method:     'flutterwave',
          })
        }
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success&plan=${txRef.split('_')[1]}`
    )
  } catch {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`)
  }
}

export async function POST(req: NextRequest) {
  // Webhook POST de Flutterwave (notification serveur)
  try {
    const body = await req.json()
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH || ''

    // Vérifier la signature si configurée
    const signature = req.headers.get('verif-hash')
    if (secretHash && signature !== secretHash) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    if (body.event === 'charge.completed' && body.data?.status === 'successful') {
      const txRef  = body.data.tx_ref
      const meta   = body.data.meta
      const userId = meta?.user_id
      const plan   = meta?.plan || txRef?.split('_')[1]

      if (userId && plan) {
        const { error: planError } = await supabase.from('users_profiles').update({ plan }).eq('id', userId)
        if (planError) {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/monitoring`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'system_error', source: 'flutterwave_webhook', severity: 'critical',
              message: `Paiement Flutterwave confirmé (réf ${txRef}, plan ${plan}, user ${userId}) mais activation du plan échouée: ${planError.message}`,
            }),
          }).catch(() => {})
        }
        await supabase.from('payment_attempts').update({
          status: 'completed',
          activated_at: new Date().toISOString(),
        }).eq('payment_ref', txRef)

        await supabase.from('notifications').insert({
          user_id:  userId,
          type:     'system',
          title:    `✅ Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)} activé !`,
          message:  `Paiement confirmé via Flutterwave. Profite de ton plan premium.`,
          is_read:  false,
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/monitoring`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'system_error', source: 'flutterwave_webhook', severity: 'critical',
        message: `Webhook Flutterwave POST: exception non gérée: ${error.message}`,
      }),
    }).catch(() => {})
    return NextResponse.json({ received: true })
  }
}
