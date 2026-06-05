import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "../lib/db.js";
import redis from "../lib/redis.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  let dbStatus = "down";
  let dbLatency = 0;
  let redisStatus = "down";
  let redisLatency = 0;
  let isDegraded = false;

  // Database Check
  try {
    const dbStart = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = performance.now() - dbStart;
    dbStatus = "up";
  } catch (error) {
    isDegraded = true;
    console.error("Database health check failed:", error);
  }

  // Redis Check
  try {
    const redisStart = performance.now();
    await redis.ping();
    redisLatency = performance.now() - redisStart;
    redisStatus = "up";
  } catch (error) {
    isDegraded = true;
    console.error("Redis health check failed:", error);
  }

  const response = {
    status: isDegraded ? "degraded" : "ok",
    timestamp,
    services: {
      database: {
        status: dbStatus,
        latency_ms: Math.round(dbLatency),
      },
      redis: {
        status: redisStatus,
        latency_ms: Math.round(redisLatency),
      },
    },
  };

  if (isDegraded) {
    res.status(503).json(response);
  } else {
    res.status(200).json(response);
  }
});

export default router;
