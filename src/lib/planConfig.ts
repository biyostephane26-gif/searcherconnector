// =================================================================
// SEARCHER CONNECTOR — CONFIG CENTRALE DES PLANS (source unique)
// =================================================================
// Modèle à 3 paliers : free / pro / premium.
// Toute la logique de quotas (scans, sources, auto-apply, notifs,
// crédits, Opportunity Creator, SCAI Voice) lit depuis ici — pour
// éviter les valeurs dispersées et incohérentes dans le code.
// Le fondateur (role='founder') est traité comme 'premium' partout
// mais bypasse les plafonds réels (voir isFounder dans chaque route).
// =================================================================

export type PlanTier = 'free' | 'pro' | 'premium'

export interface PlanConfig {
  label: string
  priceUSD: number
  // ── Scans manuels ──
  scansPerSession: number      // nb de scans manuels autorisés par session
  sessionHours: number         // durée d'une session (fenêtre glissante)
  // ── Scans automatiques SCAI (fond) + notifications ──
  autoScansPerSession: number  // scans auto par SCAI (matching + notif)
  notifBudget: number          // notifs incluses
  notifWithOwnEmail: number    // plafond si l'utilisateur configure son email
  notifMaxPaid: number         // plafond absolu en payant + crédits (0 = pas d'extension)
  priorityMatching: boolean    // passe prioritaire quand SCAI trouve une opportunité
  // ── Sources ──
  maxSources: number           // taille du pool de sources accessible
  premiumSources: boolean      // accès aux sources premium/payantes
  premiumSourcesRatio: number  // proportion de sources premium dans le pool (0..1)
  // ── Auto-candidature ──
  autoApplyPerDay: number      // candidatures auto/jour (au-delà = clic manuel)
  // ── Opportunity Creator ──
  opportunityCreatorPerDay: number
  // ── SCAI Voice (crédits, reset quotidien) ──
  voiceCreditsPerDay: number   // crédits vocaux rechargés chaque jour
  // ── Crédits SCAI mensuels (voix longue + scraping live niveau 3) ──
  monthlyCredits: number
  // ── Visibilité opportunités ──
  visibleOpportunities: number // nb d'opportunités visibles (reste verrouillé)
  level3LiveScraping: boolean  // droit au scraping live niveau 3 (LinkedIn/Upwork)
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    label: 'Free',
    priceUSD: 0,
    scansPerSession: 3,
    sessionHours: 7,
    autoScansPerSession: 3,
    notifBudget: 3,
    notifWithOwnEmail: 3,
    notifMaxPaid: 0,
    priorityMatching: false,
    maxSources: 300,           // sources gratuites uniquement
    premiumSources: false,
    premiumSourcesRatio: 0,
    autoApplyPerDay: 0,        // pas d'auto-candidature en gratuit
    opportunityCreatorPerDay: 0,
    voiceCreditsPerDay: 5,     // SCAI Voice gratuit MAIS limité
    monthlyCredits: 0,
    visibleOpportunities: 10,
    level3LiveScraping: false,
  },
  pro: {
    label: 'Pro',
    priceUSD: 19,
    scansPerSession: 5,
    sessionHours: 5,
    autoScansPerSession: 5,
    notifBudget: 20,
    notifWithOwnEmail: 20,
    notifMaxPaid: 20,
    priorityMatching: false,
    maxSources: 1000,          // ~la moitié premium
    premiumSources: true,
    premiumSourcesRatio: 0.5,
    autoApplyPerDay: 10,
    opportunityCreatorPerDay: 3,
    voiceCreditsPerDay: 30,
    monthlyCredits: 60,
    visibleOpportunities: 999,
    level3LiveScraping: true,
  },
  premium: {
    label: 'Premium',
    priceUSD: 49,
    scansPerSession: 10,
    sessionHours: 5,
    autoScansPerSession: 20,
    notifBudget: 20,
    notifWithOwnEmail: 50,
    notifMaxPaid: 250,         // au-delà de 50, extensible par crédits jusqu'à 250
    priorityMatching: true,
    maxSources: 2005,          // toute la puissance déployée de SCAI
    premiumSources: true,
    premiumSourcesRatio: 1,
    autoApplyPerDay: 50,
    opportunityCreatorPerDay: 10,
    voiceCreditsPerDay: 100,
    monthlyCredits: 300,
    visibleOpportunities: 999,
    level3LiveScraping: true,
  },
}

export function planConfig(tier: PlanTier): PlanConfig {
  return PLANS[tier] || PLANS.free
}
