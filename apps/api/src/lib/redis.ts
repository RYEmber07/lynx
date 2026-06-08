import {Redis} from "ioredis";
import env from "../config/env.js";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  console.log("✅ Successfully connected to Redis.");
});

redis.on("error", (err: Error) => {
  console.error("❌ Redis connection error:", err);
});

export const connectRedis = async (): Promise<void> => {
  if (redis.status === "ready") {
    return;
  }

  return new Promise((resolve) => {
    redis.once("ready", () => {
      resolve();
    });
  });
};

// ---------------------------------------------------------------------------
// Cache key builder
// ---------------------------------------------------------------------------

/**
 * Builds a namespaced Redis key for the given resource type and identifier.
 * Namespacing prevents key collisions when Redis is shared across services.
 *
 * @param type - The resource type (e.g. 'url').
 * @param code - The unique identifier within that resource type.
 * @returns A key in the form `lynx:<type>:<code>`.
 * @example cacheKey('url', 'aB3kR9') // → 'lynx:url:aB3kR9'
 */
export function cacheKey(type: "url", code: string): string {
  return `lynx:${type}:${code}`;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

/**
 * Stores a string value in Redis with a TTL.
 *
 * @param key        - The cache key.
 * @param value      - The string value to store.
 * @param ttlSeconds - Time-to-live in seconds.
 */
export async function setCache(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  await redis.set(key, value, "EX", ttlSeconds);
}

/**
 * Retrieves a string value from Redis.
 *
 * @param key - The cache key.
 * @returns The stored string, or `null` if the key does not exist or has expired.
 */
export async function getCache(key: string): Promise<string | null> {
  return redis.get(key);
}

/**
 * Deletes a single key from Redis.
 *
 * @param key - The cache key to delete.
 */
export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

// Warning: redis.keys() scans the entire keyspace. Safe for low-volume key patterns.
// At scale, replace with SCAN to avoid blocking Redis.
/**
 * Deletes all keys matching a glob-style pattern.
 *
 * @param pattern - A Redis glob pattern (e.g. `lynx:url:*`).
 */
export async function deleteCacheByPattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length === 0) {
    return;
  }
  await redis.del(...keys);
}

export default redis;
