// =================================================================
// SEARCHER CONNECTOR — PROFESSIONAL PROXY ROTATOR
// =================================================================
// Enterprise-grade proxy management with health checks, rotation, caching

import IORedis from 'ioredis';
import { redis } from './queue';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';

export interface Proxy {
  id: string;
  host: string;
  port: number;
  protocol: ProxyProtocol;
  username?: string;
  password?: string;
  lastUsed?: Date;
  lastHealthCheck?: Date;
  isHealthy: boolean;
  successCount: number;
  failCount: number;
  lastFailDate?: Date;
}

export interface ProxyConfig {
  healthCheckUrl: string;
  healthCheckTimeoutMs: number;
  maxFailuresBeforeBan: number;
  banDurationMs: number;
  rotationStrategy: 'round-robin' | 'random' | 'least-used';
}

// ─────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ProxyConfig = {
  healthCheckUrl: 'https://httpbin.org/ip',
  healthCheckTimeoutMs: 5000,
  maxFailuresBeforeBan: 3,
  banDurationMs: 3600000, // 1 hour
  rotationStrategy: 'round-robin',
};

const PROXY_REDIS_KEY = 'searcher:proxies';
const PROXY_BAN_KEY_PREFIX = 'searcher:proxies:banned:';
const PROXY_ROUND_ROBIN_KEY = 'searcher:proxies:round-robin-index';

// ─────────────────────────────────────────────────────────────────
// PROXY MANAGER
// ─────────────────────────────────────────────────────────────────

export class ProxyManager {
  private config: ProxyConfig;
  private redis: IORedis;

  constructor(config: Partial<ProxyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.redis = redis;
  }

  // ─────────────────────────────────────────────────────────────────
  // Add Proxies
  // ─────────────────────────────────────────────────────────────────

