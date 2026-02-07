/**
 * In-memory rate limiter for API routes.
 * Suitable for single-instance deployment.
 * For multi-instance, swap to Redis-based limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
// unref() ensures the timer doesn't prevent process exit or interfere with HMR
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);
  cleanupTimer.unref();
}

interface RateLimitConfig {
  /** Maximum number of requests per window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
}

/**
 * Check rate limit for a given identifier (e.g., userId or IP).
 *
 * Usage in API routes:
 * ```ts
 * const result = checkRateLimit(`chat:${userId}`, { maxRequests: 60, windowSeconds: 60 });
 * if (!result.allowed) {
 *   return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: result.headers });
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = store.get(identifier);

  // Create new entry or reset expired one
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(identifier, entry);
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

/** 5 images per day — DALL-E for free users (expensive: ~$0.04/image) */
export const RATE_LIMIT_IMAGE_FREE = { maxRequests: 5, windowSeconds: 86400 };

/** 50 images per day — DALL-E for pro users */
export const RATE_LIMIT_IMAGE_PRO = { maxRequests: 50, windowSeconds: 86400 };
