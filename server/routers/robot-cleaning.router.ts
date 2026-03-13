/**
 * Robot Cleaning Performance Router
 *
 * Closed-loop adaptive cleaning control + oiling torque monitoring + performance accounting.
 * 4 sub-routers: robotCleaning, oilingTorque, techPerformance, showroom (public demo).
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  robotCleaningActions,
  oilingTorqueRecords,
  techPerformanceEntries,
} from "../../drizzle/robot-cleaning-performance-schema";
import { eq, desc, and, sql, count, gte, lte, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("robot-cleaning-router");

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => (typeof id === "string" ? parseInt(id, 10) : id);

// ──── Sub-router 1: Robot Cleaning ────

const robotCleaningSubRouter = router({
  record: requirePermission("mfg:robot-cleaning:manage")
    .input(
      z.object({
        projectId: z.number().optional(),
        processTrialId: z.number().optional(),
        equipmentId: z.number().optional(),
        robotCode: z.string().min(1).max(50),
        stationCode: z.string().max(50).optional(),
        pressureBar: z.number().optional(),
        nozzleAngleDeg: z.number().optional(),
        flowRateLpm: z.number().optional(),
        temperatureC: z.number().optional(),
        distanceMm: z.number().optional(),
        sprayDurationS: z.number().optional(),
        cleanlinessBeforeMg: z.number().optional(),
        cleanlinessAfterMg: z.number().optional(),
        maxParticleSizeUm: z.number().optional(),
        cycleStartAt: z.string().optional(),
        cycleEndAt: z.string().optional(),
        cycleTimeSeconds: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Compute cleanliness verdict
      let cleanlinessVerdict = "PENDING";
      if (input.cleanlinessAfterMg != null) {
        cleanlinessVerdict = input.cleanlinessAfterMg <= 5.0 ? "PASS" : "FAIL";
      }
      const hasAlert = cleanlinessVerdict === "FAIL";
      const alertType = hasAlert ? "CLEANLINESS_FAIL" : undefined;
      const alertMessage = hasAlert
        ? `Cleanliness ${input.cleanlinessAfterMg}mg exceeds 5.0mg limit`
        : undefined;

      const [result] = await db
        .insert(robotCleaningActions)
        .values({
          ...input,
          pressureBar: input.pressureBar?.toString(),
          nozzleAngleDeg: input.nozzleAngleDeg?.toString(),
          flowRateLpm: input.flowRateLpm?.toString(),
          temperatureC: input.temperatureC?.toString(),
          distanceMm: input.distanceMm?.toString(),
          sprayDurationS: input.sprayDurationS?.toString(),
          cleanlinessBeforeMg: input.cleanlinessBeforeMg?.toString(),
          cleanlinessAfterMg: input.cleanlinessAfterMg?.toString(),
          maxParticleSizeUm: input.maxParticleSizeUm?.toString(),
          cycleTimeSeconds: input.cycleTimeSeconds?.toString(),
          cleanlinessVerdict,
          hasAlert,
          alertType,
          alertMessage,
          operatorId: ctx.user.id,
        })
        .returning();
      log.info({ id: result.id, robotCode: input.robotCode, verdict: cleanlinessVerdict }, "Cleaning action recorded");
      return result;
    }),

  recordAdaptive: requirePermission("mfg:robot-cleaning:manage")
    .input(
      z.object({
        robotCode: z.string().min(1).max(50),
        projectId: z.number().optional(),
        equipmentId: z.number().optional(),
        stationCode: z.string().max(50).optional(),
        pressureBar: z.number(),
        nozzleAngleDeg: z.number(),
        cleanlinessAfterMg: z.number(),
        iteration: z.number().min(1).max(20),
        pressureDelta: z.number(),
        angleDelta: z.number(),
        reason: z.string().optional(),
        cycleTimeSeconds: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const cleanlinessVerdict = input.cleanlinessAfterMg <= 5.0 ? "PASS" : "FAIL";
      const adaptiveAdjustmentJson = {
        pressureDelta: input.pressureDelta,
        angleDelta: input.angleDelta,
        reason: input.reason ?? "Adaptive iteration",
        iteration: input.iteration,
      };

      const [result] = await db
        .insert(robotCleaningActions)
        .values({
          projectId: input.projectId,
          equipmentId: input.equipmentId,
          robotCode: input.robotCode,
          stationCode: input.stationCode,
          pressureBar: input.pressureBar.toString(),
          nozzleAngleDeg: input.nozzleAngleDeg.toString(),
          cleanlinessAfterMg: input.cleanlinessAfterMg.toString(),
          cycleTimeSeconds: input.cycleTimeSeconds?.toString(),
          cleanlinessVerdict,
          isAdaptive: true,
          adaptiveAdjustmentJson,
          hasAlert: cleanlinessVerdict === "FAIL",
          alertType: cleanlinessVerdict === "FAIL" ? "ADAPTIVE_FAIL" : undefined,
          alertMessage: cleanlinessVerdict === "FAIL"
            ? `Adaptive iteration ${input.iteration} still failing: ${input.cleanlinessAfterMg}mg`
            : undefined,
          operatorId: ctx.user.id,
        })
        .returning();
      log.info({ id: result.id, iteration: input.iteration, verdict: cleanlinessVerdict }, "Adaptive cleaning recorded");
      return result;
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        robotCode: z.string().optional(),
        verdict: z.string().optional(),
        hasAlert: z.boolean().optional(),
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId, robotCode, verdict, hasAlert, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (projectId != null) conditions.push(eq(robotCleaningActions.projectId, projectId));
      if (robotCode) conditions.push(eq(robotCleaningActions.robotCode, robotCode));
      if (verdict) conditions.push(eq(robotCleaningActions.cleanlinessVerdict, verdict));
      if (hasAlert != null) conditions.push(eq(robotCleaningActions.hasAlert, hasAlert));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(robotCleaningActions).where(whereClause);
      const items = await db
        .select()
        .from(robotCleaningActions)
        .where(whereClause)
        .orderBy(desc(robotCleaningActions.createdAt))
        .limit(limit)
        .offset(offset);
      return { items, total: totalResult?.count ?? 0 };
    }),

  getById: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db
      .select()
      .from(robotCleaningActions)
      .where(eq(robotCleaningActions.id, toNum(input.id)))
      .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Cleaning action not found" });
    return row;
  }),

  getRealtimeFeed: protectedProcedure
    .input(z.object({ robotCode: z.string(), limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(robotCleaningActions)
        .where(eq(robotCleaningActions.robotCode, input.robotCode))
        .orderBy(desc(robotCleaningActions.createdAt))
        .limit(input.limit);
    }),

  getStats: protectedProcedure
    .input(z.object({ projectId: z.number().optional(), robotCode: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.projectId != null) conditions.push(eq(robotCleaningActions.projectId, input.projectId));
      if (input?.robotCode) conditions.push(eq(robotCleaningActions.robotCode, input.robotCode));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [total] = await db.select({ count: count() }).from(robotCleaningActions).where(whereClause);
      const [passed] = await db
        .select({ count: count() })
        .from(robotCleaningActions)
        .where(and(...(conditions.length ? conditions : [sql`1=1`]), eq(robotCleaningActions.cleanlinessVerdict, "PASS")));
      const [alerts] = await db
        .select({ count: count() })
        .from(robotCleaningActions)
        .where(and(...(conditions.length ? conditions : [sql`1=1`]), eq(robotCleaningActions.hasAlert, true)));

      return {
        totalActions: total?.count ?? 0,
        passCount: passed?.count ?? 0,
        alertCount: alerts?.count ?? 0,
        passRate: (total?.count ?? 0) > 0 ? Number(passed?.count ?? 0) / Number(total?.count ?? 1) : 0,
      };
    }),
});

// ──── Sub-router 2: Oiling Torque ────

const oilingTorqueSubRouter = router({
  record: requirePermission("mfg:robot-cleaning:manage")
    .input(
      z.object({
        projectId: z.number().optional(),
        equipmentId: z.number().optional(),
        robotCode: z.string().min(1).max(50),
        stationCode: z.string().max(50).optional(),
        targetTorqueNm: z.number().optional(),
        actualTorqueNm: z.number(),
        torqueUpperLimitNm: z.number().default(15),
        torqueLowerLimitNm: z.number().optional(),
        oilType: z.string().max(100).optional(),
        applicationPoint: z.string().max(200).optional(),
        oilVolumeMl: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const upper = input.torqueUpperLimitNm;
      const lower = input.torqueLowerLimitNm;
      const isOverTorque = input.actualTorqueNm > upper;
      const isUnderTorque = lower != null ? input.actualTorqueNm < lower : false;
      const verdict = isOverTorque || isUnderTorque ? "FAIL" : "PASS";
      const alertTriggered = isOverTorque;
      const alertMessage = isOverTorque
        ? `Torque ${input.actualTorqueNm}Nm exceeds upper limit ${upper}Nm`
        : undefined;

      const [result] = await db
        .insert(oilingTorqueRecords)
        .values({
          projectId: input.projectId,
          equipmentId: input.equipmentId,
          robotCode: input.robotCode,
          stationCode: input.stationCode,
          targetTorqueNm: input.targetTorqueNm?.toString(),
          actualTorqueNm: input.actualTorqueNm.toString(),
          torqueUpperLimitNm: upper.toString(),
          torqueLowerLimitNm: lower?.toString(),
          oilType: input.oilType,
          applicationPoint: input.applicationPoint,
          oilVolumeMl: input.oilVolumeMl?.toString(),
          isOverTorque,
          isUnderTorque,
          verdict,
          alertTriggered,
          alertMessage,
          operatorId: ctx.user.id,
          notes: input.notes,
        })
        .returning();
      if (alertTriggered) {
        log.warn({ id: result.id, actual: input.actualTorqueNm, limit: upper }, "Over-torque alert!");
      }
      return result;
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        robotCode: z.string().optional(),
        verdict: z.string().optional(),
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId, robotCode, verdict, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (projectId != null) conditions.push(eq(oilingTorqueRecords.projectId, projectId));
      if (robotCode) conditions.push(eq(oilingTorqueRecords.robotCode, robotCode));
      if (verdict) conditions.push(eq(oilingTorqueRecords.verdict, verdict));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(oilingTorqueRecords).where(whereClause);
      const items = await db
        .select()
        .from(oilingTorqueRecords)
        .where(whereClause)
        .orderBy(desc(oilingTorqueRecords.createdAt))
        .limit(limit)
        .offset(offset);
      return { items, total: totalResult?.count ?? 0 };
    }),

  getById: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db
      .select()
      .from(oilingTorqueRecords)
      .where(eq(oilingTorqueRecords.id, toNum(input.id)))
      .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Torque record not found" });
    return row;
  }),

  getOverTorqueAlerts: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        limit: z.number().min(1).max(200).default(50),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [eq(oilingTorqueRecords.isOverTorque, true)];
      if (input?.projectId != null) conditions.push(eq(oilingTorqueRecords.projectId, input.projectId));
      return db
        .select()
        .from(oilingTorqueRecords)
        .where(and(...conditions))
        .orderBy(desc(oilingTorqueRecords.createdAt))
        .limit(input?.limit ?? 50);
    }),
});

// ──── Sub-router 3: Tech Performance ────

const techPerformanceSubRouter = router({
  record: requirePermission("mfg:robot-cleaning:manage")
    .input(
      z.object({
        projectId: z.number().optional(),
        robotCleaningActionId: z.number().optional(),
        oilingTorqueRecordId: z.number().optional(),
        processInstanceId: z.number().optional(),
        entryType: z.string().min(1).max(30),
        cycleTimeSeconds: z.number().optional(),
        standardCycleTimeSeconds: z.number().optional(),
        qualityPass: z.boolean().default(true),
        cleanlinessScore: z.number().optional(),
        laborMinutes: z.number().optional(),
        machineMinutes: z.number().optional(),
        performancePoints: z.number().optional(),
        workDate: z.string().optional(),
        shiftCode: z.string().max(20).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Auto-compute cycle efficiency
      let cycleEfficiency: string | undefined;
      if (input.cycleTimeSeconds && input.standardCycleTimeSeconds && input.standardCycleTimeSeconds > 0) {
        cycleEfficiency = (input.standardCycleTimeSeconds / input.cycleTimeSeconds).toFixed(4);
      }

      const [result] = await db
        .insert(techPerformanceEntries)
        .values({
          ...input,
          userId: ctx.user.id,
          cycleTimeSeconds: input.cycleTimeSeconds?.toString(),
          standardCycleTimeSeconds: input.standardCycleTimeSeconds?.toString(),
          cycleEfficiency,
          cleanlinessScore: input.cleanlinessScore?.toString(),
          laborMinutes: input.laborMinutes?.toString(),
          machineMinutes: input.machineMinutes?.toString(),
          performancePoints: input.performancePoints?.toString(),
          qualityPass: input.qualityPass,
        })
        .returning();
      return result;
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        userId: z.number().optional(),
        entryType: z.string().optional(),
        workDate: z.string().optional(),
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId, userId, entryType, workDate, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (projectId != null) conditions.push(eq(techPerformanceEntries.projectId, projectId));
      if (userId != null) conditions.push(eq(techPerformanceEntries.userId, userId));
      if (entryType) conditions.push(eq(techPerformanceEntries.entryType, entryType));
      if (workDate) conditions.push(eq(techPerformanceEntries.workDate, workDate));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(techPerformanceEntries).where(whereClause);
      const items = await db
        .select()
        .from(techPerformanceEntries)
        .where(whereClause)
        .orderBy(desc(techPerformanceEntries.createdAt))
        .limit(limit)
        .offset(offset);
      return { items, total: totalResult?.count ?? 0 };
    }),

  getUserSummary: protectedProcedure
    .input(z.object({ userId: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const uid = input.userId ?? ctx.user.id;
      const conditions: SQL[] = [eq(techPerformanceEntries.userId, uid)];
      if (input.startDate) conditions.push(gte(techPerformanceEntries.workDate, input.startDate));
      if (input.endDate) conditions.push(lte(techPerformanceEntries.workDate, input.endDate));

      const [total] = await db.select({ count: count() }).from(techPerformanceEntries).where(and(...conditions));
      const items = await db
        .select()
        .from(techPerformanceEntries)
        .where(and(...conditions))
        .orderBy(desc(techPerformanceEntries.createdAt))
        .limit(200);
      return { entries: items, totalEntries: total?.count ?? 0 };
    }),

  getProjectSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [eq(techPerformanceEntries.projectId, input.projectId)];
      const [total] = await db.select({ count: count() }).from(techPerformanceEntries).where(and(...conditions));
      const items = await db
        .select()
        .from(techPerformanceEntries)
        .where(and(...conditions))
        .orderBy(desc(techPerformanceEntries.createdAt))
        .limit(500);
      return { entries: items, totalEntries: total?.count ?? 0 };
    }),
});

// ──── Sub-router 4: Showroom (public, customer demo) ────

const DEMO_CYCLES = Array.from({ length: 50 }, (_, i) => ({
  cycle: i + 1,
  pressure: 3.0 + Math.sin(i * 0.3) * 0.8 + (i < 10 ? 0 : -0.2),
  cleanliness: Math.max(1.5, 8.0 - i * 0.12 + Math.random() * 0.5),
  angle: 45 + Math.cos(i * 0.2) * 5,
  passRate: Math.min(100, 60 + i * 0.8),
}));

const DEMO_ADAPTIVE_HISTORY = [
  { iteration: 1, pressure: 2.5, angle: 40, cleanlinessBefore: 12.3, cleanlinessAfter: 8.1, verdict: "FAIL" },
  { iteration: 2, pressure: 3.0, angle: 45, cleanlinessBefore: 8.1, cleanlinessAfter: 5.8, verdict: "FAIL" },
  { iteration: 3, pressure: 3.5, angle: 50, cleanlinessBefore: 5.8, cleanlinessAfter: 4.2, verdict: "PASS" },
  { iteration: 4, pressure: 3.5, angle: 50, cleanlinessBefore: 4.5, cleanlinessAfter: 3.1, verdict: "PASS" },
  { iteration: 5, pressure: 3.3, angle: 48, cleanlinessBefore: 3.8, cleanlinessAfter: 2.9, verdict: "PASS" },
];

const DEMO_TORQUE_DATA = Array.from({ length: 30 }, (_, i) => ({
  index: i + 1,
  actual: 10 + Math.random() * 8,
  target: 12,
  upperLimit: 15,
  applicationPoint: `Point-${String.fromCharCode(65 + (i % 8))}`,
}));

const showroomSubRouter = router({
  getDemoData: publicProcedure.query(async () => {
    try {
      const db = await requireDb();
      const [realCount] = await db.select({ count: count() }).from(robotCleaningActions).limit(1);
      if (Number(realCount?.count ?? 0) > 0) {
        const actions = await db.select().from(robotCleaningActions).orderBy(desc(robotCleaningActions.createdAt)).limit(50);
        const torque = await db.select().from(oilingTorqueRecords).orderBy(desc(oilingTorqueRecords.createdAt)).limit(30);
        return { source: "live" as const, cleaningActions: actions, torqueRecords: torque };
      }
    } catch {
      // Fall through to demo data
    }
    return {
      source: "demo" as const,
      cleaningActions: DEMO_CYCLES,
      torqueRecords: DEMO_TORQUE_DATA,
    };
  }),

  getParameterCurves: publicProcedure.query(async () => {
    try {
      const db = await requireDb();
      const recent = await db
        .select()
        .from(robotCleaningActions)
        .orderBy(desc(robotCleaningActions.createdAt))
        .limit(50);
      if (recent.length > 0) {
        return {
          source: "live" as const,
          curves: recent.reverse().map((r, i) => ({
            cycle: i + 1,
            pressure: Number(r.pressureBar ?? 0),
            cleanliness: Number(r.cleanlinessAfterMg ?? 0),
            angle: Number(r.nozzleAngleDeg ?? 0),
            passRate: 0,
          })),
        };
      }
    } catch {
      // Fall through
    }
    return { source: "demo" as const, curves: DEMO_CYCLES };
  }),

  getAdaptiveHistory: publicProcedure.query(async () => {
    try {
      const db = await requireDb();
      const adaptive = await db
        .select()
        .from(robotCleaningActions)
        .where(eq(robotCleaningActions.isAdaptive, true))
        .orderBy(desc(robotCleaningActions.createdAt))
        .limit(20);
      if (adaptive.length > 0) {
        return {
          source: "live" as const,
          history: adaptive.reverse().map((a, i) => ({
            iteration: i + 1,
            pressure: Number(a.pressureBar ?? 0),
            angle: Number(a.nozzleAngleDeg ?? 0),
            cleanlinessBefore: Number(a.cleanlinessBeforeMg ?? 0),
            cleanlinessAfter: Number(a.cleanlinessAfterMg ?? 0),
            verdict: a.cleanlinessVerdict ?? "PENDING",
          })),
        };
      }
    } catch {
      // Fall through
    }
    return { source: "demo" as const, history: DEMO_ADAPTIVE_HISTORY };
  }),

  // ── Engine Block AI Cleaning Demo endpoints ──

  getDemoCleaningPipeline: publicProcedure.query(async () => {
    const pipeline = [
      { step: 1, label: "Workpiece 3D Scan", labelZh: "工件3D扫描", description: "High-resolution laser scan captures full geometry of engine block cavities", aiRole: "Point cloud segmentation identifies 20+ internal channels" },
      { step: 2, label: "AI Feature Analysis", labelZh: "AI特征分析", description: "Deep learning classifies blind holes, oil galleries, coolant channels, bearing seats", aiRole: "CNN feature extractor with 98.7% recognition accuracy" },
      { step: 3, label: "CNC Path Generation", labelZh: "CNC路径生成", description: "Optimal nozzle trajectory computed for horizontal flush orientation", aiRole: "Reinforcement learning path planner minimizes cycle time while maximizing coverage" },
      { step: 4, label: "Horizontal Flush Execution", labelZh: "水平定向冲洗执行", description: "CNC-controlled nozzle executes multi-phase cleaning with adaptive pressure", aiRole: "Real-time PID control adjusts pressure/angle based on turbidity feedback" },
      { step: 5, label: "Inline QC Measurement", labelZh: "在线质检测量", description: "Particle counter + gravimetric analysis per ISO 16232 / VDA 19", aiRole: "Anomaly detection flags unexpected contamination patterns" },
      { step: 6, label: "Adaptive Feedback Loop", labelZh: "自适应反馈闭环", description: "Results feed back to path planner for next-cycle optimization", aiRole: "Bayesian optimizer converges to optimal parameters in ≤3 iterations" },
    ];
    const cncTrajectory = Array.from({ length: 20 }, (_, i) => ({
      waypointId: i + 1,
      x: 50 + (i % 5) * 80 + Math.sin(i * 0.5) * 15,
      y: 40 + Math.floor(i / 5) * 60 + Math.cos(i * 0.3) * 10,
      pressure: +(2.5 + Math.sin(i * 0.4) * 1.0).toFixed(1),
      angle: +(45 + Math.cos(i * 0.3) * 12).toFixed(1),
      flowRate: +(8.0 + Math.sin(i * 0.6) * 2.0).toFixed(1),
      distance: +(15 + Math.cos(i * 0.5) * 5).toFixed(1),
      targetFeature: ["blind_hole", "oil_gallery", "coolant_channel", "bearing_seat"][i % 4],
    }));
    const workpieceSpec = {
      name: "4-Cylinder Engine Block (ADC12)",
      material: "ADC12 Aluminum Die-Cast",
      dimensions: "480mm × 320mm × 280mm",
      cavities: 20,
      standard: "VDA 19.1 / ISO 16232",
      maxResidualMass: 5.0,
      maxParticleSize: 600,
    };
    return { pipeline, cncTrajectory, workpieceSpec };
  }),

  getDemoInlineQC: publicProcedure.query(async () => {
    const sizeDistribution = [
      { bin: "<50μm", before: 1840, after: 320 },
      { bin: "50-100μm", before: 620, after: 85 },
      { bin: "100-200μm", before: 340, after: 42 },
      { bin: "200-400μm", before: 180, after: 12 },
      { bin: "400-600μm", before: 45, after: 3 },
      { bin: ">600μm", before: 12, after: 0 },
    ];
    const zoneMap = Array.from({ length: 20 }, (_, i) => {
      const residual = +(0.05 + Math.random() * 0.35).toFixed(2);
      const maxP = Math.floor(30 + Math.random() * 120);
      return {
        zoneId: i + 1,
        zoneName: `CH-${String(i + 1).padStart(2, "0")}`,
        residualMg: residual,
        maxParticleUm: maxP,
        status: residual > 0.3 ? "warning" : "pass",
      };
    });
    return {
      totalResidualMass: 2.14,
      maxParticleSize: 385,
      verdict: "PASS" as const,
      standard: "VDA 19.1 / ISO 16232",
      sizeDistribution,
      zoneMap,
      before: { totalMass: 18.6, maxParticle: 820, particleCount: 3037 },
      after: { totalMass: 2.14, maxParticle: 385, particleCount: 462 },
      improvement: { massReduction: 88.5, particleReduction: 84.8, maxParticleReduction: 53.0 },
    };
  }),

  getDemoAIDecisions: publicProcedure.query(async () => {
    const featuresDetected = [
      { type: "Blind Holes", typeZh: "盲孔", count: 8, confidence: 0.987, strategy: "High-pressure reverse flush with 3-angle sweep" },
      { type: "Oil Galleries", typeZh: "油道", count: 4, confidence: 0.962, strategy: "Pulsed laminar flow at 3.5 bar with 60° entry angle" },
      { type: "Coolant Channels", typeZh: "冷却水道", count: 6, confidence: 0.944, strategy: "Cross-flow flush with alternating direction reversal" },
      { type: "Bearing Seats", typeZh: "轴承座", count: 2, confidence: 0.991, strategy: "Low-pressure precision spray at 2.0 bar, 90° perpendicular" },
    ];
    const reasoning = [
      { timestamp: "T+0.0s", event: "3D scan complete — 20 cavities identified, 4 feature types classified" },
      { timestamp: "T+1.2s", event: "Historical match: 94.2% similarity to Project P-2024-0847 (VW EA888 block)" },
      { timestamp: "T+1.8s", event: "Path optimizer selected horizontal orientation — gravity-assisted particle exit via 12° tilt" },
      { timestamp: "T+2.4s", event: "Pressure profile generated: 2.0–3.8 bar adaptive range across 20 waypoints" },
      { timestamp: "T+3.1s", event: "Iteration 1 residual: 4.8mg (target: ≤5.0mg) — MARGINAL, triggering refinement" },
      { timestamp: "T+3.6s", event: "Bayesian update: +0.3 bar on blind holes, -5° nozzle angle on oil galleries → converged" },
    ];
    const caseMatches = [
      { projectId: "P-2024-0847", customer: "VW Powertrain", blockType: "EA888 Gen3B", similarity: 94.2, cycleTime: 42, verdict: "PASS" },
      { projectId: "P-2024-0612", customer: "BMW Steyr", blockType: "B48 TwinPower", similarity: 87.6, cycleTime: 48, verdict: "PASS" },
      { projectId: "P-2023-1105", customer: "Hyundai-Kia", blockType: "Smartstream G1.6T", similarity: 81.3, cycleTime: 55, verdict: "PASS" },
      { projectId: "P-2024-0293", customer: "Stellantis", blockType: "GME-T4 Hurricane", similarity: 78.9, cycleTime: 50, verdict: "PASS" },
    ];
    const adaptiveIterations = [
      { iteration: 1, pressure: 3.0, angle: 45, residualMg: 6.2, maxParticleUm: 520, verdict: "FAIL" as const },
      { iteration: 2, pressure: 3.4, angle: 42, residualMg: 4.8, maxParticleUm: 410, verdict: "FAIL" as const },
      { iteration: 3, pressure: 3.5, angle: 40, residualMg: 2.14, maxParticleUm: 385, verdict: "PASS" as const },
    ];
    return {
      featuresDetected,
      reasoning,
      caseMatches,
      adaptiveIterations,
      totalHistoricalCycles: 12847,
      aiModelVersion: "GRT-CleanAI v3.2.1",
      aiConfidence: 0.942,
      cycleTimeAchieved: 38,
      firstPassYield: 0.89,
    };
  }),

  getKpiOverview: publicProcedure.query(async () => {
    try {
      const db = await requireDb();
      const [totalResult] = await db.select({ count: count() }).from(techPerformanceEntries).limit(1);
      if (Number(totalResult?.count ?? 0) > 0) {
        const entries = await db.select().from(techPerformanceEntries).orderBy(desc(techPerformanceEntries.createdAt)).limit(100);
        const passCount = entries.filter((e) => e.qualityPass).length;
        return {
          source: "live" as const,
          totalEntries: Number(totalResult?.count ?? 0),
          passRate: entries.length > 0 ? passCount / entries.length : 0,
          entries: entries.slice(0, 20),
        };
      }
    } catch {
      // Fall through
    }
    return {
      source: "demo" as const,
      totalEntries: 248,
      passRate: 0.94,
      entries: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        entryType: i % 3 === 0 ? "cleaning" : i % 3 === 1 ? "oiling" : "assembly",
        cycleTimeSeconds: (45 + Math.random() * 30).toFixed(1),
        standardCycleTimeSeconds: "60.00",
        cycleEfficiency: (0.7 + Math.random() * 0.3).toFixed(4),
        qualityPass: Math.random() > 0.06,
        performancePoints: (8 + Math.random() * 4).toFixed(1),
        workDate: "2026-03-07",
      })),
    };
  }),
});

// ──── Main Router ────

export const robotCleaningRouter = router({
  robotCleaning: robotCleaningSubRouter,
  oilingTorque: oilingTorqueSubRouter,
  techPerformance: techPerformanceSubRouter,
  showroom: showroomSubRouter,
});
