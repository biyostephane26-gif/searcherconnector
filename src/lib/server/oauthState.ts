// État signé pour les flux OAuth (Gmail, GitHub…). Le paramètre `state`
// d'un callback OAuth revient tel quel de Google/GitHub — s'il contient
// juste un userId en clair (comme c'était le cas pour Gmail), n'importe
// qui peut fabriquer /connect?userId=<victime>, autoriser avec SON PROPRE
// compte Google/GitHub, et lier ce compte au profil de la victime. Signer
// le state (HMAC + expiration courte) empêche ça : seul le serveur, à
// partir d'une session déjà authentifiée, peut produire un state valide.
import crypto from 'crypto'

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret'
const TTL_MS = 10 * 60 * 1000 // 10 minutes — largement suffisant pour un aller-retour OAuth

export function signOAuthState(userId: string): string {
  const payload = `${userId}.${Date.now()}`
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export function verifyOAuthState(state: string | null): string | null {
  if (!state) return null
  const [payloadB64, sig] = state.split('.')
  if (!payloadB64 || !sig) return null
  const payload = Buffer.from(payloadB64, 'base64url').toString()
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  const [userId, tsRaw] = payload.split('.')
  const ts = Number(tsRaw)
  if (!userId || !Number.isFinite(ts) || Date.now() - ts > TTL_MS) return null
  return userId
}
