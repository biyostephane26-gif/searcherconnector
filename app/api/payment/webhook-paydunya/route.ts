// =================================================================
// Webhook PayDunya — activation automatique après confirmation
// =================================================================
// Ce fichier n'existait pas du tout avant ce correctif : PayDunya
// pouvait créer un vrai lien de paiement (une fois l'URL de création
// corrigée dans mobile-money/route.ts), mais aucune route n'existait
// pour recevoir sa confirmation — un vrai paiement n'aurait jamais
// activé le plan automatiquement.
//
// On ne fait JAMAIS confiance au statut envoyé dans le corps du
// webhook (le format exact de l'IPN PayDunya varie selon l'intégration
// et pourrait être falsifié) — on extrait seulement le `token` reçu,
// puis on interroge l'API PayDunya elle-même (confirm/{token}) avec nos
// propres clés secrètes pour obtenir le statut réel et le custom_data.
// Vérifié en direct le 2026-09-17 : GET .../checkout-invoice/confirm/{token}
// renvoie { status, custom_data: {user_id, plan}, mode: "live"|"test" }.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPaymentConfirmation } from '../../../../src/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function extractToken(raw: any): string | null {
  // Format documenté : un champ "data" contenant du JSON (invoice.token).
  // On reste défensif et on essaie aussi quelques variantes plausibles,
  // au cas où PayDunya change la forme exacte de l'IPN.
  try {
    const dataStr = raw?.data
    if (typeof dataStr === 'string') {
      const parsed = JSON.parse(dataStr)
      return parsed?.invoice?.token || parsed?.token || null
    }
    if (dataStr && typeof dataStr === 'object') {
      return dataStr?.invoice?.token || dataStr?.token || null
    }
  } catch { /* pas du JSON valide dans "data" — on essaie les autres champs */ }
  return raw?.token || raw?.invoice?.token || null
}

async function reportCritical(message: string) {
  fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/monitoring`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'system_error', source: 'paydunya_webhook', severity: 'critical', message }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  try {
    let raw: any = {}
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      raw = await req.json().catch(() => ({}))
    } else {
      const form = await req.formData().catch(() => null)
      if (form) for (const [k, v] of form.entries()) raw[k] = v.toString()
    }

    const token = extractToken(raw)
    if (!token) {
      await reportCritical(`Webhook PayDunya reçu sans token exploitable : ${JSON.stringify(raw).slice(0, 500)}`)
      return NextResponse.json({ received: true })
    }

    // Source de vérité : l'API PayDunya elle-même, jamais le corps du webhook.
    const confirmRes = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${token}`, {
      headers: {
        'PAYDUNYA-MASTER-KEY':  process.env.PAYDUNYA_MASTER_KEY || '',
        'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY || '',
        'PAYDUNYA-TOKEN':       process.env.PAYDUNYA_TOKEN || '',
      },
    })
    const confirm = await confirmRes.json()

    if (confirm?.status !== 'completed') {
      // pending/cancelled/failed — rien à activer, pas une erreur en soi
      return NextResponse.json({ received: true, status: confirm?.status || 'unknown' })
    }

    const userId = confirm?.custom_data?.user_id
    const plan   = confirm?.custom_data?.plan
    if (!userId || !plan) {
      await reportCritical(`Paiement PayDunya confirmé (token ${token}) mais custom_data incomplet — impossible d'activer automatiquement.`)
      return NextResponse.json({ received: true })
    }

    const { error: planError } = await supabase.from('users_profiles').update({ plan }).eq('id', userId)
    if (planError) {
      await reportCritical(`Paiement PayDunya confirmé (token ${token}, plan ${plan}, user ${userId}) mais activation du plan échouée: ${planError.message}`)
    }

    // Le payment_ref exact n'est pas renvoyé par confirm() — on met à jour
    // par user+méthode+statut pending plutôt que de dépendre d'un format
    // de référence qui pourrait changer côté PayDunya.
    await supabase.from('payment_attempts')
      .update({ status: 'completed', activated_at: new Date().toISOString() })
      .eq('user_id', userId).eq('method', 'paydunya').eq('status', 'pending')

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: `✅ Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)} activé !`,
      message: 'Paiement PayDunya confirmé. Ton plan est actif.',
      is_read: false,
    })

    const { data: profile } = await supabase.from('users_profiles').select('email, full_name').eq('id', userId).single()
    if (profile?.email) {
      sendPaymentConfirmation({
        to: profile.email, name: profile.full_name || 'Cher utilisateur',
        plan, amount: '', currency: 'XAF', paymentRef: token, method: 'paydunya',
      }).catch(() => {})
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    await reportCritical(`Webhook PayDunya : exception non gérée : ${error.message}`)
    return NextResponse.json({ received: true })
  }
}

// PayDunya peut aussi appeler en GET selon la configuration du compte —
// on répond simplement pour ne jamais renvoyer une 404/405 qui ferait
// échouer leur vérification de route au moment de la configuration.
export async function GET() {
  return NextResponse.json({ ok: true })
}
