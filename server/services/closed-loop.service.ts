/**
 * Closed-Loop Service — CTO Deliverable #1
 *
 * Wires robot anomalies to HR performance deductions, completing the
 * IoT → Safety → HR → AI Performance Engine closed loop:
 *
 *   1. Robot alert arrives (overtemp/collision/estop/servo_error/calibration_drift)
 *   2. Service checks for repeated alerts (>3 same type in 24h = escalation)
 *   3. Safety-critical alerts (collision/estop) create an intervention
 *   4. Repeated alerts trigger HR penalty (KPI deduction)
 *   5. HR penalty flows through to ai-performance-engine.service.ts
 *      (which reads hr_penalties and deducts from participation score)
 *   6. SSE event is published for real-time dashboards
 *
 * DB tables used:
 *   - robot_condition_alerts (read: count recent alerts)
 *   - hr_penalties (write: insert penalty rows)
 *   - design_export_logs (write: audit trail via sync events)
 */

import { createChildLogger } from "../lib/logger";
import { requireDb } from "../db";
import { eq, and, gte, sql, count } from "drizzle-orm";
import { robotConditionAlerts } from "../../drizzle/robot-fleet-schema";
import { hrPenalties } from "../../drizzle/smart-meetings-schema";
import { designExportLogs } from "../../drizzle/design-engine-schema";
import { sseManager } from "./telemetry-sse.service";

const log = createChildLogger("closed-loop");

// ── Types ────────────────────────────────────────────────────────────────

export interface RobotAlertInput {
  robotId: number;
  alertType:
    | "overtemp"
    | "collision"
    | "estop"
    | "servo_error"
    | "calibration_drift";
  severity: "critical" | "high" | "medium" | "low";
  operatorId?: number;
  operatorName?: string;
  equipmentId: number;
  description?: string;
}

export interface ClosedLoopResult {
  alertProcessed: boolean;
  telemetryUpdated: boolean;
  interventionCreated: boolean;
  penaltyApplied: boolean;
  actions: string[];
}

// Severity → robot_alert_severity_enum mapping
// (the input uses "high" but the DB enum uses "warning")
function mapSeverityToEnum(
  severity: RobotAlertInput["severity"]
): "info" | "warning" | "critical" | "emergency" {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
      return "info";
    default:
      return "info";
  }
}

// Alert type mapping — calibration_drift is not in the DB enum,
// so we map it to the closest match
function mapAlertTypeToEnum(
  alertType: RobotAlertInput["alertType"]
): "overtemp" | "collision" | "estop" | "servo_error" | "comm_loss" | "joint_limit" | "payload_exceeded" {
  if (alertType === "calibration_drift") {
    return "servo_error"; // closest match in the DB enum
  }
  return alertType;
}

// ── processRobotAlert ────────────────────────────────────────────────────

