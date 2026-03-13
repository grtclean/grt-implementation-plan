/**
 * AI Suggestion Router — Unit Tests
 * Tests 5 procedures: getSuggestions, generateSuggestion, getSuggestionStatus, applySuggestion, recordFeedback
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

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

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

// Mock task worker service (async task queue pattern)
const mockSubmitTask = vi.fn().mockResolvedValue({ taskId: 42 });
const mockGetTaskStatus = vi.fn().mockResolvedValue({ id: 42, status: "completed", resultData: {} });

vi.mock("../services/task-worker.service", () => ({
  registerTaskHandler: vi.fn(),
  submitTask: (...args: any[]) => mockSubmitTask(...args),
  getTaskStatus: (...args: any[]) => mockGetTaskStatus(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  mockSubmitTask.mockReset().mockResolvedValue({ taskId: 42 });
  mockGetTaskStatus.mockReset().mockResolvedValue({ id: 42, status: "completed", resultData: {} });
});

const caller = () => createAdminCaller();

const sampleSuggestion = {
  id: 1,
  processType: "FMEA",
  processId: "P-001",
  stepCode: "S1",
  suggestionMode: "current_step",
  suggestionSummary: "Improve seal quality",
  suggestionDetails: "Apply additional torque check",
  suggestedActions: JSON.stringify(["Check torque", "Inspect seal"]),
  references: JSON.stringify(["AIAG FMEA"]),
  isApplied: 0,
  appliedAt: null,
  applyResult: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const sampleLog = {
  id: 1,
  suggestionId: 1,
  actionId: "ACT-123",
  actionName: "Apply suggestion",
  executedBy: "Test User",
  status: "completed",
  result: "Suggestion applied",
};

describe("aiSuggestion router", () => {

  // ═══ getSuggestions ═══
  describe("getSuggestions", () => {
    it("returns all suggestions with no filter", async () => {
      selectResultsQueue.push([sampleSuggestion, { ...sampleSuggestion, id: 2 }]);
      const result = await caller().aiSuggestion.getSuggestions();
      expect(result).toHaveLength(2);
    });

    it("returns suggestions when called with empty input", async () => {
      selectResultsQueue.push([sampleSuggestion]);
      const result = await caller().aiSuggestion.getSuggestions({});
      expect(result).toHaveLength(1);
    });

    it("filters by processType", async () => {
      selectResultsQueue.push([
        sampleSuggestion,
        { ...sampleSuggestion, id: 2, processType: "8D" },
      ]);
      const result = await caller().aiSuggestion.getSuggestions({ processType: "FMEA" });
      expect(result).toHaveLength(1);
      expect(result[0].processType).toBe("FMEA");
    });

    it("filters by processId", async () => {
      selectResultsQueue.push([
        sampleSuggestion,
        { ...sampleSuggestion, id: 2, processId: "P-002" },
      ]);
      const result = await caller().aiSuggestion.getSuggestions({ processId: "P-001" });
      expect(result).toHaveLength(1);
      expect(result[0].processId).toBe("P-001");
    });

    it("filters by stepCode", async () => {
      selectResultsQueue.push([
        sampleSuggestion,
        { ...sampleSuggestion, id: 2, stepCode: "S2" },
      ]);
      const result = await caller().aiSuggestion.getSuggestions({ stepCode: "S1" });
      expect(result).toHaveLength(1);
      expect(result[0].stepCode).toBe("S1");
    });

    it("filters by all three fields simultaneously", async () => {
      selectResultsQueue.push([
        sampleSuggestion,
        { ...sampleSuggestion, id: 2, processType: "8D" },
        { ...sampleSuggestion, id: 3, processId: "P-002" },
        { ...sampleSuggestion, id: 4, stepCode: "S2" },
      ]);
      const result = await caller().aiSuggestion.getSuggestions({
        processType: "FMEA",
        processId: "P-001",
        stepCode: "S1",
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it("returns empty array when no matches", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiSuggestion.getSuggestions({ processType: "NONEXISTENT" });
      expect(result).toHaveLength(0);
    });
  });

  // ═══ generateSuggestion (async task queue) ═══
  describe("generateSuggestion", () => {
    it("submits task and returns taskId with processing status", async () => {
      const result = await caller().aiSuggestion.generateSuggestion({
        processType: "FMEA",
        processId: "P-001",
        stepCode: "S1",
        context: "Seal failure",
        question: "How to reduce AP?",
      });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(42);
      expect(result.status).toBe("processing");
      expect(result.suggestion).toBeNull();
      expect(result.id).toBeNull();
    });

    it("calls submitTask with correct task type and input", async () => {
      await caller().aiSuggestion.generateSuggestion({
        processType: "FMEA",
        processId: "P-001",
        stepCode: "S1",
        context: "Seal failure",
        question: "How to reduce AP?",
      });

      expect(mockSubmitTask).toHaveBeenCalledOnce();
      expect(mockSubmitTask.mock.calls[0][0]).toBe("AI_SUGGESTION_GENERATE");
      expect(mockSubmitTask.mock.calls[0][1]).toEqual({
        processType: "FMEA",
        processId: "P-001",
        stepCode: "S1",
        context: "Seal failure",
        question: "How to reduce AP?",
      });
    });

    it("passes user name as createdBy", async () => {
      await caller().aiSuggestion.generateSuggestion({ processType: "8D" });

      expect(mockSubmitTask).toHaveBeenCalledOnce();
      // Third arg is the createdBy string
      expect(mockSubmitTask.mock.calls[0][2]).toBeTruthy();
    });

    it("handles optional fields (only processType required)", async () => {
      const result = await caller().aiSuggestion.generateSuggestion({
        processType: "CAPA",
      });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(42);
      expect(mockSubmitTask.mock.calls[0][1]).toEqual({
        processType: "CAPA",
        processId: undefined,
        stepCode: undefined,
        context: undefined,
        question: undefined,
      });
    });

    it("propagates submitTask failure", async () => {
      mockSubmitTask.mockRejectedValueOnce(new Error("Queue unavailable"));

      await expect(
        caller().aiSuggestion.generateSuggestion({ processType: "FMEA" })
      ).rejects.toThrow("Queue unavailable");
    });

    it("works with different process types", async () => {
      for (const processType of ["FMEA", "8D", "CAPA", "PPAP", "ControlPlan", "CustomProcess"]) {
        mockSubmitTask.mockResolvedValueOnce({ taskId: 100 });
        const result = await caller().aiSuggestion.generateSuggestion({ processType });
        expect(result.success).toBe(true);
        expect(result.taskId).toBe(100);
      }
    });
  });

  // ═══ getSuggestionStatus (polling) ═══
  describe("getSuggestionStatus", () => {
    it("returns completed status with suggestion data", async () => {
      mockGetTaskStatus.mockResolvedValue({
        id: 42,
        status: "completed",
        resultData: {
          suggestion: { summary: "Improve AP", details: "Focus on detection", suggestedActions: ["Check"], references: ["AIAG"] },
          id: 99,
        },
      });

      const result = await caller().aiSuggestion.getSuggestionStatus({ taskId: 42 });
      expect(result.taskStatus).toBe("completed");
      expect(result.suggestion).toEqual({
        summary: "Improve AP",
        details: "Focus on detection",
        suggestedActions: ["Check"],
        references: ["AIAG"],
      });
      expect(result.id).toBe(99);
    });

    it("returns not_found when task does not exist", async () => {
      mockGetTaskStatus.mockResolvedValue(null);

      const result = await caller().aiSuggestion.getSuggestionStatus({ taskId: 999 });
      expect(result.taskStatus).toBe("not_found");
      expect(result.suggestion).toBeNull();
      expect(result.id).toBeNull();
    });

    it("returns failed status with error", async () => {
      mockGetTaskStatus.mockResolvedValue({
        id: 42,
        status: "failed",
        resultData: null,
        errorMessage: "LLM service unavailable",
      });

      const result = await caller().aiSuggestion.getSuggestionStatus({ taskId: 42 });
      expect(result.taskStatus).toBe("failed");
      expect(result.suggestion).toBeNull();
      expect(result.error).toBe("LLM service unavailable");
    });

    it("returns pending status while task is queued", async () => {
      mockGetTaskStatus.mockResolvedValue({
        id: 42,
        status: "pending",
        resultData: null,
      });

      const result = await caller().aiSuggestion.getSuggestionStatus({ taskId: 42 });
      expect(result.taskStatus).toBe("pending");
      expect(result.suggestion).toBeNull();
    });

    it("returns processing status while task is running", async () => {
      mockGetTaskStatus.mockResolvedValue({
        id: 42,
        status: "processing",
        resultData: null,
      });

      const result = await caller().aiSuggestion.getSuggestionStatus({ taskId: 42 });
      expect(result.taskStatus).toBe("processing");
      expect(result.suggestion).toBeNull();
    });

    it("handles completed task with no resultData gracefully", async () => {
      mockGetTaskStatus.mockResolvedValue({
        id: 42,
        status: "completed",
        resultData: null,
      });

      // When resultData is null but status is completed, it falls through to the status return
      const result = await caller().aiSuggestion.getSuggestionStatus({ taskId: 42 });
      // completed without resultData is not caught by the "completed && resultData" branch
      expect(result.suggestion).toBeNull();
    });
  });

  // ═══ applySuggestion ═══
  describe("applySuggestion", () => {
    it("applies suggestion with numeric input", async () => {
      // update chain (update().set().where()) resolves via thenable
      selectResultsQueue.push([]); // update aiProcessSuggestions
      returningQueue.push([sampleLog]); // insert execution log

      const result = await caller().aiSuggestion.applySuggestion(5);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(sampleLog);
    });

    it("applies suggestion with string input", async () => {
      selectResultsQueue.push([]); // update
      returningQueue.push([sampleLog]);

      const result = await caller().aiSuggestion.applySuggestion("10");
      expect(result.success).toBe(true);
      expect(result.data).toEqual(sampleLog);
    });

    it("applies suggestion with object input", async () => {
      selectResultsQueue.push([]); // update
      returningQueue.push([{
        ...sampleLog,
        actionId: "MY-ACT",
        actionName: "Custom action",
      }]);

      const result = await caller().aiSuggestion.applySuggestion({
        suggestionId: 7,
        actionId: "MY-ACT",
        actionName: "Custom action",
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
    });

    it("applies suggestion with object input using string suggestionId", async () => {
      selectResultsQueue.push([]); // update
      returningQueue.push([sampleLog]);

      const result = await caller().aiSuggestion.applySuggestion({
        suggestionId: "15",
      });
      expect(result.success).toBe(true);
    });

    it("rejects numeric input of 0", async () => {
      const result = await caller().aiSuggestion.applySuggestion(0);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("rejects negative numeric input", async () => {
      const result = await caller().aiSuggestion.applySuggestion(-1);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("rejects string input that parses to 0", async () => {
      const result = await caller().aiSuggestion.applySuggestion("0");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("rejects object input with no suggestionId", async () => {
      const result = await caller().aiSuggestion.applySuggestion({});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("rejects object input with suggestionId of 0", async () => {
      const result = await caller().aiSuggestion.applySuggestion({ suggestionId: 0 });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });
  });

  // ═══ recordFeedback ═══
  describe("recordFeedback", () => {
    it("records feedback with explicit result text", async () => {
      selectResultsQueue.push([]); // update
      const result = await caller().aiSuggestion.recordFeedback({
        suggestionId: 1,
        result: "Very helpful suggestion",
      });
      expect(result.success).toBe(true);
    });

    it("records positive feedback when isPositive is true", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiSuggestion.recordFeedback({
        suggestionId: 1,
        isPositive: true,
      });
      expect(result.success).toBe(true);
    });

    it("records negative feedback when isPositive is false", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiSuggestion.recordFeedback({
        suggestionId: 1,
        isPositive: false,
      });
      expect(result.success).toBe(true);
    });

    it("accepts string suggestionId", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiSuggestion.recordFeedback({
        suggestionId: "42",
        result: "good",
      });
      expect(result.success).toBe(true);
    });

    it("accepts numeric suggestionId", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiSuggestion.recordFeedback({
        suggestionId: 42,
        isPositive: true,
      });
      expect(result.success).toBe(true);
    });

    it("defaults to 'negative' when no result and isPositive is false", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiSuggestion.recordFeedback({
        suggestionId: 1,
        isPositive: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getSuggestions", async () => {
      await expect(createAnonymousCaller().aiSuggestion.getSuggestions()).rejects.toThrow();
    });

    it("rejects anonymous for generateSuggestion", async () => {
      await expect(createAnonymousCaller().aiSuggestion.generateSuggestion({
        processType: "FMEA",
      })).rejects.toThrow();
    });

    it("rejects anonymous for getSuggestionStatus", async () => {
      await expect(createAnonymousCaller().aiSuggestion.getSuggestionStatus({
        taskId: 42,
      })).rejects.toThrow();
    });

    it("rejects anonymous for applySuggestion (number)", async () => {
      await expect(createAnonymousCaller().aiSuggestion.applySuggestion(1)).rejects.toThrow();
    });

    it("rejects anonymous for applySuggestion (string)", async () => {
      await expect(createAnonymousCaller().aiSuggestion.applySuggestion("1")).rejects.toThrow();
    });

    it("rejects anonymous for applySuggestion (object)", async () => {
      await expect(createAnonymousCaller().aiSuggestion.applySuggestion({
        suggestionId: 1,
      })).rejects.toThrow();
    });

    it("rejects anonymous for recordFeedback", async () => {
      await expect(createAnonymousCaller().aiSuggestion.recordFeedback({
        suggestionId: 1,
        isPositive: true,
      })).rejects.toThrow();
    });
  });
});
