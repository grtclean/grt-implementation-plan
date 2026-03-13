/**
 * Rule Template Router — Unit Tests
 * Tests 9 procedures: list, getById, getAll, create, update, delete,
 *   createRule, saveAsTemplate, initBuiltin
 *
 * Standard DB-backed CRUD for cost alert rule templates.
 * `list` uses sequential count + select (not Promise.all).
 * `saveAsTemplate` reads source rule then clones it.
 * `initBuiltin` checks count before seeding.
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

const caller = () => createAdminCaller();

const sampleTemplate = {
  id: 1,
  name: "预算超支80%告警",
  description: "预算使用超过80%时触发",
  templateType: "builtin",
  category: "budget",
  ruleConfig: JSON.stringify({ alertType: "budget_percent", threshold: 80 }),
  isActive: 1,
  usageCount: 5,
  createdBy: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
};

describe("rule-template router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns paginated templates", async () => {
      // First call: count, second: items
      selectResultsQueue.push([{ count: 2 }]);
      selectResultsQueue.push([sampleTemplate, { ...sampleTemplate, id: 2, name: "月度异常" }]);
      const result = await caller().ruleTemplate.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it("returns empty when no templates", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]);
      const result = await caller().ruleTemplate.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("respects limit/offset", async () => {
      selectResultsQueue.push([{ count: 10 }]);
      selectResultsQueue.push([sampleTemplate]);
      const result = await caller().ruleTemplate.list({ limit: 5, offset: 5 });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
    });

    it("works with no input", async () => {
      selectResultsQueue.push([{ count: 1 }]);
      selectResultsQueue.push([sampleTemplate]);
      const result = await caller().ruleTemplate.list();
      expect(result.items).toHaveLength(1);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns template by numeric id", async () => {
      selectResultsQueue.push([sampleTemplate]);
      const result = await caller().ruleTemplate.getById({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.name).toBe("预算超支80%告警");
    });

    it("returns template by string id", async () => {
      selectResultsQueue.push([sampleTemplate]);
      const result = await caller().ruleTemplate.getById({ id: "1" });
      expect(result).toBeTruthy();
    });

    it("returns null when not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().ruleTemplate.getById({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ═══ getAll ═══
  describe("getAll", () => {
    it("returns active templates sorted by usageCount", async () => {
      selectResultsQueue.push([sampleTemplate]);
      const result = await caller().ruleTemplate.getAll();
      expect(result).toHaveLength(1);
    });

    it("respects limit/offset", async () => {
      selectResultsQueue.push([sampleTemplate]);
      const result = await caller().ruleTemplate.getAll({ limit: 10, offset: 0 });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates template with defaults", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 10 }]);
      const result = await caller().ruleTemplate.create({});
      expect(result.success).toBe(true);
      expect(result.message).toContain("创建成功");
    });

    it("creates template with all fields", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 11 }]);
      const result = await caller().ruleTemplate.create({
        name: "自定义模板",
        description: "测试描述",
        templateType: "custom",
        category: "cost",
        ruleConfig: { alertType: "month_increase", threshold: 30 },
      });
      expect(result.success).toBe(true);
    });

    it("accepts string ruleConfig", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 12 }]);
      const result = await caller().ruleTemplate.create({
        ruleConfig: '{"alertType":"test"}',
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates template fields", async () => {
      returningQueue.push([{ ...sampleTemplate, name: "已更新" }]);
      const result = await caller().ruleTemplate.update({
        id: 1,
        name: "已更新",
        description: "新描述",
      });
      expect(result.success).toBe(true);
    });

    it("accepts string id", async () => {
      returningQueue.push([sampleTemplate]);
      const result = await caller().ruleTemplate.update({ id: "1", name: "test" });
      expect(result.success).toBe(true);
    });

    it("updates isActive boolean → number", async () => {
      returningQueue.push([{ ...sampleTemplate, isActive: 0 }]);
      const result = await caller().ruleTemplate.update({ id: 1, isActive: false });
      expect(result.success).toBe(true);
    });

    it("updates ruleConfig object", async () => {
      returningQueue.push([sampleTemplate]);
      const result = await caller().ruleTemplate.update({
        id: 1,
        ruleConfig: { alertType: "new_type" },
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes template", async () => {
      const result = await caller().ruleTemplate.delete({ id: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toContain("已删除");
    });

    it("accepts string id", async () => {
      const result = await caller().ruleTemplate.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ createRule ═══
  describe("createRule", () => {
    it("creates rule with defaults", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 20, templateType: "custom" }]);
      const result = await caller().ruleTemplate.createRule({});
      expect(result.success).toBe(true);
      expect(result.message).toContain("规则创建成功");
    });

    it("creates rule with all fields", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 21 }]);
      const result = await caller().ruleTemplate.createRule({
        name: "新规则",
        description: "说明",
        category: "cost",
        ruleConfig: { threshold: 50 },
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ saveAsTemplate ═══
  describe("saveAsTemplate", () => {
    it("clones rule as template", async () => {
      // First: select source rule
      selectResultsQueue.push([sampleTemplate]);
      // Then: insert cloned template
      returningQueue.push([{ ...sampleTemplate, id: 30, name: "预算超支80%告警 (模板)" }]);
      const result = await caller().ruleTemplate.saveAsTemplate({ ruleId: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toContain("模板");
    });

    it("uses id if ruleId not provided", async () => {
      selectResultsQueue.push([sampleTemplate]);
      returningQueue.push([{ ...sampleTemplate, id: 31 }]);
      const result = await caller().ruleTemplate.saveAsTemplate({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("returns failure when source rule not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().ruleTemplate.saveAsTemplate({ ruleId: 999 });
      expect(result.success).toBe(false);
      expect(result.message).toContain("不存在");
    });

    it("uses custom name if provided", async () => {
      selectResultsQueue.push([sampleTemplate]);
      returningQueue.push([{ ...sampleTemplate, id: 32, name: "自定义名称" }]);
      const result = await caller().ruleTemplate.saveAsTemplate({
        ruleId: 1,
        name: "自定义名称",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ initBuiltin ═══
  describe("initBuiltin", () => {
    it("skips when templates already exist", async () => {
      selectResultsQueue.push([{ count: 3 }]);
      const result = await caller().ruleTemplate.initBuiltin();
      expect(result.success).toBe(true);
      expect(result.message).toContain("已存在");
    });

    it("seeds builtin templates when empty", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      const result = await caller().ruleTemplate.initBuiltin();
      expect(result.success).toBe(true);
      expect(result.message).toContain("已初始化");
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().ruleTemplate.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().ruleTemplate.getById({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().ruleTemplate.create({})).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().ruleTemplate.update({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().ruleTemplate.delete({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for createRule", async () => {
      await expect(createAnonymousCaller().ruleTemplate.createRule({})).rejects.toThrow();
    });
    it("rejects anonymous for saveAsTemplate", async () => {
      await expect(createAnonymousCaller().ruleTemplate.saveAsTemplate({})).rejects.toThrow();
    });
    it("rejects anonymous for initBuiltin", async () => {
      await expect(createAnonymousCaller().ruleTemplate.initBuiltin()).rejects.toThrow();
    });
    it("rejects anonymous for getAll", async () => {
      await expect(createAnonymousCaller().ruleTemplate.getAll()).rejects.toThrow();
    });
  });
});
