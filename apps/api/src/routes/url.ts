import { Router } from "express";
import type { Request, Response } from "express";
import {
  createUrl,
  getUrlsByUserId,
  deleteUrl,
} from "../services/url.service.js";

const router = Router();

/**
 * Extracts the X-User-Id header from the request.
 * Throws a 400 error if the header is missing or not a string.
 *
 * @param req - The Express request object.
 * @returns The userId string.
 */
function extractUserId(req: Request): string {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || userId.trim() === "") {
    const err = new Error("Missing X-User-Id header") as any;
    err.statusCode = 400;
    throw err;
  }
  return userId;
}

/**
 * POST /api/urls
 * Creates a new shortened URL.
 * Expects: { originalUrl, customSlug?, expiresAt?, isPasswordProtected?, passwordHash? }
 */
router.post("/", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  const { originalUrl, customSlug, expiresAt, isPasswordProtected, passwordHash } =
    req.body as {
      originalUrl: string;
      customSlug?: string;
      expiresAt?: string;
      isPasswordProtected?: boolean;
      passwordHash?: string;
    };

  try {
    const url = await createUrl({
      originalUrl,
      userId,
      ...(customSlug !== undefined && { customSlug }),
      ...(expiresAt !== undefined && { expiresAt: new Date(expiresAt) }),
      ...(isPasswordProtected !== undefined && { isPasswordProtected }),
      ...(passwordHash !== undefined && { passwordHash }),
    });
    res.status(201).json(url);
  } catch (err: any) {
    if (err.message === "Custom slug already taken") {
      err.statusCode = 400;
    }
    throw err;
  }
});

/**
 * GET /api/urls
 * Returns all URLs belonging to the authenticated user.
 */
router.get("/", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  const urls = await getUrlsByUserId(userId);
  res.status(200).json(urls);
});

/**
 * DELETE /api/urls/:id
 * Deletes a URL by ID, verifying ownership.
 */
router.delete("/:id", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const userId = extractUserId(req);

  try {
    await deleteUrl(id, userId);
    res.status(200).json({ success: true });
  } catch (err: any) {
    if (err.message === "URL not found") {
      err.statusCode = 404;
    } else if (err.message === "Unauthorized") {
      err.statusCode = 403;
    }
    throw err;
  }
});

export default router;
