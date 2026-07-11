// API publique — stats de la landing page (sans auth)
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const [oppsRes, usersRes] = await Promise.all([
      supabase.from('opportunities').select('id', { count: 'exact', head: true }),
      supabase.from('users_profiles').select('id', { count: 'exact', head: true }),
    ])
    return NextResponse.json({
      total_opportunities: oppsRes.count || 0,
      total_users:         usersRes.count || 0,
    })
  } catch {
    return NextResponse.json({ total_opportunities: 0, total_users: 0 })
  }
}
