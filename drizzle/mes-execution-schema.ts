/**
 * MES Execution Schema — 制造执行系统
 *
 * Three tables:
 * 1. mes_work_order_dispatch — work order dispatch to stations/operators
 * 2. mes_station_status      — real-time station status tracking
 * 3. mes_quality_checks      — quality inspection records (CCD/camera/manual/sensor)
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  index,
  json,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// Table 1: mes_work_order_dispatch
// ──────────────────────────────────────────────────────────────
export const mesWorkOrderDispatch = pgTable(
  "mes_work_order_dispatch",
  {
    id: serial("id").primaryKey(),

    // Foreign keys
    workOrderId: integer("work_order_id").notNull(),
    stationId: integer("station_id").notNull(),
    operatorId: integer("operator_id"),
    operatorName: varchar("operator_name", { length: 100 }),

    // Scheduling
    plannedStartTime: timestamp("planned_start_time", { mode: "string" }),
    actualStartTime: timestamp("actual_start_time", { mode: "string" }),
    actualEndTime: timestamp("actual_end_time", { mode: "string" }),

    // Status: queued | in_progress | paused | completed | blocked
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    pauseReason: text("pause_reason"),

    // Camera linkage
    cameraRecordingId: integer("camera_recording_id"),

    // Quality
    qualityResult: varchar("quality_result", { length: 20 }),
    cycleTimeSeconds: integer("cycle_time_seconds"),

    // Notes
    notes: text("notes"),

    // Audit
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mes_dispatch_work_order_id_idx").on(table.workOrderId),
    index("mes_dispatch_station_id_idx").on(table.stationId),
    index("mes_dispatch_operator_id_idx").on(table.operatorId),
    index("mes_dispatch_status_idx").on(table.status),
    index("mes_dispatch_actual_start_idx").on(table.actualStartTime),
  ],
);

export type MesWorkOrderDispatch = InferSelectModel<typeof mesWorkOrderDispatch>;
export type NewMesWorkOrderDispatch = InferInsertModel<typeof mesWorkOrderDispatch>;

// ──────────────────────────────────────────────────────────────
// Table 2: mes_station_status
// ──────────────────────────────────────────────────────────────
export const mesStationStatus = pgTable(
  "mes_station_status",
  {
    id: serial("id").primaryKey(),

    // Identity
    stationId: integer("station_id").notNull().unique(),
    stationCode: varchar("station_code", { length: 50 }).notNull(),
    stationName: varchar("station_name", { length: 100 }).notNull(),

    // Current operator
    currentOperatorId: integer("current_operator_id"),
    currentOperatorName: varchar("current_operator_name", { length: 100 }),
    currentDispatchId: integer("current_dispatch_id"),

    // Camera
    cameraId: integer("camera_id"),

    // Status: idle | running | changeover | maintenance | alarm
    status: varchar("status", { length: 20 }).notNull().default("idle"),

    // Activity
    lastActivityAt: timestamp("last_activity_at", { mode: "string" }),
    shiftCode: varchar("shift_code", { length: 20 }),
    buCode: varchar("bu_code", { length: 20 }),

    // Audit
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mes_station_station_id_idx").on(table.stationId),
    index("mes_station_status_idx").on(table.status),
  ],
);

export type MesStationStatus = InferSelectModel<typeof mesStationStatus>;
export type NewMesStationStatus = InferInsertModel<typeof mesStationStatus>;

// ──────────────────────────────────────────────────────────────
// Table 3: mes_quality_checks
// ──────────────────────────────────────────────────────────────
export const mesQualityChecks = pgTable(
  "mes_quality_checks",
  {
    id: serial("id").primaryKey(),

    // Linkage
    dispatchId: integer("dispatch_id").notNull(),
    stationId: integer("station_id").notNull(),

    // Check type: ccd_auto | camera_visual | manual | sensor
    checkType: varchar("check_type", { length: 30 }).notNull(),

    // Camera linkage
    cameraId: integer("camera_id"),
    snapshotId: integer("snapshot_id"),

    // Result: pass | fail | rework | scrap
    result: varchar("result", { length: 20 }).notNull(),
    defectCodes: json("defect_codes"),
    confidence: decimal("confidence", { precision: 5, scale: 4 }),

    // Inspector
    inspectorId: integer("inspector_id"),
    inspectorName: varchar("inspector_name", { length: 100 }),
    notes: text("notes"),

    // Audit
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mes_qc_dispatch_id_idx").on(table.dispatchId),
    index("mes_qc_station_id_idx").on(table.stationId),
    index("mes_qc_result_idx").on(table.result),
    index("mes_qc_created_at_idx").on(table.createdAt),
  ],
);

export type MesQualityCheck = InferSelectModel<typeof mesQualityChecks>;
export type NewMesQualityCheck = InferInsertModel<typeof mesQualityChecks>;
