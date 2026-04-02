/**
 * Robot Debug Sandbox Schema
 *
 * Debug session management for industrial robot commissioning, parameter tuning,
 * collision testing, program debugging, and calibration workflows.
 *
 * Tables:
 *  1. debug_sessions              — Debug session lifecycle (create/run/pause/complete/abort)
 *  2. debug_commands              — Individual commands sent to robot during debug session
 *  3. debug_parameter_snapshots   — Joint angle + TCP + speed parameter snapshots for comparison
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
// Table 1: debug_sessions
// ──────────────────────────────────────────────────────────────

export const debugSessions = pgTable(
  "debug_sessions",
  {
    id: serial("id").primaryKey(),
    robotId: integer("robot_id").notNull(),
    projectId: integer("project_id"),
    stageCode: varchar("stage_code", { length: 10 }),
    sessionName: varchar("session_name", { length: 200 }).notNull(),
    sessionType: varchar("session_type", { length: 30 }).notNull(), // commissioning/parameter_tuning/collision_test/program_debug/calibration
    status: varchar("status", { length: 20 }).default("created"), // created/in_progress/paused/completed/aborted
    startedAt: timestamp("started_at", { mode: "string" }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    operatorId: integer("operator_id"),
    operatorName: varchar("operator_name", { length: 100 }),
    notes: text("notes"),
    metadata: json("metadata"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("ds_robot_idx").on(table.robotId),
    index("ds_status_idx").on(table.status),
    index("ds_created_idx").on(table.createdAt),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 2: debug_commands
// ──────────────────────────────────────────────────────────────

export const debugCommands = pgTable(
  "debug_commands",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").notNull(),
    robotId: integer("robot_id").notNull(),
    commandType: varchar("command_type", { length: 30 }).notNull(),
    payload: json("payload").notNull(),
    result: varchar("result", { length: 30 }).default("pending"), // pending/executing/success/failed/timeout/collision_detected
    responseData: json("response_data"),
    durationMs: integer("duration_ms"),
    sentAt: timestamp("sent_at", { mode: "string" }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { mode: "string" }),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("dc_session_idx").on(table.sessionId),
    index("dc_robot_idx").on(table.robotId),
    index("dc_sent_idx").on(table.sentAt),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 3: debug_parameter_snapshots
// ──────────────────────────────────────────────────────────────

export const debugParameterSnapshots = pgTable(
  "debug_parameter_snapshots",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").notNull(),
    robotId: integer("robot_id").notNull(),
    snapshotLabel: varchar("snapshot_label", { length: 100 }),

    // Joint positions (degrees)
    j1Deg: decimal("j1_deg", { precision: 8, scale: 3 }),
    j2Deg: decimal("j2_deg", { precision: 8, scale: 3 }),
    j3Deg: decimal("j3_deg", { precision: 8, scale: 3 }),
    j4Deg: decimal("j4_deg", { precision: 8, scale: 3 }),
    j5Deg: decimal("j5_deg", { precision: 8, scale: 3 }),
    j6Deg: decimal("j6_deg", { precision: 8, scale: 3 }),

    // TCP position (mm + degrees)
    tcpX: decimal("tcp_x", { precision: 10, scale: 3 }),
    tcpY: decimal("tcp_y", { precision: 10, scale: 3 }),
    tcpZ: decimal("tcp_z", { precision: 10, scale: 3 }),
    tcpRx: decimal("tcp_rx", { precision: 8, scale: 3 }),
    tcpRy: decimal("tcp_ry", { precision: 8, scale: 3 }),
    tcpRz: decimal("tcp_rz", { precision: 8, scale: 3 }),

    // Operating parameters
    speedPct: decimal("speed_pct", { precision: 5, scale: 2 }),
    accelerationPct: decimal("acceleration_pct", { precision: 5, scale: 2 }),
    overridePct: decimal("override_pct", { precision: 5, scale: 2 }),
    payloadKg: decimal("payload_kg", { precision: 8, scale: 2 }),

    // Complex data
    motorTempsC: json("motor_temps_c"),
    collisionEnvelopeJson: json("collision_envelope_json"),

    capturedAt: timestamp("captured_at", { mode: "string" }).defaultNow().notNull(),
    capturedBy: varchar("captured_by", { length: 100 }),
  },
  (table) => [
    index("dps_session_idx").on(table.sessionId),
    index("dps_robot_idx").on(table.robotId),
    index("dps_captured_idx").on(table.capturedAt),
  ],
);

// ──────────────────────────────────────────────────────────────
// Type Exports
// ──────────────────────────────────────────────────────────────

export type DebugSession = InferSelectModel<typeof debugSessions>;
export type NewDebugSession = InferInsertModel<typeof debugSessions>;

export type DebugCommand = InferSelectModel<typeof debugCommands>;
export type NewDebugCommand = InferInsertModel<typeof debugCommands>;

export type DebugParameterSnapshot = InferSelectModel<typeof debugParameterSnapshots>;
export type NewDebugParameterSnapshot = InferInsertModel<typeof debugParameterSnapshots>;
