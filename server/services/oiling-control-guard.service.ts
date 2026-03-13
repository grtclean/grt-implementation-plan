/**
 * OilingControlGuard — Dual Closed Loop
 * Checks torque + pose simultaneously, creates alerts and VED deductions
 */
import { requireDb } from "../db";
import { createChildLogger } from "../lib/logger";
import { robotConditionAlerts } from "../../drizzle/robot-fleet-schema";
import { sql } from "drizzle-orm";

const log = createChildLogger("oiling-control-guard");

const TORQUE_THRESHOLD_NM = 15.0;
const POSE_THRESHOLD_MM = 0.5;

export interface OilingReading {
  robotId: number;
  stationCode: string;
  torqueActual: number;
  torqueTarget: number;
  poseX: number;
  poseY: number;
  poseZ: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  cycleTime?: number;
  operatorId?: string;
}

export interface OilingCheckResult {
  torqueOk: boolean;
  poseOk: boolean;
  torqueDelta: number;
  poseDelta: number;
  vedScore: number;
  alerts: string[];
  penalties: string[];
}

export function computeVedScore(params: {
  torqueActual: number;
  torqueTarget: number;
  poseDelta: number;
  cycleTime?: number;
}): number {
  const { torqueActual, torqueTarget, poseDelta, cycleTime } = params;

  // Torque accuracy: 40 points max (guard: torqueTarget=0 → full score)
  const safeTorqueTarget = torqueTarget > 0 ? torqueTarget : 1;
  const torqueError = Math.abs(torqueActual - safeTorqueTarget) / safeTorqueTarget;
  const torqueScore = Math.max(0, 40 * (1 - torqueError * 5)); // 20% error = 0 points

  // Pose accuracy: 40 points max
  const poseScore = Math.max(0, 40 * (1 - poseDelta / POSE_THRESHOLD_MM));

  // Cycle time bonus: 20 points max
  let cycleScore = 20;
  if (cycleTime != null) {
    // Assume baseline cycle time ~30s, penalize if >45s
    const ratio = cycleTime / 30;
    cycleScore = ratio <= 1 ? 20 : Math.max(0, 20 * (1 - (ratio - 1)));
  }

  return Math.round(Math.max(0, Math.min(100, torqueScore + poseScore + cycleScore)));
}

export async function checkOilingControl(reading: OilingReading): Promise<OilingCheckResult> {
  const db = await requireDb();

  // Compute deltas
  const torqueDelta = reading.torqueActual - TORQUE_THRESHOLD_NM;
  const poseDelta = Math.sqrt(
    Math.pow(reading.poseX - reading.baseX, 2) +
    Math.pow(reading.poseY - reading.baseY, 2) +
    Math.pow(reading.poseZ - reading.baseZ, 2),
  );

  const torqueOk = reading.torqueActual <= TORQUE_THRESHOLD_NM;
  const poseOk = poseDelta <= POSE_THRESHOLD_MM;

  const vedScore = computeVedScore({
    torqueActual: reading.torqueActual,
    torqueTarget: reading.torqueTarget,
    poseDelta,
    cycleTime: reading.cycleTime,
  });

  const alerts: string[] = [];
  const penalties: string[] = [];

  if (!torqueOk) {
    alerts.push(`Torque exceeded: ${reading.torqueActual.toFixed(2)}Nm > ${TORQUE_THRESHOLD_NM}Nm`);

    // Create robot condition alert
    // Note: "torque_drift" is not in the DB enum; map to "servo_error" and store original in details
    try {
      await db.insert(robotConditionAlerts).values({
        robotId: reading.robotId,
        alertType: "servo_error",
        severity: reading.torqueActual > 20 ? "critical" : "warning",
        message: `Oiling torque ${reading.torqueActual.toFixed(2)}Nm exceeds ${TORQUE_THRESHOLD_NM}Nm at ${reading.stationCode}`,
        measuredValue: String(reading.torqueActual),
        thresholdValue: String(TORQUE_THRESHOLD_NM),
        unit: "Nm",
        details: {
          originalAlertType: "torque_drift",
          stationCode: reading.stationCode,
          source: "oiling-control-guard",
        },
      });
    } catch (err) {
      log.warn({ err }, "Failed to insert robot condition alert");
    }
  }

  if (!poseOk) {
    alerts.push(`Pose deviation: ${poseDelta.toFixed(3)}mm > ${POSE_THRESHOLD_MM}mm`);

    // Note: "position_error" is not in the DB enum; map to "joint_limit" and store original in details
    try {
      await db.insert(robotConditionAlerts).values({
        robotId: reading.robotId,
        alertType: "joint_limit",
        severity: poseDelta > 1.0 ? "critical" : "warning",
        message: `Oiling pose deviation ${poseDelta.toFixed(3)}mm exceeds ${POSE_THRESHOLD_MM}mm at ${reading.stationCode}`,
        measuredValue: String(poseDelta.toFixed(3)),
        thresholdValue: String(POSE_THRESHOLD_MM),
        unit: "mm",
        details: {
          originalAlertType: "position_error",
          stationCode: reading.stationCode,
          source: "oiling-control-guard",
        },
      });
    } catch (err) {
      log.warn({ err }, "Failed to insert robot condition alert");
    }
  }

  // VED deduction for tech performance
  if (!torqueOk || !poseOk) {
    try {
      await db.execute(sql`
        INSERT INTO tech_performance_entries (user_id, dimension, score, evidence, period, created_at)
        VALUES (
          ${reading.operatorId || "system"},
          'VED',
          ${vedScore},
          ${"Oiling control check: torque=" + reading.torqueActual.toFixed(2) + "Nm, pose=" + poseDelta.toFixed(3) + "mm"},
          ${new Date().toISOString().slice(0, 7)},
          NOW()
        )
        ON CONFLICT DO NOTHING
      `);
      penalties.push(`VED score: ${vedScore}/100`);
    } catch (err) {
      log.warn({ err }, "Failed to insert VED deduction (table may not exist)");
    }
  }

  // ── Bridge to AEI: log contribution so monthly AEI calculation picks it up ──
  if (reading.operatorId && (!torqueOk || !poseOk)) {
    try {
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM
      await db.execute(sql`
        INSERT INTO aei_contribution_logs (user_id, user_name, contribution_type, source_table, points, metadata, month, created_at)
        VALUES (
          ${parseInt(reading.operatorId) || 0},
          ${reading.operatorId},
          'oiling_ved_deduction',
          'oiling_control_guard',
          ${-1 * Math.max(0, 100 - vedScore)},
          ${JSON.stringify({
            robotId: reading.robotId,
            stationCode: reading.stationCode,
            torqueActual: reading.torqueActual,
            poseDelta: poseDelta.toFixed(3),
            vedScore,
            torqueOk,
            poseOk,
          })}::jsonb,
          ${period},
          NOW()
        )
        ON CONFLICT DO NOTHING
      `);
    } catch (err) {
      log.warn({ err }, "Failed to bridge VED deduction to AEI contribution log (non-blocking)");
    }
  }

  log.info({
    robotId: reading.robotId,
    station: reading.stationCode,
    torqueOk,
    poseOk,
    vedScore,
    torqueDelta: torqueDelta.toFixed(2),
    poseDelta: poseDelta.toFixed(3),
  }, "Oiling control check completed");

  return { torqueOk, poseOk, torqueDelta, poseDelta, vedScore, alerts, penalties };
}
