import {Router} from "express";
import type {Request, Response} from "express";
import bcrypt from "bcryptjs";
import {
  createUrl,
  getUrlsByUserId,
  deleteUrl,
  updateUrl,
} from "../services/url.service.js";
import {
  authenticate,
  verifyUrlOwnership,
} from "../middleware/auth.middleware.js";
import {
  createUrlLimiter,
  urlsLimiter,
} from "../middleware/rateLimit.middleware.js";
import {validate} from "../middleware/validate.middleware.js";
import {
  CreateUrlSchema,
  UpdateUrlSchema,
  type CreateUrlInput,
  type UpdateUrlInput,
} from "../validators/url.validators.js";

const router = Router();

// All URL routes require authentication, then per-user rate limiting.
// Order matters: authenticate must run first to populate req.user,
// which urlsLimiter's keyExtractor depends on.
router.use(authenticate, urlsLimiter);

/**
 * POST /api/urls
 * Creates a new shortened URL for the authenticated user.
 * Expects: { originalUrl, customSlug?, expiresAt?, isPasswordProtected?, password? }
 */
router.post(
  "/",
  createUrlLimiter,
  validate(CreateUrlSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const {originalUrl, customSlug, expiresAt, isPasswordProtected, password} =
      req.body as CreateUrlInput;

    // `!= null` intentionally catches both null and undefined:
    // both mean "user didn't provide a value" for these nullable optional fields.
    const url = await createUrl({
      originalUrl,
      userId,
      isPasswordProtected,
      ...(customSlug != null && {customSlug}),
      ...(expiresAt != null && {expiresAt: new Date(expiresAt)}),
      ...(isPasswordProtected && {passwordHash: await bcrypt.hash(password!, 10)}),
    });
    res.status(201).json(url);
  },
);

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
 * Accepts: { originalUrl?, customSlug?, expiresAt?, isActive?, isPasswordProtected?, password? }
 */
router.patch(
  "/:id",
  verifyUrlOwnership,
  validate(UpdateUrlSchema),
  async (req: Request, res: Response) => {
    const targetUrl = req.targetUrl!;
    const {
      originalUrl,
      customSlug,
      expiresAt,
      isActive,
      isPasswordProtected,
      password,
    } = req.body as UpdateUrlInput;

    // Derive passwordHash for the service:
    //   - isPasswordProtected=false (was protected) → null  (clear protection)
    //   - password provided                          → bcrypt hash (set/change)
    //   - enabling without password                  → 400 error
    //   - everything else                            → undefined (no-op)
    let passwordHash: string | null | undefined;
    if (isPasswordProtected === false && targetUrl.isPasswordProtected) {
      passwordHash = null;
    } else if (password !== undefined) {
      passwordHash = await bcrypt.hash(password, 10);
    } else if (isPasswordProtected === true && !targetUrl.isPasswordProtected) {
      throw Object.assign(
        new Error("Password is required to enable protection"),
        {
          statusCode: 400,
          isValidationError: true,
        },
      );
    }

    const updated = await updateUrl(
      targetUrl.id,
      {
        ...(originalUrl !== undefined && {originalUrl}),
        ...(customSlug !== undefined && {customSlug}),
        ...(expiresAt !== undefined && {
          expiresAt: expiresAt === null ? null : new Date(expiresAt),
        }),
        ...(isActive !== undefined && {isActive}),
        ...(passwordHash !== undefined && {passwordHash}),
      },
      targetUrl,
    );
    res.status(200).json(updated);
  },
);

/**
 * DELETE /api/urls/:id
 * Deletes a URL by ID. Ownership is verified by the verifyUrlOwnership middleware.
 */
router.delete(
  "/:id",
  verifyUrlOwnership,
  async (req: Request, res: Response) => {
    const targetUrl = req.targetUrl!;
    try {
      await deleteUrl(targetUrl);
      res.status(204).send();
    } catch (err: any) {
      if (err.message === "URL not found") {
        throw Object.assign(err, {statusCode: 404});
      }
      throw err;
    }
  },
);

export default router;
