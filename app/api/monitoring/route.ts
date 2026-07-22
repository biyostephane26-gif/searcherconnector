// =================================================================
// SEARCHER CONNECTOR — Système de Monitoring
// Détecte automatiquement :
//   - Limites de tokens Groq/Gemini atteintes
//   - APIs qui ont échoué
//   - Bugs rapportés par les utilisateurs
//   - Plaintes et retours d'expérience
// Alerte le fondateur via notification in-app + email
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '../../../src/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FOUNDER_EMAIL = process.env.NEXT_PUBLIC_FOUNDER_EMAIL || 'biyostephane26@gmail.com'

// Types d'alertes
type AlertType = 'token_limit' | 'api_failure' | 'bug_report' | 'user_complaint' | 'feedback' | 'system_error'

interface MonitoringEvent {
  type:       AlertType
  source:     string  // 'groq', 'gemini', 'scan', 'user', etc.
  message:    string
  userId?:    string
  severity:   'low' | 'medium' | 'high' | 'critical'
  metadata?:  Record<string, any>
}

// ── Notifier le fondateur ─────────────────────────────────────────
async function notifyFounder(event: MonitoringEvent) {
  const severityEmoji = { low: '🟡', medium: '🟠', high: '🔴', critical: '🚨' }[event.severity]
  const title = `${severityEmoji} ${event.type.replace(/_/g, ' ').toUpperCase()} — ${event.source}`

  // Notification in-app
  const { data: founder } = await supabase
    .from('users_profiles')
    .select('id, email')
    .or(`role.eq.founder,email.eq.${FOUNDER_EMAIL}`)
    .single()

  if (founder) {
    await supabase.from('notifications').insert({
      user_id:  founder.id,
      type:     'system',
      title,
      message:  event.message + (event.userId ? ` [User: ${event.userId.slice(0, 8)}]` : ''),
      is_read:  false,
      data:     JSON.stringify(event.metadata || {}),
    })

    // Email si sévérité haute ou critique
    if (['high', 'critical'].includes(event.severity)) {
      // Import dynamique pour éviter les dépendances circulaires
      const emailHtml = `
        <div style="font-family:Arial,sans-serif;background:#0A0A0A;color:#E5E5E5;padding:24px;border-radius:8px;">
          <h2 style="color:#D4AF37;">${title}</h2>
          <p style="color:#AAAAAA;">${event.message}</p>
          ${event.userId ? `<p style="color:#666;">Utilisateur : ${event.userId.slice(0, 8)}</p>` : ''}
          ${event.metadata ? `<pre style="background:#111;padding:12px;border-radius:4px;font-size:11px;color:#888;overflow:auto;">${JSON.stringify(event.metadata, null, 2)}</pre>` : ''}
          <p style="color:#444;font-size:11px;margin-top:16px;">Searcher Connector Monitoring — ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      `
      // from: doit rester onboarding@resend.dev tant qu'aucun domaine n'est
      // vérifié sur Resend (sandbox) — un from custom (ex: monitoring@…)
      // est rejeté par l'API et l'alerte partait silencieusement dans le vide.
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to:      [FOUNDER_EMAIL],
          subject: `[SEARCHER ALERT] ${title}`,
          html:    emailHtml,
        }),
      }).catch(() => null)
      if (!resendRes?.ok) {
        console.error('[monitoring] Échec envoi email fondateur:', resendRes ? await resendRes.text() : 'fetch failed')
      }
    }
  }

  // Sauvegarder dans la table monitoring
  await supabase.from('monitoring_events').insert({
    type:      event.type,
    source:    event.source,
    message:   event.message,
    user_id:   event.userId || null,
    severity:  event.severity,
    metadata:  event.metadata || {},
    resolved:  false,
    created_at: new Date().toISOString(),
  })
}

// ── POST — Recevoir un événement de monitoring ────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, source, message, userId, severity = 'medium', metadata } = body

    if (!type || !message) {
      return NextResponse.json({ error: 'type et message requis' }, { status: 400 })
    }

    await notifyFounder({ type, source: source || 'unknown', message, userId, severity, metadata })

    return NextResponse.json({ received: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ── GET — Dashboard monitoring (fondateur seulement) ─────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit  = parseInt(searchParams.get('limit')  || '50')
  const filter = searchParams.get('type') || null

  let query = supabase
    .from('monitoring_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filter) query = query.eq('type', filter)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ events: data || [] })
}
