/**
 * Pluggable rate limiter facade for API routes.
 *
 * Default: in-memory limiter (single instance).
 * Optional: distributed DB-backed limiter via separate async API.
 */

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export interface RateLimitConfig {
  /** Maximum number of requests per window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
}

export interface RateLimiter {
  check(identifier: string, config: RateLimitConfig): RateLimitResult;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function buildRateLimitHeaders(
  maxRequests: number,
  remaining: number,
  resetAt: number,
  now: number,
  allowed: boolean,
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };

  if (!allowed) {
    headers['Retry-After'] = String(Math.max(1, Math.ceil((resetAt - now) / 1000)));
  }

  return headers;
}

class InMemoryRateLimiter implements RateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();

  constructor() {
    // Clean up expired entries every 60 seconds.
    if (typeof setInterval !== 'undefined') {
      const cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.store) {
          if (now > entry.resetAt) {
            this.store.delete(key);
          }
        }
      }, 60_000);
      cleanupTimer.unref();
    }
  }

  check(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;

    let entry = this.store.get(identifier);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      this.store.set(identifier, entry);
    }

    entry.count++;

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const allowed = entry.count <= config.maxRequests;

    const headers = buildRateLimitHeaders(
      config.maxRequests,
      remaining,
      entry.resetAt,
      now,
      allowed,
    );

    return { allowed, remaining, resetAt: entry.resetAt, headers };
  }
}

class DatabaseRateLimiter {
  private readonly fallback = new InMemoryRateLimiter();

  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const windowStartMs = Math.floor(now / windowMs) * windowMs;
    const windowStart = new Date(windowStartMs);
    const resetAtDate = new Date(windowStartMs + windowMs);

    try {
      let count = 1;

      try {
        await prisma.rateLimitBucket.create({
          data: {
            identifier,
            windowStart,
            resetAt: resetAtDate,
            count: 1,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const updated = await prisma.rateLimitBucket.update({
            where: {
              identifier_windowStart: {
                identifier,
                windowStart,
              },
            },
            data: {
              count: { increment: 1 },
              resetAt: resetAtDate,
            },
            select: { count: true },
          });
          count = updated.count;
        } else {
          throw error;
        }
      }

      if (Math.random() < 0.01) {
        void prisma.rateLimitBucket.deleteMany({
          where: { resetAt: { lt: new Date(now - windowMs) } },
        }).catch(() => {});
      }

      const allowed = count <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);
      const resetAt = resetAtDate.getTime();
      const headers = buildRateLimitHeaders(config.maxRequests, remaining, resetAt, now, allowed);

      return { allowed, remaining, resetAt, headers };
    } catch (error) {
      console.warn('[rate-limit] distributed limiter failed, falling back to memory', error);
      return this.fallback.check(identifier, config);
    }
  }
}

class RedisRateLimiterPlaceholder implements RateLimiter {
  private readonly fallback = new InMemoryRateLimiter();

  check(identifier: string, config: RateLimitConfig): RateLimitResult {
    // Redis adapter hook:
    // Replace this class with a real implementation once a Redis client is added.
    // Keeping fallback behavior avoids breaking production during migration.
    return this.fallback.check(identifier, config);
  }
}

function createRateLimiter(): RateLimiter {
  const driver = process.env.RATE_LIMIT_DRIVER || 'memory';

  if (driver === 'redis') {
    if (!process.env.REDIS_URL) {
      console.warn('[rate-limit] RATE_LIMIT_DRIVER=redis set without REDIS_URL; falling back to memory');
      return new InMemoryRateLimiter();
    }
    return new RedisRateLimiterPlaceholder();
  }

  return new InMemoryRateLimiter();
}

export const rateLimiter: RateLimiter = createRateLimiter();
const distributedRateLimiter = new DatabaseRateLimiter();

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  return rateLimiter.check(identifier, config);
}

export async function checkRateLimitDistributed(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const driver = process.env.RATE_LIMIT_DRIVER || 'memory';

  if (driver === 'database') {
    return distributedRateLimiter.check(identifier, config);
  }

  return rateLimiter.check(identifier, config);
}

export async function cleanupExpiredRateLimitBuckets(options?: {
  batchSize?: number;
  graceSeconds?: number;
}): Promise<number> {
  const batchSize = Math.min(Math.max(options?.batchSize ?? 5_000, 1), 20_000);
  const graceSeconds = Math.max(options?.graceSeconds ?? 3_600, 0);
  const threshold = new Date(Date.now() - graceSeconds * 1000);

  const rows = await prisma.rateLimitBucket.findMany({
    where: { resetAt: { lt: threshold } },
    orderBy: { resetAt: 'asc' },
    take: batchSize,
    select: { id: true },
  });

  if (rows.length === 0) {
    return 0;
  }

  const result = await prisma.rateLimitBucket.deleteMany({
    where: { id: { in: rows.map((row) => row.id) } },
  });

  return result.count;
}

// ──────────────────────────────────────────────
// Preset rate limit configs
// ──────────────────────────────────────────────

/** 60 requests per minute — standard API endpoints */
export const RATE_LIMIT_API = { maxRequests: 60, windowSeconds: 60 };

/** 20 requests per minute — AI chat (expensive) */
export const RATE_LIMIT_CHAT = { maxRequests: 20, windowSeconds: 60 };

/** 5 requests per minute — auth endpoints (signup, signin) */
export const RATE_LIMIT_AUTH = { maxRequests: 5, windowSeconds: 60 };

/** 3 requests per minute — agent provisioning (very expensive) */
export const RATE_LIMIT_AGENT_PROVISION = { maxRequests: 3, windowSeconds: 60 };

/** 50 images per day — DALL-E for Pro users */
export const RATE_LIMIT_IMAGE = { maxRequests: 50, windowSeconds: 86400 };

/** 10 AI calls per day — phone calls (very expensive: $0.10/min) */
export const RATE_LIMIT_CALLS = { maxRequests: 10, windowSeconds: 86400 };
