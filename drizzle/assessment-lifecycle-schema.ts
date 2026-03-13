/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT Assessment Lifecycle & Trigger Rules Schema               ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  CEO指令: 设定进行测试评估的条件：                               ║
 * ║    - 转正/入职/岗位调整 → 自动触发测评                            ║
 * ║    - 积分低于岗位阈值 / 相近岗位10% / 连续三月 → 降级测评         ║
 * ║    - 技能等级提升/岗位调整/级别提升 → 多轮测试+面试               ║
 * ║    - 失败后果: 恢复六天制/恢复原技能等级/原岗处罚                 ║
 * ║                                                                  ║
 * ║  Tables:                                                         ║
 * ║    1. assessment_trigger_rules    — 测评触发规则配置               ║
 * ║    2. assessment_workflows        — 多轮测评+面试工作流           ║
 * ║    3. assessment_workflow_rounds  — 工作流各轮次                   ║
 * ║    4. assessment_trigger_log      — 触发事件记录                   ║
 * ║    5. skill_enforcement_actions   — 后果执行记录                   ║
 * ║    6. position_benchmark_scores   — 岗位基准分配置                 ║
 * ║                                                                  ║
 * ║  Integrates with:                                                 ║
 * ║    - skill_assessment_sessions (考试)                             ║
 * ║    - skill_level_certs (证书)                                     ║
 * ║    - lifecycle_journeys (G1-G20)                                  ║
 * ║    - employee_points (积分)                                       ║
 * ║    - workstation_presets (工作制度)                                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  decimal,
  text,
  boolean,
  timestamp,
  json,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────

export const triggerTypeEnum = pgEnum("assessment_trigger_type", [
  "onboarding",              // 入职 — G2入职启航
  "probation_end",           // 转正 — G7转正蜕变
  "position_transfer",       // 岗位调整
  "skill_upgrade_request",   // 技能等级提升申请
  "grade_promotion",         // 级别提升 (薪资等级)
  "points_below_threshold",  // 积分低于岗位阈值
  "points_below_peers",      // 积分低于相近岗位10%
  "consecutive_low_kpi",     // 连续三月KPI不达标
  "cert_expiry",             // 证书到期
  "periodic_revalidation",   // 定期复评
  "manual",                  // 管理员手动触发
]);

export const workflowStatusEnum = pgEnum("assessment_workflow_status", [
  "pending",         // 待开始
  "in_progress",     // 进行中
  "round_completed", // 当前轮次完成
  "passed",          // 全部通过
  "failed",          // 未通过
  "cancelled",       // 已取消
  "on_hold",         // 暂停
]);

export const roundTypeEnum = pgEnum("assessment_round_type", [
  "written_test",    // 笔试
  "practical_test",  // 实操考试
  "interview",       // 面试
  "panel_review",    // 评审委员会
  "probation_eval",  // 试用期评估
]);

export const roundStatusEnum = pgEnum("assessment_round_status", [
  "pending",      // 待安排
  "scheduled",    // 已排期
  "in_progress",  // 进行中
  "passed",       // 通过
  "failed",       // 未通过
  "waived",       // 免考
  "cancelled",    // 已取消
]);

export const enforcementTypeEnum = pgEnum("skill_enforcement_type", [
  "revert_six_day_week",       // 恢复六天工作制
  "revert_skill_level",        // 恢复原技能等级
  "position_penalty",          // 原岗处罚
  "salary_grade_freeze",       // 薪资等级冻结
  "benefit_revocation",        // 福利撤销
  "probation_extension",       // 试用期延长
  "mandatory_training",        // 强制培训
  "position_downgrade_warning",// 岗位降级警告
]);

export const enforcementStatusEnum = pgEnum("enforcement_status", [
  "active",      // 执行中
  "lifted",      // 已解除
  "expired",     // 已过期
  "appealed",    // 申诉中
]);

// ── Table 1: Assessment Trigger Rules — 测评触发规则 ──────

