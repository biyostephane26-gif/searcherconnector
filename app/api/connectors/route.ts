// =================================================================
// SCAI Cowork — état et gestion des connecteurs de l'utilisateur
// =================================================================
// GET  : catalogue + statut réel de chaque connecteur (lu en base)
// POST : { connectorId, action: 'connect' | 'disconnect', value? }
// Authentification obligatoire (jeton Supabase), jamais un userId en clair.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '../../../src/lib/supabaseAdmin'
import { requireUser } from '../../../src/lib/server/requireUser'
import { CONNECTORS, getConnector, type ConnectorState } from '../../../src/lib/connectors/catalog'
import { isPaidPlan } from '../../../src/lib/planUtils'

export const dynamic = 'force-dynamic'

type Prefs = { connectors?: Record<string, { enabled: boolean; connected_at: string }> } & Record<string, any>

async function computeStates(userId: string, profile: any): Promise<ConnectorState[]> {
  const paid = isPaidPlan(profile)
  const prefs: Prefs = profile?.search_preferences || {}

  const [{ data: oauthRows }, { data: tokenRow }] = await Promise.all([
    supabaseAdmin.from('oauth_connections').select('platform, platform_username, is_active').eq('user_id', userId),
    supabaseAdmin.from('extension_tokens').select('created_at, last_used_at').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const oauth = new Map((oauthRows || []).filter((r: any) => r.is_active).map((r: any) => [r.platform, r]))
  const hasExtension = !!tokenRow

  return CONNECTORS.map((c): ConnectorState => {
    if (c.kind === 'soon') return { id: c.id, status: 'soon' }

    if (c.kind === 'tool') {
      if (c.paidOnly && !paid) return { id: c.id, status: 'plan_required' }
      return { id: c.id, status: 'builtin' }
    }

    if (c.id === 'gmail') {
      const row: any = oauth.get('gmail')
      if (row) return { id: c.id, status: 'connected', account: row.platform_username }
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return { id: c.id, status: 'config_required', detail: 'GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET absents du serveur.' }
      }
      return { id: c.id, status: 'available' }
    }

    if (c.kind === 'phone') {
      return profile?.whatsapp_number
        ? { id: c.id, status: 'connected', account: profile.whatsapp_number }
        : { id: c.id, status: 'available' }
    }

    if (c.kind === 'profile' && c.profileField) {
      const value = profile?.[c.profileField]
      return value ? { id: c.id, status: 'connected', account: value } : { id: c.id, status: 'available' }
    }

    if (c.id === 'chrome') {
      if (!paid) return { id: c.id, status: 'plan_required' }
      if (!hasExtension) return { id: c.id, status: 'available' }
      const used = (tokenRow as any)?.last_used_at
      return {
        id: c.id, status: 'connected',
        detail: used ? `Dernière utilisation : ${new Date(used).toLocaleString('fr-FR')}` : 'Jeton créé — colle-le dans l\'extension pour l\'activer.',
      }
    }

    if (c.kind === 'extension') {
      if (!paid) return { id: c.id, status: 'plan_required' }
      if (prefs.connectors?.[c.id]?.enabled) {
        return hasExtension
          ? { id: c.id, status: 'connected' }
          : { id: c.id, status: 'available', detail: 'Active d\'abord l\'extension Chrome.' }
      }
      return { id: c.id, status: 'available', detail: hasExtension ? null : 'Nécessite l\'extension Chrome.' }
    }

    return { id: c.id, status: 'available' }
  })
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const states = await computeStates(auth.user.id, auth.profile)
  return NextResponse.json({ states })
}

function normalizeProfileValue(field: string, raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  if (field === 'github_url') {
    const m = v.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/?$/i) || v.match(/^@?([A-Za-z0-9-]{1,39})$/)
    return m ? `https://github.com/${m[1]}` : null
  }
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try {
    const host = new URL(url).hostname
    if (field === 'linkedin_url' && !/(^|\.)linkedin\.com$/i.test(host)) return null
    if (field === 'behance_url' && !/(^|\.)behance\.net$/i.test(host)) return null
    return url
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { user, profile } = auth

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }
  const { connectorId, action, value } = body || {}
  const def = getConnector(connectorId)
  if (!def) return NextResponse.json({ error: 'Connecteur inconnu' }, { status: 404 })
  if (action !== 'connect' && action !== 'disconnect') return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  if (def.kind === 'soon') return NextResponse.json({ error: `${def.name} n'est pas encore disponible.` }, { status: 400 })
  if (def.kind === 'tool') return NextResponse.json({ error: `${def.name} est intégré à SCAI, rien à connecter.` }, { status: 400 })

  const paid = isPaidPlan(profile)
  if (action === 'connect' && def.paidOnly && !paid) {
    return NextResponse.json({ error: `${def.name} est réservé aux plans Pro et Premium.`, requiresUpgrade: true }, { status: 403 })
  }

  // ── Gmail (OAuth) ───────────────────────────────────────────────
  if (def.id === 'gmail') {
    if (action === 'disconnect') {
      await supabaseAdmin.from('oauth_connections').update({ is_active: false }).eq('user_id', user.id).eq('platform', 'gmail')
    } else {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return NextResponse.json({ error: 'Gmail n\'est pas encore configuré sur le serveur (GOOGLE_CLIENT_ID manquant).' }, { status: 503 })
      }
      return NextResponse.json({ redirect: `/api/oauth/gmail/connect?userId=${user.id}` })
    }
  }

  // ── WhatsApp (numéro) ───────────────────────────────────────────
  else if (def.kind === 'phone') {
    if (action === 'disconnect') {
      await supabaseAdmin.from('users_profiles').update({ whatsapp_number: null }).eq('id', user.id)
    } else {
      const phone = String(value || '').replace(/[\s().-]/g, '')
      if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
        return NextResponse.json({ error: 'Numéro invalide. Format international attendu, ex : +237 6XX XX XX XX' }, { status: 400 })
      }
      const normalized = phone.startsWith('+') ? phone : `+${phone}`
      const { error } = await supabaseAdmin.from('users_profiles').update({ whatsapp_number: normalized }).eq('id', user.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // ── Profils publics (GitHub, LinkedIn, Behance) ─────────────────
  else if (def.kind === 'profile' && def.profileField) {
    if (action === 'disconnect') {
      await supabaseAdmin.from('users_profiles').update({ [def.profileField]: null }).eq('id', user.id)
    } else {
      const normalized = normalizeProfileValue(def.profileField, String(value || ''))
      if (!normalized) return NextResponse.json({ error: `Lien ${def.name} invalide.` }, { status: 400 })
      if (def.id === 'github') {
        const username = normalized.split('/').pop()
        const gh = await fetch(`https://api.github.com/users/${username}`, {
          headers: {
            Accept: 'application/vnd.github+json',
            ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
          },
        })
        if (gh.status === 404) return NextResponse.json({ error: `Aucun compte GitHub « ${username} ».` }, { status: 400 })
      }
      const { error } = await supabaseAdmin.from('users_profiles').update({ [def.profileField]: normalized }).eq('id', user.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // ── Extension Chrome (jeton personnel) ──────────────────────────
  else if (def.id === 'chrome') {
    await supabaseAdmin.from('extension_tokens').delete().eq('user_id', user.id)
    if (action === 'connect') {
      const token = 'sc_ext_' + crypto.randomBytes(24).toString('hex')
      const { error } = await supabaseAdmin.from('extension_tokens').insert({ user_id: user.id, token })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const states = await computeStates(user.id, profile)
      return NextResponse.json({ states, token })
    }
  }

  // ── Plateformes freelance (via l'extension) ─────────────────────
  else if (def.kind === 'extension') {
    const prefs: Prefs = { ...(profile?.search_preferences || {}) }
    const connectors = { ...(prefs.connectors || {}) }
    if (action === 'connect') connectors[def.id] = { enabled: true, connected_at: new Date().toISOString() }
    else delete connectors[def.id]
    const { error } = await supabaseAdmin.from('users_profiles')
      .update({ search_preferences: { ...prefs, connectors } }).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: freshProfile } = await supabaseAdmin.from('users_profiles').select('*').eq('id', user.id).single()
  const states = await computeStates(user.id, freshProfile)
  return NextResponse.json({ states })
}
