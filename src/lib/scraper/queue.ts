// =================================================================
// SEARCHER CONNECTOR — PRODUCTION QUEUE SYSTEM (BullMQ)
// =================================================================
// Enterprise-grade queue with concurrency control, retries, monitoring

import { Queue, Worker, Job, JobStatus } from 'bullmq';
import IORedis from 'ioredis';
import { executeScraper, executeScrapers } from './scraper-core';
import { getActorById, getFreeActors, getPaidActors } from './actor-registry';
import type { ScraperJobData, ScraperOutput, ActorMetadata } from './actor-registry';

// ─────────────────────────────────────────────────────────────────
// REDIS CONNECTION (Production-Grade)
// ─────────────────────────────────────────────────────────────────

// Utiliser UPSTASH_REDIS_URL si disponible, sinon configuration standard
let redisConfig: any = {};
if (process.env.UPSTASH_REDIS_URL) {
  // Parse UPSTASH_REDIS_URL: rediss://:TOKEN@HOST:PORT
  const redisUrl = new URL(process.env.UPSTASH_REDIS_URL);
  redisConfig = {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port || '6379'),
    password: redisUrl.password || process.env.UPSTASH_REDIS_TOKEN,
    tls: {},
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  };
} else {
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  };
}

export const redis = new IORedis(redisConfig);

redis.on('connect', () => console.log('✅ Redis connected successfully'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

// ─────────────────────────────────────────────────────────────────
// QUEUE DEFINITIONS
// ─────────────────────────────────────────────────────────────────

export const SCRAPER_QUEUE_NAME = 'searcher-scraper';
export const SCAN_QUEUE_NAME = 'searcher-scan';

export const scraperQueue = new Queue(SCRAPER_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 }, // Keep completed jobs for 1 hour
    removeOnFail: { age: 86400, count: 5000 }, // Keep failed jobs for 24h
  },
});

export const scanQueue = new Queue(SCAN_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { age: 7200, count: 500 },
    removeOnFail: { age: 86400, count: 500 },
  },
});

// ─────────────────────────────────────────────────────────────────
// TYPES FOR JOBS
// ─────────────────────────────────────────────────────────────────

export interface ScanJobData {
  userId: string;
  profileId: string;
  keyword: string;
  isPaid: boolean;
  actorIds?: string[];
}

export interface ScanJobResult {
  userId: string;
  profileId: string;
  keyword: string;
  totalActors: number;
  successCount: number;
  failCount: number;
  results: ScraperOutput[];
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────
// RATE LIMITING (Per User)
// ─────────────────────────────────────────────────────────────────

const RATE_LIMIT_KEY_PREFIX = 'scraper:rate-limit:';

export async function checkRateLimit(userId: string, isPaid: boolean): Promise<boolean> {
  const maxRequests = isPaid ? 10 : 1;
  const windowMs = 3600000; // 1 hour
  const key = `${RATE_LIMIT_KEY_PREFIX}${userId}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowMs / 1000);
  }

  return current <= maxRequests;
}

export async function getRateLimitRemaining(userId: string): Promise<number> {
  const key = `${RATE_LIMIT_KEY_PREFIX}${userId}`;
  const current = await redis.get(key);
  return current ? parseInt(current, 10) : 0;
}

// ─────────────────────────────────────────────────────────────────
// ADD JOBS TO QUEUE
// ─────────────────────────────────────────────────────────────────

export async function addScraperJob(
  data: ScraperJobData,
  priority: number = 10
): Promise<Job<ScraperJobData>> {
  return await scraperQueue.add(`scraper:${data.actorId}`, data, {
    priority: getActorById(data.actorId)?.isPaidOnly ? 1 : priority,
    jobId: `${data.actorId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
  });
}

export async function addScanJob(data: ScanJobData): Promise<Job<ScanJobData>> {
  // Determine which actors to use
  let actorIds: string[] = data.actorIds || [];
  if (actorIds.length === 0) {
    actorIds = data.isPaid ? getPaidActors().map(a => a.id) : getFreeActors().map(a => a.id);
  }

  return await scanQueue.add(`scan:${data.profileId}`, data, {
    priority: data.isPaid ? 1 : 10,
    jobId: `scan:${data.profileId}:${Date.now()}`,
  });
}

// ─────────────────────────────────────────────────────────────────
// WORKER PROCESSORS
// ─────────────────────────────────────────────────────────────────

async function processScraperJob(job: Job<ScraperJobData>): Promise<ScraperOutput> {
  console.log(`🔄 Processing scraper job ${job.id} for actor ${job.data.actorId}`);
  const result = await executeScraper(job.data);
  console.log(`✅ Scraper job ${job.id} complete: ${result.results.length} results`);
  return result;
}

