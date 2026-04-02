/**
 * Annual Goal Setting & Incentive Tracking Router
 *
 * 年度目标协定与激励追踪 — 7 sub-routers, ~38 procedures
 * 状态机: DRAFT → NEGOTIATION → SIGNED → ACTIVE → YEAR_END_REVIEW → FINALIZED → ARCHIVED
 */
import { z } from "zod";
import { eq, and, desc, sql, asc, inArray } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../permissions/middleware";
import { db } from "../db";
import {
  annualGoalAgreements,
  annualGoalDimensions,
  annualGoalCheckpoints,
  annualGoalAdjustments,
  annualGoalAuditLog,
  annualGoalMessages,
  annualIncentiveProjections,
} from "../../drizzle/annual-goal-incentive-schema";

// ── Helper: audit log ──
async function logAudit(agreementId: number, action: string, changedBy: number, changedByName: string, prev?: any, next?: any) {
  await db.insert(annualGoalAuditLog).values({
    agreementId,
    action,
    previousValue: prev ?? null,
    newValue: next ?? null,
    changedBy,
    changedByName,
  });
}

// ── Helper: calculate composite score from dimensions ──
function calculateCompositeScore(dimensions: Array<{ weight: string; currentScore: string }>) {
  let total = 0;
  for (const d of dimensions) {
    total += (parseFloat(d.weight) / 100) * parseFloat(d.currentScore || "0");
  }
  return Math.round(total * 100) / 100;
}

// ── Helper: determine performance level from score ──
function determinePerformanceLevel(score: number, levels: Array<{ code: string; bonusMonths: number }>) {
  // Assume levels sorted D < C < B < A; score 0-100
  // D: 0-39, C: 40-59, B: 60-79, A: 80-100 (configurable thresholds in future)
  if (score >= 80) return levels.find(l => l.code === "A") || levels[levels.length - 1];
  if (score >= 60) return levels.find(l => l.code === "B") || levels[2];
  if (score >= 40) return levels.find(l => l.code === "C") || levels[1];
  return levels.find(l => l.code === "D") || levels[0];
}

