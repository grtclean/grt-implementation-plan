/**
 * GRT 5.0 费用预测 tRPC 路由
 *
 * Auto-DDL: expense_forecasts table
 * Procedures: list, create, update, getByDepartment, getMonthlyTrend
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

let tablesReady = false;

async function ensureTables() {
  if (tablesReady) return;
  const db = await requireDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS expense_forecasts (
      id SERIAL PRIMARY KEY,
      department VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL,
      forecast_month VARCHAR(7) NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      actual_amount DECIMAL(12,2) DEFAULT NULL,
      variance_percent DECIMAL(5,2) DEFAULT NULL,
      notes TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tablesReady = true;
}

export const expenseForecastRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        department: z.string().optional(),
        month: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const p = input ?? { page: 1, pageSize: 20 };
      const offset = ((p.page ?? 1) - 1) * (p.pageSize ?? 20);
      const limit = p.pageSize ?? 20;

      const conditions: string[] = [];
      if (p.department) conditions.push(`department = '${p.department}'`);
      if (p.month) conditions.push(`forecast_month = '${p.month}'`);
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const items = await db.execute(sql.raw(
        `SELECT * FROM expense_forecasts ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      ));
      const countResult = await db.execute(sql.raw(
        `SELECT COUNT(*) as total FROM expense_forecasts ${where}`
      ));
      const total = Number((countResult as any).rows?.[0]?.total ?? (countResult as any)[0]?.total ?? 0);
      return { items: (items as any).rows ?? items, total, page: p.page ?? 1, pageSize: limit };
    }),

  create: requirePermission("finance:expense:view")
    .input(
      z.object({
        department: z.string(),
        category: z.string(),
        forecastMonth: z.string(),
        amount: z.number(),
        actualAmount: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = (ctx as any).user?.id ?? null;
      const variance = input.actualAmount != null && input.amount > 0
        ? (((input.actualAmount - input.amount) / input.amount) * 100).toFixed(2)
        : null;

      await db.execute(sql`
        INSERT INTO expense_forecasts (department, category, forecast_month, amount, actual_amount, variance_percent, notes, created_by)
        VALUES (${input.department}, ${input.category}, ${input.forecastMonth}, ${input.amount},
                ${input.actualAmount ?? null}, ${variance}, ${input.notes ?? null}, ${userId})
      `);
      return { success: true, message: "预测已创建" };
    }),

  update: requirePermission("finance:expense:view")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        amount: z.number().optional(),
        actualAmount: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      if (input.amount == null && input.actualAmount == null && input.notes == null) {
        return { success: true, message: "无变更" };
      }
      await db.execute(sql`UPDATE expense_forecasts SET
        amount = COALESCE(${input.amount ?? null}, amount),
        actual_amount = COALESCE(${input.actualAmount ?? null}, actual_amount),
        notes = COALESCE(${input.notes ?? null}, notes),
        variance_percent = CASE WHEN COALESCE(${input.amount ?? null}, amount) > 0 THEN ROUND(((COALESCE(${input.actualAmount ?? null}, actual_amount, 0) - COALESCE(${input.amount ?? null}, amount)) / COALESCE(${input.amount ?? null}, amount)) * 100, 2) ELSE variance_percent END
        WHERE id = ${id}`);
      return { success: true, message: "预测已更新" };
    }),

  getByDepartment: protectedProcedure
    .input(z.object({ department: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const dept = input?.department ?? null;
      const whereClause = dept ? sql`WHERE department = ${dept}` : sql``;
      const rows = await db.execute(sql`SELECT department, COUNT(*) as forecast_count, SUM(amount) as total_forecast, SUM(actual_amount) as total_actual
         FROM expense_forecasts ${whereClause}
         GROUP BY department ORDER BY total_forecast DESC`);
      return (rows as any).rows ?? rows;
    }),

  getMonthlyTrend: protectedProcedure
    .input(z.object({ department: z.string().optional(), months: z.number().default(6) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const p = input ?? { months: 6 };
      const where = p.department ? `WHERE department = '${p.department}'` : "";
      const rows = await db.execute(sql.raw(
        `SELECT forecast_month, SUM(amount) as total_forecast, SUM(actual_amount) as total_actual,
                AVG(variance_percent) as avg_variance
         FROM expense_forecasts ${where}
         GROUP BY forecast_month ORDER BY forecast_month DESC LIMIT ${p.months ?? 6}`
      ));
      return (rows as any).rows ?? rows;
    }),

  /** Legacy aliases */
  getForecast: protectedProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional(), category: z.string().optional() }).optional())
    .query(async () => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql.raw(`SELECT * FROM expense_forecasts ORDER BY created_at DESC LIMIT 50`));
      return (rows as any).rows ?? rows;
    }),

  generateForecast: requirePermission("finance:analytics:view")
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional(), category: z.string().optional() }).optional())
    .mutation(async () => {
      await ensureTables();
      return { success: true, message: "预测生成完毕" };
    }),
});
