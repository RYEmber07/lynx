import {Router} from "express";
import type {Request, Response} from "express";
import {
  createUrl,
  getUrlsByUserId,
  deleteUrl,
} from "../services/url.service.js";

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
 * DELETE /api/urls/:id
 * Deletes a URL by ID, verifying ownership.
 */
router.delete("/:id", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const userId = req.user!.userId;

  try {
    await deleteUrl(id, userId);
    res.status(204).send();
  } catch (err: any) {
    if (err.message === "URL not found") {
      throw Object.assign(err, { statusCode: 404 });
    } else if (err.message === "Unauthorized") {
      throw Object.assign(err, { statusCode: 403 });
    }
    throw err;
  }
});

export default router;