// ══════════════════════════════════════════════════════
// Sub-router 1: Agreements
// ══════════════════════════════════════════════════════
const agreementsRouter = router({
  list: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
      managerId: z.number().optional(),
      status: z.string().optional(),
      buCode: z.string().optional(),
      department: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const conditions: any[] = [];
      if (input.year) conditions.push(eq(annualGoalAgreements.year, input.year));
      if (input.managerId) conditions.push(eq(annualGoalAgreements.managerId, input.managerId));
      if (input.status) conditions.push(eq(annualGoalAgreements.status, input.status));
      if (input.buCode) conditions.push(eq(annualGoalAgreements.buCode, input.buCode));
      if (input.department) conditions.push(eq(annualGoalAgreements.department, input.department));

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db.select().from(annualGoalAgreements)
        .where(where)
        .orderBy(desc(annualGoalAgreements.updatedAt))
        .limit(input.limit)
        .offset(input.offset);

      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(annualGoalAgreements)
        .where(where);

      return { rows, total: Number(count) };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [agreement] = await db.select().from(annualGoalAgreements)
        .where(eq(annualGoalAgreements.id, input.id)).limit(1);
      if (!agreement) return null;

      const dimensions = await db.select().from(annualGoalDimensions)
        .where(eq(annualGoalDimensions.agreementId, input.id))
        .orderBy(asc(annualGoalDimensions.sortOrder));

      const checkpoints = await db.select().from(annualGoalCheckpoints)
        .where(eq(annualGoalCheckpoints.agreementId, input.id))
        .orderBy(asc(annualGoalCheckpoints.scheduledDate));

      const [latestProjection] = await db.select().from(annualIncentiveProjections)
        .where(eq(annualIncentiveProjections.agreementId, input.id))
        .orderBy(desc(annualIncentiveProjections.calculatedAt))
        .limit(1);

      return { ...agreement, dimensions, checkpoints, latestProjection: latestProjection ?? null };
    }),

  getByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.number(), year: z.number().optional() }))
    .query(async ({ input }) => {
      const year = input.year ?? new Date().getFullYear();
      const [agreement] = await db.select().from(annualGoalAgreements)
        .where(and(
          eq(annualGoalAgreements.employeeId, input.employeeId),
          eq(annualGoalAgreements.year, year),
        )).limit(1);
      return agreement ?? null;
    }),

  create: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({
      employeeId: z.number(),
      employeeName: z.string(),
      employeeOpenId: z.string().optional(),
      managerId: z.number(),
      managerName: z.string(),
      year: z.number(),
      baseSalaryGrade: z.string().optional(),
      baseSalarySnapshot: z.string().optional(),
      careerPathOptionJson: z.any().optional(),
      performanceLevelsJson: z.any().optional(),
      bonusCapMonths: z.string().optional(),
      deliverableDeadline: z.string().optional(),
      deliverableDescription: z.string().optional(),
      communicationChannel: z.string().optional(),
      department: z.string().optional(),
      buCode: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [created] = await db.insert(annualGoalAgreements).values({
        ...input,
        deliverableDeadline: input.deliverableDeadline ? new Date(input.deliverableDeadline) : undefined,
        performanceLevelsJson: input.performanceLevelsJson ?? undefined,
        status: "draft",
        createdBy: (ctx.user as any)?.id ?? input.managerId,
      }).returning();

      await logAudit(created.id, "created", input.managerId, input.managerName, null, { status: "draft" });
      return created;
    }),

  update: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({
      id: z.number(),
      baseSalaryGrade: z.string().optional(),
      baseSalarySnapshot: z.string().optional(),
      careerPathOptionJson: z.any().optional(),
      careerPathAccepted: z.boolean().optional(),
      performanceLevelsJson: z.any().optional(),
      bonusCapMonths: z.string().optional(),
      deliverableDeadline: z.string().optional(),
      deliverableDescription: z.string().optional(),
      communicationChannel: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, deliverableDeadline, ...rest } = input;
      const [updated] = await db.update(annualGoalAgreements)
        .set({
          ...rest,
          deliverableDeadline: deliverableDeadline ? new Date(deliverableDeadline) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(annualGoalAgreements.id, id))
        .returning();
      return updated;
    }),

  sign: protectedProcedure
    .input(z.object({
      id: z.number(),
      role: z.enum(["employee", "manager"]),
      signerName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const now = new Date();
      const setObj = input.role === "employee"
        ? { signedByEmployee: true, employeeSignedAt: now, updatedAt: now }
        : { signedByManager: true, managerSignedAt: now, updatedAt: now };

      const [updated] = await db.update(annualGoalAgreements)
        .set(setObj)
        .where(eq(annualGoalAgreements.id, input.id))
        .returning();

      // If both signed, auto-transition to "signed"
      if (updated.signedByEmployee && updated.signedByManager) {
        await db.update(annualGoalAgreements)
          .set({ status: "signed", updatedAt: now })
          .where(eq(annualGoalAgreements.id, input.id));
        await logAudit(input.id, "signed", 0, input.signerName, { status: updated.status }, { status: "signed" });
      } else {
        await logAudit(input.id, `signed_by_${input.role}`, 0, input.signerName);
      }

      return updated;
    }),

  activate: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({ id: z.number(), managerName: z.string() }))
    .mutation(async ({ input }) => {
      const [agreement] = await db.select().from(annualGoalAgreements)
        .where(eq(annualGoalAgreements.id, input.id)).limit(1);
      if (!agreement) throw new Error("Agreement not found");
      if (agreement.status !== "signed") throw new Error("Agreement must be signed before activation");

      // Auto-schedule quarterly checkpoints
      const year = agreement.year;
      const checkpointDefs = [
        { type: "Q1", date: new Date(year, 2, 31) },   // Mar 31
        { type: "mid_year", date: new Date(year, 5, 30) }, // Jun 30
        { type: "Q2", date: new Date(year, 5, 30) },
        { type: "Q3", date: new Date(year, 8, 30) },   // Sep 30
        { type: "Q4", date: new Date(year, 11, 31) },   // Dec 31
        { type: "year_end", date: new Date(year + 1, 0, 15) }, // Jan 15 next year
      ];

      for (const cp of checkpointDefs) {
        await db.insert(annualGoalCheckpoints).values({
          agreementId: input.id,
          checkpointType: cp.type,
          scheduledDate: cp.date,
          status: "scheduled",
        }).onConflictDoNothing();
      }

      const [updated] = await db.update(annualGoalAgreements)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(annualGoalAgreements.id, input.id))
        .returning();

      await logAudit(input.id, "status_changed", agreement.managerId, input.managerName,
        { status: "signed" }, { status: "active" });

      return updated;
    }),

  changeStatus: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({
      id: z.number(),
      newStatus: z.string(),
      changedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const [prev] = await db.select({ status: annualGoalAgreements.status })
        .from(annualGoalAgreements).where(eq(annualGoalAgreements.id, input.id)).limit(1);

      const [updated] = await db.update(annualGoalAgreements)
        .set({ status: input.newStatus, updatedAt: new Date() })
        .where(eq(annualGoalAgreements.id, input.id))
        .returning();

      await logAudit(input.id, "status_changed", 0, input.changedByName,
        { status: prev?.status }, { status: input.newStatus });
      return updated;
    }),
});

