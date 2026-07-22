// =================================================================
// SEARCHER CONNECTOR — ACTOR REGISTRY
// =================================================================
// This registry maps all 300+ sources to their scrapers
// Uses isPaidOnly directly from massive-sources.ts

import {
  JOB_BOARDS,
  ATS_COMPANIES,
  FREELANCE_PLATFORMS,
  TECH_RSS_FEEDS,
  SOCIAL_COMMUNITIES,
  NICHE_PLATFORMS,
  AI_TECH_PLATFORMS,
  GLOBAL_FREELANCE,
  INTERNSHIP_JUNIOR,
  REMOTE_EXCLUSIVE,
  EXECUTIVE_CAREERS,
  INDUSTRY_SPECIALIZED,
} from "./massive-sources";

export type ActorCategory =
  | "job-board"
  | "ats"
  | "freelance"
  | "tech-rss"
  | "social-community"
  | "niche-platform"
  | "ai-tech"
  | "global-freelance"
  | "internship-junior"
  | "remote-exclusive"
  | "executive-careers"
  | "industry-specialized";

export type ActorType = "api" | "rss" | "browser" | "ats";

export interface ActorMetadata {
  id: string;
  name: string;
  category: ActorCategory;
  type: ActorType;
  url: string;
  isPaidOnly: boolean; // Premium flag
  concurrencyLimit: number;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
  timeoutMs: number;
  // Optional ATS-specific field
  ats?: string;
}

export interface ScraperJobData {
  actorId: string;
  keyword: string;
  params?: Record<string, any>;
}

export interface ScraperResult {
  title: string;
  company?: string;
  location?: string;
  url?: string;
  link?: string;
  snippet?: string;
  date?: string;
  source: string;
  isPremium?: boolean;
}

export interface ScraperOutput {
  success: boolean;
  actorId: string;
  results: ScraperResult[];
  errors?: string[];
  metadata?: {
    executionTimeMs?: number;
    resultCount?: number;
    actorName?: string;
  };
}

// =================================================================
// PROFESSIONAL ACTOR REGISTRY (300+ Sources)
// =================================================================

