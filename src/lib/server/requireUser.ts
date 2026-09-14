// Vérifie le jeton Supabase envoyé par le client (Authorization: Bearer …)
// et renvoie l'utilisateur + son profil. Ne jamais faire confiance à un
// userId passé en paramètre.
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '../supabaseAdmin'

export async function requireUser(req: NextRequest) {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('users_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return { user, profile: profile || null }
}

// Équivalent Pages Router (NextApiRequest) — même contrat que requireUser
// ci-dessus, pour les routes encore sous src/pages/api.
import type { NextApiRequest } from 'next'

export async function requireUserPages(req: NextApiRequest) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('users_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return { user, profile: profile || null }
}
