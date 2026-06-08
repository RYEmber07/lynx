import {Router} from "express";
import type {Request, Response} from "express";
import {
  createUrl,
  getUrlsByUserId,
  deleteUrl,
  updateUrl,
} from "../services/url.service.js";
import { verifyUrlOwnership } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * POST /api/urls
 * Creates a new shortened URL for the authenticated user.
 * Expects: { originalUrl, customSlug?, expiresAt?, isPasswordProtected?, passwordHash? }
 */
router.post("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const {
    originalUrl,
    customSlug,
    expiresAt,
    isPasswordProtected,
    passwordHash,
  } = req.body as {
    originalUrl: string;
    customSlug?: string;
    expiresAt?: string;
    isPasswordProtected?: boolean;
    passwordHash?: string;
  };

  // Validate that originalUrl is a well-formed absolute URL
  try {
    new URL(originalUrl);
  } catch {
    throw Object.assign(new Error("Invalid URL format"), { statusCode: 400 });
  }

  try {
    const url = await createUrl({
      originalUrl,
      userId,
      ...(customSlug !== undefined && {customSlug}),
      ...(expiresAt !== undefined && {expiresAt: new Date(expiresAt)}),
      ...(isPasswordProtected !== undefined && {isPasswordProtected}),
      ...(passwordHash !== undefined && {passwordHash}),
    });
    res.status(201).json(url);
  } catch (err: any) {
    if (err.message === "Custom slug already taken") {
      throw Object.assign(err, { statusCode: 400 });
    }
    throw err;
  }
});

/**
 * GET /api/urls
 * Returns all URLs belonging to the authenticated user.
 */
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const urls = await getUrlsByUserId(userId);
  res.status(200).json(urls);
});

/**
 * PATCH /api/urls/:id
 * Updates mutable fields of a URL. Ownership is verified by the verifyUrlOwnership middleware.
 * Accepts: { originalUrl?, customSlug?, expiresAt?, isActive? }
 */
router.patch("/:id", verifyUrlOwnership, async (req: Request, res: Response) => {
  const targetUrl = req.targetUrl!;
  const {originalUrl, customSlug, expiresAt, isActive} = req.body as {
    originalUrl?: string;
    customSlug?: string | null;
    expiresAt?: string | null;
    isActive?: boolean;
  };

  // Validate originalUrl format if provided
  if (originalUrl !== undefined) {
    try {
      new URL(originalUrl);
    } catch {
      throw Object.assign(new Error("Invalid URL format"), {statusCode: 400});
    }
  }

  const updated = await updateUrl(targetUrl.id, {
    ...(originalUrl !== undefined && {originalUrl}),
    ...(customSlug !== undefined && {customSlug}),
    ...(expiresAt !== undefined && {expiresAt: expiresAt === null ? null : new Date(expiresAt)}),
    ...(isActive !== undefined && {isActive}),
  }, targetUrl);
  res.status(200).json(updated);
});

/**
 * DELETE /api/urls/:id
 * Deletes a URL by ID. Ownership is verified by the verifyUrlOwnership middleware.
 */
router.delete("/:id", verifyUrlOwnership, async (req: Request, res: Response) => {
  const targetUrl = req.targetUrl!;
  try {
    await deleteUrl(targetUrl);
    res.status(204).send();
  } catch (err: any) {
    if (err.message === "URL not found") {
      throw Object.assign(err, { statusCode: 404 });
    }
    throw err;
  }
});

export default router;
