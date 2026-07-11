// =================================================================
// SEARCHER CONNECTOR — PRODUCTION API: SCAN (V2)
// =================================================================
// Enterprise-grade scan endpoint with queue, caching, rate limiting

import { NextApiRequest, NextApiResponse } from 'next';
import {
  addScanJob,
  checkRateLimit,
  getJobStatus,
  getJobResults,
  getQueueStatus,
} from '../../lib/scraper/queue';
import { scanCache } from '../../lib/scraper/cache-manager';
import { getFreeActors, getPaidActors, getAllActorIds, getActorById } from '../../lib/scraper/actor-registry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  try {
    // CORS (adjust for your domain)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // ========================
    // GET: Job Status or Queue Status
    // ========================
    if (req.method === 'GET') {
      const { jobId, status: statusFlag, actors } = req.query;

      // Queue Status
      if (statusFlag === 'queue') {
        const status = await getQueueStatus();
        return res.status(200).json(status);
      }

      // Actors List
      if (actors === 'list') {
        const all = getAllActorIds();
        const free = getFreeActors().map(a => a.id);
        const paid = getPaidActors().map(a => a.id);
        return res.status(200).json({ all, free, paid, total: all.length });
      }

      // Job Status/Results
      if (jobId) {
        const jobInfo = await getJobStatus(jobId as string, 'searcher-scan');
        if (!jobInfo) return res.status(404).json({ error: 'Job not found' });
        const results = await getJobResults(jobId as string, 'searcher-scan');
        return res.status(200).json({ ...jobInfo, results });
      }

      // Fallback: Return basic info
      return res.status(200).json({
        message: 'Searcher Connector Scan API V2',
        endpoints: {
          POST: '/api/scan (start scan)',
          GET: {
            '/api/scan?jobId=xxx': 'Get job status/results',
            '/api/scan?status=queue': 'Get queue status',
            '/api/scan?actors=list': 'Get list of actors',
          },
        },
      });
    }

    // ========================
    // POST: Start Scan
    // ========================
    if (req.method === 'POST') {
      const { userId, profileId, keyword, isPaid = false, actorIds } = req.body;

      // Validate input
      if (!userId || !profileId || !keyword) {
        return res.status(400).json({ error: 'userId, profileId, and keyword are required' });
      }

      // Check cache first (avoid re-scanning same query too often)
      const cacheKey = `${userId}:${profileId}:${keyword.toLowerCase()}`;
      const cached = await scanCache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          fromCache: true,
          results: cached,
          message: 'Using cached results (TIL will refresh soon)',
        });
      }

      // Rate limit check
      const rateLimitOk = await checkRateLimit(userId, isPaid);
      if (!rateLimitOk) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          limit: isPaid ? 10 : 1,
          window: '1 hour',
          retryAfter: '3600',
        });
      }

      // Add to queue
      const job = await addScanJob({
        userId,
        profileId,
        keyword: keyword.trim(),
        isPaid,
        actorIds,
      });

      // Return job info for polling
      return res.status(202).json({
        success: true,
        message: 'Scan job added to queue',
        jobId: job.id,
        queuePosition: job.opts?.priority || 10,
        estimatedWait: 'Up to 5 minutes (shorter for paid plans)',
      });
    }

    // ========================
    // Invalid Method
    // ========================
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Scan API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error)?.message || 'Unknown error',
    });
  }
}
