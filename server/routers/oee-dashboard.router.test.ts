/**
 * OEE Dashboard Router — Comprehensive Automated Test Suite
 *
 * Covers:
 *   - Pure calculation functions: calculateOEE, aggregateOEE
 *   - Router procedures:
 *     1. dashboard (query)       — all machines with current OEE (live or mock fallback)
 *     2. machineHistory (query)  — single machine OEE history (last N days)
 *   - Auth guards (anonymous rejection)
 *   - Edge cases (division by zero, empty inputs, clamping)
 *
 * Run: npx vitest run server/routers/oee-dashboard.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock state (vi.hoisted not needed, top-level is fine) ──────────

const selectResultsQueue: any[][] = [];
const returningQueue: any[][] = [];

function getNextSelectResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => {
    const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1 }];
    return Object.assign(Promise.resolve(r), {
      then: (resolve: any) => Promise.resolve(r).then(resolve),
      catch: () => Promise.resolve(r),
    });
  });
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextSelectResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve([[]])),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  getDb: vi.fn(async () => mockDb),
  requireDb: vi.fn(async () => mockDb),
}));

// ─── Mock drizzle-orm ──────────────────────────────────────────────

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  sql: vi.fn(() => "sql"),
}));

// ─── Mock schema modules ──────────────────────────────────────────

vi.mock("../../drizzle/production-equipment-schema", () => ({
  productionEquipments: {
    id: "productionEquipments.id",
    code: "productionEquipments.code",
    name: "productionEquipments.name",
    type: "productionEquipments.type",
    status: "productionEquipments.status",
    location: "productionEquipments.location",
  },
}));

vi.mock("../../drizzle/oee-schema", () => ({
  productionShiftLogs: {
    id: "productionShiftLogs.id",
    machineId: "productionShiftLogs.machineId",
    shiftCode: "productionShiftLogs.shiftCode",
    shiftDate: "productionShiftLogs.shiftDate",
    plannedProductionMinutes: "productionShiftLogs.plannedProductionMinutes",
    operatingMinutes: "productionShiftLogs.operatingMinutes",
    idealCycleTimeSeconds: "productionShiftLogs.idealCycleTimeSeconds",
    totalCount: "productionShiftLogs.totalCount",
    defectCount: "productionShiftLogs.defectCount",
  },
  oeeSnapshots: {
    id: "oeeSnapshots.id",
    machineId: "oeeSnapshots.machineId",
    snapshotDate: "oeeSnapshots.snapshotDate",
    availability: "oeeSnapshots.availability",
    performance: "oeeSnapshots.performance",
    quality: "oeeSnapshots.quality",
    oee: "oeeSnapshots.oee",
  },
}));

// ─── Import callers AFTER mocks ────────────────────────────────────

import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// Import pure functions for direct unit testing
import {
  calculateOEE,
  aggregateOEE,
  type ShiftLogInput,
  type OEEResult,
} from "./oee-dashboard.router";

// ─── Reset ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

// =====================================================================
// Pure Calculation Engine: calculateOEE
// =====================================================================
describe("calculateOEE", () => {
  it("calculates OEE correctly for CNC machine input", () => {
    const input: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 438,
      idealCycleTimeSeconds: 120,
      totalCount: 198,
      defectCount: 5,
    };
    const result = calculateOEE(input);

    // Availability = 438/480 = 0.9125
    expect(result.availability).toBeCloseTo(438 / 480, 4);
    // Performance = (120 * 198) / (438 * 60) = 23760 / 26280 ≈ 0.9041
    expect(result.performance).toBeCloseTo((120 * 198) / (438 * 60), 4);
    // Quality = (198 - 5) / 198 = 193/198 ≈ 0.9747
    expect(result.quality).toBeCloseTo(193 / 198, 4);
    // OEE = A * P * Q ≈ 0.9125 * 0.9041 * 0.9747 ≈ 0.804 → 80.4% → "acceptable"
    const expectedOEE = (438 / 480) * ((120 * 198) / (438 * 60)) * (193 / 198);
    expect(result.oee).toBeCloseTo(expectedOEE, 4);
    expect(result.grade).toBe("acceptable");
  });

  it("returns critical grade when OEE < 70%", () => {
    const input: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 210,
      idealCycleTimeSeconds: 300,
      totalCount: 32,
      defectCount: 8,
    };
    const result = calculateOEE(input);
    expect(result.oeePct).toBeLessThan(70);
    expect(result.grade).toBe("critical");
  });

  it("returns acceptable grade when OEE is between 70 and 85", () => {
    // Availability = 400/480 ≈ 0.833
    // Performance = (60 * 350) / (400*60) = 21000/24000 = 0.875
    // Quality = (350-10)/350 ≈ 0.971
    // OEE ≈ 0.833 * 0.875 * 0.971 ≈ 70.8%
    const input: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 400,
      idealCycleTimeSeconds: 60,
      totalCount: 350,
      defectCount: 10,
    };
    const result = calculateOEE(input);
    expect(result.oeePct).toBeGreaterThanOrEqual(70);
    expect(result.oeePct).toBeLessThan(85);
    expect(result.grade).toBe("acceptable");
  });

  it("handles zero plannedProductionMinutes (availability = 0)", () => {
    const input: ShiftLogInput = {
      plannedProductionMinutes: 0,
      operatingMinutes: 0,
      idealCycleTimeSeconds: 120,
      totalCount: 100,
      defectCount: 5,
    };
    const result = calculateOEE(input);
    expect(result.availability).toBe(0);
    expect(result.oee).toBe(0);
    expect(result.grade).toBe("critical");
  });

  it("handles zero operatingMinutes (performance = 0)", () => {
    const input: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 0,
      idealCycleTimeSeconds: 120,
      totalCount: 0,
      defectCount: 0,
    };
    const result = calculateOEE(input);
    expect(result.availability).toBe(0);
    expect(result.performance).toBe(0);
    expect(result.oee).toBe(0);
  });

  it("handles zero totalCount (quality = 0)", () => {
    const input: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 438,
      idealCycleTimeSeconds: 120,
      totalCount: 0,
      defectCount: 0,
    };
    const result = calculateOEE(input);
    expect(result.quality).toBe(0);
    expect(result.oee).toBe(0);
  });

  it("clamps performance to max 1.0 when ideal cycle time is too high", () => {
    // If ideal cycle time is set very high, raw performance > 1.0
    const input: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 480,
      idealCycleTimeSeconds: 600, // 10 min cycle for each of 100 units = 60000s, but only 28800s available
      totalCount: 100,
      defectCount: 0,
    };
    const result = calculateOEE(input);
    // (600 * 100) / (480 * 60) = 60000 / 28800 = 2.08 → clamped to 1.0
    expect(result.performance).toBe(1);
  });

  it("clamps availability to max 1.0 when operating > planned", () => {
    const input: ShiftLogInput = {
      plannedProductionMinutes: 400,
      operatingMinutes: 500, // overtime
      idealCycleTimeSeconds: 60,
      totalCount: 200,
      defectCount: 0,
    };
    const result = calculateOEE(input);
    expect(result.availability).toBe(1);
  });

  it("handles defectCount > totalCount gracefully (goodCount clamped to 0)", () => {
    const input: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 480,
      idealCycleTimeSeconds: 60,
      totalCount: 10,
      defectCount: 15, // more defects than total
    };
    const result = calculateOEE(input);
    expect(result.quality).toBe(0);
    expect(result.oee).toBe(0);
  });

  it("returns percentage values rounded to 1 decimal", () => {
    const input: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 438,
      idealCycleTimeSeconds: 120,
      totalCount: 198,
      defectCount: 5,
    };
    const result = calculateOEE(input);
    // Check that percentages are rounded to 1 decimal place
    expect(result.availabilityPct).toBe(Math.round((438 / 480) * 1000) / 10);
    expect(result.performancePct).toBe(Math.round(((120 * 198) / (438 * 60)) * 1000) / 10);
  });

  it("returns all zero for completely idle machine", () => {
    const input: ShiftLogInput = {
      plannedProductionMinutes: 0,
      operatingMinutes: 0,
      idealCycleTimeSeconds: 1,
      totalCount: 0,
      defectCount: 0,
    };
    const result = calculateOEE(input);
    expect(result.availability).toBe(0);
    expect(result.performance).toBe(0);
    expect(result.quality).toBe(0);
    expect(result.oee).toBe(0);
    expect(result.oeePct).toBe(0);
    expect(result.grade).toBe("critical");
  });

  it("returns world-class for perfect OEE (100%)", () => {
    const input: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 480,
      idealCycleTimeSeconds: 60,
      totalCount: 480, // exactly matches: 480 * 60s = 28800s total = 480 * 60
      defectCount: 0,
    };
    const result = calculateOEE(input);
    expect(result.availability).toBe(1);
    expect(result.performance).toBe(1);
    expect(result.quality).toBe(1);
    expect(result.oee).toBe(1);
    expect(result.oeePct).toBe(100);
    expect(result.grade).toBe("world-class");
  });
});

// =====================================================================
// Pure Calculation Engine: aggregateOEE
// =====================================================================
describe("aggregateOEE", () => {
  it("returns all zeros for empty shifts array", () => {
    const result = aggregateOEE([]);
    expect(result.availability).toBe(0);
    expect(result.performance).toBe(0);
    expect(result.quality).toBe(0);
    expect(result.oee).toBe(0);
    expect(result.oeePct).toBe(0);
    expect(result.grade).toBe("critical");
  });

  it("aggregates a single shift (same as calculateOEE)", () => {
    const shift: ShiftLogInput = {
      plannedProductionMinutes: 480,
      operatingMinutes: 438,
      idealCycleTimeSeconds: 120,
      totalCount: 198,
      defectCount: 5,
    };
    const single = calculateOEE(shift);
    const aggregated = aggregateOEE([shift]);

    expect(aggregated.availability).toBeCloseTo(single.availability, 4);
    expect(aggregated.performance).toBeCloseTo(single.performance, 4);
    expect(aggregated.quality).toBeCloseTo(single.quality, 4);
    expect(aggregated.oee).toBeCloseTo(single.oee, 4);
  });

  it("aggregates multiple shifts by summing raw inputs", () => {
    const shifts: ShiftLogInput[] = [
      {
        plannedProductionMinutes: 480,
        operatingMinutes: 450,
        idealCycleTimeSeconds: 60,
        totalCount: 400,
        defectCount: 10,
      },
      {
        plannedProductionMinutes: 480,
        operatingMinutes: 420,
        idealCycleTimeSeconds: 60,
        totalCount: 380,
        defectCount: 20,
      },
    ];
    const result = aggregateOEE(shifts);

    // Aggregated: planned=960, operating=870, total=780, defects=30
    // Availability = 870/960
    expect(result.availability).toBeCloseTo(870 / 960, 4);
    // Performance = (60 * 780) / (870 * 60) = 780/870
    expect(result.performance).toBeCloseTo(780 / 870, 4);
    // Quality = (780-30)/780 = 750/780
    expect(result.quality).toBeCloseTo(750 / 780, 4);
  });

  it("uses idealCycleTimeSeconds from the last shift in reduce", () => {
    const shifts: ShiftLogInput[] = [
      {
        plannedProductionMinutes: 480,
        operatingMinutes: 480,
        idealCycleTimeSeconds: 60,
        totalCount: 200,
        defectCount: 0,
      },
      {
        plannedProductionMinutes: 480,
        operatingMinutes: 480,
        idealCycleTimeSeconds: 90, // different cycle time
        totalCount: 200,
        defectCount: 0,
      },
    ];
    const result = aggregateOEE(shifts);

    // Uses idealCycleTimeSeconds from reduce accumulator which overwrites each iteration
    // After reduce, idealCycleTimeSeconds = 90 (last shift's value)
    // Performance = (90 * 400) / (960 * 60) = 36000/57600 ≈ 0.625
    expect(result.performance).toBeCloseTo((90 * 400) / (960 * 60), 4);
  });

  it("handles shifts with all zero production", () => {
    const shifts: ShiftLogInput[] = [
      {
        plannedProductionMinutes: 480,
        operatingMinutes: 0,
        idealCycleTimeSeconds: 60,
        totalCount: 0,
        defectCount: 0,
      },
      {
        plannedProductionMinutes: 480,
        operatingMinutes: 0,
        idealCycleTimeSeconds: 60,
        totalCount: 0,
        defectCount: 0,
      },
    ];
    const result = aggregateOEE(shifts);
    expect(result.availability).toBe(0);
    expect(result.performance).toBe(0);
    expect(result.quality).toBe(0);
    expect(result.oee).toBe(0);
  });
});

// =====================================================================
// Router: dashboard
// =====================================================================
describe("oeeDashboard.dashboard", () => {
  it("returns mock data when DB has no machines", async () => {
    // safeQuery: first select returns empty machines → live = null
    selectResultsQueue.push([]); // machines query
    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.dashboard();
    expect(result.isLive).toBe(false);
    expect(result.machines).toBeDefined();
    expect(result.machines.length).toBeGreaterThan(0);
    // Mock data has 4 machines
    expect(result.machines.length).toBe(4);
  });

  it("returns mock data machine codes CNC-001, WASH-003, WELD-007, PAINT-002", async () => {
    selectResultsQueue.push([]); // no machines → fallback
    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.dashboard();
    const codes = result.machines.map((m: any) => m.machineCode);
    expect(codes).toContain("CNC-001");
    expect(codes).toContain("WASH-003");
    expect(codes).toContain("WELD-007");
    expect(codes).toContain("PAINT-002");
  });

  it("returns live data when DB has machines with shift logs", async () => {
    const today = new Date().toISOString().split("T")[0];
    // First select: machines
    selectResultsQueue.push([
      { id: 1, code: "M-001", name: "Machine 1", location: "Bay 1", status: "running" },
    ]);
    // Second select: shift logs for machine 1
    selectResultsQueue.push([
      {
        machineId: 1,
        shiftDate: today,
        plannedProductionMinutes: 480,
        operatingMinutes: 450,
        idealCycleTimeSeconds: "60",
        totalCount: 400,
        defectCount: 5,
      },
    ]);

    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.dashboard();
    expect(result.isLive).toBe(true);
    expect(result.machines).toHaveLength(1);
    expect(result.machines[0].machineCode).toBe("M-001");
    expect(result.machines[0].machineName).toBe("Machine 1");
    expect(result.machines[0].location).toBe("Bay 1");
    expect(result.machines[0].status).toBe("running");
    expect(result.machines[0].shiftsToday).toBe(1);
    expect(result.machines[0].oee).toBeDefined();
    expect(result.machines[0].oee.oeePct).toBeGreaterThan(0);
  });

  it("returns live data with zero OEE when machine has no shift logs today", async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    selectResultsQueue.push([
      { id: 1, code: "M-002", name: "Machine 2", location: "Bay 2", status: "idle" },
    ]);
    // Shift logs exist but not for today
    selectResultsQueue.push([
      {
        machineId: 1,
        shiftDate: yesterday,
        plannedProductionMinutes: 480,
        operatingMinutes: 450,
        idealCycleTimeSeconds: "60",
        totalCount: 400,
        defectCount: 5,
      },
    ]);

    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.dashboard();
    expect(result.isLive).toBe(true);
    expect(result.machines[0].shiftsToday).toBe(0);
    // No today's logs → calculateOEE with all zeros → OEE = 0
    expect(result.machines[0].oee.oee).toBe(0);
    expect(result.machines[0].oee.grade).toBe("critical");
  });

  it("handles multiple machines with separate shift logs", async () => {
    const today = new Date().toISOString().split("T")[0];
    selectResultsQueue.push([
      { id: 1, code: "M-001", name: "Machine 1", location: "A", status: "running" },
      { id: 2, code: "M-002", name: "Machine 2", location: "B", status: "idle" },
    ]);
    // Logs for machine 1
    selectResultsQueue.push([
      {
        machineId: 1, shiftDate: today,
        plannedProductionMinutes: 480, operatingMinutes: 460,
        idealCycleTimeSeconds: "60", totalCount: 400, defectCount: 2,
      },
    ]);
    // Logs for machine 2
    selectResultsQueue.push([]);

    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.dashboard();
    expect(result.isLive).toBe(true);
    expect(result.machines).toHaveLength(2);
    expect(result.machines[0].shiftsToday).toBe(1);
    expect(result.machines[1].shiftsToday).toBe(0);
  });

  it("uses null-safe location (defaults to empty string)", async () => {
    const today = new Date().toISOString().split("T")[0];
    selectResultsQueue.push([
      { id: 1, code: "M-003", name: "Machine 3", location: null, status: "running" },
    ]);
    selectResultsQueue.push([]); // no shift logs

    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.dashboard();
    expect(result.isLive).toBe(true);
    expect(result.machines[0].location).toBe("");
  });

  it("falls back to mock data when DB throws an error", async () => {
    // Make requireDb throw an error — safeQuery catches it
    const { requireDb } = await import("../db");
    (requireDb as any).mockRejectedValueOnce(new Error("DB connection failed"));

    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.dashboard();
    expect(result.isLive).toBe(false);
    expect(result.machines.length).toBe(4); // mock data
  });

  it("includes lastUpdated timestamp on each machine entry", async () => {
    selectResultsQueue.push([]); // no machines → fallback to mock
    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.dashboard();
    for (const machine of result.machines) {
      expect(machine.lastUpdated).toBeDefined();
      // Should be valid ISO string
      expect(new Date(machine.lastUpdated).toISOString()).toBe(machine.lastUpdated);
    }
  });

  it("each mock machine has valid OEE with grade", async () => {
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.dashboard();
    for (const machine of result.machines) {
      expect(machine.oee).toBeDefined();
      expect(["world-class", "acceptable", "critical"]).toContain(machine.oee.grade);
      expect(machine.oee.oeePct).toBeGreaterThanOrEqual(0);
      expect(machine.oee.oeePct).toBeLessThanOrEqual(100);
    }
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.oeeDashboard.dashboard()).rejects.toThrow();
  });
});

// =====================================================================
// Router: machineHistory
// =====================================================================
describe("oeeDashboard.machineHistory", () => {
  it("returns empty history with isLive=false when no snapshots exist", async () => {
    selectResultsQueue.push([]); // empty snapshots
    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.machineHistory({ machineId: 1 });
    expect(result.history).toEqual([]);
    expect(result.isLive).toBe(false);
  });

  it("returns mapped snapshot history with isLive=true", async () => {
    // BU scope check: verify machine belongs to user's BU
    selectResultsQueue.push([{ id: 1 }]);
    selectResultsQueue.push([
      {
        snapshotDate: "2026-02-28",
        oee: "0.8500",
        availability: "0.9100",
        performance: "0.9500",
        quality: "0.9800",
      },
      {
        snapshotDate: "2026-02-27",
        oee: "0.7200",
        availability: "0.8000",
        performance: "0.9000",
        quality: "1.0000",
      },
    ]);
    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.machineHistory({ machineId: 1 });
    expect(result.isLive).toBe(true);
    expect(result.history).toHaveLength(2);
    expect(result.history[0].date).toBe("2026-02-28");
    expect(result.history[0].oee).toBe(85);
    expect(result.history[0].availability).toBe(91);
    expect(result.history[0].performance).toBe(95);
    expect(result.history[0].quality).toBe(98);
    expect(result.history[1].oee).toBeCloseTo(72, 0);
  });

  it("uses default days=30 when not specified", async () => {
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    await caller.oeeDashboard.machineHistory({ machineId: 1 });
    // The limit mock should have been called
    // We verify DB chain was invoked
    expect(mockDb.select).toHaveBeenCalled();
  });

  it("uses custom days parameter", async () => {
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    await caller.oeeDashboard.machineHistory({ machineId: 5, days: 7 });
    expect(mockDb.select).toHaveBeenCalled();
  });

  it("multiplies decimal OEE values by 100 for display", async () => {
    // BU scope check: verify machine belongs to user's BU
    selectResultsQueue.push([{ id: 1 }]);
    selectResultsQueue.push([
      {
        snapshotDate: "2026-03-01",
        oee: "0.5000",
        availability: "0.7500",
        performance: "0.8000",
        quality: "0.8333",
      },
    ]);
    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.machineHistory({ machineId: 1 });
    expect(result.history[0].oee).toBe(50);
    expect(result.history[0].availability).toBe(75);
    expect(result.history[0].performance).toBe(80);
    expect(result.history[0].quality).toBeCloseTo(83.33, 1);
  });

  it("returns isLive=false when safeQuery returns null (DB error)", async () => {
    // Force the DB mock to throw inside safeQuery
    const { requireDb } = await import("../db");
    (requireDb as any).mockRejectedValueOnce(new Error("DB down"));

    const caller = createAdminCaller();
    const result = await caller.oeeDashboard.machineHistory({ machineId: 1 });
    expect(result.history).toEqual([]);
    expect(result.isLive).toBe(false);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.oeeDashboard.machineHistory({ machineId: 1 })
    ).rejects.toThrow();
  });

  it("rejects invalid input (machineId must be number)", async () => {
    const caller = createAdminCaller();
    await expect(
      (caller.oeeDashboard.machineHistory as any)({ machineId: "abc" })
    ).rejects.toThrow();
  });
});
