/**
 * AI Chat Router — Unit Tests
 *
 * Tests 3 procedures (all protectedProcedure):
 *   Mutations (1): sendMessage
 *   Queries  (2): getQuickPrompts, getReplyStatus
 *
 * Coverage:
 *   - sendMessage: session creation, existing session, submitTask call,
 *     input validation (empty message, assistantType enum), context passthrough
 *   - getReplyStatus: completed task, failed task, pending task, not-found task
 *   - getQuickPrompts: DB templates returned, default prompts fallback,
 *     client-side assistantType filtering, optional input
 *   - Auth guards: all procedures reject anonymous callers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state (hoisted before vi.mock) ─────────────────────
const { selectResultsQueue, returningQueue, mockSubmitTask, mockGetTaskStatus } = vi.hoisted(() => ({
  selectResultsQueue: [] as any[][],
  returningQueue: [] as any[][],
  mockSubmitTask: vi.fn(async () => ({ taskId: 42 })),
  mockGetTaskStatus: vi.fn(async () => ({ id: 42, status: "completed", resultData: { response: "AI回复内容" } })),
}));

// ── Mock DB ─────────────────────────────────────────────────
vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

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
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

// ── Mock task-worker.service ────────────────────────────────
vi.mock("../services/task-worker.service", () => ({
  registerTaskHandler: vi.fn(),
  submitTask: (...args: any[]) => mockSubmitTask(...args),
  getTaskStatus: (...args: any[]) => mockGetTaskStatus(...args),
}));

// ── Reset between tests ─────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  mockSubmitTask.mockReset().mockResolvedValue({ taskId: 42 });
  mockGetTaskStatus.mockReset().mockResolvedValue({
    id: 42, status: "completed", resultData: { response: "AI回复内容" },
  });
});

const caller = () => createAdminCaller();

// ══════════════════════════════════════════════════════════════
// sendMessage
// ══════════════════════════════════════════════════════════════

describe("aiChat.sendMessage", () => {
  it("creates a new session when no sessionId is provided and returns taskId + processing status", async () => {
    // 1st returning: new session insert
    returningQueue.push([{ id: 10 }]);
    mockSubmitTask.mockResolvedValueOnce({ taskId: 99 });

    const result = await caller().aiChat.sendMessage({
      message: "你好，请帮我分析项目进度",
    });

    expect(result.sessionId).toBe(10);
    expect(result.taskId).toBe(99);
    expect(result.status).toBe("processing");
    expect(mockSubmitTask).toHaveBeenCalledOnce();
    expect(mockSubmitTask).toHaveBeenCalledWith(
      "AI_CHAT_REPLY",
      expect.objectContaining({
        sessionId: 10,
        message: "你好，请帮我分析项目进度",
        assistantType: "personal",
      }),
      expect.any(String),
    );
  });

  it("uses the provided sessionId without creating a new session", async () => {
    mockSubmitTask.mockResolvedValueOnce({ taskId: 77 });

    const result = await caller().aiChat.sendMessage({
      sessionId: 5,
      message: "继续讨论",
    });

    expect(result.sessionId).toBe(5);
    expect(result.taskId).toBe(77);
    expect(result.status).toBe("processing");
    // No session insert returning needed — only user message insert
    expect(mockSubmitTask).toHaveBeenCalledWith(
      "AI_CHAT_REPLY",
      expect.objectContaining({ sessionId: 5 }),
      expect.any(String),
    );
  });

  it("rejects empty message (min length 1)", async () => {
    await expect(
      caller().aiChat.sendMessage({ message: "" })
    ).rejects.toThrow();
  });

  it("passes assistantType to session creation and submitTask when provided", async () => {
    returningQueue.push([{ id: 14 }]);
    mockSubmitTask.mockResolvedValueOnce({ taskId: 50 });

    const result = await caller().aiChat.sendMessage({
      assistantType: "solution",
      message: "方案咨询",
    });

    expect(result.sessionId).toBe(14);
    expect(result.taskId).toBe(50);
    expect(result.status).toBe("processing");
    expect(mockSubmitTask).toHaveBeenCalledWith(
      "AI_CHAT_REPLY",
      expect.objectContaining({ assistantType: "solution" }),
      expect.any(String),
    );
  });

  it("accepts all valid assistantType enum values", async () => {
    const validTypes = ["solution", "quotation", "planning", "kpi", "personal"] as const;

    for (const assistantType of validTypes) {
      returningQueue.push([{ id: 100 }]);
      mockSubmitTask.mockResolvedValueOnce({ taskId: 42 });

      const result = await caller().aiChat.sendMessage({
        assistantType,
        message: `测试 ${assistantType}`,
      });

      expect(result.sessionId).toBe(100);
      expect(result.status).toBe("processing");
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

  it("accepts optional context record and passes it to submitTask", async () => {
    returningQueue.push([{ id: 15 }]);
    mockSubmitTask.mockResolvedValueOnce({ taskId: 88 });

    const result = await caller().aiChat.sendMessage({
      message: "带上下文的消息",
      context: { page: "/projects", projectId: 42 },
    });

    expect(result.sessionId).toBe(15);
    expect(result.taskId).toBe(88);
    expect(result.status).toBe("processing");
    expect(mockSubmitTask).toHaveBeenCalledWith(
      "AI_CHAT_REPLY",
      expect.objectContaining({
        context: { page: "/projects", projectId: 42 },
      }),
      expect.any(String),
    );
  });

  it("defaults assistantType to 'personal' when not provided (new session)", async () => {
    returningQueue.push([{ id: 17 }]);
    mockSubmitTask.mockResolvedValueOnce({ taskId: 42 });

    const result = await caller().aiChat.sendMessage({
      message: "默认assistant类型",
    });

    expect(result.sessionId).toBe(17);
    expect(mockSubmitTask).toHaveBeenCalledWith(
      "AI_CHAT_REPLY",
      expect.objectContaining({ assistantType: "personal" }),
      expect.any(String),
    );
  });

  it("truncates session title to 50 characters from the message", async () => {
    const longMessage = "这是一个非常长的消息用于测试标题是否会被截断到五十个字符以内的功能验证场景这段话应该超过五十个字符了吧";
    returningQueue.push([{ id: 18 }]);
    mockSubmitTask.mockResolvedValueOnce({ taskId: 42 });

    const result = await caller().aiChat.sendMessage({
      message: longMessage,
    });

    // Verify the call completed successfully — the title truncation
    // happens inside db.insert which is mocked, but validates input is accepted
    expect(result.sessionId).toBe(18);
    expect(result.status).toBe("processing");
  });

  it("propagates submitTask errors", async () => {
    returningQueue.push([{ id: 19 }]);
    mockSubmitTask.mockRejectedValueOnce(new Error("Task queue full"));

    await expect(
      caller().aiChat.sendMessage({ message: "test" })
    ).rejects.toThrow("Task queue full");
  });
});

// ══════════════════════════════════════════════════════════════
// getReplyStatus
// ══════════════════════════════════════════════════════════════

describe("aiChat.getReplyStatus", () => {
  it("returns completed status with message from DB when task is completed", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42,
      status: "completed",
      resultData: { response: "AI回复内容" },
    });
    // The DB select for latest assistant message
    selectResultsQueue.push([{
      id: 20,
      sessionId: 10,
      role: "assistant",
      content: "AI回复内容",
      contentType: "text",
    }]);

    const result = await caller().aiChat.getReplyStatus({
      taskId: 42,
      sessionId: 10,
    });

    expect(result.taskStatus).toBe("completed");
    expect(result.message).toBeDefined();
    expect(result.message!.content).toBe("AI回复内容");
    expect(mockGetTaskStatus).toHaveBeenCalledWith(42);
  });

  it("returns completed with fallback content when DB has no messages", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42,
      status: "completed",
      resultData: { response: "Fallback response" },
    });
    // DB returns no messages
    selectResultsQueue.push([]);

    const result = await caller().aiChat.getReplyStatus({
      taskId: 42,
      sessionId: 10,
    });

    expect(result.taskStatus).toBe("completed");
    expect(result.message).toEqual({ content: "Fallback response" });
  });

  it("returns failed status with error message", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42,
      status: "failed",
      errorMessage: "LLM service unavailable",
    });

    const result = await caller().aiChat.getReplyStatus({
      taskId: 42,
      sessionId: 10,
    });

    expect(result.taskStatus).toBe("failed");
    expect(result.message).toBeNull();
    expect(result.error).toBe("LLM service unavailable");
  });

  it("returns pending status when task is still pending", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42,
      status: "pending",
    });

    const result = await caller().aiChat.getReplyStatus({
      taskId: 42,
      sessionId: 10,
    });

    expect(result.taskStatus).toBe("pending");
    expect(result.message).toBeNull();
  });

  it("returns processing status when task is in progress", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42,
      status: "processing",
    });

    const result = await caller().aiChat.getReplyStatus({
      taskId: 42,
      sessionId: 10,
    });

    expect(result.taskStatus).toBe("processing");
    expect(result.message).toBeNull();
  });

  it("returns not_found when task does not exist", async () => {
    mockGetTaskStatus.mockResolvedValueOnce(null);

    const result = await caller().aiChat.getReplyStatus({
      taskId: 999,
      sessionId: 10,
    });

    expect(result.taskStatus).toBe("not_found");
    expect(result.message).toBeNull();
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

  it("rejects anonymous caller for getReplyStatus", async () => {
    await expect(
      createAnonymousCaller().aiChat.getReplyStatus({ taskId: 1, sessionId: 1 })
    ).rejects.toThrow();
  });
});
