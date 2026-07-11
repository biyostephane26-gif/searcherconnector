// ======================================================
// Searcher Connector — Config des Tiers de Scraping Adaptatif
// ======================================================

export type SourceTier = 1 | 2 | 3;

export interface TierSource {
  name: string;
  url: string;
  tier: SourceTier;
  isPaidOnly: boolean;
}

// =================================================================
// Tier 1 — Toutes les 10 MINUTES (sources ultra-actives)
// Premium : accès 30min avant les gratuits
// =================================================================
export const TIER_1_SOURCES: TierSource[] = [
  { name: "LinkedIn Jobs", url: "https://linkedin.com/jobs", tier: 1, isPaidOnly: true },
  { name: "Upwork", url: "https://upwork.com", tier: 1, isPaidOnly: true },
  { name: "Freelancer.com", url: "https://freelancer.com", tier: 1, isPaidOnly: true },
  { name: "Indeed", url: "https://indeed.com", tier: 1, isPaidOnly: false },
  { name: "Twitter/X Jobs", url: "https://twitter.com", tier: 1, isPaidOnly: true },
  { name: "Facebook Groupes Emploi", url: "https://facebook.com/groups", tier: 1, isPaidOnly: true },
  { name: "Reddit r/forhire", url: "https://reddit.com/r/forhire", tier: 1, isPaidOnly: false },
  { name: "Wellfound", url: "https://wellfound.com", tier: 1, isPaidOnly: false },
  { name: "RemoteOK", url: "https://remoteok.com", tier: 1, isPaidOnly: false },
  { name: "We Work Remotely", url: "https://weworkremotely.com", tier: 1, isPaidOnly: false },
];

// =================================================================
// Tier 2 — Toutes les 30 MINUTES (sources moyennement actives)
// =================================================================
export const TIER_2_SOURCES: TierSource[] = [
  { name: "Malt", url: "https://malt.fr", tier: 2, isPaidOnly: true },
  { name: "Contra", url: "https://contra.com", tier: 2, isPaidOnly: true },
  { name: "PeoplePerHour", url: "https://peopleperhour.com", tier: 2, isPaidOnly: true },
  { name: "Himalayas", url: "https://himalayas.app", tier: 2, isPaidOnly: false },
  { name: "Remotive", url: "https://remotive.com", tier: 2, isPaidOnly: false },
  { name: "Jobstreet", url: "https://jobstreet.com", tier: 2, isPaidOnly: false },
  { name: "Naukri", url: "https://naukri.com", tier: 2, isPaidOnly: false },
  { name: "Bayt", url: "https://bayt.com", tier: 2, isPaidOnly: false },
  { name: "Jobberman", url: "https://jobberman.com", tier: 2, isPaidOnly: false },
  { name: "Seek", url: "https://seek.com.au", tier: 2, isPaidOnly: false },
];

// =================================================================
// Tier 3 — Toutes les 60 MINUTES (sources peu actives)
// =================================================================
export const TIER_3_SOURCES: TierSource[] = [
  { name: "ATS Greenhouse", url: "https://greenhouse.io", tier: 3, isPaidOnly: false },
  { name: "ATS Lever", url: "https://lever.co", tier: 3, isPaidOnly: false },
  // Toutes les sources régionales/niche d'Afrique, Asie, Amériques...
  { name: "Jobberman Afrique", url: "https://jobberman.com", tier: 3, isPaidOnly: false },
  { name: "BrighterMonday", url: "https://brightermonday.co.ke", tier: 3, isPaidOnly: false },
  { name: "Jiji Jobs", url: "https://jiji.ng", tier: 3, isPaidOnly: false },
];

// =================================================================
// Config générale des tiers
// =================================================================
export const TIER_CONFIG = {
  1: {
    intervalMinutes: 10,
    premiumAdvantageMinutes: 30,
    label: "Ultra-actif",
  },
  2: {
    intervalMinutes: 30,
    premiumAdvantageMinutes: 0,
    label: "Moyennement actif",
  },
  3: {
    intervalMinutes: 60,
    premiumAdvantageMinutes: 0,
    label: "Peu actif",
  },
};

export const ALL_TIER_SOURCES = [
  ...TIER_1_SOURCES,
  ...TIER_2_SOURCES,
  ...TIER_3_SOURCES,
];
