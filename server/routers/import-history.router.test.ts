/**
 * Import History Router — Unit Tests
 * Tests 10 procedures: list, getById, create, update, delete,
 *   getHistory, getDetails, getStats, canRollback, rollback
 *
 * Standard DB-backed CRUD + rollback logic.
 * `getStats` does 4 sequential count queries.
 * `canRollback` checks status=completed and rollbackAt=null.
 * `rollback` checks existence, rollbackAt, then updates.
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
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

const sampleRecord = {
  id: 1,
  importType: "employee",
  fileName: "employees.xlsx",
  fileSize: 102400,
  filePath: "/uploads/employees.xlsx",
  totalRows: 50,
  successCount: 48,
  failedCount: 2,
  skippedCount: 0,
  fieldMapping: '{"name":"姓名","email":"邮箱"}',
  errorLog: null,
  importedData: null,
  status: "completed",
  createdBy: 1,
  rollbackAt: null,
  rollbackBy: null,
  createdAt: "2026-02-01T00:00:00.000Z",
};

describe("import-history router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns import records", async () => {
      selectResultsQueue.push([sampleRecord, { ...sampleRecord, id: 2 }]);
      const result = await caller().importHistory.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty when no records", async () => {
      selectResultsQueue.push([]);
      const result = await caller().importHistory.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns record by id", async () => {
      selectResultsQueue.push([sampleRecord]);
      const result = await caller().importHistory.getById({ id: "1" });
      expect(result).toBeTruthy();
      expect(result!.fileName).toBe("employees.xlsx");
    });

    it("returns null when not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().importHistory.getById({ id: "999" });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates record with defaults", async () => {
      returningQueue.push([{ ...sampleRecord, id: 10 }]);
      const result = await caller().importHistory.create({});
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
    });

    it("creates record with all fields", async () => {
      returningQueue.push([{ ...sampleRecord, id: 11 }]);
      const result = await caller().importHistory.create({
        importType: "employee",
        fileName: "test.xlsx",
        fileSize: 50000,
        filePath: "/uploads/test.xlsx",
        totalRows: 100,
        fieldMapping: { name: "姓名" },
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates record fields", async () => {
      returningQueue.push([{ ...sampleRecord, status: "completed" }]);
      const result = await caller().importHistory.update({
        id: 1,
        status: "completed",
        successCount: 48,
        failedCount: 2,
      });
      expect(result.success).toBe(true);
    });

    it("accepts string id", async () => {
      returningQueue.push([sampleRecord]);
      const result = await caller().importHistory.update({ id: "1", status: "failed" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes record", async () => {
      const result = await caller().importHistory.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getHistory ═══
  describe("getHistory", () => {
    it("returns recent history", async () => {
      selectResultsQueue.push([sampleRecord]);
      const result = await caller().importHistory.getHistory();
      expect(result).toHaveLength(1);
    });

    it("returns empty array when no history", async () => {
      selectResultsQueue.push([]);
      const result = await caller().importHistory.getHistory();
      expect(result).toEqual([]);
    });
  });

  // ═══ getDetails ═══
  describe("getDetails", () => {
    it("returns details for existing record", async () => {
      selectResultsQueue.push([sampleRecord]);
      const result = await caller().importHistory.getDetails({ id: 1 });
      expect(result.details).toBeTruthy();
      expect(result.details!.fileName).toBe("employees.xlsx");
    });

    it("returns null details when not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().importHistory.getDetails({ id: 999 });
      expect(result.details).toBeNull();
    });

    it("works with no input", async () => {
      selectResultsQueue.push([]);
      const result = await caller().importHistory.getDetails();
      expect(result.details).toBeNull();
    });

    it("accepts string id", async () => {
      selectResultsQueue.push([sampleRecord]);
      const result = await caller().importHistory.getDetails({ id: "1" });
      expect(result.details).toBeTruthy();
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns counts by status", async () => {
      selectResultsQueue.push([{ count: 50 }]);  // total
      selectResultsQueue.push([{ count: 5 }]);   // pending
      selectResultsQueue.push([{ count: 40 }]);  // completed
      selectResultsQueue.push([{ count: 5 }]);   // failed
      const result = await caller().importHistory.getStats();
      expect(result.total).toBe(50);
      expect(result.pending).toBe(5);
      expect(result.completed).toBe(40);
      expect(result.failed).toBe(5);
    });

    it("returns zeros when empty", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);
      const result = await caller().importHistory.getStats();
      expect(result.total).toBe(0);
    });
  });

  // ═══ canRollback ═══
  describe("canRollback", () => {
    it("returns true for completed record without rollback", async () => {
      selectResultsQueue.push([sampleRecord]); // status=completed, rollbackAt=null
      const result = await caller().importHistory.canRollback({ id: 1 });
      expect(result.canRollback).toBe(true);
    });

    it("returns false when record not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().importHistory.canRollback({ id: 999 });
      expect(result.canRollback).toBe(false);
      expect(result.reason).toContain("不存在");
    });

    it("returns false when status is not completed", async () => {
      selectResultsQueue.push([{ ...sampleRecord, status: "pending" }]);
      const result = await caller().importHistory.canRollback({ id: 1 });
      expect(result.canRollback).toBe(false);
      expect(result.reason).toContain("已完成");
    });

    it("returns false when already rolled back", async () => {
      selectResultsQueue.push([{ ...sampleRecord, rollbackAt: new Date() }]);
      const result = await caller().importHistory.canRollback({ id: 1 });
      expect(result.canRollback).toBe(false);
      expect(result.reason).toContain("回滚");
    });

    it("works with no input", async () => {
      selectResultsQueue.push([]);
      const result = await caller().importHistory.canRollback();
      expect(result.canRollback).toBe(false);
    });
  });

  // ═══ rollback ═══
  describe("rollback", () => {
    it("rolls back completed record", async () => {
      selectResultsQueue.push([sampleRecord]);
      returningQueue.push([{ ...sampleRecord, status: "rolled_back" }]);
      const result = await caller().importHistory.rollback({ id: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toContain("回滚成功");
    });

    it("returns failure when record not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().importHistory.rollback({ id: 999 });
      expect(result.success).toBe(false);
      expect(result.message).toContain("不存在");
    });

    it("returns failure when already rolled back", async () => {
      selectResultsQueue.push([{ ...sampleRecord, rollbackAt: new Date() }]);
      const result = await caller().importHistory.rollback({ id: 1 });
      expect(result.success).toBe(false);
      expect(result.message).toContain("回滚");
    });

    it("works with no input", async () => {
      selectResultsQueue.push([]);
      const result = await caller().importHistory.rollback();
      expect(result.success).toBe(false);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().importHistory.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().importHistory.getById({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().importHistory.create({})).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().importHistory.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().importHistory.getStats()).rejects.toThrow();
    });
    it("rejects anonymous for rollback", async () => {
      await expect(createAnonymousCaller().importHistory.rollback()).rejects.toThrow();
    });
  });
});
