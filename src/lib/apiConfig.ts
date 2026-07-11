// src/lib/apiConfig.ts

/**
 * Central configuration for all external search APIs used by Searcher Connector.
 * Supports plug‑and‑play addition of new sources with minimal code changes.
 */

export type SearchSource = {
  /** Unique identifier for the source (e.g., "serper", "reddit", "github", "rss") */
  id: string;
  /** Human readable name */
  name: string;
  /** Base URL or endpoint for the API */
  endpoint: string;
  /** HTTP method to use (GET, POST, etc.) */
  method: "GET" | "POST";
  /** Function that builds the request payload or query parameters */
  buildRequest: (params: Record<string, any>) => {
    url: string;
    options: RequestInit;
  };
  /** Maximum number of results to request per call (as allowed by the service) */
  maxResults: number;
  /** Indicates if the source can be queried without an API key */
  requiresKey: boolean;
};

/** Helper to read environment variables safely */
const getEnv = (key: string): string | undefined => {
  return typeof process !== "undefined" && process.env[key] ? process.env[key] : undefined;
};

/** Serper (Google) configuration – high volume search */
export const SERPER_CONFIG: SearchSource = {
  id: "serper",
  name: "Serper (Google Search)",
  endpoint: "https://google.serper.dev/search",
  method: "POST",
  maxResults: 50, // Serper allows up to 50 results per request
  requiresKey: true,
  buildRequest: (params) => {
    const apiKey = params.apiKey ?? getEnv("SERPER_API_KEY");
    const body = {
      q: params.query,
      // Serper supports a "num" field for result count
      num: params.limit ?? SERPER_CONFIG.maxResults,
    };
    return {
      url: SERPER_CONFIG.endpoint,
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey ?? "",
        },
        body: JSON.stringify(body),
      },
    };
  },
};

/** Reddit JSON endpoint configuration (no auth needed for public subreddits) */
export const REDDIT_CONFIG: SearchSource = {
  id: "reddit",
  name: "Reddit (r/Jobs, r/Startups…)",
  endpoint: "https://www.reddit.com/search.json",
  method: "GET",
  maxResults: 100,
  requiresKey: false,
  buildRequest: (params) => {
    const query = encodeURIComponent(params.query);
    const limit = params.limit ?? REDDIT_CONFIG.maxResults;
    const url = `${REDDIT_CONFIG.endpoint}?q=${query}&limit=${limit}&sort=new`;
    return { url, options: { method: "GET" } };
  },
};

/** GitHub code/search API (public) – we use the search API */
export const GITHUB_CONFIG: SearchSource = {
  id: "github",
  name: "GitHub Search",
  endpoint: "https://api.github.com/search/code",
  method: "GET",
  maxResults: 100,
  requiresKey: true,
  buildRequest: (params) => {
    const apiKey = params.apiKey ?? getEnv("GITHUB_TOKEN");
    const q = encodeURIComponent(params.query);
    const perPage = params.limit ?? GITHUB_CONFIG.maxResults;
    const url = `${GITHUB_CONFIG.endpoint}?q=${q}&per_page=${perPage}`;
    return {
      url,
      options: {
        method: "GET",
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(apiKey ? { Authorization: `token ${apiKey}` } : {}),
        },
      },
    };
  },
};

/** Twitter (X) recent search – requires Bearer token */
export const TWITTER_CONFIG: SearchSource = {
  id: "twitter",
  name: "Twitter (X) Search",
  endpoint: "https://api.twitter.com/2/tweets/search/recent",
  method: "GET",
  maxResults: 100,
  requiresKey: true,
  buildRequest: (params) => {
    const apiKey = params.apiKey ?? getEnv("TWITTER_BEARER_TOKEN");
    const query = encodeURIComponent(params.query);
    const maxResults = params.limit ?? 10; // Twitter caps at 100 per request, 10 is safe default
    const url = `${TWITTER_CONFIG.endpoint}?query=${query}&max_results=${maxResults}`;
    return {
      url,
      options: {
        method: "GET",
        headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      },
    };
  },
};

