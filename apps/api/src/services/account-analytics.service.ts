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
export async function getAccountTotalClicks(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<RawCountResult>(
    Prisma.sql`
      SELECT COUNT(c.id)::bigint AS count
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE u."userId" = ${userId}
    `
  );
  return Number(rows[0]?.count ?? 0n);
}

/**
 * Returns the number of unique visitors (distinct IPs) across all the user's URLs.
 * 
 * TODO: For GDPR compliance and better accuracy (handling NATs/VPNs), migrate to 
 * cookieless fingerprinting: COUNT(DISTINCT hash(IP + UserAgent + DailySalt))
 */
export async function getAccountUniqueVisitors(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<RawCountResult>(
    Prisma.sql`
      SELECT COUNT(DISTINCT c."ipAddress")::bigint AS count
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE u."userId" = ${userId}
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
  userId: string
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        c.device           AS label,
        COUNT(c.id)::bigint AS clicks
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE
        u."userId" = ${userId}
        AND c.device IS NOT NULL
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
  userId: string
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        c.browser          AS label,
        COUNT(c.id)::bigint AS clicks
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE
        u."userId" = ${userId}
        AND c.browser IS NOT NULL
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
  limit: number = 10
): Promise<BreakdownItem[]> {
  const rows = await prisma.$queryRaw<RawBreakdownResult>(
    Prisma.sql`
      SELECT
        c.country         AS label,
        COUNT(c.id)::bigint AS clicks
      FROM "Click" c
      JOIN "Url" u ON c."urlId" = u.id
      WHERE
        u."userId" = ${userId}
        AND c.country IS NOT NULL
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
    getAccountTotalClicks(userId),
    getAccountUniqueVisitors(userId),
    getAccountClicksOverTime(userId, days),
    getAccountDeviceBreakdown(userId),
    getAccountBrowserBreakdown(userId),
    getAccountCountryBreakdown(userId, 10),
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
