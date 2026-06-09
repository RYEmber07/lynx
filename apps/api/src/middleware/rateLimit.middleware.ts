import type {Request, Response, NextFunction} from "express";
import redis from "../lib/redis.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RateLimiterConfig = {
  /** Time window in milliseconds. */
  windowMs: number;
  /** Maximum number of requests allowed within the window. */
  max: number;
  /** Namespaces the Redis key, e.g. 'rl:redirect'. */
  keyPrefix: string;
  /** Optional custom error message. Defaults to 'Too many requests'. */
  message?: string;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an Express rate-limiting middleware using a Redis sorted-set sliding
 * window algorithm.
 *
 * Each request adds a timestamped member to a sorted set. Old members (outside
 * the current window) are pruned on every request so the ZCARD count reflects
 * only the current window. An EXPIRE is set so the key auto-cleans when idle.
 *
 * @param config - {@link RateLimiterConfig} options.
 * @returns An Express middleware function.
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const {windowMs, max, keyPrefix, message = "Too many requests"} = config;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // ---------------------------------------------------------------------------
    // Identify the client
    // X-Forwarded-For is checked first to support a future Nginx reverse-proxy.
    // Fall back to req.ip when the header is absent (direct connections).
    // ---------------------------------------------------------------------------
    const forwarded = req.headers["x-forwarded-for"];
    const identifier =
      (Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded?.split(",")[0]?.trim()) ??
      req.ip ??
      "unknown";

    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // -----------------------------------------------------------------------
      // Sliding window via Redis sorted set - batched in a single pipeline.
      //
      // Pipeline steps:
      //   1. ZREMRANGEBYSCORE - evict members older than the window start.
      //   2. ZCARD            - count surviving (in-window) members.
      //   3. ZADD             - record this request as a new member.
      //                         Score = now (ms); member includes a random
      //                         suffix to prevent duplicate-member collisions
      //                         when multiple requests arrive within the same ms.
      //   4. EXPIRE           - keep the key alive for one full window after
      //                         the last request.
      // -----------------------------------------------------------------------
      const pipeline = redis.multi();
      pipeline.zremrangebyscore(key, "-inf", windowStart);
      pipeline.zcard(key);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.expire(key, windowSeconds);

      const results = await pipeline.exec();

      // results[1] is [error, count] from the ZCARD command
      const zcardResult = results?.[1];
      const count = (zcardResult?.[1] as number | null) ?? 0;

      // -----------------------------------------------------------------------
      // Enforce the limit
      // -----------------------------------------------------------------------
      if (count >= max) {
        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", 0);
        res.setHeader("Retry-After", windowSeconds);

        const err = Object.assign(new Error(message), {statusCode: 429});
        return next(err);
      }

      // Under the limit - attach informational headers and continue
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", max - count - 1);
      next();
    } catch (err) {
      // Fail open: if Redis is unavailable, rate limiting is disabled.
      // Prefer unprotected service over complete outage.
      // Alert on Redis failures via monitoring (Day 19).
      console.error("[RateLimiter] Redis error - failing open:", err);
      next();
    }
  };
}

// ---------------------------------------------------------------------------
// Pre-configured limiters
// ---------------------------------------------------------------------------

// Redirect: public endpoint, high legitimate traffic expected,
// limit per IP to prevent scraping or DoS.
export const redirectLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: "rl:redirect",
  message: "Too many redirects, please slow down",
});

// Auth: brute force protection, tight limit, long window.
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "rl:auth",
  message: "Too many auth attempts, please try again later",
});

// Create: authenticated users, generous limit, prevents spam.
export const createUrlLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: "rl:create",
  message: "Too many URLs created, please slow down",
});

// URLs (general): all authenticated URL operations. A broad safety net that
// prevents polling abuse and cache-churn attacks from compromised tokens.
export const urlsLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: "rl:urls",
  message: "Too many requests, please slow down",
});

// Health: each request queries DB and Redis. A generous limit protects
// the connection pool from abuse while never tripping load-balancer or
// monitoring probes.
export const healthLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: "rl:health",
  message: "Too many health check requests",
});