/** Mastodon public search on a given instance – no auth needed for public instance */
export const MASTODON_CONFIG: SearchSource = {
  id: "mastodon",
  name: "Mastodon Search",
  endpoint: "https://mastodon.social/api/v2/search",
  method: "GET",
  maxResults: 40,
  requiresKey: false,
  buildRequest: (params) => {
    const query = encodeURIComponent(params.query);
    const limit = params.limit ?? MASTODON_CONFIG.maxResults;
    const url = `${MASTODON_CONFIG.endpoint}?q=${query}&limit=${limit}&type=statuses`;
    return { url, options: { method: "GET" } };
  },
};

/** Instagram Basic Display – requires user token */
export const INSTAGRAM_CONFIG: SearchSource = {
  id: "instagram",
  name: "Instagram Basic Display",
  endpoint: "https://graph.instagram.com/me/media",
  method: "GET",
  maxResults: 50,
  requiresKey: true,
  buildRequest: (params) => {
    const apiKey = params.apiKey ?? getEnv("INSTAGRAM_ACCESS_TOKEN");
    const fields = "id,caption,media_url,permalink,timestamp";
    const limit = params.limit ?? INSTAGRAM_CONFIG.maxResults;
    const url = `${INSTAGRAM_CONFIG.endpoint}?fields=${fields}&limit=${limit}&access_token=${apiKey}`;
    return { url, options: { method: "GET" } };
  },
};

/** LinkedIn Search – requires OAuth token (user supplies a raw token) */
export const LINKEDIN_CONFIG: SearchSource = {
  id: "linkedin",
  name: "LinkedIn Search",
  endpoint: "https://api.linkedin.com/v2/search",
  method: "GET",
  maxResults: 50,
  requiresKey: true,
  buildRequest: (params) => {
    const apiKey = params.apiKey ?? getEnv("LINKEDIN_ACCESS_TOKEN");
    const q = encodeURIComponent(params.query);
    const count = params.limit ?? LINKEDIN_CONFIG.maxResults;
    const url = `${LINKEDIN_CONFIG.endpoint}?q=keywords&keywords=${q}&count=${count}`;
    return {
      url,
      options: { method: "GET", headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) } },
    };
  },
};

/** Facebook Graph Search – requires token */
export const FACEBOOK_CONFIG: SearchSource = {
  id: "facebook",
  name: "Facebook Graph Search",
  endpoint: "https://graph.facebook.com/v12.0/me/feed",
  method: "GET",
  maxResults: 50,
  requiresKey: true,
  buildRequest: (params) => {
    const apiKey = params.apiKey ?? getEnv("FACEBOOK_ACCESS_TOKEN");
    const limit = params.limit ?? FACEBOOK_CONFIG.maxResults;
    const url = `${FACEBOOK_CONFIG.endpoint}?limit=${limit}&access_token=${apiKey}`;
    return { url, options: { method: "GET" } };
  },
};

/** TikTok Open Search – requires Bearer token */
export const TIKTOK_CONFIG: SearchSource = {
  id: "tiktok",
  name: "TikTok Open Search",
  endpoint: "https://open.tiktokapis.com/v2/discover/search",
  method: "GET",
  maxResults: 50,
  requiresKey: true,
  buildRequest: (params) => {
    const apiKey = params.apiKey ?? getEnv("TIKTOK_BEARER_TOKEN");
    const query = encodeURIComponent(params.query);
    const limit = params.limit ?? TIKTOK_CONFIG.maxResults;
    const url = `${TIKTOK_CONFIG.endpoint}?query=${query}&max_results=${limit}`;
    return {
      url,
      options: { method: "GET", headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) } },
    };
  },
};