export async function processRobotAlert(
  input: RobotAlertInput
): Promise<ClosedLoopResult> {
  const db = await requireDb();
  const actions: string[] = [];
  let interventionCreated = false;
  let penaltyApplied = false;

  // 1. Log the alert event (structured log)
  log.warn(
    {
      robotId: input.robotId,
      alertType: input.alertType,
      severity: input.severity,
      operatorId: input.operatorId,
      equipmentId: input.equipmentId,
    },
    "Robot alert received — processing closed loop"
  );

  // 2. Record the alert in robot_condition_alerts
  await db.insert(robotConditionAlerts).values({
    robotId: input.robotId,
    alertType: mapAlertTypeToEnum(input.alertType),
    severity: mapSeverityToEnum(input.severity),
    message: input.description ?? `${input.alertType} alert on robot ${input.robotId}`,
    details: {
      originalAlertType: input.alertType,
      originalSeverity: input.severity,
      operatorId: input.operatorId ?? null,
      operatorName: input.operatorName ?? null,
      equipmentId: input.equipmentId,
      closedLoopProcessed: true,
    },
  });
  actions.push(`Alert recorded: ${input.alertType} (severity: ${input.severity})`);

  // 3. Check for repeated alerts (>3 same alertType for same robot in 24h)
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const recentAlertCounts = await db
    .select({ alertCount: count() })
    .from(robotConditionAlerts)
    .where(
      and(
        eq(robotConditionAlerts.robotId, input.robotId),
        eq(
          robotConditionAlerts.alertType,
          mapAlertTypeToEnum(input.alertType)
        ),
        gte(robotConditionAlerts.createdAt, twentyFourHoursAgo)
      )
    )
    .limit(1);

  const recentCount = recentAlertCounts[0]?.alertCount ?? 0;
  const isRepeated = recentCount > 3;

  log.info(
    {
      robotId: input.robotId,
      alertType: input.alertType,
      recentCount,
      isRepeated,
    },
    "Repeated alert check completed"
  );

  // 4. If collision or estop → create safety intervention
  if (input.alertType === "collision" || input.alertType === "estop") {
    const interventionDescription =
      input.alertType === "collision"
        ? `Collision detected on robot ${input.robotId}. Operator ${input.operatorName ?? input.operatorId ?? "unknown"} must complete safety training before resuming operations.`
        : `Emergency stop triggered on robot ${input.robotId}. Operator ${input.operatorName ?? input.operatorId ?? "unknown"} review required.`;

    // Log the intervention as a design sync event (audit trail)
    await logClosedLoopEvent(db, {
      eventType: "safety_incident",
      description: interventionDescription,
      metadata: {
        robotId: input.robotId,
        alertType: input.alertType,
        severity: input.severity,
        operatorId: input.operatorId,
        operatorName: input.operatorName,
        equipmentId: input.equipmentId,
        triggerType: "SAFETY_INCIDENT",
        actionRequired: "safety_training",
      },
    });

    interventionCreated = true;
    actions.push(
      `Safety intervention created for operator ${input.operatorName ?? input.operatorId ?? "unknown"}`
    );

    log.warn(
      {
        robotId: input.robotId,
        alertType: input.alertType,
        operatorId: input.operatorId,
      },
      "Safety intervention created — operator review required"
    );
  }

  // 5. If repeated alert (>3 in 24h) → apply HR penalty
  if (isRepeated && input.operatorId) {
    const penaltyReason = `Repeated ${input.alertType} alerts on robot ${input.robotId}: ${recentCount} occurrences in 24h. Equipment ID: ${input.equipmentId}.`;

    await db.insert(hrPenalties).values({
      userId: input.operatorId,
      userName: input.operatorName ?? null,
      penaltyLevel: "WARNING",
      reason: penaltyReason,
      deductedKpiPoints: -2,
      meetingId: null,
      meetingTitle: `Robot Alert: ${input.alertType}`,
      makeupTaskCreated: false,
      notificationSent: false,
    });

    penaltyApplied = true;
    actions.push(
      `HR penalty applied: -2 KPI points for operator ${input.operatorName ?? input.operatorId} (${recentCount} repeated alerts in 24h)`
    );

    // Log the penalty event
    await logClosedLoopEvent(db, {
      eventType: "hr_penalty",
      description: `KPI deduction for operator ${input.operatorName ?? input.operatorId}: ${penaltyReason}`,
      metadata: {
        operatorId: input.operatorId,
        operatorName: input.operatorName,
        robotId: input.robotId,
        alertType: input.alertType,
        alertCount: recentCount,
        deductedKpiPoints: -2,
        penaltyLevel: "WARNING",
      },
    });

    log.warn(
      {
        operatorId: input.operatorId,
        operatorName: input.operatorName,
        robotId: input.robotId,
        alertCount: recentCount,
        deductedKpiPoints: -2,
      },
      "HR penalty applied — KPI deduction for repeated robot alerts"
    );
  }

  // 6. Emit SSE events for real-time dashboards
  sseManager.publish("robot:alert", {
    robotId: input.robotId,
    alertType: input.alertType,
    severity: input.severity,
    operatorId: input.operatorId,
    equipmentId: input.equipmentId,
    description: input.description,
    isRepeated,
    recentCount,
    timestamp: new Date().toISOString(),
  });

  if (interventionCreated) {
    sseManager.publish("intervention:created", {
      type: "SAFETY_INCIDENT",
      robotId: input.robotId,
      operatorId: input.operatorId,
      operatorName: input.operatorName,
      alertType: input.alertType,
      timestamp: new Date().toISOString(),
    });
  }

  if (penaltyApplied) {
    sseManager.publish("hr:penalty", {
      operatorId: input.operatorId,
      operatorName: input.operatorName,
      robotId: input.robotId,
      deductedKpiPoints: -2,
      reason: `Repeated ${input.alertType} alerts`,
      timestamp: new Date().toISOString(),
    });
  }

  log.info(
    {
      robotId: input.robotId,
      alertType: input.alertType,
      interventionCreated,
      penaltyApplied,
      actionCount: actions.length,
    },
    "Closed loop processing complete"
  );

  return {
    alertProcessed: true,
    telemetryUpdated: true,
    interventionCreated,
    penaltyApplied,
    actions,
  };
}

// ── getClosedLoopEvents ──────────────────────────────────────────────────

/**
 * Query closed-loop events from the audit trail.
 * Filters by operator or event type, ordered by most recent first.
 */
