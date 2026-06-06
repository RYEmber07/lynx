import env from "../config/env.js";
import prisma from "../lib/db.js";
import { generateShortCode, DEFAULT_CODE_LENGTH } from "../utils/shortCode.js";
import type { UrlModel } from "../generated/prisma/models/Url.js";

// Re-export the generated model type under the conventional name
export type Url = UrlModel;

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
        OR: [
          { customSlug },
          { shortCode: customSlug },
        ],
      },
    });
    if (existing !== null) {
      const err = new Error("Custom slug already taken") as any;
      err.statusCode = 400;
      throw err;
    }
  }

  // 2. Generate a unique shortCode with up to 5 collision retries
  const MAX_RETRIES = 5;
  let shortCode: string | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const candidate = generateShortCode(DEFAULT_CODE_LENGTH + attempt); // 6, 7, 8 …
    const collision = await prisma.url.findFirst({
      where: {
        OR: [
          { shortCode: candidate },
          { customSlug: candidate },
        ],
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
      ...(customSlug !== undefined && { customSlug }),
      ...(expiresAt !== undefined && { expiresAt }),
      ...(isPasswordProtected !== undefined && { isPasswordProtected }),
      ...(passwordHash !== undefined && { passwordHash }),
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
      OR: [
        { shortCode: code },
        { customSlug: code },
      ],
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
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Deletes a URL record by ID, verifying that it belongs to the requesting user.
 *
 * @param id - The ID of the URL record.
 * @param userId - The ID of the user requesting deletion.
 * @returns A promise that resolves when deletion is complete.
 * @throws {Error} If the URL record does not exist or the user is unauthorized.
 */
export async function deleteUrl(id: string, userId: string): Promise<void> {
  const url = await prisma.url.findUnique({ where: { id } });

  if (url === null) {
    throw new Error("URL not found");
  }

  if (url.userId !== userId) {
    throw new Error("Unauthorized");
  }

  await prisma.url.delete({ where: { id } });
}
