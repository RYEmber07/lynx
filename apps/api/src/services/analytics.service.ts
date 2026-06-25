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
 * @param days  - Number of past days to include (default: 30).
 * @returns Total click count.
 */
export async function getTotalClicks(urlId: string, days: number = 30): Promise<number> {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return prisma.click.count({ 
    where: { 
      urlId,
      clickedAt: { gte: d }
    } 
  });
}

/**
 * Returns the number of unique visitors (distinct fingerprints) for a specific URL.
 *
 * Raw SQL is required because Prisma's aggregation API does not support
 * `COUNT(DISTINCT column)`.
 *
 * @param urlId - Primary key of the URL record.
 * @param days  - Number of past days to include (default: 30).
 * @returns Unique visitor count.
 */
export async function getUniqueVisitors(urlId: string, days: number = 30): Promise<number> {
  const rows = await prisma.$queryRaw<RawCountResult>(
    Prisma.sql`
      SELECT COUNT(DISTINCT "fingerprint")::bigint AS count
      FROM "Click"
      WHERE 
        "urlId" = ${urlId}
        AND "clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
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
 * Rows with a null device are grouped under the label 'Unknown'.
 *
 * @param urlId - Primary key of the URL record.
 * @param days  - Number of past days to include (default: 30).
 * @returns Array of `BreakdownItem` sorted by click count descending.
 */
export async function getDeviceBreakdown(
  urlId: string,
  days: number = 30
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        COALESCE(device, 'Unknown') AS label,
        COUNT(*)::bigint AS clicks
      FROM "Click"
      WHERE
        "urlId" = ${urlId}
        AND "clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
      GROUP BY device
      ORDER BY clicks DESC
    `
  );

  return toBreakdownItems(rows);
}

/**
 * Returns click counts broken down by browser for the given URL.
 * Rows with a null browser are grouped under the label 'Unknown'.
 *
 * @param urlId - Primary key of the URL record.
 * @param days  - Number of past days to include (default: 30).
 * @returns Array of `BreakdownItem` sorted by click count descending.
 */
export async function getBrowserBreakdown(
  urlId: string,
  days: number = 30
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        COALESCE(browser, 'Unknown') AS label,
        COUNT(*)::bigint AS clicks
      FROM "Click"
      WHERE
        "urlId" = ${urlId}
        AND "clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
      GROUP BY browser
      ORDER BY clicks DESC
    `
  );

  return toBreakdownItems(rows);
}

/**
 * Returns click counts broken down by country for the given URL.
 * Rows with a null country are grouped under the label 'Unknown'. Results are capped at `limit`.
 *
 * @param urlId - Primary key of the URL record.
 * @param days  - Number of past days to include (default: 30).
 * @param limit - Maximum number of countries to return (default: 10).
 * @returns Array of `BreakdownItem` sorted by click count descending.
 */
export async function getCountryBreakdown(
  urlId: string,
  days: number = 30,
  limit: number = 10
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        COALESCE(country, 'Unknown') AS label,
        COUNT(*)::bigint AS clicks
      FROM "Click"
      WHERE
        "urlId"  = ${urlId}
        AND "clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
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
    getTotalClicks(urlId, days),
    getUniqueVisitors(urlId, days),
    getClicksOverTime(urlId, days),
    getDeviceBreakdown(urlId, days),
    getBrowserBreakdown(urlId, days),
    getCountryBreakdown(urlId, days),
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
