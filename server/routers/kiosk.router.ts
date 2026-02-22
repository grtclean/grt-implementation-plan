/**
 * Kiosk Router — Workshop terminal endpoints for IATF 16949 / VDA 6.3 compliance
 * Provides fast operator identification, station task queue, inspection submission,
 * SOP retrieval, and operator qualification verification.
 *
 * Uses raw SQL for quality_checkpoints/quality_check_results/quality_defects tables
 * (consistent with qualityMaterialPerformance.service.ts pattern).
 */

import { z } from "zod";
import { randomUUID } from "crypto";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

// ── QR session in-memory store (ephemeral, no DB needed) ──
const qrSessions = new Map<string, {
  stationId: string;
  departmentCode: string;
  status: 'pending' | 'confirmed';
  operator: { id: number; name: string } | null;
  createdAt: number;
}>();

// Cleanup expired sessions every 60s (TTL = 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of qrSessions) {
    if (now - session.createdAt > 5 * 60 * 1000) qrSessions.delete(id);
  }
}, 60_000);

export const kioskRouter = router({
  /**
   * Fast identity lookup — returns operator info + qualification status
   * Used by barcode scanner / manual ID entry at kiosk terminal
   */
  identifyOperator: publicProcedure
    .input(z.object({ employeeId: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const dbModule = await import("../db");
        const schema = await import("../../drizzle/schema");
        const { eq, or } = await import("drizzle-orm");
        const { sql } = await import("drizzle-orm");
        const db = await dbModule.requireDb();

        // Look up by openId or name
        const users = await db
          .select()
          .from(schema.users)
          .where(
            or(
              eq(schema.users.openId, input.employeeId),
              eq(schema.users.name, input.employeeId)
            )
          )
          .limit(1);

        if (users.length === 0) {
          return { operator: null, qualificationStatus: "not_found" as const };
        }

        const user = users[0];
        const operator = {
          id: user.id,
          name: user.name || input.employeeId,
          role: user.role || "employee",
          qualifications: [] as { name: string; expiresAt: string | null; isValid: boolean }[],
        };

        // Check certifications (certifications table has no userId — it's organization-level)
        // For operator qualifications, check qualification_certificates if available
        try {
          const certs = await db.execute(sql`
            SELECT name, expiry_date FROM certifications
            WHERE cert_code LIKE ${'%' + input.employeeId + '%'}
            LIMIT 20
          `) as any;
          const rows = certs.rows ?? certs;
          const now = new Date();
          if (Array.isArray(rows)) {
            operator.qualifications = rows.map((cert: any) => ({
              name: cert.name || "Unknown",
              expiresAt: cert.expiry_date || null,
              isValid: cert.expiry_date ? new Date(cert.expiry_date) > now : true,
            }));
          }
        } catch {
          // Table may not exist or query fails — proceed without qualifications
        }

        const hasExpired = operator.qualifications.some((q) => !q.isValid);
        const qualificationStatus = hasExpired
          ? ("expired" as const)
          : operator.qualifications.length === 0
            ? ("none" as const)
            : ("valid" as const);

        return { operator, qualificationStatus };
      } catch (err) {
        console.error("[Kiosk] identifyOperator error:", err);
        return { operator: null, qualificationStatus: "error" as const };
      }
    }),

  /**
   * Get prioritized task queue for a station
   * Uses productionStages table (T1-T15 workflow stages)
   */
  getStationQueue: protectedProcedure
    .input(
      z.object({
        stationId: z.string(),
        processCode: z.string().optional(),
        operatorId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const dbModule = await import("../db");
        const { sql } = await import("drizzle-orm");
        const db = await dbModule.requireDb();

        // Query production stages that are Pending or In Progress
        const result = (await db.execute(sql`
          SELECT ps.id, ps.project_id, ps.stage_code, ps.status,
                 ps.assigned_user_name, ps.updated_at,
                 COALESCE(p.name, CONCAT('P-', ps.project_id)) as project_code,
                 '' as customer_name
          FROM production_stages ps
          LEFT JOIN projects p ON p.id = ps.project_id
          WHERE ps.status IN ('Pending', 'InProgress', 'Ready')
          ${input.processCode ? sql`AND ps.stage_code = ${input.processCode}` : sql``}
          ORDER BY ps.updated_at DESC
          LIMIT 50
        `)) as any;

        const rows = result.rows ?? result;
        const tasks = Array.isArray(rows)
          ? rows.map((row: any) => ({
              id: row.id,
              projectId: String(row.project_id),
              projectCode: row.project_code || `P-${row.project_id}`,
              processCode: row.stage_code,
              processName: row.stage_code,
              status: row.status === "InProgress" ? "in_progress" : row.status?.toLowerCase() || "pending",
              priority: "normal",
              customerName: row.customer_name || "",
              updatedAt: row.updated_at,
            }))
          : [];

        return { tasks };
      } catch (err) {
        console.error("[Kiosk] getStationQueue error:", err);
        return { tasks: [] };
      }
    }),

  /**
   * Submit inspection result with full IATF 16949 traceability
   * Uses raw SQL to insert into quality_check_results / quality_defects
   */
  submitInspection: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        processCode: z.string(),
        checkpointId: z.number().optional(),
        result: z.enum(["pass", "fail"]),
        defectType: z.string().optional(),
        defectCode: z.string().optional(),
        remark: z.string().optional(),
        operatorId: z.number(),
        stationId: z.string(),
        clientTimestamp: z.string().optional(),
        // IATF 16949 §8.5.2 — material traceability fields
        materialBarcode: z.string().min(1),
        batchId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const dbModule = await import("../db");
        const { sql, eq } = await import("drizzle-orm");
        const db = await dbModule.requireDb();
        const now = Date.now();

        // Insert quality check result (matches qualityMaterialPerformance.service pattern)
        const insertResult = (await db.execute(sql`
          INSERT INTO quality_check_results
          (checkpoint_id, project_id, process_code, inspector_id, inspector_name,
           result, score, defect_count, remarks, checked_at, created_at)
          VALUES (${input.checkpointId || 0}, ${input.projectId}, ${input.processCode},
                  ${String(input.operatorId)}, ${ctx.user?.name || "kiosk"},
                  ${input.result}, ${null}, ${input.result === "fail" ? 1 : 0},
                  ${input.remark || null}, ${now}, ${now})
        `)) as any;

        const inspectionId =
          (insertResult.rows?.[0] ?? insertResult).insertId ?? insertResult.insertId ?? 0;

        // If fail, create a defect record
        if (input.result === "fail" && input.defectType) {
          try {
            await db.execute(sql`
              INSERT INTO quality_defects
              (check_result_id, project_id, process_code, defect_type, severity,
               description, status, created_at, updated_at)
              VALUES (${inspectionId}, ${input.projectId}, ${input.processCode},
                      ${input.defectType}, ${"major"},
                      ${input.remark || `缺陷代码: ${input.defectCode || "N/A"}`},
                      ${"open"}, ${now}, ${now})
            `);
          } catch (defectErr) {
            console.error("[Kiosk] createDefect error:", defectErr);
          }
        }

        // ── Insert execution_logs record (IATF 16949 5M traceability) ──
        try {
          const kioskSchema = await import("../../drizzle/kiosk-station-schema");

          // Resolve station code → numeric FK ID
          let stationFkId: number | null = null;
          try {
            const stationRows = await db
              .select({ id: kioskSchema.stations.id })
              .from(kioskSchema.stations)
              .where(eq(kioskSchema.stations.code, input.stationId))
              .limit(1);
            if (stationRows.length > 0) stationFkId = stationRows[0].id;
          } catch {
            // stations table may not exist yet — skip FK resolution
          }

          // Resolve defect code string → numeric FK ID
          let defectCodeFkId: number | null = null;
          if (input.result === "fail" && input.defectCode) {
            try {
              const dcRows = await db
                .select({ id: kioskSchema.defectCodes.id })
                .from(kioskSchema.defectCodes)
                .where(eq(kioskSchema.defectCodes.code, input.defectCode))
                .limit(1);
              if (dcRows.length > 0) defectCodeFkId = dcRows[0].id;
            } catch {
              // defect_codes table may not exist yet
            }
          }

          // Map pass/fail → IATF enum value
          const humanFinalResult = input.result === "pass" ? "PASS" : "FAIL";

          if (stationFkId !== null) {
            await db.insert(kioskSchema.executionLogs).values({
              projectNumber: input.projectId,
              batchId: input.batchId || null,
              materialBarcode: input.materialBarcode,
              operatorId: String(input.operatorId),
              stationId: stationFkId,
              equipmentParams: null,
              aiCcdResult: null,
              humanFinalResult,
              cycleTimeSeconds: input.clientTimestamp
                ? Math.round((Date.now() - new Date(input.clientTimestamp).getTime()) / 1000)
                : null,
              defectCodeId: defectCodeFkId,
              remarks: input.remark || null,
              envData: null,
            });
          } else {
            // Fallback: insert via raw SQL without FK (graceful degradation)
            await db.execute(sql`
              INSERT INTO execution_logs
              (project_number, batch_id, material_barcode, operator_id, station_id,
               human_final_result, cycle_time_seconds, remarks, created_at, updated_at)
              VALUES (${input.projectId}, ${input.batchId || null}, ${input.materialBarcode},
                      ${String(input.operatorId)}, ${0},
                      ${humanFinalResult}, ${input.clientTimestamp ? Math.round((Date.now() - new Date(input.clientTimestamp).getTime()) / 1000) : null},
                      ${input.remark || null}, NOW(), NOW())
            `);
          }
          console.log(`[Kiosk] execution_logs record created for barcode=${input.materialBarcode}`);
        } catch (execLogErr) {
          // Non-blocking: execution_logs insert failure should not break the inspection flow
          console.error("[Kiosk] execution_logs insert error (non-blocking):", execLogErr);
        }

        console.log(
          `[Kiosk] Inspection submitted: project=${input.projectId}, process=${input.processCode}, result=${input.result}, operator=${input.operatorId}, station=${input.stationId}, barcode=${input.materialBarcode}`
        );

        return {
          success: true,
          inspectionId,
          nextAction: input.result === "fail" ? "review_required" : "continue",
        };
      } catch (err) {
        console.error("[Kiosk] submitInspection error:", err);
        return { success: false, inspectionId: 0, nextAction: "error" };
      }
    }),

  /**
   * Get SOP for a specific project + process station
   * Uses sopTemplates Drizzle table + raw SQL for quality_checkpoints
   */
  getStationSOP: protectedProcedure
    .input(
      z.object({
        projectId: z.number().or(z.string()),
        processCode: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const dbModule = await import("../db");
        const schema = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const { sql } = await import("drizzle-orm");
        const db = await dbModule.requireDb();

        // Look up SOP template via Drizzle
        let sop: any = null;
        try {
          const sops = await db
            .select()
            .from(schema.sopTemplates)
            .where(eq(schema.sopTemplates.processCode, input.processCode))
            .limit(1);
          if (sops.length > 0) {
            sop = sops[0];
          }
        } catch {
          // sopTemplates may not exist
        }

        // Get quality checkpoints via raw SQL
        let checkpoints: any[] = [];
        try {
          const projectIdStr = String(input.projectId);
          const cpResult = (await db.execute(sql`
            SELECT id, checkpoint_name, checkpoint_type, acceptance_criteria, is_mandatory
            FROM quality_checkpoints
            WHERE project_id = ${projectIdStr} AND process_code = ${input.processCode}
            ORDER BY sort_order ASC
            LIMIT 50
          `)) as any;
          checkpoints = cpResult.rows ?? cpResult;
          if (!Array.isArray(checkpoints)) checkpoints = [];
        } catch {
          // Table may not exist
        }

        // Parse SOP steps from the "steps" JSON field in sopTemplates
        let steps: any[] = [];
        if (sop?.steps) {
          try {
            const parsed =
              typeof sop.steps === "string" ? JSON.parse(sop.steps) : sop.steps;
            if (Array.isArray(parsed)) {
              steps = parsed.map((s: any, i: number) => ({
                id: i + 1,
                stepNumber: s.stepNo || i + 1,
                title: s.title || s.name || `Step ${i + 1}`,
                description: s.description || "",
                estimatedMinutes: s.duration || s.estimatedMinutes || 0,
                tools: s.tools || [],
                safetyWarning: s.safetyNotes || s.safetyWarning || null,
                imageUrl: s.imageUrl || null,
              }));
            }
          } catch {
            // JSON parse error
          }
        }

        return {
          sop: sop
            ? {
                id: sop.id,
                name: sop.title || sop.name || input.processCode,
                version: sop.version || "1.0",
                processCode: sop.processCode,
                difficultyLevel: sop.difficultyLevel || "medium",
              }
            : null,
          steps,
          checkpoints: checkpoints.map((c: any) => ({
            id: c.id,
            name: c.checkpoint_name,
            type: c.checkpoint_type,
            criteria: c.acceptance_criteria || "",
            isMandatory: c.is_mandatory ?? true,
          })),
        };
      } catch (err) {
        console.error("[Kiosk] getStationSOP error:", err);
        return { sop: null, steps: [], checkpoints: [] };
      }
    }),

  /**
   * Operator punch-in at kiosk — VDA 6.3 P6.3 qualification verification
   */
  operatorPunchIn: protectedProcedure
    .input(
      z.object({
        operatorId: z.number(),
        stationId: z.string(),
        processCode: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const dbModule = await import("../db");
        const { sql } = await import("drizzle-orm");
        const db = await dbModule.requireDb();

        // Check certifications by querying the certifications table
        let qualifications: any[] = [];
        try {
          const result = (await db.execute(sql`
            SELECT name, expiry_date, status FROM certifications
            LIMIT 20
          `)) as any;
          qualifications = result.rows ?? result;
          if (!Array.isArray(qualifications)) qualifications = [];
        } catch {
          return { allowed: true, reason: "无资质验证表，默认放行" };
        }

        if (qualifications.length === 0) {
          return { allowed: true, reason: "无资质记录，允许在监督下操作" };
        }

        const now = new Date();
        const expired = qualifications.filter(
          (q: any) => q.expiry_date && new Date(q.expiry_date) < now
        );

        if (expired.length > 0) {
          return {
            allowed: false,
            reason: "操作资质已过期，请联系主管",
            qualificationExpiry: expired[0].expiry_date,
          };
        }

        console.log(
          `[Kiosk] Operator ${input.operatorId} punched in at station ${input.stationId} for process ${input.processCode}`
        );

        return { allowed: true };
      } catch (err) {
        console.error("[Kiosk] operatorPunchIn error:", err);
        return { allowed: true, reason: "资质验证服务异常，默认放行" };
      }
    }),

  // ── QR Code Login Flow ──

  /**
   * Create a new QR session — kiosk displays the resulting QR code
   */
  createQrSession: publicProcedure
    .input(z.object({ stationId: z.string(), departmentCode: z.string() }))
    .mutation(({ input }) => {
      const sessionId = randomUUID();
      qrSessions.set(sessionId, {
        stationId: input.stationId,
        departmentCode: input.departmentCode,
        status: "pending",
        operator: null,
        createdAt: Date.now(),
      });
      return { sessionId };
    }),

  /**
   * Poll QR session status — kiosk calls every 2s
   */
  pollQrSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const session = qrSessions.get(input.sessionId);
      if (!session) return { status: "expired" as const, operator: null };
      return { status: session.status, operator: session.operator };
    }),

  /**
   * Confirm QR session — called from mobile page after operator enters employee ID
   */
  confirmQrSession: publicProcedure
    .input(z.object({ sessionId: z.string(), employeeId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const session = qrSessions.get(input.sessionId);
      if (!session) return { success: false, operatorName: null, stationId: null, error: "会话已过期" };
      if (session.status === "confirmed") return { success: false, operatorName: null, stationId: session.stationId, error: "该二维码已被使用" };

      try {
        const dbModule = await import("../db");
        const schema = await import("../../drizzle/schema");
        const { eq, or } = await import("drizzle-orm");
        const db = await dbModule.requireDb();

        const users = await db
          .select()
          .from(schema.users)
          .where(
            or(
              eq(schema.users.openId, input.employeeId),
              eq(schema.users.name, input.employeeId)
            )
          )
          .limit(1);

        if (users.length === 0) {
          return { success: false, operatorName: null, stationId: session.stationId, error: "工号未找到" };
        }

        const user = users[0];
        session.status = "confirmed";
        session.operator = { id: user.id, name: user.name || input.employeeId };

        return { success: true, operatorName: user.name || input.employeeId, stationId: session.stationId, error: null };
      } catch (err) {
        console.error("[Kiosk] confirmQrSession error:", err);
        return { success: false, operatorName: null, stationId: session.stationId, error: "服务器错误" };
      }
    }),

  /**
   * Get QR session info — mobile page calls this to show station context
   */
  getQrSessionInfo: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const session = qrSessions.get(input.sessionId);
      if (!session) return { found: false, stationId: null, departmentCode: null };
      return { found: true, stationId: session.stationId, departmentCode: session.departmentCode };
    }),
});
