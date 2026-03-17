/**
 * Assessment Lifecycle Service — 测评生命周期管理
 *
 * CEO指令: 设定进行测试评估的条件，多轮测试+面试制度，后果执行
 *
 * Features:
 * - Trigger rule management (CRUD + activation)
 * - Trigger evaluation engine (lifecycle events → assessment creation)
 * - Multi-round workflow management (笔试→实操→面试)
 * - Consequence enforcement (六天制/降级/处罚)
 * - Position benchmark calculation
 * - Timeline and scoring rules
 * - Lifecycle system integration
 */

import { requireDb } from "../db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import {
  assessmentTriggerRules,
  assessmentWorkflows,
  assessmentWorkflowRounds,
  assessmentTriggerLog,
  skillEnforcementActions,
  positionBenchmarkScores,
  type InsertAssessmentTriggerRule,
  type InsertAssessmentWorkflow,
  type InsertAssessmentWorkflowRound,
  type InsertAssessmentTriggerLogEntry,
  type InsertSkillEnforcementAction,
  type InsertPositionBenchmarkScore,
  type AssessmentWorkflowRound,
} from "../../drizzle/assessment-lifecycle-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("assessment-lifecycle");

// ══════════════════════════════════════════════════════════
// 1. Trigger Rules — 触发规则管理
// ══════════════════════════════════════════════════════════

export async function listTriggerRules(opts?: { triggerType?: string; activeOnly?: boolean }) {
  const db = await requireDb();
  let query = db.select().from(assessmentTriggerRules);
  if (opts?.triggerType) {
    query = query.where(eq(assessmentTriggerRules.triggerType, opts.triggerType as typeof assessmentTriggerRules.triggerType.enumValues[number])) as typeof query;
  }
  if (opts?.activeOnly !== false) {
    query = query.where(eq(assessmentTriggerRules.isActive, true)) as typeof query;
  }
  return query.orderBy(desc(assessmentTriggerRules.priority)).limit(100);
}

export async function getTriggerRule(ruleCode: string) {
  const db = await requireDb();
  const rows = await db.select().from(assessmentTriggerRules)
    .where(eq(assessmentTriggerRules.ruleCode, ruleCode)).limit(1);
  return rows[0] ?? null;
}

export async function upsertTriggerRule(data: {
  ruleCode: string;
  ruleName: string;
  ruleNameEn?: string;
  triggerType: string;
  description?: string;
  applicablePositions?: string[] | null;
  conditions: Record<string, unknown>;
  assessmentLevel?: string;
  isMultiRound?: boolean;
  failureConsequences?: Array<{ type: string; durationDays?: number; toLevelDelta?: number; description?: string }>;
  maxRetries?: number;
  retryCooldownDays?: number;
  gracePeriodDays?: number;
  priority?: number;
  createdBy?: number;
}) {
  const db = await requireDb();
  const existing = await db.select({ id: assessmentTriggerRules.id })
    .from(assessmentTriggerRules)
    .where(eq(assessmentTriggerRules.ruleCode, data.ruleCode)).limit(1);

  if (existing.length > 0) {
    await db.update(assessmentTriggerRules)
      .set({ ...data, updatedAt: new Date() } as Partial<InsertAssessmentTriggerRule>)
      .where(eq(assessmentTriggerRules.ruleCode, data.ruleCode));
    log.info({ ruleCode: data.ruleCode }, "trigger rule updated");
    return { success: true, ruleCode: data.ruleCode, action: "updated" };
  }

  await db.insert(assessmentTriggerRules).values(data as InsertAssessmentTriggerRule);
  log.info({ ruleCode: data.ruleCode }, "trigger rule created");
  return { success: true, ruleCode: data.ruleCode, action: "created" };
}

export async function toggleTriggerRule(ruleCode: string, isActive: boolean) {
  const db = await requireDb();
  await db.update(assessmentTriggerRules)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(assessmentTriggerRules.ruleCode, ruleCode));
  return { success: true, ruleCode, isActive };
}

// ══════════════════════════════════════════════════════════
// 2. Trigger Evaluation — 触发评估引擎
// ══════════════════════════════════════════════════════════

