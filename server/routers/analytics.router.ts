import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { analyticsEvents } from "../../drizzle/schema";
import { eq, desc, count, sql } from "drizzle-orm";

export const analyticsRouter = router({
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
  track: protectedProcedure.input(z.object({
    eventType: z.string().optional(),
    eventData: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [event] = await db.insert(analyticsEvents).values({
      userId: ctx.user.id,
      eventType: input.eventType || "page_view",
      eventData: input.eventData ? (typeof input.eventData === "string" ? input.eventData : JSON.stringify(input.eventData)) : undefined,
    }).returning();
    return { success: true, message: "事件已记录", data: event };
  }),
});
