// =================================================================
// Jeton d'accès Gmail toujours valide — un access_token OAuth Google
// expire au bout d'1h ; sans rafraîchissement, l'envoi via Gmail
// casse silencieusement 1h après la connexion jusqu'à reconnexion
// manuelle. Logique extraite de gmail-poll/route.ts (qui l'avait déjà
// correctement) pour que cowork/send.ts (qui ne l'avait pas) en profite
// aussi — un seul endroit à maintenir pour les deux usages.
// =================================================================
import { supabaseAdmin } from '../supabaseAdmin'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
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
      signal: AbortSignal.timeout(10000),
    })
    const data = await r.json()
    return data.access_token || null
  } catch { return null }
}

// Retourne un access_token Gmail valide pour cet utilisateur (rafraîchi si
// besoin, avec la ligne oauth_connections mise à jour), ou null si Gmail
// n'est pas connecté ou si le refresh échoue (token révoqué côté Google).
export async function getValidGmailAccessToken(userId: string): Promise<string | null> {
  const { data: conn } = await supabaseAdmin
    .from('oauth_connections')
    .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('user_id', userId).eq('platform', 'gmail').eq('is_active', true)
    .single()
  if (!conn) return null

  const expired = conn.token_expires_at && new Date(conn.token_expires_at) < new Date()
  if (!expired) return conn.access_token_encrypted

  if (!conn.refresh_token_encrypted) return null
  const refreshed = await refreshAccessToken(conn.refresh_token_encrypted)
  if (!refreshed) return null

  await supabaseAdmin.from('oauth_connections').update({
    access_token_encrypted: refreshed,
    token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  }).eq('user_id', userId).eq('platform', 'gmail')

  return refreshed
}
