/**
 * Supplier Risk Scoring — Real-time Interlock Schema
 * Phase 2.2 — IQC (QMS) ↔ Procurement (SCM) Fusion
 *
 * This schema bridges two existing domains:
 *   ① QMS — incomingInspectionRecords (supply-chain-schema.ts)
 *   ② SCM — suppliers + supplierPenalties (procurement-schema.ts / supply-chain-schema.ts)
 *
 * It does NOT duplicate those tables. It adds:
 *   - supplier_risk_scores: computed risk snapshot per supplier
 *   - supplier_risk_events: audit trail of score changes + interlock triggers
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────

export const supplierRiskStatusEnum = pgEnum("supplier_risk_status", [
  "ACTIVE",       // Score ≥ 85 — normal operations
  "WARNING",      // Score 60–84 — increased monitoring
  "RESTRICTED",   // Score < 60 — new POs blocked
]);

export const riskEventTypeEnum = pgEnum("risk_event_type", [
  "IQC_PENALTY",        // Score dropped due to IQC defect rate
  "SCORE_RECOVERY",     // Score improved after clean inspections
  "STATUS_CHANGE",      // ACTIVE → WARNING → RESTRICTED
  "MANUAL_OVERRIDE",    // CEO/Director forced unblock
  "PERIODIC_REVIEW",    // Scheduled re-evaluation
]);

// ─── Supplier Risk Scores (computed snapshot) ────────────────────────

export const supplierRiskScores = pgTable("supplier_risk_scores", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),             // FK → suppliers.id
  supplierName: varchar("supplier_name", { length: 200 }).notNull(),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(),  // 0–100
  status: supplierRiskStatusEnum("status").notNull().default("ACTIVE"),
  movingDefectRate: decimal("moving_defect_rate", { precision: 5, scale: 4 }),  // 0.0000–1.0000
  inspectionCount: integer("inspection_count").notNull().default(0),
  totalDefects: integer("total_defects").notNull().default(0),
  totalInspected: integer("total_inspected").notNull().default(0),
  lastInspectionDate: timestamp("last_inspection_date", { mode: "string" }),
  lastCalculatedAt: timestamp("last_calculated_at", { mode: "string" }).defaultNow().notNull(),
  notes: text("notes"),
}, (table) => [
  index("idx_srs_supplier").on(table.supplierId),
  index("idx_srs_status").on(table.status),
  index("idx_srs_score").on(table.riskScore),
]);

// ─── Supplier Risk Events (audit trail) ──────────────────────────────

export const supplierRiskEvents = pgTable("supplier_risk_events", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  eventType: riskEventTypeEnum("event_type").notNull(),
  previousScore: decimal("previous_score", { precision: 5, scale: 2 }),
  newScore: decimal("new_score", { precision: 5, scale: 2 }),
  previousStatus: varchar("previous_status", { length: 20 }),
  newStatus: varchar("new_status", { length: 20 }),
  triggerInspectionId: integer("trigger_inspection_id"),       // FK → incomingInspectionRecords.id
  triggerDefectRate: decimal("trigger_defect_rate", { precision: 5, scale: 4 }),
  description: text("description"),
  performedBy: integer("performed_by"),
  performedByName: varchar("performed_by_name", { length: 100 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_sre_supplier").on(table.supplierId),
  index("idx_sre_type").on(table.eventType),
  index("idx_sre_date").on(table.createdAt),
]);
