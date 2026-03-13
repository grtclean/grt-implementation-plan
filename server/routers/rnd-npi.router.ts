/**
 * R&D NPI/NPD Router — New Product Introduction & Development
 *
 * 6 sub-routers, 38 procedures (22 queries, 16 mutations)
 * Lifecycle: Concept → EVT → DVT → PVT → Mass Production
 *
 * Architecturally isolated from M0-M12 stage-gate pipeline.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  rndProjects,
  rndGateReviews,
  rndSandboxBoms,
  rndSandboxBomItems,
  rndBomSnapshots,
  rndTestRecords,
  rndTestSuites,
  rndAssemblyRoutings,
  rndRoutingSteps,
  rndActivityLog,
} from "../../drizzle/rnd-npi-schema";
import { bomMasters, bomItems } from "../../drizzle/bom-schema";
import { eq, desc, and, sql, count, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("rnd-npi");

const STAGES_ORDER = ["concept", "evt", "dvt", "pvt", "mass_production"] as const;

function stageIndex(stage: string): number {
  return STAGES_ORDER.indexOf(stage as typeof STAGES_ORDER[number]);
}

// ═══════════════════════════════════════════════════════════════
// 1. Project Sub-Router (8 procedures)
// ═══════════════════════════════════════════════════════════════

const projectRouter = router({
  list: requirePermission("rnd:npi:view")
    .input(
      z.object({
        category: z.string().optional(),
        stage: z.string().optional(),
        status: z.string().optional(),
        buCode: z.string().optional(),
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions: SQL[] = [];
      if (input?.category) conditions.push(eq(rndProjects.category, input.category as any));
      if (input?.stage) conditions.push(eq(rndProjects.currentStage, input.stage as any));
      if (input?.status) conditions.push(eq(rndProjects.status, input.status as any));
      if (input?.buCode) conditions.push(eq(rndProjects.buCode, input.buCode));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(rndProjects).where(whereClause);
      const total = Number(totalResult?.count ?? 0);
      const items = await db
        .select()
        .from(rndProjects)
        .where(whereClause)
        .orderBy(desc(rndProjects.createdAt))
        .limit(limit)
        .offset(offset);
      return { items, total };
    }),

  getById: requirePermission("rnd:npi:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [project] = await db
        .select()
        .from(rndProjects)
        .where(eq(rndProjects.id, input.id))
        .limit(1);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "R&D project not found" });
      return project;
    }),

  create: requirePermission("rnd:npi:manage")
    .input(
      z.object({
        name: z.string().min(1).max(300),
        nameEn: z.string().max(300).optional(),
        category: z.enum(["robotics", "vision_ai", "fluid_mechanics", "mechatronics", "software"]),
        description: z.string().optional(),
        budget: z.string().optional(),
        currency: z.string().max(10).optional(),
        buCode: z.string().max(50).optional(),
        riskLevel: z.string().max(20).optional(),
        ctoSignoffRequired: z.boolean().optional(),
        ceoSignoffRequired: z.boolean().optional(),
        plannedStartDate: z.string().optional(),
        plannedEndDate: z.string().optional(),
        targetSpecs: z.record(z.string(), z.unknown()).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const year = new Date().getFullYear();
      const [seqResult] = await db
        .select({ count: count() })
        .from(rndProjects)
        .where(sql`${rndProjects.projectCode} LIKE ${"RND-" + year + "-%"}`);
      const seq = Number(seqResult?.count ?? 0) + 1;
      const projectCode = `RND-${year}-${String(seq).padStart(3, "0")}`;
      // Sanitize empty strings → undefined for optional/numeric fields
      const clean = (v: string | undefined | null) => (v && v.trim() !== "" ? v.trim() : undefined);
      const [project] = await db
        .insert(rndProjects)
        .values({
          projectCode,
          name: input.name.trim(),
          nameEn: clean(input.nameEn),
          category: input.category,
          description: clean(input.description),
          budget: clean(input.budget),
          currency: clean(input.currency),
          buCode: clean(input.buCode),
          riskLevel: clean(input.riskLevel) ?? "medium",
          ctoSignoffRequired: input.ctoSignoffRequired,
          ceoSignoffRequired: input.ceoSignoffRequired,
          plannedStartDate: clean(input.plannedStartDate),
          plannedEndDate: clean(input.plannedEndDate),
          targetSpecs: input.targetSpecs,
          tags: input.tags,
          createdBy: ctx.user?.id,
        })
        .returning();
      log.info({ projectCode }, "R&D project created");
      await db.insert(rndActivityLog).values({
        entityType: "project",
        entityId: project.id,
        action: "created",
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        changeSummary: `Created R&D project ${projectCode}`,
        newValue: { projectCode, name: input.name, category: input.category },
      });
      return project;
    }),

  update: requirePermission("rnd:npi:manage")
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(300).optional(),
        nameEn: z.string().max(300).optional(),
        description: z.string().optional(),
        budget: z.string().optional(),
        riskLevel: z.string().max(20).optional(),
        completionPercent: z.number().min(0).max(100).optional(),
        targetSpecs: z.record(z.string(), z.unknown()).optional(),
        tags: z.array(z.string()).optional(),
        version: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { id, version, ...updates } = input;
      const [existing] = await db
        .select()
        .from(rndProjects)
        .where(eq(rndProjects.id, id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "R&D project not found" });
      if (existing.version !== version) {
        throw new TRPCError({ code: "CONFLICT", message: "Project was modified by another user" });
      }
      const [updated] = await db
        .update(rndProjects)
        .set({ ...updates, version: version + 1, updatedAt: new Date().toISOString() })
        .where(eq(rndProjects.id, id))
        .returning();
      return updated;
    }),

  advanceStage: requirePermission("rnd:npi:gate:approve")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [project] = await db
        .select()
        .from(rndProjects)
        .where(eq(rndProjects.id, input.id))
        .limit(1);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "R&D project not found" });
      const currentIdx = stageIndex(project.currentStage ?? "concept");
      if (currentIdx >= STAGES_ORDER.length - 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Project already at final stage" });
      }
      // Validate gate review approved for current stage
      const [latestReview] = await db
        .select()
        .from(rndGateReviews)
        .where(
          and(
            eq(rndGateReviews.rndProjectId, input.id),
            eq(rndGateReviews.gateStage, project.currentStage as any)
          )
        )
        .orderBy(desc(rndGateReviews.reviewRound))
        .limit(1);
      if (!latestReview || (latestReview.decision !== "approved" && latestReview.decision !== "conditional")) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Gate review must be approved or conditional before advancing",
        });
      }
      // CTO sign-off check
      if (project.ctoSignoffRequired && !latestReview.ctoApproved) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "CTO sign-off required" });
      }
      // CEO sign-off check
      if (project.ceoSignoffRequired && !latestReview.ceoApproved) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "CEO sign-off required" });
      }
      const nextStage = STAGES_ORDER[currentIdx + 1];
      const [updated] = await db
        .update(rndProjects)
        .set({
          currentStage: nextStage,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndProjects.id, input.id))
        .returning();
      await db.insert(rndActivityLog).values({
        entityType: "project",
        entityId: input.id,
        action: "stage_advanced",
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        changeSummary: `Advanced from ${project.currentStage} to ${nextStage}`,
        previousValue: { stage: project.currentStage },
        newValue: { stage: nextStage },
      });
      log.info({ projectId: input.id, from: project.currentStage, to: nextStage }, "Stage advanced");
      return updated;
    }),

  revertStage: requirePermission("rnd:npi:gate:approve")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [project] = await db
        .select()
        .from(rndProjects)
        .where(eq(rndProjects.id, input.id))
        .limit(1);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "R&D project not found" });
      const currentIdx = stageIndex(project.currentStage ?? "concept");
      if (currentIdx <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Project already at earliest stage" });
      }
      const prevStage = STAGES_ORDER[currentIdx - 1];
      const [updated] = await db
        .update(rndProjects)
        .set({ currentStage: prevStage, updatedAt: new Date().toISOString() })
        .where(eq(rndProjects.id, input.id))
        .returning();
      await db.insert(rndActivityLog).values({
        entityType: "project",
        entityId: input.id,
        action: "stage_reverted",
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        changeSummary: `Reverted from ${project.currentStage} to ${prevStage}`,
        previousValue: { stage: project.currentStage },
        newValue: { stage: prevStage },
      });
      return updated;
    }),

  linkParent: requirePermission("rnd:npi:manage")
    .input(
      z.object({
        id: z.number(),
        parentProjectId: z.number(),
        parentProjectCode: z.string().max(50),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(rndProjects)
        .set({
          parentProjectId: input.parentProjectId,
          parentProjectCode: input.parentProjectCode,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndProjects.id, input.id))
        .returning();
      return updated;
    }),

  getStageHistory: requirePermission("rnd:npi:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const history = await db
        .select()
        .from(rndActivityLog)
        .where(
          and(
            eq(rndActivityLog.entityType, "project"),
            eq(rndActivityLog.entityId, input.projectId),
            sql`${rndActivityLog.action} IN ('stage_advanced', 'stage_reverted', 'created')`
          )
        )
        .orderBy(desc(rndActivityLog.createdAt))
        .limit(100);
      return history;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 2. Gate Review Sub-Router (7 procedures)
// ═══════════════════════════════════════════════════════════════

const gateRouter = router({
  listByProject: requirePermission("rnd:npi:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const reviews = await db
        .select()
        .from(rndGateReviews)
        .where(eq(rndGateReviews.rndProjectId, input.projectId))
        .orderBy(desc(rndGateReviews.createdAt))
        .limit(200);
      return reviews;
    }),

  getById: requirePermission("rnd:npi:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [review] = await db
        .select()
        .from(rndGateReviews)
        .where(eq(rndGateReviews.id, input.id))
        .limit(1);
      if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Gate review not found" });
      return review;
    }),

  createReview: requirePermission("rnd:npi:gate:manage")
    .input(
      z.object({
        rndProjectId: z.number(),
        gateStage: z.enum(["concept", "evt", "dvt", "pvt", "mass_production"]),
        checklistJson: z.array(z.record(z.string(), z.unknown())).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Determine review round
      const [existingCount] = await db
        .select({ count: count() })
        .from(rndGateReviews)
        .where(
          and(
            eq(rndGateReviews.rndProjectId, input.rndProjectId),
            eq(rndGateReviews.gateStage, input.gateStage)
          )
        );
      const reviewRound = Number(existingCount?.count ?? 0) + 1;
      const checklistItems = input.checklistJson ?? [];
      const [review] = await db
        .insert(rndGateReviews)
        .values({
          rndProjectId: input.rndProjectId,
          gateStage: input.gateStage,
          reviewRound,
          checklistJson: checklistItems,
          checklistTotal: checklistItems.length,
          reviewerId: ctx.user?.id,
          reviewerName: ctx.user?.name,
        })
        .returning();
      return review;
    }),

  updateChecklist: requirePermission("rnd:npi:gate:manage")
    .input(
      z.object({
        id: z.number(),
        checklistJson: z.array(z.record(z.string(), z.unknown())),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const passed = input.checklistJson.filter(
        (item: Record<string, unknown>) => item.status === "passed"
      ).length;
      const [updated] = await db
        .update(rndGateReviews)
        .set({
          checklistJson: input.checklistJson,
          checklistPassed: passed,
          checklistTotal: input.checklistJson.length,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndGateReviews.id, input.id))
        .returning();
      return updated;
    }),

  submitDecision: requirePermission("rnd:npi:gate:approve")
    .input(
      z.object({
        id: z.number(),
        decision: z.enum(["approved", "conditional", "rejected", "deferred"]),
        overallScore: z.string().optional(),
        conditions: z.string().optional(),
        actionItems: z.array(z.record(z.string(), z.unknown())).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(rndGateReviews)
        .set({
          decision: input.decision,
          overallScore: input.overallScore,
          conditions: input.conditions,
          actionItems: input.actionItems,
          reviewerId: ctx.user?.id,
          reviewerName: ctx.user?.name,
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndGateReviews.id, input.id))
        .returning();
      log.info({ reviewId: input.id, decision: input.decision }, "Gate decision submitted");
      return updated;
    }),

  ctoSignoff: requirePermission("rnd:npi:gate:approve")
    .input(
      z.object({
        id: z.number(),
        approved: z.boolean(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(rndGateReviews)
        .set({
          ctoApproved: input.approved,
          ctoApprovedBy: ctx.user?.id,
          ctoApprovedAt: new Date().toISOString(),
          ctoComment: input.comment,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndGateReviews.id, input.id))
        .returning();
      log.info({ reviewId: input.id, approved: input.approved }, "CTO sign-off");
      return updated;
    }),

  ceoSignoff: requirePermission("rnd:npi:gate:approve")
    .input(
      z.object({
        id: z.number(),
        approved: z.boolean(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // CEO sign-off requires CTO first
      const [review] = await db
        .select()
        .from(rndGateReviews)
        .where(eq(rndGateReviews.id, input.id))
        .limit(1);
      if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Gate review not found" });
      if (!review.ctoApproved) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "CTO must sign off before CEO",
        });
      }
      const [updated] = await db
        .update(rndGateReviews)
        .set({
          ceoApproved: input.approved,
          ceoApprovedBy: ctx.user?.id,
          ceoApprovedAt: new Date().toISOString(),
          ceoComment: input.comment,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndGateReviews.id, input.id))
        .returning();
      log.info({ reviewId: input.id, approved: input.approved }, "CEO sign-off");
      return updated;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 3. Sandbox BOM Sub-Router (9 procedures)
// ═══════════════════════════════════════════════════════════════

const sandboxBomRouter = router({
  listByProject: requirePermission("rnd:npi:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const boms = await db
        .select()
        .from(rndSandboxBoms)
        .where(eq(rndSandboxBoms.rndProjectId, input.projectId))
        .orderBy(desc(rndSandboxBoms.createdAt))
        .limit(200);
      return boms;
    }),

  getById: requirePermission("rnd:npi:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [bom] = await db
        .select()
        .from(rndSandboxBoms)
        .where(eq(rndSandboxBoms.id, input.id))
        .limit(1);
      if (!bom) throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox BOM not found" });
      const items = await db
        .select()
        .from(rndSandboxBomItems)
        .where(eq(rndSandboxBomItems.sandboxBomId, input.id))
        .orderBy(rndSandboxBomItems.level, rndSandboxBomItems.sequence)
        .limit(1000);
      return { ...bom, items };
    }),

  create: requirePermission("rnd:npi:bom:manage")
    .input(
      z.object({
        rndProjectId: z.number(),
        bomCode: z.string().min(1).max(50),
        versionLabel: z.string().max(20).optional(),
        parentBomId: z.number().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const versionLabel = input.versionLabel ?? "v0.1";
      const vParts = versionLabel.replace("v", "").split(".");
      const [bom] = await db
        .insert(rndSandboxBoms)
        .values({
          rndProjectId: input.rndProjectId,
          bomCode: input.bomCode,
          versionLabel,
          versionMajor: parseInt(vParts[0] ?? "0", 10),
          versionMinor: parseInt(vParts[1] ?? "1", 10),
          parentBomId: input.parentBomId,
          description: input.description,
          createdBy: ctx.user?.id,
        })
        .returning();
      return bom;
    }),

  addItem: requirePermission("rnd:npi:bom:manage")
    .input(
      z.object({
        sandboxBomId: z.number(),
        parentItemId: z.number().optional(),
        level: z.number().default(1),
        sequence: z.number().default(10),
        partNumber: z.string().min(1).max(100),
        partName: z.string().min(1).max(300),
        componentSource: z.enum(["avl_approved", "prototype", "experimental", "3d_printed", "cots"]).optional(),
        quantity: z.string(),
        unit: z.string().max(20).optional(),
        unitCost: z.string().optional(),
        supplierName: z.string().max(200).optional(),
        leadTimeDays: z.number().optional(),
        isCriticalPath: z.boolean().optional(),
        requiresCustomTooling: z.boolean().optional(),
        avlMaterialCode: z.string().max(50).optional(),
        substitutes: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const qty = parseFloat(input.quantity);
      const unitCost = parseFloat(input.unitCost ?? "0");
      const extendedCost = (qty * unitCost).toFixed(2);
      const [item] = await db
        .insert(rndSandboxBomItems)
        .values({
          ...input,
          extendedCost,
        })
        .returning();
      // Update BOM stats
      const [stats] = await db
        .select({ count: count() })
        .from(rndSandboxBomItems)
        .where(eq(rndSandboxBomItems.sandboxBomId, input.sandboxBomId));
      await db
        .update(rndSandboxBoms)
        .set({
          totalComponents: Number(stats?.count ?? 0),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndSandboxBoms.id, input.sandboxBomId));
      return item;
    }),

  updateItem: requirePermission("rnd:npi:bom:manage")
    .input(
      z.object({
        id: z.number(),
        partName: z.string().max(300).optional(),
        componentSource: z.enum(["avl_approved", "prototype", "experimental", "3d_printed", "cots"]).optional(),
        quantity: z.string().optional(),
        unitCost: z.string().optional(),
        supplierName: z.string().max(200).optional(),
        leadTimeDays: z.number().optional(),
        isCriticalPath: z.boolean().optional(),
        requiresCustomTooling: z.boolean().optional(),
        avlMaterialCode: z.string().max(50).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const setData: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
      if (updates.quantity && updates.unitCost) {
        setData.extendedCost = (parseFloat(updates.quantity) * parseFloat(updates.unitCost)).toFixed(2);
      }
      const [updated] = await db
        .update(rndSandboxBomItems)
        .set(setData as any)
        .where(eq(rndSandboxBomItems.id, id))
        .returning();
      return updated;
    }),

  removeItem: requirePermission("rnd:npi:bom:manage")
    .input(z.object({ id: z.number(), sandboxBomId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(rndSandboxBomItems).where(eq(rndSandboxBomItems.id, input.id));
      // Update BOM stats
      const [stats] = await db
        .select({ count: count() })
        .from(rndSandboxBomItems)
        .where(eq(rndSandboxBomItems.sandboxBomId, input.sandboxBomId));
      await db
        .update(rndSandboxBoms)
        .set({
          totalComponents: Number(stats?.count ?? 0),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndSandboxBoms.id, input.sandboxBomId));
      return { success: true };
    }),

  freeze: requirePermission("rnd:npi:bom:freeze")
    .input(
      z.object({
        id: z.number(),
        gateStage: z.enum(["concept", "evt", "dvt", "pvt", "mass_production"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [bom] = await db
        .select()
        .from(rndSandboxBoms)
        .where(eq(rndSandboxBoms.id, input.id))
        .limit(1);
      if (!bom) throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox BOM not found" });
      if (bom.status === "frozen") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "BOM is already frozen" });
      }
      // Fetch items for snapshot
      const items = await db
        .select()
        .from(rndSandboxBomItems)
        .where(eq(rndSandboxBomItems.sandboxBomId, input.id))
        .limit(1000);
      const avlCount = items.filter((i) => i.componentSource === "avl_approved").length;
      const avlPercent = items.length > 0 ? ((avlCount / items.length) * 100).toFixed(2) : "0";
      // Freeze the BOM
      const [frozen] = await db
        .update(rndSandboxBoms)
        .set({
          status: "frozen",
          frozenAt: new Date().toISOString(),
          frozenBy: ctx.user?.id,
          frozenForGate: input.gateStage,
          avlApprovedCount: avlCount,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndSandboxBoms.id, input.id))
        .returning();
      // Create snapshot
      await db.insert(rndBomSnapshots).values({
        sandboxBomId: input.id,
        rndProjectId: bom.rndProjectId,
        snapshotReason: "gate_freeze",
        gateStage: input.gateStage,
        bomHeaderSnapshot: bom as any,
        bomItemsSnapshot: items as any,
        totalCost: bom.totalEstimatedCost,
        avlCompliancePercent: avlPercent,
        snapshotBy: ctx.user?.id,
        snapshotLabel: `Gate freeze: ${input.gateStage}`,
      });
      log.info({ bomId: input.id, gate: input.gateStage }, "BOM frozen for gate");
      return frozen;
    }),

  promote: requirePermission("rnd:npi:bom:promote")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [bom] = await db
        .select()
        .from(rndSandboxBoms)
        .where(eq(rndSandboxBoms.id, input.id))
        .limit(1);
      if (!bom) throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox BOM not found" });
      if (bom.status !== "frozen") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "BOM must be frozen before promotion" });
      }
      // Fetch source project
      const [project] = await db
        .select()
        .from(rndProjects)
        .where(eq(rndProjects.id, bom.rndProjectId))
        .limit(1);
      // Copy to production bomMasters
      const [master] = await db
        .insert(bomMasters)
        .values({
          productCode: bom.bomCode,
          productName: project?.name ?? bom.bomCode,
          bomType: "manufacturing",
          currentVersion: bom.versionLabel ?? "1.0",
          status: "active",
          buCode: project?.buCode,
        })
        .returning();
      // Copy items to production bomItems
      const sandboxItems = await db
        .select()
        .from(rndSandboxBomItems)
        .where(eq(rndSandboxBomItems.sandboxBomId, input.id))
        .limit(1000);
      if (sandboxItems.length > 0) {
        await db.insert(bomItems).values(
          sandboxItems.map((item) => ({
            bomMasterId: master.id,
            parentItemId: null,
            level: item.level ?? 1,
            sequence: item.sequence ?? 10,
            materialCode: item.partNumber,
            materialName: item.partName,
            quantity: item.quantity,
            unit: item.unit ?? "pcs",
            unitCost: item.unitCost,
          }))
        );
      }
      // Mark as promoted
      const [promoted] = await db
        .update(rndSandboxBoms)
        .set({
          status: "promoted",
          promotedToBomMasterId: master.id,
          promotedAt: new Date().toISOString(),
          promotedBy: ctx.user?.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndSandboxBoms.id, input.id))
        .returning();
      // Create pre-promotion snapshot
      await db.insert(rndBomSnapshots).values({
        sandboxBomId: input.id,
        rndProjectId: bom.rndProjectId,
        snapshotReason: "pre_promotion",
        bomHeaderSnapshot: bom as any,
        totalCost: bom.totalEstimatedCost,
        snapshotBy: ctx.user?.id,
        snapshotLabel: `Promoted to BOM Master #${master.id}`,
      });
      log.info({ bomId: input.id, masterId: master.id }, "BOM promoted to production");
      return { promoted, masterId: master.id };
    }),

  getSnapshots: requirePermission("rnd:npi:view")
    .input(z.object({ sandboxBomId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const snapshots = await db
        .select()
        .from(rndBomSnapshots)
        .where(eq(rndBomSnapshots.sandboxBomId, input.sandboxBomId))
        .orderBy(desc(rndBomSnapshots.createdAt))
        .limit(100);
      return snapshots;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 4. Testing Sub-Router (7 procedures)
// ═══════════════════════════════════════════════════════════════

const testingRouter = router({
  listByProject: requirePermission("rnd:npi:view")
    .input(
      z.object({
        projectId: z.number(),
        gateStage: z.string().optional(),
        testType: z.string().optional(),
        verdict: z.string().optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [eq(rndTestRecords.rndProjectId, input.projectId)];
      if (input.gateStage) conditions.push(eq(rndTestRecords.gateStage, input.gateStage as any));
      if (input.testType) conditions.push(eq(rndTestRecords.testType, input.testType as any));
      if (input.verdict) conditions.push(eq(rndTestRecords.verdict, input.verdict as any));
      const items = await db
        .select()
        .from(rndTestRecords)
        .where(and(...conditions))
        .orderBy(desc(rndTestRecords.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      const [totalResult] = await db
        .select({ count: count() })
        .from(rndTestRecords)
        .where(and(...conditions));
      return { items, total: Number(totalResult?.count ?? 0) };
    }),

  getById: requirePermission("rnd:npi:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [record] = await db
        .select()
        .from(rndTestRecords)
        .where(eq(rndTestRecords.id, input.id))
        .limit(1);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Test record not found" });
      return record;
    }),

  create: requirePermission("rnd:npi:test:manage")
    .input(
      z.object({
        rndProjectId: z.number(),
        gateStage: z.enum(["concept", "evt", "dvt", "pvt", "mass_production"]),
        testCode: z.string().min(1).max(50),
        testName: z.string().min(1).max(300),
        testType: z.enum(["unit_test", "integration_test", "stress_test", "environmental", "compliance", "performance"]),
        passCriteria: z.record(z.string(), z.unknown()).optional(),
        isMandatory: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [record] = await db
        .insert(rndTestRecords)
        .values({
          ...input,
          executedBy: ctx.user?.id,
        })
        .returning();
      return record;
    }),

  updateVerdict: requirePermission("rnd:npi:test:manage")
    .input(
      z.object({
        id: z.number(),
        testMetrics: z.record(z.string(), z.unknown()),
        verdict: z.enum(["pass", "fail", "conditional", "not_run"]).optional(),
        evidenceUrls: z.array(z.string()).optional(),
        environmentConditions: z.record(z.string(), z.unknown()).optional(),
        testEquipment: z.record(z.string(), z.unknown()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Fetch existing to auto-evaluate
      const [existing] = await db
        .select()
        .from(rndTestRecords)
        .where(eq(rndTestRecords.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Test record not found" });

      // Auto-evaluate verdict if passCriteria exists and no manual verdict given
      let computedVerdict = input.verdict;
      if (!computedVerdict && existing.passCriteria && input.testMetrics) {
        const criteria = existing.passCriteria as Record<string, { min?: number; max?: number; exact?: unknown }>;
        const metrics = input.testMetrics as Record<string, unknown>;
        let allPass = true;
        for (const [key, rule] of Object.entries(criteria)) {
          const val = metrics[key];
          if (val === undefined || val === null) { allPass = false; continue; }
          const numVal = typeof val === "number" ? val : parseFloat(String(val));
          if (isNaN(numVal)) { allPass = false; continue; }
          if (rule.min !== undefined && numVal < rule.min) allPass = false;
          if (rule.max !== undefined && numVal > rule.max) allPass = false;
          if (rule.exact !== undefined && val !== rule.exact) allPass = false;
        }
        computedVerdict = allPass ? "pass" : "fail";
      }

      const [updated] = await db
        .update(rndTestRecords)
        .set({
          testMetrics: input.testMetrics,
          verdict: computedVerdict ?? existing.verdict,
          evidenceUrls: input.evidenceUrls,
          environmentConditions: input.environmentConditions,
          testEquipment: input.testEquipment,
          notes: input.notes,
          executedBy: ctx.user?.id,
          executedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rndTestRecords.id, input.id))
        .returning();
      return updated;
    }),

  getVVMatrix: requirePermission("rnd:npi:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const records = await db
        .select()
        .from(rndTestRecords)
        .where(eq(rndTestRecords.rndProjectId, input.projectId))
        .limit(1000);
      // Build heatmap: stages × test types
      const matrix: Record<string, Record<string, { total: number; pass: number; fail: number; notRun: number }>> = {};
      for (const stage of STAGES_ORDER) {
        matrix[stage] = {};
        for (const type of ["unit_test", "integration_test", "stress_test", "environmental", "compliance", "performance"]) {
          matrix[stage][type] = { total: 0, pass: 0, fail: 0, notRun: 0 };
        }
      }
      for (const r of records) {
        const stage = r.gateStage ?? "concept";
        const type = r.testType ?? "unit_test";
        if (matrix[stage]?.[type]) {
          matrix[stage][type].total++;
          if (r.verdict === "pass") matrix[stage][type].pass++;
          else if (r.verdict === "fail") matrix[stage][type].fail++;
          else matrix[stage][type].notRun++;
        }
      }
      return matrix;
    }),

  createSuite: requirePermission("rnd:npi:test:manage")
    .input(
      z.object({
        rndProjectId: z.number(),
        suiteCode: z.string().min(1).max(50),
        suiteName: z.string().min(1).max(300),
        targetGate: z.enum(["concept", "evt", "dvt", "pvt", "mass_production"]).optional(),
        projectCategory: z.enum(["robotics", "vision_ai", "fluid_mechanics", "mechatronics", "software"]).optional(),
        testTemplates: z.array(z.record(z.string(), z.unknown())),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [suite] = await db
        .insert(rndTestSuites)
        .values({
          ...input,
          totalTests: input.testTemplates.length,
          createdBy: ctx.user?.id,
        })
        .returning();
      return suite;
    }),

  instantiateSuite: requirePermission("rnd:npi:test:manage")
    .input(
      z.object({
        suiteId: z.number(),
        gateStage: z.enum(["concept", "evt", "dvt", "pvt", "mass_production"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [suite] = await db
        .select()
        .from(rndTestSuites)
        .where(eq(rndTestSuites.id, input.suiteId))
        .limit(1);
      if (!suite) throw new TRPCError({ code: "NOT_FOUND", message: "Test suite not found" });
      const templates = (suite.testTemplates as Array<Record<string, unknown>>) ?? [];
      if (templates.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Suite has no test templates" });
      }
      const records = templates.map((t) => ({
        rndProjectId: suite.rndProjectId,
        gateStage: input.gateStage,
        testCode: String(t.testCode ?? ""),
        testName: String(t.testName ?? ""),
        testType: (t.testType as any) ?? "unit_test",
        passCriteria: t.passCriteria,
        isMandatory: Boolean(t.isMandatory),
        suiteId: suite.id,
        executedBy: ctx.user?.id,
      }));
      const created = await db.insert(rndTestRecords).values(records).returning();
      return { created: created.length, suiteId: suite.id };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 5. Routing Sub-Router (5 procedures)
// ═══════════════════════════════════════════════════════════════

const routingRouter = router({
  listByProject: requirePermission("rnd:npi:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const routings = await db
        .select()
        .from(rndAssemblyRoutings)
        .where(eq(rndAssemblyRoutings.rndProjectId, input.projectId))
        .orderBy(desc(rndAssemblyRoutings.createdAt))
        .limit(100);
      return routings;
    }),

  getById: requirePermission("rnd:npi:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [routing] = await db
        .select()
        .from(rndAssemblyRoutings)
        .where(eq(rndAssemblyRoutings.id, input.id))
        .limit(1);
      if (!routing) throw new TRPCError({ code: "NOT_FOUND", message: "Routing not found" });
      const steps = await db
        .select()
        .from(rndRoutingSteps)
        .where(eq(rndRoutingSteps.routingId, input.id))
        .orderBy(rndRoutingSteps.stepNumber)
        .limit(200);
      return { ...routing, steps };
    }),

  create: requirePermission("rnd:npi:routing:manage")
    .input(
      z.object({
        rndProjectId: z.number(),
        sandboxBomId: z.number().optional(),
        routingCode: z.string().min(1).max(50),
        version: z.string().max(20).optional(),
        routingName: z.string().max(300).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Validate project stage ≥ pvt
      const [project] = await db
        .select()
        .from(rndProjects)
        .where(eq(rndProjects.id, input.rndProjectId))
        .limit(1);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "R&D project not found" });
      const idx = stageIndex(project.currentStage ?? "concept");
      if (idx < stageIndex("pvt")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assembly routings can only be created at PVT stage or later",
        });
      }
      const [routing] = await db
        .insert(rndAssemblyRoutings)
        .values({
          ...input,
          activatedAtStage: project.currentStage as any,
          createdBy: ctx.user?.id,
        })
        .returning();
      return routing;
    }),

  addStep: requirePermission("rnd:npi:routing:manage")
    .input(
      z.object({
        routingId: z.number(),
        stepNumber: z.number(),
        stepType: z.enum(["assembly", "inspection", "eol_test", "packaging", "labeling"]),
        stepName: z.string().min(1).max(300),
        standardCycleTimeMinutes: z.string().optional(),
        workInstructions: z.record(z.string(), z.unknown()).optional(),
        toolsRequired: z.array(z.string()).optional(),
        inspectionCriteria: z.record(z.string(), z.unknown()).optional(),
        consumedBomItemIds: z.array(z.number()).optional(),
        workerSkillLevel: z.string().max(50).optional(),
        workerCount: z.number().optional(),
        predecessorStepId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [step] = await db
        .insert(rndRoutingSteps)
        .values(input)
        .returning();
      // Update total cycle time
      const allSteps = await db
        .select()
        .from(rndRoutingSteps)
        .where(eq(rndRoutingSteps.routingId, input.routingId))
        .limit(500);
      const totalTime = allSteps.reduce((sum, s) => sum + parseFloat(s.standardCycleTimeMinutes ?? "0"), 0);
      await db
        .update(rndAssemblyRoutings)
        .set({ totalCycleTimeMinutes: totalTime.toFixed(2), updatedAt: new Date().toISOString() })
        .where(eq(rndAssemblyRoutings.id, input.routingId));
      return step;
    }),

  updateStep: requirePermission("rnd:npi:routing:manage")
    .input(
      z.object({
        id: z.number(),
        stepName: z.string().max(300).optional(),
        standardCycleTimeMinutes: z.string().optional(),
        actualCycleTimeMinutes: z.string().optional(),
        workInstructions: z.record(z.string(), z.unknown()).optional(),
        toolsRequired: z.array(z.string()).optional(),
        inspectionCriteria: z.record(z.string(), z.unknown()).optional(),
        workerSkillLevel: z.string().max(50).optional(),
        workerCount: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const [updated] = await db
        .update(rndRoutingSteps)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(rndRoutingSteps.id, id))
        .returning();
      return updated;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 6. Analytics Sub-Router (2 procedures)
// ═══════════════════════════════════════════════════════════════

const analyticsRouter = router({
  portfolioDashboard: requirePermission("rnd:npi:view")
    .input(z.object({ buCode: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.buCode) conditions.push(eq(rndProjects.buCode, input.buCode));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const projects = await db
        .select()
        .from(rndProjects)
        .where(whereClause)
        .limit(500);

      // Aggregate by stage
      const byStage: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      for (const p of projects) {
        const stage = p.currentStage ?? "concept";
        const cat = p.category ?? "other";
        const status = p.status ?? "draft";
        byStage[stage] = (byStage[stage] ?? 0) + 1;
        byCategory[cat] = (byCategory[cat] ?? 0) + 1;
        byStatus[status] = (byStatus[status] ?? 0) + 1;
      }

      // Gate pass rates
      const reviews = await db
        .select()
        .from(rndGateReviews)
        .limit(1000);
      const totalReviews = reviews.length;
      const approvedReviews = reviews.filter((r) => r.decision === "approved").length;
      const gatePassRate = totalReviews > 0 ? ((approvedReviews / totalReviews) * 100).toFixed(1) : "0";

      return {
        totalProjects: projects.length,
        byStage,
        byCategory,
        byStatus,
        gatePassRate: parseFloat(gatePassRate),
        totalGateReviews: totalReviews,
      };
    }),

  projectHealthcard: requirePermission("rnd:npi:view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [project] = await db
        .select()
        .from(rndProjects)
        .where(eq(rndProjects.id, input.projectId))
        .limit(1);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "R&D project not found" });

      // BOM maturity
      const boms = await db
        .select()
        .from(rndSandboxBoms)
        .where(eq(rndSandboxBoms.rndProjectId, input.projectId))
        .limit(100);
      const frozenBoms = boms.filter((b) => b.status === "frozen" || b.status === "promoted").length;
      const bomMaturity = boms.length > 0 ? ((frozenBoms / boms.length) * 100).toFixed(1) : "0";

      // Test coverage
      const tests = await db
        .select()
        .from(rndTestRecords)
        .where(eq(rndTestRecords.rndProjectId, input.projectId))
        .limit(1000);
      const executedTests = tests.filter((t) => t.verdict !== "not_run").length;
      const passedTests = tests.filter((t) => t.verdict === "pass").length;
      const testCoverage = tests.length > 0 ? ((executedTests / tests.length) * 100).toFixed(1) : "0";
      const testPassRate = executedTests > 0 ? ((passedTests / executedTests) * 100).toFixed(1) : "0";

      // Gate reviews
      const reviews = await db
        .select()
        .from(rndGateReviews)
        .where(eq(rndGateReviews.rndProjectId, input.projectId))
        .limit(100);

      // Budget health
      const budgetUsed = project.budget && parseFloat(project.budget) > 0
        ? ((parseFloat(project.actualSpend ?? "0") / parseFloat(project.budget)) * 100).toFixed(1)
        : "0";

      return {
        project,
        bomCount: boms.length,
        bomMaturity: parseFloat(bomMaturity),
        totalTests: tests.length,
        executedTests,
        passedTests,
        testCoverage: parseFloat(testCoverage),
        testPassRate: parseFloat(testPassRate),
        gateReviews: reviews.length,
        budgetUsedPercent: parseFloat(budgetUsed),
      };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Main Router Export
// ═══════════════════════════════════════════════════════════════

export const rndNpiRouter = router({
  project: projectRouter,
  gate: gateRouter,
  sandboxBom: sandboxBomRouter,
  testing: testingRouter,
  routing: routingRouter,
  analytics: analyticsRouter,
});
