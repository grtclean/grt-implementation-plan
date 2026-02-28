/**
 * Smart Scheduler — Self-Healing Factory Engine + tRPC Router
 * Phase 3.2 — Equipment Health & Auto-Scheduling
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                 THE SELF-HEALING FACTORY                                │
 * │                                                                         │
 * │   ① MONITOR               ② PREDICT              ③ ACT                 │
 * │   ┌────────────────┐     ┌──────────────────┐   ┌──────────────────┐   │
 * │   │ IoT Sensors    │     │ Health Score < 40│   │ Auto-Maintenance │   │
 * │   │ Vibration      │──▶ │ = CRITICAL       │──▶│ + Auto-Reschedule│   │
 * │   │ Temperature    │     │ Trend: DEGRADING │   │ to Backup Machine│   │
 * │   │ Spindle Load   │     └──────────────────┘   └──────────────────┘   │
 * │   └────────────────┘                                                    │
 * │                                                                         │
 * │   ④ HEAL                                                               │
 * │   ┌────────────────────────────────────────────────────────────────┐   │
 * │   │ Maintenance complete → Machine HEALTHY → Jobs can return       │   │
 * │   └────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Thresholds:
 *   CRITICAL:  health < 40  → immediate maintenance + auto-reschedule
 *   WARNING:   health 40-69 → alert, no auto-action yet
 *   HEALTHY:   health >= 70 → normal operations
 *
 * Architecture: Pure calculation functions exported for Vitest.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

// ─── Types ───────────────────────────────────────────────────────────

export type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "OFFLINE";
export type HealthTrend = "IMPROVING" | "STABLE" | "DEGRADING";
export type ScheduleStatus = "SCHEDULED" | "IN_PROGRESS" | "MOVED_AUTO" | "MOVED_MANUAL" | "COMPLETED" | "CANCELLED";
export type MaintenanceType = "PREDICTIVE" | "BREAKDOWN" | "PREVENTIVE";
export type MaintenancePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface SensorReading {
  machineId: number;
  machineCode: string;
  machineName: string;
  vibrationLevel: number;    // mm/s RMS
  temperature: number;       // Celsius
  spindleLoad: number;       // % of rated
  coolantPressure: number;   // bar
  powerConsumption: number;  // kW
  healthScore: number;       // 0-100
  healthStatus: HealthStatus;
  healthTrend: HealthTrend;
  lastUpdated: string;
}

export interface ScheduledJob {
  id: number;
  jobId: string;
  jobName: string;
  projectCode: string;
  machineId: number;
  machineCode: string;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  priority: number;
  estimatedHours: number;
  // Reschedule tracking
  originalMachineId: number | null;
  originalMachineCode: string | null;
  movedAt: string | null;
  moveReason: string | null;
}

export interface MaintenanceOrder {
  id: number;
  orderCode: string;
  machineId: number;
  machineCode: string;
  machineName: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  status: string;
  healthScoreAtCreation: number;
  triggerReason: string;
  assignedTo: string | null;
  estimatedDurationMinutes: number;
  createdAt: string;
}

export interface BackupMachine {
  machineId: number;
  machineCode: string;
  machineName: string;
  healthScore: number;
  healthStatus: HealthStatus;
  compatibleTypes: string[];   // machine type families
}

export interface RescheduleResult {
  triggered: boolean;
  triggerMachine: { machineId: number; machineCode: string; healthScore: number } | null;
  maintenanceOrder: MaintenanceOrder | null;
  movedJobs: ScheduledJob[];
  backupMachine: BackupMachine | null;
  jobsMoved: number;
  summary: string;
  decisionLog: string[];
  timestamp: string;
}

// ─── Pure Calculation Engine (fully unit-testable) ───────────────────

const CRITICAL_THRESHOLD = 40;
const WARNING_THRESHOLD = 70;

/**
 * Classify health score into status.
 */
