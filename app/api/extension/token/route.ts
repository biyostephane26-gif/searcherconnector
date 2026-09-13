// =================================================================
// TOKEN D'EXTENSION — génère/révoque le token personnel utilisé par
// l'extension navigateur pour s'identifier (jamais le mot de passe).
// Authentification par jeton de session Supabase : un userId passé en
// paramètre suffisait auparavant à lire le token de n'importe qui.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin'
import { requireUser } from '../../../../src/lib/server/requireUser'
import { planTier } from '../../../../src/lib/planUtils'
import { planConfig } from '../../../../src/lib/planConfig'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('extension_tokens')
    .select('token, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ token: data?.token || null, created_at: data?.created_at || null })
}

// Génère un nouveau token — invalide l'ancien (une seule extension
// active par utilisateur à la fois, plus simple à raisonner et à révoquer).
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { user, profile } = auth

  // Extension réservée aux plans payants — même logique que les autres
  // fonctionnalités à coût réel (Playwright côté serveur, etc.).
  const isFounder = profile?.role === 'founder'
  if (!isFounder && !planConfig(planTier(profile as any)).extensionAccess) {
    return NextResponse.json({ error: 'L\'extension navigateur est réservée aux plans Pro et Premium.', requiresUpgrade: true }, { status: 403 })
  }

  const token = 'sc_ext_' + crypto.randomBytes(24).toString('hex')

  await supabaseAdmin.from('extension_tokens').delete().eq('user_id', user.id)
  const { error } = await supabaseAdmin.from('extension_tokens').insert({ user_id: user.id, token })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  await supabaseAdmin.from('extension_tokens').delete().eq('user_id', auth.user.id)
  return NextResponse.json({ success: true })
}
