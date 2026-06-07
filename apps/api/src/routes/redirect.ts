import { Router } from "express";
import type { Request, Response } from "express";
import { getUrlByCode } from "../services/url.service.js";

const router = Router();

/**
 * GET /:code
 * Resolves a short code or custom slug to its original URL and redirects the client.
 *
 * @param code - The short code or custom slug to look up.
 * @throws {Error} 404 if no matching URL record is found.
 */
router.get("/:code", async (req: Request, res: Response) => {
  const code = req.params["code"] as string;

  const url = await getUrlByCode(code);

  if (url === null) {
    throw Object.assign(new Error("URL not found"), { statusCode: 404 });
  }

  // 302 temporary redirect - intentional.
  // 301 gets cached permanently by browsers, meaning URL updates
  // would never be seen by returning users. 302 ensures every
  // redirect hits our server, keeping analytics accurate and
  // allowing URL edits to take effect immediately.
  // TODO: consider making redirect type configurable per-URL in future
  res.redirect(302, url.originalUrl);
});

export default router;