export function classifyHealth(score: number): HealthStatus {
  if (score < 0) return "OFFLINE";
  if (score < CRITICAL_THRESHOLD) return "CRITICAL";
  if (score < WARNING_THRESHOLD) return "WARNING";
  return "HEALTHY";
}

/**
 * Determine maintenance priority from health score.
 */
export function determinePriority(healthScore: number): MaintenancePriority {
  if (healthScore < 30) return "CRITICAL";
  if (healthScore < CRITICAL_THRESHOLD) return "HIGH";
  if (healthScore < 55) return "MEDIUM";
  return "LOW";
}

/**
 * Calculate health score from raw sensor readings.
 * Weighted formula: vibration(30%) + temperature(25%) + spindleLoad(25%) + coolant(20%)
 *
 * Each sensor is normalized to 0-100 where 100=perfect:
 *   Vibration: 0mm/s=100, >=10mm/s=0 (linear)
 *   Temperature: <=40C=100, >=90C=0 (linear)
 *   SpindleLoad: <=80%=100, >=120%=0 (linear)
 *   CoolantPressure: 3-6bar=100, outside=penalty
 */
export function calculateHealthScore(
  vibration: number,
  temperature: number,
  spindleLoad: number,
  coolantPressure: number
): number {
  // Normalize vibration: 0 → 100, 10 → 0
  const vScore = Math.max(0, Math.min(100, 100 - (vibration / 10) * 100));

  // Normalize temperature: <=40 → 100, >=90 → 0
  const tScore = temperature <= 40 ? 100 : Math.max(0, Math.min(100, 100 - ((temperature - 40) / 50) * 100));

  // Normalize spindleLoad: <=80 → 100, >=120 → 0
  const sScore = spindleLoad <= 80 ? 100 : Math.max(0, Math.min(100, 100 - ((spindleLoad - 80) / 40) * 100));

  // Normalize coolant: 3-6 bar → 100, outside → penalty
  let cScore = 100;
  if (coolantPressure < 3) cScore = Math.max(0, (coolantPressure / 3) * 100);
  else if (coolantPressure > 6) cScore = Math.max(0, 100 - ((coolantPressure - 6) / 4) * 100);

  const weighted = vScore * 0.30 + tScore * 0.25 + sScore * 0.25 + cScore * 0.20;
  return Math.round(Math.max(0, Math.min(100, weighted)));
}

/**
 * Find the best backup machine from a fleet.
 * Must be: HEALTHY, same machine family, highest health score.
 */
export function findBackupMachine(
  failedMachineCode: string,
  fleet: SensorReading[]
): BackupMachine | null {
  // Extract machine family prefix (e.g., "CNC" from "CNC-001")
  const family = failedMachineCode.split("-")[0];

  const candidates = fleet
    .filter(m =>
      m.machineCode !== failedMachineCode &&
      m.machineCode.startsWith(family) &&
      m.healthStatus === "HEALTHY"
    )
    .sort((a, b) => b.healthScore - a.healthScore);

  if (candidates.length === 0) return null;

  const best = candidates[0];
  return {
    machineId: best.machineId,
    machineCode: best.machineCode,
    machineName: best.machineName,
    healthScore: best.healthScore,
    healthStatus: best.healthStatus,
    compatibleTypes: [family],
  };
}

/**
 * Get jobs that are SCHEDULED on a specific machine within a time window.
 */
export function getAffectedJobs(
  machineId: number,
  schedule: ScheduledJob[],
  windowHours: number,
  now: Date
): ScheduledJob[] {
  const cutoff = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  return schedule.filter(j =>
    j.machineId === machineId &&
    j.status === "SCHEDULED" &&
    new Date(j.startTime) <= cutoff
  );
}

/**
 * Reschedule jobs to a backup machine.
 * Returns the updated jobs with MOVED_AUTO status.
 */
