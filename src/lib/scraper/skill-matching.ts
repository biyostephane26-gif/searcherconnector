// =================================================================
// SEARCHER CONNECTOR — MATCHING PAR NIVEAU DE COMPÉTENCE
// =================================================================
// Deux moitiés distinctes, volontairement asymétriques en coût :
//  1) assessSkillLevel() — évalue le niveau RÉEL de l'utilisateur
//     (junior/mid/senior/expert) via un seul appel IA, mis en cache sur
//     le profil et recalculé seulement quand le profil change vraiment
//     (pas à chaque scan — ce serait un appel IA par scan par
//     utilisateur, bien trop cher).
//  2) detectRequiredLevel() — détecte le niveau requis par UNE offre à
//     partir de mots-clés dans son titre/description. Pas d'IA ici :
//     le volume (des milliers d'offres/jour) rendrait ça hors budget,
//     et une heuristique par mots-clés suffit pour ce sens-là.
// =================================================================

export type SkillLevel = 'junior' | 'mid' | 'senior' | 'expert'
const LEVEL_RANK: Record<SkillLevel, number> = { junior: 0, mid: 1, senior: 2, expert: 3 }

// ── 1) Évaluation du niveau réel de l'utilisateur (IA, mise en cache) ──
export async function assessSkillLevel(profile: {
  bio?: string; skills?: string[]; domain?: string; domains?: string[]
  portfolio_url?: string; github_url?: string; linkedin_url?: string; cv_url?: string
  missions_completed?: number; verification_status?: string
}): Promise<{ level: SkillLevel; reasoning: string }> {
  const signals = [
    profile.bio ? `Bio : ${profile.bio.slice(0, 400)}` : null,
    profile.skills?.length ? `Compétences déclarées : ${profile.skills.join(', ')}` : null,
    (profile.domains?.length ? profile.domains : profile.domain ? [profile.domain] : []).length
      ? `Domaine(s) : ${(profile.domains?.length ? profile.domains : [profile.domain]).join(', ')}`
      : null,
    profile.portfolio_url ? `A un portfolio : ${profile.portfolio_url}` : 'Pas de portfolio',
    profile.github_url ? `A un GitHub` : null,
    profile.linkedin_url ? `A un LinkedIn` : null,
    profile.cv_url ? `A uploadé un CV` : 'Pas de CV uploadé',
    `Missions complétées sur la plateforme : ${profile.missions_completed || 0}`,
    profile.verification_status ? `Statut de vérification : ${profile.verification_status}` : null,
  ].filter(Boolean).join('\n')

  const prompt = `Tu es un évaluateur de compétences pour une plateforme d'emploi/freelance. À partir des informations suivantes sur un candidat, estime honnêtement son niveau réel (pas optimiste, pas pessimiste) :

${signals}

RÈGLES :
- "junior" : débutant, peu ou pas d'expérience démontrée, profil incomplet
- "mid" : quelques preuves concrètes (portfolio correct, quelques missions, compétences cohérentes)
- "senior" : portfolio solide, expérience démontrée, plusieurs missions réussies
- "expert" : profil exceptionnel, très complet, nombreuses missions réussies, expertise clairement établie
- Si les informations sont insuffisantes pour juger, réponds "junior" par défaut (ne jamais surestimer sans preuve)

Réponds UNIQUEMENT en JSON : {"level": "junior|mid|senior|expert", "reasoning": "une phrase courte expliquant pourquoi"}`

  try {
    const { fetchGroqWithRotation } = await import('../scaiUtils')
    const raw = await fetchGroqWithRotation([{ role: 'user', content: prompt }])
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (['junior', 'mid', 'senior', 'expert'].includes(parsed.level)) {
        return { level: parsed.level, reasoning: String(parsed.reasoning || '').slice(0, 300) }
      }
    }
  } catch { /* fallback heuristique ci-dessous si l'IA échoue */ }

  // Repli heuristique — ne bloque jamais l'évaluation même si l'IA est down
  let score = 0
  if (profile.bio && profile.bio.length > 80) score += 1
  if (profile.portfolio_url || profile.github_url) score += 1
  if (profile.cv_url) score += 1
  if ((profile.skills?.length || 0) >= 3) score += 1
  if ((profile.missions_completed || 0) >= 3) score += 1
  if ((profile.missions_completed || 0) >= 10) score += 1
  if (profile.verification_status === 'genius') score += 2
  const level: SkillLevel = score >= 5 ? 'expert' : score >= 3 ? 'senior' : score >= 1 ? 'mid' : 'junior'
  return { level, reasoning: 'Évaluation automatique (IA indisponible) basée sur la complétude du profil.' }
}

// ── 2) Niveau requis par une offre (mots-clés, pas d'IA) ────────────
const SENIOR_KEYWORDS = [
  'senior', 'sr.', 'lead', 'principal', 'staff', 'head of', 'director', 'expert',
  '5+ years', '7+ years', '10+ years', 'confirmé', 'expérimenté', 'chef de projet',
]
const JUNIOR_KEYWORDS = [
  'junior', 'jr.', 'entry level', 'entry-level', 'intern', 'internship', 'stage', 'stagiaire',
  'graduate', 'trainee', 'apprenti', 'débutant', 'no experience required', '0-2 years',
]

export function detectRequiredLevel(title: string, description?: string): SkillLevel | null {
  const hay = `${title} ${description || ''}`.toLowerCase()
  if (SENIOR_KEYWORDS.some(k => hay.includes(k))) return hay.includes('principal') || hay.includes('staff') || hay.includes('director') || hay.includes('head of') ? 'expert' : 'senior'
  if (JUNIOR_KEYWORDS.some(k => hay.includes(k))) return 'junior'
  return null // Pas de signal clair → "mid" implicite, ni pénalité ni bonus
}

// ── Calcule le boost/malus de score + le flag "recommandé" ──────────
export function computeLevelMatch(userLevel: SkillLevel | null | undefined, requiredLevel: SkillLevel | null) {
  if (!userLevel || !requiredLevel) return { boost: 0, recommended: false }

  const diff = LEVEL_RANK[userLevel] - LEVEL_RANK[requiredLevel]

  if (diff === 0) return { boost: 15, recommended: true }        // pile le bon niveau
  if (diff === 1) return { boost: 10, recommended: true }        // légèrement au-dessus — confortable
  if (diff > 1) return { boost: 0, recommended: false }          // largement surqualifié — pas prioritaire
  if (diff === -1) return { boost: -10, recommended: false }     // un cran en dessous — risqué
  return { boost: -30, recommended: false }                      // largement sous-qualifié — décourager
}
