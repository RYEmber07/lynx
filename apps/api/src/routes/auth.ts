import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service.js";
import env from "../config/env.js";

const router = Router();

// ---------------------------------------------------------------------------
// Cookie config
// ---------------------------------------------------------------------------

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/register
 * Creates a new user account and returns a JWT access token plus sets a
 * refresh token cookie. The response includes the user's public profile.
 *
 * @throws {Error} 400 "Email and password required" if either field is absent.
 * @throws {Error} 409 "Email already in use" if the email is already registered.
 */
router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password) {
    return next(
      Object.assign(new Error("Email and password required"), { statusCode: 400 }),
    );
  }

  try {
    const {tokens, user} = await authService.register(email, password, name);

    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    res.status(201).json({
      accessToken: tokens.accessToken,
      user: {id: user.id, email: user.email, name: user.name},
    });
  } catch (err: any) {
    if (err.message === "Email already in use") {
      return next(Object.assign(err, { statusCode: 409 }));
    }
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT access token plus sets a refresh token cookie.
 *
 * @throws {Error} 401 "Invalid credentials" if the email/password combination is wrong.
 */
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return next(
      Object.assign(new Error("Email and password required"), { statusCode: 400 }),
    );
  }

  try {
    const {tokens, user} = await authService.login(email, password);

    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    res.status(200).json({
      accessToken: tokens.accessToken,
      user: {id: user.id, email: user.email, name: user.name},
    });
  } catch (err: any) {
    if (err.message === "Invalid credentials") {
      return next(Object.assign(err, { statusCode: 401 }));
    }
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Rotates the refresh token: validates the current one, issues a new access
 * token, and overwrites the refresh token cookie with a fresh value.
 *
 * @throws {Error} 401 "Unauthorized" if the refresh token cookie is missing or invalid.
 */
router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies["refreshToken"] as string | undefined;

  if (!refreshToken) {
    return next(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
    );
  }

  try {
    const tokens = await authService.refreshAccessToken(refreshToken);

    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    res.status(200).json({ accessToken: tokens.accessToken });
  } catch (err: any) {
    next(Object.assign(err, { statusCode: 401 }));
  }
});

/**
 * POST /api/auth/logout
 * Invalidates the user's refresh token in the DB and clears the cookie.
 * Idempotent — safe to call even if already logged out.
 */
router.post("/logout", async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies["refreshToken"] as string | undefined;

  try {
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie("refreshToken", cookieOptions);
    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
});

export default router;
