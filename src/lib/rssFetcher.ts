// src/lib/rssFetcher.ts

/**
 * Simple RSS fetcher that returns a list of items with a uniform shape.
 * Supports a maximum number of entries (default 50) and respects the 15‑minute
 * in‑memory cache. The cache key is scoped by `userId` and `zone` so that each
 * user gets fresh data while still benefitting from deduplication.
 */

export type RssItem = {
  title: string;
  link: string;
  pubDate: string;
  guid?: string;
  contentSnippet?: string;
};

interface CacheEntry {
  timestamp: number; // epoch ms
  items: RssItem[];
}

const rssCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Fetch and parse an RSS feed.
 * @param feedUrl    The RSS/Atom feed URL.
 * @param limit      Maximum number of items to return (capped by feed).
 * @param userId     Identifier of the user (for cache scoping).
 * @param zone       Geographic or functional zone (e.g., "global", "africa").
 */
export async function fetchRssFeed(
  feedUrl: string,
  limit: number = 50,
  userId: string = "anonymous",
  zone: string = "global"
): Promise<RssItem[]> {
  const cacheKey = `${userId}:${zone}:${feedUrl}`;
  const now = Date.now();

  // Return cached data if fresh
  const cached = rssCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.items.slice(0, limit);
  }

  // Fetch the raw XML
  const response = await fetch(feedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SearcherConnector/3.0)' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    console.error(`Failed to fetch RSS feed ${feedUrl}: ${response.status}`);
    return [];
  }
  const text = await response.text();

  // Node.js-compatible XML parsing via regex (no DOMParser needed)
  const extractTag = (block: string, tag: string): string => {
    const r = new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`, 'i');
    return (r.exec(block)?.[1] || '').replace(/<[^>]+>/g, '').trim();
  };
  const extractAttrHref = (block: string): string => {
    return /<link[^>]+href=["']([^"']+)["']/i.exec(block)?.[1]?.trim() || '';
  };

  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  const items: RssItem[] = [];

  const processBlock = (block: string) => {
    const title = extractTag(block, 'title');
    let link = extractTag(block, 'link') || extractAttrHref(block);
    const guid = extractTag(block, 'guid');
    if (!link && guid?.startsWith('http')) link = guid;
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'updated') || extractTag(block, 'published');
    const contentSnippet = (extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content')).slice(0, 300);
    if (title && link) items.push({ title, link, pubDate, guid: guid || undefined, contentSnippet });
  };

  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(text)) !== null) processBlock(m[1]);
  while ((m = entryRegex.exec(text)) !== null) processBlock(m[1]);

  const limited = items.slice(0, limit);

  // Store in cache
  rssCache.set(cacheKey, { timestamp: now, items: limited });

  return limited;
}