export const assessmentTriggerRules = pgTable("assessment_trigger_rules", {
  id: serial("id").primaryKey(),
  /** Rule code for programmatic reference */
  ruleCode: varchar("rule_code", { length: 80 }).notNull().unique(),
  /** Rule display name */
  ruleName: varchar("rule_name", { length: 200 }).notNull(),
  ruleNameEn: varchar("rule_name_en", { length: 200 }),
  /** Trigger type */
  triggerType: triggerTypeEnum("trigger_type").notNull(),
  /** Description of when this rule fires */
  description: text("description"),
  /**
   * Applicable position keys (null = all positions)
   * ["mechanical_assembly", "electrical_engineer"] etc.
   */
  applicablePositions: json("applicable_positions").$type<string[] | null>(),
  /**
   * Trigger conditions — JSON config
   * Examples:
   *   { lifecycleStage: "G7" }                              // probation end
   *   { pointsThresholdPercent: 90 }                        // 10% below peers
   *   { consecutiveMonths: 3, kpiThreshold: 75 }            // 3 months low KPI
   *   { minDaysInPosition: 90 }                             // 90 days before eligible
   */
  conditions: json("conditions").$type<Record<string, unknown>>().notNull(),
  /** What level to assess (null = current level of employee) */
  assessmentLevel: varchar("assessment_level", { length: 10 }),
  /** Whether this creates a multi-round workflow (upgrade/promotion) or single test */
  isMultiRound: boolean("is_multi_round").notNull().default(false),
  /** Workflow template to use for multi-round (null = single paper test) */
  workflowTemplateId: integer("workflow_template_id"),
  /**
   * Consequences on failure — JSON array
   * [{ type: "revert_six_day_week", durationDays: 90 },
   *  { type: "revert_skill_level", toLevelDelta: -1 }]
   */
  failureConsequences: json("failure_consequences").$type<Array<{
    type: string;
    durationDays?: number;
    toLevelDelta?: number;
    description?: string;
  }>>().notNull().default([]),
  /** Retry policy: how many times can retake, and cooldown days between */
  maxRetries: integer("max_retries").notNull().default(2),
  retryCooldownDays: integer("retry_cooldown_days").notNull().default(30),
  /** Grace period: days after trigger before assessment is due */
  gracePeriodDays: integer("grace_period_days").notNull().default(14),
  /** Priority for conflicting rules (higher = takes precedence) */
  priority: integer("priority").notNull().default(50),
  /** Whether this rule is active */
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_trigger_rule_type").on(table.triggerType),
  index("idx_trigger_rule_active").on(table.isActive),
]);

// ── Table 2: Assessment Workflows — 多轮测评工作流 ───────

