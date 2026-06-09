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
import {authenticate} from "./middleware/auth.middleware.js";
import {redirectLimiter, authLimiter, urlsLimiter, healthLimiter} from "./middleware/rateLimit.middleware.js";
import {connectRedis} from "./lib/redis.js";

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
app.use("/api/urls", authenticate, urlsLimiter, urlRouter);
app.use("/", redirectLimiter, redirectRouter);

// 404 Fallback Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Global Centralized Error Handling Middleware
// IMPORTANT: must remain the last middleware registered.
app.use((err: Error & {statusCode?: number}, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode ?? 500;

  // Always log the full error server-side (Winston replaces this on Day 19)
  console.error(err);

  if (env.NODE_ENV === "development") {
    res.status(statusCode).json({error: err.message, stack: err.stack});
    return;
  }

  // Production: never leak stack traces; hide internals for 500-class errors
  if (statusCode >= 500) {
    res.status(statusCode).json({error: "Internal server error"});
    return;
  }

  res.status(statusCode).json({error: err.message});
});

// Initialize services and start server
const start = async () => {
  try {
    // Await Redis connection before starting
    await connectRedis();

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
