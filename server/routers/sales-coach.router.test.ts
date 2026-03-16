/**
 * Sales Coach Engine Router — Unit Tests
 *
 * 3 sub-routers (~18 procedures):
 *   budget (7), tactical (6), coach (5)
 *
 * Run: pnpm test -- server/routers/sales-coach.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
const selectResultsQueue: any[][] = [];
const returningQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function createMockDbChain() {
  const chain: any = {};
  for (const m of [
    "from", "where", "and", "orderBy", "groupBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "target",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() =>
    Promise.resolve(returningQueue.length > 0 ? returningQueue.shift()! : mockReturningResult)
  );
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };
  return chain;
}

const mockDb: any = {
  select: vi.fn(() => createMockDbChain()),
  insert: vi.fn(() => createMockDbChain()),
  update: vi.fn(() => createMockDbChain()),
  delete: vi.fn(() => createMockDbChain()),
  execute: vi.fn(() => Promise.resolve({ rows: [], rowCount: 0 })),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock tRPC ───────────────────────────────────────────
vi.mock("../_core/trpc", () => {
  const passthrough: any = {
    input: vi.fn().mockReturnThis(),
    query: vi.fn((fn: any) => fn),
    mutation: vi.fn((fn: any) => fn),
    use: vi.fn().mockReturnThis(),
  };
  return {
    router: vi.fn((routes: any) => routes),
    protectedProcedure: passthrough,
    requirePermission: vi.fn(() => passthrough),
  };
});

// ── Mock schemas ────────────────────────────────────────
vi.mock("../../drizzle/sales-coach-schema", () => ({
  clientAnnualBudgets: {
    id: "id", clientId: "client_id", year: "year",
    cleaningCapex: "cleaning_capex", visionCapex: "vision_capex", zldCapex: "zld_capex",
    totalCapex: "total_capex", deadlineStatus: "deadline_status", deadlineDate: "deadline_date",
    recordedBy: "recorded_by", buCode: "bu_code", notes: "notes",
    createdAt: "created_at", updatedAt: "updated_at",
  },
  projectBiddingStrategies: {
    id: "id", projectId: "project_id", opportunityId: "opportunity_id",
    projectBackground: "project_background", communicationPlan: "communication_plan",
    biddingStrategy: "bidding_strategy", competitorAnalysis: "competitor_analysis",
    confidenceLevel: "confidence_level", stage: "stage", status: "status",
    createdBy: "created_by", buCode: "bu_code",
    createdAt: "created_at", updatedAt: "updated_at",
  },
  scBudgetDeadlineStatusEnum: {},
  scBiddingStrategyStatusEnum: {},
}));

vi.mock("../../drizzle/empowerment-schema", () => ({
  employeeDailyLogs: {
    id: "id", userId: "user_id", logDate: "log_date", projectId: "project_id",
    loggedHours: "logged_hours", completedTasks: "completed_tasks",
    blockers: "blockers", notes: "notes", energyLevel: "energy_level",
    status: "status", approvedBy: "approved_by", approvedAt: "approved_at",
    aiCoachFeedback: "ai_coach_feedback", pipelineHealthScore: "pipeline_health_score",
    createdAt: "created_at", updatedAt: "updated_at",
  },
  dailyLogStatusEnum: {},
}));

vi.mock("../../drizzle/schema", () => ({
  crmCustomers: { id: "id", customerName: "customerName", customerCode: "customerCode" },
  projects: { id: "id", name: "name", projectCode: "projectCode", status: "status", customerId: "customerId", buCode: "buCode" },
  aiTasks: { id: "id", status: "status", resultData: "resultData", errorMessage: "errorMessage" },
  users: { id: "id" },
}));

// ── Mock services ────────────────────────────────────────
const mockSubmitTask = vi.fn(async () => ({ taskId: 42 }));
vi.mock("../services/task-worker.service", () => ({
  submitTask: (...args: any[]) => mockSubmitTask(...args),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  asc: vi.fn((col: any) => col),
  sql: Object.assign(vi.fn((...args: any[]) => args), {
    raw: vi.fn((s: string) => s),
  }),
  isNull: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
}));

// ── Import router ──────────────────────────────────────
import { salesCoachRouter } from "./sales-coach.router";

const mockCtx = {
  user: { id: 1, name: "Test User", role: "user", email: "test@test.com" },
  bu: { buId: 1, buCode: "BU_OS", buName: "海外", departmentCode: null },
};
const adminCtx = {
  user: { id: 999, name: "Admin", role: "admin", email: "admin@test.com" },
  bu: { buId: null, buCode: null, buName: null, departmentCode: null },
};

describe("sales-coach.router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = [];
    mockReturningResult = [{ id: 1 }];
    selectResultsQueue.length = 0;
    returningQueue.length = 0;
  });

  // ══════════════════════════════════════════════════════
  // Budget Sub-Router
  // ══════════════════════════════════════════════════════

  describe("budget", () => {
    it("list — returns budgets", async () => {
      const budgets = [{ id: 1, clientId: 10, year: 2026 }];
      selectResultsQueue.push(budgets);
      const result = await (salesCoachRouter as any).budget.list({
        input: { year: 2026 },
        ctx: mockCtx,
      });
      expect(result).toEqual(budgets);
    });

    it("getById — returns single budget", async () => {
      selectResultsQueue.push([{ id: 5, clientId: 20, year: 2026 }]);
      const result = await (salesCoachRouter as any).budget.getById({
        input: { id: 5 },
        ctx: mockCtx,
      });
      expect(result).toEqual({ id: 5, clientId: 20, year: 2026 });
    });

    it("getById — returns null if not found", async () => {
      selectResultsQueue.push([]);
      const result = await (salesCoachRouter as any).budget.getById({
        input: { id: 999 },
        ctx: mockCtx,
      });
      expect(result).toBeNull();
    });

    it("upsert — creates budget with auto-sum", async () => {
      returningQueue.push([{
        id: 1, clientId: 10, year: 2026,
        cleaningCapex: "100000", visionCapex: "50000", zldCapex: "30000",
        totalCapex: "180000", deadlineStatus: "completed",
      }]);
      const result = await (salesCoachRouter as any).budget.upsert({
        input: {
          clientId: 10, year: 2026,
          cleaningCapex: "100000", visionCapex: "50000", zldCapex: "30000",
        },
        ctx: mockCtx,
      });
      expect(result.totalCapex).toBe("180000");
      expect(result.deadlineStatus).toBe("completed");
    });

    it("delete — removes budget", async () => {
      const result = await (salesCoachRouter as any).budget.delete({
        input: { id: 1 },
        ctx: mockCtx,
      });
      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("getBudgetAlerts — returns alert rows", async () => {
      const alerts = [
        { client_id: 1, client_name: "Client A", alert_level: "missing", days_remaining: null },
        { client_id: 2, client_name: "Client B", alert_level: "overdue", days_remaining: -5 },
      ];
      mockDb.execute.mockResolvedValueOnce({ rows: alerts });
      const result = await (salesCoachRouter as any).budget.getBudgetAlerts({
        input: { year: 2026 },
        ctx: mockCtx,
      });
      expect(result).toEqual(alerts);
    });

    it("getBudgetSummary — returns summary stats", async () => {
      // Total clients count
      selectResultsQueue.push([{ count: 50 }]);
      // Budget rows
      selectResultsQueue.push([
        { cleaningCapex: "100000", visionCapex: "50000", zldCapex: "30000", deadlineStatus: "completed" },
        { cleaningCapex: "80000", visionCapex: "0", zldCapex: "0", deadlineStatus: "partial" },
      ]);
      const result = await (salesCoachRouter as any).budget.getBudgetSummary({
        input: { year: 2026 },
        ctx: mockCtx,
      });
      expect(result.totalClients).toBe(50);
      expect(result.budgetsRecorded).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.capexByLine.cleaning).toBe(180000);
    });

    it("markOverdue — batch updates", async () => {
      mockDb.execute.mockResolvedValueOnce({ rowCount: 3 });
      const result = await (salesCoachRouter as any).budget.markOverdue({
        input: undefined,
        ctx: adminCtx,
      });
      expect(result.updated).toBe(3);
    });
  });

  // ══════════════════════════════════════════════════════
  // Tactical Sub-Router
  // ══════════════════════════════════════════════════════

  describe("tactical", () => {
    it("create — creates strategy", async () => {
      returningQueue.push([{
        id: 1, projectId: 100, stage: "M0", status: "draft", confidenceLevel: 3,
      }]);
      const result = await (salesCoachRouter as any).tactical.create({
        input: { projectId: 100, stage: "M0" },
        ctx: mockCtx,
      });
      expect(result.projectId).toBe(100);
    });

    it("update — updates strategy fields", async () => {
      returningQueue.push([{
        id: 1, projectBackground: "Updated bg", stage: "M1",
      }]);
      const result = await (salesCoachRouter as any).tactical.update({
        input: { id: 1, projectBackground: "Updated bg", stage: "M1" },
        ctx: mockCtx,
      });
      expect(result.projectBackground).toBe("Updated bg");
    });

    it("getByProject — returns strategy", async () => {
      selectResultsQueue.push([{ id: 1, projectId: 100, stage: "M1" }]);
      const result = await (salesCoachRouter as any).tactical.getByProject({
        input: { projectId: 100 },
        ctx: mockCtx,
      });
      expect(result.projectId).toBe(100);
    });

    it("getByProject — returns null if not found", async () => {
      selectResultsQueue.push([]);
      const result = await (salesCoachRouter as any).tactical.getByProject({
        input: { projectId: 999 },
        ctx: mockCtx,
      });
      expect(result).toBeNull();
    });

    it("getByOpportunity — returns strategy", async () => {
      selectResultsQueue.push([{ id: 1, opportunityId: 50 }]);
      const result = await (salesCoachRouter as any).tactical.getByOpportunity({
        input: { opportunityId: 50 },
        ctx: mockCtx,
      });
      expect(result.opportunityId).toBe(50);
    });

    it("getTacticalBoard — returns grouped M-stage board", async () => {
      mockDb.execute.mockResolvedValueOnce({
        rows: [
          { project_id: 1, project_name: "P1", stage: "M0", has_background: 1, has_plan: 0, has_strategy: 0 },
          { project_id: 2, project_name: "P2", stage: "M1", has_background: 1, has_plan: 1, has_strategy: 1 },
          { project_id: 3, project_name: "P3", stage: "M2", has_background: 1, has_plan: 1, has_strategy: 0 },
        ],
      });
      const result = await (salesCoachRouter as any).tactical.getTacticalBoard({
        input: {},
        ctx: mockCtx,
      });
      expect(result.M0).toHaveLength(1);
      expect(result.M1).toHaveLength(1);
      expect(result.M2).toHaveLength(1);
      expect(result.M3).toHaveLength(0);
    });

    it("delete — removes strategy", async () => {
      const result = await (salesCoachRouter as any).tactical.delete({
        input: { id: 1 },
        ctx: mockCtx,
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ══════════════════════════════════════════════════════
  // Coach Sub-Router
  // ══════════════════════════════════════════════════════

  describe("coach", () => {
    it("submitSalesReport — inserts log and submits AI task", async () => {
      returningQueue.push([{ id: 10, userId: 1, logDate: "2026-03-11", status: "submitted" }]);
      mockSubmitTask.mockResolvedValueOnce({ taskId: 42 });

      const result = await (salesCoachRouter as any).coach.submitSalesReport({
        input: {
          logDate: "2026-03-11",
          loggedHours: 8,
          completedTasks: [{ title: "Visit Client A" }],
          notes: "Good day",
          energyLevel: 4,
          clientsVisited: 2,
        },
        ctx: mockCtx,
      });
      expect(result.log.id).toBe(10);
      expect(result.taskId).toBe(42);
      expect(mockSubmitTask).toHaveBeenCalledWith(
        "SALES_COACH_FEEDBACK",
        expect.objectContaining({ userId: 1, logId: 10 }),
        expect.any(String),
      );
    });

    it("getCoachingFeedback — returns feedback", async () => {
      const feedback = {
        tacticalGuidance: "Focus on closing M2 deals",
        pipelineRisks: ["Low M3 coverage"],
        suggestedActions: ["Schedule client meeting"],
        generatedAt: "2026-03-11T10:00:00Z",
      };
      selectResultsQueue.push([{
        id: 10,
        aiCoachFeedback: feedback,
        pipelineHealthScore: 75,
        logDate: "2026-03-11",
      }]);
      const result = await (salesCoachRouter as any).coach.getCoachingFeedback({
        input: { logDate: "2026-03-11" },
        ctx: mockCtx,
      });
      expect(result.aiCoachFeedback).toEqual(feedback);
      expect(result.pipelineHealthScore).toBe(75);
    });

    it("getCoachingFeedback — returns null if not found", async () => {
      selectResultsQueue.push([]);
      const result = await (salesCoachRouter as any).coach.getCoachingFeedback({
        input: { logDate: "2026-01-01" },
        ctx: mockCtx,
      });
      expect(result).toBeNull();
    });

    it("getTaskStatus — returns task status", async () => {
      selectResultsQueue.push([{
        id: 42, status: "completed",
        resultData: { feedback: {} },
        errorMessage: null,
      }]);
      const result = await (salesCoachRouter as any).coach.getTaskStatus({
        input: { taskId: 42 },
        ctx: mockCtx,
      });
      expect(result.status).toBe("completed");
    });

    it("getPipelineHealth — returns health summary", async () => {
      // Latest log with score
      selectResultsQueue.push([{ pipelineHealthScore: 72, logDate: "2026-03-10" }]);
      // Stage counts
      mockDb.execute.mockResolvedValueOnce({
        rows: [
          { stage: "M0", cnt: 5 },
          { stage: "M1", cnt: 3 },
          { stage: "M2", cnt: 2 },
        ],
      });
      // Total clients
      selectResultsQueue.push([{ count: 100 }]);
      // Budget count
      selectResultsQueue.push([{ count: 40 }]);

      const result = await (salesCoachRouter as any).coach.getPipelineHealth({
        input: {},
        ctx: mockCtx,
      });
      expect(result.healthScore).toBe(72);
      expect(result.budgetCoverage.percent).toBe(40);
    });

    it("getCoachHistory — returns last N feedbacks", async () => {
      const history = [
        { id: 10, logDate: "2026-03-10", aiCoachFeedback: { tacticalGuidance: "A" }, pipelineHealthScore: 70 },
        { id: 9, logDate: "2026-03-09", aiCoachFeedback: { tacticalGuidance: "B" }, pipelineHealthScore: 65 },
      ];
      selectResultsQueue.push(history);
      const result = await (salesCoachRouter as any).coach.getCoachHistory({
        input: { limit: 5 },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
      expect(result[0].logDate).toBe("2026-03-10");
    });
  });
});
