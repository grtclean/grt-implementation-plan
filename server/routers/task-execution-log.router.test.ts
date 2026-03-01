/**
 * Task Execution Log Router — Unit Tests
 * Tests 8 procedures: list, getById, create, update, delete, getStats, exportCSV, cleanup
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
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
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  lt: vi.fn((...a: any[]) => a),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

const sampleLog = {
  id: 1,
  taskId: "task-001",
  taskName: "Daily Backup",
  taskType: "cron",
  cronExpression: "0 0 * * *",
  status: "completed",
  startTime: "2026-02-28T00:00:00Z",
  endTime: "2026-02-28T00:05:00Z",
  duration: 300,
  inputParams: '{"target":"db"}',
  outputResult: '{"rows":100}',
  errorMessage: null,
  errorStack: null,
  triggeredBy: "system",
  metadata: null,
  createdAt: "2026-02-28T00:00:00Z",
  updatedAt: "2026-02-28T00:05:00Z",
};

const sampleLog2 = {
  ...sampleLog,
  id: 2,
  taskId: "task-002",
  taskName: "Report Generation",
  status: "running",
};

describe("taskExecutionLog router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns items with pagination metadata", async () => {
      selectResultsQueue.push([sampleLog, sampleLog2]);
      const result = await caller().taskExecutionLog.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });

    it("returns empty list when no logs exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().taskExecutionLog.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(0);
    });

    it("returns single item correctly", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().taskExecutionLog.list();
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(sampleLog);
      expect(result.total).toBe(1);
      expect(result.pageSize).toBe(1);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns a log by string id", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().taskExecutionLog.getById({ id: "1" });
      expect(result).toEqual(sampleLog);
    });

    it("returns null when log not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().taskExecutionLog.getById({ id: "999" });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates a log with all fields", async () => {
      returningQueue.push([{ ...sampleLog, id: 10 }]);
      const result = await caller().taskExecutionLog.create({
        taskId: "task-010",
        taskName: "Full Task",
        taskType: "manual",
        cronExpression: "0 */6 * * *",
        status: "running",
        inputParams: { key: "value" },
        triggeredBy: "admin",
        metadata: { source: "test" },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("日志已创建");
      expect(result.data).toHaveProperty("id", 10);
    });

    it("creates a log with defaults when minimal input provided", async () => {
      returningQueue.push([{ ...sampleLog, id: 11 }]);
      const result = await caller().taskExecutionLog.create({});
      expect(result.success).toBe(true);
      expect(result.message).toBe("日志已创建");
      expect(result.data).toHaveProperty("id", 11);
    });

    it("creates a log with only taskName", async () => {
      returningQueue.push([{ ...sampleLog, id: 12, taskName: "Custom Task" }]);
      const result = await caller().taskExecutionLog.create({
        taskName: "Custom Task",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("taskName", "Custom Task");
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates log status with string id", async () => {
      returningQueue.push([{ ...sampleLog, status: "failed" }]);
      const result = await caller().taskExecutionLog.update({
        id: "1",
        status: "failed",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("更新成功");
      expect(result.data).toHaveProperty("status", "failed");
    });

    it("updates log with numeric id", async () => {
      returningQueue.push([{ ...sampleLog, status: "completed" }]);
      const result = await caller().taskExecutionLog.update({
        id: 1,
        status: "completed",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("status", "completed");
    });

    it("updates endTime and duration", async () => {
      returningQueue.push([{
        ...sampleLog,
        endTime: "2026-02-28T01:00:00Z",
        duration: 3600,
      }]);
      const result = await caller().taskExecutionLog.update({
        id: "1",
        endTime: "2026-02-28T01:00:00Z",
        duration: 3600,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("duration", 3600);
    });

    it("updates error fields", async () => {
      returningQueue.push([{
        ...sampleLog,
        status: "failed",
        errorMessage: "Connection timeout",
        errorStack: "Error: Connection timeout\n  at ...",
      }]);
      const result = await caller().taskExecutionLog.update({
        id: "1",
        status: "failed",
        errorMessage: "Connection timeout",
        errorStack: "Error: Connection timeout\n  at ...",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("errorMessage", "Connection timeout");
      expect(result.data).toHaveProperty("errorStack", "Error: Connection timeout\n  at ...");
    });

    it("updates outputResult", async () => {
      returningQueue.push([{ ...sampleLog, outputResult: '{"processed":50}' }]);
      const result = await caller().taskExecutionLog.update({
        id: "1",
        outputResult: { processed: 50 },
      });
      expect(result.success).toBe(true);
    });

    it("updates with only id (no-op update)", async () => {
      returningQueue.push([sampleLog]);
      const result = await caller().taskExecutionLog.update({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("更新成功");
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes a log by string id", async () => {
      const result = await caller().taskExecutionLog.delete({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("删除成功");
    });

    it("returns success even for non-existent id", async () => {
      const result = await caller().taskExecutionLog.delete({ id: "999" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("删除成功");
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns all four stat counts", async () => {
      selectResultsQueue.push([{ count: 100 }]); // total
      selectResultsQueue.push([{ count: 5 }]);   // running
      selectResultsQueue.push([{ count: 80 }]);  // completed
      selectResultsQueue.push([{ count: 15 }]);  // failed
      const result = await caller().taskExecutionLog.getStats();
      expect(result.stats).toEqual({
        total: 100,
        running: 5,
        completed: 80,
        failed: 15,
      });
    });

    it("returns zeros when no logs exist", async () => {
      selectResultsQueue.push([{ count: 0 }]); // total
      selectResultsQueue.push([{ count: 0 }]); // running
      selectResultsQueue.push([{ count: 0 }]); // completed
      selectResultsQueue.push([{ count: 0 }]); // failed
      const result = await caller().taskExecutionLog.getStats();
      expect(result.stats).toEqual({
        total: 0,
        running: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  // ═══ exportCSV ═══
  describe("exportCSV", () => {
    it("returns logs data and empty url", async () => {
      selectResultsQueue.push([sampleLog, sampleLog2]);
      const result = await caller().taskExecutionLog.exportCSV();
      expect(result.url).toBe("");
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(sampleLog);
      expect(result.data[1]).toEqual(sampleLog2);
    });

    it("returns empty data array when no logs", async () => {
      selectResultsQueue.push([]);
      const result = await caller().taskExecutionLog.exportCSV();
      expect(result.url).toBe("");
      expect(result.data).toHaveLength(0);
    });
  });

  // ═══ cleanup ═══
  describe("cleanup", () => {
    it("cleans up logs with default 30 days", async () => {
      const result = await caller().taskExecutionLog.cleanup();
      expect(result.success).toBe(true);
      expect(result.message).toBe("已清理 30 天前的日志");
    });

    it("cleans up logs with custom daysToKeep", async () => {
      const result = await caller().taskExecutionLog.cleanup({ daysToKeep: 7 });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已清理 7 天前的日志");
    });

    it("cleans up logs with max daysToKeep (365)", async () => {
      const result = await caller().taskExecutionLog.cleanup({ daysToKeep: 365 });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已清理 365 天前的日志");
    });

    it("cleans up logs with min daysToKeep (1)", async () => {
      const result = await caller().taskExecutionLog.cleanup({ daysToKeep: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已清理 1 天前的日志");
    });

    it("uses default when empty object passed", async () => {
      const result = await caller().taskExecutionLog.cleanup({});
      expect(result.success).toBe(true);
      expect(result.message).toBe("已清理 30 天前的日志");
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().taskExecutionLog.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().taskExecutionLog.getById({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().taskExecutionLog.create({})).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().taskExecutionLog.update({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().taskExecutionLog.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().taskExecutionLog.getStats()).rejects.toThrow();
    });
    it("rejects anonymous for exportCSV", async () => {
      await expect(createAnonymousCaller().taskExecutionLog.exportCSV()).rejects.toThrow();
    });
    it("rejects anonymous for cleanup", async () => {
      await expect(createAnonymousCaller().taskExecutionLog.cleanup()).rejects.toThrow();
    });
  });
});
