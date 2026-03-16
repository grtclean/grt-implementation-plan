/**
 * Assessment Lifecycle Router — 测评生命周期管理
 *
 * CEO指令: 设定进行测试评估的条件，多轮测试+面试制度，后果执行
 *
 * 7 sub-routers, ~30 procedures:
 *   rules       (4) — list, get, upsert, toggle
 *   triggers    (2) — evaluate, listLogs
 *   workflows   (4) — list, getDetail, updateRound, completeRound
 *   enforcements(4) — list, myActive, lift, listByEmployee
 *   benchmarks  (2) — list, upsert
 *   dashboard   (1) — stats
 *   lifecycle   (3) — onboard, regularize, transferPosition
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import * as svc from "../services/assessment-lifecycle.service";

const managePerm = requirePermission("system:config:manage");
const hrPerm = requirePermission("hr:salary:view");

// ── Trigger Rules ────────────────────────────────────────

const rulesRouter = router({
  list: protectedProcedure
    .input(z.object({
      triggerType: z.string().optional(),
      activeOnly: z.boolean().optional(),
    }).optional())
    .query(({ input }) => svc.listTriggerRules(input ?? undefined)),

  get: protectedProcedure
    .input(z.object({ ruleCode: z.string() }))
    .query(({ input }) => svc.getTriggerRule(input.ruleCode)),

  upsert: managePerm
    .input(z.object({
      ruleCode: z.string().max(80),
      ruleName: z.string().max(200),
      ruleNameEn: z.string().max(200).optional(),
      triggerType: z.string(),
      description: z.string().optional(),
      applicablePositions: z.array(z.string()).nullable().optional(),
      conditions: z.record(z.string(), z.any()),
      assessmentLevel: z.string().max(10).optional(),
      isMultiRound: z.boolean().optional(),
      failureConsequences: z.array(z.object({
        type: z.string(),
        durationDays: z.number().optional(),
        toLevelDelta: z.number().optional(),
        description: z.string().optional(),
      })).optional(),
      maxRetries: z.number().int().min(0).max(10).optional(),
      retryCooldownDays: z.number().int().min(1).max(365).optional(),
      gracePeriodDays: z.number().int().min(1).max(90).optional(),
      priority: z.number().int().min(0).max(100).optional(),
    }))
    .mutation(({ input, ctx }) => svc.upsertTriggerRule({ ...input, createdBy: ctx.user.id })),

  toggle: managePerm
    .input(z.object({
      ruleCode: z.string(),
      isActive: z.boolean(),
    }))
    .mutation(({ input }) => svc.toggleTriggerRule(input.ruleCode, input.isActive)),
});

// ── Trigger Evaluation ──────────────────────────────────

const triggersRouter = router({
  /** Evaluate if an employee should be assessed (used by lifecycle events) */
  evaluate: hrPerm
    .input(z.object({
      employeeId: z.number().int().positive(),
      triggerType: z.string(),
      positionKey: z.string(),
      currentLevel: z.string().optional(),
      lifecycleStage: z.string().optional(),
      triggerData: z.record(z.string(), z.any()),
    }))
    .mutation(({ input }) => svc.evaluateTrigger(input)),

  /** List trigger event logs */
  listLogs: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      triggerType: z.string().optional(),
      outcome: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).optional())
    .query(({ input }) => svc.listTriggerLogs(input ?? undefined)),
});

// ── Multi-Round Workflows ────────────────────────────────

