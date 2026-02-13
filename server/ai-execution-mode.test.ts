/**
 * AI执行模式服务测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeAI,
  recordAdoption,
  getModeConfig,
  getEffectivenessStats,
  getRecentLogs,
} from "./services/ai-execution-mode.service";

// Mock LLM调用
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test-response-id",
    created: Date.now(),
    model: "gemini-2.5-flash",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "这是一个测试AI响应。根据您的需求，建议使用GRT-SC系列通过式清洗机。",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  }),
}));

describe("AI执行模式服务", () => {
  describe("getModeConfig", () => {
    it("应该返回solution助手的配置", () => {
      const config = getModeConfig("solution");
      expect(config.assistantType).toBe("solution");
      expect(config.hasInternalKnowledge).toBe(true);
      expect(config.supportedModes).toContain("internal");
      expect(config.supportedModes).toContain("generative");
      expect(config.supportedModes).toContain("shadow");
    });

    it("应该返回默认助手配置", () => {
      const config = getModeConfig("unknown");
      expect(config.assistantType).toBe("unknown");
      expect(config.hasInternalKnowledge).toBe(false);
    });

    it("应该返回quotation助手的配置", () => {
      const config = getModeConfig("quotation");
      expect(config.assistantType).toBe("quotation");
    });

    it("应该返回planning助手的配置", () => {
      const config = getModeConfig("planning");
      expect(config.assistantType).toBe("planning");
    });

    it("应该返回kpi助手的配置", () => {
      const config = getModeConfig("kpi");
      expect(config.assistantType).toBe("kpi");
    });

    it("应该返回engineering助手的配置", () => {
      const config = getModeConfig("engineering");
      expect(config.assistantType).toBe("engineering");
    });
  });

  describe("executeAI", () => {
    it("应该执行internal模式的AI请求", async () => {
      const result = await executeAI({
        assistantType: "solution",
        mode: "internal",
        content: "通过式清洗机新能源壳体清洁度小于600u的方案",
      });

      expect(result).toBeDefined();
      expect(result.mode).toBe("internal");
      expect(result.sessionId).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("应该执行generative模式的AI请求", async () => {
      const result = await executeAI({
        assistantType: "solution",
        mode: "generative",
        content: "通过式清洗机新能源壳体清洁度小于600u的方案",
      });

      expect(result).toBeDefined();
      expect(result.mode).toBe("generative");
      expect(result.sessionId).toBeDefined();
    });

    it("应该执行shadow模式的AI请求", async () => {
      const result = await executeAI({
        assistantType: "solution",
        mode: "shadow",
        content: "测试影子模式",
      });

      expect(result).toBeDefined();
      expect(result.mode).toBe("shadow");
    });

    it("应该包含上下文信息", async () => {
      const result = await executeAI({
        assistantType: "solution",
        mode: "internal",
        content: "测试请求",
        context: {
          processType: "project",
          processId: "proj-001",
          stepCode: "M3",
          suggestionMode: "full_process",
        },
      });

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
    });
  });

  describe("recordAdoption", () => {
    it("应该记录正面采纳反馈", () => {
      const record = recordAdoption("test-session-1", true, "非常有帮助");

      expect(record.sessionId).toBe("test-session-1");
      expect(record.isAdopted).toBe(true);
      expect(record.feedback).toBe("非常有帮助");
      expect(record.timestamp).toBeInstanceOf(Date);
    });

    it("应该记录负面采纳反馈", () => {
      const record = recordAdoption("test-session-2", false, "需要改进");

      expect(record.sessionId).toBe("test-session-2");
      expect(record.isAdopted).toBe(false);
      expect(record.feedback).toBe("需要改进");
    });

    it("应该允许无反馈的采纳记录", () => {
      const record = recordAdoption("test-session-3", true);

      expect(record.sessionId).toBe("test-session-3");
      expect(record.isAdopted).toBe(true);
      expect(record.feedback).toBeUndefined();
    });
  });

  describe("getEffectivenessStats", () => {
    it("应该返回统计数据", () => {
      const stats = getEffectivenessStats();

      // getEffectivenessStats returns an array of stat objects
      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].totalCount).toBeGreaterThanOrEqual(0);
      expect(stats[0].adoptedCount).toBeGreaterThanOrEqual(0);
      expect(stats[0].adoptionRate).toBeDefined();
    });
  });

  describe("getRecentLogs", () => {
    it("应该返回最近的日志", () => {
      const logs = getRecentLogs(5);

      expect(Array.isArray(logs)).toBe(true);
      logs.forEach(log => {
        expect(log.sessionId).toBeDefined();
        expect(log.mode).toBeDefined();
        expect(log.timestamp).toBeInstanceOf(Date);
      });
    });

    it("应该限制返回数量", () => {
      const logs = getRecentLogs(2);

      expect(logs.length).toBeLessThanOrEqual(2);
    });
  });
});

describe("AI执行模式路由集成", () => {
  it("应该支持solution助手类型", () => {
    const config = getModeConfig("solution");
    expect(config.hasInternalKnowledge).toBe(true);
  });

  it("应该支持三种执行模式", () => {
    const config = getModeConfig("default");
    expect(config.supportedModes).toHaveLength(3);
    expect(config.supportedModes).toEqual(["internal", "generative", "shadow"]);
  });
});
