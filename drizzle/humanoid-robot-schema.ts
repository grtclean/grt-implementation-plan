/**
 * Humanoid Robot Schema — 人形机器人/物料搬运/维保管理
 *
 * 8 tables:
 *   1. humanoid_robots           — 机器人注册表
 *   2. humanoid_vision_tasks     — 视觉任务定义
 *   3. humanoid_vision_results   — 视觉检测结果
 *   4. material_handling_jobs    — 物料搬运作业
 *   5. material_handling_logs    — 搬运步骤日志
 *   6. maintenance_schedules     — 维保计划
 *   7. maintenance_work_orders   — 维保工单
 *   8. maintenance_execution_logs — 维保执行日志
 *
 * 9 pgEnums for type-safe status/type columns.
 */
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  index,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────

export const humanoidStatusEnum = pgEnum("humanoid_status", [
  "idle",
  "working",
  "loading",
  "unloading",
  "maintenance",
  "error",
  "offline",
]);

export const gripperTypeEnum = pgEnum("gripper_type", [
  "parallel_jaw",
  "vacuum_suction",
  "magnetic",
  "adaptive_finger",
  "soft_gripper",
]);

export const visionTaskTypeEnum = pgEnum("vision_task_type", [
  "part_recognition",
  "cleanliness_check",
  "dimension_measure",
  "defect_detection",
  "barcode_scan",
]);

export const visionResultEnum = pgEnum("vision_result", [
  "pass",
  "fail",
  "inconclusive",
  "error",
]);

export const handlingJobStatusEnum = pgEnum("handling_job_status", [
  "queued",
  "picking",
  "loading",
  "cleaning",
  "unloading",
  "placing",
  "completed",
  "failed",
  "cancelled",
]);

export const maintenanceScheduleTypeEnum = pgEnum("maintenance_schedule_type", [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annual",
  "runtime_based",
  "event_triggered",
]);

export const maintenancePriorityEnum = pgEnum("maintenance_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const maintenanceWoStatusEnum = pgEnum("maintenance_wo_status", [
  "draft",
  "scheduled",
  "in_progress",
  "pending_review",
  "completed",
  "cancelled",
]);

export const maintenanceStepStatusEnum = pgEnum("maintenance_step_status", [
  "pending",
  "in_progress",
  "completed",
  "skipped",
  "failed",
]);