export function rescheduleJobs(
  jobs: ScheduledJob[],
  backup: BackupMachine,
  reason: string,
  now: Date
): ScheduledJob[] {
  return jobs.map(job => ({
    ...job,
    originalMachineId: job.machineId,
    originalMachineCode: job.machineCode,
    machineId: backup.machineId,
    machineCode: backup.machineCode,
    status: "MOVED_AUTO" as ScheduleStatus,
    movedAt: now.toISOString(),
    moveReason: reason,
  }));
}

/**
 * Create a maintenance work order for a critical machine.
 */
export function createMaintenanceOrder(
  sensor: SensorReading,
  orderId: number,
  now: Date
): MaintenanceOrder {
  const priority = determinePriority(sensor.healthScore);
  const estimatedMinutes = priority === "CRITICAL" ? 120 : priority === "HIGH" ? 240 : 480;

  return {
    id: orderId,
    orderCode: `MWO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(orderId).padStart(3, "0")}`,
    machineId: sensor.machineId,
    machineCode: sensor.machineCode,
    machineName: sensor.machineName,
    type: "PREDICTIVE",
    priority,
    status: "OPEN",
    healthScoreAtCreation: sensor.healthScore,
    triggerReason: `AI Predictive: Health score ${sensor.healthScore}/100 (${sensor.healthStatus}). Vibration: ${sensor.vibrationLevel}mm/s, Temp: ${sensor.temperature}°C, Spindle: ${sensor.spindleLoad}%`,
    assignedTo: null,
    estimatedDurationMinutes: estimatedMinutes,
    createdAt: now.toISOString(),
  };
}

/**
 * THE SELF-HEALING ENGINE: Monitor fleet health and auto-reschedule.
 *
 * For each CRITICAL machine:
 *   1. Create maintenance work order
 *   2. Find backup machine
 *   3. Move scheduled jobs (next 48h) to backup
 *   4. Return decision report
 */
