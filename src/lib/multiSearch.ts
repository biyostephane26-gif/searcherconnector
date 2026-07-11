// src/lib/multiSearch.ts

/**
 * Orchestrates a hybrid, plug‑and‑play search across all configured sources.
 * Returns a unified, deduplicated list of results ordered by recency/confidence.
 *
 * The function is deliberately generic – adding a new source only requires
 * extending `apiConfig.ts` (or providing a custom `SearchSource`) and optionally
 * exposing a small parser to normalise the raw payload.
 */

import { SearchSource, DEFAULT_SOURCES, RSS_CONFIG } from "./apiConfig";
import { fetchRssFeed, RssItem } from "./rssFetcher";

/** Normalised shape returned to the frontend */
export type SearchResult = {
  id: string; // deterministic hash or source‑specific identifier
  title: string;
  link: string;
  snippet?: string;
  source: string; // e.g. "serper", "reddit", "github", "rss"
  pubDate?: string;
};

/** Simple in‑memory cache scoped by userId + zone + query */
interface CacheEntry {
  timestamp: number;
  results: SearchResult[];
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min – matches RSS cache

/**
 * Build a cache key that is unique per user, zone and the raw query string.
 */
function buildCacheKey(userId: string, zone: string, query: string): string {
  return `${userId}:${zone}:${query}`;
}

/**
 * Normalise raw payloads from each source into `SearchResult`.
 * Each source can provide its own parser – we keep the default simple for the
 * built‑in sources.
 */
function normalizeResults(source: SearchSource, raw: any[]): SearchResult[] {
  // Serper returns an array of objects with `title`, `link`, `snippet`.
  if (source.id === "serper") {
    return raw.map((item) => ({
      id: `${source.id}:${item.title}`,
      title: item.title ?? "",
      link: item.link ?? "",
      snippet: item.snippet ?? "",
      source: source.id,
      pubDate: item.published ?? undefined,
    }));
  }
  // Reddit JSON structure
  if (source.id === "reddit") {
    return raw.map((item) => ({
      id: `${source.id}:${item.id}`,
      title: item.title ?? "",
      link: `https://reddit.com${item.permalink}`,
      snippet: item.selftext?.slice(0, 200),
      source: source.id,
      pubDate: item.created_utc ? new Date(item.created_utc * 1000).toISOString() : undefined,
    }));
  }
  // GitHub code search results
  if (source.id === "github") {
    return raw.map((item) => ({
      id: `${source.id}:${item.sha}`,
      title: item.name ?? "",
      link: item.html_url ?? "",
      snippet: item.path,
      source: source.id,
    }));
  }
  // RSS items already conform to our shape
  if (source.id === "rss") {
    return (raw as RssItem[]).map((item, idx) => ({
      id: `${source.id}:${idx}:${item.guid ?? item.link}`,
      title: item.title,
      link: item.link,
      snippet: item.contentSnippet,
      source: source.id,
      pubDate: item.pubDate,
    }));
  }
  // Fallback – just forward the raw object if it already matches.
  return raw.map((item: any, idx: number) => ({
    id: `${source.id}:${idx}`,
    title: item.title ?? JSON.stringify(item).slice(0, 50),
    link: item.link ?? "",
    snippet: item.snippet ?? undefined,
    source: source.id,
    pubDate: item.pubDate ?? undefined,
  }));
}

/**
 * Perform a hybrid search.
 * @param query   The user‑provided free‑text query (e.g. "seed funding" or "data engineer").
 * @param opts    Additional options controlling zone, limit, and custom sources.
 * @returns       A deduplicated, sorted array of `SearchResult`.
 */
export async function hybridSearch(
  query: string,
  opts: {
    userId: string;
    zone?: string; // e.g. "global", "africa"
    limitPerSource?: number; // default 50
    customSources?: SearchSource[]; // plug‑in additional sources
    rssFeeds?: string[]; // array of RSS URLs to query
  }
): Promise<SearchResult[]> {
  const { userId, zone = "global", limitPerSource = 50, customSources = [], rssFeeds = [] } = opts;

  const cacheKey = buildCacheKey(userId, zone, query);
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.results;
  }

  // Aggregate sources – built‑in defaults + any custom ones.
  const sources: SearchSource[] = [...DEFAULT_SOURCES, ...customSources];

  // Prepare promises for each source.
  const fetchPromises = sources.map(async (source) => {
    const limit = Math.min(limitPerSource, source.maxResults);
    const request = source.buildRequest({ query, limit, apiKey: undefined });
    const response = await fetch(request.url, request.options);
    if (!response.ok) {
      console.warn(`Source ${source.id} responded ${response.status}`);
      return [] as SearchResult[];
    }
    const payload = await response.json();
    // Most APIs expose `results` or `items` – we try a few heuristics.
    const raw = payload.results ?? payload.items ?? payload.data ?? [];
    return normalizeResults(source, raw);
  });

  // RSS feeds – each feed is treated as an independent source.
  const rssPromises = rssFeeds.map(async (feedUrl) => {
    const items = await fetchRssFeed(feedUrl, limitPerSource, userId, zone);
    const rssSource = RSS_CONFIG(feedUrl, limitPerSource);
    return normalizeResults(rssSource, items);
  });

  const settled = await Promise.allSettled([...fetchPromises, ...rssPromises]);
  const allResults: SearchResult[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") {
      allResults.push(...r.value);
    }
  }

  // Deduplicate by `id` – keep the first (most recent) occurrence.
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];
  for (const res of allResults) {
    if (!seen.has(res.id)) {
      seen.add(res.id);
      deduped.push(res);
    }
  }

  // Sort by publication date (newest first) when available, otherwise by source order.
  deduped.sort((a, b) => {
    if (a.pubDate && b.pubDate) {
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    }
    return 0;
  });

  // Cache for next calls.
  cache.set(cacheKey, { timestamp: now, results: deduped });

  return deduped;
}
