/**
 * Closed-Loop Adaptive Control Router
 *
 * 3 procedures: processRobotAlert, getClosedLoopEvents, getOperatorRiskProfile
 *
 * Handles robot condition alerts and triggers closed-loop corrective actions:
 *   1. Robot alert → auto-triage severity → operator risk escalation
 *   2. Historical event query for audit trail
 *   3. Operator risk profiling based on alert frequency and severity
 *
 * Delegates heavy processing to closed-loop.service.ts (if available),
 * but provides inline fallback logic for Phase 0 standalone operation.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  robotConditionAlerts,
} from "../../drizzle/robot-fleet-schema";
import {
  robotCleaningActions,
} from "../../drizzle/robot-cleaning-performance-schema";
import { eq, desc, and, count, sql, gte, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("closed-loop-router");

const managePermission = requirePermission("mfg:closed-loop:manage");
const viewPermission = requirePermission("mfg:closed-loop:view");

/** Severity weight for risk scoring */
const SEVERITY_WEIGHT: Record<string, number> = {
  emergency: 10,
  critical: 5,
  warning: 2,
  info: 0.5,
};

export const closedLoopRouter = router({
  // ── Oiling control guard — dual closed loop (torque + pose) ──────────
  checkOilingControl: managePermission
    .input(
      z.object({
        robotId: z.number().int().positive(),
        stationCode: z.string().min(1).max(100),
        torqueActual: z.number(),
        torqueTarget: z.number().positive(),
        poseX: z.number(),
        poseY: z.number(),
        poseZ: z.number(),
        baseX: z.number(),
        baseY: z.number(),
        baseZ: z.number(),
        cycleTime: z.number().positive().optional(),
        operatorId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { checkOilingControl } = await import("../services/oiling-control-guard.service");
      return checkOilingControl(input);
    }),

  // ── Process a robot alert and trigger closed-loop response ────────────
  processRobotAlert: managePermission
    .input(
      z.object({
        robotId: z.number().int().positive(),
        alertType: z.enum([
          "overtemp", "collision", "estop", "servo_error",
          "comm_loss", "joint_limit", "payload_exceeded",
        ]),
        severity: z.enum(["info", "warning", "critical", "emergency"]),
        message: z.string().min(1).max(2000),
        jointIndex: z.number().int().min(1).max(7).optional(),
        measuredValue: z.string().optional(),
        thresholdValue: z.string().optional(),
        unit: z.string().max(20).optional(),
        details: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      try {
        // 1. Persist the alert
        const [alert] = await db
          .insert(robotConditionAlerts)
          .values({
            robotId: input.robotId,
            alertType: input.alertType,
            severity: input.severity,
            message: input.message,
            jointIndex: input.jointIndex,
            measuredValue: input.measuredValue,
            thresholdValue: input.thresholdValue,
            unit: input.unit,
            details: input.details || {},
          })
          .returning();

        // 2. Determine closed-loop action based on severity
        let action: string;
        let escalation: string | null = null;

        switch (input.severity) {
          case "emergency":
            action = "IMMEDIATE_STOP";
            escalation = "Notify shift supervisor + maintenance manager";
            break;
          case "critical":
            action = "REDUCE_SPEED_50";
            escalation = "Notify maintenance team";
            break;
          case "warning":
            action = "LOG_AND_MONITOR";
            escalation = null;
            break;
          default:
            action = "LOG_ONLY";
            escalation = null;
        }

        // 3. Count recent alerts for this robot (last 24h) to detect patterns
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const [{ value: recentAlertCount }] = await db
          .select({ value: count() })
          .from(robotConditionAlerts)
          .where(
            and(
              eq(robotConditionAlerts.robotId, input.robotId),
              gte(robotConditionAlerts.createdAt, twentyFourHoursAgo),
            ),
          );

        const recentCount = Number(recentAlertCount);
        const patternDetected = recentCount >= 5;
        if (patternDetected) {
          escalation = `PATTERN: ${recentCount} alerts in 24h — recommend preventive maintenance`;
          action = "SCHEDULE_MAINTENANCE";
        }

        log.info(
          { alertId: alert.id, robotId: input.robotId, severity: input.severity, action },
          "Closed-loop alert processed",
        );

        return {
          alert,
          closedLoopAction: action,
          escalation,
          recentAlertCount: recentCount,
          patternDetected,
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        log.error({ err, robotId: input.robotId }, "Failed to process robot alert");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to process alert" });
      }
    }),

  // ── Get closed-loop event history ─────────────────────────────────────
  getClosedLoopEvents: viewPermission
    .input(
      z
        .object({
          robotId: z.number().int().optional(),
          severity: z.enum(["info", "warning", "critical", "emergency"]).optional(),
          alertType: z.string().optional(),
          sinceDate: z.string().optional(), // ISO date string
          limit: z.number().int().min(1).max(500).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const conditions: SQL[] = [];
      if (input?.robotId) {
        conditions.push(eq(robotConditionAlerts.robotId, input.robotId));
      }
      if (input?.severity) {
        conditions.push(eq(robotConditionAlerts.severity, input.severity));
      }
      if (input?.alertType) {
        conditions.push(eq(robotConditionAlerts.alertType, input.alertType as "overtemp"));
      }
      if (input?.sinceDate) {
        conditions.push(gte(robotConditionAlerts.createdAt, input.sinceDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ value: total }] = await db
        .select({ value: count() })
        .from(robotConditionAlerts)
        .where(whereClause);

      const items = await db
        .select()
        .from(robotConditionAlerts)
        .where(whereClause)
        .orderBy(desc(robotConditionAlerts.createdAt))
        .limit(limit)
        .offset(offset);

      return { items, total: Number(total) };
    }),

  // ── Integrated Closed-Loop Cycle: Robot Feedback → VED → AEI → SSE ──
  // This is the CORE integration procedure requested by CTO.
  // Single entry point that:
  //   1. Checks oiling control (torque + pose)
  //   2. If violation: logs VED deduction → bridges to AEI contribution
  //   3. Queries operator's cumulative risk profile
  //   4. Recalculates AEI if critical threshold crossed
  //   5. Publishes SSE events for real-time CEO dashboard
  processClosedLoopCycle: managePermission
    .input(
      z.object({
        robotId: z.number().int().positive(),
        stationCode: z.string().min(1).max(100),
        torqueActual: z.number(),
        torqueTarget: z.number().positive(),
        poseX: z.number(),
        poseY: z.number(),
        poseZ: z.number(),
        baseX: z.number(),
        baseY: z.number(),
        baseZ: z.number(),
        cycleTime: z.number().positive().optional(),
        operatorId: z.string().optional(),
        projectId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // ── Step 1: Dual closed-loop check (torque + pose + VED) ──
      const { checkOilingControl } = await import("../services/oiling-control-guard.service");
      const oilingResult = await checkOilingControl(input);

      // ── Step 2: Build operator risk snapshot ──
      let operatorRisk: { riskScore: number; riskLevel: string; totalAlerts: number } | null = null;
      try {
        const sinceDate = new Date();
        sinceDate.setMonth(sinceDate.getMonth() - 3);
        const alerts = await db
          .select()
          .from(robotConditionAlerts)
          .where(
            and(
              eq(robotConditionAlerts.robotId, input.robotId),
              gte(robotConditionAlerts.createdAt, sinceDate.toISOString()),
            ),
          )
          .orderBy(desc(robotConditionAlerts.createdAt))
          .limit(200);

        let riskScore = 0;
        for (const a of alerts) {
          riskScore += SEVERITY_WEIGHT[a.severity] ?? 1;
        }
        const normalizedRisk = Math.min(100, Math.round((riskScore / 50) * 100));
        const riskLevel =
          normalizedRisk >= 80 ? "critical" :
          normalizedRisk >= 50 ? "high" :
          normalizedRisk >= 25 ? "medium" : "low";

        operatorRisk = { riskScore: normalizedRisk, riskLevel, totalAlerts: alerts.length };
      } catch (err) {
        log.warn({ err }, "Risk profile query failed (non-blocking)");
      }

      // ── Step 3: Trigger AEI recalc if operator has critical risk ──
      let aeiRecalcTriggered = false;
      if (
        input.operatorId &&
        operatorRisk &&
        operatorRisk.riskLevel === "critical" &&
        (!oilingResult.torqueOk || !oilingResult.poseOk)
      ) {
        try {
          const { calculateUserAei } = await import("../services/aei-aggregator.service");
          const month = new Date().toISOString().slice(0, 7);
          await calculateUserAei(parseInt(input.operatorId) || 0, input.operatorId, month);
          aeiRecalcTriggered = true;
          log.info({ operatorId: input.operatorId, month }, "AEI recalc triggered by critical risk");
        } catch (err) {
          log.warn({ err }, "AEI recalc failed (non-blocking)");
        }
      }

      // ── Step 4: Publish SSE events for real-time dashboards ──
      let ssePublished = false;
      try {
        const { sseManager } = await import("../services/telemetry-sse.service");
        if (!oilingResult.torqueOk || !oilingResult.poseOk) {
          sseManager.publish("oiling:alert", {
            robotId: input.robotId,
            stationCode: input.stationCode,
            vedScore: oilingResult.vedScore,
            torqueOk: oilingResult.torqueOk,
            poseOk: oilingResult.poseOk,
            operatorId: input.operatorId ?? "unknown",
            riskLevel: operatorRisk?.riskLevel ?? "unknown",
            timestamp: new Date().toISOString(),
          });
          if (operatorRisk && operatorRisk.riskLevel !== "low") {
            sseManager.publish("hr:penalty", {
              operatorId: input.operatorId ?? "unknown",
              vedScore: oilingResult.vedScore,
              riskLevel: operatorRisk.riskLevel,
              aeiRecalcTriggered,
              timestamp: new Date().toISOString(),
            });
          }
          ssePublished = true;
        }
      } catch {
        // SSE service may not be running — non-blocking
      }

      log.info({
        robotId: input.robotId,
        station: input.stationCode,
        vedScore: oilingResult.vedScore,
        riskLevel: operatorRisk?.riskLevel,
        aeiRecalcTriggered,
        ssePublished,
      }, "Closed-loop cycle completed");

      return {
        oiling: oilingResult,
        operatorRisk,
        aeiRecalcTriggered,
        ssePublished,
        closedLoopAction:
          operatorRisk?.riskLevel === "critical" ? "IMMEDIATE_REVIEW" :
          !oilingResult.torqueOk && !oilingResult.poseOk ? "REDUCE_SPEED_50" :
          !oilingResult.torqueOk || !oilingResult.poseOk ? "LOG_AND_MONITOR" :
          "NORMAL",
        recommendation:
          operatorRisk?.riskLevel === "critical"
            ? "Critical risk — schedule preventive maintenance + operator retraining within 24h"
            : !oilingResult.torqueOk
              ? "Torque exceeded — check pump relief valve or reduce pump speed"
              : !oilingResult.poseOk
                ? "Pose deviation — recalibrate robot TCP or check fixture alignment"
                : "All parameters within tolerance",
      };
    }),

  // ── Get operator risk profile based on alert history ──────────────────
  getOperatorRiskProfile: viewPermission
    .input(
      z.object({
        robotId: z.number().int().positive(),
        monthsBack: z.number().int().min(1).max(24).default(6),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const sinceDate = new Date();
      sinceDate.setMonth(sinceDate.getMonth() - input.monthsBack);

      // Get all alerts for this robot in the window
      const alerts = await db
        .select()
        .from(robotConditionAlerts)
        .where(
          and(
            eq(robotConditionAlerts.robotId, input.robotId),
            gte(robotConditionAlerts.createdAt, sinceDate.toISOString()),
          ),
        )
        .orderBy(desc(robotConditionAlerts.createdAt))
        .limit(1000);

      // Compute risk score: weighted sum of alerts
      let riskScore = 0;
      const severityCounts: Record<string, number> = { emergency: 0, critical: 0, warning: 0, info: 0 };
      const alertTypeCounts: Record<string, number> = {};

      for (const alert of alerts) {
        const weight = SEVERITY_WEIGHT[alert.severity] ?? 1;
        riskScore += weight;
        severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
        alertTypeCounts[alert.alertType] = (alertTypeCounts[alert.alertType] || 0) + 1;
      }

      // Normalize to 0-100 scale (100 alerts at weight 5 = max)
      const normalizedRisk = Math.min(100, Math.round((riskScore / 50) * 100));

      // Determine risk level
      let riskLevel: string;
      if (normalizedRisk >= 80) riskLevel = "critical";
      else if (normalizedRisk >= 50) riskLevel = "high";
      else if (normalizedRisk >= 25) riskLevel = "medium";
      else riskLevel = "low";

      // Top issue
      const topIssue = Object.entries(alertTypeCounts).sort((a, b) => b[1] - a[1])[0];

      return {
        robotId: input.robotId,
        monthsAnalyzed: input.monthsBack,
        totalAlerts: alerts.length,
        riskScore: normalizedRisk,
        riskLevel,
        severityCounts,
        alertTypeCounts,
        topIssue: topIssue ? { type: topIssue[0], count: topIssue[1] } : null,
        recommendation:
          normalizedRisk >= 50
            ? "Schedule preventive maintenance within 48 hours"
            : normalizedRisk >= 25
              ? "Monitor closely during next shift"
              : "Normal operating conditions",
      };
    }),
});
