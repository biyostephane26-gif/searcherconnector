// =================================================================
// Extension Chrome — profil pour préremplissage (auth par token)
// =================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function resolveUser(token: string | null) {
  if (!token || !token.startsWith('sc_ext_')) return null

  const { data: row } = await supabase
    .from('extension_tokens')
    .select('id, user_id, revoked_at')
    .eq('token', token)
    .maybeSingle()

  if (!row || row.revoked_at) return null

  await supabase
    .from('extension_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id)

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('id, email, full_name, bio, domain, country, city, phone, portfolio_url, github_url, linkedin_url, skills, profile_type, plan, voice_credits')
    .eq('id', row.user_id)
    .single()

  return profile
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim() || req.nextUrl.searchParams.get('token')

  const profile = await resolveUser(token)
  if (!profile) {
    return NextResponse.json({ error: 'Token invalide ou révoqué' }, { status: 401 })
  }

  const nameParts = (profile.full_name || '').trim().split(/\s+/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  return NextResponse.json({
    ok: true,
    profile: {
      id: profile.id,
      email: profile.email || '',
      full_name: profile.full_name || '',
      first_name: firstName,
      last_name: lastName,
      phone: (profile as any).phone || '',
      country: profile.country || '',
      city: (profile as any).city || '',
      bio: profile.bio || '',
      domain: profile.domain || '',
      portfolio_url: (profile as any).portfolio_url || '',
      github_url: (profile as any).github_url || '',
      linkedin_url: (profile as any).linkedin_url || '',
      skills: (profile as any).skills || [],
      profile_type: profile.profile_type,
      plan: profile.plan || 'free',
    },
    rules: {
      greenhouse: 'autosubmit',
      lever: 'autosubmit',
      linkedin: 'autofill_only',
      upwork: 'autofill_only',
      generic: 'autofill_only',
    },
  })
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  const profile = await resolveUser(token)
  if (!profile) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
  }

  try {
    const body = await req.json()
    await supabase.from('extension_apply_logs').insert({
      user_id: profile.id,
      url: body.url || '',
      site_type: body.site_type || 'generic',
      mode: body.mode || 'autofill',
      success: body.success !== false,
      meta: body.meta || {},
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}
