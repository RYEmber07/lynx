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
import {connectRedis} from "./lib/redis.js";

const app = express();

// Standard middleware
app.use(helmet());
app.use(cors({origin: env.FRONTEND_URL, credentials: true}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

// Mount routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/urls", authenticate, urlRouter);
app.use("/", redirectRouter);

// 404 Fallback Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Global Centralized Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal Server Error",
    ...(env.NODE_ENV === "development" && {stack: err.stack}),
  });
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
