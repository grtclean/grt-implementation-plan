/**
 * Questionnaire Router -- Unit Tests
 *
 * Tests all 11 procedures:
 *   Queries:    list, getById, getAiAnalysis, getFormOptions, getStats
 *   Mutations:  create, update, submit, review, triggerAiAnalysis, convertToProject
 *
 * The router uses in-memory mock data (not a real DB), so no ../db mock is
 * needed. Every procedure is a protectedProcedure, so anonymous callers must
 * be rejected.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => {
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════
// QUERY PROCEDURES
// ════════════════════════════════════════════════════════════

describe("questionnaire router", () => {
  // ─── list ────────────────────────────────────────────────
  describe("list", () => {
    it("returns all questionnaires when no filters are given", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("pageSize");
      expect(result).toHaveProperty("totalPages");
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it("returns all questionnaires when input is undefined", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list(undefined);
      expect(result.total).toBe(2);
    });

    it("returns empty input object without filters", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({});
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it("filters by status APPROVED", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ status: "APPROVED" });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe("APPROVED");
      expect(result.items[0].questionnaireNo).toBe("QN-2026-001");
    });

    it("filters by status UNDER_REVIEW", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ status: "UNDER_REVIEW" });
      expect(result.total).toBe(1);
      expect(result.items[0].questionnaireNo).toBe("QN-2026-002");
    });

    it("filters by status with no matches returns empty", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ status: "DRAFT" });
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
      expect(result.totalPages).toBe(0);
    });

    it("searches by questionnaire number", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ search: "QN-2026-001" });
      expect(result.total).toBe(1);
      expect(result.items[0].questionnaireNo).toBe("QN-2026-001");
    });

    it("searches by company name", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ search: "精密机械" });
      expect(result.total).toBe(1);
      expect(result.items[0].company).toBe("精密机械有限公司");
    });

    it("searches by project name", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ search: "超声波" });
      expect(result.total).toBe(1);
      expect(result.items[0].projectName).toContain("超声波");
    });

    it("searches by contact person", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ search: "张工" });
      expect(result.total).toBe(1);
      expect(result.items[0].contactPerson).toBe("张工");
    });

    it("search is case-insensitive", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ search: "qn-2026" });
      expect(result.total).toBe(2);
    });

    it("search with no matches returns empty", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ search: "nonexistent" });
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it("respects page and pageSize for pagination", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ page: 1, pageSize: 1 });
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(1);
      expect(result.totalPages).toBe(2);
      expect(result.items[0].id).toBe(1);
    });

    it("returns second page correctly", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ page: 2, pageSize: 1 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(2);
      expect(result.page).toBe(2);
    });

    it("returns empty items when page exceeds total pages", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({ page: 100, pageSize: 10 });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(2);
    });

    it("combines status filter and search", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({
        status: "APPROVED",
        search: "张工",
      });
      expect(result.total).toBe(1);
      expect(result.items[0].contactPerson).toBe("张工");
    });

    it("combined status and search with no overlap returns empty", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.list({
        status: "APPROVED",
        search: "精密机械",
      });
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  // ─── getById ─────────────────────────────────────────────
  describe("getById", () => {
    it("returns questionnaire for existing id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getById({ id: 1 });
      expect(result.id).toBe(1);
      expect(result.questionnaireNo).toBe("QN-2026-001");
      expect(result.company).toBe("某汽车零部件公司");
      expect(result.contactPerson).toBe("张工");
      expect(result.status).toBe("APPROVED");
    });

    it("returns second questionnaire", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getById({ id: 2 });
      expect(result.id).toBe(2);
      expect(result.questionnaireNo).toBe("QN-2026-002");
      expect(result.status).toBe("UNDER_REVIEW");
    });

    it("throws for non-existent id", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.questionnaire.getById({ id: 999 }),
      ).rejects.toThrow("问卷不存在");
    });

    it("includes full data fields", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getById({ id: 1 });
      expect(result).toHaveProperty("partName");
      expect(result).toHaveProperty("materialTypes");
      expect(result).toHaveProperty("cleaningProductType");
      expect(result).toHaveProperty("contaminationTypes");
      expect(result).toHaveProperty("dailyPartQuantity");
      expect(result).toHaveProperty("cycleTimeSeconds");
      expect(result).toHaveProperty("oeeTarget");
      expect(result).toHaveProperty("investmentBudgetMin");
      expect(result).toHaveProperty("investmentBudgetMax");
      expect(result).toHaveProperty("aiAnalysis");
      expect(result).toHaveProperty("aiRecommendedProducts");
      expect(result).toHaveProperty("aiEstimatedPrice");
    });
  });

  // ─── getAiAnalysis ───────────────────────────────────────
  describe("getAiAnalysis", () => {
    it("returns AI analysis for existing questionnaire", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getAiAnalysis({ id: 1 });
      expect(result).toHaveProperty("analysis");
      expect(result).toHaveProperty("recommendedProducts");
      expect(result).toHaveProperty("estimatedPrice");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("generatedAt");
      expect(result.confidence).toBe(0.85);
      expect(result.analysis).toEqual({
        recommendedProductLine: "IC-2000系列",
        estimatedPrice: 2500000,
        keyFeatures: ["机器人上下料", "真空干燥", "MES集成"],
        riskAssessment: "中等复杂度，技术可行",
      });
      expect(result.recommendedProducts).toEqual(["IC-2000-X", "IC-2000-PRO"]);
      expect(result.estimatedPrice).toBe(2500000);
    });

    it("returns AI analysis for second questionnaire", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getAiAnalysis({ id: 2 });
      expect(result.analysis.recommendedProductLine).toBe("UC-3000系列");
      expect(result.recommendedProducts).toEqual(["UC-3000-STD"]);
      expect(result.estimatedPrice).toBe(950000);
    });

    it("throws for non-existent questionnaire", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.questionnaire.getAiAnalysis({ id: 999 }),
      ).rejects.toThrow("问卷不存在");
    });

    it("generatedAt is a valid ISO string", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getAiAnalysis({ id: 1 });
      expect(() => new Date(result.generatedAt)).not.toThrow();
      expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
    });
  });

  // ─── getFormOptions ──────────────────────────────────────
  describe("getFormOptions", () => {
    it("returns all form option categories", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getFormOptions();
      expect(result).toHaveProperty("materialTypes");
      expect(result).toHaveProperty("cleaningProducts");
      expect(result).toHaveProperty("contaminationTypes");
      expect(result).toHaveProperty("loadingMethods");
      expect(result).toHaveProperty("quoteTypes");
      expect(result).toHaveProperty("dryingLevels");
      expect(result).toHaveProperty("shiftPatterns");
    });

    it("materialTypes has correct entries", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getFormOptions();
      expect(result.materialTypes).toHaveLength(6);
      const values = result.materialTypes.map((m: any) => m.value);
      expect(values).toContain("STEEL");
      expect(values).toContain("ALUMINUM");
      expect(values).toContain("NON_FERROUS");
      expect(values).toContain("CASTING");
      expect(values).toContain("PLASTIC");
      expect(values).toContain("OTHER");
    });

    it("cleaningProducts has correct entries", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getFormOptions();
      expect(result.cleaningProducts).toHaveLength(5);
      const values = result.cleaningProducts.map((c: any) => c.value);
      expect(values).toContain("WATER_BASED");
      expect(values).toContain("MODIFIED_ALCOHOL");
      expect(values).toContain("HYDROCARBON");
    });

    it("contaminationTypes has correct entries", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getFormOptions();
      expect(result.contaminationTypes).toHaveLength(7);
      const values = result.contaminationTypes.map((c: any) => c.value);
      expect(values).toContain("COOLANT");
      expect(values).toContain("CHIPS");
      expect(values).toContain("OIL");
      expect(values).toContain("DUST");
    });

    it("loadingMethods has correct entries", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getFormOptions();
      expect(result.loadingMethods).toHaveLength(6);
      const values = result.loadingMethods.map((l: any) => l.value);
      expect(values).toContain("MANUAL");
      expect(values).toContain("ROBOT");
      expect(values).toContain("GANTRY");
      expect(values).toContain("CONVEYOR");
    });

    it("quoteTypes has 4 options", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getFormOptions();
      expect(result.quoteTypes).toHaveLength(4);
      const values = result.quoteTypes.map((q: any) => q.value);
      expect(values).toEqual(["NEW_PROJECT", "REPLACEMENT", "UPGRADE", "CONSULTATION"]);
    });

    it("dryingLevels has 5 levels (0-4)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getFormOptions();
      expect(result.dryingLevels).toHaveLength(5);
      expect(result.dryingLevels[0].value).toBe("LEVEL_0");
      expect(result.dryingLevels[4].value).toBe("LEVEL_4");
    });

    it("shiftPatterns has 4 options", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getFormOptions();
      expect(result.shiftPatterns).toHaveLength(4);
      const values = result.shiftPatterns.map((s: any) => s.value);
      expect(values).toEqual(["ONE_SHIFT", "TWO_SHIFT", "THREE_SHIFT", "CONTINUOUS"]);
    });

    it("each option has value and label", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getFormOptions();
      for (const option of result.materialTypes) {
        expect(option).toHaveProperty("value");
        expect(option).toHaveProperty("label");
      }
    });

    it("material and contamination options include labelEn", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getFormOptions();
      for (const option of result.materialTypes) {
        expect(option).toHaveProperty("labelEn");
      }
      for (const option of result.contaminationTypes) {
        expect(option).toHaveProperty("labelEn");
      }
    });
  });

  // ─── getStats ────────────────────────────────────────────
  describe("getStats", () => {
    it("returns questionnaire statistics", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getStats();
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("draft");
      expect(result).toHaveProperty("submitted");
      expect(result).toHaveProperty("underReview");
      expect(result).toHaveProperty("approved");
      expect(result).toHaveProperty("converted");
      expect(result).toHaveProperty("avgBudget");
      expect(result).toHaveProperty("totalPotentialValue");
    });

    it("total matches mock data count", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getStats();
      expect(result.total).toBe(2);
    });

    it("status counts are correct for mock data", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getStats();
      expect(result.approved).toBe(1);
      expect(result.underReview).toBe(1);
      expect(result.draft).toBe(0);
      expect(result.submitted).toBe(0);
      expect(result.converted).toBe(0);
    });

    it("avgBudget is calculated correctly", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getStats();
      // Q1: (2000000+3000000)/2 = 2500000; Q2: (800000+1200000)/2 = 1000000
      // Average: (2500000 + 1000000) / 2 = 1750000
      expect(result.avgBudget).toBe(1750000);
    });

    it("totalPotentialValue sums aiEstimatedPrice", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.getStats();
      // Q1: 2500000 + Q2: 950000 = 3450000
      expect(result.totalPotentialValue).toBe(3450000);
    });
  });

  // ════════════════════════════════════════════════════════════
  // MUTATION PROCEDURES
  // ════════════════════════════════════════════════════════════

  // ─── create ──────────────────────────────────────────────
  describe("create", () => {
    it("creates a new questionnaire with required fields", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.create({
        contactPerson: "王工程师",
        company: "测试公司",
        email: "wang@test.com",
        phone: "13800000000",
        quoteType: "NEW_PROJECT",
        projectName: "新清洗线项目",
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("questionnaireNo");
      expect(result).toHaveProperty("message", "问卷创建成功");
      expect(result.id).toBe(3);
      expect(result.questionnaireNo).toBe("QN-2026-003");
    });

    it("creates with all optional fields", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.create({
        contactPerson: "赵工",
        company: "新公司",
        email: "zhao@example.com",
        phone: "13900000001",
        quoteType: "REPLACEMENT",
        projectName: "替换项目",
        partName: "轴承",
        partDescription: "高精度轴承",
        materialTypes: ["STEEL"],
        cleaningProductType: "WATER_BASED",
        contaminationTypes: ["OIL", "DUST"],
        dailyPartQuantity: 100,
        cycleTimeSeconds: 30,
        loadingMethod: "ROBOT",
        additionalRequirements: "需要集成MES系统",
      });
      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);
      expect(result.questionnaireNo).toMatch(/^QN-2026-\d{3}$/);
    });

    it("supports all quoteType values", async () => {
      const caller = createAuthenticatedCaller();
      for (const quoteType of ["NEW_PROJECT", "REPLACEMENT", "UPGRADE", "CONSULTATION"] as const) {
        const result = await caller.questionnaire.create({
          contactPerson: "Test",
          company: "Company",
          email: "test@test.com",
          phone: "123",
          quoteType,
          projectName: "Test Project",
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid email", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.questionnaire.create({
          contactPerson: "Test",
          company: "Company",
          email: "not-an-email",
          phone: "123",
          quoteType: "NEW_PROJECT",
          projectName: "Test",
        }),
      ).rejects.toThrow();
    });

    it("rejects invalid quoteType", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.questionnaire.create({
          contactPerson: "Test",
          company: "Company",
          email: "test@test.com",
          phone: "123",
          quoteType: "INVALID" as any,
          projectName: "Test",
        }),
      ).rejects.toThrow();
    });

    it("rejects missing required fields", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.questionnaire.create({
          contactPerson: "Test",
          // company is missing
          email: "test@test.com",
          phone: "123",
          quoteType: "NEW_PROJECT",
          projectName: "Test",
        } as any),
      ).rejects.toThrow();
    });
  });

  // ─── update ──────────────────────────────────────────────
  describe("update", () => {
    it("updates a questionnaire", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.update({
        id: 1,
        data: { company: "Updated Company" },
      });
      expect(result).toEqual({
        success: true,
        message: "问卷更新成功",
      });
    });

    it("accepts empty data object", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.update({
        id: 1,
        data: {},
      });
      expect(result.success).toBe(true);
    });

    it("accepts complex data payload", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.update({
        id: 2,
        data: {
          partName: "Updated Part",
          materialTypes: ["STEEL", "ALUMINUM"],
          dailyPartQuantity: 300,
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("问卷更新成功");
    });
  });

  // ─── submit ──────────────────────────────────────────────
  describe("submit", () => {
    it("submits a questionnaire for review", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.submit({ id: 1 });
      expect(result).toEqual({
        success: true,
        message: "问卷已提交审核",
      });
    });

    it("works for different questionnaire ids", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.submit({ id: 2 });
      expect(result.success).toBe(true);
    });
  });

  // ─── review ──────────────────────────────────────────────
  describe("review", () => {
    it("approves a questionnaire", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.review({
        id: 1,
        approved: true,
      });
      expect(result).toEqual({
        success: true,
        message: "问卷已批准",
      });
    });

    it("rejects a questionnaire", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.review({
        id: 1,
        approved: false,
      });
      expect(result).toEqual({
        success: true,
        message: "问卷已退回",
      });
    });

    it("approves with comments", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.review({
        id: 2,
        approved: true,
        comments: "一切正常，批准通过",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("问卷已批准");
    });

    it("rejects with comments", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.review({
        id: 2,
        approved: false,
        comments: "信息不完整，请补充",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("问卷已退回");
    });
  });

  // ─── triggerAiAnalysis ───────────────────────────────────
  describe("triggerAiAnalysis", () => {
    it("triggers AI analysis for a questionnaire", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.triggerAiAnalysis({ id: 1 });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "AI分析已触发，请稍后查看结果");
      expect(result).toHaveProperty("estimatedTime", "30秒");
    });

    it("works for different ids", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.triggerAiAnalysis({ id: 2 });
      expect(result.success).toBe(true);
      expect(result.estimatedTime).toBe("30秒");
    });
  });

  // ─── convertToProject ────────────────────────────────────
  describe("convertToProject", () => {
    it("converts questionnaire to project", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.convertToProject({
        id: 1,
        projectName: "发动机缸体清洗线项目",
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("projectId", 101); // 100 + id
      expect(result).toHaveProperty("message", "问卷已转换为项目");
    });

    it("project id is 100 + questionnaire id", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.convertToProject({
        id: 2,
        projectName: "精密零件清洗项目",
      });
      expect(result.projectId).toBe(102);
    });

    it("supports optional assignedSalesId", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.convertToProject({
        id: 1,
        projectName: "清洗项目",
        assignedSalesId: 42,
      });
      expect(result.success).toBe(true);
      expect(result.projectId).toBe(101);
    });

    it("works without assignedSalesId", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.questionnaire.convertToProject({
        id: 1,
        projectName: "Test Project",
      });
      expect(result.success).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════
  // VALIDATION EDGE CASES
  // ════════════════════════════════════════════════════════════

  describe("input validation", () => {
    it("list rejects invalid status enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.questionnaire.list({ status: "INVALID_STATUS" as any }),
      ).rejects.toThrow();
    });

    it("getById rejects non-number id", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.questionnaire.getById({ id: "abc" as any }),
      ).rejects.toThrow();
    });

    it("create rejects missing contactPerson", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.questionnaire.create({
          company: "Company",
          email: "test@test.com",
          phone: "123",
          quoteType: "NEW_PROJECT",
          projectName: "Test",
        } as any),
      ).rejects.toThrow();
    });

    it("review rejects missing approved field", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.questionnaire.review({ id: 1 } as any),
      ).rejects.toThrow();
    });

    it("convertToProject rejects missing projectName", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.questionnaire.convertToProject({ id: 1 } as any),
      ).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════
  // AUTH GUARDS
  // ════════════════════════════════════════════════════════════

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.questionnaire.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.questionnaire.getById({ id: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.questionnaire.create({
          contactPerson: "Test",
          company: "Company",
          email: "test@test.com",
          phone: "123",
          quoteType: "NEW_PROJECT",
          projectName: "Test",
        }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.questionnaire.update({ id: 1, data: {} }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for submit", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.questionnaire.submit({ id: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for review", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.questionnaire.review({ id: 1, approved: true }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getAiAnalysis", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.questionnaire.getAiAnalysis({ id: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for triggerAiAnalysis", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.questionnaire.triggerAiAnalysis({ id: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for convertToProject", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.questionnaire.convertToProject({
          id: 1,
          projectName: "Test",
        }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getFormOptions", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.questionnaire.getFormOptions(),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getStats", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.questionnaire.getStats()).rejects.toThrow();
    });
  });
});
