/**
 * Robot Cleaning Performance Schema
 *
 * 3 tables for closed-loop adaptive cleaning control:
 * 1. robot_cleaning_actions — real-time cleaning parameter snapshots + cleanliness feedback
 * 2. oiling_torque_records — oiling torque monitoring with >15Nm auto-alert
 * 3. tech_performance_entries — cycle time → performance accounting bridge
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
  date,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// Table 1: robot_cleaning_actions
// ──────────────────────────────────────────────────────────────
export const robotCleaningActions = pgTable(
  "robot_cleaning_actions",
  {
    id: serial("id").primaryKey(),

    // Context
    projectId: integer("project_id"),
    processTrialId: integer("process_trial_id"),
    equipmentId: integer("equipment_id"),
    robotCode: varchar("robot_code", { length: 50 }).notNull(),
    stationCode: varchar("station_code", { length: 50 }),

    // Cleaning parameters
    pressureBar: decimal("pressure_bar", { precision: 6, scale: 2 }),
    nozzleAngleDeg: decimal("nozzle_angle_deg", { precision: 6, scale: 2 }),
    flowRateLpm: decimal("flow_rate_lpm", { precision: 6, scale: 2 }),
    temperatureC: decimal("temperature_c", { precision: 6, scale: 2 }),
    distanceMm: decimal("distance_mm", { precision: 8, scale: 2 }),
    sprayDurationS: decimal("spray_duration_s", { precision: 8, scale: 2 }),

    // Cleanliness feedback
    cleanlinessBeforeMg: decimal("cleanliness_before_mg", { precision: 10, scale: 4 }),
    cleanlinessAfterMg: decimal("cleanliness_after_mg", { precision: 10, scale: 4 }),
    maxParticleSizeUm: decimal("max_particle_size_um", { precision: 10, scale: 2 }),
    cleanlinessVerdict: varchar("cleanliness_verdict", { length: 20 }).default("PENDING"),

    // Adaptive control
    isAdaptive: boolean("is_adaptive").default(false),
    adaptiveAdjustmentJson: jsonb("adaptive_adjustment_json"),

    // Cycle time
    cycleStartAt: timestamp("cycle_start_at", { mode: "string" }),
    cycleEndAt: timestamp("cycle_end_at", { mode: "string" }),
    cycleTimeSeconds: decimal("cycle_time_seconds", { precision: 10, scale: 2 }),

    // Alerts
    hasAlert: boolean("has_alert").default(false),
    alertType: varchar("alert_type", { length: 50 }),
    alertMessage: text("alert_message"),

    // Metadata
    operatorId: integer("operator_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("rca_project_id_idx").on(table.projectId),
    index("rca_equipment_id_idx").on(table.equipmentId),
    index("rca_robot_code_idx").on(table.robotCode),
    index("rca_created_at_idx").on(table.createdAt),
    index("rca_verdict_idx").on(table.cleanlinessVerdict),
    index("rca_has_alert_idx").on(table.hasAlert),
  ],
);

export type RobotCleaningAction = InferSelectModel<typeof robotCleaningActions>;
export type NewRobotCleaningAction = InferInsertModel<typeof robotCleaningActions>;

// ──────────────────────────────────────────────────────────────
// Table 2: oiling_torque_records
// ──────────────────────────────────────────────────────────────
export const oilingTorqueRecords = pgTable(
  "oiling_torque_records",
  {
    id: serial("id").primaryKey(),

    // Context
    projectId: integer("project_id"),
    equipmentId: integer("equipment_id"),
    robotCode: varchar("robot_code", { length: 50 }).notNull(),
    stationCode: varchar("station_code", { length: 50 }),

    // Torque
    targetTorqueNm: decimal("target_torque_nm", { precision: 8, scale: 2 }),
    actualTorqueNm: decimal("actual_torque_nm", { precision: 8, scale: 2 }).notNull(),
    torqueUpperLimitNm: decimal("torque_upper_limit_nm", { precision: 8, scale: 2 }).default("15.00"),
    torqueLowerLimitNm: decimal("torque_lower_limit_nm", { precision: 8, scale: 2 }),

    // Oiling
    oilType: varchar("oil_type", { length: 100 }),
    applicationPoint: varchar("application_point", { length: 200 }),
    oilVolumeMl: decimal("oil_volume_ml", { precision: 8, scale: 2 }),

    // Status
    isOverTorque: boolean("is_over_torque").default(false),
    isUnderTorque: boolean("is_under_torque").default(false),
    verdict: varchar("verdict", { length: 20 }).default("PENDING"),
    alertTriggered: boolean("alert_triggered").default(false),
    alertMessage: text("alert_message"),

    // Metadata
    operatorId: integer("operator_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("otr_project_id_idx").on(table.projectId),
    index("otr_equipment_id_idx").on(table.equipmentId),
    index("otr_verdict_idx").on(table.verdict),
    index("otr_created_at_idx").on(table.createdAt),
    index("otr_is_over_torque_idx").on(table.isOverTorque),
  ],
);

export type OilingTorqueRecord = InferSelectModel<typeof oilingTorqueRecords>;
export type NewOilingTorqueRecord = InferInsertModel<typeof oilingTorqueRecords>;

// ──────────────────────────────────────────────────────────────
// Table 3: tech_performance_entries
// ──────────────────────────────────────────────────────────────
export const techPerformanceEntries = pgTable(
  "tech_performance_entries",
  {
    id: serial("id").primaryKey(),

    // Links
    projectId: integer("project_id"),
    userId: integer("user_id"),
    robotCleaningActionId: integer("robot_cleaning_action_id"),
    oilingTorqueRecordId: integer("oiling_torque_record_id"),
    processInstanceId: integer("process_instance_id"),

    // Metrics
    entryType: varchar("entry_type", { length: 30 }).notNull(),
    cycleTimeSeconds: decimal("cycle_time_seconds", { precision: 10, scale: 2 }),
    standardCycleTimeSeconds: decimal("standard_cycle_time_seconds", { precision: 10, scale: 2 }),
    cycleEfficiency: decimal("cycle_efficiency", { precision: 6, scale: 4 }),

    // Quality
    qualityPass: boolean("quality_pass").default(true),
    cleanlinessScore: decimal("cleanliness_score", { precision: 6, scale: 2 }),

    // Accounting
    laborMinutes: decimal("labor_minutes", { precision: 8, scale: 2 }),
    machineMinutes: decimal("machine_minutes", { precision: 8, scale: 2 }),
    performancePoints: decimal("performance_points", { precision: 8, scale: 2 }),

    // Period
    workDate: date("work_date", { mode: "string" }),
    shiftCode: varchar("shift_code", { length: 20 }),

    // Metadata
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("tpe_project_id_idx").on(table.projectId),
    index("tpe_user_id_idx").on(table.userId),
    index("tpe_entry_type_idx").on(table.entryType),
    index("tpe_work_date_idx").on(table.workDate),
    index("tpe_cleaning_action_id_idx").on(table.robotCleaningActionId),
    index("tpe_oiling_torque_id_idx").on(table.oilingTorqueRecordId),
  ],
);

export type TechPerformanceEntry = InferSelectModel<typeof techPerformanceEntries>;
export type NewTechPerformanceEntry = InferInsertModel<typeof techPerformanceEntries>;
