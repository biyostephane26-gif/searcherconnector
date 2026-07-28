// =================================================================
// GESTION DES IDENTIFIANTS DE PLATEFORME (fondateur uniquement)
// =================================================================
// Le mot de passe n'est JAMAIS renvoyé en clair — GET ne renvoie que le
// statut/dernière lecture, POST chiffre avant d'écrire en base.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encryptCredential } from '../../../../src/lib/scraper/credentialCrypto'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireFounder(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supabase.from('users_profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'founder' ? user.id : null
}

export async function GET(req: NextRequest) {
  const founderId = await requireFounder(req)
  if (!founderId) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { data, error } = await supabase
    .from('platform_credentials')
    .select('id, platform_name, login_url, listing_url, username, status, last_login_at, last_login_error, last_scrape_at, last_scrape_count, selectors, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ credentials: data })
}

export async function POST(req: NextRequest) {
  const founderId = await requireFounder(req)
  if (!founderId) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    platform_name?: string; login_url?: string; listing_url?: string
    username?: string; password?: string
    selectors?: { login: { user: string; pass: string; submit: string }; listing: { item: string; title: string; link: string; date?: string } }
  } | null

  if (!body?.platform_name || !body.login_url || !body.listing_url || !body.username || !body.password) {
    return NextResponse.json({ error: 'Champs requis: platform_name, login_url, listing_url, username, password' }, { status: 400 })
  }

  const { error } = await supabase.from('platform_credentials').upsert({
    platform_name: body.platform_name,
    login_url: body.login_url,
    listing_url: body.listing_url,
    username: body.username,
    password_encrypted: encryptCredential(body.password),
    selectors: body.selectors || {},
    status: 'active',
  }, { onConflict: 'platform_name' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const founderId = await requireFounder(req)
  if (!founderId) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const { error } = await supabase.from('platform_credentials').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
