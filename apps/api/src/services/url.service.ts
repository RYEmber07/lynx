import env from "../config/env.js";
import prisma from "../lib/db.js";
import {generateShortCode, DEFAULT_CODE_LENGTH} from "../utils/shortCode.js";
import type {UrlModel} from "../generated/prisma/models/Url.js";
import {setCache, getCache, deleteCache, cacheKey} from "../lib/redis.js";
import type {CreateUrlInput, UpdateUrlInput} from "../validators/url.validators.js";

// Re-export the generated model type under the conventional name
export type Url = UrlModel;

/**
 * Internal shape expected by createUrl().
 * Adapts Zod input for service use: drops plain password, adds userId and passwordHash,
 * and converts the ISO expiresAt string to a JS Date.
 */
export type CreateUrlServiceInput = Omit<CreateUrlInput, "password" | "expiresAt" | "customSlug"> & {
  userId: string;
  customSlug?: string;
  expiresAt?: Date;
  passwordHash?: string;
};

/**
 * Internal shape expected by updateUrl().
 * Drops plain-text `password` (route hashes it); adds `passwordHash`:
 *   - string → set / change the hash
 *   - null   → remove password protection
 *   - undefined → leave unchanged
 * Converts `expiresAt` ISO string to Date | null (null = clear the expiry).
 */
export type UpdateUrlServiceInput = Omit<UpdateUrlInput, "expiresAt" | "password"> & {
  expiresAt?: Date | null;
  passwordHash?: string | null;
}; 

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Caches a Url record under both its shortCode and (if present) its customSlug.
 * Fail open: if Redis is unavailable the write is silently skipped.
 */
async function cacheUrl(url: Url): Promise<void> {
  try {
    const serialized = JSON.stringify(url);
    await setCache(cacheKey("url", url.shortCode), serialized, env.CACHE_TTL_SECONDS);
    if (url.customSlug !== null) {
      await setCache(cacheKey("url", url.customSlug), serialized, env.CACHE_TTL_SECONDS);
    }
  } catch {
    // Fail open: Redis unavailable - record is still in the DB.
  }
}

/**
 * Removes cache entries for a Url record by shortCode and (if present) customSlug.
 * Fail open: if Redis is unavailable the eviction is skipped; stale entries will
 * expire naturally via TTL.
 */
