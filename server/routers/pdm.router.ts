/**
 * PDM Router — Product Data Management
 * 8 sub-routers, ~55 procedures
 *
 * product(7), baseline(6), eco(8), requirement(7),
 * readiness(4), asBuilt(4), fieldInsight(5), dashboard(6)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  pdmProducts,
  pdmBaselines,
  pdmEcoWorkflow,
  pdmRequirements,
  pdmReadinessChecks,
  pdmAsBuiltDeviations,
  pdmFieldInsights,
} from "../../drizzle/pdm-schema";
import { changeEvents } from "../../drizzle/schema";
import { eq, desc, and, sql, count, gte, lte, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import {
  captureBaseline as captureBaselineSvc,
  runReadinessChecks as runReadinessChecksSvc,
  detectFieldInsights as detectFieldInsightsSvc,
} from "../services/pdm.service";
import { createChangeEvent } from "../modules/changeEvent.service";

const log = createChildLogger("pdm");

// ════════════════════════════════════════════
// 1. Product sub-router (7 procedures)
// ════════════════════════════════════════════

const productRouter = router({
  list: requirePermission("rnd:pdm:view")
    .input(
      z
        .object({
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
          family: z.enum(["USC", "SPR", "IMM"]).optional(),
          status: z
            .enum(["concept", "design", "released", "production", "service", "eol"])
            .optional(),
          buCode: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { limit = 50, offset = 0, family, status, buCode, search } = input ?? {};
      const conditions: SQL[] = [];
      if (family) conditions.push(eq(pdmProducts.productFamily, family));
      if (status) conditions.push(eq(pdmProducts.lifecycleStatus, status));
      if (buCode) conditions.push(eq(pdmProducts.buCode, buCode));
      if (search) conditions.push(sql`${pdmProducts.productName} ILIKE ${"%" + search + "%"}`);

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db
        .select({ count: count() })
        .from(pdmProducts)
        .where(whereClause);
      const total = Number(totalResult?.count ?? 0);

      const items = await db
        .select()
        .from(pdmProducts)
        .where(whereClause)
        .orderBy(desc(pdmProducts.createdAt))
        .limit(limit)
        .offset(offset);

      return { items, total };
    }),

  getById: requirePermission("rnd:pdm:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .select()
        .from(pdmProducts)
        .where(eq(pdmProducts.id, input.id))
        .limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      return item;
    }),

  create: requirePermission("rnd:pdm:manage")
    .input(
      z.object({
        productCode: z.string().min(1).max(50),
        productName: z.string().min(1).max(200),
        productFamily: z.enum(["USC", "SPR", "IMM"]),
        productCategory: z.string().max(100).optional(),
        description: z.string().optional(),
        stationCount: z.number().min(0).default(0),
        buCode: z.string().max(50).optional(),
        standards: z.array(z.string()).optional(),
        customerSegments: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [inserted] = await db
        .insert(pdmProducts)
        .values({
          ...input,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();
      log.info({ productId: inserted.id, productCode: input.productCode }, "product created");
      return inserted;
    }),

  update: requirePermission("rnd:pdm:manage")
    .input(
      z.object({
        id: z.number(),
        productName: z.string().max(200).optional(),
        productCategory: z.string().max(100).optional(),
        description: z.string().optional(),
        stationCount: z.number().min(0).optional(),
        buCode: z.string().max(50).optional(),
        maturityLevel: z.number().min(0).max(100).optional(),
        standards: z.array(z.string()).optional(),
        customerSegments: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const [updated] = await db
        .update(pdmProducts)
        .set({ ...updates, updatedBy: ctx.user.id, updatedAt: new Date().toISOString() })
        .where(eq(pdmProducts.id, id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      return updated;
    }),

  updateStatus: requirePermission("rnd:pdm:manage")
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["concept", "design", "released", "production", "service", "eol"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(pdmProducts)
        .set({
          lifecycleStatus: input.status,
          updatedBy: ctx.user.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmProducts.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      log.info({ productId: input.id, status: input.status }, "product status updated");
      return updated;
    }),

  linkProject: requirePermission("rnd:pdm:manage")
    .input(z.object({ id: z.number(), projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(pdmProducts)
        .set({
          defaultProjectId: input.projectId,
          updatedBy: ctx.user.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmProducts.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      return updated;
    }),

  getStats: requirePermission("rnd:pdm:view").query(async () => {
    const db = await requireDb();
    const [total] = await db.select({ count: count() }).from(pdmProducts);
    const byFamily = await db
      .select({
        family: pdmProducts.productFamily,
        count: count(),
      })
      .from(pdmProducts)
      .groupBy(pdmProducts.productFamily)
      .limit(10);
    const byStatus = await db
      .select({
        status: pdmProducts.lifecycleStatus,
        count: count(),
      })
      .from(pdmProducts)
      .groupBy(pdmProducts.lifecycleStatus)
      .limit(10);
    return {
      total: Number(total?.count ?? 0),
      byFamily: byFamily.map((r) => ({ family: r.family, count: Number(r.count) })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
    };
  }),
});

// ════════════════════════════════════════════
// 2. Baseline sub-router (6 procedures)
// ════════════════════════════════════════════

const baselineRouter = router({
  list: requirePermission("rnd:pdm:view")
    .input(
      z
        .object({
          productId: z.number().optional(),
          projectId: z.number().optional(),
          status: z.enum(["draft", "approved", "superseded"]).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { productId, projectId, status, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (productId) conditions.push(eq(pdmBaselines.productId, productId));
      if (projectId) conditions.push(eq(pdmBaselines.projectId, projectId));
      if (status) conditions.push(eq(pdmBaselines.status, status));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(pdmBaselines).where(whereClause);
      const items = await db
        .select()
        .from(pdmBaselines)
        .where(whereClause)
        .orderBy(desc(pdmBaselines.createdAt))
        .limit(limit)
        .offset(offset);
      return { items, total: Number(totalResult?.count ?? 0) };
    }),

  getById: requirePermission("rnd:pdm:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .select()
        .from(pdmBaselines)
        .where(eq(pdmBaselines.id, input.id))
        .limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Baseline not found" });
      return item;
    }),

  create: requirePermission("rnd:pdm:baseline")
    .input(
      z.object({
        productId: z.number(),
        projectId: z.number(),
        gateStage: z.string().min(1).max(20),
        baselineName: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await captureBaselineSvc({
        ...input,
        createdBy: ctx.user.id,
      });
      return result;
    }),

  approve: requirePermission("rnd:pdm:approve")
    .input(z.object({ id: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Supersede previous approved baselines for same product
      const [baseline] = await db
        .select()
        .from(pdmBaselines)
        .where(eq(pdmBaselines.id, input.id))
        .limit(1);
      if (!baseline) throw new TRPCError({ code: "NOT_FOUND", message: "Baseline not found" });

      await db
        .update(pdmBaselines)
        .set({ status: "superseded", updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(pdmBaselines.productId, baseline.productId),
            eq(pdmBaselines.status, "approved")
          )
        );

      const [approved] = await db
        .update(pdmBaselines)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date().toISOString(),
          notes: input.notes ?? baseline.notes,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmBaselines.id, input.id))
        .returning();
      log.info({ baselineId: input.id }, "baseline approved");
      return approved;
    }),

  compare: requirePermission("rnd:pdm:view")
    .input(z.object({ baselineIdA: z.number(), baselineIdB: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [a] = await db.select().from(pdmBaselines).where(eq(pdmBaselines.id, input.baselineIdA)).limit(1);
      const [b] = await db.select().from(pdmBaselines).where(eq(pdmBaselines.id, input.baselineIdB)).limit(1);
      if (!a || !b) throw new TRPCError({ code: "NOT_FOUND", message: "Baseline not found" });

      return {
        baselineA: a,
        baselineB: b,
        diff: {
          bomVersionChanged: a.bomVersion !== b.bomVersion,
          plcVersionChanged: a.plcVersionTag !== b.plcVersionTag,
          stationCountA: Array.isArray(a.stationSnapshot) ? a.stationSnapshot.length : 0,
          stationCountB: Array.isArray(b.stationSnapshot) ? b.stationSnapshot.length : 0,
          plmDocCountA: Array.isArray(a.plmDocumentIds) ? a.plmDocumentIds.length : 0,
          plmDocCountB: Array.isArray(b.plmDocumentIds) ? b.plmDocumentIds.length : 0,
        },
      };
    }),

  getHistory: requirePermission("rnd:pdm:view")
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(pdmBaselines)
        .where(eq(pdmBaselines.productId, input.productId))
        .orderBy(desc(pdmBaselines.createdAt))
        .limit(100);
      return items;
    }),
});

// ════════════════════════════════════════════
// 3. ECO sub-router (8 procedures)
// ════════════════════════════════════════════

const ECO_STEPS = [
  "ecr_submit",
  "impact_analysis",
  "review",
  "approval",
  "execute",
  "verify",
  "close",
] as const;

const ecoRouter = router({
  submitEcr: requirePermission("rnd:eco:manage")
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().min(1).max(300),
        description: z.string().optional(),
        impactedBomIds: z.array(z.number()).optional(),
        impactedDocIds: z.array(z.number()).optional(),
        impactedStationIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Create change event (ECO)
      const { event } = await createChangeEvent({
        projectId: input.projectId,
        type: "design_change",
        title: input.title,
        description: input.description,
        createdBy: ctx.user.id,
      });

      // Create 7 workflow steps
      const steps = ECO_STEPS.map((stepType, idx) => ({
        ecoId: event.id,
        stepType: stepType as typeof ECO_STEPS[number],
        stepOrder: idx + 1,
        status: idx === 0 ? ("in_progress" as const) : ("pending" as const),
        assigneeId: idx === 0 ? ctx.user.id : null,
        assigneeName: idx === 0 ? (ctx.user.name ?? null) : null,
        impactedBomIds: input.impactedBomIds ?? null,
        impactedDocIds: input.impactedDocIds ?? null,
        impactedStationIds: input.impactedStationIds ?? null,
      }));

      await db.insert(pdmEcoWorkflow).values(steps);
      log.info({ ecoId: event.id, projectId: input.projectId }, "ECR submitted with 7 workflow steps");
      return { ecoId: event.id, stepsCreated: 7 };
    }),

  getWorkflow: requirePermission("rnd:pdm:view")
    .input(z.object({ ecoId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const steps = await db
        .select()
        .from(pdmEcoWorkflow)
        .where(eq(pdmEcoWorkflow.ecoId, input.ecoId))
        .orderBy(pdmEcoWorkflow.stepOrder)
        .limit(10);
      return steps;
    }),

  advanceStep: requirePermission("rnd:eco:manage")
    .input(
      z.object({
        stepId: z.number(),
        decision: z.string().max(50).optional(),
        decisionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [step] = await db
        .select()
        .from(pdmEcoWorkflow)
        .where(eq(pdmEcoWorkflow.id, input.stepId))
        .limit(1);
      if (!step) throw new TRPCError({ code: "NOT_FOUND", message: "Step not found" });

      // Complete current step
      await db
        .update(pdmEcoWorkflow)
        .set({
          status: "completed",
          decision: input.decision ?? "approved",
          decisionNotes: input.decisionNotes,
          completedAt: new Date().toISOString(),
          completedBy: ctx.user.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmEcoWorkflow.id, input.stepId));

      // Advance next step to in_progress
      const [nextStep] = await db
        .select()
        .from(pdmEcoWorkflow)
        .where(
          and(
            eq(pdmEcoWorkflow.ecoId, step.ecoId),
            eq(pdmEcoWorkflow.stepOrder, step.stepOrder + 1)
          )
        )
        .limit(1);

      if (nextStep) {
        await db
          .update(pdmEcoWorkflow)
          .set({ status: "in_progress", updatedAt: new Date().toISOString() })
          .where(eq(pdmEcoWorkflow.id, nextStep.id));
      }

      log.info({ stepId: input.stepId, ecoId: step.ecoId, nextStepId: nextStep?.id }, "ECO step advanced");
      return { completed: step.stepType, next: nextStep?.stepType ?? null };
    }),

  recordImpactAnalysis: requirePermission("rnd:eco:manage")
    .input(
      z.object({
        stepId: z.number(),
        costImpact: z
          .object({
            materialDelta: z.number().optional(),
            laborDelta: z.number().optional(),
            toolingDelta: z.number().optional(),
            totalDelta: z.number().optional(),
          })
          .optional(),
        productionImpact: z
          .object({
            delayDays: z.number().optional(),
            reworkNeeded: z.boolean().optional(),
            scrapEstimate: z.number().optional(),
          })
          .optional(),
        fieldRetrofitNeeded: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(pdmEcoWorkflow)
        .set({
          costImpact: input.costImpact ?? null,
          productionImpact: input.productionImpact ?? null,
          fieldRetrofitNeeded: input.fieldRetrofitNeeded ?? false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmEcoWorkflow.id, input.stepId))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Step not found" });
      return updated;
    }),

  approveEco: requirePermission("rnd:eco:approve")
    .input(
      z.object({
        ecoId: z.number(),
        approved: z.boolean(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Find approval step
      const [approvalStep] = await db
        .select()
        .from(pdmEcoWorkflow)
        .where(
          and(
            eq(pdmEcoWorkflow.ecoId, input.ecoId),
            eq(pdmEcoWorkflow.stepType, "approval")
          )
        )
        .limit(1);

      if (approvalStep) {
        await db
          .update(pdmEcoWorkflow)
          .set({
            status: "completed",
            decision: input.approved ? "approved" : "rejected",
            decisionNotes: input.notes,
            completedAt: new Date().toISOString(),
            completedBy: ctx.user.id,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(pdmEcoWorkflow.id, approvalStep.id));
      }

      // If approved, trigger change event cascade
      if (input.approved) {
        try {
          await createChangeEvent({
            projectId: 0, // will be filled from eco
            type: "bom_change",
            title: `ECO-${input.ecoId} BOM cascade`,
            description: input.notes,
            sourceChangeId: input.ecoId,
            createdBy: ctx.user.id,
          });
        } catch (err) {
          log.warn({ ecoId: input.ecoId, err }, "cascade event creation failed (non-blocking)");
        }
      }

      log.info({ ecoId: input.ecoId, approved: input.approved }, "ECO approval processed");
      return { ecoId: input.ecoId, approved: input.approved };
    }),

  executeEco: requirePermission("rnd:eco:manage")
    .input(z.object({ ecoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [execStep] = await db
        .select()
        .from(pdmEcoWorkflow)
        .where(
          and(
            eq(pdmEcoWorkflow.ecoId, input.ecoId),
            eq(pdmEcoWorkflow.stepType, "execute")
          )
        )
        .limit(1);

      if (execStep) {
        await db
          .update(pdmEcoWorkflow)
          .set({
            status: "completed",
            completedAt: new Date().toISOString(),
            completedBy: ctx.user.id,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(pdmEcoWorkflow.id, execStep.id));
      }

      return { ecoId: input.ecoId, executed: true };
    }),

  listPendingApprovals: requirePermission("rnd:pdm:view")
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 20;
      const items = await db
        .select()
        .from(pdmEcoWorkflow)
        .where(
          and(
            eq(pdmEcoWorkflow.stepType, "approval"),
            eq(pdmEcoWorkflow.status, "in_progress")
          )
        )
        .orderBy(desc(pdmEcoWorkflow.createdAt))
        .limit(limit);
      return items;
    }),

  getStats: requirePermission("rnd:pdm:view").query(async () => {
    const db = await requireDb();
    const [total] = await db.select({ count: count() }).from(pdmEcoWorkflow);
    const byStatus = await db
      .select({ status: pdmEcoWorkflow.status, count: count() })
      .from(pdmEcoWorkflow)
      .groupBy(pdmEcoWorkflow.status)
      .limit(10);
    return {
      totalSteps: Number(total?.count ?? 0),
      byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
    };
  }),
});

// ════════════════════════════════════════════
// 4. Requirement sub-router (7 procedures)
// ════════════════════════════════════════════

const requirementRouter = router({
  list: requirePermission("rnd:pdm:view")
    .input(
      z
        .object({
          projectId: z.number().optional(),
          productId: z.number().optional(),
          category: z.enum(["functional", "performance", "safety", "cleanliness", "regulatory"]).optional(),
          verificationStatus: z.enum(["not_started", "in_progress", "passed", "failed", "waived"]).optional(),
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId, productId, category, verificationStatus, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (projectId) conditions.push(eq(pdmRequirements.projectId, projectId));
      if (productId) conditions.push(eq(pdmRequirements.productId, productId));
      if (category) conditions.push(eq(pdmRequirements.category, category));
      if (verificationStatus) conditions.push(eq(pdmRequirements.verificationStatus, verificationStatus));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(pdmRequirements).where(whereClause);
      const items = await db
        .select()
        .from(pdmRequirements)
        .where(whereClause)
        .orderBy(desc(pdmRequirements.createdAt))
        .limit(limit)
        .offset(offset);
      return { items, total: Number(totalResult?.count ?? 0) };
    }),

  create: requirePermission("rnd:pdm:manage")
    .input(
      z.object({
        projectId: z.number(),
        productId: z.number().optional(),
        requirementCode: z.string().min(1).max(50),
        title: z.string().min(1).max(300),
        description: z.string().optional(),
        category: z.enum(["functional", "performance", "safety", "cleanliness", "regulatory"]),
        sourceType: z.string().max(50).optional(),
        sourceReference: z.string().max(200).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        verificationMethod: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [inserted] = await db
        .insert(pdmRequirements)
        .values({ ...input, createdBy: ctx.user.id })
        .returning();
      return inserted;
    }),

  update: requirePermission("rnd:pdm:manage")
    .input(
      z.object({
        id: z.number(),
        title: z.string().max(300).optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        verificationMethod: z.string().max(50).optional(),
        verificationStatus: z.enum(["not_started", "in_progress", "passed", "failed", "waived"]).optional(),
        verificationNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const [updated] = await db
        .update(pdmRequirements)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(pdmRequirements.id, id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Requirement not found" });
      return updated;
    }),

  linkDesign: requirePermission("rnd:pdm:manage")
    .input(
      z.object({
        id: z.number(),
        designStationIds: z.array(z.number()).optional(),
        bomItemIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(pdmRequirements)
        .set({
          designStationIds: input.designStationIds ?? null,
          bomItemIds: input.bomItemIds ?? null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmRequirements.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Requirement not found" });
      return updated;
    }),

  linkVerification: requirePermission("rnd:pdm:manage")
    .input(
      z.object({
        id: z.number(),
        verificationItemIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(pdmRequirements)
        .set({
          verificationItemIds: input.verificationItemIds,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmRequirements.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Requirement not found" });
      return updated;
    }),

  getMatrix: requirePermission("rnd:pdm:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(pdmRequirements)
        .where(eq(pdmRequirements.projectId, input.projectId))
        .orderBy(pdmRequirements.requirementCode)
        .limit(500);

      const matrix = items.map((r) => ({
        id: r.id,
        code: r.requirementCode,
        title: r.title,
        category: r.category,
        hasDesignLink: Array.isArray(r.designStationIds) && r.designStationIds.length > 0,
        hasBomLink: Array.isArray(r.bomItemIds) && r.bomItemIds.length > 0,
        hasVerification: Array.isArray(r.verificationItemIds) && r.verificationItemIds.length > 0,
        verificationStatus: r.verificationStatus,
      }));
      return matrix;
    }),

  getCoverage: requirePermission("rnd:pdm:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(pdmRequirements)
        .where(eq(pdmRequirements.projectId, input.projectId))
        .limit(500);

      const total = items.length;
      const withDesign = items.filter(
        (r) => Array.isArray(r.designStationIds) && r.designStationIds.length > 0
      ).length;
      const withVerification = items.filter(
        (r) => Array.isArray(r.verificationItemIds) && r.verificationItemIds.length > 0
      ).length;
      const passed = items.filter((r) => r.verificationStatus === "passed").length;

      return {
        total,
        designCoverage: total > 0 ? Math.round((withDesign / total) * 100) : 0,
        verificationCoverage: total > 0 ? Math.round((withVerification / total) * 100) : 0,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      };
    }),
});

// ════════════════════════════════════════════
// 5. Readiness sub-router (4 procedures)
// ════════════════════════════════════════════

const readinessRouter = router({
  runChecks: requirePermission("rnd:pdm:manage")
    .input(z.object({ projectId: z.number(), productId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const results = await runReadinessChecksSvc(input);
      const passedCount = results.filter((r) => r.passed).length;
      return {
        results,
        score: Math.round((passedCount / results.length) * 100),
        allPassed: passedCount === results.length,
      };
    }),

  getChecks: requirePermission("rnd:pdm:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(pdmReadinessChecks)
        .where(eq(pdmReadinessChecks.projectId, input.projectId))
        .orderBy(pdmReadinessChecks.checkType)
        .limit(20);
      return items;
    }),

  overrideCheck: requirePermission("rnd:pdm:approve")
    .input(
      z.object({
        id: z.number(),
        waiverReason: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(pdmReadinessChecks)
        .set({
          status: "waived",
          waiverApprovedBy: ctx.user.id,
          waiverReason: input.waiverReason,
          waivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmReadinessChecks.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Check not found" });
      log.info({ checkId: input.id }, "readiness check waived");
      return updated;
    }),

  getReadinessScore: requirePermission("rnd:pdm:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(pdmReadinessChecks)
        .where(eq(pdmReadinessChecks.projectId, input.projectId))
        .limit(20);

      const total = items.length;
      const passed = items.filter((i) => i.status === "passed" || i.status === "waived").length;
      return {
        score: total > 0 ? Math.round((passed / total) * 100) : 0,
        total,
        passed,
        failed: items.filter((i) => i.status === "failed").length,
        waived: items.filter((i) => i.status === "waived").length,
        notChecked: items.filter((i) => i.status === "not_checked").length,
      };
    }),
});

// ════════════════════════════════════════════
// 6. As-Built Deviation sub-router (4 procedures)
// ════════════════════════════════════════════

const asBuiltRouter = router({
  list: requirePermission("rnd:pdm:view")
    .input(
      z
        .object({
          projectId: z.number().optional(),
          baselineId: z.number().optional(),
          severity: z.enum(["minor", "major", "critical"]).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId, baselineId, severity, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (projectId) conditions.push(eq(pdmAsBuiltDeviations.projectId, projectId));
      if (baselineId) conditions.push(eq(pdmAsBuiltDeviations.baselineId, baselineId));
      if (severity) conditions.push(eq(pdmAsBuiltDeviations.severity, severity));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(pdmAsBuiltDeviations).where(whereClause);
      const items = await db
        .select()
        .from(pdmAsBuiltDeviations)
        .where(whereClause)
        .orderBy(desc(pdmAsBuiltDeviations.createdAt))
        .limit(limit)
        .offset(offset);
      return { items, total: Number(totalResult?.count ?? 0) };
    }),

  create: requirePermission("mfg:pdm:manage")
    .input(
      z.object({
        projectId: z.number(),
        productId: z.number().optional(),
        baselineId: z.number().optional(),
        stationCode: z.string().max(20).optional(),
        deviationType: z.enum(["material_substitution", "process_change", "quantity_change"]),
        severity: z.enum(["minor", "major", "critical"]).default("minor"),
        componentCode: z.string().max(50).optional(),
        componentName: z.string().max(200).optional(),
        designedValue: z.string().optional(),
        actualValue: z.string().optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [inserted] = await db
        .insert(pdmAsBuiltDeviations)
        .values({ ...input, createdBy: ctx.user.id })
        .returning();
      log.info({ deviationId: inserted.id, type: input.deviationType }, "as-built deviation created");
      return inserted;
    }),

  approve: requirePermission("mfg:pdm:approve")
    .input(
      z.object({
        id: z.number(),
        approved: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(pdmAsBuiltDeviations)
        .set({
          approvalStatus: input.approved ? "approved" : "rejected",
          approvedBy: ctx.user.id,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmAsBuiltDeviations.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Deviation not found" });
      return updated;
    }),

  compareToBaseline: requirePermission("rnd:pdm:view")
    .input(z.object({ projectId: z.number(), baselineId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const deviations = await db
        .select()
        .from(pdmAsBuiltDeviations)
        .where(
          and(
            eq(pdmAsBuiltDeviations.projectId, input.projectId),
            eq(pdmAsBuiltDeviations.baselineId, input.baselineId)
          )
        )
        .orderBy(desc(pdmAsBuiltDeviations.severity))
        .limit(200);

      const summary = {
        total: deviations.length,
        critical: deviations.filter((d) => d.severity === "critical").length,
        major: deviations.filter((d) => d.severity === "major").length,
        minor: deviations.filter((d) => d.severity === "minor").length,
        approved: deviations.filter((d) => d.approvalStatus === "approved").length,
        pending: deviations.filter((d) => d.approvalStatus === "pending").length,
      };
      return { deviations, summary };
    }),
});

// ════════════════════════════════════════════
// 7. Field Insight sub-router (5 procedures)
// ════════════════════════════════════════════

const fieldInsightRouter = router({
  list: requirePermission("service:pdm:view")
    .input(
      z
        .object({
          productId: z.number().optional(),
          status: z.enum(["open", "investigating", "eco_created", "resolved", "dismissed"]).optional(),
          insightType: z.enum(["recurring_failure", "design_weakness", "improvement_opportunity"]).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { productId, status, insightType, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (productId) conditions.push(eq(pdmFieldInsights.productId, productId));
      if (status) conditions.push(eq(pdmFieldInsights.status, status));
      if (insightType) conditions.push(eq(pdmFieldInsights.insightType, insightType));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(pdmFieldInsights).where(whereClause);
      const items = await db
        .select()
        .from(pdmFieldInsights)
        .where(whereClause)
        .orderBy(desc(pdmFieldInsights.severityScore))
        .limit(limit)
        .offset(offset);
      return { items, total: Number(totalResult?.count ?? 0) };
    }),

  create: requirePermission("service:pdm:manage")
    .input(
      z.object({
        productId: z.number(),
        projectId: z.number().optional(),
        insightType: z.enum(["recurring_failure", "design_weakness", "improvement_opportunity"]),
        title: z.string().min(1).max(300),
        description: z.string().optional(),
        affectedStationTypes: z.array(z.string()).optional(),
        sourceServiceLogIds: z.array(z.number()).optional(),
        occurrenceCount: z.number().min(1).default(1),
        severityScore: z.number().min(1).max(10).default(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [inserted] = await db
        .insert(pdmFieldInsights)
        .values({ ...input, createdBy: ctx.user.id })
        .returning();
      log.info({ insightId: inserted.id, type: input.insightType }, "field insight created");
      return inserted;
    }),

  autoDetect: requirePermission("service:pdm:manage")
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await detectFieldInsightsSvc({
        productId: input.productId,
        createdBy: ctx.user.id,
      });
      return result;
    }),

  createEcoFromInsight: requirePermission("rnd:eco:manage")
    .input(z.object({ insightId: z.number(), projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [insight] = await db
        .select()
        .from(pdmFieldInsights)
        .where(eq(pdmFieldInsights.id, input.insightId))
        .limit(1);
      if (!insight) throw new TRPCError({ code: "NOT_FOUND", message: "Insight not found" });

      const { event } = await createChangeEvent({
        projectId: input.projectId,
        type: "design_change",
        title: `Field Insight: ${insight.title}`,
        description: insight.description ?? undefined,
        createdBy: ctx.user.id,
      });

      await db
        .update(pdmFieldInsights)
        .set({
          status: "eco_created",
          suggestedEcoId: event.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmFieldInsights.id, input.insightId));

      log.info({ insightId: input.insightId, ecoId: event.id }, "ECO created from field insight");
      return { insightId: input.insightId, ecoId: event.id };
    }),

  resolve: requirePermission("service:pdm:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(pdmFieldInsights)
        .set({
          status: "resolved",
          resolvedAt: new Date().toISOString(),
          resolvedBy: ctx.user.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pdmFieldInsights.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Insight not found" });
      return updated;
    }),
});

// ════════════════════════════════════════════
// 8. Dashboard sub-router (6 procedures)
// ════════════════════════════════════════════

const dashboardRouter = router({
  getOverview: requirePermission("rnd:pdm:dashboard").query(async () => {
    const db = await requireDb();
    const [productCount] = await db.select({ count: count() }).from(pdmProducts);
    const [baselineCount] = await db.select({ count: count() }).from(pdmBaselines);
    const [ecoStepCount] = await db.select({ count: count() }).from(pdmEcoWorkflow);
    const [requirementCount] = await db.select({ count: count() }).from(pdmRequirements);
    const [deviationCount] = await db.select({ count: count() }).from(pdmAsBuiltDeviations);
    const [insightCount] = await db.select({ count: count() }).from(pdmFieldInsights);

    const productsByStatus = await db
      .select({ status: pdmProducts.lifecycleStatus, count: count() })
      .from(pdmProducts)
      .groupBy(pdmProducts.lifecycleStatus)
      .limit(10);

    return {
      products: Number(productCount?.count ?? 0),
      baselines: Number(baselineCount?.count ?? 0),
      ecoSteps: Number(ecoStepCount?.count ?? 0),
      requirements: Number(requirementCount?.count ?? 0),
      deviations: Number(deviationCount?.count ?? 0),
      fieldInsights: Number(insightCount?.count ?? 0),
      productsByStatus: productsByStatus.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
    };
  }),

  getProductHealth: requirePermission("rnd:pdm:dashboard")
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [product] = await db
        .select()
        .from(pdmProducts)
        .where(eq(pdmProducts.id, input.productId))
        .limit(1);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });

      const [baselineCount] = await db
        .select({ count: count() })
        .from(pdmBaselines)
        .where(eq(pdmBaselines.productId, input.productId));
      const [deviationCount] = await db
        .select({ count: count() })
        .from(pdmAsBuiltDeviations)
        .where(eq(pdmAsBuiltDeviations.productId, input.productId));
      const [insightCount] = await db
        .select({ count: count() })
        .from(pdmFieldInsights)
        .where(eq(pdmFieldInsights.productId, input.productId));

      return {
        product,
        baselines: Number(baselineCount?.count ?? 0),
        deviations: Number(deviationCount?.count ?? 0),
        fieldInsights: Number(insightCount?.count ?? 0),
        maturityLevel: product.maturityLevel ?? 0,
      };
    }),

  getEcoTimeline: requirePermission("rnd:pdm:dashboard")
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const items = await db
        .select()
        .from(pdmEcoWorkflow)
        .where(eq(pdmEcoWorkflow.status, "completed"))
        .orderBy(desc(pdmEcoWorkflow.completedAt))
        .limit(limit);
      return items;
    }),

  getTraceabilityGaps: requirePermission("rnd:pdm:dashboard")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const reqs = await db
        .select()
        .from(pdmRequirements)
        .where(eq(pdmRequirements.projectId, input.projectId))
        .limit(500);

      const gaps = {
        noDesignLink: reqs.filter(
          (r) => !Array.isArray(r.designStationIds) || r.designStationIds.length === 0
        ).length,
        noVerification: reqs.filter(
          (r) => !Array.isArray(r.verificationItemIds) || r.verificationItemIds.length === 0
        ).length,
        failedVerification: reqs.filter((r) => r.verificationStatus === "failed").length,
        notStarted: reqs.filter((r) => r.verificationStatus === "not_started").length,
        total: reqs.length,
      };
      return gaps;
    }),

  getReadinessSummary: requirePermission("rnd:pdm:dashboard").query(async () => {
    const db = await requireDb();
    const items = await db
      .select({
        checkType: pdmReadinessChecks.checkType,
        status: pdmReadinessChecks.status,
        count: count(),
      })
      .from(pdmReadinessChecks)
      .groupBy(pdmReadinessChecks.checkType, pdmReadinessChecks.status)
      .limit(100);
    return items.map((r) => ({
      checkType: r.checkType,
      status: r.status,
      count: Number(r.count),
    }));
  }),

  getFieldFeedbackTrend: requirePermission("rnd:pdm:dashboard")
    .input(z.object({ productId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.productId) conditions.push(eq(pdmFieldInsights.productId, input.productId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const byType = await db
        .select({
          insightType: pdmFieldInsights.insightType,
          count: count(),
        })
        .from(pdmFieldInsights)
        .where(whereClause)
        .groupBy(pdmFieldInsights.insightType)
        .limit(10);

      const byStatus = await db
        .select({
          status: pdmFieldInsights.status,
          count: count(),
        })
        .from(pdmFieldInsights)
        .where(whereClause)
        .groupBy(pdmFieldInsights.status)
        .limit(10);

      return {
        byType: byType.map((r) => ({ type: r.insightType, count: Number(r.count) })),
        byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      };
    }),
});

// ════════════════════════════════════════════
// Export combined router
// ════════════════════════════════════════════

export const pdmRouter = router({
  product: productRouter,
  baseline: baselineRouter,
  eco: ecoRouter,
  requirement: requirementRouter,
  readiness: readinessRouter,
  asBuilt: asBuiltRouter,
  fieldInsight: fieldInsightRouter,
  dashboard: dashboardRouter,
});
