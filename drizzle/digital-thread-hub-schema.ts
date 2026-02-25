/**
 * Digital Thread Hub Schema — The Capstone Data Layer
 * Phase 4 — Ultimate Digital Thread & Executive Cockpit
 *
 * Two tables that unify ALL 11 modules into a single data fabric:
 *
 *   1 thread_events — Universal event log. Every significant action
 *     from any module writes one row here, creating an immutable
 *     timeline of the entire enterprise.
 *
 *   2 ceo_kpi_snapshots — Daily aggregated snapshot for the CEO
 *     Executive Cockpit. One row per day = one view of the company.
 *
 * Bridges ALL existing domains:
 *   Phase 1: SOP Interlock, OEE Dashboard, Compliance Calendar
 *   Phase 2: ECO Impact, Supplier Risk, Employee Profile, FMEA Dynamic
 *   Phase 3: AI Intervention, Smart Scheduler, Smart Inventory, Carbon/CBAM
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  jsonb,
  date,
  index,
} from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────

export const threadSourceModuleEnum = pgEnum("thread_source_module", [
  "SOP",            // Phase 1.2 — SOP Interlock
  "OEE",            // Phase 1.3 — OEE Dashboard
  "COMPLIANCE",     // Phase 1.4 — Compliance Calendar
  "ECO",            // Phase 2.1 — ECO Cost Impact
  "SUPPLIER",       // Phase 2.2 — Supplier Risk
  "EMPLOYEE",       // Phase 2.3 — Employee Profile
  "FMEA",           // Phase 2.4 — FMEA Dynamic RPN
  "HR_AI",          // Phase 3.1 — AI Training Closed-Loop
  "SCHEDULER",      // Phase 3.2 — Smart Scheduler
  "INVENTORY",      // Phase 3.3 — Smart Inventory
  "CBAM",           // Phase 3.4 — Carbon Footprint
]);

export const threadEventTypeEnum = pgEnum("thread_event_type", [
  "CREATED",
  "STATUS_CHANGE",
  "ALERT",
  "RESOLVED",
  "ESCALATED",
  "APPROVED",
  "BLOCKED",
  "UNBLOCKED",
]);

export const threadSeverityEnum = pgEnum("thread_severity", [
  "INFO",
  "WARNING",
  "CRITICAL",
]);

// ─── Thread Events — Universal Event Log ─────────────────────────────

export const threadEvents = pgTable("thread_events", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id", { length: 100 }).notNull(),
  timestamp: timestamp("timestamp", { mode: "string" }).defaultNow().notNull(),

  sourceModule: threadSourceModuleEnum("source_module").notNull(),
  eventType: threadEventTypeEnum("event_type").notNull(),
  severity: threadSeverityEnum("severity").notNull(),

  entityId: varchar("entity_id", { length: 100 }),       // e.g., "ECO-2026-001", "CNC-001"
  entityType: varchar("entity_type", { length: 100 }),    // e.g., "eco", "machine", "operator"

  summaryZh: text("summary_zh").notNull(),
  summaryEn: text("summary_en").notNull(),

  linkedProjectId: integer("linked_project_id"),
  linkedUser: varchar("linked_user", { length: 100 }),

  metadata: jsonb("metadata"),                            // arbitrary payload

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_te_module").on(table.sourceModule),
  index("idx_te_severity").on(table.severity),
  index("idx_te_timestamp").on(table.timestamp),
  index("idx_te_entity").on(table.entityType, table.entityId),
  index("idx_te_project").on(table.linkedProjectId),
]);

// ─── CEO KPI Snapshots — Daily Executive Summary ─────────────────────

export const ceoKpiSnapshots = pgTable("ceo_kpi_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: date("snapshot_date").notNull(),

  // Projects
  totalProjects: integer("total_projects").default(0),
  onTrackProjects: integer("on_track_projects").default(0),
  atRiskProjects: integer("at_risk_projects").default(0),

  // Production (Phase 1.3 + 3.2)
  overallOee: decimal("overall_oee", { precision: 5, scale: 2 }),             // 0-100%
  criticalMachines: integer("critical_machines").default(0),
  autoRescheduledJobs: integer("auto_rescheduled_jobs").default(0),

  // Quality (Phase 2.4 + 1.2)
  open8dCount: integer("open_8d_count").default(0),
  overdueCapaCount: integer("overdue_capa_count").default(0),
  maxFmeaRpn: integer("max_fmea_rpn").default(0),

  // Cost (Phase 2.1)
  costVariancePercent: decimal("cost_variance_percent", { precision: 5, scale: 2 }),  // positive = over budget

  // Supply Chain (Phase 2.2 + 3.3)
  avgSupplierScore: decimal("avg_supplier_score", { precision: 5, scale: 2 }),
  restrictedSuppliers: integer("restricted_suppliers").default(0),
  inventoryCashReleasePotential: decimal("inventory_cash_release_potential", { precision: 14, scale: 2 }),

  // ESG (Phase 3.4 + 1.4)
  cbamCompliantProducts: integer("cbam_compliant_products").default(0),
  cbamAtRiskProducts: integer("cbam_at_risk_products").default(0),
  totalCo2Kg: decimal("total_co2_kg", { precision: 14, scale: 2 }),
  complianceOverdueItems: integer("compliance_overdue_items").default(0),

  // People (Phase 3.1 + 2.3)
  operatorBlocksActive: integer("operator_blocks_active").default(0),
  avgCombatPower: decimal("avg_combat_power", { precision: 5, scale: 2 }),

  // Company Health
  companyHealthScore: integer("company_health_score").default(0),             // 0-100 weighted composite

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_cks_date").on(table.snapshotDate),
]);
