import {Router} from "express";
import type {Request, Response} from "express";
import * as accountAnalyticsService from "../services/account-analytics.service.js";
import {authenticate} from "../middleware/auth.middleware.js";
import {urlsLimiter} from "../middleware/rateLimit.middleware.js";
import {validate} from "../middleware/validate.middleware.js";
import {
  AnalyticsQuerySchema,
  type AnalyticsQuery,
} from "../validators/url.validators.js";

const router = Router();

// Shared middleware
router.use("/", authenticate, urlsLimiter, validate(AnalyticsQuerySchema, "query"));

/**
 * GET /api/analytics
 * Returns a full global analytics summary for the user.
 */
router.get(
  "/",
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { days } = req.validatedQuery as AnalyticsQuery;

    const analytics = await accountAnalyticsService.getAccountAnalytics(userId, days);
    res.status(200).json(analytics);
  },
);

/**
 * GET /api/analytics/clicks
 */
router.get(
  "/clicks",
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { days } = req.validatedQuery as AnalyticsQuery;

    const clicks = await accountAnalyticsService.getAccountClicksOverTime(userId, days);
    res.status(200).json({clicks});
  },
);

/**
 * GET /api/analytics/devices
 */
router.get(
  "/devices",
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const devices = await accountAnalyticsService.getAccountDeviceBreakdown(userId);
    res.status(200).json({devices});
  },
);

/**
 * GET /api/analytics/browsers
 */
router.get(
  "/browsers",
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const browsers = await accountAnalyticsService.getAccountBrowserBreakdown(userId);
    res.status(200).json({browsers});
  },
);

/**
 * GET /api/analytics/countries
 */
router.get(
  "/countries",
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { limit } = req.validatedQuery as AnalyticsQuery;

    const countries = await accountAnalyticsService.getAccountCountryBreakdown(
      userId,
      limit,
    );
    res.status(200).json({countries});
  },
);

export default router;
