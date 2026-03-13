/**
 * Robot Fleet Integration Schema
 *
 * Universal robot abstraction for KUKA, FANUC, ABB, and Stäubli industrial robots.
 * Gateway-based architecture: Node.js ↔ HTTP/WS ↔ Edge Gateway ↔ Native Protocol (RSI/PCDK/EGM/uniVAL)
 *
 * Tables:
 *  1. robot_fleet_registry      — Master robot registry (brand/model/gateway/status)
 *  2. robot_protocol_configs    — Per-robot protocol settings (gateway URL, auth, timeouts)
 *  3. robot_connection_logs     — Connection attempt history (connect/disconnect/error/latency)
 *  4. robot_dt_state_snapshots  — Digital twin state (J1-J6 joints, TCP position, temps)
 *  5. robot_condition_alerts    — Condition-based alerts (overtemp, collision, e-stop, servo error)
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

export const robotBrandEnum = pgEnum("robot_brand_enum", [
  "kuka",
  "fanuc",
  "abb",
  "staubli",
]);

export const robotStatusEnum = pgEnum("robot_status_enum", [
  "online",
  "offline",
  "error",
  "maintenance",
]);

export const robotProtocolEnum = pgEnum("robot_protocol_enum", [
  "RSI",
  "PCDK",
  "EGM",
  "uniVAL",
]);

export const robotProcessEnum = pgEnum("robot_process_enum", [
  "cleaning",
  "assembly",
  "welding",
  "painting",
  "palletizing",
  "inspection",
  "other",
]);

export const connectionEventEnum = pgEnum("connection_event_enum", [
  "connect",
  "disconnect",
  "error",
  "heartbeat",
  "command",
]);

export const robotAlertTypeEnum = pgEnum("robot_alert_type_enum", [
  "overtemp",
  "collision",
  "estop",
  "servo_error",
  "comm_loss",
  "joint_limit",
  "payload_exceeded",
]);

export const robotAlertSeverityEnum = pgEnum("robot_alert_severity_enum", [
  "info",
  "warning",
  "critical",
  "emergency",
]);

export const authMethodEnum = pgEnum("robot_auth_method_enum", [
  "none",
  "token",
  "certificate",
]);

// ──────────────────────────────────────────────────────────────
// Table 1: robot_fleet_registry
// ──────────────────────────────────────────────────────────────

export const robotFleetRegistry = pgTable(
  "robot_fleet_registry",
  {
    id: serial("id").primaryKey(),
    robotCode: varchar("robot_code", { length: 50 }).notNull().unique(),
    brand: robotBrandEnum("brand").notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    serialNumber: varchar("serial_number", { length: 100 }),
    controllerType: varchar("controller_type", { length: 50 }),
    firmwareVersion: varchar("firmware_version", { length: 50 }),
    protocolType: robotProtocolEnum("protocol_type").notNull(),

    // Gateway connection
    gatewayHost: varchar("gateway_host", { length: 255 }),
    gatewayPort: integer("gateway_port"),
    gatewayAuthToken: varchar("gateway_auth_token", { length: 500 }),

    // Status
    status: robotStatusEnum("status").default("offline").notNull(),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { mode: "string" }),

    // Specs
    maxPayloadKg: decimal("max_payload_kg", { precision: 8, scale: 2 }),
    reachMm: decimal("reach_mm", { precision: 8, scale: 1 }),
    repeatabilityMm: decimal("repeatability_mm", { precision: 6, scale: 3 }),
    axisCount: integer("axis_count").default(6),

    // Location & assignment
    location: varchar("location", { length: 200 }),
    cellId: varchar("cell_id", { length: 50 }),
    assignedProcess: robotProcessEnum("assigned_process"),

    // Digital twin links (nullable FKs)
    dtAssetId: integer("dt_asset_id"),
    iotEquipmentId: integer("iot_equipment_id"),

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
    createdBy: varchar("created_by", { length: 100 }),
  },
  (table) => [
    index("rfr_brand_idx").on(table.brand),
    index("rfr_status_idx").on(table.status),
    index("rfr_process_idx").on(table.assignedProcess),
    index("rfr_cell_idx").on(table.cellId),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 2: robot_protocol_configs
// ──────────────────────────────────────────────────────────────

export const robotProtocolConfigs = pgTable(
  "robot_protocol_configs",
  {
    id: serial("id").primaryKey(),
    robotId: integer("robot_id").notNull(),
    protocolName: varchar("protocol_name", { length: 50 }).notNull(),
    gatewayUrl: varchar("gateway_url", { length: 500 }).notNull(),
    gatewayPort: integer("gateway_port").notNull(),
    authMethod: authMethodEnum("auth_method").default("none").notNull(),
    authCredential: varchar("auth_credential", { length: 500 }),
    connectionTimeoutMs: integer("connection_timeout_ms").default(5000),
    commandTimeoutMs: integer("command_timeout_ms").default(3000),
    maxRetries: integer("max_retries").default(3),
    heartbeatIntervalMs: integer("heartbeat_interval_ms").default(1000),
    telemetryIntervalMs: integer("telemetry_interval_ms").default(100),
    // Brand-specific: KUKA RSI cycle time, FANUC register map, ABB EGM filter bandwidth, Stäubli control mode
    customConfig: jsonb("custom_config"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("rpc_robot_idx").on(table.robotId),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 3: robot_connection_logs
// ──────────────────────────────────────────────────────────────

export const robotConnectionLogs = pgTable(
  "robot_connection_logs",
  {
    id: serial("id").primaryKey(),
    robotId: integer("robot_id").notNull(),
    eventType: connectionEventEnum("event_type").notNull(),
    success: boolean("success").default(true),
    latencyMs: integer("latency_ms"),
    errorCode: varchar("error_code", { length: 50 }),
    errorMessage: text("error_message"),
    protocolDetails: jsonb("protocol_details"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("rcl_robot_idx").on(table.robotId),
    index("rcl_event_idx").on(table.eventType),
    index("rcl_created_idx").on(table.createdAt),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 4: robot_dt_state_snapshots
// ──────────────────────────────────────────────────────────────

export const robotDtStateSnapshots = pgTable(
  "robot_dt_state_snapshots",
  {
    id: serial("id").primaryKey(),
    robotId: integer("robot_id").notNull(),
    snapshotAt: timestamp("snapshot_at", { mode: "string" }).defaultNow().notNull(),

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

    // Operating state
    payloadKg: decimal("payload_kg", { precision: 8, scale: 2 }),
    speedPct: decimal("speed_pct", { precision: 5, scale: 2 }),
    overridePct: decimal("override_pct", { precision: 5, scale: 2 }),
    motorTempsC: jsonb("motor_temps_c"),
    operatingMode: varchar("operating_mode", { length: 20 }),
    programName: varchar("program_name", { length: 100 }),
    programLine: integer("program_line"),

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("rdss_robot_idx").on(table.robotId),
    index("rdss_snapshot_idx").on(table.snapshotAt),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 5: robot_condition_alerts
// ──────────────────────────────────────────────────────────────

export const robotConditionAlerts = pgTable(
  "robot_condition_alerts",
  {
    id: serial("id").primaryKey(),
    robotId: integer("robot_id").notNull(),
    alertType: robotAlertTypeEnum("alert_type").notNull(),
    severity: robotAlertSeverityEnum("severity").notNull(),
    message: text("message").notNull(),
    details: jsonb("details"),
    jointIndex: integer("joint_index"),
    measuredValue: decimal("measured_value", { precision: 10, scale: 3 }),
    thresholdValue: decimal("threshold_value", { precision: 10, scale: 3 }),
    unit: varchar("unit", { length: 20 }),
    acknowledgedAt: timestamp("acknowledged_at", { mode: "string" }),
    acknowledgedBy: varchar("acknowledged_by", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("rca_robot_idx").on(table.robotId),
    index("rca_severity_idx").on(table.severity),
    index("rca_alert_type_idx").on(table.alertType),
    index("rca_created_idx").on(table.createdAt),
  ],
);

// ──────────────────────────────────────────────────────────────
// Type Exports
// ──────────────────────────────────────────────────────────────

export type RobotFleetRegistry = InferSelectModel<typeof robotFleetRegistry>;
export type NewRobotFleetRegistry = InferInsertModel<typeof robotFleetRegistry>;

export type RobotProtocolConfig = InferSelectModel<typeof robotProtocolConfigs>;
export type NewRobotProtocolConfig = InferInsertModel<typeof robotProtocolConfigs>;

export type RobotConnectionLog = InferSelectModel<typeof robotConnectionLogs>;
export type NewRobotConnectionLog = InferInsertModel<typeof robotConnectionLogs>;

export type RobotDtStateSnapshot = InferSelectModel<typeof robotDtStateSnapshots>;
export type NewRobotDtStateSnapshot = InferInsertModel<typeof robotDtStateSnapshots>;

export type RobotConditionAlert = InferSelectModel<typeof robotConditionAlerts>;
export type NewRobotConditionAlert = InferInsertModel<typeof robotConditionAlerts>;
