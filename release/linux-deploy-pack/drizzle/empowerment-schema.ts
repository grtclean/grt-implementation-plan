/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT Employee Empowerment Engine Schema                        ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  全域员工赋能引擎：日报 + 月度绩效账单 + AI 早报                  ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. daily_briefings          — AI 6AM 智能早报 (cached)       ║
 * ║    2. employee_daily_logs      — 结构化工时报工                  ║
 * ║    3. monthly_appraisal_reports — 月度全景绩效账单               ║
 * ║                                                                 ║
 * ║  Reuses:                                                        ║
 * ║    - okr_objectives (OKR tree)  from okr-schema.ts              ║
 * ║    - payroll_ledgers (salary)   from smart-payroll-schema.ts    ║
 * ║    - perf_composite_scores      from perf-calibration-schema.ts ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  real,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

import { users } from "./schema";

// ══════════════════════════════════════════════════════
// Enum value tuples
// ══════════════════════════════════════════════════════

export const BRIEFING_STATUSES = ["pending", "generated", "read", "failed"] as const;
export const DAILY_LOG_STATUSES = ["draft", "submitted", "approved", "rejected"] as const;
export const APPRAISAL_STATUSES = ["draft", "generated", "employee_read", "manager_signed", "archived"] as const;

export type BriefingStatus = (typeof BRIEFING_STATUSES)[number];
export type DailyLogStatus = (typeof DAILY_LOG_STATUSES)[number];
export type AppraisalStatus = (typeof APPRAISAL_STATUSES)[number];

// ══════════════════════════════════════════════════════
// Postgres Enums
// ══════════════════════════════════════════════════════

export const briefingStatusEnum = pgEnum("emp_briefing_status", BRIEFING_STATUSES);
export const dailyLogStatusEnum = pgEnum("emp_daily_log_status", DAILY_LOG_STATUSES);
export const appraisalStatusEnum = pgEnum("emp_appraisal_status", APPRAISAL_STATUSES);

// ══════════════════════════════════════════════════════
// Table 1: daily_briefings — AI 6:00 AM 智能早报
//
// Generated overnight by empowerment scheduler.
// One row per employee per date. Content is AI-curated
// from 8+ data sources (tasks, meetings, OKRs, etc.)
// ══════════════════════════════════════════════════════

