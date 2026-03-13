/**
 * Dev-Env Router — Developer Environment Initialization & Pre-Push Checks
 *
 * 4 procedures wrapping existing services:
 *   checkMechElecSync  — Mechanical/Electrical conflict detection (blocks push)
 *   runOilingSimulation — AI oiling pose validation (warning only)
 *   getSharePointTree   — BU SharePoint directory tree
 *   getInitStatus       — Dev environment readiness checklist
 *
 * No new DB tables — reuses designSyncEvents from design-engine-schema.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { createChildLogger } from "../lib/logger";
import { requireDb } from "../db";

// Existing services
import {
  checkDesignConflicts,
  logDesignSyncEvent,
} from "../services/design-conflict-check.service";
import type { ConflictCheckResult } from "../services/design-conflict-check.service";
import { computeVedScore } from "../services/oiling-control-guard.service";
import type { OilingReading } from "../services/oiling-control-guard.service";
import { sseManager } from "../services/telemetry-sse.service";
import { sharepointSiteService } from "../services/microsoft-graph/sharepoint-site.service";

// Schema for event logging
import { designSyncEvents } from "../../drizzle/design-engine-schema";

const log = createChildLogger("dev-env");

// ── Helpers ────────────────────────────────────────────────────────────

/** Generate synthetic oiling readings with randomized pose jitter (±0.8mm) */
function generateSyntheticReadings(count: number): OilingReading[] {
  const readings: OilingReading[] = [];
  for (let i = 0; i < count; i++) {
    const baseX = 100 + i * 50;
    const baseY = 200 + i * 30;
    const baseZ = 50;
    // Jitter ±0.8mm on each axis
    const jitterX = (Math.random() - 0.5) * 1.6;
    const jitterY = (Math.random() - 0.5) * 1.6;
    const jitterZ = (Math.random() - 0.5) * 1.6;
    readings.push({
      robotId: 1,
      stationCode: `ST-SIM-${i + 1}`,
      torqueActual: 10 + Math.random() * 4, // 10-14 Nm
      torqueTarget: 12,
      poseX: baseX + jitterX,
      poseY: baseY + jitterY,
      poseZ: baseZ + jitterZ,
      baseX,
      baseY,
      baseZ,
    });
  }
  return readings;
}

/** Compute Euclidean pose delta */
function poseDelta(r: OilingReading): number {
  return Math.sqrt(
    (r.poseX - r.baseX) ** 2 +
    (r.poseY - r.baseY) ** 2 +
    (r.poseZ - r.baseZ) ** 2
  );
}

// ── Router ─────────────────────────────────────────────────────────────

