/**
 * Excellence Culture Router — Unit Tests
 * Tests 3 procedures: getModel, uploadCsv, analyzeAlignment
 *
 * This router uses in-memory state (currentModel), no DB.
 * Module-level state persists across tests: uploadCsv modifies currentModel.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => {
  vi.clearAllMocks();
});

const caller = () => createAuthenticatedCaller();

describe("excellence-culture router", () => {

  // ═══ getModel ═══
  describe("getModel", () => {
    it("returns the seed model with 6 pillars", async () => {
      const result = await caller().excellenceCulture.getModel();
      expect(result).toHaveProperty("version", "2.0");
      expect(result).toHaveProperty("updatedBy", "CEO");
      expect(result.pillars).toHaveLength(6);
    });

    it("pillars have correct structure", async () => {
      const result = await caller().excellenceCulture.getModel();
      const first = result.pillars[0];
      expect(first).toHaveProperty("id", "customer");
      expect(first).toHaveProperty("name", "客户至上");
      expect(first).toHaveProperty("nameEn", "Customer First");
      expect(first).toHaveProperty("color");
      expect(first).toHaveProperty("icon");
      expect(first).toHaveProperty("score");
      expect(first).toHaveProperty("targetScore");
      expect(first.behaviors).toHaveLength(4);
    });

    it("behaviors have weights summing to 100", async () => {
      const result = await caller().excellenceCulture.getModel();
      for (const pillar of result.pillars) {
        const totalWeight = pillar.behaviors.reduce((s: number, b: any) => s + b.weight, 0);
        expect(totalWeight).toBe(100);
      }
    });
  });

  // ═══ uploadCsv ═══
  describe("uploadCsv", () => {
    it("rejects non-director roles (level < 5)", async () => {
      await expect(caller().excellenceCulture.uploadCsv({
        csvContent: "pillar,behavior,description,score,target,weight\nTest,B1,Desc,80,90,50",
        userRole: "employee",
      })).rejects.toThrow(/Only directors/);
    });

    it("rejects dept_manager (level 3)", async () => {
      await expect(caller().excellenceCulture.uploadCsv({
        csvContent: "pillar,behavior\nA,B",
        userRole: "dept_manager",
      })).rejects.toThrow(/Only directors/);
    });

    it("accepts director role (level 5)", async () => {
      const csv = "pillar,behavior,description,score,target,weight\nLeadership,Visionary,Sets long-term goals,85,95,50\nLeadership,Decisive,Makes timely decisions,85,95,50";
      const result = await caller().excellenceCulture.uploadCsv({
        csvContent: csv,
        userRole: "director",
      });
      expect(result.success).toBe(true);
      expect(result.pillarCount).toBe(1);
    });

    it("accepts admin role (level 10)", async () => {
      const csv = "pillar,behavior\nPillarA,Behavior1\nPillarA,Behavior2\nPillarB,Behavior3";
      const result = await caller().excellenceCulture.uploadCsv({
        csvContent: csv,
        userRole: "admin",
      });
      expect(result.success).toBe(true);
      expect(result.pillarCount).toBe(2);
    });

    it("updates the model (getModel returns new data after upload)", async () => {
      const csv = "pillar,behavior,description,score,target,weight\nCustom,CustomBehavior,CustomDesc,70,80,100";
      await caller().excellenceCulture.uploadCsv({
        csvContent: csv,
        userRole: "admin",
      });
      const model = await caller().excellenceCulture.getModel();
      expect(model.pillars).toHaveLength(1);
      expect(model.pillars[0].name).toBe("Custom");
      expect(model.pillars[0].behaviors[0].name).toBe("CustomBehavior");
    });

    it("rejects CSV too short", async () => {
      await expect(caller().excellenceCulture.uploadCsv({
        csvContent: "short",
        userRole: "admin",
      })).rejects.toThrow();
    });

    it("handles CSV with Chinese headers", async () => {
      const csv = "维度,行为,描述,评分,目标,权重\n客户服务,主动沟通,及时回复,88,95,100";
      const result = await caller().excellenceCulture.uploadCsv({
        csvContent: csv,
        userRole: "admin",
      });
      expect(result.success).toBe(true);
      expect(result.pillarCount).toBe(1);
    });

    it("defaults to employee role when userRole is omitted", async () => {
      const csv = "pillar,behavior\nA,B1\nA,B2\nA,B3";
      await expect(caller().excellenceCulture.uploadCsv({
        csvContent: csv,
      })).rejects.toThrow(/Only directors/);
    });
  });

  // ═══ analyzeAlignment ═══
  describe("analyzeAlignment", () => {
    it("returns alignment analysis structure", async () => {
      // First restore the model so we have pillars to analyze
      const csv = "pillar,behavior,description,score,target\nQuality,ZeroDefect,Perfect quality,90,98\nTeam,Collab,Work together,80,92";
      await caller().excellenceCulture.uploadCsv({ csvContent: csv, userRole: "admin" });

      const result = await caller().excellenceCulture.analyzeAlignment({
        employeeName: "张三",
      });
      expect(result).toHaveProperty("employeeName", "张三");
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("overallGrade");
      expect(result).toHaveProperty("generatedAt");
      expect(result).toHaveProperty("aiModel");
      expect(result).toHaveProperty("analysis");
      expect(result).toHaveProperty("summary");
      expect(result.analysis).toHaveLength(2);
    });

    it("analysis items have expected fields", async () => {
      const result = await caller().excellenceCulture.analyzeAlignment({});
      for (const item of result.analysis) {
        expect(item).toHaveProperty("pillarId");
        expect(item).toHaveProperty("pillarName");
        expect(item).toHaveProperty("alignmentScore");
        expect(item).toHaveProperty("targetScore");
        expect(item).toHaveProperty("gap");
        expect(item).toHaveProperty("recommendation");
        expect(item).toHaveProperty("strengths");
        expect(item).toHaveProperty("improvements");
      }
    });

    it("overallGrade is A/B/C/D", async () => {
      const result = await caller().excellenceCulture.analyzeAlignment({});
      expect(["A", "B", "C", "D"]).toContain(result.overallGrade);
    });

    it("defaults employeeName to '当前用户'", async () => {
      const result = await caller().excellenceCulture.analyzeAlignment({});
      expect(result.employeeName).toBe("当前用户");
    });

    it("alignment scores are between 60-90", async () => {
      const result = await caller().excellenceCulture.analyzeAlignment({});
      for (const item of result.analysis) {
        expect(item.alignmentScore).toBeGreaterThanOrEqual(60);
        expect(item.alignmentScore).toBeLessThanOrEqual(90);
      }
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getModel", async () => {
      await expect(createAnonymousCaller().excellenceCulture.getModel()).rejects.toThrow();
    });
    it("rejects anonymous for uploadCsv", async () => {
      await expect(createAnonymousCaller().excellenceCulture.uploadCsv({
        csvContent: "pillar,behavior\nA,B",
      })).rejects.toThrow();
    });
    it("rejects anonymous for analyzeAlignment", async () => {
      await expect(createAnonymousCaller().excellenceCulture.analyzeAlignment({})).rejects.toThrow();
    });
  });
});
