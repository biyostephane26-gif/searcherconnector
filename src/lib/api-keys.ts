// =================================================================
// SEARCHER CONNECTOR — GESTION DES CLÉS API
// =================================================================
// Système de clés API comme Apify pour les entreprises

import crypto from 'crypto';
import { redis } from './scraper/queue';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type ApiKeyPlan = 'free' | 'starter' | 'pro' | 'enterprise';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  plan: ApiKeyPlan;
  requestsMade: number;
  requestsLimit: number;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────

const API_KEY_PREFIX = 'sc_api_';
const REDIS_KEY_PREFIX = 'searcher:api_keys:';
const REDIS_QUOTA_PREFIX = 'searcher:api_quota:';

const PLAN_LIMITS: Record<ApiKeyPlan, number> = {
  free: 100,        // 100 req/mois
  starter: 1000,    // 1k req/mois
  pro: 10000,       // 10k req/mois
  enterprise: 100000, // 100k req/mois
};

// ─────────────────────────────────────────────────────────────────
// GÉNÉRER UNE CLÉ API SÉCURE
// ─────────────────────────────────────────────────────────────────

export function generateApiKey(): string {
  return API_KEY_PREFIX + crypto.randomBytes(32).toString('hex');
}

// ─────────────────────────────────────────────────────────────────
// CRÉER UNE CLÉ API
// ─────────────────────────────────────────────────────────────────

export async function createApiKey(
  userId: string,
  name: string,
  plan: ApiKeyPlan = 'free'
): Promise<ApiKey> {
  const id = crypto.randomUUID();
  const key = generateApiKey();

  const apiKey: ApiKey = {
    id,
    userId,
    name,
    key,
    plan,
    requestsMade: 0,
    requestsLimit: PLAN_LIMITS[plan],
    createdAt: new Date(),
    isActive: true,
  };

  // Sauvegarder dans Redis (et tu pourras sync avec Supabase plus tard)
  await redis.hset(
    `${REDIS_KEY_PREFIX}${userId}`,
    id,
    JSON.stringify(apiKey)
  );

  // Sauvegarder la clé → user mapping pour vérification rapide
  await redis.set(`${REDIS_KEY_PREFIX}by_key:${key}`, userId);

  return apiKey;
}

// ─────────────────────────────────────────────────────────────────
// RÉCUPÉRER LES CLÉS D'UN UTILISATEUR
// ─────────────────────────────────────────────────────────────────

export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  const keysData = await redis.hgetall(`${REDIS_KEY_PREFIX}${userId}`);
  return Object.values(keysData).map((data) => JSON.parse(data));
}

// ─────────────────────────────────────────────────────────────────
// VÉRIFIER UNE CLÉ API
// ─────────────────────────────────────────────────────────────────

export async function verifyApiKey(key: string): Promise<ApiKey | null> {
  const userId = await redis.get(`${REDIS_KEY_PREFIX}by_key:${key}`);
  if (!userId) return null;

  const keysData = await redis.hgetall(`${REDIS_KEY_PREFIX}${userId}`);
  for (const data of Object.values(keysData)) {
    const apiKey = JSON.parse(data);
    if (apiKey.key === key && apiKey.isActive) {
      return apiKey;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────
// VÉRIFIER & INCÉMENTER LE QUOTA
// ─────────────────────────────────────────────────────────────────

export async function checkAndIncrementQuota(apiKey: ApiKey): Promise<boolean> {
  const quotaKey = `${REDIS_QUOTA_PREFIX}${apiKey.id}`;
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const key = `${quotaKey}:${currentMonth}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 60 * 60 * 24 * 31); // Expire dans ~1 mois
  }

  return current <= apiKey.requestsLimit;
}

// ─────────────────────────────────────────────────────────────────
// RÉVOQUER UNE CLÉ API
// ─────────────────────────────────────────────────────────────────

export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  await redis.hdel(`${REDIS_KEY_PREFIX}${userId}`, keyId);
}
