/**
 * Simple in-memory rate limiter for MVP.
 * No external dependencies (Redis, Upstash, etc.)
 * Limits requests per IP address with configurable window and max requests.
 *
 * NOTE: In-memory = resets on deploy/restart and is per-instance (not shared across Vercel functions).
 * For production scale, migrate to @upstash/ratelimit with Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Unique identifier for the rate limit bucket (e.g., "chat", "auth-register") */
  prefix: string;
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given IP + prefix combination.
 * Returns { allowed, remaining, resetAt }.
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const key = `${config.prefix}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  // No existing entry or window expired → allow and create new entry
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  // Within window — check count
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Allow and increment
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Extract client IP from request headers (works with Vercel, Cloudflare, etc.)
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

// Pre-configured rate limit configs
export const RATE_LIMITS = {
  /** Chat: 30 requests per minute per IP */
  chat: { prefix: "chat", maxRequests: 30, windowSeconds: 60 },
  /** Auth register: 5 attempts per hour per IP */
  authRegister: { prefix: "auth-register", maxRequests: 5, windowSeconds: 3600 },
  /** Affiliate register: 5 attempts per hour per IP */
  affiliateRegister: { prefix: "aff-register", maxRequests: 5, windowSeconds: 3600 },
  /** Webhooks: 200 per minute per IP */
  webhook: { prefix: "webhook", maxRequests: 200, windowSeconds: 60 },
  /** Web scrape: 10 page requests per minute per IP */
  scrape: { prefix: "scrape", maxRequests: 10, windowSeconds: 60 },
  /** Social publish: 10 posts per minute per IP */
  socialPublish: { prefix: "social-publish", maxRequests: 10, windowSeconds: 60 },
  /** Video render: 5 renders per 5 minutes per IP */
  videoRender: { prefix: "video-render", maxRequests: 5, windowSeconds: 300 },
  /** Video webhook: 100 per minute per IP */
  videoWebhook: { prefix: "video-webhook", maxRequests: 100, windowSeconds: 60 },
} as const;
