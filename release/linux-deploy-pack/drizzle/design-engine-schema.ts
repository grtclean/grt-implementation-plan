/**
 * M3 Design Automation Engine — Drizzle Schema
 *
 * Core tables for non-standard equipment modular design:
 * - equipment_stations: Decomposed cleaning stations (ST1-ST15) per project
 * - design_export_logs: CAD/EPLAN export audit trail
 */

import {
  pgTable, pgEnum, serial, integer, varchar, text,
  timestamp, json, decimal, index, boolean,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────────────────────

export const stationTypeEnum = pgEnum("station_type", [
  "LOADING",        // 上料
  "PRE_WASH",       // 预清洗
  "ULTRASONIC",     // 超声波清洗
  "SPRAY",          // 高压喷淋
  "TURBULENCE",     // 湍流清洗
  "ROBOT_CLEAN",    // 机器人清洗
  "RINSE",          // 漂洗
  "DI_RINSE",       // 纯水漂洗
  "PASSIVATION",    // 钝化/防锈
  "DEGREASING",     // 脱脂
  "AIR_KNIFE",      // 切风
  "HOT_AIR_DRY",    // 热风干燥
  "VACUUM_DRY",     // 真空干燥
  "COOLDOWN",       // 冷却
  "INSPECTION",     // 检测
  "UNLOADING",      // 下料
  "TRANSFER",       // 转运/翻转
]);

export const exportFormatEnum = pgEnum("export_format", [
  "SOLIDWORKS_VBA",  // SolidWorks VBA macro
  "SOLIDWORKS_XML",  // SolidWorks parametric XML
  "EPLAN_XML",       // EPLAN P8 / Pro Panel XML
  "EPLAN_EXCEL",     // EPLAN Excel BOM import
]);

export const exportStatusEnum = pgEnum("export_status", [
  "GENERATING", "COMPLETED", "FAILED", "DOWNLOADED",
]);

// ── equipment_stations ───────────────────────────────────────────────────

export interface MechanicalParams {
  tankLength?: number;       // mm
  tankWidth?: number;        // mm
  tankHeight?: number;       // mm
  tankVolume?: number;       // liters
  tankMaterial?: string;     // SUS304 | SUS316L | PP | PVDF | Q235B
  pumpType?: string;         // centrifugal | diaphragm | magnetic
  pumpFlowRate?: number;     // L/min
  pumpHead?: number;         // meters
  heaterPower?: number;      // kW
  ultrasonicFrequency?: number; // kHz (25/28/40/68/120)
  ultrasonicPower?: number;  // W total
  transducerCount?: number;
  filtrationMicron?: number; // filter mesh
  nozzleType?: string;       // flat-fan | full-cone | hollow-cone
  nozzleCount?: number;
  sprayPressure?: number;    // bar
  conveyorType?: string;     // chain | roller | belt | hoist
  conveyorSpeed?: number;    // m/min
  agitationType?: string;    // bubbling | mechanical | ultrasonic
  dryingTemp?: number;       // °C
  dryingAirflow?: number;    // m³/h
  vacuumLevel?: number;      // mbar
  weightCapacity?: number;   // kg per workpiece
}

export interface ElectricalParams {
  plcDI?: number;            // digital inputs
  plcDO?: number;            // digital outputs
  plcAI?: number;            // analog inputs
  plcAO?: number;            // analog outputs
  totalIoPoints?: number;
  motorCount?: number;
  motorTotalPower?: number;  // kW
  motorDetails?: Array<{ name: string; power: number; voltage: number; type: string }>;
  sensorCount?: number;
  sensorTypes?: Array<{ type: string; count: number; model?: string }>;
  heaterCircuits?: number;
  heaterTotalPower?: number; // kW
  safetyInterlocks?: string[];   // e.g. ["liquid_level_low", "over_temperature", "door_open"]
  communicationProtocol?: string; // PROFINET | EtherCAT | Modbus_TCP | PROFIBUS
  hmiScreens?: number;
  controlCabinetSize?: string;   // e.g. "800x600x2200"
  wiringStandard?: string;       // IEC | UL | GB
  voltageSystem?: string;        // 380V/3P/50Hz | 480V/3P/60Hz
  emergencyStopCount?: number;
}

export const equipmentStations = pgTable("equipment_stations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  proposalId: integer("proposal_id"),            // link to P2 ai_solution_proposals
  stationCode: varchar("station_code", { length: 20 }).notNull(), // ST01, ST02, ...
  stationIndex: integer("station_index").notNull().default(1),    // ordering
  stationName: varchar("station_name", { length: 200 }).notNull(),
  stationNameEn: varchar("station_name_en", { length: 200 }).default(""),
  stationType: stationTypeEnum("station_type").notNull(),
  description: text("description").default(""),
  cycleTime: integer("cycle_time"),              // seconds per station
  mechanicalParams: json("mechanical_params").$type<MechanicalParams>().default({}),
  electricalParams: json("electrical_params").$type<ElectricalParams>().default({}),
  aiGenerated: boolean("ai_generated").default(false),
  aiConfidence: decimal("ai_confidence", { precision: 3, scale: 2 }),  // 0.00-1.00
  manualOverride: boolean("manual_override").default(false),
  notes: text("notes").default(""),
  buCode: varchar("bu_code", { length: 20 }).default("BU3"),
  createdBy: varchar("created_by", { length: 100 }).default(""),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("equip_stations_project_idx").on(table.projectId),
  index("equip_stations_proposal_idx").on(table.proposalId),
  index("equip_stations_type_idx").on(table.stationType),
]);