async function processScanJob(job: Job<ScanJobData>): Promise<ScanJobResult> {
  console.log(`🔄 Processing scan job ${job.id} for user ${job.data.userId}`);
  const startTime = Date.now();
  const { userId, profileId, keyword, isPaid, actorIds: customActorIds } = job.data;

  // Determine actors to use
  let actorIds: string[] = customActorIds || [];
  if (actorIds.length === 0) {
    actorIds = isPaid ? getPaidActors().map(a => a.id) : getFreeActors().map(a => a.id);
  }

  // Execute scrapers with concurrency control
  const results = await executeScrapers(actorIds, keyword, isPaid ? 5 : 3);
  const durationMs = Date.now() - startTime;

  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  console.log(`✅ Scan job ${job.id} complete: ${successCount}/${results.length} actors succeeded in ${durationMs}ms`);

  return {
    userId,
    profileId,
    keyword,
    totalActors: results.length,
    successCount,
    failCount,
    results,
    durationMs,
  };
}

// ─────────────────────────────────────────────────────────────────
// WORKER INITIALIZATION
// ─────────────────────────────────────────────────────────────────

export function startScraperWorker(concurrency: number = 5): Worker {
  const worker = new Worker<ScraperJobData, ScraperOutput>(
    SCRAPER_QUEUE_NAME,
    processScraperJob,
    { connection: redis, concurrency }
  );

  worker.on('completed', (job) => console.log(`✅ Scraper job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`❌ Scraper job ${job?.id} failed:`, err));
  worker.on('stalled', (jobId) => console.warn(`⚠️ Scraper job ${jobId} stalled`));

  console.log(`🚀 Scraper worker started (concurrency: ${concurrency})`);
  return worker;
}

export function startScanWorker(concurrency: number = 2): Worker {
  const worker = new Worker<ScanJobData, ScanJobResult>(
    SCAN_QUEUE_NAME,
    processScanJob,
    { connection: redis, concurrency }
  );

  worker.on('completed', (job) => console.log(`✅ Scan job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`❌ Scan job ${job?.id} failed:`, err));
  worker.on('stalled', (jobId) => console.warn(`⚠️ Scan job ${jobId} stalled`));

  console.log(`🚀 Scan worker started (concurrency: ${concurrency})`);
  return worker;
}

// ─────────────────────────────────────────────────────────────────
// QUEUE STATUS & MONITORING
// ─────────────────────────────────────────────────────────────────

export async function getQueueStatus(): Promise<{
  scraper: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
  scan: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
}> {
  const [scraperCounts, scanCounts, scraperPaused, scanPaused] = await Promise.all([
    scraperQueue.getJobCounts(),
    scanQueue.getJobCounts(),
    scraperQueue.isPaused(),
    scanQueue.isPaused(),
  ]);

  return {
    scraper: { ...scraperCounts, paused: scraperPaused },
    scan: { ...scanCounts, paused: scanPaused },
  };
}

export async function getJobStatus(jobId: string, queueName: string = SCRAPER_QUEUE_NAME): Promise<{
  status: JobStatus;
  data?: any;
  returnValue?: any;
  failedReason?: string;
  stacktrace?: string[];
} | null> {
  const queue = queueName === SCRAPER_QUEUE_NAME ? scraperQueue : scanQueue;
  const job = await queue.getJob(jobId);
  if (!job) return null;

  const status = await job.getState();
  const data = job.data;
  const returnValue = await job.returnvalue();
  const failedReason = job.failedReason;
  const stacktrace = await job.stacktrace();

  return { status, data, returnValue, failedReason, stacktrace };
}

export async function getJobResults(jobId: string, queueName: string = SCRAPER_QUEUE_NAME): Promise<any | null> {
  const queue = queueName === SCRAPER_QUEUE_NAME ? scraperQueue : scanQueue;
  const job = await queue.getJob(jobId);
  if (!job) return null;
  return await job.returnvalue();
}

// ─────────────────────────────────────────────────────────────────
// WAITLIST FUNCTIONS
// ─────────────────────────────────────────────────────────────────

const WAITLIST_KEY = 'searcher:waitlist';
const WAITLIST_COUNT_KEY = 'searcher:waitlist:count';

export async function addToWaitlist(email: string, country?: string): Promise<number> {
  // Ajouter l'email à une liste Redis triée par timestamp
  const timestamp = Date.now();
  const value = JSON.stringify({ email, country, timestamp });
  await redis.zadd(WAITLIST_KEY, timestamp, value);
  
  // Incrémenter le compteur total
  const position = await redis.incr(WAITLIST_COUNT_KEY);
  return position;
}

export async function getWaitlistPosition(email: string): Promise<number | null> {
  // Récupérer tous les membres de la waitlist
  const members = await redis.zrange(WAITLIST_KEY, 0, -1);
  const index = members.findIndex((m: string) => {
    try {
      const data = JSON.parse(m);
      return data.email === email;
    } catch {
      return false;
    }
  });
  
  return index === -1 ? null : index + 1;
}

export async function getWaitlistStats(): Promise<{ total: number }> {
  const total = await redis.get(WAITLIST_COUNT_KEY);
  return { total: total ? parseInt(total, 10) : 0 };
}