// ══════════════════════════════════════════════════════
// Sub-router 2: Dimensions
// ══════════════════════════════════════════════════════
const dimensionsRouter = router({
  list: protectedProcedure
    .input(z.object({ agreementId: z.number() }))
    .query(async ({ input }) => {
      return db.select().from(annualGoalDimensions)
        .where(eq(annualGoalDimensions.agreementId, input.agreementId))
        .orderBy(asc(annualGoalDimensions.sortOrder));
    }),

  upsert: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({
      id: z.number().optional(),
      agreementId: z.number(),
      dimensionName: z.string(),
      dimensionNameEn: z.string().optional(),
      dimensionCode: z.string(),
      weight: z.string(),
      description: z.string().optional(),
      kpiTargetsJson: z.any().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const [updated] = await db.update(annualGoalDimensions)
          .set({ ...rest, updatedAt: new Date() })
          .where(eq(annualGoalDimensions.id, id))
          .returning();
        return updated;
      }
      const [created] = await db.insert(annualGoalDimensions)
        .values(input)
        .returning();

      // Update total weight on agreement
      await recalcTotalWeight(input.agreementId);
      return created;
    }),

  remove: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({ id: z.number(), agreementId: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(annualGoalDimensions).where(eq(annualGoalDimensions.id, input.id));
      await recalcTotalWeight(input.agreementId);
      return { success: true };
    }),

  validateWeights: protectedProcedure
    .input(z.object({ agreementId: z.number() }))
    .query(async ({ input }) => {
      const dims = await db.select({ weight: annualGoalDimensions.weight })
        .from(annualGoalDimensions)
        .where(eq(annualGoalDimensions.agreementId, input.agreementId));
      const total = dims.reduce((s, d) => s + parseFloat(d.weight), 0);
      return { total: Math.round(total * 100) / 100, valid: Math.abs(total - 100) < 0.01 };
    }),
});

async function recalcTotalWeight(agreementId: number) {
  const dims = await db.select({ weight: annualGoalDimensions.weight })
    .from(annualGoalDimensions)
    .where(eq(annualGoalDimensions.agreementId, agreementId));
  const total = dims.reduce((s, d) => s + parseFloat(d.weight), 0);
  await db.update(annualGoalAgreements)
    .set({ totalWeightValidation: String(Math.round(total * 100) / 100) })
    .where(eq(annualGoalAgreements.id, agreementId));
}

