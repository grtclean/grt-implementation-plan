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
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, requireDb } from "../db";
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

// ── Auto-create tables if they don't exist ────────────────
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bu_sales_plans (
        id SERIAL PRIMARY KEY,
        year INTEGER NOT NULL,
        department_id VARCHAR(50) NOT NULL,
        total_sales_target DECIMAL(12,2),
        total_output_target DECIMAL(12,2),
        growth_rules JSONB,
        status VARCHAR(20) DEFAULT 'draft',
        submitted_by VARCHAR(50),
        submitted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bu_sales_plan_details (
        id SERIAL PRIMARY KEY,
        bu_sales_plan_id INTEGER NOT NULL REFERENCES bu_sales_plans(id),
        period_type VARCHAR(20),
        period_value INTEGER,
        sales_target DECIMAL(12,2),
        output_target DECIMAL(12,2),
        kpi_target DECIMAL(5,2),
        capability_level DECIMAL(4,2),
        is_adjusted BOOLEAN DEFAULT false
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bu_sales_plan_adjustments (
        id SERIAL PRIMARY KEY,
        bu_sales_plan_id INTEGER NOT NULL REFERENCES bu_sales_plans(id),
        applicant_id VARCHAR(50),
        adjustment_reason VARCHAR(500),
        adjustment_type VARCHAR(30) DEFAULT 'normal',
        exception_tag VARCHAR(50),
        original_data JSONB,
        proposed_data JSONB,
        approval_status VARCHAR(20) DEFAULT 'pending',
        approved_by VARCHAR(50),
        review_step VARCHAR(20) DEFAULT 'finance_pmo',
        finance_pmo_status VARCHAR(20),
        finance_pmo_reviewed_by VARCHAR(50),
        finance_pmo_reviewed_at TIMESTAMP,
        finance_pmo_comment VARCHAR(500),
        ceo_status VARCHAR(20),
        ceo_reviewed_by VARCHAR(50),
        ceo_reviewed_at TIMESTAMP,
        ceo_comment VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Add missing columns for existing tables (idempotent ALTER)
    const alterSafe = async (table: string, col: string, type: string) => {
      try {
        await db.execute(sql.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`));
      } catch { /* column already exists */ }
    };
    await alterSafe("bu_sales_plans", "submitted_by", "VARCHAR(50)");
    await alterSafe("bu_sales_plans", "submitted_at", "TIMESTAMP");
    await alterSafe("bu_sales_plan_adjustments", "adjustment_type", "VARCHAR(30) DEFAULT 'normal'");
    await alterSafe("bu_sales_plan_adjustments", "exception_tag", "VARCHAR(50)");
    await alterSafe("bu_sales_plan_adjustments", "review_step", "VARCHAR(20) DEFAULT 'finance_pmo'");
    await alterSafe("bu_sales_plan_adjustments", "finance_pmo_status", "VARCHAR(20)");
    await alterSafe("bu_sales_plan_adjustments", "finance_pmo_reviewed_by", "VARCHAR(50)");
    await alterSafe("bu_sales_plan_adjustments", "finance_pmo_reviewed_at", "TIMESTAMP");
    await alterSafe("bu_sales_plan_adjustments", "finance_pmo_comment", "VARCHAR(500)");
    await alterSafe("bu_sales_plan_adjustments", "ceo_status", "VARCHAR(20)");
    await alterSafe("bu_sales_plan_adjustments", "ceo_reviewed_by", "VARCHAR(50)");
    await alterSafe("bu_sales_plan_adjustments", "ceo_reviewed_at", "TIMESTAMP");
    await alterSafe("bu_sales_plan_adjustments", "ceo_comment", "VARCHAR(500)");
    // Indexes
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS bu_sales_plans_year_idx ON bu_sales_plans(year)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS bu_sales_plans_dept_idx ON bu_sales_plans(department_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS bu_sales_plan_details_plan_idx ON bu_sales_plan_details(bu_sales_plan_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS bu_sales_plan_adj_plan_idx ON bu_sales_plan_adjustments(bu_sales_plan_id)`);
    } catch { /* indexes exist */ }
    tablesEnsured = true;
    console.log("[BU Sales Target] Tables ensured");
  } catch (err) {
    console.warn("[BU Sales Target] ensureTables failed:", err);
  }
}

export const buSalesTargetRouter = router({
  /** List all BU sales plans, ordered by year desc */
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      await ensureTables();
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
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      await ensureTables();
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
  create: protectedProcedure
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
      await ensureTables();

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
  updateDetail: protectedProcedure
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
      await ensureTables();

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
  submitPlan: protectedProcedure
    .input(z.object({
      planId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await ensureTables();

      const [plan] = await db
        .update(buSalesPlans)
        .set({
          status: "submitted",
          submittedBy: ctx.user.name ?? `User#${ctx.user.id}`,
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
  submitAdjustment: protectedProcedure
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
      await ensureTables();

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
  financeReview: protectedProcedure
    .input(z.object({
      adjustmentId: z.number(),
      approved: z.boolean(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await ensureTables();

      const reviewerName = ctx.user.name ?? `User#${ctx.user.id}`;
      const finStatus = input.approved ? "approved" : "rejected";

      const updateData: Record<string, unknown> = {
        financePmoStatus: finStatus,
        financePmoReviewedBy: reviewerName,
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
  ceoReview: protectedProcedure
    .input(z.object({
      adjustmentId: z.number(),
      approved: z.boolean(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await ensureTables();

      const reviewerName = ctx.user.name ?? `User#${ctx.user.id}`;
      const ceoStatus = input.approved ? "approved" : "rejected";

      const [adj] = await db
        .update(buSalesPlanAdjustments)
        .set({
          ceoStatus,
          ceoReviewedBy: reviewerName,
          ceoReviewedAt: new Date().toISOString(),
          ceoComment: input.comment ?? null,
          approvalStatus: input.approved ? "approved" : "rejected",
          approvedBy: reviewerName,
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
  approveAdjustment: protectedProcedure
    .input(z.object({
      adjustmentId: z.number(),
      approved: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await ensureTables();

      const newStatus = input.approved ? "approved" : "rejected";
      const approverName = ctx.user.name ?? `User#${ctx.user.id}`;

      const [adj] = await db
        .update(buSalesPlanAdjustments)
        .set({ approvalStatus: newStatus, approvedBy: approverName })
        .where(eq(buSalesPlanAdjustments.id, input.adjustmentId))
        .returning();

      return adj;
    }),

  /** Delete plan + cascade details + adjustments */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await ensureTables();

      await db.delete(buSalesPlanAdjustments).where(eq(buSalesPlanAdjustments.buSalesPlanId, input.id));
      await db.delete(buSalesPlanDetails).where(eq(buSalesPlanDetails.buSalesPlanId, input.id));
      await db.delete(buSalesPlans).where(eq(buSalesPlans.id, input.id));

      return { success: true };
    }),

  /** Aggregate KPIs: total plans, sum sales target, avg growth */
  dashboard: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        return { totalPlans: 0, totalSalesTarget: 0, totalOutputTarget: 0, avgGrowth: 0, pendingApprovals: 0 };
      }
      await ensureTables();
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
  pendingReviews: protectedProcedure
    .input(z.object({
      step: z.enum(["finance_pmo", "ceo"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      await ensureTables();
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
