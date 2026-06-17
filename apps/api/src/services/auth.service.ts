import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../lib/db.js";
import env from "../config/env.js";
import type {UserModel} from "../generated/prisma/models/User.js";

// Re-export the generated model type under the conventional name
export type User = UserModel;

// ---------------------------------------------------------------------------
// DTOs (Data Transfer Objects)
// ---------------------------------------------------------------------------

/** Safe user shape - passwordHash is never included. */
export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
};

/** Maps a raw Prisma User to a SafeUser DTO. */
function toSafeUser(user: User): SafeUser {
  return {id: user.id, email: user.email, name: user.name};
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TokenPayload = {userId: string; email: string};
export type AuthTokens = {accessToken: string; refreshToken: string};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRES = env.JWT_ACCESS_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES = env.JWT_REFRESH_EXPIRES_IN;

// Max concurrent sessions per user.
// Oldest session deleted when limit is exceeded.
// Prevents zombie token accumulation from abandoned browser sessions.
const MAX_SESSIONS_PER_USER = 5;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parses a duration string like "7d", "15m", "1h" into milliseconds.
 * Used to compute the absolute expiresAt timestamp for stored refresh tokens.
 */
function parseDurationMs(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  switch (unit) {
    case "s":
      return value * 1_000;
    case "m":
      return value * 60_000;
    case "h":
      return value * 3_600_000;
    case "d":
      return value * 86_400_000;
    default:
      return value * 1_000;
  }
}

/**
 * Stores a hashed refresh token for the given user in the DB.
 * @param userId - The user's ID.
 * @param rawToken - The raw (unhashed) refresh token string.
 */
async function storeRefreshToken(
  userId: string,
  rawToken: string,
): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + parseDurationMs(REFRESH_TOKEN_EXPIRES),
  );

  // --- ZOMBIE TOKEN GUARD ---
  // select: { id: true } avoids pulling full token rows over the network
  const activeSessions = await prisma.refreshToken.findMany({
    where: {userId},
    orderBy: {createdAt: "asc"}, // Oldest first
    select: {id: true},
  });

  // Build the transaction query list - always includes the create.
  // If at the session cap, prepend a delete of the oldest session.
  // Both ops run in one BEGIN/COMMIT round-trip, guaranteeing atomicity:
  // a crash between the two can no longer leave a consumed slot with no new token.
  const transactionQueries = [
    ...(activeSessions.length >= MAX_SESSIONS_PER_USER
      ? [prisma.refreshToken.delete({where: {id: activeSessions[0]!.id}})]
      : []),
    prisma.refreshToken.create({data: {userId, tokenHash, expiresAt}}),
  ];

  await prisma.$transaction(transactionQueries);
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Hashes a plain-text password using bcrypt.
 * @param password - The plain-text password to hash.
 * @returns A promise that resolves to the bcrypt hash string.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a bcrypt hash.
 * @param password - The plain-text password to check.
 * @param hash - The stored bcrypt hash.
 * @returns A promise that resolves to true if the password matches.
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a signed JWT access token and a signed JWT refresh token.
 * @param payload - The token payload: userId and email.
 * @returns An AuthTokens object containing both tokens.
 */
export function generateTokens(payload: TokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  } as jwt.SignOptions);
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  } as jwt.SignOptions);
  return {accessToken, refreshToken};
}

/**
 * Hashes a token string with SHA-256.
 * Used to safely store refresh tokens in the database without keeping
 * the raw token value.
 * @param token - The raw token string to hash.
 * @returns The hex-encoded SHA-256 digest.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Registers a new user, hashes their password, creates them in the DB,
 * and issues a token pair with a stored hashed refresh token.
 * @param email - The user's email address (must be unique).
 * @param password - The user's plain-text password.
 * @param name - Optional display name.
 * @returns A promise that resolves to the issued AuthTokens and the created user.
 * @throws {Error} "Email already in use" if the email is already registered.
 */
export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<{tokens: AuthTokens; user: SafeUser}> {
  const existing = await prisma.user.findUnique({where: {email}});
  if (existing !== null) {
    throw new Error("Email already in use");
  }

  const passwordHash = await hashPassword(password);

  const user: UserModel = await prisma.user.create({
    data: {
      email,
      passwordHash,
      ...(name !== undefined && {name}),
    },
  });

  const tokens = generateTokens({userId: user.id, email: user.email});
  await storeRefreshToken(user.id, tokens.refreshToken);
  return {tokens, user: toSafeUser(user)};
}

/**
 * Authenticates a user by email and password, then issues a new token pair.
 * Uses the same "Invalid credentials" message for both a missing user and a wrong
 * password to prevent leaking which part failed.
 * @param email - The user's email address.
 * @param password - The user's plain-text password.
 * @returns A promise that resolves to the issued AuthTokens and the authenticated user.
 * @throws {Error} "Invalid credentials" if the user is not found or the password is wrong.
 */
export async function login(
  email: string,
  password: string,
): Promise<{tokens: AuthTokens; user: SafeUser}> {
  const user = await prisma.user.findUnique({where: {email}});
  if (user === null) {
    throw new Error("Invalid credentials");
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new Error("Invalid credentials");
  }

  // Passive cleanup: removes expired tokens on login.
  // At scale, replace with a scheduled job (cron/BullMQ) to avoid adding latency to the login path.
  void prisma.refreshToken.deleteMany({
    where: {userId: user.id, expiresAt: {lt: new Date()}},
  });

  const tokens = generateTokens({userId: user.id, email: user.email});
  await storeRefreshToken(user.id, tokens.refreshToken);
  return {tokens, user: toSafeUser(user)};
}

/**
 * Validates a refresh token, rotates it (deletes the old one, issues a new pair),
 * and stores the new hashed refresh token in the DB.
 * @param refreshToken - The raw refresh token string from the client.
 * @returns A promise that resolves to the new AuthTokens.
 * @throws {Error} "Invalid refresh token" if the token fails JWT verification,
 *   is not found in the DB, or has expired.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{tokens: AuthTokens; user: SafeUser}> {
  // 1. Verify the JWT signature before touching the DB
  let payload: TokenPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    throw new Error("Invalid refresh token");
  }

  const tokenHash = hashToken(refreshToken);

  // In one trip: delete the token row and load its User relation together.
  // If the token doesn't exist Prisma throws P2025 - catch it as 401.
  // If the token is expired we still delete it (good hygiene) then reject.
  let deleted: {expiresAt: Date; user: User};
  try {
    deleted = (await prisma.refreshToken.delete({
      where: {tokenHash},
      include: {user: true},
    })) as {expiresAt: Date; user: User};
  } catch (err: any) {
    if (err?.code === "P2025") {
      throw new Error("Invalid refresh token");
    }
    throw err;
  }

  if (deleted.expiresAt < new Date()) {
    throw new Error("Invalid refresh token");
  }

  // 4. Issue a fresh token pair and persist the new refresh token
  const tokens = generateTokens({userId: payload.userId, email: payload.email});
  await storeRefreshToken(payload.userId, tokens.refreshToken);
  return {tokens, user: toSafeUser(deleted.user)};
}

/**
 * Logs out a user by deleting their refresh token from the DB.
 * Idempotent — if the token is not found, does nothing.
 * @param refreshToken - The raw refresh token string to invalidate.
 */
export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  // delete is idempotent here: P2025 (not found) is silently swallowed.
  try {
    await prisma.refreshToken.delete({where: {tokenHash}});
  } catch (err: any) {
    if (err?.code !== "P2025") throw err;
  }
}