export function monitorHealthAndReschedule(
  fleet: SensorReading[],
  schedule: ScheduledJob[],
  now: Date = new Date()
): RescheduleResult {
  const decisionLog: string[] = [];
  let maintenanceOrderIdCounter = 101;

  decisionLog.push(`[${now.toISOString()}] Self-Healing Engine started. Fleet size: ${fleet.length} machines.`);

  // Find CRITICAL machines
  const criticalMachines = fleet.filter(m => m.healthStatus === "CRITICAL");
  decisionLog.push(`Scanning fleet... Found ${criticalMachines.length} CRITICAL machine(s).`);

  if (criticalMachines.length === 0) {
    decisionLog.push("All machines HEALTHY or WARNING. No action required.");
    return {
      triggered: false,
      triggerMachine: null,
      maintenanceOrder: null,
      movedJobs: [],
      backupMachine: null,
      jobsMoved: 0,
      summary: "Fleet healthy — no interventions needed.",
      decisionLog,
      timestamp: now.toISOString(),
    };
  }

  // Process the most critical machine first (lowest health)
  const worst = criticalMachines.sort((a, b) => a.healthScore - b.healthScore)[0];
  decisionLog.push(`CRITICAL: ${worst.machineCode} (${worst.machineName}) — Health: ${worst.healthScore}/100`);
  decisionLog.push(`  Vibration: ${worst.vibrationLevel}mm/s | Temp: ${worst.temperature}°C | Spindle: ${worst.spindleLoad}%`);

  // Step 1: Create maintenance order
  const maintenanceOrder = createMaintenanceOrder(worst, maintenanceOrderIdCounter++, now);
  decisionLog.push(`AUTO-ACTION 1: Created Maintenance Order ${maintenanceOrder.orderCode} (${maintenanceOrder.priority} priority, ${maintenanceOrder.type})`);

  // Step 2: Find backup machine
  const backup = findBackupMachine(worst.machineCode, fleet);
  if (!backup) {
    decisionLog.push(`WARNING: No compatible backup machine found for ${worst.machineCode}. Jobs cannot be moved.`);
    return {
      triggered: true,
      triggerMachine: { machineId: worst.machineId, machineCode: worst.machineCode, healthScore: worst.healthScore },
      maintenanceOrder,
      movedJobs: [],
      backupMachine: null,
      jobsMoved: 0,
      summary: `${worst.machineCode} CRITICAL! Maintenance order created but no backup machine available.`,
      decisionLog,
      timestamp: now.toISOString(),
    };
  }

  decisionLog.push(`Backup found: ${backup.machineCode} (${backup.machineName}) — Health: ${backup.healthScore}/100`);

  // Step 3: Find and reschedule affected jobs
  const affected = getAffectedJobs(worst.machineId, schedule, 48, now);
  decisionLog.push(`Found ${affected.length} SCHEDULED job(s) on ${worst.machineCode} in next 48 hours.`);

  if (affected.length === 0) {
    decisionLog.push("No scheduled jobs to move. Maintenance order stands.");
    return {
      triggered: true,
      triggerMachine: { machineId: worst.machineId, machineCode: worst.machineCode, healthScore: worst.healthScore },
      maintenanceOrder,
      movedJobs: [],
      backupMachine: backup,
      jobsMoved: 0,
      summary: `${worst.machineCode} CRITICAL! Maintenance created. No jobs needed moving.`,
      decisionLog,
      timestamp: now.toISOString(),
    };
  }

  const reason = `AI Auto-Reschedule: ${worst.machineCode} health dropped to ${worst.healthScore}/100 (CRITICAL). Moved to ${backup.machineCode}.`;
  const movedJobs = rescheduleJobs(affected, backup, reason, now);

  for (const job of movedJobs) {
    decisionLog.push(`AUTO-ACTION 2: Job ${job.jobId} "${job.jobName}" → moved from ${job.originalMachineCode} to ${job.machineCode}`);
  }

  const summary = `${worst.machineCode} CRITICAL! ${movedJobs.length} Job${movedJobs.length > 1 ? "s" : ""} moved to ${backup.machineCode}. Maintenance team notified.`;
  decisionLog.push(`RESULT: ${summary}`);

  return {
    triggered: true,
    triggerMachine: { machineId: worst.machineId, machineCode: worst.machineCode, healthScore: worst.healthScore },
    maintenanceOrder,
    movedJobs,
    backupMachine: backup,
    jobsMoved: movedJobs.length,
    summary,
    decisionLog,
    timestamp: now.toISOString(),
  };
}

// ─── Mock Data (GRT Cleaning Equipment Factory) ──────────────────────

const NOW = new Date();
const h = (hoursOffset: number) => new Date(NOW.getTime() + hoursOffset * 3600000).toISOString();