/**
 * Evaluate whether an employee should be triggered for assessment.
 * Called by lifecycle events (onboarding, transfer, etc.) or scheduled checks.
 */
export async function evaluateTrigger(params: {
  employeeId: number;
  triggerType: string;
  positionKey: string;
  currentLevel?: string;
  lifecycleStage?: string;
  triggerData: Record<string, unknown>;
}) {
  const db = await requireDb();
  const { employeeId, triggerType, positionKey, currentLevel, lifecycleStage, triggerData } = params;

  // Find matching active rules
  const rules = await db.select().from(assessmentTriggerRules)
    .where(and(
      eq(assessmentTriggerRules.triggerType, triggerType as typeof assessmentTriggerRules.triggerType.enumValues[number]),
      eq(assessmentTriggerRules.isActive, true),
    ))
    .orderBy(desc(assessmentTriggerRules.priority))
    .limit(10);

  if (rules.length === 0) {
    log.info({ employeeId, triggerType }, "no active rules for trigger type");
    return { triggered: false, reason: "no_matching_rules" };
  }

  // Use highest priority matching rule
  const rule = rules[0];

  // Check if applicable to this position
  const applicable = rule.applicablePositions as string[] | null;
  if (applicable && applicable.length > 0 && !applicable.includes(positionKey)) {
    log.info({ employeeId, ruleCode: rule.ruleCode, positionKey }, "position not in applicable list");
    return { triggered: false, reason: "position_not_applicable" };
  }

  // Check retry cooldown
  const recentLogs = await db.select().from(assessmentTriggerLog)
    .where(and(
      eq(assessmentTriggerLog.employeeId, employeeId),
      eq(assessmentTriggerLog.ruleCode, rule.ruleCode),
    ))
    .orderBy(desc(assessmentTriggerLog.createdAt))
    .limit(5);

  if (recentLogs.length > 0) {
    const lastTrigger = recentLogs[0];
    const cooldownMs = rule.retryCooldownDays * 24 * 60 * 60 * 1000;
    const lastTime = new Date(lastTrigger.createdAt).getTime();
    if (Date.now() - lastTime < cooldownMs) {
      log.info({ employeeId, ruleCode: rule.ruleCode }, "still in cooldown period");
      return { triggered: false, reason: "cooldown_active" };
    }

    // Check max retries
    const failedCount = recentLogs.filter(l => l.outcome === "failed").length;
    if (failedCount >= rule.maxRetries) {
      log.warn({ employeeId, ruleCode: rule.ruleCode, failedCount }, "max retries exceeded");
      return { triggered: false, reason: "max_retries_exceeded" };
    }
  }

  // Determine target level
  const targetLevel = rule.assessmentLevel ?? currentLevel ?? "L1";
  const retryNumber = recentLogs.filter(l => l.outcome === "failed").length;

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + rule.gracePeriodDays);
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  // Create trigger log entry
  const [logEntry] = await db.insert(assessmentTriggerLog).values({
    employeeId,
    ruleId: rule.id,
    ruleCode: rule.ruleCode,
    triggerType,
    triggerData,
    positionKey,
    currentLevel: currentLevel ?? null,
    targetLevel,
    lifecycleStage: lifecycleStage ?? null,
    dueDate: dueDateStr,
    outcome: "pending",
  } as InsertAssessmentTriggerLogEntry).returning();

  let workflowId: number | undefined;
  let sessionId: number | undefined;

  // Create workflow or single session
  if (rule.isMultiRound) {
    const workflow = await createUpgradeWorkflow({
      employeeId,
      triggerRuleId: rule.id,
      triggerLogId: logEntry.id,
      positionKey,
      targetLevel,
      purpose: mapTriggerToPurpose(triggerType),
      retryNumber,
      lifecycleStage,
      deadline: dueDateStr,
    });
    workflowId = workflow.id;

    await db.update(assessmentTriggerLog)
      .set({ workflowId: workflow.id })
      .where(eq(assessmentTriggerLog.id, logEntry.id));
  }

  log.info({
    employeeId, ruleCode: rule.ruleCode, triggerType,
    targetLevel, isMultiRound: rule.isMultiRound, workflowId,
  }, "assessment triggered");

  return {
    triggered: true,
    ruleCode: rule.ruleCode,
    triggerLogId: logEntry.id,
    workflowId,
    sessionId,
    targetLevel,
    dueDate: dueDateStr,
    isMultiRound: rule.isMultiRound,
  };
}

