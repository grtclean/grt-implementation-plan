import { pgTable, serial, varchar, text, decimal, integer, timestamp, json, index, unique } from "drizzle-orm/pg-core";

/**
 * HR & KPI Performance Management Schema — 6 tables
 *
 * - hrm_kpi_positions: Position profiles for KPI strategy
 * - hrm_kpi_library: Master list of KPI metrics (Balanced Scorecard)
 * - hrm_position_kpi_targets: Maps KPIs to positions with targets/weights
 * - hrm_user_skill_matrix: Per-user skill levels and growth trajectories
 * - hrm_monthly_performance_reviews: Monthly KPI reviews with gap analysis
 * - hrm_military_orders: Annual commitment pledges (军令状)
 */

// ============================================================
// hrm_kpi_positions — Position profiles for KPI strategy
// ============================================================

export const hrmKpiPositions = pgTable("hrm_kpi_positions", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id"),                                     // soft FK → hrm_positions.id
  title: varchar("title", { length: 200 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  buCode: varchar("bu_code", { length: 20 }),                            // 海外/商用车/乘用车/半导体/工业通用
  responsibilities: text("responsibilities"),
  hiringRequirements: text("hiring_requirements"),
  coreCompetency: text("core_competency"),
  headcount: integer("headcount").default(1),
  status: varchar("status", { length: 30 }).default("active"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("hrm_kpi_pos_department_idx").on(table.department),
  index("hrm_kpi_pos_bu_code_idx").on(table.buCode),
  index("hrm_kpi_pos_status_idx").on(table.status),
  index("hrm_kpi_pos_position_id_idx").on(table.positionId),
]);

// ============================================================
// hrm_kpi_library — Master list of KPI metrics
// ============================================================

export const hrmKpiLibrary = pgTable("hrm_kpi_library", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),              // e.g. "KPI-FIN-001"
  name: varchar("name", { length: 200 }).notNull(),                      // e.g. "Sales Orders"
  description: text("description"),
  unit: varchar("unit", { length: 30 }).notNull(),                       // currency, percent, count, days
  kpiType: varchar("kpi_type", { length: 30 }).notNull(),                // financial, customer, internal_process, learning_growth
  category: varchar("category", { length: 50 }),                         // finer grouping: revenue, margin, delivery
  calculationFormula: text("calculation_formula"),
  dataSource: varchar("data_source", { length: 100 }),                   // system/module providing actuals
  buCode: varchar("bu_code", { length: 20 }),                            // null = company-wide
  status: varchar("status", { length: 30 }).default("active"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("hrm_kpi_lib_kpi_type_idx").on(table.kpiType),
  index("hrm_kpi_lib_bu_code_idx").on(table.buCode),
  index("hrm_kpi_lib_status_idx").on(table.status),
]);

// ============================================================
// hrm_position_kpi_targets — Maps KPIs to positions with targets
// ============================================================

export const hrmPositionKpiTargets = pgTable("hrm_position_kpi_targets", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").notNull(),                           // soft FK → hrm_kpi_positions.id
  kpiId: integer("kpi_id").notNull(),                                     // soft FK → hrm_kpi_library.id
  year: integer("year").notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  challengeValue: decimal("challenge_value", { precision: 15, scale: 2 }),  // stretch goal
  minimumValue: decimal("minimum_value", { precision: 15, scale: 2 }),      // floor threshold
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),          // percentage
  scoringMethod: varchar("scoring_method", { length: 30 }).default("linear"),
  notes: text("notes"),
  status: varchar("status", { length: 30 }).default("active"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("hrm_pos_kpi_tgt_position_id_idx").on(table.positionId),
  index("hrm_pos_kpi_tgt_kpi_id_idx").on(table.kpiId),
  index("hrm_pos_kpi_tgt_year_idx").on(table.year),
  unique("hrm_pos_kpi_tgt_uk_pos_kpi_year").on(table.positionId, table.kpiId, table.year),
]);

// ============================================================
// hrm_user_skill_matrix — Per-user skill levels and growth
// ============================================================

