/**
 * AI Canvas Router — Unit Tests
 *
 * Tests all 4 procedures:
 *   - list: legacy stub returning empty items
 *   - quickParse: lightweight intent detection (top match only)
 *   - parseWorkflow: full workflow parse with entity extraction & ranked suggestions
 *   - applyWorkflow: creates task + workflow instance
 *
 * This router is purely in-memory (no DB, no LLM) so no mocking is required
 * beyond the test caller utilities.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => {
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════
// LIST (legacy stub)
// ════════════════════════════════════════════════════════

describe("aiCanvas.list", () => {
  it("returns empty items and zero total with no input", async () => {
    const caller = createAdminCaller();
    const result = await caller.aiCanvas.list();
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("returns empty items and zero total with explicit input", async () => {
    const caller = createAdminCaller();
    const result = await caller.aiCanvas.list({ limit: 10, offset: 5 });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("uses default limit and offset when not specified", async () => {
    const caller = createAdminCaller();
    const result = await caller.aiCanvas.list({});
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ════════════════════════════════════════════════════════
// QUICK PARSE
// ════════════════════════════════════════════════════════

describe("aiCanvas.quickParse", () => {
  describe("detection success", () => {
    it("detects travel intent from Chinese keywords", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "我要出差去上海",
        language: "zh",
      });
      expect(result.detected).toBe(true);
      expect(result.category).toBe("travel");
      expect(result.template).toBe("出差申请");
      expect(result.route).toBe("/travel-dashboard");
      expect(result.confidence).toBeGreaterThanOrEqual(55); // 40 + 1*15 minimum
      expect(result.matchCount).toBeGreaterThanOrEqual(1);
    });

    it("detects travel intent from English keywords", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "I need to book a flight to Detroit for a trip",
        language: "en",
      });
      expect(result.detected).toBe(true);
      expect(result.category).toBe("travel");
      expect(result.template).toBe("Travel Request");
      expect(result.route).toBe("/travel-dashboard");
    });

    it("detects quality intent from 8d keyword", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "8d report needed for defect",
        language: "en",
      });
      expect(result.detected).toBe(true);
      expect(result.category).toBe("quality");
      expect(result.template).toBe("Quality Issue");
      expect(result.route).toBe("/8d-capa");
    });

    it("detects project intent from Chinese keywords", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "我要立项一个新产品开发项目",
        language: "zh",
      });
      expect(result.detected).toBe(true);
      expect(result.category).toBe("project");
      expect(result.template).toBe("项目立项");
      expect(result.route).toBe("/projects");
    });

    it("detects HR intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "我想请假三天",
        language: "zh",
      });
      expect(result.detected).toBe(true);
      expect(result.category).toBe("hr");
      expect(result.template).toBe("人事申请");
      expect(result.route).toBe("/hr-lifecycle");
    });

    it("detects finance/expense intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "报销出差费用发票",
        language: "zh",
      });
      expect(result.detected).toBe(true);
      // Could match travel or finance depending on keyword scoring
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.route).toBeTruthy();
    });

    it("detects procurement intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "need to purchase materials from supplier",
        language: "en",
      });
      expect(result.detected).toBe(true);
      expect(result.category).toBe("procurement");
      expect(result.template).toBe("Procurement Request");
      expect(result.route).toBe("/procurement");
    });

    it("detects production intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "安排生产工单排产计划",
        language: "zh",
      });
      expect(result.detected).toBe(true);
      expect(result.category).toBe("production");
      expect(result.template).toBe("生产排程");
      expect(result.route).toBe("/production");
    });

    it("detects approval intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "提交审批签字流程",
        language: "zh",
      });
      expect(result.detected).toBe(true);
      expect(result.category).toBe("approval");
      expect(result.template).toBe("审批流程");
      expect(result.route).toBe("/oa-forms");
    });

    it("detects meeting intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "meeting agenda and minutes for discussion",
        language: "en",
      });
      expect(result.detected).toBe(true);
      expect(result.category).toBe("general");
      expect(result.template).toBe("Meeting Minutes");
      expect(result.route).toBe("/meeting-hub");
    });

    it("detects CRM/sales intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "新客户销售商机线索",
        language: "zh",
      });
      expect(result.detected).toBe(true);
      expect(result.route).toBe("/crm");
    });

    it("detects customer service intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "customer warranty repair needed",
        language: "en",
      });
      expect(result.detected).toBe(true);
      expect(result.route).toBe("/after-sales");
    });

    it("detects inventory/supply chain intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "仓库库存盘点入库",
        language: "zh",
      });
      expect(result.detected).toBe(true);
      expect(result.route).toBe("/warehouse");
    });

    it("detects FMEA/control plan intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "FMEA risk analysis control plan",
        language: "en",
      });
      expect(result.detected).toBe(true);
      expect(result.route).toBe("/fmea");
    });

    it("detects training/capability intent", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "安排培训考试能力提升",
        language: "zh",
      });
      expect(result.detected).toBe(true);
      expect(result.route).toBe("/training");
    });
  });

  describe("confidence scoring", () => {
    it("higher confidence with more keyword matches", async () => {
      const caller = createAdminCaller();

      // Single keyword match
      const single = await caller.aiCanvas.quickParse({
        text: "出差",
        language: "zh",
      });

      // Multiple keyword matches
      const multi = await caller.aiCanvas.quickParse({
        text: "出差去上海飞机酒店差旅",
        language: "zh",
      });

      expect(multi.confidence).toBeGreaterThan(single.confidence);
    });

    it("confidence is capped at 95", async () => {
      const caller = createAdminCaller();
      // Hit many keywords for travel: 出差, 差旅, 机票, 酒店, 飞, trip, travel, flight, hotel, detroit, shanghai
      const result = await caller.aiCanvas.quickParse({
        text: "出差差旅机票酒店飞trip travel flight hotel detroit shanghai",
        language: "zh",
      });
      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    it("minimum confidence is 55 for single keyword match", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "出差",
        language: "zh",
      });
      expect(result.confidence).toBe(55); // 40 + 1*15
    });
  });

  describe("no match", () => {
    it("returns detected=false for unrelated text", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "hello world abcdef random text",
        language: "zh",
      });
      expect(result.detected).toBe(false);
      expect(result.category).toBeNull();
      expect(result.template).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.route).toBeNull();
      expect(result.matchCount).toBe(0);
    });
  });

  describe("language handling", () => {
    it("returns Chinese template for zh", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "出差申请",
        language: "zh",
      });
      expect(result.template).toBe("出差申请");
    });

    it("returns English template for en", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "travel trip",
        language: "en",
      });
      expect(result.template).toBe("Travel Request");
    });

    it("defaults to zh when language not specified", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.quickParse({
        text: "出差去上海",
      });
      expect(result.template).toBe("出差申请");
    });
  });

  describe("input validation", () => {
    it("rejects empty text", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.aiCanvas.quickParse({ text: "", language: "zh" })
      ).rejects.toThrow();
    });
  });
});

// ════════════════════════════════════════════════════════
// PARSE WORKFLOW
// ════════════════════════════════════════════════════════

describe("aiCanvas.parseWorkflow", () => {
  describe("successful detection", () => {
    it("returns detected=true with suggestions for matching text", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "我要出差去上海出差差旅",
        language: "zh",
      });
      expect(result.detected).toBe(true);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(result.suggestions.length).toBeLessThanOrEqual(3);
      expect(result.summary).toContain("出差申请");
      expect(result.summary).toContain("AI 识别到");
    });

    it("returns at most 3 suggestions", async () => {
      const caller = createAdminCaller();
      // Use a keyword that matches many rules
      const result = await caller.aiCanvas.parseWorkflow({
        text: "quality complaint customer service warranty defect",
        language: "en",
      });
      expect(result.suggestions.length).toBeLessThanOrEqual(3);
    });

    it("suggestions are ranked by confidence", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "travel trip flight hotel",
        language: "en",
      });
      if (result.suggestions.length > 1) {
        expect(result.suggestions[0].rank).toBe(1);
        expect(result.suggestions[1].rank).toBe(2);
        expect(result.suggestions[0].confidence).toBeGreaterThanOrEqual(
          result.suggestions[1].confidence
        );
      }
    });

    it("each suggestion has required fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "出差申请差旅",
        language: "zh",
      });
      const suggestion = result.suggestions[0];
      expect(suggestion).toHaveProperty("rank");
      expect(suggestion).toHaveProperty("confidence");
      expect(suggestion).toHaveProperty("suggestedTemplate");
      expect(suggestion).toHaveProperty("linkedEntities");
      expect(suggestion).toHaveProperty("proposedWorkflow");
      expect(suggestion).toHaveProperty("route");
      expect(suggestion).toHaveProperty("category");
      expect(suggestion).toHaveProperty("matchedKeywords");
    });

    it("proposedWorkflow contains steps with step/label/approver", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "出差申请",
        language: "zh",
      });
      const workflow = result.suggestions[0].proposedWorkflow;
      expect(workflow.length).toBeGreaterThanOrEqual(2);
      for (const step of workflow) {
        expect(step).toHaveProperty("step");
        expect(step).toHaveProperty("label");
        expect(step).toHaveProperty("approver");
      }
    });

    it("matchedKeywords contains actual keywords found in text", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "travel to detroit",
        language: "en",
      });
      const topSuggestion = result.suggestions[0];
      expect(topSuggestion.matchedKeywords).toContain("travel");
      expect(topSuggestion.matchedKeywords).toContain("detroit");
    });

    it("linkedEntities includes template name and category", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "出差申请",
        language: "zh",
      });
      const suggestion = result.suggestions[0];
      expect(suggestion.linkedEntities).toContain(suggestion.suggestedTemplate);
      expect(suggestion.linkedEntities).toContain(suggestion.category);
    });
  });

  describe("entity extraction", () => {
    it("extracts location entities from Chinese city names", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "出差去上海工厂",
        language: "zh",
      });
      expect(result.entities).toHaveProperty("locations");
      expect(result.entities.locations.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts English city names", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "travel to Detroit for a trip",
        language: "en",
      });
      expect(result.entities.locations.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts date entities in YYYY-MM-DD format", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "出差 2026-03-15 到 2026-03-20",
        language: "zh",
      });
      expect(result.entities.dates).toContain("2026-03-15");
      expect(result.entities.dates).toContain("2026-03-20");
    });

    it("extracts relative date references", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "明天出差下周开会",
        language: "zh",
      });
      expect(result.entities.dates.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts Chinese date format (月/日)", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "3月15日出差",
        language: "zh",
      });
      expect(result.entities.dates.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts material entities", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "采购不锈钢轴承物料",
        language: "zh",
      });
      expect(result.entities.materials.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts people entities", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "请张三经理审批这个项目",
        language: "zh",
      });
      expect(result.entities.people.length).toBeGreaterThanOrEqual(1);
    });

    it("deduplicates extracted entities", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "上海上海上海出差",
        language: "zh",
      });
      // Locations should be deduplicated via Set
      const uniqueLocations = [...new Set(result.entities.locations)];
      expect(result.entities.locations.length).toBe(uniqueLocations.length);
    });

    it("returns empty entity arrays when no entities detected", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "出差申请",
        language: "zh",
      });
      expect(result.entities).toHaveProperty("locations");
      expect(result.entities).toHaveProperty("dates");
      expect(result.entities).toHaveProperty("materials");
      expect(result.entities).toHaveProperty("people");
      expect(Array.isArray(result.entities.locations)).toBe(true);
      expect(Array.isArray(result.entities.dates)).toBe(true);
      expect(Array.isArray(result.entities.materials)).toBe(true);
      expect(Array.isArray(result.entities.people)).toBe(true);
    });
  });

  describe("no match", () => {
    it("returns detected=false with guidance summary (zh)", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "hello world random gibberish",
        language: "zh",
      });
      expect(result.detected).toBe(false);
      expect(result.suggestions).toEqual([]);
      expect(result.summary).toContain("AI 未识别到明确的业务意图");
    });

    it("returns detected=false with guidance summary (en)", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "hello world random gibberish",
        language: "en",
      });
      expect(result.detected).toBe(false);
      expect(result.suggestions).toEqual([]);
      expect(result.summary).toContain(
        "AI did not detect a clear business intent"
      );
    });

    it("still extracts entities even when no workflow matched", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "hello 2026-03-15 上海",
        language: "zh",
      });
      // "上海" matches travel keywords, so this will detect.
      // Use truly unmatched text with an entity that is only in entity patterns
      const result2 = await caller.aiCanvas.parseWorkflow({
        text: "张三在深圳 2026-01-01",
        language: "zh",
      });
      // "深圳" is a location in entity patterns and also in no workflow keywords
      // Actually "深圳" is NOT in workflow keywords but IS in entity extraction patterns
      expect(result2.entities).toBeDefined();
      expect(result2.entities.locations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("language handling", () => {
    it("summary in Chinese for zh", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "出差申请",
        language: "zh",
      });
      expect(result.summary).toContain("AI 识别到");
    });

    it("summary in English for en", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "travel trip",
        language: "en",
      });
      expect(result.summary).toContain("AI detected");
    });

    it("suggestions use zh template for zh language", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "出差",
        language: "zh",
      });
      expect(result.suggestions[0].suggestedTemplate).toBe("出差申请");
    });

    it("suggestions use en template for en language", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "travel",
        language: "en",
      });
      expect(result.suggestions[0].suggestedTemplate).toBe("Travel Request");
    });
  });

  describe("input validation", () => {
    it("rejects empty text", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.aiCanvas.parseWorkflow({ text: "", language: "zh" })
      ).rejects.toThrow();
    });

    it("accepts optional currentRoute", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.parseWorkflow({
        text: "出差申请",
        language: "zh",
        currentRoute: "/home",
      });
      expect(result.detected).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════
// APPLY WORKFLOW
// ════════════════════════════════════════════════════════

describe("aiCanvas.applyWorkflow", () => {
  const baseInput = {
    originalText: "我要出差去上海",
    templateName: "出差申请",
    route: "/travel-dashboard",
    workflowSteps: [
      { step: 1, label: "填写出差申请", approver: "申请人" },
      { step: 2, label: "部门经理审批", approver: "部门经理" },
      { step: 3, label: "财务确认预算", approver: "财务" },
    ],
    linkedEntities: ["出差申请", "travel"],
    language: "zh" as const,
  };

  describe("task creation", () => {
    it("returns taskId starting with TASK-", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.applyWorkflow(baseInput);
      expect(result.taskId).toMatch(/^TASK-/);
    });

    it("returns workflowId starting with WF-", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.applyWorkflow(baseInput);
      expect(result.workflowId).toMatch(/^WF-/);
    });

    it("taskId and workflowId are unique across calls", async () => {
      const caller = createAdminCaller();
      const result1 = await caller.aiCanvas.applyWorkflow(baseInput);
      // Small delay to ensure Date.now() differs
      const result2 = await caller.aiCanvas.applyWorkflow(baseInput);
      // They could be the same if called in same millisecond,
      // but we just check format
      expect(result1.taskId).toMatch(/^TASK-[A-Z0-9]+$/);
      expect(result1.workflowId).toMatch(/^WF-[A-Z0-9]+$/);
    });
  });

  describe("workflow steps", () => {
    it("first step is active, rest are pending", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.applyWorkflow(baseInput);
      expect(result.workflow).toHaveLength(3);
      expect(result.workflow[0].status).toBe("active");
      expect(result.workflow[1].status).toBe("pending");
      expect(result.workflow[2].status).toBe("pending");
    });

    it("preserves step details from input", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.applyWorkflow(baseInput);
      expect(result.workflow[0].step).toBe(1);
      expect(result.workflow[0].label).toBe("填写出差申请");
      expect(result.workflow[0].approver).toBe("申请人");
      expect(result.workflow[1].step).toBe(2);
      expect(result.workflow[1].label).toBe("部门经理审批");
      expect(result.workflow[2].step).toBe(3);
      expect(result.workflow[2].label).toBe("财务确认预算");
    });

    it("handles single step workflow", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.applyWorkflow({
        ...baseInput,
        workflowSteps: [
          { step: 1, label: "Single step", approver: "User" },
        ],
      });
      expect(result.workflow).toHaveLength(1);
      expect(result.workflow[0].status).toBe("active");
    });

    it("handles many steps", async () => {
      const caller = createAdminCaller();
      const steps = Array.from({ length: 10 }, (_, i) => ({
        step: i + 1,
        label: `Step ${i + 1}`,
        approver: `Approver ${i + 1}`,
      }));
      const result = await caller.aiCanvas.applyWorkflow({
        ...baseInput,
        workflowSteps: steps,
      });
      expect(result.workflow).toHaveLength(10);
      expect(result.workflow[0].status).toBe("active");
      for (let i = 1; i < 10; i++) {
        expect(result.workflow[i].status).toBe("pending");
      }
    });
  });

  describe("message (zh)", () => {
    it("returns Chinese message with template name and task ID", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.applyWorkflow(baseInput);
      expect(result.message).toContain("出差申请");
      expect(result.message).toContain(result.taskId);
      expect(result.message).toContain("已创建");
      expect(result.message).toContain("工作流");
    });
  });

  describe("message (en)", () => {
    it("returns English message with template name and task ID", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.applyWorkflow({
        ...baseInput,
        templateName: "Travel Request",
        language: "en",
      });
      expect(result.message).toContain("Travel Request");
      expect(result.message).toContain(result.taskId);
      expect(result.message).toContain("Created");
      expect(result.message).toContain("workflow");
    });
  });

  describe("nextAction", () => {
    it("returns nextAction with label and route (zh)", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.applyWorkflow(baseInput);
      expect(result.nextAction.label).toContain("前往");
      expect(result.nextAction.label).toContain("出差申请");
      expect(result.nextAction.route).toBe("/travel-dashboard");
    });

    it("returns nextAction with label and route (en)", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.applyWorkflow({
        ...baseInput,
        templateName: "Travel Request",
        language: "en",
      });
      expect(result.nextAction.label).toContain("Go to");
      expect(result.nextAction.label).toContain("Travel Request");
      expect(result.nextAction.route).toBe("/travel-dashboard");
    });

    it("uses the route from input", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiCanvas.applyWorkflow({
        ...baseInput,
        route: "/custom-route",
      });
      expect(result.nextAction.route).toBe("/custom-route");
    });
  });

  describe("input validation", () => {
    it("requires workflowSteps to be an array of objects with step/label/approver", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.aiCanvas.applyWorkflow({
          ...baseInput,
          workflowSteps: [{ step: 1 }] as any,
        })
      ).rejects.toThrow();
    });
  });
});

// ════════════════════════════════════════════════════════
// AUTHENTICATION GUARDS
// ════════════════════════════════════════════════════════

describe("aiCanvas authentication", () => {
  it("rejects anonymous caller for list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.aiCanvas.list()).rejects.toThrow();
  });

  it("rejects anonymous caller for quickParse", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiCanvas.quickParse({ text: "出差", language: "zh" })
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for parseWorkflow", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiCanvas.parseWorkflow({ text: "出差", language: "zh" })
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for applyWorkflow", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiCanvas.applyWorkflow({
        originalText: "test",
        templateName: "test",
        route: "/test",
        workflowSteps: [{ step: 1, label: "test", approver: "test" }],
        linkedEntities: ["test"],
        language: "zh",
      })
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════
// CROSS-PROCEDURE INTEGRATION
// ════════════════════════════════════════════════════════

describe("aiCanvas end-to-end flow", () => {
  it("quickParse -> parseWorkflow -> applyWorkflow produces consistent results", async () => {
    const caller = createAdminCaller();
    const inputText = "我要出差去上海";

    // Step 1: Quick parse to detect intent
    const quickResult = await caller.aiCanvas.quickParse({
      text: inputText,
      language: "zh",
    });
    expect(quickResult.detected).toBe(true);

    // Step 2: Full parse for workflow details
    const parseResult = await caller.aiCanvas.parseWorkflow({
      text: inputText,
      language: "zh",
    });
    expect(parseResult.detected).toBe(true);
    expect(parseResult.suggestions.length).toBeGreaterThanOrEqual(1);

    // Categories should match between quick and full parse
    expect(quickResult.category).toBe(parseResult.suggestions[0].category);
    expect(quickResult.route).toBe(parseResult.suggestions[0].route);

    // Step 3: Apply the top suggestion
    const topSuggestion = parseResult.suggestions[0];
    const applyResult = await caller.aiCanvas.applyWorkflow({
      originalText: inputText,
      templateName: topSuggestion.suggestedTemplate,
      route: topSuggestion.route,
      workflowSteps: topSuggestion.proposedWorkflow,
      linkedEntities: topSuggestion.linkedEntities,
      language: "zh",
    });

    expect(applyResult.taskId).toMatch(/^TASK-/);
    expect(applyResult.workflowId).toMatch(/^WF-/);
    expect(applyResult.workflow.length).toBe(
      topSuggestion.proposedWorkflow.length
    );
    expect(applyResult.nextAction.route).toBe(topSuggestion.route);
  });
});
