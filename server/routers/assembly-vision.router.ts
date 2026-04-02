import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

const flexibleId = z.union([z.string(), z.number()]);

export const assemblyVisionRouter = router({
  // ── Recordings ──────────────────────────────────────────────────────

  listRecordings: protectedProcedure
    .input(z.object({
      workOrderId: flexibleId.optional(),
      stationId: flexibleId.optional(),
      operatorId: flexibleId.optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      reviewStatus: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: string[] = [];
      if (input.workOrderId !== undefined) conditions.push(`ar.work_order_id = '${input.workOrderId}'`);
      if (input.stationId !== undefined) conditions.push(`ar.station_id = '${input.stationId}'`);
      if (input.operatorId !== undefined) conditions.push(`ar.operator_id = '${input.operatorId}'`);
      if (input.dateFrom) conditions.push(`ar.start_time >= '${input.dateFrom}'`);
      if (input.dateTo) conditions.push(`ar.start_time <= '${input.dateTo}'`);
      if (input.reviewStatus) conditions.push(`ar.review_status = '${input.reviewStatus}'`);
      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const lim = input.limit;
      const result = await db.execute(sql.raw(`
        SELECT ar.id, ar.camera_id AS "cameraId", ar.work_order_id AS "workOrderId",
               ar.station_id AS "stationId", ar.operator_id AS "operatorId",
               ar.operator_name AS "operatorName", ar.sop_step_code AS "sopStepCode",
               ar.start_time AS "startTime", ar.end_time AS "endTime",
               ar.duration_seconds AS "durationSeconds",
               ar.actual_time_seconds AS "actualTimeSeconds",
               ar.standard_time_seconds AS "standardTimeSeconds",
               ar.deviation_percent AS "deviationPercent",
               ar.review_status AS "reviewStatus", ar.reviewed_by AS "reviewedBy",
               ar.created_at AS "createdAt"
        FROM assembly_recordings ar
        ${where}
        ORDER BY ar.start_time DESC
        LIMIT ${lim}
      `));
      return (result as any).rows ?? result;
    }),

  getRecording: protectedProcedure
    .input(z.object({ id: flexibleId }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT ar.id, ar.camera_id AS "cameraId", ar.work_order_id AS "workOrderId",
               ar.station_id AS "stationId", ar.operator_id AS "operatorId",
               ar.operator_name AS "operatorName", ar.sop_step_code AS "sopStepCode",
               ar.start_time AS "startTime", ar.end_time AS "endTime",
               ar.duration_seconds AS "durationSeconds",
               ar.actual_time_seconds AS "actualTimeSeconds",
               ar.standard_time_seconds AS "standardTimeSeconds",
               ar.deviation_percent AS "deviationPercent",
               ar.review_status AS "reviewStatus", ar.reviewed_by AS "reviewedBy",
               ar.created_at AS "createdAt",
               c.name AS "cameraName", c.location AS "cameraLocation"
        FROM assembly_recordings ar
        LEFT JOIN cameras c ON c.id = ar.camera_id
        WHERE ar.id = ${String(input.id)}
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  startRecording: requirePermission('mfg:camera:recording')
    .input(z.object({
      cameraId: z.number(),
      workOrderId: z.string(),
      stationId: z.number(),
      operatorId: z.number(),
      operatorName: z.string(),
      sopStepCode: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO assembly_recordings
          (camera_id, work_order_id, station_id, operator_id, operator_name, sop_step_code, start_time, review_status, created_at)
        VALUES
          (${input.cameraId}, ${input.workOrderId}, ${input.stationId},
           ${input.operatorId}, ${input.operatorName}, ${input.sopStepCode},
           NOW(), 'pending', NOW())
        RETURNING id, 'recording' AS status
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? { id: null, status: "recording" };
    }),

  stopRecording: requirePermission('mfg:camera:recording')
    .input(z.object({ id: flexibleId }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        UPDATE assembly_recordings
        SET end_time = NOW(),
            duration_seconds = EXTRACT(EPOCH FROM NOW() - start_time),
            actual_time_seconds = EXTRACT(EPOCH FROM NOW() - start_time)
        WHERE id = ${String(input.id)}
        RETURNING id, start_time AS "startTime", end_time AS "endTime",
                  duration_seconds AS "durationSeconds"
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  // ── Analysis ────────────────────────────────────────────────────────

  analyzeRecording: protectedProcedure
    .input(z.object({ id: flexibleId }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Calculate deviation and persist
      const result = await db.execute(sql`
        UPDATE assembly_recordings
        SET deviation_percent = CASE
              WHEN standard_time_seconds > 0
              THEN ROUND(((actual_time_seconds - standard_time_seconds) / standard_time_seconds * 100)::numeric, 2)
              ELSE 0
            END
        WHERE id = ${String(input.id)}
        RETURNING id, sop_step_code AS "sopStepCode",
                  actual_time_seconds AS "actualTimeSeconds",
                  standard_time_seconds AS "standardTimeSeconds",
                  deviation_percent AS "deviationPercent"
      `);
      const rows = (result as any).rows ?? result;
      return rows[0] ?? null;
    }),

  getStandardTimes: protectedProcedure
    .input(z.object({
      stationId: flexibleId.optional(),
      sopStepCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: string[] = [];
      if (input.stationId !== undefined) conditions.push(`station_id = '${input.stationId}'`);
      if (input.sopStepCode) conditions.push(`sop_step_code = '${input.sopStepCode}'`);
      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} AND standard_time_seconds IS NOT NULL` : "WHERE standard_time_seconds IS NOT NULL";
      const result = await db.execute(sql.raw(`
        SELECT sop_step_code AS "sopStepCode",
               AVG(standard_time_seconds) AS "avgStandardTime",
               COUNT(*) AS "sampleCount"
        FROM assembly_recordings
        ${where}
        GROUP BY sop_step_code
        ORDER BY sop_step_code
      `));
      return (result as any).rows ?? result;
    }),

  updateStandardTime: requirePermission('mfg:assembly:manage')
    .input(z.object({
      id: flexibleId,
      standardTimeSeconds: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        UPDATE assembly_recordings
        SET standard_time_seconds = ${input.standardTimeSeconds}
        WHERE id = ${String(input.id)}
      `);
      return { success: true };
    }),

  // ── Efficiency ──────────────────────────────────────────────────────

  getOperatorEfficiency: protectedProcedure
    .input(z.object({
      operatorId: flexibleId,
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const lim = input.limit;
      const result = await db.execute(sql.raw(`
        SELECT id, sop_step_code AS "sopStepCode",
               actual_time_seconds AS "actualTimeSeconds",
               standard_time_seconds AS "standardTimeSeconds",
               deviation_percent AS "deviationPercent",
               start_time AS "startTime"
        FROM assembly_recordings
        WHERE operator_id = '${input.operatorId}'
          AND actual_time_seconds IS NOT NULL
        ORDER BY start_time DESC
        LIMIT ${lim}
      `));
      const rows = (result as any).rows ?? result;
      const deviations = (rows as any[]).filter((r: any) => r.deviationPercent !== null).map((r: any) => Number(r.deviationPercent));
      const avgDeviation = deviations.length > 0 ? deviations.reduce((a: number, b: number) => a + b, 0) / deviations.length : 0;
      return {
        operatorId: input.operatorId,
        recordings: rows,
        avgDeviationPercent: Math.round(avgDeviation * 100) / 100,
        sampleCount: deviations.length,
        trend: deviations.length >= 2 ? (deviations[0] < deviations[deviations.length - 1] ? "improving" : "declining") : "insufficient_data",
      };
    }),

  getStationEfficiency: protectedProcedure
    .input(z.object({
      stationId: flexibleId,
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const lim = input.limit;
      const result = await db.execute(sql.raw(`
        SELECT id, operator_id AS "operatorId", operator_name AS "operatorName",
               sop_step_code AS "sopStepCode",
               actual_time_seconds AS "actualTimeSeconds",
               standard_time_seconds AS "standardTimeSeconds",
               deviation_percent AS "deviationPercent",
               start_time AS "startTime"
        FROM assembly_recordings
        WHERE station_id = '${input.stationId}'
          AND actual_time_seconds IS NOT NULL
        ORDER BY start_time DESC
        LIMIT ${lim}
      `));
      const rows = (result as any).rows ?? result;
      const deviations = (rows as any[]).filter((r: any) => r.deviationPercent !== null).map((r: any) => Number(r.deviationPercent));
      const avgDeviation = deviations.length > 0 ? deviations.reduce((a: number, b: number) => a + b, 0) / deviations.length : 0;
      return {
        stationId: input.stationId,
        recordings: rows,
        avgDeviationPercent: Math.round(avgDeviation * 100) / 100,
        sampleCount: deviations.length,
        trend: deviations.length >= 2 ? (deviations[0] < deviations[deviations.length - 1] ? "improving" : "declining") : "insufficient_data",
      };
    }),

  compareOperators: protectedProcedure
    .input(z.object({
      operatorIds: z.array(z.number()),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const idList = input.operatorIds.join(",");
      const conditions: string[] = [`operator_id IN (${idList})`, "actual_time_seconds IS NOT NULL"];
      if (input.dateFrom) conditions.push(`start_time >= '${input.dateFrom}'`);
      if (input.dateTo) conditions.push(`start_time <= '${input.dateTo}'`);
      const where = conditions.join(" AND ");
      const result = await db.execute(sql.raw(`
        SELECT operator_id AS "operatorId", operator_name AS "operatorName",
               COUNT(*) AS "recordingCount",
               AVG(actual_time_seconds) AS "avgActualTime",
               AVG(deviation_percent) AS "avgDeviationPercent",
               MIN(deviation_percent) AS "bestDeviation",
               MAX(deviation_percent) AS "worstDeviation"
        FROM assembly_recordings
        WHERE ${where}
        GROUP BY operator_id, operator_name
        ORDER BY AVG(deviation_percent) ASC
      `));
      return (result as any).rows ?? result;
    }),

  // ── Review ──────────────────────────────────────────────────────────

  flagRecording: requirePermission('mfg:assembly:review')
    .input(z.object({
      id: flexibleId,
      reviewStatus: z.literal("flagged"),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        UPDATE assembly_recordings
        SET review_status = 'flagged'
        WHERE id = ${String(input.id)}
      `);
      return { success: true, reviewStatus: "flagged" };
    }),

  reviewRecording: requirePermission('mfg:assembly:review')
    .input(z.object({
      id: flexibleId,
      reviewStatus: z.literal("reviewed"),
      reviewedBy: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        UPDATE assembly_recordings
        SET review_status = 'reviewed',
            reviewed_by = ${input.reviewedBy}
        WHERE id = ${String(input.id)}
      `);
      return { success: true, reviewStatus: "reviewed", reviewedBy: input.reviewedBy };
    }),

  // ── Timeline ────────────────────────────────────────────────────────

  getAssemblyTimeline: protectedProcedure
    .input(z.object({ workOrderId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT ar.id, ar.sop_step_code AS "sopStepCode",
               ar.station_id AS "stationId",
               ar.operator_id AS "operatorId", ar.operator_name AS "operatorName",
               ar.start_time AS "startTime", ar.end_time AS "endTime",
               ar.duration_seconds AS "durationSeconds",
               ar.actual_time_seconds AS "actualTimeSeconds",
               ar.standard_time_seconds AS "standardTimeSeconds",
               ar.deviation_percent AS "deviationPercent",
               ar.review_status AS "reviewStatus",
               c.name AS "cameraName"
        FROM assembly_recordings ar
        LEFT JOIN cameras c ON c.id = ar.camera_id
        WHERE ar.work_order_id = ${input.workOrderId}
        ORDER BY ar.start_time ASC
      `);
      const rows = (result as any).rows ?? result;
      const totalDuration = (rows as any[]).reduce((sum: number, r: any) => sum + (Number(r.durationSeconds) || 0), 0);
      return {
        workOrderId: input.workOrderId,
        steps: rows,
        totalSteps: (rows as any[]).length,
        totalDurationSeconds: totalDuration,
      };
    }),

  // ── Export ──────────────────────────────────────────────────────────

  exportTimeStudy: protectedProcedure
    .input(z.object({
      workOrderId: z.string().optional(),
      stationId: flexibleId.optional(),
      operatorId: flexibleId.optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: string[] = ["actual_time_seconds IS NOT NULL"];
      if (input.workOrderId) conditions.push(`work_order_id = '${input.workOrderId}'`);
      if (input.stationId !== undefined) conditions.push(`station_id = '${input.stationId}'`);
      if (input.operatorId !== undefined) conditions.push(`operator_id = '${input.operatorId}'`);
      const where = conditions.join(" AND ");
      const result = await db.execute(sql.raw(`
        SELECT id, work_order_id AS "workOrderId", station_id AS "stationId",
               operator_id AS "operatorId", operator_name AS "operatorName",
               sop_step_code AS "sopStepCode",
               start_time AS "startTime", end_time AS "endTime",
               duration_seconds AS "durationSeconds",
               actual_time_seconds AS "actualTimeSeconds",
               standard_time_seconds AS "standardTimeSeconds",
               deviation_percent AS "deviationPercent",
               review_status AS "reviewStatus"
        FROM assembly_recordings
        WHERE ${where}
        ORDER BY start_time ASC
        LIMIT 500
      `));
      const rows = (result as any).rows ?? result;
      return {
        columns: [
          "ID", "Work Order", "Station", "Operator ID", "Operator Name",
          "SOP Step", "Start Time", "End Time", "Duration (s)",
          "Actual Time (s)", "Standard Time (s)", "Deviation %", "Review Status",
        ],
        rows: (rows as any[]).map((r: any) => [
          r.id, r.workOrderId, r.stationId, r.operatorId, r.operatorName,
          r.sopStepCode, r.startTime, r.endTime, r.durationSeconds,
          r.actualTimeSeconds, r.standardTimeSeconds, r.deviationPercent,
          r.reviewStatus,
        ]),
        exportedAt: new Date().toISOString(),
      };
    }),

  // ── Dashboard ───────────────────────────────────────────────────────

  assemblyVisionDashboard: protectedProcedure
    .query(async () => {
      const db = await requireDb();

      const totalResult = await db.execute(sql`
        SELECT COUNT(*) AS "totalRecordings" FROM assembly_recordings
      `);
      const totalRows = (totalResult as any).rows ?? totalResult;
      const totalRecordings = Number((totalRows as any[])[0]?.totalRecordings ?? 0);

      const avgResult = await db.execute(sql`
        SELECT AVG(deviation_percent) AS "avgDeviation"
        FROM assembly_recordings
        WHERE deviation_percent IS NOT NULL
      `);
      const avgRows = (avgResult as any).rows ?? avgResult;
      const avgDeviation = Math.round(Number((avgRows as any[])[0]?.avgDeviation ?? 0) * 100) / 100;

      const flaggedResult = await db.execute(sql`
        SELECT COUNT(*) AS "flaggedCount"
        FROM assembly_recordings
        WHERE review_status = 'flagged'
      `);
      const flaggedRows = (flaggedResult as any).rows ?? flaggedResult;
      const flaggedCount = Number((flaggedRows as any[])[0]?.flaggedCount ?? 0);

      const todayResult = await db.execute(sql`
        SELECT COUNT(*) AS "todayCount"
        FROM assembly_recordings
        WHERE DATE(start_time) = CURRENT_DATE
      `);
      const todayRows = (todayResult as any).rows ?? todayResult;
      const recordingsToday = Number((todayRows as any[])[0]?.todayCount ?? 0);

      const topResult = await db.execute(sql`
        SELECT operator_id AS "operatorId", operator_name AS "operatorName",
               AVG(deviation_percent) AS "avgDeviation",
               COUNT(*) AS "recordingCount"
        FROM assembly_recordings
        WHERE deviation_percent IS NOT NULL
        GROUP BY operator_id, operator_name
        ORDER BY AVG(ABS(deviation_percent)) ASC
        LIMIT 5
      `);
      const topOperators = (topResult as any).rows ?? topResult;

      return {
        totalRecordings,
        avgDeviationPercent: avgDeviation,
        flaggedCount,
        recordingsToday,
        topOperators,
      };
    }),
});
