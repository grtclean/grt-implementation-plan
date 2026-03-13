/**
 * Design Conflict Check Service — CTO Deliverable #2
 *
 * Detects mechanical↔electrical design synchronization conflicts:
 *   - MECH_UPDATED_AFTER_PLC: Station mechanical params changed after PLC version was frozen
 *   - NO_PLC_VERSION: Station exists but no PLC version has been generated
 *   - EPLAN_STALE: EPLAN export is older than latest mechanical or PLC changes
 *
 * Data sources:
 *   - equipment_stations (updatedAt) — last mechanical design change
 *   - plc_projects + plc_version_history — latest PLC version per project
 *   - design_export_logs — latest EPLAN export per project
 *
 * Also provides design sync event logging for audit trail.
 */

import { TRPCError } from "@trpc/server";
import { createChildLogger } from "../lib/logger";
import { requireDb } from "../db";
import {
  equipmentStations,
  designExportLogs,
} from "../../drizzle/design-engine-schema";
import { plcProjects, plcVersionHistory } from "../../drizzle/plc-program-schema";
import { eq, and, desc, sql } from "drizzle-orm";

const log = createChildLogger("design-conflict-check");

// ── Types ────────────────────────────────────────────────────────────────

export interface DesignConflict {
  stationId: number;
  stationCode: string;
  stationName: string;
  lastMechUpdate: string;
  lastPlcGen: string | null;
  lastEplanGen: string | null;
  conflictType: "MECH_UPDATED_AFTER_PLC" | "NO_PLC_VERSION" | "EPLAN_STALE";
  severity: "blocking" | "warning";
  message: string;
}

export interface ConflictCheckResult {
  projectId: number;
  hasConflicts: boolean;
  conflicts: DesignConflict[];
  plcVersion: string | null;
  recommendation: string;
}

// ── checkDesignConflicts ─────────────────────────────────────────────────

export async function checkDesignConflicts(
  projectId: number
): Promise<ConflictCheckResult> {
  const db = await requireDb();
  const conflicts: DesignConflict[] = [];

  log.info({ projectId }, "Starting design conflict check");

  // 1. Get all stations for this project
  const stations = await db
    .select()
    .from(equipmentStations)
    .where(eq(equipmentStations.projectId, projectId))
    .limit(1000);

  if (stations.length === 0) {
    log.info({ projectId }, "No stations found — skipping conflict check");
    return {
      projectId,
      hasConflicts: false,
      conflicts: [],
      plcVersion: null,
      recommendation: "No stations defined for this project. Add stations before running conflict checks.",
    };
  }

  // 2. Get the PLC project and its latest active version
  const plcProjectRows = await db
    .select()
    .from(plcProjects)
    .where(eq(plcProjects.projectId, projectId))
    .limit(1);

  let latestPlcVersion: {
    versionString: string;
    createdAt: string;
    isActive: boolean;
  } | null = null;

  if (plcProjectRows.length > 0) {
    const plcProject = plcProjectRows[0];
    const versionRows = await db
      .select()
      .from(plcVersionHistory)
      .where(
        and(
          eq(plcVersionHistory.plcProjectId, plcProject.id),
          eq(plcVersionHistory.isActive, true)
        )
      )
      .orderBy(desc(plcVersionHistory.createdAt))
      .limit(1);

    if (versionRows.length > 0) {
      latestPlcVersion = {
        versionString: versionRows[0].versionString,
        createdAt: versionRows[0].createdAt,
        isActive: versionRows[0].isActive ?? true,
      };
    }
  }

  // 3. Get the latest completed EPLAN export
  const eplanExports = await db
    .select()
    .from(designExportLogs)
    .where(
      and(
        eq(designExportLogs.projectId, projectId),
        eq(designExportLogs.exportStatus, "COMPLETED"),
        sql`${designExportLogs.exportFormat} IN ('EPLAN_XML', 'EPLAN_EXCEL')`
      )
    )
    .orderBy(desc(designExportLogs.createdAt))
    .limit(1);

  const latestEplanDate =
    eplanExports.length > 0 ? eplanExports[0].createdAt : null;

  // 4. Compare timestamps for each station
  for (const station of stations) {
    const mechUpdate = station.updatedAt;

    // Check: No PLC version exists at all
    if (!latestPlcVersion) {
      conflicts.push({
        stationId: station.id,
        stationCode: station.stationCode,
        stationName: station.stationName,
        lastMechUpdate: mechUpdate,
        lastPlcGen: null,
        lastEplanGen: latestEplanDate,
        conflictType: "NO_PLC_VERSION",
        severity: "blocking",
        message: `Station ${station.stationCode} (${station.stationName}) has no PLC version generated. Electrical design cannot proceed without PLC I/O mapping.`,
      });
      continue;
    }

    // Check: Mechanical params updated after PLC version was created
    const plcCreatedTime = new Date(latestPlcVersion.createdAt).getTime();
    const mechUpdateTime = new Date(mechUpdate).getTime();

    if (mechUpdateTime > plcCreatedTime) {
      conflicts.push({
        stationId: station.id,
        stationCode: station.stationCode,
        stationName: station.stationName,
        lastMechUpdate: mechUpdate,
        lastPlcGen: latestPlcVersion.createdAt,
        lastEplanGen: latestEplanDate,
        conflictType: "MECH_UPDATED_AFTER_PLC",
        severity: "blocking",
        message: `Station ${station.stationCode} (${station.stationName}) mechanical params updated at ${mechUpdate}, which is after PLC version ${latestPlcVersion.versionString} was generated at ${latestPlcVersion.createdAt}. PLC I/O mapping may be stale.`,
      });
    }

    // Check: EPLAN export is stale (older than mech update or PLC version)
    if (latestEplanDate) {
      const eplanTime = new Date(latestEplanDate).getTime();
      const referenceTime = Math.max(mechUpdateTime, plcCreatedTime);

      if (eplanTime < referenceTime) {
        conflicts.push({
          stationId: station.id,
          stationCode: station.stationCode,
          stationName: station.stationName,
          lastMechUpdate: mechUpdate,
          lastPlcGen: latestPlcVersion.createdAt,
          lastEplanGen: latestEplanDate,
          conflictType: "EPLAN_STALE",
          severity: "warning",
          message: `Station ${station.stationCode} (${station.stationName}) EPLAN schematic (${latestEplanDate}) is older than latest design changes. Re-export recommended.`,
        });
      }
    }
  }

  // 5. Build recommendation
  const blockingCount = conflicts.filter((c) => c.severity === "blocking").length;
  const warningCount = conflicts.filter((c) => c.severity === "warning").length;

  let recommendation: string;
  if (blockingCount > 0) {
    recommendation = `${blockingCount} blocking conflict(s) detected. Regenerate PLC program before proceeding with electrical design. ${warningCount > 0 ? `Additionally, ${warningCount} warning(s) suggest re-exporting EPLAN schematics.` : ""}`;
  } else if (warningCount > 0) {
    recommendation = `No blocking conflicts. ${warningCount} warning(s): consider re-exporting EPLAN schematics to stay in sync.`;
  } else {
    recommendation = "All clear — mechanical design, PLC program, and EPLAN schematics are in sync.";
  }

  log.info(
    {
      projectId,
      stationCount: stations.length,
      blockingConflicts: blockingCount,
      warningConflicts: warningCount,
      plcVersion: latestPlcVersion?.versionString ?? null,
    },
    "Design conflict check completed"
  );

  return {
    projectId,
    hasConflicts: conflicts.length > 0,
    conflicts,
    plcVersion: latestPlcVersion?.versionString ?? null,
    recommendation,
  };
}

