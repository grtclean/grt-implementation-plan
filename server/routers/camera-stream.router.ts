/**
 * Camera Stream Router — 工厂摄像头管理与流媒体
 *
 * Manages IP cameras, RTSP/HLS streaming, PTZ control, snapshots,
 * camera groups (multi-screen layout), events, and maintenance logs.
 *
 * 25 procedures:
 *   CRUD: listCameras, getCamera, createCamera, updateCamera, deleteCamera, discoverCameras
 *   Streaming: getSnapshot, startStream, stopStream, getStreamStatus
 *   PTZ: ptzMove, ptzPreset, ptzStop
 *   Groups: listCameraGroups, getCameraGroup, createCameraGroup, updateCameraGroup,
 *           deleteCameraGroup, addGroupMember, removeGroupMember, reorderGroupMembers
 *   Snapshots: captureSnapshot, listSnapshots, deleteSnapshot
 *   Events: listCameraEvents, acknowledgeEvent, logMaintenance, listMaintenanceLog
 *   Dashboard: cameraHealthDashboard
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, eq, desc, and, like, inArray } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("camera-stream");

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id) : id;

// ─── Auto-DDL ──────────────────────────────────────────────────
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  const db = await requireDb();
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "cameras" (
        "id" serial PRIMARY KEY NOT NULL,
        "camera_code" varchar(50) NOT NULL,
        "name" varchar(200) NOT NULL,
        "brand" varchar(100),
        "model" varchar(100),
        "ip_address" varchar(50),
        "rtsp_url" text,
        "location" varchar(200),
        "purpose" varchar(50) DEFAULT 'general',
        "station_id" integer,
        "resolution" varchar(30),
        "fps" integer DEFAULT 25,
        "ptz_enabled" boolean DEFAULT false,
        "has_audio" boolean DEFAULT false,
        "status" varchar(20) DEFAULT 'online',
        "is_active" boolean DEFAULT true,
        "last_online_at" timestamp,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cameras_location_idx" ON "cameras" ("location")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cameras_status_idx" ON "cameras" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cameras_station_id_idx" ON "cameras" ("station_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cameras_brand_idx" ON "cameras" ("brand")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cameras_purpose_idx" ON "cameras" ("purpose")`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "camera_groups" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" varchar(200) NOT NULL,
        "description" text,
        "layout" varchar(30) DEFAULT '2x2',
        "display_screen_id" integer,
        "is_active" boolean DEFAULT true,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "camera_group_members" (
        "id" serial PRIMARY KEY NOT NULL,
        "group_id" integer NOT NULL,
        "camera_id" integer NOT NULL,
        "grid_position" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cgm_group_id_idx" ON "camera_group_members" ("group_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cgm_camera_id_idx" ON "camera_group_members" ("camera_id")`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "camera_snapshots" (
        "id" serial PRIMARY KEY NOT NULL,
        "camera_id" integer NOT NULL,
        "trigger_type" varchar(30) DEFAULT 'manual',
        "file_url" text,
        "file_size_kb" integer,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cs_camera_id_idx" ON "camera_snapshots" ("camera_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cs_trigger_type_idx" ON "camera_snapshots" ("trigger_type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cs_created_at_idx" ON "camera_snapshots" ("created_at")`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "camera_events" (
        "id" serial PRIMARY KEY NOT NULL,
        "camera_id" integer NOT NULL,
        "event_type" varchar(50) NOT NULL,
        "severity" varchar(20) DEFAULT 'info',
        "message" text,
        "snapshot_id" integer,
        "acknowledged" boolean DEFAULT false,
        "acknowledged_by" varchar(100),
        "acknowledged_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ce_camera_id_idx" ON "camera_events" ("camera_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ce_event_type_idx" ON "camera_events" ("event_type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ce_severity_idx" ON "camera_events" ("severity")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ce_created_at_idx" ON "camera_events" ("created_at")`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "camera_maintenance_log" (
        "id" serial PRIMARY KEY NOT NULL,
        "camera_id" integer NOT NULL,
        "action" varchar(100) NOT NULL,
        "notes" text,
        "performed_by" varchar(100),
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "cml_camera_id_idx" ON "camera_maintenance_log" ("camera_id")`);

    tablesEnsured = true;
    log.info("Camera stream tables ensured");
  } catch (err) {
    log.error({ err }, "Failed to ensure camera stream tables");
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Router
// ═══════════════════════════════════════════════════════════════════
export const cameraStreamRouter = router({
  // ─── CRUD ────────────────────────────────────────────────────

  /** List cameras with optional filters */
  listCameras: protectedProcedure
    .input(
      z.object({
        location: z.string().optional(),
        brand: z.string().optional(),
        purpose: z.string().optional(),
        stationId: z.number().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const parts: ReturnType<typeof sql>[] = [sql`"is_active" = true`];
      if (input?.location) parts.push(sql`"location" = ${input.location}`);
      if (input?.brand) parts.push(sql`"brand" = ${input.brand}`);
      if (input?.purpose) parts.push(sql`"purpose" = ${input.purpose}`);
      if (input?.stationId) parts.push(sql`"station_id" = ${input.stationId}`);
      if (input?.status) parts.push(sql`"status" = ${input.status}`);
      if (input?.search) parts.push(sql`"name" ILIKE ${'%' + input.search + '%'}`);

      const where = sql.join(parts, sql` AND `);
      const result = await db.execute(sql`
        SELECT * FROM "cameras" WHERE ${where} ORDER BY "name" LIMIT 200
      `);
      return result.rows;
    }),

  /** Get single camera */
  getCamera: protectedProcedure.input(idInput).query(async ({ input }) => {
    await ensureTables();
    const db = await requireDb();
    const result = await db.execute(
      sql`SELECT * FROM "cameras" WHERE "id" = ${toNum(input.id)} LIMIT 1`,
    );
    return result.rows[0] ?? null;
  }),

  /** Create camera */
  createCamera: requirePermission("mfg:camera:manage")
    .input(
      z.object({
        cameraCode: z.string().min(1).max(50),
        name: z.string().min(1).max(200),
        brand: z.string().optional(),
        model: z.string().optional(),
        ipAddress: z.string().optional(),
        rtspUrl: z.string().optional(),
        location: z.string().optional(),
        purpose: z.string().default("general"),
        stationId: z.number().optional(),
        resolution: z.string().optional(),
        fps: z.number().default(25),
        ptzEnabled: z.boolean().default(false),
        hasAudio: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO "cameras" (
          "camera_code", "name", "brand", "model", "ip_address", "rtsp_url",
          "location", "purpose", "station_id", "resolution", "fps",
          "ptz_enabled", "has_audio", "created_by"
        ) VALUES (
          ${input.cameraCode}, ${input.name}, ${input.brand ?? null},
          ${input.model ?? null}, ${input.ipAddress ?? null}, ${input.rtspUrl ?? null},
          ${input.location ?? null}, ${input.purpose}, ${input.stationId ?? null},
          ${input.resolution ?? null}, ${input.fps}, ${input.ptzEnabled},
          ${input.hasAudio}, ${ctx.user?.id ?? null}
        ) RETURNING *
      `);
      log.info({ cameraCode: input.cameraCode }, "Camera created");
      return result.rows[0] ?? null;
    }),

  /** Update camera */
  updateCamera: requirePermission("mfg:camera:manage")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        name: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        ipAddress: z.string().optional(),
        rtspUrl: z.string().optional(),
        location: z.string().optional(),
        purpose: z.string().optional(),
        stationId: z.number().nullable().optional(),
        resolution: z.string().optional(),
        fps: z.number().optional(),
        ptzEnabled: z.boolean().optional(),
        hasAudio: z.boolean().optional(),
        status: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const sets: ReturnType<typeof sql>[] = [sql`"updated_at" = now()`];
      if (input.name !== undefined) sets.push(sql`"name" = ${input.name}`);
      if (input.brand !== undefined) sets.push(sql`"brand" = ${input.brand}`);
      if (input.model !== undefined) sets.push(sql`"model" = ${input.model}`);
      if (input.ipAddress !== undefined) sets.push(sql`"ip_address" = ${input.ipAddress}`);
      if (input.rtspUrl !== undefined) sets.push(sql`"rtsp_url" = ${input.rtspUrl}`);
      if (input.location !== undefined) sets.push(sql`"location" = ${input.location}`);
      if (input.purpose !== undefined) sets.push(sql`"purpose" = ${input.purpose}`);
      if (input.stationId !== undefined) sets.push(sql`"station_id" = ${input.stationId}`);
      if (input.resolution !== undefined) sets.push(sql`"resolution" = ${input.resolution}`);
      if (input.fps !== undefined) sets.push(sql`"fps" = ${input.fps}`);
      if (input.ptzEnabled !== undefined) sets.push(sql`"ptz_enabled" = ${input.ptzEnabled}`);
      if (input.hasAudio !== undefined) sets.push(sql`"has_audio" = ${input.hasAudio}`);
      if (input.status !== undefined) sets.push(sql`"status" = ${input.status}`);

      const setClauses = sql.join(sets, sql`, `);
      const result = await db.execute(sql`
        UPDATE "cameras" SET ${setClauses} WHERE "id" = ${toNum(input.id)} RETURNING *
      `);
      log.info({ id: toNum(input.id) }, "Camera updated");
      return result.rows[0] ?? null;
    }),

  /** Soft-delete camera */
  deleteCamera: requirePermission("mfg:camera:manage")
    .input(idInput)
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        UPDATE "cameras" SET "is_active" = false, "updated_at" = now()
        WHERE "id" = ${toNum(input.id)}
      `);
      log.info({ id: toNum(input.id) }, "Camera soft-deleted");
      return { success: true };
    }),

  /** Discover cameras (ONVIF placeholder) */
  discoverCameras: protectedProcedure.query(async () => {
    // Placeholder — in production, this would use ONVIF device discovery
    return [
      { ip: "192.168.1.101", brand: "Hikvision", model: "DS-2CD2T47G2-L", name: "发现摄像头-1" },
      { ip: "192.168.1.102", brand: "Dahua", model: "IPC-HFW5442T-ZE", name: "发现摄像头-2" },
      { ip: "192.168.1.103", brand: "Hikvision", model: "DS-2CD2087G2-LU", name: "发现摄像头-3" },
    ];
  }),

  // ─── Streaming ───────────────────────────────────────────────

  /** Get camera snapshot URL */
  getSnapshot: protectedProcedure
    .input(z.object({ cameraId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(
        sql`SELECT "id", "camera_code", "name" FROM "cameras" WHERE "id" = ${toNum(input.cameraId)} LIMIT 1`,
      );
      const cam = result.rows[0] as any;
      if (!cam) return null;
      return {
        snapshotUrl: `/api/camera/${cam.id}/snapshot`,
        cameraCode: cam.camera_code,
        name: cam.name,
      };
    }),

  /** Start HLS stream */
  startStream: protectedProcedure
    .input(z.object({ cameraId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = toNum(input.cameraId);
      // In production, this would spawn an ffmpeg RTSP→HLS transcode process
      await db.execute(sql`
        UPDATE "cameras" SET "status" = 'streaming', "updated_at" = now()
        WHERE "id" = ${id}
      `);
      log.info({ cameraId: id }, "Stream started");
      return { hlsUrl: `/api/camera/${id}/stream/index.m3u8`, status: "started" as const };
    }),

  /** Stop stream */
  stopStream: protectedProcedure
    .input(z.object({ cameraId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = toNum(input.cameraId);
      await db.execute(sql`
        UPDATE "cameras" SET "status" = 'online', "updated_at" = now()
        WHERE "id" = ${id}
      `);
      log.info({ cameraId: id }, "Stream stopped");
      return { success: true };
    }),

  /** Get stream status */
  getStreamStatus: protectedProcedure
    .input(z.object({ cameraId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = toNum(input.cameraId);
      const result = await db.execute(
        sql`SELECT "status" FROM "cameras" WHERE "id" = ${id} LIMIT 1`,
      );
      const cam = result.rows[0] as any;
      if (!cam) return { active: false };
      const active = cam.status === "streaming";
      return {
        active,
        hlsUrl: active ? `/api/camera/${id}/stream/index.m3u8` : undefined,
      };
    }),

  // ─── PTZ Control ─────────────────────────────────────────────

  /** PTZ directional move */
  ptzMove: requirePermission("mfg:camera:ptz")
    .input(
      z.object({
        cameraId: z.union([z.string(), z.number()]),
        direction: z.enum(["up", "down", "left", "right", "zoomIn", "zoomOut"]),
        speed: z.number().min(1).max(10).default(5),
      }),
    )
    .mutation(async ({ input }) => {
      const id = toNum(input.cameraId);
      // In production, send ONVIF/CGI PTZ command to camera
      log.info({ cameraId: id, direction: input.direction, speed: input.speed }, "PTZ move");
      return { success: true, cameraId: id, direction: input.direction, speed: input.speed };
    }),

  /** PTZ preset (goto or save) */
  ptzPreset: requirePermission("mfg:camera:ptz")
    .input(
      z.object({
        cameraId: z.union([z.string(), z.number()]),
        presetId: z.number().min(1),
        action: z.enum(["goto", "save"]),
      }),
    )
    .mutation(async ({ input }) => {
      const id = toNum(input.cameraId);
      log.info({ cameraId: id, presetId: input.presetId, action: input.action }, "PTZ preset");
      return { success: true, cameraId: id, presetId: input.presetId, action: input.action };
    }),

  /** PTZ stop */
  ptzStop: requirePermission("mfg:camera:ptz")
    .input(z.object({ cameraId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      const id = toNum(input.cameraId);
      log.info({ cameraId: id }, "PTZ stop");
      return { success: true, cameraId: id };
    }),

  // ─── Camera Groups ──────────────────────────────────────────

  /** List camera groups with member count */
  listCameraGroups: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT g.*,
        (SELECT COUNT(*) FROM "camera_group_members" m WHERE m."group_id" = g."id") AS "member_count"
      FROM "camera_groups" g
      WHERE g."is_active" = true
      ORDER BY g."name"
      LIMIT 200
    `);
    return result.rows;
  }),

  /** Get camera group with member cameras */
  getCameraGroup: protectedProcedure.input(idInput).query(async ({ input }) => {
    await ensureTables();
    const db = await requireDb();
    const groupResult = await db.execute(
      sql`SELECT * FROM "camera_groups" WHERE "id" = ${toNum(input.id)} LIMIT 1`,
    );
    const group = groupResult.rows[0] ?? null;
    if (!group) return null;

    const membersResult = await db.execute(sql`
      SELECT m.*, c."name" AS "camera_name", c."camera_code", c."status" AS "camera_status",
             c."location" AS "camera_location"
      FROM "camera_group_members" m
      LEFT JOIN "cameras" c ON c."id" = m."camera_id"
      WHERE m."group_id" = ${toNum(input.id)}
      ORDER BY m."grid_position"
      LIMIT 100
    `);
    return { ...group, members: membersResult.rows };
  }),

  /** Create camera group */
  createCameraGroup: requirePermission("mfg:camera:manage")
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        layout: z.string().default("2x2"),
        displayScreenId: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO "camera_groups" ("name", "description", "layout", "display_screen_id", "created_by")
        VALUES (${input.name}, ${input.description ?? null}, ${input.layout}, ${input.displayScreenId ?? null}, ${ctx.user?.id ?? null})
        RETURNING *
      `);
      log.info({ name: input.name }, "Camera group created");
      return result.rows[0] ?? null;
    }),

  /** Update camera group */
  updateCameraGroup: requirePermission("mfg:camera:manage")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        name: z.string().optional(),
        description: z.string().optional(),
        layout: z.string().optional(),
        displayScreenId: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const sets: ReturnType<typeof sql>[] = [sql`"updated_at" = now()`];
      if (input.name !== undefined) sets.push(sql`"name" = ${input.name}`);
      if (input.description !== undefined) sets.push(sql`"description" = ${input.description}`);
      if (input.layout !== undefined) sets.push(sql`"layout" = ${input.layout}`);
      if (input.displayScreenId !== undefined) sets.push(sql`"display_screen_id" = ${input.displayScreenId}`);

      const setClauses = sql.join(sets, sql`, `);
      const result = await db.execute(sql`
        UPDATE "camera_groups" SET ${setClauses} WHERE "id" = ${toNum(input.id)} RETURNING *
      `);
      log.info({ id: toNum(input.id) }, "Camera group updated");
      return result.rows[0] ?? null;
    }),

  /** Delete camera group (hard delete) */
  deleteCameraGroup: requirePermission("mfg:camera:manage")
    .input(idInput)
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = toNum(input.id);
      await db.execute(sql`DELETE FROM "camera_group_members" WHERE "group_id" = ${id}`);
      await db.execute(sql`DELETE FROM "camera_groups" WHERE "id" = ${id}`);
      log.info({ id }, "Camera group deleted");
      return { success: true };
    }),

  /** Add member to group */
  addGroupMember: requirePermission("mfg:camera:manage")
    .input(
      z.object({
        groupId: z.union([z.string(), z.number()]),
        cameraId: z.union([z.string(), z.number()]),
        gridPosition: z.number().default(0),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO "camera_group_members" ("group_id", "camera_id", "grid_position")
        VALUES (${toNum(input.groupId)}, ${toNum(input.cameraId)}, ${input.gridPosition})
        RETURNING *
      `);
      return result.rows[0] ?? null;
    }),

  /** Remove member from group */
  removeGroupMember: requirePermission("mfg:camera:manage")
    .input(idInput)
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`DELETE FROM "camera_group_members" WHERE "id" = ${toNum(input.id)}`);
      return { success: true };
    }),

  /** Reorder group members */
  reorderGroupMembers: requirePermission("mfg:camera:manage")
    .input(
      z.object({
        groupId: z.union([z.string(), z.number()]),
        members: z.array(
          z.object({
            id: z.union([z.string(), z.number()]),
            gridPosition: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      for (const m of input.members) {
        await db.execute(sql`
          UPDATE "camera_group_members" SET "grid_position" = ${m.gridPosition}
          WHERE "id" = ${toNum(m.id)} AND "group_id" = ${toNum(input.groupId)}
        `);
      }
      log.info({ groupId: toNum(input.groupId), count: input.members.length }, "Group members reordered");
      return { success: true };
    }),

  // ─── Snapshots ───────────────────────────────────────────────

  /** Capture a snapshot */
  captureSnapshot: protectedProcedure
    .input(
      z.object({
        cameraId: z.union([z.string(), z.number()]),
        triggerType: z.string().default("manual"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const id = toNum(input.cameraId);
      const fileUrl = `/api/camera/${id}/snapshot/${Date.now()}.jpg`;
      const result = await db.execute(sql`
        INSERT INTO "camera_snapshots" ("camera_id", "trigger_type", "file_url", "created_by")
        VALUES (${id}, ${input.triggerType}, ${fileUrl}, ${ctx.user?.id ?? null})
        RETURNING *
      `);
      log.info({ cameraId: id, triggerType: input.triggerType }, "Snapshot captured");
      return result.rows[0] ?? null;
    }),

  /** List snapshots */
  listSnapshots: protectedProcedure
    .input(
      z.object({
        cameraId: z.union([z.string(), z.number()]),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        triggerType: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const parts: ReturnType<typeof sql>[] = [sql`"camera_id" = ${toNum(input.cameraId)}`];
      if (input.dateFrom) parts.push(sql`"created_at" >= ${input.dateFrom}`);
      if (input.dateTo) parts.push(sql`"created_at" <= ${input.dateTo}`);
      if (input.triggerType) parts.push(sql`"trigger_type" = ${input.triggerType}`);

      const where = sql.join(parts, sql` AND `);
      const result = await db.execute(sql`
        SELECT * FROM "camera_snapshots" WHERE ${where} ORDER BY "created_at" DESC LIMIT 100
      `);
      return result.rows;
    }),

  /** Delete snapshot */
  deleteSnapshot: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    await ensureTables();
    const db = await requireDb();
    await db.execute(sql`DELETE FROM "camera_snapshots" WHERE "id" = ${toNum(input.id)}`);
    return { success: true };
  }),

  // ─── Events & Maintenance ───────────────────────────────────

  /** List camera events */
  listCameraEvents: protectedProcedure
    .input(
      z.object({
        cameraId: z.union([z.string(), z.number()]).optional(),
        eventType: z.string().optional(),
        severity: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const parts: ReturnType<typeof sql>[] = [];
      if (input?.cameraId) parts.push(sql`"camera_id" = ${toNum(input.cameraId)}`);
      if (input?.eventType) parts.push(sql`"event_type" = ${input.eventType}`);
      if (input?.severity) parts.push(sql`"severity" = ${input.severity}`);
      if (input?.dateFrom) parts.push(sql`"created_at" >= ${input.dateFrom}`);
      if (input?.dateTo) parts.push(sql`"created_at" <= ${input.dateTo}`);

      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT * FROM "camera_events" ${whereClause} ORDER BY "created_at" DESC LIMIT 200
      `);
      return result.rows;
    }),

  /** Acknowledge event */
  acknowledgeEvent: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        acknowledgedBy: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        UPDATE "camera_events"
        SET "acknowledged" = true, "acknowledged_by" = ${input.acknowledgedBy}, "acknowledged_at" = now()
        WHERE "id" = ${toNum(input.id)}
        RETURNING *
      `);
      log.info({ id: toNum(input.id), by: input.acknowledgedBy }, "Event acknowledged");
      return result.rows[0] ?? null;
    }),

  /** Log maintenance action */
  logMaintenance: protectedProcedure
    .input(
      z.object({
        cameraId: z.union([z.string(), z.number()]),
        action: z.string().min(1).max(100),
        notes: z.string().optional(),
        performedBy: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO "camera_maintenance_log" ("camera_id", "action", "notes", "performed_by")
        VALUES (${toNum(input.cameraId)}, ${input.action}, ${input.notes ?? null}, ${input.performedBy ?? ctx.user?.name ?? "system"})
        RETURNING *
      `);
      log.info({ cameraId: toNum(input.cameraId), action: input.action }, "Maintenance logged");
      return result.rows[0] ?? null;
    }),

  /** List maintenance log */
  listMaintenanceLog: protectedProcedure
    .input(z.object({ cameraId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT * FROM "camera_maintenance_log"
        WHERE "camera_id" = ${toNum(input.cameraId)}
        ORDER BY "created_at" DESC
        LIMIT 50
      `);
      return result.rows;
    }),

  // ─── Dashboard ──────────────────────────────────────────────

  /** Camera health dashboard aggregate */
  cameraHealthDashboard: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();

    const totalsResult = await db.execute(sql`
      SELECT
        COUNT(*) AS "total",
        COUNT(*) FILTER (WHERE "status" = 'online' OR "status" = 'streaming') AS "online",
        COUNT(*) FILTER (WHERE "status" = 'offline') AS "offline"
      FROM "cameras"
      WHERE "is_active" = true
    `);

    const byBrandResult = await db.execute(sql`
      SELECT "brand", COUNT(*) AS "count"
      FROM "cameras" WHERE "is_active" = true
      GROUP BY "brand" ORDER BY "count" DESC
      LIMIT 20
    `);

    const byLocationResult = await db.execute(sql`
      SELECT "location", COUNT(*) AS "count"
      FROM "cameras" WHERE "is_active" = true
      GROUP BY "location" ORDER BY "count" DESC
      LIMIT 20
    `);

    const recentEventsResult = await db.execute(sql`
      SELECT COUNT(*) AS "count"
      FROM "camera_events"
      WHERE "created_at" >= now() - INTERVAL '24 hours'
    `);

    const totals = totalsResult.rows[0] as any ?? { total: 0, online: 0, offline: 0 };
    const recentEvents = recentEventsResult.rows[0] as any ?? { count: 0 };

    return {
      totalCameras: Number(totals.total),
      onlineCount: Number(totals.online),
      offlineCount: Number(totals.offline),
      byBrand: byBrandResult.rows,
      byLocation: byLocationResult.rows,
      recentEventsCount: Number(recentEvents.count),
    };
  }),
});
