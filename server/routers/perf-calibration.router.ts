/**
 * Performance Calibration Router — 智能绩效校准与激励路由
 *
 * 9 sub-routers, ~45 procedures:
 *   weightConfig (5): list, getDefault, upsert, delete, preview
 *   compositeScore (7): calculate, calculateBatch, getByEmployee, listByDepartment,
 *                        getDistribution, checkDistribution, export
 *   feedback360 (7): requestFeedback, submit, getMyPending, getForEmployee,
 *                     getAggregated, listByPeriod, generateQuestionnaire
 *   forcedDistribution (4): getConfig, upsert, simulate, listViolations
 *   calibration (8): createSession, getSession, listSessions, startSession,
 *                     recordAdjustment, undoAdjustment, completeSession, lockSession
 *   manualOverride (4): override, batchOverride, getOverrideHistory, revert
 *   incentive (5): listCatalog, upsertCatalogItem, awardIncentive, listEmployeeIncentives,
 *                   getIncentiveSummary
 *   dashboard (2): ceoCockpit, aiRecommendations
 *   pipeline (3): getReadinessReport, prepareMonthlySalary, getKpiAlignment
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, count, sql, avg, isNull } from "drizzle-orm";
import {
  perfScoringWeightConfigs,
  perfCompositeScores,
  perf360Feedback,
  perfForcedDistributionConfigs,
  perfCalibrationSessions,
  perfCalibrationAdjustments,
  perfIncentiveCatalog,
} from "../../drizzle/perf-calibration-schema";
import { payrollExcellenceAwards } from "../../drizzle/smart-payroll-schema";
import {
  calculateCompositeScore,
  calculateBatchComposite,
  checkForcedDistribution,
  scoreToGrade,
} from "../services/perf-composite-scoring.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("perf-calibration-router");

// ── Permission shortcuts ────────────────────────────────
const viewPerf = requirePermission("hr:performance:self");
const managePerf = requirePermission("hr:performance:manage");
const manageCalibration = requirePermission("hr:calibration:manage");
const ceoCalibration = requirePermission("hr:calibration:ceo");
const manageCompensation = requirePermission("hr:compensation:manage");

// ── Sub-Router 1: Weight Configs ─────────────────────────

const weightConfigRouter = router({
  list: managePerf.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(perfScoringWeightConfigs)
      .orderBy(desc(perfScoringWeightConfigs.createdAt))
      .limit(100);
    return rows;
  }),

  getDefault: viewPerf.query(async () => {
    const db = await requireDb();
    const [row] = await db.select().from(perfScoringWeightConfigs)
      .where(
        and(
          isNull(perfScoringWeightConfigs.department),
          isNull(perfScoringWeightConfigs.role),
          isNull(perfScoringWeightConfigs.buCode),
          eq(perfScoringWeightConfigs.isActive, true),
        ),
      )
      .limit(1);
    return row ?? null;
  }),

  upsert: manageCalibration
    .input(z.object({
      id: z.number().optional(),
      department: z.string().nullable().optional(),
      role: z.string().nullable().optional(),
      buCode: z.string().nullable().optional(),
      period: z.string().nullable().optional(),
      kpiWeight: z.string().default("30.00"),
      aeiWeight: z.string().default("20.00"),
      okrWeight: z.string().default("20.00"),
      competencyWeight: z.string().default("15.00"),
      feedbackWeight: z.string().default("15.00"),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      if (input.id) {
        await db.update(perfScoringWeightConfigs).set({
          ...input,
          department: input.department ?? null,
          role: input.role ?? null,
          buCode: input.buCode ?? null,
          period: input.period ?? null,
          updatedAt: new Date(),
        }).where(eq(perfScoringWeightConfigs.id, input.id));
        log.info({ id: input.id }, "Weight config updated");
        return { id: input.id, action: "updated" };
      }
      const [row] = await db.insert(perfScoringWeightConfigs).values({
        ...input,
        department: input.department ?? null,
        role: input.role ?? null,
        buCode: input.buCode ?? null,
        period: input.period ?? null,
        createdBy: ctx.user!.id,
      }).returning();
      log.info({ id: row.id }, "Weight config created");
      return { id: row.id, action: "created" };
    }),

  delete: manageCalibration
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(perfScoringWeightConfigs)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(perfScoringWeightConfigs.id, input.id));
      return { success: true };
    }),

  preview: managePerf
    .input(z.object({
      employeeId: z.number(),
      period: z.string(),
      department: z.string().optional(),
      role: z.string().optional(),
      buCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const result = await calculateCompositeScore(
        input.employeeId,
        input.period,
        input.department,
        input.role,
        input.buCode,
      );
      return result;
    }),
});

// ── Sub-Router 2: Composite Scores ───────────────────────

const compositeScoreRouter = router({
  calculate: managePerf
    .input(z.object({
      employeeId: z.number(),
      period: z.string(),
      department: z.string().optional(),
      role: z.string().optional(),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await calculateCompositeScore(
        input.employeeId,
        input.period,
        input.department,
        input.role,
        input.buCode,
      );

      const db = await requireDb();
      const [existing] = await db.select().from(perfCompositeScores)
        .where(and(
          eq(perfCompositeScores.employeeId, input.employeeId),
          eq(perfCompositeScores.period, input.period),
        ))
        .limit(1);

      if (existing) {
        await db.update(perfCompositeScores).set({
          aiCompositeScore: String(result.aiCompositeScore),
          aiGrade: result.aiGrade,
          finalScore: String(result.aiCompositeScore),
          finalGrade: result.aiGrade,
          scoreBreakdownJson: result.breakdown,
          weightConfigId: result.weightConfigId,
          status: "ai_scored",
          updatedAt: new Date(),
        }).where(eq(perfCompositeScores.id, existing.id));
        return { id: existing.id, ...result, action: "updated" };
      }

      const [row] = await db.insert(perfCompositeScores).values({
        employeeId: input.employeeId,
        period: input.period,
        department: input.department,
        aiCompositeScore: String(result.aiCompositeScore),
        aiGrade: result.aiGrade,
        finalScore: String(result.aiCompositeScore),
        finalGrade: result.aiGrade,
        scoreBreakdownJson: result.breakdown,
        weightConfigId: result.weightConfigId,
        status: "ai_scored",
      }).returning();
      return { id: row.id, ...result, action: "created" };
    }),

  calculateBatch: manageCalibration
    .input(z.object({
      period: z.string(),
      department: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return calculateBatchComposite(input.period, input.department);
    }),

  getByEmployee: viewPerf
    .input(z.object({
      employeeId: z.number(),
      period: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      let q = db.select().from(perfCompositeScores)
        .where(eq(perfCompositeScores.employeeId, input.employeeId))
        .orderBy(desc(perfCompositeScores.period))
        .limit(12);
      const rows = await q;
      if (input.period) {
        return rows.filter((r) => r.period === input.period);
      }
      return rows;
    }),

  listByDepartment: managePerf
    .input(z.object({
      department: z.string(),
      period: z.string(),
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(perfCompositeScores)
        .where(and(
          eq(perfCompositeScores.department, input.department),
          eq(perfCompositeScores.period, input.period),
        ))
        .orderBy(desc(perfCompositeScores.finalScore))
        .limit(input.limit);
      return rows;
    }),

  getDistribution: managePerf
    .input(z.object({
      period: z.string(),
      department: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT final_grade, COUNT(*)::int as cnt
        FROM perf_composite_scores
        WHERE period = ${input.period}
          AND (${input.department ?? null}::text IS NULL OR department = ${input.department ?? null})
        GROUP BY final_grade
        ORDER BY final_grade
      `);
      const rows = (result as any).rows ?? [];
      return rows.map((r: any) => ({ grade: r.final_grade, count: Number(r.cnt) }));
    }),

  checkDistribution: manageCalibration
    .input(z.object({
      department: z.string().nullable(),
      period: z.string(),
      buCode: z.string().nullable().optional(),
    }))
    .query(async ({ input }) => {
      return checkForcedDistribution(input.department, input.period, input.buCode);
    }),

  export: managePerf
    .input(z.object({
      period: z.string(),
      department: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(perfCompositeScores)
        .where(and(
          eq(perfCompositeScores.period, input.period),
          input.department ? eq(perfCompositeScores.department, input.department) : undefined,
        ))
        .orderBy(perfCompositeScores.department, desc(perfCompositeScores.finalScore))
        .limit(1000);
      return rows;
    }),
});

// ── Sub-Router 3: 360° Feedback ──────────────────────────

const feedback360Router = router({
  requestFeedback: managePerf
    .input(z.object({
      targetEmployeeId: z.number(),
      targetEmployeeName: z.string().optional(),
      reviewerEmployeeId: z.number(),
      reviewerName: z.string().optional(),
      relationship: z.enum(["self", "manager", "peer", "subordinate", "cross_functional"]),
      period: z.string(),
      isAnonymous: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.insert(perf360Feedback).values({
        ...input,
        status: "pending",
      }).returning();
      log.info({ id: row.id, target: input.targetEmployeeId, reviewer: input.reviewerEmployeeId }, "360 feedback requested");
      return row;
    }),

  submit: viewPerf
    .input(z.object({
      feedbackId: z.number(),
      questionnaire: z.any(),
      overallScore: z.string(),
      strengths: z.string().optional(),
      improvements: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(perf360Feedback)
        .where(eq(perf360Feedback.id, input.feedbackId))
        .limit(1);
      if (!existing) throw new Error("Feedback not found");
      if (existing.reviewerEmployeeId !== ctx.user!.id) throw new Error("Not your feedback to submit");

      await db.update(perf360Feedback).set({
        questionnaire: input.questionnaire,
        overallScore: input.overallScore,
        strengths: input.strengths,
        improvements: input.improvements,
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(perf360Feedback.id, input.feedbackId));
      return { success: true };
    }),

  getMyPending: viewPerf.query(async ({ ctx }) => {
    const db = await requireDb();
    const rows = await db.select().from(perf360Feedback)
      .where(and(
        eq(perf360Feedback.reviewerEmployeeId, ctx.user!.id),
        eq(perf360Feedback.status, "pending"),
      ))
      .orderBy(desc(perf360Feedback.createdAt))
      .limit(50);
    return rows;
  }),

  getForEmployee: managePerf
    .input(z.object({
      employeeId: z.number(),
      period: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(perf360Feedback)
        .where(and(
          eq(perf360Feedback.targetEmployeeId, input.employeeId),
          eq(perf360Feedback.period, input.period),
        ))
        .orderBy(perf360Feedback.relationship)
        .limit(50);
      return rows;
    }),

  getAggregated: viewPerf
    .input(z.object({
      employeeId: z.number(),
      period: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT
          relationship,
          COUNT(*)::int as response_count,
          ROUND(AVG(overall_score::numeric), 2) as avg_score
        FROM perf_360_feedback
        WHERE target_employee_id = ${input.employeeId}
          AND period = ${input.period}
          AND status = 'submitted'
        GROUP BY relationship
      `);
      const rows = (result as any).rows ?? [];
      return rows.map((r: any) => ({
        relationship: r.relationship,
        responseCount: Number(r.response_count),
        avgScore: Number(r.avg_score),
      }));
    }),

  listByPeriod: managePerf
    .input(z.object({
      period: z.string(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(perf360Feedback)
        .where(and(
          eq(perf360Feedback.period, input.period),
          input.status ? eq(perf360Feedback.status, input.status) : undefined,
        ))
        .orderBy(desc(perf360Feedback.createdAt))
        .limit(500);
      return rows;
    }),

  generateQuestionnaire: managePerf
    .input(z.object({ relationship: z.string() }))
    .query(({ input }) => {
      const baseQuestions = [
        { id: 1, text: "工作质量与交付标准", maxScore: 10, category: "performance" },
        { id: 2, text: "沟通与协作能力", maxScore: 10, category: "collaboration" },
        { id: 3, text: "主动性与创新思维", maxScore: 10, category: "initiative" },
        { id: 4, text: "专业技能与知识深度", maxScore: 10, category: "competency" },
        { id: 5, text: "责任心与可靠性", maxScore: 10, category: "reliability" },
      ];
      const roleSpecific: Record<string, Array<{ id: number; text: string; maxScore: number; category: string }>> = {
        manager: [
          { id: 6, text: "目标设定与绩效管理", maxScore: 10, category: "leadership" },
          { id: 7, text: "团队发展与人才培养", maxScore: 10, category: "leadership" },
        ],
        subordinate: [
          { id: 6, text: "授权与指导支持", maxScore: 10, category: "leadership" },
          { id: 7, text: "公正公平与决策透明", maxScore: 10, category: "leadership" },
        ],
        peer: [
          { id: 6, text: "跨团队协作意愿", maxScore: 10, category: "collaboration" },
        ],
        self: [
          { id: 6, text: "自我学习与成长", maxScore: 10, category: "growth" },
        ],
        cross_functional: [
          { id: 6, text: "跨部门项目配合度", maxScore: 10, category: "collaboration" },
        ],
      };
      return [...baseQuestions, ...(roleSpecific[input.relationship] ?? [])];
    }),
});

// ── Sub-Router 4: Forced Distribution ────────────────────

const forcedDistributionRouter = router({
  getConfig: manageCalibration.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(perfForcedDistributionConfigs)
      .where(eq(perfForcedDistributionConfigs.isActive, true))
      .orderBy(desc(perfForcedDistributionConfigs.createdAt))
      .limit(50);
    return rows;
  }),

  upsert: manageCalibration
    .input(z.object({
      id: z.number().optional(),
      department: z.string().nullable().optional(),
      buCode: z.string().nullable().optional(),
      period: z.string().nullable().optional(),
      gradeSMaxPct: z.string().default("5.00"),
      gradeAMaxPct: z.string().default("20.00"),
      gradeBMaxPct: z.string().default("50.00"),
      gradeCMaxPct: z.string().default("20.00"),
      gradeDMaxPct: z.string().default("5.00"),
      isStrict: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      if (input.id) {
        await db.update(perfForcedDistributionConfigs).set({
          ...input,
          department: input.department ?? null,
          buCode: input.buCode ?? null,
          period: input.period ?? null,
          updatedAt: new Date(),
        }).where(eq(perfForcedDistributionConfigs.id, input.id));
        return { id: input.id, action: "updated" };
      }
      const [row] = await db.insert(perfForcedDistributionConfigs).values({
        ...input,
        department: input.department ?? null,
        buCode: input.buCode ?? null,
        period: input.period ?? null,
        createdBy: ctx.user!.id,
      }).returning();
      return { id: row.id, action: "created" };
    }),

  simulate: manageCalibration
    .input(z.object({
      department: z.string().nullable(),
      period: z.string(),
      buCode: z.string().nullable().optional(),
    }))
    .query(async ({ input }) => {
      return checkForcedDistribution(input.department, input.period, input.buCode);
    }),

  listViolations: manageCalibration
    .input(z.object({ period: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      // Get unique departments
      const result = await db.execute(sql`
        SELECT DISTINCT department FROM perf_composite_scores
        WHERE period = ${input.period} AND department IS NOT NULL
      `);
      const depts = ((result as any).rows ?? []).map((r: any) => String(r.department));

      const violations: Array<{ department: string; distribution: any }> = [];
      for (const dept of depts) {
        const check = await checkForcedDistribution(dept, input.period);
        if (check.hasViolations) {
          violations.push({ department: dept, distribution: check.distribution });
        }
      }
      return violations;
    }),
});

// ── Sub-Router 5: Calibration Sessions ───────────────────

const calibrationRouter = router({
  createSession: manageCalibration
    .input(z.object({
      title: z.string(),
      scope: z.string(),
      period: z.string(),
      participants: z.any().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(perfCalibrationSessions).values({
        ...input,
        createdBy: ctx.user!.id,
        status: "draft",
      }).returning();
      log.info({ id: row.id, scope: input.scope }, "Calibration session created");
      return row;
    }),

  getSession: manageCalibration
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [session] = await db.select().from(perfCalibrationSessions)
        .where(eq(perfCalibrationSessions.id, input.id))
        .limit(1);
      if (!session) return null;

      const adjustments = await db.select().from(perfCalibrationAdjustments)
        .where(and(
          eq(perfCalibrationAdjustments.sessionId, input.id),
          isNull(perfCalibrationAdjustments.undoneAt),
        ))
        .orderBy(desc(perfCalibrationAdjustments.createdAt))
        .limit(200);

      return { ...session, adjustments };
    }),

  listSessions: manageCalibration
    .input(z.object({
      period: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(perfCalibrationSessions)
        .where(and(
          input.period ? eq(perfCalibrationSessions.period, input.period) : undefined,
          input.status ? eq(perfCalibrationSessions.status, input.status as any) : undefined,
        ))
        .orderBy(desc(perfCalibrationSessions.createdAt))
        .limit(100);
      return rows;
    }),

  startSession: manageCalibration
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [session] = await db.select().from(perfCalibrationSessions)
        .where(eq(perfCalibrationSessions.id, input.id))
        .limit(1);
      if (!session) throw new Error("Session not found");
      if (session.status !== "draft") throw new Error("Session must be in draft status");

      // Snapshot current distribution
      const distCheck = await checkForcedDistribution(
        session.scope === "company" ? null : session.scope,
        session.period,
      );

      await db.update(perfCalibrationSessions).set({
        status: "in_progress",
        startedAt: new Date(),
        distributionSnapshot: distCheck.distribution,
        updatedAt: new Date(),
      }).where(eq(perfCalibrationSessions.id, input.id));

      return { success: true, distribution: distCheck.distribution };
    }),

  recordAdjustment: manageCalibration
    .input(z.object({
      sessionId: z.number(),
      compositeScoreId: z.number(),
      employeeId: z.number(),
      employeeName: z.string().optional(),
      newGrade: z.string(),
      newScore: z.string(),
      adjustmentReason: z.string().min(5),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Fetch current state
      const [score] = await db.select().from(perfCompositeScores)
        .where(eq(perfCompositeScores.id, input.compositeScoreId))
        .limit(1);
      if (!score) throw new Error("Composite score not found");

      // Record adjustment
      const [adj] = await db.insert(perfCalibrationAdjustments).values({
        sessionId: input.sessionId,
        compositeScoreId: input.compositeScoreId,
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        previousGrade: score.finalGrade ?? score.aiGrade ?? "B",
        newGrade: input.newGrade,
        previousScore: score.finalScore ?? score.aiCompositeScore ?? "70.00",
        newScore: input.newScore,
        adjustmentReason: input.adjustmentReason,
        adjustedBy: ctx.user!.id,
        adjustedByName: ctx.user!.name,
      }).returning();

      // Update composite score
      await db.update(perfCompositeScores).set({
        finalScore: input.newScore,
        finalGrade: input.newGrade,
        overrideJustification: input.adjustmentReason,
        overrideBy: ctx.user!.id,
        overrideAt: new Date(),
        calibrationSessionId: input.sessionId,
        status: "calibrated",
        updatedAt: new Date(),
      }).where(eq(perfCompositeScores.id, input.compositeScoreId));

      log.info({ adjId: adj.id, employee: input.employeeId, oldGrade: adj.previousGrade, newGrade: input.newGrade }, "Calibration adjustment recorded");
      return adj;
    }),

  undoAdjustment: manageCalibration
    .input(z.object({ adjustmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [adj] = await db.select().from(perfCalibrationAdjustments)
        .where(eq(perfCalibrationAdjustments.id, input.adjustmentId))
        .limit(1);
      if (!adj) throw new Error("Adjustment not found");
      if (adj.undoneAt) throw new Error("Already undone");

      // Mark adjustment as undone
      await db.update(perfCalibrationAdjustments).set({
        undoneAt: new Date(),
        undoneBy: ctx.user!.id,
      }).where(eq(perfCalibrationAdjustments.id, input.adjustmentId));

      // Revert composite score
      await db.update(perfCompositeScores).set({
        finalScore: adj.previousScore,
        finalGrade: adj.previousGrade,
        status: "under_review",
        updatedAt: new Date(),
      }).where(eq(perfCompositeScores.id, adj.compositeScoreId));

      return { success: true };
    }),

  completeSession: manageCalibration
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [session] = await db.select().from(perfCalibrationSessions)
        .where(eq(perfCalibrationSessions.id, input.id))
        .limit(1);
      if (!session) throw new Error("Session not found");
      if (session.status !== "in_progress") throw new Error("Session must be in_progress");

      // Snapshot final distribution
      const finalDist = await checkForcedDistribution(
        session.scope === "company" ? null : session.scope,
        session.period,
      );

      // Finalize all calibrated scores in this session
      await db.update(perfCompositeScores).set({
        status: "finalized",
        updatedAt: new Date(),
      }).where(eq(perfCompositeScores.calibrationSessionId, input.id));

      await db.update(perfCalibrationSessions).set({
        status: "completed",
        completedAt: new Date(),
        finalDistribution: finalDist.distribution,
        updatedAt: new Date(),
      }).where(eq(perfCalibrationSessions.id, input.id));

      log.info({ id: input.id }, "Calibration session completed");
      return { success: true, finalDistribution: finalDist.distribution };
    }),

  lockSession: ceoCalibration
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [session] = await db.select().from(perfCalibrationSessions)
        .where(eq(perfCalibrationSessions.id, input.id))
        .limit(1);
      if (!session) throw new Error("Session not found");
      if (session.status !== "completed") throw new Error("Session must be completed first");

      // Lock all scores
      await db.update(perfCompositeScores).set({
        status: "locked",
        updatedAt: new Date(),
      }).where(eq(perfCompositeScores.calibrationSessionId, input.id));

      await db.update(perfCalibrationSessions).set({
        status: "locked",
        updatedAt: new Date(),
      }).where(eq(perfCalibrationSessions.id, input.id));

      log.info({ id: input.id }, "Calibration session locked by CEO");
      return { success: true };
    }),
});

// ── Sub-Router 6: Manual Override ────────────────────────

const manualOverrideRouter = router({
  override: manageCalibration
    .input(z.object({
      compositeScoreId: z.number(),
      newScore: z.string(),
      newGrade: z.string(),
      justification: z.string().min(5),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [score] = await db.select().from(perfCompositeScores)
        .where(eq(perfCompositeScores.id, input.compositeScoreId))
        .limit(1);
      if (!score) throw new Error("Composite score not found");
      if (score.status === "locked") throw new Error("Score is locked");

      await db.update(perfCompositeScores).set({
        finalScore: input.newScore,
        finalGrade: input.newGrade,
        overrideJustification: input.justification,
        overrideBy: ctx.user!.id,
        overrideAt: new Date(),
        status: "calibrated",
        updatedAt: new Date(),
      }).where(eq(perfCompositeScores.id, input.compositeScoreId));

      log.info({ id: input.compositeScoreId, newGrade: input.newGrade, by: ctx.user!.id }, "Manual override applied");
      return { success: true };
    }),

  batchOverride: manageCalibration
    .input(z.object({
      overrides: z.array(z.object({
        compositeScoreId: z.number(),
        newScore: z.string(),
        newGrade: z.string(),
        justification: z.string().min(5),
      })).max(50),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      let updated = 0;
      for (const o of input.overrides) {
        try {
          await db.update(perfCompositeScores).set({
            finalScore: o.newScore,
            finalGrade: o.newGrade,
            overrideJustification: o.justification,
            overrideBy: ctx.user!.id,
            overrideAt: new Date(),
            status: "calibrated",
            updatedAt: new Date(),
          }).where(eq(perfCompositeScores.id, o.compositeScoreId));
          updated++;
        } catch (err) {
          log.warn({ id: o.compositeScoreId, error: String(err) }, "Batch override failed for item");
        }
      }
      return { updated, total: input.overrides.length };
    }),

  getOverrideHistory: manageCalibration
    .input(z.object({
      employeeId: z.number().optional(),
      period: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(perfCompositeScores)
        .where(and(
          input.employeeId ? eq(perfCompositeScores.employeeId, input.employeeId) : undefined,
          input.period ? eq(perfCompositeScores.period, input.period) : undefined,
          sql`override_by IS NOT NULL`,
        ))
        .orderBy(desc(perfCompositeScores.overrideAt))
        .limit(200);
      return rows;
    }),

  revert: manageCalibration
    .input(z.object({ compositeScoreId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [score] = await db.select().from(perfCompositeScores)
        .where(eq(perfCompositeScores.id, input.compositeScoreId))
        .limit(1);
      if (!score) throw new Error("Score not found");
      if (score.status === "locked") throw new Error("Score is locked");

      await db.update(perfCompositeScores).set({
        finalScore: score.aiCompositeScore,
        finalGrade: score.aiGrade,
        overrideJustification: null,
        overrideBy: null,
        overrideAt: null,
        status: "ai_scored",
        updatedAt: new Date(),
      }).where(eq(perfCompositeScores.id, input.compositeScoreId));
      return { success: true };
    }),
});

// ── Sub-Router 7: Incentive Catalog & Awards ─────────────

const incentiveRouter = router({
  listCatalog: viewPerf.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(perfIncentiveCatalog)
      .where(eq(perfIncentiveCatalog.isActive, true))
      .orderBy(perfIncentiveCatalog.category, perfIncentiveCatalog.code)
      .limit(100);
    return rows;
  }),

  upsertCatalogItem: manageCompensation
    .input(z.object({
      id: z.number().optional(),
      code: z.string(),
      name: z.string(),
      nameEn: z.string().optional(),
      category: z.enum(["skill_premium", "project_bonus", "innovation_reward", "team_incentive", "retention_bonus", "referral_bonus"]),
      description: z.string().optional(),
      calculationMethod: z.enum(["fixed", "percentage", "formula"]).default("fixed"),
      baseAmount: z.string().default("0.00"),
      maxAmount: z.string().nullable().optional(),
      formula: z.string().nullable().optional(),
      eligibilityCriteria: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      if (input.id) {
        await db.update(perfIncentiveCatalog).set({
          ...input,
          maxAmount: input.maxAmount ?? null,
          formula: input.formula ?? null,
          updatedAt: new Date(),
        }).where(eq(perfIncentiveCatalog.id, input.id));
        return { id: input.id, action: "updated" };
      }
      const [row] = await db.insert(perfIncentiveCatalog).values({
        ...input,
        maxAmount: input.maxAmount ?? null,
        formula: input.formula ?? null,
        createdBy: ctx.user!.id,
      }).returning();
      return { id: row.id, action: "created" };
    }),

  awardIncentive: manageCompensation
    .input(z.object({
      employeeId: z.number(),
      catalogItemId: z.number(),
      amount: z.string(),
      period: z.string(),
      justification: z.string(),
      employeeName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Lookup catalog item for metadata
      const [catalog] = await db.select().from(perfIncentiveCatalog)
        .where(eq(perfIncentiveCatalog.id, input.catalogItemId))
        .limit(1);
      if (!catalog) throw new Error("Incentive catalog item not found");

      // Validate against max amount
      if (catalog.maxAmount && Number(input.amount) > Number(catalog.maxAmount)) {
        throw new Error(`Amount exceeds max (${catalog.maxAmount})`);
      }

      // Create payroll_excellence_awards record (bridge to payroll calculator)
      const [award] = await db.insert(payrollExcellenceAwards).values({
        employeeId: input.employeeId,
        employeeName: input.employeeName ?? "",
        period: input.period,
        awardType: catalog.code,
        awardTitle: catalog.name,
        awardAmount: input.amount,
        justification: input.justification,
        awardedBy: ctx.user!.id,
        awardedByName: ctx.user!.name ?? "System",
      } as any).returning();

      log.info({ awardId: award.id, employee: input.employeeId, type: catalog.code, amount: input.amount }, "Incentive awarded");
      return { awardId: award.id, catalogItem: catalog.name };
    }),

  listEmployeeIncentives: viewPerf
    .input(z.object({
      employeeId: z.number(),
      period: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(payrollExcellenceAwards)
        .where(and(
          eq(payrollExcellenceAwards.employeeId, input.employeeId),
          input.period ? eq(payrollExcellenceAwards.period, input.period) : undefined,
        ))
        .orderBy(desc(payrollExcellenceAwards.createdAt))
        .limit(100);
      return rows;
    }),

  getIncentiveSummary: manageCompensation
    .input(z.object({ period: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT
          award_type,
          COUNT(*)::int as award_count,
          SUM(award_amount::numeric)::numeric(14,2) as total_amount
        FROM payroll_excellence_awards
        WHERE period = ${input.period}
        GROUP BY award_type
        ORDER BY total_amount DESC
      `);
      const rows = (result as any).rows ?? [];
      return rows.map((r: any) => ({
        awardType: r.award_type,
        awardCount: Number(r.award_count),
        totalAmount: Number(r.total_amount),
      }));
    }),
});

// ── Sub-Router 8: Dashboard ──────────────────────────────

const dashboardRouter = router({
  ceoCockpit: ceoCalibration
    .input(z.object({ period: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Overall distribution
      const distResult = await db.execute(sql`
        SELECT final_grade, COUNT(*)::int as cnt
        FROM perf_composite_scores
        WHERE period = ${input.period}
        GROUP BY final_grade
      `);
      const distribution = ((distResult as any).rows ?? []).map((r: any) => ({
        grade: r.final_grade,
        count: Number(r.cnt),
      }));

      // Department averages
      const deptResult = await db.execute(sql`
        SELECT
          department,
          COUNT(*)::int as headcount,
          ROUND(AVG(final_score::numeric), 2) as avg_score,
          COUNT(CASE WHEN final_grade IN ('S','A') THEN 1 END)::int as top_performers
        FROM perf_composite_scores
        WHERE period = ${input.period} AND department IS NOT NULL
        GROUP BY department
        ORDER BY avg_score DESC
        LIMIT 50
      `);
      const departments = ((deptResult as any).rows ?? []).map((r: any) => ({
        department: r.department,
        headcount: Number(r.headcount),
        avgScore: Number(r.avg_score),
        topPerformers: Number(r.top_performers),
      }));

      // Pending sessions
      const sessions = await db.select().from(perfCalibrationSessions)
        .where(and(
          eq(perfCalibrationSessions.period, input.period),
          sql`status != 'locked'`,
        ))
        .orderBy(desc(perfCalibrationSessions.createdAt))
        .limit(10);

      // Override count
      const overrideResult = await db.execute(sql`
        SELECT COUNT(*)::int as cnt
        FROM perf_composite_scores
        WHERE period = ${input.period} AND override_by IS NOT NULL
      `);
      const overrideCount = Number(((overrideResult as any).rows ?? [])[0]?.cnt ?? 0);

      return {
        distribution,
        departments,
        activeSessions: sessions,
        overrideCount,
        period: input.period,
      };
    }),

  aiRecommendations: manageCalibration
    .input(z.object({
      period: z.string(),
      department: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Find anomalies: large gap between AI and current grade
      const anomalies = await db.execute(sql`
        SELECT id, employee_id, employee_name, department,
               ai_composite_score, ai_grade, final_score, final_grade,
               ABS(ai_composite_score::numeric - final_score::numeric) as gap
        FROM perf_composite_scores
        WHERE period = ${input.period}
          AND (${input.department ?? null}::text IS NULL OR department = ${input.department ?? null})
          AND ai_composite_score IS NOT NULL
          AND final_score IS NOT NULL
        ORDER BY gap DESC
        LIMIT 20
      `);

      const rows = ((anomalies as any).rows ?? []).map((r: any) => ({
        id: r.id,
        employeeId: Number(r.employee_id),
        employeeName: r.employee_name,
        department: r.department,
        aiScore: Number(r.ai_composite_score),
        aiGrade: r.ai_grade,
        finalScore: Number(r.final_score),
        finalGrade: r.final_grade,
        gap: Number(r.gap),
        recommendation: Number(r.gap) > 10
          ? `建议复核：AI评分(${r.ai_composite_score})与最终评分(${r.final_score})差距较大`
          : "评分一致，无需调整",
      }));

      return rows;
    }),
});

// ── Sub-Router 9: Pipeline — Monthly Salary Preparation ──

const pipelineRouter = router({
  // Readiness report: check data completeness for salary preparation
  getReadinessReport: ceoCalibration
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { period } = input;

      // 1. KPI scores coverage
      const kpiRes = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id) as cnt
        FROM hrm_monthly_performance_reviews
        WHERE month_date = ${period}
      `);

      // 2. AEI scores coverage
      const aeiRes = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id) as cnt
        FROM aei_monthly_scores
        WHERE month = ${period}
      `);

      // 3. Attendance records
      const attendanceRes = await db.execute(sql`
        SELECT COUNT(DISTINCT employee_id) as cnt
        FROM attendance_records
        WHERE period = ${period}
      `);

      // 4. 360 feedback submitted
      const feedbackRes = await db.execute(sql`
        SELECT COUNT(DISTINCT target_employee_id) as cnt
        FROM perf_360_feedback
        WHERE period = ${period} AND status = 'submitted'
      `);

      // 5. Composite scores already calculated
      const compositeRes = await db.execute(sql`
        SELECT COUNT(*) as cnt,
               SUM(CASE WHEN status IN ('finalized','locked') THEN 1 ELSE 0 END) as finalized_cnt
        FROM perf_composite_scores
        WHERE period = ${period}
      `);

      // 6. Payroll ledgers for period
      const payrollRes = await db.execute(sql`
        SELECT COUNT(*) as cnt,
               SUM(CASE WHEN status = 'CEO_APPROVED' THEN 1 ELSE 0 END) as approved_cnt,
               SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as paid_cnt
        FROM payroll_ledgers
        WHERE period = ${period}
      `);

      // 7. Total active employees (baseline)
      const totalRes = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM salary_structures WHERE is_active = true
      `);

      const row = (r: any) => ((r as any).rows ?? [r])[0] ?? {};
      const total = Number(row(totalRes)?.cnt ?? 0);
      const kpi = Number(row(kpiRes)?.cnt ?? 0);
      const aei = Number(row(aeiRes)?.cnt ?? 0);
      const attendance = Number(row(attendanceRes)?.cnt ?? 0);
      const feedback = Number(row(feedbackRes)?.cnt ?? 0);
      const composite = Number(row(compositeRes)?.cnt ?? 0);
      const finalized = Number(row(compositeRes)?.finalized_cnt ?? 0);
      const payroll = Number(row(payrollRes)?.cnt ?? 0);
      const approved = Number(row(payrollRes)?.approved_cnt ?? 0);
      const paid = Number(row(payrollRes)?.paid_cnt ?? 0);

      const steps = [
        { step: 1, name: "KPI评分", nameEn: "KPI Scores", ready: kpi, total, pct: total ? Math.round(kpi / total * 100) : 0, status: kpi >= total ? "complete" : kpi > 0 ? "partial" : "missing" },
        { step: 2, name: "AEI智能评分", nameEn: "AEI Scores", ready: aei, total, pct: total ? Math.round(aei / total * 100) : 0, status: aei >= total ? "complete" : aei > 0 ? "partial" : "missing" },
        { step: 3, name: "考勤记录", nameEn: "Attendance", ready: attendance, total, pct: total ? Math.round(attendance / total * 100) : 0, status: attendance >= total ? "complete" : attendance > 0 ? "partial" : "missing" },
        { step: 4, name: "360度反馈", nameEn: "360° Feedback", ready: feedback, total, pct: total ? Math.round(feedback / total * 100) : 0, status: feedback >= total * 0.5 ? "complete" : feedback > 0 ? "partial" : "missing" },
        { step: 5, name: "综合评分", nameEn: "Composite Scores", ready: composite, total, pct: total ? Math.round(composite / total * 100) : 0, status: composite >= total ? "complete" : composite > 0 ? "partial" : "missing" },
        { step: 6, name: "校准定级", nameEn: "Calibration", ready: finalized, total, pct: total ? Math.round(finalized / total * 100) : 0, status: finalized >= total ? "complete" : finalized > 0 ? "partial" : "missing" },
        { step: 7, name: "薪资计算", nameEn: "Payroll Calculated", ready: payroll, total, pct: total ? Math.round(payroll / total * 100) : 0, status: payroll >= total ? "complete" : payroll > 0 ? "partial" : "missing" },
        { step: 8, name: "CEO审批", nameEn: "CEO Approved", ready: approved + paid, total, pct: total ? Math.round((approved + paid) / total * 100) : 0, status: approved + paid >= total ? "complete" : approved + paid > 0 ? "partial" : "missing" },
      ];

      const overallReadiness = steps.filter(s => s.status === "complete").length;
      const canProceed = steps.slice(0, 4).every(s => s.status !== "missing"); // first 4 data sources must have data

      log.info({ period, overallReadiness, total }, "Pipeline readiness report");

      return { period, totalEmployees: total, steps, overallReadiness, canProceed };
    }),

  // Orchestrate: batch composite scoring → batch payroll calculation
  prepareMonthlySalary: ceoCalibration
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      department: z.string().optional(),
      skipComposite: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { period, department, skipComposite } = input;

      log.info({ period, department, userId: ctx.user!.id }, "Monthly salary preparation started");

      // Step 1: Batch composite scoring (unless skipped)
      let compositeResult = { processed: 0, errors: 0 };
      if (!skipComposite) {
        compositeResult = await calculateBatchComposite(period, department ?? undefined);
        log.info({ compositeResult }, "Batch composite scoring complete");
      }

      // Step 2: Queue batch payroll calculation via ai_tasks
      const { aiTasks: aiTasksTable } = await import("../../drizzle/schema");
      const [task] = await db.insert(aiTasksTable).values({
        taskType: "payroll_batch_calculation",
        status: "pending",
        inputData: { period, department },
        createdBy: String(ctx.user!.id),
      }).returning();

      // Fire-and-forget payroll processing
      const { processPayrollTask } = await import("../workers/payrollCalculator");
      processPayrollTask(task.id).catch((err) => {
        log.error({ err, taskId: task.id }, "Background payroll task failed");
      });

      return {
        compositeScoring: compositeResult,
        payrollTaskId: task.id,
        payrollStatus: "queued",
        period,
        message: `综合评分已完成(${compositeResult.processed}人)，薪资批量计算已排队`,
      };
    }),

  // KPI alignment: compare KPI grades vs composite grades vs payroll grades
  getKpiAlignment: ceoCalibration
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      department: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const results = await db.execute(sql`
        SELECT
          cs.employee_id,
          cs.employee_name,
          cs.department,
          cs.score_breakdown_json,
          cs.ai_composite_score,
          cs.ai_grade,
          cs.final_score,
          cs.final_grade,
          cs.status as composite_status,
          pl.gross_salary,
          pl.net_salary,
          pl.performance_bonus,
          pl.status as payroll_status
        FROM perf_composite_scores cs
        LEFT JOIN payroll_ledgers pl
          ON cs.employee_id = pl.employee_id AND cs.period = pl.period
        WHERE cs.period = ${input.period}
          AND (${input.department ?? null}::text IS NULL OR cs.department = ${input.department ?? null})
        ORDER BY cs.final_score DESC NULLS LAST
        LIMIT 500
      `);

      const rows = ((results as any).rows ?? []).map((r: any) => {
        const breakdown = r.score_breakdown_json ? JSON.parse(r.score_breakdown_json) : {};
        return {
          employeeId: Number(r.employee_id),
          employeeName: r.employee_name,
          department: r.department,
          kpiScore: breakdown.kpi?.score ?? null,
          aeiScore: breakdown.aei?.score ?? null,
          okrScore: breakdown.okr?.score ?? null,
          competencyScore: breakdown.competency?.score ?? null,
          feedbackScore: breakdown.feedback?.score ?? null,
          aiCompositeScore: r.ai_composite_score ? Number(r.ai_composite_score) : null,
          aiGrade: r.ai_grade,
          finalScore: r.final_score ? Number(r.final_score) : null,
          finalGrade: r.final_grade,
          compositeStatus: r.composite_status,
          grossSalary: r.gross_salary ? Number(r.gross_salary) : null,
          netSalary: r.net_salary ? Number(r.net_salary) : null,
          performanceBonus: r.performance_bonus ? Number(r.performance_bonus) : null,
          payrollStatus: r.payroll_status ?? "not_calculated",
          hasOverride: r.final_score && r.ai_composite_score && Math.abs(Number(r.final_score) - Number(r.ai_composite_score)) > 0.01,
        };
      });

      // Summary stats
      const gradeDistribution: Record<string, number> = {};
      let overrideCount = 0;
      let totalBonus = 0;
      for (const r of rows) {
        if (r.finalGrade) gradeDistribution[r.finalGrade] = (gradeDistribution[r.finalGrade] ?? 0) + 1;
        if (r.hasOverride) overrideCount++;
        totalBonus += r.performanceBonus ?? 0;
      }

      return {
        period: input.period,
        employees: rows,
        summary: {
          totalEmployees: rows.length,
          gradeDistribution,
          overrideCount,
          totalPerformanceBonus: totalBonus,
          payrollCompleted: rows.filter((r: any) => r.payrollStatus !== "not_calculated").length,
          ceoApproved: rows.filter((r: any) => r.payrollStatus === "CEO_APPROVED" || r.payrollStatus === "PAID").length,
        },
      };
    }),
});

// ── Export Combined Router ───────────────────────────────

export const perfCalibrationRouter = router({
  weightConfig: weightConfigRouter,
  compositeScore: compositeScoreRouter,
  feedback360: feedback360Router,
  forcedDistribution: forcedDistributionRouter,
  calibration: calibrationRouter,
  manualOverride: manualOverrideRouter,
  incentive: incentiveRouter,
  dashboard: dashboardRouter,
  pipeline: pipelineRouter,
});