function mapTriggerToPurpose(triggerType: string): string {
  const map: Record<string, string> = {
    onboarding: "onboarding",
    probation_end: "onboarding",
    position_transfer: "transfer",
    skill_upgrade_request: "upgrade",
    grade_promotion: "upgrade",
    points_below_threshold: "remedial",
    points_below_peers: "remedial",
    consecutive_low_kpi: "remedial",
    cert_expiry: "revalidation",
    periodic_revalidation: "revalidation",
    manual: "revalidation",
  };
  return map[triggerType] ?? "revalidation";
}

// ══════════════════════════════════════════════════════════
// 3. Multi-Round Workflow — 多轮测评工作流
// ══════════════════════════════════════════════════════════

/**
 * Create a multi-round upgrade/transfer workflow.
 * Default rounds: 笔试(40%) → 实操(30%) → 面试评审(30%)
 */
export async function createUpgradeWorkflow(params: {
  employeeId: number;
  triggerRuleId: number;
  triggerLogId: number;
  positionKey: string;
  targetLevel: string;
  purpose: string;
  retryNumber?: number;
  lifecycleStage?: string;
  deadline?: string;
}) {
  const db = await requireDb();

  // Default 3-round structure
  const totalRounds = 3;
  const roundWeights = { "1": 40, "2": 30, "3": 30 };

  const [workflow] = await db.insert(assessmentWorkflows).values({
    employeeId: params.employeeId,
    triggerRuleId: params.triggerRuleId,
    triggerLogId: params.triggerLogId,
    positionKey: params.positionKey,
    targetLevel: params.targetLevel,
    purpose: params.purpose,
    totalRounds,
    roundWeights,
    retryNumber: params.retryNumber ?? 0,
    lifecycleStageAtTrigger: params.lifecycleStage ?? null,
    deadline: params.deadline ?? null,
    scheduledStartDate: new Date().toISOString().slice(0, 10),
  } as InsertAssessmentWorkflow).returning();

  // Create the 3 rounds
  const rounds = [
    {
      workflowId: workflow.id,
      roundNumber: 1,
      roundType: "written_test" as const,
      roundName: `${params.targetLevel} 笔试考核`,
      passScore: "70.00",
      weight: 40,
      isMandatory: true,
    },
    {
      workflowId: workflow.id,
      roundNumber: 2,
      roundType: "practical_test" as const,
      roundName: `${params.targetLevel} 实操考核`,
      passScore: "70.00",
      weight: 30,
      isMandatory: true,
    },
    {
      workflowId: workflow.id,
      roundNumber: 3,
      roundType: "interview" as const,
      roundName: `${params.targetLevel} 面试评审`,
      passScore: "70.00",
      weight: 30,
      isMandatory: true,
      evaluationCriteria: [
        { criterion: "专业知识深度", weight: 30, maxScore: 100 },
        { criterion: "问题解决能力", weight: 25, maxScore: 100 },
        { criterion: "沟通表达能力", weight: 20, maxScore: 100 },
        { criterion: "团队协作意识", weight: 15, maxScore: 100 },
        { criterion: "职业素养", weight: 10, maxScore: 100 },
      ],
    },
  ];

  await db.insert(assessmentWorkflowRounds).values(rounds as InsertAssessmentWorkflowRound[]);

  log.info({
    workflowId: workflow.id, employeeId: params.employeeId,
    positionKey: params.positionKey, targetLevel: params.targetLevel,
  }, "upgrade workflow created with 3 rounds");

  return workflow;
}

