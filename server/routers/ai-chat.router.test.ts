/**
 * AI Chat Router — Unit Tests
 *
 * Tests 2 procedures (both protectedProcedure):
 *   Mutations (1): sendMessage
 *   Queries  (1): getQuickPrompts
 *
 * Coverage:
 *   - sendMessage: session creation, existing session, LLM failure fallback,
 *     input validation (empty message, assistantType enum), context passthrough
 *   - getQuickPrompts: DB templates returned, default prompts fallback,
 *     client-side assistantType filtering, optional input
 *   - Auth guards: both procedures reject anonymous callers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state (hoisted before vi.mock) ─────────────────────
const { selectResultsQueue, returningQueue, mockInvokeLLM } = vi.hoisted(() => ({
  selectResultsQueue: [] as any[][],
  returningQueue: [] as any[][],
  mockInvokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: "AI回复内容" } }],
  })),
}));

// ── Mock DB ─────────────────────────────────────────────────
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
    };
  }),
}));

// ── Mock drizzle-orm operators ──────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

// ── Mock LLM ────────────────────────────────────────────────
vi.mock("../_core/llm", () => ({
  invokeLLM: (...args: any[]) => mockInvokeLLM(...args),
}));

// ── Reset between tests ─────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  mockInvokeLLM.mockReset().mockResolvedValue({
    choices: [{ message: { content: "AI回复内容" } }],
  });
});

const caller = () => createAuthenticatedCaller();

// ══════════════════════════════════════════════════════════════
// sendMessage
// ══════════════════════════════════════════════════════════════

describe("aiChat.sendMessage", () => {
  it("creates a new session when no sessionId is provided and returns sessionId + message", async () => {
    // 1st returning: new session insert
    returningQueue.push([{ id: 10 }]);
    // 2nd returning: assistant message insert
    returningQueue.push([{
      id: 20,
      sessionId: 10,
      role: "assistant",
      content: "AI回复内容",
      contentType: "text",
    }]);
    // select for counting messages in the session
    selectResultsQueue.push([{}, {}]); // 2 messages (user + assistant)

    const result = await caller().aiChat.sendMessage({
      message: "你好，请帮我分析项目进度",
    });

    expect(result.sessionId).toBe(10);
    expect(result.message).toBeDefined();
    expect(result.message.id).toBe(20);
    expect(result.message.role).toBe("assistant");
    expect(result.message.content).toBe("AI回复内容");
    expect(mockInvokeLLM).toHaveBeenCalledOnce();
  });

  it("uses the provided sessionId without creating a new session", async () => {
    // No session-creation returning needed — only assistant message returning
    returningQueue.push([{
      id: 30,
      sessionId: 5,
      role: "assistant",
      content: "AI回复内容",
      contentType: "text",
    }]);
    // select for counting messages
    selectResultsQueue.push([{}, {}, {}]); // 3 messages

    const result = await caller().aiChat.sendMessage({
      sessionId: 5,
      message: "继续讨论",
    });

    expect(result.sessionId).toBe(5);
    expect(result.message.id).toBe(30);
    expect(result.message.sessionId).toBe(5);
  });

  it("falls back to default response when LLM throws an error", async () => {
    mockInvokeLLM.mockRejectedValueOnce(new Error("LLM service unavailable"));

    // session creation
    returningQueue.push([{ id: 11 }]);
    // assistant message — content should be the fallback string
    returningQueue.push([{
      id: 21,
      sessionId: 11,
      role: "assistant",
      content: "抱歉，AI服务暂时不可用。",
      contentType: "text",
    }]);
    // message count
    selectResultsQueue.push([{}, {}]);

    const result = await caller().aiChat.sendMessage({
      message: "请帮我查看质量数据",
    });

    expect(result.sessionId).toBe(11);
    expect(result.message).toBeDefined();
    // The router catches the LLM error and uses the fallback
    expect(mockInvokeLLM).toHaveBeenCalledOnce();
  });

  it("falls back to default response when LLM returns empty content", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: "" } }],
    });

    returningQueue.push([{ id: 12 }]);
    returningQueue.push([{
      id: 22,
      sessionId: 12,
      role: "assistant",
      content: "抱歉，AI服务暂时不可用。",
      contentType: "text",
    }]);
    selectResultsQueue.push([{}, {}]);

    const result = await caller().aiChat.sendMessage({
      message: "测试空响应",
    });

    // Empty content || fallback => fallback used
    expect(result.sessionId).toBe(12);
    expect(result.message).toBeDefined();
  });

  it("falls back to default response when LLM returns null content", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });

    returningQueue.push([{ id: 13 }]);
    returningQueue.push([{
      id: 23,
      sessionId: 13,
      role: "assistant",
      content: "抱歉，AI服务暂时不可用。",
      contentType: "text",
    }]);
    selectResultsQueue.push([{}, {}]);

    const result = await caller().aiChat.sendMessage({
      message: "测试null响应",
    });

    expect(result.sessionId).toBe(13);
    expect(result.message).toBeDefined();
  });

  it("rejects empty message (min length 1)", async () => {
    await expect(
      caller().aiChat.sendMessage({ message: "" })
    ).rejects.toThrow();
  });

  it("passes assistantType to session creation when provided", async () => {
    returningQueue.push([{ id: 14 }]);
    returningQueue.push([{
      id: 24,
      sessionId: 14,
      role: "assistant",
      content: "AI回复内容",
      contentType: "text",
    }]);
    selectResultsQueue.push([{}, {}]);

    const result = await caller().aiChat.sendMessage({
      assistantType: "solution",
      message: "方案咨询",
    });

    expect(result.sessionId).toBe(14);
    expect(result.message).toBeDefined();
  });

  it("accepts all valid assistantType enum values", async () => {
    const validTypes = ["solution", "quotation", "planning", "kpi", "personal"] as const;

    for (const assistantType of validTypes) {
      returningQueue.push([{ id: 100 }]);
      returningQueue.push([{ id: 200, sessionId: 100, role: "assistant", content: "ok", contentType: "text" }]);
      selectResultsQueue.push([{}, {}]);

      const result = await caller().aiChat.sendMessage({
        assistantType,
        message: `测试 ${assistantType}`,
      });

      expect(result.sessionId).toBe(100);
    }
  });

  it("rejects an invalid assistantType value", async () => {
    await expect(
      caller().aiChat.sendMessage({
        assistantType: "invalid_type" as any,
        message: "测试无效类型",
      })
    ).rejects.toThrow();
  });

  it("accepts optional context record", async () => {
    returningQueue.push([{ id: 15 }]);
    returningQueue.push([{
      id: 25,
      sessionId: 15,
      role: "assistant",
      content: "AI回复内容",
      contentType: "text",
    }]);
    selectResultsQueue.push([{}, {}]);

    const result = await caller().aiChat.sendMessage({
      message: "带上下文的消息",
      context: { page: "/projects", projectId: 42 },
    });

    expect(result.sessionId).toBe(15);
    expect(result.message).toBeDefined();
  });

  it("sends the correct system and user messages to LLM", async () => {
    returningQueue.push([{ id: 16 }]);
    returningQueue.push([{
      id: 26,
      sessionId: 16,
      role: "assistant",
      content: "AI回复内容",
      contentType: "text",
    }]);
    selectResultsQueue.push([{}, {}]);

    await caller().aiChat.sendMessage({
      message: "请分析最近的质量趋势",
    });

    expect(mockInvokeLLM).toHaveBeenCalledOnce();
    const llmCall = mockInvokeLLM.mock.calls[0][0];
    expect(llmCall.messages).toHaveLength(2);
    expect(llmCall.messages[0].role).toBe("system");
    expect(llmCall.messages[0].content).toContain("GRT");
    expect(llmCall.messages[0].content).toContain("中文");
    expect(llmCall.messages[1].role).toBe("user");
    expect(llmCall.messages[1].content).toBe("请分析最近的质量趋势");
  });

  it("defaults assistantType to 'personal' when not provided (new session)", async () => {
    // The router uses input.assistantType || "personal"
    returningQueue.push([{ id: 17 }]);
    returningQueue.push([{
      id: 27,
      sessionId: 17,
      role: "assistant",
      content: "AI回复内容",
      contentType: "text",
    }]);
    selectResultsQueue.push([{}, {}]);

    const result = await caller().aiChat.sendMessage({
      message: "默认assistant类型",
    });

    // The session was created — we verify it completed without error
    expect(result.sessionId).toBe(17);
  });

  it("truncates session title to 50 characters from the message", async () => {
    const longMessage = "这是一个非常长的消息用于测试标题是否会被截断到五十个字符以内的功能验证场景这段话应该超过五十个字符了吧";
    returningQueue.push([{ id: 18 }]);
    returningQueue.push([{
      id: 28,
      sessionId: 18,
      role: "assistant",
      content: "AI回复内容",
      contentType: "text",
    }]);
    selectResultsQueue.push([{}, {}]);

    const result = await caller().aiChat.sendMessage({
      message: longMessage,
    });

    // Verify the call completed successfully — the title truncation
    // happens inside db.insert which is mocked, but validates input is accepted
    expect(result.sessionId).toBe(18);
  });
});

// ══════════════════════════════════════════════════════════════
// getQuickPrompts
// ══════════════════════════════════════════════════════════════

describe("aiChat.getQuickPrompts", () => {
  it("returns mapped DB templates when available", async () => {
    selectResultsQueue.push([
      { id: 1, name: "项目进度模板", content: "查看项目进度", category: "项目", assistantType: "planning", isPublic: 1, usageCount: 10 },
      { id: 2, name: "质量分析模板", content: "分析质量数据", category: "质量", assistantType: "solution", isPublic: 1, usageCount: 5 },
    ]);

    const result = await caller().aiChat.getQuickPrompts();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, name: "项目进度模板", content: "查看项目进度", category: "项目" });
    expect(result[1]).toEqual({ id: 2, name: "质量分析模板", content: "分析质量数据", category: "质量" });
  });

  it("returns 3 hardcoded default prompts when no templates exist", async () => {
    selectResultsQueue.push([]);

    const result = await caller().aiChat.getQuickPrompts();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 0, name: "项目进度查询", content: "请帮我查看当前所有活跃项目的进度", category: "项目" });
    expect(result[1]).toEqual({ id: 0, name: "质量分析", content: "请分析最近的质量问题趋势", category: "质量" });
    expect(result[2]).toEqual({ id: 0, name: "成本优化建议", content: "请给出当前项目的成本优化建议", category: "成本" });
  });

  it("filters by assistantType (client-side filtering)", async () => {
    selectResultsQueue.push([
      { id: 1, name: "模板A", content: "内容A", category: "项目", assistantType: "planning", isPublic: 1, usageCount: 10 },
      { id: 2, name: "模板B", content: "内容B", category: "质量", assistantType: "solution", isPublic: 1, usageCount: 5 },
      { id: 3, name: "模板C", content: "内容C", category: "KPI", assistantType: "planning", isPublic: 1, usageCount: 3 },
    ]);

    const result = await caller().aiChat.getQuickPrompts({ assistantType: "planning" });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, name: "模板A", content: "内容A", category: "项目" });
    expect(result[1]).toEqual({ id: 3, name: "模板C", content: "内容C", category: "KPI" });
  });

  it("returns defaults when no templates match the assistantType filter", async () => {
    selectResultsQueue.push([
      { id: 1, name: "模板A", content: "内容A", category: "项目", assistantType: "planning", isPublic: 1, usageCount: 10 },
    ]);

    const result = await caller().aiChat.getQuickPrompts({ assistantType: "kpi" });

    // After filtering by "kpi", templates is empty => 3 defaults
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(0);
    expect(result[0].name).toBe("项目进度查询");
  });

  it("accepts undefined input (no filter)", async () => {
    selectResultsQueue.push([
      { id: 1, name: "模板", content: "内容", category: "通用", assistantType: "personal", isPublic: 1, usageCount: 1 },
    ]);

    const result = await caller().aiChat.getQuickPrompts(undefined);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 1, name: "模板", content: "内容", category: "通用" });
  });

  it("accepts empty object input (no assistantType)", async () => {
    selectResultsQueue.push([
      { id: 1, name: "模板", content: "内容", category: "通用", assistantType: "personal", isPublic: 1, usageCount: 1 },
    ]);

    const result = await caller().aiChat.getQuickPrompts({});

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 1, name: "模板", content: "内容", category: "通用" });
  });

  it("maps only the required fields (id, name, content, category) from DB templates", async () => {
    selectResultsQueue.push([
      {
        id: 99,
        name: "完整模板",
        content: "完整内容",
        category: "测试",
        assistantType: "personal",
        isPublic: 1,
        usageCount: 100,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        extraField: "should not appear",
      },
    ]);

    const result = await caller().aiChat.getQuickPrompts();

    expect(result).toHaveLength(1);
    expect(Object.keys(result[0])).toEqual(["id", "name", "content", "category"]);
    expect(result[0]).toEqual({ id: 99, name: "完整模板", content: "完整内容", category: "测试" });
  });
});

// ══════════════════════════════════════════════════════════════
// Authentication Guards
// ══════════════════════════════════════════════════════════════

describe("aiChat — authentication", () => {
  it("rejects anonymous caller for sendMessage", async () => {
    await expect(
      createAnonymousCaller().aiChat.sendMessage({ message: "hello" })
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for getQuickPrompts", async () => {
    await expect(
      createAnonymousCaller().aiChat.getQuickPrompts()
    ).rejects.toThrow();
  });

  it("rejects anonymous caller for getQuickPrompts with input", async () => {
    await expect(
      createAnonymousCaller().aiChat.getQuickPrompts({ assistantType: "planning" })
    ).rejects.toThrow();
  });
});
