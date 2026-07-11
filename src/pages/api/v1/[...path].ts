// =================================================================
// SEARCHER CONNECTOR — API PUBLIQUE (VERSION 1)
// =================================================================
// API comme Apify pour les entreprises : /api/v1/*

import { NextApiRequest, NextApiResponse } from 'next';
import { verifyApiKey, checkAndIncrementQuota } from '@/lib/api-keys';
import { executeScrapers, executeScraper } from '@/lib/scraper/scraper-core';
import { getAllActorIds, getActorById, getFreeActors } from '@/lib/scraper/actor-registry';
import { addScanJob, getJobStatus, getJobResults } from '@/lib/scraper/queue';

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ─────────────────────────────────────────────────────────────
  // 1. VÉRIFICATION DE LA CLÉ API
  // ─────────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Veuillez fournir une clé API dans le header Authorization: Bearer YOUR_API_KEY',
    });
  }

  const apiKey = authHeader.slice(7);
  const verifiedKey = await verifyApiKey(apiKey);
  if (!verifiedKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Clé API invalide ou expirée',
    });
  }

  // Vérifier le quota
  const quotaOk = await checkAndIncrementQuota(verifiedKey);
  if (!quotaOk) {
    return res.status(429).json({
      error: 'Quota Exceeded',
      message: `Votre quota de ${verifiedKey.requestsLimit} requêtes/mois est dépassé. Veuillez upgrader votre plan.`,
      limit: verifiedKey.requestsLimit,
      reset: 'Prochain mois',
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ROUTAGE DES ENDPOINTS
  // ─────────────────────────────────────────────────────────────
  const path = req.query.path as string[];

  // GET /api/v1/status → État de l'API
  if (req.method === 'GET' && path[0] === 'status') {
    return res.status(200).json({
      status: 'online',
      version: '1.0.0',
      actorCount: getAllActorIds().length,
      userPlan: verifiedKey.plan,
      requestsMade: verifiedKey.requestsMade,
      requestsLimit: verifiedKey.requestsLimit,
    });
  }

  // GET /api/v1/actors → Liste des acteurs disponibles
  if (req.method === 'GET' && path[0] === 'actors') {
    const actors = getAllActorIds().map(id => getActorById(id));
    return res.status(200).json({
      count: actors.length,
      actors: actors.filter(Boolean),
    });
  }

  // POST /api/v1/scrape → Scraper un acteur spécifique
  if (req.method === 'POST' && path[0] === 'scrape') {
    const { actorId, keyword, params = {} } = req.body;

    if (!actorId) {
      return res.status(400).json({ error: 'Missing actorId' });
    }

    const result = await executeScraper({
      actorId,
      keyword: keyword || '',
      params,
    });

    return res.status(200).json(result);
  }

  // POST /api/v1/scan → Lancer un scan complet (asynchrone)
  if (req.method === 'POST' && path[0] === 'scan') {
    const { keyword, actorIds, isPaid = false } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: 'Missing keyword' });
    }

    const job = await addScanJob({
      userId: verifiedKey.userId,
      profileId: 'api-profile',
      keyword,
      isPaid: verifiedKey.plan !== 'free',
      actorIds,
    });

    return res.status(202).json({
      message: 'Scan started',
      jobId: job.id,
      statusUrl: `/api/v1/jobs/${job.id}`,
    });
  }

  // GET /api/v1/jobs/:jobId → Récupérer le statut/résultat d'un job
  if (req.method === 'GET' && path[0] === 'jobs' && path[1]) {
    const jobId = path[1];
    const status = await getJobStatus(jobId, 'searcher-scan');

    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const results = await getJobResults(jobId, 'searcher-scan');
    return res.status(200).json({ ...status, results });
  }

  // GET /api/v1/actors/:actorId → Détails d'un acteur
  if (req.method === 'GET' && path[0] === 'actors' && path[1]) {
    const actorId = path[1];
    const actor = getActorById(actorId);
    if (!actor) {
      return res.status(404).json({ error: 'Actor not found' });
    }
    return res.status(200).json(actor);
  }

  // Endpoint inconnu
  return res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint inconnu. Voir la documentation pour les endpoints disponibles.',
    docs: 'https://docs.searcherconnector.com/api',
  });
}