export async function listWorkflows(opts?: {
  employeeId?: number;
  positionKey?: string;
  status?: string;
  purpose?: string;
  limit?: number;
}) {
  const db = await requireDb();
  let query = db.select().from(assessmentWorkflows);
  if (opts?.employeeId) {
    query = query.where(eq(assessmentWorkflows.employeeId, opts.employeeId)) as typeof query;
  }
  if (opts?.positionKey) {
    query = query.where(eq(assessmentWorkflows.positionKey, opts.positionKey)) as typeof query;
  }
  if (opts?.status) {
    query = query.where(eq(assessmentWorkflows.status, opts.status as typeof assessmentWorkflows.status.enumValues[number])) as typeof query;
  }
  if (opts?.purpose) {
    query = query.where(eq(assessmentWorkflows.purpose, opts.purpose)) as typeof query;
  }
  return query.orderBy(desc(assessmentWorkflows.createdAt)).limit(opts?.limit ?? 100);
}

export async function getWorkflowDetail(workflowId: number) {
  const db = await requireDb();
  const [workflow] = await db.select().from(assessmentWorkflows)
    .where(eq(assessmentWorkflows.id, workflowId)).limit(1);
  if (!workflow) return null;

  const rounds = await db.select().from(assessmentWorkflowRounds)
    .where(eq(assessmentWorkflowRounds.workflowId, workflowId))
    .orderBy(assessmentWorkflowRounds.roundNumber)
    .limit(10);

  return { ...workflow, rounds };
}

export async function updateRound(roundId: number, updates: {
  status?: string;
  score?: string;
  panelists?: Array<{ userId: number; name: string; role: string; score?: number; feedback?: string }>;
  evaluationCriteria?: Array<{ criterion: string; weight: number; maxScore: number; actualScore?: number }>;
  scheduledDate?: string;
  scheduledTime?: string;
  location?: string;
  sessionId?: number;
  paperId?: number;
  notes?: string;
}) {
  const db = await requireDb();
  const updateData: Record<string, unknown> = {};
  if (updates.status) updateData.status = updates.status;
  if (updates.score !== undefined) updateData.score = updates.score;
  if (updates.panelists) updateData.panelists = updates.panelists;
  if (updates.evaluationCriteria) updateData.evaluationCriteria = updates.evaluationCriteria;
  if (updates.scheduledDate) updateData.scheduledDate = updates.scheduledDate;
  if (updates.scheduledTime) updateData.scheduledTime = updates.scheduledTime;
  if (updates.location) updateData.location = updates.location;
  if (updates.sessionId) updateData.sessionId = updates.sessionId;
  if (updates.paperId) updateData.paperId = updates.paperId;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  if (updates.status === "passed" || updates.status === "failed") {
    updateData.completedAt = new Date();
  }
  if (updates.status === "in_progress" && !updateData.startedAt) {
    updateData.startedAt = new Date();
  }

  await db.update(assessmentWorkflowRounds)
    .set(updateData as Partial<InsertAssessmentWorkflowRound>)
    .where(eq(assessmentWorkflowRounds.id, roundId));

  return { success: true };
}

/**
 * Complete a round and advance workflow.
 * If all mandatory rounds passed → workflow passed.
 * If any mandatory round failed → workflow failed → apply consequences.
 */
