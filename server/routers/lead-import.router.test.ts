/**
 * Lead Import Router — Unit Tests
 * Tests 3 procedures: getImportHistory, import, importFromCSV
 *
 * DB-backed with leadImportLogs table.
 * import and importFromCSV use .returning().
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, returningQueue } = vi.hoisted(() => ({
  selectResultsQueue: [] as any[][],
  returningQueue: [] as any[][],
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
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
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleLog = {
  id: 1,
  userId: 1,
  fileName: "leads.csv",
  totalRows: 100,
  successCount: 95,
  failedCount: 5,
  status: "completed",
  createdAt: "2026-03-01T00:00:00.000Z",
};

describe("lead-import router", () => {

  describe("getImportHistory", () => {
    it("returns import logs", async () => {
      selectResultsQueue.push([sampleLog, { ...sampleLog, id: 2 }]);
      const result = await caller().leadImport.getImportHistory();
      expect(result).toHaveLength(2);
    });

    it("returns empty when no history", async () => {
      selectResultsQueue.push([]);
      const result = await caller().leadImport.getImportHistory();
      expect(result).toEqual([]);
    });
  });

  describe("import", () => {
    it("creates import log with all fields", async () => {
      returningQueue.push([{ ...sampleLog, id: 10, status: "processing" }]);
      const result = await caller().leadImport.import({
        fileName: "new-leads.csv",
        totalRows: 50,
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
    });

    it("creates import log with just fileName", async () => {
      returningQueue.push([{ ...sampleLog, id: 11, totalRows: 0 }]);
      const result = await caller().leadImport.import({ fileName: "test.xlsx" });
      expect(result.success).toBe(true);
    });
  });

  describe("importFromCSV", () => {
    it("creates import log with data array", async () => {
      returningQueue.push([{ ...sampleLog, id: 20, status: "completed" }]);
      const result = await caller().leadImport.importFromCSV({
        fileName: "leads.csv",
        data: [{ name: "张三", email: "z@test.com" }, { name: "李四", email: "l@test.com" }],
        totalRows: 2,
      });
      expect(result.success).toBe(true);
    });

    it("creates import log with just fileName", async () => {
      returningQueue.push([{ ...sampleLog, id: 21 }]);
      const result = await caller().leadImport.importFromCSV({ fileName: "test.csv" });
      expect(result.success).toBe(true);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for getImportHistory", async () => {
      await expect(createAnonymousCaller().leadImport.getImportHistory()).rejects.toThrow();
    });
    it("rejects anonymous for import", async () => {
      await expect(createAnonymousCaller().leadImport.import({ fileName: "x" })).rejects.toThrow();
    });
    it("rejects anonymous for importFromCSV", async () => {
      await expect(createAnonymousCaller().leadImport.importFromCSV({ fileName: "x" })).rejects.toThrow();
    });
  });
});