/** YouTube Data API Search */
export const YOUTUBE_CONFIG: SearchSource = {
  id: "youtube",
  name: "YouTube Search",
  endpoint: "https://www.googleapis.com/youtube/v3/search",
  method: "GET",
  maxResults: 50,
  requiresKey: true,
  buildRequest: (params) => {
    const apiKey = params.apiKey ?? getEnv("YOUTUBE_API_KEY");
    const q = encodeURIComponent(params.query);
    const maxResults = params.limit ?? YOUTUBE_CONFIG.maxResults;
    const url = `${YOUTUBE_CONFIG.endpoint}?part=snippet&q=${q}&maxResults=${maxResults}&key=${apiKey}`;
    return { url, options: { method: "GET" } };
  },
};

/** Pinterest Search – requires token */
export const PINTEREST_CONFIG: SearchSource = {
  id: "pinterest",
  name: "Pinterest Search",
  endpoint: "https://api.pinterest.com/v5/search/pins",
  method: "GET",
  maxResults: 50,
  requiresKey: true,
  buildRequest: (params) => {
    const apiKey = params.apiKey ?? getEnv("PINTEREST_ACCESS_TOKEN");
    const query = encodeURIComponent(params.query);
    const limit = params.limit ?? PINTEREST_CONFIG.maxResults;
    const url = `${PINTEREST_CONFIG.endpoint}?query=${query}&page_size=${limit}`;
    return {
      url,
      options: { method: "GET", headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) } },
    };
  },
};

/** Hacker News Algolia Search – public, no auth */
export const HACKERNEWS_CONFIG: SearchSource = {
  id: "hackernews",
  name: "Hacker News Search",
  endpoint: "https://hn.algolia.com/api/v1/search",
  method: "GET",
  maxResults: 50,
  requiresKey: false,
  buildRequest: (params) => {
    const query = encodeURIComponent(params.query);
    const limit = params.limit ?? HACKERNEWS_CONFIG.maxResults;
    const url = `${HACKERNEWS_CONFIG.endpoint}?query=${query}&hitsPerPage=${limit}`;
    return { url, options: { method: "GET" } };
  },
};

/** Product Hunt GraphQL – requires token */
export const PRODUCTHUNT_CONFIG: SearchSource = {
  id: "producthunt",
  name: "Product Hunt",
  endpoint: "https://api.producthunt.com/v2/api/graphql",
  method: "POST",
  maxResults: 20,
  requiresKey: true,
  buildRequest: (params) => {
    const apiKey = params.apiKey ?? getEnv("PRODUCTHUNT_ACCESS_TOKEN");
    const body = {
      query: `query { search(term: \"${params.query}\", first: ${params.limit ?? PRODUCTHUNT_CONFIG.maxResults}) { edges { node { name tagline description url } } } }`,
    };
    return {
      url: PRODUCTHUNT_CONFIG.endpoint,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify(body),
      },
    };
  },
};

/** RSS Feed configuration – generic, each feed is defined at runtime */
export const RSS_CONFIG = (feedUrl: string, limit: number = 50): SearchSource => ({
  id: "rss",
  name: "RSS Feed",
  endpoint: feedUrl,
  method: "GET",
  maxResults: limit,
  requiresKey: false,
  buildRequest: () => ({ url: feedUrl, options: { method: "GET" } }),
});

/** Export a list of default sources – can be extended elsewhere */
export const DEFAULT_SOURCES: SearchSource[] = [
  SERPER_CONFIG,
  REDDIT_CONFIG,
  GITHUB_CONFIG,
  TWITTER_CONFIG,
  MASTODON_CONFIG,
  INSTAGRAM_CONFIG,
  LINKEDIN_CONFIG,
  FACEBOOK_CONFIG,
  TIKTOK_CONFIG,
  YOUTUBE_CONFIG,
  PINTEREST_CONFIG,
  HACKERNEWS_CONFIG,
  PRODUCTHUNT_CONFIG,
];
