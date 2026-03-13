/**
 * Robot ↔ Stage-Gate Integration Schema
 *
 * Links robot fleet digital twin (KUKA/FANUC/ABB/Stäubli) with M0-M12 project lifecycle.
 *
 * Tables:
 *  1. robot_stage_assignments          — Assigns robots to project stages (M3/M5/M7/M8/M9/M11)
 *  2. equipment_programs               — Versioned robot/equipment programs (motion, PLC, HMI, vision)
 *  3. program_execution_logs           — Every program run (success/fail/timeout + metrics)
 *  4. stage_commissioning_checklists   — M8 brand-specific commissioning items
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
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────────────

export const stageAssignmentRoleEnum = pgEnum("stage_assignment_role_enum", [
  "primary",
  "backup",
  "support",
]);

export const stageAssignmentStatusEnum = pgEnum("stage_assignment_status_enum", [
  "planned",
  "programmed",
  "active",
  "completed",
  "released",
]);

export const programTypeEnum = pgEnum("equipment_program_type_enum", [
  "robot_motion",
  "plc_ladder",
  "plc_st",
  "hmi_screen",
  "vision",
  "conveyor",
]);

export const programStatusEnum = pgEnum("equipment_program_status_enum", [
  "draft",
  "review",
  "approved",
  "deployed",
  "deprecated",
]);

export const executionResultEnum = pgEnum("program_execution_result_enum", [
  "running",
  "success",
  "partial",
  "failed",
  "aborted",
  "timeout",
]);

export const executionTriggerTypeEnum = pgEnum("execution_trigger_type_enum", [
  "stage_auto",
  "manual",
  "commissioning",
  "protocol_test",
]);

// ──────────────────────────────────────────────────────────────
// Table 1: robot_stage_assignments
// ──────────────────────────────────────────────────────────────

export const robotStageAssignments = pgTable(
  "robot_stage_assignments",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    robotId: integer("robot_id").notNull(),
    stageCode: varchar("stage_code", { length: 10 }).notNull(), // M3, M5, M7, M8, M9, M11
    role: stageAssignmentRoleEnum("role").default("primary").notNull(),
    status: stageAssignmentStatusEnum("status").default("planned").notNull(),
    assignedBy: varchar("assigned_by", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("rsa_project_stage_idx").on(table.projectId, table.stageCode),
    index("rsa_robot_idx").on(table.robotId),
    index("rsa_status_idx").on(table.status),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 2: equipment_programs
// ──────────────────────────────────────────────────────────────

export const equipmentPrograms = pgTable(
  "equipment_programs",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    robotId: integer("robot_id").notNull(),
    stageCode: varchar("stage_code", { length: 10 }).notNull(),
    programName: varchar("program_name", { length: 200 }).notNull(),
    programType: programTypeEnum("program_type").default("robot_motion").notNull(),
    version: integer("version").default(1).notNull(),
    versionString: varchar("version_string", { length: 20 }).default("V1.0").notNull(),
    previousVersionId: integer("previous_version_id"), // chain for version history
    status: programStatusEnum("status").default("draft").notNull(),
    programContent: text("program_content"), // inline code (small programs)
    storageUrl: varchar("storage_url", { length: 500 }), // file reference (large programs)
    parameters: jsonb("parameters"), // runtime params (speed, offsets, etc.)
    revisionReason: text("revision_reason"),
    approvedBy: varchar("approved_by", { length: 100 }),
    approvedAt: timestamp("approved_at", { mode: "string" }),
    createdBy: varchar("created_by", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("ep_project_stage_idx").on(table.projectId, table.stageCode),
    index("ep_robot_idx").on(table.robotId),
    index("ep_program_name_idx").on(table.programName),
    index("ep_status_idx").on(table.status),
    index("ep_prev_version_idx").on(table.previousVersionId),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 3: program_execution_logs
// ──────────────────────────────────────────────────────────────

export const programExecutionLogs = pgTable(
  "program_execution_logs",
  {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull(),
    robotId: integer("robot_id").notNull(),
    projectId: integer("project_id").notNull(),
    stageCode: varchar("stage_code", { length: 10 }).notNull(),
    triggerType: executionTriggerTypeEnum("trigger_type").default("manual").notNull(),
    result: executionResultEnum("result").default("running").notNull(),
    durationMs: integer("duration_ms"),
    telemetryAtStart: jsonb("telemetry_at_start"),
    telemetryAtEnd: jsonb("telemetry_at_end"),
    metrics: jsonb("metrics"), // { cycleCount, passCount, failCount, ... }
    errorCode: varchar("error_code", { length: 50 }),
    errorMessage: text("error_message"),
    executedBy: varchar("executed_by", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("pel_program_idx").on(table.programId),
    index("pel_robot_idx").on(table.robotId),
    index("pel_project_stage_idx").on(table.projectId, table.stageCode),
    index("pel_result_idx").on(table.result),
    index("pel_created_idx").on(table.createdAt),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 4: stage_commissioning_checklists
// ──────────────────────────────────────────────────────────────

export const stageCommissioningChecklists = pgTable(
  "stage_commissioning_checklists",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignment_id").notNull(),
    robotId: integer("robot_id").notNull(),
    projectId: integer("project_id").notNull(),
    checkItem: varchar("check_item", { length: 300 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(), // controller, comms, safety, calibration
    isMandatory: boolean("is_mandatory").default(true).notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, passed, failed, skipped
    measuredValue: varchar("measured_value", { length: 100 }),
    targetValue: varchar("target_value", { length: 100 }),
    unit: varchar("unit", { length: 30 }),
    executionLogId: integer("execution_log_id"), // link to program run that verified this
    completedBy: varchar("completed_by", { length: 100 }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("scc_assignment_idx").on(table.assignmentId),
    index("scc_robot_idx").on(table.robotId),
    index("scc_project_idx").on(table.projectId),
    index("scc_category_idx").on(table.category),
    index("scc_status_idx").on(table.status),
  ],
);

// ──────────────────────────────────────────────────────────────
// Type Exports
// ──────────────────────────────────────────────────────────────

export type RobotStageAssignment = InferSelectModel<typeof robotStageAssignments>;
export type NewRobotStageAssignment = InferInsertModel<typeof robotStageAssignments>;

export type EquipmentProgram = InferSelectModel<typeof equipmentPrograms>;
export type NewEquipmentProgram = InferInsertModel<typeof equipmentPrograms>;

export type ProgramExecutionLog = InferSelectModel<typeof programExecutionLogs>;
export type NewProgramExecutionLog = InferInsertModel<typeof programExecutionLogs>;

export type StageCommissioningChecklist = InferSelectModel<typeof stageCommissioningChecklists>;
export type NewStageCommissioningChecklist = InferInsertModel<typeof stageCommissioningChecklists>;
