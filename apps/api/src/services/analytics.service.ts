import prisma from "../lib/db.js";
import { Prisma } from "../generated/prisma/client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClicksOverTime = {
  date: string;
  clicks: number;
};

export type BreakdownItem = {
  label: string;
  clicks: number;
  percentage: number;
};

export type UrlAnalytics = {
  totalClicks: number;
  uniqueVisitors: number;
  clicksOverTime: ClicksOverTime[];
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  countries: BreakdownItem[];
};

// ---------------------------------------------------------------------------
// Raw-query result shapes (BigInt counts come back from Postgres)
// ---------------------------------------------------------------------------

export type RawCountResult = { count: bigint }[];

export type RawClicksOverTimeResult = { date: string; clicks: bigint }[];

export type RawBreakdownResult = { label: string; clicks: bigint }[];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a raw breakdown result into `BreakdownItem[]` by computing
 * percentages relative to the total click count across all rows.
 */
export function toBreakdownItems(rows: RawBreakdownResult): BreakdownItem[] {
  const total = rows.reduce((sum, row) => sum + Number(row.clicks), 0);

  return rows.map((row) => ({
    label: row.label,
    clicks: Number(row.clicks),
    percentage:
      total === 0 ? 0 : Math.round((Number(row.clicks) / total) * 1000) / 10,
  }));
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Returns the total number of click events recorded for the given URL.
 *
 * @param urlId - Primary key of the URL record.
 * @returns Total click count.
 */
export async function getTotalClicks(urlId: string): Promise<number> {
  return prisma.click.count({ where: { urlId } });
}

/**
 * Returns the number of unique visitors (distinct IPs) for a specific URL.
 * 
 * TODO: For GDPR compliance and better accuracy (handling NATs/VPNs), migrate to 
 * cookieless fingerprinting: COUNT(DISTINCT hash(IP + UserAgent + DailySalt))
 *
 * Raw SQL is required because Prisma's aggregation API does not support
 * `COUNT(DISTINCT column)`.
 *
 * @param urlId - Primary key of the URL record.
 * @returns Unique visitor count.
 */
export async function getUniqueVisitors(urlId: string): Promise<number> {
  const rows = await prisma.$queryRaw<RawCountResult>(
    Prisma.sql`
      SELECT COUNT(DISTINCT "ipAddress")::bigint AS count
      FROM "Click"
      WHERE "urlId" = ${urlId}
    `
  );

  return Number(rows[0]?.count ?? 0n);
}

/**
 * Returns daily click totals for the given URL over the last `days` days,
 * ordered chronologically.
 *
 * @param urlId - Primary key of the URL record.
 * @param days  - Number of past days to include (default: 30).
 * @returns Array of `{ date, clicks }` objects, one per day that had clicks.
 */
export async function getClicksOverTime(
  urlId: string,
  days: number = 30
): Promise<ClicksOverTime[]> {
  const rows = await prisma.$queryRaw<RawClicksOverTimeResult>(
    Prisma.sql`
      SELECT
        DATE("clickedAt")::text AS date,
        COUNT(*)::bigint        AS clicks
      FROM "Click"
      WHERE
        "urlId"      = ${urlId}
        AND "clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
      GROUP BY DATE("clickedAt")
      ORDER BY DATE("clickedAt") ASC
    `
  );

  return rows.map((row) => ({
    date: row.date,
    clicks: Number(row.clicks),
  }));
}

/**
 * Returns click counts broken down by device type for the given URL.
 * Rows with a null device are excluded so only actionable data is returned.
 *
 * @param urlId - Primary key of the URL record.
 * @returns Array of `BreakdownItem` sorted by click count descending.
 */
export async function getDeviceBreakdown(
  urlId: string
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        device           AS label,
        COUNT(*)::bigint AS clicks
      FROM "Click"
      WHERE
        "urlId" = ${urlId}
        AND device IS NOT NULL
      GROUP BY device
      ORDER BY clicks DESC
    `
  );

  return toBreakdownItems(rows);
}

/**
 * Returns click counts broken down by browser for the given URL.
 * Rows with a null browser are excluded so only actionable data is returned.
 *
 * @param urlId - Primary key of the URL record.
 * @returns Array of `BreakdownItem` sorted by click count descending.
 */
export async function getBrowserBreakdown(
  urlId: string
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        browser          AS label,
        COUNT(*)::bigint AS clicks
      FROM "Click"
      WHERE
        "urlId" = ${urlId}
        AND browser IS NOT NULL
      GROUP BY browser
      ORDER BY clicks DESC
    `
  );

  return toBreakdownItems(rows);
}

/**
 * Returns click counts broken down by country for the given URL.
 * Rows with a null country are excluded. Results are capped at `limit`.
 *
 * @param urlId - Primary key of the URL record.
 * @param limit - Maximum number of countries to return (default: 10).
 * @returns Array of `BreakdownItem` sorted by click count descending.
 */
export async function getCountryBreakdown(
  urlId: string,
  limit: number = 10
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        country         AS label,
        COUNT(*)::bigint AS clicks
      FROM "Click"
      WHERE
        "urlId"  = ${urlId}
        AND country IS NOT NULL
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT ${limit}
    `
  );

  return toBreakdownItems(rows);
}

/**
 * Aggregates all analytics for a URL into a single `UrlAnalytics` object.
 * All six underlying queries run concurrently via `Promise.all`.
 *
 * @param urlId - Primary key of the URL record.
 * @param days  - Time-window in days for the `clicksOverTime` series (default: 30).
 * @returns Fully assembled `UrlAnalytics` object.
 */
export async function getUrlAnalytics(
  urlId: string,
  days: number = 30
): Promise<UrlAnalytics> {
  const [
    totalClicks,
    uniqueVisitors,
    clicksOverTime,
    devices,
    browsers,
    countries,
  ] = await Promise.all([
    getTotalClicks(urlId),
    getUniqueVisitors(urlId),
    getClicksOverTime(urlId, days),
    getDeviceBreakdown(urlId),
    getBrowserBreakdown(urlId),
    getCountryBreakdown(urlId),
  ]);

  return {
    totalClicks,
    uniqueVisitors,
    clicksOverTime,
    devices,
    browsers,
    countries,
  };
}
