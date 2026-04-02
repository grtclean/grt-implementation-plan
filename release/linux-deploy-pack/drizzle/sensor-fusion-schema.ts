/**
 * Sensor Fusion Schema — Cross-system telemetry correlation & anomaly detection
 *
 * Tables:
 * - fused_equipment_readings: Multi-source fused metric snapshots
 * - anomaly_patterns: Configurable anomaly detection rules
 */

import {
  pgTable, pgEnum, serial, integer, varchar, text,
  timestamp, json, boolean, index, real,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const anomalySeverityEnum = pgEnum("anomaly_severity", [
  "info", "warning", "critical",
]);

export const anomalyActionEnum = pgEnum("anomaly_action_type", [
  "alert", "block", "maintenance", "retrain", "escalate",
]);

export interface FusedMetrics {
  temperature?: number;    // from IoT telemetry
  pressure?: number;       // from IoT telemetry
  vibration?: number;      // from IoT telemetry
  flowRate?: number;       // from robot cleaning
  oee?: number;            // from OEE snapshots (0-1)
  cleanlinessScore?: number; // from robot cleaning (mg)
  torqueActual?: number;   // from oiling torque records
  cycleTime?: number;      // from tech performance
  defectRate?: number;     // computed
}

export interface AnomalyCondition {
  metric: string;
  operator: "gt" | "lt" | "eq" | "gte" | "lte" | "between";
  threshold: number;
  thresholdHigh?: number; // for "between" operator
}

// ── Fused Equipment Readings ────────────────────────────────────────────

export const fusedEquipmentReadings = pgTable("fused_equipment_readings", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  equipmentName: varchar("equipment_name", { length: 200 }),
  timestamp: timestamp("timestamp", { mode: "string" }).defaultNow().notNull(),
  metrics: json("metrics").$type<FusedMetrics>().default({}),
  anomalyScore: real("anomaly_score").default(0), // 0-100
  anomalyType: varchar("anomaly_type", { length: 100 }),
  sourceRobotCleaningId: integer("source_robot_cleaning_id"),
  sourceOeeSnapshotId: integer("source_oee_snapshot_id"),
  sourceTelemetryIds: json("source_telemetry_ids").$type<number[]>().default([]),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("fused_readings_equipment_idx").on(table.equipmentId),
  index("fused_readings_timestamp_idx").on(table.timestamp),
  index("fused_readings_anomaly_idx").on(table.anomalyScore),
]);

export type FusedEquipmentReading = InferSelectModel<typeof fusedEquipmentReadings>;
export type InsertFusedEquipmentReading = InferInsertModel<typeof fusedEquipmentReadings>;

// ── Anomaly Patterns ────────────────────────────────────────────────────

export const anomalyPatterns = pgTable("anomaly_patterns", {
  id: serial("id").primaryKey(),
  patternName: varchar("pattern_name", { length: 200 }).notNull(),
  patternNameEn: varchar("pattern_name_en", { length: 200 }).default(""),
  description: text("description").default(""),
  conditions: json("conditions").$type<AnomalyCondition[]>().default([]),
  severity: anomalySeverityEnum("severity").notNull().default("warning"),
  actionType: anomalyActionEnum("action_type").notNull().default("alert"),
  isActive: boolean("is_active").default(true),
  triggerCount: integer("trigger_count").default(0),
  lastTriggeredAt: timestamp("last_triggered_at", { mode: "string" }),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("anomaly_patterns_active_idx").on(table.isActive),
  index("anomaly_patterns_severity_idx").on(table.severity),
]);

export type AnomalyPattern = InferSelectModel<typeof anomalyPatterns>;
export type InsertAnomalyPattern = InferInsertModel<typeof anomalyPatterns>;
