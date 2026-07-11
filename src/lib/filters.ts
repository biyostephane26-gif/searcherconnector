// src/lib/filters.ts

/**
 * Filtering logic for search results based on freshness, user plan and profile type.
 *
 * - Freshness:
 *   * <24h  → "hot" (kept always)
 *   * <30 days → keep
 *   * >30 days → discard unless marked "very relevant" (not implemented here)
 * - Plan restrictions:
 *   * free  → keep only results from RSS sources and cap to 5-10 items.
 *   * premium → keep all results.
 *
 * The function returns the filtered array, plus a counter of hidden results.
 */
export interface SearchResult {
  title: string;
  link: string;
  pubDate?: string; // ISO string or any parseable date
  source: string; // Identifier of the source, e.g. "serper", "reddit", "rss"
  // other fields preserved from multiSearch output
  [key: string]: any;
}

export interface FilterResult {
  results: SearchResult[];
  /** Number of items that were filtered out because of plan limits */
  totalFoundButHidden: number;
}

/**
 * Helper to parse a date string safely.
 */
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Apply freshness filter.
 */
function filterByFreshness(items: SearchResult[]): SearchResult[] {
  const now = Date.now();
  return items.filter(item => {
    const pub = parseDate(item.pubDate);
    if (!pub) return true; // keep when unknown (will be handled later)
    const ageMs = now - pub.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    // Keep if <30 days; hot if <1 day – caller can prioritize later.
    return ageDays <= 30;
  });
}

/**
 * Apply plan‑based restriction.
 */
function filterByPlan(items: SearchResult[], plan: 'free' | 'premium'): FilterResult {
  if (plan === 'premium') {
    return { results: items, totalFoundButHidden: 0 };
  }
  // free plan – only keep RSS sources.
  const rssOnly = items.filter(i => i.source.toLowerCase().includes('rss'));
  // cap between 5 and 10 (choose 8 as a comfortable middle).
  const cap = 8;
  const kept = rssOnly.slice(0, cap);
  const hidden = rssOnly.length - kept.length + (items.length - rssOnly.length); // everything else hidden
  return { results: kept, totalFoundButHidden: hidden };
}

/**
 * Main export – combine freshness and plan filters.
 */
export function applyFilters(
  rawResults: SearchResult[],
  userPlan: 'free' | 'premium',
  profileType: string
): FilterResult {
  // 1️⃣ Freshness first
  const fresh = filterByFreshness(rawResults);
  // 2️⃣ Plan limits (free users only get RSS sources)
  const planFiltered = filterByPlan(fresh, userPlan);
  // Additional profile‑type specific rules could be added here (e.g. no CDI for freelancers).
  // For now we simply return the plan‑filtered result.
  return planFiltered;
}
