/**
 * BU Sales Target Planner Router — 事业部年度目标分解
 *
 * Provides CRUD for annual BU sales/output target plans with:
 *   - Auto-generated monthly breakdown using growth rules
 *   - Zero-sum validated adjustment submissions
 *   - 2-step approval: Finance/PMO初审 → CEO终审
 *   - Exception tagging (Spring Festival, equipment overhaul, etc.)
 *   - On CEO approval: proposed data → official baseline (isAdjusted=true)
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  buSalesPlans,
  buSalesPlanDetails,
  buSalesPlanAdjustments,
} from "../../drizzle/schema";

/** Per-detail proposed change in an adjustment */
const detailChangeSchema = z.object({
  detailId: z.number(),
  month: z.number(),
  salesTarget: z.number(),
  outputTarget: z.number(),
  kpiTarget: z.number().optional(),
  capabilityLevel: z.number().optional(),
});

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

  // ─── Phase 1: Two-Step Approval Workflow ─────────────────────

  /** Submit plan for approval: draft → submitted */
  submitPlan: publicProcedure
    .input(z.object({
      planId: z.number(),
      submittedBy: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [plan] = await db
        .update(buSalesPlans)
        .set({
          status: "submitted",
          submittedBy: input.submittedBy,
          submittedAt: new Date().toISOString(),
        })
        .where(eq(buSalesPlans.id, input.planId))
        .returning();

      return plan;
    }),

  /**
   * Submit adjustment with zero-sum validation & exception tagging.
   * originalDetails + proposedDetails must have same total salesTarget & outputTarget
   * unless adjustmentType === 'exception'.
   */
  submitAdjustment: publicProcedure
    .input(z.object({
      buSalesPlanId: z.number(),
      applicantId: z.string(),
      adjustmentReason: z.string(),
      adjustmentType: z.enum(["normal", "exception"]).default("normal"),
      exceptionTag: z.string().optional(),
      originalDetails: z.array(detailChangeSchema),
      proposedDetails: z.array(detailChangeSchema),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Zero-sum validation for normal adjustments
      if (input.adjustmentType === "normal") {
        const origSalesSum = input.originalDetails.reduce((s, d) => s + d.salesTarget, 0);
        const propSalesSum = input.proposedDetails.reduce((s, d) => s + d.salesTarget, 0);
        const origOutputSum = input.originalDetails.reduce((s, d) => s + d.outputTarget, 0);
        const propOutputSum = input.proposedDetails.reduce((s, d) => s + d.outputTarget, 0);

        const salesTolerance = Math.abs(origSalesSum - propSalesSum);
        const outputTolerance = Math.abs(origOutputSum - propOutputSum);

        if (salesTolerance > 0.01 || outputTolerance > 0.01) {
          throw new Error(
            `零和校验失败: 销售目标差额=${salesTolerance.toFixed(2)}, 产值目标差额=${outputTolerance.toFixed(2)}。` +
            `如需破例，请选择"例外调整"类型。`
          );
        }
      }

      const [adj] = await db
        .insert(buSalesPlanAdjustments)
        .values({
          buSalesPlanId: input.buSalesPlanId,
          applicantId: input.applicantId,
          adjustmentReason: input.adjustmentReason,
          adjustmentType: input.adjustmentType,
          exceptionTag: input.exceptionTag ?? null,
          originalData: { details: input.originalDetails },
          proposedData: { details: input.proposedDetails },
          approvalStatus: "pending",
          reviewStep: "finance_pmo",
        })
        .returning();

      // Update plan status to "submitted" if still draft
      await db
        .update(buSalesPlans)
        .set({ status: "submitted" })
        .where(
          and(
            eq(buSalesPlans.id, input.buSalesPlanId),
            sql`${buSalesPlans.status} = 'draft'`
          )
        );

      return adj;
    }),

  /** Finance/PMO first-step review */
  financeReview: publicProcedure
    .input(z.object({
      adjustmentId: z.number(),
      reviewerId: z.string(),
      approved: z.boolean(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const finStatus = input.approved ? "approved" : "rejected";

      const updateData: Record<string, unknown> = {
        financePmoStatus: finStatus,
        financePmoReviewedBy: input.reviewerId,
        financePmoReviewedAt: new Date().toISOString(),
        financePmoComment: input.comment ?? null,
      };

      if (input.approved) {
        // Move to CEO step
        updateData.reviewStep = "ceo";
        updateData.approvalStatus = "finance_approved";
      } else {
        // Rejected at finance level
        updateData.approvalStatus = "rejected";
      }

      const [adj] = await db
        .update(buSalesPlanAdjustments)
        .set(updateData)
        .where(eq(buSalesPlanAdjustments.id, input.adjustmentId))
        .returning();

      // If rejected, revert plan status to draft
      if (!input.approved && adj) {
        await db
          .update(buSalesPlans)
          .set({ status: "draft" })
          .where(eq(buSalesPlans.id, adj.buSalesPlanId));
      }

      return adj;
    }),

  /** CEO final review — on approval, apply proposed data to detail rows */
  ceoReview: publicProcedure
    .input(z.object({
      adjustmentId: z.number(),
      reviewerId: z.string(),
      approved: z.boolean(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const ceoStatus = input.approved ? "approved" : "rejected";

      const [adj] = await db
        .update(buSalesPlanAdjustments)
        .set({
          ceoStatus,
          ceoReviewedBy: input.reviewerId,
          ceoReviewedAt: new Date().toISOString(),
          ceoComment: input.comment ?? null,
          approvalStatus: input.approved ? "approved" : "rejected",
          approvedBy: input.reviewerId,
        })
        .where(eq(buSalesPlanAdjustments.id, input.adjustmentId))
        .returning();

      if (!adj) throw new Error("Adjustment not found");

      if (input.approved) {
        // Apply proposed data to detail rows — this becomes the official baseline
        const proposed = adj.proposedData as { details?: Array<{
          detailId: number;
          salesTarget: number;
          outputTarget: number;
          kpiTarget?: number;
          capabilityLevel?: number;
        }> } | null;

        if (proposed?.details && Array.isArray(proposed.details)) {
          for (const d of proposed.details) {
            const setData: Record<string, unknown> = {
              isAdjusted: true,
              salesTarget: d.salesTarget.toFixed(2),
              outputTarget: d.outputTarget.toFixed(2),
            };
            if (d.kpiTarget !== undefined) setData.kpiTarget = d.kpiTarget.toFixed(2);
            if (d.capabilityLevel !== undefined) setData.capabilityLevel = d.capabilityLevel.toFixed(2);

            await db
              .update(buSalesPlanDetails)
              .set(setData)
              .where(eq(buSalesPlanDetails.id, d.detailId));
          }
        }

        // Mark plan as approved — this is now the official 考核基线
        await db
          .update(buSalesPlans)
          .set({ status: "approved" })
          .where(eq(buSalesPlans.id, adj.buSalesPlanId));
      } else {
        // CEO rejected — revert plan to draft
        await db
          .update(buSalesPlans)
          .set({ status: "draft" })
          .where(eq(buSalesPlans.id, adj.buSalesPlanId));
      }

      return adj;
    }),

  /** Legacy approve shortcut — kept for backward compatibility */
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
        return { totalPlans: 0, totalSalesTarget: 0, totalOutputTarget: 0, avgGrowth: 0, pendingApprovals: 0 };
      }
      try {
        const result = await db
          .select({
            totalPlans: sql<number>`count(*)`,
            totalSalesTarget: sql<number>`coalesce(sum(${buSalesPlans.totalSalesTarget}::numeric), 0)`,
            totalOutputTarget: sql<number>`coalesce(sum(${buSalesPlans.totalOutputTarget}::numeric), 0)`,
          })
          .from(buSalesPlans);

        const pendingResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(buSalesPlanAdjustments)
          .where(sql`${buSalesPlanAdjustments.approvalStatus} IN ('pending', 'finance_approved')`);

        const row = result[0];
        return {
          totalPlans: Number(row?.totalPlans ?? 0),
          totalSalesTarget: Number(row?.totalSalesTarget ?? 0),
          totalOutputTarget: Number(row?.totalOutputTarget ?? 0),
          avgGrowth: 0,
          pendingApprovals: Number(pendingResult[0]?.count ?? 0),
        };
      } catch {
        return { totalPlans: 0, totalSalesTarget: 0, totalOutputTarget: 0, avgGrowth: 0, pendingApprovals: 0 };
      }
    }),

  /** List pending adjustments for review (Finance/PMO or CEO step) */
  pendingReviews: publicProcedure
    .input(z.object({
      step: z.enum(["finance_pmo", "ceo"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        let whereClause;
        if (input?.step === "finance_pmo") {
          whereClause = sql`${buSalesPlanAdjustments.approvalStatus} = 'pending' AND ${buSalesPlanAdjustments.reviewStep} = 'finance_pmo'`;
        } else if (input?.step === "ceo") {
          whereClause = sql`${buSalesPlanAdjustments.approvalStatus} = 'finance_approved' AND ${buSalesPlanAdjustments.reviewStep} = 'ceo'`;
        } else {
          whereClause = sql`${buSalesPlanAdjustments.approvalStatus} IN ('pending', 'finance_approved')`;
        }

        const items = await db
          .select()
          .from(buSalesPlanAdjustments)
          .where(whereClause)
          .orderBy(desc(buSalesPlanAdjustments.createdAt));

        return items;
      } catch {
        return [];
      }
    }),
});
