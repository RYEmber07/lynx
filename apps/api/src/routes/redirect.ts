import {Router} from "express";
import type {Request, Response} from "express";
import {getUrlByCode} from "../services/url.service.js";
import {clickQueue, type ClickJobData} from "../queues/click.queue.js";

const router = Router();

/**
 * GET /:code
 * Resolves a short code or custom slug to its original URL and redirects the client.
 * Enqueues a click analytics job fire-and-forget before redirecting.
 *
 * @param code - The short code or custom slug to look up.
 * @throws {Error} 404 if no matching URL record is found.
 */
router.get("/:code", async (req: Request, res: Response) => {
  const code = req.params["code"] as string;

  const url = await getUrlByCode(code);

  if (url === null) {
    throw Object.assign(new Error("URL not found"), {statusCode: 404});
  }

  const forwarded = req.headers["x-forwarded-for"];
  
  const ipString =
    (Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(",")[0]?.trim()) ??
    req.ip ??
    null;

  // Fire-and-forget: job enqueued but not awaited.
  // Redirect latency is unaffected by analytics processing.
  // If queue.add() throws, it is a silent failure - acceptable
  // for analytics. TODO Day 19: add monitoring for queue errors.
  clickQueue.add("click", {
    urlId: url.id,
    shortCode: url.shortCode,
    ip: ipString,
    userAgent: req.headers["user-agent"] ?? null,
    referrer: req.headers["referer"] ?? null,
    clickedAt: new Date().toISOString(),
  }).catch(err => console.error('Analytics queue error:', err));

  // 302 temporary redirect - intentional.
  // 301 gets cached permanently by browsers, meaning URL updates
  // would never be seen by returning users. 302 ensures every
  // redirect hits our server, keeping analytics accurate and
  // allowing URL edits to take effect immediately.
  // TODO: consider making redirect type configurable per-URL in future
  res.redirect(302, url.originalUrl);
});

export default router;
