/**
 * Pluggable rate limiter facade for API routes.
 *
 * Default: in-memory limiter (single instance).
 * Optional: Redis-backed limiter via adapter hook (not enabled by default).
 */

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

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
    };

    if (!allowed) {
      headers['Retry-After'] = String(Math.ceil((entry.resetAt - now) / 1000));
    }

    return { allowed, remaining, resetAt: entry.resetAt, headers };
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

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  return rateLimiter.check(identifier, config);
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
