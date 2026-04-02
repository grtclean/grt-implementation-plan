/**
 * Camera Registry Schema — 工业相机注册与管理
 *
 * 7 tables:
 *   cameras                — main camera device registry (Hikvision/Dahua/Axis/Basler/Cognex/Keyence)
 *   camera_groups          — logical groupings for multi-view display walls
 *   camera_group_members   — M2M join between groups and cameras
 *   camera_snapshots       — captured images (scheduled / event / manual / quality_alert)
 *   assembly_recordings    — SOP step recordings with time deviation analysis
 *   camera_events          — real-time events (motion / alarm / disconnect / quality)
 *   camera_maintenance_log — maintenance and calibration audit trail
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
// Table 1: cameras — Main camera device registry
// ──────────────────────────────────────────────────────────────
export const cameras = pgTable(
  "cameras",
  {
    id: serial("id").primaryKey(),

    // Identity
    cameraCode: varchar("camera_code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    brand: varchar("brand", { length: 30 }).notNull(), // hikvision | dahua | axis | basler | cognex | keyence
    model: varchar("model", { length: 100 }),
    protocol: varchar("protocol", { length: 30 }), // onvif | rtsp | isapi | vapix | gige_vision | gb28181

    // Network
    ipAddress: varchar("ip_address", { length: 50 }).notNull(),
    port: integer("port").default(554),
    rtspUrl: varchar("rtsp_url", { length: 500 }),
    httpSnapshotUrl: varchar("http_snapshot_url", { length: 500 }),
    hlsProxyUrl: varchar("hls_proxy_url", { length: 500 }),

    // Authentication
    username: varchar("username", { length: 100 }),
    passwordEncrypted: text("password_encrypted"),

    // Location & linkage
    location: varchar("location", { length: 30 }), // SHOPFLOOR | WAREHOUSE | LOBBY | CLEANROOM
    stationId: integer("station_id"),
    machineId: integer("machine_id"),
    warehouseId: integer("warehouse_id"),
    purpose: varchar("purpose", { length: 50 }), // quality_inspection | assembly_monitoring | material_tracking | security | work_hours

    // Capabilities
    resolution: varchar("resolution", { length: 20 }),
    fps: integer("fps").default(25),
    hasAudio: boolean("has_audio").default(false),
    hasPtz: boolean("has_ptz").default(false),
    hasAiAnalysis: boolean("has_ai_analysis").default(false),

    // Status
    status: varchar("status", { length: 20 }).default("offline"), // online | offline | error | maintenance
    lastHeartbeat: timestamp("last_heartbeat", { mode: "string" }),
    isActive: boolean("is_active").default(true),

    // Audit
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_cameras_camera_code").on(table.cameraCode),
    index("idx_cameras_brand").on(table.brand),
    index("idx_cameras_location").on(table.location),
    index("idx_cameras_station_id").on(table.stationId),
    index("idx_cameras_status").on(table.status),
  ],
);

export type Camera = InferSelectModel<typeof cameras>;
export type InsertCamera = InferInsertModel<typeof cameras>;

// ──────────────────────────────────────────────────────────────
// Table 2: camera_groups — Logical groupings for display walls
// ──────────────────────────────────────────────────────────────
export const cameraGroups = pgTable(
  "camera_groups",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    layout: varchar("layout", { length: 20 }).default("2x2"), // 1x1 | 2x2 | 3x3 | 4x4
    displayScreenId: integer("display_screen_id"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
);

export type CameraGroup = InferSelectModel<typeof cameraGroups>;
export type InsertCameraGroup = InferInsertModel<typeof cameraGroups>;

// ──────────────────────────────────────────────────────────────
// Table 3: camera_group_members — M2M join (group ↔ camera)
// ──────────────────────────────────────────────────────────────
export const cameraGroupMembers = pgTable(
  "camera_group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull(),
    cameraId: integer("camera_id").notNull(),
    gridPosition: integer("grid_position").default(0),
    showLabel: boolean("show_label").default(true),
  },
  (table) => [
    index("idx_camera_group_members_group_id").on(table.groupId),
  ],
);

export type CameraGroupMember = InferSelectModel<typeof cameraGroupMembers>;
export type InsertCameraGroupMember = InferInsertModel<typeof cameraGroupMembers>;

// ──────────────────────────────────────────────────────────────
// Table 4: camera_snapshots — Captured images
// ──────────────────────────────────────────────────────────────
export const cameraSnapshots = pgTable(
  "camera_snapshots",
  {
    id: serial("id").primaryKey(),
    cameraId: integer("camera_id").notNull(),
    snapshotUrl: varchar("snapshot_url", { length: 500 }).notNull(),
    thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
    triggerType: varchar("trigger_type", { length: 30 }).notNull(), // scheduled | event | manual | quality_alert
    relatedWorkOrderId: integer("related_work_order_id"),
    relatedExecutionLogId: integer("related_execution_log_id"),
    metadata: json("metadata"),
    capturedAt: timestamp("captured_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_camera_snapshots_camera_id").on(table.cameraId),
    index("idx_camera_snapshots_captured_at").on(table.capturedAt),
    index("idx_camera_snapshots_trigger_type").on(table.triggerType),
  ],
);

export type CameraSnapshot = InferSelectModel<typeof cameraSnapshots>;
export type InsertCameraSnapshot = InferInsertModel<typeof cameraSnapshots>;

// ──────────────────────────────────────────────────────────────
// Table 5: assembly_recordings — SOP step recordings with deviation analysis
// ──────────────────────────────────────────────────────────────
export const assemblyRecordings = pgTable(
  "assembly_recordings",
  {
    id: serial("id").primaryKey(),
    cameraId: integer("camera_id").notNull(),
    workOrderId: integer("work_order_id"),
    stationId: integer("station_id"),
    operatorId: integer("operator_id"),
    operatorName: varchar("operator_name", { length: 100 }),
    sopStepCode: varchar("sop_step_code", { length: 50 }),

    // Media
    recordingUrl: varchar("recording_url", { length: 500 }),
    thumbnailUrl: varchar("thumbnail_url", { length: 500 }),

    // Time tracking
    startTime: timestamp("start_time", { mode: "string" }).notNull(),
    endTime: timestamp("end_time", { mode: "string" }),
    durationSeconds: integer("duration_seconds"),
    standardTimeSeconds: integer("standard_time_seconds"),
    actualTimeSeconds: integer("actual_time_seconds"),
    deviationPercent: decimal("deviation_percent", { precision: 5, scale: 2 }),

    // AI analysis
    analysisResult: json("analysis_result"),

    // Review
    reviewStatus: varchar("review_status", { length: 20 }).default("pending"), // pending | reviewed | flagged
    reviewedBy: integer("reviewed_by"),

    // Audit
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_assembly_recordings_camera_id").on(table.cameraId),
    index("idx_assembly_recordings_wo_station").on(table.workOrderId, table.stationId),
    index("idx_assembly_recordings_operator_id").on(table.operatorId),
    index("idx_assembly_recordings_start_time").on(table.startTime),
    index("idx_assembly_recordings_review_status").on(table.reviewStatus),
  ],
);

export type AssemblyRecording = InferSelectModel<typeof assemblyRecordings>;
export type InsertAssemblyRecording = InferInsertModel<typeof assemblyRecordings>;

// ──────────────────────────────────────────────────────────────
// Table 6: camera_events — Real-time events
// ──────────────────────────────────────────────────────────────
export const cameraEvents = pgTable(
  "camera_events",
  {
    id: serial("id").primaryKey(),
    cameraId: integer("camera_id").notNull(),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    severity: varchar("severity", { length: 20 }).default("info"), // info | warning | error | critical
    description: text("description"),
    snapshotId: integer("snapshot_id"),
    metadata: json("metadata"),
    acknowledgedBy: integer("acknowledged_by"),
    acknowledgedAt: timestamp("acknowledged_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_camera_events_camera_id").on(table.cameraId),
    index("idx_camera_events_event_type").on(table.eventType),
    index("idx_camera_events_severity").on(table.severity),
    index("idx_camera_events_created_at").on(table.createdAt),
  ],
);

export type CameraEvent = InferSelectModel<typeof cameraEvents>;
export type InsertCameraEvent = InferInsertModel<typeof cameraEvents>;

// ──────────────────────────────────────────────────────────────
// Table 7: camera_maintenance_log — Maintenance audit trail
// ──────────────────────────────────────────────────────────────
export const cameraMaintenanceLog = pgTable(
  "camera_maintenance_log",
  {
    id: serial("id").primaryKey(),
    cameraId: integer("camera_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    performedBy: integer("performed_by"),
    performedByName: varchar("performed_by_name", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_camera_maintenance_log_camera_id").on(table.cameraId),
  ],
);

export type CameraMaintenanceEntry = InferSelectModel<typeof cameraMaintenanceLog>;
export type InsertCameraMaintenanceEntry = InferInsertModel<typeof cameraMaintenanceLog>;
