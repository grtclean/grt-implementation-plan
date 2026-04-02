/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   Employee Growth Platform Schema (员工成长平台)                   ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                  ║
 * ║  面向一线员工的阶段性培训、表彰处罚、任务质量、周期报告、           ║
 * ║  云厅授权的完整生命周期管理                                       ║
 * ║                                                                  ║
 * ║  Tables:                                                         ║
 * ║    1. training_materials         — 培训资料库                    ║
 * ║    2. training_stage_plans       — 阶段性培训计划                ║
 * ║    3. employee_rewards_penalties — 表彰与处罚                    ║
 * ║    4. employee_task_metrics      — 任务质量交付指标              ║
 * ║    5. cloud_hall_access_grants   — 云厅内容授权                  ║
 * ║    6. employee_periodic_reports  — 周期性报告(日/周/月/季/年)    ║
 * ║                                                                  ║
 * ║  Reuses:                                                         ║
 * ║    - users                        from schema.ts                 ║
 * ║    - training_assessments         from schema.ts                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
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

// ═══════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════

export const MATERIAL_CATEGORIES = ["video", "document", "slides", "quiz", "link", "handbook", "3d_model"] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as const;
export type MaterialDifficulty = (typeof MATERIAL_DIFFICULTIES)[number];

export const LIFECYCLE_STAGES = ["onboarding", "3_month", "6_month", "12_month", "annual"] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const TRAINING_FORMATS = ["online", "offline", "self_study", "blended"] as const;
export type TrainingFormat = (typeof TRAINING_FORMATS)[number];

export const STAGE_STATUSES = ["pending", "active", "completed", "overdue", "skipped"] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

export const REWARD_PENALTY_TYPES = ["reward", "penalty"] as const;
export type RewardPenaltyType = (typeof REWARD_PENALTY_TYPES)[number];

export const RP_CATEGORIES = [
  "quality_excellence", "innovation", "safety_violation", "late_delivery",
  "customer_compliment", "process_improvement", "attendance", "teamwork", "other",
] as const;
export type RPCategory = (typeof RP_CATEGORIES)[number];

export const PENALTY_SEVERITIES = ["verbal_warning", "written_warning", "fine", "suspension"] as const;
export type PenaltySeverity = (typeof PENALTY_SEVERITIES)[number];

export const CONTENT_TYPES = ["3d_model", "product_intro", "technical_spec", "video_demo", "training_course"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const GRANT_STATUSES = ["pending", "approved", "rejected", "expired", "revoked"] as const;
export type GrantStatus = (typeof GRANT_STATUSES)[number];

export const REPORT_TYPES = ["daily", "weekly", "monthly", "quarterly", "annual"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = ["draft", "submitted", "reviewed", "archived"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// ═══════════════════════════════════════════════════════════════
// 1. training_materials — 培训资料库
// ═══════════════════════════════════════════════════════════════

export const trainingMaterials = pgTable("training_materials", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 300 }).notNull(),
  category: varchar("category", { length: 30 }).notNull(),
  format: varchar("format", { length: 20 }),
  description: text("description"),
  fileUrl: text("file_url"),
  thumbnailUrl: text("thumbnail_url"),
  durationMinutes: integer("duration_minutes"),
  difficulty: varchar("difficulty", { length: 20 }),
  tags: json("tags").$type<string[]>(),
  targetRoles: json("target_roles").$type<string[]>(),
  targetDepartments: json("target_departments").$type<string[]>(),
  isPublic: boolean("is_public").default(true),
  version: integer("version").default(1),
  createdBy: integer("created_by").references(() => users.id),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_tm_category").on(t.category),
  index("idx_tm_status").on(t.status),
  index("idx_tm_difficulty").on(t.difficulty),
]);

// ═══════════════════════════════════════════════════════════════
// 2. training_stage_plans — 阶段性培训计划
// ═══════════════════════════════════════════════════════════════

