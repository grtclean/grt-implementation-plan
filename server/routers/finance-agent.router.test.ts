/**
 * Finance Agent Router — Unit Tests
 * 9 procedures: submitForReview, getReviewStatus, getAiDiagnosticReport,
 * overrideAndApprove, listPendingReviews, getBudgetContext, getPolicyRules,
 * recentReviews, seedDemo
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

/**
 * Two-layer mock: `db` (no .then) → `chain` (thenable).
 * This avoids the JS thenable-unwrapping issue where Promise.resolve(obj)
 * calls obj.then() if it exists, destroying the mock.
 */
function createMockDb() {
  // Query chain — returned by db.select()/insert()/update()/delete()
  // Has .then so `await db.select().from().where()` resolves to mockQueryResult
  const chain: any = {};
  for (const m of ["from","where","orderBy","limit","offset","values","set","onConflictDoUpdate","onConflictDoNothing"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
  };

  // DB object — NO .then, safe to return from async requireDb()
  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../../drizzle/schema", () => ({
  expenseClaims: {
    id: "id", claimCode: "claimCode", claimTitle: "claimTitle", claimType: "claimType",
    totalAmount: "totalAmount", status: "status", submitterId: "submitterId",
    aiAuditScore: "aiAuditScore", aiAuditResult: "aiAuditResult",
    submittedAt: "submittedAt", createdAt: "createdAt", updatedAt: "updatedAt",
    reviewNotes: "reviewNotes", version: "version", description: "description",
    requiresManualReview: "requiresManualReview",
  },
  aiTasks: {
    id: "id", status: "status", resultData: "resultData", errorMessage: "errorMessage",
    taskType: "taskType",
  },
}));

vi.mock("../services/task-worker.service", () => ({
  registerTaskHandler: vi.fn(),
  submitTask: vi.fn().mockResolvedValue({ taskId: 42 }),
}));