export const assessmentWorkflows = pgTable("assessment_workflows", {
  id: serial("id").primaryKey(),
  /** Employee undergoing assessment */
  employeeId: integer("employee_id").notNull(),
  /** Trigger rule that created this workflow */
  triggerRuleId: integer("trigger_rule_id"),
  /** Trigger log entry */
  triggerLogId: integer("trigger_log_id"),
  /** Position being assessed for */
  positionKey: varchar("position_key", { length: 80 }).notNull(),
  /** Target skill level */
  targetLevel: varchar("target_level", { length: 10 }).notNull(),
  /** Purpose: upgrade / revalidation / remedial / onboarding / transfer */
  purpose: varchar("purpose", { length: 30 }).notNull(),
  /** Current round index (1-based) */
  currentRound: integer("current_round").notNull().default(1),
  /** Total rounds planned */
  totalRounds: integer("total_rounds").notNull(),
  /** Overall status */
  status: workflowStatusEnum("status").notNull().default("pending"),
  /** Overall score (weighted avg of all rounds) */
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
  /**
   * Round weights for final score
   * { "1": 40, "2": 30, "3": 30 } — written 40%, practical 30%, interview 30%
   */
  roundWeights: json("round_weights").$type<Record<string, number>>().notNull(),
  /** Final decision */
  finalDecision: varchar("final_decision", { length: 20 }),  // passed / failed / deferred
  /** Decision made by */
  decidedBy: integer("decided_by"),
  decidedAt: timestamp("decided_at"),
  decisionNotes: text("decision_notes"),
  /** Timeline */
  scheduledStartDate: varchar("scheduled_start_date", { length: 10 }),
  deadline: varchar("deadline", { length: 10 }),
  completedAt: timestamp("completed_at"),
  /** Retry count (for remedial assessments) */
  retryNumber: integer("retry_number").notNull().default(0),
  /** Lifecycle stage at trigger time */
  lifecycleStageAtTrigger: varchar("lifecycle_stage_at_trigger", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_workflow_employee").on(table.employeeId),
  index("idx_workflow_position").on(table.positionKey),
  index("idx_workflow_status").on(table.status),
  index("idx_workflow_purpose").on(table.purpose),
]);

// ── Table 3: Workflow Rounds — 工作流各轮次 ──────────────

export const assessmentWorkflowRounds = pgTable("assessment_workflow_rounds", {
  id: serial("id").primaryKey(),
  /** FK → assessment_workflows.id */
  workflowId: integer("workflow_id").notNull(),
  /** Round number (1, 2, 3...) */
  roundNumber: integer("round_number").notNull(),
  /** Round type */
  roundType: roundTypeEnum("round_type").notNull(),
  /** Display name */
  roundName: varchar("round_name", { length: 200 }).notNull(),
  /** Status */
  status: roundStatusEnum("round_status").notNull().default("pending"),
  /** FK → skill_assessment_sessions.id (for test rounds) */
  sessionId: integer("session_id"),
  /** FK → skill_assessment_papers.id (for test rounds) */
  paperId: integer("paper_id"),
  /** Score for this round */
  score: decimal("score", { precision: 5, scale: 2 }),
  /** Pass threshold for this round */
  passScore: decimal("pass_score", { precision: 5, scale: 2 }).notNull(),
  /** Weight in overall score */
  weight: integer("weight").notNull().default(100),
  /**
   * Interviewers / panelists (for interview/panel rounds)
   * [{ userId: 5, name: "王经理", role: "部门经理" }]
   */
  panelists: json("panelists").$type<Array<{
    userId: number;
    name: string;
    role: string;
    score?: number;
    feedback?: string;
  }>>(),
  /** Interview / panel evaluation criteria */
  evaluationCriteria: json("evaluation_criteria").$type<Array<{
    criterion: string;
    weight: number;
    maxScore: number;
    actualScore?: number;
  }>>(),
  /** Scheduling */
  scheduledDate: varchar("scheduled_date", { length: 10 }),
  scheduledTime: varchar("scheduled_time", { length: 5 }),  // HH:mm
  location: varchar("location", { length: 200 }),
  /** Timing */
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  /** Notes / feedback */
  notes: text("notes"),
  /** Whether this round must pass to proceed */
  isMandatory: boolean("is_mandatory").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_round_workflow").on(table.workflowId),
  index("idx_round_status").on(table.status),
  unique("round_workflow_number_uniq").on(table.workflowId, table.roundNumber),
]);

// ── Table 4: Assessment Trigger Log — 触发事件记录 ───────

export const assessmentTriggerLog = pgTable("assessment_trigger_log", {
  id: serial("id").primaryKey(),
  /** Employee affected */
  employeeId: integer("employee_id").notNull(),
  /** Rule that triggered */
  ruleId: integer("rule_id").notNull(),
  ruleCode: varchar("rule_code", { length: 80 }).notNull(),
  /** Trigger type (denormalized) */
  triggerType: varchar("trigger_type", { length: 50 }).notNull(),
  /** What caused the trigger — snapshot of triggering data */
  triggerData: json("trigger_data").$type<Record<string, unknown>>().notNull(),
  /** Resulting workflow or session */
  workflowId: integer("workflow_id"),
  sessionId: integer("session_id"),
  /** Outcome */
  outcome: varchar("outcome", { length: 30 }),  // pending / passed / failed / cancelled / waived
  outcomeAt: timestamp("outcome_at"),
  /** Position at time of trigger */
  positionKey: varchar("position_key", { length: 80 }),
  currentLevel: varchar("current_level", { length: 10 }),
  targetLevel: varchar("target_level", { length: 10 }),
  /** Lifecycle stage at trigger */
  lifecycleStage: varchar("lifecycle_stage", { length: 10 }),
  /** Due date for completion */
  dueDate: varchar("due_date", { length: 10 }),
  /** Whether enforcement was applied */
  enforcementApplied: boolean("enforcement_applied").notNull().default(false),
  /** Notes */
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_trigger_log_employee").on(table.employeeId),
  index("idx_trigger_log_rule").on(table.ruleId),
  index("idx_trigger_log_type").on(table.triggerType),
  index("idx_trigger_log_outcome").on(table.outcome),
]);

// ── Table 5: Skill Enforcement Actions — 后果执行 ────────

export const skillEnforcementActions = pgTable("skill_enforcement_actions", {
  id: serial("id").primaryKey(),
  /** Employee affected */
  employeeId: integer("employee_id").notNull(),
  /** Source trigger log */
  triggerLogId: integer("trigger_log_id"),
  /** Source workflow (if from workflow failure) */
  workflowId: integer("workflow_id"),
  /** Enforcement type */
  enforcementType: enforcementTypeEnum("enforcement_type").notNull(),
  /** Status */
  status: enforcementStatusEnum("enforcement_status").notNull().default("active"),
  /** Details of enforcement */
  description: text("description").notNull(),
  /**
   * Enforcement-specific data
   * e.g., { previousLevel: "L3", revertedTo: "L2" }
   *       { previousSchedule: "five_day", revertedTo: "six_day" }
   *       { trainingPlanId: 123 }
   */
  enforcementData: json("enforcement_data").$type<Record<string, unknown>>().notNull(),
  /** Duration */
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }),       // null = until resolved
  /** Resolution */
  liftedAt: timestamp("lifted_at"),
  liftedBy: integer("lifted_by"),
  liftedReason: text("lifted_reason"),
  /** Whether reassessment passed to lift */
  reassessmentPassed: boolean("reassessment_passed"),
  reassessmentSessionId: integer("reassessment_session_id"),
  /** Issued by */
  issuedBy: integer("issued_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_enforcement_employee").on(table.employeeId),
  index("idx_enforcement_type").on(table.enforcementType),
  index("idx_enforcement_status").on(table.status),
]);

