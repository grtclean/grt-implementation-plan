import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { expenseClaims } from "../../drizzle/schema";
import { desc, count, sql } from "drizzle-orm";

export const expenseComparisonRouter = router({
  // 费用列表
  list: publicProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(expenseClaims).orderBy(desc(expenseClaims.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 对比查询
  compare: publicProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    // Return all claims for client-side comparison
    const items = await db.select().from(expenseClaims).orderBy(desc(expenseClaims.createdAt)).limit(200);
    return items;
  }),

  // 获取对比数据
  getComparison: publicProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const [totalResult] = await db.select({
      totalExpense: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      tripCount: count(),
    }).from(expenseClaims);

    return {
      trend: "flat" as const,
      currentPeriod: {
        totalExpense: Number(totalResult.totalExpense) || 0,
        tripCount: totalResult.tripCount,
      },
      previousPeriod: { totalExpense: 0, tripCount: 0 },
      changeRate: 0,
      changeAmount: 0,
      breakdown: [],
      aiAnalysis: null,
    };
  }),

  // 月度趋势
  getMonthlyTrend: publicProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const results = await db.select({
      month: sql<string>`TO_CHAR(${expenseClaims.createdAt}, 'YYYY-MM')`,
      total: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      count: count(),
    }).from(expenseClaims)
      .groupBy(sql`TO_CHAR(${expenseClaims.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${expenseClaims.createdAt}, 'YYYY-MM')`)
      .limit(12);

    return results.map(r => ({
      month: r.month,
      total: Number(r.total),
      count: r.count,
    }));
  }),

  // 季度对比
  getQuarterComparison: publicProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const results = await db.select({
      quarter: sql<string>`TO_CHAR(${expenseClaims.createdAt}, 'YYYY-Q')`,
      total: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      count: count(),
    }).from(expenseClaims)
      .groupBy(sql`TO_CHAR(${expenseClaims.createdAt}, 'YYYY-Q')`)
      .orderBy(sql`TO_CHAR(${expenseClaims.createdAt}, 'YYYY-Q')`)
      .limit(8);

    return results.map(r => ({
      quarter: r.quarter,
      total: Number(r.total),
      count: r.count,
    }));
  }),

  // 导出
  expenseComparisonExport: protectedProcedure.input(z.any()).mutation(async () => {
    return { url: "" };
  }),
});
