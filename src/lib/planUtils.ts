// =================================================================
// SEARCHER CONNECTOR — Statut plan / fondateur, centralisé
// =================================================================
// Remplace ~5 vérifications dispersées qui testaient encore
// ['talent','business','investor'] — les noms de plans de l'ancien
// modèle à 4 profils. Les plans réels sont 'free'/'starter'/'pro'
// (voir Pricing.tsx) donc AUCUNE de ces vérifications ne pouvait
// jamais être vraie : tout utilisateur payant était traité comme
// gratuit partout où c'était utilisé (scan, quotas, sources premium).
//
// Le fondateur (role === 'founder') n'a aucune restriction, quel que
// soit son `plan` — c'est lui qui a demandé ce comportement explicitement.
// =================================================================

type PlanCheckable = { plan?: string | null; role?: string | null } | null | undefined

const PAID_PLANS = ['starter', 'pro', 'enterprise']

export function isPaidPlan(profile: PlanCheckable): boolean {
  if (!profile) return false
  if (profile.role === 'founder') return true
  return PAID_PLANS.includes(profile.plan || '')
}

export function isFounderRole(profile: PlanCheckable): boolean {
  return profile?.role === 'founder'
}
