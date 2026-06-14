import type {Request, Response, NextFunction} from "express";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import type {TokenPayload} from "../services/auth.service.js";
import type {Url} from "../services/url.service.js";
import prisma from "../lib/db.js";
import { z } from "zod";

const cuidSchema = z.cuid2();

// ---------------------------------------------------------------------------
// Express type augmentation
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      targetUrl?: Url;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the raw Bearer token from the Authorization header.
 * Returns `null` if the header is missing or malformed.
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7); // strip "Bearer "
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Requires a valid JWT access token in the `Authorization: Bearer <token>` header.
 *
 * After verifying the token, performs a DB lookup to confirm the user still
 * exists. If the user has been deleted since the token was issued, the request
 * is rejected with a 401.
 *
 * On success, attaches the decoded `TokenPayload` to `req.user` and calls `next()`.
 *
 * On failure (missing header, wrong format, invalid/expired token, or user no
 * longer in DB), passes a `401 Unauthorized` error to `next` so the global
 * error handler can respond.
 *
 * @param req - Express request object.
 * @param res - Express response object (unused; required by middleware signature).
 * @param next - Express next function.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (token === null) {
    return next(Object.assign(new Error("Unauthorized"), {statusCode: 401}));
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(Object.assign(new Error("Token Expired"), {statusCode: 401}));
    }
    return next(Object.assign(new Error("Unauthorized"), {statusCode: 401}));
  }

  // DB lookup on every request adds ~1-2ms latency.
  // Tradeoff: guarantees deleted users are immediately rejected.
  // We keep this for correctness; Redis caching can optimize later.
  const user = await prisma.user.findUnique({where: {id: payload.userId}});
  if (user === null) {
    return next(
      Object.assign(new Error("User no longer exists"), {statusCode: 401}),
    );
  }

  req.user = payload;
  next();
}

/**
 * Verifies that the authenticated user owns the URL identified by `req.params.id`.
 *
 * Must be placed after `authenticate` in the middleware chain, as it relies on
 * `req.user` being populated.
 *
 * Validates that `req.params.id` is a valid CUID format before hitting the DB.
 *
 * On success, attaches the found URL record to `req.targetUrl` and calls `next()`.
 *
 * @param req  - Express request object. Must contain `params.id` and `user`.
 * @param res  - Express response object (unused; required by middleware signature).
 * @param next - Express next function. Called with a 404 error if the URL is not
 *               found, or a 403 error if the authenticated user does not own it.
 */
export async function verifyUrlOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = req.params["id"] as string;

  // Prevent useless DB calls for obviously malformed IDs
  const parseResult = cuidSchema.safeParse(id);
  if (!parseResult.success) {
    return next(Object.assign(new Error("Invalid URL ID format"), {statusCode: 400}));
  }

  const url = await prisma.url.findUnique({where: {id}});

  if (url === null) {
    return next(Object.assign(new Error("URL not found"), {statusCode: 404}));
  }

  if (url.userId !== req.user!.userId) {
    return next(
      Object.assign(new Error("Forbidden: You do not own this URL"), {
        statusCode: 403,
      }),
    );
  }

  req.targetUrl = url;
  next();
}
