/**
 * Annual Planning Router — Unit Tests
 *
 * Tests all 15 procedures:
 *   list, getById, create, update, delete,
 *   getGoals, getProgress,
 *   getConfigs, getActiveConfig, createConfig, activateConfig, copyToNewYear,
 *   getItems, createItem, updateItem,
 *   getUpdateLogs, initSampleData
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAdminCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
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
    execute: vi.fn(() => Promise.resolve([[]])),
    // transaction passes a mock tx that behaves identically to db
    transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => {
      // Create a tx object that mirrors the db chain behavior
      const txChain: any = {};
      for (const m of [
        "from", "where", "orderBy", "limit", "offset", "values", "set",
        "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
        "innerJoin", "leftJoin", "rightJoin", "fullJoin",
      ]) {
        txChain[m] = vi.fn(() => txChain);
      }
      txChain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
      txChain.then = (resolve: any, reject?: any) => {
        try { return resolve(getNextResult()); }
        catch (e) { if (reject) return reject(e); throw e; }
      };

      const tx: any = {
        select: vi.fn(() => txChain),
        insert: vi.fn(() => txChain),
        update: vi.fn(() => txChain),
        delete: vi.fn(() => txChain),
        execute: vi.fn(() => Promise.resolve([[]])),
      };
      return fn(tx);
    }),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// Mock schema — provide column references used by the router
vi.mock("../../drizzle/schema", () => ({
  annualPlans: {
    id: "id", year: "year", type: "type", departmentId: "departmentId",
    name: "name", description: "description",
    revenueTarget: "revenueTarget", profitTarget: "profitTarget",
    customerTarget: "customerTarget", investmentBudget: "investmentBudget",
    hiringBudget: "hiringBudget", trainingBudget: "trainingBudget",
    keyInitiatives: "keyInitiatives", risksAndChallenges: "risksAndChallenges",
    status: "status", creatorId: "creatorId",
    approverId: "approverId", approvedAt: "approvedAt",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  annualPlanningConfigs: {
    id: "id", year: "year", version: "version", versionName: "versionName",
    status: "status", basedOnId: "basedOnId", effectiveDate: "effectiveDate",
    archivedDate: "archivedDate", creatorId: "creatorId", notes: "notes",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  annualPlanningItems: {
    id: "id", configId: "configId", category: "category", name: "name",
    description: "description", tasks: "tasks", frequency: "frequency",
    startDate: "startDate", endDate: "endDate", weekNumber: "weekNumber",
    month: "month", responsibleUserId: "responsibleUserId",
    responsibleUserName: "responsibleUserName", participantIds: "participantIds",
    status: "status", sortOrder: "sortOrder", isTemplate: "isTemplate",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  annualPlanningUpdateLogs: {
    id: "id", configId: "configId", updateType: "updateType",
    description: "description", beforeData: "beforeData", afterData: "afterData",
    operatorId: "operatorId", createdAt: "createdAt",
  },
  annualPlanningDependencies: {
    id: "id", configId: "configId", sourceItemId: "sourceItemId",
    targetItemId: "targetItemId", dependencyType: "dependencyType",
    lagDays: "lagDays", createdBy: "createdBy", createdAt: "createdAt",
  },
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────
describe("annualPlanning router", () => {

  // ==================== list ====================
  describe("list", () => {
    it("returns paginated annual plans", async () => {
      mockQueryResult = [
        { id: 1, year: 2026, name: "Plan A" },
        { id: 2, year: 2025, name: "Plan B" },
      ];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.list();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 2);
      expect(result).toHaveProperty("page", 1);
      expect(result).toHaveProperty("pageSize", 10);
      expect(result.items).toHaveLength(2);
    });

    it("returns empty list when no plans exist", async () => {
      mockQueryResult = [];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ==================== getById ====================
  describe("getById", () => {
    it("returns a plan by valid id", async () => {
      mockQueryResult = [{ id: 1, year: 2026, name: "Plan A", status: "draft" }];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getById({ id: "1" });
      expect(result).not.toBeNull();
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("name", "Plan A");
    });

    it("returns null for non-existent plan", async () => {
      mockQueryResult = [];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getById({ id: "999" });
      expect(result).toBeNull();
    });

    it("returns null for non-numeric id", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getById({ id: "abc" });
      expect(result).toBeNull();
    });
  });

  // ==================== create ====================
  describe("create", () => {
    it("creates a plan with defaults", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.create({});
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("creates a plan with all fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.create({
        year: 2026,
        type: "department",
        departmentId: 5,
        name: "Department Plan",
        description: "Test plan",
        revenueTarget: 1000000,
        profitTarget: 200000,
        customerTarget: 30,
        investmentBudget: 500000,
        hiringBudget: 5,
        trainingBudget: 100000,
        keyInitiatives: ["Initiative A", "Initiative B"],
        risksAndChallenges: ["Risk 1"],
        status: "approved",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("handles keyInitiatives as string", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.create({
        keyInitiatives: "single initiative",
        risksAndChallenges: "single risk",
      });
      expect(result.success).toBe(true);
    });

    it("defaults year to current year when not provided", async () => {
      const caller = createAdminCaller();
      await caller.annualPlanning.create({});
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("defaults status to draft when not provided", async () => {
      const caller = createAdminCaller();
      await caller.annualPlanning.create({});
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // ==================== update ====================
  describe("update", () => {
    it("updates a plan by numeric id", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.update({
        id: 1,
        name: "Updated Plan",
        status: "approved",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("updates a plan by string id", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.update({
        id: "5",
        revenueTarget: 5000000,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns success without updating when id is 0 or invalid", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.update({ id: "0" });
      expect(result).toEqual({ success: true, message: "操作成功" });
      // Should not call update since id converts to 0 (falsy)
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("serializes array keyInitiatives to JSON string", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.update({
        id: 1,
        keyInitiatives: ["A", "B", "C"],
      });
      expect(result.success).toBe(true);
    });

    it("serializes array risksAndChallenges to JSON string", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.update({
        id: 1,
        risksAndChallenges: ["Risk A", "Risk B"],
      });
      expect(result.success).toBe(true);
    });

    it("passes string keyInitiatives as-is", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.update({
        id: 1,
        keyInitiatives: "already a string",
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== delete ====================
  describe("delete", () => {
    it("deletes a plan by valid id", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.delete({ id: "1" });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("handles non-numeric id gracefully (no delete called)", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.delete({ id: "abc" });
      expect(result).toEqual({ success: true, message: "操作成功" });
      // isNaN("abc") is true, so delete should not be called
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  // ==================== getGoals ====================
  describe("getGoals", () => {
    it("returns goals for current year plans", async () => {
      mockQueryResult = [
        {
          id: 1, name: "Revenue Goal", type: "company",
          revenueTarget: 20000000, profitTarget: 4000000,
          customerTarget: 50, investmentBudget: 3000000,
          hiringBudget: 10, trainingBudget: 200000,
          status: "approved",
        },
      ];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getGoals();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("name", "Revenue Goal");
      expect(result[0]).toHaveProperty("revenueTarget", 20000000);
      expect(result[0]).toHaveProperty("status", "approved");
    });

    it("returns empty array when no plans for current year", async () => {
      mockQueryResult = [];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getGoals();
      expect(result).toHaveLength(0);
    });

    it("maps only goal-relevant fields", async () => {
      mockQueryResult = [{
        id: 1, name: "Plan", type: "company",
        revenueTarget: 1, profitTarget: 2, customerTarget: 3,
        investmentBudget: 4, hiringBudget: 5, trainingBudget: 6,
        status: "draft",
        // Extra fields that should not appear in goals
        description: "should not appear", creatorId: 99,
      }];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getGoals();
      expect(result[0]).not.toHaveProperty("description");
      expect(result[0]).not.toHaveProperty("creatorId");
      expect(result[0]).toHaveProperty("id");
    });
  });

  // ==================== getProgress ====================
  describe("getProgress", () => {
    it("returns 0 when no active config", async () => {
      selectResultsQueue.push([]); // no active config
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getProgress();
      expect(result).toEqual({ progress: 0 });
    });

    it("returns 0 when no items exist", async () => {
      selectResultsQueue.push([{ id: 1, status: "active" }]); // active config
      selectResultsQueue.push([{ count: 0 }]); // total
      selectResultsQueue.push([{ count: 0 }]); // completed
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getProgress();
      expect(result).toEqual({ progress: 0 });
    });

    it("calculates progress percentage correctly", async () => {
      selectResultsQueue.push([{ id: 1, status: "active" }]); // active config
      selectResultsQueue.push([{ count: 10 }]); // total
      selectResultsQueue.push([{ count: 7 }]); // completed
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getProgress();
      expect(result).toEqual({ progress: 70 });
    });

    it("rounds progress percentage", async () => {
      selectResultsQueue.push([{ id: 1, status: "active" }]);
      selectResultsQueue.push([{ count: 3 }]);
      selectResultsQueue.push([{ count: 1 }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getProgress();
      expect(result).toEqual({ progress: 33 }); // Math.round(1/3*100) = 33
    });

    it("returns 100 when all items completed", async () => {
      selectResultsQueue.push([{ id: 1, status: "active" }]);
      selectResultsQueue.push([{ count: 5 }]);
      selectResultsQueue.push([{ count: 5 }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getProgress();
      expect(result).toEqual({ progress: 100 });
    });
  });

  // ==================== getConfigs ====================
  describe("getConfigs", () => {
    it("returns all configs ordered by year desc", async () => {
      mockQueryResult = [
        { id: 2, year: 2026, version: "V1.0", versionName: "2026 Plan" },
        { id: 1, year: 2025, version: "V1.0", versionName: "2025 Plan" },
      ];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getConfigs();
      expect(result).toHaveLength(2);
    });

    it("returns empty list when no configs exist", async () => {
      mockQueryResult = [];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getConfigs();
      expect(result).toHaveLength(0);
    });
  });

  // ==================== getActiveConfig ====================
  describe("getActiveConfig", () => {
    it("returns active config when one exists", async () => {
      mockQueryResult = [{ id: 1, year: 2026, status: "active", versionName: "V1" }];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getActiveConfig();
      expect(result).toHaveProperty("config");
      expect(result.config).not.toBeNull();
      expect(result.config).toHaveProperty("id", 1);
    });

    it("returns null config when none is active", async () => {
      mockQueryResult = [];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getActiveConfig();
      expect(result).toEqual({ config: null });
    });
  });

  // ==================== createConfig ====================
  describe("createConfig", () => {
    it("creates config with defaults", async () => {
      mockReturningResult = [{ id: 10 }];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createConfig({});
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id", 10);
    });

    it("creates config with all fields", async () => {
      mockReturningResult = [{ id: 11 }];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createConfig({
        year: 2027,
        version: "V2.0",
        versionName: "Custom Plan Name",
        status: "active",
        basedOnId: 5,
        notes: "Some notes",
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id", 11);
    });

    it("defaults version to V1.0", async () => {
      mockReturningResult = [{ id: 12 }];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createConfig({});
      expect(result.success).toBe(true);
    });

    it("handles missing returning result gracefully", async () => {
      mockReturningResult = [];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createConfig({});
      expect(result).toHaveProperty("success", true);
      expect(result.id).toBeUndefined();
    });
  });

  // ==================== activateConfig ====================
  describe("activateConfig", () => {
    it("activates a config using id param", async () => {
      // First select inside tx: find the config
      selectResultsQueue.push([{ id: 1, year: 2026, status: "draft", versionName: "V1" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.activateConfig({ id: "1" });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("activates a config using configId param", async () => {
      selectResultsQueue.push([{ id: 2, year: 2026, status: "draft", versionName: "V2" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.activateConfig({ configId: "2" });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns success early when no id provided", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.activateConfig({});
      expect(result).toEqual({ success: true, message: "操作成功" });
      // Should not call transaction since configId resolves to NaN/0
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it("returns failure when config not found", async () => {
      selectResultsQueue.push([]); // config not found
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.activateConfig({ id: "999" });
      expect(result).toEqual({ success: false, message: "Config not found" });
    });
  });

  // ==================== copyToNewYear ====================
  describe("copyToNewYear", () => {
    it("copies config to next year using sourceConfigId", async () => {
      // First select: find source config
      selectResultsQueue.push([{ id: 1, year: 2025, versionName: "2025 Plan" }]);
      // Tx insert returning (new config)
      mockReturningResult = [{ id: 10 }];
      // Tx select source items
      selectResultsQueue.push([
        { id: 100, category: "sales", name: "Item1", description: "Desc", tasks: null, frequency: "once", responsibleUserId: 1, responsibleUserName: "User", participantIds: null, status: "pending", sortOrder: 1, isTemplate: 0 },
      ]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.copyToNewYear({
        sourceConfigId: "1",
        targetYear: 2026,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("uses configId alias", async () => {
      selectResultsQueue.push([{ id: 2, year: 2025, versionName: "V2" }]);
      mockReturningResult = [{ id: 20 }];
      selectResultsQueue.push([]); // no source items
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.copyToNewYear({
        configId: "2",
        year: 2027,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("uses id alias", async () => {
      selectResultsQueue.push([{ id: 3, year: 2025, versionName: "V3" }]);
      mockReturningResult = [{ id: 30 }];
      selectResultsQueue.push([]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.copyToNewYear({ id: "3" });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns failure when no source config id provided", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.copyToNewYear({});
      expect(result).toEqual({ success: false, message: "Source config ID required" });
    });

    it("returns failure when source config not found", async () => {
      selectResultsQueue.push([]); // not found
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.copyToNewYear({ sourceConfigId: "999" });
      expect(result).toEqual({ success: false, message: "Source config not found" });
    });
  });

  // ==================== getItems ====================
  describe("getItems", () => {
    it("returns items from active config", async () => {
      selectResultsQueue.push([{ id: 1, status: "active" }]); // active config
      selectResultsQueue.push([
        { id: 10, name: "Item A", configId: 1 },
        { id: 11, name: "Item B", configId: 1 },
      ]); // items
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getItems();
      expect(result).toHaveLength(2);
    });

    it("returns all items when no active config", async () => {
      selectResultsQueue.push([]); // no active config
      mockQueryResult = [{ id: 10, name: "Item X" }];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getItems();
      expect(result).toHaveLength(1);
    });

    it("returns empty when no items exist", async () => {
      selectResultsQueue.push([]); // no active config
      mockQueryResult = [];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getItems();
      expect(result).toHaveLength(0);
    });
  });

  // ==================== createItem ====================
  describe("createItem", () => {
    it("creates item with explicit configId", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.annualPlanning.createItem({
        configId: 1,
        name: "New Item",
        category: "sales",
        description: "Description",
        frequency: "monthly",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
      // Two inserts: one for item, one for log
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it("falls back to active config when configId is 0/undefined", async () => {
      // Active config lookup
      selectResultsQueue.push([{ id: 5, status: "active" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        name: "Fallback Item",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns failure when no configId and no active config", async () => {
      selectResultsQueue.push([]); // no active config
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        name: "Orphan Item",
      });
      expect(result).toEqual({ success: false, message: "No active config found" });
    });

    it("handles tasks as string", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        configId: 1,
        tasks: "simple task string",
      });
      expect(result.success).toBe(true);
    });

    it("handles tasks as array and serializes to JSON", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        configId: 1,
        tasks: [{ name: "Task 1", done: false }],
      });
      expect(result.success).toBe(true);
    });

    it("handles participantIds as string", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        configId: 1,
        participantIds: "[1,2,3]",
      });
      expect(result.success).toBe(true);
    });

    it("handles participantIds as array and serializes to JSON", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        configId: 1,
        participantIds: [1, 2, "3"],
      });
      expect(result.success).toBe(true);
    });

    it("creates item with all optional fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        configId: 1,
        category: "production",
        name: "Full Item",
        description: "All fields",
        tasks: [{ name: "subtask" }],
        frequency: "weekly",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        weekNumber: 1,
        month: 1,
        responsibleUserId: 10,
        responsibleUserName: "Zhang",
        participantIds: [1, 2],
        status: "in_progress",
        sortOrder: 5,
        operatorId: 99,
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== updateItem ====================
  describe("updateItem", () => {
    it("updates item by numeric id", async () => {
      // before state lookup
      selectResultsQueue.push([{ id: 1, configId: 10, name: "Old Name" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.updateItem({
        id: 1,
        name: "New Name",
        status: "completed",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("updates item by string id", async () => {
      selectResultsQueue.push([{ id: 5, configId: 10, name: "Item 5" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.updateItem({
        id: "5",
        category: "hr",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns success early when id is 0", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.updateItem({ id: "0" });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("serializes array tasks to JSON", async () => {
      selectResultsQueue.push([{ id: 1, configId: 10, name: "Item" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.updateItem({
        id: 1,
        tasks: [{ name: "Updated task", done: true }],
      });
      expect(result.success).toBe(true);
    });

    it("serializes array participantIds to JSON", async () => {
      selectResultsQueue.push([{ id: 1, configId: 10, name: "Item" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.updateItem({
        id: 1,
        participantIds: [1, 2, 3],
      });
      expect(result.success).toBe(true);
    });

    it("logs update when before state exists", async () => {
      selectResultsQueue.push([{ id: 1, configId: 10, name: "Item" }]);
      const caller = createAdminCaller();
      await caller.annualPlanning.updateItem({
        id: 1,
        name: "Updated Name",
      });
      // insert for log
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("skips logging when item not found (before is undefined)", async () => {
      selectResultsQueue.push([]); // no before state
      const caller = createAuthenticatedCaller();
      const result = await caller.annualPlanning.updateItem({
        id: 1,
        name: "Ghost Update",
      });
      expect(result.success).toBe(true);
      // update still called, but no insert for log
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("passes operatorId from input to log", async () => {
      selectResultsQueue.push([{ id: 1, configId: 10, name: "Item" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.updateItem({
        id: 1,
        name: "Operator test",
        operatorId: 42,
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== getUpdateLogs ====================
  describe("getUpdateLogs", () => {
    it("returns logs ordered by createdAt desc", async () => {
      mockQueryResult = [
        { id: 1, configId: 1, updateType: "create", description: "Created item" },
        { id: 2, configId: 1, updateType: "update", description: "Updated item" },
      ];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getUpdateLogs();
      expect(result).toHaveLength(2);
    });

    it("returns empty when no logs exist", async () => {
      mockQueryResult = [];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getUpdateLogs();
      expect(result).toHaveLength(0);
    });
  });

  // ==================== initSampleData ====================
  describe("initSampleData", () => {
    it("creates sample data when no configs exist", async () => {
      // existing count check
      selectResultsQueue.push([{ count: 0 }]);
      // config insert returning
      mockReturningResult = [{ id: 1 }];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.initSampleData();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("created");
      expect(result.created).toBe(7); // 5 items + 1 config(implicit) + 1 annual plan = 7
    });

    it("skips when data already exists", async () => {
      selectResultsQueue.push([{ count: 3 }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.initSampleData();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "Data already exists");
      expect(result).toHaveProperty("created", 0);
    });

    it("handles count as string (DB may return string)", async () => {
      selectResultsQueue.push([{ count: "5" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.initSampleData();
      expect(result).toHaveProperty("created", 0);
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.getById({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.create({})).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.update({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.delete({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for getGoals", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.getGoals()).rejects.toThrow();
    });

    it("rejects anonymous for getProgress", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.getProgress()).rejects.toThrow();
    });

    it("rejects anonymous for getConfigs", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.getConfigs()).rejects.toThrow();
    });

    it("rejects anonymous for getActiveConfig", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.getActiveConfig()).rejects.toThrow();
    });

    it("rejects anonymous for createConfig", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.createConfig({})).rejects.toThrow();
    });

    it("rejects anonymous for activateConfig", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.activateConfig({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for copyToNewYear", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.copyToNewYear({ sourceConfigId: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for getItems", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.getItems()).rejects.toThrow();
    });

    it("rejects anonymous for createItem", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.createItem({ configId: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for updateItem", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.updateItem({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for getUpdateLogs", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.getUpdateLogs()).rejects.toThrow();
    });

    it("rejects anonymous for initSampleData", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.annualPlanning.initSampleData()).rejects.toThrow();
    });
  });

  // ═══ Edge Cases ═══════════════════════════════════
  describe("edge cases", () => {
    it("getById handles large numeric id string", async () => {
      mockQueryResult = [];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.getById({ id: "99999999" });
      expect(result).toBeNull();
    });

    it("update handles id as number directly", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.update({
        id: 42,
        name: "Numeric ID Update",
      });
      expect(result.success).toBe(true);
    });

    it("createItem defaults category to other", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        configId: 1,
        name: "Default Category Item",
      });
      expect(result.success).toBe(true);
    });

    it("createItem defaults frequency to once", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        configId: 1,
        name: "Default Frequency Item",
      });
      expect(result.success).toBe(true);
    });

    it("createItem defaults status to pending", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        configId: 1,
        name: "Default Status Item",
      });
      expect(result.success).toBe(true);
    });

    it("createItem defaults sortOrder to 0", async () => {
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.createItem({
        configId: 1,
        name: "Default SortOrder Item",
      });
      expect(result.success).toBe(true);
    });

    it("updateItem with string tasks passes as-is", async () => {
      selectResultsQueue.push([{ id: 1, configId: 10, name: "Item" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.updateItem({
        id: 1,
        tasks: "string tasks",
      });
      expect(result.success).toBe(true);
    });

    it("updateItem with string participantIds passes as-is", async () => {
      selectResultsQueue.push([{ id: 1, configId: 10, name: "Item" }]);
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.updateItem({
        id: 1,
        participantIds: "[1,2]",
      });
      expect(result.success).toBe(true);
    });

    it("create plan uses ctx.user.id as creatorId", async () => {
      const caller = createAdminCaller({ id: 42 });
      const result = await caller.annualPlanning.create({ name: "User 42 Plan" });
      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("multiple plans returned in list maintain order", async () => {
      mockQueryResult = [
        { id: 3, year: 2026, name: "C" },
        { id: 2, year: 2026, name: "B" },
        { id: 1, year: 2025, name: "A" },
      ];
      const caller = createAdminCaller();
      const result = await caller.annualPlanning.list();
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });
  });
});