vi.mock("../services/finance-agent.service", () => ({
  POLICY_RULES: [
    { code: "R001", name: "费用率红线", threshold: 5, description: "BU费用率不得超过5%" },
    { code: "R002", name: "单笔预审批", threshold: 50000, description: "超5万需预审批" },
  ],
  fetchBuBudgetContext: vi.fn().mockResolvedValue({
    buName: "事业一部",
    quarterTarget: 12000000,
    quarterActual: 9000000,
    completionPct: 75,
    currentExpenseRatio: 3.2,
    redLineRatio: 5,
  }),
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────────
describe("financeAgent router", () => {
  // ─── submitForReview ───────────────────────────────────
  describe("submitForReview", () => {
    it("submits claim for AI review and returns taskId", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{
        id: 10, submitterId: 1, status: "submitted",
      }]);
      const result = await caller.financeAgent.submitForReview({ claimId: 10 });
      expect(result).toHaveProperty("taskId", 42);
      expect(result).toHaveProperty("claimId", 10);
      expect(result).toHaveProperty("status", "ai_reviewing");
    });

    it("throws NOT_FOUND when claim does not exist", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];
      await expect(caller.financeAgent.submitForReview({ claimId: 999 }))
        .rejects.toThrow("报销单不存在");
    });

    it("throws FORBIDDEN when non-owner non-finance submits", async () => {
      const caller = createAdminCaller({ id: 5, role: "employee" });
      selectResultsQueue.push([{ id: 10, submitterId: 99, status: "submitted" }]);
      await expect(caller.financeAgent.submitForReview({ claimId: 10 }))
        .rejects.toThrow("只能提交自己的报销单");
    });

    it("allows finance_manager to submit any claim", async () => {
      const caller = createAdminCaller({ id: 5, role: "finance_manager" });
      selectResultsQueue.push([{ id: 10, submitterId: 99, status: "submitted" }]);
      const result = await caller.financeAgent.submitForReview({ claimId: 10 });
      expect(result.taskId).toBe(42);
    });

    it("throws BAD_REQUEST when claim status is not submitted/draft", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 10, submitterId: 1, status: "approved" }]);
      await expect(caller.financeAgent.submitForReview({ claimId: 10 }))
        .rejects.toThrow("无法提交AI审核");
    });
  });

  // ─── getReviewStatus ───────────────────────────────────
  describe("getReviewStatus", () => {
    it("returns completed status with report when task is done", async () => {
      const caller = createAdminCaller();
      const report = { decision: "pass", score: 85 };
      selectResultsQueue.push([{ id: 42, status: "completed", resultData: report }]);
      const result = await caller.financeAgent.getReviewStatus({ taskId: 42 });
      expect(result.taskStatus).toBe("completed");
      expect(result.score).toBe(85);
    });

    it("returns not_found when task does not exist", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];
      const result = await caller.financeAgent.getReviewStatus({ taskId: 999 });
      expect(result.taskStatus).toBe("not_found");
    });

    it("returns failed status with error message", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 42, status: "failed", errorMessage: "timeout" }]);
      const result = await caller.financeAgent.getReviewStatus({ taskId: 42 });
      expect(result.taskStatus).toBe("failed");
      expect(result.error).toBe("timeout");
    });

    it("returns processing status when task is in progress", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 42, status: "processing", resultData: null }]);
      const result = await caller.financeAgent.getReviewStatus({ taskId: 42 });
      expect(result.taskStatus).toBe("processing");
    });

    it("returns claim status when queried by claimId", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{
        id: 10, status: "pending_review", aiAuditResult: { decision: "warn", score: 68 }, aiAuditScore: 68,
      }]);
      const result = await caller.financeAgent.getReviewStatus({ claimId: 10 });
      expect(result.taskStatus).toBe("completed");
      expect(result.score).toBe(68);
    });

    it("returns processing when claim is ai_reviewing", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 10, status: "ai_reviewing", aiAuditResult: null }]);
      const result = await caller.financeAgent.getReviewStatus({ claimId: 10 });
      expect(result.taskStatus).toBe("processing");
    });
  });

  // ─── getAiDiagnosticReport ─────────────────────────────
  describe("getAiDiagnosticReport", () => {
    it("returns diagnostic report for own claim", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{
        id: 10, submitterId: 1,
        aiAuditResult: { decision: "pass", score: 85, diagnosis: "合规" },
        aiAuditScore: 85, claimCode: "FA-001", claimTitle: "差旅", totalAmount: "5000", status: "pending_review",
      }]);
      const result = await caller.financeAgent.getAiDiagnosticReport({ claimId: 10 });
      expect(result).not.toBeNull();
      expect(result!.score).toBe(85);
      expect(result!.claimCode).toBe("FA-001");
    });

    it("throws NOT_FOUND when claim missing", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];
      await expect(caller.financeAgent.getAiDiagnosticReport({ claimId: 999 }))
        .rejects.toThrow("报销单不存在");
    });

    it("throws FORBIDDEN for non-owner non-finance", async () => {
      const caller = createAdminCaller({ id: 5, role: "employee" });
      selectResultsQueue.push([{ id: 10, submitterId: 99, aiAuditResult: { score: 50 } }]);
      await expect(caller.financeAgent.getAiDiagnosticReport({ claimId: 10 }))
        .rejects.toThrow("无权查看");
    });

    it("returns null when no AI result yet", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 10, submitterId: 1, aiAuditResult: null }]);
      const result = await caller.financeAgent.getAiDiagnosticReport({ claimId: 10 });
      expect(result).toBeNull();
    });
  });

  // ─── overrideAndApprove ────────────────────────────────
  describe("overrideAndApprove", () => {
    it("overrides AI intercept with justification", async () => {
      const caller = createAdminCaller({ id: 5 });
      selectResultsQueue.push([{
        id: 10, submitterId: 99, status: "ai_reviewing",
        aiAuditResult: { decision: "intercept", score: 35 },
      }]);
      mockReturningResult = [{ id: 10, status: "pending_review" }];
      const result = await caller.financeAgent.overrideAndApprove({
        claimId: 10, justification: "战略客户需要，BU总经理已批准",
      });
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("pending_review");
    });

    it("throws FORBIDDEN when submitter tries to override own claim", async () => {
      const caller = createAdminCaller({ id: 1 });
      selectResultsQueue.push([{ id: 10, submitterId: 1, status: "ai_reviewing" }]);
      await expect(caller.financeAgent.overrideAndApprove({
        claimId: 10, justification: "理由至少十个字符才行",
      })).rejects.toThrow("不能对自己的报销单");
    });

    it("throws BAD_REQUEST when claim not in ai_reviewing status", async () => {
      const caller = createAdminCaller({ id: 5 });
      selectResultsQueue.push([{ id: 10, submitterId: 99, status: "approved" }]);
      await expect(caller.financeAgent.overrideAndApprove({
        claimId: 10, justification: "理由至少十个字符才行",
      })).rejects.toThrow("仅拦截中的报销单");
    });

    it("throws CONFLICT when atomic guard fails (race)", async () => {
      const caller = createAdminCaller({ id: 5 });
      selectResultsQueue.push([{ id: 10, submitterId: 99, status: "ai_reviewing" }]);
      mockReturningResult = [];
      await expect(caller.financeAgent.overrideAndApprove({
        claimId: 10, justification: "理由至少十个字符才行",
      })).rejects.toThrow("状态已变更");
    });

    it("rejects justification shorter than 10 chars", async () => {
      const caller = createAdminCaller({ id: 5 });
      await expect(caller.financeAgent.overrideAndApprove({
        claimId: 10, justification: "短",
      })).rejects.toThrow();
    });
  });

  // ─── listPendingReviews ────────────────────────────────
  describe("listPendingReviews", () => {
    it("returns paginated pending reviews", async () => {
      const caller = createAdminCaller({ role: "finance_manager" });
      selectResultsQueue.push([
        { id: 1, claimCode: "FA-001", status: "ai_reviewing" },
        { id: 2, claimCode: "FA-002", status: "pending_review" },
      ]);
      selectResultsQueue.push([{ count: 2 }]);
      const result = await caller.financeAgent.listPendingReviews({ page: 1, pageSize: 20 });
      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it("returns only own claims for non-finance users", async () => {
      const caller = createAdminCaller({ id: 1, role: "employee" });
      selectResultsQueue.push([{ id: 1, claimCode: "FA-001", status: "ai_reviewing" }]);
      selectResultsQueue.push([{ count: 1 }]);
      const result = await caller.financeAgent.listPendingReviews({});
      expect(result.rows).toHaveLength(1);
    });
  });

  // ─── getBudgetContext ──────────────────────────────────
  describe("getBudgetContext", () => {
    it("returns BU budget context", async () => {
      const caller = createAdminCaller();
      const result = await caller.financeAgent.getBudgetContext({ departmentId: null });
      expect(result).toHaveProperty("buName", "事业一部");
      expect(result).toHaveProperty("quarterTarget", 12000000);
      expect(result).toHaveProperty("redLineRatio", 5);
    });
  });

  // ─── getPolicyRules ────────────────────────────────────
  describe("getPolicyRules", () => {
    it("returns hardcoded policy rules", async () => {
      const caller = createAdminCaller();
      const result = await caller.financeAgent.getPolicyRules();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("code", "R001");
    });
  });

  // ─── recentReviews ─────────────────────────────────────
  describe("recentReviews", () => {
    it("returns recent reviewed claims with decision", async () => {
      const caller = createAdminCaller({ role: "finance_manager" });
      mockQueryResult = [
        { id: 1, claimCode: "FA-001", aiAuditResult: { decision: "pass" }, status: "approved" },
        { id: 2, claimCode: "FA-002", aiAuditResult: { decision: "intercept" }, status: "ai_reviewing" },
      ];
      const result = await caller.financeAgent.recentReviews();
      expect(result).toHaveLength(2);
      expect(result[0].decision).toBe("pass");
      expect(result[1].decision).toBe("intercept");
    });

    it("returns null decision when aiAuditResult has no decision", async () => {
      const caller = createAdminCaller({ role: "finance_manager" });
      mockQueryResult = [{ id: 1, claimCode: "FA-003", aiAuditResult: {}, status: "pending" }];
      const result = await caller.financeAgent.recentReviews();
      expect(result[0].decision).toBeNull();
    });
  });

  // ─── seedDemo ──────────────────────────────────────────
  describe("seedDemo", () => {
    it("inserts demo claims and returns count", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 100 }];
      const result = await caller.financeAgent.seedDemo();
      expect(result).toHaveProperty("inserted");
      expect(result.inserted).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Auth guards ───────────────────────────────────────
  describe("authentication", () => {
    it("rejects anonymous for submitForReview", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.financeAgent.submitForReview({ claimId: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for getPolicyRules", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.financeAgent.getPolicyRules()).rejects.toThrow();
    });

    it("rejects anonymous for overrideAndApprove", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.financeAgent.overrideAndApprove({
        claimId: 1, justification: "测试理由至少十个字符",
      })).rejects.toThrow();
    });
  });
});
