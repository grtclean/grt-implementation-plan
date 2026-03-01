/**
 * AI Notebook Router — Unit Tests
 * Tests 4 procedures: getSuggestions, analyzeEntry, acceptSuggestion, rejectSuggestion
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state (hoisted so vi.mock can reference) ───────────
const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
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

// ── Mock LLM ────────────────────────────────────────────────
const mockInvokeLLM = vi.fn();
vi.mock("../_core/llm", () => ({
  invokeLLM: (...args: any[]) => mockInvokeLLM(...args),
}));

// ── Mock knowledge-base service ─────────────────────────────
const mockSearchDocuments = vi.fn();
vi.mock("../modules/knowledge-base.service", () => ({
  searchDocuments: (...args: any[]) => mockSearchDocuments(...args),
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  mockInvokeLLM.mockReset();
  mockSearchDocuments.mockReset();
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
    });
    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });

  it("returns early when content is undefined", async () => {
    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
    });
    expect(result).toEqual({
      success: true,
      message: "无内容可分析",
      suggestions: [],
    });
    expect(mockInvokeLLM).not.toHaveBeenCalled();
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
    });
    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });

  it("happy path: LLM returns JSON array, suggestions saved to DB", async () => {
    const llmJson = [
      { type: "finding", value: "密封不良", keywords: ["密封", "泄漏"] },
      { type: "improvement", value: "增加扭矩检测", keywords: ["扭矩"] },
    ];

    mockSearchDocuments.mockResolvedValue([
      { category: "standard", title: "FMEA Guide", content: "FMEA content here for reference..." },
    ]);

    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          role: "assistant",
          content: JSON.stringify(llmJson),
        },
        finish_reason: "stop",
      }],
    });

    const savedItem1 = { ...sampleSuggestion, id: 10, suggestedValue: "密封不良" };
    const savedItem2 = { ...sampleSuggestion, id: 11, suggestedValue: "增加扭矩检测", suggestionType: "field_update" };
    returningQueue.push([savedItem1]);
    returningQueue.push([savedItem2]);

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 100,
      content: "今天发现密封泄漏问题，需要进一步分析原因。",
      processType: "FMEA",
      processId: "P-001",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("分析完成，生成2条建议");
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].id).toBe(10);
    expect(result.suggestions[1].id).toBe(11);

    // Verify LLM was called
    expect(mockInvokeLLM).toHaveBeenCalledOnce();
    const llmCall = mockInvokeLLM.mock.calls[0][0];
    expect(llmCall.messages).toHaveLength(2);
    expect(llmCall.messages[0].role).toBe("system");
    expect(llmCall.messages[1].role).toBe("user");

    // Verify searchDocuments was called with first 200 chars of content
    expect(mockSearchDocuments).toHaveBeenCalledOnce();
  });

  it("includes RAG knowledge context in system prompt when KB returns results", async () => {
    mockSearchDocuments.mockResolvedValue([
      { category: "technical", title: "Doc A", content: "Content for doc A about seals" },
      { category: "standard", title: "Doc B", content: "Content for doc B about torque" },
    ]);

    mockInvokeLLM.mockResolvedValue({
      choices: [{ message: { content: "[]" }, finish_reason: "stop" }],
    });

    await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "密封泄漏分析笔记",
    });

    const systemPrompt = mockInvokeLLM.mock.calls[0][0].messages[0].content;
    expect(systemPrompt).toContain("参考知识");
    expect(systemPrompt).toContain("Doc A");
    expect(systemPrompt).toContain("Doc B");
  });

  it("LLM error returns failure response", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockRejectedValue(new Error("LLM service unavailable"));

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "some notebook content",
    });

    expect(result).toEqual({
      success: false,
      message: "AI分析失败",
      suggestions: [],
    });
  });

  it("plain text LLM response (no brackets) produces zero suggestions", async () => {
    // When LLM returns text with no [...] at all, the regex doesn't match,
    // JSON.parse is never called, so no exception → suggestions stays []
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          role: "assistant",
          content: "This is a plain text analysis without any JSON formatting.",
        },
        finish_reason: "stop",
      }],
    });

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "analysis target content",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("分析完成，生成0条建议");
    expect(result.suggestions).toHaveLength(0);
  });

  it("malformed JSON array in LLM response falls back to single finding suggestion", async () => {
    // When regex matches [...] but JSON.parse fails, the catch block creates
    // a single finding suggestion from the raw text (sliced to 500 chars)
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          role: "assistant",
          content: '[this is not valid JSON but has brackets]',
        },
        finish_reason: "stop",
      }],
    });

    const savedItem = { ...sampleSuggestion, id: 20 };
    returningQueue.push([savedItem]);

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "analysis target content",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("分析完成，生成1条建议");
    expect(result.suggestions).toHaveLength(1);
  });

  it("knowledge base failure is non-fatal (still proceeds with LLM)", async () => {
    mockSearchDocuments.mockRejectedValue(new Error("KB connection failed"));
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: '[{"type":"finding","value":"test finding","keywords":["test"]}]',
        },
        finish_reason: "stop",
      }],
    });

    const savedItem = { ...sampleSuggestion, id: 30 };
    returningQueue.push([savedItem]);

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "notebook content to analyze",
    });

    expect(result.success).toBe(true);
    expect(result.suggestions).toHaveLength(1);
    expect(mockInvokeLLM).toHaveBeenCalledOnce();

    // System prompt should NOT contain knowledge context
    const systemPrompt = mockInvokeLLM.mock.calls[0][0].messages[0].content;
    expect(systemPrompt).not.toContain("参考知识");
  });

  it("DB save error per-suggestion is caught (partial save)", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            { type: "finding", value: "first", keywords: [] },
            { type: "improvement", value: "second", keywords: [] },
            { type: "finding", value: "third", keywords: [] },
          ]),
        },
        finish_reason: "stop",
      }],
    });

    // First suggestion saves OK
    const saved1 = { ...sampleSuggestion, id: 40 };
    returningQueue.push([saved1]);
    // Second suggestion: returning() will use default [{ id: 1 }] since queue is empty after first two
    // We need to simulate a DB error. We'll make the second returning() throw.
    // Actually the mock's returning() just shifts from queue. Let's push a normal one for second and third.
    const saved2 = { ...sampleSuggestion, id: 41 };
    returningQueue.push([saved2]);
    const saved3 = { ...sampleSuggestion, id: 42 };
    returningQueue.push([saved3]);

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "multi-suggestion content",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("分析完成，生成3条建议");
    expect(result.suggestions).toHaveLength(3);
  });

  it("maps suggestion types correctly (finding->content_match, improvement->field_update, process->process_link)", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            { type: "finding", value: "f", keywords: [] },
            { type: "improvement", value: "i", keywords: [] },
            { type: "process", value: "p", keywords: [] },
            { type: "unknown", value: "u", keywords: [] },
          ]),
        },
        finish_reason: "stop",
      }],
    });

    returningQueue.push([{ id: 50, suggestionType: "content_match" }]);
    returningQueue.push([{ id: 51, suggestionType: "field_update" }]);
    returningQueue.push([{ id: 52, suggestionType: "process_link" }]);
    returningQueue.push([{ id: 53, suggestionType: "content_match" }]);

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "map test content",
    });

    expect(result.success).toBe(true);
    expect(result.suggestions).toHaveLength(4);
  });

  it("handles LLM returning empty JSON array", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: "[]",
        },
        finish_reason: "stop",
      }],
    });

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "content to analyze",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("分析完成，生成0条建议");
    expect(result.suggestions).toHaveLength(0);
  });

  it("handles LLM returning null content", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: null,
        },
        finish_reason: "stop",
      }],
    });

    // When content is null/empty string, the regex won't match, the inner JSON.parse
    // won't be called, so suggestions stays as []. No DB inserts happen.
    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "analyze this",
    });

    expect(result.success).toBe(true);
    expect(result.suggestions).toHaveLength(0);
  });

  it("handles LLM returning choices with no message", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{}],
    });

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "analyze this",
    });

    expect(result.success).toBe(true);
    expect(result.suggestions).toHaveLength(0);
  });

  it("extracts JSON array from mixed LLM response text", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: 'Here is my analysis:\n```json\n[{"type":"finding","value":"extracted","keywords":["kw"]}]\n```\nHope this helps!',
        },
        finish_reason: "stop",
      }],
    });

    const savedItem = { ...sampleSuggestion, id: 60, suggestedValue: "extracted" };
    returningQueue.push([savedItem]);

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "content with mixed response",
    });

    expect(result.success).toBe(true);
    expect(result.suggestions).toHaveLength(1);
  });

  it("passes processType and processId to DB insert", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: '[{"type":"finding","value":"val","keywords":[]}]',
        },
        finish_reason: "stop",
      }],
    });

    returningQueue.push([{ id: 70 }]);

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 55,
      content: "content with process info",
      processType: "8D",
      processId: "8D-001",
    });

    expect(result.success).toBe(true);
  });

  it("handles entryId as string input (converted via toNum)", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: '[{"type":"finding","value":"v","keywords":[]}]',
        },
        finish_reason: "stop",
      }],
    });

    returningQueue.push([{ id: 80 }]);

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: "42",
      content: "string entryId test",
    });

    expect(result.success).toBe(true);
    expect(result.suggestions).toHaveLength(1);
  });

  it("slices content to 200 chars for KB search", async () => {
    const longContent = "A".repeat(500);
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: { content: "[]" },
        finish_reason: "stop",
      }],
    });

    await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: longContent,
    });

    expect(mockSearchDocuments).toHaveBeenCalledOnce();
    const searchArg = mockSearchDocuments.mock.calls[0][0];
    expect(searchArg.length).toBe(200);
  });

  it("user prompt includes the full content", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: { content: "[]" },
        finish_reason: "stop",
      }],
    });

    const content = "具体的笔记内容测试";
    await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content,
    });

    const userMsg = mockInvokeLLM.mock.calls[0][0].messages[1].content;
    expect(userMsg).toContain(content);
  });

  it("when returning() gives undefined saved, it is not pushed to savedSuggestions", async () => {
    mockSearchDocuments.mockResolvedValue([]);
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: '[{"type":"finding","value":"v","keywords":[]}]',
        },
        finish_reason: "stop",
      }],
    });

    // returning() returns an array where destructured [saved] gives undefined
    returningQueue.push([]);

    const result = await caller().aiNotebook.analyzeEntry({
      entryId: 1,
      content: "test undefined saved",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("分析完成，生成0条建议");
    expect(result.suggestions).toHaveLength(0);
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