// ══════════════════════════════════════════════════════
// Sub-router 3: Checkpoints
// ══════════════════════════════════════════════════════
const checkpointsRouter = router({
  listByAgreement: protectedProcedure
    .input(z.object({ agreementId: z.number() }))
    .query(async ({ input }) => {
      return db.select().from(annualGoalCheckpoints)
        .where(eq(annualGoalCheckpoints.agreementId, input.agreementId))
        .orderBy(asc(annualGoalCheckpoints.scheduledDate));
    }),

  startReview: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({ checkpointId: z.number() }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(annualGoalCheckpoints)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(annualGoalCheckpoints.id, input.checkpointId))
        .returning();
      return updated;
    }),

  submitScores: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({
      checkpointId: z.number(),
      agreementId: z.number(),
      dimensionScoresJson: z.any(),
      managerComments: z.string().optional(),
      employeeSelfAssessment: z.string().optional(),
      reviewedBy: z.number(),
      reviewedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const scores = input.dimensionScoresJson as Array<{ dimensionId: number; score: number; weight: number }>;

      // Update each dimension's currentScore
      for (const s of scores) {
        await db.update(annualGoalDimensions)
          .set({ currentScore: String(s.score), updatedAt: new Date() })
          .where(eq(annualGoalDimensions.id, s.dimensionId));
      }

      // Calculate composite score
      const dims = await db.select().from(annualGoalDimensions)
        .where(eq(annualGoalDimensions.agreementId, input.agreementId));
      const compositeScore = calculateCompositeScore(dims as any);

      // Determine performance level
      const [agreement] = await db.select().from(annualGoalAgreements)
        .where(eq(annualGoalAgreements.id, input.agreementId)).limit(1);
      const levels = (agreement.performanceLevelsJson as any) || [];
      const level = determinePerformanceLevel(compositeScore, levels);

      // Update checkpoint
      const [updated] = await db.update(annualGoalCheckpoints).set({
        dimensionScoresJson: input.dimensionScoresJson,
        managerComments: input.managerComments,
        employeeSelfAssessment: input.employeeSelfAssessment,
        overallScore: String(compositeScore),
        performanceLevelCode: level?.code,
        projectedBonusMonths: String(level?.bonusMonths ?? 0),
        reviewedBy: input.reviewedBy,
        reviewedByName: input.reviewedByName,
        status: "completed",
        actualDate: new Date(),
        updatedAt: new Date(),
      }).where(eq(annualGoalCheckpoints.id, input.checkpointId)).returning();

      // Update agreement projected bonus
      const careerMultiplier = agreement.careerPathAccepted ? 2 : 1;
      const projectedMonths = (level?.bonusMonths ?? 0) * careerMultiplier;
      await db.update(annualGoalAgreements).set({
        projectedBonusMonths: String(projectedMonths),
        updatedAt: new Date(),
      }).where(eq(annualGoalAgreements.id, input.agreementId));

      // Create incentive projection snapshot
      const baseSalary = parseFloat(agreement.baseSalarySnapshot || "0");
      await db.insert(annualIncentiveProjections).values({
        agreementId: input.agreementId,
        triggerType: "checkpoint",
        baseSalary: agreement.baseSalarySnapshot,
        compositeScore: String(compositeScore),
        performanceLevelCode: level?.code,
        bonusMonths: String(level?.bonusMonths ?? 0),
        careerMultiplier: String(careerMultiplier),
        projectedBonusAmount: String(baseSalary * (level?.bonusMonths ?? 0) * careerMultiplier),
        dimensionBreakdownJson: dims.map(d => ({
          dimension: d.dimensionName,
          weight: d.weight,
          score: d.currentScore,
          weightedScore: String((parseFloat(d.weight) / 100) * parseFloat(d.currentScore || "0")),
        })),
      });

      await logAudit(input.agreementId, "checkpoint_completed", input.reviewedBy, input.reviewedByName,
        null, { checkpointId: input.checkpointId, compositeScore, level: level?.code });

      return updated;
    }),

  getLatest: protectedProcedure
    .input(z.object({ agreementId: z.number() }))
    .query(async ({ input }) => {
      const [cp] = await db.select().from(annualGoalCheckpoints)
        .where(and(
          eq(annualGoalCheckpoints.agreementId, input.agreementId),
          eq(annualGoalCheckpoints.status, "completed"),
        ))
        .orderBy(desc(annualGoalCheckpoints.actualDate))
        .limit(1);
      return cp ?? null;
    }),
});