const MOCK_FLEET: SensorReading[] = [
  // CNC-001: CRITICAL — vibration spike, overheating
  {
    machineId: 101, machineCode: "CNC-001", machineName: "CNC Milling Center #1",
    vibrationLevel: 7.2, temperature: 78, spindleLoad: 95, coolantPressure: 4.5, powerConsumption: 18.5,
    healthScore: 35, healthStatus: "CRITICAL", healthTrend: "DEGRADING",
    lastUpdated: h(-0.5),
  },
  // CNC-002: HEALTHY — good backup
  {
    machineId: 102, machineCode: "CNC-002", machineName: "CNC Milling Center #2",
    vibrationLevel: 1.2, temperature: 42, spindleLoad: 65, coolantPressure: 5.0, powerConsumption: 12.3,
    healthScore: 88, healthStatus: "HEALTHY", healthTrend: "STABLE",
    lastUpdated: h(-0.5),
  },
  // CNC-003: WARNING — slightly elevated vibration
  {
    machineId: 103, machineCode: "CNC-003", machineName: "CNC Milling Center #3",
    vibrationLevel: 4.5, temperature: 55, spindleLoad: 82, coolantPressure: 4.8, powerConsumption: 14.1,
    healthScore: 62, healthStatus: "WARNING", healthTrend: "DEGRADING",
    lastUpdated: h(-0.5),
  },
  // HYD-BENCH-001: HEALTHY
  {
    machineId: 201, machineCode: "HYD-BENCH-001", machineName: "Hydraulic Test Bench #1",
    vibrationLevel: 0.8, temperature: 38, spindleLoad: 45, coolantPressure: 5.2, powerConsumption: 8.7,
    healthScore: 94, healthStatus: "HEALTHY", healthTrend: "STABLE",
    lastUpdated: h(-0.5),
  },
  // HYD-BENCH-002: HEALTHY
  {
    machineId: 202, machineCode: "HYD-BENCH-002", machineName: "Hydraulic Test Bench #2",
    vibrationLevel: 1.0, temperature: 40, spindleLoad: 50, coolantPressure: 5.0, powerConsumption: 9.2,
    healthScore: 91, healthStatus: "HEALTHY", healthTrend: "STABLE",
    lastUpdated: h(-0.5),
  },
  // WLD-TIG-001: WARNING — temp climbing
  {
    machineId: 301, machineCode: "WLD-TIG-001", machineName: "TIG Welding Station #1",
    vibrationLevel: 2.1, temperature: 62, spindleLoad: 70, coolantPressure: 4.2, powerConsumption: 22.0,
    healthScore: 58, healthStatus: "WARNING", healthTrend: "DEGRADING",
    lastUpdated: h(-0.5),
  },
  // NZL-CAL-001: HEALTHY — nozzle calibration rig
  {
    machineId: 401, machineCode: "NZL-CAL-001", machineName: "Nozzle Calibration Rig #1",
    vibrationLevel: 0.3, temperature: 35, spindleLoad: 30, coolantPressure: 5.5, powerConsumption: 5.1,
    healthScore: 97, healthStatus: "HEALTHY", healthTrend: "IMPROVING",
    lastUpdated: h(-0.5),
  },
  // LASER-001: HEALTHY — laser cutting station
  {
    machineId: 501, machineCode: "LASER-001", machineName: "Fiber Laser Cutter #1",
    vibrationLevel: 0.5, temperature: 44, spindleLoad: 55, coolantPressure: 5.1, powerConsumption: 30.0,
    healthScore: 85, healthStatus: "HEALTHY", healthTrend: "STABLE",
    lastUpdated: h(-0.5),
  },
];