export async function completeRound(workflowId: number, roundNumber: number, result: {
  score: number;
  passed: boolean;
  notes?: string;
  decidedBy?: number;
}) {
  const db = await requireDb();

  // Update round
  const [round] = await db.select().from(assessmentWorkflowRounds)
    .where(and(
      eq(assessmentWorkflowRounds.workflowId, workflowId),
      eq(assessmentWorkflowRounds.roundNumber, roundNumber),
    )).limit(1);

  if (!round) throw new Error(`Round ${roundNumber} not found for workflow ${workflowId}`);

  await db.update(assessmentWorkflowRounds)
    .set({
      status: result.passed ? "passed" : "failed",
      score: String(result.score),
      completedAt: new Date(),
      notes: result.notes ?? null,
    } as Partial<InsertAssessmentWorkflowRound>)
    .where(eq(assessmentWorkflowRounds.id, round.id));

  // Get all rounds
  const allRounds = await db.select().from(assessmentWorkflowRounds)
    .where(eq(assessmentWorkflowRounds.workflowId, workflowId))
    .orderBy(assessmentWorkflowRounds.roundNumber).limit(10);

  const [workflow] = await db.select().from(assessmentWorkflows)
    .where(eq(assessmentWorkflows.id, workflowId)).limit(1);

  // If mandatory round failed → whole workflow fails
  if (!result.passed && round.isMandatory) {
    const overallScore = calculateOverallScore(allRounds, workflow.roundWeights as Record<string, number>);
    await db.update(assessmentWorkflows)
      .set({
        status: "failed",
        overallScore: String(overallScore),
        finalDecision: "failed",
        decidedBy: result.decidedBy ?? null,
        decidedAt: new Date(),
        completedAt: new Date(),
        updatedAt: new Date(),
      } as Partial<InsertAssessmentWorkflow>)
      .where(eq(assessmentWorkflows.id, workflowId));

    // Apply failure consequences
    await applyWorkflowConsequences(workflowId);

    log.warn({ workflowId, roundNumber, score: result.score }, "workflow failed — mandatory round not passed");
    return { workflowStatus: "failed", overallScore, consequencesApplied: true };
  }

  // Check if all rounds are complete
  const completedRounds = allRounds.filter(r =>
    r.status === "passed" || r.status === "failed" || r.status === "waived"
  );

  if (completedRounds.length >= allRounds.length) {
    // All rounds done — check if all mandatory passed
    const allMandatoryPassed = allRounds.every(r =>
      !r.isMandatory || r.status === "passed" || r.status === "waived"
    );
    const overallScore = calculateOverallScore(allRounds, workflow.roundWeights as Record<string, number>);

    const finalStatus = allMandatoryPassed ? "passed" : "failed";
    await db.update(assessmentWorkflows)
      .set({
        status: finalStatus,
        overallScore: String(overallScore),
        finalDecision: finalStatus,
        decidedBy: result.decidedBy ?? null,
        decidedAt: new Date(),
        completedAt: new Date(),
        updatedAt: new Date(),
      } as Partial<InsertAssessmentWorkflow>)
      .where(eq(assessmentWorkflows.id, workflowId));

    if (finalStatus === "failed") {
      await applyWorkflowConsequences(workflowId);
    }

    // Update trigger log
    if (workflow.triggerLogId) {
      await db.update(assessmentTriggerLog)
        .set({ outcome: finalStatus, outcomeAt: new Date() } as Partial<InsertAssessmentTriggerLogEntry>)
        .where(eq(assessmentTriggerLog.id, workflow.triggerLogId));
    }

    log.info({ workflowId, finalStatus, overallScore }, "workflow completed");
    return { workflowStatus: finalStatus, overallScore, consequencesApplied: finalStatus === "failed" };
  }

  // Advance to next round
  const nextRound = roundNumber + 1;
  await db.update(assessmentWorkflows)
    .set({ currentRound: nextRound, status: "round_completed", updatedAt: new Date() } as Partial<InsertAssessmentWorkflow>)
    .where(eq(assessmentWorkflows.id, workflowId));

  return { workflowStatus: "round_completed", nextRound };
}

function calculateOverallScore(rounds: AssessmentWorkflowRound[], weights: Record<string, number>): number {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const r of rounds) {
    const w = weights[String(r.roundNumber)] ?? 0;
    const s = parseFloat(r.score!) || 0;
    if (r.status !== "waived") {
      weightedSum += s * w;
      totalWeight += w;
    }
  }
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
}

// ══════════════════════════════════════════════════════════
// 4. Consequence Enforcement — 后果执行
// ══════════════════════════════════════════════════════════

/**
 * Apply consequences when a workflow/assessment fails.
 * Reads failure_consequences from trigger rule.
 */
