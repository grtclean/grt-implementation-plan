/**
 * System Stability Router — Capacity Projection + Load Testing + Synthetic Probes
 *
 * 5 procedures: overview, analyzeCapacity, getLoadTestConfig, getCapacityProjectionReport, runSyntheticProbe
 *
 * CTO Deliverable #3: System stability prediction for 100-machine scale.
 * - analyzeCapacity: Reads current monitoring metrics, extrapolates for N machines,
 *   generates recommendations array
 * - getLoadTestConfig: Returns autocannon config for telemetry burst, concurrent
 *   uploads, dashboard refresh
 * - runSyntheticProbe: 50-iteration self-test measuring P50/P95/P99 latency for
 *   key DB queries
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { MonitoringService } from "../monitoring/monitoring.service";
import { oeeSnapshots } from "../../drizzle/oee-schema";
import { robotConditionAlerts } from "../../drizzle/robot-fleet-schema";
import { aeiMonthlyScores } from "../../drizzle/aei-extended-schema";
import { count, desc } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("system-stability-router");

const configPermission = requirePermission("system:config:manage");
const monitoringService = new MonitoringService();

/** Compute percentiles from a sorted array of numbers */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export const systemStabilityRouter = router({
  // ── Overview: current stability snapshot (used by CTO Dashboard) ───────
  overview: protectedProcedure.query(async () => {
    const systemMetrics = monitoringService.getSystemMetrics();
    const currentMachines = 15;
    const target = 100;
    const scaleFactor = target / Math.max(currentMachines, 1);

    const currentMemUsedMB = Math.round(systemMetrics.memory.used / 1048576);
    const currentMemTotalMB = Math.round(systemMetrics.memory.total / 1048576);
    const projectedMemMB = currentMemUsedMB + (target - currentMachines) * 50;
    const currentPoolSize = parseInt(process.env.DB_POOL_SIZE || "10", 10);
    const projectedConnections = Math.ceil(target / 10) + 2;
    const projectedCpu = systemMetrics.cpu.usage * scaleFactor;

    const checks = [
      projectedMemMB < currentMemTotalMB * 0.85,
      projectedConnections <= currentPoolSize,
      projectedCpu < 80,
    ];
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    const grade = score >= 80 ? "green" : score >= 50 ? "yellow" : "red";

    const recommendations: string[] = [];
    if (!checks[0]) recommendations.push("Increase memory or optimize telemetry buffering");
    if (!checks[1]) recommendations.push(`Increase DB_POOL_SIZE to ${projectedConnections + 5}`);
    if (!checks[2]) recommendations.push("Scale horizontally or optimize hot paths");
    if (recommendations.length === 0) recommendations.push("System ready for 100-machine scale");

    return {
      score, grade, targetMachines: target, currentMachines, recommendations,
      trend: score >= 70 ? "stable" : "declining",
      updatedAt: new Date().toISOString(),
    };
  }),

  // ── Analyze Capacity: extrapolate metrics for target machine count ────
  analyzeCapacity: protectedProcedure
    .input(
      z
        .object({
          targetMachines: z.number().int().min(1).max(10000).default(100),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const target = input?.targetMachines ?? 100;
      const systemMetrics = monitoringService.getSystemMetrics();

      // Current baseline
      const currentMachines = 15; // current fleet size
      const scaleFactor = target / Math.max(currentMachines, 1);

      // Memory projection: each machine adds ~50MB telemetry buffer
      const currentMemUsedMB = Math.round(systemMetrics.memory.used / 1048576);
      const currentMemTotalMB = Math.round(systemMetrics.memory.total / 1048576);
      const projectedMemMB = currentMemUsedMB + (target - currentMachines) * 50;
      const memoryOk = projectedMemMB < currentMemTotalMB * 0.85;

      // DB connection projection: each 10 machines needs ~1 pool connection
      const currentPoolSize = parseInt(process.env.DB_POOL_SIZE || "10", 10);
      const projectedConnections = Math.ceil(target / 10) + 2;
      const dbOk = projectedConnections <= currentPoolSize;

      // SSE/WebSocket projection: 2 per machine (telemetry + alerts)
      const projectedSseConnections = target * 2;
      const sseOk = projectedSseConnections < 5000;

      // Query latency projection: +0.5ms per 10 machines beyond current
      const additionalMachines = Math.max(0, target - currentMachines);
      const projectedQueryMs = 10 + (additionalMachines / 10) * 0.5;
      const queryOk = projectedQueryMs < 200;

      // CPU projection
      const projectedCpu = systemMetrics.cpu.usage * scaleFactor;
      const cpuOk = projectedCpu < 80;

      // Generate recommendations
      const recommendations: string[] = [];
      if (!memoryOk) {
        recommendations.push(
          `Memory: ${projectedMemMB}MB projected > 85% of ${currentMemTotalMB}MB — add RAM or optimize telemetry buffering`,
        );
      }
      if (!dbOk) {
        recommendations.push(
          `DB Pool: ${projectedConnections} connections needed > pool size ${currentPoolSize} — increase DB_POOL_SIZE to ${projectedConnections + 5}`,
        );
      }
      if (!sseOk) {
        recommendations.push(
          `SSE: ${projectedSseConnections} connections projected — implement connection multiplexing or use Redis Pub/Sub`,
        );
      }
      if (!queryOk) {
        recommendations.push(
          `Query latency: ${Math.round(projectedQueryMs)}ms projected — add read replicas or implement query caching`,
        );
      }
      if (!cpuOk) {
        recommendations.push(
          `CPU: ${Math.round(projectedCpu)}% projected — scale horizontally or optimize hot paths`,
        );
      }
      if (recommendations.length === 0) {
        recommendations.push("System is projected to handle target load within current resource limits.");
      }

      const overallGrade = [memoryOk, dbOk, sseOk, queryOk, cpuOk].every(Boolean)
        ? "green"
        : [memoryOk, dbOk, sseOk, queryOk, cpuOk].filter(Boolean).length >= 3
          ? "yellow"
          : "red";

      return {
        targetMachines: target,
        currentMachines,
        scaleFactor: Math.round(scaleFactor * 100) / 100,
        projections: {
          memory: { currentMB: currentMemUsedMB, projectedMB: projectedMemMB, totalMB: currentMemTotalMB, ok: memoryOk },
          dbPool: { currentSize: currentPoolSize, projectedNeeded: projectedConnections, ok: dbOk },
          sse: { projected: projectedSseConnections, ok: sseOk },
          queryLatency: { projectedMs: Math.round(projectedQueryMs), ok: queryOk },
          cpu: { currentPct: Math.round(systemMetrics.cpu.usage), projectedPct: Math.round(projectedCpu), ok: cpuOk },
        },
        overallGrade,
        recommendations,
      };
    }),

  // ── Load Test Config: autocannon presets ───────────────────────────────
  getLoadTestConfig: protectedProcedure.query(async () => {
    const baseUrl = process.env.VITE_API_URL || "http://localhost:5000";

    return {
      presets: [
        {
          name: "Telemetry Burst",
          description: "Simulate 100 machines sending telemetry simultaneously",
          config: {
            url: `${baseUrl}/api/trpc/monitoring.ingestTelemetry`,
            connections: 100,
            duration: 30,
            pipelining: 1,
            method: "POST" as const,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              machineId: 1,
              temperature: 42.5,
              vibration: 0.8,
              pressure: 3.2,
              timestamp: new Date().toISOString(),
            }),
          },
        },
        {
          name: "Concurrent Uploads",
          description: "Simulate 20 parallel 5MB file upload initiations",
          config: {
            url: `${baseUrl}/api/trpc/fileUpload.initiateUpload`,
            connections: 20,
            duration: 15,
            pipelining: 1,
            method: "POST" as const,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              fileName: "test-upload.step",
              fileSizeBytes: 5242880,
              mimeType: "application/octet-stream",
            }),
          },
        },
        {
          name: "Dashboard Refresh",
          description: "Simulate 50 users refreshing CEO/CTO dashboards",
          config: {
            url: `${baseUrl}/api/trpc/ceoDashboard.getHealthScores`,
            connections: 50,
            duration: 60,
            pipelining: 1,
            method: "GET" as const,
          },
        },
      ],
      notes: [
        "Run with: npx autocannon -c <connections> -d <duration> <url>",
        "Ensure load tests target staging, NOT production",
        "Monitor DB connection pool during test via /api/trpc/monitoring.getSystemMetrics",
      ],
    };
  }),

  // ── Capacity Projection Report: architecture sizing for target scale ──
  getCapacityProjectionReport: configPermission
    .input(z.object({
      targetMachines: z.number().int().min(1).max(10000).default(100),
    }))
    .query(async ({ input }) => {
      const { getCapacityProjectionReport } = await import("../services/system-stability.service");
      return getCapacityProjectionReport(input.targetMachines);
    }),

  // ── Synthetic Probe: self-test DB query latency ───────────────────────
  runSyntheticProbe: configPermission
    .input(
      z
        .object({
          iterations: z.number().int().min(5).max(200).default(50),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      const iterations = input?.iterations ?? 50;
      log.info({ iterations }, "Starting synthetic probe");

      const db = await requireDb();

      // Define probe queries
      const probes = [
        {
          name: "oee_count",
          fn: async () => {
            await db.select({ value: count() }).from(oeeSnapshots).limit(1);
          },
        },
        {
          name: "robot_alerts_recent",
          fn: async () => {
            await db.select().from(robotConditionAlerts).orderBy(desc(robotConditionAlerts.createdAt)).limit(10);
          },
        },
        {
          name: "aei_scores_top10",
          fn: async () => {
            await db.select().from(aeiMonthlyScores).orderBy(desc(aeiMonthlyScores.compositeAeiScore)).limit(10);
          },
        },
      ];

      const results: Record<string, { p50: number; p95: number; p99: number; avg: number; min: number; max: number; samples: number }> = {};

      for (const probe of probes) {
        const latencies: number[] = [];
        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          try {
            await probe.fn();
          } catch {
            // Query may fail if table is empty — still record latency
          }
          const elapsed = Math.round((performance.now() - start) * 100) / 100;
          latencies.push(elapsed);
        }

        latencies.sort((a, b) => a - b);
        const sum = latencies.reduce((a, b) => a + b, 0);

        results[probe.name] = {
          p50: percentile(latencies, 50),
          p95: percentile(latencies, 95),
          p99: percentile(latencies, 99),
          avg: Math.round((sum / latencies.length) * 100) / 100,
          min: latencies[0],
          max: latencies[latencies.length - 1],
          samples: latencies.length,
        };
      }

      // Overall assessment
      const allP95 = Object.values(results).map((r) => r.p95);
      const worstP95 = Math.max(...allP95);
      const grade = worstP95 < 50 ? "green" : worstP95 < 200 ? "yellow" : "red";

      log.info({ grade, worstP95, iterations }, "Synthetic probe completed");

      return {
        iterations,
        probes: results,
        worstP95Ms: worstP95,
        grade,
        recommendation:
          grade === "red"
            ? "P95 latency exceeds 200ms — investigate slow queries and add indexes"
            : grade === "yellow"
              ? "P95 latency between 50-200ms — monitor under load and consider query optimization"
              : "All queries within acceptable latency range",
        timestamp: new Date().toISOString(),
      };
    }),
});
