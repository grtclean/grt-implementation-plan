/**
 * AI服务单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getVertexAIConfig,
  isVertexAIConfigured,
  analyzeSemantics,
  assessRisk,
  askAICoach,
  reviewForm,
} from "./vertex-ai-service";

// Mock LLM服务
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockImplementation(async ({ response_format }) => {
    if (response_format?.json_schema?.name === "semantic_analysis") {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "查询项目状态",
                entities: [
                  { type: "project", value: "GRT智能系统", confidence: 0.95 },
                ],
                sentiment: "neutral",
                keywords: ["项目", "状态", "进度"],
                summary: "用户想了解GRT智能系统项目的当前状态",
              }),
            },
          },
        ],
      };
    }
    if (response_format?.json_schema?.name === "risk_assessment") {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: "medium",
                riskScore: 45,
                riskFactors: [
                  {
                    factor: "进度延迟",
                    impact: "medium",
                    probability: "medium",
                    description: "当前进度落后计划2周",
                  },
                ],
                recommendations: ["增加资源投入", "优化关键路径"],
                summary: "项目存在中等风险，建议加强进度管控",
              }),
            },
          },
        ],
      };
    }
    if (response_format?.json_schema?.name === "form_review") {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isValid: true,
                issues: [],
                riskWarnings: [],
              }),
            },
          },
        ],
      };
    }
    // AI Coach默认响应
    return {
      choices: [
        {
          message: {
            content: "这是AI Coach的回答。",
          },
        },
      ],
    };
  }),
}));

describe("AI服务配置", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该返回默认配置", () => {
    const config = getVertexAIConfig();
    expect(config).toHaveProperty("projectId");
    expect(config).toHaveProperty("location");
    expect(config).toHaveProperty("modelId");
  });

  it("应该检测配置状态", () => {
    const configured = isVertexAIConfigured();
    expect(typeof configured).toBe("boolean");
  });
});

describe("语义分析服务", () => {
  it("应该成功分析文本语义", async () => {
    const result = await analyzeSemantics({
      text: "请告诉我GRT智能系统项目的当前进度",
    });

    expect(result).toHaveProperty("intent");
    expect(result).toHaveProperty("entities");
    expect(result).toHaveProperty("sentiment");
    expect(result).toHaveProperty("keywords");
    expect(result).toHaveProperty("summary");
    expect(Array.isArray(result.entities)).toBe(true);
    expect(Array.isArray(result.keywords)).toBe(true);
  });

  it("应该支持上下文分析", async () => {
    const result = await analyzeSemantics({
      text: "这个怎么样？",
      context: "我们正在讨论新的项目方案",
    });

    expect(result).toHaveProperty("intent");
  });

  it("应该支持语言设置", async () => {
    const result = await analyzeSemantics({
      text: "What is the project status?",
      language: "en",
    });

    expect(result).toHaveProperty("intent");
  });
});

describe("风险评估服务", () => {
  it("应该成功评估项目风险", async () => {
    const result = await assessRisk({
      type: "project",
      data: {
        projectName: "GRT智能系统",
        progress: 65,
        plannedProgress: 80,
        budget: 1000000,
        spent: 750000,
      },
    });

    expect(result).toHaveProperty("riskLevel");
    expect(result).toHaveProperty("riskScore");
    expect(result).toHaveProperty("riskFactors");
    expect(result).toHaveProperty("recommendations");
    expect(result).toHaveProperty("summary");
    expect(["low", "medium", "high", "critical"]).toContain(result.riskLevel);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("应该成功评估成本风险", async () => {
    const result = await assessRisk({
      type: "cost",
      data: {
        budget: 500000,
        currentCost: 480000,
        forecastCost: 550000,
      },
    });

    expect(result).toHaveProperty("riskLevel");
    expect(Array.isArray(result.riskFactors)).toBe(true);
  });

  it("应该成功评估质量风险", async () => {
    const result = await assessRisk({
      type: "quality",
      data: {
        defectRate: 5,
        targetDefectRate: 2,
        inspectionCoverage: 85,
      },
    });

    expect(result).toHaveProperty("riskLevel");
  });

  it("应该成功评估交付风险", async () => {
    const result = await assessRisk({
      type: "delivery",
      data: {
        plannedDate: "2026-03-01",
        estimatedDate: "2026-03-15",
        customerPriority: "high",
      },
    });

    expect(result).toHaveProperty("riskLevel");
  });

  it("应该成功评估安全风险", async () => {
    const result = await assessRisk({
      type: "security",
      data: {
        vulnerabilities: 3,
        patchStatus: "pending",
        lastAudit: "2025-12-01",
      },
    });

    expect(result).toHaveProperty("riskLevel");
  });
});

describe("AI Coach服务", () => {
  it("应该成功回答问题", async () => {
    const result = await askAICoach({
      question: "如何提高项目交付效率？",
    });

    expect(result).toHaveProperty("answer");
    expect(result).toHaveProperty("confidence");
    expect(typeof result.answer).toBe("string");
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("应该支持上下文问答", async () => {
    const result = await askAICoach({
      question: "有什么建议？",
      context: "我们的项目进度落后了两周",
    });

    expect(result).toHaveProperty("answer");
  });

  it("应该支持历史对话", async () => {
    const result = await askAICoach({
      question: "还有其他方法吗？",
      history: [
        { role: "user", content: "如何提高效率？" },
        { role: "assistant", content: "可以通过优化流程来提高效率。" },
      ],
    });

    expect(result).toHaveProperty("answer");
  });
});

describe("表单审核服务", () => {
  it("应该成功审核有效表单", async () => {
    const result = await reviewForm({
      formType: "费用报销",
      formData: {
        applicant: "张三",
        amount: 5000,
        reason: "差旅费",
        date: "2026-01-31",
      },
    });

    expect(result).toHaveProperty("isValid");
    expect(result).toHaveProperty("issues");
    expect(result).toHaveProperty("riskWarnings");
    expect(typeof result.isValid).toBe("boolean");
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("应该支持自定义审核规则", async () => {
    const result = await reviewForm({
      formType: "采购申请",
      formData: {
        item: "办公设备",
        quantity: 10,
        unitPrice: 1000,
        totalAmount: 10000,
      },
      rules: ["单笔采购金额不超过50000元", "必须有三家供应商报价"],
    });

    expect(result).toHaveProperty("isValid");
  });

  it("应该检测表单问题", async () => {
    const result = await reviewForm({
      formType: "请假申请",
      formData: {
        applicant: "",
        startDate: "2026-02-01",
        endDate: "2026-01-31", // 结束日期早于开始日期
        reason: "",
      },
    });

    expect(result).toHaveProperty("issues");
  });
});