export const trainingStagePlans = pgTable("training_stage_plans", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  lifecycleStage: varchar("lifecycle_stage", { length: 20 }).notNull(),
  planName: varchar("plan_name", { length: 300 }).notNull(),
  dueDate: varchar("due_date", { length: 10 }).notNull(),
  triggerDate: varchar("trigger_date", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  trainingFormat: varchar("training_format", { length: 20 }),
  materialIds: json("material_ids").$type<number[]>(),
  prerequisiteKpiScore: real("prerequisite_kpi_score"),
  prerequisiteCapabilityLevel: integer("prerequisite_capability_level"),
  completionCriteria: json("completion_criteria").$type<{
    testRequired: boolean;
    minScore?: number;
    managerApproval: boolean;
    selfStudyHours?: number;
  }>(),
  testId: integer("test_id"),
  testScore: integer("test_score"),
  testPassed: boolean("test_passed"),
  completedAt: timestamp("completed_at"),
  supervisorSignoff: integer("supervisor_signoff").references(() => users.id),
  supervisorSignoffAt: timestamp("supervisor_signoff_at"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  unique("uq_stage_plan").on(t.employeeId, t.lifecycleStage),
  index("idx_tsp_status").on(t.status),
  index("idx_tsp_due").on(t.dueDate),
  index("idx_tsp_user").on(t.userId),
]);

// ═══════════════════════════════════════════════════════════════
// 3. employee_rewards_penalties — 表彰与处罚
// ═══════════════════════════════════════════════════════════════

export const employeeRewardsPenalties = pgTable("employee_rewards_penalties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  employeeId: integer("employee_id"),
  type: varchar("type", { length: 20 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 30 }),
  amount: real("amount"),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: integer("source_id"),
  issuedBy: integer("issued_by").references(() => users.id),
  issuedAt: varchar("issued_at", { length: 10 }).notNull(),
  period: varchar("period", { length: 7 }),
  status: varchar("status", { length: 20 }).default("active"),
  appealReason: text("appeal_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_erp_user_period").on(t.userId, t.period),
  index("idx_erp_type").on(t.type),
  index("idx_erp_issued").on(t.issuedAt),
]);

// ═══════════════════════════════════════════════════════════════
// 4. employee_task_metrics — 任务质量交付指标
// ═══════════════════════════════════════════════════════════════

export const employeeTaskMetrics = pgTable("employee_task_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  employeeId: integer("employee_id"),
  period: varchar("period", { length: 7 }).notNull(),
  tasksAssigned: integer("tasks_assigned").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksOnTime: integer("tasks_on_time").default(0),
  tasksLate: integer("tasks_late").default(0),
  tasksOverdue: integer("tasks_overdue").default(0),
  avgQualityScore: real("avg_quality_score"),
  avgDeliveryDays: real("avg_delivery_days"),
  defectCount: integer("defect_count").default(0),
  reworkCount: integer("rework_count").default(0),
  customerSatisfactionAvg: real("customer_satisfaction_avg"),
  projectContributions: json("project_contributions").$type<Array<{
    projectId: number;
    projectName: string;
    role: string;
    hours: number;
    deliverables: number;
  }>>(),
  aiGeneratedSummary: text("ai_generated_summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  unique("uq_task_metrics").on(t.userId, t.period),
  index("idx_etm_period").on(t.period),
]);

// ═══════════════════════════════════════════════════════════════
// 5. cloud_hall_access_grants — 云厅内容授权
// ═══════════════════════════════════════════════════════════════

export const cloudHallAccessGrants = pgTable("cloud_hall_access_grants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contentType: varchar("content_type", { length: 30 }).notNull(),
  contentId: integer("content_id").notNull(),
  contentTitle: varchar("content_title", { length: 300 }),
  accessLevel: varchar("access_level", { length: 20 }).default("view"),
  grantStatus: varchar("grant_status", { length: 20 }).default("pending"),
  requestReason: text("request_reason"),
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  viewCount: integer("view_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  unique("uq_cloud_access").on(t.userId, t.contentId),
  index("idx_cag_status").on(t.grantStatus),
  index("idx_cag_type").on(t.contentType),
]);

// ═══════════════════════════════════════════════════════════════
// 6. employee_periodic_reports — 周期性报告
// ═══════════════════════════════════════════════════════════════

