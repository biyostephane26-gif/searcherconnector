// src/lib/searchController.ts

import { hybridSearch, SearchResult } from "./multiSearch";
import type { NextApiRequest as Request, NextApiResponse as Response } from "next";

/**
 * HTTP handler for performing a hybrid, plug‑and‑play search.
 *
 * Expected payload (JSON):
 *   {
 *     userId: string,               // identifier for cache scoping
 *     query: string,                // free‑text search term
 *     zone?: string,                // "global", "africa", "local" … (default "global")
 *     limitPerSource?: number,       // max results per source (default 50)
 *     rssFeeds?: string[],           // optional additional RSS URLs
 *     customSources?: any[]          // allow future extensions – not used now
 *   }
 */
export async function handleHybridSearch(req: Request, res: Response) {
  try {
    const {
      userId,
      query,
      zone = "global",
      limitPerSource = 50,
      rssFeeds = [],
      customSources = []
    } = req.body;

    if (!userId || !query) {
      return res.status(400).json({ error: "userId and query are required." });
    }

    const results: SearchResult[] = await hybridSearch(query, {
      userId,
      zone,
      limitPerSource,
      rssFeeds,
      customSources,
    });

    return res.status(200).json({ success: true, results, count: results.length });
  } catch (err: any) {
    console.error("Hybrid search error:", err);
    return res.status(500).json({ error: "Internal server error during hybrid search." });
  }
}
