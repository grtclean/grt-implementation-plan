/**
 * GRT 5.0 字段映射推荐 tRPC 路由
 *
 * Auto-DDL: field_mapping_recommendations table
 * Procedures: getRecommendations, acceptRecommendation, rejectRecommendation, listAccepted, getStats
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
    CREATE TABLE IF NOT EXISTS field_mapping_recommendations (
      id SERIAL PRIMARY KEY,
      source_field VARCHAR(200) NOT NULL,
      target_field VARCHAR(200) NOT NULL,
      confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00,
      source_system VARCHAR(100) NOT NULL,
      target_system VARCHAR(100) NOT NULL,
      accepted BOOLEAN NOT NULL DEFAULT false,
      rejected BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tablesReady = true;
}

export const fieldMappingRecommendRouter = router({
  getRecommendations: protectedProcedure
    .input(
      z.object({
        sourceSystem: z.string().optional(),
        targetSystem: z.string().optional(),
        sourceFormat: z.string().optional(),
        targetFormat: z.string().optional(),
        sourceFields: z.array(z.string()).optional(),
        importType: z.string().optional(),
        minConfidence: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions: string[] = ["rejected = false"];
      if (input?.sourceSystem) conditions.push(`source_system = '${input.sourceSystem}'`);
      if (input?.targetSystem) conditions.push(`target_system = '${input.targetSystem}'`);
      if (input?.sourceFormat) conditions.push(`source_system = '${input.sourceFormat}'`);
      if (input?.targetFormat) conditions.push(`target_system = '${input.targetFormat}'`);
      if (input?.minConfidence) conditions.push(`confidence >= ${input.minConfidence}`);
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const rows = await db.execute(sql.raw(
        `SELECT * FROM field_mapping_recommendations ${where} ORDER BY confidence DESC LIMIT 100`
      ));
      return (rows as any).rows ?? rows;
    }),

  acceptRecommendation: requirePermission("system:data:migrate")
    .input(z.object({ recommendationId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.recommendationId);
      await db.execute(sql.raw(
        `UPDATE field_mapping_recommendations SET accepted = true, rejected = false WHERE id = ${id}`
      ));
      return { success: true, message: "推荐已接受" };
    }),

  rejectRecommendation: requirePermission("system:data:migrate")
    .input(z.object({ recommendationId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.recommendationId);
      await db.execute(sql.raw(
        `UPDATE field_mapping_recommendations SET rejected = true, accepted = false WHERE id = ${id}`
      ));
      return { success: true, message: "推荐已拒绝" };
    }),

  listAccepted: protectedProcedure
    .input(z.object({ sourceSystem: z.string().optional(), targetSystem: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions: string[] = ["accepted = true"];
      if (input?.sourceSystem) conditions.push(`source_system = '${input.sourceSystem}'`);
      if (input?.targetSystem) conditions.push(`target_system = '${input.targetSystem}'`);
      const where = `WHERE ${conditions.join(" AND ")}`;

      const rows = await db.execute(sql.raw(
        `SELECT * FROM field_mapping_recommendations ${where} ORDER BY source_field ASC LIMIT 500`
      ));
      return (rows as any).rows ?? rows;
    }),

  getStats: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT source_system, target_system,
              COUNT(*) as total,
              SUM(CASE WHEN accepted = true THEN 1 ELSE 0 END) as accepted_count,
              SUM(CASE WHEN rejected = true THEN 1 ELSE 0 END) as rejected_count,
              AVG(confidence) as avg_confidence
       FROM field_mapping_recommendations
       GROUP BY source_system, target_system
       ORDER BY total DESC LIMIT 50`
    ));
    return (rows as any).rows ?? rows;
  }),

  /** Legacy alias */
  applyRecommendation: requirePermission("system:data:migrate")
    .input(z.object({ recommendationId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.recommendationId);
      await db.execute(sql.raw(
        `UPDATE field_mapping_recommendations SET accepted = true, rejected = false WHERE id = ${id}`
      ));
      return { success: true, message: "操作成功" };
    }),
});
