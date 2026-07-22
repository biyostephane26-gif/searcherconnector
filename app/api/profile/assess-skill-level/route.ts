// =================================================================
// Évalue le niveau réel de compétence de l'utilisateur (junior/mid/
// senior/expert) via IA — voir src/lib/scraper/skill-matching.ts.
// Déclenché en fin d'onboarding et sur demande depuis Settings (pas à
// chaque scan — ce serait un appel IA par utilisateur par scan).
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assessSkillLevel } from '../../../../src/lib/scraper/skill-matching'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json().catch(() => ({}))
    if (!userId) return NextResponse.json({ error: 'userId manquant' }, { status: 400 })

    const { data: profile } = await supabase
      .from('users_profiles').select('*').eq('id', userId).single()
    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    const { level, reasoning } = await assessSkillLevel(profile)

    await supabase.from('users_profiles').update({
      skill_level: level,
      skill_level_reasoning: reasoning,
      skill_level_assessed_at: new Date().toISOString(),
    }).eq('id', userId)

    return NextResponse.json({ success: true, level, reasoning })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
