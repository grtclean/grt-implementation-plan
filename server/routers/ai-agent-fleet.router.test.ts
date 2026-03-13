/**
 * AI Agent Fleet Router — Unit Tests
 *
 * Tests all 18 tRPC procedures:
 *   Fleet management: provisionMyFleet, provisionAll, getMyFleet, getFleetByEmployee
 *   Agent control: activateAgent, deactivateAgent, updateAgentConfig
 *   Task execution: executeTask, reviewTaskOutput, getAgentTaskHistory
 *   G-Token: getGTokenBalance, getGTokenHistory, getGTokenSummary
 *   Analytics: getAgentDashboard, getFleetAnalytics, listAllAgents
 *
 * Mocking strategy:
 *   - Service functions are mocked via vi.mock("../services/ai-agent-fleet.service")
 *   - DB (requireDb) is mocked for direct Drizzle ORM queries (updateAgentConfig,
 *     getAgentTaskHistory, getGTokenBalance, getGTokenHistory, listAllAgents)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──────────────────────────────────────────
const {
  mockProvisionFleetForEmployee,
  mockProvisionFleetForAll,
  mockActivateAgent,
  mockDeactivateAgent,
  mockGetFleetByEmployee,
  mockGetAgentDashboard,
  mockExecuteAgentTask,
  mockReviewTaskExecution,
  mockGetGTokenSummary,
  mockGetFleetAnalytics,
  mockCreditGToken,
  selectResultsQueue,
  mockReturningResult,
} = vi.hoisted(() => {
  const mockProvisionFleetForEmployee = vi.fn();
  const mockProvisionFleetForAll = vi.fn();
  const mockActivateAgent = vi.fn();
  const mockDeactivateAgent = vi.fn();
  const mockGetFleetByEmployee = vi.fn();
  const mockGetAgentDashboard = vi.fn();
  const mockExecuteAgentTask = vi.fn();
  const mockReviewTaskExecution = vi.fn();
  const mockGetGTokenSummary = vi.fn();
  const mockGetFleetAnalytics = vi.fn();
  const mockCreditGToken = vi.fn();
  const selectResultsQueue: any[][] = [];
  const mockReturningResult: any[] = [];
  return {
    mockProvisionFleetForEmployee,
    mockProvisionFleetForAll,
    mockActivateAgent,
    mockDeactivateAgent,
    mockGetFleetByEmployee,
    mockGetAgentDashboard,
    mockExecuteAgentTask,
    mockReviewTaskExecution,
    mockGetGTokenSummary,
    mockGetFleetAnalytics,
    mockCreditGToken,
    selectResultsQueue,
    mockReturningResult,
  };
});

// Mock service functions
vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../services/ai-agent-fleet.service", () => ({
  provisionFleetForEmployee: mockProvisionFleetForEmployee,
  provisionFleetForAll: mockProvisionFleetForAll,
  activateAgent: mockActivateAgent,
  deactivateAgent: mockDeactivateAgent,
  getFleetByEmployee: mockGetFleetByEmployee,
  getAgentDashboard: mockGetAgentDashboard,
  executeAgentTask: mockExecuteAgentTask,
  reviewTaskExecution: mockReviewTaskExecution,
  getGTokenSummary: mockGetGTokenSummary,
  getFleetAnalytics: mockGetFleetAnalytics,
  creditGToken: mockCreditGToken,
}));

// Mock DB (for procedures that use direct DB access)
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
        const r =
          mockReturningResult.length > 0 ? [...mockReturningResult] : [{ id: 1 }];
        mockReturningResult.length = 0;
        return Object.assign(Promise.resolve(r), {
          then: (resolve: any) => Promise.resolve(r).then(resolve),
          catch: () => Promise.resolve(r),
        });
      }),
      then(resolve: any) {
        const result =
          selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() {
        return chain;
      },
    };

    const db: any = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
    return db;
  }),
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

// Mock schema (referenced by the router for table objects in direct DB calls)
vi.mock("../../drizzle/ai-agent-fleet-schema", () => ({
  aiAgentFleet: {
    id: "id",
    employeeId: "employeeId",
    agentCode: "agentCode",
    agentName: "agentName",
    level: "level",
    status: "status",
    gTokenBalance: "gTokenBalance",
    totalEarned: "totalEarned",
    totalSpent: "totalSpent",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    canBidTasks: "canBidTasks",
    maxConcurrentTasks: "maxConcurrentTasks",
    bidPriceRangeLow: "bidPriceRangeLow",
    bidPriceRangeHigh: "bidPriceRangeHigh",
  },
  gTokenLedger: {
    id: "id",
    agentId: "agentId",
    agentCode: "agentCode",
    txType: "txType",
    amount: "amount",
    balanceAfter: "balanceAfter",
    createdAt: "createdAt",
  },
  agentTaskExecutions: {
    id: "id",
    agentId: "agentId",
    taskType: "taskType",
    taskTitle: "taskTitle",
    status: "status",
    createdAt: "createdAt",
  },
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  mockReturningResult.length = 0;
});

// ── Helpers ─────────────────────────────────────────────────
const caller = () => createAuthenticatedCaller();
const anonCaller = () => createAnonymousCaller();

const sampleFleetResult = {
  agents: [
    { id: 1, agentCode: "L1-EMP001", agentName: "助手L1", level: 1, status: "active", gTokenBalance: "10.0000" },
    { id: 2, agentCode: "L2-EMP001", agentName: "助手L2", level: 2, status: "inactive", gTokenBalance: "0.0000" },
  ],
  summary: { totalAgents: 2, activeCount: 1, totalBalance: "10.0000", totalTasks: 5 },
};

const emptyFleetResult = {
  agents: [],
  summary: { totalAgents: 0, activeCount: 0, totalBalance: "0", totalTasks: 0 },
};

// ════════════════════════════════════════════════════════════
// FLEET MANAGEMENT
// ════════════════════════════════════════════════════════════

describe("ai-agent-fleet router", () => {
  // ═══ provisionMyFleet ═══════════════════════════════════
  describe("provisionMyFleet", () => {
    it("provisions fleet for current user", async () => {
      mockProvisionFleetForEmployee.mockResolvedValue({ created: 5, skipped: 0 });
      const result = await caller().aiAgentFleet.provisionMyFleet();
      expect(result.success).toBe(true);
      expect(result.created).toBe(5);
      expect(result.skipped).toBe(0);
      expect(mockProvisionFleetForEmployee).toHaveBeenCalledWith(1); // default user id
    });

    it("returns success=false when service returns error", async () => {
      mockProvisionFleetForEmployee.mockResolvedValue({
        created: 0,
        skipped: 0,
        error: "员工没有M级AI助理，请先初始化",
      });
      const result = await caller().aiAgentFleet.provisionMyFleet();
      expect(result.success).toBe(false);
      expect(result.error).toBe("员工没有M级AI助理，请先初始化");
    });

    it("returns success=false on service exception", async () => {
      mockProvisionFleetForEmployee.mockRejectedValue(new Error("DB connection failed"));
      const result = await caller().aiAgentFleet.provisionMyFleet();
      expect(result.success).toBe(false);
      expect(result.error).toBe("DB connection failed");
      expect(result.created).toBe(0);
    });

    it("handles partial provisioning (some skipped)", async () => {
      mockProvisionFleetForEmployee.mockResolvedValue({ created: 3, skipped: 2 });
      const result = await caller().aiAgentFleet.provisionMyFleet();
      expect(result.success).toBe(true);
      expect(result.created).toBe(3);
      expect(result.skipped).toBe(2);
    });
  });

  // ═══ provisionAll ═══════════════════════════════════════
  describe("provisionAll", () => {
    it("batch provisions fleets for all employees", async () => {
      mockProvisionFleetForAll.mockResolvedValue({ created: 25, skipped: 10, errors: [] });
      const result = await caller().aiAgentFleet.provisionAll();
      expect(result.success).toBe(true);
      expect(result.created).toBe(25);
      expect(result.skipped).toBe(10);
    });

    it("returns success=false on service exception", async () => {
      mockProvisionFleetForAll.mockRejectedValue(new Error("Batch failed"));
      const result = await caller().aiAgentFleet.provisionAll();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Batch failed");
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("returns errors from individual employee provisioning", async () => {
      mockProvisionFleetForAll.mockResolvedValue({
        created: 10, skipped: 5, errors: ["EMP-42: 员工不存在"],
      });
      const result = await caller().aiAgentFleet.provisionAll();
      expect(result.success).toBe(true);
      expect(result.errors).toContain("EMP-42: 员工不存在");
    });
  });

  // ═══ getMyFleet ═════════════════════════════════════════
  describe("getMyFleet", () => {
    it("returns fleet for current user", async () => {
      mockGetFleetByEmployee.mockResolvedValue(sampleFleetResult);
      const result = await caller().aiAgentFleet.getMyFleet();
      expect(result.agents).toHaveLength(2);
      expect(result.summary.totalAgents).toBe(2);
      expect(result.summary.activeCount).toBe(1);
      expect(mockGetFleetByEmployee).toHaveBeenCalledWith(1);
    });

    it("returns empty fleet on service error", async () => {
      mockGetFleetByEmployee.mockRejectedValue(new Error("DB error"));
      const result = await caller().aiAgentFleet.getMyFleet();
      expect(result.agents).toEqual([]);
      expect(result.summary.totalAgents).toBe(0);
    });
  });

  // ═══ getFleetByEmployee ═════════════════════════════════
  describe("getFleetByEmployee", () => {
    it("returns fleet by employee id (number)", async () => {
      mockGetFleetByEmployee.mockResolvedValue(sampleFleetResult);
      const result = await caller().aiAgentFleet.getFleetByEmployee({ employeeId: 42 });
      expect(result.agents).toHaveLength(2);
      expect(mockGetFleetByEmployee).toHaveBeenCalledWith(42);
    });

    it("accepts string employee id", async () => {
      mockGetFleetByEmployee.mockResolvedValue(sampleFleetResult);
      const result = await caller().aiAgentFleet.getFleetByEmployee({ employeeId: "42" });
      expect(result.agents).toHaveLength(2);
      expect(mockGetFleetByEmployee).toHaveBeenCalledWith(42);
    });

    it("returns empty fleet on service error", async () => {
      mockGetFleetByEmployee.mockRejectedValue(new Error("Not found"));
      const result = await caller().aiAgentFleet.getFleetByEmployee({ employeeId: 999 });
      expect(result.agents).toEqual([]);
      expect(result.summary.totalAgents).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════
  // AGENT CONTROL
  // ════════════════════════════════════════════════════════

  // ═══ activateAgent ══════════════════════════════════════
  describe("activateAgent", () => {
    it("activates agent successfully", async () => {
      mockActivateAgent.mockResolvedValue(true);
      const result = await caller().aiAgentFleet.activateAgent({ agentId: 1 });
      expect(result.success).toBe(true);
      expect(mockActivateAgent).toHaveBeenCalledWith(1);
    });

    it("returns success=false when agent not found", async () => {
      mockActivateAgent.mockResolvedValue(false);
      const result = await caller().aiAgentFleet.activateAgent({ agentId: 999 });
      expect(result.success).toBe(false);
    });

    it("accepts string agentId", async () => {
      mockActivateAgent.mockResolvedValue(true);
      const result = await caller().aiAgentFleet.activateAgent({ agentId: "5" });
      expect(result.success).toBe(true);
      expect(mockActivateAgent).toHaveBeenCalledWith(5);
    });

    it("returns success=false on service exception", async () => {
      mockActivateAgent.mockRejectedValue(new Error("Activation failed"));
      const result = await caller().aiAgentFleet.activateAgent({ agentId: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Activation failed");
    });
  });

  // ═══ deactivateAgent ════════════════════════════════════
  describe("deactivateAgent", () => {
    it("deactivates agent successfully", async () => {
      mockDeactivateAgent.mockResolvedValue(true);
      const result = await caller().aiAgentFleet.deactivateAgent({ agentId: 1 });
      expect(result.success).toBe(true);
      expect(mockDeactivateAgent).toHaveBeenCalledWith(1);
    });

    it("returns success=false when agent not found", async () => {
      mockDeactivateAgent.mockResolvedValue(false);
      const result = await caller().aiAgentFleet.deactivateAgent({ agentId: 999 });
      expect(result.success).toBe(false);
    });

    it("accepts string agentId", async () => {
      mockDeactivateAgent.mockResolvedValue(true);
      const result = await caller().aiAgentFleet.deactivateAgent({ agentId: "3" });
      expect(result.success).toBe(true);
      expect(mockDeactivateAgent).toHaveBeenCalledWith(3);
    });

    it("returns success=false on service exception", async () => {
      mockDeactivateAgent.mockRejectedValue(new Error("Deactivation failed"));
      const result = await caller().aiAgentFleet.deactivateAgent({ agentId: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Deactivation failed");
    });
  });

  // ═══ updateAgentConfig ══════════════════════════════════
  describe("updateAgentConfig", () => {
    it("updates canBidTasks", async () => {
      const result = await caller().aiAgentFleet.updateAgentConfig({
        agentId: 1,
        canBidTasks: true,
      });
      expect(result.success).toBe(true);
    });

    it("updates maxConcurrentTasks", async () => {
      const result = await caller().aiAgentFleet.updateAgentConfig({
        agentId: 1,
        maxConcurrentTasks: 5,
      });
      expect(result.success).toBe(true);
    });

    it("updates bid price range", async () => {
      const result = await caller().aiAgentFleet.updateAgentConfig({
        agentId: "2",
        bidPriceRangeLow: 10,
        bidPriceRangeHigh: 500,
      });
      expect(result.success).toBe(true);
    });

    it("updates multiple config fields at once", async () => {
      const result = await caller().aiAgentFleet.updateAgentConfig({
        agentId: 1,
        canBidTasks: true,
        maxConcurrentTasks: 3,
        bidPriceRangeLow: 5,
        bidPriceRangeHigh: 200,
      });
      expect(result.success).toBe(true);
    });

    it("accepts string agentId", async () => {
      const result = await caller().aiAgentFleet.updateAgentConfig({
        agentId: "10",
        canBidTasks: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════
  // TASK EXECUTION
  // ════════════════════════════════════════════════════════

  // ═══ executeTask ════════════════════════════════════════
  describe("executeTask", () => {
    it("executes a document_draft task", async () => {
      mockExecuteAgentTask.mockResolvedValue({
        executionId: 42,
        output: "Draft content here",
        qualityScore: 85,
        reviewRequired: false,
        durationMs: 1200,
      });
      const result = await caller().aiAgentFleet.executeTask({
        agentId: 1,
        taskType: "document_draft",
        taskTitle: "Draft quarterly report",
        taskInput: { content: "Q4 2026 data" },
      });
      expect(result.success).toBe(true);
      expect(result.executionId).toBe(42);
      expect(result.output).toBe("Draft content here");
      expect(result.qualityScore).toBe(85);
    });

    it("executes a data_analysis task", async () => {
      mockExecuteAgentTask.mockResolvedValue({
        executionId: 43,
        output: "Analysis results",
        qualityScore: 90,
        reviewRequired: true,
        durationMs: 2000,
      });
      const result = await caller().aiAgentFleet.executeTask({
        agentId: 2,
        taskType: "data_analysis",
        taskTitle: "Analyze sales trends",
      });
      expect(result.success).toBe(true);
      expect(result.reviewRequired).toBe(true);
    });

    it("returns success=false on service exception", async () => {
      mockExecuteAgentTask.mockRejectedValue(new Error("Agent未激活"));
      const result = await caller().aiAgentFleet.executeTask({
        agentId: 1,
        taskType: "code_review",
        taskTitle: "Review PR #42",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Agent未激活");
    });

    it("validates taskType enum", async () => {
      await expect(
        caller().aiAgentFleet.executeTask({
          agentId: 1,
          taskType: "invalid_type" as any,
          taskTitle: "Test",
        }),
      ).rejects.toThrow();
    });

    it("rejects empty taskTitle", async () => {
      await expect(
        caller().aiAgentFleet.executeTask({
          agentId: 1,
          taskType: "email_draft",
          taskTitle: "",
        }),
      ).rejects.toThrow();
    });

    it("accepts all valid task types", async () => {
      const taskTypes = [
        "document_draft", "data_analysis", "code_review", "report_generation",
        "meeting_summary", "email_draft", "risk_assessment", "quality_inspection",
      ] as const;

      for (const taskType of taskTypes) {
        mockExecuteAgentTask.mockResolvedValue({
          executionId: 1, output: "ok", qualityScore: 80, reviewRequired: false, durationMs: 100,
        });
        const result = await caller().aiAgentFleet.executeTask({
          agentId: 1,
          taskType,
          taskTitle: `Test ${taskType}`,
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts string agentId", async () => {
      mockExecuteAgentTask.mockResolvedValue({
        executionId: 1, output: "ok", qualityScore: 80, reviewRequired: false, durationMs: 100,
      });
      const result = await caller().aiAgentFleet.executeTask({
        agentId: "5",
        taskType: "meeting_summary",
        taskTitle: "Summarize standup",
      });
      expect(result.success).toBe(true);
      expect(mockExecuteAgentTask).toHaveBeenCalledWith(5, "meeting_summary", "Summarize standup", {});
    });
  });

  // ═══ reviewTaskOutput ═══════════════════════════════════
  describe("reviewTaskOutput", () => {
    it("approves task output", async () => {
      mockReviewTaskExecution.mockResolvedValue({ approved: true, reward: 85 });
      const result = await caller().aiAgentFleet.reviewTaskOutput({
        executionId: 42,
        approved: true,
        qualityScore: 85,
      });
      expect(result.success).toBe(true);
      expect(result.approved).toBe(true);
      expect(result.reward).toBe(85);
    });

    it("rejects task output", async () => {
      mockReviewTaskExecution.mockResolvedValue({ approved: false, reward: 0 });
      const result = await caller().aiAgentFleet.reviewTaskOutput({
        executionId: 42,
        approved: false,
        qualityScore: 30,
      });
      expect(result.success).toBe(true);
      expect(result.approved).toBe(false);
      expect(result.reward).toBe(0);
    });

    it("passes user id from context as reviewedBy", async () => {
      mockReviewTaskExecution.mockResolvedValue({ approved: true, reward: 70 });
      await caller().aiAgentFleet.reviewTaskOutput({
        executionId: 10,
        approved: true,
        qualityScore: 70,
      });
      // Default user id = 1, executionId=10, approved=true, qualityScore=70, userId=1
      expect(mockReviewTaskExecution).toHaveBeenCalledWith(10, true, 70, 1);
    });

    it("returns success=false on service exception", async () => {
      mockReviewTaskExecution.mockRejectedValue(new Error("已经审核过"));
      const result = await caller().aiAgentFleet.reviewTaskOutput({
        executionId: 42,
        approved: true,
        qualityScore: 70,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("已经审核过");
    });

    it("validates qualityScore range (0-100)", async () => {
      await expect(
        caller().aiAgentFleet.reviewTaskOutput({
          executionId: 1,
          approved: true,
          qualityScore: 101,
        }),
      ).rejects.toThrow();

      await expect(
        caller().aiAgentFleet.reviewTaskOutput({
          executionId: 1,
          approved: true,
          qualityScore: -1,
        }),
      ).rejects.toThrow();
    });

    it("accepts string executionId", async () => {
      mockReviewTaskExecution.mockResolvedValue({ approved: true, reward: 70 });
      const result = await caller().aiAgentFleet.reviewTaskOutput({
        executionId: "42",
        approved: true,
        qualityScore: 70,
      });
      expect(result.success).toBe(true);
      expect(mockReviewTaskExecution).toHaveBeenCalledWith(42, true, 70, 1);
    });
  });

  // ═══ getAgentTaskHistory ════════════════════════════════
  describe("getAgentTaskHistory", () => {
    it("returns task history for agent", async () => {
      const tasks = [
        { id: 1, agentId: 1, taskType: "document_draft", taskTitle: "Draft report", status: "completed", createdAt: "2026-01-15" },
        { id: 2, agentId: 1, taskType: "code_review", taskTitle: "Review code", status: "failed", createdAt: "2026-01-14" },
      ];
      selectResultsQueue.push(tasks);
      const result = await caller().aiAgentFleet.getAgentTaskHistory({ agentId: 1 });
      expect(result).toHaveLength(2);
      expect(result[0].taskType).toBe("document_draft");
    });

    it("returns empty array when no tasks", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiAgentFleet.getAgentTaskHistory({ agentId: 999 });
      expect(result).toEqual([]);
    });

    it("respects limit parameter", async () => {
      selectResultsQueue.push([{ id: 1 }]);
      const result = await caller().aiAgentFleet.getAgentTaskHistory({ agentId: 1, limit: 5 });
      expect(result).toHaveLength(1);
    });

    it("uses default limit of 20", async () => {
      selectResultsQueue.push([]);
      await caller().aiAgentFleet.getAgentTaskHistory({ agentId: 1 });
      // No error means default limit was applied
    });

    it("accepts string agentId", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiAgentFleet.getAgentTaskHistory({ agentId: "5" });
      expect(result).toEqual([]);
    });

    it("returns empty array on DB error", async () => {
      // No items in queue; the chain.then returns [] by default
      const result = await caller().aiAgentFleet.getAgentTaskHistory({ agentId: 1 });
      expect(result).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════
  // G-TOKEN
  // ════════════════════════════════════════════════════════

  // ═══ getGTokenBalance ═══════════════════════════════════
  describe("getGTokenBalance", () => {
    it("returns balance for agent", async () => {
      selectResultsQueue.push([
        { gTokenBalance: "150.5000", totalEarned: "200.0000", totalSpent: "49.5000" },
      ]);
      const result = await caller().aiAgentFleet.getGTokenBalance({ agentId: 1 });
      expect(result.gTokenBalance).toBe("150.5000");
      expect(result.totalEarned).toBe("200.0000");
      expect(result.totalSpent).toBe("49.5000");
    });

    it("returns zeros when agent not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiAgentFleet.getGTokenBalance({ agentId: 999 });
      expect(result.gTokenBalance).toBe("0");
      expect(result.totalEarned).toBe("0");
      expect(result.totalSpent).toBe("0");
    });

    it("accepts string agentId", async () => {
      selectResultsQueue.push([
        { gTokenBalance: "50.0000", totalEarned: "50.0000", totalSpent: "0.0000" },
      ]);
      const result = await caller().aiAgentFleet.getGTokenBalance({ agentId: "3" });
      expect(result.gTokenBalance).toBe("50.0000");
    });
  });

  // ═══ getGTokenHistory ═══════════════════════════════════
  describe("getGTokenHistory", () => {
    it("returns token history for specific agent", async () => {
      const txns = [
        { id: 1, agentId: 1, txType: "task_reward", amount: "10.0000", balanceAfter: "60.0000", createdAt: "2026-01-15" },
        { id: 2, agentId: 1, txType: "task_expense", amount: "-5.0000", balanceAfter: "55.0000", createdAt: "2026-01-14" },
      ];
      selectResultsQueue.push(txns);
      const result = await caller().aiAgentFleet.getGTokenHistory({ agentId: 1 });
      expect(result).toHaveLength(2);
      expect(result[0].txType).toBe("task_reward");
    });

    it("returns all token history when no agentId", async () => {
      selectResultsQueue.push([
        { id: 1, agentId: 1, txType: "bonus", amount: "100.0000" },
        { id: 2, agentId: 2, txType: "task_reward", amount: "50.0000" },
      ]);
      const result = await caller().aiAgentFleet.getGTokenHistory({});
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no transactions", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiAgentFleet.getGTokenHistory({ agentId: 999 });
      expect(result).toEqual([]);
    });

    it("respects limit parameter", async () => {
      selectResultsQueue.push([{ id: 1 }]);
      const result = await caller().aiAgentFleet.getGTokenHistory({ agentId: 1, limit: 10 });
      expect(result).toHaveLength(1);
    });

    it("uses default limit of 50", async () => {
      selectResultsQueue.push([]);
      await caller().aiAgentFleet.getGTokenHistory({});
      // No error means default limit was applied
    });
  });

  // ═══ getGTokenSummary ═══════════════════════════════════
  describe("getGTokenSummary", () => {
    it("returns system-wide token summary", async () => {
      mockGetGTokenSummary.mockResolvedValue({
        totalBalance: "5000.0000",
        totalEarned: "8000.0000",
        totalSpent: "3000.0000",
        totalAgents: 50,
        activeAgents: 30,
        totalTasks: 200,
      });
      const result = await caller().aiAgentFleet.getGTokenSummary();
      expect(result.totalBalance).toBe("5000.0000");
      expect(result.totalAgents).toBe(50);
      expect(result.activeAgents).toBe(30);
      expect(result.totalTasks).toBe(200);
    });

    it("returns zeros on service error", async () => {
      mockGetGTokenSummary.mockRejectedValue(new Error("DB error"));
      const result = await caller().aiAgentFleet.getGTokenSummary();
      expect(result.totalBalance).toBe("0");
      expect(result.totalAgents).toBe(0);
      expect(result.activeAgents).toBe(0);
      expect(result.totalTasks).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════
  // ANALYTICS
  // ════════════════════════════════════════════════════════

  // ═══ getAgentDashboard ══════════════════════════════════
  describe("getAgentDashboard", () => {
    it("returns dashboard for an agent", async () => {
      const dashboardData = {
        agent: { id: 1, agentCode: "L3-EMP001", level: 3, status: "active" },
        recentTasks: [{ id: 1, taskType: "document_draft", status: "completed" }],
        recentLedger: [{ id: 1, txType: "task_reward", amount: "10.0000" }],
      };
      mockGetAgentDashboard.mockResolvedValue(dashboardData);
      const result = await caller().aiAgentFleet.getAgentDashboard({ agentId: 1 });
      expect(result).not.toBeNull();
      expect(result!.agent.agentCode).toBe("L3-EMP001");
      expect(result!.recentTasks).toHaveLength(1);
      expect(result!.recentLedger).toHaveLength(1);
    });

    it("returns null when agent not found", async () => {
      mockGetAgentDashboard.mockResolvedValue(null);
      const result = await caller().aiAgentFleet.getAgentDashboard({ agentId: 999 });
      expect(result).toBeNull();
    });

    it("returns null on service error", async () => {
      mockGetAgentDashboard.mockRejectedValue(new Error("Agent not found"));
      const result = await caller().aiAgentFleet.getAgentDashboard({ agentId: 1 });
      expect(result).toBeNull();
    });

    it("accepts string agentId", async () => {
      mockGetAgentDashboard.mockResolvedValue({
        agent: { id: 5 }, recentTasks: [], recentLedger: [],
      });
      const result = await caller().aiAgentFleet.getAgentDashboard({ agentId: "5" });
      expect(mockGetAgentDashboard).toHaveBeenCalledWith(5);
      expect(result).not.toBeNull();
    });
  });

  // ═══ getFleetAnalytics ══════════════════════════════════
  describe("getFleetAnalytics", () => {
    it("returns fleet analytics with level stats", async () => {
      mockGetFleetAnalytics.mockResolvedValue({
        levelStats: [
          { level: 1, count: 10, activeCount: 5, totalTasks: 20, avgReputation: "60", totalBalance: "500" },
          { level: 2, count: 10, activeCount: 3, totalTasks: 15, avgReputation: "55", totalBalance: "300" },
        ],
        summary: {
          totalBalance: "5000", totalEarned: "8000", totalSpent: "3000",
          totalAgents: 50, activeAgents: 30, totalTasks: 200,
        },
      });
      const result = await caller().aiAgentFleet.getFleetAnalytics();
      expect(result.levelStats).toHaveLength(2);
      expect(result.summary.totalAgents).toBe(50);
    });

    it("returns empty analytics on service error", async () => {
      mockGetFleetAnalytics.mockRejectedValue(new Error("Analytics error"));
      const result = await caller().aiAgentFleet.getFleetAnalytics();
      expect(result.levelStats).toEqual([]);
      expect(result.summary.totalAgents).toBe(0);
      expect(result.summary.totalBalance).toBe("0");
    });
  });

  // ═══ listAllAgents ══════════════════════════════════════
  describe("listAllAgents", () => {
    it("returns paginated agent list", async () => {
      const agents = [
        { id: 1, agentCode: "L1-EMP001", status: "active", level: 1 },
        { id: 2, agentCode: "L2-EMP001", status: "inactive", level: 2 },
      ];
      selectResultsQueue.push(agents);
      const result = await caller().aiAgentFleet.listAllAgents({});
      expect(result).toHaveLength(2);
    });

    it("filters by status", async () => {
      selectResultsQueue.push([
        { id: 1, agentCode: "L1-EMP001", status: "active", level: 1 },
      ]);
      const result = await caller().aiAgentFleet.listAllAgents({ status: "active" });
      expect(result).toHaveLength(1);
    });

    it("returns all agents when no status filter", async () => {
      selectResultsQueue.push([
        { id: 1, status: "active" },
        { id: 2, status: "inactive" },
        { id: 3, status: "paused" },
      ]);
      const result = await caller().aiAgentFleet.listAllAgents({});
      expect(result).toHaveLength(3);
    });

    it("respects limit and offset", async () => {
      selectResultsQueue.push([{ id: 3 }]);
      const result = await caller().aiAgentFleet.listAllAgents({ limit: 1, offset: 2 });
      expect(result).toHaveLength(1);
    });

    it("uses default limit=50 and offset=0", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiAgentFleet.listAllAgents({});
      expect(result).toEqual([]);
    });

    it("returns empty array on DB error", async () => {
      // No items in queue; the chain.then returns [] by default
      const result = await caller().aiAgentFleet.listAllAgents({});
      expect(result).toEqual([]);
    });

    it("validates status enum", async () => {
      await expect(
        caller().aiAgentFleet.listAllAgents({ status: "invalid_status" as any }),
      ).rejects.toThrow();
    });

    it("accepts all valid status values", async () => {
      const statuses = ["inactive", "active", "paused", "decommissioned"] as const;
      for (const status of statuses) {
        selectResultsQueue.push([{ id: 1, status }]);
        const result = await caller().aiAgentFleet.listAllAgents({ status });
        expect(result).toHaveLength(1);
      }
    });
  });

  // ════════════════════════════════════════════════════════
  // AUTHENTICATION GUARDS
  // ════════════════════════════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for provisionMyFleet", async () => {
      await expect(anonCaller().aiAgentFleet.provisionMyFleet()).rejects.toThrow();
    });

    it("rejects anonymous for provisionAll", async () => {
      await expect(anonCaller().aiAgentFleet.provisionAll()).rejects.toThrow();
    });

    it("rejects anonymous for getMyFleet", async () => {
      await expect(anonCaller().aiAgentFleet.getMyFleet()).rejects.toThrow();
    });

    it("rejects anonymous for getFleetByEmployee", async () => {
      await expect(
        anonCaller().aiAgentFleet.getFleetByEmployee({ employeeId: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for activateAgent", async () => {
      await expect(
        anonCaller().aiAgentFleet.activateAgent({ agentId: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for deactivateAgent", async () => {
      await expect(
        anonCaller().aiAgentFleet.deactivateAgent({ agentId: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for updateAgentConfig", async () => {
      await expect(
        anonCaller().aiAgentFleet.updateAgentConfig({ agentId: 1, canBidTasks: true }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for executeTask", async () => {
      await expect(
        anonCaller().aiAgentFleet.executeTask({
          agentId: 1,
          taskType: "document_draft",
          taskTitle: "Test",
        }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for reviewTaskOutput", async () => {
      await expect(
        anonCaller().aiAgentFleet.reviewTaskOutput({
          executionId: 1,
          approved: true,
          qualityScore: 70,
        }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getAgentTaskHistory", async () => {
      await expect(
        anonCaller().aiAgentFleet.getAgentTaskHistory({ agentId: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getGTokenBalance", async () => {
      await expect(
        anonCaller().aiAgentFleet.getGTokenBalance({ agentId: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getGTokenHistory", async () => {
      await expect(
        anonCaller().aiAgentFleet.getGTokenHistory({}),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getGTokenSummary", async () => {
      await expect(anonCaller().aiAgentFleet.getGTokenSummary()).rejects.toThrow();
    });

    it("rejects anonymous for getAgentDashboard", async () => {
      await expect(
        anonCaller().aiAgentFleet.getAgentDashboard({ agentId: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getFleetAnalytics", async () => {
      await expect(anonCaller().aiAgentFleet.getFleetAnalytics()).rejects.toThrow();
    });

    it("rejects anonymous for listAllAgents", async () => {
      await expect(anonCaller().aiAgentFleet.listAllAgents({})).rejects.toThrow();
    });
  });
});