// ──────────────────────────────────────────────────────────────
// Table 1: humanoid_robots — 机器人注册表
// ──────────────────────────────────────────────────────────────
export const humanoidRobots = pgTable(
  "humanoid_robots",
  {
    id: serial("id").primaryKey(),
    robotCode: varchar("robot_code", { length: 50 }).notNull().unique(),
    model: varchar("model", { length: 100 }),
    manufacturer: varchar("manufacturer", { length: 100 }),
    serialNumber: varchar("serial_number", { length: 100 }),
    firmwareVersion: varchar("firmware_version", { length: 50 }),
    status: humanoidStatusEnum("status").default("offline"),
    stationId: integer("station_id"),
    stationName: varchar("station_name", { length: 200 }),
    gripperType: gripperTypeEnum("gripper_type").default("parallel_jaw"),
    gripForceN: decimal("grip_force_n", { precision: 6, scale: 2 }),
    capabilities: jsonb("capabilities"),
    cameraIds: jsonb("camera_ids"),
    uwbTagId: varchar("uwb_tag_id", { length: 50 }),
    dtAssetId: integer("dt_asset_id"),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { mode: "string" }),
    totalRuntimeHours: decimal("total_runtime_hours", { precision: 10, scale: 2 }).default("0"),
    totalCycleCount: integer("total_cycle_count").default(0),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("humanoid_robots_status_idx").on(table.status),
    index("humanoid_robots_station_id_idx").on(table.stationId),
    index("humanoid_robots_robot_code_idx").on(table.robotCode),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 2: humanoid_vision_tasks — 视觉任务定义
// ──────────────────────────────────────────────────────────────
export const humanoidVisionTasks = pgTable(
  "humanoid_vision_tasks",
  {
    id: serial("id").primaryKey(),
    taskName: varchar("task_name", { length: 200 }).notNull(),
    taskType: visionTaskTypeEnum("task_type").notNull(),
    partTypePattern: varchar("part_type_pattern", { length: 100 }),
    cleanlinessThresholdMg: decimal("cleanliness_threshold_mg", { precision: 10, scale: 4 }),
    dimensionToleranceMm: decimal("dimension_tolerance_mm", { precision: 8, scale: 3 }),
    referenceImageUrl: varchar("reference_image_url", { length: 500 }),
    aiModelId: varchar("ai_model_id", { length: 100 }),
    linkedRecipeId: integer("linked_recipe_id"),
    parameters: jsonb("parameters"),
    isActive: boolean("is_active").default(true),
    createdBy: varchar("created_by", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("humanoid_vision_tasks_task_type_idx").on(table.taskType),
    index("humanoid_vision_tasks_is_active_idx").on(table.isActive),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 3: humanoid_vision_results — 视觉检测结果
// ──────────────────────────────────────────────────────────────
export const humanoidVisionResults = pgTable(
  "humanoid_vision_results",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id"),
    humanoidRobotId: integer("humanoid_robot_id"),
    cameraId: integer("camera_id"),
    snapshotId: integer("snapshot_id"),
    partNumber: varchar("part_number", { length: 100 }),
    result: visionResultEnum("result"),
    confidenceScore: decimal("confidence_score", { precision: 5, scale: 4 }),
    detectedPartType: varchar("detected_part_type", { length: 100 }),
    measuredValues: jsonb("measured_values"),
    boundingBoxes: jsonb("bounding_boxes"),
    processingTimeMs: integer("processing_time_ms"),
    imageUrl: varchar("image_url", { length: 500 }),
    selectedRecipeId: integer("selected_recipe_id"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("humanoid_vision_results_task_id_idx").on(table.taskId),
    index("humanoid_vision_results_robot_id_idx").on(table.humanoidRobotId),
    index("humanoid_vision_results_result_idx").on(table.result),
    index("humanoid_vision_results_created_at_idx").on(table.createdAt),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 4: material_handling_jobs — 物料搬运作业
// ──────────────────────────────────────────────────────────────
export const materialHandlingJobs = pgTable(
  "material_handling_jobs",
  {
    id: serial("id").primaryKey(),
    humanoidRobotId: integer("humanoid_robot_id"),
    projectId: integer("project_id"),
    workOrderId: integer("work_order_id"),
    partNumber: varchar("part_number", { length: 100 }),
    partName: varchar("part_name", { length: 200 }),
    partQuantity: integer("part_quantity").default(1),
    status: handlingJobStatusEnum("status").default("queued"),
    pickSource: varchar("pick_source", { length: 200 }),
    loadTarget: varchar("load_target", { length: 200 }),
    unloadTarget: varchar("unload_target", { length: 200 }),
    placeDestination: varchar("place_destination", { length: 200 }),
    queuedAt: timestamp("queued_at", { mode: "string" }).defaultNow(),
    pickStartAt: timestamp("pick_start_at", { mode: "string" }),
    pickCompleteAt: timestamp("pick_complete_at", { mode: "string" }),
    loadStartAt: timestamp("load_start_at", { mode: "string" }),
    loadCompleteAt: timestamp("load_complete_at", { mode: "string" }),
    cleaningStartAt: timestamp("cleaning_start_at", { mode: "string" }),
    cleaningCompleteAt: timestamp("cleaning_complete_at", { mode: "string" }),
    unloadStartAt: timestamp("unload_start_at", { mode: "string" }),
    unloadCompleteAt: timestamp("unload_complete_at", { mode: "string" }),
    placeStartAt: timestamp("place_start_at", { mode: "string" }),
    placeCompleteAt: timestamp("place_complete_at", { mode: "string" }),
    gripForceN: decimal("grip_force_n", { precision: 6, scale: 2 }),
    gripperStatus: varchar("gripper_status", { length: 20 }).default("idle"),
    visionResultId: integer("vision_result_id"),
    cleaningRecipeId: integer("cleaning_recipe_id"),
    priority: integer("priority").default(5),
    createdBy: varchar("created_by", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("material_handling_jobs_robot_id_idx").on(table.humanoidRobotId),
    index("material_handling_jobs_status_idx").on(table.status),
    index("material_handling_jobs_priority_idx").on(table.priority),
    index("material_handling_jobs_created_at_idx").on(table.createdAt),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 5: material_handling_logs — 搬运步骤日志
// ──────────────────────────────────────────────────────────────
export const materialHandlingLogs = pgTable(
  "material_handling_logs",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id"),
    stepName: varchar("step_name", { length: 50 }),
    startedAt: timestamp("started_at", { mode: "string" }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    durationSeconds: integer("duration_seconds"),
    success: boolean("success").default(true),
    gripForceN: decimal("grip_force_n", { precision: 6, scale: 2 }),
    errorCode: varchar("error_code", { length: 50 }),
    errorMessage: text("error_message"),
    sensorData: jsonb("sensor_data"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("material_handling_logs_job_id_idx").on(table.jobId),
    index("material_handling_logs_step_name_idx").on(table.stepName),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 6: maintenance_schedules — 维保计划
// ──────────────────────────────────────────────────────────────
export const maintenanceSchedules = pgTable(
  "maintenance_schedules",
  {
    id: serial("id").primaryKey(),
    scheduleName: varchar("schedule_name", { length: 200 }).notNull(),
    scheduleNameEn: varchar("schedule_name_en", { length: 200 }),
    equipmentType: varchar("equipment_type", { length: 50 }),
    equipmentId: integer("equipment_id"),
    maintenanceType: maintenanceScheduleTypeEnum("maintenance_type"),
    intervalDays: integer("interval_days"),
    runtimeHoursTrigger: decimal("runtime_hours_trigger", { precision: 10, scale: 2 }),
    cycleCountTrigger: integer("cycle_count_trigger"),
    sensorThresholdJson: jsonb("sensor_threshold_json"),
    sopSteps: jsonb("sop_steps"),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    priority: maintenancePriorityEnum("priority").default("medium"),
    requiresShutdown: boolean("requires_shutdown").default(false),
    assignedRoleId: varchar("assigned_role_id", { length: 50 }),
    lastGeneratedAt: timestamp("last_generated_at", { mode: "string" }),
    nextDueDate: timestamp("next_due_date", { mode: "string" }),
    isActive: boolean("is_active").default(true),
    createdBy: varchar("created_by", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("maintenance_schedules_equipment_type_idx").on(table.equipmentType),
    index("maintenance_schedules_maintenance_type_idx").on(table.maintenanceType),
    index("maintenance_schedules_next_due_date_idx").on(table.nextDueDate),
    index("maintenance_schedules_is_active_idx").on(table.isActive),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 7: maintenance_work_orders — 维保工单
// ──────────────────────────────────────────────────────────────
export const maintenanceWorkOrders = pgTable(
  "maintenance_work_orders",
  {
    id: serial("id").primaryKey(),
    workOrderCode: varchar("work_order_code", { length: 50 }).notNull().unique(),
    scheduleId: integer("schedule_id"),
    equipmentType: varchar("equipment_type", { length: 50 }),
    equipmentId: integer("equipment_id"),
    equipmentName: varchar("equipment_name", { length: 200 }),
    title: varchar("title", { length: 300 }),
    description: text("description"),
    status: maintenanceWoStatusEnum("status").default("draft"),
    priority: maintenancePriorityEnum("priority").default("medium"),
    assignedTo: integer("assigned_to"),
    assignedToName: varchar("assigned_to_name", { length: 100 }),
    scheduledStartAt: timestamp("scheduled_start_at", { mode: "string" }),
    scheduledEndAt: timestamp("scheduled_end_at", { mode: "string" }),
    actualStartAt: timestamp("actual_start_at", { mode: "string" }),
    actualEndAt: timestamp("actual_end_at", { mode: "string" }),
    totalDurationMinutes: integer("total_duration_minutes"),
    sopStepCount: integer("sop_step_count").default(0),
    completedStepCount: integer("completed_step_count").default(0),
    partsConsumed: jsonb("parts_consumed"),
    totalPartsCost: decimal("total_parts_cost", { precision: 12, scale: 2 }).default("0"),
    downtimeMinutes: integer("downtime_minutes").default(0),
    completedBy: integer("completed_by"),
    completedByName: varchar("completed_by_name", { length: 100 }),
    reviewedBy: integer("reviewed_by"),
    reviewedByName: varchar("reviewed_by_name", { length: 100 }),
    reviewNotes: text("review_notes"),
    qualityVerified: boolean("quality_verified").default(false),
    createdBy: varchar("created_by", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("maintenance_work_orders_code_idx").on(table.workOrderCode),
    index("maintenance_work_orders_status_idx").on(table.status),
    index("maintenance_work_orders_equipment_id_idx").on(table.equipmentId),
    index("maintenance_work_orders_assigned_to_idx").on(table.assignedTo),
    index("maintenance_work_orders_scheduled_start_idx").on(table.scheduledStartAt),
  ],
);

// ──────────────────────────────────────────────────────────────
// Table 8: maintenance_execution_logs — 维保执行日志
// ──────────────────────────────────────────────────────────────
export const maintenanceExecutionLogs = pgTable(
  "maintenance_execution_logs",
  {
    id: serial("id").primaryKey(),
    workOrderId: integer("work_order_id"),
    stepNumber: integer("step_number"),
    stepDescription: text("step_description"),
    status: maintenanceStepStatusEnum("status").default("pending"),
    estimatedMinutes: integer("estimated_minutes"),
    actualMinutes: integer("actual_minutes"),
    startedAt: timestamp("started_at", { mode: "string" }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    evidenceType: varchar("evidence_type", { length: 30 }),
    evidenceUrl: varchar("evidence_url", { length: 500 }),
    evidenceThumbnailUrl: varchar("evidence_thumbnail_url", { length: 500 }),
    evidenceNotes: text("evidence_notes"),
    measuredValue: varchar("measured_value", { length: 100 }),
    expectedValue: varchar("expected_value", { length: 100 }),
    unit: varchar("unit", { length: 30 }),
    measurementPass: boolean("measurement_pass"),
    partsUsed: jsonb("parts_used"),
    toolsUsed: jsonb("tools_used"),
    executedBy: integer("executed_by"),
    executedByName: varchar("executed_by_name", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("maintenance_execution_logs_wo_id_idx").on(table.workOrderId),
    index("maintenance_execution_logs_status_idx").on(table.status),
    index("maintenance_execution_logs_step_number_idx").on(table.stepNumber),
  ],
);

// ─── Type Exports ─────────────────────────────────────────────

export type HumanoidRobot = InferSelectModel<typeof humanoidRobots>;
export type NewHumanoidRobot = InferInsertModel<typeof humanoidRobots>;

export type HumanoidVisionTask = InferSelectModel<typeof humanoidVisionTasks>;
export type NewHumanoidVisionTask = InferInsertModel<typeof humanoidVisionTasks>;

export type HumanoidVisionResult = InferSelectModel<typeof humanoidVisionResults>;
export type NewHumanoidVisionResult = InferInsertModel<typeof humanoidVisionResults>;

export type MaterialHandlingJob = InferSelectModel<typeof materialHandlingJobs>;
export type NewMaterialHandlingJob = InferInsertModel<typeof materialHandlingJobs>;

export type MaterialHandlingLog = InferSelectModel<typeof materialHandlingLogs>;
export type NewMaterialHandlingLog = InferInsertModel<typeof materialHandlingLogs>;

export type MaintenanceSchedule = InferSelectModel<typeof maintenanceSchedules>;
export type NewMaintenanceSchedule = InferInsertModel<typeof maintenanceSchedules>;

export type MaintenanceWorkOrder = InferSelectModel<typeof maintenanceWorkOrders>;
export type NewMaintenanceWorkOrder = InferInsertModel<typeof maintenanceWorkOrders>;

export type MaintenanceExecutionLog = InferSelectModel<typeof maintenanceExecutionLogs>;
export type NewMaintenanceExecutionLog = InferInsertModel<typeof maintenanceExecutionLogs>;
