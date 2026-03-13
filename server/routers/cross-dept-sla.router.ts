/**
 * Cross-Department SLA Router
 * Tracks and measures inter-department service performance
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import { crossDeptSlaRecords } from "../../drizzle/cross-dept-sla-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("cross-dept-sla");

export const crossDeptSlaRouter = router({
  recordSlaEvent: requirePermission("hr:performance:manage")
    .input(z.object({
      requesterDeptCode: z.string().min(1).max(50),
      providerDeptCode: z.string().min(1).max(50),
      requestType: z.enum(["procurement", "finance_approval", "it_support", "hr_request", "quality_review", "design_review"]),
      requestedAt: z.string(),
      respondedAt: z.string().optional(),
      responseTimeMs: z.number().int().optional(),
      slaTargetMs: z.number().int().default(86400000),
      qualityScore: z.number().int().min(0).max(100).optional(),
      satisfactionScore: z.number().int().min(1).max(5).optional(),
      buCode: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const period = input.requestedAt.slice(0, 7);

      const [record] = await db.insert(crossDeptSlaRecords).values({
        ...input,
        period,
        metadata: input.metadata || {},
      }).returning({ id: crossDeptSlaRecords.id });

      log.info({ id: record.id, from: input.requesterDeptCode, to: input.providerDeptCode }, "SLA event recorded");
      return { success: true, id: record.id };
    }),

  getSlaScores: protectedProcedure
    .input(z.object({
      deptCode: z.string(),
      period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const period = input.period || new Date().toISOString().slice(0, 7);

      const rows = await db.select().from(crossDeptSlaRecords)
        .where(and(
          eq(crossDeptSlaRecords.providerDeptCode, input.deptCode),
          eq(crossDeptSlaRecords.period, period),
        ))
        .limit(1000);

      if (rows.length === 0) {
        return {
          deptCode: input.deptCode,
          period,
          totalRequests: 0,
          avgResponseTimeMs: 0,
          avgQualityScore: 0,
          slaCompliancePercent: 0,
          avgSatisfaction: 0,
        };
      }

      const responded = rows.filter(r => r.responseTimeMs != null);
      const avgResponseTimeMs = responded.length > 0
        ? Math.round(responded.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) / responded.length)
        : 0;

      const withQuality = rows.filter(r => r.qualityScore != null && r.qualityScore > 0);
      const avgQualityScore = withQuality.length > 0
        ? Math.round(withQuality.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / withQuality.length)
        : 0;

      const withSatisfaction = rows.filter(r => r.satisfactionScore != null && r.satisfactionScore > 0);
      const avgSatisfaction = withSatisfaction.length > 0
        ? Math.round(withSatisfaction.reduce((sum, r) => sum + (r.satisfactionScore || 0), 0) / withSatisfaction.length * 10) / 10
        : 0;

      const compliant = responded.filter(r => (r.responseTimeMs || 0) <= (r.slaTargetMs || 86400000));
      const slaCompliancePercent = responded.length > 0
        ? Math.round((compliant.length / responded.length) * 100)
        : 0;

      return {
        deptCode: input.deptCode,
        period,
        totalRequests: rows.length,
        avgResponseTimeMs,
        avgQualityScore,
        slaCompliancePercent,
        avgSatisfaction,
      };
    }),

  getCrossDeptMatrix: protectedProcedure
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const period = input.period || new Date().toISOString().slice(0, 7);

      const rows = await db.select().from(crossDeptSlaRecords)
        .where(eq(crossDeptSlaRecords.period, period))
        .limit(5000);

      // Build NxN matrix
      const matrix: Record<string, Record<string, {
        count: number;
        avgResponseMs: number;
        compliance: number;
        avgQuality: number;
      }>> = {};

      const deptPairs = new Map<string, typeof rows>();
      for (const row of rows) {
        const key = `${row.requesterDeptCode}→${row.providerDeptCode}`;
        if (!deptPairs.has(key)) deptPairs.set(key, []);
        deptPairs.get(key)!.push(row);
      }

      for (const [key, pairRows] of deptPairs) {
        const [req, prov] = key.split("→");
        if (!matrix[req]) matrix[req] = {};

        const responded = pairRows.filter(r => r.responseTimeMs != null);
        const avgResponseMs = responded.length > 0
          ? Math.round(responded.reduce((s, r) => s + (r.responseTimeMs || 0), 0) / responded.length)
          : 0;
        const compliant = responded.filter(r => (r.responseTimeMs || 0) <= (r.slaTargetMs || 86400000));

        const withQ = pairRows.filter(r => r.qualityScore != null && r.qualityScore > 0);

        matrix[req][prov] = {
          count: pairRows.length,
          avgResponseMs,
          compliance: responded.length > 0 ? Math.round((compliant.length / responded.length) * 100) : 0,
          avgQuality: withQ.length > 0 ? Math.round(withQ.reduce((s, r) => s + (r.qualityScore || 0), 0) / withQ.length) : 0,
        };
      }

      return { period, matrix, totalRecords: rows.length };
    }),

  listRecords: protectedProcedure
    .input(z.object({
      deptCode: z.string().optional(),
      period: z.string().optional(),
      requestType: z.enum(["procurement", "finance_approval", "it_support", "hr_request", "quality_review", "design_review"]).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.deptCode) {
        conditions.push(sql`(${crossDeptSlaRecords.requesterDeptCode} = ${input.deptCode} OR ${crossDeptSlaRecords.providerDeptCode} = ${input.deptCode})`);
      }
      if (input.period) {
        conditions.push(eq(crossDeptSlaRecords.period, input.period));
      }
      if (input.requestType) {
        conditions.push(eq(crossDeptSlaRecords.requestType, input.requestType));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const records = await db.select().from(crossDeptSlaRecords)
        .where(where)
        .orderBy(desc(crossDeptSlaRecords.requestedAt))
        .limit(input.limit)
        .offset(input.offset);

      return { records, count: records.length };
    }),
});
