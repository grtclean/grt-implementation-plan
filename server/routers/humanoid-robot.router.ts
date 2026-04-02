/**
 * Humanoid Robot Router — 人形机器人/视觉/物料搬运/维保
 *
 * ~30 procedures across 5 sections:
 *   Registry (5), Vision (5), Material Handling (7),
 *   Maintenance Schedule (5), Maintenance Execution (6)
 *
 * Tables auto-created via ensureTables() DDL on first access.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, eq, desc, and, count, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import {
  humanoidRobots,
  humanoidVisionTasks,
  humanoidVisionResults,
  materialHandlingJobs,
  materialHandlingLogs,
  maintenanceSchedules,
  maintenanceWorkOrders,
  maintenanceExecutionLogs,
} from "../../drizzle/humanoid-robot-schema";

const log = createChildLogger("humanoid-robot");

// ─── Flexible ID ──────────────────────────────────────────────
const flexId = z.union([z.string(), z.number()]).transform(Number);

// ─── Auto-DDL ─────────────────────────────────────────────────
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  const db = await requireDb();
  try {
    // --- Enums (CREATE TYPE IF NOT EXISTS via DO block) ---
    await db.execute(sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'humanoid_status') THEN
        CREATE TYPE "humanoid_status" AS ENUM ('idle','working','loading','unloading','maintenance','error','offline');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gripper_type') THEN
        CREATE TYPE "gripper_type" AS ENUM ('parallel_jaw','vacuum_suction','magnetic','adaptive_finger','soft_gripper');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vision_task_type') THEN
        CREATE TYPE "vision_task_type" AS ENUM ('part_recognition','cleanliness_check','dimension_measure','defect_detection','barcode_scan');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vision_result') THEN
        CREATE TYPE "vision_result" AS ENUM ('pass','fail','inconclusive','error');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'handling_job_status') THEN
        CREATE TYPE "handling_job_status" AS ENUM ('queued','picking','loading','cleaning','unloading','placing','completed','failed','cancelled');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_schedule_type') THEN
        CREATE TYPE "maintenance_schedule_type" AS ENUM ('daily','weekly','monthly','quarterly','annual','runtime_based','event_triggered');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_priority') THEN
        CREATE TYPE "maintenance_priority" AS ENUM ('low','medium','high','critical');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_wo_status') THEN
        CREATE TYPE "maintenance_wo_status" AS ENUM ('draft','scheduled','in_progress','pending_review','completed','cancelled');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_step_status') THEN
        CREATE TYPE "maintenance_step_status" AS ENUM ('pending','in_progress','completed','skipped','failed');
      END IF;
    END $$`);

    // --- Table 1: humanoid_robots ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "humanoid_robots" (
        "id" serial PRIMARY KEY NOT NULL,
        "robot_code" varchar(50) NOT NULL UNIQUE,
        "model" varchar(100),
        "manufacturer" varchar(100),
        "serial_number" varchar(100),
        "firmware_version" varchar(50),
        "status" "humanoid_status" DEFAULT 'offline',
        "station_id" integer,
        "station_name" varchar(200),
        "gripper_type" "gripper_type" DEFAULT 'parallel_jaw',
        "grip_force_n" decimal(6,2),
        "capabilities" jsonb,
        "camera_ids" jsonb,
        "uwb_tag_id" varchar(50),
        "dt_asset_id" integer,
        "last_heartbeat_at" timestamp,
        "total_runtime_hours" decimal(10,2) DEFAULT 0,
        "total_cycle_count" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "humanoid_robots_status_idx" ON "humanoid_robots" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "humanoid_robots_station_id_idx" ON "humanoid_robots" ("station_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "humanoid_robots_robot_code_idx" ON "humanoid_robots" ("robot_code")`);

    // --- Table 2: humanoid_vision_tasks ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "humanoid_vision_tasks" (
        "id" serial PRIMARY KEY NOT NULL,
        "task_name" varchar(200) NOT NULL,
        "task_type" "vision_task_type" NOT NULL,
        "part_type_pattern" varchar(100),
        "cleanliness_threshold_mg" decimal(10,4),
        "dimension_tolerance_mm" decimal(8,3),
        "reference_image_url" varchar(500),
        "ai_model_id" varchar(100),
        "linked_recipe_id" integer,
        "parameters" jsonb,
        "is_active" boolean DEFAULT true,
        "created_by" varchar(100),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "humanoid_vision_tasks_task_type_idx" ON "humanoid_vision_tasks" ("task_type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "humanoid_vision_tasks_is_active_idx" ON "humanoid_vision_tasks" ("is_active")`);

    // --- Table 3: humanoid_vision_results ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "humanoid_vision_results" (
        "id" serial PRIMARY KEY NOT NULL,
        "task_id" integer,
        "humanoid_robot_id" integer,
        "camera_id" integer,
        "snapshot_id" integer,
        "part_number" varchar(100),
        "result" "vision_result",
        "confidence_score" decimal(5,4),
        "detected_part_type" varchar(100),
        "measured_values" jsonb,
        "bounding_boxes" jsonb,
        "processing_time_ms" integer,
        "image_url" varchar(500),
        "selected_recipe_id" integer,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "humanoid_vision_results_task_id_idx" ON "humanoid_vision_results" ("task_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "humanoid_vision_results_robot_id_idx" ON "humanoid_vision_results" ("humanoid_robot_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "humanoid_vision_results_result_idx" ON "humanoid_vision_results" ("result")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "humanoid_vision_results_created_at_idx" ON "humanoid_vision_results" ("created_at")`);

    // --- Table 4: material_handling_jobs ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "material_handling_jobs" (
        "id" serial PRIMARY KEY NOT NULL,
        "humanoid_robot_id" integer,
        "project_id" integer,
        "work_order_id" integer,
        "part_number" varchar(100),
        "part_name" varchar(200),
        "part_quantity" integer DEFAULT 1,
        "status" "handling_job_status" DEFAULT 'queued',
        "pick_source" varchar(200),
        "load_target" varchar(200),
        "unload_target" varchar(200),
        "place_destination" varchar(200),
        "queued_at" timestamp DEFAULT now(),
        "pick_start_at" timestamp,
        "pick_complete_at" timestamp,
        "load_start_at" timestamp,
        "load_complete_at" timestamp,
        "cleaning_start_at" timestamp,
        "cleaning_complete_at" timestamp,
        "unload_start_at" timestamp,
        "unload_complete_at" timestamp,
        "place_start_at" timestamp,
        "place_complete_at" timestamp,
        "grip_force_n" decimal(6,2),
        "gripper_status" varchar(20) DEFAULT 'idle',
        "vision_result_id" integer,
        "cleaning_recipe_id" integer,
        "priority" integer DEFAULT 5,
        "created_by" varchar(100),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "material_handling_jobs_robot_id_idx" ON "material_handling_jobs" ("humanoid_robot_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "material_handling_jobs_status_idx" ON "material_handling_jobs" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "material_handling_jobs_priority_idx" ON "material_handling_jobs" ("priority")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "material_handling_jobs_created_at_idx" ON "material_handling_jobs" ("created_at")`);

    // --- Table 5: material_handling_logs ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "material_handling_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "job_id" integer,
        "step_name" varchar(50),
        "started_at" timestamp,
        "completed_at" timestamp,
        "duration_seconds" integer,
        "success" boolean DEFAULT true,
        "grip_force_n" decimal(6,2),
        "error_code" varchar(50),
        "error_message" text,
        "sensor_data" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "material_handling_logs_job_id_idx" ON "material_handling_logs" ("job_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "material_handling_logs_step_name_idx" ON "material_handling_logs" ("step_name")`);

    // --- Table 6: maintenance_schedules ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "maintenance_schedules" (
        "id" serial PRIMARY KEY NOT NULL,
        "schedule_name" varchar(200) NOT NULL,
        "schedule_name_en" varchar(200),
        "equipment_type" varchar(50),
        "equipment_id" integer,
        "maintenance_type" "maintenance_schedule_type",
        "interval_days" integer,
        "runtime_hours_trigger" decimal(10,2),
        "cycle_count_trigger" integer,
        "sensor_threshold_json" jsonb,
        "sop_steps" jsonb,
        "estimated_duration_minutes" integer,
        "priority" "maintenance_priority" DEFAULT 'medium',
        "requires_shutdown" boolean DEFAULT false,
        "assigned_role_id" varchar(50),
        "last_generated_at" timestamp,
        "next_due_date" timestamp,
        "is_active" boolean DEFAULT true,
        "created_by" varchar(100),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_schedules_equipment_type_idx" ON "maintenance_schedules" ("equipment_type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_schedules_maintenance_type_idx" ON "maintenance_schedules" ("maintenance_type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_schedules_next_due_date_idx" ON "maintenance_schedules" ("next_due_date")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_schedules_is_active_idx" ON "maintenance_schedules" ("is_active")`);

    // --- Table 7: maintenance_work_orders ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "maintenance_work_orders" (
        "id" serial PRIMARY KEY NOT NULL,
        "work_order_code" varchar(50) NOT NULL UNIQUE,
        "schedule_id" integer,
        "equipment_type" varchar(50),
        "equipment_id" integer,
        "equipment_name" varchar(200),
        "title" varchar(300),
        "description" text,
        "status" "maintenance_wo_status" DEFAULT 'draft',
        "priority" "maintenance_priority" DEFAULT 'medium',
        "assigned_to" integer,
        "assigned_to_name" varchar(100),
        "scheduled_start_at" timestamp,
        "scheduled_end_at" timestamp,
        "actual_start_at" timestamp,
        "actual_end_at" timestamp,
        "total_duration_minutes" integer,
        "sop_step_count" integer DEFAULT 0,
        "completed_step_count" integer DEFAULT 0,
        "parts_consumed" jsonb,
        "total_parts_cost" decimal(12,2) DEFAULT 0,
        "downtime_minutes" integer DEFAULT 0,
        "completed_by" integer,
        "completed_by_name" varchar(100),
        "reviewed_by" integer,
        "reviewed_by_name" varchar(100),
        "review_notes" text,
        "quality_verified" boolean DEFAULT false,
        "created_by" varchar(100),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_work_orders_code_idx" ON "maintenance_work_orders" ("work_order_code")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_work_orders_status_idx" ON "maintenance_work_orders" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_work_orders_equipment_id_idx" ON "maintenance_work_orders" ("equipment_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_work_orders_assigned_to_idx" ON "maintenance_work_orders" ("assigned_to")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_work_orders_scheduled_start_idx" ON "maintenance_work_orders" ("scheduled_start_at")`);

    // --- Table 8: maintenance_execution_logs ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "maintenance_execution_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "work_order_id" integer,
        "step_number" integer,
        "step_description" text,
        "status" "maintenance_step_status" DEFAULT 'pending',
        "estimated_minutes" integer,
        "actual_minutes" integer,
        "started_at" timestamp,
        "completed_at" timestamp,
        "evidence_type" varchar(30),
        "evidence_url" varchar(500),
        "evidence_thumbnail_url" varchar(500),
        "evidence_notes" text,
        "measured_value" varchar(100),
        "expected_value" varchar(100),
        "unit" varchar(30),
        "measurement_pass" boolean,
        "parts_used" jsonb,
        "tools_used" jsonb,
        "executed_by" integer,
        "executed_by_name" varchar(100),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_execution_logs_wo_id_idx" ON "maintenance_execution_logs" ("work_order_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_execution_logs_status_idx" ON "maintenance_execution_logs" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "maintenance_execution_logs_step_number_idx" ON "maintenance_execution_logs" ("step_number")`);

    tablesEnsured = true;
    log.info("Humanoid robot tables ensured (8 tables, 9 enums)");
  } catch (err) {
    log.error({ err }, "Failed to ensure humanoid robot tables");
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
//  Router
// ═══════════════════════════════════════════════════════════════
export const humanoidRobotRouter = router({

  // ═══════════════════════════════════════════════════════════════
  //  Section 1: Robot Registry (5)
  // ═══════════════════════════════════════════════════════════════

  /** 列表查询 — 支持 status/stationId 筛选 */
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        stationId: z.number().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }).optional(),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { status, stationId, limit: lim } = input ?? {};
      const conditions: SQL[] = [];
      if (status) conditions.push(eq(humanoidRobots.status, status as any));
      if (stationId) conditions.push(eq(humanoidRobots.stationId, stationId));

      const rows = await db
        .select()
        .from(humanoidRobots)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(humanoidRobots.id))
        .limit(lim ?? 50);

      return { robots: rows, total: rows.length };
    }),

  /** 获取单个机器人 + 最新视觉结果计数 */
  get: protectedProcedure
    .input(z.object({ id: flexId }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [robot] = await db
        .select()
        .from(humanoidRobots)
        .where(eq(humanoidRobots.id, input.id))
        .limit(1);
      if (!robot) throw new TRPCError({ code: "NOT_FOUND", message: "Robot not found" });

      const [visionCount] = await db
        .select({ count: count() })
        .from(humanoidVisionResults)
        .where(eq(humanoidVisionResults.humanoidRobotId, input.id));

      return { robot, visionResultCount: visionCount?.count ?? 0 };
    }),

  /** 注册新机器人 */
  register: requirePermission("mfg:humanoid:manage")
    .input(
      z.object({
        robotCode: z.string().min(1).max(50),
        model: z.string().max(100).optional(),
        manufacturer: z.string().max(100).optional(),
        serialNumber: z.string().max(100).optional(),
        firmwareVersion: z.string().max(50).optional(),
        status: z.string().default("offline"),
        stationId: z.number().optional(),
        stationName: z.string().max(200).optional(),
        gripperType: z.string().default("parallel_jaw"),
        gripForceN: z.string().optional(),
        capabilities: z.any().optional(),
        cameraIds: z.any().optional(),
        uwbTagId: z.string().max(50).optional(),
        dtAssetId: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      log.info({ robotCode: input.robotCode }, "Registering humanoid robot");

      const [created] = await db
        .insert(humanoidRobots)
        .values(input as any)
        .returning();

      return { success: true, robot: created };
    }),

  /** 更新机器人信息 */
  update: requirePermission("mfg:humanoid:manage")
    .input(
      z.object({
        id: flexId,
        model: z.string().max(100).optional(),
        manufacturer: z.string().max(100).optional(),
        firmwareVersion: z.string().max(50).optional(),
        status: z.string().optional(),
        stationId: z.number().optional(),
        stationName: z.string().max(200).optional(),
        gripperType: z.string().optional(),
        gripForceN: z.string().optional(),
        capabilities: z.any().optional(),
        cameraIds: z.any().optional(),
        uwbTagId: z.string().max(50).optional(),
        dtAssetId: z.number().optional(),
        totalRuntimeHours: z.string().optional(),
        totalCycleCount: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { id, ...fields } = input;
      log.info({ id }, "Updating humanoid robot");

      const [updated] = await db
        .update(humanoidRobots)
        .set({ ...fields, updatedAt: new Date().toISOString() } as any)
        .where(eq(humanoidRobots.id, id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Robot not found" });
      return { success: true, robot: updated };
    }),

  /** 停用机器人 */
  decommission: requirePermission("mfg:humanoid:manage")
    .input(z.object({ id: flexId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      log.info({ id: input.id }, "Decommissioning humanoid robot");

      const [updated] = await db
        .update(humanoidRobots)
        .set({ status: "offline", updatedAt: new Date().toISOString() } as any)
        .where(eq(humanoidRobots.id, input.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Robot not found" });
      return { success: true, robot: updated };
    }),

  // ═══════════════════════════════════════════════════════════════
  //  Section 2: Vision (5)
  // ═══════════════════════════════════════════════════════════════

  /** 创建视觉任务 */
  createVisionTask: requirePermission("mfg:humanoid:manage")
    .input(
      z.object({
        taskName: z.string().min(1).max(200),
        taskType: z.enum(["part_recognition", "cleanliness_check", "dimension_measure", "defect_detection", "barcode_scan"]),
        partTypePattern: z.string().max(100).optional(),
        cleanlinessThresholdMg: z.string().optional(),
        dimensionToleranceMm: z.string().optional(),
        referenceImageUrl: z.string().max(500).optional(),
        aiModelId: z.string().max(100).optional(),
        linkedRecipeId: z.number().optional(),
        parameters: z.any().optional(),
        createdBy: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      log.info({ taskName: input.taskName }, "Creating vision task");

      const [created] = await db
        .insert(humanoidVisionTasks)
        .values(input as any)
        .returning();

      return { success: true, task: created };
    }),

  /** 执行视觉任务 — 产生检测结果(mock confidence/result) */
  executeVisionTask: requirePermission("mfg:humanoid:operate")
    .input(
      z.object({
        taskId: flexId,
        humanoidRobotId: flexId,
        cameraId: z.number().default(1),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      log.info({ taskId: input.taskId, robotId: input.humanoidRobotId }, "Executing vision task");

      // Verify task exists
      const [task] = await db
        .select()
        .from(humanoidVisionTasks)
        .where(eq(humanoidVisionTasks.id, input.taskId))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Vision task not found" });

      // Mock confidence and result
      const confidence = (0.85 + Math.random() * 0.14).toFixed(4);
      const resultOptions: Array<"pass" | "fail" | "inconclusive"> = ["pass", "pass", "pass", "fail", "inconclusive"];
      const mockResult = resultOptions[Math.floor(Math.random() * resultOptions.length)];
      const processingTimeMs = 120 + Math.floor(Math.random() * 380);

      const [created] = await db
        .insert(humanoidVisionResults)
        .values({
          taskId: input.taskId,
          humanoidRobotId: input.humanoidRobotId,
          cameraId: input.cameraId,
          result: mockResult,
          confidenceScore: confidence,
          processingTimeMs,
          detectedPartType: task.partTypePattern,
          selectedRecipeId: task.linkedRecipeId,
        } as any)
        .returning();

      return { success: true, result: created };
    }),

  /** 查询视觉结果列表 */
  listVisionResults: protectedProcedure
    .input(
      z.object({
        robotId: z.number().optional(),
        taskId: z.number().optional(),
        result: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }).optional(),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { robotId, taskId, result, limit: lim } = input ?? {};
      const conditions: SQL[] = [];
      if (robotId) conditions.push(eq(humanoidVisionResults.humanoidRobotId, robotId));
      if (taskId) conditions.push(eq(humanoidVisionResults.taskId, taskId));
      if (result) conditions.push(eq(humanoidVisionResults.result, result as any));

      const rows = await db
        .select()
        .from(humanoidVisionResults)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(humanoidVisionResults.id))
        .limit(lim ?? 50);

      return { results: rows, total: rows.length };
    }),

  /** 获取最新视觉结果 */
  getLatestVisionResult: protectedProcedure
    .input(z.object({ humanoidRobotId: flexId }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const [latest] = await db
        .select()
        .from(humanoidVisionResults)
        .where(eq(humanoidVisionResults.humanoidRobotId, input.humanoidRobotId))
        .orderBy(desc(humanoidVisionResults.createdAt))
        .limit(1);

      return { result: latest ?? null };
    }),

  /** 关联视觉任务到配方 */
  linkVisionToRecipe: requirePermission("mfg:humanoid:manage")
    .input(
      z.object({
        taskId: flexId,
        linkedRecipeId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      log.info({ taskId: input.taskId, recipeId: input.linkedRecipeId }, "Linking vision task to recipe");

      const [updated] = await db
        .update(humanoidVisionTasks)
        .set({ linkedRecipeId: input.linkedRecipeId, updatedAt: new Date().toISOString() })
        .where(eq(humanoidVisionTasks.id, input.taskId))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Vision task not found" });
      return { success: true, task: updated };
    }),

  // ═══════════════════════════════════════════════════════════════
  //  Section 3: Material Handling (7)
  // ═══════════════════════════════════════════════════════════════

  /** 创建搬运作业 */
  createHandlingJob: requirePermission("mfg:humanoid:operate")
    .input(
      z.object({
        humanoidRobotId: flexId,
        partNumber: z.string().max(100),
        partName: z.string().max(200),
        pickSource: z.string().max(200),
        loadTarget: z.string().max(200),
        priority: z.number().int().min(1).max(10).default(5),
        projectId: z.number().optional(),
        workOrderId: z.number().optional(),
        partQuantity: z.number().int().default(1),
        unloadTarget: z.string().max(200).optional(),
        placeDestination: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      log.info({ robotId: input.humanoidRobotId, part: input.partNumber }, "Creating handling job");

      const [created] = await db
        .insert(materialHandlingJobs)
        .values({
          ...input,
          status: "queued",
          createdBy: ctx.user?.name ?? "system",
        } as any)
        .returning();

      return { success: true, job: created };
    }),

  /** 启动搬运作业 */
  startHandlingJob: requirePermission("mfg:humanoid:operate")
    .input(z.object({ id: flexId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const now = new Date().toISOString();

      const [updated] = await db
        .update(materialHandlingJobs)
        .set({ status: "picking", pickStartAt: now, updatedAt: now } as any)
        .where(eq(materialHandlingJobs.id, input.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // Insert log entry
      await db.insert(materialHandlingLogs).values({
        jobId: input.id,
        stepName: "pick_start",
        startedAt: now,
        success: true,
      });

      return { success: true, job: updated };
    }),

  /** 完成搬运步骤 — 状态机: queued→picking→loading→cleaning→unloading→placing→completed */
  completeHandlingStep: requirePermission("mfg:humanoid:operate")
    .input(
      z.object({
        id: flexId,
        stepName: z.enum(["pick", "load", "clean", "unload", "place"]),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const now = new Date().toISOString();

      // State machine mapping
      const stepTransitions: Record<string, { completeField: string; nextStatus: string; nextStartField: string | null }> = {
        pick:   { completeField: "pick_complete_at",     nextStatus: "loading",   nextStartField: "load_start_at" },
        load:   { completeField: "load_complete_at",     nextStatus: "cleaning",  nextStartField: "cleaning_start_at" },
        clean:  { completeField: "cleaning_complete_at", nextStatus: "unloading", nextStartField: "unload_start_at" },
        unload: { completeField: "unload_complete_at",   nextStatus: "placing",   nextStartField: "place_start_at" },
        place:  { completeField: "place_complete_at",    nextStatus: "completed", nextStartField: null },
      };

      const transition = stepTransitions[input.stepName];
      if (!transition) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid step name" });

      const updateFields: Record<string, any> = {
        status: transition.nextStatus,
        [transition.completeField]: now,
        updated_at: now,
      };
      if (transition.nextStartField) {
        updateFields[transition.nextStartField] = now;
      }

      // Use parameterized update for safety
      await db.execute(sql`UPDATE material_handling_jobs SET
        status = ${updateFields.status},
        updated_at = ${updateFields.updated_at}
        WHERE id = ${input.id}`);

      // Insert log entry
      await db.insert(materialHandlingLogs).values({
        jobId: input.id,
        stepName: `${input.stepName}_complete`,
        startedAt: now,
        completedAt: now,
        success: true,
      });

      const [job] = await db
        .select()
        .from(materialHandlingJobs)
        .where(eq(materialHandlingJobs.id, input.id))
        .limit(1);

      return { success: true, job };
    }),

  /** 完成搬运作业 */
  completeHandlingJob: requirePermission("mfg:humanoid:operate")
    .input(z.object({ id: flexId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const now = new Date().toISOString();

      const [updated] = await db
        .update(materialHandlingJobs)
        .set({ status: "completed", updatedAt: now } as any)
        .where(eq(materialHandlingJobs.id, input.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      return { success: true, job: updated };
    }),

  /** 列表搬运作业 */
  listHandlingJobs: protectedProcedure
    .input(
      z.object({
        humanoidRobotId: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }).optional(),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { humanoidRobotId, status, limit: lim } = input ?? {};
      const conditions: SQL[] = [];
      if (humanoidRobotId) conditions.push(eq(materialHandlingJobs.humanoidRobotId, humanoidRobotId));
      if (status) conditions.push(eq(materialHandlingJobs.status, status as any));

      const rows = await db
        .select()
        .from(materialHandlingJobs)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(materialHandlingJobs.id))
        .limit(lim ?? 50);

      return { jobs: rows, total: rows.length };
    }),

  /** 获取搬运作业状态 + 所有日志 */
  getHandlingJobStatus: protectedProcedure
    .input(z.object({ id: flexId }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const [job] = await db
        .select()
        .from(materialHandlingJobs)
        .where(eq(materialHandlingJobs.id, input.id))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const logs = await db
        .select()
        .from(materialHandlingLogs)
        .where(eq(materialHandlingLogs.jobId, input.id))
        .orderBy(materialHandlingLogs.id)
        .limit(100);

      return { job, logs };
    }),

  /** 工位队列统计 — GROUP BY status */
  getStationQueues: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();

      const rows = await db.execute(sql`
        SELECT
          r."station_name",
          r."station_id",
          j."status",
          COUNT(*)::int AS "count"
        FROM "material_handling_jobs" j
        LEFT JOIN "humanoid_robots" r ON r."id" = j."humanoid_robot_id"
        GROUP BY r."station_name", r."station_id", j."status"
        ORDER BY r."station_name", j."status"
        LIMIT 200
      `);

      return { queues: rows.rows ?? rows };
    }),

  // ═══════════════════════════════════════════════════════════════
  //  Section 4: Maintenance Schedule (5)
  // ═══════════════════════════════════════════════════════════════

  /** 列表维保计划 */
  listMaintenanceSchedules: protectedProcedure
    .input(
      z.object({
        equipmentType: z.string().optional(),
        maintenanceType: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }).optional(),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { equipmentType, maintenanceType, isActive, limit: lim } = input ?? {};
      const conditions: SQL[] = [];
      if (equipmentType) conditions.push(eq(maintenanceSchedules.equipmentType, equipmentType));
      if (maintenanceType) conditions.push(eq(maintenanceSchedules.maintenanceType, maintenanceType as any));
      if (isActive !== undefined) conditions.push(eq(maintenanceSchedules.isActive, isActive));

      const rows = await db
        .select()
        .from(maintenanceSchedules)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(maintenanceSchedules.id))
        .limit(lim ?? 50);

      return { schedules: rows, total: rows.length };
    }),

  /** 创建维保计划 */
  createMaintenanceSchedule: requirePermission("mfg:maintenance:manage")
    .input(
      z.object({
        scheduleName: z.string().min(1).max(200),
        scheduleNameEn: z.string().max(200).optional(),
        equipmentType: z.string().max(50).optional(),
        equipmentId: z.number().optional(),
        maintenanceType: z.enum(["daily", "weekly", "monthly", "quarterly", "annual", "runtime_based", "event_triggered"]),
        intervalDays: z.number().int().optional(),
        runtimeHoursTrigger: z.string().optional(),
        cycleCountTrigger: z.number().optional(),
        sensorThresholdJson: z.any().optional(),
        sopSteps: z.any().optional(),
        estimatedDurationMinutes: z.number().int().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        requiresShutdown: z.boolean().default(false),
        assignedRoleId: z.string().max(50).optional(),
        createdBy: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      log.info({ name: input.scheduleName }, "Creating maintenance schedule");

      // Calculate nextDueDate from intervalDays
      let nextDueDate: string | undefined;
      if (input.intervalDays) {
        const d = new Date();
        d.setDate(d.getDate() + input.intervalDays);
        nextDueDate = d.toISOString();
      }

      const [created] = await db
        .insert(maintenanceSchedules)
        .values({
          ...input,
          nextDueDate,
        } as any)
        .returning();

      return { success: true, schedule: created };
    }),

  /** 更新维保计划 */
  updateMaintenanceSchedule: requirePermission("mfg:maintenance:manage")
    .input(
      z.object({
        id: flexId,
        scheduleName: z.string().max(200).optional(),
        scheduleNameEn: z.string().max(200).optional(),
        maintenanceType: z.enum(["daily", "weekly", "monthly", "quarterly", "annual", "runtime_based", "event_triggered"]).optional(),
        intervalDays: z.number().int().optional(),
        runtimeHoursTrigger: z.string().optional(),
        cycleCountTrigger: z.number().optional(),
        sensorThresholdJson: z.any().optional(),
        sopSteps: z.any().optional(),
        estimatedDurationMinutes: z.number().int().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        requiresShutdown: z.boolean().optional(),
        assignedRoleId: z.string().max(50).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { id, ...fields } = input;
      log.info({ id }, "Updating maintenance schedule");

      const [updated] = await db
        .update(maintenanceSchedules)
        .set({ ...fields, updatedAt: new Date().toISOString() } as any)
        .where(eq(maintenanceSchedules.id, id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found" });
      return { success: true, schedule: updated };
    }),

  /** 查询到期维保项 */
  checkDueMaintenanceItems: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();

      const rows = await db
        .select()
        .from(maintenanceSchedules)
        .where(
          and(
            eq(maintenanceSchedules.isActive, true),
            sql`${maintenanceSchedules.nextDueDate} <= NOW()`,
          ),
        )
        .orderBy(maintenanceSchedules.nextDueDate)
        .limit(100);

      return { dueItems: rows, total: rows.length };
    }),

  /** 批量生成维保工单 — 为每个到期计划创建工单+执行步骤 */
  generateMaintenanceWorkOrders: requirePermission("mfg:maintenance:manage")
    .mutation(async () => {
      await ensureTables();
      const db = await requireDb();
      log.info("Generating maintenance work orders for due schedules");

      // Find due schedules
      const dueSchedules = await db
        .select()
        .from(maintenanceSchedules)
        .where(
          and(
            eq(maintenanceSchedules.isActive, true),
            sql`${maintenanceSchedules.nextDueDate} <= NOW()`,
          ),
        )
        .limit(50);

      let createdCount = 0;
      const now = new Date().toISOString();

      for (const sched of dueSchedules) {
        // Generate work order code
        const code = `MWO-${Date.now()}-${sched.id}`;

        // Parse SOP steps
        const sopSteps: Array<{ description: string; estimatedMinutes?: number; expectedValue?: string; unit?: string }> =
          Array.isArray(sched.sopSteps) ? sched.sopSteps as any : [];

        const [wo] = await db
          .insert(maintenanceWorkOrders)
          .values({
            workOrderCode: code,
            scheduleId: sched.id,
            equipmentType: sched.equipmentType,
            equipmentId: sched.equipmentId,
            title: sched.scheduleName,
            description: `Auto-generated from schedule #${sched.id}`,
            status: "scheduled",
            priority: sched.priority ?? "medium",
            assignedToName: sched.assignedRoleId,
            sopStepCount: sopSteps.length,
            completedStepCount: 0,
            createdBy: "system",
          } as any)
          .returning();

        // Insert execution log steps from sopSteps
        for (let i = 0; i < sopSteps.length; i++) {
          const step = sopSteps[i];
          await db.insert(maintenanceExecutionLogs).values({
            workOrderId: wo.id,
            stepNumber: i + 1,
            stepDescription: step.description ?? `Step ${i + 1}`,
            status: "pending",
            estimatedMinutes: step.estimatedMinutes ?? null,
            expectedValue: step.expectedValue ?? null,
            unit: step.unit ?? null,
          } as any);
        }

        // Update schedule: lastGeneratedAt + next due date
        let nextDueDate: string | null = null;
        if (sched.intervalDays) {
          const d = new Date();
          d.setDate(d.getDate() + Number(sched.intervalDays));
          nextDueDate = d.toISOString();
        }

        await db
          .update(maintenanceSchedules)
          .set({
            lastGeneratedAt: now,
            nextDueDate,
            updatedAt: now,
          } as any)
          .where(eq(maintenanceSchedules.id, sched.id));

        createdCount++;
      }

      log.info({ createdCount }, "Maintenance work orders generated");
      return { success: true, createdCount };
    }),

  // ═══════════════════════════════════════════════════════════════
  //  Section 5: Maintenance Execution (6)
  // ═══════════════════════════════════════════════════════════════

  /** 列表维保工单 */
  listMaintenanceWorkOrders: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        equipmentId: z.number().optional(),
        assignedTo: z.number().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }).optional(),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { status, equipmentId, assignedTo, limit: lim } = input ?? {};
      const conditions: SQL[] = [];
      if (status) conditions.push(eq(maintenanceWorkOrders.status, status as any));
      if (equipmentId) conditions.push(eq(maintenanceWorkOrders.equipmentId, equipmentId));
      if (assignedTo) conditions.push(eq(maintenanceWorkOrders.assignedTo, assignedTo));

      const rows = await db
        .select()
        .from(maintenanceWorkOrders)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(maintenanceWorkOrders.id))
        .limit(lim ?? 50);

      return { workOrders: rows, total: rows.length };
    }),

  /** 开始执行维保工单 */
  startMaintenanceExecution: requirePermission("mfg:maintenance:execute")
    .input(z.object({ id: flexId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const now = new Date().toISOString();
      log.info({ id: input.id }, "Starting maintenance execution");

      const [updated] = await db
        .update(maintenanceWorkOrders)
        .set({ status: "in_progress", actualStartAt: now, updatedAt: now } as any)
        .where(eq(maintenanceWorkOrders.id, input.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Work order not found" });
      return { success: true, workOrder: updated };
    }),

  /** 完成维保步骤 */
  completeMaintenanceStep: requirePermission("mfg:maintenance:execute")
    .input(
      z.object({
        workOrderId: flexId,
        stepNumber: z.number().int(),
        actualMinutes: z.number().int().optional(),
        measuredValue: z.string().optional(),
        measurementPass: z.boolean().optional(),
        evidenceUrl: z.string().max(500).optional(),
        evidenceNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const now = new Date().toISOString();
      log.info({ woId: input.workOrderId, step: input.stepNumber }, "Completing maintenance step");

      // Update step
      await db
        .update(maintenanceExecutionLogs)
        .set({
          status: "completed",
          completedAt: now,
          actualMinutes: input.actualMinutes,
          measuredValue: input.measuredValue,
          measurementPass: input.measurementPass,
          evidenceUrl: input.evidenceUrl,
          evidenceNotes: input.evidenceNotes,
          executedBy: ctx.user?.id ? Number(ctx.user.id) : null,
          executedByName: ctx.user?.name ?? null,
          updatedAt: now,
        } as any)
        .where(
          and(
            eq(maintenanceExecutionLogs.workOrderId, input.workOrderId),
            eq(maintenanceExecutionLogs.stepNumber, input.stepNumber),
          ),
        );

      // Increment completedStepCount on work order
      await db.execute(
        sql`UPDATE "maintenance_work_orders"
            SET "completed_step_count" = "completed_step_count" + 1,
                "updated_at" = NOW()
            WHERE "id" = ${input.workOrderId}`,
      );

      return { success: true };
    }),

  /** 添加维保证据(照片/视频/备注) */
  addMaintenanceEvidence: requirePermission("mfg:maintenance:execute")
    .input(
      z.object({
        workOrderId: flexId,
        stepNumber: z.number().int(),
        evidenceType: z.string().max(30),
        evidenceUrl: z.string().max(500),
        evidenceNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const now = new Date().toISOString();
      log.info({ woId: input.workOrderId, step: input.stepNumber }, "Adding maintenance evidence");

      await db
        .update(maintenanceExecutionLogs)
        .set({
          evidenceType: input.evidenceType,
          evidenceUrl: input.evidenceUrl,
          evidenceNotes: input.evidenceNotes,
          updatedAt: now,
        })
        .where(
          and(
            eq(maintenanceExecutionLogs.workOrderId, input.workOrderId),
            eq(maintenanceExecutionLogs.stepNumber, input.stepNumber),
          ),
        );

      return { success: true };
    }),

  /** 完成维保工单 — 设为pending_review */
  completeMaintenanceWorkOrder: requirePermission("mfg:maintenance:execute")
    .input(
      z.object({
        id: flexId,
        qualityVerified: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const now = new Date().toISOString();
      log.info({ id: input.id }, "Completing maintenance work order");

      // Get work order for duration calculation
      const [wo] = await db
        .select()
        .from(maintenanceWorkOrders)
        .where(eq(maintenanceWorkOrders.id, input.id))
        .limit(1);
      if (!wo) throw new TRPCError({ code: "NOT_FOUND", message: "Work order not found" });

      let totalDurationMinutes: number | null = null;
      if (wo.actualStartAt) {
        const startMs = new Date(wo.actualStartAt).getTime();
        const endMs = new Date(now).getTime();
        totalDurationMinutes = Math.round((endMs - startMs) / 60000);
      }

      const [updated] = await db
        .update(maintenanceWorkOrders)
        .set({
          status: "pending_review",
          actualEndAt: now,
          totalDurationMinutes,
          qualityVerified: input.qualityVerified ?? false,
          completedBy: ctx.user?.id ? Number(ctx.user.id) : null,
          completedByName: ctx.user?.name ?? null,
          updatedAt: now,
        } as any)
        .where(eq(maintenanceWorkOrders.id, input.id))
        .returning();

      return { success: true, workOrder: updated };
    }),

  /** 维保历史 + MTBF/MTTR计算 */
  getMaintenanceHistory: protectedProcedure
    .input(
      z.object({
        equipmentId: flexId,
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Get completed work orders for this equipment
      const workOrders = await db
        .select()
        .from(maintenanceWorkOrders)
        .where(
          and(
            eq(maintenanceWorkOrders.equipmentId, input.equipmentId),
            eq(maintenanceWorkOrders.status, "completed"),
          ),
        )
        .orderBy(desc(maintenanceWorkOrders.actualEndAt))
        .limit(input.limit);

      // Compute MTBF (avg time between completions) and MTTR (avg repair duration)
      let mtbfHours: number | null = null;
      let mttrMinutes: number | null = null;

      if (workOrders.length > 0) {
        // MTTR = average totalDurationMinutes
        const durations = workOrders
          .map((wo) => wo.totalDurationMinutes)
          .filter((d): d is number => d !== null && d !== undefined);
        if (durations.length > 0) {
          mttrMinutes = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        }

        // MTBF = average gap between consecutive completions
        if (workOrders.length >= 2) {
          const endTimes = workOrders
            .map((wo) => wo.actualEndAt)
            .filter((t): t is string => t !== null && t !== undefined)
            .map((t) => new Date(t).getTime())
            .sort((a, b) => a - b);

          if (endTimes.length >= 2) {
            let totalGap = 0;
            for (let i = 1; i < endTimes.length; i++) {
              totalGap += endTimes[i] - endTimes[i - 1];
            }
            mtbfHours = Math.round(totalGap / (endTimes.length - 1) / 3600000 * 10) / 10;
          }
        }
      }

      return { workOrders, mtbfHours, mttrMinutes, total: workOrders.length };
    }),
});
