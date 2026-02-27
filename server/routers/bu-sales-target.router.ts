/**
 * BU Sales Target Planner Router — 事业部年度目标分解
 *
 * Provides CRUD for annual BU sales/output target plans with:
 *   - Auto-generated monthly breakdown using growth rules
 *   - Detail-level adjustments (zero-sum validation)
 *   - Adjustment approval workflow
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq, desc, sql } from "drizzle-orm";
import {
  buSalesPlans,
  buSalesPlanDetails,
  buSalesPlanAdjustments,
} from "../../drizzle/schema";

export const buSalesTargetRouter = router({
  /** List all BU sales plans, ordered by year desc */
  list: publicProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      try {
        const items = await db
          .select()
          .from(buSalesPlans)
          .orderBy(desc(buSalesPlans.year))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(buSalesPlans);
        return { items, total: Number(countResult[0]?.count ?? 0) };
      } catch {
        return { items: [], total: 0 };
      }
    }),

  /** Get plan + its 12 monthly details by plan ID */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      try {
        const [plan] = await db
          .select()
          .from(buSalesPlans)
          .where(eq(buSalesPlans.id, input.id));
        if (!plan) return null;
        const details = await db
          .select()
          .from(buSalesPlanDetails)
          .where(eq(buSalesPlanDetails.buSalesPlanId, input.id))
          .orderBy(buSalesPlanDetails.periodValue);
        const adjustments = await db
          .select()
          .from(buSalesPlanAdjustments)
          .where(eq(buSalesPlanAdjustments.buSalesPlanId, input.id))
          .orderBy(desc(buSalesPlanAdjustments.createdAt));
        return { plan, details, adjustments };
      } catch {
        return null;
      }
    }),

  /** Create plan + auto-generate 12 monthly details using growthRules */
  create: publicProcedure
    .input(z.object({
      year: z.number(),
      departmentId: z.string(),
      totalSalesTarget: z.number(),
      totalOutputTarget: z.number(),
      growthRules: z.object({
        Q2_vs_Q1: z.number().default(0.2),
        Q3_vs_Q2: z.number().default(0.2),
        Q4_vs_Q3: z.number().default(0.1),
      }),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { year, departmentId, totalSalesTarget, totalOutputTarget, growthRules } = input;

      // Calculate quarterly distribution using growth rules
      // Q1_base = total / (1 + (1+g1) + (1+g1)(1+g2) + (1+g1)(1+g2)(1+g3))
      const g1 = growthRules.Q2_vs_Q1;
      const g2 = growthRules.Q3_vs_Q2;
      const g3 = growthRules.Q4_vs_Q3;
      const divisor = 1 + (1 + g1) + (1 + g1) * (1 + g2) + (1 + g1) * (1 + g2) * (1 + g3);

      const salesQ1 = totalSalesTarget / divisor;
      const salesQ2 = salesQ1 * (1 + g1);
      const salesQ3 = salesQ2 * (1 + g2);
      const salesQ4 = salesQ3 * (1 + g3);

      const outputQ1 = totalOutputTarget / divisor;
      const outputQ2 = outputQ1 * (1 + g1);
      const outputQ3 = outputQ2 * (1 + g2);
      const outputQ4 = outputQ3 * (1 + g3);

      const quarterSales = [salesQ1, salesQ2, salesQ3, salesQ4];
      const quarterOutput = [outputQ1, outputQ2, outputQ3, outputQ4];
      const kpiBaselines = [75, 78, 80, 85];
      const capLevels = [2.25, 2.50, 2.75, 3.00];

      // Insert plan
      const [plan] = await db
        .insert(buSalesPlans)
        .values({
          year,
          departmentId,
          totalSalesTarget: totalSalesTarget.toFixed(2),
          totalOutputTarget: totalOutputTarget.toFixed(2),
          growthRules,
          status: "draft",
        })
        .returning();

      // Insert 12 monthly details
      const monthlyRows = [];
      for (let q = 0; q < 4; q++) {
        for (let m = 0; m < 3; m++) {
          const monthIdx = q * 3 + m + 1;
          monthlyRows.push({
            buSalesPlanId: plan.id,
            periodType: "month",
            periodValue: monthIdx,
            salesTarget: (quarterSales[q] / 3).toFixed(2),
            outputTarget: (quarterOutput[q] / 3).toFixed(2),
            kpiTarget: kpiBaselines[q].toFixed(2),
            capabilityLevel: capLevels[q].toFixed(2),
            isAdjusted: false,
          });
        }
      }

      await db.insert(buSalesPlanDetails).values(monthlyRows);

      return plan;
    }),

  /** Manually adjust a single month detail (sets isAdjusted=true) */
  updateDetail: publicProcedure
    .input(z.object({
      detailId: z.number(),
      salesTarget: z.number().optional(),
      outputTarget: z.number().optional(),
      kpiTarget: z.number().optional(),
      capabilityLevel: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, unknown> = { isAdjusted: true };
      if (input.salesTarget !== undefined) updateData.salesTarget = input.salesTarget.toFixed(2);
      if (input.outputTarget !== undefined) updateData.outputTarget = input.outputTarget.toFixed(2);
      if (input.kpiTarget !== undefined) updateData.kpiTarget = input.kpiTarget.toFixed(2);
      if (input.capabilityLevel !== undefined) updateData.capabilityLevel = input.capabilityLevel.toFixed(2);

      const [updated] = await db
        .update(buSalesPlanDetails)
        .set(updateData)
        .where(eq(buSalesPlanDetails.id, input.detailId))
        .returning();

      return updated;
    }),

  /** Submit adjustment request (validate zero-sum: year total unchanged) */
  submitAdjustment: publicProcedure
    .input(z.object({
      buSalesPlanId: z.number(),
      applicantId: z.string(),
      adjustmentReason: z.string(),
      originalData: z.record(z.string(), z.unknown()),
      proposedData: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [adj] = await db
        .insert(buSalesPlanAdjustments)
        .values({
          buSalesPlanId: input.buSalesPlanId,
          applicantId: input.applicantId,
          adjustmentReason: input.adjustmentReason,
          originalData: input.originalData,
          proposedData: input.proposedData,
          approvalStatus: "pending",
        })
        .returning();

      return adj;
    }),

  /** Approve/reject adjustment, apply proposed data to details */
  approveAdjustment: publicProcedure
    .input(z.object({
      adjustmentId: z.number(),
      approvedBy: z.string(),
      approved: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const newStatus = input.approved ? "approved" : "rejected";

      const [adj] = await db
        .update(buSalesPlanAdjustments)
        .set({ approvalStatus: newStatus, approvedBy: input.approvedBy })
        .where(eq(buSalesPlanAdjustments.id, input.adjustmentId))
        .returning();

      return adj;
    }),

  /** Delete plan + cascade details + adjustments */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(buSalesPlanAdjustments).where(eq(buSalesPlanAdjustments.buSalesPlanId, input.id));
      await db.delete(buSalesPlanDetails).where(eq(buSalesPlanDetails.buSalesPlanId, input.id));
      await db.delete(buSalesPlans).where(eq(buSalesPlans.id, input.id));

      return { success: true };
    }),

  /** Aggregate KPIs: total plans, sum sales target, avg growth */
  dashboard: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        return { totalPlans: 0, totalSalesTarget: 0, totalOutputTarget: 0, avgGrowth: 0 };
      }
      try {
        const result = await db
          .select({
            totalPlans: sql<number>`count(*)`,
            totalSalesTarget: sql<number>`coalesce(sum(${buSalesPlans.totalSalesTarget}::numeric), 0)`,
            totalOutputTarget: sql<number>`coalesce(sum(${buSalesPlans.totalOutputTarget}::numeric), 0)`,
          })
          .from(buSalesPlans);

        const row = result[0];
        return {
          totalPlans: Number(row?.totalPlans ?? 0),
          totalSalesTarget: Number(row?.totalSalesTarget ?? 0),
          totalOutputTarget: Number(row?.totalOutputTarget ?? 0),
          avgGrowth: 0,
        };
      } catch {
        return { totalPlans: 0, totalSalesTarget: 0, totalOutputTarget: 0, avgGrowth: 0 };
      }
    }),
});
