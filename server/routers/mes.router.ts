import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { verifyWorkerSkillForStation, InsufficientSkillError } from "../services/mes-quality-guard";

const flexibleId = z.union([z.string(), z.number()]);

// ── Auto-DDL for capacity / downtime / defect tables ──────────────────
let _capacityTablesInitialized = false;
async function ensureCapacityTables(db: Awaited<ReturnType<typeof requireDb>>) {
  if (_capacityTablesInitialized) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mes_capacity_plans (
      id SERIAL PRIMARY KEY,
      station_id INTEGER NOT NULL,
      plan_date VARCHAR(10) NOT NULL,
      plan_type VARCHAR(20) DEFAULT 'daily',
      shift_code VARCHAR(20),
      process_code VARCHAR(20),
      planned_hours DECIMAL(8,2) NOT NULL,
      actual_hours DECIMAL(8,2) DEFAULT 0,
      planned_units INTEGER DEFAULT 0,
      actual_units INTEGER DEFAULT 0,
      utilization_pct DECIMAL(5,2),
      bottleneck_score DECIMAL(5,2),
      notes TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mes_equipment_downtime (
      id SERIAL PRIMARY KEY,
      equipment_id INTEGER NOT NULL,
      station_id INTEGER,
      downtime_type VARCHAR(30) NOT NULL,
      start_at TIMESTAMP NOT NULL,
      end_at TIMESTAMP,
      duration_minutes INTEGER,
      root_cause TEXT,
      root_cause_category VARCHAR(30),
      impacted_work_orders JSONB,
      reported_by INTEGER,
      resolved_by INTEGER,
      resolution TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mes_defect_analysis (
      id SERIAL PRIMARY KEY,
      quality_check_id INTEGER NOT NULL,
      work_order_id INTEGER,
      station_id INTEGER NOT NULL,
      defect_code VARCHAR(50),
      defect_description TEXT,
      root_cause_category VARCHAR(30) NOT NULL,
      root_cause_detail TEXT NOT NULL,
      ishikawa_branch VARCHAR(30),
      five_why_chain JSONB,
      corrective_action TEXT,
      corrective_action_due_date TIMESTAMP,
      preventive_action TEXT,
      preventive_action_due_date TIMESTAMP,
      status VARCHAR(20) DEFAULT 'open',
      severity VARCHAR(10),
      assigned_to INTEGER,
      assigned_to_name VARCHAR(100),
      closed_by INTEGER,
      closed_at TIMESTAMP,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  _capacityTablesInitialized = true;
}

export const mesRouter = router({
  getOperators: protectedProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT DISTINCT employee_id AS "employeeId", employee_name AS "employeeName", department, position
      FROM employee_competence_assessments
      ORDER BY department, employee_name
      LIMIT 500
    `);
    return (result.rows as any[]).map((r: any) => ({
      id: r.employeeId,
      name: r.employeeName,
      department: r.department || "",
      position: r.position || "",
    }));
  }),

  verifySkill: requirePermission('mfg:process:manage')
    .input(z.object({
      employeeId: z.number(),
      domain: z.string(),
      requiredLevel: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await verifyWorkerSkillForStation(
          input.employeeId,
          input.domain,
          input.requiredLevel
        );
        return {
          success: true,
// @ts-ignore duplicate property
          passed: true,
          ...result,
          message: `Skill verified. Assembly started. ${result.employeeName} has L${result.currentLevel} in ${result.domain} (required: L${result.requiredLevel}).`,
        };
      } catch (error) {
        if (error instanceof InsufficientSkillError) {
          return {
            success: false,
            passed: false,
            employeeId: error.employeeId,
            employeeName: error.employeeName,
            domain: error.domain,
            currentLevel: error.currentLevel,
            requiredLevel: error.requiredLevel,
            score: "0",
            message: error.iatfWarning,
          };
        }
        return {
          success: false,
          passed: false,
          employeeId: input.employeeId,
          employeeName: "Unknown",
          domain: input.domain,
          currentLevel: 0,
          requiredLevel: input.requiredLevel,
          score: "0",
          message: (error as Error).message || "Verification failed",
        };
      }
    }),

  // ── Dispatch Procedures ─────────────────────────────────────────────

  dispatchWorkOrder: requirePermission('mfg:mes:dispatch')
    .input(z.object({
      workOrderId: z.string(),
      stationId: z.number(),
      operatorId: z.number(),
      operatorName: z.string(),
      plannedStartTime: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const plannedStart = input.plannedStartTime ? sql`${input.plannedStartTime}` : sql`NOW()`;
      const result = await db.execute(sql`
        INSERT INTO mes_work_order_dispatch
          (work_order_id, station_id, operator_id, operator_name, planned_start_time, status, created_at)
        VALUES
          (${input.workOrderId}, ${input.stationId}, ${input.operatorId},
           ${input.operatorName}, ${plannedStart}, 'pending', NOW())
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  listDispatches: protectedProcedure
    .input(z.object({
      stationId: flexibleId.optional(),
      operatorId: flexibleId.optional(),
      status: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const parts: ReturnType<typeof sql>[] = [];
      if (input.stationId !== undefined) parts.push(sql`station_id = ${String(input.stationId)}`);
      if (input.operatorId !== undefined) parts.push(sql`operator_id = ${String(input.operatorId)}`);
      if (input.status) parts.push(sql`status = ${input.status}`);
      if (input.dateFrom) parts.push(sql`created_at >= ${input.dateFrom}`);
      if (input.dateTo) parts.push(sql`created_at <= ${input.dateTo}`);
      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT id, work_order_id AS "workOrderId", station_id AS "stationId",
               operator_id AS "operatorId", operator_name AS "operatorName",
               planned_start_time AS "plannedStartTime",
               actual_start_time AS "actualStartTime",
               actual_end_time AS "actualEndTime",
               cycle_time_seconds AS "cycleTimeSeconds",
               status, quality_result AS "qualityResult",
               pause_reason AS "pauseReason",
               created_at AS "createdAt"
        FROM mes_work_order_dispatch
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${input.limit}
      `);
      return (result as any).rows ?? result;
    }),

  getDispatch: protectedProcedure
    .input(z.object({ id: flexibleId }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT id, work_order_id AS "workOrderId", station_id AS "stationId",
               operator_id AS "operatorId", operator_name AS "operatorName",
               planned_start_time AS "plannedStartTime",
               actual_start_time AS "actualStartTime",
               actual_end_time AS "actualEndTime",
               cycle_time_seconds AS "cycleTimeSeconds",
               status, quality_result AS "qualityResult",
               pause_reason AS "pauseReason",
               created_at AS "createdAt"
        FROM mes_work_order_dispatch
        WHERE id = ${String(input.id)}
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  startDispatch: requirePermission('mfg:mes:operate')
    .input(z.object({ id: flexibleId }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        UPDATE mes_work_order_dispatch
        SET status = 'in_progress', actual_start_time = NOW()
        WHERE id = ${String(input.id)}
        RETURNING id, status, actual_start_time AS "actualStartTime"
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  pauseDispatch: requirePermission('mfg:mes:operate')
    .input(z.object({
      id: flexibleId,
      pauseReason: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        UPDATE mes_work_order_dispatch
        SET status = 'paused', pause_reason = ${input.pauseReason}
        WHERE id = ${String(input.id)}
        RETURNING id, status, pause_reason AS "pauseReason"
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  resumeDispatch: requirePermission('mfg:mes:operate')
    .input(z.object({ id: flexibleId }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        UPDATE mes_work_order_dispatch
        SET status = 'in_progress', pause_reason = NULL
        WHERE id = ${String(input.id)}
        RETURNING id, status
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  completeDispatch: requirePermission('mfg:mes:operate')
    .input(z.object({
      id: flexibleId,
      qualityResult: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        UPDATE mes_work_order_dispatch
        SET status = 'completed',
            actual_end_time = NOW(),
            cycle_time_seconds = EXTRACT(EPOCH FROM NOW() - actual_start_time),
            quality_result = ${input.qualityResult ?? null}
        WHERE id = ${String(input.id)}
        RETURNING id, status, actual_end_time AS "actualEndTime",
                  cycle_time_seconds AS "cycleTimeSeconds",
                  quality_result AS "qualityResult"
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  // ── Station Procedures ──────────────────────────────────────────────

  listStationStatus: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT station_id AS "stationId", station_name AS "stationName",
               status, current_operator_id AS "currentOperatorId",
               current_operator_name AS "currentOperatorName",
               camera_id AS "cameraId", camera_status AS "cameraStatus",
               updated_at AS "updatedAt"
        FROM mes_station_status
        ORDER BY station_id
        LIMIT 200
      `);
      return (result as any).rows ?? result;
    }),

  getStationStatus: protectedProcedure
    .input(z.object({ stationId: flexibleId }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT ss.station_id AS "stationId", ss.station_name AS "stationName",
               ss.status, ss.current_operator_id AS "currentOperatorId",
               ss.current_operator_name AS "currentOperatorName",
               ss.camera_id AS "cameraId", ss.camera_status AS "cameraStatus",
               ss.updated_at AS "updatedAt",
               c.name AS "cameraName", c.location AS "cameraLocation"
        FROM mes_station_status ss
        LEFT JOIN cameras c ON c.id = ss.camera_id
        WHERE ss.station_id = ${String(input.stationId)}
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  updateStationStatus: requirePermission('mfg:mes:dispatch')
    .input(z.object({
      stationId: flexibleId,
      status: z.string(),
      currentOperatorId: z.number().optional(),
      currentOperatorName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO mes_station_status (station_id, status, current_operator_id, current_operator_name, updated_at)
        VALUES (${String(input.stationId)}, ${input.status},
                ${input.currentOperatorId ?? null}, ${input.currentOperatorName ?? null}, NOW())
        ON CONFLICT (station_id)
        DO UPDATE SET status = EXCLUDED.status,
                      current_operator_id = EXCLUDED.current_operator_id,
                      current_operator_name = EXCLUDED.current_operator_name,
                      updated_at = NOW()
        RETURNING station_id AS "stationId", status,
                  current_operator_id AS "currentOperatorId",
                  current_operator_name AS "currentOperatorName"
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  getStationDashboard: protectedProcedure
    .input(z.object({ stationId: flexibleId }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const sid = String(input.stationId);

      // Station status
      const statusResult = await db.execute(sql`
        SELECT station_id AS "stationId", station_name AS "stationName",
               status, current_operator_id AS "currentOperatorId",
               current_operator_name AS "currentOperatorName",
               camera_id AS "cameraId", camera_status AS "cameraStatus"
        FROM mes_station_status
        WHERE station_id = ${sid}
      `);
      const statusRows = (statusResult as any).rows ?? statusResult;

      // Recent dispatches
      const dispatchResult = await db.execute(sql`
        SELECT id, work_order_id AS "workOrderId", operator_name AS "operatorName",
               status, actual_start_time AS "actualStartTime",
               actual_end_time AS "actualEndTime",
               cycle_time_seconds AS "cycleTimeSeconds"
        FROM mes_work_order_dispatch
        WHERE station_id = ${sid}
        ORDER BY created_at DESC
        LIMIT 10
      `);
      const recentDispatches = (dispatchResult as any).rows ?? dispatchResult;

      // Quality checks count
      const qcResult = await db.execute(sql`
        SELECT COUNT(*) AS "totalChecks",
               SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) AS "passCount",
               SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) AS "failCount"
        FROM mes_quality_checks
        WHERE station_id = ${sid}
          AND DATE(created_at) = CURRENT_DATE
      `);
      const qcRows = (qcResult as any).rows ?? qcResult;

      return {
        station: (statusRows as any[])[0] ?? null,
        recentDispatches,
        todayQuality: (qcRows as any[])[0] ?? { totalChecks: 0, passCount: 0, failCount: 0 },
      };
    }),

  // ── Quality Procedures ──────────────────────────────────────────────

  triggerCameraQC: requirePermission('mfg:mes:operate')
    .input(z.object({
      dispatchId: z.number(),
      stationId: z.number(),
      cameraId: z.number(),
      checkType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO mes_quality_checks
          (dispatch_id, station_id, camera_id, check_type, result, created_at)
        VALUES
          (${input.dispatchId}, ${input.stationId}, ${input.cameraId},
           ${input.checkType}, 'pending', NOW())
        RETURNING id, dispatch_id AS "dispatchId", station_id AS "stationId",
                  camera_id AS "cameraId", check_type AS "checkType", result
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  recordQualityCheck: requirePermission('mfg:mes:operate')
    .input(z.object({
      id: flexibleId,
      result: z.string(),
      defectCodes: z.string().optional(),
      confidence: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        UPDATE mes_quality_checks
        SET result = ${input.result},
            defect_codes = ${input.defectCodes ?? null},
            confidence = ${input.confidence ?? null},
            notes = ${input.notes ?? null},
            checked_at = NOW()
        WHERE id = ${String(input.id)}
        RETURNING id, result, defect_codes AS "defectCodes",
                  confidence, notes, checked_at AS "checkedAt"
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  listQualityChecks: protectedProcedure
    .input(z.object({
      dispatchId: flexibleId.optional(),
      stationId: flexibleId.optional(),
      result: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const parts: ReturnType<typeof sql>[] = [];
      if (input.dispatchId !== undefined) parts.push(sql`dispatch_id = ${String(input.dispatchId)}`);
      if (input.stationId !== undefined) parts.push(sql`station_id = ${String(input.stationId)}`);
      if (input.result) parts.push(sql`result = ${input.result}`);
      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT id, dispatch_id AS "dispatchId", station_id AS "stationId",
               camera_id AS "cameraId", check_type AS "checkType",
               result, defect_codes AS "defectCodes",
               confidence, notes,
               checked_at AS "checkedAt", created_at AS "createdAt"
        FROM mes_quality_checks
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${input.limit}
      `);
      return (result as any).rows ?? result;
    }),

  getQualityTrend: protectedProcedure
    .input(z.object({
      stationId: flexibleId,
      days: z.number().default(7),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const sid = String(input.stationId);
      const d = input.days;
      const result = await db.execute(sql`
        SELECT DATE(created_at) AS "date",
               COUNT(*) AS "total",
               SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) AS "pass",
               SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) AS "fail",
               SUM(CASE WHEN result = 'rework' THEN 1 ELSE 0 END) AS "rework",
               SUM(CASE WHEN result = 'scrap' THEN 1 ELSE 0 END) AS "scrap"
        FROM mes_quality_checks
        WHERE station_id = ${sid}
          AND created_at >= CURRENT_DATE - INTERVAL '1 day' * ${d}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `);
      return (result as any).rows ?? result;
    }),

  // ── Aggregation Procedures ──────────────────────────────────────────

  getShopfloorOverview: protectedProcedure
    .query(async () => {
      const db = await requireDb();

      // All stations with status
      const stationsResult = await db.execute(sql`
        SELECT station_id AS "stationId", station_name AS "stationName",
               status, current_operator_id AS "currentOperatorId",
               current_operator_name AS "currentOperatorName",
               camera_status AS "cameraStatus"
        FROM mes_station_status
        ORDER BY station_id
        LIMIT 200
      `);
      const stations = (stationsResult as any).rows ?? stationsResult;

      // Today's dispatch count
      const dispatchResult = await db.execute(sql`
        SELECT COUNT(*) AS "dispatchCount",
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS "completedCount",
               SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS "inProgressCount"
        FROM mes_work_order_dispatch
        WHERE DATE(created_at) = CURRENT_DATE
      `);
      const dispatchRows = (dispatchResult as any).rows ?? dispatchResult;

      // Today's quality pass rate
      const qualityResult = await db.execute(sql`
        SELECT COUNT(*) AS "totalChecks",
               SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) AS "passCount"
        FROM mes_quality_checks
        WHERE DATE(created_at) = CURRENT_DATE
      `);
      const qualityRows = (qualityResult as any).rows ?? qualityResult;
      const totalChecks = Number((qualityRows as any[])[0]?.totalChecks ?? 0);
      const passCount = Number((qualityRows as any[])[0]?.passCount ?? 0);
      const passRate = totalChecks > 0 ? Math.round((passCount / totalChecks) * 10000) / 100 : 0;

      return {
        stations,
        todayDispatches: (dispatchRows as any[])[0] ?? { dispatchCount: 0, completedCount: 0, inProgressCount: 0 },
        todayQualityPassRate: passRate,
        todayQualityChecks: totalChecks,
      };
    }),

  getProductionProgress: protectedProcedure
    .input(z.object({
      date: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const dateCondition = input.date ? sql`DATE(d.created_at) = ${input.date}` : sql`DATE(d.created_at) = CURRENT_DATE`;
      const result = await db.execute(sql`
        SELECT d.id, d.work_order_id AS "workOrderId",
               d.station_id AS "stationId",
               d.operator_id AS "operatorId", d.operator_name AS "operatorName",
               d.status,
               d.planned_start_time AS "plannedStartTime",
               d.actual_start_time AS "actualStartTime",
               d.actual_end_time AS "actualEndTime",
               d.cycle_time_seconds AS "cycleTimeSeconds",
               d.quality_result AS "qualityResult"
        FROM mes_work_order_dispatch d
        WHERE ${dateCondition}
        ORDER BY d.created_at ASC
        LIMIT 200
      `);
      const rows = (result as any).rows ?? result;
      const total = (rows as any[]).length;
      const completed = (rows as any[]).filter((r: any) => r.status === "completed").length;
      return {
        dispatches: rows,
        total,
        completed,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }),

  getOperatorDashboard: protectedProcedure
    .input(z.object({ operatorId: flexibleId }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const oid = String(input.operatorId);

      // Current dispatch
      const currentResult = await db.execute(sql`
        SELECT id, work_order_id AS "workOrderId", station_id AS "stationId",
               status, actual_start_time AS "actualStartTime"
        FROM mes_work_order_dispatch
        WHERE operator_id = ${oid}
          AND status IN ('in_progress', 'paused')
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const currentRows = (currentResult as any).rows ?? currentResult;

      // Recent quality checks
      const qcResult = await db.execute(sql`
        SELECT qc.id, qc.check_type AS "checkType", qc.result,
               qc.defect_codes AS "defectCodes", qc.checked_at AS "checkedAt"
        FROM mes_quality_checks qc
        JOIN mes_work_order_dispatch d ON d.id = qc.dispatch_id
        WHERE d.operator_id = ${oid}
        ORDER BY qc.created_at DESC
        LIMIT 10
      `);
      const recentQC = (qcResult as any).rows ?? qcResult;

      // Stats
      const statsResult = await db.execute(sql`
        SELECT COUNT(*) AS "totalDispatches",
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS "completedCount",
               AVG(cycle_time_seconds) AS "avgCycleTime"
        FROM mes_work_order_dispatch
        WHERE operator_id = ${oid}
          AND DATE(created_at) = CURRENT_DATE
      `);
      const statsRows = (statsResult as any).rows ?? statsResult;

      return {
        operatorId: input.operatorId,
        currentDispatch: (currentRows as any[])[0] ?? null,
        recentQualityChecks: recentQC,
        todayStats: (statsRows as any[])[0] ?? { totalDispatches: 0, completedCount: 0, avgCycleTime: null },
      };
    }),

  // ── Capacity Planning / Equipment Downtime / Defect Analysis ────────
  // Auto-DDL for 3 new tables

  createCapacityPlan: requirePermission('mfg:capacity:manage')
    .input(z.object({
      stationId: z.number(),
      planDate: z.string(),
      planType: z.string().default('daily'),
      shiftCode: z.string().optional(),
      processCode: z.string().optional(),
      plannedHours: z.number(),
      plannedUnits: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const result = await db.execute(sql`
        INSERT INTO mes_capacity_plans
          (station_id, plan_date, plan_type, shift_code, process_code,
           planned_hours, planned_units, created_at, updated_at)
        VALUES
          (${input.stationId}, ${input.planDate}, ${input.planType},
           ${input.shiftCode ?? null}, ${input.processCode ?? null},
           ${input.plannedHours}, ${input.plannedUnits ?? 0}, NOW(), NOW())
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  getCapacityUtilization: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      stationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const parts: ReturnType<typeof sql>[] = [];
      if (input.dateFrom) parts.push(sql`plan_date >= ${input.dateFrom}`);
      if (input.dateTo) parts.push(sql`plan_date <= ${input.dateTo}`);
      if (input.stationId !== undefined) parts.push(sql`station_id = ${input.stationId}`);
      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT station_id AS "stationId",
               SUM(planned_hours) AS "totalPlannedHours",
               SUM(actual_hours) AS "totalActualHours",
               SUM(planned_units) AS "totalPlannedUnits",
               SUM(actual_units) AS "totalActualUnits",
               CASE WHEN SUM(planned_hours) > 0
                    THEN ROUND(SUM(actual_hours) / SUM(planned_hours) * 100, 2)
                    ELSE 0 END AS "utilizationPct"
        FROM mes_capacity_plans
        ${whereClause}
        GROUP BY station_id
        ORDER BY station_id
      `);
      return (result as any).rows ?? result;
    }),

  getBottleneckAnalysis: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const parts: ReturnType<typeof sql>[] = [];
      if (input.dateFrom) parts.push(sql`plan_date >= ${input.dateFrom}`);
      if (input.dateTo) parts.push(sql`plan_date <= ${input.dateTo}`);
      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT station_id AS "stationId",
               SUM(planned_units) AS "totalPlannedUnits",
               SUM(actual_units) AS "totalActualUnits",
               CASE WHEN SUM(planned_units) > 0
                    THEN ROUND(SUM(actual_units)::NUMERIC / SUM(planned_units) * 100, 2)
                    ELSE 0 END AS "throughputPct",
               AVG(bottleneck_score) AS "avgBottleneckScore"
        FROM mes_capacity_plans
        ${whereClause}
        GROUP BY station_id
        ORDER BY "throughputPct" ASC
        LIMIT 10
      `);
      return (result as any).rows ?? result;
    }),

  forecastCapacity: protectedProcedure
    .input(z.object({
      stationId: z.number().optional(),
      daysAhead: z.number().default(14),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const parts: ReturnType<typeof sql>[] = [
        sql`plan_date >= CURRENT_DATE`,
        sql`plan_date <= CURRENT_DATE + INTERVAL '1 day' * ${input.daysAhead}`,
      ];
      if (input.stationId !== undefined) parts.push(sql`station_id = ${input.stationId}`);
      const whereClause = sql`WHERE ${sql.join(parts, sql` AND `)}`;
      const result = await db.execute(sql`
        SELECT plan_date AS "planDate",
               station_id AS "stationId",
               SUM(planned_hours) AS "plannedHours",
               SUM(planned_units) AS "plannedUnits"
        FROM mes_capacity_plans
        ${whereClause}
        GROUP BY plan_date, station_id
        ORDER BY plan_date ASC, station_id ASC
      `);
      return (result as any).rows ?? result;
    }),

  updateCapacityPlan: requirePermission('mfg:capacity:manage')
    .input(z.object({
      id: flexibleId,
      actualHours: z.number().optional(),
      actualUnits: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const sets: ReturnType<typeof sql>[] = [sql`updated_at = NOW()`];
      if (input.actualHours !== undefined) sets.push(sql`actual_hours = ${input.actualHours}`);
      if (input.actualUnits !== undefined) sets.push(sql`actual_units = ${input.actualUnits}`);
      const result = await db.execute(sql`
        UPDATE mes_capacity_plans
        SET ${sql.join(sets, sql`, `)},
            utilization_pct = CASE WHEN planned_hours > 0
              THEN ROUND(COALESCE(${input.actualHours ?? null}::NUMERIC, actual_hours) / planned_hours * 100, 2)
              ELSE 0 END
        WHERE id = ${String(input.id)}
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  // ── Equipment Downtime (5) ────────────────────────────────────────────

  recordDowntime: requirePermission('mfg:downtime:manage')
    .input(z.object({
      equipmentId: z.number(),
      stationId: z.number().optional(),
      downtimeType: z.string(),
      rootCause: z.string().optional(),
      rootCauseCategory: z.string().optional(),
      impactedWorkOrders: z.any().optional(),
      reportedBy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const result = await db.execute(sql`
        INSERT INTO mes_equipment_downtime
          (equipment_id, station_id, downtime_type, start_at, root_cause,
           root_cause_category, impacted_work_orders, reported_by, created_at, updated_at)
        VALUES
          (${input.equipmentId}, ${input.stationId ?? null}, ${input.downtimeType},
           NOW(), ${input.rootCause ?? null}, ${input.rootCauseCategory ?? null},
           ${input.impactedWorkOrders ? JSON.stringify(input.impactedWorkOrders) : null}::jsonb,
           ${input.reportedBy ?? null}, NOW(), NOW())
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  endDowntime: requirePermission('mfg:downtime:manage')
    .input(z.object({
      id: flexibleId,
      resolution: z.string().optional(),
      resolvedBy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const result = await db.execute(sql`
        UPDATE mes_equipment_downtime
        SET end_at = NOW(),
            duration_minutes = EXTRACT(EPOCH FROM NOW() - start_at)::INTEGER / 60,
            resolution = ${input.resolution ?? null},
            resolved_by = ${input.resolvedBy ?? null},
            updated_at = NOW()
        WHERE id = ${String(input.id)}
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  listDowntime: protectedProcedure
    .input(z.object({
      equipmentId: z.number().optional(),
      stationId: z.number().optional(),
      downtimeType: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const parts: ReturnType<typeof sql>[] = [];
      if (input.equipmentId !== undefined) parts.push(sql`equipment_id = ${input.equipmentId}`);
      if (input.stationId !== undefined) parts.push(sql`station_id = ${input.stationId}`);
      if (input.downtimeType) parts.push(sql`downtime_type = ${input.downtimeType}`);
      if (input.dateFrom) parts.push(sql`start_at >= ${input.dateFrom}`);
      if (input.dateTo) parts.push(sql`start_at <= ${input.dateTo}`);
      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT id, equipment_id AS "equipmentId", station_id AS "stationId",
               downtime_type AS "downtimeType", start_at AS "startAt",
               end_at AS "endAt", duration_minutes AS "durationMinutes",
               root_cause AS "rootCause", root_cause_category AS "rootCauseCategory",
               impacted_work_orders AS "impactedWorkOrders",
               reported_by AS "reportedBy", resolved_by AS "resolvedBy",
               resolution, created_at AS "createdAt"
        FROM mes_equipment_downtime
        ${whereClause}
        ORDER BY start_at DESC
        LIMIT ${input.limit}
      `);
      return (result as any).rows ?? result;
    }),

  getDowntimeStats: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      groupBy: z.enum(['type', 'equipment', 'station']).default('type'),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const parts: ReturnType<typeof sql>[] = [];
      if (input.dateFrom) parts.push(sql`start_at >= ${input.dateFrom}`);
      if (input.dateTo) parts.push(sql`start_at <= ${input.dateTo}`);
      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const groupCol =
        input.groupBy === 'equipment' ? sql`equipment_id` :
        input.groupBy === 'station' ? sql`station_id` :
        sql`downtime_type`;
      const groupAlias =
        input.groupBy === 'equipment' ? sql`equipment_id AS "groupKey"` :
        input.groupBy === 'station' ? sql`station_id AS "groupKey"` :
        sql`downtime_type AS "groupKey"`;
      const result = await db.execute(sql`
        SELECT ${groupAlias},
               COUNT(*) AS "incidentCount",
               SUM(duration_minutes) AS "totalDurationMinutes",
               AVG(duration_minutes) AS "avgDurationMinutes",
               MAX(duration_minutes) AS "maxDurationMinutes"
        FROM mes_equipment_downtime
        ${whereClause}
        GROUP BY ${groupCol}
        ORDER BY "totalDurationMinutes" DESC
      `);
      return (result as any).rows ?? result;
    }),

  getAvailabilityTrend: protectedProcedure
    .input(z.object({
      equipmentId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const equipFilter = input.equipmentId !== undefined
        ? sql`AND equipment_id = ${input.equipmentId}`
        : sql``;
      const result = await db.execute(sql`
        SELECT d.day AS "date",
               1440 - COALESCE(SUM(dt.duration_minutes), 0) AS "availableMinutes",
               COALESCE(SUM(dt.duration_minutes), 0) AS "downtimeMinutes",
               ROUND((1440 - COALESCE(SUM(dt.duration_minutes), 0))::NUMERIC / 1440 * 100, 2) AS "availabilityPct"
        FROM generate_series(
          CURRENT_DATE - INTERVAL '1 day' * ${input.days},
          CURRENT_DATE,
          '1 day'::interval
        ) AS d(day)
        LEFT JOIN mes_equipment_downtime dt
          ON DATE(dt.start_at) = d.day ${equipFilter}
        GROUP BY d.day
        ORDER BY d.day ASC
      `);
      return (result as any).rows ?? result;
    }),

  // ── Defect Root Cause Analysis (5) ────────────────────────────────────

  createDefectAnalysis: requirePermission('mfg:mes:dispatch')
    .input(z.object({
      qualityCheckId: z.number(),
      workOrderId: z.number().optional(),
      stationId: z.number(),
      defectCode: z.string().optional(),
      rootCauseCategory: z.string(),
      rootCauseDetail: z.string(),
      severity: z.string().optional(),
      assignedTo: z.number().optional(),
      assignedToName: z.string().optional(),
      fiveWhyChain: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const result = await db.execute(sql`
        INSERT INTO mes_defect_analysis
          (quality_check_id, work_order_id, station_id, defect_code,
           root_cause_category, root_cause_detail, severity,
           assigned_to, assigned_to_name, five_why_chain,
           status, created_at, updated_at)
        VALUES
          (${input.qualityCheckId}, ${input.workOrderId ?? null}, ${input.stationId},
           ${input.defectCode ?? null}, ${input.rootCauseCategory}, ${input.rootCauseDetail},
           ${input.severity ?? null}, ${input.assignedTo ?? null},
           ${input.assignedToName ?? null},
           ${input.fiveWhyChain ? JSON.stringify(input.fiveWhyChain) : null}::jsonb,
           'open', NOW(), NOW())
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  updateDefectAnalysis: requirePermission('mfg:mes:dispatch')
    .input(z.object({
      id: flexibleId,
      correctiveAction: z.string().optional(),
      correctiveActionDueDate: z.string().optional(),
      preventiveAction: z.string().optional(),
      preventiveActionDueDate: z.string().optional(),
      status: z.string().optional(),
      fiveWhyChain: z.any().optional(),
      closedBy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const sets: ReturnType<typeof sql>[] = [sql`updated_at = NOW()`];
      if (input.correctiveAction !== undefined) sets.push(sql`corrective_action = ${input.correctiveAction}`);
      if (input.correctiveActionDueDate !== undefined) sets.push(sql`corrective_action_due_date = ${input.correctiveActionDueDate}`);
      if (input.preventiveAction !== undefined) sets.push(sql`preventive_action = ${input.preventiveAction}`);
      if (input.preventiveActionDueDate !== undefined) sets.push(sql`preventive_action_due_date = ${input.preventiveActionDueDate}`);
      if (input.fiveWhyChain !== undefined) sets.push(sql`five_why_chain = ${JSON.stringify(input.fiveWhyChain)}::jsonb`);
      if (input.status) {
        sets.push(sql`status = ${input.status}`);
        if (input.status === 'closed') {
          sets.push(sql`closed_at = NOW()`);
          if (input.closedBy !== undefined) sets.push(sql`closed_by = ${input.closedBy}`);
        }
      }
      const result = await db.execute(sql`
        UPDATE mes_defect_analysis
        SET ${sql.join(sets, sql`, `)}
        WHERE id = ${String(input.id)}
        RETURNING *
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  listDefectsByStation: protectedProcedure
    .input(z.object({
      stationId: z.number(),
      status: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const parts: ReturnType<typeof sql>[] = [sql`station_id = ${input.stationId}`];
      if (input.status) parts.push(sql`status = ${input.status}`);
      if (input.dateFrom) parts.push(sql`created_at >= ${input.dateFrom}`);
      if (input.dateTo) parts.push(sql`created_at <= ${input.dateTo}`);
      const whereClause = sql`WHERE ${sql.join(parts, sql` AND `)}`;
      const result = await db.execute(sql`
        SELECT id, quality_check_id AS "qualityCheckId",
               work_order_id AS "workOrderId", station_id AS "stationId",
               defect_code AS "defectCode", defect_description AS "defectDescription",
               root_cause_category AS "rootCauseCategory",
               root_cause_detail AS "rootCauseDetail",
               ishikawa_branch AS "ishikawaBranch",
               five_why_chain AS "fiveWhyChain",
               corrective_action AS "correctiveAction",
               corrective_action_due_date AS "correctiveActionDueDate",
               preventive_action AS "preventiveAction",
               preventive_action_due_date AS "preventiveActionDueDate",
               status, severity,
               assigned_to AS "assignedTo",
               assigned_to_name AS "assignedToName",
               closed_by AS "closedBy", closed_at AS "closedAt",
               created_at AS "createdAt"
        FROM mes_defect_analysis
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${input.limit}
      `);
      return (result as any).rows ?? result;
    }),

  getDefectPareto: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      stationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const parts: ReturnType<typeof sql>[] = [];
      if (input.dateFrom) parts.push(sql`created_at >= ${input.dateFrom}`);
      if (input.dateTo) parts.push(sql`created_at <= ${input.dateTo}`);
      if (input.stationId !== undefined) parts.push(sql`station_id = ${input.stationId}`);
      const whereClause = parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT defect_code AS "defectCode",
               root_cause_category AS "rootCauseCategory",
               COUNT(*) AS "count",
               SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS "openCount",
               SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS "closedCount"
        FROM mes_defect_analysis
        ${whereClause}
        GROUP BY defect_code, root_cause_category
        ORDER BY COUNT(*) DESC
        LIMIT 20
      `);
      return (result as any).rows ?? result;
    }),

  get5WhyChain: protectedProcedure
    .input(z.object({ id: flexibleId }))
    .query(async ({ input }) => {
      const db = await requireDb();
      await ensureCapacityTables(db);
      const result = await db.execute(sql`
        SELECT da.id, da.quality_check_id AS "qualityCheckId",
               da.work_order_id AS "workOrderId",
               da.station_id AS "stationId",
               da.defect_code AS "defectCode",
               da.root_cause_category AS "rootCauseCategory",
               da.root_cause_detail AS "rootCauseDetail",
               da.ishikawa_branch AS "ishikawaBranch",
               da.five_why_chain AS "fiveWhyChain",
               da.corrective_action AS "correctiveAction",
               da.preventive_action AS "preventiveAction",
               da.status, da.severity,
               da.assigned_to_name AS "assignedToName",
               qc.check_type AS "checkType",
               qc.result AS "qcResult",
               qc.defect_codes AS "qcDefectCodes"
        FROM mes_defect_analysis da
        LEFT JOIN mes_quality_checks qc ON qc.id = da.quality_check_id
        WHERE da.id = ${String(input.id)}
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  deleteDispatch: requirePermission('mfg:mes:dispatch')
    .input(z.object({ id: flexibleId }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = String(input.id);
      await db.execute(sql`DELETE FROM mes_quality_checks WHERE dispatch_id = ${id}`);
      await db.execute(sql`DELETE FROM mes_dispatches WHERE id = ${id}`);
      return { success: true, message: "派工单已删除" };
    }),
});
