import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { travelRecords } from "../../drizzle/schema";
import { desc, count, sql } from "drizzle-orm";

export const travelDashboardRouter = router({
  getData: publicProcedure.query(async () => {
    const db = await requireDb();
    const records = await db.select().from(travelRecords).orderBy(desc(travelRecords.createdAt)).limit(100);
    const [totalResult] = await db.select({ count: count() }).from(travelRecords);
    const [budgetResult] = await db.select({
      totalBudget: sql<string>`COALESCE(SUM(CAST(${travelRecords.totalBudget} AS NUMERIC)), 0)`,
      totalExpense: sql<string>`COALESCE(SUM(CAST(${travelRecords.actualExpense} AS NUMERIC)), 0)`,
    }).from(travelRecords);
    return {
      data: {
        records,
        totalTrips: totalResult.count,
        totalBudget: Number(budgetResult.totalBudget) || 0,
        totalExpense: Number(budgetResult.totalExpense) || 0,
      },
    };
  }),
});