export const hrmUserSkillMatrix = pgTable("hrm_user_skill_matrix", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),                                    // soft FK → users.id
  employeeId: integer("employee_id"),                                      // soft FK → hrm_employees.id
  skillName: varchar("skill_name", { length: 100 }).notNull(),
  skillCategory: varchar("skill_category", { length: 50 }),                // technical, leadership, domain, soft_skill
  currentLevel: integer("current_level").notNull(),                        // 1-5
  targetLevel: integer("target_level").notNull(),                          // 1-5
  assessmentDate: timestamp("assessment_date", { mode: "string" }),
  assessedBy: integer("assessed_by"),
  historyJson: json("history_json"),                                       // [{date, level, assessor, notes}]
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("hrm_skill_matrix_user_id_idx").on(table.userId),
  index("hrm_skill_matrix_employee_id_idx").on(table.employeeId),
  index("hrm_skill_matrix_skill_name_idx").on(table.skillName),
  index("hrm_skill_matrix_skill_category_idx").on(table.skillCategory),
  unique("hrm_skill_matrix_uk_user_skill").on(table.userId, table.skillName),
]);

// ============================================================
// hrm_monthly_performance_reviews — Monthly KPI reviews
// ============================================================

export const hrmMonthlyPerformanceReviews = pgTable("hrm_monthly_performance_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),                                    // soft FK → users.id
  employeeId: integer("employee_id"),                                      // soft FK → hrm_employees.id
  positionId: integer("position_id"),                                      // soft FK → hrm_kpi_positions.id
  monthDate: varchar("month_date", { length: 7 }).notNull(),              // "2026-01" format
  overallKpiScore: decimal("overall_kpi_score", { precision: 5, scale: 2 }),
  bonusCoefficient: decimal("bonus_coefficient", { precision: 3, scale: 2 }),
  kpiDetailsJson: json("kpi_details_json"),                                // [{kpiId, kpiName, target, actual, score, weight}]
  gapsText: text("gaps_text"),
  improvementPlanText: text("improvement_plan_text"),
  reviewerComments: text("reviewer_comments"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  status: varchar("status", { length: 30 }).default("draft"),             // draft→submitted→reviewed→finalized
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("hrm_monthly_perf_user_id_idx").on(table.userId),
  index("hrm_monthly_perf_employee_id_idx").on(table.employeeId),
  index("hrm_monthly_perf_month_date_idx").on(table.monthDate),
  index("hrm_monthly_perf_status_idx").on(table.status),
  unique("hrm_monthly_perf_uk_user_month").on(table.userId, table.monthDate),
]);

// ============================================================
// hrm_military_orders — Annual commitment pledges (军令状)
// ============================================================

export const hrmMilitaryOrders = pgTable("hrm_military_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),                                    // soft FK → users.id
  employeeId: integer("employee_id"),                                      // soft FK → hrm_employees.id
  year: integer("year").notNull(),
  positionId: integer("position_id"),                                      // soft FK → hrm_kpi_positions.id
  commitmentText: text("commitment_text").notNull(),                       // the pledge content
  targetSummaryJson: json("target_summary_json"),                          // [{kpiId, kpiName, targetValue, unit}]
  rewardText: text("reward_text"),                                         // what is earned if targets met
  consequenceText: text("consequence_text"),                               // what happens if missed
  signatureStatus: varchar("signature_status", { length: 30 }).notNull().default("pending"),
  signedAt: timestamp("signed_at", { mode: "string" }),
  witnessedBy: integer("witnessed_by"),                                    // manager co-signer
  witnessedAt: timestamp("witnessed_at", { mode: "string" }),
  documentUrl: text("document_url"),                                       // path to signed PDF/scan
  status: varchar("status", { length: 30 }).default("active"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("hrm_mil_orders_user_id_idx").on(table.userId),
  index("hrm_mil_orders_year_idx").on(table.year),
  index("hrm_mil_orders_sig_status_idx").on(table.signatureStatus),
  index("hrm_mil_orders_status_idx").on(table.status),
  unique("hrm_mil_orders_uk_user_year").on(table.userId, table.year),
]);