export const dailyBriefings = pgTable("daily_briefings", {
  id: serial("id").primaryKey(),

  userId: integer("user_id").notNull().references(() => users.id),
  briefingDate: varchar("briefing_date", { length: 10 }).notNull(), // YYYY-MM-DD

  status: briefingStatusEnum("status").notNull().default("pending"),

  /** AI-generated top priorities for the day */
  topPriorities: json("top_priorities").$type<{ title: string; source: string; priority: string; route?: string }[]>(),

  /** Meetings & deadlines for today */
  todaySchedule: json("today_schedule").$type<{ time: string; title: string; type: string }[]>(),

  /** Carryover tasks from yesterday */
  carryoverTasks: json("carryover_tasks").$type<{ title: string; originalDate: string; status: string }[]>(),

  /** OKR alignment summary */
  okrSummary: text("okr_summary"),

  /** Full AI narrative (markdown) — "今日作战计划" */
  aiNarrative: text("ai_narrative"),

  /** Raw aggregate data used to generate the briefing */
  sourceData: json("source_data").$type<Record<string, unknown>>(),

  readAt: timestamp("read_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("daily_briefings_user_date_uniq").on(table.userId, table.briefingDate),
  index("daily_briefings_date_idx").on(table.briefingDate),
  index("daily_briefings_status_idx").on(table.status),
]);

// ══════════════════════════════════════════════════════
// Table 2: employee_daily_logs — 结构化报工
//
// Employees submit daily work logs with hours, tasks
// completed, and blockers. Aggregated monthly for
// appraisal reports.
// ══════════════════════════════════════════════════════

export const employeeDailyLogs = pgTable("employee_daily_logs", {
  id: serial("id").primaryKey(),

  userId: integer("user_id").notNull().references(() => users.id),
  logDate: varchar("log_date", { length: 10 }).notNull(), // YYYY-MM-DD
  projectId: integer("project_id"),

  /** Hours worked on this project/task */
  loggedHours: real("logged_hours").notNull().default(0),

  /** JSON array of completed task descriptions */
  completedTasks: json("completed_tasks").$type<{ title: string; category?: string; hours?: number }[]>(),

  /** Blockers encountered */
  blockers: text("blockers"),

  /** Self-assessment notes */
  notes: text("notes"),

  /** Mood/energy indicator 1-5 */
  energyLevel: integer("energy_level"),

  status: dailyLogStatusEnum("status").notNull().default("draft"),

  /** Manager who approved (null until approved) */
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { mode: "string" }),

  /** AI Sales Coach feedback (populated async after daily report submission) */
  aiCoachFeedback: json("ai_coach_feedback").$type<{
    tacticalGuidance: string;
    pipelineRisks: string[];
    suggestedActions: string[];
    generatedAt: string;
  }>(),

  /** Pipeline health score 0-100 (computed by AI Coach) */
  pipelineHealthScore: integer("pipeline_health_score"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("employee_daily_logs_user_date_proj_uniq").on(table.userId, table.logDate, table.projectId),
  index("employee_daily_logs_user_idx").on(table.userId),
  index("employee_daily_logs_date_idx").on(table.logDate),
  index("employee_daily_logs_status_idx").on(table.status),
]);

// ══════════════════════════════════════════════════════
// Table 3: monthly_appraisal_reports — 月度全景账单
//
// Auto-generated on the 1st of each month by scheduler.
// Combines: work hours, defect rate, task completion,
// payroll, training, and AI recommendations.
//
// Privacy: ONLY visible to employee + direct manager + HR.
// Salary section requires password re-auth to view.
// ══════════════════════════════════════════════════════

export const monthlyAppraisalReports = pgTable("monthly_appraisal_reports", {
  id: serial("id").primaryKey(),

  userId: integer("user_id").notNull().references(() => users.id),
  /** Period in YYYY-MM format */
  period: varchar("period", { length: 7 }).notNull(),

  // ── Performance Metrics ──
  /** 0-100 composite score from perf_composite_scores */
  performanceScore: real("performance_score"),
  /** Total logged hours for the month */
  totalHours: real("total_hours"),
  /** Number of tasks completed */
  tasksCompleted: integer("tasks_completed"),
  /** Task completion rate (completed / assigned) */
  taskCompletionRate: real("task_completion_rate"),
  /** Quality defect count */
  defectCount: integer("defect_count").default(0),

  // ── Financial (privacy-sensitive) ──
  /** Base salary (string for DECIMAL precision) */
  baseSalary: varchar("base_salary", { length: 20 }),
  /** Performance bonus */
  performanceBonus: varchar("performance_bonus", { length: 20 }),
  /** Calculated net pay */
  netPay: varchar("net_pay", { length: 20 }),
  /** FK to payroll_ledgers for full breakdown */
  payrollLedgerId: integer("payroll_ledger_id"),

  // ── AI Analysis ──
  /** Strengths identified */
  strengths: json("strengths").$type<string[]>(),
  /** Shortcomings / improvement areas */
  shortcomings: json("shortcomings").$type<string[]>(),
  /** Recommended training courses */
  requiredTraining: json("required_training").$type<{ title: string; reason: string; urgency: string }[]>(),
  /** Carryover items for next month */
  carryoverItems: json("carryover_items").$type<string[]>(),
  /** AI-generated narrative summary (markdown) */
  aiSummary: text("ai_summary"),

  // ── Workflow ──
  status: appraisalStatusEnum("status").notNull().default("draft"),
  /** When employee first viewed the report */
  employeeReadAt: timestamp("employee_read_at", { mode: "string" }),
  /** Manager sign-off */
  managerSignedBy: integer("manager_signed_by").references(() => users.id),
  managerSignedAt: timestamp("manager_signed_at", { mode: "string" }),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("monthly_appraisal_user_period_uniq").on(table.userId, table.period),
  index("monthly_appraisal_user_idx").on(table.userId),
  index("monthly_appraisal_period_idx").on(table.period),
  index("monthly_appraisal_status_idx").on(table.status),
]);

// ══════════════════════════════════════════════════════
// Type exports
// ══════════════════════════════════════════════════════

export type DailyBriefing = InferSelectModel<typeof dailyBriefings>;
export type InsertDailyBriefing = InferInsertModel<typeof dailyBriefings>;
export type EmployeeDailyLog = InferSelectModel<typeof employeeDailyLogs>;
export type InsertEmployeeDailyLog = InferInsertModel<typeof employeeDailyLogs>;
export type MonthlyAppraisalReport = InferSelectModel<typeof monthlyAppraisalReports>;
export type InsertMonthlyAppraisalReport = InferInsertModel<typeof monthlyAppraisalReports>;
