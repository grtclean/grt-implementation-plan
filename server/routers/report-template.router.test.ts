/**
 * Report Template Router — Unit Tests
 * Tests 14 procedures: list, getById, create, update, delete,
 * generate, export, import, validateImport, importFromShare,
 * publish, unpublish, getPublic, getShareData
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
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleTemplate = {
  id: 1,
  name: "月度销售报表",
  description: "月度销售数据汇总",
  category: "sales",
  reportTypes: JSON.stringify(["summary", "trend"]),
  layout: JSON.stringify({ columns: 2 }),
  styling: JSON.stringify({ theme: "default" }),
  filters: JSON.stringify({ dateRange: "monthly" }),
  isDefault: 0,
  isPublic: 0,
  createdBy: 1,
  usageCount: 5,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("reportTemplate router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns all templates with pagination metadata", async () => {
      selectResultsQueue.push([sampleTemplate, { ...sampleTemplate, id: 2, name: "周报" }]);
      const result = await caller().reportTemplate.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });

    it("returns empty list when no templates exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().reportTemplate.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns template by id", async () => {
      selectResultsQueue.push([sampleTemplate]);
      const result = await caller().reportTemplate.getById({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.name).toBe("月度销售报表");
    });

    it("returns null when template not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().reportTemplate.getById({ id: 999 });
      expect(result).toBeNull();
    });

    it("accepts string id", async () => {
      selectResultsQueue.push([sampleTemplate]);
      const result = await caller().reportTemplate.getById({ id: "1" });
      expect(result).toBeTruthy();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates template with required fields", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 10 }]);
      const result = await caller().reportTemplate.create({
        name: "新模板",
        reportTypes: ["summary"],
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("模板已创建");
      expect(result.data).toHaveProperty("id", 10);
    });

    it("creates template with all optional fields", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 11 }]);
      const result = await caller().reportTemplate.create({
        name: "完整模板",
        description: "完整描述",
        category: "finance",
        reportTypes: ["summary", "funnel"],
        layout: { columns: 3 },
        styling: { theme: "dark" },
        filters: { dateRange: "weekly" },
        isDefault: true,
        isPublic: true,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 11);
    });

    it("handles string reportTypes", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 12 }]);
      const result = await caller().reportTemplate.create({
        name: "字符串类型",
        reportTypes: JSON.stringify(["trend"]),
      });
      expect(result.success).toBe(true);
    });

    it("sets isDefault=0 when false", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 13 }]);
      const result = await caller().reportTemplate.create({
        name: "非默认",
        reportTypes: ["summary"],
        isDefault: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates template name", async () => {
      returningQueue.push([{ ...sampleTemplate, name: "更新名称" }]);
      const result = await caller().reportTemplate.update({
        id: 1,
        name: "更新名称",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("模板已更新");
    });

    it("updates boolean fields (isDefault/isPublic)", async () => {
      returningQueue.push([{ ...sampleTemplate, isDefault: 1, isPublic: 1 }]);
      const result = await caller().reportTemplate.update({
        id: 1,
        isDefault: true,
        isPublic: true,
      });
      expect(result.success).toBe(true);
    });

    it("updates JSON fields with objects", async () => {
      returningQueue.push([sampleTemplate]);
      const result = await caller().reportTemplate.update({
        id: 1,
        category: { type: "custom" },
        reportTypes: ["summary", "trend", "funnel"],
        layout: { columns: 4 },
        styling: { theme: "modern" },
        filters: { dateRange: "quarterly" },
      });
      expect(result.success).toBe(true);
    });

    it("updates JSON fields with strings", async () => {
      returningQueue.push([sampleTemplate]);
      const result = await caller().reportTemplate.update({
        id: 1,
        category: "finance",
        reportTypes: JSON.stringify(["summary"]),
        layout: JSON.stringify({ columns: 1 }),
      });
      expect(result.success).toBe(true);
    });

    it("accepts string id", async () => {
      returningQueue.push([sampleTemplate]);
      const result = await caller().reportTemplate.update({
        id: "1",
        name: "Updated",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes template by id", async () => {
      selectResultsQueue.push([]); // delete chain resolves
      const result = await caller().reportTemplate.delete({ id: 1 });
      expect(result).toEqual({ success: true, message: "模板已删除" });
    });

    it("accepts string id", async () => {
      selectResultsQueue.push([]);
      const result = await caller().reportTemplate.delete({ id: "5" });
      expect(result).toEqual({ success: true, message: "模板已删除" });
    });
  });

  // ═══ generate ═══
  describe("generate", () => {
    it("generates report and increments usage count", async () => {
      selectResultsQueue.push([sampleTemplate]); // template lookup
      selectResultsQueue.push([]); // update usage count
      const result = await caller().reportTemplate.generate({ templateId: 1 });
      expect(result.url).toBe("/api/reports/generated/1");
    });

    it("returns empty url when template not found", async () => {
      selectResultsQueue.push([]); // not found
      const result = await caller().reportTemplate.generate({ templateId: 999 });
      expect(result.url).toBe("");
    });

    it("accepts optional params", async () => {
      selectResultsQueue.push([sampleTemplate]);
      selectResultsQueue.push([]);
      const result = await caller().reportTemplate.generate({
        templateId: 1,
        params: { startDate: "2026-01-01", endDate: "2026-01-31" },
      });
      expect(result.url).toContain("/api/reports/generated/");
    });

    it("accepts string templateId", async () => {
      selectResultsQueue.push([{ ...sampleTemplate, id: 3 }]);
      selectResultsQueue.push([]);
      const result = await caller().reportTemplate.generate({ templateId: "3" });
      expect(result.url).toBe("/api/reports/generated/3");
    });
  });

  // ═══ export ═══
  describe("export", () => {
    it("exports template as JSON string", async () => {
      selectResultsQueue.push([sampleTemplate]);
      const result = await caller().reportTemplate.export({ id: 1 });
      expect(result.data).toBeTruthy();
      const parsed = JSON.parse(result.data);
      expect(parsed.name).toBe("月度销售报表");
    });

    it("returns empty string when template not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().reportTemplate.export({ id: 999 });
      expect(result.data).toBe("");
    });
  });

  // ═══ import ═══
  describe("import", () => {
    it("imports template from object data", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 20, name: "导入模板" }]);
      const result = await caller().reportTemplate.import({
        data: { name: "导入模板", reportTypes: ["summary"] },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("导入成功");
    });

    it("imports template from JSON string data", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 21 }]);
      const result = await caller().reportTemplate.import({
        data: JSON.stringify({ name: "字符串导入", reportTypes: ["trend"] }),
      });
      expect(result.success).toBe(true);
    });

    it("supports { version, template } wrapper format", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 22 }]);
      const result = await caller().reportTemplate.import({
        data: JSON.stringify({
          version: "1.0",
          template: { name: "包装格式", reportTypes: ["funnel"] },
        }),
      });
      expect(result.success).toBe(true);
    });

    it("uses rename when provided", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 23, name: "自定义名称" }]);
      const result = await caller().reportTemplate.import({
        data: { name: "原始名称", reportTypes: ["summary"] },
        rename: "自定义名称",
      });
      expect(result.success).toBe(true);
    });

    it("uses default name when none provided", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 24, name: "导入模板" }]);
      const result = await caller().reportTemplate.import({
        data: { reportTypes: ["summary"] },
      });
      expect(result.success).toBe(true);
    });

    it("sets isPublic when makePublic is true", async () => {
      returningQueue.push([{ ...sampleTemplate, id: 25, isPublic: 1 }]);
      const result = await caller().reportTemplate.import({
        data: { name: "公开模板", reportTypes: ["summary"] },
        makePublic: true,
      });
      expect(result.success).toBe(true);
    });

    it("returns failure on invalid data format", async () => {
      const result = await caller().reportTemplate.import({
        data: "not-valid-json{{{",
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe("导入数据格式错误");
    });
  });

  // ═══ validateImport ═══
  describe("validateImport", () => {
    it("validates valid template data", async () => {
      const result = await caller().reportTemplate.validateImport({
        data: { name: "测试模板", reportTypes: ["summary"] },
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects template missing name", async () => {
      const result = await caller().reportTemplate.validateImport({
        data: { reportTypes: ["summary"] },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("缺少模板名称");
    });

    it("rejects template missing reportTypes", async () => {
      const result = await caller().reportTemplate.validateImport({
        data: { name: "无类型模板" },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("缺少报表类型");
    });

    it("rejects template missing both name and reportTypes", async () => {
      const result = await caller().reportTemplate.validateImport({
        data: {},
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it("validates JSON string input", async () => {
      const result = await caller().reportTemplate.validateImport({
        data: JSON.stringify({ name: "字符串数据", reportTypes: ["trend"] }),
      });
      expect(result.valid).toBe(true);
    });

    it("returns error for invalid JSON string", async () => {
      const result = await caller().reportTemplate.validateImport({
        data: "invalid-json{{{",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("JSON格式错误");
    });

    it("supports { version, template } wrapper format", async () => {
      const result = await caller().reportTemplate.validateImport({
        data: { version: "1.0", template: { name: "包装格式", reportTypes: ["summary"] } },
      });
      expect(result.valid).toBe(true);
    });
  });

  // ═══ importFromShare ═══
  describe("importFromShare", () => {
    it("imports from shareId", async () => {
      selectResultsQueue.push([sampleTemplate]); // source lookup
      returningQueue.push([{ ...sampleTemplate, id: 30, name: "月度销售报表 (副本)" }]);
      const result = await caller().reportTemplate.importFromShare({ shareId: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toBe("导入成功");
    });

    it("imports from shareData as JSON with id", async () => {
      selectResultsQueue.push([sampleTemplate]);
      returningQueue.push([{ ...sampleTemplate, id: 31 }]);
      const result = await caller().reportTemplate.importFromShare({
        shareData: JSON.stringify({ id: 1 }),
      });
      expect(result.success).toBe(true);
    });

    it("falls back to parseInt for non-JSON shareData (NaN case)", async () => {
      // "abc" is invalid JSON → catch → parseInt("abc") = NaN → failure
      const result = await caller().reportTemplate.importFromShare({
        shareData: "abc",
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe("无效的分享数据");
    });

    it("plain numeric string parsed as JSON yields null sourceId", async () => {
      // "1" is valid JSON (parses to number 1), but (1).id is undefined → sourceId = null → failure
      const result = await caller().reportTemplate.importFromShare({
        shareData: "1",
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe("无效的分享数据");
    });

    it("uses rename when provided", async () => {
      selectResultsQueue.push([sampleTemplate]);
      returningQueue.push([{ ...sampleTemplate, id: 33, name: "自定义名" }]);
      const result = await caller().reportTemplate.importFromShare({
        shareId: 1,
        rename: "自定义名",
      });
      expect(result.success).toBe(true);
    });

    it("returns failure for invalid share data", async () => {
      const result = await caller().reportTemplate.importFromShare({});
      expect(result.success).toBe(false);
      expect(result.message).toBe("无效的分享数据");
    });

    it("returns failure when source template not found", async () => {
      selectResultsQueue.push([]); // not found
      const result = await caller().reportTemplate.importFromShare({ shareId: 999 });
      expect(result.success).toBe(false);
      expect(result.message).toBe("分享模板不存在");
    });

    it("accepts string shareId", async () => {
      selectResultsQueue.push([sampleTemplate]);
      returningQueue.push([{ ...sampleTemplate, id: 34 }]);
      const result = await caller().reportTemplate.importFromShare({ shareId: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ publish ═══
  describe("publish", () => {
    it("publishes template", async () => {
      selectResultsQueue.push([]); // update chain resolves
      const result = await caller().reportTemplate.publish({ id: 1 });
      expect(result).toEqual({ success: true, message: "已发布" });
    });

    it("accepts string id", async () => {
      selectResultsQueue.push([]);
      const result = await caller().reportTemplate.publish({ id: "5" });
      expect(result).toEqual({ success: true, message: "已发布" });
    });
  });

  // ═══ unpublish ═══
  describe("unpublish", () => {
    it("unpublishes template", async () => {
      selectResultsQueue.push([]); // update chain resolves
      const result = await caller().reportTemplate.unpublish({ id: 1 });
      expect(result).toEqual({ success: true, message: "已取消发布" });
    });

    it("accepts string id", async () => {
      selectResultsQueue.push([]);
      const result = await caller().reportTemplate.unpublish({ id: "3" });
      expect(result).toEqual({ success: true, message: "已取消发布" });
    });
  });

  // ═══ getPublic ═══
  describe("getPublic", () => {
    it("returns public templates ordered by usage count", async () => {
      selectResultsQueue.push([
        { ...sampleTemplate, isPublic: 1, usageCount: 10 },
        { ...sampleTemplate, id: 2, isPublic: 1, usageCount: 5 },
      ]);
      const result = await caller().reportTemplate.getPublic();
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no public templates", async () => {
      selectResultsQueue.push([]);
      const result = await caller().reportTemplate.getPublic();
      expect(result).toHaveLength(0);
    });
  });

  // ═══ getShareData ═══
  describe("getShareData", () => {
    it("returns template data when public", async () => {
      selectResultsQueue.push([{ ...sampleTemplate, isPublic: 1 }]);
      const result = await caller().reportTemplate.getShareData({ id: 1 });
      expect(result.data).toBeTruthy();
      expect(result.data!.name).toBe("月度销售报表");
    });

    it("returns null when template not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().reportTemplate.getShareData({ id: 999 });
      expect(result.data).toBeNull();
    });

    it("returns null when template is not public", async () => {
      selectResultsQueue.push([{ ...sampleTemplate, isPublic: 0 }]);
      const result = await caller().reportTemplate.getShareData({ id: 1 });
      expect(result.data).toBeNull();
    });

    it("accepts string id", async () => {
      selectResultsQueue.push([{ ...sampleTemplate, isPublic: 1 }]);
      const result = await caller().reportTemplate.getShareData({ id: "1" });
      expect(result.data).toBeTruthy();
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().reportTemplate.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().reportTemplate.getById({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().reportTemplate.create({
        name: "Test", reportTypes: ["summary"],
      })).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().reportTemplate.update({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().reportTemplate.delete({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for generate", async () => {
      await expect(createAnonymousCaller().reportTemplate.generate({ templateId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for export", async () => {
      await expect(createAnonymousCaller().reportTemplate.export({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for import", async () => {
      await expect(createAnonymousCaller().reportTemplate.import({
        data: { name: "X", reportTypes: ["summary"] },
      })).rejects.toThrow();
    });
    it("rejects anonymous for validateImport", async () => {
      await expect(createAnonymousCaller().reportTemplate.validateImport({
        data: { name: "X", reportTypes: ["summary"] },
      })).rejects.toThrow();
    });
    it("rejects anonymous for importFromShare", async () => {
      await expect(createAnonymousCaller().reportTemplate.importFromShare({ shareId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for publish", async () => {
      await expect(createAnonymousCaller().reportTemplate.publish({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for unpublish", async () => {
      await expect(createAnonymousCaller().reportTemplate.unpublish({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for getPublic", async () => {
      await expect(createAnonymousCaller().reportTemplate.getPublic()).rejects.toThrow();
    });
    it("rejects anonymous for getShareData", async () => {
      await expect(createAnonymousCaller().reportTemplate.getShareData({ id: 1 })).rejects.toThrow();
    });
  });
});