export async function getClosedLoopEvents(params: {
  projectId?: number;
  operatorId?: number;
  limit?: number;
}): Promise<
  Array<{
    id: number;
    eventType: string;
    description: string;
    metadata: Record<string, unknown>;
    loggedAt: string;
  }>
> {
  const db = await requireDb();
  const safeLimit = Math.min(params.limit ?? 50, 1000);

  // Query sync events that are closed-loop related
  const rows = await db
    .select()
    .from(designExportLogs)
    .where(
      sql`${designExportLogs.fileName} LIKE 'closed-loop-%'`
    )
    .orderBy(sql`${designExportLogs.createdAt} DESC`)
    .limit(safeLimit);

  const events = rows
    .map((row) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(row.fileContent ?? "{}");
      } catch {
        return null;
      }

      const metadata = (parsed.metadata as Record<string, unknown>) ?? {};

      // Apply filters
      if (params.operatorId && metadata.operatorId !== params.operatorId) {
        return null;
      }

      return {
        id: row.id,
        eventType: (parsed.eventType as string) ?? "unknown",
        description: (parsed.description as string) ?? "",
        metadata,
        loggedAt: (parsed.loggedAt as string) ?? row.createdAt,
      };
    })
    .filter(
      (
        e
      ): e is {
        id: number;
        eventType: string;
        description: string;
        metadata: Record<string, unknown>;
        loggedAt: string;
      } => e !== null
    );

  return events;
}

// ── getOperatorRiskProfile ───────────────────────────────────────────────

/**
 * Aggregate risk profile for an operator across robot alerts and HR penalties.
 * Used by managers and safety officers to assess operator risk.
 */
export async function getOperatorRiskProfile(operatorId: number): Promise<{
  totalAlerts: number;
  safetyIncidents: number;
  penaltiesApplied: number;
  totalKpiDeductions: number;
  riskLevel: string;
}> {
  const db = await requireDb();

  // Count total HR penalties for this operator
  const penaltyRows = await db
    .select({
      penaltyCount: count(),
      totalDeductions: sql<number>`COALESCE(SUM(ABS(${hrPenalties.deductedKpiPoints})), 0)`,
    })
    .from(hrPenalties)
    .where(eq(hrPenalties.userId, operatorId))
    .limit(1);

  const penaltiesApplied = penaltyRows[0]?.penaltyCount ?? 0;
  const totalKpiDeductions = penaltyRows[0]?.totalDeductions ?? 0;

  // Count closed-loop events related to this operator (safety incidents)
  const closedLoopEvents = await getClosedLoopEvents({
    operatorId,
    limit: 1000,
  });

  const safetyIncidents = closedLoopEvents.filter(
    (e) => e.eventType === "safety_incident"
  ).length;

  const totalAlerts = closedLoopEvents.length;

  // Calculate risk level based on composite score
  // Weights: safety incidents (x10), penalties (x5), general alerts (x1)
  const riskScore =
    safetyIncidents * 10 + penaltiesApplied * 5 + totalAlerts;

  let riskLevel: string;
  if (riskScore >= 50) {
    riskLevel = "critical";
  } else if (riskScore >= 25) {
    riskLevel = "high";
  } else if (riskScore >= 10) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }

  log.info(
    {
      operatorId,
      totalAlerts,
      safetyIncidents,
      penaltiesApplied,
      totalKpiDeductions,
      riskScore,
      riskLevel,
    },
    "Operator risk profile computed"
  );

  return {
    totalAlerts,
    safetyIncidents,
    penaltiesApplied,
    totalKpiDeductions,
    riskLevel,
  };
}

// ── Private helpers ──────────────────────────────────────────────────────

/**
 * Log a closed-loop event to the design_export_logs audit trail.
 */
async function logClosedLoopEvent(
  db: ReturnType<typeof import("drizzle-orm/node-postgres").drizzle>,
  params: {
    eventType: string;
    description: string;
    metadata: Record<string, unknown>;
  }
): Promise<void> {
  const eventPayload = {
    eventType: params.eventType,
    description: params.description,
    metadata: params.metadata,
    loggedAt: new Date().toISOString(),
  };

  await db.insert(designExportLogs).values({
    projectId: 0, // system-level event, not project-specific
    exportFormat: "SOLIDWORKS_VBA",
    exportStatus: "COMPLETED",
    stationIds: [],
    fileContent: JSON.stringify(eventPayload),
    fileName: `closed-loop-${params.eventType}-${Date.now()}.json`,
    fileSizeBytes: 0,
    generationTimeMs: 0,
    exportedBy: "closed-loop-service",
  });
}
