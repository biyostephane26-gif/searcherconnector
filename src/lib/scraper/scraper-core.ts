// =================================================================
// SEARCHER CONNECTOR — UNIFIED SCRAPER CORE
// =================================================================
// Professional-grade core that handles ALL 300+ actors with a single interface

import {
  ActorMetadata,
  ScraperJobData,
  ScraperOutput,
  ScraperResult,
} from './actor-registry';
import { getActorById } from './actor-registry';
import { fetchGenericAPI, fetchGenericRSS, fetchATS } from './generators';
import * as Actors from './actors';
import { scrapeLinkedInPublic, scrapeUpworkPublic, scrapeMaltPublic, scrapeTuring, scrapeArcDev } from './actors/premium-playwright-actors';

// ─────────────────────────────────────────────────────────────────
// CORE EXECUTOR (Single Entry Point for All Actors)
// ─────────────────────────────────────────────────────────────────

export async function executeScraper(job: ScraperJobData): Promise<ScraperOutput> {
  const { actorId, params, keyword } = job;
  const actor = getActorById(actorId);

  if (!actor) {
    return {
      success: false,
      actorId,
      results: [],
      errors: [`Actor "${actorId}" not found in registry`],
    };
  }

  const startTime = Date.now();
  const errors: string[] = [];
  let results: ScraperResult[] = [];

  try {
    // 1. Route to appropriate handler
    if (actor.type === 'api') {
      if (actor.url) {
        results = await fetchGenericAPI(actor.url, keyword, actor.isPaidOnly);
      }
      // Check for custom API actor implementation
      const customHandler = getCustomHandler(actorId);
      if (customHandler) {
        results = await customHandler(keyword);
      }
    } else if (actor.type === 'rss') {
      if (actor.url) {
        results = await fetchGenericRSS(actor.url, keyword, actor.isPaidOnly);
      }
    } else if (actor.type === 'ats') {
      // For ATS, we need to map from actor to ATS_COMPANIES
      results = await handleATS(actor, keyword);
    } else if (actor.type === 'browser' || actor.type === 'custom') {
      const customHandler = getCustomHandler(actorId);
      if (customHandler) {
        results = await customHandler(keyword);
      }
    }

    // 2. Apply freshness filter (last 24h only)
    results = applyFreshnessFilter(results, 24);

    // 3. Deduplicate results
    results = deduplicateResults(results);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(errorMsg);
    console.error(`❌ Scraper error (${actorId}):`, error);
  }

  const executionTime = Date.now() - startTime;

  return {
    success: errors.length === 0,
    actorId,
    results,
    errors,
    metadata: {
      executionTimeMs: executionTime,
      resultCount: results.length,
      actorName: actor.name,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// HELPER: Route to Custom Handlers (for handwritten actors)
// ─────────────────────────────────────────────────────────────────

function getCustomHandler(
  actorId: string
): ((keyword: string) => Promise<ScraperResult[]>) | null {
  // Map actor IDs to our handwritten actor functions
  const handlerMap: Record<
    string,
    (keyword: string) => Promise<ScraperResult[]>
  > = {
    'remotive': async (keyword: string) => {
      const raw = await Actors.scrapeRemotive(keyword);
      return raw.map(item => ({
        title: item.title || '',
        company: item.company || '',
        location: item.location || '',
        link: item.url || item.link || '',
        snippet: item.snippet || '',
        date: item.date || '',
        source: 'remotive',
        isPremium: false,
      }));
    },
    'arbeitnow': Actors.scrapeArbeitnow,
    'himalayas': Actors.scrapeHimalayas,
    'wizbii': Actors.scrapeWizbii,
    'adzuna': Actors.scrapeAdzuna,
    'rss-hackernews': Actors.scrapeHackerNews,
    'github': Actors.scrapeGitHub,
    'rss-devto': Actors.scrapeDevTo,
    'producthunt': Actors.scrapeProductHunt,
    'social-reddit-r-forhire': Actors.scrapeRedditJobs,
    'linkedin': scrapeLinkedInPublic,
    'linkedin-premium-jobs': async (keyword: string) => {
      const results = await scrapeLinkedInPublic(keyword);
      return results.map(r => ({ ...r, isPremium: true }));
    },
    'upwork': scrapeUpworkPublic,
    'malt': scrapeMaltPublic,
    'turing': scrapeTuring,
    'arc-dev': scrapeArcDev,
    // Also support old IDs for backward compatibility
    'hackernews': Actors.scrapeHackerNews,
    'devto': Actors.scrapeDevTo,
    'reddit-jobs': Actors.scrapeRedditJobs,
  };
  return handlerMap[actorId] || null;
}

// ─────────────────────────────────────────────────────────────────
// HELPER: ATS Handler
// ─────────────────────────────────────────────────────────────────

import { ATS_COMPANIES } from './massive-sources';

async function handleATS(
  actor: ActorMetadata,
  keyword: string
): Promise<ScraperResult[]> {
  // Find matching ATS company
  const company = ATS_COMPANIES.find(c =>
    `ats-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` === actor.id
  );
  if (!company) return [];

  const raw = await fetchATS(company, keyword);
  return raw.map(item => ({
    title: item.title || '',
    company: item.company || company.name,
    location: item.location || '',
    link: item.link || '',
    snippet: item.snippet || '',
    date: item.date || '',
    source: `${company.name} (${company.ats})`,
  }));
}

// ─────────────────────────────────────────────────────────────────
// HELPER: Freshness Filter
// ─────────────────────────────────────────────────────────────────

function applyFreshnessFilter(
  results: ScraperResult[],
  maxHours: number = 24
): ScraperResult[] {
  const now = Date.now();
  return results.filter(item => {
    if (!item.date) return true;
    try {
      const itemDate = new Date(item.date);
      const ageMs = now - itemDate.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      return ageHours <= maxHours;
    } catch {
      return true;
    }
  });
}

// ─────────────────────────────────────────────────────────────────
// HELPER: Deduplication
// ─────────────────────────────────────────────────────────────────

function deduplicateResults(results: ScraperResult[]): ScraperResult[] {
  const seen = new Set<string>();
  return results.filter(item => {
    const key = `${item.title.toLowerCase()}|${(item.company || '').toLowerCase()}|${(item.link || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────
// BATCH EXECUTOR (For Parallel Execution of Multiple Actors)
// ─────────────────────────────────────────────────────────────────

export async function executeScrapers(
  actorIds: string[],
  keyword: string,
  concurrency: number = 5
): Promise<ScraperOutput[]> {
  const results: ScraperOutput[] = [];
  const chunkSize = concurrency;

  for (let i = 0; i < actorIds.length; i += chunkSize) {
    const chunk = actorIds.slice(i, i + chunkSize);
    const chunkPromises = chunk.map(actorId =>
      executeScraper({ actorId, keyword, params: {} })
    );
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
}
