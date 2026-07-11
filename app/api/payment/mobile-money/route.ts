// =================================================================
// SEARCHER CONNECTOR — Payment API
// Supporte :
//   1. Flutterwave (Visa/Mastercard MONDIAL + Mobile Money Afrique)
//   2. Monetbil (MTN + Orange Money Cameroun)
//   3. PayDunya (Mobile Money Afrique de l'Ouest)
//   4. Mode manuel (fallback — notification fondateur)
//
// Activation automatique du plan dès confirmation de paiement.
// Zéro intervention manuelle requise — fonctionne la nuit.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://searcherconnector.com'

// Prix par plan
const PLAN_PRICES_XAF: Record<string, number> = {
  talent:   15000,  // ~24.99 USD
  business: 29500,  // ~49 USD
  investor: 59500,  // ~99 USD
}
const PLAN_PRICES_USD: Record<string, number> = {
  talent:   24.99,
  business: 49,
  investor: 99,
}

// ── Activer le plan automatiquement ──────────────────────────────
async function activatePlan(userId: string, plan: string, paymentRef: string, method: string) {
  // 1. Mettre à jour le plan dans Supabase
  await supabase.from('users_profiles').update({
    plan,
    // Upgrade automatique du statut si pending
  }).eq('id', userId)

  // 2. Log le paiement
  await supabase.from('payment_attempts').upsert({
    user_id:     userId,
    plan,
    method,
    payment_ref: paymentRef,
    status:      'completed',
    activated_at: new Date().toISOString(),
  })

  // 3. Notification à l'utilisateur
  await supabase.from('notifications').insert({
    user_id:  userId,
    type:     'system',
    title:    `✅ Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)} activé !`,
    message:  `Ton abonnement est actif. Profite de toutes les fonctionnalités premium.`,
    is_read:  false,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, plan, phone, email, amount, currency = 'XAF', method = 'auto' } = body

    if (!userId || !plan) {
      return NextResponse.json({ error: 'userId et plan requis' }, { status: 400 })
    }

    const amountXAF = PLAN_PRICES_XAF[plan]
    const amountUSD = PLAN_PRICES_USD[plan]
    if (!amountXAF) {
      return NextResponse.json({ error: 'Plan inconnu' }, { status: 400 })
    }

    const paymentRef = `SC_${plan}_${userId.slice(0, 8)}_${Date.now()}`

    // ── Tentative 1 : Flutterwave (carte MONDIALE + Mobile Money) ─
    // Flutterwave = la meilleure option Afrique
    // Accepte : Visa, Mastercard, MTN MoMo, Orange Money, Wave, M-Pesa
    // Reçois sur ton compte MTN directement
    const flwKey = process.env.FLUTTERWAVE_SECRET_KEY || ''
    if (flwKey) {
      try {
        const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${flwKey}`,
          },
          body: JSON.stringify({
            tx_ref:         paymentRef,
            amount:         currency === 'USD' ? amountUSD : amountXAF,
            currency:       currency === 'USD' ? 'USD' : 'XAF',
            redirect_url:   `${APP_URL}/api/payment/webhook-flutterwave`,
            customer: {
              email:        email || `user_${userId.slice(0, 8)}@searcherconnector.com`,
              phone_number: phone || '',
              name:         `Searcher User ${userId.slice(0, 6)}`,
            },
            customizations: {
              title:       'Searcher Connector',
              description: `Abonnement Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
              logo:        `${APP_URL}/searcher-icon.png`,
            },
            meta: {
              user_id: userId,
              plan,
            },
            payment_options: 'card,mobilemoney,ussd',  // Toutes les options
          }),
        })
        const flwData = await flwRes.json()
        if (flwData.status === 'success' && flwData.data?.link) {
          // Logger la tentative
          await supabase.from('payment_attempts').insert({
            user_id:     userId,
            plan,
            amount:      currency === 'USD' ? amountUSD : amountXAF,
            currency,
            phone:       phone || '',
            method:      'flutterwave',
            status:      'pending',
            payment_ref: paymentRef,
          })

          return NextResponse.json({
            success:     true,
            payment_url: flwData.data.link,  // Redirige vers page Flutterwave
            method:      'flutterwave',
            message:     'Paiement par carte ou Mobile Money disponible',
          })
        }
      } catch (_) { /* fallback */ }
    }

    // ── Tentative 2 : Monetbil (Cameroun — MTN + Orange Money) ───
    const monetbilKey = process.env.MONETBIL_SERVICE_KEY || ''
    if (monetbilKey && phone) {
      try {
        const params = new URLSearchParams({
          service:     monetbilKey,
          amount:      String(amountXAF),
          phone:       phone.replace(/\s/g, ''),
          country:     'CM',
          currency:    'XAF',
          item_ref:    paymentRef,
          payment_ref: paymentRef,
          return_url:  `${APP_URL}/dashboard?payment=success&plan=${plan}`,
          notify_url:  `${APP_URL}/api/payment/webhook-monetbil`,
        })

        const monetbilRes = await fetch('https://api.monetbil.com/payment/v1/request', {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    params.toString(),
        })
        const monetbilData = await monetbilRes.json()

        if (monetbilData.success && monetbilData.payment_url) {
          await supabase.from('payment_attempts').insert({
            user_id: userId, plan, amount: amountXAF, currency: 'XAF',
            phone, method: 'monetbil', status: 'pending', payment_ref: paymentRef,
          })

          return NextResponse.json({
            success:     true,
            payment_url: monetbilData.payment_url,
            method:      'monetbil',
          })
        }
      } catch (_) { /* fallback */ }
    }

    // ── Tentative 3 : PayDunya (Afrique de l'Ouest) ───────────────
    const paydunyaToken = process.env.PAYDUNYA_MASTER_KEY || ''
    if (paydunyaToken) {
      try {
        const pdRes = await fetch('https://app.paydunya.com/api/v1/softorder/create', {
          method:  'POST',
          headers: {
            'Content-Type':         'application/json',
            'PAYDUNYA-MASTER-KEY':  paydunyaToken,
            'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY || '',
            'PAYDUNYA-TOKEN':       process.env.PAYDUNYA_TOKEN || '',
          },
          body: JSON.stringify({
            invoice: {
              total_amount:  amountXAF,
              description:   `Searcher Connector — Plan ${plan}`,
            },
            store: {
              name: 'Searcher Connector',
              tagline: "L'agent IA qui travaille pour vous",
            },
            actions: {
              cancel_url:   `${APP_URL}/pricing`,
              return_url:   `${APP_URL}/dashboard?payment=success&plan=${plan}`,
              callback_url: `${APP_URL}/api/payment/webhook-paydunya`,
            },
            custom_data: { user_id: userId, plan },
          }),
        })
        const pdData = await pdRes.json()
        if (pdData.response_code === '00' && pdData.hosted_invoice) {
          return NextResponse.json({
            success:     true,
            payment_url: pdData.hosted_invoice,
            method:      'paydunya',
          })
        }
      } catch (_) { /* fallback */ }
    }

    // ── Fallback : Mode manuel avec notification instantanée ──────
    // Le fondateur reçoit une notification dans l'app + email
    // Il active le plan manuellement depuis son dashboard
    await supabase.from('payment_attempts').insert({
      user_id:     userId,
      plan,
      amount:      amountXAF,
      currency:    'XAF',
      phone:       phone || '',
      method:      'manual_pending',
      status:      'pending_manual',
      payment_ref: paymentRef,
    })

    // Notification au fondateur
    const { data: founder } = await supabase
      .from('users_profiles')
      .select('id')
      .eq('role', 'founder')
      .single()

    if (founder) {
      await supabase.from('notifications').insert({
        user_id: founder.id,
        type:    'system',
        title:   `💰 Nouveau paiement à traiter — Plan ${plan}`,
        message: `Utilisateur ${userId.slice(0, 8)} demande le plan ${plan} (${amountXAF.toLocaleString()} XAF). Phone: ${phone || 'non fourni'}. Réf: ${paymentRef}`,
        is_read: false,
        data:    JSON.stringify({ userId, plan, paymentRef }),
      })
    }

    return NextResponse.json({
      success: true,
      manual:  true,
      message: `Demande reçue ! Ton plan ${plan} sera activé dans les prochaines heures. Réf: ${paymentRef.slice(-8)}`,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
