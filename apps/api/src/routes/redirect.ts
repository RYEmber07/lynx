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
    const err = new Error("URL not found") as any;
    err.statusCode = 404;
    throw err;
  }

  res.redirect(url.originalUrl);
});

export default router;
