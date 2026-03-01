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
 * Data source: DB-first with mock fallback.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

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

// ─── Seed/Fallback Data (GRT Cleaning Equipment Factory) ─────────────

const NOW = new Date();
const h = (hoursOffset: number) => new Date(NOW.getTime() + hoursOffset * 3600000).toISOString();

const SEED_FLEET: SensorReading[] = [
  // CNC-001: CRITICAL — vibration spike, overheating
  { machineId: 101, machineCode: "CNC-001", machineName: "CNC Milling Center #1",
    vibrationLevel: 7.2, temperature: 78, spindleLoad: 95, coolantPressure: 4.5, powerConsumption: 18.5,
    healthScore: 35, healthStatus: "CRITICAL", healthTrend: "DEGRADING", lastUpdated: h(-0.5) },
  // CNC-002: HEALTHY — good backup
  { machineId: 102, machineCode: "CNC-002", machineName: "CNC Milling Center #2",
    vibrationLevel: 1.2, temperature: 42, spindleLoad: 65, coolantPressure: 5.0, powerConsumption: 12.3,
    healthScore: 88, healthStatus: "HEALTHY", healthTrend: "STABLE", lastUpdated: h(-0.5) },
  // CNC-003: WARNING — slightly elevated vibration
  { machineId: 103, machineCode: "CNC-003", machineName: "CNC Milling Center #3",
    vibrationLevel: 4.5, temperature: 55, spindleLoad: 82, coolantPressure: 4.8, powerConsumption: 14.1,
    healthScore: 62, healthStatus: "WARNING", healthTrend: "DEGRADING", lastUpdated: h(-0.5) },
  // HYD-BENCH-001: HEALTHY
  { machineId: 201, machineCode: "HYD-BENCH-001", machineName: "Hydraulic Test Bench #1",
    vibrationLevel: 0.8, temperature: 38, spindleLoad: 45, coolantPressure: 5.2, powerConsumption: 8.7,
    healthScore: 94, healthStatus: "HEALTHY", healthTrend: "STABLE", lastUpdated: h(-0.5) },
  // HYD-BENCH-002: HEALTHY
  { machineId: 202, machineCode: "HYD-BENCH-002", machineName: "Hydraulic Test Bench #2",
    vibrationLevel: 1.0, temperature: 40, spindleLoad: 50, coolantPressure: 5.0, powerConsumption: 9.2,
    healthScore: 91, healthStatus: "HEALTHY", healthTrend: "STABLE", lastUpdated: h(-0.5) },
  // WLD-TIG-001: WARNING — temp climbing
  { machineId: 301, machineCode: "WLD-TIG-001", machineName: "TIG Welding Station #1",
    vibrationLevel: 2.1, temperature: 62, spindleLoad: 70, coolantPressure: 4.2, powerConsumption: 22.0,
    healthScore: 58, healthStatus: "WARNING", healthTrend: "DEGRADING", lastUpdated: h(-0.5) },
  // NZL-CAL-001: HEALTHY — nozzle calibration rig
  { machineId: 401, machineCode: "NZL-CAL-001", machineName: "Nozzle Calibration Rig #1",
    vibrationLevel: 0.3, temperature: 35, spindleLoad: 30, coolantPressure: 5.5, powerConsumption: 5.1,
    healthScore: 97, healthStatus: "HEALTHY", healthTrend: "IMPROVING", lastUpdated: h(-0.5) },
  // LASER-001: HEALTHY — laser cutting station
  { machineId: 501, machineCode: "LASER-001", machineName: "Fiber Laser Cutter #1",
    vibrationLevel: 0.5, temperature: 44, spindleLoad: 55, coolantPressure: 5.1, powerConsumption: 30.0,
    healthScore: 85, healthStatus: "HEALTHY", healthTrend: "STABLE", lastUpdated: h(-0.5) },
];

