/**
 * Violation Report Service — GRT开发第一定律 Layer IV (Risk Engine)
 *
 * Unified internal API for reporting violation events.
 * Sub-Agents and modules call reportViolationEvent() with severity only.
 * The core 红线仲裁引擎 handles:
 *   - DB insert into violation_events
 *   - Auto-freeze on MAJOR/CRITICAL
 *   - Structured logging for audit trail
 *
 * Usage:
 *   import { reportViolationEvent } from "../services/violation-report.service";
 *   await reportViolationEvent({ severity: "MAJOR", title: "...", sourceModule: "cicd" });
 */
import { requireDb } from "../db";
import { violationEvents, performanceRecords } from "../../drizzle/performance-schema";
import { eq, and, desc } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("violation-engine");

export type ViolationSeverity = "MINOR" | "MAJOR" | "CRITICAL";

export interface ViolationInput {
  eventType?: string;
  severity: ViolationSeverity;
  sourceModule: string;
  title: string;
  description?: string;
  impactDescription?: string;
  triggeredBy?: string;
  buId?: number;
  departmentId?: number;
  userId?: number;
  projectId?: number;
}

export interface ViolationResult {
  eventId: number;
  severity: ViolationSeverity;
  frozePerformanceId: number | null;
}

/**
 * Report a violation event — the single entry point for all sub-agents.
 *
 * MINOR → logged only
 * MAJOR → logged + auto-freeze latest performance record for BU
 * CRITICAL → logged + auto-freeze + escalation flag
 */
export async function reportViolationEvent(input: ViolationInput): Promise<ViolationResult> {
  const db = await requireDb();

  log.warn({
    severity: input.severity,
    sourceModule: input.sourceModule,
    title: input.title,
    userId: input.userId,
    buId: input.buId,
  }, `Violation reported: ${input.severity} — ${input.title}`);

  const [event] = await db.insert(violationEvents).values({
    eventType: input.eventType ?? `${input.sourceModule}_violation`,
    severity: input.severity,
    sourceModule: input.sourceModule,
    title: input.title,
    description: input.description,
    impactDescription: input.impactDescription,
    triggeredBy: input.triggeredBy ?? "system",
    buId: input.buId,
    departmentId: input.departmentId,
    userId: input.userId,
    projectId: input.projectId,
    status: "open",
  }).returning();

  let frozePerformanceId: number | null = null;

  // Auto-freeze on MAJOR/CRITICAL
  if (input.severity !== "MINOR" && input.buId) {
    try {
      frozePerformanceId = await autoFreezePerformance(
        db, event.id, input.buId, input.severity, input.title,
      );
    } catch (err) {
      log.error({ err, eventId: event.id }, "Auto-freeze failed (non-blocking)");
    }
  }

  if (input.severity === "CRITICAL") {
    log.error({
      eventId: event.id,
      severity: "CRITICAL",
      sourceModule: input.sourceModule,
    }, `🚨 CRITICAL violation — escalation required: ${input.title}`);
  }

  return {
    eventId: event.id,
    severity: input.severity,
    frozePerformanceId,
  };
}

/**
 * Internal: freeze the most recent unfrozen performance record for the BU.
 */
async function autoFreezePerformance(
  db: any,
  violationEventId: number,
  buId: number,
  severity: string,
  title: string,
): Promise<number | null> {
  // Find latest unfrozen performance record for this BU
  const [record] = await db.select({ id: performanceRecords.id })
    .from(performanceRecords)
    .where(and(
      eq(performanceRecords.buId, buId),
      eq(performanceRecords.isFrozen, false),
    ))
    .orderBy(desc(performanceRecords.createdAt))
    .limit(1);

  if (!record) return null;

  await db.update(performanceRecords).set({
    isFrozen: true,
    frozenReason: `Violation #${violationEventId} [${severity}]: ${title}`,
    updatedAt: new Date().toISOString(),
  }).where(eq(performanceRecords.id, record.id));

  // Link the violation event to the frozen record
  await db.update(violationEvents).set({
    frozePerformanceId: record.id,
  }).where(eq(violationEvents.id, violationEventId));

  log.warn({
    violationEventId,
    performanceRecordId: record.id,
    severity,
  }, "Performance record auto-frozen");

  return record.id;
}
