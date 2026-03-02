import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { expenseClaims } from "../../drizzle/schema";
import { desc, count, sql, eq } from "drizzle-orm";

/** Roles that can see ALL expense data (not just their own) */
const FINANCE_ROLES = new Set(["admin", "director", "finance_manager", "finance_specialist", "hr_manager"]);

export const expenseComparisonRouter = router({
  // 费用列表
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const role = ctx.user.role ?? "employee";
    const isFinance = FINANCE_ROLES.has(role);
    const whereCondition = isFinance ? undefined : eq(expenseClaims.submitterId, ctx.user.id);
    const items = await db.select().from(expenseClaims).where(whereCondition).orderBy(desc(expenseClaims.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 对比查询
  compare: protectedProcedure.input(z.record(z.string(), jsonValue).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const role = ctx.user.role ?? "employee";
    const isFinance = FINANCE_ROLES.has(role);
    const whereCondition = isFinance ? undefined : eq(expenseClaims.submitterId, ctx.user.id);
    const items = await db.select().from(expenseClaims).where(whereCondition).orderBy(desc(expenseClaims.createdAt)).limit(200);
    return items;
  }),

  // 获取对比数据
  getComparison: protectedProcedure.input(z.record(z.string(), jsonValue).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const role = ctx.user.role ?? "employee";
    const isFinance = FINANCE_ROLES.has(role);
    const whereCondition = isFinance ? undefined : eq(expenseClaims.submitterId, ctx.user.id);
    const [totalResult] = await db.select({
      totalExpense: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      tripCount: count(),
    }).from(expenseClaims).where(whereCondition);

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
  getMonthlyTrend: protectedProcedure.input(z.record(z.string(), jsonValue).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const role = ctx.user.role ?? "employee";
    const isFinance = FINANCE_ROLES.has(role);
    const whereCondition = isFinance ? undefined : eq(expenseClaims.submitterId, ctx.user.id);
    const results = await db.select({
      month: sql<string>`TO_CHAR(${expenseClaims.createdAt}, 'YYYY-MM')`,
      total: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      count: count(),
    }).from(expenseClaims)
      .where(whereCondition)
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
  getQuarterComparison: protectedProcedure.input(z.record(z.string(), jsonValue).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const role = ctx.user.role ?? "employee";
    const isFinance = FINANCE_ROLES.has(role);
    const whereCondition = isFinance ? undefined : eq(expenseClaims.submitterId, ctx.user.id);
    const results = await db.select({
      quarter: sql<string>`TO_CHAR(${expenseClaims.createdAt}, 'YYYY-Q')`,
      total: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      count: count(),
    }).from(expenseClaims)
      .where(whereCondition)
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
  expenseComparisonExport: protectedProcedure.input(z.record(z.string(), jsonValue).optional()).mutation(async () => {
    return { url: "" };
  }),
});
