// =================================================================
// SEARCHER CONNECTOR — POLLING GMAIL (alternative gratuite aux push
// notifications Pub/Sub, qui demandent souvent une facturation activée)
// =================================================================
// Appelé périodiquement par scheduler.js pour chaque compte Gmail
// connecté : vérifie les messages récents non encore vus, les
// enregistre comme entrants, notifie l'utilisateur.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessageAlert } from '../../../../src/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken, grant_type: 'refresh_token',
      }),
    })
    const data = await r.json()
    return data.access_token || null
  } catch { return null }
}

// Extrait "email@domaine.com" depuis "Nom <email@domaine.com>" ou un email brut
function extractEmailAddress(raw: string): string {
  if (!raw) return ''
  const match = raw.match(/<([^>]+)>/)
  return (match ? match[1] : raw).trim().toLowerCase()
}

function headerValue(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

export async function POST(req: NextRequest) {
  if (!GOOGLE_CLIENT_ID) return NextResponse.json({ error: 'Gmail OAuth non configuré' }, { status: 503 })

  try {
    const { data: connections } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('platform', 'gmail')
      .eq('is_active', true)

    if (!connections || connections.length === 0) {
      return NextResponse.json({ checked: 0, newMessages: 0 })
    }

    let newMessagesTotal = 0

    for (const conn of connections) {
      let accessToken = conn.access_token_encrypted

      // Rafraîchir le token s'il est expiré
      if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date() && conn.refresh_token_encrypted) {
        const refreshed = await refreshAccessToken(conn.refresh_token_encrypted)
        if (!refreshed) continue // token invalide — on saute ce compte cette fois
        accessToken = refreshed
        await supabase.from('oauth_connections').update({
          access_token_encrypted: refreshed,
          token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        }).eq('id', conn.id)
      }

      // Messages reçus dans les dernières 24h (évite de scanner tout l'historique)
      const listRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' + encodeURIComponent('in:inbox newer_than:1d') + '&maxResults=15',
        { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) }
      )
      if (!listRes.ok) continue
      const list = await listRes.json()
      const messageIds: string[] = (list.messages || []).map((m: any) => m.id)
      if (messageIds.length === 0) continue

      // Ne garder que les messages pas encore enregistrés
      const { data: existing } = await supabase
        .from('email_threads').select('thread_id').eq('user_id', conn.user_id).in('thread_id', messageIds)
      const alreadySeen = new Set((existing || []).map((e: any) => e.thread_id))
      const newIds = messageIds.filter(id => !alreadySeen.has(id))

      // ── Filtrage anti-bruit : uniquement les réponses à nos envois ──
      // Sans ça, chaque pub/newsletter/code de sécurité finit dans Cowork.
      const { data: sentTo } = await supabase
        .from('email_threads').select('to_email').eq('user_id', conn.user_id).eq('direction', 'outgoing')
      const knownRecipients = new Set(
        (sentTo || []).map((t: any) => extractEmailAddress(t.to_email)).filter(Boolean)
      )

      for (const msgId of newIds.slice(0, 10)) {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000) }
        )
        if (!msgRes.ok) continue
        const msg = await msgRes.json()
        const headers = msg.payload?.headers || []
        const from    = headerValue(headers, 'From')
        const subject = headerValue(headers, 'Subject')
        const snippet = msg.snippet || ''

        // Ignorer nos propres emails automatiques (évite de se notifier soi-même)
        if (from.toLowerCase().includes('searcherconnector')) continue

        // Anti-bruit : seulement les réponses de quelqu'un à qui on a écrit
        // via Cowork (subject "Re:" en plus, signal de réponse classique).
        const senderEmail = extractEmailAddress(from)
        const looksLikeReply = /^re\s*:/i.test(subject.trim())
        if (!senderEmail || !knownRecipients.has(senderEmail) || !looksLikeReply) continue

        await supabase.from('email_threads').insert({
          user_id:        conn.user_id,
          thread_id:       msgId,
          subject,
          from_email:      from,
          from_name:       from.split('<')[0].trim(),
          direction:       'incoming',
          body_preview:    snippet.slice(0, 300),
          searcher_replied: false,
          requires_human:  true,
        })

        await supabase.from('notifications').insert({
          user_id:      conn.user_id,
          type:         'message',
          title:        `📧 Nouvel email reçu`,
          message:      `${from} : "${subject}"`,
          is_read:      false,
          requires_action: true,
        })

        const { data: profile } = await supabase
          .from('users_profiles').select('email, full_name').eq('id', conn.user_id).single()
        if (profile?.email) {
          sendMessageAlert({
            to: profile.email, name: profile.full_name || '',
            from, subject, preview: snippet.slice(0, 200), channel: 'email',
          }).catch(() => {})
        }

        newMessagesTotal++
      }

      await supabase.from('oauth_connections').update({ last_used_at: new Date().toISOString() }).eq('id', conn.id)
    }

    return NextResponse.json({ checked: connections.length, newMessages: newMessagesTotal })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