export const devEnvRouter = router({
  /**
   * Check mechanical/electrical design sync for a project.
   * If blocking conflicts found → inserts designSyncEvent + returns blockedPush: true.
   */
  checkMechElecSync: requirePermission("dev:env:sync-check").input(
    z.object({ projectId: z.number().int().positive() }),
  ).mutation(async ({ input, ctx }) => {
    const { projectId } = input;
    log.info({ projectId, userId: ctx.user.id }, "checkMechElecSync invoked");

    const result: ConflictCheckResult = await checkDesignConflicts(projectId);
    const blockingConflicts = result.conflicts.filter(c => c.severity === "blocking");
    const blockedPush = blockingConflicts.length > 0;

    if (blockedPush) {
      // Log the conflict detection event
      await logDesignSyncEvent({
        projectId,
        eventType: "conflict_detected",
        userId: ctx.user.id,
        userName: ctx.user.name ?? "unknown",
        description: `Pre-push blocked: ${blockingConflicts.length} mechanical/electrical conflicts`,
        metadata: {
          conflictCount: blockingConflicts.length,
          conflicts: blockingConflicts.map(c => ({
            stationCode: c.stationCode,
            conflictType: c.conflictType,
            message: c.message,
          })),
        },
        severity: "critical",
      });
      log.warn({ projectId, conflictCount: blockingConflicts.length }, "Push blocked — mech/elec sync conflicts");
    }

    return {
      ...result,
      blockedPush,
      blockingConflictCount: blockingConflicts.length,
    };
  }),

  /**
   * Run AI oiling simulation with 5 synthetic readings.
   * If any ΔPos > 0.5mm → logs warning to designSyncEvents + SSE publish.
   * Does NOT block push (synthetic data, not real sensor data).
   */
  runOilingSimulation: requirePermission("dev:env:oiling-sim").input(
    z.object({ projectId: z.number().int().positive().optional().default(1) }),
  ).mutation(async ({ input, ctx }) => {
    const { projectId } = input;
    log.info({ projectId, userId: ctx.user.id }, "runOilingSimulation invoked");

    const readings = generateSyntheticReadings(5);
    const POSE_THRESHOLD = 0.5;

    const results = readings.map(reading => {
      const delta = poseDelta(reading);
      const vedScore = computeVedScore({
        torqueActual: reading.torqueActual,
        torqueTarget: reading.torqueTarget,
        poseDelta: delta,
        cycleTime: undefined,
      });
      return {
        stationCode: reading.stationCode,
        poseDelta: Math.round(delta * 1000) / 1000, // 3 decimal places
        vedScore: Math.round(vedScore * 100) / 100,
        poseOk: delta <= POSE_THRESHOLD,
        torqueActual: reading.torqueActual,
        torqueTarget: reading.torqueTarget,
      };
    });

    const failedReadings = results.filter(r => !r.poseOk);
    const allPass = failedReadings.length === 0;
    let riskWarningLogged = false;

    if (!allPass) {
      // Log robot anomaly to designSyncEvents
      try {
        const db = await requireDb();
        await db.insert(designSyncEvents).values({
          projectId,
          eventType: "robot_anomaly",
          userId: ctx.user.id,
          userName: ctx.user.name ?? "unknown",
          description: `Oiling simulation: ${failedReadings.length}/5 readings exceeded ΔPos threshold (${POSE_THRESHOLD}mm)`,
          metadata: {
            failedReadings: failedReadings.map(r => ({
              station: r.stationCode,
              poseDelta: r.poseDelta,
              vedScore: r.vedScore,
            })),
            simulatedAt: new Date().toISOString(),
          },
          severity: "warning",
        });
        riskWarningLogged = true;
      } catch (err) {
        log.error({ err }, "Failed to log oiling simulation warning");
      }

      // Publish SSE event for real-time CEO dashboard
      try {
        sseManager.publish("dev:oiling-check", {
          type: "oiling_simulation_warning",
          projectId,
          failedCount: failedReadings.length,
          totalCount: 5,
          timestamp: new Date().toISOString(),
          user: ctx.user.name ?? "unknown",
        });
      } catch (err) {
        log.error({ err }, "Failed to publish SSE oiling event");
      }

      log.warn({ projectId, failedCount: failedReadings.length }, "Oiling simulation: pose threshold exceeded");
    } else {
      log.info({ projectId }, "Oiling simulation: all readings pass");
    }

    return {
      pass: allPass,
      readings: results,
      riskWarningLogged,
      summary: allPass
        ? "All 5 synthetic readings within tolerance"
        : `${failedReadings.length}/5 readings exceeded ΔPos ${POSE_THRESHOLD}mm threshold`,
    };
  }),

  /**
   * Get SharePoint site tree per BU (for dev env initialization display).
   */
  getSharePointTree: protectedProcedure.input(
    z.object({ cluster: z.string().optional() }),
  ).query(async ({ input }) => {
    const sites = await sharepointSiteService.listSites(input.cluster);
    const clusterSummary = await sharepointSiteService.getClusterSummary();

    return {
      sites,
      clusterSummary,
      totalSites: sites.length,
      projectFolderTemplate: [
        "01_Proposal", "02_Mechanical", "03_Electrical", "04_PLC",
        "05_HMI", "06_BOM", "07_Procurement", "08_QA_Testing",
        "09_FAT", "10_SAT", "11_Manuals", "12_Archives",
      ],
    };
  }),

  /**
   * Check developer environment initialization status.
   * Returns checklist of setup steps with pass/fail.
   */
  getInitStatus: protectedProcedure.query(async () => {
    // These checks are informational — in a real deployment they would
    // use fs.existsSync or a Node API, but for the tRPC layer we return
    // the expected paths so the client/script can verify locally.
    const checks = [
      {
        step: "git_hooks",
        label: "Git pre-push hook installed",
        path: ".git/hooks/pre-push",
        description: "Enforces mech/elec sync check before every push",
      },
      {
        step: "vscode_settings",
        label: "VS Code settings.json",
        path: ".vscode/settings.json",
        description: "CTO-standard TypeScript, Prettier, Tailwind config",
      },
      {
        step: "vscode_extensions",
        label: "VS Code extensions.json",
        path: ".vscode/extensions.json",
        description: "Recommended team extensions (ESLint, GitLens, etc.)",
      },
      {
        step: "api_connectivity",
        label: "API server reachable",
        path: null,
        description: "Health endpoint returns OK",
        pass: true, // If this query runs, the API is reachable
      },
      {
        step: "sharepoint_access",
        label: "SharePoint BU directory available",
        path: null,
        description: "11-site directory tree accessible",
      },
    ];

    // Check SharePoint availability
    try {
      const sites = await sharepointSiteService.listSites();
      const spCheck = checks.find(c => c.step === "sharepoint_access");
      if (spCheck) {
        (spCheck as any).pass = sites.length > 0;
        (spCheck as any).siteCount = sites.length;
      }
    } catch {
      const spCheck = checks.find(c => c.step === "sharepoint_access");
      if (spCheck) (spCheck as any).pass = false;
    }

    return {
      checks,
      initScript: "bash scripts/grt-init-dev-env.sh",
      initScriptWindows: "powershell scripts/grt-init-dev-env.ps1",
    };
  }),
});