// ══════════════════════════════════════════════════════
// Sub-router 4: Adjustments
// ══════════════════════════════════════════════════════
const adjustmentsRouter = router({
  listByAgreement: protectedProcedure
    .input(z.object({ agreementId: z.number() }))
    .query(async ({ input }) => {
      return db.select().from(annualGoalAdjustments)
        .where(eq(annualGoalAdjustments.agreementId, input.agreementId))
        .orderBy(desc(annualGoalAdjustments.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      agreementId: z.number(),
      adjustmentType: z.string(),
      reason: z.string(),
      triggerEvent: z.string().optional(),
      proposedStateJson: z.any(),
      requestedBy: z.number(),
      requestedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Snapshot current state
      const dims = await db.select().from(annualGoalDimensions)
        .where(eq(annualGoalDimensions.agreementId, input.agreementId));
      const [agreement] = await db.select().from(annualGoalAgreements)
        .where(eq(annualGoalAgreements.id, input.agreementId)).limit(1);

      const previousState = {
        dimensions: dims,
        bonusCapMonths: agreement?.bonusCapMonths,
        careerPathAccepted: agreement?.careerPathAccepted,
        performanceLevelsJson: agreement?.performanceLevelsJson,
      };

      const [created] = await db.insert(annualGoalAdjustments).values({
        ...input,
        previousStateJson: previousState,
        status: "draft",
      }).returning();

      await logAudit(input.agreementId, "adjustment_created", input.requestedBy, input.requestedByName,
        null, { adjustmentId: created.id, type: input.adjustmentType });

      return created;
    }),

  submitForApproval: protectedProcedure
    .input(z.object({ adjustmentId: z.number() }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(annualGoalAdjustments)
        .set({ status: "pending_manager", updatedAt: new Date() })
        .where(eq(annualGoalAdjustments.id, input.adjustmentId))
        .returning();

      // Mark agreement as adjustment_pending
      if (updated) {
        await db.update(annualGoalAgreements)
          .set({ status: "adjustment_pending", updatedAt: new Date() })
          .where(eq(annualGoalAgreements.id, updated.agreementId));
      }
      return updated;
    }),

  approve: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({
      adjustmentId: z.number(),
      approvedBy: z.number(),
      approvedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const [adj] = await db.select().from(annualGoalAdjustments)
        .where(eq(annualGoalAdjustments.id, input.adjustmentId)).limit(1);
      if (!adj) throw new Error("Adjustment not found");

      // Apply proposed changes
      const proposed = adj.proposedStateJson as any;
      if (proposed?.dimensions) {
        // Delete old dimensions and insert new ones
        await db.delete(annualGoalDimensions)
          .where(eq(annualGoalDimensions.agreementId, adj.agreementId));
        for (const dim of proposed.dimensions) {
          await db.insert(annualGoalDimensions).values({
            agreementId: adj.agreementId,
            dimensionName: dim.dimensionName,
            dimensionNameEn: dim.dimensionNameEn,
            dimensionCode: dim.dimensionCode,
            weight: dim.weight,
            description: dim.description,
            kpiTargetsJson: dim.kpiTargetsJson,
            currentScore: dim.currentScore || "0.00",
            sortOrder: dim.sortOrder || 0,
          });
        }
        await recalcTotalWeight(adj.agreementId);
      }

      if (proposed?.bonusCapMonths || proposed?.careerPathAccepted !== undefined || proposed?.performanceLevelsJson) {
        const setObj: any = { updatedAt: new Date() };
        if (proposed.bonusCapMonths) setObj.bonusCapMonths = proposed.bonusCapMonths;
        if (proposed.careerPathAccepted !== undefined) setObj.careerPathAccepted = proposed.careerPathAccepted;
        if (proposed.performanceLevelsJson) setObj.performanceLevelsJson = proposed.performanceLevelsJson;
        await db.update(annualGoalAgreements).set(setObj)
          .where(eq(annualGoalAgreements.id, adj.agreementId));
      }

      // Update adjustment status
      const [updated] = await db.update(annualGoalAdjustments).set({
        status: "approved",
        approvedBy: input.approvedBy,
        approvedByName: input.approvedByName,
        approvedAt: new Date(),
        effectiveDate: new Date(),
        updatedAt: new Date(),
      }).where(eq(annualGoalAdjustments.id, input.adjustmentId)).returning();

      // Revert agreement to active
      await db.update(annualGoalAgreements)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(annualGoalAgreements.id, adj.agreementId));

      await logAudit(adj.agreementId, "adjustment_applied", input.approvedBy, input.approvedByName,
        adj.previousStateJson, adj.proposedStateJson);

      return updated;
    }),

  reject: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({
      adjustmentId: z.number(),
      rejectionReason: z.string(),
      rejectedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const [adj] = await db.select().from(annualGoalAdjustments)
        .where(eq(annualGoalAdjustments.id, input.adjustmentId)).limit(1);

      const [updated] = await db.update(annualGoalAdjustments).set({
        status: "rejected",
        rejectionReason: input.rejectionReason,
        updatedAt: new Date(),
      }).where(eq(annualGoalAdjustments.id, input.adjustmentId)).returning();

      // Revert agreement to active
      if (adj) {
        await db.update(annualGoalAgreements)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(annualGoalAgreements.id, adj.agreementId));
      }
      return updated;
    }),
});

