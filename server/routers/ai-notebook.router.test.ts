/**
 * AI Notebook Router — Unit Tests
 * Tests 5 procedures: getSuggestions, analyzeEntry, getAnalysisStatus, acceptSuggestion, rejectSuggestion
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state (hoisted so vi.mock can reference) ───────────
const { selectResultsQueue, returningQueue, mockSubmitTask, mockGetTaskStatus } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  const mockSubmitTask = vi.fn(async () => ({ taskId: 42 }));
  const mockGetTaskStatus = vi.fn(async () => ({
    id: 42,
    status: "completed",
    resultData: { suggestions: [], message: "分析完成" },
  }));
  return { selectResultsQueue, returningQueue, mockSubmitTask, mockGetTaskStatus };
});

// ── Mock ../db with chainable requireDb ─────────────────────
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

// ── Mock drizzle-orm operators (pass-through) ───────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

// ── Mock task-worker.service ────────────────────────────────
vi.mock("../services/task-worker.service", () => ({
  submitTask: (...args: any[]) => mockSubmitTask(...args),
  getTaskStatus: (...args: any[]) => mockGetTaskStatus(...args),
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  mockSubmitTask.mockReset().mockResolvedValue({ taskId: 42 });
  mockGetTaskStatus.mockReset().mockResolvedValue({
    id: 42,
    status: "completed",
    resultData: { suggestions: [], message: "分析完成" },
  });
});

const caller = () => createAuthenticatedCaller();

// ── Sample data ─────────────────────────────────────────────
const sampleSuggestion = {
  id: 1,
  entryId: 100,
  suggestionType: "content_match",
  targetProcessType: "FMEA",
  targetProcessId: "P-001",
  targetField: null,
  currentValue: null,
  suggestedValue: "发现密封泄漏问题",
  confidenceScore: "0.80",
  extractedKeywords: ["密封", "泄漏"],
  reasoning: "AI分析: finding",
  status: "pending",
  acceptedValue: null,
  acceptedBy: null,
  acceptedAt: null,
  createdAt: "2026-01-15T00:00:00.000Z",
};

// ══════════════════════════════════════════════════════════════
// getSuggestions
// ══════════════════════════════════════════════════════════════
describe("aiNotebook.getSuggestions", () => {
  it("returns all suggestions with no input", async () => {
    selectResultsQueue.push([sampleSuggestion, { ...sampleSuggestion, id: 2 }]);
    const result = await caller().aiNotebook.getSuggestions();
    expect(result).toHaveLength(2);
  });

  it("returns suggestions when called with empty object", async () => {
    selectResultsQueue.push([sampleSuggestion]);
    const result = await caller().aiNotebook.getSuggestions({});
    expect(result).toHaveLength(1);
  });

  it("filters by entryId (numeric)", async () => {
    selectResultsQueue.push([
      sampleSuggestion,
      { ...sampleSuggestion, id: 2, entryId: 200 },
    ]);
    const result = await caller().aiNotebook.getSuggestions({ entryId: 100 });
    expect(result).toHaveLength(1);
    expect(result[0].entryId).toBe(100);
  });

  it("filters by entryId (string)", async () => {
    selectResultsQueue.push([
      sampleSuggestion,
      { ...sampleSuggestion, id: 2, entryId: 200 },
    ]);
    const result = await caller().aiNotebook.getSuggestions({ entryId: "100" });
    expect(result).toHaveLength(1);
    expect(result[0].entryId).toBe(100);
  });

  it("filters by status", async () => {
    selectResultsQueue.push([
      sampleSuggestion,
      { ...sampleSuggestion, id: 2, status: "accepted" },
    ]);
    const result = await caller().aiNotebook.getSuggestions({ status: "pending" });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("pending");
  });

  it("filters by both entryId and status simultaneously", async () => {
    selectResultsQueue.push([
      sampleSuggestion,
      { ...sampleSuggestion, id: 2, entryId: 200 },
      { ...sampleSuggestion, id: 3, status: "accepted" },
      { ...sampleSuggestion, id: 4, entryId: 200, status: "accepted" },
    ]);
    const result = await caller().aiNotebook.getSuggestions({
      entryId: 100,
      status: "pending",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("returns empty array when no matches", async () => {
    selectResultsQueue.push([]);
    const result = await caller().aiNotebook.getSuggestions({ status: "nonexistent" });
    expect(result).toHaveLength(0);
  });

  it("returns empty when entryId filter matches nothing", async () => {
    selectResultsQueue.push([sampleSuggestion]);
    const result = await caller().aiNotebook.getSuggestions({ entryId: 999 });
    expect(result).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// analyzeEntry
// ══════════════════════════════════════════════════════════════
describe("aiNotebook.analyzeEntry", () => {
  it("returns early when content is empty string", async () => {
    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "",
    });
    expect(result).toEqual({
      success: true,
      message: "无内容可分析",
      suggestions: [],
      taskId: null,
    });
    expect(mockSubmitTask).not.toHaveBeenCalled();
  });

  it("returns early when content is undefined", async () => {
    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
    });
    expect(result).toEqual({
      success: true,
      message: "无内容可分析",
      suggestions: [],
      taskId: null,
    });
    expect(mockSubmitTask).not.toHaveBeenCalled();
  });

  it("returns early when content is whitespace-only", async () => {
    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "   \n\t  ",
    });
    expect(result).toEqual({
      success: true,
      message: "无内容可分析",
      suggestions: [],
      taskId: null,
    });
    expect(mockSubmitTask).not.toHaveBeenCalled();
  });

  it("submits task and returns taskId when content is provided", async () => {
    mockSubmitTask.mockResolvedValueOnce({ taskId: 99 });

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 100,
      content: "今天发现密封泄漏问题，需要进一步分析原因。",
      processType: "FMEA",
      processId: "P-001",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("分析任务已提交");
    expect(result.suggestions).toEqual([]);
    expect(result.taskId).toBe(99);
    expect(mockSubmitTask).toHaveBeenCalledOnce();
    expect(mockSubmitTask).toHaveBeenCalledWith(
      "AI_NOTEBOOK_ANALYZE",
      expect.objectContaining({
        entryId: 100,
        content: "今天发现密封泄漏问题，需要进一步分析原因。",
        processType: "FMEA",
        processId: "P-001",
      }),
      expect.any(String),
    );
  });

  it("handles entryId as string input (converted via toNum)", async () => {
    mockSubmitTask.mockResolvedValueOnce({ taskId: 55 });

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: "42",
      content: "string entryId test",
    });

    expect(result.success).toBe(true);
    expect(result.taskId).toBe(55);
    expect(mockSubmitTask).toHaveBeenCalledWith(
      "AI_NOTEBOOK_ANALYZE",
      expect.objectContaining({ entryId: 42 }),
      expect.any(String),
    );
  });

  it("passes undefined processType and processId when not provided", async () => {
    mockSubmitTask.mockResolvedValueOnce({ taskId: 60 });

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "minimal content",
    });

    expect(result.success).toBe(true);
    expect(result.taskId).toBe(60);
    expect(mockSubmitTask).toHaveBeenCalledWith(
      "AI_NOTEBOOK_ANALYZE",
      expect.objectContaining({
        processType: undefined,
        processId: undefined,
      }),
      expect.any(String),
    );
  });

  it("propagates submitTask errors", async () => {
    mockSubmitTask.mockRejectedValueOnce(new Error("Task queue full"));

    await expect(
      caller().aiNotebook.analyzeEntry({
        entryId: 1,
        content: "content that triggers error",
      })
    ).rejects.toThrow("Task queue full");
  });
});

// ══════════════════════════════════════════════════════════════
// getAnalysisStatus
// ══════════════════════════════════════════════════════════════
describe("aiNotebook.getAnalysisStatus", () => {
  it("returns completed status with suggestions when task is done", async () => {
    const suggestions = [
      { type: "finding", value: "密封不良", keywords: ["密封"] },
      { type: "improvement", value: "增加扭矩检测", keywords: ["扭矩"] },
    ];
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42,
      status: "completed",
      resultData: { suggestions, message: "分析完成，生成2条建议" },
    });

    const result = await caller().aiNotebook.getAnalysisStatus({ taskId: 42 });

    expect(result.taskStatus).toBe("completed");
    expect(result.suggestions).toEqual(suggestions);
    expect(result.message).toBe("分析完成，生成2条建议");
    expect(mockGetTaskStatus).toHaveBeenCalledWith(42);
  });

  it("returns completed with empty suggestions when resultData has none", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42,
      status: "completed",
      resultData: { message: "分析完成，生成0条建议" },
    });

    const result = await caller().aiNotebook.getAnalysisStatus({ taskId: 42 });

    expect(result.taskStatus).toBe("completed");
    expect(result.suggestions).toEqual([]);
    expect(result.message).toBe("分析完成，生成0条建议");
  });

  it("returns failed status with error message", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42,
      status: "failed",
      errorMessage: "LLM service unavailable",
    });

    const result = await caller().aiNotebook.getAnalysisStatus({ taskId: 42 });

    expect(result.taskStatus).toBe("failed");
    expect(result.suggestions).toEqual([]);
    expect(result.error).toBe("LLM service unavailable");
  });

  it("returns pending status when task is still pending", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42,
      status: "pending",
    });

    const result = await caller().aiNotebook.getAnalysisStatus({ taskId: 42 });

    expect(result.taskStatus).toBe("pending");
    expect(result.suggestions).toEqual([]);
  });

  it("returns processing status when task is in progress", async () => {
    mockGetTaskStatus.mockResolvedValueOnce({
      id: 42,
      status: "processing",
    });

    const result = await caller().aiNotebook.getAnalysisStatus({ taskId: 42 });

    expect(result.taskStatus).toBe("processing");
    expect(result.suggestions).toEqual([]);
  });

  it("returns not_found when task does not exist", async () => {
    mockGetTaskStatus.mockResolvedValueOnce(null);

    const result = await caller().aiNotebook.getAnalysisStatus({ taskId: 999 });

    expect(result.taskStatus).toBe("not_found");
    expect(result.suggestions).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// acceptSuggestion
// ══════════════════════════════════════════════════════════════
describe("aiNotebook.acceptSuggestion", () => {
  it("accepts suggestion with numeric id", async () => {
    const accepted = { ...sampleSuggestion, id: 1, status: "accepted", acceptedValue: "final value" };
    returningQueue.push([accepted]);

    const result = await caller().aiNotebook.acceptSuggestion({
      id: 1,
      acceptedValue: "final value",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(accepted);
  });

  it("accepts suggestion with string id", async () => {
    const accepted = { ...sampleSuggestion, id: 5, status: "accepted" };
    returningQueue.push([accepted]);

    const result = await caller().aiNotebook.acceptSuggestion({
      id: "5",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(accepted);
  });

  it("uses suggestionId when id is not provided", async () => {
    const accepted = { ...sampleSuggestion, id: 10, status: "accepted" };
    returningQueue.push([accepted]);

    const result = await caller().aiNotebook.acceptSuggestion({
      suggestionId: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(accepted);
  });

  it("uses suggestionId as string when id is not provided", async () => {
    const accepted = { ...sampleSuggestion, id: 15, status: "accepted" };
    returningQueue.push([accepted]);

    const result = await caller().aiNotebook.acceptSuggestion({
      suggestionId: "15",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(accepted);
  });

  it("prefers id over suggestionId when both provided", async () => {
    const accepted = { ...sampleSuggestion, id: 1, status: "accepted" };
    returningQueue.push([accepted]);

    const result = await caller().aiNotebook.acceptSuggestion({
      id: 1,
      suggestionId: 99,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(accepted);
  });

  it("falls back to 0 when neither id nor suggestionId provided", async () => {
    const accepted = { ...sampleSuggestion, status: "accepted" };
    returningQueue.push([accepted]);

    const result = await caller().aiNotebook.acceptSuggestion({});

    expect(result.success).toBe(true);
  });

  it("accepts with acceptedValue", async () => {
    const accepted = { ...sampleSuggestion, status: "accepted", acceptedValue: "custom value" };
    returningQueue.push([accepted]);

    const result = await caller().aiNotebook.acceptSuggestion({
      id: 1,
      acceptedValue: "custom value",
    });

    expect(result.success).toBe(true);
    expect(result.data.acceptedValue).toBe("custom value");
  });

  it("accepts without acceptedValue", async () => {
    const accepted = { ...sampleSuggestion, status: "accepted" };
    returningQueue.push([accepted]);

    const result = await caller().aiNotebook.acceptSuggestion({
      id: 1,
    });

    expect(result.success).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// rejectSuggestion
// ══════════════════════════════════════════════════════════════
describe("aiNotebook.rejectSuggestion", () => {
  it("rejects suggestion with numeric id", async () => {
    const rejected = { ...sampleSuggestion, id: 1, status: "rejected" };
    returningQueue.push([rejected]);

    const result = await caller().aiNotebook.rejectSuggestion({
      id: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(rejected);
  });

  it("rejects suggestion with string id", async () => {
    const rejected = { ...sampleSuggestion, id: 7, status: "rejected" };
    returningQueue.push([rejected]);

    const result = await caller().aiNotebook.rejectSuggestion({
      id: "7",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(rejected);
  });

  it("uses suggestionId when id is not provided", async () => {
    const rejected = { ...sampleSuggestion, id: 20, status: "rejected" };
    returningQueue.push([rejected]);

    const result = await caller().aiNotebook.rejectSuggestion({
      suggestionId: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(rejected);
  });

  it("uses suggestionId as string when id is not provided", async () => {
    const rejected = { ...sampleSuggestion, id: 25, status: "rejected" };
    returningQueue.push([rejected]);

    const result = await caller().aiNotebook.rejectSuggestion({
      suggestionId: "25",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(rejected);
  });

  it("prefers id over suggestionId when both provided", async () => {
    const rejected = { ...sampleSuggestion, id: 1, status: "rejected" };
    returningQueue.push([rejected]);

    const result = await caller().aiNotebook.rejectSuggestion({
      id: 1,
      suggestionId: 99,
    });

    expect(result.success).toBe(true);
  });

  it("falls back to 0 when neither id nor suggestionId provided", async () => {
    const rejected = { ...sampleSuggestion, status: "rejected" };
    returningQueue.push([rejected]);

    const result = await caller().aiNotebook.rejectSuggestion({});

    expect(result.success).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// Authentication Guards
// ══════════════════════════════════════════════════════════════
describe("aiNotebook — authentication", () => {
  it("rejects anonymous for getSuggestions", async () => {
    await expect(
      createAnonymousCaller().aiNotebook.getSuggestions()
    ).rejects.toThrow();
  });

  it("rejects anonymous for analyzeEntry", async () => {
    await expect(
      createAnonymousCaller().aiNotebook.analyzeEntry({
        entryId: 1,
        content: "test",
      })
    ).rejects.toThrow();
  });

  it("rejects anonymous for getAnalysisStatus", async () => {
    await expect(
      createAnonymousCaller().aiNotebook.getAnalysisStatus({ taskId: 1 })
    ).rejects.toThrow();
  });

  it("rejects anonymous for acceptSuggestion", async () => {
    await expect(
      createAnonymousCaller().aiNotebook.acceptSuggestion({ id: 1 })
    ).rejects.toThrow();
  });

  it("rejects anonymous for rejectSuggestion", async () => {
    await expect(
      createAnonymousCaller().aiNotebook.rejectSuggestion({ id: 1 })
    ).rejects.toThrow();
  });
});
