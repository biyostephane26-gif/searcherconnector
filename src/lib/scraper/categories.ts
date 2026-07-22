// =================================================================
// SEARCHER CONNECTOR — CATÉGORIES MÉTIER PARTAGÉES
// =================================================================
// Utilisé à la fois par le scan de fond (app/api/cache-scan) qui
// remplit le cache partagé, et par le scan utilisateur (pages/api/scan)
// qui vérifie d'abord le cache avant d'appeler les vraies APIs.
// =================================================================

export const CATEGORIES: Record<string, string[]> = {
  'dev-engineering':  ['software engineer', 'developer', 'full stack developer'],
  'design':           ['UI/UX designer', 'graphic designer', 'product designer'],
  'marketing-growth': ['growth marketing', 'digital marketing', 'SEO'],
  'data-ai':          ['data scientist', 'data analyst', 'machine learning engineer'],
  'product':          ['product manager', 'product owner'],
  'sales-bizdev':     ['sales', 'business development', 'SDR'],
  'finance':          ['financial analyst', 'accountant', 'finance'],
  'devops-cloud':     ['DevOps engineer', 'cloud engineer', 'SRE'],
  'writing-content':  ['content writer', 'copywriter', 'content creator'],
  'customer-support': ['customer support', 'customer success'],
  'hr-recruiting':    ['recruiter', 'HR specialist'],
  'freelance-general':['freelance mission', 'freelance contract remote'],
  'startup-funding':  ['startup funding', 'seed round', 'venture capital'],
  'admin-office':     ['administrative assistant', 'office manager'],
}

// Enlève les accents (développeur → developpeur) avant de découper en mots,
// sinon "développeur" se coupe sur le "é" et perd le radical "dev".
export function extractSimpleKeywords(domain: string): string[] {
  const normalized = (domain || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  return normalized.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3)
}

// Trouve les catégories du cache pertinentes pour le domaine d'un utilisateur.
// Comparaison par préfixe (4 lettres) plutôt qu'inclusion stricte : un domaine
// en français ("développeur", "designer graphiste") doit matcher des mots-clés
// anglais ("developer") — les mots complets ne se contiennent pas littéralement
// l'un l'autre entre les deux langues, seule la racine (ex: "deve") est commune.
// Retourne toujours au moins une catégorie (fallback 'freelance-general').
export function matchCategories(domain: string, profileType?: string): string[] {
  const domainWords = extractSimpleKeywords(domain || '')
  const scored = Object.entries(CATEGORIES).map(([cat, kws]) => {
    const catTokens = extractSimpleKeywords(kws.join(' '))
    const hits = domainWords.filter(w =>
      catTokens.some(c => c.slice(0, 4) === w.slice(0, 4))
    ).length
    return { cat, hits }
  }).filter(s => s.hits > 0).sort((a, b) => b.hits - a.hits)

  if (scored.length > 0) return scored.slice(0, 3).map(s => s.cat)
  return profileType === 'freelance' ? ['freelance-general'] : ['dev-engineering']
}

// Variante multi-domaines (max 3 domaines/utilisateur) : matche chaque
// domaine séparément puis fusionne, pour couvrir tous les métiers de
// l'utilisateur au lieu d'un seul. `domains` prime sur `domain` s'il est
// fourni (rétrocompatible avec les profils qui n'ont qu'un seul domaine).
export function matchCategoriesForUser(domains: string[] | undefined, domain: string | undefined, profileType?: string): string[] {
  const list = (domains && domains.length > 0 ? domains : [domain || '']).slice(0, 3)
  const merged = new Set<string>()
  for (const d of list) {
    for (const cat of matchCategories(d, profileType)) merged.add(cat)
  }
  return Array.from(merged)
}

// Comme extractSimpleKeywords mais sur plusieurs domaines à la fois —
// utilisé pour le scoring par mots-clés (cache-scan/route.ts).
export function extractKeywordsForUser(domains: string[] | undefined, domain: string | undefined): string[] {
  const list = (domains && domains.length > 0 ? domains : [domain || '']).slice(0, 3)
  const merged = new Set<string>()
  for (const d of list) {
    for (const kw of extractSimpleKeywords(d)) merged.add(kw)
  }
  return Array.from(merged)
}