const SEED_SCHEDULE: ScheduledJob[] = [
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
  { id: 4, jobId: "JOB-2026-0044", jobName: "Valve Block Precision Cut", projectCode: "P-243",
    machineId: 101, machineCode: "CNC-001", startTime: h(72), endTime: h(78),
    status: "SCHEDULED", priority: 4, estimatedHours: 6,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  { id: 5, jobId: "JOB-2026-0040", jobName: "Shaft Turning (P-239)", projectCode: "P-239",
    machineId: 101, machineCode: "CNC-001", startTime: h(-8), endTime: h(-2),
    status: "COMPLETED", priority: 1, estimatedHours: 6,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  { id: 6, jobId: "JOB-2026-0045", jobName: "Cover Plate Milling", projectCode: "P-244",
    machineId: 102, machineCode: "CNC-002", startTime: h(4), endTime: h(8),
    status: "SCHEDULED", priority: 3, estimatedHours: 4,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  { id: 7, jobId: "JOB-2026-0046", jobName: "Hydraulic Cylinder Test", projectCode: "P-240",
    machineId: 201, machineCode: "HYD-BENCH-001", startTime: h(6), endTime: h(10),
    status: "SCHEDULED", priority: 2, estimatedHours: 4,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
  { id: 8, jobId: "JOB-2026-0047", jobName: "SS316 Frame Welding", projectCode: "P-241",
    machineId: 301, machineCode: "WLD-TIG-001", startTime: h(10), endTime: h(18),
    status: "SCHEDULED", priority: 3, estimatedHours: 8,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null },
];

// ─── DB helpers ──────────────────────────────────────────────────────

/** Load fleet sensor readings from DB, fallback to SEED_FLEET */
async function loadFleetFromDb(): Promise<{ fleet: SensorReading[]; dataSource: "database" | "seed" }> {
  try {
    const db = await requireDb();
    const rows = await db.execute(sql`
      SELECT machine_id, machine_code, machine_name,
             vibration_level, temperature, spindle_load, coolant_pressure, power_consumption,
             health_score, health_status, health_trend, last_updated
      FROM equipment_sensor_readings
      ORDER BY machine_code
    `);
    const arr = (rows as any).rows ?? [];
    if (arr.length === 0) return { fleet: SEED_FLEET, dataSource: "seed" };

    const fleet: SensorReading[] = arr.map((r: any) => ({
      machineId: r.machine_id,
      machineCode: r.machine_code,
      machineName: r.machine_name,
      vibrationLevel: Number(r.vibration_level),
      temperature: Number(r.temperature),
      spindleLoad: Number(r.spindle_load),
      coolantPressure: Number(r.coolant_pressure),
      powerConsumption: Number(r.power_consumption),
      healthScore: Number(r.health_score),
      healthStatus: r.health_status as HealthStatus,
      healthTrend: r.health_trend as HealthTrend,
      lastUpdated: r.last_updated ? new Date(r.last_updated).toISOString() : new Date().toISOString(),
    }));
    return { fleet, dataSource: "database" };
  } catch {
    return { fleet: SEED_FLEET, dataSource: "seed" };
  }
}

/** Load scheduled jobs from DB, fallback to SEED_SCHEDULE */
async function loadScheduleFromDb(): Promise<{ schedule: ScheduledJob[]; dataSource: "database" | "seed" }> {
  try {
    const db = await requireDb();
    const rows = await db.execute(sql`
      SELECT id, job_id, job_name, project_code,
             machine_id, machine_code, start_time, end_time,
             status, priority, estimated_hours,
             original_machine_id, original_machine_code, moved_at, move_reason
      FROM equipment_scheduled_jobs
      ORDER BY start_time
    `);
    const arr = (rows as any).rows ?? [];
    if (arr.length === 0) return { schedule: SEED_SCHEDULE, dataSource: "seed" };

    const schedule: ScheduledJob[] = arr.map((r: any) => ({
      id: r.id,
      jobId: r.job_id,
      jobName: r.job_name,
      projectCode: r.project_code,
      machineId: r.machine_id,
      machineCode: r.machine_code,
      startTime: r.start_time ? new Date(r.start_time).toISOString() : "",
      endTime: r.end_time ? new Date(r.end_time).toISOString() : "",
      status: r.status as ScheduleStatus,
      priority: r.priority,
      estimatedHours: Number(r.estimated_hours),
      originalMachineId: r.original_machine_id,
      originalMachineCode: r.original_machine_code,
      movedAt: r.moved_at ? new Date(r.moved_at).toISOString() : null,
      moveReason: r.move_reason,
    }));
    return { schedule, dataSource: "database" };
  } catch {
    return { schedule: SEED_SCHEDULE, dataSource: "seed" };
  }
}

// ─── tRPC Router ─────────────────────────────────────────────────────

export const smartSchedulerRouter = router({
  /**
   * fleetHealth — live fleet health status (all machines).
   */
  fleetHealth: protectedProcedure.query(async () => {
    const { fleet, dataSource } = await loadFleetFromDb();

    return {
      machines: fleet,
      summary: {
        total: fleet.length,
        healthy: fleet.filter(m => m.healthStatus === "HEALTHY").length,
        warning: fleet.filter(m => m.healthStatus === "WARNING").length,
        critical: fleet.filter(m => m.healthStatus === "CRITICAL").length,
        offline: fleet.filter(m => m.healthStatus === "OFFLINE").length,
        avgHealth: Math.round(fleet.reduce((s, m) => s + m.healthScore, 0) / (fleet.length || 1)),
      },
      generatedAt: new Date().toISOString(),
      dataSource,
    };
  }),

  /**
   * ganttView — production schedule with reschedule highlights.
   */
  ganttView: protectedProcedure.query(async () => {
    const { fleet, dataSource: fleetSource } = await loadFleetFromDb();
    const { schedule, dataSource: schedSource } = await loadScheduleFromDb();

    // Run the engine to get rescheduled state
    const result = monitorHealthAndReschedule(fleet, schedule, new Date());

    // Merge moved jobs back into schedule
    const updatedSchedule = schedule.map(job => {
      const moved = result.movedJobs.find(m => m.id === job.id);
      return moved ?? job;
    });

    return {
      jobs: updatedSchedule,
      movedJobIds: result.movedJobs.map(j => j.id),
      maintenanceOrder: result.maintenanceOrder,
      summary: result.summary,
      generatedAt: new Date().toISOString(),
      dataSource: fleetSource === "database" && schedSource === "database" ? "database" as const : "seed" as const,
    };
  }),

  /**
   * reschedule — manually trigger the self-healing engine.
   */
  reschedule: protectedProcedure.mutation(async () => {
    const { fleet, dataSource: fleetSource } = await loadFleetFromDb();
    const { schedule, dataSource: schedSource } = await loadScheduleFromDb();
    const result = monitorHealthAndReschedule(fleet, schedule, new Date());
    const dataSource = fleetSource === "database" && schedSource === "database" ? "database" as const : "seed" as const;
    return { ...result, dataSource };
  }),

  /**
   * decisionLog — AI decision audit trail.
   */
  decisionLog: protectedProcedure.query(async () => {
    const { fleet, dataSource: fleetSource } = await loadFleetFromDb();
    const { schedule, dataSource: schedSource } = await loadScheduleFromDb();
    const result = monitorHealthAndReschedule(fleet, schedule, new Date());
    const dataSource = fleetSource === "database" && schedSource === "database" ? "database" as const : "seed" as const;
    return {
      log: result.decisionLog,
      triggered: result.triggered,
      summary: result.summary,
      timestamp: result.timestamp,
      dataSource,
    };
  }),

  /**
   * seedDemo — create DB tables and seed demo fleet + schedule data.
   */
  seedDemo: protectedProcedure.mutation(async () => {
    const db = await requireDb();

    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS equipment_sensor_readings (
        machine_id INTEGER PRIMARY KEY,
        machine_code VARCHAR(50) NOT NULL UNIQUE,
        machine_name VARCHAR(200) NOT NULL,
        vibration_level DECIMAL(6,2) NOT NULL DEFAULT 0,
        temperature DECIMAL(6,2) NOT NULL DEFAULT 0,
        spindle_load DECIMAL(6,2) NOT NULL DEFAULT 0,
        coolant_pressure DECIMAL(6,2) NOT NULL DEFAULT 0,
        power_consumption DECIMAL(8,2) NOT NULL DEFAULT 0,
        health_score INTEGER NOT NULL DEFAULT 100,
        health_status VARCHAR(20) NOT NULL DEFAULT 'HEALTHY',
        health_trend VARCHAR(20) NOT NULL DEFAULT 'STABLE',
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS equipment_scheduled_jobs (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(50) NOT NULL,
        job_name VARCHAR(200) NOT NULL,
        project_code VARCHAR(50),
        machine_id INTEGER NOT NULL,
        machine_code VARCHAR(50) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
        priority INTEGER DEFAULT 3,
        estimated_hours DECIMAL(6,2) DEFAULT 0,
        original_machine_id INTEGER,
        original_machine_code VARCHAR(50),
        moved_at TIMESTAMP,
        move_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS equipment_maintenance_orders (
        id SERIAL PRIMARY KEY,
        order_code VARCHAR(50) NOT NULL UNIQUE,
        machine_id INTEGER NOT NULL,
        machine_code VARCHAR(50) NOT NULL,
        machine_name VARCHAR(200),
        type VARCHAR(30) NOT NULL DEFAULT 'PREDICTIVE',
        priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        health_score_at_creation INTEGER,
        trigger_reason TEXT,
        assigned_to VARCHAR(100),
        estimated_duration_minutes INTEGER DEFAULT 120,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);

    // Seed fleet data (upsert)
    const fleetResults = [];
    for (const m of SEED_FLEET) {
      try {
        await db.execute(sql`
          INSERT INTO equipment_sensor_readings (machine_id, machine_code, machine_name, vibration_level, temperature, spindle_load, coolant_pressure, power_consumption, health_score, health_status, health_trend, last_updated)
          VALUES (${m.machineId}, ${m.machineCode}, ${m.machineName}, ${m.vibrationLevel}, ${m.temperature}, ${m.spindleLoad}, ${m.coolantPressure}, ${m.powerConsumption}, ${m.healthScore}, ${m.healthStatus}, ${m.healthTrend}, NOW())
          ON CONFLICT (machine_id) DO UPDATE SET
            vibration_level = EXCLUDED.vibration_level, temperature = EXCLUDED.temperature,
            spindle_load = EXCLUDED.spindle_load, coolant_pressure = EXCLUDED.coolant_pressure,
            power_consumption = EXCLUDED.power_consumption, health_score = EXCLUDED.health_score,
            health_status = EXCLUDED.health_status, health_trend = EXCLUDED.health_trend,
            last_updated = NOW()
        `);
        fleetResults.push({ machineCode: m.machineCode, status: "ok" });
      } catch (e) {
        fleetResults.push({ machineCode: m.machineCode, status: "error", error: String(e) });
      }
    }

    // Seed schedule data (clear + insert)
    await db.execute(sql`DELETE FROM equipment_scheduled_jobs WHERE job_id LIKE 'JOB-2026-%'`);
    const schedResults = [];
    for (const j of SEED_SCHEDULE) {
      try {
        await db.execute(sql`
          INSERT INTO equipment_scheduled_jobs (job_id, job_name, project_code, machine_id, machine_code, start_time, end_time, status, priority, estimated_hours)
          VALUES (${j.jobId}, ${j.jobName}, ${j.projectCode}, ${j.machineId}, ${j.machineCode}, ${j.startTime}::timestamp, ${j.endTime}::timestamp, ${j.status}, ${j.priority}, ${j.estimatedHours})
        `);
        schedResults.push({ jobId: j.jobId, status: "ok" });
      } catch (e) {
        schedResults.push({ jobId: j.jobId, status: "error", error: String(e) });
      }
    }

    return {
      seeded: true,
      fleet: fleetResults,
      schedule: schedResults,
      tables: ["equipment_sensor_readings", "equipment_scheduled_jobs", "equipment_maintenance_orders"],
    };
  }),
});
