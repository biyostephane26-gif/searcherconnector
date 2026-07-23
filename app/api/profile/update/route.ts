// =================================================================
// API route côté serveur pour mettre à jour le profil
// Utilise service_role key → bypass RLS total
// Appelé depuis Settings.tsx au lieu de Supabase direct
// =================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role key — bypass RLS, jamais exposé au client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, ...fields } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId manquant' }, { status: 400 })
    }

    // D'abord récupérer le profil existant pour préserver les champs non modifiés
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('users_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[profile/update] Error fetching existing profile:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Nettoyer les champs — pas de champs vides qui écrasent des valeurs existantes
    const updates: Record<string, any> = { id: userId }
    const allowed = ['full_name','bio','domain','domains','skills','country','city','email',
                     'portfolio_url','github_url','linkedin_url','avatar_url','whatsapp_number',
                     'response_template','salary_min','salary_max','profile_type','plan','verification_status']

    for (const key of allowed) {
      if (fields[key] !== undefined && fields[key] !== null) {
        updates[key] = typeof fields[key] === 'string' ? fields[key].trim() : fields[key]
      } else if (existingProfile && existingProfile[key] !== undefined && existingProfile[key] !== null) {
        // Préserver les valeurs existantes si pas fournies dans la requête
        updates[key] = existingProfile[key]
      }
    }

    // Si le plan change, attribuer les crédits SCAI correspondants
    // (modèle free/pro/premium ; 'starter'/'enterprise' = anciens noms tolérés)
    if (fields.plan && fields.plan !== existingProfile?.plan) {
      const creditsMap: Record<string, number> = {
        'free': 0,
        'pro': 60, 'starter': 60,
        'premium': 300, 'enterprise': 300,
      }
      updates.voice_credits = creditsMap[fields.plan] || 0
    }

    // Définir une valeur par défaut pour profile_type si nécessaire
    if (!updates.profile_type) {
      updates.profile_type = 'job_seeker'
    }

    let { data, error } = await supabaseAdmin
      .from('users_profiles')
      .upsert(updates, { onConflict: 'id' })
      .select()
      .single()

    // `skills` n'existe que si la migration add_skill_level_matching.sql est
    // appliquée — sans ce fallback, TOUTE la sauvegarde des paramètres
    // échouait (constaté en live : PGRST204 "Could not find the 'skills'
    // column"), pas seulement les compétences.
    if (error && /skills/.test(error.message)) {
      console.warn('[profile/update] retry sans skills (migration manquante ?):', error.message)
      const { skills: _omit, ...withoutSkills } = updates
      const retry = await supabaseAdmin
        .from('users_profiles')
        .upsert(withoutSkills, { onConflict: 'id' })
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error('[profile/update] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (err: any) {
    console.error('[profile/update] Exception:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
