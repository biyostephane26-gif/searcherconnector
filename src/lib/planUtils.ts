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

// Modèle à 3 paliers : free / pro / premium (voir Pricing.tsx).
// On garde les anciens noms (starter/enterprise) dans la liste par sécurité
// pour les comptes non encore migrés — ils comptent comme payants.
export const PAID_PLANS = ['pro', 'premium', 'starter', 'enterprise']

export function isPaidPlan(profile: PlanCheckable): boolean {
  if (!profile) return false
  if (profile.role === 'founder') return true
  return PAID_PLANS.includes(profile.plan || '')
}

export function isFounderRole(profile: PlanCheckable): boolean {
  return profile?.role === 'founder'
}

// Palier normalisé pour le gating par quotas. Modèle final : free/pro/premium.
// (Après la migration rename_plans_free_pro_premium.sql : 'pro' = palier
// milieu, 'premium' = palier top. 'enterprise' legacy → premium.)
export function planTier(profile: PlanCheckable): 'free' | 'pro' | 'premium' {
  if (profile?.role === 'founder') return 'premium'
  const p = profile?.plan || 'free'
  if (p === 'premium' || p === 'enterprise') return 'premium'
  if (p === 'pro' || p === 'starter') return 'pro'
  return 'free'
}
