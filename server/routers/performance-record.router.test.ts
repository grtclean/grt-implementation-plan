/**
 * Performance Record Router — Unit Tests
 *
 * Tests all 7 procedures:
 *   list, getById, create, update, freeze, unfreeze, dashboard, seedDemo
 *
 * Covers: happy paths, edge cases, auth guards, optimistic locking,
 * freeze/unfreeze conflict detection, role-based visibility filtering.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "onConflictDoNothing",
    "groupBy",
    "having",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
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

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve()),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// Mock schema — provide column references as string identifiers
vi.mock("../../drizzle/performance-schema", () => ({
  performanceRecords: {
    id: "id",
    buId: "buId",
    departmentId: "departmentId",
    userId: "userId",
    year: "year",
    quarter: "quarter",
    revenueTarget: "revenueTarget",
    revenueActual: "revenueActual",
    profitTarget: "profitTarget",
    profitActual: "profitActual",
    kpiScore: "kpiScore",
    bonusCoefficient: "bonusCoefficient",
    kpiDetailsJson: "kpiDetailsJson",
    isFrozen: "isFrozen",
    frozenAt: "frozenAt",
    frozenBy: "frozenBy",
    frozenReason: "frozenReason",
    version: "version",
    reviewedBy: "reviewedBy",
    reviewedAt: "reviewedAt",
    status: "status",
    notes: "notes",
    createdBy: "createdBy",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => ({ op: "eq", args })),
  and: vi.fn((...args: any[]) => ({ op: "and", args })),
  desc: vi.fn((col: any) => ({ op: "desc", col })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({
    op: "sql",
    strings,
    values,
  })),
  count: vi.fn(() => "count"),
}));

// Mock the permission service — admin role bypasses via requirePermission middleware
vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(false),
  },
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Helpers ─────────────────────────────────────────────
function makePerfRecord(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    buId: 1,
    departmentId: 10,
    userId: 1,
    year: 2026,
    quarter: 1,
    revenueTarget: "5000000",
    revenueActual: "4500000",
    profitTarget: "1000000",
    profitActual: "900000",
    kpiScore: "85.50",
    bonusCoefficient: "1.10",
    kpiDetailsJson: null,
    isFrozen: false,
    frozenAt: null,
    frozenBy: null,
    frozenReason: null,
    version: 1,
    reviewedBy: null,
    reviewedAt: null,
    status: "draft",
    notes: null,
    createdBy: 1,
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-01-15T08:00:00Z",
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════
// tRPC PROCEDURE TESTS
// ════════════════════════════════════════════════════════

describe("performance-record router", () => {
  // ═══ list ═══════════════════════════════════════════
  describe("list", () => {
    it("returns paginated records for manager role", async () => {
      const record = makePerfRecord();
      // First select: rows; second select: count
      selectResultsQueue.push([record]);
      selectResultsQueue.push([{ total: 1 }]);

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.list({});
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("returns empty list when no records", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ total: 0 }]);

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.list({});
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("handles missing total (defaults to 0)", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.list({});
      expect(result.total).toBe(0);
    });

    it("passes through filters for manager roles", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ total: 0 }]);

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.list({
        buId: 2,
        userId: 5,
        year: 2026,
        quarter: 1,
        status: "submitted",
        isFrozen: true,
        limit: 10,
        offset: 5,
      });
      expect(result).toHaveProperty("items");
    });

    it("non-manager role can only see own records (userId forced)", async () => {
      selectResultsQueue.push([makePerfRecord({ userId: 1 })]);
      selectResultsQueue.push([{ total: 1 }]);

      // Default role is "user" — not in PERF_MANAGER_ROLES
      const caller = createAdminCaller({ id: 1, role: "employee" });
      const result = await caller.performanceRecord.list({});
      expect(result.items).toHaveLength(1);
    });

    it("validates quarter range (min 1, max 4)", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.list({ quarter: 0 })
      ).rejects.toThrow();
      await expect(
        caller.performanceRecord.list({ quarter: 5 })
      ).rejects.toThrow();
    });

    it("validates limit range", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.list({ limit: 0 })
      ).rejects.toThrow();
      await expect(
        caller.performanceRecord.list({ limit: 101 })
      ).rejects.toThrow();
    });

    it("validates offset min", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.list({ offset: -1 })
      ).rejects.toThrow();
    });

    it("hr_manager role sees all records", async () => {
      selectResultsQueue.push([makePerfRecord(), makePerfRecord({ id: 2, userId: 99 })]);
      selectResultsQueue.push([{ total: 2 }]);

      const caller = createAdminCaller({ role: "hr_manager" });
      const result = await caller.performanceRecord.list({});
      expect(result.items).toHaveLength(2);
    });

    it("director role sees all records", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ total: 0 }]);

      const caller = createAdminCaller({ role: "director" });
      const result = await caller.performanceRecord.list({});
      expect(result).toHaveProperty("items");
    });
  });

  // ═══ getById ════════════════════════════════════════
  describe("getById", () => {
    it("returns record for owner", async () => {
      mockQueryResult = [makePerfRecord({ userId: 1 })];
      const caller = createAdminCaller({ id: 1, role: "employee" });
      const result = await caller.performanceRecord.getById({ id: 1 });
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("kpiScore", "85.50");
    });

    it("returns record for manager role viewing any user", async () => {
      mockQueryResult = [makePerfRecord({ userId: 999 })];
      const caller = createAdminCaller();
      const result = await caller.performanceRecord.getById({ id: 1 });
      expect(result).toHaveProperty("id", 1);
    });

    it("throws NOT_FOUND when record does not exist", async () => {
      mockQueryResult = [];
      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.getById({ id: 999 })
      ).rejects.toThrow("Performance record not found");
    });

    it("throws FORBIDDEN when non-manager views another user's record", async () => {
      mockQueryResult = [makePerfRecord({ userId: 999 })];
      const caller = createAdminCaller({ id: 1, role: "employee" });
      await expect(
        caller.performanceRecord.getById({ id: 1 })
      ).rejects.toThrow("Cannot view other users' performance records");
    });

    it("hr_specialist can view any record", async () => {
      mockQueryResult = [makePerfRecord({ userId: 777 })];
      const caller = createAdminCaller({ id: 1, role: "hr_specialist" });
      const result = await caller.performanceRecord.getById({ id: 1 });
      expect(result).toHaveProperty("userId", 777);
    });

    it("dept_manager can view any record", async () => {
      mockQueryResult = [makePerfRecord({ userId: 555 })];
      const caller = createAdminCaller({ id: 1, role: "dept_manager" });
      const result = await caller.performanceRecord.getById({ id: 1 });
      expect(result).toHaveProperty("userId", 555);
    });

    it("finance_manager can view any record", async () => {
      mockQueryResult = [makePerfRecord({ userId: 333 })];
      const caller = createAdminCaller({ id: 1, role: "finance_manager" });
      const result = await caller.performanceRecord.getById({ id: 1 });
      expect(result).toHaveProperty("userId", 333);
    });
  });

  // ═══ create ═════════════════════════════════════════
  describe("create", () => {
    it("creates record for self (default userId)", async () => {
      const created = makePerfRecord({ id: 10, status: "draft", version: 1, createdBy: 1 });
      mockReturningResult = [created];

      const caller = createAdminCaller({ id: 1, role: "employee" });
      const result = await caller.performanceRecord.create({
        year: 2026,
        quarter: 1,
        revenueTarget: "5000000",
        kpiScore: "85.50",
      });
      expect(result).toHaveProperty("id", 10);
      expect(result).toHaveProperty("status", "draft");
    });

    it("manager can create record for another user", async () => {
      const created = makePerfRecord({ id: 11, userId: 42, createdBy: 999 });
      mockReturningResult = [created];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.create({
        year: 2026,
        quarter: 2,
        userId: 42,
      });
      expect(result).toHaveProperty("id", 11);
    });

    it("non-manager cannot create record for another user", async () => {
      const caller = createAdminCaller({ id: 1, role: "employee" });
      await expect(
        caller.performanceRecord.create({
          year: 2026,
          quarter: 1,
          userId: 999,
        })
      ).rejects.toThrow("无权为他人创建绩效记录");
    });

    it("non-manager creating for self when userId matches own id is allowed", async () => {
      const created = makePerfRecord({ id: 12, userId: 1 });
      mockReturningResult = [created];

      const caller = createAdminCaller({ id: 1, role: "employee" });
      const result = await caller.performanceRecord.create({
        year: 2026,
        quarter: 3,
        userId: 1,
      });
      expect(result).toHaveProperty("id", 12);
    });

    it("validates quarter range in create input", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.create({ year: 2026, quarter: 0 })
      ).rejects.toThrow();
      await expect(
        caller.performanceRecord.create({ year: 2026, quarter: 5 })
      ).rejects.toThrow();
    });

    it("accepts kpiDetailsJson array", async () => {
      const created = makePerfRecord({
        id: 13,
        kpiDetailsJson: [
          { kpiName: "Revenue", weight: 40, target: 100, actual: 90, score: 90 },
        ],
      });
      mockReturningResult = [created];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.create({
        year: 2026,
        quarter: 1,
        kpiDetailsJson: [
          { kpiName: "Revenue", weight: 40, target: 100, actual: 90, score: 90 },
        ],
      });
      expect(result.kpiDetailsJson).toHaveLength(1);
    });

    it("hr_manager can create for another user", async () => {
      mockReturningResult = [makePerfRecord({ id: 14, userId: 55, createdBy: 1 })];
      const caller = createAdminCaller({ id: 1, role: "hr_manager" });
      const result = await caller.performanceRecord.create({
        year: 2026,
        quarter: 4,
        userId: 55,
      });
      expect(result).toHaveProperty("id", 14);
    });
  });

  // ═══ update ═════════════════════════════════════════
  describe("update", () => {
    it("updates record with matching version (optimistic lock)", async () => {
      // First select: get current record (not frozen)
      mockQueryResult = [makePerfRecord({ id: 1, version: 1, isFrozen: false })];
      // Returning from update
      mockReturningResult = [makePerfRecord({ id: 1, version: 2, kpiScore: "90.00" })];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.update({
        id: 1,
        version: 1,
        kpiScore: "90.00",
      });
      expect(result).toHaveProperty("version", 2);
      expect(result).toHaveProperty("kpiScore", "90.00");
    });

    it("throws NOT_FOUND when record does not exist", async () => {
      mockQueryResult = [];
      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.update({ id: 999, version: 1 })
      ).rejects.toThrow("Record not found");
    });

    it("throws PRECONDITION_FAILED when record is frozen", async () => {
      mockQueryResult = [makePerfRecord({ id: 1, isFrozen: true })];
      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.update({ id: 1, version: 1, kpiScore: "90.00" })
      ).rejects.toThrow("记录已冻结，无法修改。请先解冻。");
    });

    it("throws CONFLICT when version mismatch (concurrent edit)", async () => {
      // Current record is not frozen
      mockQueryResult = [makePerfRecord({ id: 1, version: 2, isFrozen: false })];
      // But update returns nothing because version in WHERE doesn't match
      mockReturningResult = [];

      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.update({ id: 1, version: 1, kpiScore: "90.00" })
      ).rejects.toThrow("并发冲突：记录已被其他用户修改。请刷新后重试。");
    });

    it("updates multiple fields at once", async () => {
      mockQueryResult = [makePerfRecord({ id: 1, version: 3, isFrozen: false })];
      const updated = makePerfRecord({
        id: 1,
        version: 4,
        revenueActual: "6000000",
        profitActual: "1200000",
        status: "submitted",
        notes: "Q1 final",
      });
      mockReturningResult = [updated];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.update({
        id: 1,
        version: 3,
        revenueActual: "6000000",
        profitActual: "1200000",
        status: "submitted",
        notes: "Q1 final",
      });
      expect(result).toHaveProperty("version", 4);
      expect(result).toHaveProperty("status", "submitted");
    });

    it("updates kpiDetailsJson", async () => {
      mockQueryResult = [makePerfRecord({ id: 1, version: 1, isFrozen: false })];
      const kpiDetails = [
        { kpiName: "Revenue", weight: 50, target: 100, actual: 95, score: 95 },
        { kpiName: "Quality", weight: 50, target: 100, actual: 88, score: 88 },
      ];
      mockReturningResult = [makePerfRecord({ id: 1, version: 2, kpiDetailsJson: kpiDetails })];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.update({
        id: 1,
        version: 1,
        kpiDetailsJson: kpiDetails,
      });
      expect(result.kpiDetailsJson).toHaveLength(2);
    });
  });

  // ═══ freeze ═════════════════════════════════════════
  describe("freeze", () => {
    it("freezes an unfrozen record (admin bypasses permission check)", async () => {
      const frozen = makePerfRecord({
        id: 1,
        isFrozen: true,
        frozenAt: "2026-01-20T10:00:00Z",
        frozenBy: "Admin User",
        frozenReason: "Investigation required",
      });
      mockReturningResult = [frozen];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.freeze({
        id: 1,
        reason: "Investigation required",
      });
      expect(result).toHaveProperty("isFrozen", true);
      expect(result).toHaveProperty("frozenReason", "Investigation required");
    });

    it("throws CONFLICT when record does not exist or already frozen", async () => {
      mockReturningResult = [];

      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.freeze({ id: 999, reason: "test" })
      ).rejects.toThrow("记录不存在或已冻结");
    });

    it("non-admin without permission is rejected", async () => {
      // permissionService.checkPermission returns false by default
      const caller = createAdminCaller({ role: "employee" });
      await expect(
        caller.performanceRecord.freeze({ id: 1, reason: "test" })
      ).rejects.toThrow("Missing permission");
    });

    it("requires reason string", async () => {
      const caller = createAdminCaller();
      // Zod will reject missing required field
      await expect(
        (caller.performanceRecord as any).freeze({ id: 1 })
      ).rejects.toThrow();
    });
  });

  // ═══ unfreeze ═══════════════════════════════════════
  describe("unfreeze", () => {
    it("unfreezes a frozen record (admin)", async () => {
      const unfrozen = makePerfRecord({
        id: 1,
        isFrozen: false,
        frozenReason: "解冻(Admin User): Issue resolved",
      });
      mockReturningResult = [unfrozen];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.unfreeze({
        id: 1,
        reason: "Issue resolved",
      });
      expect(result).toHaveProperty("isFrozen", false);
    });

    it("throws CONFLICT when record does not exist or not frozen", async () => {
      mockReturningResult = [];

      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.unfreeze({ id: 999 })
      ).rejects.toThrow("记录不存在或未冻结");
    });

    it("non-admin without permission is rejected", async () => {
      const caller = createAdminCaller({ role: "employee" });
      await expect(
        caller.performanceRecord.unfreeze({ id: 1 })
      ).rejects.toThrow("Missing permission");
    });

    it("reason is optional", async () => {
      const unfrozen = makePerfRecord({ id: 1, isFrozen: false, frozenReason: null });
      mockReturningResult = [unfrozen];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.unfreeze({ id: 1 });
      expect(result).toHaveProperty("isFrozen", false);
    });
  });

  // ═══ dashboard ══════════════════════════════════════
  describe("dashboard", () => {
    it("returns aggregated dashboard data for given year/quarter", async () => {
      const rows = [
        makePerfRecord({ id: 1, buId: 1, kpiScore: "80.00", bonusCoefficient: "1.00", isFrozen: false }),
        makePerfRecord({ id: 2, buId: 1, kpiScore: "90.00", bonusCoefficient: "1.20", isFrozen: true }),
        makePerfRecord({ id: 3, buId: 2, kpiScore: "70.00", bonusCoefficient: "0.90", isFrozen: false }),
      ];
      mockQueryResult = rows;

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.dashboard({
        year: 2026,
        quarter: 1,
      });

      expect(result.year).toBe(2026);
      expect(result.quarter).toBe(1);
      expect(result.totalRecords).toBe(3);
      expect(result.frozenCount).toBe(1);
      expect(result.avgKpi).toBe(80); // (80+90+70)/3 = 80
      expect(result.avgBonus).toBe(1.03); // (1.00+1.20+0.90)/3 = 1.0333 -> rounded to 1.03
      expect(result.buBreakdown).toHaveLength(2);
    });

    it("returns defaults when no records exist", async () => {
      mockQueryResult = [];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.dashboard({
        year: 2025,
        quarter: 4,
      });

      expect(result.totalRecords).toBe(0);
      expect(result.frozenCount).toBe(0);
      expect(result.avgKpi).toBe(0);
      expect(result.avgBonus).toBe(1);
      expect(result.buBreakdown).toHaveLength(0);
    });

    it("uses current year/quarter when not specified", async () => {
      mockQueryResult = [];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.dashboard({});

      const now = new Date();
      const expectedYear = now.getFullYear();
      const expectedQuarter = Math.ceil((now.getMonth() + 1) / 3);
      expect(result.year).toBe(expectedYear);
      expect(result.quarter).toBe(expectedQuarter);
    });

    it("groups by BU with correct avgKpi per BU", async () => {
      const rows = [
        makePerfRecord({ id: 1, buId: 3, kpiScore: "60.00", isFrozen: false }),
        makePerfRecord({ id: 2, buId: 3, kpiScore: "80.00", isFrozen: true }),
      ];
      mockQueryResult = rows;

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.dashboard({
        year: 2026,
        quarter: 2,
      });

      expect(result.buBreakdown).toHaveLength(1);
      expect(result.buBreakdown[0].buId).toBe(3);
      expect(result.buBreakdown[0].count).toBe(2);
      expect(result.buBreakdown[0].avgKpi).toBe(70); // (60+80)/2
      expect(result.buBreakdown[0].frozenCount).toBe(1);
    });

    it("handles records with null buId (grouped as buId=0)", async () => {
      const rows = [
        makePerfRecord({ id: 1, buId: null, kpiScore: "75.00", isFrozen: false }),
      ];
      mockQueryResult = rows;

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.dashboard({
        year: 2026,
        quarter: 1,
      });

      expect(result.buBreakdown).toHaveLength(1);
      expect(result.buBreakdown[0].buId).toBe(0);
    });

    it("handles records with null/invalid kpiScore (treated as 0)", async () => {
      const rows = [
        makePerfRecord({ id: 1, buId: 1, kpiScore: null, bonusCoefficient: null, isFrozen: false }),
      ];
      mockQueryResult = rows;

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.dashboard({
        year: 2026,
        quarter: 1,
      });

      expect(result.avgKpi).toBe(0);
      // When bonusCoefficient is null, Number(null) = 0 but the code uses || 1 fallback
      expect(result.avgBonus).toBe(1);
    });

    it("returns fallback on database error (catch block)", async () => {
      // Make the select chain throw an error
      const originalThen = mockDb.select().then;
      const chain = mockDb.select();
      chain.then = (_resolve: any, reject?: any) => {
        if (reject) return reject(new Error("DB unavailable"));
        throw new Error("DB unavailable");
      };

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.dashboard({
        year: 2026,
        quarter: 1,
      });

      // Restore original then
      chain.then = originalThen;

      expect(result.totalRecords).toBe(0);
      expect(result.avgKpi).toBe(0);
      expect(result.avgBonus).toBe(1);
      expect(result.buBreakdown).toEqual([]);
    });

    it("validates quarter range", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.dashboard({ quarter: 0 })
      ).rejects.toThrow();
      await expect(
        caller.performanceRecord.dashboard({ quarter: 5 })
      ).rejects.toThrow();
    });
  });

  // ═══ seedDemo ═══════════════════════════════════════
  describe("seedDemo", () => {
    it("seeds 5 demo records (one per BU)", async () => {
      // db.execute for CREATE TABLE IF NOT EXISTS
      mockDb.execute.mockResolvedValueOnce(undefined);

      // Each insert().values().returning() returns a record
      // The seedDemo loops 5 times; each returns a record
      const ids = [100, 101, 102, 103, 104];
      for (const id of ids) {
        mockReturningResult = [makePerfRecord({ id })];
      }
      // Since mockReturningResult is set once, all 5 inserts will return the last value.
      // That's fine since the router only reads row.id from the result.
      mockReturningResult = [makePerfRecord({ id: 100 })];

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.seedDemo();
      expect(result).toHaveProperty("seeded", 5);
      expect(result).toHaveProperty("results");
      expect(result.results).toHaveLength(5);
    });

    it("handles insert errors gracefully", async () => {
      mockDb.execute.mockResolvedValueOnce(undefined);

      // Make returning reject to simulate insert error
      const chain = mockDb.insert();
      const originalReturning = chain.returning;
      chain.returning = vi.fn(() => Promise.reject(new Error("duplicate key")));

      const caller = createAdminCaller();
      const result = await caller.performanceRecord.seedDemo();
      expect(result).toHaveProperty("seeded", 5);
      // Each result should have status "error"
      for (const r of result.results) {
        expect(r.status).toBe("error");
        expect(r.id).toBe(0);
      }

      // Restore
      chain.returning = originalReturning;
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.performanceRecord.list({})).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.performanceRecord.getById({ id: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.performanceRecord.create({ year: 2026, quarter: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.performanceRecord.update({ id: 1, version: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for freeze", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.performanceRecord.freeze({ id: 1, reason: "test" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for unfreeze", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.performanceRecord.unfreeze({ id: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for dashboard", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.performanceRecord.dashboard({})
      ).rejects.toThrow();
    });

    it("rejects anonymous for seedDemo", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.performanceRecord.seedDemo()
      ).rejects.toThrow();
    });
  });

  // ═══ Input Validation Edge Cases ═══════════════════
  describe("input validation", () => {
    it("create rejects invalid quarter values", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.performanceRecord.create({ year: 2026, quarter: -1 })
      ).rejects.toThrow();
    });

    it("update requires id and version", async () => {
      const caller = createAdminCaller();
      await expect(
        (caller.performanceRecord as any).update({ version: 1 })
      ).rejects.toThrow();
      await expect(
        (caller.performanceRecord as any).update({ id: 1 })
      ).rejects.toThrow();
    });

    it("freeze requires id and reason", async () => {
      const caller = createAdminCaller();
      await expect(
        (caller.performanceRecord as any).freeze({ id: 1 })
      ).rejects.toThrow();
    });

    it("getById requires numeric id", async () => {
      const caller = createAdminCaller();
      await expect(
        (caller.performanceRecord as any).getById({ id: "abc" })
      ).rejects.toThrow();
    });
  });
});