// ── assertNoBlockingConflicts ─────────────────────────────────────────────

/**
 * Gate guard: throws PRECONDITION_FAILED if any blocking conflicts exist.
 * Call this before PLC generation / GIM transpile / EPLAN schematic generation
 * to prevent electrical artifacts from being produced against stale mechanical data.
 */
export async function assertNoBlockingConflicts(projectId: number): Promise<void> {
  const result = await checkDesignConflicts(projectId);
  const blocking = result.conflicts.filter(c => c.severity === "blocking");
  if (blocking.length > 0) {
    const details = blocking.map(c => `${c.stationCode}: ${c.message}`).join("; ");
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Blocking design conflicts detected. Resolve before generating: ${details}`,
    });
  }
}

// ── logDesignSyncEvent ───────────────────────────────────────────────────

/**
 * Log a design synchronization event for audit trail.
 *
 * Uses the design_export_logs table with a special "SYNC_EVENT" pseudo-format
 * stored in the fileContent field as JSON metadata. This avoids needing a new
 * table while maintaining full audit history.
 */
export async function logDesignSyncEvent(params: {
  projectId: number;
  eventType: string;
  stationId?: number;
  userId?: number;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = await requireDb();

  const eventPayload = {
    eventType: params.eventType,
    stationId: params.stationId ?? null,
    userId: params.userId ?? null,
    description: params.description,
    metadata: params.metadata ?? {},
    loggedAt: new Date().toISOString(),
  };

  // Store as a design_export_logs row with SOLIDWORKS_VBA format as placeholder
  // (the sync event data goes into fileContent as JSON)
  await db.insert(designExportLogs).values({
    projectId: params.projectId,
    exportFormat: "SOLIDWORKS_VBA",
    exportStatus: "COMPLETED",
    stationIds: params.stationId ? [params.stationId] : [],
    fileContent: JSON.stringify(eventPayload),
    fileName: `sync-event-${params.eventType}-${Date.now()}.json`,
    fileSizeBytes: 0,
    generationTimeMs: 0,
    exportedBy: params.userId ? String(params.userId) : "system",
  });

  log.info(
    {
      projectId: params.projectId,
      eventType: params.eventType,
      stationId: params.stationId,
      userId: params.userId,
    },
    `Design sync event logged: ${params.description}`
  );
}

// ── getConflictHistory ───────────────────────────────────────────────────

/**
 * Retrieve recent design sync events for a project (used by audit dashboards).
 */
export async function getConflictHistory(
  projectId: number,
  limit: number = 50
): Promise<
  Array<{
    id: number;
    eventType: string;
    description: string;
    stationId: number | null;
    userId: number | null;
    loggedAt: string;
    metadata: Record<string, unknown>;
  }>
> {
  const db = await requireDb();
  const safeLimit = Math.min(limit, 1000);

  const rows = await db
    .select()
    .from(designExportLogs)
    .where(
      and(
        eq(designExportLogs.projectId, projectId),
        sql`${designExportLogs.fileName} LIKE 'sync-event-%'`
      )
    )
    .orderBy(desc(designExportLogs.createdAt))
    .limit(safeLimit);

  return rows.map((row) => {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(row.fileContent ?? "{}");
    } catch {
      // Malformed JSON — return empty
    }

    return {
      id: row.id,
      eventType: (parsed.eventType as string) ?? "unknown",
      description: (parsed.description as string) ?? "",
      stationId: (parsed.stationId as number | null) ?? null,
      userId: (parsed.userId as number | null) ?? null,
      loggedAt: (parsed.loggedAt as string) ?? row.createdAt,
      metadata: (parsed.metadata as Record<string, unknown>) ?? {},
    };
  });
}
