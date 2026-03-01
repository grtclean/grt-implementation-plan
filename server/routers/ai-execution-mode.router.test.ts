/**
 * AI Execution Mode Router — Comprehensive Vitest Test Suite
 *
 * Covers all 10 procedures:
 *   getModeConfig, execute, recordAdoption, getEffectivenessStats,
 *   getRecentLogs, list, getById, create, update, delete
 *
 * Run: npx vitest run server/routers/ai-execution-mode.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the service module (must be before any imports that use it)
// ---------------------------------------------------------------------------

const { mockExecuteAI, mockRecordAdoption, mockGetModeConfig, mockGetEffectivenessStats, mockGetRecentLogs } = vi.hoisted(() => ({
  mockExecuteAI: vi.fn(),
  mockRecordAdoption: vi.fn(),
  mockGetModeConfig: vi.fn(),
  mockGetEffectivenessStats: vi.fn(),
  mockGetRecentLogs: vi.fn(),
}));

vi.mock("../services/ai-execution-mode.service", () => ({
  executeAI: mockExecuteAI,
  recordAdoption: mockRecordAdoption,
  getModeConfig: mockGetModeConfig,
  getEffectivenessStats: mockGetEffectivenessStats,
  getRecentLogs: mockGetRecentLogs,
}));

// ---------------------------------------------------------------------------
// Import test utilities AFTER mocks are registered
// ---------------------------------------------------------------------------

import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// =========================================================================
// Reset mocks before each test
// =========================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// =========================================================================
// 1. getModeConfig — Get mode configuration for an assistant type
// =========================================================================

describe("aiExecutionMode.getModeConfig", () => {
  it("returns config for a specific assistant type", async () => {
    const config = {
      assistantType: "solution",
      hasInternalKnowledge: true,
      supportedModes: ["internal", "generative", "shadow"],
    };
    mockGetModeConfig.mockReturnValue(config);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getModeConfig({
      assistantType: "solution",
    });

    expect(result).toEqual(config);
    expect(mockGetModeConfig).toHaveBeenCalledWith("solution");
  });

  it("uses 'default' when no input is provided", async () => {
    const config = {
      assistantType: "default",
      hasInternalKnowledge: false,
      supportedModes: ["internal", "generative", "shadow"],
    };
    mockGetModeConfig.mockReturnValue(config);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getModeConfig();

    expect(result).toEqual(config);
    expect(mockGetModeConfig).toHaveBeenCalledWith("default");
  });

  it("uses 'default' when assistantType is empty string", async () => {
    const config = {
      assistantType: "default",
      hasInternalKnowledge: false,
      supportedModes: ["internal", "generative", "shadow"],
    };
    mockGetModeConfig.mockReturnValue(config);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getModeConfig({
      assistantType: "",
    });

    expect(result).toEqual(config);
    expect(mockGetModeConfig).toHaveBeenCalledWith("default");
  });

  it("calls getModeConfig with the provided assistantType", async () => {
    mockGetModeConfig.mockReturnValue({
      assistantType: "quotation",
      hasInternalKnowledge: false,
      supportedModes: ["internal", "generative", "shadow"],
    });

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.getModeConfig({ assistantType: "quotation" });

    expect(mockGetModeConfig).toHaveBeenCalledTimes(1);
    expect(mockGetModeConfig).toHaveBeenCalledWith("quotation");
  });
});

// =========================================================================
// 2. execute — Execute an AI request
// =========================================================================

describe("aiExecutionMode.execute", () => {
  const validInput = {
    assistantType: "solution",
    mode: "internal" as const,
    content: "Recommend a cleaning solution for engine blocks",
  };

  it("executes AI request and returns result with ISO timestamp", async () => {
    const timestamp = new Date("2026-03-01T10:00:00.000Z");
    mockExecuteAI.mockResolvedValue({
      content: "Recommended: GRT-UC series ultrasonic cleaner",
      mode: "internal",
      sessionId: "sess-001",
      timestamp,
      tokensUsed: 150,
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.execute(validInput);

    expect(result.content).toBe("Recommended: GRT-UC series ultrasonic cleaner");
    expect(result.mode).toBe("internal");
    expect(result.sessionId).toBe("sess-001");
    expect(result.timestamp).toBe("2026-03-01T10:00:00.000Z");
    expect(result.tokensUsed).toBe(150);
  });

  it("converts Date timestamp to ISO string", async () => {
    const timestamp = new Date("2026-01-15T08:30:00.000Z");
    mockExecuteAI.mockResolvedValue({
      content: "Response",
      mode: "generative",
      sessionId: "sess-002",
      timestamp,
      tokensUsed: 200,
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.execute({
      ...validInput,
      mode: "generative",
    });

    expect(result.timestamp).toBe("2026-01-15T08:30:00.000Z");
    expect(typeof result.timestamp).toBe("string");
  });

  it("passes input correctly to executeAI service", async () => {
    const timestamp = new Date();
    mockExecuteAI.mockResolvedValue({
      content: "Result",
      mode: "internal",
      sessionId: "sess-003",
      timestamp,
      tokensUsed: 100,
    });

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.execute(validInput);

    expect(mockExecuteAI).toHaveBeenCalledWith({
      assistantType: "solution",
      mode: "internal",
      content: "Recommend a cleaning solution for engine blocks",
      context: undefined,
    });
  });

  it("passes optional context to executeAI", async () => {
    const timestamp = new Date();
    mockExecuteAI.mockResolvedValue({
      content: "Result",
      mode: "shadow",
      sessionId: "sess-004",
      timestamp,
      tokensUsed: 50,
    });

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.execute({
      ...validInput,
      mode: "shadow",
      context: {
        processType: "FMEA",
        processId: "fmea-001",
        stepCode: "STEP-3",
        suggestionMode: "auto",
      },
    });

    expect(mockExecuteAI).toHaveBeenCalledWith({
      assistantType: "solution",
      mode: "shadow",
      content: "Recommend a cleaning solution for engine blocks",
      context: {
        processType: "FMEA",
        processId: "fmea-001",
        stepCode: "STEP-3",
        suggestionMode: "auto",
      },
    });
  });

  it("accepts mode 'internal'", async () => {
    mockExecuteAI.mockResolvedValue({
      content: "OK",
      mode: "internal",
      sessionId: "s1",
      timestamp: new Date(),
      tokensUsed: 10,
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.execute({
      ...validInput,
      mode: "internal",
    });

    expect(result.mode).toBe("internal");
  });

  it("accepts mode 'generative'", async () => {
    mockExecuteAI.mockResolvedValue({
      content: "OK",
      mode: "generative",
      sessionId: "s2",
      timestamp: new Date(),
      tokensUsed: 20,
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.execute({
      ...validInput,
      mode: "generative",
    });

    expect(result.mode).toBe("generative");
  });

  it("accepts mode 'shadow'", async () => {
    mockExecuteAI.mockResolvedValue({
      content: "OK",
      mode: "shadow",
      sessionId: "s3",
      timestamp: new Date(),
      tokensUsed: 30,
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.execute({
      ...validInput,
      mode: "shadow",
    });

    expect(result.mode).toBe("shadow");
  });

  it("handles undefined tokensUsed in result", async () => {
    mockExecuteAI.mockResolvedValue({
      content: "Fallback",
      mode: "internal",
      sessionId: "s-no-tokens",
      timestamp: new Date(),
      tokensUsed: undefined,
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.execute(validInput);

    expect(result.tokensUsed).toBeUndefined();
  });

  it("propagates service errors", async () => {
    mockExecuteAI.mockRejectedValue(new Error("LLM service unavailable"));

    const caller = createAuthenticatedCaller();
    await expect(
      caller.aiExecutionMode.execute(validInput)
    ).rejects.toThrow("LLM service unavailable");
  });
});

// =========================================================================
// 3. execute — Input validation
// =========================================================================

describe("aiExecutionMode.execute input validation", () => {
  it("rejects invalid mode value", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.aiExecutionMode.execute({
        assistantType: "solution",
        mode: "invalid-mode" as any,
        content: "Test",
      })
    ).rejects.toThrow();
  });

  it("rejects empty content string", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.aiExecutionMode.execute({
        assistantType: "solution",
        mode: "internal",
        content: "",
      })
    ).rejects.toThrow();
  });

  it("rejects empty assistantType string", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.aiExecutionMode.execute({
        assistantType: "",
        mode: "internal",
        content: "Test",
      })
    ).rejects.toThrow();
  });

  it("rejects missing required fields", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.aiExecutionMode.execute as any)({})
    ).rejects.toThrow();
  });

  it("accepts context with partial fields", async () => {
    mockExecuteAI.mockResolvedValue({
      content: "OK",
      mode: "internal",
      sessionId: "s-partial",
      timestamp: new Date(),
      tokensUsed: 5,
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.execute({
      assistantType: "solution",
      mode: "internal",
      content: "Test",
      context: { processType: "FMEA" },
    });

    expect(result.content).toBe("OK");
  });

  it("accepts context with no fields", async () => {
    mockExecuteAI.mockResolvedValue({
      content: "OK",
      mode: "internal",
      sessionId: "s-empty-ctx",
      timestamp: new Date(),
      tokensUsed: 5,
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.execute({
      assistantType: "solution",
      mode: "internal",
      content: "Test",
      context: {},
    });

    expect(result.content).toBe("OK");
  });
});

// =========================================================================
// 4. recordAdoption — Record adoption feedback
// =========================================================================

describe("aiExecutionMode.recordAdoption", () => {
  it("records adoption with feedback and returns ISO timestamp", () => {
    const timestamp = new Date("2026-03-01T12:00:00.000Z");
    mockRecordAdoption.mockReturnValue({
      sessionId: "sess-001",
      isAdopted: true,
      feedback: "Great suggestion!",
      timestamp,
    });

    const caller = createAuthenticatedCaller();
    const result = caller.aiExecutionMode.recordAdoption({
      sessionId: "sess-001",
      isAdopted: true,
      feedback: "Great suggestion!",
    });

    // recordAdoption is synchronous in the router
    return (result as Promise<any>).then((r: any) => {
      expect(r.success).toBe(true);
      expect(r.record.sessionId).toBe("sess-001");
      expect(r.record.isAdopted).toBe(true);
      expect(r.record.feedback).toBe("Great suggestion!");
      expect(r.record.timestamp).toBe("2026-03-01T12:00:00.000Z");
      expect(typeof r.record.timestamp).toBe("string");
    });
  });

  it("records adoption without feedback", async () => {
    const timestamp = new Date("2026-02-20T15:30:00.000Z");
    mockRecordAdoption.mockReturnValue({
      sessionId: "sess-002",
      isAdopted: false,
      feedback: undefined,
      timestamp,
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.recordAdoption({
      sessionId: "sess-002",
      isAdopted: false,
    });

    expect(result.success).toBe(true);
    expect(result.record.isAdopted).toBe(false);
    expect(result.record.feedback).toBeUndefined();
    expect(result.record.timestamp).toBe("2026-02-20T15:30:00.000Z");
  });

  it("calls recordAdoption service with correct arguments", async () => {
    const timestamp = new Date();
    mockRecordAdoption.mockReturnValue({
      sessionId: "sess-003",
      isAdopted: true,
      feedback: "Helpful",
      timestamp,
    });

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.recordAdoption({
      sessionId: "sess-003",
      isAdopted: true,
      feedback: "Helpful",
    });

    expect(mockRecordAdoption).toHaveBeenCalledWith("sess-003", true, "Helpful");
  });

  it("calls recordAdoption without feedback when omitted", async () => {
    const timestamp = new Date();
    mockRecordAdoption.mockReturnValue({
      sessionId: "sess-004",
      isAdopted: false,
      timestamp,
    });

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.recordAdoption({
      sessionId: "sess-004",
      isAdopted: false,
    });

    expect(mockRecordAdoption).toHaveBeenCalledWith("sess-004", false, undefined);
  });

  it("converts Date timestamp to ISO string", async () => {
    const specificDate = new Date("2025-12-25T00:00:00.000Z");
    mockRecordAdoption.mockReturnValue({
      sessionId: "sess-christmas",
      isAdopted: true,
      timestamp: specificDate,
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.recordAdoption({
      sessionId: "sess-christmas",
      isAdopted: true,
    });

    expect(result.record.timestamp).toBe("2025-12-25T00:00:00.000Z");
  });
});

// =========================================================================
// 5. recordAdoption — Input validation
// =========================================================================

describe("aiExecutionMode.recordAdoption input validation", () => {
  it("rejects empty sessionId", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.aiExecutionMode.recordAdoption({
        sessionId: "",
        isAdopted: true,
      })
    ).rejects.toThrow();
  });

  it("rejects missing sessionId", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.aiExecutionMode.recordAdoption as any)({
        isAdopted: true,
      })
    ).rejects.toThrow();
  });

  it("rejects missing isAdopted", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.aiExecutionMode.recordAdoption as any)({
        sessionId: "sess-001",
      })
    ).rejects.toThrow();
  });

  it("rejects non-boolean isAdopted", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.aiExecutionMode.recordAdoption({
        sessionId: "sess-001",
        isAdopted: "yes" as any,
      })
    ).rejects.toThrow();
  });
});

// =========================================================================
// 6. getEffectivenessStats — Get effectiveness statistics
// =========================================================================

describe("aiExecutionMode.getEffectivenessStats", () => {
  it("returns stats without filters", async () => {
    const stats = [{
      executionMode: "all",
      assistantType: "all",
      totalCount: 100,
      adoptedCount: 75,
      adoptionRate: 75.0,
      avgResponseTime: 0,
    }];
    mockGetEffectivenessStats.mockReturnValue(stats);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getEffectivenessStats();

    expect(result).toEqual(stats);
    expect(mockGetEffectivenessStats).toHaveBeenCalledWith(undefined, undefined);
  });

  it("passes assistantType filter", async () => {
    const stats = [{
      executionMode: "all",
      assistantType: "solution",
      totalCount: 50,
      adoptedCount: 40,
      adoptionRate: 80.0,
      avgResponseTime: 0,
    }];
    mockGetEffectivenessStats.mockReturnValue(stats);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getEffectivenessStats({
      assistantType: "solution",
    });

    expect(result).toEqual(stats);
    expect(mockGetEffectivenessStats).toHaveBeenCalledWith("solution", undefined);
  });

  it("passes mode filter", async () => {
    const stats = [{
      executionMode: "internal",
      assistantType: "all",
      totalCount: 30,
      adoptedCount: 25,
      adoptionRate: 83.3,
      avgResponseTime: 0,
    }];
    mockGetEffectivenessStats.mockReturnValue(stats);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getEffectivenessStats({
      mode: "internal",
    });

    expect(result).toEqual(stats);
    expect(mockGetEffectivenessStats).toHaveBeenCalledWith(undefined, "internal");
  });

  it("passes both filters", async () => {
    const stats = [{
      executionMode: "generative",
      assistantType: "quotation",
      totalCount: 20,
      adoptedCount: 15,
      adoptionRate: 75.0,
      avgResponseTime: 0,
    }];
    mockGetEffectivenessStats.mockReturnValue(stats);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getEffectivenessStats({
      assistantType: "quotation",
      mode: "generative",
    });

    expect(result).toEqual(stats);
    expect(mockGetEffectivenessStats).toHaveBeenCalledWith("quotation", "generative");
  });

  it("rejects invalid mode value in input", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.aiExecutionMode.getEffectivenessStats({
        mode: "shadow" as any,
      })
    ).rejects.toThrow();
  });
});

// =========================================================================
// 7. getRecentLogs — Get recent execution logs
// =========================================================================

describe("aiExecutionMode.getRecentLogs", () => {
  it("returns logs with timestamps converted to ISO strings", async () => {
    const ts1 = new Date("2026-03-01T09:00:00.000Z");
    const ts2 = new Date("2026-03-01T08:00:00.000Z");
    mockGetRecentLogs.mockReturnValue([
      { sessionId: "s1", mode: "internal", timestamp: ts1, tokensUsed: 100, contentPreview: "Hello..." },
      { sessionId: "s2", mode: "generative", timestamp: ts2, tokensUsed: 200, contentPreview: "World..." },
    ]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getRecentLogs();

    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBe("2026-03-01T09:00:00.000Z");
    expect(result[1].timestamp).toBe("2026-03-01T08:00:00.000Z");
    expect(typeof result[0].timestamp).toBe("string");
    expect(typeof result[1].timestamp).toBe("string");
  });

  it("uses default limit of 10 when no input provided", async () => {
    mockGetRecentLogs.mockReturnValue([]);

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.getRecentLogs();

    expect(mockGetRecentLogs).toHaveBeenCalledWith(10);
  });

  it("passes custom limit to getRecentLogs", async () => {
    mockGetRecentLogs.mockReturnValue([]);

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.getRecentLogs({ limit: 25 });

    expect(mockGetRecentLogs).toHaveBeenCalledWith(25);
  });

  it("returns empty array when no logs exist", async () => {
    mockGetRecentLogs.mockReturnValue([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getRecentLogs();

    expect(result).toEqual([]);
  });

  it("maps each log timestamp from Date to ISO string", async () => {
    const logs = [
      { sessionId: "a", mode: "internal", timestamp: new Date("2026-01-01T00:00:00.000Z"), tokensUsed: 10, contentPreview: "A" },
      { sessionId: "b", mode: "generative", timestamp: new Date("2026-02-01T00:00:00.000Z"), tokensUsed: 20, contentPreview: "B" },
      { sessionId: "c", mode: "shadow", timestamp: new Date("2026-03-01T00:00:00.000Z"), tokensUsed: 30, contentPreview: "C" },
    ];
    mockGetRecentLogs.mockReturnValue(logs);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getRecentLogs({ limit: 3 });

    expect(result).toHaveLength(3);
    result.forEach((log: any) => {
      expect(typeof log.timestamp).toBe("string");
      // Verify it's a valid ISO date
      expect(new Date(log.timestamp).toISOString()).toBe(log.timestamp);
    });
  });

  it("preserves all non-timestamp fields in the log", async () => {
    mockGetRecentLogs.mockReturnValue([
      {
        sessionId: "detailed-session",
        mode: "shadow",
        timestamp: new Date("2026-03-01T12:00:00.000Z"),
        tokensUsed: 999,
        contentPreview: "A detailed content preview here...",
      },
    ]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getRecentLogs({ limit: 1 });

    expect(result[0].sessionId).toBe("detailed-session");
    expect(result[0].mode).toBe("shadow");
    expect(result[0].tokensUsed).toBe(999);
    expect(result[0].contentPreview).toBe("A detailed content preview here...");
  });
});

// =========================================================================
// 8. list — Stub list endpoint
// =========================================================================

describe("aiExecutionMode.list", () => {
  it("returns empty items array and total 0", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.list();

    expect(result).toEqual({ items: [], total: 0 });
  });

  it("always returns the same stub response", async () => {
    const caller = createAuthenticatedCaller();
    const result1 = await caller.aiExecutionMode.list();
    const result2 = await caller.aiExecutionMode.list();

    expect(result1).toEqual(result2);
    expect(result1.items).toEqual([]);
    expect(result1.total).toBe(0);
  });
});

// =========================================================================
// 9. getById — Stub getById endpoint
// =========================================================================

describe("aiExecutionMode.getById", () => {
  it("returns null for any id", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.getById({ id: "some-id" });

    expect(result).toBeNull();
  });

  it("returns null for different ids", async () => {
    const caller = createAuthenticatedCaller();
    const r1 = await caller.aiExecutionMode.getById({ id: "abc" });
    const r2 = await caller.aiExecutionMode.getById({ id: "xyz" });

    expect(r1).toBeNull();
    expect(r2).toBeNull();
  });
});

// =========================================================================
// 10. create — Stub create endpoint
// =========================================================================

describe("aiExecutionMode.create", () => {
  it("returns success true with name input", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.create({ name: "Test Mode" });

    expect(result).toEqual({ success: true });
  });

  it("returns success true with mode input", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.create({ mode: "internal" });

    expect(result).toEqual({ success: true });
  });

  it("returns success true with config input", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.create({
      config: { key: "value", nested: "data" },
    });

    expect(result).toEqual({ success: true });
  });

  it("returns success true with empty input", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.create({});

    expect(result).toEqual({ success: true });
  });
});

// =========================================================================
// 11. update — Stub update endpoint
// =========================================================================

describe("aiExecutionMode.update", () => {
  it("returns success true", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.update({ id: "mode-1" });

    expect(result).toEqual({ success: true });
  });

  it("returns success true with name update", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.update({
      id: "mode-1",
      name: "Updated Name",
    });

    expect(result).toEqual({ success: true });
  });

  it("returns success true with all fields", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.update({
      id: "mode-1",
      name: "Full Update",
      mode: "generative",
      config: { threshold: 0.8 },
    });

    expect(result).toEqual({ success: true });
  });

  it("requires id field", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.aiExecutionMode.update as any)({ name: "No ID" })
    ).rejects.toThrow();
  });
});

// =========================================================================
// 12. delete — Stub delete endpoint
// =========================================================================

describe("aiExecutionMode.delete", () => {
  it("returns success true", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.delete({ id: "mode-1" });

    expect(result).toEqual({ success: true });
  });

  it("returns success true for any id", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiExecutionMode.delete({ id: "non-existent-id" });

    expect(result).toEqual({ success: true });
  });

  it("requires id field", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.aiExecutionMode.delete as any)({})
    ).rejects.toThrow();
  });
});

// =========================================================================
// 13. Authentication guards — all procedures require authentication
// =========================================================================

describe("aiExecutionMode auth guards", () => {
  it("anonymous caller is rejected for getModeConfig", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.aiExecutionMode.getModeConfig()).rejects.toThrow();
  });

  it("anonymous caller is rejected for execute", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiExecutionMode.execute({
        assistantType: "solution",
        mode: "internal",
        content: "Test",
      })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for recordAdoption", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiExecutionMode.recordAdoption({
        sessionId: "sess-001",
        isAdopted: true,
      })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for getEffectivenessStats", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiExecutionMode.getEffectivenessStats()
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for getRecentLogs", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.aiExecutionMode.getRecentLogs()).rejects.toThrow();
  });

  it("anonymous caller is rejected for list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.aiExecutionMode.list()).rejects.toThrow();
  });

  it("anonymous caller is rejected for getById", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiExecutionMode.getById({ id: "1" })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for create", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiExecutionMode.create({ name: "hack" })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for update", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiExecutionMode.update({ id: "1", name: "hack" })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for delete", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiExecutionMode.delete({ id: "1" })
    ).rejects.toThrow();
  });
});

// =========================================================================
// 14. Service delegation — verify correct service function calls
// =========================================================================

describe("aiExecutionMode service delegation", () => {
  it("execute calls executeAI exactly once", async () => {
    mockExecuteAI.mockResolvedValue({
      content: "OK",
      mode: "internal",
      sessionId: "s1",
      timestamp: new Date(),
      tokensUsed: 10,
    });

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.execute({
      assistantType: "test",
      mode: "internal",
      content: "Hello",
    });

    expect(mockExecuteAI).toHaveBeenCalledTimes(1);
  });

  it("recordAdoption calls recordAdoption service exactly once", async () => {
    mockRecordAdoption.mockReturnValue({
      sessionId: "s1",
      isAdopted: true,
      timestamp: new Date(),
    });

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.recordAdoption({
      sessionId: "s1",
      isAdopted: true,
    });

    expect(mockRecordAdoption).toHaveBeenCalledTimes(1);
  });

  it("getModeConfig calls getModeConfig service exactly once", async () => {
    mockGetModeConfig.mockReturnValue({
      assistantType: "test",
      hasInternalKnowledge: false,
      supportedModes: ["internal", "generative", "shadow"],
    });

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.getModeConfig({ assistantType: "test" });

    expect(mockGetModeConfig).toHaveBeenCalledTimes(1);
  });

  it("getEffectivenessStats calls getEffectivenessStats service exactly once", async () => {
    mockGetEffectivenessStats.mockReturnValue([]);

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.getEffectivenessStats();

    expect(mockGetEffectivenessStats).toHaveBeenCalledTimes(1);
  });

  it("getRecentLogs calls getRecentLogs service exactly once", async () => {
    mockGetRecentLogs.mockReturnValue([]);

    const caller = createAuthenticatedCaller();
    await caller.aiExecutionMode.getRecentLogs();

    expect(mockGetRecentLogs).toHaveBeenCalledTimes(1);
  });

  it("stub procedures (list, getById, create, update, delete) do NOT call any service", async () => {
    const caller = createAuthenticatedCaller();

    await caller.aiExecutionMode.list();
    await caller.aiExecutionMode.getById({ id: "x" });
    await caller.aiExecutionMode.create({});
    await caller.aiExecutionMode.update({ id: "x" });
    await caller.aiExecutionMode.delete({ id: "x" });

    expect(mockExecuteAI).not.toHaveBeenCalled();
    expect(mockRecordAdoption).not.toHaveBeenCalled();
    expect(mockGetModeConfig).not.toHaveBeenCalled();
    expect(mockGetEffectivenessStats).not.toHaveBeenCalled();
    expect(mockGetRecentLogs).not.toHaveBeenCalled();
  });
});
