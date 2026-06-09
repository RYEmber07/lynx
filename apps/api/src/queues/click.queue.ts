import {Queue} from "bullmq";
import env from "../config/env.js";

// BullMQ requires its own Redis connection config (host + port) and manages
// its own internal connection pool. It cannot share the ioredis singleton
// used for caching because BullMQ needs to control reconnect behaviour and
// blocking commands independently.
const redisUrl = new URL(env.REDIS_URL);

export const redisConnection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || "6379"),
};

// ---------------------------------------------------------------------------
// Job data type
// ---------------------------------------------------------------------------

export type ClickJobData = {
  urlId: string;
  shortCode: string;
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
  /** ISO 8601 timestamp of when the click occurred. */
  clickedAt: string;
};

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export const clickQueue = new Queue<ClickJobData, void, "click">("clicks", {
  connection: redisConnection,
  defaultJobOptions: {
    /** Retry up to 3 times on failure before moving to the failed set. */
    attempts: 3,
    /** Exponential back-off: 1s, 2s, 4s between retries. */
    backoff: {type: "exponential", delay: 1000},
    /** Keep the last 100 completed jobs for observability. */
    removeOnComplete: 100,
    /** Keep the last 500 failed jobs for debugging. */
    removeOnFail: 500,
  },
});
