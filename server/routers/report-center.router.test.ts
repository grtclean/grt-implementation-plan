/**
 * Report Center Router — Unit Tests
 * Tests 6 procedures: list, get, create, update, delete, publish
 *
 * CRUD + publish for executive reports with JSON content blocks.
 * Uses ilike for search, and/or for filter composition.
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
  or: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  ilike: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleReport = {
  id: 1,
  title: "Q1 部门周报",
  authorId: 5,
  authorName: "张三",
  department: "研发部",
  reportType: "DEPT_WEEKLY",
  contentBlocks: [
    { type: "title", title: "本周进展" },
    { type: "text", content: "完成了3个模块" },
  ],
  status: "DRAFT",
  coverGradient: "from-blue-600 to-cyan-500",
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-15T00:00:00.000Z",
};

describe("report-center router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns all reports with no filters", async () => {
      selectResultsQueue.push([sampleReport, { ...sampleReport, id: 2, title: "Q2 报告" }]);
      const result = await caller().reportCenter.list();
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no reports", async () => {
      selectResultsQueue.push([]);
      const result = await caller().reportCenter.list();
      expect(result).toEqual([]);
    });

    it("works with no input", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().reportCenter.list();
      expect(result).toHaveLength(1);
    });

    it("accepts status filter", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().reportCenter.list({ status: "DRAFT" });
      expect(result).toHaveLength(1);
    });

    it("accepts reportType filter", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().reportCenter.list({ reportType: "DEPT_WEEKLY" });
      expect(result).toHaveLength(1);
    });

    it("accepts search filter", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().reportCenter.list({ search: "周报" });
      expect(result).toHaveLength(1);
    });

    it("accepts all filters combined", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().reportCenter.list({
        status: "DRAFT",
        reportType: "DEPT_WEEKLY",
        search: "周报",
      });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ get ═══
  describe("get", () => {
    it("returns report by numeric id", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().reportCenter.get({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.title).toBe("Q1 部门周报");
    });

    it("returns report by string id", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().reportCenter.get({ id: "1" });
      expect(result).toBeTruthy();
    });

    it("returns null when not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().reportCenter.get({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates report with minimum fields", async () => {
      returningQueue.push([{ ...sampleReport, id: 10 }]);
      const result = await caller().reportCenter.create({ title: "新报告" });
      expect(result).toBeTruthy();
      expect(result!.id).toBe(10);
    });

    it("creates report with all fields", async () => {
      returningQueue.push([{ ...sampleReport, id: 11 }]);
      const result = await caller().reportCenter.create({
        title: "完整报告",
        authorId: 5,
        authorName: "张三",
        department: "研发部",
        reportType: "EXEC_BRIEFING",
        contentBlocks: [{ type: "title", title: "标题" }],
        coverGradient: "from-red-500 to-pink-500",
      });
      expect(result).toBeTruthy();
    });

    it("rejects empty title", async () => {
      await expect(caller().reportCenter.create({ title: "" })).rejects.toThrow();
    });

    it("rejects invalid content block type", async () => {
      await expect(caller().reportCenter.create({
        title: "bad",
        contentBlocks: [{ type: "invalid" as any }],
      })).rejects.toThrow();
    });

    it("returns null when insert returns nothing", async () => {
      returningQueue.push([]);
      const result = await caller().reportCenter.create({ title: "ghost" });
      expect(result).toBeNull();
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates report fields", async () => {
      returningQueue.push([{ ...sampleReport, title: "已更新" }]);
      const result = await caller().reportCenter.update({
        id: 1,
        title: "已更新",
        department: "产品部",
      });
      expect(result).toBeTruthy();
      expect(result!.title).toBe("已更新");
    });

    it("accepts string id", async () => {
      returningQueue.push([sampleReport]);
      const result = await caller().reportCenter.update({ id: "1", title: "test" });
      expect(result).toBeTruthy();
    });

    it("returns null when report not found", async () => {
      returningQueue.push([]);
      const result = await caller().reportCenter.update({ id: 999, title: "ghost" });
      expect(result).toBeNull();
    });

    it("updates content blocks", async () => {
      returningQueue.push([{ ...sampleReport, contentBlocks: [{ type: "divider" }] }]);
      const result = await caller().reportCenter.update({
        id: 1,
        contentBlocks: [{ type: "divider" }],
      });
      expect(result).toBeTruthy();
    });

    it("updates status directly", async () => {
      returningQueue.push([{ ...sampleReport, status: "PUBLISHED" }]);
      const result = await caller().reportCenter.update({ id: 1, status: "PUBLISHED" });
      expect(result).toBeTruthy();
      expect(result!.status).toBe("PUBLISHED");
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes report and returns success", async () => {
      const result = await caller().reportCenter.delete({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("accepts string id", async () => {
      const result = await caller().reportCenter.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ publish ═══
  describe("publish", () => {
    it("publishes report by setting status to PUBLISHED", async () => {
      returningQueue.push([{ ...sampleReport, status: "PUBLISHED" }]);
      const result = await caller().reportCenter.publish({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.status).toBe("PUBLISHED");
    });

    it("accepts string id", async () => {
      returningQueue.push([{ ...sampleReport, status: "PUBLISHED" }]);
      const result = await caller().reportCenter.publish({ id: "1" });
      expect(result).toBeTruthy();
    });

    it("returns null when report not found", async () => {
      returningQueue.push([]);
      const result = await caller().reportCenter.publish({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().reportCenter.list()).rejects.toThrow();
    });
    it("rejects anonymous for get", async () => {
      await expect(createAnonymousCaller().reportCenter.get({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().reportCenter.create({ title: "X" })).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().reportCenter.update({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().reportCenter.delete({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for publish", async () => {
      await expect(createAnonymousCaller().reportCenter.publish({ id: 1 })).rejects.toThrow();
    });
  });
});
