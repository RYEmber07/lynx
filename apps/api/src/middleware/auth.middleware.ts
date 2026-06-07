import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import type { TokenPayload } from "../services/auth.service.js";

// ---------------------------------------------------------------------------
// Express type augmentation
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
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
 * On success, attaches the decoded `TokenPayload` to `req.user` and calls `next()`.
 *
 * On failure (missing header, wrong format, invalid/expired token), passes a
 * `401 Unauthorized` error to `next` so the global error handler can respond.
 *
 * @param req - Express request object.
 * @param res - Express response object (unused; required by middleware signature).
 * @param next - Express next function.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req);

  if (token === null) {
    return next(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
    );
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    req.user = payload;
    next();
  } catch {
    next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }
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
