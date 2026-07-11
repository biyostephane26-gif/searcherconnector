import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, getRateLimitRemaining } from '../scraper/queue';

// Mock redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
    })),
  };
});

describe('Queue System', () => {
  describe('Rate Limiting', () => {
    it('should allow first request', async () => {
      const allowed = await checkRateLimit('test-user-1', false);
      expect(allowed).toBe(true);
    });

    it('should return remaining count', async () => {
      const remaining = await getRateLimitRemaining('test-user-2');
      expect(typeof remaining).toBe('number');
    });
  });
});
