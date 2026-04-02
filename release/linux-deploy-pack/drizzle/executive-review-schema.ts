import { pgTable, serial, text, integer, timestamp, varchar, decimal, boolean, json, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./schema";

/* ------------------------------------------------------------------ */
/*  Executive Review Hub — 高管绩效总览中心                              */
/*  Lets BU/Dept managers, GM, and Chairman drill into KPI & task      */
/*  completion across departments, projects, employees, and periods.   */
/* ------------------------------------------------------------------ */

// ── Review Comments (评价记录) ──────────────────────────────────────
// Any executive can leave an evaluation comment on a department, employee, or project
export const executiveReviewComments = pgTable("executive_review_comments", {
  id: serial("id").primaryKey(),
  reviewerId: integer("reviewer_id").references(() => users.id).notNull(),
  reviewerName: varchar("reviewer_name", { length: 100 }).notNull(),
  reviewerRole: varchar("reviewer_role", { length: 50 }).notNull(), // bu_gm, dept_manager, gm, chairman
  // Target entity — polymorphic
  targetType: varchar("target_type", { length: 30 }).notNull(), // 'department' | 'employee' | 'project' | 'bu'
  targetId: varchar("target_id", { length: 100 }).notNull(), // dept name, userId, projectId, buCode
  targetName: varchar("target_name", { length: 200 }).notNull(),
  // Evaluation
  period: varchar("period", { length: 20 }).notNull(), // "2026-03", "2026-Q1", "2026"
  periodType: varchar("period_type", { length: 20 }).notNull(), // monthly | quarterly | annual
  rating: integer("rating"), // 1-5 stars (optional)
  comment: text("comment").notNull(),
  tags: json("tags").$type<string[]>().default([]), // e.g. ["improvement_needed", "outstanding"]
  isPrivate: boolean("is_private").default(false), // only visible to reviewer + admin
  status: varchar("status", { length: 20 }).default("active"), // active | archived | deleted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Executive Dashboard Snapshots (聚合快照) ───────────────────────
// Pre-aggregated metrics per department/BU per period for fast loading
export const executiveReviewSnapshots = pgTable("executive_review_snapshots", {
  id: serial("id").primaryKey(),
  // Scope
  scopeType: varchar("scope_type", { length: 20 }).notNull(), // 'company' | 'bu' | 'department'
  scopeId: varchar("scope_id", { length: 100 }).notNull(), // 'all', buCode, deptName
  scopeName: varchar("scope_name", { length: 200 }).notNull(),
  period: varchar("period", { length: 20 }).notNull(), // "2026-03", "2026-Q1", "2026"
  periodType: varchar("period_type", { length: 20 }).notNull(), // monthly | quarterly | annual
  // Headcount
  totalEmployees: integer("total_employees").default(0),
  activeEmployees: integer("active_employees").default(0),
  // KPI Metrics
  avgKpiScore: decimal("avg_kpi_score", { precision: 5, scale: 2 }),
  kpiCompletionRate: decimal("kpi_completion_rate", { precision: 5, scale: 2 }), // % of KPIs meeting target
  topKpiAchievers: json("top_kpi_achievers").$type<{ userId: number; name: string; score: number }[]>().default([]),
  bottomKpiPerformers: json("bottom_kpi_performers").$type<{ userId: number; name: string; score: number }[]>().default([]),
  kpiDistribution: json("kpi_distribution").$type<{ S: number; A: number; B: number; C: number; D: number }>(),
  // Task Metrics
  totalTasksAssigned: integer("total_tasks_assigned").default(0),
  totalTasksCompleted: integer("total_tasks_completed").default(0),
  taskCompletionRate: decimal("task_completion_rate", { precision: 5, scale: 2 }),
  avgTaskQuality: decimal("avg_task_quality", { precision: 5, scale: 2 }),
  totalTasksOverdue: integer("total_tasks_overdue").default(0),
  onTimeRate: decimal("on_time_rate", { precision: 5, scale: 2 }),
  // Financial (if applicable)
  revenueTarget: decimal("revenue_target", { precision: 15, scale: 2 }),
  revenueActual: decimal("revenue_actual", { precision: 15, scale: 2 }),
  profitTarget: decimal("profit_target", { precision: 15, scale: 2 }),
  profitActual: decimal("profit_actual", { precision: 15, scale: 2 }),
  // Training & Growth
  trainingCompletionRate: decimal("training_completion_rate", { precision: 5, scale: 2 }),
  avgCapabilityLevel: decimal("avg_capability_level", { precision: 3, scale: 1 }),
  // Rewards & Penalties
  totalRewards: integer("total_rewards").default(0),
  totalPenalties: integer("total_penalties").default(0),
  rewardAmount: decimal("reward_amount", { precision: 12, scale: 2 }).default("0"),
  penaltyAmount: decimal("penalty_amount", { precision: 12, scale: 2 }).default("0"),
  // OKR
  okrProgressAvg: decimal("okr_progress_avg", { precision: 5, scale: 2 }),
  // Detailed breakdown JSON (flexible)
  detailBreakdown: json("detail_breakdown").$type<Record<string, unknown>>(),
  // Meta
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: varchar("generated_by", { length: 50 }).default("system"), // system | manual
}, (table) => [
  uniqueIndex("exec_snapshot_scope_period_idx").on(table.scopeType, table.scopeId, table.period, table.periodType),
]);

// ── Type exports ───────────────────────────────────────────────────
export type ExecutiveReviewComment = typeof executiveReviewComments.$inferSelect;
export type NewExecutiveReviewComment = typeof executiveReviewComments.$inferInsert;
export type ExecutiveReviewSnapshot = typeof executiveReviewSnapshots.$inferSelect;
export type NewExecutiveReviewSnapshot = typeof executiveReviewSnapshots.$inferInsert;
