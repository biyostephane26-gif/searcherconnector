// =================================================================
// Détection de plateforme ATS à partir d'une URL — logique pure, sans
// dépendance lourde (Playwright), pour pouvoir être importée aussi bien
// côté serveur (atsSubmit.ts) que côté client (badges UI Opportunities.tsx).
// =================================================================

export type AtsPlatform = 'greenhouse' | 'lever';

export function detectAtsPlatform(url: string): AtsPlatform | null {
  try {
    const host = new URL(url).hostname;
    if (host.includes('greenhouse.io')) return 'greenhouse';
    if (host.includes('lever.co')) return 'lever';
    return null;
  } catch { return null; }
}
