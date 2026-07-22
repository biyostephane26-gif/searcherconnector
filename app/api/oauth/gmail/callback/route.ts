// =================================================================
// SEARCHER CONNECTOR — CONNEXION GMAIL OAUTH (étape 2 : callback)
// =================================================================
// Google redirige ici avec un code d'autorisation → on l'échange
// contre un access_token + refresh_token, stockés dans oauth_connections.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/oauth/gmail/callback`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code    = searchParams.get('code')
  const userId  = searchParams.get('state') // renvoyé tel quel par Google
  const errParam = searchParams.get('error')

  if (errParam || !code || !userId) {
    return NextResponse.redirect(`${APP_URL}/cowork?gmail=error`)
  }

  try {
    // ── Échanger le code contre des tokens ────────────────────────
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) {
      console.warn('[gmail-oauth] échange de token échoué:', tokens)
      return NextResponse.redirect(`${APP_URL}/cowork?gmail=error`)
    }

    // ── Récupérer l'email du compte connecté ──────────────────────
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const googleProfile = await profileRes.json()

    // ── Sauvegarder la connexion ───────────────────────────────────
    await supabase.from('oauth_connections').upsert({
      user_id:                 userId,
      platform:                'gmail',
      access_token_encrypted:  tokens.access_token,
      refresh_token_encrypted: tokens.refresh_token || null,
      token_expires_at:        new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      scope:                   tokens.scope || '',
      platform_user_id:        googleProfile.id || null,
      platform_username:       googleProfile.email || null,
      is_active:                true,
      connected_at:             new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    return NextResponse.redirect(`${APP_URL}/cowork?gmail=connected`)
  } catch (error: any) {
    console.error('[gmail-oauth] erreur callback:', error.message)
    return NextResponse.redirect(`${APP_URL}/cowork?gmail=error`)
  }
}
