/**
 * System Stability Service — Capacity projection for 100 machines/year
 *
 * CTO Deliverable #3: Analyze current system metrics and extrapolate
 * to projected load. Generate actionable recommendations.
 */

import { createChildLogger } from "../lib/logger";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

const log = createChildLogger("system-stability");

export interface CurrentMetrics {
  cpuPercent: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  dbConnectionsUsed: number;
  dbConnectionsMax: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  activeSseConnections: number;
  dailyRequestCount: number;
  dailyDbWrites: number;
}

export interface StabilityReport {
  currentLoad: {
    cpu: number;
    memory: number;
    dbConnections: number;
    latency: number;
  };
  projectedLoad: {
    telemetryRps: number;
    sseConnections: number;
    dailyDbWrites: number;
    memoryProjectedMB: number;
  };
  capacityScore: number; // 0-100 (100 = no concerns)
  bottleneck: "none" | "cpu" | "memory" | "db_connections" | "latency" | "disk_io";
  recommendations: Recommendation[];
  machineCapacity: number; // estimated max machines before degradation
}

export interface Recommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  category: "database" | "memory" | "network" | "storage" | "architecture";
  title: string;
  description: string;
  estimatedImpact: string;
}

export interface CapacityProjectionReport {
  targetMachines: number;
  architecture: {
    type: "single" | "cluster";
    instanceCount: number;
    machinesPerInstance: number;
    recommendation: string;
  };
  fileChunking: {
    strategy: "disk" | "redis";
    concurrentUploads: number;
    bufferSizeMb: number;
    recommendation: string;
  };
  sseConnections: {
    totalConnections: number;
    perInstanceCap: number;
    pubsubStrategy: string;
    recommendation: string;
  };
  database: {
    poolSize: number;
    readReplicas: number;
    pgbouncer: boolean;
    recommendation: string;
  };
}

export function getCapacityProjectionReport(targetMachines: number = 100): CapacityProjectionReport {
  const instanceCount = Math.ceil(targetMachines / 30);
  const machinesPerInstance = Math.ceil(targetMachines / instanceCount);

  const sseTotal = targetMachines * 2; // 2 SSE connections per machine
  const perInstanceCap = 500;

  return {
    targetMachines,
    architecture: {
      type: instanceCount > 1 ? "cluster" : "single",
      instanceCount,
      machinesPerInstance,
      recommendation: instanceCount > 1
        ? `Deploy ${instanceCount} Node.js instances behind nginx with PM2 cluster mode or K8s HPA. Each handles ~${machinesPerInstance} machines.`
        : "Single Node.js instance sufficient. Consider PM2 for process management.",
    },
    fileChunking: {
      strategy: targetMachines > 50 ? "redis" : "disk",
      concurrentUploads: Math.min(targetMachines, 10),
      bufferSizeMb: targetMachines > 50 ? 50 : 20,
      recommendation: targetMachines > 50
        ? `Use Redis for chunk buffer (${50}MB allocation, ${Math.min(targetMachines, 10)} concurrent 500MB uploads). Set TTL=3600s on chunk keys.`
        : "Disk-based chunk storage sufficient. Use data/uploads/ with periodic cleanup.",
    },
    sseConnections: {
      totalConnections: sseTotal,
      perInstanceCap,
      pubsubStrategy: sseTotal > perInstanceCap ? "redis" : "in-memory",
      recommendation: sseTotal > perInstanceCap
        ? `Redis pub/sub for cross-instance SSE fan-out. ${sseTotal} connections across ${instanceCount} instances (${perInstanceCap}/each). Enable connection multiplexing.`
        : `In-memory pub/sub sufficient. ${sseTotal} connections within single instance cap.`,
    },
    database: {
      poolSize: Math.min(20, 5 + Math.ceil(targetMachines / 10)),
      readReplicas: targetMachines > 200 ? 1 : 0,
      pgbouncer: targetMachines > 50,
      recommendation: targetMachines > 50
        ? `Pool size ${Math.min(20, 5 + Math.ceil(targetMachines / 10))}, pgbouncer recommended for connection pooling. ${targetMachines > 200 ? "Add 1 read replica for analytics queries." : "No read replicas needed yet."}`
        : `Pool size ${5 + Math.ceil(targetMachines / 10)}, direct connections sufficient.`,
    },
  };
}