export type EquipmentStation = InferSelectModel<typeof equipmentStations>;
export type InsertEquipmentStation = InferInsertModel<typeof equipmentStations>;

// ── design_export_logs ───────────────────────────────────────────────────

export const designExportLogs = pgTable("design_export_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  exportFormat: exportFormatEnum("export_format").notNull(),
  exportStatus: exportStatusEnum("export_status").default("GENERATING").notNull(),
  stationIds: json("station_ids").$type<number[]>().default([]),  // which stations exported
  fileContent: text("file_content"),             // generated VBA/XML/Excel content
  fileName: varchar("file_name", { length: 500 }).default(""),
  fileSizeBytes: integer("file_size_bytes"),
  generationTimeMs: integer("generation_time_ms"),
  downloadCount: integer("download_count").default(0),
  exportedBy: varchar("exported_by", { length: 100 }).default(""),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("export_logs_project_idx").on(table.projectId),
  index("export_logs_format_idx").on(table.exportFormat),
]);

export type DesignExportLog = InferSelectModel<typeof designExportLogs>;
export type InsertDesignExportLog = InferInsertModel<typeof designExportLogs>;

// ── design_sync_events (P1.1: Conflict Check audit trail) ───────────────

export const designSyncEventTypeEnum = pgEnum("design_sync_event_type", [
  "mech_update", "plc_gen", "eplan_gen", "hmi_gen",
  "conflict_detected", "conflict_resolved", "robot_anomaly",
  "safety_incident", "hr_penalty", "version_promoted",
]);

export const designSyncEvents = pgTable("design_sync_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  eventType: designSyncEventTypeEnum("event_type").notNull(),
  stationId: integer("station_id"),
  userId: integer("user_id"),
  userName: varchar("user_name", { length: 100 }),
  description: text("description").default(""),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  severity: varchar("severity", { length: 20 }).default("info"), // info | warning | critical
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("sync_events_project_idx").on(table.projectId),
  index("sync_events_type_idx").on(table.eventType),
  index("sync_events_created_idx").on(table.createdAt),
]);

export type DesignSyncEvent = InferSelectModel<typeof designSyncEvents>;
export type InsertDesignSyncEvent = InferInsertModel<typeof designSyncEvents>;