async function applyWorkflowConsequences(workflowId: number) {
  const db = await requireDb();

  const [workflow] = await db.select().from(assessmentWorkflows)
    .where(eq(assessmentWorkflows.id, workflowId)).limit(1);
  if (!workflow || !workflow.triggerRuleId) return;

  const [rule] = await db.select().from(assessmentTriggerRules)
    .where(eq(assessmentTriggerRules.id, workflow.triggerRuleId)).limit(1);
  if (!rule) return;

  const consequences = (rule.failureConsequences ?? []) as Array<{
    type: string; durationDays?: number; toLevelDelta?: number; description?: string;
  }>;
  const today = new Date().toISOString().slice(0, 10);

  for (const c of consequences) {
    let endDate: string | null = null;
    if (c.durationDays) {
      const end = new Date();
      end.setDate(end.getDate() + c.durationDays);
      endDate = end.toISOString().slice(0, 10);
    }

    await db.insert(skillEnforcementActions).values({
      employeeId: workflow.employeeId,
      triggerLogId: workflow.triggerLogId ?? null,
      workflowId,
      enforcementType: c.type as typeof skillEnforcementActions.enforcementType.enumValues[number],
      description: c.description ?? `${c.type} enforcement`,
      enforcementData: {
        triggerRuleCode: rule.ruleCode,
        positionKey: workflow.positionKey,
        targetLevel: workflow.targetLevel,
        toLevelDelta: c.toLevelDelta,
      },
      startDate: today,
      endDate,
    } as InsertSkillEnforcementAction);

    log.info({
      employeeId: workflow.employeeId,
      enforcementType: c.type,
      durationDays: c.durationDays,
    }, "enforcement action applied");
  }

  // Mark trigger log
  if (workflow.triggerLogId) {
    await db.update(assessmentTriggerLog)
      .set({ enforcementApplied: true } as Partial<InsertAssessmentTriggerLogEntry>)
      .where(eq(assessmentTriggerLog.id, workflow.triggerLogId));
  }
}

export async function listEnforcements(opts?: {
  employeeId?: number;
  status?: string;
  enforcementType?: string;
  limit?: number;
}) {
  const db = await requireDb();
  let query = db.select().from(skillEnforcementActions);
  if (opts?.employeeId) {
    query = query.where(eq(skillEnforcementActions.employeeId, opts.employeeId)) as typeof query;
  }
  if (opts?.status) {
    query = query.where(eq(skillEnforcementActions.status, opts.status as typeof skillEnforcementActions.status.enumValues[number])) as typeof query;
  }
  if (opts?.enforcementType) {
    query = query.where(eq(skillEnforcementActions.enforcementType, opts.enforcementType as typeof skillEnforcementActions.enforcementType.enumValues[number])) as typeof query;
  }
  return query.orderBy(desc(skillEnforcementActions.createdAt)).limit(opts?.limit ?? 100);
}

export async function liftEnforcement(enforcementId: number, params: {
  liftedBy: number;
  reason: string;
  reassessmentPassed?: boolean;
  reassessmentSessionId?: number;
}) {
  const db = await requireDb();
  await db.update(skillEnforcementActions)
    .set({
      status: "lifted",
      liftedAt: new Date(),
      liftedBy: params.liftedBy,
      liftedReason: params.reason,
      reassessmentPassed: params.reassessmentPassed ?? null,
      reassessmentSessionId: params.reassessmentSessionId ?? null,
      updatedAt: new Date(),
    } as Partial<InsertSkillEnforcementAction>)
    .where(eq(skillEnforcementActions.id, enforcementId));

  log.info({ enforcementId, liftedBy: params.liftedBy }, "enforcement lifted");
  return { success: true };
}

export async function getMyEnforcements(employeeId: number) {
  const db = await requireDb();
  return db.select().from(skillEnforcementActions)
    .where(and(
      eq(skillEnforcementActions.employeeId, employeeId),
      eq(skillEnforcementActions.status, "active"),
    ))
    .orderBy(desc(skillEnforcementActions.createdAt))
    .limit(50);
}

// ══════════════════════════════════════════════════════════
// 5. Trigger Log — 触发记录
// ══════════════════════════════════════════════════════════

