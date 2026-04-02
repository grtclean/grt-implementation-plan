/**
 * OEE (Overall Equipment Effectiveness) Schema
 * Phase 1.3 — IATF 16949 Compliance Dashboard
 *
 * OEE = Availability x Performance x Quality
 *
 * Links to existing tables:
 *   - productionEquipments (drizzle/production-equipment-schema.ts) — machine registry
 *
 * New tables:
 *   1. production_shift_logs — per-shift production data for OEE calculation
 *   2. oee_snapshots         — pre-computed OEE scores (cache / historical trend)
 */

import {
  pgTable, serial, integer, varchar, text, timestamp, decimal, boolean, index, date,
} from "drizzle-orm/pg-core";

// ─── 1. Production Shift Logs ───────────────────────────────────────
// One row per machine per shift. Captures the raw input data for OEE.
// Data source: MES integration, manual kiosk entry, or PLC telemetry.

export const productionShiftLogs = pgTable("production_shift_logs", {
  id: serial("id").primaryKey(),

  // FK → productionEquipments.id
  machineId: integer("machine_id").notNull(),

  // Shift identifier: 'morning' | 'afternoon' | 'night'
  shiftCode: varchar("shift_code", { length: 20 }).notNull(),

  // Date of the shift
  shiftDate: date("shift_date", { mode: "string" }).notNull(),

  // ── Availability inputs (minutes) ──
  // Total scheduled production time for this shift (e.g., 480 min = 8 hrs)
  plannedProductionMinutes: integer("planned_production_minutes").notNull(),
  // Actual operating time (planned minus unplanned downtime)
  operatingMinutes: integer("operating_minutes").notNull(),
  // Planned downtime (scheduled maintenance, breaks) — already excluded from planned
  plannedDowntimeMinutes: integer("planned_downtime_minutes").notNull().default(0),
  // Unplanned downtime (breakdowns, changeover overruns)
  unplannedDowntimeMinutes: integer("unplanned_downtime_minutes").notNull().default(0),

  // ── Performance inputs ──
  // Ideal cycle time per unit (seconds)
  idealCycleTimeSeconds: decimal("ideal_cycle_time_seconds", { precision: 10, scale: 2 }).notNull(),
  // Total units produced (good + defective)
  totalCount: integer("total_count").notNull().default(0),

  // ── Quality inputs ──
  // Defective/rejected units
  defectCount: integer("defect_count").notNull().default(0),

  // Who entered / source
  enteredBy: integer("entered_by"),
  dataSource: varchar("data_source", { length: 50 }).default("manual"), // 'manual' | 'mes' | 'plc'

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_psl_machine_id").on(table.machineId),
  index("idx_psl_shift_date").on(table.shiftDate),
  index("idx_psl_machine_date").on(table.machineId, table.shiftDate),
]);

// ─── 2. OEE Snapshots ──────────────────────────────────────────────
// Pre-computed daily OEE per machine. Populated by a scheduled job
// or on-demand from shift logs. Used for trend dashboards.
// Phase 2: These will be Redis-cached with TTL=60s.

export const oeeSnapshots = pgTable("oee_snapshots", {
  id: serial("id").primaryKey(),

  machineId: integer("machine_id").notNull(),
  snapshotDate: date("snapshot_date", { mode: "string" }).notNull(),

  // The 3 OEE components (0.00 to 1.00)
  availability: decimal("availability", { precision: 5, scale: 4 }).notNull(),
  performance: decimal("performance", { precision: 5, scale: 4 }).notNull(),
  quality: decimal("quality", { precision: 5, scale: 4 }).notNull(),

  // Final OEE = availability * performance * quality
  oee: decimal("oee", { precision: 5, scale: 4 }).notNull(),

  // Aggregate inputs for auditability
  totalPlannedMinutes: integer("total_planned_minutes"),
  totalOperatingMinutes: integer("total_operating_minutes"),
  totalCount: integer("total_count"),
  totalDefects: integer("total_defects"),

  computedAt: timestamp("computed_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_oee_snap_machine").on(table.machineId),
  index("idx_oee_snap_date").on(table.snapshotDate),
  index("idx_oee_snap_machine_date").on(table.machineId, table.snapshotDate),
]);
