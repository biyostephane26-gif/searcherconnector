// =================================================================
// TOKEN D'EXTENSION — génère/révoque le token personnel utilisé par
// l'extension navigateur pour s'identifier (jamais le mot de passe).
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  const { data } = await supabase
    .from('extension_tokens')
    .select('token, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ token: data?.token || null, created_at: data?.created_at || null })
}

// Génère un nouveau token — invalide l'ancien (une seule extension
// active par utilisateur à la fois, plus simple à raisonner et à révoquer).
export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  const token = 'sc_ext_' + crypto.randomBytes(24).toString('hex')

  await supabase.from('extension_tokens').delete().eq('user_id', userId)
  const { error } = await supabase.from('extension_tokens').insert({ user_id: userId, token })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token })
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })
  await supabase.from('extension_tokens').delete().eq('user_id', userId)
  return NextResponse.json({ success: true })
}