/**
 * Analyze current system capacity and project for targetMachines scale.
 */
export async function analyzeCapacity(
  metrics: CurrentMetrics,
  targetMachines: number = 100,
): Promise<StabilityReport> {
  // Each machine generates: ~1 telemetry update/second + 1 SSE subscription
  const projectedTelemetryRps = targetMachines;
  const projectedSseConnections = metrics.activeSseConnections + targetMachines;
  const projectedDailyDbWrites = metrics.dailyDbWrites + (targetMachines * 86400);
  const projectedMemoryMB = metrics.memoryUsedMB * (1 + projectedSseConnections * 0.5 / 100);

  const recommendations: Recommendation[] = [];

  // DB connection pool analysis
  const dbUtilization = metrics.dbConnectionsUsed / metrics.dbConnectionsMax;
  if (dbUtilization > 0.6) {
    recommendations.push({
      id: "INCREASE_POOL", priority: "high", category: "database",
      title: "Increase DB Connection Pool",
      description: `Current utilization ${Math.round(dbUtilization * 100)}% (${metrics.dbConnectionsUsed}/${metrics.dbConnectionsMax}). With ${targetMachines} machines writing telemetry, pool exhaustion is likely.`,
      estimatedImpact: `Raise pool from ${metrics.dbConnectionsMax} to ${metrics.dbConnectionsMax * 2}`,
    });
  }

  // Memory projection
  if (projectedMemoryMB > metrics.memoryTotalMB * 0.8) {
    recommendations.push({
      id: "INCREASE_MEMORY", priority: "critical", category: "memory",
      title: "Increase Server Memory",
      description: `Projected ${Math.round(projectedMemoryMB)}MB exceeds 80% of ${metrics.memoryTotalMB}MB total.`,
      estimatedImpact: `Upgrade to ${Math.ceil(metrics.memoryTotalMB * 2 / 1024)}GB RAM`,
    });
  }

  // Telemetry batching
  if (projectedTelemetryRps > 50) {
    recommendations.push({
      id: "BATCH_TELEMETRY", priority: "high", category: "database",
      title: "Batch Telemetry Inserts",
      description: `${projectedTelemetryRps} writes/sec exceeds efficient single-row INSERT threshold. Batch 10 rows per INSERT to reduce DB round-trips by 90%.`,
      estimatedImpact: "Reduce DB write load from ~100 qps to ~10 qps",
    });
  }

  // Chunked upload recommendation
  recommendations.push({
    id: "CHUNKED_UPLOAD", priority: "medium", category: "storage",
    title: "Use Chunked Upload for CAD Files",
    description: "Use 5MB chunks for SolidWorks/EPLAN files to avoid memory spikes during concurrent uploads.",
    estimatedImpact: "Prevents OOM during 10+ concurrent 200MB uploads",
  });

  // SSE fan-out
  if (projectedSseConnections > 200) {
    recommendations.push({
      id: "ADD_REDIS", priority: "high", category: "architecture",
      title: "Add Redis for SSE Fan-Out",
      description: `${projectedSseConnections} SSE connections exceeds in-process EventEmitter efficiency. Use Redis pub/sub for cross-process distribution.`,
      estimatedImpact: "Enables horizontal scaling to 1000+ concurrent SSE connections",
    });
  }

  // Latency concerns
  if (metrics.p99LatencyMs > 500) {
    recommendations.push({
      id: "QUERY_OPTIMIZATION", priority: "high", category: "database",
      title: "Optimize Slow Queries",
      description: `P99 latency ${metrics.p99LatencyMs}ms exceeds 500ms threshold. Add composite indexes for frequently joined tables.`,
      estimatedImpact: "Reduce P99 to <200ms",
    });
  }

  // CPU headroom
  if (metrics.cpuPercent > 70) {
    recommendations.push({
      id: "SCALE_COMPUTE", priority: "critical", category: "architecture",
      title: "Scale Compute Resources",
      description: `CPU at ${metrics.cpuPercent}% under current load. ${targetMachines} machines will push CPU to estimated ${Math.round(metrics.cpuPercent * 1.5)}%.`,
      estimatedImpact: "Add worker processes or scale to multi-instance deployment",
    });
  }

  // Calculate capacity score (0-100)
  let capacityScore = 100;
  if (dbUtilization > 0.8) capacityScore -= 30;
  else if (dbUtilization > 0.6) capacityScore -= 15;
  if (projectedMemoryMB > metrics.memoryTotalMB * 0.8) capacityScore -= 25;
  if (metrics.cpuPercent > 70) capacityScore -= 20;
  if (metrics.p99LatencyMs > 500) capacityScore -= 10;
  capacityScore = Math.max(0, capacityScore);

  // Identify bottleneck
  let bottleneck: StabilityReport["bottleneck"] = "none";
  if (dbUtilization > 0.8) bottleneck = "db_connections";
  else if (projectedMemoryMB > metrics.memoryTotalMB * 0.9) bottleneck = "memory";
  else if (metrics.cpuPercent > 80) bottleneck = "cpu";
  else if (metrics.p99LatencyMs > 1000) bottleneck = "latency";

  // Estimate max machine capacity
  const cpuHeadroom = Math.max(0, (90 - metrics.cpuPercent) / (metrics.cpuPercent / Math.max(1, targetMachines / 10)));
  const memHeadroom = Math.max(0, (metrics.memoryTotalMB * 0.85 - metrics.memoryUsedMB) / (projectedMemoryMB - metrics.memoryUsedMB || 1));
  const dbHeadroom = Math.max(0, (metrics.dbConnectionsMax * 0.85 - metrics.dbConnectionsUsed) / Math.max(1, targetMachines * 0.1));
  const machineCapacity = Math.round(Math.min(cpuHeadroom, memHeadroom, dbHeadroom) * targetMachines);

  const report: StabilityReport = {
    currentLoad: {
      cpu: metrics.cpuPercent,
      memory: metrics.memoryUsedMB,
      dbConnections: metrics.dbConnectionsUsed,
      latency: metrics.avgLatencyMs,
    },
    projectedLoad: {
      telemetryRps: projectedTelemetryRps,
      sseConnections: projectedSseConnections,
      dailyDbWrites: projectedDailyDbWrites,
      memoryProjectedMB: Math.round(projectedMemoryMB),
    },
    capacityScore,
    bottleneck,
    recommendations: recommendations.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 };
      return priority[a.priority] - priority[b.priority];
    }),
    machineCapacity: Math.max(0, machineCapacity),
  };

  log.info({ capacityScore, bottleneck, machineCapacity, recommendationCount: recommendations.length },
    "System capacity analysis complete");

  return report;
}

/**
 * Run a synthetic probe — N iterations of key queries to measure latency.
 */
export async function runSyntheticProbe(iterations: number = 50): Promise<{
  p50: number; p95: number; p99: number; avg: number; errors: number;
}> {
  const db = await requireDb();
  const latencies: number[] = [];
  let errors = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await db.execute(sql`SELECT 1 as probe`);
      latencies.push(performance.now() - start);
    } catch {
      errors++;
    }
  }

  latencies.sort((a, b) => a - b);
  const n = latencies.length;

  const result = {
    p50: n > 0 ? Math.round(latencies[Math.floor(n * 0.5)] * 100) / 100 : 0,
    p95: n > 0 ? Math.round(latencies[Math.floor(n * 0.95)] * 100) / 100 : 0,
    p99: n > 0 ? Math.round(latencies[Math.floor(n * 0.99)] * 100) / 100 : 0,
    avg: n > 0 ? Math.round((latencies.reduce((a, b) => a + b, 0) / n) * 100) / 100 : 0,
    errors,
  };

  log.info(result, "Synthetic probe complete");
  return result;
}
