import env from "./config/env.js";
import express from "express";
import type {Request, Response, NextFunction} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import healthRouter from "./routes/health.js";
import urlRouter from "./routes/url.js";
import redirectRouter from "./routes/redirect.js";
import authRouter from "./routes/auth.js";
import analyticsRouter from "./routes/analytics.js";
import {redirectLimiter, authLimiter, healthLimiter} from "./middleware/rateLimit.middleware.js";
import {connectRedis} from "./lib/redis.js";
import {clickWorker} from "./workers/click.worker.js";

const app = express();

// Standard middleware
app.use(helmet());
app.use(cors({origin: env.FRONTEND_URL, credentials: true}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

// Mount routes
app.use("/api/health", healthLimiter, healthRouter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/urls", urlRouter);
app.use("/api/urls", analyticsRouter);
app.use("/", redirectLimiter, redirectRouter);

// 404 Fallback Handler
app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Global Centralized Error Handling Middleware
// IMPORTANT: must remain the last middleware registered.
app.use(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode ?? 500;

    // Always log the full error server-side (Winston replaces this on Day 19)
    console.error(err);

    const devExtra = env.NODE_ENV === "development" ? {stack: err.stack} : {};

    // Validation error - keyed on the isValidationError tag set by the
    // validate middleware; surfaces the flat fieldErrors map to the client.
    if (err.isValidationError === true) {
      res
        .status(statusCode)
        .json({error: "Validation failed", errors: err.errors, ...devExtra});
      return;
    }

    // Production: never leak stack traces; hide internals for 500-class errors
    if (statusCode >= 500 && env.NODE_ENV === "production") {
      res.status(statusCode).json({error: "Internal server error"});
      return;
    }

    res.status(statusCode).json({error: err.message, ...devExtra});
  },
);

// Initialize services and start server
const start = async () => {
  try {
    // Await Redis connection before starting
    await connectRedis();

    // Initialize click worker - starts listening for jobs
    // Importing clickWorker is sufficient to start it.
    // BullMQ workers begin polling Redis for jobs on instantiation.
    // In production, workers would run as separate processes/containers
    // for independent scaling. For now, co-located with the API is fine.
    clickWorker;

    app.listen(env.PORT, () => {
      console.log(`✅ Server is running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

start();

export default app;
