/**
 * Robot Debug Sandbox Router — 工业机器人调试沙盘
 *
 * M8-stage debug platform for commissioning, parameter tuning, collision testing,
 * program debugging, and calibration of KUKA/FANUC/ABB/Stäubli industrial robots.
 *
 * 15 procedures:
 *   Sessions:   listSessions, getSession, createSession, updateSessionStatus, deleteSession
 *   Commands:   sendCommand, getCommandResult, listSessionCommands, emergencyStop
 *   Parameters: captureSnapshot, listSnapshots, compareSnapshots
 *   Collision:  setCollisionEnvelope, checkCollision, getCollisionHistory
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("robot-debug");

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
      CREATE TABLE IF NOT EXISTS "debug_sessions" (
        "id" serial PRIMARY KEY NOT NULL,
        "robot_id" integer NOT NULL,
        "project_id" integer,
        "stage_code" varchar(10),
        "session_name" varchar(200) NOT NULL,
        "session_type" varchar(30) NOT NULL,
        "status" varchar(20) DEFAULT 'created',
        "started_at" timestamp,
        "completed_at" timestamp,
        "operator_id" integer,
        "operator_name" varchar(100),
        "notes" text,
        "metadata" json,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ds_robot_idx" ON "debug_sessions" ("robot_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ds_status_idx" ON "debug_sessions" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ds_created_idx" ON "debug_sessions" ("created_at")`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "debug_commands" (
        "id" serial PRIMARY KEY NOT NULL,
        "session_id" integer NOT NULL,
        "robot_id" integer NOT NULL,
        "command_type" varchar(30) NOT NULL,
        "payload" json NOT NULL,
        "result" varchar(30) DEFAULT 'pending',
        "response_data" json,
        "duration_ms" integer,
        "sent_at" timestamp DEFAULT now() NOT NULL,
        "completed_at" timestamp,
        "error_message" text
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dc_session_idx" ON "debug_commands" ("session_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dc_robot_idx" ON "debug_commands" ("robot_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dc_sent_idx" ON "debug_commands" ("sent_at")`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "debug_parameter_snapshots" (
        "id" serial PRIMARY KEY NOT NULL,
        "session_id" integer NOT NULL,
        "robot_id" integer NOT NULL,
        "snapshot_label" varchar(100),
        "j1_deg" decimal(8,3),
        "j2_deg" decimal(8,3),
        "j3_deg" decimal(8,3),
        "j4_deg" decimal(8,3),
        "j5_deg" decimal(8,3),
        "j6_deg" decimal(8,3),
        "tcp_x" decimal(10,3),
        "tcp_y" decimal(10,3),
        "tcp_z" decimal(10,3),
        "tcp_rx" decimal(8,3),
        "tcp_ry" decimal(8,3),
        "tcp_rz" decimal(8,3),
        "speed_pct" decimal(5,2),
        "acceleration_pct" decimal(5,2),
        "override_pct" decimal(5,2),
        "payload_kg" decimal(8,2),
        "motor_temps_c" json,
        "collision_envelope_json" json,
        "captured_at" timestamp DEFAULT now() NOT NULL,
        "captured_by" varchar(100)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dps_session_idx" ON "debug_parameter_snapshots" ("session_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dps_robot_idx" ON "debug_parameter_snapshots" ("robot_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dps_captured_idx" ON "debug_parameter_snapshots" ("captured_at")`);

    tablesEnsured = true;
    log.info("robot-debug tables ensured");
  } catch (e) {
    log.error({ err: e }, "Failed to ensure robot-debug tables");
  }
}

// ─── Valid state transitions ───────────────────────────────────
const validTransitions: Record<string, string[]> = {
  created: ["in_progress"],
  in_progress: ["paused", "completed", "aborted"],
  paused: ["in_progress", "aborted"],
};

// ─── Router ────────────────────────────────────────────────────
export const robotDebugRouter = router({
  // ═══════════════════════════════════════════════════════════
  // Sessions (5)
  // ═══════════════════════════════════════════════════════════

  listSessions: protectedProcedure
    .input(
      z.object({
        robotId: z.number().int().optional(),
        status: z.string().optional(),
        stageCode: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }).optional(),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const i = input ?? {};
      const lim = ('limit' in i && i.limit) ? i.limit : 50;
      const conditions: ReturnType<typeof sql>[] = [];
      if ('robotId' in i && i.robotId) conditions.push(sql`"robot_id" = ${i.robotId}`);
      if ('status' in i && i.status) conditions.push(sql`"status" = ${i.status}`);
      if ('stageCode' in i && i.stageCode) conditions.push(sql`"stage_code" = ${i.stageCode}`);
      const whereClause = conditions.length
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;
      const rows = await db.execute(
        sql`SELECT * FROM "debug_sessions" ${whereClause} ORDER BY "created_at" DESC LIMIT ${lim}`,
      );
      return rows.rows;
    }),

  getSession: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const numId = toNum(input.id);
      const sessionRows = await db.execute(sql`SELECT * FROM "debug_sessions" WHERE "id" = ${numId}`);
      if (!sessionRows.rows[0]) return null;
      const cmdCount = await db.execute(
        sql`SELECT COUNT(*)::int AS count FROM "debug_commands" WHERE "session_id" = ${numId}`,
      );
      const latestSnap = await db.execute(
        sql`SELECT * FROM "debug_parameter_snapshots" WHERE "session_id" = ${numId} ORDER BY "captured_at" DESC LIMIT 1`,
      );
      return {
        ...sessionRows.rows[0],
        commandCount: (cmdCount.rows[0] as any)?.count ?? 0,
        latestSnapshot: latestSnap.rows[0] ?? null,
      };
    }),

  createSession: requirePermission("mfg:robot-debug:manage")
    .input(
      z.object({
        robotId: z.number().int(),
        sessionName: z.string().min(1).max(200),
        sessionType: z.enum(["commissioning", "parameter_tuning", "collision_test", "program_debug", "calibration"]),
        stageCode: z.string().max(10).optional(),
        projectId: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const opName = (ctx as any).session?.displayName ?? "system";
      const opId = (ctx as any).session?.userId ?? null;
      const rows = await db.execute(sql`
        INSERT INTO "debug_sessions" ("robot_id", "project_id", "stage_code", "session_name", "session_type", "status", "operator_id", "operator_name")
        VALUES (${input.robotId}, ${input.projectId ?? null}, ${input.stageCode ?? null}, ${input.sessionName}, ${input.sessionType}, 'created', ${opId}, ${opName})
        RETURNING *
      `);
      log.info({ sessionName: input.sessionName, robotId: input.robotId }, "Debug session created");
      return rows.rows[0];
    }),

  updateSessionStatus: requirePermission("mfg:robot-debug:manage")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        status: z.enum(["in_progress", "paused", "completed", "aborted"]),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const numId = toNum(input.id);
      const existing = await db.execute(sql`SELECT "status" FROM "debug_sessions" WHERE "id" = ${numId}`);
      if (!existing.rows[0]) throw new Error("Session not found");
      const currentStatus = (existing.rows[0] as any).status;
      const allowed = validTransitions[currentStatus];
      if (!allowed || !allowed.includes(input.status)) {
        throw new Error(`Invalid transition: ${currentStatus} -> ${input.status}`);
      }
      const now = new Date().toISOString();
      const setClauses = [sql`"status" = ${input.status}`, sql`"updated_at" = ${now}`];
      if (input.status === "in_progress" && currentStatus === "created") {
        setClauses.push(sql`"started_at" = ${now}`);
      }
      if (input.status === "completed" || input.status === "aborted") {
        setClauses.push(sql`"completed_at" = ${now}`);
      }
      const rows = await db.execute(
        sql`UPDATE "debug_sessions" SET ${sql.join(setClauses, sql`, `)} WHERE "id" = ${numId} RETURNING *`,
      );
      log.info({ id: numId, from: currentStatus, to: input.status }, "Session status updated");
      return rows.rows[0];
    }),

  deleteSession: requirePermission("mfg:robot-debug:manage")
    .input(idInput)
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const numId = toNum(input.id);
      const rows = await db.execute(sql`
        UPDATE "debug_sessions" SET "status" = 'aborted', "completed_at" = now(), "updated_at" = now()
        WHERE "id" = ${numId} AND "status" != 'completed'
        RETURNING *
      `);
      if (!rows.rows[0]) throw new Error("Session not found or already completed");
      log.info({ id: numId }, "Debug session soft-deleted (aborted)");
      return rows.rows[0];
    }),

  // ═══════════════════════════════════════════════════════════
  // Commands (4)
  // ═══════════════════════════════════════════════════════════

  sendCommand: requirePermission("mfg:robot-debug:operate")
    .input(
      z.object({
        sessionId: z.number().int(),
        robotId: z.number().int(),
        commandType: z.string().min(1).max(30),
        payload: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const payloadJson = JSON.stringify(input.payload);
      const rows = await db.execute(sql`
        INSERT INTO "debug_commands" ("session_id", "robot_id", "command_type", "payload", "result")
        VALUES (${input.sessionId}, ${input.robotId}, ${input.commandType}, ${payloadJson}::json, 'pending')
        RETURNING "id", "result"
      `);
      log.info({ sessionId: input.sessionId, commandType: input.commandType }, "Debug command sent");
      return { id: (rows.rows[0] as any).id, status: "pending" };
    }),

  getCommandResult: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const numId = toNum(input.id);
      const rows = await db.execute(sql`SELECT * FROM "debug_commands" WHERE "id" = ${numId}`);
      return rows.rows[0] ?? null;
    }),

  listSessionCommands: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().int(),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql`
        SELECT * FROM "debug_commands"
        WHERE "session_id" = ${input.sessionId}
        ORDER BY "sent_at" ASC
        LIMIT ${input.limit}
      `);
      return rows.rows;
    }),

  emergencyStop: requirePermission("mfg:robot-debug:operate")
    .input(
      z.object({
        sessionId: z.number().int(),
        robotId: z.number().int(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Insert emergency stop command
      const estop = await db.execute(sql`
        INSERT INTO "debug_commands" ("session_id", "robot_id", "command_type", "payload", "result")
        VALUES (${input.sessionId}, ${input.robotId}, 'emergency_stop', '{"action":"ESTOP","priority":"critical"}'::json, 'executing')
        RETURNING *
      `);
      // Fail all pending commands for this session
      await db.execute(sql`
        UPDATE "debug_commands"
        SET "result" = 'failed', "error_message" = 'Cancelled by emergency stop', "completed_at" = now()
        WHERE "session_id" = ${input.sessionId} AND "result" IN ('pending', 'executing') AND "command_type" != 'emergency_stop'
      `);
      log.warn({ sessionId: input.sessionId, robotId: input.robotId }, "EMERGENCY STOP issued");
      return estop.rows[0];
    }),

  // ═══════════════════════════════════════════════════════════
  // Parameters (3)
  // ═══════════════════════════════════════════════════════════

  captureSnapshot: requirePermission("mfg:robot-debug:operate")
    .input(
      z.object({
        sessionId: z.number().int(),
        robotId: z.number().int(),
        snapshotLabel: z.string().max(100).optional(),
        j1Deg: z.number().optional(),
        j2Deg: z.number().optional(),
        j3Deg: z.number().optional(),
        j4Deg: z.number().optional(),
        j5Deg: z.number().optional(),
        j6Deg: z.number().optional(),
        tcpX: z.number().optional(),
        tcpY: z.number().optional(),
        tcpZ: z.number().optional(),
        tcpRx: z.number().optional(),
        tcpRy: z.number().optional(),
        tcpRz: z.number().optional(),
        speedPct: z.number().optional(),
        accelerationPct: z.number().optional(),
        overridePct: z.number().optional(),
        payloadKg: z.number().optional(),
        motorTempsC: z.record(z.string(), z.any()).optional(),
        collisionEnvelopeJson: z.record(z.string(), z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const capturedBy = (ctx as any).session?.displayName ?? "system";
      const motorJson = input.motorTempsC ? JSON.stringify(input.motorTempsC) : null;
      const envelopeJson = input.collisionEnvelopeJson ? JSON.stringify(input.collisionEnvelopeJson) : null;
      const rows = await db.execute(sql`
        INSERT INTO "debug_parameter_snapshots"
          ("session_id", "robot_id", "snapshot_label",
           "j1_deg", "j2_deg", "j3_deg", "j4_deg", "j5_deg", "j6_deg",
           "tcp_x", "tcp_y", "tcp_z", "tcp_rx", "tcp_ry", "tcp_rz",
           "speed_pct", "acceleration_pct", "override_pct", "payload_kg",
           "motor_temps_c", "collision_envelope_json", "captured_by")
        VALUES
          (${input.sessionId}, ${input.robotId}, ${input.snapshotLabel ?? null},
           ${input.j1Deg ?? null}, ${input.j2Deg ?? null}, ${input.j3Deg ?? null},
           ${input.j4Deg ?? null}, ${input.j5Deg ?? null}, ${input.j6Deg ?? null},
           ${input.tcpX ?? null}, ${input.tcpY ?? null}, ${input.tcpZ ?? null},
           ${input.tcpRx ?? null}, ${input.tcpRy ?? null}, ${input.tcpRz ?? null},
           ${input.speedPct ?? null}, ${input.accelerationPct ?? null}, ${input.overridePct ?? null},
           ${input.payloadKg ?? null},
           ${motorJson}::json, ${envelopeJson}::json, ${capturedBy})
        RETURNING *
      `);
      log.info({ sessionId: input.sessionId, label: input.snapshotLabel }, "Parameter snapshot captured");
      return rows.rows[0];
    }),

  listSnapshots: protectedProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql`
        SELECT * FROM "debug_parameter_snapshots"
        WHERE "session_id" = ${input.sessionId}
        ORDER BY "captured_at" ASC
        LIMIT 500
      `);
      return rows.rows;
    }),

  compareSnapshots: protectedProcedure
    .input(
      z.object({
        snapshotIdA: z.union([z.string(), z.number()]),
        snapshotIdB: z.union([z.string(), z.number()]),
      }),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const idA = toNum(input.snapshotIdA);
      const idB = toNum(input.snapshotIdB);
      const rowsA = await db.execute(sql`SELECT * FROM "debug_parameter_snapshots" WHERE "id" = ${idA}`);
      const rowsB = await db.execute(sql`SELECT * FROM "debug_parameter_snapshots" WHERE "id" = ${idB}`);
      if (!rowsA.rows[0] || !rowsB.rows[0]) throw new Error("One or both snapshots not found");
      const a = rowsA.rows[0] as any;
      const b = rowsB.rows[0] as any;
      const numFields = [
        "j1_deg", "j2_deg", "j3_deg", "j4_deg", "j5_deg", "j6_deg",
        "tcp_x", "tcp_y", "tcp_z", "tcp_rx", "tcp_ry", "tcp_rz",
        "speed_pct", "acceleration_pct", "override_pct", "payload_kg",
      ];
      const deltas: Record<string, { a: number | null; b: number | null; delta: number | null }> = {};
      for (const f of numFields) {
        const va = a[f] != null ? parseFloat(a[f]) : null;
        const vb = b[f] != null ? parseFloat(b[f]) : null;
        deltas[f] = {
          a: va,
          b: vb,
          delta: va != null && vb != null ? Math.round((vb - va) * 1000) / 1000 : null,
        };
      }
      return { snapshotA: a, snapshotB: b, deltas };
    }),

  // ═══════════════════════════════════════════════════════════
  // Collision (3)
  // ═══════════════════════════════════════════════════════════

  setCollisionEnvelope: requirePermission("mfg:robot-debug:manage")
    .input(
      z.object({
        sessionId: z.number().int(),
        robotId: z.number().int(),
        collisionEnvelopeJson: z.object({
          safeZones: z.array(z.record(z.string(), z.any())),
          exclusionZones: z.array(z.record(z.string(), z.any())),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const capturedBy = (ctx as any).session?.displayName ?? "system";
      const envelopeJson = JSON.stringify(input.collisionEnvelopeJson);
      // Try to update latest snapshot for this session, else create new one
      const existing = await db.execute(sql`
        SELECT "id" FROM "debug_parameter_snapshots"
        WHERE "session_id" = ${input.sessionId}
        ORDER BY "captured_at" DESC LIMIT 1
      `);
      if (existing.rows[0]) {
        const snapId = (existing.rows[0] as any).id;
        const rows = await db.execute(sql`
          UPDATE "debug_parameter_snapshots"
          SET "collision_envelope_json" = ${envelopeJson}::json
          WHERE "id" = ${snapId}
          RETURNING *
        `);
        log.info({ sessionId: input.sessionId }, "Collision envelope updated on existing snapshot");
        return rows.rows[0];
      }
      // Create new snapshot with just the envelope
      const rows = await db.execute(sql`
        INSERT INTO "debug_parameter_snapshots" ("session_id", "robot_id", "snapshot_label", "collision_envelope_json", "captured_by")
        VALUES (${input.sessionId}, ${input.robotId}, 'collision_envelope', ${envelopeJson}::json, ${capturedBy})
        RETURNING *
      `);
      log.info({ sessionId: input.sessionId }, "Collision envelope created as new snapshot");
      return rows.rows[0];
    }),

  checkCollision: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().int(),
        targetJ1: z.number(),
        targetJ2: z.number(),
        targetJ3: z.number(),
        targetJ4: z.number(),
        targetJ5: z.number(),
        targetJ6: z.number(),
      }),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Get latest snapshot with collision envelope
      const snap = await db.execute(sql`
        SELECT "collision_envelope_json" FROM "debug_parameter_snapshots"
        WHERE "session_id" = ${input.sessionId} AND "collision_envelope_json" IS NOT NULL
        ORDER BY "captured_at" DESC LIMIT 1
      `);
      if (!snap.rows[0]) {
        return { safe: true, warnings: ["No collision envelope configured for this session"] };
      }
      const envelope = (snap.rows[0] as any).collision_envelope_json;
      const parsed = typeof envelope === "string" ? JSON.parse(envelope) : envelope;
      const warnings: string[] = [];
      const targets = [input.targetJ1, input.targetJ2, input.targetJ3, input.targetJ4, input.targetJ5, input.targetJ6];
      // Check against exclusion zones
      if (parsed.exclusionZones && Array.isArray(parsed.exclusionZones)) {
        for (const zone of parsed.exclusionZones) {
          if (zone.jointLimits && Array.isArray(zone.jointLimits)) {
            for (let j = 0; j < Math.min(6, zone.jointLimits.length); j++) {
              const lim = zone.jointLimits[j];
              if (lim && targets[j] >= lim.min && targets[j] <= lim.max) {
                warnings.push(`J${j + 1} (${targets[j]}°) inside exclusion zone "${zone.name ?? "unnamed"}" [${lim.min}°..${lim.max}°]`);
              }
            }
          }
        }
      }
      return { safe: warnings.length === 0, warnings };
    }),

  getCollisionHistory: protectedProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql`
        SELECT * FROM "debug_commands"
        WHERE "session_id" = ${input.sessionId} AND "result" = 'collision_detected'
        ORDER BY "sent_at" DESC
        LIMIT 100
      `);
      return rows.rows;
    }),
});