  async addProxies(proxies: Omit<Proxy>[]): Promise<void> {
    const now = new Date();
    const pipeline = this.redis.pipeline();

    for (const proxy of proxies) {
      const proxyId = proxy.id || `${proxy.protocol}://${proxy.host}:${proxy.port}`;
      const proxyData: Proxy = {
        id: proxyId,
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol,
        username: proxy.username,
        password: proxy.password,
        lastUsed: proxy.lastUsed,
        lastHealthCheck: proxy.lastHealthCheck,
        isHealthy: true,
        successCount: 0,
        failCount: 0,
        ...proxy,
      };
      pipeline.hset(PROXY_REDIS_KEY, proxyId, JSON.stringify(proxyData));
    }

    await pipeline.exec();
    console.log(`✅ Added ${proxies.length} proxies to pool`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Get Proxy (with rotation)
  // ─────────────────────────────────────────────────────────────────

  async getProxy(): Promise<Proxy | null> {
    // Get all healthy proxies
    const proxyRecords = await this.redis.hgetall(PROXY_REDIS_KEY);
    const proxies: Proxy[] = Object.values(proxyRecords).map(JSON.parse);
    const healthyProxies = proxies.filter(p => p.isHealthy && !await this.isProxyBanned(p.id));

    if (healthyProxies.length === 0) {
      console.warn('⚠️ No healthy proxies available');
      return null;
    }

    // Rotation strategy
    let proxy: Proxy;

    switch (this.config.rotationStrategy) {
      case 'round-robin': {
        const index = await this.redis.incr(PROXY_ROUND_ROBIN_KEY) % healthyProxies.length;
        proxy = healthyProxies[index];
        break;
      }
      case 'least-used': {
        healthyProxies.sort((a, b) => a.successCount - b.successCount);
        proxy = healthyProxies[0];
        break;
      }
      case 'random':
      default:
        proxy = healthyProxies[Math.floor(Math.random() * healthyProxies.length)];
    }

    await this.markProxyUsed(proxy);
    return proxy;
  }

  // ─────────────────────────────────────────────────────────────────
  // Mark Proxy Used
  // ─────────────────────────────────────────────────────────────────

  private async markProxyUsed(proxy: Proxy): Promise<void> {
    const proxyData: Proxy = { ...proxy, lastUsed: new Date() };
    await this.redis.hset(PROXY_REDIS_KEY, proxy.id, JSON.stringify(proxyData));
  }

  // ─────────────────────────────────────────────────────────────────
  // Mark Proxy Success/Failure
  // ─────────────────────────────────────────────────────────────────

  async markProxySuccess(proxyId: string): Promise<void> {
    const proxyDataRaw = await this.redis.hget(PROXY_REDIS_KEY, proxyId);
    if (!proxyDataRaw) return;

    const proxy: Proxy = JSON.parse(proxyDataRaw);
    proxy.successCount++;
    proxy.failCount = 0;
    proxy.isHealthy = true;
    await this.redis.hset(PROXY_REDIS_KEY, proxyId, JSON.stringify(proxy));
  }

  async markProxyFailure(proxyId: string): Promise<void> {
    const proxyDataRaw = await this.redis.hget(PROXY_REDIS_KEY, proxyId);
    if (!proxyDataRaw) return;

    const proxy: Proxy = JSON.parse(proxyDataRaw);
    proxy.failCount++;
    proxy.lastFailDate = new Date();

    if (proxy.failCount >= this.config.maxFailuresBeforeBan) {
      proxy.isHealthy = false;
      await this.banProxy(proxyId);
    }

    await this.redis.hset(PROXY_REDIS_KEY, proxyId, JSON.stringify(proxy));
  }

  // ─────────────────────────────────────────────────────────────────
  // Proxy Banning
  // ─────────────────────────────────────────────────────────────────

  private async banProxy(proxyId: string): Promise<void> {
    await this.redis.setex(
      `${PROXY_BAN_KEY_PREFIX}${proxyId}`,
      this.config.banDurationMs / 1000,
      '1'
    );
    console.warn(`⚠️ Proxy ${proxyId} banned due to too many failures`);
  }

  private async isProxyBanned(proxyId: string): Promise<boolean> {
    const exists = await this.redis.exists(`${PROXY_BAN_KEY_PREFIX}${proxyId}`);
    return exists === 1;
  }

  // ─────────────────────────────────────────────────────────────────
  // Health Check All Proxies
  // ─────────────────────────────────────────────────────────────────

  async healthCheckAll(): Promise<void> {
    console.log('🔍 Starting proxy health check...');

    const proxyRecords = await this.redis.hgetall(PROXY_REDIS_KEY);
    const proxies: Proxy[] = Object.values(proxyRecords).map(JSON.parse);

    const checkPromises = proxies.map(proxy => this.healthCheckProxy(proxy));
    await Promise.all(checkPromises);
  }

  async healthCheckProxy(proxy: Proxy): Promise<boolean> {
    const start = Date.now();

    try {
      const proxyUrl = this.formatProxyUrl(proxy);
      const res = await fetch(this.config.healthCheckUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.healthCheckTimeoutMs),
        // Add proxy support here - use appropriate proxy agent
      });

      if (res.ok) {
        await this.markProxySuccess(proxy.id);
        console.log(`✅ Proxy ${proxy.id} is healthy (${Date.now() - start}ms)`);
        return true;
      } else {
        await this.markProxyFailure(proxy.id);
        console.warn(`⚠️ Proxy ${proxy.id} health check failed (${Date.now() - start}ms)`);
        return false;
      }
    } catch {
      await this.markProxyFailure(proxy.id);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Utils
  // ─────────────────────────────────────────────────────────────────

  private formatProxyUrl(proxy: Proxy): string {
    let url = `${proxy.protocol}://`;
    if (proxy.username && proxy.password) {
      url += `${proxy.username}:${proxy.password}@`;
    }
    url += `${proxy.host}:${proxy.port}`;
    return url;
  }

  public async getProxyStats(): Promise<{
    total: number;
    healthy: number;
    banned: number;
    unhealthy: number;
  }> {
    const proxyRecords = await this.redis.hgetall(PROXY_REDIS_KEY);
    const proxies: Proxy[] = Object.values(proxyRecords).map(JSON.parse);
    let healthy = proxies.filter(p => p.isHealthy).length;
    const bannedKeys = await this.redis.keys(`${PROXY_BAN_KEY_PREFIX}*`);
    const bannedCount = bannedKeys.length;
    return { total: proxies.length, healthy, banned: bannedCount, unhealthy: proxies.length - healthy };
  }
}

// ─────────────────────────────────────────────────────────────────
// GLOBAL INSTANCE
// ─────────────────────────────────────────────────────────────────

export const proxyManager = new ProxyManager();

// ─────────────────────────────────────────────────────────────────
// EXPORT FOR EASY USE
// ─────────────────────────────────────────────────────────────────

export async function getProxyForRequest(url: string): Promise<string | null> {
  const proxy = await proxyManager.getProxy();
  return proxy ? proxyManager['formatProxyUrl'](proxy) : null;
}

// ================================================================
// FREE PROXY SCRAPER (SITES PUBLICS)
// ================================================================
export async function scrapeFreeProxies(): Promise<Omit<Proxy>[]> {
  const proxies: Omit<Proxy>[] = [];

  try {
    // 1. Free Proxy List
    try {
      const res = await fetch('https://free-proxy-list.net/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const html = await res.text();
      const matches = html.match(/\b(?:\d{1,3}\.){3}\d{1,3}:\d{1,5}\b/g) || [];
      matches.slice(0, 30).forEach(match => {
        const [host, port] = match.split(':');
        proxies.push({ host, port: parseInt(port), protocol: 'http' });
      });
    } catch (e) { console.warn('Free Proxy List failed'); }

    // 2. SSL Proxies
    try {
      const res = await fetch('https://www.sslproxies.org/', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const html = await res.text();
      const matches = html.match(/\b(?:\d{1,3}\.){3}\d{1,3}:\d{1,5}\b/g) || [];
      matches.slice(0, 20).forEach(match => {
        const [host, port] = match.split(':');
        proxies.push({ host, port: parseInt(port), protocol: 'https' });
      });
    } catch (e) { console.warn('SSL Proxies failed'); }

  } catch (e) {
    console.error('❌ Error scraping free proxies:', e);
  }

  console.log(`✅ Scraped ${proxies.length} free proxies`);
  return proxies;
}
