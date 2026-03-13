/**
 * Attendance Clock Router — Unit Tests
 *
 * Covers 5 sub-routers (28 tests):
 *   clock      (7) — clockIn, clockOut, getToday, getMonthly
 *   groups     (5) — list, assignGroup, updateBreakWindows
 *   excursions (5) — reportOut, reportReturn, getDaily, getMonthly
 *   rollup     (4) — rollupMonth, sendConfirmationEmail
 *   report     (2) — preview
 *   service    (5) — isWithinGeofence, isWithinBreakWindow (pure function tests)
 *
 * Run: pnpm test -- server/routers/attendance-clock.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function createMockDbChain() {
  const chain: any = {};
  for (const m of [
    "from", "where", "and", "orderBy", "groupBy", "limit", "offset", "values", "set",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };
  return chain;
}

const mockDb: any = {
  select: vi.fn(() => createMockDbChain()),
  insert: vi.fn(() => createMockDbChain()),
  update: vi.fn(() => createMockDbChain()),
  delete: vi.fn(() => createMockDbChain()),
  execute: vi.fn(() => Promise.resolve({ rows: [] })),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock tRPC ───────────────────────────────────────────
vi.mock("../_core/trpc", () => {
  const passthrough: any = {
    input: vi.fn().mockReturnThis(),
    query: vi.fn((fn: any) => fn),
    mutation: vi.fn((fn: any) => fn),
    use: vi.fn().mockReturnThis(),
  };
  return {
    router: vi.fn((routes: any) => routes),
    protectedProcedure: passthrough,
    requirePermission: vi.fn(() => passthrough),
  };
});

// ── Mock schemas ────────────────────────────────────────
vi.mock("../../drizzle/attendance-clock-schema", () => ({
  attendanceClockRecords: {
    id: "id", employeeId: "employee_id", clockDate: "clock_date",
    clockInTime: "clock_in_time", clockOutTime: "clock_out_time",
    clockInLat: "clock_in_lat", clockInLng: "clock_in_lng",
    clockOutLat: "clock_out_lat", clockOutLng: "clock_out_lng",
    clockInDistanceMeters: "clock_in_distance_meters",
    clockOutDistanceMeters: "clock_out_distance_meters",
    clockInMethod: "clock_in_method", clockOutMethod: "clock_out_method",
    clockInPhoto: "clock_in_photo",
    isOffsite: "is_offsite", offsiteCustomerName: "offsite_customer_name",
    status: "status", lateMinutes: "late_minutes", workHours: "work_hours",
  },
  attendanceGroups: {
    id: "id", groupName: "group_name", workDaysPerWeek: "work_days_per_week",
    dailyHours: "daily_hours", shiftStart: "shift_start", shiftEnd: "shift_end",
    officeLat: "office_lat", officeLng: "office_lng", geofenceRadius: "geofence_radius",
    breakWindows: "break_windows",
  },
  attendanceGroupMembers: {
    id: "id", groupId: "group_id", employeeId: "employee_id",
  },
  attendanceExcursions: {
    id: "id", employeeId: "employee_id", excursionDate: "excursion_date",
    timestampOut: "timestamp_out", timestampIn: "timestamp_in",
    gpsLatOut: "gps_lat_out", gpsLngOut: "gps_lng_out",
    gpsLatIn: "gps_lat_in", gpsLngIn: "gps_lng_in",
    distanceMetersOut: "distance_meters_out",
    isDuringBreak: "is_during_break", breakLabel: "break_label",
    durationMinutes: "duration_minutes",
  },
}));

// ── Mock attendance clock service ────────────────────────
const mockClockInResult = {
  success: true, clockDate: "2026-03-13", distanceMeters: 45.2,
  isOffsite: false, lateMinutes: 0, status: "normal",
};
const mockClockOutResult = {
  success: true, clockDate: "2026-03-13", workHours: 8.5, distanceMeters: 32.1,
};
const mockRollupResult = { period: "2026-03", rolledUp: 15 };
const mockExcursionOutResult = {
  success: true, id: 1, excursionDate: "2026-03-13",
  distanceMeters: 250, isDuringBreak: false, breakLabel: null,
  warning: "非休息时段离岗，已记录",
};
const mockExcursionReturnResult = {
  success: true, excursionId: 1, durationMinutes: 15,
  isDuringBreak: false, breakLabel: null,
};

vi.mock("../services/attendance-clock.service", () => ({
  clockIn: vi.fn(async () => mockClockInResult),
  clockOut: vi.fn(async () => mockClockOutResult),
  rollupMonth: vi.fn(async () => mockRollupResult),
  recordExcursionOut: vi.fn(async () => mockExcursionOutResult),
  recordExcursionReturn: vi.fn(async () => mockExcursionReturnResult),
}));

// ── Mock confirmation email service ─────────────────────
const mockEmailResult = {
  success: true, messageId: "test-123", provider: "internal",
  rowCount: 50, anomalyCount: 3,
};
const mockReportRows = [
  { employeeId: 1, employeeName: "吴卫成", department: "研发部", scheduledDays: 22, actualDays: 21, personalLeaveHours: 8, sickLeaveHours: 0, lateCount: 1, absentDays: 0, overtimeHours: 5, unauthorizedExcursions: 0, anomalies: [] },
  { employeeId: 2, employeeName: "戴晓燕", department: "生产部", scheduledDays: 22, actualDays: 20, personalLeaveHours: 0, sickLeaveHours: 4, lateCount: 3, absentDays: 0, overtimeHours: 0, unauthorizedExcursions: 2, anomalies: ["非休息离岗2次"] },
];

vi.mock("../services/attendance-confirmation-email.service", () => ({
  sendAttendanceConfirmationEmail: vi.fn(async () => mockEmailResult),
  buildAttendanceReport: vi.fn(async () => mockReportRows),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  isNull: vi.fn((col: any) => col),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({ strings, values })),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

// ── Import router after mocks ───────────────────────────
import { attendanceClockRouter } from "./attendance-clock.router";
import { clockIn, clockOut, rollupMonth, recordExcursionOut, recordExcursionReturn } from "../services/attendance-clock.service";
import { sendAttendanceConfirmationEmail, buildAttendanceReport } from "../services/attendance-confirmation-email.service";

function makeCtx(role = "admin") {
  return { ctx: { user: { id: 1, role } } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue.length = 0;
});

// ======================================================================
// ── clock.clockIn ────────────────────────────────────────────────────
// ======================================================================
describe("clock.clockIn", () => {
  it("calls clockIn service with GPS coordinates", async () => {
    const result = await attendanceClockRouter.clock.clockIn({
      input: { lat: 31.4913, lng: 120.3119 },
      ...makeCtx(),
    });
    expect(clockIn).toHaveBeenCalledWith({
      employeeId: 1, lat: 31.4913, lng: 120.3119,
      method: undefined, photo: undefined, customerName: undefined,
    });
    expect(result.success).toBe(true);
    expect(result.status).toBe("normal");
  });

  it("passes optional method and photo", async () => {
    await attendanceClockRouter.clock.clockIn({
      input: { lat: 31.5, lng: 120.3, method: "wifi", photo: "https://example.com/photo.jpg" },
      ...makeCtx(),
    });
    expect(clockIn).toHaveBeenCalledWith(expect.objectContaining({
      method: "wifi", photo: "https://example.com/photo.jpg",
    }));
  });

  it("passes customerName for offsite clock-in", async () => {
    await attendanceClockRouter.clock.clockIn({
      input: { lat: 30.0, lng: 121.0, customerName: "上海客户A" },
      ...makeCtx(),
    });
    expect(clockIn).toHaveBeenCalledWith(expect.objectContaining({ customerName: "上海客户A" }));
  });
});

// ======================================================================
// ── clock.clockOut ───────────────────────────────────────────────────
// ======================================================================
describe("clock.clockOut", () => {
  it("calls clockOut service", async () => {
    const result = await attendanceClockRouter.clock.clockOut({
      input: { lat: 31.4913, lng: 120.3119 },
      ...makeCtx(),
    });
    expect(clockOut).toHaveBeenCalledWith(1, 31.4913, 120.3119);
    expect(result.success).toBe(true);
    expect(result.workHours).toBe(8.5);
  });
});

// ======================================================================
// ── clock.getToday ───────────────────────────────────────────────────
// ======================================================================
describe("clock.getToday", () => {
  it("returns today's clock record", async () => {
    selectResultsQueue.push([{ id: 1, employeeId: 1, clockDate: "2026-03-13", status: "normal" }]);
    const result = await attendanceClockRouter.clock.getToday({ input: undefined, ...makeCtx() });
    expect(result).toBeDefined();
    expect(result!.status).toBe("normal");
  });

  it("returns null when no record exists", async () => {
    selectResultsQueue.push([]);
    const result = await attendanceClockRouter.clock.getToday({ input: undefined, ...makeCtx() });
    expect(result).toBeNull();
  });
});

// ======================================================================
// ── clock.getMonthly ─────────────────────────────────────────────────
// ======================================================================
describe("clock.getMonthly", () => {
  it("returns monthly records", async () => {
    selectResultsQueue.push([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const result = await attendanceClockRouter.clock.getMonthly({
      input: { employeeId: 1, period: "2026-03" }, ...makeCtx(),
    });
    expect(result).toHaveLength(3);
  });
});

// ======================================================================
// ── groups ───────────────────────────────────────────────────────────
// ======================================================================
describe("groups.list", () => {
  it("returns all attendance groups", async () => {
    selectResultsQueue.push([{ id: 1, groupName: "6天工人组" }, { id: 2, groupName: "办公室组" }]);
    const result = await attendanceClockRouter.groups.list({ ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("groups.assignGroup", () => {
  it("assigns employee to group", async () => {
    mockReturningResult = [{ id: 1, groupId: 2, employeeId: 10 }];
    const result = await attendanceClockRouter.groups.assignGroup({
      input: { employeeId: 10, groupId: 2 }, ...makeCtx(),
    });
    expect(result.groupId).toBe(2);
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

describe("groups.updateBreakWindows", () => {
  it("updates break windows for a group", async () => {
    const result = await attendanceClockRouter.groups.updateBreakWindows({
      input: {
        groupId: 1,
        breakWindows: [
          { label: "午休", start: "11:30", end: "13:00" },
          { label: "晚餐", start: "17:30", end: "18:30" },
        ],
      },
      ...makeCtx(),
    });
    expect(result.success).toBe(true);
    expect(result.breakWindows).toHaveLength(2);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("allows empty break windows", async () => {
    const result = await attendanceClockRouter.groups.updateBreakWindows({
      input: { groupId: 1, breakWindows: [] },
      ...makeCtx(),
    });
    expect(result.success).toBe(true);
    expect(result.breakWindows).toHaveLength(0);
  });
});

// ======================================================================
// ── excursions ───────────────────────────────────────────────────────
// ======================================================================
describe("excursions.reportOut", () => {
  it("records leaving the geofence", async () => {
    const result = await attendanceClockRouter.excursions.reportOut({
      input: { lat: 31.50, lng: 120.32 },
      ...makeCtx(),
    });
    expect(recordExcursionOut).toHaveBeenCalledWith(1, 31.50, 120.32);
    expect(result.success).toBe(true);
    expect(result.warning).toBe("非休息时段离岗，已记录");
  });
});

describe("excursions.reportReturn", () => {
  it("records returning to the geofence", async () => {
    const result = await attendanceClockRouter.excursions.reportReturn({
      input: { lat: 31.4913, lng: 120.3119 },
      ...makeCtx(),
    });
    expect(recordExcursionReturn).toHaveBeenCalledWith(1, 31.4913, 120.3119);
    expect(result.success).toBe(true);
    expect(result.durationMinutes).toBe(15);
  });
});

describe("excursions.getDaily", () => {
  it("returns daily excursion records", async () => {
    selectResultsQueue.push([
      { id: 1, isDuringBreak: true, durationMinutes: 45 },
      { id: 2, isDuringBreak: false, durationMinutes: 10 },
    ]);
    const result = await attendanceClockRouter.excursions.getDaily({
      input: { employeeId: 1, date: "2026-03-13" },
      ...makeCtx(),
    });
    expect(result).toHaveLength(2);
  });
});

describe("excursions.getMonthly", () => {
  it("returns monthly excursion summary", async () => {
    selectResultsQueue.push([
      { id: 1, isDuringBreak: true, durationMinutes: 45 },
      { id: 2, isDuringBreak: false, durationMinutes: 10 },
      { id: 3, isDuringBreak: false, durationMinutes: 20 },
    ]);
    const result = await attendanceClockRouter.excursions.getMonthly({
      input: { employeeId: 1, period: "2026-03" },
      ...makeCtx(),
    });
    expect(result.records).toHaveLength(3);
    expect(result.summary.totalExcursions).toBe(3);
    expect(result.summary.unauthorizedCount).toBe(2);
    expect(result.summary.authorizedCount).toBe(1);
    expect(result.summary.totalUnauthorizedMinutes).toBe(30);
  });
});

// ======================================================================
// ── rollup ───────────────────────────────────────────────────────────
// ======================================================================
describe("rollup.rollupMonth", () => {
  it("triggers monthly rollup", async () => {
    const result = await attendanceClockRouter.rollup.rollupMonth({
      input: { period: "2026-03" }, ...makeCtx(),
    });
    expect(rollupMonth).toHaveBeenCalledWith("2026-03");
    expect(result.rolledUp).toBe(15);
  });

  it("handles empty period", async () => {
    (rollupMonth as any).mockResolvedValueOnce({ period: "2026-01", rolledUp: 0 });
    const result = await attendanceClockRouter.rollup.rollupMonth({
      input: { period: "2026-01" }, ...makeCtx(),
    });
    expect(result.rolledUp).toBe(0);
  });
});

describe("rollup.sendConfirmationEmail", () => {
  it("sends attendance confirmation email to default recipients", async () => {
    const result = await attendanceClockRouter.rollup.sendConfirmationEmail({
      input: { period: "2026-03" }, ...makeCtx(),
    });
    expect(sendAttendanceConfirmationEmail).toHaveBeenCalledWith("2026-03", undefined, undefined);
    expect(result.success).toBe(true);
    expect(result.rowCount).toBe(50);
    expect(result.anomalyCount).toBe(3);
  });

  it("accepts custom email recipients", async () => {
    await attendanceClockRouter.rollup.sendConfirmationEmail({
      input: { period: "2026-03", reviewerEmail: "custom@test.com", ccEmail: "ceo@test.com" },
      ...makeCtx(),
    });
    expect(sendAttendanceConfirmationEmail).toHaveBeenCalledWith("2026-03", "custom@test.com", "ceo@test.com");
  });
});

// ======================================================================
// ── report ───────────────────────────────────────────────────────────
// ======================================================================
describe("report.preview", () => {
  it("returns attendance report data without sending email", async () => {
    const result = await attendanceClockRouter.report.preview({
      input: { period: "2026-03" }, ...makeCtx(),
    });
    expect(buildAttendanceReport).toHaveBeenCalledWith("2026-03");
    expect(result.period).toBe("2026-03");
    expect(result.rows).toHaveLength(2);
    expect(result.summary.headcount).toBe(2);
    expect(result.summary.totalExcursions).toBe(2);
  });

  it("includes anomaly count in summary", async () => {
    const result = await attendanceClockRouter.report.preview({
      input: { period: "2026-03" }, ...makeCtx(),
    });
    expect(result.summary.anomalyCount).toBe(1); // only 戴晓燕 has anomalies
  });
});

// ======================================================================
// ── pure function tests (isWithinGeofence, isWithinBreakWindow) ──────
// ======================================================================
describe("isWithinGeofence (direct import)", () => {
  it("returns withinFence=true for GRT office coordinates", async () => {
    const { isWithinGeofence } = await vi.importActual<any>("../services/attendance-clock.service");
    const result = isWithinGeofence(31.4913, 120.3119);
    expect(result.withinFence).toBe(true);
    expect(result.distanceMeters).toBeLessThan(1);
  });

  it("returns withinFence=false for distant location", async () => {
    const { isWithinGeofence } = await vi.importActual<any>("../services/attendance-clock.service");
    const result = isWithinGeofence(31.50, 120.32);
    expect(result.withinFence).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(100);
  });
});

describe("isWithinBreakWindow (direct import)", () => {
  it("returns inBreak=true during lunch window", async () => {
    const { isWithinBreakWindow } = await vi.importActual<any>("../services/attendance-clock.service");
    const result = isWithinBreakWindow("12:15", [{ label: "午休", start: "11:30", end: "13:00" }]);
    expect(result.inBreak).toBe(true);
    expect(result.windowLabel).toBe("午休");
  });

  it("returns inBreak=false outside any break window", async () => {
    const { isWithinBreakWindow } = await vi.importActual<any>("../services/attendance-clock.service");
    const result = isWithinBreakWindow("10:30", [{ label: "午休", start: "11:30", end: "13:00" }]);
    expect(result.inBreak).toBe(false);
    expect(result.windowLabel).toBeNull();
  });

  it("matches correct window when multiple configured", async () => {
    const { isWithinBreakWindow } = await vi.importActual<any>("../services/attendance-clock.service");
    const windows = [
      { label: "午休", start: "11:30", end: "13:00" },
      { label: "晚餐", start: "17:30", end: "18:30" },
    ];
    const result = isWithinBreakWindow("18:00", windows);
    expect(result.inBreak).toBe(true);
    expect(result.windowLabel).toBe("晚餐");
  });
});
