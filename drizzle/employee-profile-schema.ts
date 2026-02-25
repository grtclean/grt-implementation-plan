/**
 * Employee Digital Profile — Holistic 360° Fusion Schema
 * Phase 2.3 — HR × AI × Meeting × Certification Cross-Domain Fusion
 *
 * This schema bridges FIVE existing domains:
 *   ① HR Core — hrmEmployees (schema.ts line 1779)
 *   ② KPI Performance — hrmMonthlyPerformanceReviews (kpi-performance-schema.ts line 120)
 *   ③ Smart Meetings — hrAiPerformance (smart-meetings-schema.ts line 233)
 *   ④ Certifications — qualificationCertificates (schema.ts line 3513)
 *   ⑤ AI Agent Fleet — agentTaskExecutions (ai-agent-fleet-schema.ts line 185)
 *
 * It does NOT duplicate those tables. It adds:
 *   - employee_360_profiles: pre-computed 4-dimension radar snapshot
 *   - employee_360_history: monthly trend audit trail
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────

export const profileTierEnum = pgEnum("employee_profile_tier", [
  "S",    // Overall ≥ 90 — Star Performer
  "A",    // Overall 75–89 — High Performer
  "B",    // Overall 60–74 — Solid Contributor
  "C",    // Overall < 60 — Needs Development
]);

export const careerAdviceTypeEnum = pgEnum("career_advice_type", [
  "STRENGTH",       // Highest dimension — leverage it
  "DEVELOPMENT",    // Lowest dimension — focus area
  "OPPORTUNITY",    // Rising trend detected
  "WARNING",        // Declining trend detected
]);

// ─── Employee 360 Profiles (computed radar snapshot) ─────────────────

export const employee360Profiles = pgTable("employee_360_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),                           // FK → users.id
  employeeId: integer("employee_id"),                             // FK → hrm_employees.id
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  department: varchar("department", { length: 50 }),
  position: varchar("position", { length: 100 }),
  level: varchar("level", { length: 20 }),

  // ─── 4 Radar Dimensions (0–100 each) ───
  executionScore: decimal("execution_score", { precision: 5, scale: 2 }).notNull(),   // from KPI
  learningScore: decimal("learning_score", { precision: 5, scale: 2 }).notNull(),     // from certs
  collaborationScore: decimal("collaboration_score", { precision: 5, scale: 2 }).notNull(), // from meetings
  innovationScore: decimal("innovation_score", { precision: 5, scale: 2 }).notNull(), // from AI usage

  // ─── Overall Combat Power ───
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),       // weighted average
  tier: profileTierEnum("tier").notNull(),

  // ─── AI Career Advice ───
  weakestDimension: varchar("weakest_dimension", { length: 30 }),
  strongestDimension: varchar("strongest_dimension", { length: 30 }),
  aiAdvice: text("ai_advice"),

  // ─── Source data counters ───
  kpiMonthsAnalyzed: integer("kpi_months_analyzed").default(0),
  certificateCount: integer("certificate_count").default(0),
  meetingMonthsAnalyzed: integer("meeting_months_analyzed").default(0),
  aiTasksCompleted: integer("ai_tasks_completed").default(0),

  lastCalculatedAt: timestamp("last_calculated_at", { mode: "string" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_e360_user").on(table.userId),
  index("idx_e360_dept").on(table.department),
  index("idx_e360_tier").on(table.tier),
  index("idx_e360_overall").on(table.overallScore),
]);

// ─── Employee 360 History (monthly trend audit trail) ────────────────

export const employee360History = pgTable("employee_360_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  month: varchar("month", { length: 7 }).notNull(),               // "2026-02" format
  executionScore: decimal("execution_score", { precision: 5, scale: 2 }).notNull(),
  learningScore: decimal("learning_score", { precision: 5, scale: 2 }).notNull(),
  collaborationScore: decimal("collaboration_score", { precision: 5, scale: 2 }).notNull(),
  innovationScore: decimal("innovation_score", { precision: 5, scale: 2 }).notNull(),
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
  tier: profileTierEnum("tier").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_e360h_user_month").on(table.userId, table.month),
  index("idx_e360h_month").on(table.month),
]);
