/**
 * AGV Logistics Router — AGV车队/路线/运输任务/交通管控/充电站
 *
 * ~25 procedures across 6 sections:
 *   Fleet (5), Routes (4), Tasks (7), Traffic (3), Charging (3), Dashboard (3)
 *
 * Tables auto-created via ensureTables() DDL on first access.
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

const flexibleId = z.union([z.string(), z.number()]);

// ─── Auto-DDL ─────────────────────────────────────────────────
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  const db = await requireDb();
  try {
    // --- Table 1: agv_fleet ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "agv_fleet" (
        "id" serial PRIMARY KEY NOT NULL,
        "agv_code" varchar(50) NOT NULL UNIQUE,
        "agv_model" varchar(100),
        "manufacturer" varchar(100),
        "serial_number" varchar(100),
        "status" varchar(30) DEFAULT 'idle',
        "current_location_x" decimal(10,3),
        "current_location_y" decimal(10,3),
        "current_zone_id" varchar(50),
        "current_task_id" integer,
        "battery_pct" integer DEFAULT 100,
        "max_payload_kg" decimal(8,2),
        "max_speed_mps" decimal(6,3),
        "navigation_type" varchar(30) DEFAULT 'laser',
        "firmware_version" varchar(50),
        "bu_code" varchar(30),
        "is_active" boolean DEFAULT true,
        "total_tasks_completed" integer DEFAULT 0,
        "total_distance_m" decimal(12,2) DEFAULT 0,
        "total_runtime_hours" decimal(10,2) DEFAULT 0,
        "last_heartbeat_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_fleet_status_idx" ON "agv_fleet" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_fleet_bu_code_idx" ON "agv_fleet" ("bu_code")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_fleet_zone_idx" ON "agv_fleet" ("current_zone_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_fleet_code_idx" ON "agv_fleet" ("agv_code")`);

    // --- Table 2: agv_routes ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "agv_routes" (
        "id" serial PRIMARY KEY NOT NULL,
        "route_code" varchar(50) NOT NULL UNIQUE,
        "route_name" varchar(200),
        "from_zone_id" varchar(50) NOT NULL,
        "from_zone_name" varchar(200),
        "to_zone_id" varchar(50) NOT NULL,
        "to_zone_name" varchar(200),
        "waypoints" jsonb,
        "distance_m" decimal(10,2),
        "estimated_time_seconds" integer,
        "max_concurrent_agvs" integer DEFAULT 3,
        "speed_limit_mps" decimal(6,3),
        "is_bidirectional" boolean DEFAULT true,
        "is_active" boolean DEFAULT true,
        "priority" integer DEFAULT 5,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_routes_from_zone_idx" ON "agv_routes" ("from_zone_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_routes_to_zone_idx" ON "agv_routes" ("to_zone_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_routes_active_idx" ON "agv_routes" ("is_active")`);

    // --- Table 3: agv_transport_tasks ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "agv_transport_tasks" (
        "id" serial PRIMARY KEY NOT NULL,
        "task_code" varchar(50) NOT NULL UNIQUE,
        "task_type" varchar(30) DEFAULT 'transport',
        "from_location" varchar(200) NOT NULL,
        "to_location" varchar(200) NOT NULL,
        "material_id" integer,
        "material_code" varchar(100),
        "material_name" varchar(200),
        "quantity" decimal(10,2) DEFAULT 1,
        "work_order_id" varchar(100),
        "agv_id" integer,
        "route_id" integer,
        "priority" integer DEFAULT 5,
        "status" varchar(30) DEFAULT 'pending',
        "dispatched_at" timestamp,
        "started_at" timestamp,
        "completed_at" timestamp,
        "actual_distance_m" decimal(10,2),
        "actual_time_seconds" integer,
        "failure_reason" text,
        "created_by" varchar(100),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_tasks_status_idx" ON "agv_transport_tasks" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_tasks_agv_idx" ON "agv_transport_tasks" ("agv_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_tasks_work_order_idx" ON "agv_transport_tasks" ("work_order_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_tasks_created_idx" ON "agv_transport_tasks" ("created_at")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_tasks_priority_idx" ON "agv_transport_tasks" ("priority")`);

    // --- Table 4: agv_traffic_rules ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "agv_traffic_rules" (
        "id" serial PRIMARY KEY NOT NULL,
        "zone_id" varchar(50) NOT NULL,
        "zone_name" varchar(200),
        "max_concurrent_agvs" integer DEFAULT 3,
        "speed_limit_mps" decimal(6,3),
        "one_way_direction" varchar(10),
        "priority_routes" jsonb,
        "time_window_start" time,
        "time_window_end" time,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        UNIQUE("zone_id")
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_traffic_zone_idx" ON "agv_traffic_rules" ("zone_id")`);

    // --- Table 5: agv_charging_stations ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "agv_charging_stations" (
        "id" serial PRIMARY KEY NOT NULL,
        "station_code" varchar(50) NOT NULL UNIQUE,
        "station_name" varchar(200),
        "location_x" decimal(10,3),
        "location_y" decimal(10,3),
        "zone_id" varchar(50),
        "charger_type" varchar(30) DEFAULT 'contact',
        "max_charge_rate_w" integer DEFAULT 500,
        "status" varchar(30) DEFAULT 'available',
        "current_agv_id" integer,
        "is_active" boolean DEFAULT true,
        "total_charges" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_charging_status_idx" ON "agv_charging_stations" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "agv_charging_zone_idx" ON "agv_charging_stations" ("zone_id")`);

    tablesEnsured = true;
  } catch (_err) {
    // tables may already exist — continue
    tablesEnsured = true;
  }
}

// ═══════════════════════════════════════════════════════════════
//  Router
// ═══════════════════════════════════════════════════════════════
export const agvLogisticsRouter = router({

  // ═══════════════════════════════════════════════════════════════
  //  Section 1: Fleet (5)
  // ═══════════════════════════════════════════════════════════════

  /** 车队列表 */
  listFleet: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      buCode: z.string().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const parts: ReturnType<typeof sql>[] = [];
      if (input?.status) parts.push(sql`status = ${input.status}`);
      if (input?.buCode) parts.push(sql`bu_code = ${input.buCode}`);
      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT id, agv_code AS "agvCode", agv_model AS "agvModel", manufacturer,
               serial_number AS "serialNumber", status,
               current_location_x AS "currentLocationX", current_location_y AS "currentLocationY",
               current_zone_id AS "currentZoneId", current_task_id AS "currentTaskId",
               battery_pct AS "batteryPct", max_payload_kg AS "maxPayloadKg",
               navigation_type AS "navigationType", bu_code AS "buCode",
               is_active AS "isActive", total_tasks_completed AS "totalTasksCompleted",
               total_distance_m AS "totalDistanceM", last_heartbeat_at AS "lastHeartbeatAt",
               created_at AS "createdAt"
        FROM agv_fleet
        ${whereClause}
        ORDER BY id DESC
        LIMIT ${input?.limit ?? 50}
      `);
      return (result as any).rows ?? result;
    }),

  /** 注册AGV */
  registerAgv: requirePermission('mfg:agv:manage')
    .input(z.object({
      agvCode: z.string(),
      agvModel: z.string().optional(),
      manufacturer: z.string().optional(),
      serialNumber: z.string().optional(),
      maxPayloadKg: z.number().optional(),
      maxSpeedMps: z.number().optional(),
      navigationType: z.string().default('laser'),
      firmwareVersion: z.string().optional(),
      buCode: z.string().optional(),
      currentZoneId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO agv_fleet
          (agv_code, agv_model, manufacturer, serial_number,
           max_payload_kg, max_speed_mps, navigation_type,
           firmware_version, bu_code, current_zone_id,
           status, is_active, created_at, updated_at)
        VALUES
          (${input.agvCode}, ${input.agvModel ?? null}, ${input.manufacturer ?? null},
           ${input.serialNumber ?? null}, ${input.maxPayloadKg ?? null},
           ${input.maxSpeedMps ?? null}, ${input.navigationType},
           ${input.firmwareVersion ?? null}, ${input.buCode ?? null},
           ${input.currentZoneId ?? null},
           'idle', true, NOW(), NOW())
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  /** 更新AGV状态 */
  updateAgvStatus: requirePermission('mfg:agv:operate')
    .input(z.object({
      id: flexibleId,
      status: z.string(),
      currentLocationX: z.number().optional(),
      currentLocationY: z.number().optional(),
      batteryPct: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const sets: ReturnType<typeof sql>[] = [
        sql`status = ${input.status}`,
        sql`updated_at = NOW()`,
        sql`last_heartbeat_at = NOW()`,
      ];
      if (input.currentLocationX !== undefined) sets.push(sql`current_location_x = ${input.currentLocationX}`);
      if (input.currentLocationY !== undefined) sets.push(sql`current_location_y = ${input.currentLocationY}`);
      if (input.batteryPct !== undefined) sets.push(sql`battery_pct = ${input.batteryPct}`);
      const result = await db.execute(sql`
        UPDATE agv_fleet
        SET ${sql.join(sets, sql`, `)}
        WHERE id = ${String(input.id)}
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  /** AGV详情 */
  getAgvDetail: protectedProcedure
    .input(z.object({ id: flexibleId }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT id, agv_code AS "agvCode", agv_model AS "agvModel", manufacturer,
               serial_number AS "serialNumber", status,
               current_location_x AS "currentLocationX", current_location_y AS "currentLocationY",
               current_zone_id AS "currentZoneId", current_task_id AS "currentTaskId",
               battery_pct AS "batteryPct", max_payload_kg AS "maxPayloadKg",
               max_speed_mps AS "maxSpeedMps", navigation_type AS "navigationType",
               firmware_version AS "firmwareVersion", bu_code AS "buCode",
               is_active AS "isActive", total_tasks_completed AS "totalTasksCompleted",
               total_distance_m AS "totalDistanceM", total_runtime_hours AS "totalRuntimeHours",
               last_heartbeat_at AS "lastHeartbeatAt",
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM agv_fleet
        WHERE id = ${String(input.id)}
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  /** 电量预警 */
  getBatteryAlerts: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT id, agv_code AS "agvCode", agv_model AS "agvModel",
             status, battery_pct AS "batteryPct",
             current_zone_id AS "currentZoneId",
             last_heartbeat_at AS "lastHeartbeatAt"
      FROM agv_fleet
      WHERE battery_pct < 20 AND is_active = true
      ORDER BY battery_pct ASC
      LIMIT 50
    `);
    return (result as any).rows ?? result;
  }),

  // ═══════════════════════════════════════════════════════════════
  //  Section 2: Routes (4)
  // ═══════════════════════════════════════════════════════════════

  /** 路线列表 */
  listRoutes: protectedProcedure
    .input(z.object({
      fromZoneId: z.string().optional(),
      toZoneId: z.string().optional(),
      isActive: z.boolean().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const parts: ReturnType<typeof sql>[] = [];
      if (input?.fromZoneId) parts.push(sql`from_zone_id = ${input.fromZoneId}`);
      if (input?.toZoneId) parts.push(sql`to_zone_id = ${input.toZoneId}`);
      if (input?.isActive !== undefined) parts.push(sql`is_active = ${input.isActive}`);
      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT id, route_code AS "routeCode", route_name AS "routeName",
               from_zone_id AS "fromZoneId", from_zone_name AS "fromZoneName",
               to_zone_id AS "toZoneId", to_zone_name AS "toZoneName",
               waypoints, distance_m AS "distanceM",
               estimated_time_seconds AS "estimatedTimeSeconds",
               max_concurrent_agvs AS "maxConcurrentAgvs",
               is_bidirectional AS "isBidirectional", is_active AS "isActive",
               priority, created_at AS "createdAt"
        FROM agv_routes
        ${whereClause}
        ORDER BY priority DESC, distance_m ASC
        LIMIT ${input?.limit ?? 50}
      `);
      return (result as any).rows ?? result;
    }),

  /** 创建路线 */
  createRoute: requirePermission('mfg:agv:manage')
    .input(z.object({
      routeCode: z.string(),
      routeName: z.string().optional(),
      fromZoneId: z.string(),
      fromZoneName: z.string().optional(),
      toZoneId: z.string(),
      toZoneName: z.string().optional(),
      waypoints: z.any().optional(),
      distanceM: z.number().optional(),
      estimatedTimeSeconds: z.number().optional(),
      maxConcurrentAgvs: z.number().default(3),
      speedLimitMps: z.number().optional(),
      isBidirectional: z.boolean().default(true),
      priority: z.number().default(5),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO agv_routes
          (route_code, route_name, from_zone_id, from_zone_name,
           to_zone_id, to_zone_name, waypoints, distance_m,
           estimated_time_seconds, max_concurrent_agvs, speed_limit_mps,
           is_bidirectional, is_active, priority, created_at, updated_at)
        VALUES
          (${input.routeCode}, ${input.routeName ?? null},
           ${input.fromZoneId}, ${input.fromZoneName ?? null},
           ${input.toZoneId}, ${input.toZoneName ?? null},
           ${input.waypoints ? sql`${JSON.stringify(input.waypoints)}::jsonb` : sql`NULL`},
           ${input.distanceM ?? null}, ${input.estimatedTimeSeconds ?? null},
           ${input.maxConcurrentAgvs}, ${input.speedLimitMps ?? null},
           ${input.isBidirectional}, true, ${input.priority}, NOW(), NOW())
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  /** 路径优化 (最短3条) */
  optimizeRoute: protectedProcedure
    .input(z.object({
      fromZoneId: z.string(),
      toZoneId: z.string(),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT id, route_code AS "routeCode", route_name AS "routeName",
               distance_m AS "distanceM", estimated_time_seconds AS "estimatedTimeSeconds",
               waypoints, max_concurrent_agvs AS "maxConcurrentAgvs"
        FROM agv_routes
        WHERE from_zone_id = ${input.fromZoneId}
          AND to_zone_id = ${input.toZoneId}
          AND is_active = true
        ORDER BY distance_m ASC
        LIMIT 3
      `);
      return (result as any).rows ?? result;
    }),

  /** 交通地图 (路线 + AGV位置) */
  getTrafficMap: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const routes = await db.execute(sql`
      SELECT id, route_code AS "routeCode", route_name AS "routeName",
             from_zone_id AS "fromZoneId", to_zone_id AS "toZoneId",
             waypoints, distance_m AS "distanceM", is_bidirectional AS "isBidirectional"
      FROM agv_routes
      WHERE is_active = true
      ORDER BY id
      LIMIT 200
    `);
    const agvs = await db.execute(sql`
      SELECT id, agv_code AS "agvCode", status,
             current_location_x AS "currentLocationX", current_location_y AS "currentLocationY",
             current_zone_id AS "currentZoneId", current_task_id AS "currentTaskId",
             battery_pct AS "batteryPct"
      FROM agv_fleet
      WHERE is_active = true
      ORDER BY id
      LIMIT 200
    `);
    return {
      routes: (routes as any).rows ?? routes,
      agvPositions: (agvs as any).rows ?? agvs,
    };
  }),

  // ═══════════════════════════════════════════════════════════════
  //  Section 3: Tasks (7)
  // ═══════════════════════════════════════════════════════════════

  /** 创建运输任务 */
  createTask: requirePermission('mfg:agv:operate')
    .input(z.object({
      taskType: z.string().default('transport'),
      fromLocation: z.string(),
      toLocation: z.string(),
      materialId: z.number().optional(),
      materialCode: z.string().optional(),
      materialName: z.string().optional(),
      quantity: z.number().optional(),
      workOrderId: z.string().optional(),
      priority: z.number().default(5),
      createdBy: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Generate task code: TASK-YYYYMMDD-NNN
      const seqResult = await db.execute(sql`
        SELECT COUNT(*) + 1 AS seq
        FROM agv_transport_tasks
        WHERE created_at::date = CURRENT_DATE
      `);
      const seqRows = (seqResult as any).rows ?? seqResult;
      const seq = String(parseInt(seqRows[0]?.seq ?? '1', 10)).padStart(3, '0');
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const taskCode = `TASK-${today}-${seq}`;

      const result = await db.execute(sql`
        INSERT INTO agv_transport_tasks
          (task_code, task_type, from_location, to_location,
           material_id, material_code, material_name, quantity,
           work_order_id, priority, status, created_by, created_at, updated_at)
        VALUES
          (${taskCode}, ${input.taskType}, ${input.fromLocation}, ${input.toLocation},
           ${input.materialId ?? null}, ${input.materialCode ?? null},
           ${input.materialName ?? null}, ${input.quantity ?? 1},
           ${input.workOrderId ?? null}, ${input.priority},
           'pending', ${input.createdBy ?? null}, NOW(), NOW())
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  /** 派发任务 */
  dispatchTask: requirePermission('mfg:agv:operate')
    .input(z.object({
      taskId: flexibleId,
      agvId: flexibleId,
      routeId: flexibleId,
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Update task
      const taskResult = await db.execute(sql`
        UPDATE agv_transport_tasks
        SET agv_id = ${String(input.agvId)}::int, route_id = ${String(input.routeId)}::int,
            status = 'dispatched', dispatched_at = NOW(), updated_at = NOW()
        WHERE id = ${String(input.taskId)}
        RETURNING *
      `);
      // Update AGV
      await db.execute(sql`
        UPDATE agv_fleet
        SET status = 'transporting', current_task_id = ${String(input.taskId)}::int, updated_at = NOW()
        WHERE id = ${String(input.agvId)}
      `);
      const rows = (taskResult as any).rows ?? taskResult;
      return rows[0] ?? null;
    }),

  /** 自动派发 (找最近空闲AGV + 最优路线) */
  autoDispatch: requirePermission('mfg:agv:operate')
    .input(z.object({ taskId: flexibleId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Get task info
      const taskResult = await db.execute(sql`
        SELECT id, from_location AS "fromLocation", to_location AS "toLocation"
        FROM agv_transport_tasks WHERE id = ${String(input.taskId)}
      `);
      const taskRows = (taskResult as any).rows ?? taskResult;
      const task = taskRows[0];
      if (!task) return { success: false, message: 'Task not found' };

      // Find nearest idle AGV
      const agvResult = await db.execute(sql`
        SELECT id, agv_code AS "agvCode", current_zone_id AS "currentZoneId",
               battery_pct AS "batteryPct"
        FROM agv_fleet
        WHERE status = 'idle' AND is_active = true AND battery_pct >= 20
        ORDER BY battery_pct DESC
        LIMIT 1
      `);
      const agvRows = (agvResult as any).rows ?? agvResult;
      if (!agvRows[0]) return { success: false, message: 'No idle AGV available' };
      const agv = agvRows[0];

      // Find optimal route
      const routeResult = await db.execute(sql`
        SELECT id FROM agv_routes
        WHERE is_active = true
        ORDER BY distance_m ASC
        LIMIT 1
      `);
      const routeRows = (routeResult as any).rows ?? routeResult;
      const routeId = routeRows[0]?.id ?? null;

      // Dispatch
      await db.execute(sql`
        UPDATE agv_transport_tasks
        SET agv_id = ${agv.id}, route_id = ${routeId},
            status = 'dispatched', dispatched_at = NOW(), updated_at = NOW()
        WHERE id = ${String(input.taskId)}
      `);
      await db.execute(sql`
        UPDATE agv_fleet
        SET status = 'transporting', current_task_id = ${String(input.taskId)}::int, updated_at = NOW()
        WHERE id = ${agv.id}
      `);
      return { success: true, agvId: agv.id, agvCode: agv.agvCode, routeId };
    }),

  /** 开始运输 */
  startTransport: requirePermission('mfg:agv:operate')
    .input(z.object({ taskId: flexibleId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        UPDATE agv_transport_tasks
        SET status = 'in_transit', started_at = NOW(), updated_at = NOW()
        WHERE id = ${String(input.taskId)}
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  /** 完成运输 */
  completeTransport: requirePermission('mfg:agv:operate')
    .input(z.object({
      taskId: flexibleId,
      actualDistanceM: z.number().optional(),
      actualTimeSeconds: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Get task to find AGV
      const taskQ = await db.execute(sql`
        SELECT agv_id AS "agvId" FROM agv_transport_tasks WHERE id = ${String(input.taskId)}
      `);
      const taskRows = (taskQ as any).rows ?? taskQ;
      const agvId = taskRows[0]?.agvId;

      // Complete task
      const result = await db.execute(sql`
        UPDATE agv_transport_tasks
        SET status = 'completed', completed_at = NOW(),
            actual_distance_m = ${input.actualDistanceM ?? null},
            actual_time_seconds = ${input.actualTimeSeconds ?? null},
            updated_at = NOW()
        WHERE id = ${String(input.taskId)}
        RETURNING *
      `);
      // Release AGV + increment counter
      if (agvId) {
        await db.execute(sql`
          UPDATE agv_fleet
          SET status = 'idle', current_task_id = NULL,
              total_tasks_completed = total_tasks_completed + 1,
              total_distance_m = total_distance_m + ${input.actualDistanceM ?? 0},
              updated_at = NOW()
          WHERE id = ${agvId}
        `);
      }
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  /** 任务失败 */
  failTask: requirePermission('mfg:agv:operate')
    .input(z.object({
      taskId: flexibleId,
      failureReason: z.string(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Get AGV
      const taskQ = await db.execute(sql`
        SELECT agv_id AS "agvId" FROM agv_transport_tasks WHERE id = ${String(input.taskId)}
      `);
      const taskRows = (taskQ as any).rows ?? taskQ;
      const agvId = taskRows[0]?.agvId;

      const result = await db.execute(sql`
        UPDATE agv_transport_tasks
        SET status = 'failed', failure_reason = ${input.failureReason}, updated_at = NOW()
        WHERE id = ${String(input.taskId)}
        RETURNING *
      `);
      // Release AGV
      if (agvId) {
        await db.execute(sql`
          UPDATE agv_fleet
          SET status = 'idle', current_task_id = NULL, updated_at = NOW()
          WHERE id = ${agvId}
        `);
      }
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  /** 任务列表 */
  listTasks: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      agvId: flexibleId.optional(),
      workOrderId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const parts: ReturnType<typeof sql>[] = [];
      if (input?.status) parts.push(sql`status = ${input.status}`);
      if (input?.agvId !== undefined) parts.push(sql`agv_id = ${String(input.agvId)}::int`);
      if (input?.workOrderId) parts.push(sql`work_order_id = ${input.workOrderId}`);
      if (input?.dateFrom) parts.push(sql`created_at >= ${input.dateFrom}::timestamp`);
      if (input?.dateTo) parts.push(sql`created_at <= ${input.dateTo}::timestamp`);
      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT id, task_code AS "taskCode", task_type AS "taskType",
               from_location AS "fromLocation", to_location AS "toLocation",
               material_id AS "materialId", material_code AS "materialCode",
               material_name AS "materialName", quantity,
               work_order_id AS "workOrderId", agv_id AS "agvId",
               route_id AS "routeId", priority, status,
               dispatched_at AS "dispatchedAt", started_at AS "startedAt",
               completed_at AS "completedAt",
               actual_distance_m AS "actualDistanceM",
               actual_time_seconds AS "actualTimeSeconds",
               failure_reason AS "failureReason",
               created_at AS "createdAt"
        FROM agv_transport_tasks
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${input?.limit ?? 50}
      `);
      return (result as any).rows ?? result;
    }),

  // ═══════════════════════════════════════════════════════════════
  //  Section 4: Traffic (3)
  // ═══════════════════════════════════════════════════════════════

  /** 区域交通流量 */
  getZoneTraffic: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT current_zone_id AS "zoneId",
             COUNT(*) AS "agvCount"
      FROM agv_fleet
      WHERE status = 'transporting' AND current_zone_id IS NOT NULL
      GROUP BY current_zone_id
      ORDER BY "agvCount" DESC
      LIMIT 50
    `);
    return (result as any).rows ?? result;
  }),

  /** 碰撞风险检测 */
  getCollisionRisk: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT r.id AS "routeId", r.route_code AS "routeCode", r.route_name AS "routeName",
             r.max_concurrent_agvs AS "maxConcurrentAgvs",
             COUNT(t.id) AS "activeAgvs",
             CASE WHEN COUNT(t.id) >= r.max_concurrent_agvs THEN true ELSE false END AS "isAtRisk"
      FROM agv_routes r
      LEFT JOIN agv_transport_tasks t
        ON t.route_id = r.id AND t.status IN ('dispatched', 'in_transit')
      WHERE r.is_active = true
      GROUP BY r.id, r.route_code, r.route_name, r.max_concurrent_agvs
      HAVING COUNT(t.id) >= r.max_concurrent_agvs
      ORDER BY "activeAgvs" DESC
      LIMIT 50
    `);
    return (result as any).rows ?? result;
  }),

  /** 设置交通规则 (UPSERT) */
  setTrafficRule: requirePermission('mfg:agv:manage')
    .input(z.object({
      zoneId: z.string(),
      zoneName: z.string().optional(),
      maxConcurrentAgvs: z.number().default(3),
      speedLimitMps: z.number().optional(),
      oneWayDirection: z.string().optional(),
      priorityRoutes: z.any().optional(),
      timeWindowStart: z.string().optional(),
      timeWindowEnd: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO agv_traffic_rules
          (zone_id, zone_name, max_concurrent_agvs, speed_limit_mps,
           one_way_direction, priority_routes, time_window_start, time_window_end,
           is_active, created_at, updated_at)
        VALUES
          (${input.zoneId}, ${input.zoneName ?? null}, ${input.maxConcurrentAgvs},
           ${input.speedLimitMps ?? null}, ${input.oneWayDirection ?? null},
           ${input.priorityRoutes ? sql`${JSON.stringify(input.priorityRoutes)}::jsonb` : sql`NULL`},
           ${input.timeWindowStart ?? null}, ${input.timeWindowEnd ?? null},
           true, NOW(), NOW())
        ON CONFLICT (zone_id) DO UPDATE SET
          zone_name = EXCLUDED.zone_name,
          max_concurrent_agvs = EXCLUDED.max_concurrent_agvs,
          speed_limit_mps = EXCLUDED.speed_limit_mps,
          one_way_direction = EXCLUDED.one_way_direction,
          priority_routes = EXCLUDED.priority_routes,
          time_window_start = EXCLUDED.time_window_start,
          time_window_end = EXCLUDED.time_window_end,
          updated_at = NOW()
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  // ═══════════════════════════════════════════════════════════════
  //  Section 5: Charging (3)
  // ═══════════════════════════════════════════════════════════════

  /** 充电站列表 */
  listChargingStations: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const statusFilter = input?.status ? sql`WHERE status = ${input.status}` : sql``;
      const result = await db.execute(sql`
        SELECT id, station_code AS "stationCode", station_name AS "stationName",
               location_x AS "locationX", location_y AS "locationY",
               zone_id AS "zoneId", charger_type AS "chargerType",
               max_charge_rate_w AS "maxChargeRateW", status,
               current_agv_id AS "currentAgvId", is_active AS "isActive",
               total_charges AS "totalCharges", created_at AS "createdAt"
        FROM agv_charging_stations
        ${statusFilter}
        ORDER BY id
        LIMIT ${input?.limit ?? 20}
      `);
      return (result as any).rows ?? result;
    }),

  /** 分配充电 */
  assignToCharge: requirePermission('mfg:agv:operate')
    .input(z.object({
      agvId: flexibleId,
      chargingStationId: flexibleId,
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Update station
      await db.execute(sql`
        UPDATE agv_charging_stations
        SET status = 'occupied', current_agv_id = ${String(input.agvId)}::int, updated_at = NOW()
        WHERE id = ${String(input.chargingStationId)}
      `);
      // Update AGV
      await db.execute(sql`
        UPDATE agv_fleet
        SET status = 'charging', updated_at = NOW()
        WHERE id = ${String(input.agvId)}
      `);
      return { success: true, agvId: input.agvId, chargingStationId: input.chargingStationId };
    }),

  /** 完成充电 */
  completeCharging: requirePermission('mfg:agv:operate')
    .input(z.object({ chargingStationId: flexibleId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Get current AGV
      const stationQ = await db.execute(sql`
        SELECT current_agv_id AS "currentAgvId"
        FROM agv_charging_stations
        WHERE id = ${String(input.chargingStationId)}
      `);
      const stationRows = (stationQ as any).rows ?? stationQ;
      const agvId = stationRows[0]?.currentAgvId;

      // Release station
      await db.execute(sql`
        UPDATE agv_charging_stations
        SET status = 'available', current_agv_id = NULL,
            total_charges = total_charges + 1, updated_at = NOW()
        WHERE id = ${String(input.chargingStationId)}
      `);
      // Update AGV
      if (agvId) {
        await db.execute(sql`
          UPDATE agv_fleet
          SET status = 'idle', battery_pct = 100, updated_at = NOW()
          WHERE id = ${agvId}
        `);
      }
      return { success: true, chargingStationId: input.chargingStationId, agvId };
    }),

  // ═══════════════════════════════════════════════════════════════
  //  Section 6: Dashboard (3)
  // ═══════════════════════════════════════════════════════════════

  /** 物流总览 */
  getLogisticsOverview: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    // AGVs by status
    const agvStatus = await db.execute(sql`
      SELECT status, COUNT(*) AS "count"
      FROM agv_fleet WHERE is_active = true
      GROUP BY status
      ORDER BY "count" DESC
    `);
    // Tasks by status today
    const taskStatus = await db.execute(sql`
      SELECT status, COUNT(*) AS "count"
      FROM agv_transport_tasks
      WHERE created_at::date = CURRENT_DATE
      GROUP BY status
      ORDER BY "count" DESC
    `);
    // Avg delivery time today
    const avgTime = await db.execute(sql`
      SELECT AVG(actual_time_seconds) AS "avgTimeSeconds",
             AVG(actual_distance_m) AS "avgDistanceM",
             COUNT(*) AS "completedToday"
      FROM agv_transport_tasks
      WHERE status = 'completed' AND completed_at::date = CURRENT_DATE
    `);
    const avgRows = (avgTime as any).rows ?? avgTime;
    return {
      agvsByStatus: (agvStatus as any).rows ?? agvStatus,
      tasksByStatus: (taskStatus as any).rows ?? taskStatus,
      avgDeliveryTimeSeconds: parseFloat(avgRows[0]?.avgTimeSeconds ?? '0'),
      avgDistanceM: parseFloat(avgRows[0]?.avgDistanceM ?? '0'),
      completedToday: parseInt(avgRows[0]?.completedToday ?? '0', 10),
    };
  }),

  /** 车队利用率 */
  getFleetUtilization: protectedProcedure
    .input(z.object({
      dateFrom: z.string(),
      dateTo: z.string(),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT
          f.id AS "agvId", f.agv_code AS "agvCode",
          COUNT(t.id) AS "taskCount",
          SUM(t.actual_time_seconds) AS "totalTimeSeconds",
          SUM(t.actual_distance_m) AS "totalDistanceM",
          COUNT(DISTINCT t.completed_at::date) AS "activeDays"
        FROM agv_fleet f
        LEFT JOIN agv_transport_tasks t
          ON t.agv_id = f.id
          AND t.status = 'completed'
          AND t.completed_at >= ${input.dateFrom}::timestamp
          AND t.completed_at <= ${input.dateTo}::timestamp
        WHERE f.is_active = true
        GROUP BY f.id, f.agv_code
        ORDER BY "taskCount" DESC
        LIMIT 50
      `);
      return (result as any).rows ?? result;
    }),

  /** 物料流向桑基图 */
  getMaterialFlowSankey: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const parts: ReturnType<typeof sql>[] = [sql`status = 'completed'`];
      if (input?.dateFrom) parts.push(sql`completed_at >= ${input.dateFrom}::timestamp`);
      if (input?.dateTo) parts.push(sql`completed_at <= ${input.dateTo}::timestamp`);
      const whereClause = sql`WHERE ${sql.join(parts, sql` AND `)}`;
      const result = await db.execute(sql`
        SELECT from_location AS "fromLocation",
               to_location AS "toLocation",
               COUNT(*) AS "taskCount",
               SUM(quantity) AS "totalQuantity",
               SUM(actual_distance_m) AS "totalDistanceM"
        FROM agv_transport_tasks
        ${whereClause}
        GROUP BY from_location, to_location
        ORDER BY "totalQuantity" DESC
        LIMIT 100
      `);
      return (result as any).rows ?? result;
    }),
});
