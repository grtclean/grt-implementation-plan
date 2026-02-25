/**
 * Smart Scheduling — IoT Health Monitoring & Auto-Rescheduling Schema
 * Phase 3.2 — Equipment Health & Auto-Scheduling
 *
 * This schema enables the Self-Healing Factory:
 *   1 Machine health sensors (IoT telemetry feed)
 *   2 Production schedule (jobs assigned to machines with time slots)
 *   3 Maintenance work orders (predictive & breakdown)
 *   4 Rescheduling audit log (AI decision trail)
 *
 * Bridges existing domains:
 *   - productionEquipments (production-equipment-schema.ts)  -> machine registry
 *   - productionWorkOrders (schema.ts)                       -> job source
 *   - equipmentMaintenanceRecords (supply-chain-schema.ts)   -> maintenance history
 *   - productionShiftLogs (oee-schema.ts)                    -> OEE data
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

export const healthStatusEnum = pgEnum("machine_health_status", [
  "HEALTHY",        // score >= 70
  "WARNING",        // score 40-69
  "CRITICAL",       // score < 40
  "OFFLINE",        // no telemetry
]);

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "SCHEDULED",      // planned, not started
  "IN_PROGRESS",    // currently running
  "MOVED_AUTO",     // AI auto-rescheduled to backup machine
  "MOVED_MANUAL",   // operator manually moved
  "COMPLETED",      // finished
  "CANCELLED",      // removed from schedule
]);

export const maintenanceTypeEnum = pgEnum("smart_maintenance_type", [
  "PREDICTIVE",     // AI-triggered before failure
  "BREAKDOWN",      // reactive, after failure
  "PREVENTIVE",     // calendar-based routine
]);

export const maintenancePriorityEnum = pgEnum("maintenance_priority", [
  "CRITICAL",       // health < 40, immediate
  "HIGH",           // health 40-55, within 4h
  "MEDIUM",         // health 55-70, within 24h
  "LOW",            // scheduled routine
]);

export const maintenanceStatusEnum = pgEnum("smart_maintenance_status", [
  "OPEN",           // created, awaiting team
  "ASSIGNED",       // technician assigned
  "IN_PROGRESS",    // work underway
  "COMPLETED",      // resolved
  "CANCELLED",      // no longer needed
]);

// ─── Machine Health Sensors (IoT telemetry) ──────────────────────────

export const machineHealthSensors = pgTable("machine_health_sensors", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").notNull(),
  machineCode: varchar("machine_code", { length: 50 }).notNull(),
  machineName: varchar("machine_name", { length: 200 }),

  // Sensor readings
  vibrationLevel: decimal("vibration_level", { precision: 8, scale: 3 }),   // mm/s RMS
  temperature: decimal("temperature", { precision: 6, scale: 2 }),           // Celsius
  spindleLoad: decimal("spindle_load", { precision: 5, scale: 2 }),         // % of rated
  coolantPressure: decimal("coolant_pressure", { precision: 6, scale: 2 }), // bar
  powerConsumption: decimal("power_consumption", { precision: 8, scale: 2 }), // kW

  // Computed health
  healthScore: integer("health_score").notNull(),   // 0-100
  healthStatus: healthStatusEnum("health_status").notNull(),
  healthTrend: varchar("health_trend", { length: 20 }),  // "IMPROVING" | "STABLE" | "DEGRADING"

  lastUpdated: timestamp("last_updated", { mode: "string" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_mhs_machine").on(table.machineId),
  index("idx_mhs_code").on(table.machineCode),
  index("idx_mhs_health").on(table.healthScore),
  index("idx_mhs_status").on(table.healthStatus),
]);

// ─── Production Schedule (jobs on machines) ──────────────────────────

export const productionSchedule = pgTable("smart_production_schedule", {
  id: serial("id").primaryKey(),
  jobId: varchar("job_id", { length: 50 }).notNull(),
  jobName: varchar("job_name", { length: 200 }).notNull(),
  projectCode: varchar("project_code", { length: 50 }),

  machineId: integer("machine_id").notNull(),
  machineCode: varchar("machine_code", { length: 50 }).notNull(),

  startTime: timestamp("start_time", { mode: "string" }).notNull(),
  endTime: timestamp("end_time", { mode: "string" }).notNull(),

  status: scheduleStatusEnum("status").default("SCHEDULED").notNull(),

  // Auto-reschedule tracking
  originalMachineId: integer("original_machine_id"),
  originalMachineCode: varchar("original_machine_code", { length: 50 }),
  movedAt: timestamp("moved_at", { mode: "string" }),
  moveReason: text("move_reason"),

  priority: integer("priority").default(5),  // 1=highest, 10=lowest
  estimatedHours: decimal("estimated_hours", { precision: 6, scale: 2 }),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_sps_job").on(table.jobId),
  index("idx_sps_machine").on(table.machineId),
  index("idx_sps_status").on(table.status),
  index("idx_sps_start").on(table.startTime),
]);

// ─── Maintenance Work Orders ─────────────────────────────────────────

export const maintenanceWorkOrders = pgTable("smart_maintenance_work_orders", {
  id: serial("id").primaryKey(),
  orderCode: varchar("order_code", { length: 50 }).notNull(),
  machineId: integer("machine_id").notNull(),
  machineCode: varchar("machine_code", { length: 50 }).notNull(),
  machineName: varchar("machine_name", { length: 200 }),

  type: maintenanceTypeEnum("type").notNull(),
  priority: maintenancePriorityEnum("priority").notNull(),
  status: maintenanceStatusEnum("status").default("OPEN").notNull(),

  healthScoreAtCreation: integer("health_score_at_creation"),
  triggerReason: text("trigger_reason").notNull(),

  assignedTo: varchar("assigned_to", { length: 100 }),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  actualDurationMinutes: integer("actual_duration_minutes"),

  startedAt: timestamp("started_at", { mode: "string" }),
  completedAt: timestamp("completed_at", { mode: "string" }),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_smwo_machine").on(table.machineId),
  index("idx_smwo_type").on(table.type),
  index("idx_smwo_priority").on(table.priority),
  index("idx_smwo_status").on(table.status),
]);

// ─── Rescheduling Audit Log (AI decision trail) ─────────────────────

export const reschedulingAuditLog = pgTable("rescheduling_audit_log", {
  id: serial("id").primaryKey(),
  triggerMachineId: integer("trigger_machine_id").notNull(),
  triggerMachineCode: varchar("trigger_machine_code", { length: 50 }).notNull(),
  triggerHealthScore: integer("trigger_health_score").notNull(),

  jobsMoved: integer("jobs_moved").notNull(),
  maintenanceOrderCreated: boolean("maintenance_order_created").default(false),
  maintenanceOrderId: integer("maintenance_order_id"),

  backupMachineId: integer("backup_machine_id"),
  backupMachineCode: varchar("backup_machine_code", { length: 50 }),

  decisionSummary: text("decision_summary").notNull(),
  executedAt: timestamp("executed_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_ral_trigger").on(table.triggerMachineId),
  index("idx_ral_executed").on(table.executedAt),
]);
