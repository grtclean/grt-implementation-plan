/**
 * Smart Scheduler Router — Unit Tests
 * Tests pure calculation engine (classifyHealth, determinePriority, calculateHealthScore,
 * findBackupMachine, getAffectedJobs, rescheduleJobs, createMaintenanceOrder,
 * monitorHealthAndReschedule) + 5 tRPC procedures (fleetHealth, ganttView, reschedule,
 * decisionLog, seedDemo)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller } from "../_test/trpc-test-utils";
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
} from "./smart-scheduler.router";

// ── Mock DB ──────────────────────────────────────────────
const mockDb = {
  execute: vi.fn(() => Promise.resolve({ rows: [] })),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.execute.mockResolvedValue({ rows: [] });
});

// ── Helper factories ─────────────────────────────────────
function makeSensor(overrides: Partial<SensorReading> = {}): SensorReading {
  return {
    machineId: 101, machineCode: "CNC-001", machineName: "CNC #1",
    vibrationLevel: 1.0, temperature: 42, spindleLoad: 65, coolantPressure: 5.0,
    powerConsumption: 12.0, healthScore: 88, healthStatus: "HEALTHY",
    healthTrend: "STABLE", lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

function makeJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    id: 1, jobId: "JOB-001", jobName: "Manifold Machining", projectCode: "P-001",
    machineId: 101, machineCode: "CNC-001",
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 7200000).toISOString(),
    status: "SCHEDULED", priority: 2, estimatedHours: 4,
    originalMachineId: null, originalMachineCode: null, movedAt: null, moveReason: null,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════
// PURE FUNCTION TESTS
// ════════════════════════════════════════════════════════════

describe("classifyHealth", () => {
  it("returns HEALTHY for score >= 70", () => {
    expect(classifyHealth(70)).toBe("HEALTHY");
    expect(classifyHealth(100)).toBe("HEALTHY");
  });
  it("returns WARNING for 40-69", () => {
    expect(classifyHealth(40)).toBe("WARNING");
    expect(classifyHealth(69)).toBe("WARNING");
  });
  it("returns CRITICAL for 0-39", () => {
    expect(classifyHealth(0)).toBe("CRITICAL");
    expect(classifyHealth(39)).toBe("CRITICAL");
  });
  it("returns OFFLINE for negative", () => {
    expect(classifyHealth(-1)).toBe("OFFLINE");
    expect(classifyHealth(-100)).toBe("OFFLINE");
  });
});

describe("determinePriority", () => {
  it("returns CRITICAL for score < 30", () => {
    expect(determinePriority(10)).toBe("CRITICAL");
    expect(determinePriority(29)).toBe("CRITICAL");
  });
  it("returns HIGH for 30-39", () => {
    expect(determinePriority(30)).toBe("HIGH");
    expect(determinePriority(39)).toBe("HIGH");
  });
  it("returns MEDIUM for 40-54", () => {
    expect(determinePriority(40)).toBe("MEDIUM");
    expect(determinePriority(54)).toBe("MEDIUM");
  });
  it("returns LOW for >= 55", () => {
    expect(determinePriority(55)).toBe("LOW");
    expect(determinePriority(100)).toBe("LOW");
  });
});

describe("calculateHealthScore", () => {
  it("returns 100 for perfect readings", () => {
    expect(calculateHealthScore(0, 40, 80, 5)).toBe(100);
  });

  it("returns 0 for worst readings", () => {
    expect(calculateHealthScore(10, 90, 120, 0)).toBe(0);
  });

  it("penalizes high vibration", () => {
    const good = calculateHealthScore(0, 40, 80, 5);
    const bad = calculateHealthScore(8, 40, 80, 5);
    expect(bad).toBeLessThan(good);
  });

  it("penalizes high temperature", () => {
    const good = calculateHealthScore(0, 40, 80, 5);
    const bad = calculateHealthScore(0, 80, 80, 5);
    expect(bad).toBeLessThan(good);
  });

  it("penalizes high spindle load", () => {
    const good = calculateHealthScore(0, 40, 80, 5);
    const bad = calculateHealthScore(0, 40, 110, 5);
    expect(bad).toBeLessThan(good);
  });

  it("penalizes out-of-range coolant pressure", () => {
    const good = calculateHealthScore(0, 40, 80, 5);
    const low = calculateHealthScore(0, 40, 80, 1);
    const high = calculateHealthScore(0, 40, 80, 9);
    expect(low).toBeLessThan(good);
    expect(high).toBeLessThan(good);
  });

  it("clamps between 0-100", () => {
    const score = calculateHealthScore(0, 40, 80, 5);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("findBackupMachine", () => {
  it("finds healthiest same-family backup", () => {
    const fleet: SensorReading[] = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 35, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 102, machineCode: "CNC-002", healthScore: 88, healthStatus: "HEALTHY" }),
      makeSensor({ machineId: 103, machineCode: "CNC-003", healthScore: 75, healthStatus: "HEALTHY" }),
    ];
    const backup = findBackupMachine("CNC-001", fleet);
    expect(backup).not.toBeNull();
    expect(backup!.machineCode).toBe("CNC-002");
    expect(backup!.healthScore).toBe(88);
  });

  it("returns null when no same-family backup", () => {
    const fleet: SensorReading[] = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 35, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 201, machineCode: "HYD-001", healthScore: 95, healthStatus: "HEALTHY" }),
    ];
    const backup = findBackupMachine("CNC-001", fleet);
    expect(backup).toBeNull();
  });

  it("excludes non-healthy machines", () => {
    const fleet: SensorReading[] = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 35, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 102, machineCode: "CNC-002", healthScore: 50, healthStatus: "WARNING" }),
    ];
    const backup = findBackupMachine("CNC-001", fleet);
    expect(backup).toBeNull();
  });

  it("returns null for empty fleet", () => {
    expect(findBackupMachine("CNC-001", [])).toBeNull();
  });
});

describe("getAffectedJobs", () => {
  const now = new Date("2026-03-01T10:00:00Z");

  it("returns jobs within the time window", () => {
    const jobs: ScheduledJob[] = [
      makeJob({ id: 1, machineId: 101, startTime: "2026-03-01T12:00:00Z", status: "SCHEDULED" }),
      makeJob({ id: 2, machineId: 101, startTime: "2026-03-02T10:00:00Z", status: "SCHEDULED" }),
      makeJob({ id: 3, machineId: 101, startTime: "2026-03-10T10:00:00Z", status: "SCHEDULED" }),
    ];
    const affected = getAffectedJobs(101, jobs, 48, now);
    expect(affected).toHaveLength(2);
  });

  it("excludes jobs on other machines", () => {
    const jobs: ScheduledJob[] = [
      makeJob({ id: 1, machineId: 101, startTime: "2026-03-01T12:00:00Z" }),
      makeJob({ id: 2, machineId: 102, startTime: "2026-03-01T12:00:00Z" }),
    ];
    const affected = getAffectedJobs(101, jobs, 48, now);
    expect(affected).toHaveLength(1);
    expect(affected[0].id).toBe(1);
  });

  it("excludes non-SCHEDULED jobs", () => {
    const jobs: ScheduledJob[] = [
      makeJob({ id: 1, machineId: 101, startTime: "2026-03-01T12:00:00Z", status: "COMPLETED" }),
      makeJob({ id: 2, machineId: 101, startTime: "2026-03-01T14:00:00Z", status: "SCHEDULED" }),
    ];
    const affected = getAffectedJobs(101, jobs, 48, now);
    expect(affected).toHaveLength(1);
    expect(affected[0].id).toBe(2);
  });

  it("returns empty for no matching jobs", () => {
    expect(getAffectedJobs(999, [], 48, now)).toHaveLength(0);
  });
});

describe("rescheduleJobs", () => {
  it("moves jobs to backup machine with MOVED_AUTO status", () => {
    const backup: BackupMachine = {
      machineId: 102, machineCode: "CNC-002", machineName: "CNC #2",
      healthScore: 88, healthStatus: "HEALTHY", compatibleTypes: ["CNC"],
    };
    const now = new Date("2026-03-01T10:00:00Z");
    const jobs = [makeJob({ id: 1, machineId: 101, machineCode: "CNC-001" })];
    const moved = rescheduleJobs(jobs, backup, "Health critical", now);

    expect(moved).toHaveLength(1);
    expect(moved[0].machineId).toBe(102);
    expect(moved[0].machineCode).toBe("CNC-002");
    expect(moved[0].status).toBe("MOVED_AUTO");
    expect(moved[0].originalMachineId).toBe(101);
    expect(moved[0].originalMachineCode).toBe("CNC-001");
    expect(moved[0].moveReason).toBe("Health critical");
  });
});

describe("createMaintenanceOrder", () => {
  it("creates order with PREDICTIVE type", () => {
    const sensor = makeSensor({ healthScore: 25, healthStatus: "CRITICAL", machineId: 101 });
    const now = new Date("2026-03-01T10:00:00Z");
    const order = createMaintenanceOrder(sensor, 1, now);

    expect(order.type).toBe("PREDICTIVE");
    expect(order.priority).toBe("CRITICAL");
    expect(order.status).toBe("OPEN");
    expect(order.machineId).toBe(101);
    expect(order.orderCode).toContain("MWO-");
    expect(order.estimatedDurationMinutes).toBe(120);
  });

  it("assigns HIGH priority for score 30-39", () => {
    const sensor = makeSensor({ healthScore: 35 });
    const order = createMaintenanceOrder(sensor, 2, new Date());
    expect(order.priority).toBe("HIGH");
    expect(order.estimatedDurationMinutes).toBe(240);
  });
});

describe("monitorHealthAndReschedule", () => {
  const now = new Date("2026-03-01T10:00:00Z");

  it("returns triggered=false when all healthy", () => {
    const fleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 90, healthStatus: "HEALTHY" }),
    ];
    const result = monitorHealthAndReschedule(fleet, [], now);
    expect(result.triggered).toBe(false);
    expect(result.triggerMachine).toBeNull();
    expect(result.maintenanceOrder).toBeNull();
    expect(result.summary).toContain("healthy");
  });

  it("creates maintenance order for critical machine", () => {
    const fleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 25, healthStatus: "CRITICAL" }),
    ];
    const result = monitorHealthAndReschedule(fleet, [], now);
    expect(result.triggered).toBe(true);
    expect(result.maintenanceOrder).not.toBeNull();
    expect(result.triggerMachine!.healthScore).toBe(25);
  });

  it("moves jobs to backup machine", () => {
    const fleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 25, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 102, machineCode: "CNC-002", healthScore: 88, healthStatus: "HEALTHY" }),
    ];
    const schedule = [
      makeJob({ id: 1, machineId: 101, machineCode: "CNC-001", startTime: "2026-03-01T12:00:00Z" }),
      makeJob({ id: 2, machineId: 101, machineCode: "CNC-001", startTime: "2026-03-02T08:00:00Z" }),
    ];
    const result = monitorHealthAndReschedule(fleet, schedule, now);
    expect(result.triggered).toBe(true);
    expect(result.jobsMoved).toBe(2);
    expect(result.backupMachine!.machineCode).toBe("CNC-002");
    expect(result.movedJobs).toHaveLength(2);
    expect(result.movedJobs[0].status).toBe("MOVED_AUTO");
  });

  it("handles no backup available", () => {
    const fleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 25, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 201, machineCode: "HYD-001", healthScore: 90, healthStatus: "HEALTHY" }),
    ];
    const result = monitorHealthAndReschedule(fleet, [], now);
    expect(result.triggered).toBe(true);
    expect(result.backupMachine).toBeNull();
    expect(result.jobsMoved).toBe(0);
    expect(result.summary).toContain("no backup");
  });

  it("prioritizes worst machine first", () => {
    const fleet = [
      makeSensor({ machineId: 101, machineCode: "CNC-001", healthScore: 30, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 102, machineCode: "CNC-002", healthScore: 20, healthStatus: "CRITICAL" }),
      makeSensor({ machineId: 103, machineCode: "CNC-003", healthScore: 90, healthStatus: "HEALTHY" }),
    ];
    const result = monitorHealthAndReschedule(fleet, [], now);
    expect(result.triggerMachine!.machineCode).toBe("CNC-002");
    expect(result.triggerMachine!.healthScore).toBe(20);
  });

  it("records decision log entries", () => {
    const fleet = [makeSensor({ healthScore: 90, healthStatus: "HEALTHY" })];
    const result = monitorHealthAndReschedule(fleet, [], now);
    expect(result.decisionLog.length).toBeGreaterThanOrEqual(2);
    expect(result.decisionLog[0]).toContain("Self-Healing Engine started");
  });
});

// ════════════════════════════════════════════════════════════
// tRPC PROCEDURE TESTS
// ════════════════════════════════════════════════════════════

describe("smart-scheduler router", () => {

  describe("fleetHealth", () => {
    it("returns fleet health with seed data on DB fallback", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.smartScheduler.fleetHealth();
      expect(result).toHaveProperty("machines");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("dataSource", "seed");
      expect(result.summary).toHaveProperty("total");
      expect(result.summary).toHaveProperty("healthy");
      expect(result.summary).toHaveProperty("critical");
    });

    it("returns fleet health from DB when available", async () => {
      mockDb.execute.mockResolvedValueOnce({
        rows: [
          { machine_id: 1, machine_code: "CNC-001", machine_name: "CNC #1",
            vibration_level: "2.0", temperature: "55", spindle_load: "85",
            coolant_pressure: "4.5", power_consumption: "15",
            health_score: 70, health_status: "HEALTHY", health_trend: "STABLE",
            last_updated: new Date().toISOString() },
        ],
      });
      const caller = createAuthenticatedCaller();
      const result = await caller.smartScheduler.fleetHealth();
      expect(result.dataSource).toBe("database");
      expect(result.machines).toHaveLength(1);
    });
  });

  describe("ganttView", () => {
    it("returns gantt data with merged reschedule results", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.smartScheduler.ganttView();
      expect(result).toHaveProperty("jobs");
      expect(result).toHaveProperty("movedJobIds");
      expect(result).toHaveProperty("maintenanceOrder");
      expect(result).toHaveProperty("summary");
    });
  });

  describe("reschedule", () => {
    it("triggers self-healing engine", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.smartScheduler.reschedule();
      expect(result).toHaveProperty("triggered");
      expect(result).toHaveProperty("decisionLog");
      expect(result).toHaveProperty("dataSource");
    });
  });

  describe("decisionLog", () => {
    it("returns decision log", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.smartScheduler.decisionLog();
      expect(result).toHaveProperty("log");
      expect(result).toHaveProperty("triggered");
      expect(result).toHaveProperty("summary");
    });
  });

  describe("seedDemo", () => {
    it("seeds demo data to DB", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.smartScheduler.seedDemo();
      expect(result).toHaveProperty("seeded", true);
      expect(result).toHaveProperty("fleet");
      expect(result).toHaveProperty("schedule");
      expect(result).toHaveProperty("tables");
      expect(result.tables).toContain("equipment_sensor_readings");
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for fleetHealth", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.smartScheduler.fleetHealth()).rejects.toThrow();
    });
    it("rejects anonymous for ganttView", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.smartScheduler.ganttView()).rejects.toThrow();
    });
    it("rejects anonymous for reschedule", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.smartScheduler.reschedule()).rejects.toThrow();
    });
    it("rejects anonymous for seedDemo", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.smartScheduler.seedDemo()).rejects.toThrow();
    });
  });
});
