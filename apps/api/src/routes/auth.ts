import { Router } from "express";
import type { Request, Response } from "express";
import * as authService from "../services/auth.service.js";
import env from "../config/env.js";
import {validate} from "../middleware/validate.middleware.js";
import {
  RegisterSchema,
  LoginSchema,
  type RegisterInput,
  type LoginInput,
} from "../validators/auth.validators.js";

const router = Router();

// ---------------------------------------------------------------------------
// Cookie config
// ---------------------------------------------------------------------------

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  // 'none' is required when frontend (Vercel) and backend (Railway) are on
  // different domains. 'lax' only works for same-site requests — the browser
  // silently drops it cross-origin, making login appear to succeed but the
  // session never persists. 'none' requires secure:true (HTTPS) to function.
  sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/api/auth/refresh",
};

// Non-sensitive flag cookie readable by the Next.js proxy to gate
// protected routes. Carries no secret data - just signals "a session exists".
const loggedInCookieOptions = {
  httpOnly: false,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/register
 * Creates a new user account and returns a JWT access token plus sets a
 * refresh token cookie. The response includes the user's public profile.
 *
 * @throws {Error} 409 "Email already in use" if the email is already registered.
 */
router.post("/register", validate(RegisterSchema), async (req: Request, res: Response) => {
  const { email, password, name } = req.validatedBody as RegisterInput;

  try {
    const {tokens, user} = await authService.register(email, password, name);

    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    res.cookie("logged_in", "1", loggedInCookieOptions);
    res.status(201).json({
      accessToken: tokens.accessToken,
      user: {id: user.id, email: user.email, name: user.name},
    });
  } catch (err: any) {
    if (err.message === "Email already in use") {
      throw Object.assign(err, { statusCode: 409 });
    }
    throw err;
  }
});

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT access token plus sets a refresh token cookie.
 *
 * @throws {Error} 401 "Invalid credentials" if the email/password combination is wrong.
 */
router.post("/login", validate(LoginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.validatedBody as LoginInput;

  try {
    const {tokens, user} = await authService.login(email, password);

    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    res.cookie("logged_in", "1", loggedInCookieOptions);
    res.status(200).json({
      accessToken: tokens.accessToken,
      user: {id: user.id, email: user.email, name: user.name},
    });
  } catch (err: any) {
    if (err.message === "Invalid credentials") {
      throw Object.assign(err, { statusCode: 401 });
    }
    throw err;
  }
});

/**
 * POST /api/auth/refresh
 * Rotates the refresh token: validates the current one, issues a new access
 * token, and overwrites the refresh token cookie with a fresh value.
 *
 * @throws {Error} 401 "Unauthorized" if the refresh token cookie is missing or invalid.
 */
router.post("/refresh", async (req: Request, res: Response) => {
  const refreshToken = req.cookies["refreshToken"] as string | undefined;

  if (!refreshToken) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }

  try {
    const { tokens, user } = await authService.refreshAccessToken(refreshToken);

    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    res.cookie("logged_in", "1", loggedInCookieOptions);
    res.status(200).json({
      accessToken: tokens.accessToken,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err: any) {
    throw Object.assign(err, { statusCode: 401 });
  }
});

/**
 * POST /api/auth/logout
 * Invalidates the user's refresh token in the DB and clears the cookie.
 * Idempotent - safe to call even if already logged out.
 */
router.post("/logout", async (req: Request, res: Response) => {
  const refreshToken = req.cookies["refreshToken"] as string | undefined;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  res.clearCookie("logged_in", { path: "/" });
  res.status(200).json({ message: "Logged out" });
});

export default router;
