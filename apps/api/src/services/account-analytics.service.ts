import prisma from "../lib/db.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  toBreakdownItems,
  type ClicksOverTime,
  type BreakdownItem,
  type UrlAnalytics,
  type RawCountResult,
  type RawClicksOverTimeResult,
  type RawBreakdownResult,
} from "./analytics.service.js";

/**
 * Returns the total number of click events recorded for all URLs belonging to the user.
 */
export async function getAccountTotalClicks(userId: string, days: number = 30): Promise<number> {
  const rows = await prisma.$queryRaw<RawCountResult>(
    Prisma.sql`
      SELECT COUNT(c.id)::bigint AS count
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE 
        u."userId" = ${userId}
        AND c."clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
    `
  );
  return Number(rows[0]?.count ?? 0n);
}

/**
 * Returns the number of unique visitors (distinct fingerprints) across all the user's URLs.
 */
export async function getAccountUniqueVisitors(userId: string, days: number = 30): Promise<number> {
  const rows = await prisma.$queryRaw<RawCountResult>(
    Prisma.sql`
      SELECT COUNT(DISTINCT c."fingerprint")::bigint AS count
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE 
        u."userId" = ${userId}
        AND c."clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
    `
  );
  return Number(rows[0]?.count ?? 0n);
}

/**
 * Returns daily click totals for all user URLs over the last `days` days.
 */
export async function getAccountClicksOverTime(
  userId: string,
  days: number = 30
): Promise<ClicksOverTime[]> {
  const rows = await prisma.$queryRaw<RawClicksOverTimeResult>(
    Prisma.sql`
      SELECT
        DATE(c."clickedAt")::text AS date,
        COUNT(c.id)::bigint       AS clicks
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE
        u."userId" = ${userId}
        AND c."clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
      GROUP BY DATE(c."clickedAt")
      ORDER BY DATE(c."clickedAt") ASC
    `
  );

  return rows.map((row) => ({
    date: row.date,
    clicks: Number(row.clicks),
  }));
}

/**
 * Returns click counts broken down by device type for all user URLs.
 */
export async function getAccountDeviceBreakdown(
  userId: string,
  days: number = 30
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        COALESCE(c.device, 'Unknown') AS label,
        COUNT(c.id)::bigint AS clicks
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE
        u."userId" = ${userId}
        AND c."clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
      GROUP BY c.device
      ORDER BY clicks DESC
    `
  );

  return toBreakdownItems(rows);
}

/**
 * Returns click counts broken down by browser for all user URLs.
 */
export async function getAccountBrowserBreakdown(
  userId: string,
  days: number = 30
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        COALESCE(c.browser, 'Unknown') AS label,
        COUNT(c.id)::bigint AS clicks
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE
        u."userId" = ${userId}
        AND c."clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
      GROUP BY c.browser
      ORDER BY clicks DESC
    `
  );

  return toBreakdownItems(rows);
}

/**
 * Returns click counts broken down by country for all user URLs.
 */
export async function getAccountCountryBreakdown(
  userId: string,
  days: number = 30,
  limit: number = 10
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        COALESCE(c.country, 'Unknown') AS label,
        COUNT(c.id)::bigint AS clicks
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE
        u."userId" = ${userId}
        AND c."clickedAt" >= CURRENT_DATE - (${days} || ' days')::interval
      GROUP BY c.country
      ORDER BY clicks DESC
      LIMIT ${limit}
    `
  );

  return toBreakdownItems(rows);
}

/**
 * Aggregates all global analytics for a user into a single UrlAnalytics object.
 */
export async function getAccountAnalytics(
  userId: string,
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
    getAccountTotalClicks(userId, days),
    getAccountUniqueVisitors(userId, days),
    getAccountClicksOverTime(userId, days),
    getAccountDeviceBreakdown(userId, days),
    getAccountBrowserBreakdown(userId, days),
    getAccountCountryBreakdown(userId, days, 10),
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
