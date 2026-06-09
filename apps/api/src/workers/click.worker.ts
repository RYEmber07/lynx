import {Worker} from "bullmq";
import type {Job} from "bullmq";
import * as UAParserLib from "ua-parser-js";
import prisma from "../lib/db.js";
import {type ClickJobData, redisConnection} from "../queues/click.queue.js";

// ---------------------------------------------------------------------------
// Geo-lookup helpers
// ---------------------------------------------------------------------------

type GeoResult = {
  country: string | null;
  city: string | null;
};

type IpApiResponse = {
  status: "success" | "fail";
  country?: string;
  city?: string;
};

/**
 * Looks up approximate country and city for an IP address using ip-api.com.
 * Returns nulls for localhost addresses and on any fetch/parse failure so
 * geolocation errors never bubble up and fail the job.
 *
 * @param ip - The client IP address, or null if unavailable.
 * @returns A {@link GeoResult} with country and city (both nullable).
 */
async function geolocate(ip: string | null): Promise<GeoResult> {
  const nullResult: GeoResult = {country: null, city: null};

  // Skip geolocation for missing or loopback addresses
  if (ip === null || ip === "::1" || ip === "127.0.0.1") {
    return nullResult;
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,city,status`,
    );
    const data = (await response.json()) as IpApiResponse;

    if (data.status === "success") {
      return {
        country: data.country ?? null,
        city: data.city ?? null,
      };
    }

    return nullResult;
  } catch {
    // Geolocation failure must never fail the job - analytics are best-effort (nice to have but not a gurantee).
    return nullResult;
  }
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

/**
 * Processes a single click job: parses the user agent, geolocates the IP,
 * and writes a Click record to the database.
 *
 * @param job - The BullMQ job containing {@link ClickJobData}.
 */
async function processClickJob(job: Job<ClickJobData>): Promise<void> {
  const {urlId, ip, userAgent, referrer, clickedAt} = job.data;

  // Parse user agent string
  // UAParser is called as a function (not a constructor) under ESM
  const result = UAParserLib.UAParser(userAgent ?? "");

  // UAParser returns undefined for desktop (no device type string), default it
  const device = result.device.type ?? "desktop";
  const browser = result.browser.name ?? null;
  const os = result.os.name ?? null;

  // Geolocate - wrapped inside geolocate() which never throws
  const {country, city} = await geolocate(ip);

  await prisma.click.create({
    data: {
      urlId,
      ipAddress: ip,
      country,
      city,
      device,
      browser,
      os,
      referrer,
      clickedAt: new Date(clickedAt),
    },
  });

  console.log(`Click recorded for URL ${urlId}`);
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export const clickWorker = new Worker<ClickJobData>("clicks", processClickJob, {
  connection: redisConnection,
  // concurrency: 5 means up to 5 click jobs processed simultaneously.
  // Each job does one DB write + one external HTTP call (geo API).
  // Tune based on DB connection pool size and geo API rate limits.
  concurrency: 5,
});

clickWorker.on("completed", (job) => {
  console.log(`[ClickWorker] Job ${job.id} completed`);
});

clickWorker.on("failed", (job, err) => {
  console.error(`[ClickWorker] Job ${job?.id} failed:`, err.message);
});
