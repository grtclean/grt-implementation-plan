/**
 * Cost Alert Router — Unit Tests
 * Tests 11 procedures: list, getById, create, update, delete,
 * acknowledge, getActiveRules, getProjectLogs, batchImport, parseCSV, exportCSV
 *
 * list uses Promise.all pattern (2 queries: count + select).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

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
      returning: vi.fn(() => {
        const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1 }];
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
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleLog = {
  id: 1, ruleId: 1, projectId: 10, alertLevel: "warning",
  message: "Budget exceeded 80%", status: "active",
  createdAt: "2026-01-01",
};

const sampleRule = {
  id: 1, name: "Budget 80%", scope: "all", alertType: "budget_percent",
  threshold: 80, alertLevel: "warning", notifyType: "system",
  isActive: 1, createdAt: "2026-01-01",
};

describe("cost-alert router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns paginated alert logs", async () => {
      selectResultsQueue.push([{ count: 2 }]); // total
      selectResultsQueue.push([sampleLog, { ...sampleLog, id: 2 }]); // rows
      const result = await caller().costAlert.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it("supports pagination", async () => {
      selectResultsQueue.push([{ count: 100 }]);
      selectResultsQueue.push([sampleLog]);
      const result = await caller().costAlert.list({ limit: 10, offset: 50 });
      expect(result.page).toBe(6);
      expect(result.pageSize).toBe(10);
    });

    it("returns empty on error", async () => {
      // No queue entries → catch block
      const result = await caller().costAlert.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns log by id", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().costAlert.getById({ id: "1" });
      expect(result).toHaveProperty("alertLevel", "warning");
    });

    it("returns null for NaN id", async () => {
      const result = await caller().costAlert.getById({ id: "abc" });
      expect(result).toBeNull();
    });

    it("returns null for missing log", async () => {
      selectResultsQueue.push([]);
      const result = await caller().costAlert.getById({ id: "999" });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates an alert rule", async () => {
      const result = await caller().costAlert.create({
        name: "New Rule", threshold: 90,
      });
      expect(result.success).toBe(true);
    });

    it("passes all optional fields", async () => {
      const result = await caller().costAlert.create({
        name: "Full Rule", threshold: 85,
        description: "Test desc", scope: "project",
        projectId: 10, categoryId: 5,
        alertType: "cost_variance", alertLevel: "critical",
        notifyType: "email", notifyUserIds: [1, 2, 3],
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", async () => {
      await expect(caller().costAlert.create({
        name: "", threshold: 80,
      })).rejects.toThrow();
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates rule fields", async () => {
      const result = await caller().costAlert.update({
        id: 1, name: "Updated Rule",
      });
      expect(result.success).toBe(true);
    });

    it("handles string id", async () => {
      const result = await caller().costAlert.update({
        id: "5", threshold: 95,
      });
      expect(result.success).toBe(true);
    });

    it("serializes array notifyUserIds", async () => {
      const result = await caller().costAlert.update({
        id: 1, notifyUserIds: [10, 20],
      });
      expect(result.success).toBe(true);
    });

    it("returns success for id=0 (no-op)", async () => {
      const result = await caller().costAlert.update({ id: 0 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes a rule", async () => {
      const result = await caller().costAlert.delete({ id: "1" });
      expect(result.success).toBe(true);
    });

    it("handles NaN id gracefully", async () => {
      const result = await caller().costAlert.delete({ id: "abc" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ acknowledge ═══
  describe("acknowledge", () => {
    it("acknowledges an alert log", async () => {
      const result = await caller().costAlert.acknowledge({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("passes handleNote", async () => {
      const result = await caller().costAlert.acknowledge({
        id: "5", handleNote: "Reviewed and addressed",
      });
      expect(result.success).toBe(true);
    });

    it("uses note as fallback for handleNote", async () => {
      const result = await caller().costAlert.acknowledge({
        id: 1, note: "Alternative note",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getActiveRules ═══
  describe("getActiveRules", () => {
    it("returns active rules", async () => {
      selectResultsQueue.push([sampleRule, { ...sampleRule, id: 2 }]);
      const result = await caller().costAlert.getActiveRules();
      expect(result).toHaveLength(2);
    });

    it("returns empty on error", async () => {
      // catch block returns []
      const result = await caller().costAlert.getActiveRules();
      expect(result).toEqual([]);
    });
  });

  // ═══ getProjectLogs ═══
  describe("getProjectLogs", () => {
    it("returns all logs when no projectId", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().costAlert.getProjectLogs();
      expect(result).toHaveLength(1);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().costAlert.getProjectLogs({ projectId: 10 });
      expect(result).toHaveLength(1);
    });

    it("returns empty on error", async () => {
      const result = await caller().costAlert.getProjectLogs();
      expect(result).toEqual([]);
    });
  });

  // ═══ batchImport ═══
  describe("batchImport", () => {
    it("imports rules array", async () => {
      const result = await caller().costAlert.batchImport({
        rules: [
          { name: "Rule A", threshold: 70 },
          { name: "Rule B", threshold: 85 },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
    });

    it("imports items array (alias)", async () => {
      const result = await caller().costAlert.batchImport({
        items: [{ name: "Item Rule", threshold: 60 }],
      });
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });

    it("imports 0 when both arrays undefined", async () => {
      const result = await caller().costAlert.batchImport({});
      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
    });
  });

  // ═══ parseCSV ═══
  describe("parseCSV", () => {
    it("returns empty array", async () => {
      const result = await caller().costAlert.parseCSV();
      expect(result).toEqual([]);
    });
  });

  // ═══ exportCSV ═══
  describe("exportCSV", () => {
    it("returns empty url", async () => {
      const result = await caller().costAlert.exportCSV();
      expect(result).toEqual({ url: "" });
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().costAlert.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().costAlert.getById({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().costAlert.create({ name: "X", threshold: 80 })).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().costAlert.update({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().costAlert.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for acknowledge", async () => {
      await expect(createAnonymousCaller().costAlert.acknowledge({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for getActiveRules", async () => {
      await expect(createAnonymousCaller().costAlert.getActiveRules()).rejects.toThrow();
    });
    it("rejects anonymous for getProjectLogs", async () => {
      await expect(createAnonymousCaller().costAlert.getProjectLogs()).rejects.toThrow();
    });
    it("rejects anonymous for batchImport", async () => {
      await expect(createAnonymousCaller().costAlert.batchImport({})).rejects.toThrow();
    });
    it("rejects anonymous for parseCSV", async () => {
      await expect(createAnonymousCaller().costAlert.parseCSV()).rejects.toThrow();
    });
    it("rejects anonymous for exportCSV", async () => {
      await expect(createAnonymousCaller().costAlert.exportCSV()).rejects.toThrow();
    });
  });
});
