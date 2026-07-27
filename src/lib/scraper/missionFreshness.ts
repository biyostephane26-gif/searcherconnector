// =================================================================
// FRAÎCHEUR GLOBALE + CAP SC PAR INSTANCE (2026-07-27)
// =================================================================
// Une même mission peut être postée sur plusieurs plateformes (Malt,
// Free-Work, LinkedIn...). Deux questions distinctes, deux échelles :
//
// 1. Fraîcheur (globale, toutes plateformes confondues) — "cette mission
//    vaut-elle encore la peine d'être montrée à un utilisateur ?"
//    fraiche = (âge < 48h) ET (total postulants réels < 10)
//    Postulants inconnus (plateforme ne les affiche pas) traités comme 0
//    — approche optimiste, cohérente avec applicants_count déjà nullable
//    ailleurs dans le code (voir cache-scan/route.ts applicantsBoost).
//
// 2. Cap SC (par instance/plateforme) — "a-t-on le droit d'ajouter un
//    candidat SC de plus sur CETTE URL précise ?" Ne s'évalue QUE si la
//    mission est déjà fraîche (sinon elle n'apparaît nulle part, le cap
//    n'a plus de sens à vérifier). Volontairement PAR plateforme et pas
//    global : on ne contrôle pas laquelle des instances (Malt vs
//    Free-Work vs LinkedIn) le recruteur va effectivement checker en
//    premier — maximiser la présence par plateforme plutôt que rationner
//    un total global augmente les chances réelles d'être vu quelque part.
// =================================================================

const SEUIL_AGE_HEURES = 48
const SEUIL_POSTULANTS_FRAICHEUR = 10
export const CAP_SC_PAR_INSTANCE = 15

export function normalizeMissionKey(title: string, company: string): string {
  const norm = (s: string) => (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // accents
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
  return `${norm(title)}::${norm(company)}`
}

export interface FreshnessResult {
  fresh: boolean
  ageHours: number
  totalApplicants: number
  reason?: string
}

// Une seule requête d'agrégat par mission_key (mémoïsée par l'appelant sur
// la durée d'un tick) — regroupe toutes les instances (plateformes) déjà
// en cache pour cette mission, peu importe quand chacune a été scannée.
export async function evaluateMissionFreshness(supabase: any, missionKey: string): Promise<FreshnessResult> {
  const { data, error } = await supabase
    .from('cache_opportunities')
    .select('published_at, applicants_count, created_at')
    .eq('mission_key', missionKey)
    .limit(50)

  if (error || !data || data.length === 0) {
    // Rien à agréger (mission_key absent/legacy) → pas de gate, on laisse
    // passer plutôt que de casser le flux sur une migration pas encore
    // backfillée.
    return { fresh: true, ageHours: 0, totalApplicants: 0 }
  }

  const dates = data.map((r: any) => new Date(r.published_at || r.created_at).getTime()).filter((t: number) => !isNaN(t))
  const earliest = dates.length ? Math.min(...dates) : Date.now()
  const ageHours = Math.max(0, (Date.now() - earliest) / 3600000)
  const totalApplicants = data.reduce((sum: number, r: any) => sum + (typeof r.applicants_count === 'number' ? r.applicants_count : 0), 0)

  if (ageHours >= SEUIL_AGE_HEURES) {
    return { fresh: false, ageHours, totalApplicants, reason: `Trop ancienne (${ageHours.toFixed(1)}h >= ${SEUIL_AGE_HEURES}h)` }
  }
  if (totalApplicants >= SEUIL_POSTULANTS_FRAICHEUR) {
    return { fresh: false, ageHours, totalApplicants, reason: `Trop de postulants (${totalApplicants} >= ${SEUIL_POSTULANTS_FRAICHEUR})` }
  }
  return { fresh: true, ageHours, totalApplicants }
}
