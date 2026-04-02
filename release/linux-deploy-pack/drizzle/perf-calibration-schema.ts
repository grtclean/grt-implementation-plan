/**
 * Performance Calibration & Incentive Schema — 智能绩效校准与激励体系
 *
 * 7 tables:
 * 1. perf_scoring_weight_configs — Configurable dimension weights per dept/role/BU
 * 2. perf_composite_scores — Unified evaluation record (AI + manual)
 * 3. perf_360_feedback — 360° feedback collection
 * 4. perf_forced_distribution_configs — Bell curve enforcement
 * 5. perf_calibration_sessions — CEO/management calibration meetings
 * 6. perf_calibration_adjustments — Individual grade adjustments during calibration
 * 7. perf_incentive_catalog — Incentive types beyond base salary
 *
 * Integrates with: KPI Performance, AEI 4D Scoring, OKR, TSDCKL,
 *   Smart Payroll Engine (payroll_excellence_awards bridge)
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  text,
  timestamp,
  json,
  boolean,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────

export const compositeScoreStatusEnum = pgEnum("composite_score_status_enum", [
  "ai_scored",      // AI已评分
  "under_review",   // 待审核
  "calibrated",     // 已校准
  "finalized",      // 已定稿
  "locked",         // 已锁定
]);

export const feedbackRelationshipEnum = pgEnum("feedback_relationship_enum", [
  "self",             // 自评
  "manager",          // 上级
  "peer",             // 同级
  "subordinate",      // 下级
  "cross_functional", // 跨部门
]);

export const calibrationSessionStatusEnum = pgEnum("calibration_session_status_enum", [
  "draft",        // 草稿
  "in_progress",  // 进行中
  "completed",    // 已完成
  "locked",       // 已锁定
]);

export const incentiveCategoryEnum = pgEnum("incentive_category_enum", [
  "skill_premium",     // 技术津贴
  "project_bonus",     // 项目奖金
  "innovation_reward", // 创新奖励
  "team_incentive",    // 团队激励
  "retention_bonus",   // 留才奖金
  "referral_bonus",    // 推荐奖金
]);

export const incentiveCalcMethodEnum = pgEnum("incentive_calc_method_enum", [
  "fixed",       // 固定金额
  "percentage",  // 百分比
  "formula",     // 公式计算
]);

export const perfGradeEnum = pgEnum("perf_grade_enum", [
  "S", // 卓越 ≥90
  "A", // 优秀 ≥80
  "B", // 良好 ≥70
  "C", // 合格 ≥60
  "D", // 不合格 <60
]);

// ── Table 1: Scoring Weight Configs ──────────────────────

export const perfScoringWeightConfigs = pgTable("perf_scoring_weight_configs", {
  id: serial("id").primaryKey(),
  /** Scope identifiers — null = company default */
  department: varchar("department", { length: 100 }),
  role: varchar("role", { length: 50 }),
  buCode: varchar("bu_code", { length: 50 }),
  period: varchar("period", { length: 20 }),
  /** Weights — must sum to 100 */
  kpiWeight: decimal("kpi_weight", { precision: 5, scale: 2 }).notNull().default("30.00"),
  aeiWeight: decimal("aei_weight", { precision: 5, scale: 2 }).notNull().default("20.00"),
  okrWeight: decimal("okr_weight", { precision: 5, scale: 2 }).notNull().default("20.00"),
  competencyWeight: decimal("competency_weight", { precision: 5, scale: 2 }).notNull().default("15.00"),
  feedbackWeight: decimal("feedback_weight", { precision: 5, scale: 2 }).notNull().default("15.00"),
  /** Description / notes */
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_weight_config_scope").on(table.department, table.role, table.buCode),
]);

// ── Table 2: Composite Scores ────────────────────────────

export const perfCompositeScores = pgTable("perf_composite_scores", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  employeeName: varchar("employee_name", { length: 200 }),
  department: varchar("department", { length: 100 }),
  period: varchar("period", { length: 20 }).notNull(),
  /** AI-calculated composite score (0-100) */
  aiCompositeScore: decimal("ai_composite_score", { precision: 6, scale: 2 }),
  aiGrade: varchar("ai_grade", { length: 2 }),
  /** Final score after manual override / calibration */
  finalScore: decimal("final_score", { precision: 6, scale: 2 }),
  finalGrade: varchar("final_grade", { length: 2 }),
  /** Override tracking */
  overrideJustification: text("override_justification"),
  overrideBy: integer("override_by"),
  overrideAt: timestamp("override_at"),
  /** Detailed score breakdown */
  scoreBreakdownJson: json("score_breakdown_json"),
  /** Status workflow */
  status: compositeScoreStatusEnum("status").notNull().default("ai_scored"),
  /** Weight config used */
  weightConfigId: integer("weight_config_id"),
  /** Calibration session that finalized this score */
  calibrationSessionId: integer("calibration_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_composite_employee_period").on(table.employeeId, table.period),
  index("idx_composite_dept_period").on(table.department, table.period),
  index("idx_composite_status").on(table.status),
]);

// ── Table 3: 360° Feedback ───────────────────────────────

export const perf360Feedback = pgTable("perf_360_feedback", {
  id: serial("id").primaryKey(),
  targetEmployeeId: integer("target_employee_id").notNull(),
  targetEmployeeName: varchar("target_employee_name", { length: 200 }),
  reviewerEmployeeId: integer("reviewer_employee_id").notNull(),
  reviewerName: varchar("reviewer_name", { length: 200 }),
  relationship: feedbackRelationshipEnum("relationship").notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  /** Questionnaire responses (JSON array of {question, score, comment}) */
  questionnaire: json("questionnaire"),
  /** Overall score (1-100) */
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
  /** Free-text strengths/improvements */
  strengths: text("strengths"),
  improvements: text("improvements"),
  isAnonymous: boolean("is_anonymous").notNull().default(true),
  /** Status: pending | submitted | reviewed */
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_360_target_period").on(table.targetEmployeeId, table.period),
  index("idx_360_reviewer").on(table.reviewerEmployeeId),
]);