async function evictUrl(url: Url): Promise<void> {
  try {
    await deleteCache(cacheKey("url", url.shortCode));
    if (url.customSlug !== null) {
      await deleteCache(cacheKey("url", url.customSlug));
    }
  } catch {
    // Fail open: Redis unavailable - TTL will expire the stale entries.
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Generates a unique short code and creates a new URL record.
 * Handles collision retries automatically.
 * Warms the cache on write so the first redirect is served from Redis.
 *
 * @param input - The CreateUrlInput object containing original URL and user data.
 * @returns A promise that resolves to the created Url record.
 */
export async function createUrl(input: CreateUrlServiceInput): Promise<Url> {
  const {
    originalUrl,
    userId,
    customSlug,
    expiresAt,
    isPasswordProtected,
    passwordHash,
  } = input;

  // TODO: deep cycle detection deferred; relying on browser redirect limits and Day 8 rate limiting
  if (originalUrl.includes(env.FRONTEND_URL)) {
    throw new Error("Cannot shorten a link that points back to this service.");
  }

  // 1. Validate customSlug uniqueness if provided
  if (customSlug !== undefined) {
    const existing = await prisma.url.findFirst({
      where: {
        OR: [{customSlug}, {shortCode: customSlug}],
      },
    });
    if (existing !== null) {
      throw Object.assign(new Error("Custom slug already taken"), {
        statusCode: 409,
      });
    }
  }

  // 2. Generate a unique shortCode with up to 5 collision retries
  const MAX_RETRIES = 5;
  let shortCode: string | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const candidate = generateShortCode(DEFAULT_CODE_LENGTH + attempt); // 6, 7, 8 …
    const collision = await prisma.url.findFirst({
      where: {
        OR: [{shortCode: candidate}, {customSlug: candidate}],
      },
    });

    if (collision === null) {
      shortCode = candidate;
      break;
    }
  }

  if (shortCode === null) {
    throw new Error("Failed to generate unique short code");
  }

  // 3. Persist the new URL record
  const url = await prisma.url.create({
    data: {
      originalUrl,
      userId,
      shortCode,
      ...(customSlug !== undefined && {customSlug}),
      ...(expiresAt !== undefined && {expiresAt}),
      ...(isPasswordProtected !== undefined && {isPasswordProtected}),
      ...(passwordHash !== undefined && {passwordHash}),
    },
  });

  // 4. Warm the cache so the first redirect is served from Redis
  await cacheUrl(url);

  return url;
}

// Cache-aside pattern: check cache first, fall through to DB on miss,
// populate cache on miss so next request is served from Redis.
/**
 * Retrieves a URL record by its short code or custom slug.
 * Checks Redis before hitting the database.
 *
 * @param code - The short code or custom slug to search.
 * @returns A promise that resolves to the Url record, or null if not found.
 */
export async function getUrlByCode(code: string): Promise<Url | null> {
  const key = cacheKey("url", code);

  // 1. Cache hit - parse and return immediately
  // Fail open: if Redis is unavailable, fall through to DB.
  // Prefer slower service over complete outage.
  try {
    const cached = await getCache(key);
    if (cached !== null) {
      return JSON.parse(cached) as Url;
    }
  } catch {
    // Redis unavailable - continue to DB
  }

  // 2. Cache miss - query the DB
  const url = await prisma.url.findFirst({
    where: {
      OR: [{shortCode: code}, {customSlug: code}],
    },
  });

  // 3. Populate cache for future requests (fail open: skip silently if Redis is down)
  if (url !== null) {
    try {
      await setCache(key, JSON.stringify(url), env.CACHE_TTL_SECONDS);
    } catch {
      // Redis unavailable - next request will just be a cache miss again
    }
  }

  return url;
}

/**
 * Retrieves all URL records belonging to a specific user, ordered by creation date descending.
 *
 * @param userId - The ID of the user.
 * @returns A promise that resolves to an array of Url records.
 */
export async function getUrlsByUserId(userId: string): Promise<Url[]> {
  return prisma.url.findMany({
    where: {userId},
    orderBy: {createdAt: "desc"},
  });
}

/**
 * Deletes a URL record and evicts its cache entries.
 *
 * Accepts the already-fetched `Url` object from the `verifyUrlOwnership`
 * middleware (`req.targetUrl`) to avoid a redundant DB round-trip.
 *
 * @param url - The URL record to delete (pre-fetched by middleware).
 * @returns A promise that resolves when deletion is complete.
 */
export async function deleteUrl(url: Url): Promise<void> {
  try {
    await prisma.url.delete({where: {id: url.id}});
  } catch (err: any) {
    // If the record was concurrently deleted between ownership check and here
    // (P2025: record not found), surface a clean 404.
    if (err.code === "P2025") {
      throw Object.assign(new Error("URL not found"), {statusCode: 404});
    }
    throw err;
  }

  // Evict cache only after a confirmed successful deletion
  await evictUrl(url);
}

/**
 * Updates mutable fields on a URL record, then invalidates stale cache entries
 * and re-caches the updated record.
 *
 * Accepts the already-fetched `Url` object from the `verifyUrlOwnership`
 * middleware (`req.targetUrl`) as `existing` to avoid a redundant DB round-trip
 * when evicting stale cache keys (critical when customSlug is changed or removed).
 *
 * If `customSlug` is provided (non-null), validates that it is not already
 * taken by a *different* URL — both the `customSlug` and `shortCode` columns
 * are checked (shared namespace rule).
 *
 * @param id       - The ID of the URL record to update.
 * @param data     - Partial update payload.
 * @param existing - The current URL record state (pre-fetched by middleware).
 * @returns A promise that resolves to the updated Url record.
 * @throws {Error} With statusCode 409 if the requested customSlug is already taken.
 */
export async function updateUrl(id: string, data: UpdateUrlServiceInput, existing: Url): Promise<Url> {
  const {originalUrl, customSlug, expiresAt, isActive, passwordHash} = data;

  // Validate customSlug uniqueness across the shared namespace, excluding self
  if (customSlug !== undefined && customSlug !== null) {
    const conflict = await prisma.url.findFirst({
      where: {
        AND: [
          {id: {not: id}},
          {OR: [{customSlug}, {shortCode: customSlug}]},
        ],
      },
    });
    if (conflict !== null) {
      throw Object.assign(new Error("Custom slug already taken"), {statusCode: 409});
    }
  }

  const updated = await prisma.url.update({
    where: {id},
    data: {
      ...(originalUrl !== undefined && {originalUrl}),
      ...(customSlug !== undefined && {customSlug}),
      ...(expiresAt !== undefined && {expiresAt}),
      ...(isActive !== undefined && {isActive}),
      // passwordHash: null -> clear protection; string → set/update hash
      ...(passwordHash !== undefined && {
        passwordHash,
        isPasswordProtected: passwordHash !== null,
      }),
    },
  });

  // Evict stale cache entries for the pre-update record state.
  // Using the caller-supplied `existing` avoids a redundant findUnique here.
  await evictUrl(existing);

  // Re-cache under the new codes
  await cacheUrl(updated);

  return updated;
}
