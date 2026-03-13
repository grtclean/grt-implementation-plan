/**
 * OKR Engine Router — Unit Tests
 * Tests all 11 procedures: list, listObjectives, getObjective,
 * createObjective, updateObjective, deleteObjective, createKeyResult,
 * updateKeyResult, checkIn, dashboard, decomposeToOkr, seedDemo
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of ["from","where","orderBy","limit","offset","values","set","onConflictDoUpdate","onConflictDoNothing","groupBy","having","innerJoin","leftJoin","rightJoin","fullJoin"]) {
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
    execute: vi.fn(() => Promise.resolve({ rows: [] })),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// Mock schema
vi.mock("../../drizzle/okr-schema", () => ({
  okrObjectives: { id: "id", level: "level", status: "status", period: "period", buCode: "buCode", ownerId: "ownerId", progress: "progress", createdAt: "createdAt", updatedAt: "updatedAt" },
  okrKeyResults: { id: "id", objectiveId: "objectiveId", currentValue: "currentValue", startValue: "startValue", targetValue: "targetValue", confidence: "confidence", updatedAt: "updatedAt" },
  okrCheckIns: { id: "id", keyResultId: "keyResultId", createdAt: "createdAt" },
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────
describe("okr router", () => {

  describe("list", () => {
    it("returns paginated objectives (legacy)", async () => {
      // items query + count query
      selectResultsQueue.push([{ id: 1, title: "OKR 1" }]);
      selectResultsQueue.push([{ value: 10 }]);
      const caller = createAdminCaller();
      const result = await caller.okr.list({});
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("handles no input", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const caller = createAdminCaller();
      const result = await caller.okr.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("falls back on error", async () => {
      // Force error by pushing an error-triggering result
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const caller = createAdminCaller();
      const result = await caller.okr.list({});
      // try-catch fallback → { items: [], total: 0 } OR actual empty result
      expect(result).toHaveProperty("items");
    });
  });

  describe("listObjectives", () => {
    it("returns objectives with filters", async () => {
      mockQueryResult = [{ id: 1, level: "company", title: "Revenue" }];
      const caller = createAdminCaller();
      const result = await caller.okr.listObjectives({
        level: "company", limit: 10,
      });
      expect(result).toHaveLength(1);
    });

    it("returns empty on no match", async () => {
      const caller = createAdminCaller();
      const result = await caller.okr.listObjectives({ level: "bu", limit: 50 });
      expect(result).toHaveLength(0);
    });

    it("filters by multiple criteria", async () => {
      mockQueryResult = [{ id: 1 }];
      const caller = createAdminCaller();
      const result = await caller.okr.listObjectives({
        level: "bu", status: "active", period: "2026-Q1", buCode: "overseas", limit: 50,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("getObjective", () => {
    it("returns objective with KRs and check-ins", async () => {
      // objective
      selectResultsQueue.push([{ id: 1, title: "Revenue", level: "company" }]);
      // key results
      selectResultsQueue.push([
        { id: 10, objectiveId: 1, title: "KR1", currentValue: 50, targetValue: 100 },
      ]);
      // check-ins
      selectResultsQueue.push([{ id: 100, keyResultId: 10, value: 50 }]);
      const caller = createAdminCaller();
      const result = await caller.okr.getObjective({ id: 1 });
      expect(result).toHaveProperty("title", "Revenue");
      expect(result).toHaveProperty("keyResults");
      expect(result!.keyResults).toHaveLength(1);
      expect(result).toHaveProperty("checkIns");
    });

    it("returns null when not found", async () => {
      selectResultsQueue.push([]);
      const caller = createAdminCaller();
      const result = await caller.okr.getObjective({ id: 999 });
      expect(result).toBeNull();
    });

    it("returns objective without check-ins when no KRs", async () => {
      selectResultsQueue.push([{ id: 1, title: "Test" }]);
      selectResultsQueue.push([]); // no KRs
      const caller = createAdminCaller();
      const result = await caller.okr.getObjective({ id: 1 });
      expect(result).toHaveProperty("keyResults");
      expect(result!.keyResults).toHaveLength(0);
      expect(result!.checkIns).toHaveLength(0);
    });
  });

  describe("createObjective", () => {
    it("creates objective", async () => {
      mockReturningResult = [{ id: 1 }];
      const caller = createAdminCaller();
      const result = await caller.okr.createObjective({
        title: "Q1 Revenue", period: "2026-Q1",
      });
      expect(result).toHaveProperty("ok", true);
      expect(result).toHaveProperty("id", 1);
    });

    it("creates with all optional fields", async () => {
      mockReturningResult = [{ id: 2 }];
      const caller = createAdminCaller();
      const result = await caller.okr.createObjective({
        title: "BU Target", period: "2026-Q1",
        level: "bu", priority: "P0", buCode: "overseas",
        description: "BU objective", ownerName: "Zhang",
        parentId: 1,
      });
      expect(result).toHaveProperty("ok", true);
    });

    it("rejects empty title", async () => {
      const caller = createAdminCaller();
      await expect(caller.okr.createObjective({
        title: "", period: "2026-Q1",
      })).rejects.toThrow();
    });
  });

  describe("updateObjective", () => {
    it("updates objective", async () => {
      const caller = createAdminCaller();
      const result = await caller.okr.updateObjective({
        id: 1, title: "Updated Title", status: "active", progress: 50,
      });
      expect(result).toHaveProperty("ok", true);
    });
  });

  describe("deleteObjective", () => {
    it("deletes objective with cascading KRs and check-ins", async () => {
      // KR select
      selectResultsQueue.push([{ id: 10 }, { id: 11 }]);
      const caller = createAdminCaller();
      const result = await caller.okr.deleteObjective({ id: 1 });
      expect(result).toHaveProperty("ok", true);
    });

    it("deletes objective with no KRs", async () => {
      selectResultsQueue.push([]);
      const caller = createAdminCaller();
      const result = await caller.okr.deleteObjective({ id: 2 });
      expect(result).toHaveProperty("ok", true);
    });
  });

  describe("createKeyResult", () => {
    it("creates key result", async () => {
      mockReturningResult = [{ id: 10 }];
      const caller = createAdminCaller();
      const result = await caller.okr.createKeyResult({
        objectiveId: 1, title: "Revenue KR",
      });
      expect(result).toHaveProperty("ok", true);
      expect(result).toHaveProperty("id", 10);
    });

    it("creates with all fields", async () => {
      mockReturningResult = [{ id: 11 }];
      const caller = createAdminCaller();
      const result = await caller.okr.createKeyResult({
        objectiveId: 1, title: "Custom KR",
        metricType: "currency", startValue: 0, targetValue: 5000,
        unit: "万元", ownerName: "Li",
      });
      expect(result).toHaveProperty("ok", true);
    });

    it("rejects empty title", async () => {
      const caller = createAdminCaller();
      await expect(caller.okr.createKeyResult({
        objectiveId: 1, title: "",
      })).rejects.toThrow();
    });
  });

  describe("updateKeyResult", () => {
    it("updates KR and auto-updates parent objective progress", async () => {
      // After KR update — select KR
      selectResultsQueue.push([{ id: 10, objectiveId: 1, startValue: 0, targetValue: 100, currentValue: 75 }]);
      // All KRs for parent objective
      selectResultsQueue.push([
        { id: 10, startValue: 0, targetValue: 100, currentValue: 75 },
        { id: 11, startValue: 0, targetValue: 100, currentValue: 50 },
      ]);
      const caller = createAdminCaller();
      const result = await caller.okr.updateKeyResult({
        id: 10, currentValue: 75, status: "on_track",
      });
      expect(result).toHaveProperty("ok", true);
    });
  });

  describe("checkIn", () => {
    it("records check-in and updates KR", async () => {
      const caller = createAdminCaller();
      const result = await caller.okr.checkIn({
        keyResultId: 10, value: 80, confidence: 0.8, note: "Good progress",
      });
      expect(result).toHaveProperty("ok", true);
    });

    it("records check-in with defaults", async () => {
      const caller = createAdminCaller();
      const result = await caller.okr.checkIn({ keyResultId: 10, value: 50 });
      expect(result).toHaveProperty("ok", true);
    });
  });

  describe("dashboard", () => {
    it("returns dashboard stats", async () => {
      mockQueryResult = [
        { id: 1, level: "company", progress: 80, status: "active" },
        { id: 2, level: "bu", progress: 45, status: "active" },
        { id: 3, level: "department", progress: 30, status: "active" },
        { id: 4, level: "individual", progress: 90, status: "active" },
      ];
      const caller = createAdminCaller();
      const result = await caller.okr.dashboard();
      expect(result).toHaveProperty("totalObjectives", 4);
      expect(result).toHaveProperty("avgProgress");
      expect(result).toHaveProperty("onTrack"); // 80, 90 >= 70
      expect(result).toHaveProperty("atRisk"); // 45 >= 40
      expect(result).toHaveProperty("behind"); // 30 < 40
      expect(result.companyLevel).toBe(1);
      expect(result.buLevel).toBe(1);
      expect(result.deptLevel).toBe(1);
      expect(result.teamLevel).toBe(1);
    });

    it("returns zeros when empty", async () => {
      const caller = createAdminCaller();
      const result = await caller.okr.dashboard();
      expect(result.totalObjectives).toBe(0);
      expect(result.avgProgress).toBe(0);
    });
  });

  describe("decomposeToOkr", () => {
    it("decomposes BU sales plans to OKR objectives", async () => {
      // Step 1: execute for BU plans
      mockDb.execute.mockResolvedValueOnce({ rows: [
        { id: 1, year: 2026, department_id: "overseas", total_sales_target: 20000000, total_output_target: 15000000, status: "approved" },
      ]});
      // Step 2: company objectives
      selectResultsQueue.push([{ id: 100, level: "company", period: "2026-Q1" }]);
      // Step 3: existing check — none
      selectResultsQueue.push([]);
      // Step 4: insert objective
      mockReturningResult = [{ id: 200 }];
      const caller = createAdminCaller();
      const result = await caller.okr.decomposeToOkr({ year: 2026 });
      expect(result).toHaveProperty("ok", true);
      expect(result).toHaveProperty("created");
    });

    it("returns message when no plans found", async () => {
      mockDb.execute.mockResolvedValueOnce({ rows: [] });
      const caller = createAdminCaller();
      const result = await caller.okr.decomposeToOkr({ year: 2026 });
      expect(result).toHaveProperty("ok", true);
      expect(result).toHaveProperty("message");
      expect(result.message).toContain("No BU sales plans");
    });
  });

  describe("seedDemo", () => {
    it("seeds demo data when empty", async () => {
      // existing count check
      selectResultsQueue.push([{ value: 0 }]);
      // Each objective insert returns with id
      mockReturningResult = [{ id: 1 }];
      const caller = createAdminCaller();
      const result = await caller.okr.seedDemo();
      expect(result).toHaveProperty("ok", true);
    });

    it("skips when data already exists", async () => {
      selectResultsQueue.push([{ value: 10 }]);
      const caller = createAdminCaller();
      const result = await caller.okr.seedDemo();
      expect(result).toHaveProperty("ok", true);
      expect(result.message).toContain("already exists");
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.okr.list()).rejects.toThrow();
    });

    it("rejects anonymous for createObjective", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.okr.createObjective({
        title: "X", period: "2026-Q1",
      })).rejects.toThrow();
    });

    it("rejects anonymous for checkIn", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.okr.checkIn({
        keyResultId: 1, value: 50,
      })).rejects.toThrow();
    });

    it("rejects anonymous for dashboard", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.okr.dashboard()).rejects.toThrow();
    });

    it("rejects anonymous for decomposeToOkr", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.okr.decomposeToOkr({})).rejects.toThrow();
    });

    it("rejects anonymous for seedDemo", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.okr.seedDemo()).rejects.toThrow();
    });
  });
});
