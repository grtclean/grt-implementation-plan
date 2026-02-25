/**
 * Dynamic FMEA RPN — Shop Floor ↔ Engineering Fusion Schema
 * Phase 2.4 — QMS (Defects) ↔ FMEA (Engineering Methodology) Silo Breaker
 *
 * This schema bridges TWO existing domains:
 *   ① Engineering — fmea_documents + fmea_items (schema.ts lines 11369–11431)
 *   ② Shop Floor QC — qc_inspection_records + scrap_disposal_records
 *
 * It does NOT duplicate those tables. It adds:
 *   - shop_floor_defect_logs: timestamped defect events linked to FMEA failure modes
 *   - fmea_rpn_history: audit trail of RPN recalculations triggered by defect feed
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

export const defectSourceEnum = pgEnum("defect_source", [
  "SHOP_FLOOR",       // In-process inspection
  "FINAL_QC",         // Final quality check
  "IQC",              // Incoming material
  "CUSTOMER_RETURN",  // Field failure / warranty
  "INTERNAL_AUDIT",   // Audit finding
]);

export const fmeaDynamicStatusEnum = pgEnum("fmea_dynamic_status", [
  "NOMINAL",          // RPN within acceptable range
  "ELEVATED",         // RPN > 80 — monitoring required
  "CRITICAL",         // RPN > 100 — CAPA REQUIRED
  "CAPA_INITIATED",   // CAPA ticket opened
]);

// ─── Shop Floor Defect Logs (defect events linked to FMEA items) ────

export const shopFloorDefectLogs = pgTable("shop_floor_defect_logs", {
  id: serial("id").primaryKey(),
  fmeaItemId: integer("fmea_item_id").notNull(),          // FK → fmea_items.id
  defectSource: defectSourceEnum("defect_source").notNull(),
  quantity: integer("quantity").notNull().default(1),
  processStep: varchar("process_step", { length: 200 }),
  failureMode: varchar("failure_mode", { length: 500 }),    // denormalized for query speed
  partNumber: varchar("part_number", { length: 100 }),
  workOrderId: integer("work_order_id"),
  inspectionRecordId: integer("inspection_record_id"),      // FK → qc_inspection_records.id
  reportedBy: integer("reported_by"),
  reportedByName: varchar("reported_by_name", { length: 100 }),
  reportedAt: timestamp("reported_at", { mode: "string" }).defaultNow().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_sfdl_fmea_item").on(table.fmeaItemId),
  index("idx_sfdl_reported_at").on(table.reportedAt),
  index("idx_sfdl_failure_mode").on(table.failureMode),
  index("idx_sfdl_source").on(table.defectSource),
]);

// ─── FMEA RPN History (audit trail of dynamic recalculations) ────────

export const fmeaRpnHistory = pgTable("fmea_rpn_history", {
  id: serial("id").primaryKey(),
  fmeaItemId: integer("fmea_item_id").notNull(),
  // Before
  previousSeverity: integer("previous_severity").notNull(),
  previousOccurrence: integer("previous_occurrence").notNull(),
  previousDetection: integer("previous_detection").notNull(),
  previousRpn: integer("previous_rpn").notNull(),
  previousStatus: varchar("previous_status", { length: 30 }),
  // After
  newSeverity: integer("new_severity").notNull(),
  newOccurrence: integer("new_occurrence").notNull(),
  newDetection: integer("new_detection").notNull(),
  newRpn: integer("new_rpn").notNull(),
  newStatus: varchar("new_status", { length: 30 }),
  // Trigger context
  defectCount30d: integer("defect_count_30d").notNull(),
  triggerReason: text("trigger_reason"),
  rpnDelta: integer("rpn_delta").notNull(),                 // newRpn - previousRpn
  capaRequired: boolean("capa_required").default(false),
  capaId: integer("capa_id"),                               // FK → capa_records.id (if initiated)
  calculatedAt: timestamp("calculated_at", { mode: "string" }).defaultNow().notNull(),
  calculatedBy: varchar("calculated_by", { length: 100 }).default("SYSTEM"),
}, (table) => [
  index("idx_frh_fmea_item").on(table.fmeaItemId),
  index("idx_frh_calculated_at").on(table.calculatedAt),
  index("idx_frh_capa_required").on(table.capaRequired),
]);
