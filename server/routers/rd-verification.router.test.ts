/**
 * R&D Verification Router — Comprehensive Unit Tests
 *
 * Covers all 4 procedures:
 *   getProjects   — returns items array or []
 *   getChecklists — returns items object or {}
 *   getReviews    — returns items array or []
 *   getSignals    — returns items array or []
 *
 * The router uses a module-level `_rdVerReady` flag + `ensureRdVerData()` bootstrap
 * that fires CREATE TABLE + SELECT COUNT + optional INSERT on first call only.
 *
 * Run: npx vitest run server/routers/rd-verification.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock DB — raw sql execute pattern
// ---------------------------------------------------------------------------

const mockExecuteFn = vi.fn();

function createMockDb() {
  const db: any = {
    execute: mockExecuteFn,
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Execute queue — FIFO results for db.execute()
// ---------------------------------------------------------------------------

/**
 * The `_rdVerReady` flag is module-level and persists across all tests.
 * The FIRST test to hit any procedure triggers bootstrap:
 *   1. CREATE TABLE   → result consumed (ignored)
 *   2. SELECT COUNT   → must return { rows: [{ cnt: N }] }
 *      - if cnt=0, INSERT seed data follows (result consumed)
 *   3. Actual query   → the procedure's SELECT statement
 *
 * ALL subsequent tests skip bootstrap and only issue the actual query.
 *
 * Strategy:
 *   - We maintain a FIFO executeQueue.
 *   - When queue is empty, return a safe default { rows: [{ cnt: 99 }] }.
 *   - For the first test, push bootstrap results + actual query result.
 *   - For subsequent tests, push only the actual query result.
 */

const executeQueue: any[] = [];
const DEFAULT_EXECUTE_RESULT = { rows: [{ cnt: 99 }] };

function setupExecuteMock() {
  mockExecuteFn.mockReset();
  executeQueue.length = 0;
  mockExecuteFn.mockImplementation(() => {
    if (executeQueue.length > 0) {
      return Promise.resolve(executeQueue.shift()!);
    }
    return Promise.resolve(DEFAULT_EXECUTE_RESULT);
  });
}

function queueExecute(...results: any[]) {
  executeQueue.push(...results);
}

// ---------------------------------------------------------------------------
// Import test utils AFTER mock setup
// ---------------------------------------------------------------------------
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleProjects = [
  {
    id: 1,
    name: "汽车动力总成超声波清洗线",
    code: "GRT-2026-001",
    currentStage: "M4",
    completedStages: ["M0", "M1", "M2", "M3"],
    customer: "上汽集团",
    risk: "low",
  },
  {
    id: 2,
    name: "半导体晶圆精密清洗设备",
    code: "GRT-2026-002",
    currentStage: "M7",
    completedStages: ["M0", "M1", "M2", "M3", "M4", "M5", "M6"],
    customer: "台积电",
    risk: "medium",
  },
];

const sampleChecklists = {
  M3: [
    { id: 1, checkItem: "商业价值评估完成", status: "pass", isMandatory: true },
    { id: 2, checkItem: "项目范围定义确认", status: "pass", isMandatory: true },
  ],
  M4: [
    { id: 6, checkItem: "机械方案评审通过", status: "pass", isMandatory: true },
    { id: 7, checkItem: "电气方案评审通过", status: "pass", isMandatory: true },
  ],
};

const sampleReviews = [
  {
    id: 1,
    projectName: "汽车动力总成超声波清洗线",
    projectCode: "GRT-2026-001",
    gatePhase: "M3",
    gateName: "立项评审",
    status: "approved",
    reviewer: "张总",
  },
  {
    id: 2,
    projectName: "半导体晶圆精密清洗设备",
    projectCode: "GRT-2026-002",
    gatePhase: "M5",
    gateName: "详细设计评审",
    status: "conditional",
    reviewer: "李工",
  },
];

