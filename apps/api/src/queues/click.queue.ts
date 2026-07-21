import {Queue} from "bullmq";
import {Redis} from "ioredis";
import env from "../config/env.js";
import type {ConnectionOptions} from "bullmq";

// Pass the full connection string directly to ioredis — do NOT hand-parse it.
// Railway's Redis passwords happened to be simple alphanumeric strings that
// survived new URL() parsing. Upstash passwords are high-entropy strings that
// often contain characters like %, /, +, = or : which new URL() silently
// mangles via percent-decoding, causing BullMQ to authenticate with garbage
// credentials. ioredis parses the raw connection string internally and handles
// all of this correctly, including the rediss:// TLS protocol.
//
// maxRetriesPerRequest: null is required by BullMQ — it uses long-lived
// blocking commands (BLPOP) and must not have per-request retry limits.
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
}) as unknown as ConnectionOptions;

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