export const ACTOR_REGISTRY: Record<string, ActorMetadata> = {
  // ──────────── JOB BOARD ACTORS (80+)
  ...Object.fromEntries(
    JOB_BOARDS.map((board) => {
      const id = board.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const isPremium = board.isPaidOnly;
      return [
        id,
        {
          id,
          name: board.name,
          category: "job-board" as ActorCategory,
          type: board.type,
          url: board.url,
          isPaidOnly: isPremium,
          concurrencyLimit: isPremium ? 1 : 2,
          rateLimitRequests: isPremium ? 2 : 5,
          rateLimitWindowMs: isPremium ? 120000 : 60000,
          timeoutMs: isPremium ? 60000 : 15000,
        },
      ];
    })
  ),

  // ──────────── ATS ACTORS (30+)
  ...Object.fromEntries(
    ATS_COMPANIES.map((company) => {
      const id = `ats-${company.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      return [
        id,
        {
          id,
          name: company.name,
          category: "ats" as ActorCategory,
          type: "ats" as ActorType,
          url: `https://${company.ats}/${company.slug}`,
          ats: company.ats,
          isPaidOnly: false, // All ATS are free
          concurrencyLimit: 2,
          rateLimitRequests: 5,
          rateLimitWindowMs: 60000,
          timeoutMs: 15000,
        },
      ];
    })
  ),

  // ──────────── FREELANCE PLATFORM ACTORS (80+)
  ...Object.fromEntries(
    FREELANCE_PLATFORMS.map((platform) => {
      const id = platform.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const isPremium = platform.isPaidOnly;
      return [
        id,
        {
          id,
          name: platform.name,
          category: "freelance" as ActorCategory,
          type: platform.type,
          url: platform.url,
          isPaidOnly: isPremium,
          concurrencyLimit: isPremium ? 1 : 2,
          rateLimitRequests: isPremium ? 2 : 5,
          rateLimitWindowMs: isPremium ? 120000 : 60000,
          timeoutMs: isPremium ? 60000 : 15000,
        },
      ];
    })
  ),

  // ──────────── TECH RSS FEED ACTORS (50+)
  ...Object.fromEntries(
    TECH_RSS_FEEDS.map((feed) => {
      const id = `rss-${feed.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      return [
        id,
        {
          id,
          name: feed.name,
          category: "tech-rss" as ActorCategory,
          type: "rss" as ActorType,
          url: feed.url,
          isPaidOnly: false, // All RSS are free
          concurrencyLimit: 3,
          rateLimitRequests: 10,
          rateLimitWindowMs: 60000,
          timeoutMs: 10000,
        },
      ];
    })
  ),

  // ──────────── SOCIAL COMMUNITY ACTORS (50+)
  ...Object.fromEntries(
    SOCIAL_COMMUNITIES.map((community) => {
      const id = `social-${community.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const isPremium = community.isPaidOnly;
      return [
        id,
        {
          id,
          name: community.name,
          category: "social-community" as ActorCategory,
          type: "browser" as ActorType,
          url: community.url,
          isPaidOnly: isPremium,
          concurrencyLimit: isPremium ? 1 : 2,
          rateLimitRequests: isPremium ? 2 : 5,
          rateLimitWindowMs: isPremium ? 120000 : 60000,
          timeoutMs: isPremium ? 60000 : 15000,
        },
      ];
    })
  ),
  
  // ──────────── NICHE PLATFORM ACTORS (400+)
  ...Object.fromEntries(
    NICHE_PLATFORMS.map((platform) => {
      const id = `niche-${platform.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const isPremium = platform.isPaidOnly;
      return [
        id,
        {
          id,
          name: platform.name,
          category: "niche-platform" as ActorCategory,
          type: platform.type,
          url: platform.url,
          isPaidOnly: isPremium,
          concurrencyLimit: isPremium ? 1 : 2,
          rateLimitRequests: isPremium ? 2 : 5,
          rateLimitWindowMs: isPremium ? 120000 : 60000,
          timeoutMs: isPremium ? 60000 : 15000,
        },
      ];
    })
  ),

  // ──────────── AI & TECH PLATFORM ACTORS (200+)
  ...Object.fromEntries(
    AI_TECH_PLATFORMS.map((platform) => {
      const id = `ai-tech-${platform.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const isPremium = platform.isPaidOnly;
      return [
        id,
        {
          id,
          name: platform.name,
          category: "ai-tech" as ActorCategory,
          type: platform.type,
          url: platform.url,
          isPaidOnly: isPremium,
          concurrencyLimit: isPremium ? 1 : 2,
          rateLimitRequests: isPremium ? 2 : 5,
          rateLimitWindowMs: isPremium ? 120000 : 60000,
          timeoutMs: isPremium ? 60000 : 15000,
        },
      ];
    })
  ),

  // ──────────── GLOBAL FREELANCE ACTORS (200+)
  ...Object.fromEntries(
    GLOBAL_FREELANCE.map((platform) => {
      const id = `global-freelance-${platform.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const isPremium = platform.isPaidOnly;
      return [
        id,
        {
          id,
          name: platform.name,
          category: "global-freelance" as ActorCategory,
          type: platform.type,
          url: platform.url,
          isPaidOnly: isPremium,
          concurrencyLimit: isPremium ? 1 : 2,
          rateLimitRequests: isPremium ? 2 : 5,
          rateLimitWindowMs: isPremium ? 120000 : 60000,
          timeoutMs: isPremium ? 60000 : 15000,
        },
      ];
    })
  ),

  // ──────────── INTERNSHIP & JUNIOR ACTORS (150+)
  ...Object.fromEntries(
    INTERNSHIP_JUNIOR.map((platform) => {
      const id = `internship-junior-${platform.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const isPremium = platform.isPaidOnly;
      return [
        id,
        {
          id,
          name: platform.name,
          category: "internship-junior" as ActorCategory,
          type: platform.type,
          url: platform.url,
          isPaidOnly: isPremium,
          concurrencyLimit: isPremium ? 1 : 2,
          rateLimitRequests: isPremium ? 2 : 5,
          rateLimitWindowMs: isPremium ? 120000 : 60000,
          timeoutMs: isPremium ? 60000 : 15000,
        },
      ];
    })
  ),

  // ──────────── REMOTE EXCLUSIVE ACTORS (150+)
  ...Object.fromEntries(
    REMOTE_EXCLUSIVE.map((platform) => {
      const id = `remote-exclusive-${platform.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const isPremium = platform.isPaidOnly;
      return [
        id,
        {
          id,
          name: platform.name,
          category: "remote-exclusive" as ActorCategory,
          type: platform.type,
          url: platform.url,
          isPaidOnly: isPremium,
          concurrencyLimit: isPremium ? 1 : 2,
          rateLimitRequests: isPremium ? 2 : 5,
          rateLimitWindowMs: isPremium ? 120000 : 60000,
          timeoutMs: isPremium ? 60000 : 15000,
        },
      ];
    })
  ),

  // ──────────── EXECUTIVE CAREERS ACTORS (100+)
  ...Object.fromEntries(
    EXECUTIVE_CAREERS.map((platform) => {
      const id = `executive-careers-${platform.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const isPremium = platform.isPaidOnly;
      return [
        id,
        {
          id,
          name: platform.name,
          category: "executive-careers" as ActorCategory,
          type: platform.type,
          url: platform.url,
          isPaidOnly: isPremium,
          concurrencyLimit: isPremium ? 1 : 2,
          rateLimitRequests: isPremium ? 2 : 5,
          rateLimitWindowMs: isPremium ? 120000 : 60000,
          timeoutMs: isPremium ? 60000 : 15000,
        },
      ];
    })
  ),

  // ──────────── INDUSTRY SPECIALIZED ACTORS (200+)
  ...Object.fromEntries(
    INDUSTRY_SPECIALIZED.map((platform) => {
      const id = `industry-specialized-${platform.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const isPremium = platform.isPaidOnly;
      return [
        id,
        {
          id,
          name: platform.name,
          category: "industry-specialized" as ActorCategory,
          type: platform.type,
          url: platform.url,
          isPaidOnly: isPremium,
          concurrencyLimit: isPremium ? 1 : 2,
          rateLimitRequests: isPremium ? 2 : 5,
          rateLimitWindowMs: isPremium ? 120000 : 60000,
          timeoutMs: isPremium ? 60000 : 15000,
        },
      ];
    })
  ),
};

// =================================================================
// HELPER FUNCTIONS
// =================================================================

export function getActorById(id: string): ActorMetadata | undefined {
  return ACTOR_REGISTRY[id];
}

export function getActorsByCategory(
  category: ActorCategory
): ActorMetadata[] {
  return Object.values(ACTOR_REGISTRY).filter((a) => a.category === category);
}

export function getAllActors(): ActorMetadata[] {
  return Object.values(ACTOR_REGISTRY);
}

export function getFreeActors(): ActorMetadata[] {
  return Object.values(ACTOR_REGISTRY).filter((a) => !a.isPaidOnly);
}

export function getPremiumActors(): ActorMetadata[] {
  return Object.values(ACTOR_REGISTRY).filter((a) => a.isPaidOnly);
}

export function getActorCount(): { total: number; free: number; premium: number } {
  const all = Object.values(ACTOR_REGISTRY);
  return {
    total: all.length,
    free: all.filter((a) => !a.isPaidOnly).length,
    premium: all.filter((a) => a.isPaidOnly).length,
  };
}

// =================================================================
// ALIASES FOR BACKWARD COMPATIBILITY
// =================================================================

export function getPaidActors(): ActorMetadata[] {
  return getPremiumActors();
}

export function getAllActorIds(): string[] {
  return Object.keys(ACTOR_REGISTRY);
}