const MOCK_SCHEDULE: ScheduledJob[] = [
  // Jobs on CNC-001 (will be auto-rescheduled)
  { id: 1, jobId: "JOB-2026-0041", jobName: "Manifold Body Machining (P-240)", projectCode: "P-240",
    machineId: 101, machineCode: "CNC-001", startTime: h(2), endTime: h(6),
    status: "SCHEDULED", priority: 2, estimatedHours: 4,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  { id: 2, jobId: "JOB-2026-0042", jobName: "Pump Housing Bore (P-241)", projectCode: "P-241",
    machineId: 101, machineCode: "CNC-001", startTime: h(8), endTime: h(14),
    status: "SCHEDULED", priority: 3, estimatedHours: 6,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  { id: 3, jobId: "JOB-2026-0043", jobName: "Nozzle Adapter Milling (P-242)", projectCode: "P-242",
    machineId: 101, machineCode: "CNC-001", startTime: h(24), endTime: h(30),
    status: "SCHEDULED", priority: 5, estimatedHours: 6,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  // Job on CNC-001 beyond 48h window — should NOT move
  { id: 4, jobId: "JOB-2026-0044", jobName: "Valve Block Precision Cut", projectCode: "P-243",
    machineId: 101, machineCode: "CNC-001", startTime: h(72), endTime: h(78),
    status: "SCHEDULED", priority: 4, estimatedHours: 6,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  // Already completed job on CNC-001 — should NOT move
  { id: 5, jobId: "JOB-2026-0040", jobName: "Shaft Turning (P-239)", projectCode: "P-239",
    machineId: 101, machineCode: "CNC-001", startTime: h(-8), endTime: h(-2),
    status: "COMPLETED", priority: 1, estimatedHours: 6,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  // Jobs on CNC-002 — healthy, no action
  { id: 6, jobId: "JOB-2026-0045", jobName: "Cover Plate Milling", projectCode: "P-244",
    machineId: 102, machineCode: "CNC-002", startTime: h(4), endTime: h(8),
    status: "SCHEDULED", priority: 3, estimatedHours: 4,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  // Jobs on HYD-BENCH-001 — healthy
  { id: 7, jobId: "JOB-2026-0046", jobName: "Hydraulic Cylinder Test", projectCode: "P-240",
    machineId: 201, machineCode: "HYD-BENCH-001", startTime: h(6), endTime: h(10),
    status: "SCHEDULED", priority: 2, estimatedHours: 4,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  // Job on WLD-TIG-001 — WARNING but not CRITICAL
  { id: 8, jobId: "JOB-2026-0047", jobName: "SS316 Frame Welding", projectCode: "P-241",
    machineId: 301, machineCode: "WLD-TIG-001", startTime: h(10), endTime: h(18),
    status: "SCHEDULED", priority: 3, estimatedHours: 8,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
];

// ─── tRPC Router ─────────────────────────────────────────────────────

export const smartSchedulerRouter = router({
  /**
   * fleetHealth — live fleet health status (all machines).
   */
  fleetHealth: protectedProcedure.query(async () => {
    return {
      machines: MOCK_FLEET,
      summary: {
        total: MOCK_FLEET.length,
        healthy: MOCK_FLEET.filter(m => m.healthStatus === "HEALTHY").length,
        warning: MOCK_FLEET.filter(m => m.healthStatus === "WARNING").length,
        critical: MOCK_FLEET.filter(m => m.healthStatus === "CRITICAL").length,
        offline: MOCK_FLEET.filter(m => m.healthStatus === "OFFLINE").length,
        avgHealth: Math.round(MOCK_FLEET.reduce((s, m) => s + m.healthScore, 0) / MOCK_FLEET.length),
      },
      generatedAt: new Date().toISOString(),
      dataSource: "mock" as const,
    };
  }),

  /**
   * ganttView — production schedule with reschedule highlights.
   */
  ganttView: protectedProcedure.query(async () => {
    // Run the engine to get rescheduled state
    const result = monitorHealthAndReschedule(MOCK_FLEET, MOCK_SCHEDULE, NOW);

    // Merge moved jobs back into schedule
    const updatedSchedule = MOCK_SCHEDULE.map(job => {
      const moved = result.movedJobs.find(m => m.id === job.id);
      return moved ?? job;
    });

    return {
      jobs: updatedSchedule,
      movedJobIds: result.movedJobs.map(j => j.id),
      maintenanceOrder: result.maintenanceOrder,
      summary: result.summary,
      generatedAt: new Date().toISOString(),
      dataSource: "mock" as const,
    };
  }),

  /**
   * reschedule — manually trigger the self-healing engine.
   */
  reschedule: protectedProcedure.mutation(async () => {
    const result = monitorHealthAndReschedule(MOCK_FLEET, MOCK_SCHEDULE, new Date());
    return { ...result, dataSource: "mock" as const };
  }),

  /**
   * decisionLog — AI decision audit trail.
   */
  decisionLog: protectedProcedure.query(async () => {
    const result = monitorHealthAndReschedule(MOCK_FLEET, MOCK_SCHEDULE, NOW);
    return {
      log: result.decisionLog,
      triggered: result.triggered,
      summary: result.summary,
      timestamp: result.timestamp,
      dataSource: "mock" as const,
    };
  }),
});
