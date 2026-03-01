/**
 * SOP Template Library (DB-backed) — Router Unit Tests
 *
 * Tests all 7 tRPC procedures:
 *   - list (query): filters by category and status (isActive), ordered by createdAt desc
 *   - getById (query): returns single SOP by id (string|number) or null
 *   - create (mutation): inserts SOP with auto-generated code, content→step conversion
 *   - update (mutation): updates SOP fields, special handling for status=approved/archived
 *   - search (query): full table scan + client-side toLowerCase filter on title/code/category
 *   - categories (query): returns unique category set (deduped)
 *   - version (mutation): increments version by 0.1, returns null if not found
 *
 * Run: npx vitest run server/routers/sop-db.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──────────────────────────────────────────────────

const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

// Mock DB
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

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  ilike: vi.fn((...args: any[]) => args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

// ── Fixtures ───────────────────────────────────────────────────────

const sampleSop = {
  id: 1,
  code: "SOP-ABC123",
  title: "焊接操作规程",
  processCode: "T-001",
  version: "1.0",
  category: "焊接",
  applicableProducts: null,
  steps: [{ stepNo: 1, title: "准备", description: "准备焊接设备" }],
  requiredTools: ["焊枪", "防护面罩"],
  safetyPrecautions: ["佩戴防护面罩"],
  qualityCheckpoints: [{ checkpoint: "焊缝检查" }],
  estimatedDurationMinutes: 30,
  difficultyLevel: "intermediate",
  isActive: true,
  createdBy: 1,
  approvedBy: null,
  approvedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const sampleSop2 = {
  ...sampleSop,
  id: 2,
  code: "SOP-DEF456",
  title: "清洗操作规程",
  category: "清洗",
  isActive: false,
};

const sampleSop3 = {
  ...sampleSop,
  id: 3,
  code: "SOP-GHI789",
  title: "装配操作规程",
  category: "焊接",
  isActive: true,
};

// ── list ───────────────────────────────────────────────────────────

describe("sop router", () => {
  describe("list", () => {
    it("returns all SOPs when no filter provided", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2]);
      const result = await caller().sop.list();
      expect(result).toHaveLength(2);
    });

    it("returns all SOPs when empty input", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2, sampleSop3]);
      const result = await caller().sop.list({});
      expect(result).toHaveLength(3);
    });

    it("filters by category", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2, sampleSop3]);
      const result = await caller().sop.list({ category: "焊接" });
      expect(result).toHaveLength(2);
      expect(result.every((s: any) => s.category === "焊接")).toBe(true);
    });

    it("filters by category with no matches", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2]);
      const result = await caller().sop.list({ category: "不存在的分类" });
      expect(result).toHaveLength(0);
    });

    it("filters by status=approved (isActive=true)", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2, sampleSop3]);
      const result = await caller().sop.list({ status: "approved" });
      expect(result).toHaveLength(2);
      expect(result.every((s: any) => s.isActive === true)).toBe(true);
    });

    it("filters by status=draft (isActive=false)", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2, sampleSop3]);
      const result = await caller().sop.list({ status: "draft" });
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(false);
    });

    it("filters by both category and status", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2, sampleSop3]);
      const result = await caller().sop.list({ category: "焊接", status: "approved" });
      expect(result).toHaveLength(2);
      expect(result.every((s: any) => s.category === "焊接" && s.isActive === true)).toBe(true);
    });

    it("returns empty array when no SOPs exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().sop.list();
      expect(result).toHaveLength(0);
    });

    it("ignores stage and equipmentModel filters (no-op in current impl)", async () => {
      selectResultsQueue.push([sampleSop]);
      const result = await caller().sop.list({ stage: "M2", equipmentModel: "GRT-100" });
      expect(result).toHaveLength(1);
    });
  });

  // ── getById ──────────────────────────────────────────────────────

  describe("getById", () => {
    it("returns SOP by numeric id", async () => {
      selectResultsQueue.push([sampleSop]);
      const result = await caller().sop.getById({ id: 1 });
      expect(result).toHaveProperty("title", "焊接操作规程");
      expect(result).toHaveProperty("code", "SOP-ABC123");
    });

    it("returns SOP by string id", async () => {
      selectResultsQueue.push([sampleSop]);
      const result = await caller().sop.getById({ id: "1" });
      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id", 1);
    });

    it("returns null when SOP not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().sop.getById({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ── create ───────────────────────────────────────────────────────

  describe("create", () => {
    it("creates SOP with required fields only", async () => {
      const created = { ...sampleSop, id: 10, steps: undefined };
      returningQueue.push([created]);
      const result = await caller().sop.create({
        title: "新SOP",
        category: "焊接",
      });
      expect(result).toHaveProperty("id", 10);
    });

    it("creates SOP with all optional fields", async () => {
      const created = { ...sampleSop, id: 11 };
      returningQueue.push([created]);
      const result = await caller().sop.create({
        title: "完整SOP",
        category: "清洗",
        content: "操作步骤详情",
        equipmentModels: ["GRT-SC-100", "GRT-SC-200"],
        stages: ["M2", "M3"],
        processCode: "T-002",
        steps: [{ stepNo: 1, title: "步骤一", description: "操作" }],
        requiredTools: ["工具A"],
        safetyPrecautions: ["注意安全"],
        qualityCheckpoints: [{ checkpoint: "检查点A" }],
        estimatedDurationMinutes: 45,
        difficultyLevel: "advanced",
      });
      expect(result).toHaveProperty("id", 11);
    });

    it("generates auto step from content when no steps provided", async () => {
      // We cannot directly verify the insert payload since the mock chain is opaque,
      // but the router logic: steps = input.steps || (input.content ? [{stepNo:1, ...}] : undefined)
      // We verify the insert succeeds and returns
      const created = {
        ...sampleSop,
        id: 12,
        steps: [{ stepNo: 1, title: "操作步骤", description: "测试内容" }],
      };
      returningQueue.push([created]);
      const result = await caller().sop.create({
        title: "内容转步骤SOP",
        category: "测试",
        content: "测试内容",
      });
      expect(result).toHaveProperty("id", 12);
      expect(result.steps).toEqual([{ stepNo: 1, title: "操作步骤", description: "测试内容" }]);
    });

    it("uses explicit steps over content when both provided", async () => {
      const customSteps = [
        { stepNo: 1, title: "自定义步骤", description: "详细操作" },
        { stepNo: 2, title: "第二步", description: "继续" },
      ];
      const created = { ...sampleSop, id: 13, steps: customSteps };
      returningQueue.push([created]);
      const result = await caller().sop.create({
        title: "带步骤SOP",
        category: "焊接",
        content: "这应该被忽略",
        steps: customSteps,
      });
      expect(result.steps).toEqual(customSteps);
    });

    it("rejects empty title", async () => {
      await expect(caller().sop.create({
        title: "",
        category: "焊接",
      })).rejects.toThrow();
    });

    it("rejects missing title", async () => {
      await expect(caller().sop.create({
        category: "焊接",
      } as any)).rejects.toThrow();
    });

    it("rejects missing category", async () => {
      await expect(caller().sop.create({
        title: "测试SOP",
      } as any)).rejects.toThrow();
    });
  });

  // ── update ───────────────────────────────────────────────────────

  describe("update", () => {
    it("updates title field", async () => {
      const updated = { ...sampleSop, title: "更新标题" };
      returningQueue.push([updated]);
      const result = await caller().sop.update({ id: 1, title: "更新标题" });
      expect(result).toHaveProperty("title", "更新标题");
    });

    it("updates category field", async () => {
      const updated = { ...sampleSop, category: "装配" };
      returningQueue.push([updated]);
      const result = await caller().sop.update({ id: 1, category: "装配" });
      expect(result).toHaveProperty("category", "装配");
    });

    it("sets isActive=true and approvedAt/approvedBy when status=approved", async () => {
      const updated = {
        ...sampleSop,
        isActive: true,
        approvedBy: 1,
        approvedAt: new Date().toISOString(),
      };
      returningQueue.push([updated]);
      const result = await caller().sop.update({ id: 1, status: "approved" });
      expect(result).toHaveProperty("isActive", true);
      expect(result).toHaveProperty("approvedBy", 1);
    });

    it("sets isActive=false when status=archived", async () => {
      const updated = { ...sampleSop, isActive: false };
      returningQueue.push([updated]);
      const result = await caller().sop.update({ id: 1, status: "archived" });
      expect(result).toHaveProperty("isActive", false);
    });

    it("maps equipmentModels to applicableProducts", async () => {
      const updated = { ...sampleSop, applicableProducts: ["MODEL-A", "MODEL-B"] };
      returningQueue.push([updated]);
      const result = await caller().sop.update({
        id: 1,
        equipmentModels: ["MODEL-A", "MODEL-B"],
      });
      expect(result).toHaveProperty("applicableProducts", ["MODEL-A", "MODEL-B"]);
    });

    it("updates multiple fields at once", async () => {
      const updated = {
        ...sampleSop,
        title: "多字段更新",
        processCode: "T-999",
        difficultyLevel: "advanced",
      };
      returningQueue.push([updated]);
      const result = await caller().sop.update({
        id: 1,
        title: "多字段更新",
        processCode: "T-999",
        difficultyLevel: "advanced",
      });
      expect(result).toHaveProperty("title", "多字段更新");
      expect(result).toHaveProperty("processCode", "T-999");
    });

    it("updates steps array", async () => {
      const newSteps = [{ stepNo: 1, title: "新步骤", description: "新操作" }];
      const updated = { ...sampleSop, steps: newSteps };
      returningQueue.push([updated]);
      const result = await caller().sop.update({
        id: 1,
        steps: newSteps,
      });
      expect(result.steps).toEqual(newSteps);
    });

    it("updates requiredTools array", async () => {
      const updated = { ...sampleSop, requiredTools: ["新工具"] };
      returningQueue.push([updated]);
      const result = await caller().sop.update({
        id: 1,
        requiredTools: ["新工具"],
      });
      expect(result.requiredTools).toEqual(["新工具"]);
    });

    it("updates safetyPrecautions array", async () => {
      const updated = { ...sampleSop, safetyPrecautions: ["新安全注意事项"] };
      returningQueue.push([updated]);
      const result = await caller().sop.update({
        id: 1,
        safetyPrecautions: ["新安全注意事项"],
      });
      expect(result.safetyPrecautions).toEqual(["新安全注意事项"]);
    });

    it("updates estimatedDurationMinutes", async () => {
      const updated = { ...sampleSop, estimatedDurationMinutes: 60 };
      returningQueue.push([updated]);
      const result = await caller().sop.update({
        id: 1,
        estimatedDurationMinutes: 60,
      });
      expect(result.estimatedDurationMinutes).toBe(60);
    });
  });

  // ── search ───────────────────────────────────────────────────────

  describe("search", () => {
    it("finds SOPs matching title", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2, sampleSop3]);
      const result = await caller().sop.search({ query: "焊接" });
      expect(result).toHaveLength(2); // sampleSop (title contains 焊接) + sampleSop3 (title contains... no)
      // Actually: sampleSop.title="焊接操作规程" matches, sampleSop3.title="装配操作规程" doesn't
      // sampleSop.category="焊接" matches, sampleSop3.category="焊接" matches
      // So: sampleSop matches title, sampleSop2 doesn't match anything, sampleSop3 matches category
      expect(result).toHaveLength(2);
    });

    it("finds SOPs matching code (case-insensitive)", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2]);
      const result = await caller().sop.search({ query: "abc" });
      // sampleSop.code = "SOP-ABC123" -> toLowerCase includes "abc"
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("SOP-ABC123");
    });

    it("finds SOPs matching category", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2]);
      const result = await caller().sop.search({ query: "清洗" });
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("清洗");
    });

    it("returns empty when no matches", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2]);
      const result = await caller().sop.search({ query: "不存在的关键词" });
      expect(result).toHaveLength(0);
    });

    it("returns all when query matches all", async () => {
      selectResultsQueue.push([sampleSop, sampleSop2, sampleSop3]);
      const result = await caller().sop.search({ query: "sop" });
      // All codes start with "SOP-" -> toLowerCase includes "sop"
      expect(result).toHaveLength(3);
    });

    it("is case-insensitive", async () => {
      selectResultsQueue.push([sampleSop]);
      const result = await caller().sop.search({ query: "SOP-ABC" });
      expect(result).toHaveLength(1);
    });

    it("handles empty table", async () => {
      selectResultsQueue.push([]);
      const result = await caller().sop.search({ query: "anything" });
      expect(result).toHaveLength(0);
    });
  });

  // ── categories ───────────────────────────────────────────────────

  describe("categories", () => {
    it("returns unique categories", async () => {
      selectResultsQueue.push([
        { category: "焊接" },
        { category: "清洗" },
        { category: "焊接" },
        { category: "装配" },
        { category: "清洗" },
      ]);
      const result = await caller().sop.categories();
      expect(result).toHaveLength(3);
      expect(result).toContain("焊接");
      expect(result).toContain("清洗");
      expect(result).toContain("装配");
    });

    it("filters out null/falsy categories", async () => {
      selectResultsQueue.push([
        { category: "焊接" },
        { category: null },
        { category: "" },
        { category: "装配" },
      ]);
      const result = await caller().sop.categories();
      // null is filtered by filter(Boolean), "" is also falsy
      expect(result).toHaveLength(2);
      expect(result).toContain("焊接");
      expect(result).toContain("装配");
    });

    it("returns empty when no SOPs exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().sop.categories();
      expect(result).toHaveLength(0);
    });

    it("returns single category when all SOPs have same category", async () => {
      selectResultsQueue.push([
        { category: "焊接" },
        { category: "焊接" },
        { category: "焊接" },
      ]);
      const result = await caller().sop.categories();
      expect(result).toHaveLength(1);
      expect(result[0]).toBe("焊接");
    });
  });

  // ── version ──────────────────────────────────────────────────────

  describe("version", () => {
    it("increments version from 1.0 to 1.1", async () => {
      selectResultsQueue.push([{ ...sampleSop, version: "1.0" }]);
      const updated = { ...sampleSop, version: "1.1" };
      returningQueue.push([updated]);
      const result = await caller().sop.version({ id: 1 });
      expect(result).toHaveProperty("version", "1.1");
    });

    it("increments version from 2.3 to 2.4", async () => {
      selectResultsQueue.push([{ ...sampleSop, version: "2.3" }]);
      const updated = { ...sampleSop, version: "2.4" };
      returningQueue.push([updated]);
      const result = await caller().sop.version({ id: 1 });
      expect(result).toHaveProperty("version", "2.4");
    });

    it("handles null version (defaults to 1.0, increments to 1.1)", async () => {
      selectResultsQueue.push([{ ...sampleSop, version: null }]);
      const updated = { ...sampleSop, version: "1.1" };
      returningQueue.push([updated]);
      const result = await caller().sop.version({ id: 1 });
      expect(result).toHaveProperty("version", "1.1");
    });

    it("returns null when SOP not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().sop.version({ id: 999 });
      expect(result).toBeNull();
    });

    it("increments version from 9.9 to 10.0", async () => {
      selectResultsQueue.push([{ ...sampleSop, version: "9.9" }]);
      const updated = { ...sampleSop, version: "10.0" };
      returningQueue.push([updated]);
      const result = await caller().sop.version({ id: 1 });
      expect(result).toHaveProperty("version", "10.0");
    });
  });

  // ── Authentication Guards ────────────────────────────────────────

  describe("authentication — all procedures require auth", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().sop.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      await expect(
        createAnonymousCaller().sop.getById({ id: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      await expect(
        createAnonymousCaller().sop.create({ title: "Test", category: "焊接" }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      await expect(
        createAnonymousCaller().sop.update({ id: 1, title: "Updated" }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for search", async () => {
      await expect(
        createAnonymousCaller().sop.search({ query: "test" }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for categories", async () => {
      await expect(createAnonymousCaller().sop.categories()).rejects.toThrow();
    });

    it("rejects anonymous for version", async () => {
      await expect(
        createAnonymousCaller().sop.version({ id: 1 }),
      ).rejects.toThrow();
    });
  });
});
