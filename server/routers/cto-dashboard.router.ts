/**
 * CTO Dashboard Router — Technical Architecture & Engineering Overview
 *
 * 6 procedures: getArchitectureHealth, getDesignActivity, getRobotFleetSummary,
 *               getConflictStatus, getNineGrid, getTechDebt
 *
 * Wraps monitoring.service for system metrics, design-conflict-check.service
 * for cross-discipline conflict detection, and AEI data for 9-grid placement.
 *
 * Access: All protectedProcedure (executive/CTO level via role).
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { MonitoringService } from "../monitoring/monitoring.service";
import { checkDesignConflicts } from "../services/design-conflict-check.service";
import { designExportLogs, designSyncEvents } from "../../drizzle/design-engine-schema";
import { robotFleetRegistry, robotConditionAlerts } from "../../drizzle/robot-fleet-schema";
import { aeiMonthlyScores } from "../../drizzle/aei-extended-schema";
import { projects } from "../../drizzle/schema";
import { eq, desc, and, count, gte, sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("cto-dashboard-router");

// ── 5-minute in-memory cache ────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

const monitoringService = new MonitoringService();

export const ctoDashboardRouter = router({
  // ── Architecture Health: CPU, memory, DB connections, latency ─────────
  systemHealth: protectedProcedure.query(async () => {
    const cacheKey = "arch-health";
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const systemMetrics = monitoringService.getSystemMetrics();

    // DB connection test (use simple SELECT 1 to avoid table dependency)
    let dbLatencyMs = 0;
    let dbConnections = 0;
    try {
      const db = await requireDb();
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatencyMs = Date.now() - start;
      dbConnections = 10; // placeholder — real pool stats require pg.Pool reference
    } catch {
      dbLatencyMs = -1;
    }

    const result = {
      cpu: {
        usage: Math.round(systemMetrics.cpu.usage * 10) / 10,
        cores: systemMetrics.cpu.cores,
        loadAverage: systemMetrics.cpu.loadAverage,
        grade: systemMetrics.cpu.usage < 60 ? "green" : systemMetrics.cpu.usage < 85 ? "yellow" : "red",
      },
      memory: {
        usagePct: Math.round(systemMetrics.memory.usage * 10) / 10,
        totalMB: Math.round(systemMetrics.memory.total / 1048576),
        usedMB: Math.round(systemMetrics.memory.used / 1048576),
        grade: systemMetrics.memory.usage < 70 ? "green" : systemMetrics.memory.usage < 90 ? "yellow" : "red",
      },
      database: {
        latencyMs: dbLatencyMs,
        connections: dbConnections,
        grade: dbLatencyMs < 0 ? "red" : dbLatencyMs < 50 ? "green" : dbLatencyMs < 200 ? "yellow" : "red",
      },
      disk: {
        usagePct: Math.round(systemMetrics.disk.usage * 10) / 10,
        grade: systemMetrics.disk.usage < 70 ? "green" : systemMetrics.disk.usage < 90 ? "yellow" : "red",
      },
      updatedAt: new Date().toISOString(),
    };

    setCache(cacheKey, result);
    return result;
  }),

  // ── Design Activity: recent exports and sync events ───────────────────
  designActivity: protectedProcedure
    .input(
      z
        .object({
          days: z.number().int().min(1).max(90).default(30),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const days = input?.days ?? 30;
      const limitN = input?.limit ?? 50;
      const cacheKey = `design-activity:${days}:${limitN}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      const db = await requireDb();
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Recent design exports (table may not exist yet)
      let exports: any[] = [];
      try {
        exports = await db
          .select()
          .from(designExportLogs)
          .where(gte(designExportLogs.createdAt, sinceDate))
          .orderBy(desc(designExportLogs.createdAt))
          .limit(limitN);
      } catch (err) {
        log.warn({ err }, "designExportLogs query failed — table may not exist");
      }

      // Recent sync events (table may not exist yet)
      let syncEvents: any[] = [];
      try {
        syncEvents = await db
          .select()
          .from(designSyncEvents)
          .where(gte(designSyncEvents.createdAt, sinceDate))
          .orderBy(desc(designSyncEvents.createdAt))
          .limit(limitN);
      } catch (err) {
        log.warn({ err }, "designSyncEvents query failed — table may not exist");
      }

      // Format-based breakdown
      const formatCounts: Record<string, number> = {};
      for (const e of exports) {
        formatCounts[e.exportFormat] = (formatCounts[e.exportFormat] || 0) + 1;
      }

      // Event type breakdown
      const eventTypeCounts: Record<string, number> = {};
      for (const e of syncEvents) {
        eventTypeCounts[e.eventType] = (eventTypeCounts[e.eventType] || 0) + 1;
      }

      const result = {
        periodDays: days,
        exports: {
          total: exports.length,
          formatBreakdown: formatCounts,
          recent: exports.slice(0, 10),
        },
        syncEvents: {
          total: syncEvents.length,
          typeBreakdown: eventTypeCounts,
          recent: syncEvents.slice(0, 10),
        },
      };

      setCache(cacheKey, result);
      return result;
    }),

  // ── Robot Fleet Summary: online/offline/error counts + recent alerts ──
  robotFleet: protectedProcedure.query(async () => {
    const cacheKey = "robot-fleet";
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const db = await requireDb();

    let robots: any[] = [];
    try {
      robots = await db
        .select()
        .from(robotFleetRegistry)
        .limit(500);
    } catch (err) {
      log.warn({ err }, "robotFleetRegistry query failed — table may not exist");
    }

    const statusCounts: Record<string, number> = { online: 0, offline: 0, error: 0, maintenance: 0 };
    const brandCounts: Record<string, number> = {};
    for (const r of robots) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      brandCounts[r.brand] = (brandCounts[r.brand] || 0) + 1;
    }

    // Recent critical alerts
    let criticalAlerts: any[] = [];
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      criticalAlerts = await db
        .select()
        .from(robotConditionAlerts)
        .where(
          and(
            gte(robotConditionAlerts.createdAt, sevenDaysAgo),
            sql`${robotConditionAlerts.severity} IN ('critical', 'emergency')`,
          ),
        )
        .orderBy(desc(robotConditionAlerts.createdAt))
        .limit(20);
    } catch (err) {
      log.warn({ err }, "robotConditionAlerts query failed — table may not exist");
    }

    const result = {
      totalRobots: robots.length,
      statusCounts,
      brandCounts,
      recentCriticalAlerts: criticalAlerts.length,
      alerts: criticalAlerts.slice(0, 5),
    };

    setCache(cacheKey, result);
    return result;
  }),

  // ── Conflict Status: run conflict check for all active projects ───────
  designConflicts: protectedProcedure
    .input(z.object({ projectIds: z.array(z.number().int()).optional() }).optional())
    .query(async ({ input }) => {
      const cacheKey = `conflicts:${JSON.stringify(input?.projectIds || "all")}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      let projectIdList: number[] = input?.projectIds || [];

      // Get active projects (wrapped in try/catch for missing table)
      if (projectIdList.length === 0) {
        try {
          const db = await requireDb();
          const activeProjects = await db
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.status, "active"))
            .limit(50);
          projectIdList = activeProjects.map((p) => p.id);
        } catch (err) {
          log.warn({ err }, "Failed to query active projects for conflict check");
        }
      }

      // Run conflict check for each (limit to 20 to avoid timeout)
      const checks = [];
      for (const pid of projectIdList.slice(0, 20)) {
        try {
          const result = await checkDesignConflicts(pid);
          checks.push(result);
        } catch (err) {
          log.warn({ err, projectId: pid }, "Conflict check failed for project");
          checks.push({
            projectId: pid,
            hasConflicts: false,
            conflicts: [],
            plcVersion: null,
            recommendation: "Conflict check failed — unable to reach design data",
          });
        }
      }

      const result = {
        projectsChecked: checks.length,
        projectsWithConflicts: checks.filter((c) => c.hasConflicts).length,
        totalConflicts: checks.reduce((s, c) => s + c.conflicts.length, 0),
        results: checks,
      };

      setCache(cacheKey, result);
      return result;
    }),

  // ── 9-Grid: Performance (composite) vs Potential (trend slope) ────────
  nineGridData: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).optional())
    .query(async ({ input }) => {
      const currentMonth = input?.month || (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })();
      const cacheKey = `nine-grid:${currentMonth}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      // 3x3 grid placement:
      // Performance axis (compositeAeiScore): Low (<40), Medium (40-70), High (>70)
      // Potential axis (trendSlope): Low (<-1), Medium (-1 to 1), High (>1)
      type GridCell = Array<{ userId: number; userName: string; score: number; slope: number }>;
      const grid: Record<string, GridCell> = {
        "high-high": [], "high-medium": [], "high-low": [],
        "medium-high": [], "medium-medium": [], "medium-low": [],
        "low-high": [], "low-medium": [], "low-low": [],
      };

      let scores: any[] = [];
      try {
        const db = await requireDb();
        scores = await db
          .select()
          .from(aeiMonthlyScores)
          .where(eq(aeiMonthlyScores.month, currentMonth))
          .limit(1000);
      } catch (err) {
        log.warn({ err }, "aeiMonthlyScores query failed — table may not exist");
      }

      for (const s of scores) {
        const score = Number(s.compositeAeiScore || 0);
        const slope = Number(s.trendSlope || 0);

        const perfLevel = score > 70 ? "high" : score >= 40 ? "medium" : "low";
        const potLevel = slope > 1 ? "high" : slope >= -1 ? "medium" : "low";

        const key = `${perfLevel}-${potLevel}`;
        grid[key].push({
          userId: s.userId,
          userName: s.userName,
          score,
          slope: Math.round(slope * 100) / 100,
        });
      }

      const result = {
        month: currentMonth,
        totalEmployees: scores.length,
        grid,
        summary: {
          stars: grid["high-high"].length,
          solidPerformers: grid["high-medium"].length + grid["high-low"].length,
          growthPotential: grid["medium-high"].length + grid["low-high"].length,
          atRisk: grid["low-low"].length + grid["low-medium"].length,
        },
      };

      setCache(cacheKey, result);
      return result;
    }),

  // ── Tech Debt: approximation based on code/system indicators ──────────
  techDebt: protectedProcedure.query(async () => {
    const cacheKey = "tech-debt";
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const db = await requireDb();

    // Count failed/stale design exports as tech debt indicators
    let staleExports = 0;
    try {
      const [result] = await db
        .select({ value: count() })
        .from(designExportLogs)
        .where(eq(designExportLogs.exportStatus, "FAILED"));
      staleExports = Number(result?.value || 0);
    } catch {
      staleExports = 0;
    }

    // Robot fleet errors as operational tech debt
    let robotErrors = 0;
    try {
      const [result] = await db
        .select({ value: count() })
        .from(robotFleetRegistry)
        .where(eq(robotFleetRegistry.status, "error"));
      robotErrors = Number(result?.value || 0);
    } catch {
      robotErrors = 0;
    }

    // Unresolved design sync conflicts
    let unresolvedConflicts = 0;
    try {
      const [result] = await db
        .select({ value: count() })
        .from(designSyncEvents)
        .where(eq(designSyncEvents.eventType, "conflict_detected"));
      unresolvedConflicts = Number(result?.value || 0);
    } catch {
      unresolvedConflicts = 0;
    }

    const debtScore = Math.min(100,
      staleExports * 5 + robotErrors * 10 + unresolvedConflicts * 8,
    );

    const result = {
      debtScore,
      grade: debtScore < 20 ? "green" : debtScore < 50 ? "yellow" : "red",
      indicators: {
        failedDesignExports: staleExports,
        robotsInErrorState: robotErrors,
        unresolvedDesignConflicts: unresolvedConflicts,
      },
      recommendations: [
        ...(staleExports > 0 ? [`${staleExports} failed design exports — review and retry or clean up`] : []),
        ...(robotErrors > 0 ? [`${robotErrors} robots in error state — schedule maintenance`] : []),
        ...(unresolvedConflicts > 0 ? [`${unresolvedConflicts} unresolved design conflicts — run conflict resolution`] : []),
      ],
      updatedAt: new Date().toISOString(),
    };

    setCache(cacheKey, result);
    return result;
  }),
});
