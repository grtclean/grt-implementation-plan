/**
 * CI/CD Pipeline Router — Unit Tests
 * 17 procedures: list, getById, getStageLogs, getDashboardStats,
 * create, updateStage, promoteStage, rejectStage, addGeminiAnalysis,
 * askGeminiPlanner, autoFetch, triggerGitHubDispatch, delete,
 * getQueueStatus, checkCompletedTasks, getQuestions, answerQuestion
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of ["from","where","orderBy","limit","offset","values","set","onConflictDoUpdate","onConflictDoNothing","groupBy","having","innerJoin","leftJoin","rightJoin","fullJoin"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../../drizzle/cicd-pipeline-schema", () => ({
  cicdTasks: {
    id: "id", title: "title", sourceMode: "sourceMode", sourceData: "sourceData",
    categories: "categories", scope: "scope", priority: "priority", rules: "rules",
    assignee: "assignee", currentStage: "currentStage",
    devStatus: "devStatus", testStatus: "testStatus", prodStatus: "prodStatus",
    devDetail: "devDetail", testDetail: "testDetail", prodDetail: "prodDetail",
    ceoApprovedDev: "ceoApprovedDev", ceoApprovedTest: "ceoApprovedTest",
    approvedBy: "approvedBy", geminiAnalysis: "geminiAnalysis",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  cicdStageLogs: {
    id: "id", taskId: "taskId", fromStage: "fromStage", toStage: "toStage",
    action: "action", actor: "actor", note: "note", createdAt: "createdAt",
  },
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    content: '{"reply":"Analysis","suggestedTask":{"title":"T","scope":"General","categories":["Backend"],"rules":"ok","priority":2}}',
  }),
}));

// Mock fs for queue operations
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      readFileSync: vi.fn().mockReturnValue("{}"),
      readdirSync: vi.fn().mockReturnValue([]),
    },
  };
});

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// Helper
function makeTask(overrides: any = {}) {
  return {
    id: 1, title: "Test task", sourceMode: "MANUAL", sourceData: null,
    categories: ["Backend"], scope: "General", priority: 3, rules: null,
    assignee: "Claude", currentStage: "DEV",
    devStatus: "PENDING", testStatus: "PENDING", prodStatus: "PENDING",
    geminiAnalysis: {}, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────
describe("cicd router", () => {

  // ═══ Queries ═══════════════════════════════════════
  describe("list", () => {
    it("returns pipeline tasks", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [makeTask(), makeTask({ id: 2, title: "Task 2" })];
      const result = await caller.cicd.list({});
      expect(result).toHaveLength(2);
    });

    it("filters by stage", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [makeTask({ currentStage: "TEST" })];
      const result = await caller.cicd.list({ stage: "TEST" });
      expect(result).toHaveLength(1);
    });

    it("works with no input", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.cicd.list();
      expect(result).toHaveLength(0);
    });
  });

  describe("getById", () => {
    it("returns task by id", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeTask()]);
      const result = await caller.cicd.getById({ id: 1 });
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Test task");
    });

    it("returns null when not found", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.cicd.getById({ id: 999 });
      expect(result).toBeNull();
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeTask({ id: 5 })]);
      const result = await caller.cicd.getById({ id: "5" });
      expect(result).not.toBeNull();
    });
  });

  describe("getStageLogs", () => {
    it("returns logs for a task", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, taskId: 1, fromStage: null, toStage: "DEV", action: "create" },
        { id: 2, taskId: 1, fromStage: "DEV", toStage: "TEST", action: "promote" },
      ];
      const result = await caller.cicd.getStageLogs({ id: 1 });
      expect(result).toHaveLength(2);
    });

    it("returns empty for task with no logs", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.cicd.getStageLogs({ id: 999 });
      expect(result).toHaveLength(0);
    });
  });

  describe("getDashboardStats", () => {
    it("returns aggregated stats by stage and status", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ stage: "DEV", count: 5 }, { stage: "TEST", count: 3 }]);
      selectResultsQueue.push([{ status: "PENDING", count: 2 }, { status: "IN_PROGRESS", count: 3 }]);
      selectResultsQueue.push([{ status: "COMPLETED", count: 2 }]);
      selectResultsQueue.push([{ status: "PENDING", count: 1 }]);
      const result = await caller.cicd.getDashboardStats();
      expect(result.stageCounts.DEV).toBe(5);
      expect(result.stageCounts.TEST).toBe(3);
      expect(result.devStatusCounts.PENDING).toBe(2);
    });
  });

  // ═══ Mutations ═════════════════════════════════════
  describe("create", () => {
    it("creates a pipeline task", async () => {
      const caller = createAuthenticatedCaller();
      const task = makeTask();
      mockReturningResult = [task];
      const result = await caller.cicd.create({ title: "New feature" });
      expect(result).toHaveProperty("id");
      expect(result.currentStage).toBe("DEV");
    });

    it("rejects empty title", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.cicd.create({ title: "" })).rejects.toThrow();
    });

    it("accepts optional fields", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [makeTask({ scope: "CRM", priority: 1 })];
      const result = await caller.cicd.create({
        title: "CRM fix", scope: "CRM", priority: 1,
        categories: ["Frontend", "Backend"], sourceMode: "AUTO_FETCH",
      });
      expect(result.scope).toBe("CRM");
    });
  });

  describe("updateStage", () => {
    it("updates status within current stage", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeTask({ currentStage: "DEV" })]);
      mockReturningResult = [makeTask({ devStatus: "IN_PROGRESS" })];
      const result = await caller.cicd.updateStage({
        id: 1, status: "IN_PROGRESS", detail: "Starting dev work",
      });
      expect(result.devStatus).toBe("IN_PROGRESS");
    });

    it("throws when task not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(caller.cicd.updateStage({ id: 999, status: "COMPLETED" }))
        .rejects.toThrow("Task not found");
    });

    it("updates TEST stage status correctly", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeTask({ currentStage: "TEST" })]);
      mockReturningResult = [makeTask({ currentStage: "TEST", testStatus: "COMPLETED" })];
      const result = await caller.cicd.updateStage({ id: 1, status: "COMPLETED" });
      expect(result.testStatus).toBe("COMPLETED");
    });
  });

  describe("promoteStage", () => {
    it("promotes DEV to TEST", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeTask({ currentStage: "DEV" })]);
      mockReturningResult = [makeTask({ currentStage: "TEST", ceoApprovedDev: true })];
      const result = await caller.cicd.promoteStage({ id: 1, note: "Looks good" });
      expect(result.currentStage).toBe("TEST");
      expect(result.ceoApprovedDev).toBe(true);
    });

    it("promotes TEST to PROD", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeTask({ currentStage: "TEST" })]);
      mockReturningResult = [makeTask({ currentStage: "PROD", ceoApprovedTest: true })];
      const result = await caller.cicd.promoteStage({ id: 1 });
      expect(result.currentStage).toBe("PROD");
    });

    it("throws when already in PROD", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeTask({ currentStage: "PROD" })]);
      await expect(caller.cicd.promoteStage({ id: 1 }))
        .rejects.toThrow("cannot promote further");
    });

    it("throws when task not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(caller.cicd.promoteStage({ id: 999 }))
        .rejects.toThrow("Task not found");
    });
  });

  describe("rejectStage", () => {
    it("rejects and rolls back to DEV by default", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeTask({ currentStage: "TEST" })]);
      mockReturningResult = [makeTask({ currentStage: "DEV", devStatus: "PENDING" })];
      const result = await caller.cicd.rejectStage({
        id: 1, reason: "Tests failed",
      });
      expect(result.currentStage).toBe("DEV");
    });

    it("rolls back to specified stage", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeTask({ currentStage: "PROD" })]);
      mockReturningResult = [makeTask({ currentStage: "TEST", testStatus: "PENDING" })];
      const result = await caller.cicd.rejectStage({
        id: 1, reason: "Production issue", rollbackTo: "TEST",
      });
      expect(result.currentStage).toBe("TEST");
    });

    it("throws when task not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(caller.cicd.rejectStage({ id: 999, reason: "Not found" }))
        .rejects.toThrow("Task not found");
    });
  });

  describe("addGeminiAnalysis", () => {
    it("adds analysis for a stage", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeTask({ geminiAnalysis: {} })]);
      mockReturningResult = [makeTask({
        geminiAnalysis: { DEV: { risk: "low" } },
      })];
      const result = await caller.cicd.addGeminiAnalysis({
        id: 1, stage: "DEV", analysis: { risk: "low", suggestion: "Proceed" },
      });
      expect(result.geminiAnalysis).toHaveProperty("DEV");
    });

    it("throws when task not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(caller.cicd.addGeminiAnalysis({
        id: 999, stage: "DEV", analysis: {},
      })).rejects.toThrow("Task not found");
    });
  });

  describe("askGeminiPlanner", () => {
    it("returns LLM analysis with suggested task", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.cicd.askGeminiPlanner({ prompt: "需要优化报表性能" });
      expect(result).toHaveProperty("reply");
      expect(result).toHaveProperty("suggestedTask");
      expect(result.suggestedTask.title).toBe("T");
    });

    it("falls back to mock when LLM fails", async () => {
      const { invokeLLM } = await import("../_core/llm");
      (invokeLLM as any).mockRejectedValueOnce(new Error("LLM timeout"));
      const caller = createAuthenticatedCaller();
      const result = await caller.cicd.askGeminiPlanner({ prompt: "优化报表dashboard" });
      expect(result.reply).toContain("Gemini Mock");
      expect(result.suggestedTask.scope).toBe("M6-MES");
    });

    it("detects CRM scope from keywords", async () => {
      const { invokeLLM } = await import("../_core/llm");
      (invokeLLM as any).mockRejectedValueOnce(new Error("fail"));
      const caller = createAuthenticatedCaller();
      const result = await caller.cicd.askGeminiPlanner({ prompt: "客户管理系统" });
      expect(result.suggestedTask.scope).toBe("CRM");
    });

    it("rejects empty prompt", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.cicd.askGeminiPlanner({ prompt: "" })).rejects.toThrow();
    });
  });

  describe("autoFetch", () => {
    it("creates 3 auto-fetched tasks", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [makeTask({ sourceMode: "AUTO_FETCH" })];
      const result = await caller.cicd.autoFetch();
      expect(result.fetched).toBe(3);
      expect(result.tasks).toHaveLength(3);
    });
  });

  describe("triggerGitHubDispatch", () => {
    it("simulates dispatch in demo mode (no GITHUB_TOKEN)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.cicd.triggerGitHubDispatch({
        taskId: 1, title: "Fix bug",
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("DEMO");
    });
  });

  describe("delete", () => {
    it("deletes task and its logs", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.cicd.delete({ id: 1 });
      expect(result.success).toBe(true);
    });
  });

  describe("getQueueStatus", () => {
    it("returns queue file status", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.cicd.getQueueStatus();
      expect(result).toHaveProperty("pending");
      expect(result).toHaveProperty("completed");
      expect(result).toHaveProperty("pendingDir");
    });
  });

  describe("checkCompletedTasks", () => {
    it("returns empty when no completed files", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.cicd.checkCompletedTasks();
      expect(result.updated).toHaveLength(0);
    });
  });

  describe("getQuestions", () => {
    it("returns empty array when no question files", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.cicd.getQuestions();
      expect(result).toHaveLength(0);
    });
  });

  describe("answerQuestion", () => {
    it("writes answer file and returns success", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.cicd.answerQuestion({
        taskId: 1, answer: "Proceed with option A",
      });
      expect(result.success).toBe(true);
      expect(result.taskId).toBe(1);
    });

    it("rejects empty answer", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.cicd.answerQuestion({
        taskId: 1, answer: "",
      })).rejects.toThrow();
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.cicd.list()).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.cicd.create({ title: "X" })).rejects.toThrow();
    });

    it("rejects anonymous for promoteStage", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.cicd.promoteStage({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.cicd.delete({ id: 1 })).rejects.toThrow();
    });
  });
});
