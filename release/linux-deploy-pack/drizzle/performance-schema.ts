import { pgTable, pgEnum, serial, integer, varchar, text, decimal, timestamp, json, boolean, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

/**
 * HR Performance & Risk Control Schema
 *
 * - performance_records: BU/quarterly performance with freeze/optimistic-lock
 * - violation_events:    Red-line events triggering auto-freeze on MAJOR+
 */

// ── Enums ────────────────────────────────────────────────────
export const violationSeverityEnum = pgEnum("violation_severity", [
  "MINOR",     // 一般违规 — warning only
  "MAJOR",     // 重大违规 — auto-freeze performance
  "CRITICAL",  // 严重违规 — freeze + escalate to CEO
]);

export const violationStatusEnum = pgEnum("violation_status", [
  "open",
  "investigating",
  "confirmed",
  "resolved",
  "dismissed",
]);

// ══════════════════════════════════════════════════════════════
// performance_records — BU quarterly performance snapshots
// ══════════════════════════════════════════════════════════════

export const performanceRecords = pgTable("performance_records", {
  id: serial("id").primaryKey(),

  // Scope
  buId: integer("bu_id"),                                           // soft FK → BU
  departmentId: integer("department_id"),                            // soft FK → departments
  userId: integer("user_id"),                                       // soft FK → users (individual performance)

  // Period
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),                            // 1-4

  // KPI actuals
  revenueTarget: decimal("revenue_target", { precision: 15, scale: 2 }),
  revenueActual: decimal("revenue_actual", { precision: 15, scale: 2 }),
  profitTarget: decimal("profit_target", { precision: 15, scale: 2 }),
  profitActual: decimal("profit_actual", { precision: 15, scale: 2 }),
  kpiScore: decimal("kpi_score", { precision: 5, scale: 2 }),       // composite 0-100
  bonusCoefficient: decimal("bonus_coefficient", { precision: 4, scale: 2 }).default("1.00"),

  // Detailed KPI breakdown
  kpiDetailsJson: json("kpi_details_json").$type<Array<{
    kpiName: string;
    weight: number;
    target: number;
    actual: number;
    score: number;
  }>>(),

  // Freeze / Optimistic lock
  isFrozen: boolean("is_frozen").default(false).notNull(),
  frozenAt: timestamp("frozen_at", { mode: "string" }),
  frozenBy: varchar("frozen_by", { length: 50 }),
  frozenReason: varchar("frozen_reason", { length: 500 }),
  version: integer("version").default(1).notNull(),                 // optimistic lock

  // Metadata
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  status: varchar("status", { length: 20 }).default("draft"),       // draft → submitted → reviewed → finalized
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("perf_rec_bu_idx").on(table.buId),
  index("perf_rec_user_idx").on(table.userId),
  index("perf_rec_year_quarter_idx").on(table.year, table.quarter),
  index("perf_rec_status_idx").on(table.status),
  index("perf_rec_frozen_idx").on(table.isFrozen),
]);

// ══════════════════════════════════════════════════════════════
// violation_events — Red-line incidents (auto-freeze triggers)
// ══════════════════════════════════════════════════════════════

export const violationEvents = pgTable("violation_events", {
  id: serial("id").primaryKey(),

  // Classification
  eventType: varchar("event_type", { length: 50 }).notNull(),       // 'quality_defect' | 'safety_incident' | 'compliance_breach' | 'customer_complaint' | 'financial_anomaly'
  severity: violationSeverityEnum("severity").notNull(),
  sourceModule: varchar("source_module", { length: 50 }),            // originating module: 'quality', 'safety', 'compliance', 'crm', 'finance'

  // Scope
  buId: integer("bu_id"),
  departmentId: integer("department_id"),
  userId: integer("user_id"),                                        // responsible individual
  projectId: integer("project_id"),                                  // related project if any

  // Details
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  evidenceJson: json("evidence_json").$type<Array<{
    type: string;      // 'document' | 'photo' | 'log' | 'report'
    url?: string;
    description: string;
  }>>(),

  // Impact & Actions
  impactDescription: text("impact_description"),
  correctionPlan: text("correction_plan"),
  actionItemsJson: json("action_items_json").$type<Array<{
    step: number;
    description: string;
    responsible: string;
    deadline?: string;
    status: string;
  }>>(),

  // Auto-freeze link
  frozePerformanceId: integer("froze_performance_id"),               // FK → performance_records.id (if freeze was triggered)

  // Lifecycle
  status: violationStatusEnum("status").default("open").notNull(),
  triggeredBy: varchar("triggered_by", { length: 50 }),              // user or 'system'
  resolvedBy: varchar("resolved_by", { length: 50 }),
  resolvedAt: timestamp("resolved_at", { mode: "string" }),
  resolutionNotes: text("resolution_notes"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("violation_evt_severity_idx").on(table.severity),
  index("violation_evt_bu_idx").on(table.buId),
  index("violation_evt_user_idx").on(table.userId),
  index("violation_evt_status_idx").on(table.status),
  index("violation_evt_type_idx").on(table.eventType),
  index("violation_evt_created_idx").on(table.createdAt),
]);

// ── Type exports ─────────────────────────────────────────────
export type PerformanceRecord = InferSelectModel<typeof performanceRecords>;
export type InsertPerformanceRecord = InferInsertModel<typeof performanceRecords>;
export type ViolationEvent = InferSelectModel<typeof violationEvents>;
export type InsertViolationEvent = InferInsertModel<typeof violationEvents>;
