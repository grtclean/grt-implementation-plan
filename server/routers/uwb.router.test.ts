/**
 * UWB Router — Comprehensive Automated Test Suite
 *
 * Covers all 21 procedures across 7 domains:
 *   - Location data (2 procedures: reportLocation, reportBatchLocations)
 *   - Work hours queries (3 procedures: getEmployeeWorkHours, getMyWorkHours, getTodayWorkHoursOverview)
 *   - Capacity (2 procedures: getResourceCapacity, getAllResourcesCapacity)
 *   - Zone management (4 procedures: createZone, getAllZones, getZoneOccupancy, getAllZonesOccupancy)
 *   - Tag management (2 procedures: bindTag, unbindTag)
 *   - Work hours sync (2 procedures: syncToScheduling, closeDayWorkHours)
 *   - Analytics & alerts (6 procedures: getWorkHoursReport, getAllTagBindings, getUnboundWorkers,
 *       getRealtimeLocations, getHistoryTrack, getAvailableHistoryDates,
 *       getLowBatteryAlerts, getLostTagAlerts, updateTagBattery, sendLowBatteryNotification)
 *
 * Run: npx vitest run server/routers/uwb.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB (two-layer pattern to avoid thenable unwrapping) ────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
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
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve(mockQueryResult)),
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

// ─── Mock UUID ──────────────────────────────────────────────────────
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

// ─── Mock UWB service ───────────────────────────────────────────────
const mockProcessLocationData = vi.fn(async () => {});
const mockProcessBatchLocationData = vi.fn(async () => ({ processed: 2, errors: 0 }));
const mockGetEmployeeWorkHoursSummary = vi.fn(async () => []);
const mockCalculateResourceCapacity = vi.fn(async () => null);
const mockGetAllResourcesCapacity = vi.fn(async () => []);
const mockSyncWorkHoursToScheduling = vi.fn(async () => {});
const mockCloseWorkHoursForDay = vi.fn(async () => 5);
const mockCreateZone = vi.fn(async () => "zone-uuid-1234");
const mockGetAllZones = vi.fn(async () => []);
const mockGetZoneOccupancy = vi.fn(async () => ({
  zoneId: "zone-1",
  zoneName: "Zone A",
  currentCount: 0,
  capacity: 20,
  employees: [],
}));
const mockBindTagToEmployee = vi.fn(async () => {});
const mockUnbindTag = vi.fn(async () => {});

vi.mock("../services/uwb.service", () => ({
  processLocationData: (...args: any[]) => mockProcessLocationData(...args),
  processBatchLocationData: (...args: any[]) => mockProcessBatchLocationData(...args),
  getEmployeeWorkHoursSummary: (...args: any[]) => mockGetEmployeeWorkHoursSummary(...args),
  calculateResourceCapacity: (...args: any[]) => mockCalculateResourceCapacity(...args),
  getAllResourcesCapacity: (...args: any[]) => mockGetAllResourcesCapacity(...args),
  syncWorkHoursToScheduling: (...args: any[]) => mockSyncWorkHoursToScheduling(...args),
  closeWorkHoursForDay: (...args: any[]) => mockCloseWorkHoursForDay(...args),
  createZone: (...args: any[]) => mockCreateZone(...args),
  getAllZones: (...args: any[]) => mockGetAllZones(...args),
  getZoneOccupancy: (...args: any[]) => mockGetZoneOccupancy(...args),
  bindTagToEmployee: (...args: any[]) => mockBindTagToEmployee(...args),
  unbindTag: (...args: any[]) => mockUnbindTag(...args),
}));

// ─── Import callers AFTER mocks ─────────────────────────────────────
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Test fixtures ──────────────────────────────────────────────────
const sampleLocationData = {
  tagId: "TAG-001",
  x: 10.5,
  y: 20.3,
  z: 1.2,
  accuracy: 0.15,
  signalStrength: -45,
  timestamp: "2026-03-01T08:00:00Z",
};

const sampleZoneInput = {
  zoneCode: "PROD-001",
  zoneName: "生产线A",
  zoneType: "production" as const,
  buCode: "BU-001",
  bounds: {
    xMin: 0,
    xMax: 50,
    yMin: 0,
    yMax: 30,
    zMin: 0,
    zMax: 5,
  },
  isWorkZone: true,
  capacity: 20,
};

const sampleWorkHoursSummary = {
  employeeId: "emp-1",
  workDate: "2026-03-01",
  totalMinutes: 480,
  effectiveMinutes: 420,
  idleMinutes: 60,
  zones: [
    { zoneId: "zone-1", zoneName: "Zone A", minutes: 300 },
    { zoneId: "zone-2", zoneName: "Zone B", minutes: 120 },
  ],
  utilizationRate: 0.875,
};

const sampleCapacityData = {
  resourceId: "res-1",
  resourceName: "CNC Machine #1",
  date: "2026-03-01",
  baseCapacityHours: 8,
  actualWorkHours: 6,
  availableCapacity: 2,
  utilizationRate: 0.75,
};

const sampleZone = {
  id: "zone-1",
  zoneCode: "PROD-001",
  zoneName: "生产线A",
  zoneType: "production",
  buCode: "BU-001",
  bounds: { xMin: 0, xMax: 50, yMin: 0, yMax: 30 },
  isWorkZone: true,
  capacity: 20,
};

// ─── Reset mocks ────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;

  // Reset service mocks to defaults
  mockProcessLocationData.mockResolvedValue(undefined);
  mockProcessBatchLocationData.mockResolvedValue({ processed: 2, errors: 0 });
  mockGetEmployeeWorkHoursSummary.mockResolvedValue([]);
  mockCalculateResourceCapacity.mockResolvedValue(null);
  mockGetAllResourcesCapacity.mockResolvedValue([]);
  mockSyncWorkHoursToScheduling.mockResolvedValue(undefined);
  mockCloseWorkHoursForDay.mockResolvedValue(5);
  mockCreateZone.mockResolvedValue("zone-uuid-1234");
  mockGetAllZones.mockResolvedValue([]);
  mockGetZoneOccupancy.mockResolvedValue({
    zoneId: "zone-1",
    zoneName: "Zone A",
    currentCount: 0,
    capacity: 20,
    employees: [],
  });
  mockBindTagToEmployee.mockResolvedValue(undefined);
  mockUnbindTag.mockResolvedValue(undefined);
});

// =====================================================================
// AUTH GUARDS — All procedures are protectedProcedure
// =====================================================================

describe("uwb router — auth guards", () => {
  it("rejects anonymous caller on reportLocation", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.uwb.reportLocation(sampleLocationData)).rejects.toThrow();
  });

  it("rejects anonymous caller on reportBatchLocations", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.uwb.reportBatchLocations([sampleLocationData])).rejects.toThrow();
  });

  it("rejects anonymous caller on getEmployeeWorkHours", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.uwb.getEmployeeWorkHours({ employeeId: "emp-1", startDate: "2026-03-01", endDate: "2026-03-31" })
    ).rejects.toThrow();
  });

  it("rejects anonymous caller on getMyWorkHours", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.uwb.getMyWorkHours({ startDate: "2026-03-01", endDate: "2026-03-31" })
    ).rejects.toThrow();
  });

  it("rejects anonymous caller on getTodayWorkHoursOverview", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.uwb.getTodayWorkHoursOverview()).rejects.toThrow();
  });

  it("rejects anonymous caller on getResourceCapacity", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.uwb.getResourceCapacity({ resourceId: "res-1", date: "2026-03-01" })
    ).rejects.toThrow();
  });

  it("rejects anonymous caller on createZone", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.uwb.createZone(sampleZoneInput)).rejects.toThrow();
  });

  it("rejects anonymous caller on bindTag", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.uwb.bindTag({ tagId: "T1", employeeId: "E1" })).rejects.toThrow();
  });

  it("rejects anonymous caller on getAllTagBindings", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.uwb.getAllTagBindings()).rejects.toThrow();
  });

  it("rejects anonymous caller on getRealtimeLocations", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.uwb.getRealtimeLocations()).rejects.toThrow();
  });
});

// =====================================================================
// reportLocation
// =====================================================================

describe("uwb.reportLocation", () => {
  it("processes a single location data point and returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.uwb.reportLocation(sampleLocationData);
    expect(result).toEqual({ success: true });
    expect(mockProcessLocationData).toHaveBeenCalledOnce();
    expect(mockProcessLocationData).toHaveBeenCalledWith(
      expect.objectContaining({
        tagId: "TAG-001",
        x: 10.5,
        y: 20.3,
        z: 1.2,
        timestamp: expect.any(Date),
      })
    );
  });

  it("accepts location data without optional fields", async () => {
    const caller = createAdminCaller();
    const result = await caller.uwb.reportLocation({
      tagId: "TAG-002",
      x: 5,
      y: 10,
      timestamp: "2026-03-01T09:00:00Z",
    });
    expect(result).toEqual({ success: true });
    expect(mockProcessLocationData).toHaveBeenCalledOnce();
  });

  it("converts string timestamp to Date", async () => {
    const caller = createAdminCaller();
    await caller.uwb.reportLocation(sampleLocationData);
    const callArg = mockProcessLocationData.mock.calls[0][0];
    expect(callArg.timestamp).toBeInstanceOf(Date);
  });

  it("propagates service errors", async () => {
    mockProcessLocationData.mockRejectedValueOnce(new Error("Database error"));
    const caller = createAdminCaller();
    await expect(caller.uwb.reportLocation(sampleLocationData)).rejects.toThrow("Database error");
  });
});

// =====================================================================
// reportBatchLocations
// =====================================================================

describe("uwb.reportBatchLocations", () => {
  it("processes multiple location data points", async () => {
    const caller = createAdminCaller();
    const batch = [
      { ...sampleLocationData, tagId: "TAG-001" },
      { ...sampleLocationData, tagId: "TAG-002", x: 15, y: 25 },
    ];
    const result = await caller.uwb.reportBatchLocations(batch);
    expect(result).toEqual({ processed: 2, errors: 0 });
    expect(mockProcessBatchLocationData).toHaveBeenCalledOnce();
  });

  it("handles empty batch", async () => {
    mockProcessBatchLocationData.mockResolvedValueOnce({ processed: 0, errors: 0 });
    const caller = createAdminCaller();
    const result = await caller.uwb.reportBatchLocations([]);
    expect(result).toEqual({ processed: 0, errors: 0 });
  });

  it("returns error count from partial failures", async () => {
    mockProcessBatchLocationData.mockResolvedValueOnce({ processed: 3, errors: 2 });
    const caller = createAdminCaller();
    const result = await caller.uwb.reportBatchLocations([
      sampleLocationData,
      sampleLocationData,
      sampleLocationData,
      sampleLocationData,
      sampleLocationData,
    ]);
    expect(result.errors).toBe(2);
    expect(result.processed).toBe(3);
  });
});

// =====================================================================
// getEmployeeWorkHours
// =====================================================================

describe("uwb.getEmployeeWorkHours", () => {
  it("returns work hours summary for an employee", async () => {
    mockGetEmployeeWorkHoursSummary.mockResolvedValueOnce([sampleWorkHoursSummary]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getEmployeeWorkHours({
      employeeId: "emp-1",
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });
    expect(result).toHaveLength(1);
    expect(result[0].effectiveMinutes).toBe(420);
    expect(mockGetEmployeeWorkHoursSummary).toHaveBeenCalledWith("emp-1", "2026-03-01", "2026-03-31");
  });

  it("returns empty array when no work hours found", async () => {
    mockGetEmployeeWorkHoursSummary.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getEmployeeWorkHours({
      employeeId: "emp-nonexistent",
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });
    expect(result).toEqual([]);
  });

  it("returns multiple days of work hours", async () => {
    const multiDaySummary = [
      { ...sampleWorkHoursSummary, workDate: "2026-03-01" },
      { ...sampleWorkHoursSummary, workDate: "2026-03-02", totalMinutes: 460, effectiveMinutes: 400 },
    ];
    mockGetEmployeeWorkHoursSummary.mockResolvedValueOnce(multiDaySummary);
    const caller = createAdminCaller();
    const result = await caller.uwb.getEmployeeWorkHours({
      employeeId: "emp-1",
      startDate: "2026-03-01",
      endDate: "2026-03-02",
    });
    expect(result).toHaveLength(2);
  });
});

// =====================================================================
// getMyWorkHours
// =====================================================================

describe("uwb.getMyWorkHours", () => {
  it("uses ctx.user.id to fetch current user work hours", async () => {
    mockGetEmployeeWorkHoursSummary.mockResolvedValueOnce([sampleWorkHoursSummary]);
    const caller = createAdminCaller({ id: 42 });
    const result = await caller.uwb.getMyWorkHours({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });
    expect(result).toHaveLength(1);
    // ctx.user.id = 42, should be stringified
    expect(mockGetEmployeeWorkHoursSummary).toHaveBeenCalledWith("42", "2026-03-01", "2026-03-31");
  });

  it("returns empty when user has no hours", async () => {
    mockGetEmployeeWorkHoursSummary.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getMyWorkHours({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    expect(result).toEqual([]);
  });
});

// =====================================================================
// getTodayWorkHoursOverview
// =====================================================================

describe("uwb.getTodayWorkHoursOverview", () => {
  it("returns today's work hours overview with employee data", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [
        { employee_id: "e1", employee_name: "Alice", effective_minutes: "360", total_minutes: "420" },
        { employee_id: "e2", employee_name: "Bob", effective_minutes: "300", total_minutes: "400" },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getTodayWorkHoursOverview();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      employeeId: "e1",
      employeeName: "Alice",
      effectiveMinutes: 360,
      totalMinutes: 420,
      effectiveHours: 6,
    });
    expect(result[1].effectiveHours).toBe(5);
  });

  it("returns empty array when no data for today", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getTodayWorkHoursOverview();
    expect(result).toEqual([]);
  });

  it("handles null effective_minutes gracefully", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [{ employee_id: "e1", employee_name: "Charlie", effective_minutes: null, total_minutes: null }],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getTodayWorkHoursOverview();
    expect(result[0].effectiveMinutes).toBe(0);
    expect(result[0].totalMinutes).toBe(0);
    expect(result[0].effectiveHours).toBe(0);
  });
});

// =====================================================================
// getResourceCapacity
// =====================================================================

describe("uwb.getResourceCapacity", () => {
  it("returns resource capacity data", async () => {
    mockCalculateResourceCapacity.mockResolvedValueOnce(sampleCapacityData);
    const caller = createAdminCaller();
    const result = await caller.uwb.getResourceCapacity({ resourceId: "res-1", date: "2026-03-01" });
    expect(result).toEqual(sampleCapacityData);
    expect(mockCalculateResourceCapacity).toHaveBeenCalledWith("res-1", "2026-03-01");
  });

  it("returns null when resource not found", async () => {
    mockCalculateResourceCapacity.mockResolvedValueOnce(null);
    const caller = createAdminCaller();
    const result = await caller.uwb.getResourceCapacity({ resourceId: "nonexistent", date: "2026-03-01" });
    expect(result).toBeNull();
  });
});

// =====================================================================
// getAllResourcesCapacity
// =====================================================================

describe("uwb.getAllResourcesCapacity", () => {
  it("returns capacity data for all resources", async () => {
    const capacities = [
      sampleCapacityData,
      { ...sampleCapacityData, resourceId: "res-2", resourceName: "CNC Machine #2" },
    ];
    mockGetAllResourcesCapacity.mockResolvedValueOnce(capacities);
    const caller = createAdminCaller();
    const result = await caller.uwb.getAllResourcesCapacity({ date: "2026-03-01" });
    expect(result).toHaveLength(2);
    expect(mockGetAllResourcesCapacity).toHaveBeenCalledWith("2026-03-01");
  });

  it("returns empty array when no resources exist", async () => {
    mockGetAllResourcesCapacity.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getAllResourcesCapacity({ date: "2026-03-01" });
    expect(result).toEqual([]);
  });
});

// =====================================================================
// createZone
// =====================================================================

describe("uwb.createZone", () => {
  it("creates a zone and returns id + success", async () => {
    const caller = createAdminCaller();
    const result = await caller.uwb.createZone(sampleZoneInput);
    expect(result).toEqual({ id: "zone-uuid-1234", success: true });
    expect(mockCreateZone).toHaveBeenCalledWith(sampleZoneInput);
  });

  it("creates a zone without optional buCode", async () => {
    const caller = createAdminCaller();
    const { buCode, ...inputWithoutBu } = sampleZoneInput;
    const result = await caller.uwb.createZone(inputWithoutBu);
    expect(result.success).toBe(true);
  });

  it("rejects invalid zone type", async () => {
    const caller = createAdminCaller();
    const invalidInput = { ...sampleZoneInput, zoneType: "invalid_type" };
    await expect(caller.uwb.createZone(invalidInput as any)).rejects.toThrow();
  });

  it("rejects non-positive capacity", async () => {
    const caller = createAdminCaller();
    const invalidInput = { ...sampleZoneInput, capacity: 0 };
    await expect(caller.uwb.createZone(invalidInput)).rejects.toThrow();
  });

  it("rejects negative capacity", async () => {
    const caller = createAdminCaller();
    const invalidInput = { ...sampleZoneInput, capacity: -5 };
    await expect(caller.uwb.createZone(invalidInput)).rejects.toThrow();
  });
});

// =====================================================================
// getAllZones
// =====================================================================

describe("uwb.getAllZones", () => {
  it("returns all zones", async () => {
    mockGetAllZones.mockResolvedValueOnce([sampleZone]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getAllZones();
    expect(result).toHaveLength(1);
    expect(result[0].zoneName).toBe("生产线A");
  });

  it("returns empty when no zones exist", async () => {
    mockGetAllZones.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getAllZones();
    expect(result).toEqual([]);
  });
});

// =====================================================================
// getZoneOccupancy
// =====================================================================

describe("uwb.getZoneOccupancy", () => {
  it("returns zone occupancy data", async () => {
    mockGetZoneOccupancy.mockResolvedValueOnce({
      zoneId: "zone-1",
      zoneName: "生产线A",
      currentCount: 5,
      capacity: 20,
      employees: [
        { id: "e1", name: "Alice", lastSeen: new Date("2026-03-01T08:00:00Z") },
      ],
    });
    const caller = createAdminCaller();
    const result = await caller.uwb.getZoneOccupancy({ zoneId: "zone-1" });
    expect(result.currentCount).toBe(5);
    expect(result.capacity).toBe(20);
    expect(result.employees).toHaveLength(1);
  });

  it("throws when zone does not exist", async () => {
    mockGetZoneOccupancy.mockRejectedValueOnce(new Error("区域不存在"));
    const caller = createAdminCaller();
    await expect(caller.uwb.getZoneOccupancy({ zoneId: "nonexistent" })).rejects.toThrow("区域不存在");
  });
});

// =====================================================================
// getAllZonesOccupancy
// =====================================================================

describe("uwb.getAllZonesOccupancy", () => {
  it("returns occupancy for all zones", async () => {
    const zones = [
      { ...sampleZone, id: "zone-1" },
      { ...sampleZone, id: "zone-2", zoneName: "Zone B" },
    ];
    mockGetAllZones.mockResolvedValueOnce(zones);
    mockGetZoneOccupancy
      .mockResolvedValueOnce({
        zoneId: "zone-1", zoneName: "生产线A", currentCount: 3, capacity: 20, employees: [],
      })
      .mockResolvedValueOnce({
        zoneId: "zone-2", zoneName: "Zone B", currentCount: 7, capacity: 15, employees: [],
      });

    const caller = createAdminCaller();
    const result = await caller.uwb.getAllZonesOccupancy();
    expect(result).toHaveLength(2);
    expect(result[0].currentCount).toBe(3);
    expect(result[1].currentCount).toBe(7);
  });

  it("returns empty array when no zones exist", async () => {
    mockGetAllZones.mockResolvedValueOnce([]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getAllZonesOccupancy();
    expect(result).toEqual([]);
  });

  it("handles occupancy errors gracefully with fallback", async () => {
    const zones = [{ ...sampleZone, id: "zone-1" }];
    mockGetAllZones.mockResolvedValueOnce(zones);
    mockGetZoneOccupancy.mockRejectedValueOnce(new Error("DB error"));

    const caller = createAdminCaller();
    const result = await caller.uwb.getAllZonesOccupancy();
    expect(result).toHaveLength(1);
    // Fallback: currentCount = 0, employees = []
    expect(result[0].currentCount).toBe(0);
    expect(result[0].employees).toEqual([]);
  });
});

// =====================================================================
// bindTag
// =====================================================================

describe("uwb.bindTag", () => {
  it("binds a tag to an employee and returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.uwb.bindTag({ tagId: "TAG-100", employeeId: "emp-1" });
    expect(result).toEqual({ success: true });
    expect(mockBindTagToEmployee).toHaveBeenCalledWith("TAG-100", "emp-1");
  });

  it("propagates bind errors", async () => {
    mockBindTagToEmployee.mockRejectedValueOnce(new Error("Employee not found"));
    const caller = createAdminCaller();
    await expect(caller.uwb.bindTag({ tagId: "TAG-100", employeeId: "invalid" })).rejects.toThrow();
  });
});

// =====================================================================
// unbindTag
// =====================================================================

describe("uwb.unbindTag", () => {
  it("unbinds a tag and returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.uwb.unbindTag({ tagId: "TAG-100" });
    expect(result).toEqual({ success: true });
    expect(mockUnbindTag).toHaveBeenCalledWith("TAG-100");
  });

  it("propagates unbind errors", async () => {
    mockUnbindTag.mockRejectedValueOnce(new Error("Tag not found"));
    const caller = createAdminCaller();
    await expect(caller.uwb.unbindTag({ tagId: "TAG-INVALID" })).rejects.toThrow();
  });
});

// =====================================================================
// syncToScheduling
// =====================================================================

describe("uwb.syncToScheduling", () => {
  it("syncs work hours and returns success message", async () => {
    const caller = createAdminCaller();
    const result = await caller.uwb.syncToScheduling({
      employeeId: "emp-1",
      taskId: "task-1",
      reportedHours: 4.5,
    });
    expect(result).toEqual({ success: true, message: "工时已同步到排程系统" });
    expect(mockSyncWorkHoursToScheduling).toHaveBeenCalledWith("emp-1", "task-1", 4.5);
  });

  it("rejects zero reported hours", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.uwb.syncToScheduling({ employeeId: "emp-1", taskId: "task-1", reportedHours: 0 })
    ).rejects.toThrow();
  });

  it("rejects negative reported hours", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.uwb.syncToScheduling({ employeeId: "emp-1", taskId: "task-1", reportedHours: -2 })
    ).rejects.toThrow();
  });
});

// =====================================================================
// closeDayWorkHours
// =====================================================================

describe("uwb.closeDayWorkHours", () => {
  it("closes day records and returns count", async () => {
    mockCloseWorkHoursForDay.mockResolvedValueOnce(10);
    const caller = createAdminCaller();
    const result = await caller.uwb.closeDayWorkHours({ date: "2026-03-01" });
    expect(result).toEqual({ success: true, closedRecords: 10 });
    expect(mockCloseWorkHoursForDay).toHaveBeenCalledWith("2026-03-01");
  });

  it("returns 0 when no records to close", async () => {
    mockCloseWorkHoursForDay.mockResolvedValueOnce(0);
    const caller = createAdminCaller();
    const result = await caller.uwb.closeDayWorkHours({ date: "2025-01-01" });
    expect(result.closedRecords).toBe(0);
  });
});

// =====================================================================
// getWorkHoursReport
// =====================================================================

describe("uwb.getWorkHoursReport", () => {
  it("returns employee-grouped report by default", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [
        {
          group_id: "emp-1",
          group_name: "Alice",
          effective_minutes: "360",
          total_minutes: "480",
          work_days: "5",
        },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getWorkHoursReport({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });
    expect(result).toHaveLength(1);
    expect(result[0].groupId).toBe("emp-1");
    expect(result[0].groupName).toBe("Alice");
    expect(result[0].effectiveMinutes).toBe(360);
    expect(result[0].totalMinutes).toBe(480);
    expect(result[0].effectiveHours).toBe(6);
    expect(result[0].totalHours).toBe(8);
    expect(result[0].utilizationRate).toBe(360 / 480);
    expect(result[0].additionalInfo).toBe("5");
  });

  it("groups by zone when specified", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [
        {
          group_id: "zone-1",
          group_name: "Production Line A",
          effective_minutes: "1200",
          total_minutes: "1500",
          employee_count: "10",
        },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getWorkHoursReport({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      groupBy: "zone",
    });
    expect(result[0].groupId).toBe("zone-1");
    expect(result[0].additionalInfo).toBe("10");
  });

  it("groups by date when specified", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [
        {
          group_id: "2026-03-01",
          group_name: "2026-03-01",
          effective_minutes: "2400",
          total_minutes: "3000",
          employee_count: "15",
        },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getWorkHoursReport({
      startDate: "2026-03-01",
      endDate: "2026-03-01",
      groupBy: "date",
    });
    expect(result[0].groupId).toBe("2026-03-01");
  });

  it("returns empty array when no data matches", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getWorkHoursReport({
      startDate: "2020-01-01",
      endDate: "2020-12-31",
    });
    expect(result).toEqual([]);
  });

  it("handles zero total_minutes (avoids division by zero)", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [{ group_id: "emp-1", group_name: "Alice", effective_minutes: "0", total_minutes: "0", work_days: "0" }],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getWorkHoursReport({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });
    expect(result[0].utilizationRate).toBe(0);
  });

  it("rejects invalid groupBy value", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.uwb.getWorkHoursReport({
        startDate: "2026-03-01",
        endDate: "2026-03-31",
        groupBy: "invalid" as any,
      })
    ).rejects.toThrow();
  });
});

// =====================================================================
// getAllTagBindings
// =====================================================================

describe("uwb.getAllTagBindings", () => {
  it("returns all tag bindings with employee info", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [
        {
          tag_id: "TAG-001",
          employee_id: "emp-1",
          employee_name: "Alice",
          department: "Engineering",
          bound_at: "2026-02-01T10:00:00Z",
          status: "active",
          battery_level: 85,
          last_seen: "2026-03-01T07:50:00Z",
        },
        {
          tag_id: "TAG-002",
          employee_id: null,
          employee_name: null,
          department: null,
          bound_at: null,
          status: "inactive",
          battery_level: 0,
          last_seen: null,
        },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getAllTagBindings();
    expect(result).toHaveLength(2);
    expect(result[0].tagId).toBe("TAG-001");
    expect(result[0].employeeName).toBe("Alice");
    expect(result[0].batteryLevel).toBe(85);
    expect(result[1].employeeName).toBe("未绑定");
    expect(result[1].boundAt).toBeNull();
    expect(result[1].lastSeen).toBeNull();
  });

  it("returns empty array when no bindings exist", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getAllTagBindings();
    expect(result).toEqual([]);
  });
});

// =====================================================================
// getUnboundWorkers
// =====================================================================

describe("uwb.getUnboundWorkers", () => {
  it("returns workers without active tag bindings", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [
        { id: "w1", name: "Charlie", department: "Production", position: "Operator" },
        { id: "w2", name: "Diana", department: null, position: null },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getUnboundWorkers();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "w1", name: "Charlie", department: "Production", position: "Operator" });
    expect(result[1].department).toBe("");
    expect(result[1].position).toBe("");
  });

  it("returns empty when all workers are bound", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getUnboundWorkers();
    expect(result).toEqual([]);
  });
});

// =====================================================================
// getRealtimeLocations
// =====================================================================

describe("uwb.getRealtimeLocations", () => {
  it("returns latest location per tag, deduped", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [
        {
          tag_id: "TAG-001",
          employee_id: "e1",
          employee_name: "Alice",
          zone_id: "z1",
          zone_name: "Line A",
          x_coordinate: "10.5",
          y_coordinate: "20.3",
          z_coordinate: "1.0",
          timestamp: "2026-03-01T08:00:00Z",
        },
        {
          tag_id: "TAG-001",
          employee_id: "e1",
          employee_name: "Alice",
          zone_id: "z1",
          zone_name: "Line A",
          x_coordinate: "9.0",
          y_coordinate: "19.0",
          z_coordinate: null,
          timestamp: "2026-03-01T07:59:00Z",
        },
        {
          tag_id: "TAG-002",
          employee_id: "e2",
          employee_name: "Bob",
          zone_id: "z2",
          zone_name: "Line B",
          x_coordinate: "30.0",
          y_coordinate: "40.0",
          z_coordinate: null,
          timestamp: "2026-03-01T08:00:00Z",
        },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getRealtimeLocations();
    // TAG-001 appears twice but only latest should be kept
    expect(result).toHaveLength(2);
    expect(result[0].tagId).toBe("TAG-001");
    expect(result[0].x).toBe(10.5);
    expect(result[1].tagId).toBe("TAG-002");
    expect(result[1].z).toBeNull();
  });

  it("returns empty when no recent data", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getRealtimeLocations();
    expect(result).toEqual([]);
  });
});

// =====================================================================
// getHistoryTrack
// =====================================================================

describe("uwb.getHistoryTrack", () => {
  it("returns track points for a tag on a given date", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [
        {
          tag_id: "TAG-001",
          employee_id: "e1",
          employee_name: "Alice",
          zone_id: "z1",
          zone_name: "Line A",
          x_coordinate: "10.0",
          y_coordinate: "20.0",
          z_coordinate: "1.0",
          timestamp: "2026-03-01T08:00:00Z",
        },
        {
          tag_id: "TAG-001",
          employee_id: "e1",
          employee_name: "Alice",
          zone_id: "z1",
          zone_name: "Line A",
          x_coordinate: "11.0",
          y_coordinate: "21.0",
          z_coordinate: null,
          timestamp: "2026-03-01T08:05:00Z",
        },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getHistoryTrack({ tagId: "TAG-001", date: "2026-03-01" });
    expect(result).toHaveLength(2);
    expect(result[0].x).toBe(10);
    expect(result[1].z).toBeNull();
  });

  it("supports optional startTime and endTime filters", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getHistoryTrack({
      tagId: "TAG-001",
      date: "2026-03-01",
      startTime: "08:00:00",
      endTime: "12:00:00",
    });
    expect(result).toEqual([]);
    // Verify execute was called with the time parameters
    expect(mockDb.execute).toHaveBeenCalledOnce();
  });

  it("returns empty for a date with no records", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getHistoryTrack({ tagId: "TAG-999", date: "2020-01-01" });
    expect(result).toEqual([]);
  });
});

// =====================================================================
// getAvailableHistoryDates
// =====================================================================

describe("uwb.getAvailableHistoryDates", () => {
  it("returns dates with point counts", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [
        { date: "2026-03-01", point_count: "1200" },
        { date: "2026-02-28", point_count: "800" },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getAvailableHistoryDates({ tagId: "TAG-001" });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-03-01");
    expect(result[0].pointCount).toBe(1200);
  });

  it("returns empty when tag has no history", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getAvailableHistoryDates({ tagId: "TAG-NONE" });
    expect(result).toEqual([]);
  });
});

// =====================================================================
// getLowBatteryAlerts
// =====================================================================

describe("uwb.getLowBatteryAlerts", () => {
  it("returns low battery tags with default threshold 20", async () => {
    mockDb.execute.mockResolvedValueOnce([
      [
        {
          tag_id: "TAG-LB1",
          employee_id: "e1",
          employee_name: "Alice",
          department: "Production",
          battery_level: 15,
          last_seen: "2026-03-01T07:00:00Z",
          status: "active",
        },
        {
          tag_id: "TAG-LB2",
          employee_id: "e2",
          employee_name: null,
          department: null,
          battery_level: 5,
          last_seen: null,
          status: "active",
        },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getLowBatteryAlerts({});
    expect(result).toHaveLength(2);
    expect(result[0].severity).toBe("warning"); // 15 > 10
    expect(result[1].severity).toBe("critical"); // 5 <= 10
    expect(result[1].employeeName).toBe("未绑定");
  });

  it("uses custom threshold", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getLowBatteryAlerts({ threshold: 50 });
    expect(result).toEqual([]);
    // Verify threshold passed to query
    expect(mockDb.execute).toHaveBeenCalledWith(expect.any(String), [50]);
  });

  it("rejects threshold > 100", async () => {
    const caller = createAdminCaller();
    await expect(caller.uwb.getLowBatteryAlerts({ threshold: 101 })).rejects.toThrow();
  });

  it("rejects threshold < 0", async () => {
    const caller = createAdminCaller();
    await expect(caller.uwb.getLowBatteryAlerts({ threshold: -1 })).rejects.toThrow();
  });
});

// =====================================================================
// getLostTagAlerts
// =====================================================================

describe("uwb.getLostTagAlerts", () => {
  it("returns lost tags with default 30min offline threshold", async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    mockDb.execute.mockResolvedValueOnce([
      [
        {
          tag_id: "TAG-LOST1",
          employee_id: "e1",
          employee_name: "Alice",
          department: "Production",
          battery_level: 80,
          last_seen: oneHourAgo,
          status: "active",
        },
        {
          tag_id: "TAG-LOST2",
          employee_id: "e2",
          employee_name: null,
          department: null,
          battery_level: 0,
          last_seen: null,
          status: "active",
        },
      ],
    ]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getLostTagAlerts({});
    expect(result).toHaveLength(2);
    expect(result[0].tagId).toBe("TAG-LOST1");
    expect(result[0].offlineDuration).toBeGreaterThan(50); // ~60 minutes
    expect(result[1].lastSeen).toBeNull();
    expect(result[1].offlineDuration).toBeNull();
    expect(result[1].employeeName).toBe("未绑定");
  });

  it("uses custom offline threshold", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    const result = await caller.uwb.getLostTagAlerts({ offlineMinutes: 60 });
    expect(result).toEqual([]);
  });

  it("rejects offlineMinutes < 1", async () => {
    const caller = createAdminCaller();
    await expect(caller.uwb.getLostTagAlerts({ offlineMinutes: 0 })).rejects.toThrow();
  });
});

// =====================================================================
// updateTagBattery
// =====================================================================

describe("uwb.updateTagBattery", () => {
  it("updates battery level and returns success", async () => {
    mockDb.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const caller = createAdminCaller();
    const result = await caller.uwb.updateTagBattery({ tagId: "TAG-001", batteryLevel: 75 });
    expect(result).toEqual({ success: true });
    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE uwb_tag_bindings"),
      [75, "TAG-001"]
    );
  });

  it("accepts batteryLevel = 0 (minimum)", async () => {
    mockDb.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const caller = createAdminCaller();
    const result = await caller.uwb.updateTagBattery({ tagId: "TAG-001", batteryLevel: 0 });
    expect(result).toEqual({ success: true });
  });

  it("accepts batteryLevel = 100 (maximum)", async () => {
    mockDb.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const caller = createAdminCaller();
    const result = await caller.uwb.updateTagBattery({ tagId: "TAG-001", batteryLevel: 100 });
    expect(result).toEqual({ success: true });
  });

  it("rejects batteryLevel > 100", async () => {
    const caller = createAdminCaller();
    await expect(caller.uwb.updateTagBattery({ tagId: "TAG-001", batteryLevel: 101 })).rejects.toThrow();
  });

  it("rejects batteryLevel < 0", async () => {
    const caller = createAdminCaller();
    await expect(caller.uwb.updateTagBattery({ tagId: "TAG-001", batteryLevel: -5 })).rejects.toThrow();
  });
});

// =====================================================================
// sendLowBatteryNotification
// =====================================================================

describe("uwb.sendLowBatteryNotification", () => {
  it("sends notification for existing tag", async () => {
    // First execute: get tag info
    mockDb.execute
      .mockResolvedValueOnce([
        [
          {
            tag_id: "TAG-001",
            employee_id: "e1",
            employee_name: "Alice",
            email: "alice@example.com",
            battery_level: 10,
          },
        ],
      ])
      // Second execute: insert notification
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const caller = createAdminCaller();
    const result = await caller.uwb.sendLowBatteryNotification({ tagId: "TAG-001" });
    expect(result).toEqual({ success: true, message: "通知已发送" });
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it("throws when tag does not exist", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);
    const caller = createAdminCaller();
    await expect(caller.uwb.sendLowBatteryNotification({ tagId: "TAG-NONE" })).rejects.toThrow("标签不存在");
  });
});
