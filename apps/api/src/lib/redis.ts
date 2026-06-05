import Redis from "ioredis";
import env from "../config/env";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  console.log("✅ Successfully connected to Redis.");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

export const connectRedis = async (): Promise<void> => {
  if (redis.status === "ready") {
    return;
  }

  return new Promise((resolve) => {
    redis.once("ready", () => {
      resolve();
    });
  });
};

export default redis;
