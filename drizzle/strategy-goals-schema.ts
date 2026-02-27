import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  real,
  serial,
} from "drizzle-orm/pg-core";

// ── Company-Level Strategic Goals ───────────────────
export const companyGoals = pgTable("company_goals", {
  id: serial("id").primaryKey(),
  /** Fiscal year */
  year: integer("year").notNull().default(2026),
  /** Metric display name (Chinese) */
  metricName: varchar("metric_name", { length: 200 }).notNull(),
  /** Metric display name (English) */
  metricNameEn: varchar("metric_name_en", { length: 200 }),
  /** Target value for the year */
  targetValue: real("target_value").notNull(),
  /** Current actual value */
  currentValue: real("current_value").notNull().default(0),
  /** Unit label: CNY, %, DPPM, etc. */
  unit: varchar("unit", { length: 30 }).notNull(),
  /** Weight in overall score (0.0 to 1.0) */
  weight: real("weight").notNull(),
  /** Category: revenue | quality | delivery | cost | team */
  category: varchar("category", { length: 30 }).notNull(),
  /** Status: active | completed | cancelled */
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Division-Level KPIs (linked to company goals) ───
export const divisionKpis = pgTable("division_kpis", {
  id: serial("id").primaryKey(),
  /** FK to company_goals.id */
  companyGoalId: integer("company_goal_id").notNull(),
  /** Division display name: 海外事业部, 商用车事业部, etc. */
  divisionName: varchar("division_name", { length: 100 }).notNull(),
  /** Division code: BU1, BU2, BU3, BU4, BU5 */
  divisionCode: varchar("division_code", { length: 10 }).notNull(),
  /** Division manager name */
  managerName: varchar("manager_name", { length: 100 }).notNull(),
  /** Division manager user ID (nullable, linked when user exists) */
  managerId: integer("manager_id"),
  /** KPI metric name (Chinese) */
  metricName: varchar("metric_name", { length: 200 }).notNull(),
  /** KPI metric name (English) */
  metricNameEn: varchar("metric_name_en", { length: 200 }),
  /** Target value */
  targetValue: real("target_value").notNull(),
  /** Current actual value */
  currentValue: real("current_value").notNull().default(0),
  /** Unit label */
  unit: varchar("unit", { length: 30 }).notNull(),
  /** Weight within division scorecard (0.0 to 1.0) */
  weight: real("weight").notNull(),
  /** Detailed evaluation criteria text */
  evaluationCriteria: text("evaluation_criteria"),
  /** RAG status: R (Red) | A (Amber) | G (Green) */
  ragStatus: varchar("rag_status", { length: 1 }).notNull().default("G"),
  /** Completion percentage 0-100 */
  completionPct: real("completion_pct").notNull().default(0),
  /** Fiscal year */
  year: integer("year").notNull().default(2026),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
