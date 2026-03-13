/**
 * Process Notebook Router — Unit Tests
 * Tests 9 procedures: list, getById, create, update, delete,
 *   getByProcess, getNotebookWithEntries, addEntry, uploadFile
 *
 * Standard DB-backed CRUD. addEntry and uploadFile are placeholders.
 * getByProcess builds dynamic AND conditions from processType/processId.
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
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleNotebook = {
  id: 1,
  processType: "fmea",
  processId: "proc-123",
  processStep: "step-1",
  title: "FMEA分析笔记",
  status: "active",
  createdBy: 1,
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-15T00:00:00.000Z",
};

describe("process-notebook router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns notebooks", async () => {
      selectResultsQueue.push([sampleNotebook, { ...sampleNotebook, id: 2 }]);
      const result = await caller().processNotebook.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty when no notebooks", async () => {
      selectResultsQueue.push([]);
      const result = await caller().processNotebook.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns notebook by id", async () => {
      selectResultsQueue.push([sampleNotebook]);
      const result = await caller().processNotebook.getById({ id: "1" });
      expect(result).toBeTruthy();
      expect(result!.title).toBe("FMEA分析笔记");
    });

    it("returns null when not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().processNotebook.getById({ id: "999" });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates notebook with defaults", async () => {
      returningQueue.push([{ ...sampleNotebook, id: 10 }]);
      const result = await caller().processNotebook.create({});
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
    });

    it("creates notebook with all fields", async () => {
      returningQueue.push([{ ...sampleNotebook, id: 11 }]);
      const result = await caller().processNotebook.create({
        processType: "fmea",
        processId: "proc-456",
        processStep: "step-2",
        title: "新笔记",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates notebook fields", async () => {
      returningQueue.push([{ ...sampleNotebook, title: "已更新" }]);
      const result = await caller().processNotebook.update({
        id: 1,
        title: "已更新",
      });
      expect(result.success).toBe(true);
    });

    it("accepts string id", async () => {
      returningQueue.push([sampleNotebook]);
      const result = await caller().processNotebook.update({ id: "1", title: "test" });
      expect(result.success).toBe(true);
    });

    it("updates status", async () => {
      returningQueue.push([{ ...sampleNotebook, status: "archived" }]);
      const result = await caller().processNotebook.update({ id: 1, status: "archived" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(
        caller().processNotebook.update({ id: 1, status: "deleted" as any })
      ).rejects.toThrow();
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes notebook", async () => {
      const result = await caller().processNotebook.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getByProcess ═══
  describe("getByProcess", () => {
    it("returns notebook by processType", async () => {
      selectResultsQueue.push([sampleNotebook]);
      const result = await caller().processNotebook.getByProcess({
        processType: "fmea",
      });
      expect(result.notebook).toBeTruthy();
    });

    it("returns notebook by processId", async () => {
      selectResultsQueue.push([sampleNotebook]);
      const result = await caller().processNotebook.getByProcess({
        processId: "proc-123",
      });
      expect(result.notebook).toBeTruthy();
    });

    it("returns notebook by both fields", async () => {
      selectResultsQueue.push([sampleNotebook]);
      const result = await caller().processNotebook.getByProcess({
        processType: "fmea",
        processId: "proc-123",
      });
      expect(result.notebook).toBeTruthy();
    });

    it("returns null when neither field provided", async () => {
      const result = await caller().processNotebook.getByProcess({});
      expect(result.notebook).toBeNull();
    });

    it("returns null when not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().processNotebook.getByProcess({
        processType: "unknown",
      });
      expect(result.notebook).toBeNull();
    });

    it("works with no input", async () => {
      const result = await caller().processNotebook.getByProcess();
      expect(result.notebook).toBeNull();
    });
  });

  // ═══ getNotebookWithEntries ═══
  describe("getNotebookWithEntries", () => {
    it("returns notebook with empty entries", async () => {
      selectResultsQueue.push([sampleNotebook]);
      const result = await caller().processNotebook.getNotebookWithEntries({
        notebookId: 1,
      });
      expect(result.notebook).toBeTruthy();
      expect(result.entries).toEqual([]);
    });

    it("uses id when notebookId not provided", async () => {
      selectResultsQueue.push([sampleNotebook]);
      const result = await caller().processNotebook.getNotebookWithEntries({
        id: 1,
      });
      expect(result.notebook).toBeTruthy();
    });

    it("accepts string ids", async () => {
      selectResultsQueue.push([sampleNotebook]);
      const result = await caller().processNotebook.getNotebookWithEntries({
        notebookId: "1",
      });
      expect(result.notebook).toBeTruthy();
    });

    it("returns null notebook when not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().processNotebook.getNotebookWithEntries({
        notebookId: 999,
      });
      expect(result.notebook).toBeNull();
    });

    it("works with no input", async () => {
      selectResultsQueue.push([]);
      const result = await caller().processNotebook.getNotebookWithEntries();
      expect(result.notebook).toBeNull();
    });
  });

  // ═══ addEntry ═══
  describe("addEntry", () => {
    it("returns success placeholder", async () => {
      const result = await caller().processNotebook.addEntry({
        notebookId: 1,
        title: "新条目",
        content: "内容",
        entryType: "note",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id");
    });

    it("works with minimal input", async () => {
      const result = await caller().processNotebook.addEntry({});
      expect(result.success).toBe(true);
    });
  });

  // ═══ uploadFile ═══
  describe("uploadFile", () => {
    it("returns empty url placeholder", async () => {
      const result = await caller().processNotebook.uploadFile({
        notebookId: 1,
        fileName: "test.pdf",
        fileSize: 1024,
        fileType: "application/pdf",
      });
      expect(result.url).toBe("");
    });

    it("works with no input", async () => {
      const result = await caller().processNotebook.uploadFile();
      expect(result.url).toBe("");
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().processNotebook.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().processNotebook.getById({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().processNotebook.create({})).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().processNotebook.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for addEntry", async () => {
      await expect(createAnonymousCaller().processNotebook.addEntry({})).rejects.toThrow();
    });
    it("rejects anonymous for uploadFile", async () => {
      await expect(createAnonymousCaller().processNotebook.uploadFile()).rejects.toThrow();
    });
  });
});