// ── Table 6: Position Benchmark Scores — 岗位基准分 ─────

export const positionBenchmarkScores = pgTable("position_benchmark_scores", {
  id: serial("id").primaryKey(),
  /** Position key */
  positionKey: varchar("position_key", { length: 80 }).notNull(),
  /** Period (YYYY-MM) */
  period: varchar("period", { length: 7 }).notNull(),
  /** Average points for this position */
  avgPoints: decimal("avg_points", { precision: 10, scale: 2 }),
  /** Average KPI score */
  avgKpiScore: decimal("avg_kpi_score", { precision: 5, scale: 2 }),
  /** Minimum acceptable points (below → trigger) */
  minAcceptablePoints: integer("min_acceptable_points"),
  /** 10% below peer threshold */
  peerThreshold10Pct: integer("peer_threshold_10pct"),
  /** Number of employees in this position */
  employeeCount: integer("employee_count").notNull().default(0),
  /** Auto-computed or manually set */
  isManualOverride: boolean("is_manual_override").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("benchmark_position_period_uniq").on(table.positionKey, table.period),
  index("idx_benchmark_position").on(table.positionKey),
  index("idx_benchmark_period").on(table.period),
]);

// ── Type Exports ──────────────────────────────────────────

export type AssessmentTriggerRule = InferSelectModel<typeof assessmentTriggerRules>;
export type InsertAssessmentTriggerRule = InferInsertModel<typeof assessmentTriggerRules>;
export type AssessmentWorkflow = InferSelectModel<typeof assessmentWorkflows>;
export type InsertAssessmentWorkflow = InferInsertModel<typeof assessmentWorkflows>;
export type AssessmentWorkflowRound = InferSelectModel<typeof assessmentWorkflowRounds>;
export type InsertAssessmentWorkflowRound = InferInsertModel<typeof assessmentWorkflowRounds>;
export type AssessmentTriggerLogEntry = InferSelectModel<typeof assessmentTriggerLog>;
export type InsertAssessmentTriggerLogEntry = InferInsertModel<typeof assessmentTriggerLog>;
export type SkillEnforcementAction = InferSelectModel<typeof skillEnforcementActions>;
export type InsertSkillEnforcementAction = InferInsertModel<typeof skillEnforcementActions>;
export type PositionBenchmarkScore = InferSelectModel<typeof positionBenchmarkScores>;
export type InsertPositionBenchmarkScore = InferInsertModel<typeof positionBenchmarkScores>;
