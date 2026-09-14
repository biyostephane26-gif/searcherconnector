// =================================================================
// CONNEXION GITHUB OAUTH (étape 2 : callback)
// =================================================================
// GitHub redirige ici avec un code + le state signé → on vérifie le
// state (signature + fraîcheur), échange le code contre un token, et
// stocke la connexion. Le state signé est ce qui empêche quiconque de
// lier SON compte GitHub au profil de quelqu'un d'autre en fabriquant
// une URL /connect?state=<userId d'un autre> à la main.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../src/lib/supabaseAdmin'
import { verifyOAuthState } from '../../../../../src/lib/server/oauthState'

const GITHUB_CLIENT_ID     = process.env.GITHUB_CLIENT_ID || ''
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/oauth/github/callback`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errParam = searchParams.get('error')

  const userId = verifyOAuthState(state)
  if (errParam || !code || !userId) {
    return NextResponse.redirect(`${APP_URL}/connectors?github=error`)
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) {
      console.warn('[github-oauth] échange de token échoué:', tokens)
      return NextResponse.redirect(`${APP_URL}/connectors?github=error`)
    }

    const ghProfileRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/vnd.github+json' },
    })
    const ghProfile = await ghProfileRes.json()

    await supabaseAdmin.from('oauth_connections').upsert({
      user_id: userId,
      platform: 'github',
      access_token_encrypted: tokens.access_token,
      refresh_token_encrypted: tokens.refresh_token || null,
      token_expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      scope: tokens.scope || '',
      platform_user_id: ghProfile.id ? String(ghProfile.id) : null,
      platform_username: ghProfile.login || null,
      is_active: true,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    // Garde github_url synchronisé — plusieurs pages (Profil, candidatures)
    // lisent encore ce champ directement plutôt que oauth_connections.
    if (ghProfile.html_url) {
      await supabaseAdmin.from('users_profiles').update({ github_url: ghProfile.html_url }).eq('id', userId)
    }

    return NextResponse.redirect(`${APP_URL}/connectors?github=connected`)
  } catch (error: any) {
    console.error('[github-oauth] erreur callback:', error.message)
    return NextResponse.redirect(`${APP_URL}/connectors?github=error`)
  }
}
