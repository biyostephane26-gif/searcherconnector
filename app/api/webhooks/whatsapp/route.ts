// =================================================================
// SEARCHER CONNECTOR — RÉCEPTION WHATSAPP (WhatsApp Business Cloud API)
// =================================================================
// Reçoit les messages WhatsApp entrants (réponses de recruteurs) et :
//  1. Les enregistre dans whatsapp_messages (direction: 'incoming')
//  2. Notifie l'utilisateur en in-app + email (sendMessageAlert)
// Gratuit à recevoir — seul l'envoi via l'API a un coût au-delà d'un
// certain volume. Configuration nécessaire côté Meta (gratuite) :
//   1. developers.facebook.com → créer une App → produit WhatsApp
//   2. Configurer le webhook avec l'URL de cette route + WHATSAPP_VERIFY_TOKEN
//   3. S'abonner au champ "messages"
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessageAlert } from '../../../../src/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'searcher-verify-token'

// ── Vérification du webhook (Meta appelle ça une fois à la config) ──
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Vérification échouée' }, { status: 403 })
}

// ── Réception des messages entrants ────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const entry    = body.entry?.[0]
    const change   = entry?.changes?.[0]
    const messages = change?.value?.messages
    const contacts = change?.value?.contacts

    if (!messages || messages.length === 0) {
      return NextResponse.json({ received: true }) // ex: accusés de lecture, pas un message
    }

    for (const msg of messages) {
      const fromNumber = msg.from // format international sans '+'
      const text        = msg.text?.body || msg.button?.text || '[média non-texte]'
      const contactName = contacts?.find((c: any) => c.wa_id === fromNumber)?.profile?.name || ''

      // Retrouver l'utilisateur propriétaire de ce numéro WhatsApp.
      // Le numéro stocké peut avoir un format différent (+, espaces) — comparaison normalisée.
      const normalize = (n: string) => (n || '').replace(/[^0-9]/g, '')
      const { data: allConfigs } = await supabase.from('whatsapp_config').select('user_id, phone_number').eq('is_active', true)
      const owner = (allConfigs || []).find(c => normalize(c.phone_number) === normalize(fromNumber))

      if (!owner) {
        console.warn(`[whatsapp-webhook] Aucun utilisateur trouvé pour le numéro ${fromNumber}`)
        continue
      }

      // ── Sauvegarder le message ──────────────────────────────────
      await supabase.from('whatsapp_messages').upsert({
        user_id:        owner.user_id,
        wa_message_id:  msg.id,
        from_number:    fromNumber,
        from_name:      contactName,
        body:           text,
        direction:      'incoming',
        searcher_replied: false,
        requires_human: true, // par défaut : un humain doit valider la réponse
      }, { onConflict: 'wa_message_id' })

      // ── Notification in-app ─────────────────────────────────────
      await supabase.from('notifications').insert({
        user_id:      owner.user_id,
        type:         'message',
        title:        `💬 Nouveau message WhatsApp`,
        message:      `${contactName || fromNumber} : "${text.slice(0, 100)}"`,
        is_read:      false,
        requires_action: true,
      })

      // ── Email d'alerte ───────────────────────────────────────────
      const { data: profile } = await supabase
        .from('users_profiles').select('email, full_name').eq('id', owner.user_id).single()
      if (profile?.email) {
        sendMessageAlert({
          to:      profile.email,
          name:    profile.full_name || '',
          from:    contactName || fromNumber,
          subject: 'Message WhatsApp',
          preview: text.slice(0, 200),
          channel: 'whatsapp',
        }).catch(() => {})
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[whatsapp-webhook] erreur:', error.message)
    return NextResponse.json({ received: true }) // toujours 200 — sinon Meta désactive le webhook
  }
}