// ══════════════════════════════════════════════════════
// Sub-router 5: Messages
// ══════════════════════════════════════════════════════
const messagesRouter = router({
  send: protectedProcedure
    .input(z.object({
      agreementId: z.number(),
      senderId: z.number(),
      senderName: z.string(),
      content: z.string(),
      messageType: z.string().optional(),
      attachments: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const [msg] = await db.insert(annualGoalMessages).values({
        agreementId: input.agreementId,
        senderId: input.senderId,
        senderName: input.senderName,
        content: input.content,
        messageType: input.messageType || "text",
        attachments: input.attachments,
      }).returning();
      return msg;
    }),

  listByAgreement: protectedProcedure
    .input(z.object({
      agreementId: z.number(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      return db.select().from(annualGoalMessages)
        .where(eq(annualGoalMessages.agreementId, input.agreementId))
        .orderBy(desc(annualGoalMessages.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  markRead: protectedProcedure
    .input(z.object({ messageIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await db.update(annualGoalMessages)
        .set({ isRead: true, readAt: new Date() })
        .where(inArray(annualGoalMessages.id, input.messageIds));
      return { success: true };
    }),

  getUnreadCount: protectedProcedure
    .input(z.object({ agreementId: z.number(), userId: z.number() }))
    .query(async ({ input }) => {
      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(annualGoalMessages)
        .where(and(
          eq(annualGoalMessages.agreementId, input.agreementId),
          eq(annualGoalMessages.isRead, false),
          sql`${annualGoalMessages.senderId} != ${input.userId}`,
        ));
      return { unread: Number(count) };
    }),
});

// ══════════════════════════════════════════════════════
// Sub-router 6: Incentive Calculation
// ══════════════════════════════════════════════════════
const incentiveCalcRouter = router({
  calculateProjection: protectedProcedure
    .input(z.object({ agreementId: z.number() }))
    .mutation(async ({ input }) => {
      const [agreement] = await db.select().from(annualGoalAgreements)
        .where(eq(annualGoalAgreements.id, input.agreementId)).limit(1);
      if (!agreement) throw new Error("Agreement not found");

      const dims = await db.select().from(annualGoalDimensions)
        .where(eq(annualGoalDimensions.agreementId, input.agreementId));

      const compositeScore = calculateCompositeScore(dims as any);
      const levels = (agreement.performanceLevelsJson as any) || [];
      const level = determinePerformanceLevel(compositeScore, levels);

      const careerMultiplier = agreement.careerPathAccepted ? 2 : 1;
      const baseSalary = parseFloat(agreement.baseSalarySnapshot || "0");
      const bonusMonths = level?.bonusMonths ?? 0;
      const salaryAdjPct = agreement.careerPathAccepted
        ? parseFloat((agreement.careerPathOptionJson as any)?.salaryDeltaPct || "20")
        : 0;

      const [projection] = await db.insert(annualIncentiveProjections).values({
        agreementId: input.agreementId,
        triggerType: "manual_recalc",
        baseSalary: agreement.baseSalarySnapshot,
        compositeScore: String(compositeScore),
        performanceLevelCode: level?.code,
        bonusMonths: String(bonusMonths),
        careerMultiplier: String(careerMultiplier),
        salaryAdjustmentPct: String(salaryAdjPct),
        projectedBonusAmount: String(baseSalary * bonusMonths * careerMultiplier),
        projectedNewSalary: String(baseSalary * (1 + salaryAdjPct / 100)),
        dimensionBreakdownJson: dims.map(d => ({
          dimension: d.dimensionName,
          weight: d.weight,
          score: d.currentScore,
          weightedScore: String((parseFloat(d.weight) / 100) * parseFloat(d.currentScore || "0")),
        })),
      }).returning();

      return projection;
    }),

  getProjectionHistory: protectedProcedure
    .input(z.object({ agreementId: z.number() }))
    .query(async ({ input }) => {
      return db.select().from(annualIncentiveProjections)
        .where(eq(annualIncentiveProjections.agreementId, input.agreementId))
        .orderBy(desc(annualIncentiveProjections.calculatedAt))
        .limit(20);
    }),

  getLatestProjection: protectedProcedure
    .input(z.object({ agreementId: z.number() }))
    .query(async ({ input }) => {
      const [p] = await db.select().from(annualIncentiveProjections)
        .where(eq(annualIncentiveProjections.agreementId, input.agreementId))
        .orderBy(desc(annualIncentiveProjections.calculatedAt))
        .limit(1);
      return p ?? null;
    }),

  simulateCareerPath: protectedProcedure
    .input(z.object({ agreementId: z.number(), acceptCareer: z.boolean() }))
    .query(async ({ input }) => {
      const [agreement] = await db.select().from(annualGoalAgreements)
        .where(eq(annualGoalAgreements.id, input.agreementId)).limit(1);
      if (!agreement) return null;

      const dims = await db.select().from(annualGoalDimensions)
        .where(eq(annualGoalDimensions.agreementId, input.agreementId));
      const compositeScore = calculateCompositeScore(dims as any);
      const levels = (agreement.performanceLevelsJson as any) || [];
      const level = determinePerformanceLevel(compositeScore, levels);

      const careerMultiplier = input.acceptCareer ? 2 : 1;
      const baseSalary = parseFloat(agreement.baseSalarySnapshot || "0");
      const bonusMonths = level?.bonusMonths ?? 0;
      const salaryAdjPct = input.acceptCareer
        ? parseFloat((agreement.careerPathOptionJson as any)?.salaryDeltaPct || "20")
        : 0;

      return {
        compositeScore,
        performanceLevel: level?.code,
        bonusMonths,
        careerMultiplier,
        baseSalary,
        projectedBonus: baseSalary * bonusMonths * careerMultiplier,
        projectedNewSalary: baseSalary * (1 + salaryAdjPct / 100),
        salaryAdjustmentPct: salaryAdjPct,
        bonusCapMonths: parseFloat(agreement.bonusCapMonths || "3") * careerMultiplier,
      };
    }),
});

// ══════════════════════════════════════════════════════
// Sub-router 7: Dashboard
// ══════════════════════════════════════════════════════
const dashboardRouter = router({
  managerSummary: protectedProcedure
    .input(z.object({ managerId: z.number(), year: z.number().optional() }))
    .query(async ({ input }) => {
      const year = input.year ?? new Date().getFullYear();
      const agreements = await db.select().from(annualGoalAgreements)
        .where(and(
          eq(annualGoalAgreements.managerId, input.managerId),
          eq(annualGoalAgreements.year, year),
        ))
        .orderBy(asc(annualGoalAgreements.employeeName))
        .limit(100);

      const statusCounts: Record<string, number> = {};
      let totalProjectedMonths = 0;
      for (const a of agreements) {
        statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        totalProjectedMonths += parseFloat(a.projectedBonusMonths || "0");
      }

      return {
        agreements,
        statusCounts,
        totalEmployees: agreements.length,
        avgProjectedMonths: agreements.length > 0 ? totalProjectedMonths / agreements.length : 0,
      };
    }),

  employeeSummary: protectedProcedure
    .input(z.object({ employeeId: z.number(), year: z.number().optional() }))
    .query(async ({ input }) => {
      const year = input.year ?? new Date().getFullYear();
      const [agreement] = await db.select().from(annualGoalAgreements)
        .where(and(
          eq(annualGoalAgreements.employeeId, input.employeeId),
          eq(annualGoalAgreements.year, year),
        )).limit(1);

      if (!agreement) return { agreement: null, dimensions: [], checkpoints: [], projection: null };

      const dimensions = await db.select().from(annualGoalDimensions)
        .where(eq(annualGoalDimensions.agreementId, agreement.id));
      const checkpoints = await db.select().from(annualGoalCheckpoints)
        .where(eq(annualGoalCheckpoints.agreementId, agreement.id))
        .orderBy(asc(annualGoalCheckpoints.scheduledDate));
      const [projection] = await db.select().from(annualIncentiveProjections)
        .where(eq(annualIncentiveProjections.agreementId, agreement.id))
        .orderBy(desc(annualIncentiveProjections.calculatedAt)).limit(1);

      return { agreement, dimensions, checkpoints, projection: projection ?? null };
    }),

  hrOrgOverview: protectedProcedure
    .use(requirePermission("hr:goal:manage"))
    .input(z.object({ year: z.number().optional(), buCode: z.string().optional() }))
    .query(async ({ input }) => {
      const year = input.year ?? new Date().getFullYear();
      const conditions = [eq(annualGoalAgreements.year, year)];
      if (input.buCode) conditions.push(eq(annualGoalAgreements.buCode, input.buCode));

      const all = await db.select().from(annualGoalAgreements)
        .where(and(...conditions)).limit(500);

      const byStatus: Record<string, number> = {};
      const byDept: Record<string, number> = {};
      let signed = 0, active = 0, finalized = 0;
      for (const a of all) {
        byStatus[a.status] = (byStatus[a.status] || 0) + 1;
        if (a.department) byDept[a.department] = (byDept[a.department] || 0) + 1;
        if (["signed", "active", "in_review", "year_end_review", "finalized", "archived"].includes(a.status)) signed++;
        if (["active", "in_review", "adjustment_pending"].includes(a.status)) active++;
        if (a.status === "finalized" || a.status === "archived") finalized++;
      }

      return {
        total: all.length,
        byStatus,
        byDept,
        signedRate: all.length > 0 ? signed / all.length : 0,
        activeRate: all.length > 0 ? active / all.length : 0,
        finalizedRate: all.length > 0 ? finalized / all.length : 0,
      };
    }),

  pendingActions: protectedProcedure
    .input(z.object({ userId: z.number(), year: z.number().optional() }))
    .query(async ({ input }) => {
      const year = input.year ?? new Date().getFullYear();

      // Pending signatures (as employee)
      const pendingSignEmployee = await db.select().from(annualGoalAgreements)
        .where(and(
          eq(annualGoalAgreements.employeeId, input.userId),
          eq(annualGoalAgreements.year, year),
          eq(annualGoalAgreements.signedByEmployee, false),
          inArray(annualGoalAgreements.status, ["draft", "negotiation"]),
        )).limit(20);

      // Pending signatures (as manager)
      const pendingSignManager = await db.select().from(annualGoalAgreements)
        .where(and(
          eq(annualGoalAgreements.managerId, input.userId),
          eq(annualGoalAgreements.year, year),
          eq(annualGoalAgreements.signedByManager, false),
          inArray(annualGoalAgreements.status, ["draft", "negotiation"]),
        )).limit(50);

      // Pending checkpoint reviews
      const pendingCheckpoints = await db.select({
        checkpoint: annualGoalCheckpoints,
        employeeName: annualGoalAgreements.employeeName,
      }).from(annualGoalCheckpoints)
        .innerJoin(annualGoalAgreements, eq(annualGoalCheckpoints.agreementId, annualGoalAgreements.id))
        .where(and(
          eq(annualGoalAgreements.managerId, input.userId),
          eq(annualGoalAgreements.year, year),
          eq(annualGoalCheckpoints.status, "scheduled"),
          sql`${annualGoalCheckpoints.scheduledDate} <= NOW() + INTERVAL '7 days'`,
        )).limit(20);

      // Pending adjustment approvals
      const pendingAdjustments = await db.select().from(annualGoalAdjustments)
        .where(eq(annualGoalAdjustments.status, "pending_manager"))
        .limit(20);

      return {
        pendingSignEmployee,
        pendingSignManager,
        pendingCheckpoints,
        pendingAdjustments,
        totalPending: pendingSignEmployee.length + pendingSignManager.length
          + pendingCheckpoints.length + pendingAdjustments.length,
      };
    }),
});

// ══════════════════════════════════════════════════════
// Main Router
// ══════════════════════════════════════════════════════
export const annualGoalIncentiveRouter = router({
  agreements: agreementsRouter,
  dimensions: dimensionsRouter,
  checkpoints: checkpointsRouter,
  adjustments: adjustmentsRouter,
  messages: messagesRouter,
  incentiveCalc: incentiveCalcRouter,
  dashboard: dashboardRouter,
});