const sampleSignals = [
  {
    id: 1,
    upstreamGate: "M6",
    triggerEvent: "上汽JIS订单到达",
    targetAasId: "AAS-GRT501-CL01",
    status: "triggered",
    actionPayload: { action: "start_production", line: "A3" },
  },
  {
    id: 2,
    upstreamGate: "M7",
    triggerEvent: "装配完成信号",
    targetAasId: "AAS-GRT501-TST01",
    status: "pending",
    actionPayload: { action: "start_test", protocol: "FAT" },
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("rdVerification router", () => {
  beforeEach(() => {
    setupExecuteMock();
  });

  // =========================================================================
  // Auth guards — anonymous callers must be rejected
  // =========================================================================
  describe("auth guards", () => {
    it("rejects anonymous caller on getProjects", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.rdVerification.getProjects()).rejects.toThrow();
    });

    it("rejects anonymous caller on getChecklists", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.rdVerification.getChecklists()).rejects.toThrow();
    });

    it("rejects anonymous caller on getReviews", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.rdVerification.getReviews()).rejects.toThrow();
    });

    it("rejects anonymous caller on getSignals", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.rdVerification.getSignals()).rejects.toThrow();
    });
  });

  // =========================================================================
  // getProjects
  // =========================================================================
  describe("getProjects", () => {
    it("returns project items from the database (triggers bootstrap on first call)", async () => {
      const caller = createAdminCaller();
      // First procedure call in the suite triggers bootstrap:
      //   1. CREATE TABLE (result ignored)
      //   2. SELECT COUNT → cnt > 0 means skip seed INSERT
      //   3. Actual SELECT items query
      queueExecute(
        { rows: [] },                         // CREATE TABLE
        { rows: [{ cnt: 5 }] },               // SELECT COUNT → non-zero, skip seed
        { rows: [{ items: sampleProjects }] }, // actual query result
      );

      const result = await caller.rdVerification.getProjects();
      expect(result).toEqual(sampleProjects);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("汽车动力总成超声波清洗线");
      expect(result[1].risk).toBe("medium");
    });

    it("returns empty array when no rows match", async () => {
      const caller = createAdminCaller();
      // Bootstrap already ran (flag is set), only the actual query executes
      queueExecute({ rows: [] });

      const result = await caller.rdVerification.getProjects();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array when items field is null/undefined", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [{ items: undefined }] });

      const result = await caller.rdVerification.getProjects();
      expect(result).toEqual([]);
    });

    it("returns a single-item array", async () => {
      const caller = createAdminCaller();
      const single = [sampleProjects[0]];
      queueExecute({ rows: [{ items: single }] });

      const result = await caller.rdVerification.getProjects();
      expect(result).toEqual(single);
      expect(result).toHaveLength(1);
    });
  });

  // =========================================================================
  // getChecklists
  // =========================================================================
  describe("getChecklists", () => {
    it("returns checklist items as an object keyed by gate phase", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [{ items: sampleChecklists }] });

      const result = await caller.rdVerification.getChecklists();
      expect(result).toEqual(sampleChecklists);
      expect(typeof result).toBe("object");
      expect(Array.isArray(result)).toBe(false);
      expect((result as any).M3).toHaveLength(2);
      expect((result as any).M4).toHaveLength(2);
    });

    it("returns empty object when no rows match", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [] });

      const result = await caller.rdVerification.getChecklists();
      expect(result).toEqual({});
      expect(typeof result).toBe("object");
      expect(Array.isArray(result)).toBe(false);
    });

    it("returns empty object when items field is null/undefined", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [{ items: undefined }] });

      const result = await caller.rdVerification.getChecklists();
      expect(result).toEqual({});
    });

    it("returns checklists with a single gate phase", async () => {
      const caller = createAdminCaller();
      const singleGate = { M5: [{ id: 10, checkItem: "3D模型最终版发布", status: "pass", isMandatory: true }] };
      queueExecute({ rows: [{ items: singleGate }] });

      const result = await caller.rdVerification.getChecklists();
      expect(result).toEqual(singleGate);
      expect(Object.keys(result as any)).toEqual(["M5"]);
    });
  });

  // =========================================================================
  // getReviews
  // =========================================================================
  describe("getReviews", () => {
    it("returns review items from the database", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [{ items: sampleReviews }] });

      const result = await caller.rdVerification.getReviews();
      expect(result).toEqual(sampleReviews);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("approved");
      expect(result[1].gateName).toBe("详细设计评审");
    });

    it("returns empty array when no rows match", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [] });

      const result = await caller.rdVerification.getReviews();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array when items field is null/undefined", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [{ items: undefined }] });

      const result = await caller.rdVerification.getReviews();
      expect(result).toEqual([]);
    });

    it("returns reviews with various statuses", async () => {
      const caller = createAdminCaller();
      const mixedReviews = [
        { id: 1, status: "approved" },
        { id: 2, status: "conditional" },
        { id: 3, status: "in_review" },
        { id: 4, status: "pending" },
      ];
      queueExecute({ rows: [{ items: mixedReviews }] });

      const result = await caller.rdVerification.getReviews();
      expect(result).toHaveLength(4);
      const statuses = (result as any[]).map((r) => r.status);
      expect(statuses).toContain("approved");
      expect(statuses).toContain("conditional");
      expect(statuses).toContain("in_review");
      expect(statuses).toContain("pending");
    });
  });

  // =========================================================================
  // getSignals
  // =========================================================================
  describe("getSignals", () => {
    it("returns signal items from the database", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [{ items: sampleSignals }] });

      const result = await caller.rdVerification.getSignals();
      expect(result).toEqual(sampleSignals);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("triggered");
      expect(result[1].actionPayload).toEqual({ action: "start_test", protocol: "FAT" });
    });

    it("returns empty array when no rows match", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [] });

      const result = await caller.rdVerification.getSignals();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array when items field is null/undefined", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [{ items: undefined }] });

      const result = await caller.rdVerification.getSignals();
      expect(result).toEqual([]);
    });

    it("returns signals with nested actionPayload", async () => {
      const caller = createAdminCaller();
      const signalsWithPayload = [
        {
          id: 10,
          upstreamGate: "M9",
          triggerEvent: "发货确认",
          targetAasId: "AAS-GRT502-INS01",
          status: "confirmed",
          actionPayload: { action: "prepare_installation", site: "台积电南京", priority: "urgent" },
        },
      ];
      queueExecute({ rows: [{ items: signalsWithPayload }] });

      const result = await caller.rdVerification.getSignals();
      expect(result).toHaveLength(1);
      expect((result[0] as any).actionPayload.site).toBe("台积电南京");
      expect((result[0] as any).actionPayload.priority).toBe("urgent");
    });
  });

  // =========================================================================
  // Bootstrap behavior
  // =========================================================================
  describe("bootstrap behavior", () => {
    it("calls db.execute for the actual query (bootstrap already completed from earlier tests)", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [{ items: sampleProjects }] });

      await caller.rdVerification.getProjects();
      // After bootstrap is done (from getProjects first test), subsequent calls
      // only call execute once for the actual SELECT query
      expect(mockExecuteFn).toHaveBeenCalled();
    });

    it("db.execute is called at least once per procedure call", async () => {
      const caller = createAdminCaller();
      queueExecute({ rows: [{ items: [] }] });
      mockExecuteFn.mockClear();

      await caller.rdVerification.getReviews();
      // At minimum: 1 call for the actual SELECT (bootstrap already done)
      expect(mockExecuteFn.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe("edge cases", () => {
    it("getProjects handles large datasets", async () => {
      const caller = createAdminCaller();
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Project ${i + 1}`,
        code: `GRT-2026-${String(i + 1).padStart(3, "0")}`,
        currentStage: `M${i % 13}`,
        completedStages: [],
        customer: "Test Customer",
        risk: "low",
      }));
      queueExecute({ rows: [{ items: largeDataset }] });

      const result = await caller.rdVerification.getProjects();
      expect(result).toHaveLength(100);
    });

    it("getChecklists returns object with many gate phases", async () => {
      const caller = createAdminCaller();
      const manyGates: Record<string, any[]> = {};
      for (let i = 0; i <= 12; i++) {
        manyGates[`M${i}`] = [{ id: i, checkItem: `Gate M${i} item`, status: "pass", isMandatory: true }];
      }
      queueExecute({ rows: [{ items: manyGates }] });

      const result = await caller.rdVerification.getChecklists();
      expect(Object.keys(result as any)).toHaveLength(13);
      expect((result as any).M0).toBeDefined();
      expect((result as any).M12).toBeDefined();
    });

    it("getSignals returns items with empty actionPayload", async () => {
      const caller = createAdminCaller();
      const signals = [{ id: 1, upstreamGate: "M1", triggerEvent: "test", targetAasId: "X", status: "pending", actionPayload: {} }];
      queueExecute({ rows: [{ items: signals }] });

      const result = await caller.rdVerification.getSignals();
      expect(result).toHaveLength(1);
      expect((result[0] as any).actionPayload).toEqual({});
    });
  });
});