export const employeePeriodicReports = pgTable("employee_periodic_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  employeeId: integer("employee_id"),
  reportType: varchar("report_type", { length: 20 }).notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  title: varchar("title", { length: 300 }),
  status: varchar("status", { length: 20 }).default("draft"),

  // Daily: plan confirmation + completion
  plannedItems: json("planned_items").$type<Array<{
    title: string;
    priority: string;
    estimatedHours: number;
  }>>(),
  completedItems: json("completed_items").$type<Array<{
    title: string;
    status: "done" | "partial" | "not_started" | "carried_over";
    actualHours: number;
    qualityRating?: number;
  }>>(),
  completionRate: real("completion_rate"),

  // Weekly+: summary sections
  keyAccomplishments: json("key_accomplishments").$type<string[]>(),
  challenges: json("challenges").$type<string[]>(),
  nextPeriodGoals: json("next_period_goals").$type<string[]>(),

  // Monthly+: KPI data
  kpiSummaryJson: json("kpi_summary_json").$type<Array<{
    kpiName: string;
    target: number;
    actual: number;
    score: number;
    trend: "up" | "down" | "stable";
  }>>(),
  kpiOverallScore: real("kpi_overall_score"),

  // Monthly+: rewards/penalties/task metrics summary
  rewardPenaltySummary: json("reward_penalty_summary").$type<{
    totalRewards: number;
    totalPenalties: number;
    rewardAmount: number;
    penaltyAmount: number;
  }>(),
  taskMetricsSummary: json("task_metrics_summary").$type<{
    assigned: number;
    completed: number;
    onTimeRate: number;
    qualityScore: number;
  }>(),

  // Quarterly/Annual: trend data
  trendDataJson: json("trend_data_json").$type<Array<{
    period: string;
    overallScore: number;
    breakdown: Record<string, number>;
  }>>(),
  yearOverYearComparison: json("year_over_year_comparison").$type<{
    currentYear: Record<string, number>;
    previousYear: Record<string, number>;
    delta: Record<string, number>;
  }>(),

  // Training progress (quarterly/annual)
  trainingProgress: json("training_progress").$type<Array<{
    stage: string;
    status: string;
    completedAt?: string;
    score?: number;
  }>>(),

  // Capability growth (quarterly/annual)
  capabilitySnapshot: json("capability_snapshot").$type<Record<string, number>>(),

  // AI analysis
  aiNarrative: text("ai_narrative"),
  aiRecommendations: json("ai_recommendations").$type<string[]>(),

  // Review workflow
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  managerComments: text("manager_comments"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  unique("uq_periodic_report").on(t.userId, t.reportType, t.period),
  index("idx_epr_type").on(t.reportType),
  index("idx_epr_period").on(t.period),
  index("idx_epr_status").on(t.status),
  index("idx_epr_user").on(t.userId),
]);

// ═══════════════════════════════════════════════════════════════
// Type Exports
// ═══════════════════════════════════════════════════════════════

export type TrainingMaterial = InferSelectModel<typeof trainingMaterials>;
export type NewTrainingMaterial = InferInsertModel<typeof trainingMaterials>;

export type TrainingStagePlan = InferSelectModel<typeof trainingStagePlans>;
export type NewTrainingStagePlan = InferInsertModel<typeof trainingStagePlans>;

export type EmployeeRewardPenalty = InferSelectModel<typeof employeeRewardsPenalties>;
export type NewEmployeeRewardPenalty = InferInsertModel<typeof employeeRewardsPenalties>;

export type EmployeeTaskMetric = InferSelectModel<typeof employeeTaskMetrics>;
export type NewEmployeeTaskMetric = InferInsertModel<typeof employeeTaskMetrics>;

export type CloudHallAccessGrant = InferSelectModel<typeof cloudHallAccessGrants>;
export type NewCloudHallAccessGrant = InferInsertModel<typeof cloudHallAccessGrants>;

export type EmployeePeriodicReport = InferSelectModel<typeof employeePeriodicReports>;
export type NewEmployeePeriodicReport = InferInsertModel<typeof employeePeriodicReports>;