export async function listTriggerLogs(opts?: {
  employeeId?: number;
  triggerType?: string;
  outcome?: string;
  limit?: number;
}) {
  const db = await requireDb();
  let query = db.select().from(assessmentTriggerLog);
  if (opts?.employeeId) {
    query = query.where(eq(assessmentTriggerLog.employeeId, opts.employeeId)) as typeof query;
  }
  if (opts?.triggerType) {
    query = query.where(eq(assessmentTriggerLog.triggerType, opts.triggerType)) as typeof query;
  }
  if (opts?.outcome) {
    query = query.where(eq(assessmentTriggerLog.outcome, opts.outcome)) as typeof query;
  }
  return query.orderBy(desc(assessmentTriggerLog.createdAt)).limit(opts?.limit ?? 100);
}

export async function updateTriggerLogOutcome(logId: number, outcome: string) {
  const db = await requireDb();
  await db.update(assessmentTriggerLog)
    .set({ outcome, outcomeAt: new Date() } as Partial<InsertAssessmentTriggerLogEntry>)
    .where(eq(assessmentTriggerLog.id, logId));
  return { success: true };
}

// ══════════════════════════════════════════════════════════
// 6. Position Benchmarks — 岗位基准分
// ══════════════════════════════════════════════════════════

export async function listBenchmarks(opts?: { positionKey?: string; period?: string }) {
  const db = await requireDb();
  let query = db.select().from(positionBenchmarkScores);
  if (opts?.positionKey) {
    query = query.where(eq(positionBenchmarkScores.positionKey, opts.positionKey)) as typeof query;
  }
  if (opts?.period) {
    query = query.where(eq(positionBenchmarkScores.period, opts.period)) as typeof query;
  }
  return query.orderBy(positionBenchmarkScores.positionKey).limit(200);
}

export async function upsertBenchmark(data: {
  positionKey: string;
  period: string;
  avgPoints?: number;
  avgKpiScore?: number;
  minAcceptablePoints?: number;
  peerThreshold10Pct?: number;
  employeeCount?: number;
  isManualOverride?: boolean;
}) {
  const db = await requireDb();
  const existing = await db.select({ id: positionBenchmarkScores.id })
    .from(positionBenchmarkScores)
    .where(and(
      eq(positionBenchmarkScores.positionKey, data.positionKey),
      eq(positionBenchmarkScores.period, data.period),
    )).limit(1);

  if (existing.length > 0) {
    await db.update(positionBenchmarkScores)
      .set({ ...data, updatedAt: new Date() } as Partial<InsertPositionBenchmarkScore>)
      .where(eq(positionBenchmarkScores.id, existing[0].id));
    return { success: true, action: "updated" };
  }

  await db.insert(positionBenchmarkScores).values(data as InsertPositionBenchmarkScore);
  return { success: true, action: "created" };
}

// ══════════════════════════════════════════════════════════
// 7. Dashboard Stats — 统计概览
// ══════════════════════════════════════════════════════════

export async function getDashboardStats() {
  const db = await requireDb();

  const [ruleCount] = await db.select({ count: sql<number>`count(*)` })
    .from(assessmentTriggerRules)
    .where(eq(assessmentTriggerRules.isActive, true));

  const [workflowCount] = await db.select({ count: sql<number>`count(*)` })
    .from(assessmentWorkflows);

  const workflowsByStatus = await db.select({
    status: assessmentWorkflows.status,
    count: sql<number>`count(*)`,
  }).from(assessmentWorkflows)
    .groupBy(assessmentWorkflows.status)
    .limit(10);

  const [activeEnforcements] = await db.select({ count: sql<number>`count(*)` })
    .from(skillEnforcementActions)
    .where(eq(skillEnforcementActions.status, "active"));

  const enforcementsByType = await db.select({
    type: skillEnforcementActions.enforcementType,
    count: sql<number>`count(*)`,
  }).from(skillEnforcementActions)
    .where(eq(skillEnforcementActions.status, "active"))
    .groupBy(skillEnforcementActions.enforcementType)
    .limit(10);

  const recentTriggers = await db.select().from(assessmentTriggerLog)
    .orderBy(desc(assessmentTriggerLog.createdAt))
    .limit(10);

  return {
    activeRules: Number(ruleCount?.count ?? 0),
    totalWorkflows: Number(workflowCount?.count ?? 0),
    workflowsByStatus,
    activeEnforcements: Number(activeEnforcements?.count ?? 0),
    enforcementsByType,
    recentTriggers,
  };
}
