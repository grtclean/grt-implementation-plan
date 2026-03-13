/**
 * Cost Router — Unit Tests
 * Tests 15 procedures: list, getById, create, update, delete, getBudget,
 * getStatistics, getBudgets, createBudget, getRecords, createRecord,
 * getCategories, initCategories, getLaborCosts, getSummary
 *
 * Note: getLaborCosts uses requirePermission('pm_project_cost'),
 * which means admin role bypasses but non-admin needs the permission.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, mockReturningResult, mockCheckPermission } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const mockReturningResult: any[] = [];
  const mockCheckPermission = vi.fn().mockResolvedValue(true);
  return { selectResultsQueue, mockReturningResult, mockCheckPermission };
});

vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: mockCheckPermission,
  },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      set: vi.fn(() => chain),
      values: vi.fn(() => chain),
      groupBy: vi.fn(() => chain),
      returning: vi.fn(() => {
        const r = mockReturningResult.length > 0 ? [...mockReturningResult] : [{ id: 1 }];
        mockReturningResult.length = 0;
        return Object.assign(Promise.resolve(r), {
          then: (resolve: any) => Promise.resolve(r).then(resolve),
          catch: () => Promise.resolve(r),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  and: vi.fn((...a: any[]) => a),
  inArray: vi.fn((...a: any[]) => a),
}));

vi.mock("../_core/gateway-bu-context.middleware", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    buScopeCondition: vi.fn(() => undefined),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  mockReturningResult.length = 0;
});

const caller = () => createAuthenticatedCaller();
const adminCaller = () => createAdminCaller();

const sampleRecord = {
  id: 1, projectId: 10, categoryId: 1, costCode: "COST-1",
  description: "Motor purchase", amount: 5000, costDate: "2026-01-15",
  vendor: "SupplierA", invoiceNo: "INV-001", status: "pending",
  submitterId: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

const sampleCategory = {
  id: 1, name: "材料费", code: "MAT", type: "direct",
  description: "原材料和零部件", sortOrder: 1, isActive: 1,
};

const sampleEstimate = {
  id: 1, projectId: 10, categoryId: 1, name: "Budget",
  estimateType: "rough", estimatedAmount: 100000,
  confidence: 80, createdAt: "2026-01-01",
};

describe("cost router", () => {

  describe("list", () => {
    it("returns paginated cost records", async () => {
      selectResultsQueue.push([{ count: 2 }]); // total
      selectResultsQueue.push([sampleRecord, { ...sampleRecord, id: 2 }]); // rows
      const result = await caller().cost.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it("supports custom pagination", async () => {
      selectResultsQueue.push([{ count: 100 }]);
      selectResultsQueue.push([sampleRecord]);
      const result = await caller().cost.list({ limit: 10, offset: 20 });
      expect(result.page).toBe(3); // floor(20/10)+1
      expect(result.pageSize).toBe(10);
    });
  });

  describe("getById", () => {
    it("returns record by string ID", async () => {
      selectResultsQueue.push([sampleRecord]);
      const result = await caller().cost.getById({ id: "1" });
      expect(result).toHaveProperty("costCode", "COST-1");
    });

    it("returns null for invalid ID", async () => {
      const result = await caller().cost.getById({ id: "abc" });
      expect(result).toBeNull();
    });

    it("returns null for missing record", async () => {
      selectResultsQueue.push([]);
      const result = await caller().cost.getById({ id: "999" });
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("creates a cost record", async () => {
      selectResultsQueue.push([]); // insert (fire-and-forget)
      const result = await caller().cost.create({
        projectId: 10, amount: 5000,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });
  });

  describe("update", () => {
    it("updates a cost record", async () => {
      selectResultsQueue.push([]); // update chain
      const result = await caller().cost.update({
        id: 1, amount: 6000,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns success for zero id (noop)", async () => {
      const result = await caller().cost.update({ id: "0" });
      expect(result.success).toBe(true);
    });
  });

  describe("delete", () => {
    it("deletes a cost record", async () => {
      selectResultsQueue.push([]); // delete chain
      const result = await caller().cost.delete({ id: "1" });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("handles non-numeric ID gracefully", async () => {
      const result = await caller().cost.delete({ id: "abc" });
      expect(result.success).toBe(true);
    });
  });

  describe("getBudget", () => {
    it("returns budget, spent, remaining for a project", async () => {
      selectResultsQueue.push([
        { ...sampleEstimate, estimatedAmount: 100000 },
        { ...sampleEstimate, id: 2, estimatedAmount: 50000 },
      ]); // estimates
      selectResultsQueue.push([
        { ...sampleRecord, amount: 30000 },
        { ...sampleRecord, id: 2, amount: 20000 },
      ]); // records
      const result = await caller().cost.getBudget({ projectId: 10 });
      expect(result.budget).toBe(150000);
      expect(result.spent).toBe(50000);
      expect(result.remaining).toBe(100000);
    });

    it("returns zeros when no projectId", async () => {
      const result = await caller().cost.getBudget({});
      expect(result).toEqual({ budget: 0, spent: 0, remaining: 0 });
    });
  });

  describe("getStatistics", () => {
    it("returns total and category breakdown", async () => {
      selectResultsQueue.push([
        { ...sampleRecord, amount: 5000, categoryId: 1 },
        { ...sampleRecord, id: 2, amount: 3000, categoryId: 2 },
      ]); // records
      selectResultsQueue.push([
        sampleCategory,
        { ...sampleCategory, id: 2, name: "人工费", code: "LAB" },
      ]); // categories
      const result = await caller().cost.getStatistics();
      expect(result.total).toBe(8000);
      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].total).toBe(5000);
      expect(result.categories[1].total).toBe(3000);
    });
  });

  describe("getBudgets", () => {
    it("returns budget per project with spending", async () => {
      selectResultsQueue.push([
        { ...sampleEstimate, projectId: 10, estimatedAmount: 100000 },
        { ...sampleEstimate, id: 2, projectId: 20, estimatedAmount: 50000 },
      ]); // estimates
      selectResultsQueue.push([
        { ...sampleRecord, projectId: 10, amount: 30000 },
      ]); // records
      const result = await caller().cost.getBudgets();
      expect(result).toHaveLength(2);
      const proj10 = result.find((r: any) => r.projectId === 10);
      expect(proj10!.budget).toBe(100000);
      expect(proj10!.spent).toBe(30000);
    });
  });

  describe("createBudget", () => {
    it("creates a budget estimate", async () => {
      selectResultsQueue.push([]); // insert
      const result = await caller().cost.createBudget({
        projectId: 10, estimatedAmount: 200000,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });
  });

  describe("getRecords", () => {
    it("returns all cost records", async () => {
      selectResultsQueue.push([sampleRecord]);
      const result = await caller().cost.getRecords();
      expect(result).toHaveLength(1);
    });
  });

  describe("createRecord", () => {
    it("creates a cost record", async () => {
      selectResultsQueue.push([]); // insert
      const result = await caller().cost.createRecord({
        projectId: 10, amount: 3000,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });
  });

  describe("getCategories", () => {
    it("returns categories ordered by sortOrder", async () => {
      selectResultsQueue.push([sampleCategory]);
      const result = await caller().cost.getCategories();
      expect(result).toHaveLength(1);
    });
  });

  describe("initCategories", () => {
    it("skips when categories exist", async () => {
      selectResultsQueue.push([{ count: 5 }]); // existing count
      const result = await caller().cost.initCategories();
      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
    });

    it("creates default categories when empty", async () => {
      selectResultsQueue.push([{ count: 0 }]); // empty
      // 7 inserts (fire-and-forget)
      for (let i = 0; i < 7; i++) selectResultsQueue.push([]);
      const result = await caller().cost.initCategories();
      expect(result.success).toBe(true);
      expect(result.created).toBe(7);
    });
  });

  describe("getLaborCosts", () => {
    it("returns labor costs for admin", async () => {
      selectResultsQueue.push([{ ...sampleCategory, code: "LAB", id: 2 }]); // labor cat
      selectResultsQueue.push([
        { ...sampleRecord, categoryId: 2, amount: 8000, submitterId: 5, costDate: "2026-01" },
      ]); // labor records
      const result = await adminCaller().cost.getLaborCosts();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("total", 8000);
    });

    it("returns empty when no LAB category", async () => {
      selectResultsQueue.push([]); // no labor cat
      const result = await adminCaller().cost.getLaborCosts();
      expect(result).toEqual([]);
    });

    it("rejects non-admin without permission", async () => {
      mockCheckPermission.mockResolvedValueOnce(false);
      await expect(caller().cost.getLaborCosts()).rejects.toThrow(/permission/i);
    });
  });

  describe("getSummary", () => {
    it("returns budget and spending summary", async () => {
      selectResultsQueue.push([{ ...sampleRecord, amount: 5000 }]); // records
      selectResultsQueue.push([sampleCategory]); // categories
      selectResultsQueue.push([{ ...sampleEstimate, estimatedAmount: 100000 }]); // estimates
      const result = await caller().cost.getSummary();
      expect(result.summary.totalBudget).toBe(100000);
      expect(result.summary.totalSpent).toBe(5000);
      expect(result.summary.byCategory).toHaveLength(1);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().cost.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().cost.getById({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().cost.create({ projectId: 1, amount: 100 })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().cost.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for getBudget", async () => {
      await expect(createAnonymousCaller().cost.getBudget()).rejects.toThrow();
    });
    it("rejects anonymous for getStatistics", async () => {
      await expect(createAnonymousCaller().cost.getStatistics()).rejects.toThrow();
    });
    it("rejects anonymous for getSummary", async () => {
      await expect(createAnonymousCaller().cost.getSummary()).rejects.toThrow();
    });
  });
});
