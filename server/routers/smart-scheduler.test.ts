/**
 * Smart Scheduler — Self-Healing Factory Automated Test Suite
 * Phase 3.2 — Equipment Health & Auto-Scheduling
 *
 * Proves:
 *   1. Health score calculation from sensor readings
 *   2. Health classification boundaries (CRITICAL/WARNING/HEALTHY)
 *   3. Maintenance priority assignment
 *   4. Backup machine selection (same family, highest health)
 *   5. Affected job detection within time window
 *   6. Job rescheduling with MOVED_AUTO status
 *   7. Maintenance order creation
 *   8. Full self-healing cycle: CNC-001 drops to 35% → 3 jobs moved to CNC-002
 *   9. Edge cases: no backup, no jobs, all healthy, offline
 *
 * Run: pnpm test -- server/routers/smart-scheduler.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  classifyHealth,
  determinePriority,
  calculateHealthScore,
  findBackupMachine,
  getAffectedJobs,
  rescheduleJobs,
  createMaintenanceOrder,
  monitorHealthAndReschedule,
  type SensorReading,
  type ScheduledJob,
  type BackupMachine,
  type HealthStatus,
} from "./smart-scheduler.router";

// ─── Helpers ────────────────────────────────────────────────────────

const NOW = new Date("2026-02-25T12:00:00Z");
const h = (offset: number) => new Date(NOW.getTime() + offset * 3600000).toISOString();

function makeSensor(overrides?: Partial<SensorReading>): SensorReading {
  return {
    machineId: 101,
    machineCode: "CNC-001",
    machineName: "CNC Milling Center #1",
    vibrationLevel: 1.0,
    temperature: 42,
    spindleLoad: 65,
    coolantPressure: 5.0,
    powerConsumption: 12.0,
    healthScore: 90,
    healthStatus: "HEALTHY",
    healthTrend: "STABLE",
    lastUpdated: NOW.toISOString(),
    ...overrides,
  };
}

function makeJob(overrides?: Partial<ScheduledJob>): ScheduledJob {
  return {
    id: 1,
    jobId: "JOB-001",
    jobName: "Test Machining Job",
    projectCode: "P-100",
    machineId: 101,
    machineCode: "CNC-001",
    startTime: h(4),
    endTime: h(8),
    status: "SCHEDULED",
    priority: 3,
    estimatedHours: 4,
    originalMachineId: null,
    originalMachineCode: null,
    movedAt: null,
    moveReason: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ① classifyHealth — boundary tests
// ═══════════════════════════════════════════════════════════════════

describe("classifyHealth", () => {
  it("returns CRITICAL for score 0", () => {
    expect(classifyHealth(0)).toBe("CRITICAL");
  });

  it("returns CRITICAL for score 39 (just below threshold)", () => {
    expect(classifyHealth(39)).toBe("CRITICAL");
  });

  it("returns WARNING for score 40 (exactly at CRITICAL boundary)", () => {
    expect(classifyHealth(40)).toBe("WARNING");
  });

  it("returns WARNING for score 69 (just below HEALTHY)", () => {
    expect(classifyHealth(69)).toBe("WARNING");
  });

  it("returns HEALTHY for score 70 (exactly at WARNING boundary)", () => {
    expect(classifyHealth(70)).toBe("HEALTHY");
  });

  it("returns HEALTHY for score 100", () => {
    expect(classifyHealth(100)).toBe("HEALTHY");
  });

  it("returns OFFLINE for negative score", () => {
    expect(classifyHealth(-1)).toBe("OFFLINE");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ② determinePriority
// ═══════════════════════════════════════════════════════════════════

describe("determinePriority", () => {
  it("returns CRITICAL for health < 30", () => {
    expect(determinePriority(25)).toBe("CRITICAL");
  });

  it("returns HIGH for health 30-39", () => {
    expect(determinePriority(35)).toBe("HIGH");
  });

  it("returns MEDIUM for health 40-54", () => {
    expect(determinePriority(50)).toBe("MEDIUM");
  });

  it("returns LOW for health >= 55", () => {
    expect(determinePriority(60)).toBe("LOW");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ③ calculateHealthScore — sensor fusion
// ═══════════════════════════════════════════════════════════════════

describe("calculateHealthScore", () => {
  it("returns 100 for perfect sensor readings", () => {
    expect(calculateHealthScore(0, 35, 60, 5.0)).toBe(100);
  });

  it("returns reduced score for high vibration (8mm/s)", () => {
    const score = calculateHealthScore(8.0, 40, 70, 5.0);
    // Vibration dominates at 30% weight → score drops significantly from 100
    expect(score).toBeLessThan(80);
    expect(score).toBeGreaterThan(50);
  });

  it("returns reduced score for extreme temperature (85C)", () => {
    const score = calculateHealthScore(1.0, 85, 65, 5.0);
    // Temperature at 85C → 10% of temp range → big penalty on 25% weight
    expect(score).toBeLessThan(80);
    expect(score).toBeGreaterThan(60);
  });

  it("returns reduced score for spindle overload (115%)", () => {
    const score = calculateHealthScore(1.0, 42, 115, 5.0);
    // SpindleLoad 115% → 12.5% of range → penalty on 25% weight
    expect(score).toBeLessThan(80);
    expect(score).toBeGreaterThan(60);
  });

  it("returns reduced score for low coolant pressure (1.0 bar)", () => {
    const score = calculateHealthScore(1.0, 42, 65, 1.0);
    // Coolant at 1.0 bar → 33% of ideal → penalty on 20% weight
    expect(score).toBeLessThan(90);
    expect(score).toBeGreaterThan(70);
  });

  it("returns 0 for all sensors at worst values", () => {
    expect(calculateHealthScore(10, 90, 120, 10)).toBe(0);
  });

  it("CNC-001 crisis scenario: vibration 7.2, temp 78, spindle 95, coolant 4.5", () => {
    const score = calculateHealthScore(7.2, 78, 95, 4.5);
    // Multiple sensors degraded simultaneously → compound penalty
    expect(score).toBeLessThanOrEqual(50);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ④ findBackupMachine
// ═══════════════════════════════════════════════════════════════════

describe("findBackupMachine", () => {
  const fleet: SensorReading[] = [
    makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 35, healthStatus: "CRITICAL" }),
    makeSensor({ machineId: 102, machineCode: "CNC-002", healthScore: 88, healthStatus: "HEALTHY" }),
    makeSensor({ machineId: 103, machineCode: "CNC-003", healthScore: 62, healthStatus: "WARNING" }),
    makeSensor({ machineId: 201, machineCode: "HYD-BENCH-001", healthScore: 94, healthStatus: "HEALTHY" }),
  ];

  it("finds CNC-002 as backup for CNC-001 (same family, highest health)", () => {
    const backup = findBackupMachine("CNC-001", fleet);
    expect(backup).not.toBeNull();
    expect(backup!.machineCode).toBe("CNC-002");
    expect(backup!.healthScore).toBe(88);
  });

  it("skips WARNING machines (only selects HEALTHY)", () => {
    const backup = findBackupMachine("CNC-001", fleet);
    expect(backup!.machineCode).not.toBe("CNC-003"); // WARNING, not eligible
  });

  it("does not cross machine families (CNC ≠ HYD)", () => {
    const backup = findBackupMachine("CNC-001", fleet);
    expect(backup!.machineCode).not.toBe("HYD-BENCH-001");
  });

  it("returns null when no compatible healthy backup exists", () => {
    const smallFleet = [
      makeSensor({ machineId: 301, machineCode: "WLD-TIG-001", healthScore: 35, healthStatus: "CRITICAL" }),
    ];
    expect(findBackupMachine("WLD-TIG-001", smallFleet)).toBeNull();
  });

  it("picks highest health when multiple candidates exist", () => {
    const richFleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 30, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 102, machineCode: "CNC-002", healthScore: 75, healthStatus: "HEALTHY" }),
      makeSensor({ machineId: 103, machineCode: "CNC-003", healthScore: 92, healthStatus: "HEALTHY" }),
    ];
    const backup = findBackupMachine("CNC-001", richFleet);
    expect(backup!.machineCode).toBe("CNC-003");
    expect(backup!.healthScore).toBe(92);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑤ getAffectedJobs — time window filtering
// ═══════════════════════════════════════════════════════════════════

describe("getAffectedJobs", () => {
  const schedule: ScheduledJob[] = [
    makeJob({ id: 1, startTime: h(2), status: "SCHEDULED" }),    // within 48h
    makeJob({ id: 2, startTime: h(24), status: "SCHEDULED" }),   // within 48h
    makeJob({ id: 3, startTime: h(72), status: "SCHEDULED" }),   // beyond 48h
    makeJob({ id: 4, startTime: h(4), status: "COMPLETED" }),    // not SCHEDULED
    makeJob({ id: 5, startTime: h(6), status: "SCHEDULED", machineId: 102 }), // different machine
  ];

  it("finds jobs within 48-hour window on the target machine", () => {
    const jobs = getAffectedJobs(101, schedule, 48, NOW);
    expect(jobs).toHaveLength(2);
    expect(jobs.map(j => j.id)).toEqual([1, 2]);
  });

  it("excludes jobs beyond the window", () => {
    const jobs = getAffectedJobs(101, schedule, 48, NOW);
    expect(jobs.find(j => j.id === 3)).toBeUndefined();
  });

  it("excludes non-SCHEDULED jobs", () => {
    const jobs = getAffectedJobs(101, schedule, 48, NOW);
    expect(jobs.find(j => j.id === 4)).toBeUndefined();
  });

  it("excludes jobs on different machines", () => {
    const jobs = getAffectedJobs(101, schedule, 48, NOW);
    expect(jobs.find(j => j.id === 5)).toBeUndefined();
  });

  it("returns empty array when no matching jobs", () => {
    expect(getAffectedJobs(999, schedule, 48, NOW)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑥ rescheduleJobs — job movement
// ═══════════════════════════════════════════════════════════════════

describe("rescheduleJobs", () => {
  const backup: BackupMachine = {
    machineId: 102, machineCode: "CNC-002", machineName: "CNC Milling Center #2",
    healthScore: 88, healthStatus: "HEALTHY", compatibleTypes: ["CNC"],
  };

  it("moves all jobs to backup machine with MOVED_AUTO status", () => {
    const jobs = [makeJob({ id: 1 }), makeJob({ id: 2 })];
    const moved = rescheduleJobs(jobs, backup, "test reason", NOW);
    expect(moved).toHaveLength(2);
    for (const j of moved) {
      expect(j.machineId).toBe(102);
      expect(j.machineCode).toBe("CNC-002");
      expect(j.status).toBe("MOVED_AUTO");
    }
  });

  it("preserves original machine info for audit trail", () => {
    const jobs = [makeJob({ machineId: 101, machineCode: "CNC-001" })];
    const moved = rescheduleJobs(jobs, backup, "health critical", NOW);
    expect(moved[0].originalMachineId).toBe(101);
    expect(moved[0].originalMachineCode).toBe("CNC-001");
  });

  it("sets movedAt timestamp and moveReason", () => {
    const jobs = [makeJob()];
    const moved = rescheduleJobs(jobs, backup, "AI Auto-Reschedule", NOW);
    expect(moved[0].movedAt).toBe(NOW.toISOString());
    expect(moved[0].moveReason).toContain("AI Auto-Reschedule");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑦ createMaintenanceOrder
// ═══════════════════════════════════════════════════════════════════

describe("createMaintenanceOrder", () => {
  it("creates PREDICTIVE order with correct priority for CRITICAL machine", () => {
    const sensor = makeSensor({ healthScore: 25, healthStatus: "CRITICAL", vibrationLevel: 8.0, temperature: 80 });
    const order = createMaintenanceOrder(sensor, 101, NOW);
    expect(order.type).toBe("PREDICTIVE");
    expect(order.priority).toBe("CRITICAL");
    expect(order.status).toBe("OPEN");
    expect(order.healthScoreAtCreation).toBe(25);
  });

  it("creates HIGH priority for health 30-39", () => {
    const sensor = makeSensor({ healthScore: 35 });
    const order = createMaintenanceOrder(sensor, 102, NOW);
    expect(order.priority).toBe("HIGH");
  });

  it("sets 120 min estimated duration for CRITICAL", () => {
    const sensor = makeSensor({ healthScore: 25 });
    const order = createMaintenanceOrder(sensor, 103, NOW);
    expect(order.estimatedDurationMinutes).toBe(120);
  });

  it("sets 240 min estimated duration for HIGH", () => {
    const sensor = makeSensor({ healthScore: 35 });
    const order = createMaintenanceOrder(sensor, 104, NOW);
    expect(order.estimatedDurationMinutes).toBe(240);
  });

  it("includes sensor data in trigger reason", () => {
    const sensor = makeSensor({ healthScore: 30, vibrationLevel: 7.5, temperature: 78, spindleLoad: 95 });
    const order = createMaintenanceOrder(sensor, 105, NOW);
    expect(order.triggerReason).toContain("7.5mm/s");
    expect(order.triggerReason).toContain("78°C");
    expect(order.triggerReason).toContain("95%");
  });

  it("generates correct order code format", () => {
    const order = createMaintenanceOrder(makeSensor({ healthScore: 30 }), 101, NOW);
    expect(order.orderCode).toMatch(/^MWO-\d{8}-\d{3}$/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑧ monitorHealthAndReschedule — THE SELF-HEALING ENGINE
// ═══════════════════════════════════════════════════════════════════

describe("monitorHealthAndReschedule (THE SELF-HEALING ENGINE)", () => {
  it("takes no action when all machines are HEALTHY", () => {
    const healthyFleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 90, healthStatus: "HEALTHY" }),
      makeSensor({ machineId: 102, machineCode: "CNC-002", healthScore: 85, healthStatus: "HEALTHY" }),
    ];
    const result = monitorHealthAndReschedule(healthyFleet, [], NOW);
    expect(result.triggered).toBe(false);
    expect(result.jobsMoved).toBe(0);
    expect(result.maintenanceOrder).toBeNull();
    expect(result.summary).toContain("healthy");
  });

  it("creates maintenance order for CRITICAL machine even with no jobs", () => {
    const fleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 30, healthStatus: "CRITICAL" }),
    ];
    const result = monitorHealthAndReschedule(fleet, [], NOW);
    expect(result.triggered).toBe(true);
    expect(result.maintenanceOrder).not.toBeNull();
    expect(result.maintenanceOrder!.type).toBe("PREDICTIVE");
    expect(result.jobsMoved).toBe(0);
  });

  it("reports no backup machine when none in same family", () => {
    const fleet = [
      makeSensor({ machineId: 301, machineCode: "WLD-TIG-001", healthScore: 20, healthStatus: "CRITICAL" }),
    ];
    const result = monitorHealthAndReschedule(fleet, [], NOW);
    expect(result.triggered).toBe(true);
    expect(result.backupMachine).toBeNull();
    expect(result.summary).toContain("no backup");
  });

  it("does NOT auto-reschedule for WARNING machines", () => {
    const fleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 55, healthStatus: "WARNING" }),
    ];
    const jobs = [makeJob({ machineId: 101 })];
    const result = monitorHealthAndReschedule(fleet, jobs, NOW);
    expect(result.triggered).toBe(false);
    expect(result.jobsMoved).toBe(0);
  });

  it("generates decision log entries", () => {
    const fleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 30, healthStatus: "CRITICAL" }),
    ];
    const result = monitorHealthAndReschedule(fleet, [], NOW);
    expect(result.decisionLog.length).toBeGreaterThan(0);
    expect(result.decisionLog[0]).toContain("Self-Healing Engine started");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑨ FULL SELF-HEALING INTEGRATION TEST
//    CNC-001 drops to 35% → 3 jobs moved to CNC-002 → maintenance created
// ═══════════════════════════════════════════════════════════════════

describe("FULL SELF-HEALING: CNC-001 Critical → Jobs moved → Maintenance created", () => {
  const fleet: SensorReading[] = [
    makeSensor({
      machineId: 101, machineCode: "CNC-001", machineName: "CNC Milling Center #1",
      vibrationLevel: 7.2, temperature: 78, spindleLoad: 95, coolantPressure: 4.5,
      healthScore: 35, healthStatus: "CRITICAL", healthTrend: "DEGRADING",
    }),
    makeSensor({
      machineId: 102, machineCode: "CNC-002", machineName: "CNC Milling Center #2",
      vibrationLevel: 1.2, temperature: 42, spindleLoad: 65, coolantPressure: 5.0,
      healthScore: 88, healthStatus: "HEALTHY", healthTrend: "STABLE",
    }),
    makeSensor({
      machineId: 201, machineCode: "HYD-BENCH-001", machineName: "Hydraulic Test Bench #1",
      healthScore: 94, healthStatus: "HEALTHY",
    }),
  ];

  const schedule: ScheduledJob[] = [
    makeJob({ id: 1, jobId: "JOB-A", jobName: "Manifold Machining", machineId: 101, machineCode: "CNC-001", startTime: h(2) }),
    makeJob({ id: 2, jobId: "JOB-B", jobName: "Pump Housing", machineId: 101, machineCode: "CNC-001", startTime: h(8) }),
    makeJob({ id: 3, jobId: "JOB-C", jobName: "Nozzle Adapter", machineId: 101, machineCode: "CNC-001", startTime: h(24) }),
    makeJob({ id: 4, jobId: "JOB-D", jobName: "Future Job", machineId: 101, machineCode: "CNC-001", startTime: h(72), status: "SCHEDULED" }),
    makeJob({ id: 5, jobId: "JOB-E", jobName: "Completed Job", machineId: 101, machineCode: "CNC-001", startTime: h(-8), status: "COMPLETED" }),
    makeJob({ id: 6, jobId: "JOB-F", jobName: "Other Machine Job", machineId: 102, machineCode: "CNC-002", startTime: h(4) }),
  ];

  it("detects CNC-001 as CRITICAL and triggers self-healing", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    expect(result.triggered).toBe(true);
    expect(result.triggerMachine!.machineCode).toBe("CNC-001");
    expect(result.triggerMachine!.healthScore).toBe(35);
  });

  it("creates PREDICTIVE maintenance order for CNC-001", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    expect(result.maintenanceOrder).not.toBeNull();
    expect(result.maintenanceOrder!.machineCode).toBe("CNC-001");
    expect(result.maintenanceOrder!.type).toBe("PREDICTIVE");
    expect(result.maintenanceOrder!.priority).toBe("HIGH"); // 35 → HIGH
    expect(result.maintenanceOrder!.status).toBe("OPEN");
  });

  it("selects CNC-002 as backup machine (same family, healthy)", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    expect(result.backupMachine).not.toBeNull();
    expect(result.backupMachine!.machineCode).toBe("CNC-002");
    expect(result.backupMachine!.healthScore).toBe(88);
  });

  it("moves exactly 3 jobs (within 48h, SCHEDULED only)", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    expect(result.jobsMoved).toBe(3);
    expect(result.movedJobs).toHaveLength(3);
  });

  it("does NOT move job beyond 48h window (JOB-D)", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    const movedIds = result.movedJobs.map(j => j.jobId);
    expect(movedIds).not.toContain("JOB-D");
  });

  it("does NOT move already COMPLETED job (JOB-E)", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    const movedIds = result.movedJobs.map(j => j.jobId);
    expect(movedIds).not.toContain("JOB-E");
  });

  it("does NOT touch jobs on other machines (JOB-F on CNC-002)", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    const movedIds = result.movedJobs.map(j => j.jobId);
    expect(movedIds).not.toContain("JOB-F");
  });

  it("all moved jobs have status MOVED_AUTO", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    for (const job of result.movedJobs) {
      expect(job.status).toBe("MOVED_AUTO");
    }
  });

  it("all moved jobs point to CNC-002 as new machine", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    for (const job of result.movedJobs) {
      expect(job.machineId).toBe(102);
      expect(job.machineCode).toBe("CNC-002");
    }
  });

  it("all moved jobs preserve original CNC-001 reference", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    for (const job of result.movedJobs) {
      expect(job.originalMachineId).toBe(101);
      expect(job.originalMachineCode).toBe("CNC-001");
    }
  });

  it("summary describes the action clearly", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    expect(result.summary).toContain("CNC-001");
    expect(result.summary).toContain("CRITICAL");
    expect(result.summary).toContain("3 Jobs");
    expect(result.summary).toContain("CNC-002");
  });

  it("decision log traces every step", () => {
    const result = monitorHealthAndReschedule(fleet, schedule, NOW);
    const log = result.decisionLog.join("\n");
    expect(log).toContain("Self-Healing Engine started");
    expect(log).toContain("CRITICAL");
    expect(log).toContain("CNC-001");
    expect(log).toContain("Maintenance Order");
    expect(log).toContain("Backup found");
    expect(log).toContain("CNC-002");
    expect(log).toContain("AUTO-ACTION");
    expect(log).toContain("JOB-A");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑩ "The Self-Healing Test" (Action 4 exact scenario)
// ═══════════════════════════════════════════════════════════════════

describe("The Self-Healing Test (CEO Scenario)", () => {
  it("Step 1: CNC-001 at 90% → healthy, Job-A scheduled. Step 2: vibration spike → health 35%. Step 3: Engine runs. Step 4: Job-A on CNC-002, maintenance order created.", () => {
    // STEP 1: CNC-001 is healthy, Job-A scheduled on it
    const healthyFleet: SensorReading[] = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 90, healthStatus: "HEALTHY" }),
      makeSensor({ machineId: 102, machineCode: "CNC-002", healthScore: 88, healthStatus: "HEALTHY" }),
    ];
    const schedule: ScheduledJob[] = [
      makeJob({ id: 1, jobId: "JOB-A", jobName: "Critical Part Machining", machineId: 101, machineCode: "CNC-001" }),
    ];

    // Verify: no action when healthy
    const healthyResult = monitorHealthAndReschedule(healthyFleet, schedule, NOW);
    expect(healthyResult.triggered).toBe(false);
    expect(healthyResult.jobsMoved).toBe(0);

    // STEP 2: Simulated vibration spike → health drops to 35%
    const crisisFleet: SensorReading[] = [
      makeSensor({
        machineId: 101, machineCode: "CNC-001", machineName: "CNC Milling Center #1",
        vibrationLevel: 7.5, temperature: 80, spindleLoad: 98, coolantPressure: 3.5,
        healthScore: 35, healthStatus: "CRITICAL", healthTrend: "DEGRADING",
      }),
      makeSensor({ machineId: 102, machineCode: "CNC-002", healthScore: 88, healthStatus: "HEALTHY" }),
    ];

    // STEP 3: Engine runs
    const crisisResult = monitorHealthAndReschedule(crisisFleet, schedule, NOW);

    // STEP 4: Verify everything
    expect(crisisResult.triggered).toBe(true);

    // Job-A is now assigned to CNC-002
    expect(crisisResult.movedJobs).toHaveLength(1);
    expect(crisisResult.movedJobs[0].jobId).toBe("JOB-A");
    expect(crisisResult.movedJobs[0].machineCode).toBe("CNC-002");
    expect(crisisResult.movedJobs[0].status).toBe("MOVED_AUTO");
    expect(crisisResult.movedJobs[0].originalMachineCode).toBe("CNC-001");

    // Maintenance Order is created
    expect(crisisResult.maintenanceOrder).not.toBeNull();
    expect(crisisResult.maintenanceOrder!.machineCode).toBe("CNC-001");
    expect(crisisResult.maintenanceOrder!.type).toBe("PREDICTIVE");
    expect(crisisResult.maintenanceOrder!.id).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑪ Edge cases
// ═══════════════════════════════════════════════════════════════════

describe("Edge cases", () => {
  it("handles empty fleet gracefully", () => {
    const result = monitorHealthAndReschedule([], [], NOW);
    expect(result.triggered).toBe(false);
    expect(result.summary).toContain("healthy");
  });

  it("handles fleet with only OFFLINE machines", () => {
    const fleet = [makeSensor({ healthScore: -1, healthStatus: "OFFLINE" })];
    const result = monitorHealthAndReschedule(fleet, [], NOW);
    expect(result.triggered).toBe(false);
  });

  it("processes most critical machine first when multiple are CRITICAL", () => {
    const fleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 35, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 102, machineCode: "CNC-002", healthScore: 20, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 103, machineCode: "CNC-003", healthScore: 90, healthStatus: "HEALTHY" }),
    ];
    const result = monitorHealthAndReschedule(fleet, [], NOW);
    // Should process CNC-002 (health 20) first — it's the worst
    expect(result.triggerMachine!.machineCode).toBe("CNC-002");
    expect(result.triggerMachine!.healthScore).toBe(20);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⬛ HARDENING — Production-Readiness Stress Tests
// ═══════════════════════════════════════════════════════════════════

describe("HARDENING: Health classification exact boundaries", () => {
  it("score < 0 → OFFLINE", () => {
    expect(classifyHealth(-1)).toBe("OFFLINE");
    expect(classifyHealth(-0.01)).toBe("OFFLINE");
  });

  it("score = 0 → CRITICAL (not OFFLINE, boundary is < 0)", () => {
    expect(classifyHealth(0)).toBe("CRITICAL");
  });

  it("score = 39.99 → CRITICAL (< 40)", () => {
    expect(classifyHealth(39.99)).toBe("CRITICAL");
  });

  it("score = 40 exactly → WARNING (≥ CRITICAL_THRESHOLD, < WARNING_THRESHOLD)", () => {
    // CRITICAL_THRESHOLD = 40, uses `< 40`, so 40 is NOT critical
    expect(classifyHealth(40)).toBe("WARNING");
  });

  it("score = 69.99 → WARNING (< 70)", () => {
    expect(classifyHealth(69.99)).toBe("WARNING");
  });

  it("score = 70 exactly → HEALTHY (≥ WARNING_THRESHOLD)", () => {
    expect(classifyHealth(70)).toBe("HEALTHY");
  });

  it("score = 100 → HEALTHY", () => {
    expect(classifyHealth(100)).toBe("HEALTHY");
  });

  it("score = 999 → HEALTHY (no upper clamp)", () => {
    expect(classifyHealth(999)).toBe("HEALTHY");
  });
});

describe("HARDENING: Backup machine selection", () => {
  it("returns null when no backup machine available (all CRITICAL)", () => {
    const fleet = [
      makeSensor({ machineId: 1, machineCode: "CNC-001", healthScore: 30, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 2, machineCode: "CNC-002", healthScore: 25, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 3, machineCode: "CNC-003", healthScore: 15, healthStatus: "CRITICAL" }),
    ];
    const backup = findBackupMachine("CNC-001", fleet);
    expect(backup).toBeNull();
  });

  it("returns null when no same-family machine exists", () => {
    const fleet = [
      makeSensor({ machineId: 1, machineCode: "CNC-001", healthScore: 30, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 4, machineCode: "LASER-001", healthScore: 95, healthStatus: "HEALTHY" }),
    ];
    const backup = findBackupMachine("CNC-001", fleet);
    expect(backup).toBeNull();
  });

  it("never selects the failed machine itself", () => {
    const fleet = [
      makeSensor({ machineId: 1, machineCode: "CNC-001", healthScore: 90, healthStatus: "HEALTHY" }),
    ];
    const backup = findBackupMachine("CNC-001", fleet);
    expect(backup).toBeNull();
  });

  it("selects the highest-health backup among same family", () => {
    const fleet = [
      makeSensor({ machineId: 1, machineCode: "CNC-001", healthScore: 30, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 2, machineCode: "CNC-002", healthScore: 85, healthStatus: "HEALTHY" }),
      makeSensor({ machineId: 3, machineCode: "CNC-003", healthScore: 92, healthStatus: "HEALTHY" }),
    ];
    const backup = findBackupMachine("CNC-001", fleet);
    expect(backup).not.toBeNull();
    expect(backup!.machineCode).toBe("CNC-003");
    expect(backup!.healthScore).toBe(92);
  });
});

describe("HARDENING: Affected job filtering", () => {
  it("COMPLETED jobs are never included (only SCHEDULED)", () => {
    const jobs: ScheduledJob[] = [
      makeJob({ machineId: 1, status: "COMPLETED", startTime: h(1) }),
      makeJob({ machineId: 1, status: "IN_PROGRESS", startTime: h(1) }),
      makeJob({ machineId: 1, status: "SCHEDULED", startTime: h(1) }),
    ];
    const affected = getAffectedJobs(1, jobs, 24, NOW);
    expect(affected).toHaveLength(1);
    expect(affected[0].status).toBe("SCHEDULED");
  });

  it("jobs outside window are excluded", () => {
    const jobs: ScheduledJob[] = [
      makeJob({ machineId: 1, status: "SCHEDULED", startTime: h(25) }), // 25h > 24h window
    ];
    const affected = getAffectedJobs(1, jobs, 24, NOW);
    expect(affected).toHaveLength(0);
  });

  it("jobs at exact window boundary are included (<=)", () => {
    const jobs: ScheduledJob[] = [
      makeJob({ machineId: 1, status: "SCHEDULED", startTime: h(24) }), // exactly at cutoff
    ];
    const affected = getAffectedJobs(1, jobs, 24, NOW);
    expect(affected).toHaveLength(1);
  });
});

describe("HARDENING: All-CRITICAL fleet → no crash", () => {
  it("handles fleet where every machine is CRITICAL — no infinite loop", () => {
    const fleet = Array.from({ length: 10 }, (_, i) =>
      makeSensor({
        machineId: i + 1,
        machineCode: `CNC-${String(i + 1).padStart(3, "0")}`,
        healthScore: 20 + i,
        healthStatus: "CRITICAL",
      })
    );
    const jobs: ScheduledJob[] = [
      makeJob({ machineId: 1, status: "SCHEDULED", startTime: h(2) }),
    ];
    // Should not throw, not hang — trigger fires but no backup found
    const result = monitorHealthAndReschedule(fleet, jobs, NOW);
    expect(result.triggered).toBe(true);
    expect(result.movedJobs).toHaveLength(0); // no backup available
    expect(result.backupMachine).toBeNull();
    expect(result.jobsMoved).toBe(0);
  });
});

describe("HARDENING: Priority classification", () => {
  it("health 0 → CRITICAL priority", () => {
    expect(determinePriority(0)).toBe("CRITICAL");
  });

  it("health 29 → CRITICAL priority", () => {
    expect(determinePriority(29)).toBe("CRITICAL");
  });

  it("health 30 → HIGH priority (boundary)", () => {
    expect(determinePriority(30)).toBe("HIGH");
  });

  it("health 39 → HIGH priority", () => {
    expect(determinePriority(39)).toBe("HIGH");
  });

  it("health 40 → MEDIUM priority", () => {
    expect(determinePriority(40)).toBe("MEDIUM");
  });

  it("health 54 → MEDIUM priority", () => {
    expect(determinePriority(54)).toBe("MEDIUM");
  });

  it("health 55 → LOW priority", () => {
    expect(determinePriority(55)).toBe("LOW");
  });

  it("health 100 → LOW priority", () => {
    expect(determinePriority(100)).toBe("LOW");
  });
});
