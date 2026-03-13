/**
 * AI Task Router — Unit Tests
 * Tests 7 procedures: create, get, list, markProcessing, complete, fail, stats
 *
 * Uses ensureTables() bootstrap (module-level flag).
 * First test triggers CREATE TABLE + INDEX calls; subsequent tests skip.
 * Stats uses db.select().from().groupBy() chain.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, returningQueue, executeResults } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  const executeResults: any[] = [];
  return { selectResultsQueue, returningQueue, executeResults };
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
      groupBy: vi.fn(() => chain),
      returning: vi.fn(() => {
        const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1, status: "pending" }];
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
      execute: vi.fn(async () => {
        return executeResults.length > 0 ? executeResults.shift()! : { rows: [] };
      }),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  executeResults.length = 0;
});

const caller = () => createAdminCaller();

const sampleTask = {
  id: 1,
  taskType: "HR_CAPABILITY_PARSING",
  status: "pending",
  inputData: { resumeId: 42 },
  resultData: null,
  errorMessage: null,
  createdBy: "test-user",
  startedAt: null,
  completedAt: null,
  createdAt: "2026-02-28T10:00:00.000Z",
};

describe("ai-task router", () => {

  // ═══ create ═══
  describe("create", () => {
    it("creates a new AI task", async () => {
      // ensureTables: CREATE TABLE + 2 CREATE INDEX
      executeResults.push({ rows: [] }); // CREATE TABLE
      executeResults.push({ rows: [] }); // CREATE INDEX 1
      executeResults.push({ rows: [] }); // CREATE INDEX 2
      returningQueue.push([{ id: 5, status: "pending" }]);
      const result = await caller().aiTask.create({
        taskType: "HR_CAPABILITY_PARSING",
        inputData: { resumeId: 42 },
      });
      expect(result.id).toBe(5);
      expect(result.status).toBe("pending");
    });

    it("creates task without inputData", async () => {
      // ensureTables already ran (tablesEnsured = true)
      returningQueue.push([{ id: 6, status: "pending" }]);
      const result = await caller().aiTask.create({
        taskType: "ANALYSIS",
      });
      expect(result.id).toBe(6);
    });

    it("rejects taskType longer than 50 chars", async () => {
      await expect(caller().aiTask.create({
        taskType: "A".repeat(51),
      })).rejects.toThrow();
    });
  });

  // ═══ get ═══
  describe("get", () => {
    it("returns task by id", async () => {
      selectResultsQueue.push([sampleTask]);
      const result = await caller().aiTask.get({ id: 1 });
      expect(result.taskType).toBe("HR_CAPABILITY_PARSING");
      expect(result.status).toBe("pending");
    });

    it("throws when task not found", async () => {
      selectResultsQueue.push([]);
      await expect(caller().aiTask.get({ id: 999 })).rejects.toThrow("Task not found");
    });
  });

  // ═══ list ═══
  describe("list", () => {
    it("returns all tasks with no filters", async () => {
      selectResultsQueue.push([sampleTask, { ...sampleTask, id: 2, taskType: "ANALYSIS" }]);
      const result = await caller().aiTask.list();
      expect(result).toHaveLength(2);
    });

    it("returns empty when no tasks", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiTask.list();
      expect(result).toEqual([]);
    });

    it("accepts taskType filter", async () => {
      selectResultsQueue.push([sampleTask]);
      const result = await caller().aiTask.list({ taskType: "HR_CAPABILITY_PARSING" });
      expect(result).toHaveLength(1);
    });

    it("accepts status filter", async () => {
      selectResultsQueue.push([sampleTask]);
      const result = await caller().aiTask.list({ status: "pending" });
      expect(result).toHaveLength(1);
    });

    it("accepts limit", async () => {
      selectResultsQueue.push([sampleTask]);
      const result = await caller().aiTask.list({ limit: 5 });
      expect(result).toHaveLength(1);
    });

    it("accepts combined filters", async () => {
      selectResultsQueue.push([sampleTask]);
      const result = await caller().aiTask.list({
        taskType: "HR_CAPABILITY_PARSING",
        status: "pending",
        limit: 10,
      });
      expect(result).toHaveLength(1);
    });

    it("rejects limit < 1", async () => {
      await expect(caller().aiTask.list({ limit: 0 })).rejects.toThrow();
    });

    it("rejects limit > 100", async () => {
      await expect(caller().aiTask.list({ limit: 101 })).rejects.toThrow();
    });
  });

  // ═══ markProcessing ═══
  describe("markProcessing", () => {
    it("marks task as processing", async () => {
      const result = await caller().aiTask.markProcessing({ id: 1 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ complete ═══
  describe("complete", () => {
    it("completes task with result data", async () => {
      const result = await caller().aiTask.complete({
        id: 1,
        resultData: { skills: ["TypeScript", "React"] },
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty result data", async () => {
      const result = await caller().aiTask.complete({
        id: 1,
        resultData: {},
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ fail ═══
  describe("fail", () => {
    it("fails task with error message", async () => {
      const result = await caller().aiTask.fail({
        id: 1,
        errorMessage: "LLM timeout",
      });
      expect(result.success).toBe(true);
    });

    it("rejects errorMessage longer than 500 chars", async () => {
      await expect(caller().aiTask.fail({
        id: 1,
        errorMessage: "X".repeat(501),
      })).rejects.toThrow();
    });
  });

  // ═══ stats ═══
  describe("stats", () => {
    it("returns counts by status", async () => {
      selectResultsQueue.push([
        { status: "pending", count: 5 },
        { status: "processing", count: 2 },
        { status: "completed", count: 10 },
        { status: "failed", count: 1 },
      ]);
      const result = await caller().aiTask.stats();
      expect(result.pending).toBe(5);
      expect(result.processing).toBe(2);
      expect(result.completed).toBe(10);
      expect(result.failed).toBe(1);
    });

    it("returns zeros when no tasks", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiTask.stats();
      expect(result.pending).toBe(0);
      expect(result.processing).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("fills missing statuses with zero", async () => {
      selectResultsQueue.push([
        { status: "completed", count: 3 },
      ]);
      const result = await caller().aiTask.stats();
      expect(result.completed).toBe(3);
      expect(result.pending).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().aiTask.create({
        taskType: "X",
      })).rejects.toThrow();
    });
    it("rejects anonymous for get", async () => {
      await expect(createAnonymousCaller().aiTask.get({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().aiTask.list()).rejects.toThrow();
    });
    it("rejects anonymous for markProcessing", async () => {
      await expect(createAnonymousCaller().aiTask.markProcessing({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for complete", async () => {
      await expect(createAnonymousCaller().aiTask.complete({
        id: 1, resultData: {},
      })).rejects.toThrow();
    });
    it("rejects anonymous for fail", async () => {
      await expect(createAnonymousCaller().aiTask.fail({
        id: 1, errorMessage: "x",
      })).rejects.toThrow();
    });
    it("rejects anonymous for stats", async () => {
      await expect(createAnonymousCaller().aiTask.stats()).rejects.toThrow();
    });
  });
});