// ── Table 4: Forced Distribution Configs ─────────────────

export const perfForcedDistributionConfigs = pgTable("perf_forced_distribution_configs", {
  id: serial("id").primaryKey(),
  /** Scope — null = company default */
  department: varchar("department", { length: 100 }),
  buCode: varchar("bu_code", { length: 50 }),
  period: varchar("period", { length: 20 }),
  /** Max percentage per grade (must sum to 100) */
  gradeSMaxPct: decimal("grade_s_max_pct", { precision: 5, scale: 2 }).notNull().default("5.00"),
  gradeAMaxPct: decimal("grade_a_max_pct", { precision: 5, scale: 2 }).notNull().default("20.00"),
  gradeBMaxPct: decimal("grade_b_max_pct", { precision: 5, scale: 2 }).notNull().default("50.00"),
  gradeCMaxPct: decimal("grade_c_max_pct", { precision: 5, scale: 2 }).notNull().default("20.00"),
  gradeDMaxPct: decimal("grade_d_max_pct", { precision: 5, scale: 2 }).notNull().default("5.00"),
  /** Strict = must match exactly; non-strict = advisory */
  isStrict: boolean("is_strict").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_forced_dist_scope").on(table.department, table.buCode),
]);

// ── Table 5: Calibration Sessions ────────────────────────

export const perfCalibrationSessions = pgTable("perf_calibration_sessions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  /** Scope: company, department name, or BU code */
  scope: varchar("scope", { length: 100 }).notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  status: calibrationSessionStatusEnum("status").notNull().default("draft"),
  /** Snapshot of grade distribution at session start */
  distributionSnapshot: json("distribution_snapshot"),
  /** Final distribution after calibration */
  finalDistribution: json("final_distribution"),
  /** Participating managers */
  participants: json("participants"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_calibration_session_period").on(table.period),
  index("idx_calibration_session_status").on(table.status),
]);

// ── Table 6: Calibration Adjustments ─────────────────────

export const perfCalibrationAdjustments = pgTable("perf_calibration_adjustments", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  compositeScoreId: integer("composite_score_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  employeeName: varchar("employee_name", { length: 200 }),
  previousGrade: varchar("previous_grade", { length: 2 }).notNull(),
  newGrade: varchar("new_grade", { length: 2 }).notNull(),
  previousScore: decimal("previous_score", { precision: 6, scale: 2 }).notNull(),
  newScore: decimal("new_score", { precision: 6, scale: 2 }).notNull(),
  adjustmentReason: text("adjustment_reason").notNull(),
  adjustedBy: integer("adjusted_by").notNull(),
  adjustedByName: varchar("adjusted_by_name", { length: 200 }),
  /** If undone, the undo timestamp */
  undoneAt: timestamp("undone_at"),
  undoneBy: integer("undone_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_calibration_adj_session").on(table.sessionId),
  index("idx_calibration_adj_employee").on(table.employeeId),
]);

// ── Table 7: Incentive Catalog ───────────────────────────

export const perfIncentiveCatalog = pgTable("perf_incentive_catalog", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  category: incentiveCategoryEnum("category").notNull(),
  description: text("description"),
  calculationMethod: incentiveCalcMethodEnum("calculation_method").notNull().default("fixed"),
  /** Base amount in yuan (for fixed method) */
  baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).default("0.00"),
  /** Max amount cap in yuan */
  maxAmount: decimal("max_amount", { precision: 14, scale: 2 }),
  /** Formula expression (for formula method) */
  formula: text("formula"),
  /** Eligibility criteria (JSON) */
  eligibilityCriteria: json("eligibility_criteria"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_incentive_code").on(table.code),
  index("idx_incentive_category").on(table.category),
]);

// ── Type Exports ─────────────────────────────────────────

export type PerfScoringWeightConfig = InferSelectModel<typeof perfScoringWeightConfigs>;
export type NewPerfScoringWeightConfig = InferInsertModel<typeof perfScoringWeightConfigs>;

export type PerfCompositeScore = InferSelectModel<typeof perfCompositeScores>;
export type NewPerfCompositeScore = InferInsertModel<typeof perfCompositeScores>;

export type Perf360Feedback = InferSelectModel<typeof perf360Feedback>;
export type NewPerf360Feedback = InferInsertModel<typeof perf360Feedback>;

export type PerfForcedDistributionConfig = InferSelectModel<typeof perfForcedDistributionConfigs>;
export type NewPerfForcedDistributionConfig = InferInsertModel<typeof perfForcedDistributionConfigs>;

export type PerfCalibrationSession = InferSelectModel<typeof perfCalibrationSessions>;
export type NewPerfCalibrationSession = InferInsertModel<typeof perfCalibrationSessions>;

export type PerfCalibrationAdjustment = InferSelectModel<typeof perfCalibrationAdjustments>;
export type NewPerfCalibrationAdjustment = InferInsertModel<typeof perfCalibrationAdjustments>;

export type PerfIncentiveCatalogItem = InferSelectModel<typeof perfIncentiveCatalog>;
export type NewPerfIncentiveCatalogItem = InferInsertModel<typeof perfIncentiveCatalog>;
