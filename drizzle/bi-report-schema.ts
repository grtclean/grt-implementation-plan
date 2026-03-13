/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   BI Report Engine Schema — 综合报告平台                         ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. bi_report_periods        — 报告周期(周/月/季/年)           ║
 * ║    2. bi_department_metrics    — 部门聚合指标                    ║
 * ║    3. bi_individual_metrics    — 个人绩效指标                    ║
 * ║    4. bi_report_access_rules   — 报告授权规则                    ║
 * ║                                                                 ║
 * ║  Dimensions: 横向(跨部门) + 纵向(部门内) + 个体                  ║
 * ║  Periods:    weekly / monthly / quarterly / yearly               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  boolean,
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { users } from "./schema";

// ── Enums ──────────────────────────────────────────────

export const biPeriodTypeEnum = pgEnum("bi_period_type", [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const biReportStatusEnum = pgEnum("bi_report_status", [
  "draft",
  "generating",
  "published",
  "archived",
]);

export const biAccessLevelEnum = pgEnum("bi_access_level", [
  "view_summary",
  "view_detail",
  "view_individual",
  "manage",
]);

// ══════════════════════════════════════════════════════
// Table 1: bi_report_periods — 报告周期
// ══════════════════════════════════════════════════════

export const biReportPeriods = pgTable("bi_report_periods", {
  id: serial("id").primaryKey(),

  periodType: biPeriodTypeEnum("period_type").notNull(),
  /** e.g. "2026-W11", "2026-03", "2026-Q1", "2026" */
  periodLabel: varchar("period_label", { length: 20 }).notNull(),

  startDate: timestamp("start_date", { mode: "string" }).notNull(),
  endDate: timestamp("end_date", { mode: "string" }).notNull(),

  status: biReportStatusEnum("status").notNull().default("draft"),

  /** AI overall executive summary */
  executiveSummary: text("executive_summary"),

  generatedBy: integer("generated_by").references(() => users.id),
  generationTaskId: integer("generation_task_id"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("bi_report_periods_type_label_uniq").on(table.periodType, table.periodLabel),
  index("bi_report_periods_type_idx").on(table.periodType),
  index("bi_report_periods_status_idx").on(table.status),
]);

// ══════════════════════════════════════════════════════
// Table 2: bi_department_metrics — 部门聚合指标
//
// One row per department per report period.
// Supports both horizontal (cross-dept) and vertical
// (within-dept) analysis.
// ══════════════════════════════════════════════════════

export const biDepartmentMetrics = pgTable("bi_department_metrics", {
  id: serial("id").primaryKey(),

  reportPeriodId: integer("report_period_id").notNull().references(() => biReportPeriods.id),

  departmentCode: varchar("department_code", { length: 50 }).notNull(),
  departmentName: varchar("department_name", { length: 100 }).notNull(),
  departmentType: varchar("department_type", { length: 50 }),

  // ── Revenue & Target ──
  targetRevenue: decimal("target_revenue", { precision: 15, scale: 2 }),
  actualRevenue: decimal("actual_revenue", { precision: 15, scale: 2 }),
  achievementRate: decimal("achievement_rate", { precision: 5, scale: 2 }),

  // ── Rewards & Penalties (奖惩) ──
  rewardCount: integer("reward_count").default(0),
  penaltyCount: integer("penalty_count").default(0),
  rewardAmount: decimal("reward_amount", { precision: 12, scale: 2 }).default("0"),
  penaltyAmount: decimal("penalty_amount", { precision: 12, scale: 2 }).default("0"),

  // ── Plan Achievement (计划达成率) ──
  planTotal: integer("plan_total").default(0),
  planCompleted: integer("plan_completed").default(0),
  planAchievementRate: decimal("plan_achievement_rate", { precision: 5, scale: 2 }),

  // ── Training (培训参加质量) ──
  trainingSessions: integer("training_sessions").default(0),
  trainingAttendees: integer("training_attendees").default(0),
  trainingQualityScore: decimal("training_quality_score", { precision: 3, scale: 1 }),

  // ── Headcount & Projects ──
  headcount: integer("headcount").default(0),
  activeProjects: integer("active_projects").default(0),

  // ── AI Coordinated Evaluation (AI协调评价) ──
  aiEvaluation: text("ai_evaluation"),

  buCode: varchar("bu_code", { length: 50 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("bi_dept_metrics_period_dept_uniq").on(table.reportPeriodId, table.departmentCode),
  index("bi_dept_metrics_period_idx").on(table.reportPeriodId),
  index("bi_dept_metrics_dept_idx").on(table.departmentCode),
]);

// ══════════════════════════════════════════════════════
// Table 3: bi_individual_metrics — 个人绩效指标
//
// Per-person metrics with AI coordinated evaluation.
// ══════════════════════════════════════════════════════

export const biIndividualMetrics = pgTable("bi_individual_metrics", {
  id: serial("id").primaryKey(),

  reportPeriodId: integer("report_period_id").notNull().references(() => biReportPeriods.id),
  userId: integer("user_id").notNull().references(() => users.id),
  userName: varchar("user_name", { length: 100 }),
  departmentCode: varchar("department_code", { length: 50 }).notNull(),
  departmentName: varchar("department_name", { length: 100 }),
  position: varchar("position", { length: 100 }),

  // ── Target & Achievement ──
  targetValue: decimal("target_value", { precision: 15, scale: 2 }),
  actualValue: decimal("actual_value", { precision: 15, scale: 2 }),
  achievementRate: decimal("achievement_rate", { precision: 5, scale: 2 }),

  // ── Rewards & Penalties ──
  rewards: json("rewards").$type<{ title: string; amount: number; date: string }[]>(),
  penalties: json("penalties").$type<{ title: string; amount: number; date: string }[]>(),

  // ── Plan Achievement ──
  planItemsTotal: integer("plan_items_total").default(0),
  planItemsCompleted: integer("plan_items_completed").default(0),
  planAchievementRate: decimal("plan_achievement_rate", { precision: 5, scale: 2 }),

  // ── Training ──
  trainingAttended: integer("training_attended").default(0),
  trainingHours: decimal("training_hours", { precision: 6, scale: 1 }).default("0"),
  trainingScore: decimal("training_score", { precision: 3, scale: 1 }),

  // ── KPI & Rankings ──
  kpiScore: decimal("kpi_score", { precision: 5, scale: 2 }),
  rankInDepartment: integer("rank_in_department"),
  rankOverall: integer("rank_overall"),

  // ── AI Coordinated Evaluation ──
  aiCoordinatedEvaluation: text("ai_coordinated_evaluation"),

  buCode: varchar("bu_code", { length: 50 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("bi_individual_metrics_period_user_uniq").on(table.reportPeriodId, table.userId),
  index("bi_individual_metrics_period_idx").on(table.reportPeriodId),
  index("bi_individual_metrics_user_idx").on(table.userId),
  index("bi_individual_metrics_dept_idx").on(table.departmentCode),
]);

// ══════════════════════════════════════════════════════
// Table 4: bi_report_access_rules — 报告授权规则
//
// Controls who can see which reports at what level.
// ══════════════════════════════════════════════════════

export const biReportAccessRules = pgTable("bi_report_access_rules", {
  id: serial("id").primaryKey(),

  /** null = all period types */
  periodType: biPeriodTypeEnum("period_type"),
  /** null = all departments */
  departmentCode: varchar("department_code", { length: 50 }),

  /** Role-based grant (e.g., "bu_gm", "director") */
  grantedToRole: varchar("granted_to_role", { length: 50 }),
  /** User-specific grant (takes precedence) */
  grantedToUserId: integer("granted_to_user_id").references(() => users.id),

  accessLevel: biAccessLevelEnum("access_level").notNull().default("view_summary"),

  grantedBy: integer("granted_by").references(() => users.id),
  expiresAt: timestamp("expires_at", { mode: "string" }),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (table) => [
  index("bi_access_rules_role_idx").on(table.grantedToRole),
  index("bi_access_rules_user_idx").on(table.grantedToUserId),
  index("bi_access_rules_active_idx").on(table.isActive),
]);

// ── Type Exports ────────────────────────────────────

export type BiReportPeriod = InferSelectModel<typeof biReportPeriods>;
export type InsertBiReportPeriod = InferInsertModel<typeof biReportPeriods>;

export type BiDepartmentMetric = InferSelectModel<typeof biDepartmentMetrics>;
export type InsertBiDepartmentMetric = InferInsertModel<typeof biDepartmentMetrics>;

export type BiIndividualMetric = InferSelectModel<typeof biIndividualMetrics>;
export type InsertBiIndividualMetric = InferInsertModel<typeof biIndividualMetrics>;

export type BiReportAccessRule = InferSelectModel<typeof biReportAccessRules>;
export type InsertBiReportAccessRule = InferInsertModel<typeof biReportAccessRules>;
