/**
 * PLC Program Design & Generation Engine — Drizzle Schema
 *
 * 7 tables for the M3 PLC extension:
 * - plc_projects: PLC project master (brand, model, I/O aggregation)
 * - plc_program_modules: Program block tree (FB/FC/OB/DB)
 * - plc_io_mappings: I/O address allocation per signal
 * - plc_alarm_definitions: Alarm database with troubleshooting
 * - plc_user_access_levels: HMI/PLC user authorization levels
 * - plc_version_history: Version iteration tracking (dev/test/prod)
 * - plc_eplan_schematics: Generated EPLAN circuit pages
 */

import {
  pgTable, pgEnum, serial, integer, varchar, text,
  timestamp, json, boolean, index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────────────────────

export const plcBrandEnum = pgEnum("plc_brand", [
  "SIEMENS_S7_1500",
  "SIEMENS_S7_1200",
  "ABB_AC500",
  "INOVANCE_AM600",
  "INOVANCE_H5U",
  "MITSUBISHI_IQR",
  "OMRON_NX",
  "OMRON_NJ",
]);

export const plcProgramStatusEnum = pgEnum("plc_program_status", [
  "draft", "dev", "testing", "staging", "production", "deprecated",
]);

export const plcModuleTypeEnum = pgEnum("plc_module_type", [
  "OB", "FB", "FC", "DB", "UDT", "SAFETY_FB",
]);

export const plcProgramModeEnum = pgEnum("plc_program_mode", [
  "auto", "manual", "service", "changeover", "debug", "e_stop", "initializing",
]);

export type PlcBrand = typeof plcBrandEnum.enumValues[number];
export type PlcProgramStatus = typeof plcProgramStatusEnum.enumValues[number];
export type PlcModuleType = typeof plcModuleTypeEnum.enumValues[number];
export type PlcProgramMode = typeof plcProgramModeEnum.enumValues[number];

// ── Type Interfaces ──────────────────────────────────────────────────────

export interface PlcParameterInterface {
  inputs?: Array<{ name: string; type: string; description?: string; address?: string }>;
  outputs?: Array<{ name: string; type: string; description?: string; address?: string }>;
  inouts?: Array<{ name: string; type: string; description?: string }>;
  statics?: Array<{ name: string; type: string; initialValue?: string; description?: string }>;
  temps?: Array<{ name: string; type: string; description?: string }>;
}

export interface PlcAccessPermissions {
  viewProcess?: boolean;
  adjustParams?: boolean;
  changeRecipe?: boolean;
  manualMode?: boolean;
  serviceMode?: boolean;
  systemConfig?: boolean;
  userAdmin?: boolean;
}

export interface PlcPasswordPolicy {
  minLength?: number;
  requireDigit?: boolean;
  expireDays?: number;
  maxAttempts?: number;
  lockoutMinutes?: number;
}

export interface PlcDefaultUser {
  username: string;
  realName: string;
  role: string;
}

export interface PlcTroubleshootingStep {
  stepNumber: number;
  action: string;
  actionEn?: string;
  expectedResult?: string;
  ifFail?: string;
}

export interface PlcTestResults {
  fatPassed?: boolean;
  satPassed?: boolean;
  notes?: string;
}

// ── Table 1: plc_projects ────────────────────────────────────────────────

export const plcProjects = pgTable("plc_projects", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  plcBrand: plcBrandEnum("plc_brand").notNull().default("SIEMENS_S7_1500"),
  plcModel: varchar("plc_model", { length: 100 }).default("CPU 1516-3 PN/DP"),
  firmwareVersion: varchar("firmware_version", { length: 50 }).default("V3.0"),
  ioTotalDI: integer("io_total_di").default(0),
  ioTotalDO: integer("io_total_do").default(0),
  ioTotalAI: integer("io_total_ai").default(0),
  ioTotalAO: integer("io_total_ao").default(0),
  rackCount: integer("rack_count").default(1),
  cpuModel: varchar("cpu_model", { length: 100 }).default(""),
  hmiModel: varchar("hmi_model", { length: 100 }).default("TP1500 Comfort"),
  hmiScreenCount: integer("hmi_screen_count").default(1),
  networkProtocol: varchar("network_protocol", { length: 50 }).default("PROFINET"),
  currentVersion: varchar("current_version", { length: 50 }).default("V1.0.0-dev"),
  currentStatus: plcProgramStatusEnum("current_status").default("draft"),
  createdBy: varchar("created_by", { length: 100 }).default(""),
  buCode: varchar("bu_code", { length: 20 }).default("BU3"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("plc_projects_project_idx").on(table.projectId),
  index("plc_projects_brand_idx").on(table.plcBrand),
]);

export type PlcProject = InferSelectModel<typeof plcProjects>;
export type InsertPlcProject = InferInsertModel<typeof plcProjects>;

// ── Table 2: plc_program_modules ─────────────────────────────────────────

export const plcProgramModules = pgTable("plc_program_modules", {
  id: serial("id").primaryKey(),
  plcProjectId: integer("plc_project_id").notNull(),
  moduleName: varchar("module_name", { length: 200 }).notNull(),
  moduleType: plcModuleTypeEnum("module_type").notNull(),
  moduleNumber: varchar("module_number", { length: 20 }).notNull(), // OB1, FB100, FC200, DB50
  parentModuleId: integer("parent_module_id"),
  sortOrder: integer("sort_order").default(0),
  description: text("description").default(""),
  descriptionEn: text("description_en").default(""),
  sourceCode: text("source_code").default(""),
  language: varchar("language", { length: 10 }).default("SCL"),    // SCL | ST | LAD | FBD
  parameterInterface: json("parameter_interface").$type<PlcParameterInterface>().default({}),
  isGenerated: boolean("is_generated").default(true),
  isLocked: boolean("is_locked").default(false),
  category: varchar("category", { length: 50 }).default("station_ctrl"),
  // mode_mgmt | safety | station_ctrl | recipe | comm | diagnostic | user_auth | alarm
  version: varchar("version", { length: 20 }).default("V1.0"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("plc_modules_project_idx").on(table.plcProjectId),
  index("plc_modules_type_idx").on(table.moduleType),
  index("plc_modules_parent_idx").on(table.parentModuleId),
]);

export type PlcProgramModule = InferSelectModel<typeof plcProgramModules>;
export type InsertPlcProgramModule = InferInsertModel<typeof plcProgramModules>;

// ── Table 3: plc_io_mappings ─────────────────────────────────────────────

export const plcIoMappings = pgTable("plc_io_mappings", {
  id: serial("id").primaryKey(),
  plcProjectId: integer("plc_project_id").notNull(),
  stationId: integer("station_id"),  // FK to equipment_stations, nullable for system-level I/O
  signalName: varchar("signal_name", { length: 200 }).notNull(),
  signalNameEn: varchar("signal_name_en", { length: 200 }).default(""),
  address: varchar("address", { length: 30 }).notNull(),  // "I0.0", "Q4.1", "IW100", "QW200"
  ioType: varchar("io_type", { length: 5 }).notNull(),    // DI | DO | AI | AO
  dataType: varchar("data_type", { length: 10 }).notNull().default("BOOL"), // BOOL | INT | REAL | WORD
  moduleRack: integer("module_rack").default(0),
  moduleSlot: integer("module_slot").default(0),
  moduleChannel: integer("module_channel").default(0),
  description: text("description").default(""),
  safetyRelevant: boolean("safety_relevant").default(false),
  alarmId: integer("alarm_id"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("plc_io_project_idx").on(table.plcProjectId),
  index("plc_io_station_idx").on(table.stationId),
  index("plc_io_type_idx").on(table.ioType),
]);

export type PlcIoMapping = InferSelectModel<typeof plcIoMappings>;
export type InsertPlcIoMapping = InferInsertModel<typeof plcIoMappings>;

// ── Table 4: plc_alarm_definitions ───────────────────────────────────────

export const plcAlarmDefinitions = pgTable("plc_alarm_definitions", {
  id: serial("id").primaryKey(),
  plcProjectId: integer("plc_project_id").notNull(),
  alarmCode: varchar("alarm_code", { length: 20 }).notNull(),  // ALM-001
  alarmClass: varchar("alarm_class", { length: 5 }).notNull(), // A | B | C | W (fault/alarm/warning/info)
  messageZh: text("message_zh").default(""),
  messageEn: text("message_en").default(""),
  stationId: integer("station_id"),
  triggerCondition: text("trigger_condition").default(""),
  triggerAddress: varchar("trigger_address", { length: 30 }).default(""),
  interlockAction: text("interlock_action").default(""),
  resetType: varchar("reset_type", { length: 20 }).default("manual"), // auto | manual | acknowledge
  severity: varchar("severity", { length: 20 }).default("medium"),    // critical | high | medium | low
  category: varchar("alarm_category", { length: 30 }).default("process"), // process | safety | equipment | communication
  troubleshootingSteps: json("troubleshooting_steps").$type<PlcTroubleshootingStep[]>().default([]),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("plc_alarm_project_idx").on(table.plcProjectId),
  index("plc_alarm_class_idx").on(table.alarmClass),
  index("plc_alarm_station_idx").on(table.stationId),
]);

export type PlcAlarmDefinition = InferSelectModel<typeof plcAlarmDefinitions>;
export type InsertPlcAlarmDefinition = InferInsertModel<typeof plcAlarmDefinitions>;

// ── Table 5: plc_user_access_levels ──────────────────────────────────────

export const plcUserAccessLevels = pgTable("plc_user_access_levels", {
  id: serial("id").primaryKey(),
  plcProjectId: integer("plc_project_id").notNull(),
  levelNumber: integer("level_number").notNull(),  // 0-9
  levelName: varchar("level_name", { length: 100 }).notNull(),
  levelNameEn: varchar("level_name_en", { length: 100 }).default(""),
  permissions: json("permissions").$type<PlcAccessPermissions>().default({}),
  passwordPolicy: json("password_policy").$type<PlcPasswordPolicy>().default({}),
  defaultUsers: json("default_users").$type<PlcDefaultUser[]>().default([]),
  hmiScreenAccess: json("hmi_screen_access").$type<string[]>().default([]),
  timeout: integer("timeout").default(1800),  // seconds
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("plc_access_project_idx").on(table.plcProjectId),
]);

export type PlcUserAccessLevel = InferSelectModel<typeof plcUserAccessLevels>;
export type InsertPlcUserAccessLevel = InferInsertModel<typeof plcUserAccessLevels>;

// ── Table 6: plc_version_history ─────────────────────────────────────────

export const plcVersionHistory = pgTable("plc_version_history", {
  id: serial("id").primaryKey(),
  plcProjectId: integer("plc_project_id").notNull(),
  versionString: varchar("version_string", { length: 50 }).notNull(),  // V1.0.3-dev
  versionType: varchar("version_type", { length: 20 }).notNull().default("dev"), // dev | test | production
  versionNumber: varchar("version_number", { length: 20 }).default("1.0.0"),
  changeLog: text("change_log").default(""),
  changedModules: json("changed_modules").$type<number[]>().default([]),
  promotedFrom: integer("promoted_from"),
  promotedBy: varchar("promoted_by", { length: 100 }).default(""),
  promotedAt: timestamp("promoted_at", { mode: "string" }),
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending"), // pending | approved | rejected
  testResults: json("test_results").$type<PlcTestResults>().default({}),
  digitalFingerprint: varchar("digital_fingerprint", { length: 64 }).default(""),
  isActive: boolean("is_active").default(true),
  isFrozen: boolean("is_frozen").default(false),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("plc_version_project_idx").on(table.plcProjectId),
  index("plc_version_type_idx").on(table.versionType),
]);

export type PlcVersionHistoryRow = InferSelectModel<typeof plcVersionHistory>;
export type InsertPlcVersionHistory = InferInsertModel<typeof plcVersionHistory>;

// ── Table 7: plc_eplan_schematics ────────────────────────────────────────

export const plcEplanSchematics = pgTable("plc_eplan_schematics", {
  id: serial("id").primaryKey(),
  plcProjectId: integer("plc_project_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  pageTitle: varchar("page_title", { length: 200 }).notNull(),
  pageCategory: varchar("page_category", { length: 30 }).notNull(),
  // main_power | motor_control | safety_circuit | control_24v | plc_rack | hmi_network | terminal_layout
  xmlContent: text("xml_content").default(""),
  svgPreview: text("svg_preview").default(""),
  stationIds: json("station_ids").$type<number[]>().default([]),
  revision: varchar("revision", { length: 10 }).default("A"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("plc_eplan_project_idx").on(table.plcProjectId),
  index("plc_eplan_category_idx").on(table.pageCategory),
]);

export type PlcEplanSchematic = InferSelectModel<typeof plcEplanSchematics>;
export type InsertPlcEplanSchematic = InferInsertModel<typeof plcEplanSchematics>;
