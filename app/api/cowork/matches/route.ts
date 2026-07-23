// =================================================================
// API COWORK MATCHES - Matching automatique collaborateurs
// Suggère des collaborateurs compatibles selon domaine/skills
// =================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
)

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    // Récupérer le profil de l'utilisateur
    const { data: userProfile } = await supabase
      .from('users_profiles')
      .select('domain, skills, profile_type, country')
      .eq('id', userId)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    // Récupérer tous les autres utilisateurs avec profils vérifiés
    const { data: potentialMatches } = await supabase
      .from('users_profiles')
      .select('id, full_name, avatar_url, domain, skills, profile_type, verification_status, missions_completed, plan, country')
      .neq('id', userId)
      .in('verification_status', ['verified', 'genius'])
      .in('profile_type', ['freelance', 'business', 'jobseeker'])
      .not('domain', 'is', null)
      .limit(50)

    if (!potentialMatches || potentialMatches.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    // Calculer score de compatibilité pour chaque match
    const matches = potentialMatches
      .map(match => {
        let score = 0
        let reason = ''
        const commonSkills: string[] = []

        // 1. Même domaine = +40 points
        if (match.domain && userProfile.domain && 
            match.domain.toLowerCase() === userProfile.domain.toLowerCase()) {
          score += 40
          reason = `Travaille aussi dans ${match.domain}`
        }

        // 2. Compétences communes
        if (match.skills && userProfile.skills) {
          const userSkillsArray = Array.isArray(userProfile.skills) 
            ? userProfile.skills 
            : typeof userProfile.skills === 'string'
              ? userProfile.skills.split(',').map((s: string) => s.trim())
              : []
          
          const matchSkillsArray = Array.isArray(match.skills)
            ? match.skills
            : typeof match.skills === 'string'
              ? match.skills.split(',').map((s: string) => s.trim())
              : []

          for (const skill of userSkillsArray) {
            const normalized = skill.toLowerCase()
            const found = matchSkillsArray.find((s: string) => 
              s.toLowerCase().includes(normalized) || normalized.includes(s.toLowerCase())
            )
            if (found) {
              commonSkills.push(skill)
              score += 10 // +10 par compétence commune (max 30)
            }
          }

          if (commonSkills.length > 0 && !reason) {
            reason = `${commonSkills.length} compétence${commonSkills.length > 1 ? 's' : ''} en commun`
          }
        }

        // 3. Profil type complémentaire = +20 points
        if (userProfile.profile_type === 'business' && match.profile_type === 'freelance') {
          score += 20
          reason = reason || 'Freelance disponible pour missions'
        } else if (userProfile.profile_type === 'freelance' && match.profile_type === 'business') {
          score += 20
          reason = reason || 'Business cherche des freelances'
        } else if (userProfile.profile_type === 'jobseeker' && match.profile_type === 'business') {
          score += 15
          reason = reason || 'Entreprise qui recrute'
        }

        // 4. Même pays = +10 points
        if (match.country && userProfile.country && 
            match.country.toLowerCase() === userProfile.country.toLowerCase()) {
          score += 10
        }

        // 5. Bonus verification status
        if (match.verification_status === 'genius') {
          score += 10
        } else if (match.verification_status === 'verified') {
          score += 5
        }

        // 6. Bonus missions complétées
        if (match.missions_completed && match.missions_completed > 5) {
          score += 5
        }

        // 7. Bonus plan payant (actif et sérieux)
        if (match.plan && match.plan !== 'free') {
          score += 5
        }

        // Cap à 100
        score = Math.min(score, 100)

        return {
          ...match,
          compatibility_score: score,
          common_skills: commonSkills,
          match_reason: reason || 'Profil intéressant dans ton secteur'
        }
      })
      .filter(m => m.compatibility_score >= 30) // Seuil minimum 30%
      .sort((a, b) => b.compatibility_score - a.compatibility_score)
      .slice(0, 12) // Top 12 matches

    return NextResponse.json({
      matches,
      total: matches.length
    })
  } catch (error: any) {
    console.error('[cowork/matches] Erreur:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
