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
import { CONNECTORS, getConnector, type ConnectorState, type CustomConnector } from '../../../src/lib/connectors/catalog'
import { isPaidPlan } from '../../../src/lib/planUtils'
import { signOAuthState } from '../../../src/lib/server/oauthState'

export const dynamic = 'force-dynamic'

// Un seul endroit pour tous les fournisseurs OAuth (Gmail, GitHub...) —
// ajouter un fournisseur = une ligne ici, pas un bloc if dupliqué.
const OAUTH_PROVIDERS: Record<string, { platform: string; envVars: [string, string]; connectPath: string }> = {
  gmail:  { platform: 'gmail',  envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], connectPath: '/api/oauth/gmail/connect' },
  github: { platform: 'github', envVars: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'], connectPath: '/api/oauth/github/connect' },
}

type Prefs = { connectors?: Record<string, { enabled: boolean; connected_at: string }>; custom_connectors?: CustomConnector[] } & Record<string, any>

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

  const customStates: ConnectorState[] = (prefs.custom_connectors || []).map(c => (
    hasExtension
      ? { id: c.id, status: 'connected', account: c.url }
      : { id: c.id, status: 'available', account: c.url, detail: "Nécessite l'extension Chrome pour fonctionner." }
  ))

  return [...customStates, ...CONNECTORS.map((c): ConnectorState => {
    if (c.kind === 'soon') return { id: c.id, status: 'soon' }

    if (c.kind === 'tool') {
      if (c.paidOnly && !paid) return { id: c.id, status: 'plan_required' }
      return { id: c.id, status: 'builtin' }
    }

    if (OAUTH_PROVIDERS[c.id]) {
      const { platform, envVars } = OAUTH_PROVIDERS[c.id]
      const row: any = oauth.get(platform)
      if (row) return { id: c.id, status: 'connected', account: row.platform_username }
      if (!process.env[envVars[0]] || !process.env[envVars[1]]) {
        return { id: c.id, status: 'config_required', detail: `${envVars[0]} et ${envVars[1]} absents du serveur.` }
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
  })]
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const states = await computeStates(auth.user.id, auth.profile)
  return NextResponse.json({ states, custom: auth.profile?.search_preferences?.custom_connectors || [] })
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

  // ── Connecteurs personnalisés (« Ajouter ») ─────────────────────
  if (action === 'add_custom' || action === 'remove_custom') {
    const prefs: Prefs = { ...(profile?.search_preferences || {}) }
    let custom = [...(prefs.custom_connectors || [])]
    if (action === 'add_custom') {
      const name = String(body?.name || '').trim().slice(0, 40)
      let url = String(body?.url || '').trim()
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`
      try { url = new URL(url).origin } catch { return NextResponse.json({ error: 'Adresse du site invalide.' }, { status: 400 }) }
      if (!name) return NextResponse.json({ error: 'Donne un nom au connecteur.' }, { status: 400 })
      if (custom.length >= 20) return NextResponse.json({ error: '20 connecteurs personnalisés maximum.' }, { status: 400 })
      if (custom.some(c => c.url === url)) return NextResponse.json({ error: 'Ce site est déjà connecté.' }, { status: 400 })
      custom.push({ id: `custom_${crypto.randomBytes(6).toString('hex')}`, name, url, created_at: new Date().toISOString() })
    } else {
      custom = custom.filter(c => c.id !== connectorId)
    }
    const { error } = await supabaseAdmin.from('users_profiles')
      .update({ search_preferences: { ...prefs, custom_connectors: custom } }).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: fresh } = await supabaseAdmin.from('users_profiles').select('*').eq('id', user.id).single()
    return NextResponse.json({ states: await computeStates(user.id, fresh), custom })
  }

  const def = getConnector(connectorId)
  if (!def) return NextResponse.json({ error: 'Connecteur inconnu' }, { status: 404 })
  if (action !== 'connect' && action !== 'disconnect') return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  if (def.kind === 'soon') return NextResponse.json({ error: `${def.name} n'est pas encore disponible.` }, { status: 400 })
  if (def.kind === 'tool') return NextResponse.json({ error: `${def.name} est intégré à SCAI, rien à connecter.` }, { status: 400 })

  const paid = isPaidPlan(profile)
  if (action === 'connect' && def.paidOnly && !paid) {
    return NextResponse.json({ error: `${def.name} est réservé aux plans Pro et Premium.`, requiresUpgrade: true }, { status: 403 })
  }

  // ── Fournisseurs OAuth (Gmail, GitHub...) ────────────────────────
  if (OAUTH_PROVIDERS[def.id]) {
    const { platform, envVars, connectPath } = OAUTH_PROVIDERS[def.id]
    if (action === 'disconnect') {
      await supabaseAdmin.from('oauth_connections').update({ is_active: false }).eq('user_id', user.id).eq('platform', platform)
    } else {
      if (!process.env[envVars[0]]) {
        return NextResponse.json({ error: `${def.name} n'est pas encore configuré sur le serveur (${envVars[0]} manquant).` }, { status: 503 })
      }
      // state signé à partir de la session déjà vérifiée ci-dessus — jamais
      // un userId en clair que n'importe qui pourrait rejouer avec son
      // propre compte pour le lier au profil de quelqu'un d'autre.
      return NextResponse.json({ redirect: `${connectPath}?state=${signOAuthState(user.id)}` })
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
  return NextResponse.json({ states, custom: freshProfile?.search_preferences?.custom_connectors || [] })
}
