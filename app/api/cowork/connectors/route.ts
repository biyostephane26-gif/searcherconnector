import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  const [{ data: oauth }, { data: ext }, { data: profile }, { data: wa }] = await Promise.all([
    supabase.from('oauth_connections').select('platform, platform_username, is_active, connected_at').eq('user_id', userId),
    supabase.from('extension_tokens').select('created_at, last_used_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('users_profiles').select('whatsapp_number, github_url, linkedin_url, email, plan, role').eq('id', userId).single(),
    supabase.from('whatsapp_config').select('phone_number, is_active').eq('user_id', userId).maybeSingle(),
  ])

  const oauthMap = Object.fromEntries((oauth || []).map((r: any) => [r.platform, r]))
  const gmail = oauthMap.gmail
  const phone = wa?.phone_number || profile?.whatsapp_number || null

  return NextResponse.json({
    gmail: {
      connected: !!(gmail && gmail.is_active !== false),
      account: gmail?.platform_username || null,
    },
    chrome: {
      connected: !!ext,
      account: ext?.last_used_at ? `Utilisée ${new Date(ext.last_used_at).toLocaleDateString('fr-FR')}` : ext ? 'Token actif' : null,
    },
    whatsapp: {
      connected: !!phone,
      account: phone,
    },
    linkedin: {
      connected: !!(profile?.linkedin_url),
      account: profile?.linkedin_url || null,
    },
    github: {
      connected: !!(profile?.github_url),
      account: profile?.github_url || null,
    },
    plan: profile?.plan || 'free',
    role: profile?.role || 'user',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, id, action, value } = body as { userId?: string; id?: string; action?: string; value?: string }
    if (!userId || !id || !action) {
      return NextResponse.json({ error: 'userId, id et action requis' }, { status: 400 })
    }

    if (action === 'disconnect') {
      if (id === 'gmail') {
        await supabase.from('oauth_connections').update({ is_active: false }).eq('user_id', userId).eq('platform', 'gmail')
      }
      if (id === 'chrome') {
        await supabase.from('extension_tokens').delete().eq('user_id', userId)
      }
      if (id === 'whatsapp') {
        await supabase.from('users_profiles').update({ whatsapp_number: null }).eq('id', userId)
        await supabase.from('whatsapp_config').update({ is_active: false, phone_number: '' }).eq('user_id', userId)
      }
      if (id === 'linkedin') {
        await supabase.from('users_profiles').update({ linkedin_url: null }).eq('id', userId)
      }
      if (id === 'github') {
        await supabase.from('users_profiles').update({ github_url: null }).eq('id', userId)
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'connect') {
      const trimmed = String(value || '').trim()
      if (id === 'whatsapp') {
        if (!trimmed) return NextResponse.json({ error: 'Numéro WhatsApp requis' }, { status: 400 })
        await supabase.from('users_profiles').update({ whatsapp_number: trimmed }).eq('id', userId)
        await supabase.from('whatsapp_config').upsert({
          user_id: userId,
          phone_number: trimmed,
          is_active: true,
        }, { onConflict: 'user_id' })
      }
      if (id === 'linkedin') {
        if (!trimmed) return NextResponse.json({ error: 'URL LinkedIn requise' }, { status: 400 })
        await supabase.from('users_profiles').update({ linkedin_url: trimmed }).eq('id', userId)
      }
      if (id === 'github') {
        if (!trimmed) return NextResponse.json({ error: 'URL GitHub requise' }, { status: 400 })
        await supabase.from('users_profiles').update({ github_url: trimmed }).eq('id', userId)
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}
