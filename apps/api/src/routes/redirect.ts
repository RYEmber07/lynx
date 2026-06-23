import {Router} from "express";
import env from "../config/env.js";
import type {Request, Response} from "express";
import {getUrlByCode, verifyUrlPassword} from "../services/url.service.js";
import {clickQueue} from "../queues/click.queue.js";
import {verifyPasswordLimiter} from "../middleware/rateLimit.middleware.js";
import {validate} from "../middleware/validate.middleware.js";
import {VerifyPasswordSchema} from "../validators/url.validators.js";
import type {VerifyPasswordInput} from "../validators/url.validators.js";
import {z} from "zod";

const codeSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-zA-Z0-9-_]+$/);

const router = Router();

/**
 * GET /:code
 * Resolves a short code or custom slug to its original URL and redirects the client.
 * Enqueues a click analytics job fire-and-forget before redirecting.
 *
 * @param code - The short code or custom slug to look up.
 * @returns Redirects to the original URL, or a frontend error/unlock page if invalid/protected.
 */
router.get("/:code", async (req: Request, res: Response) => {
  const code = req.params["code"] as string;

  // Prevent useless Redis/DB calls for obviously invalid paths
  // (e.g. bots scanning for /.env or /wp-login.php)
  if (!codeSchema.safeParse(code).success) {
    res.redirect(302, `${env.FRONTEND_URL}/link-error?reason=not_found`);
    return;
  }

  const url = await getUrlByCode(code);

  if (url === null) {
    res.redirect(302, `${env.FRONTEND_URL}/link-error?reason=not_found`);
    return;
  }

  // Gate: inactive or expired links redirect to frontend error page
  if (!url.isActive) {
    res.redirect(302, `${env.FRONTEND_URL}/link-error?reason=inactive`);
    return;
  }

  if (url.expiresAt !== null && url.expiresAt < new Date()) {
    res.redirect(302, `${env.FRONTEND_URL}/link-error?reason=expired`);
    return;
  }

  // Gate: if password-protected, redirect to the frontend's unlock page.
  // The frontend will prompt for the password and call POST /:code/verify instead.
  if (url.isPasswordProtected) {
    res.redirect(302, `${env.FRONTEND_URL}/verify/${code}`);
    return;
  }

  const ipString = req.ip ?? null;

  // Fire-and-forget: job enqueued but not awaited.
  // Redirect latency is unaffected by analytics processing.
  // If queue.add() throws, it is a silent failure - acceptable
  // for analytics. TODO Day 19: add monitoring for queue errors.
  clickQueue
    .add("click", {
      urlId: url.id,
      shortCode: url.shortCode,
      ip: ipString,
      userAgent: req.headers["user-agent"] ?? null,
      referrer: req.headers["referer"] ?? null,
      clickedAt: new Date().toISOString(),
    })
    .catch((err) => console.error("Analytics queue error:", err));

  // 302 temporary redirect - intentional.
  // 301 gets cached permanently by browsers, meaning URL updates
  // would never be seen by returning users. 302 ensures every
  // redirect hits our server, keeping analytics accurate and
  // allowing URL edits to take effect immediately.
  // TODO: consider making redirect type configurable per-URL in future
  res.redirect(302, url.originalUrl);
});

/**
 * POST /:code/verify
 * Verifies a password for a password-protected short URL.
 * On success returns the originalUrl so the frontend can redirect.
 *
 * @param code     - The short code or custom slug to look up.
 * @param password - The plaintext password to verify against the stored hash.
 * @throws {Error} 404 if URL not found, 410 if inactive/expired,
 *                 400 if not password-protected, 401 if password mismatch.
 */
router.post(
  "/:code/verify",
  verifyPasswordLimiter,
  validate(VerifyPasswordSchema),
  async (req: Request, res: Response) => {
    const code = req.params["code"] as string;
    const {password} = req.validatedBody as VerifyPasswordInput;

    const url = await verifyUrlPassword(code, password);

    // Fire-and-forget: enqueue click analytics the same way GET /:code does.
    clickQueue
      .add("click", {
        urlId: url.id,
        shortCode: url.shortCode,
        ip: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
        referrer: req.headers["referer"] ?? null,
        clickedAt: new Date().toISOString(),
      })
      .catch((err) => console.error("Analytics queue error:", err));

    res.status(200).json({originalUrl: url.originalUrl});
  },
);

export default router;
