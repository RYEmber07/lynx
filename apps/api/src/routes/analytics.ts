import {Router} from "express";
import type {Request, Response, NextFunction} from "express";
import * as analyticsService from "../services/analytics.service.js";
import {
  authenticate,
  verifyUrlOwnership,
} from "../middleware/auth.middleware.js";
import {urlsLimiter} from "../middleware/rateLimit.middleware.js";

const router = Router();

// ---------------------------------------------------------------------------
// Shared middleware - applied to every analytics route in this file.
// Order matters: authenticate populates req.user, urlsLimiter's keyExtractor
// depends on it, and verifyUrlOwnership requires both to have run.
router.use("/:id/analytics", authenticate, urlsLimiter, verifyUrlOwnership);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/urls/:id/analytics
 * Returns a full analytics summary for the given URL.
 *
 * Query params:
 *   days - time window in days; must be 7, 30, or 90 (default: 30)
 */
router.get(
  "/:id/analytics",
  async (req: Request, res: Response, next: NextFunction) => {
    const urlId = req.params["id"] as string;
    const days = parseInt(req.query.days as string, 10) || 30;

    if (![7, 30, 90].includes(days)) {
      return next(
        Object.assign(new Error("days must be 7, 30, or 90"), {
          statusCode: 400,
        }),
      );
    }

    const analytics = await analyticsService.getUrlAnalytics(urlId, days);
    res.status(200).json(analytics);
  },
);

/**
 * GET /api/urls/:id/analytics/clicks
 * Returns daily click totals for the given URL.
 *
 * Query params:
 *   days - time window in days (default: 30)
 */
router.get(
  "/:id/analytics/clicks",
  async (req: Request, res: Response) => {
    const urlId = req.params["id"] as string;
    const days = parseInt(req.query.days as string, 10) || 30;

    const clicks = await analyticsService.getClicksOverTime(urlId, days);
    res.status(200).json({clicks});
  },
);

/**
 * GET /api/urls/:id/analytics/devices
 * Returns click counts broken down by device type.
 */
router.get(
  "/:id/analytics/devices",
  async (req: Request, res: Response) => {
    const urlId = req.params["id"] as string;
    const devices = await analyticsService.getDeviceBreakdown(urlId);
    res.status(200).json({devices});
  },
);

/**
 * GET /api/urls/:id/analytics/browsers
 * Returns click counts broken down by browser.
 */
router.get(
  "/:id/analytics/browsers",
  async (req: Request, res: Response) => {
    const urlId = req.params["id"] as string;
    const browsers = await analyticsService.getBrowserBreakdown(urlId);
    res.status(200).json({browsers});
  },
);

/**
 * GET /api/urls/:id/analytics/countries
 * Returns click counts broken down by country.
 *
 * Query params:
 *   limit - maximum number of countries to return (default: 10, max: 50)
 */
router.get(
  "/:id/analytics/countries",
  async (req: Request, res: Response) => {
    const urlId = req.params["id"] as string;
    const limit = Math.min(
      parseInt(req.query.limit as string, 10) || 10,
      50,
    );

    const countries = await analyticsService.getCountryBreakdown(
      urlId,
      limit,
    );
    res.status(200).json({countries});
  },
);

export default router;
