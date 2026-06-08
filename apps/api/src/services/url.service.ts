import env from "../config/env.js";
import prisma from "../lib/db.js";
import {generateShortCode, DEFAULT_CODE_LENGTH} from "../utils/shortCode.js";
import type {UrlModel} from "../generated/prisma/models/Url.js";

// Re-export the generated model type under the conventional name
export type Url = UrlModel;

export type UpdateUrlInput = {
  originalUrl?: string;
  customSlug?: string | null;
  expiresAt?: Date | null;
  isActive?: boolean;
};

export type CreateUrlInput = {
  originalUrl: string;
  userId: string;
  customSlug?: string;
  expiresAt?: Date;
  isPasswordProtected?: boolean;
  passwordHash?: string;
};

/**
 * Generates a unique short code and creates a new URL record.
 * Handles collision retries automatically.
 *
 * @param input - The CreateUrlInput object containing original URL and user data.
 * @returns A promise that resolves to the created Url record.
 */
export async function createUrl(input: CreateUrlInput): Promise<Url> {
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
        statusCode: 400,
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

  // 3. Persist and return the new URL record
  return prisma.url.create({
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
}

/**
 * Retrieves a URL record by its short code or custom slug.
 *
 * @param code - The short code or custom slug to search.
 * @returns A promise that resolves to the Url record, or null if not found.
 */
export async function getUrlByCode(code: string): Promise<Url | null> {
  return prisma.url.findFirst({
    where: {
      OR: [{shortCode: code}, {customSlug: code}],
    },
  });
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
 * Deletes a URL record by ID.
 *
 * Ownership and existence are verified upstream by the `verifyUrlOwnership`
 * middleware before this function is called.
 *
 * @param id - The ID of the URL record to delete.
 * @returns A promise that resolves when deletion is complete.
 */
export async function deleteUrl(id: string): Promise<void> {
  try {
    await prisma.url.delete({where: {id}});
  } catch (err: any) {
    // If the record was already deleted (Prisma P2025 error code or similar),
    // we can swallow it or throw a URL not found error. Throwing lets the route know.
    if (err.code === "P2025") {
      throw Object.assign(new Error("URL not found"), {statusCode: 404});
    }
    throw err;
  }
}

/**
 * Updates mutable fields on a URL record.
 *
 * Ownership and existence are verified upstream by the `verifyUrlOwnership`
 * middleware before this function is called.
 *
 * If `customSlug` is provided (non-null), validates that it is not already
 * taken by a *different* URL — both the `customSlug` and `shortCode` columns
 * are checked (shared namespace rule).
 *
 * @param id   - The ID of the URL record to update.
 * @param data - Partial update payload.
 * @returns A promise that resolves to the updated Url record.
 * @throws {Error} With statusCode 409 if the requested customSlug is already taken.
 */
export async function updateUrl(id: string, data: UpdateUrlInput): Promise<Url> {
  const {originalUrl, customSlug, expiresAt, isActive} = data;

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

  return prisma.url.update({
    where: {id},
    data: {
      // null clears the field; a string value sets it; undefined = no change
      ...(originalUrl !== undefined && {originalUrl}),
      ...(customSlug !== undefined && {customSlug}),
      ...(expiresAt !== undefined && {expiresAt}),
      ...(isActive !== undefined && {isActive}),
    },
  });
}