const workflowsRouter = router({
  list: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      positionKey: z.string().optional(),
      status: z.string().optional(),
      purpose: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).optional())
    .query(({ input }) => svc.listWorkflows(input ?? undefined)),

  getDetail: protectedProcedure
    .input(z.object({ workflowId: z.number().int().positive() }))
    .query(({ input }) => svc.getWorkflowDetail(input.workflowId)),

  updateRound: hrPerm
    .input(z.object({
      roundId: z.number().int().positive(),
      status: z.string().optional(),
      score: z.string().optional(),
      panelists: z.array(z.object({
        userId: z.number(),
        name: z.string(),
        role: z.string(),
        score: z.number().optional(),
        feedback: z.string().optional(),
      })).optional(),
      evaluationCriteria: z.array(z.object({
        criterion: z.string(),
        weight: z.number(),
        maxScore: z.number(),
        actualScore: z.number().optional(),
      })).optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      location: z.string().optional(),
      sessionId: z.number().optional(),
      paperId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { roundId, ...updates } = input;
      return svc.updateRound(roundId, updates);
    }),

  completeRound: hrPerm
    .input(z.object({
      workflowId: z.number().int().positive(),
      roundNumber: z.number().int().positive(),
      score: z.number().min(0).max(100),
      passed: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => svc.completeRound(input.workflowId, input.roundNumber, {
      score: input.score,
      passed: input.passed,
      notes: input.notes,
      decidedBy: ctx.user.id,
    })),
});

// ── Enforcement Actions ──────────────────────────────────

const enforcementsRouter = router({
  list: hrPerm
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      status: z.string().optional(),
      enforcementType: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).optional())
    .query(({ input }) => svc.listEnforcements(input ?? undefined)),

  myActive: protectedProcedure
    .query(({ ctx }) => svc.getMyEnforcements(ctx.user.id)),

  lift: managePerm
    .input(z.object({
      enforcementId: z.number().int().positive(),
      reason: z.string().min(1),
      reassessmentPassed: z.boolean().optional(),
      reassessmentSessionId: z.number().optional(),
    }))
    .mutation(({ input, ctx }) => svc.liftEnforcement(input.enforcementId, {
      liftedBy: ctx.user.id,
      reason: input.reason,
      reassessmentPassed: input.reassessmentPassed,
      reassessmentSessionId: input.reassessmentSessionId,
    })),

  listByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.number().int().positive() }))
    .query(({ input }) => svc.listEnforcements({ employeeId: input.employeeId })),
});

// ── Position Benchmarks ──────────────────────────────────

const benchmarksRouter = router({
  list: protectedProcedure
    .input(z.object({
      positionKey: z.string().optional(),
      period: z.string().optional(),
    }).optional())
    .query(({ input }) => svc.listBenchmarks(input ?? undefined)),

  upsert: managePerm
    .input(z.object({
      positionKey: z.string().max(80),
      period: z.string().max(7),
      avgPoints: z.number().optional(),
      avgKpiScore: z.number().optional(),
      minAcceptablePoints: z.number().int().optional(),
      peerThreshold10Pct: z.number().int().optional(),
      employeeCount: z.number().int().optional(),
      isManualOverride: z.boolean().optional(),
    }))
    .mutation(({ input }) => svc.upsertBenchmark(input)),
});

// ── Dashboard ────────────────────────────────────────────

const dashboardRouter = router({
  stats: protectedProcedure
    .query(() => svc.getDashboardStats()),
});

// ── Lifecycle Integration — convenient wrappers ─────────

const lifecycleRouter = router({
  /** Trigger onboarding assessment (called when employee enters G2) */
  onboard: hrPerm
    .input(z.object({
      employeeId: z.number().int().positive(),
      positionKey: z.string(),
    }))
    .mutation(({ input }) => svc.evaluateTrigger({
      employeeId: input.employeeId,
      triggerType: "onboarding",
      positionKey: input.positionKey,
      triggerData: { source: "lifecycle_onboarding", stage: "G2" },
    })),

  /** Trigger regularization assessment (called at G7) */
  regularize: hrPerm
    .input(z.object({
      employeeId: z.number().int().positive(),
      positionKey: z.string(),
      currentLevel: z.string().optional(),
    }))
    .mutation(({ input }) => svc.evaluateTrigger({
      employeeId: input.employeeId,
      triggerType: "probation_end",
      positionKey: input.positionKey,
      currentLevel: input.currentLevel,
      lifecycleStage: "G7",
      triggerData: { source: "lifecycle_regularization", stage: "G7" },
    })),

  /** Trigger position transfer assessment */
  transferPosition: hrPerm
    .input(z.object({
      employeeId: z.number().int().positive(),
      newPositionKey: z.string(),
      previousPositionKey: z.string(),
      currentLevel: z.string().optional(),
    }))
    .mutation(({ input }) => svc.evaluateTrigger({
      employeeId: input.employeeId,
      triggerType: "position_transfer",
      positionKey: input.newPositionKey,
      currentLevel: input.currentLevel,
      triggerData: {
        source: "lifecycle_transfer",
        previousPosition: input.previousPositionKey,
        newPosition: input.newPositionKey,
      },
    })),
});

// ── Export combined router ───────────────────────────────

export const assessmentLifecycleRouter = router({
  rules: rulesRouter,
  triggers: triggersRouter,
  workflows: workflowsRouter,
  enforcements: enforcementsRouter,
  benchmarks: benchmarksRouter,
  dashboard: dashboardRouter,
  lifecycle: lifecycleRouter,
});
