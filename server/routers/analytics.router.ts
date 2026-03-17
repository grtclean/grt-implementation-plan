import { z } from "zod";
import { jsonValue } from "@shared/validators";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { analyticsEvents } from "../../drizzle/schema";
import { eq, desc, count, sql } from "drizzle-orm";

export const analyticsRouter = router({
  /**
   * Page analytics for MenuAnalytics.tsx.
   * Top pages by visit count, unused pages, summary stats.
   */
  getPageAnalytics: protectedProcedure
    .input(z.object({ days: z.number().default(30) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const days = input?.days ?? 30;
      try {
        // Top pages by view count
        const topResult = await db.execute(sql`
          SELECT
            COALESCE(event_data::json->>'page', event_data::json->>'path', 'unknown') as page,
            COUNT(*)::int as visits,
            COUNT(DISTINCT COALESCE(user_id::text, 'anon'))::int as users
          FROM analytics_events
          WHERE event_type = 'page_view'
            AND created_at >= NOW() - INTERVAL '1 day' * ${days}
          GROUP BY page
          ORDER BY visits DESC
          LIMIT 20
        `);
        const topPages = ((topResult as any).rows ?? []).map((r: any) => ({
          page: r.page,
          visits: Number(r.visits ?? 0),
          users: Number(r.users ?? 0),
        }));

        // Unused pages (pages with very few visits)
        const unusedResult = await db.execute(sql`
          SELECT
            COALESCE(event_data::json->>'page', event_data::json->>'path', 'unknown') as page,
            COUNT(*)::int as visits
          FROM analytics_events
          WHERE event_type = 'page_view'
            AND created_at >= NOW() - INTERVAL '1 day' * ${days}
          GROUP BY page
          HAVING COUNT(*) <= 5
          ORDER BY visits ASC
          LIMIT 10
        `);
        const unusedPages = ((unusedResult as any).rows ?? []).map((r: any) => ({
          page: r.page,
          visits: Number(r.visits ?? 0),
        }));

        // Summary
        const summaryResult = await db.execute(sql`
          SELECT
            COUNT(*)::int as total_views,
            COUNT(DISTINCT COALESCE(user_id::text, 'anon'))::int as unique_users
          FROM analytics_events
          WHERE event_type = 'page_view'
            AND created_at >= NOW() - INTERVAL '1 day' * ${days}
          LIMIT 1
        `);
        const summary = ((summaryResult as any).rows ?? [])[0] ?? {};

        return {
          topPages,
          unusedPages,
          totalViews: Number(summary.total_views ?? 0),
          uniqueUsers: Number(summary.unique_users ?? 0),
        };
      } catch {
        return { topPages: [], unusedPages: [], totalViews: 0, uniqueUsers: 0 };
      }
    }),

  /**
   * Track a page view event.
   */
  trackPageView: protectedProcedure
    .input(z.object({
      page: z.string(),
      path: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      try {
        await db.insert(analyticsEvents).values({
          userId: ctx.user?.id ?? null,
          eventType: "page_view",
          eventData: JSON.stringify({ page: input.page, path: input.path }),
        });
        return { success: true };
      } catch {
        return { success: true };
      }
    }),

  // 概览
  getOverview: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [totalResult] = await db.select({ count: count() }).from(analyticsEvents);
    // Get event type breakdown
    const breakdown = await db.select({
      eventType: analyticsEvents.eventType,
      count: count(),
    }).from(analyticsEvents).groupBy(analyticsEvents.eventType).limit(20);

    return {
      total: totalResult.count,
      charts: breakdown.map(b => ({ label: b.eventType, value: b.count })),
    };
  }),

  // 详情
  getDetails: protectedProcedure.input(z.object({ eventType: z.string().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    if (input?.eventType) {
      return await db.select().from(analyticsEvents)
        .where(eq(analyticsEvents.eventType, input.eventType))
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(100);
    }
    return await db.select().from(analyticsEvents)
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(100);
  }),

  // 追踪事件
  track: requirePermission('system:monitoring:view').input(z.object({
    eventType: z.string().optional(),
    eventData: jsonValue.optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [event] = await db.insert(analyticsEvents).values({
      userId: ctx.user!.id,
      eventType: input.eventType || "page_view",
      eventData: input.eventData ? (typeof input.eventData === "string" ? input.eventData : JSON.stringify(input.eventData)) : undefined,
    }).returning();
    return { success: true, message: "事件已记录", data: event };
  }),
});
