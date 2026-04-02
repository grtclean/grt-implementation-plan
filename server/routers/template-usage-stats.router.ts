/**
 * GRT 5.0 模板使用统计 tRPC 路由
 *
 * Auto-DDL: template_usage_stats table
 * Procedures: list, recordUsage, getTopTemplates, getByType, rateTemplate
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
    CREATE TABLE IF NOT EXISTS template_usage_stats (
      id SERIAL PRIMARY KEY,
      template_id INTEGER NOT NULL,
      template_name VARCHAR(200) NOT NULL,
      template_type VARCHAR(50) NOT NULL DEFAULT 'general',
      usage_count INTEGER NOT NULL DEFAULT 0,
      last_used_at TIMESTAMP,
      last_used_by INTEGER,
      last_used_by_name VARCHAR(100),
      rating_avg DECIMAL(3,2) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tablesReady = true;
}

export const templateUsageStatsRouter = router({
  list: protectedProcedure
    .input(z.object({
      templateType: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const p = input ?? { page: 1, pageSize: 20 };
      const offset = ((p.page ?? 1) - 1) * (p.pageSize ?? 20);
      const limit = p.pageSize ?? 20;
      const where = p.templateType ? `WHERE template_type = '${p.templateType}'` : "";

      const items = await db.execute(sql.raw(
        `SELECT * FROM template_usage_stats ${where} ORDER BY usage_count DESC LIMIT ${limit} OFFSET ${offset}`
      ));
      const countResult = await db.execute(sql.raw(
        `SELECT COUNT(*) as total FROM template_usage_stats ${where}`
      ));
      const total = Number((countResult as any).rows?.[0]?.total ?? (countResult as any)[0]?.total ?? 0);
      return { items: (items as any).rows ?? items, total, page: p.page ?? 1, pageSize: limit };
    }),

  recordUsage: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      templateName: z.string(),
      templateType: z.string().default("general"),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = (ctx as any).user?.id ?? null;
      const userName = (ctx as any).user?.displayName ?? (ctx as any).user?.username ?? "unknown";

      // Upsert: insert or update usage_count
      const existing = await db.execute(sql.raw(
        `SELECT id FROM template_usage_stats WHERE template_id = ${input.templateId} LIMIT 1`
      ));
      const rows = (existing as any).rows ?? existing;
      if (rows.length > 0) {
        await db.execute(sql.raw(
          `UPDATE template_usage_stats SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP,
                  last_used_by = ${userId ?? "NULL"}, last_used_by_name = '${userName}'
           WHERE template_id = ${input.templateId}`
        ));
      } else {
        await db.execute(sql`
          INSERT INTO template_usage_stats (template_id, template_name, template_type, usage_count, last_used_at, last_used_by, last_used_by_name)
          VALUES (${input.templateId}, ${input.templateName}, ${input.templateType}, ${1}, CURRENT_TIMESTAMP, ${userId}, ${userName})
        `);
      }
      return { success: true, message: "使用已记录" };
    }),

  getTopTemplates: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const limit = input?.limit ?? 10;
      const rows = await db.execute(sql.raw(
        `SELECT * FROM template_usage_stats ORDER BY usage_count DESC LIMIT ${limit}`
      ));
      return (rows as any).rows ?? rows;
    }),

  getByType: protectedProcedure
    .input(z.object({ templateType: z.string() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql.raw(
        `SELECT * FROM template_usage_stats WHERE template_type = '${input.templateType}' ORDER BY usage_count DESC LIMIT 50`
      ));
      return (rows as any).rows ?? rows;
    }),

  rateTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      rating: z.number().min(0).max(5),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Simple rolling average update
      await db.execute(sql.raw(
        `UPDATE template_usage_stats
         SET rating_avg = CASE
           WHEN rating_avg IS NULL THEN ${input.rating}
           ELSE ROUND((rating_avg + ${input.rating}) / 2, 2)
         END
         WHERE template_id = ${input.templateId}`
      ));
      return { success: true, message: "评分已更新" };
    }),

  /** Legacy aliases */
  getSummary: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT template_type, COUNT(*) as count, SUM(usage_count) as total_usage, AVG(rating_avg) as avg_rating
       FROM template_usage_stats GROUP BY template_type`
    ));
    return { summary: (rows as any).rows ?? rows };
  }),

  getTrends: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT DATE(last_used_at) as use_date, COUNT(*) as count
       FROM template_usage_stats WHERE last_used_at IS NOT NULL
       GROUP BY DATE(last_used_at) ORDER BY use_date DESC LIMIT 30`
    ));
    return (rows as any).rows ?? rows;
  }),

  getPopularity: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT * FROM template_usage_stats ORDER BY usage_count DESC LIMIT 10`
    ));
    return (rows as any).rows ?? rows;
  }),

  getUserActivity: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT last_used_by_name, COUNT(*) as templates_used, SUM(usage_count) as total_usage
       FROM template_usage_stats WHERE last_used_by_name IS NOT NULL
       GROUP BY last_used_by_name ORDER BY total_usage DESC LIMIT 20`
    ));
    return (rows as any).rows ?? rows;
  }),

  getHourlyDistribution: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT HOUR(last_used_at) as hour, COUNT(*) as count
       FROM template_usage_stats WHERE last_used_at IS NOT NULL
       GROUP BY HOUR(last_used_at) ORDER BY hour LIMIT 24`
    ));
    return (rows as any).rows ?? rows;
  }),

  getReportTypeDistribution: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT template_type, COUNT(*) as count, SUM(usage_count) as total_usage
       FROM template_usage_stats GROUP BY template_type ORDER BY total_usage DESC LIMIT 20`
    ));
    return (rows as any).rows ?? rows;
  }),
});
