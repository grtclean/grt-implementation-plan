/**
 * GRT 5.0 费用对比导出 tRPC 路由
 *
 * Auto-DDL: expense_export_logs table
 * Procedures: requestExport, listExports, getExport, deleteExport
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
    CREATE TABLE IF NOT EXISTS expense_export_logs (
      id SERIAL PRIMARY KEY,
      export_type VARCHAR(50) NOT NULL DEFAULT 'comparison',
      date_range_start VARCHAR(10),
      date_range_end VARCHAR(10),
      file_url VARCHAR(500),
      row_count INTEGER DEFAULT 0,
      exported_by INTEGER,
      exported_by_name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tablesReady = true;
}

export const expenseComparisonExportRouter = router({
  requestExport: requirePermission("finance:expense:view")
    .input(
      z.object({
        exportType: z.string().default("comparison"),
        dateRangeStart: z.string().optional(),
        dateRangeEnd: z.string().optional(),
        format: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userName = (ctx as any).user?.displayName ?? (ctx as any).user?.username ?? "unknown";
      const userId = (ctx as any).user?.id ?? null;
      const fileUrl = `/exports/expense-${input.exportType}-${Date.now()}.${input.format ?? "xlsx"}`;

      await db.execute(sql`
        INSERT INTO expense_export_logs (export_type, date_range_start, date_range_end, file_url, row_count, exported_by, exported_by_name)
        VALUES (${input.exportType}, ${input.dateRangeStart ?? null}, ${input.dateRangeEnd ?? null},
                ${fileUrl}, ${0}, ${userId}, ${userName})
      `);
      return { success: true, url: fileUrl, message: "导出请求已提交" };
    }),

  listExports: protectedProcedure
    .input(
      z.object({
        exportType: z.string().optional(),
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
      const where = p.exportType ? `WHERE export_type = '${p.exportType}'` : "";

      const items = await db.execute(sql.raw(
        `SELECT * FROM expense_export_logs ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      ));
      const countResult = await db.execute(sql.raw(
        `SELECT COUNT(*) as total FROM expense_export_logs ${where}`
      ));
      const total = Number((countResult as any).rows?.[0]?.total ?? (countResult as any)[0]?.total ?? 0);
      return { items: (items as any).rows ?? items, total, page: p.page ?? 1, pageSize: limit };
    }),

  getExport: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      const rows = await db.execute(sql.raw(
        `SELECT * FROM expense_export_logs WHERE id = ${id} LIMIT 1`
      ));
      const items = (rows as any).rows ?? rows;
      return items.length > 0 ? items[0] : null;
    }),

  deleteExport: requirePermission("finance:expense:view")
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      await db.execute(sql`DELETE FROM expense_export_logs WHERE id = ${id}`);
      return { success: true, message: "导出记录已删除" };
    }),

  /** Legacy aliases */
  export: requirePermission("finance:expense:view")
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional(), format: z.string().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userName = (ctx as any).user?.displayName ?? "unknown";
      const userId = (ctx as any).user?.id ?? null;
      const fileUrl = `/exports/expense-comparison-${Date.now()}.xlsx`;
      await db.execute(sql`
        INSERT INTO expense_export_logs (export_type, date_range_start, date_range_end, file_url, exported_by, exported_by_name)
        VALUES ('comparison', ${input?.startDate ?? null}, ${input?.endDate ?? null}, ${fileUrl}, ${userId}, ${userName})
      `);
      return { url: fileUrl };
    }),

  exportReport: requirePermission("finance:expense:view")
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional(), format: z.string().optional() }).optional())
    .mutation(async () => {
      await ensureTables();
      return {
        data: "",
        mimeType: "application/octet-stream",
        filename: "expense-comparison.xlsx",
      };
    }),
});
