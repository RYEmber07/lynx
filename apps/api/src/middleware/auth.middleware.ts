import type {Request, Response, NextFunction} from "express";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import type {TokenPayload} from "../services/auth.service.js";
import type {Url} from "../services/url.service.js";
import prisma from "../lib/db.js";

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
 * Optionally reads a JWT access token from the `Authorization: Bearer <token>` header.
 *
 * If the token is present and valid, attaches the decoded `TokenPayload` to
 * `req.user`. If the token is missing, malformed, or expired, the error is
 * silently swallowed and `req.user` remains `undefined`.
 *
 * Always calls `next()` — this middleware never short-circuits the request.
 * Useful for routes that serve both anonymous and authenticated users differently.
 *
 * @param req - Express request object.
 * @param res - Express response object (unused; required by middleware signature).
 * @param next - Express next function.
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req);

  if (token !== null) {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
      req.user = payload;
    } catch {
      // Swallow, missing or invalid token is acceptable for optional auth
    }
  }

  next();
}

/**
 * Verifies that the authenticated user owns the URL identified by `req.params.id`.
 *
 * Must be placed after `authenticate` in the middleware chain, as it relies on
 * `req.user` being populated.
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
