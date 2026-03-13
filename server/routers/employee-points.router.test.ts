/**
 * Employee Points Router Tests — 员工积分奖惩系统
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ──
const selectResultsQueue: any[] = [];
const returningQueue: any[] = [];
const executeResults: any[] = [];

function chainable(overrides: Record<string, unknown> = {}) {
  const chain: any = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => {
      const result = selectResultsQueue.shift() ?? [];
      return Promise.resolve(result);
    }),
    insert: vi.fn(() => chain),
    values: vi.fn(() => chain),
    returning: vi.fn(() => {
      const result = returningQueue.shift() ?? [{ id: 1 }];
      return Promise.resolve(result);
    }),
    update: vi.fn(() => chain),
    set: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => {
      const result = executeResults.shift() ?? { rows: [] };
      return Promise.resolve(result);
    }),
    ...overrides,
  };
  return chain;
}

vi.mock("../db", () => ({ requireDb: vi.fn(() => Promise.resolve(chainable())) }));
vi.mock("../../drizzle/employee-points-schema", () => ({
  pointRules: { code: "code", isActive: "is_active", category: "category" },
  pointTransactions: { employeeId: "employee_id", ruleCode: "rule_code", transactionDate: "transaction_date", createdAt: "created_at", type: "type" },
  pointBalances: { employeeId: "employee_id", isActive: "is_active", isOnObservation: "is_on_observation" },
  pointRedemptionCatalog: { isActive: "is_active", pointsCost: "points_cost", code: "code" },
  pointRedemptions: { employeeId: "employee_id", status: "status", createdAt: "created_at", id: "id" },
  pointThresholds: { isActive: "is_active" },
  pointEnforcementLog: { employeeId: "employee_id", thresholdId: "threshold_id", liftedAt: "lifted_at", id: "id" },
  dailyComplianceChecks: { employeeId: "employee_id", checkDate: "check_date", checkType: "check_type", id: "id" },
  suggestionSubmissions: { id: "id", employeeId: "employee_id", status: "status" },
  pointApprovalRequests: { id: "id", status: "status" },
  communityPosts: { id: "id", isActive: "is_active", postType: "post_type", scope: "scope", isPinned: "is_pinned" },
  communitySensitiveWords: { id: "id", isActive: "is_active" },
  communityAcks: { postId: "post_id", employeeId: "employee_id" },
  eliteBenefitApplications: { id: "id", employeeId: "employee_id", status: "status", benefitType: "benefit_type", revocationCount: "revocation_count", cooldownUntil: "cooldown_until" },
  eliteBenefitReviews: { id: "id", applicationId: "application_id", employeeId: "employee_id", reviewPeriod: "review_period", outcome: "outcome", consecutiveKpiViolations: "consecutive_kpi_violations" },
}));
vi.mock("../../drizzle/schema", () => ({
  employeeXP: { userId: "user_id" },
  employeeLevels: { userId: "user_id", totalXP: "total_xp" },
  employeeAchievements: { userId: "user_id" },
}));

// Mock the service to simplify router-level tests
const mockSvc = vi.hoisted(() => ({
  awardPoints: vi.fn().mockResolvedValue({ points: 3, newBalance: 103, thresholdActions: [] }),
  getBalance: vi.fn().mockResolvedValue(100),
  getBalanceDetail: vi.fn().mockResolvedValue({ employeeId: 1, currentBalance: 100, totalEarned: 200, totalSpent: 50, totalPenalties: 50, ytdPoints: 100, isOnObservation: false, isExcellenceSuspended: false }),
  getTransactionHistory: vi.fn().mockResolvedValue([]),
  getLeaderboard: vi.fn().mockResolvedValue([]),
  getComplianceStatus: vi.fn().mockResolvedValue({ date: "2026-03-13", morningPlan: null, eveningSummary: null, nextDayPlan: null }),
  completeMorningPlanCheck: vi.fn().mockResolvedValue({ passed: true, onTime: true, points: 3 }),
  completeEveningSummaryCheck: vi.fn().mockResolvedValue({ passed: true, points: 3 }),
  completeNextDayPlanCheck: vi.fn().mockResolvedValue({ passed: true, points: 2 }),
  getRules: vi.fn().mockResolvedValue([]),
  getRedemptionCatalog: vi.fn().mockResolvedValue([]),
  requestRedemption: vi.fn().mockResolvedValue({ id: 1, status: "pending" }),
  getMyRedemptions: vi.fn().mockResolvedValue([]),
  getPendingRedemptions: vi.fn().mockResolvedValue([]),
  approveRedemption: vi.fn().mockResolvedValue({ success: true, newBalance: 50 }),
  rejectRedemption: vi.fn().mockResolvedValue({ success: true }),
  getObservationList: vi.fn().mockResolvedValue([]),
  runEndOfDayPenalties: vi.fn().mockResolvedValue({ date: "2026-03-13", penalized: 3 }),
  evaluateMonthlyPerformancePoints: vi.fn().mockResolvedValue({ period: "2026-02", evaluated: 97, awarded: 12, penalized: 3 }),
  evaluateSalesM2Pipeline: vi.fn().mockResolvedValue({ period: "2026-02", processed: 8 }),
  submitSuggestion: vi.fn().mockResolvedValue({ id: 1, title: "Test suggestion", status: "submitted" }),
  listSuggestions: vi.fn().mockResolvedValue([{ id: 1, title: "Test" }]),
  getSuggestion: vi.fn().mockResolvedValue({ id: 1, title: "Test", status: "submitted" }),
  evaluateSuggestion: vi.fn().mockResolvedValue({ id: 1, status: "effective", pointsAwarded: 50 }),
  approveSuggestion: vi.fn().mockResolvedValue({ id: 1, status: "outstanding", pointsAwarded: 500 }),
  getSuggestionStats: vi.fn().mockResolvedValue({ total: 10, byStatus: {}, byCategory: {}, totalPointsAwarded: 550 }),
  managerReport: vi.fn().mockResolvedValue({ action: "executed", points: 50, needsApproval: false }),
  listPendingApprovals: vi.fn().mockResolvedValue([]),
  approvePointRequest: vi.fn().mockResolvedValue({ id: 1, status: "approved" }),
  rejectPointRequest: vi.fn().mockResolvedValue({ id: 1, status: "rejected" }),
  getMyApprovalRequests: vi.fn().mockResolvedValue([]),
  getMonthlyStats: vi.fn().mockResolvedValue({ period: "2026-03", totalAwarded: 50, totalPenalties: 10, netPoints: 40 }),
  // Community
  listCommunityPosts: vi.fn().mockResolvedValue([{ id: 1, title: "Test post", postType: "announcement" }]),
  createCommunityPost: vi.fn().mockResolvedValue({ id: 1, title: "New post", contentClean: true }),
  acknowledgeCommunityPost: vi.fn().mockResolvedValue({ success: true }),
  likeCommunityPost: vi.fn().mockResolvedValue({ success: true }),
  getCommunityStats: vi.fn().mockResolvedValue({ totalPosts: 5, byType: {}, totalViews: 100, totalLikes: 20 }),
  listSensitiveWords: vi.fn().mockResolvedValue([{ id: 1, word: "test", action: "mask" }]),
  addSensitiveWord: vi.fn().mockResolvedValue({ id: 2, word: "badword", action: "block" }),
  removeSensitiveWord: vi.fn().mockResolvedValue({ success: true }),
  // Elite Benefit
  checkEliteEligibility: vi.fn().mockResolvedValue({ employeeId: 1, currentPoints: 6000, kpiAvg6m: 85, eligibility: { alternatingRest: { eligible: true }, fiveDayWeek: { eligible: false } } }),
  applyEliteBenefit: vi.fn().mockResolvedValue({ success: true, applicationId: 1 }),
  approveEliteBenefit: vi.fn().mockResolvedValue({ success: true, application: { id: 1, status: "active" } }),
  rejectEliteBenefit: vi.fn().mockResolvedValue({ success: true }),
  listEliteBenefitApplications: vi.fn().mockResolvedValue([{ id: 1, benefitType: "alternating_rest", status: "active" }]),
  revokeExpiredEliteBenefits: vi.fn().mockResolvedValue({ expired: 1, revoked: 0 }),
  runMonthlyEliteReview: vi.fn().mockResolvedValue({ period: "2026-03", expired: 0, reviewed: 5, passed: 3, warned: 1, revoked: 1 }),
  submitEliteCommitment: vi.fn().mockResolvedValue({ success: true, message: "承诺已提交", deadline: "2026-05-13" }),
  getEliteReviewHistory: vi.fn().mockResolvedValue([{ id: 1, reviewPeriod: "2026-03", outcome: "pass" }]),
}));

vi.mock("../services/employee-points.service", () => mockSvc);

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn((...a: any[]) => a), { raw: vi.fn((s: string) => s) }),
  desc: vi.fn((col: any) => col),
  isNull: vi.fn((col: any) => col),
}));

vi.mock("../_core/trpc", () => {
  const passthrough = { use: vi.fn(() => passthrough), input: vi.fn(() => passthrough), query: vi.fn((fn: any) => fn), mutation: vi.fn((fn: any) => fn) };
  return {
    router: vi.fn((routes: any) => routes),
    protectedProcedure: { ...passthrough },
    publicProcedure: { ...passthrough },
    requirePermission: vi.fn(() => passthrough),
  };
});

vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock("../services/gamification.service", () => ({
  grantXP: vi.fn().mockResolvedValue({ xpAwarded: 3, newTotal: 103, levelUp: false }),
  calculateLevel: vi.fn((xp: number) => ({ level: 1, title: "Newcomer", xpForNext: 50, progress: 0 })),
}));

import { employeePointsRouter } from "./employee-points.router";

describe("employeePointsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResultsQueue.length = 0;
    returningQueue.length = 0;
    executeResults.length = 0;
  });

  const ctx = { user: { id: 1, role: "admin" } } as any;

  // ── Balance ──
  describe("balance", () => {
    it("getMine returns balance for current user", async () => {
      const result = await employeePointsRouter.balance.getMine({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getBalanceDetail).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("currentBalance");
    });

    it("getDetail returns balance for specified employee", async () => {
      const result = await employeePointsRouter.balance.getDetail({ ctx, input: { employeeId: 42 }, rawInput: { employeeId: 42 }, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getBalanceDetail).toHaveBeenCalledWith(42);
    });

    it("leaderboard returns ranked list", async () => {
      mockSvc.getLeaderboard.mockResolvedValueOnce([{ rank: 1, employeeId: 1, ytdPoints: 500 }]);
      const result = await employeePointsRouter.balance.leaderboard({ ctx, input: { limit: 10 }, rawInput: {}, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getLeaderboard).toHaveBeenCalledWith(10);
    });
  });

  // ── Rules ──
  describe("rules", () => {
    it("list returns active rules", async () => {
      mockSvc.getRules.mockResolvedValueOnce([{ code: "morning_plan_ontime", points: 3 }]);
      const result = await employeePointsRouter.rules.list({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getRules).toHaveBeenCalled();
    });
  });

  // ── Award ──
  describe("award", () => {
    it("award points by rule code", async () => {
      const input = { employeeId: 5, ruleCode: "task_complete_p1", description: "Completed task" };
      const result = await employeePointsRouter.award.award({ ctx, input, rawInput: input, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.awardPoints).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 5, ruleCode: "task_complete_p1", grantedBy: 1 }));
    });

    it("report auto-executes for ≤100 points", async () => {
      const result = await employeePointsRouter.award.report({
        ctx, input: { targetEmployeeId: 2, points: 50, description: "Good work" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.managerReport).toHaveBeenCalledWith(expect.objectContaining({ requesterId: 1, targetEmployeeId: 2, points: 50 }));
    });

    it("pendingApprovals returns pending list", async () => {
      await employeePointsRouter.award.pendingApprovals({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.listPendingApprovals).toHaveBeenCalled();
    });

    it("approveRequest approves and executes points", async () => {
      await employeePointsRouter.award.approveRequest({ ctx, input: { requestId: 1 }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.approvePointRequest).toHaveBeenCalledWith(expect.objectContaining({ requestId: 1, approverId: 1 }));
    });

    it("rejectRequest rejects a point request", async () => {
      await employeePointsRouter.award.rejectRequest({ ctx, input: { requestId: 1, notes: "not justified" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.rejectPointRequest).toHaveBeenCalledWith(expect.objectContaining({ requestId: 1 }));
    });

    it("myRequests returns manager's submitted requests", async () => {
      await employeePointsRouter.award.myRequests({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getMyApprovalRequests).toHaveBeenCalledWith(1);
    });

    it("managerAward grants custom points", async () => {
      const input = { employeeId: 5, ruleCode: "manager_award" as const, points: 20, description: "Excellent work" };
      const result = await employeePointsRouter.award.managerAward({ ctx, input, rawInput: input, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.awardPoints).toHaveBeenCalledWith(expect.objectContaining({ pointsOverride: 20 }));
    });
  });

  // ── Compliance ──
  describe("compliance", () => {
    it("getStatus returns today's compliance checks", async () => {
      await employeePointsRouter.compliance.getStatus({ ctx, input: {}, rawInput: {}, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getComplianceStatus).toHaveBeenCalledWith(1, undefined);
    });

    it("completeMorningPlan marks plan as done", async () => {
      const result = await employeePointsRouter.compliance.completeMorningPlan({ ctx, input: { planId: "PLAN-123" }, rawInput: {}, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.completeMorningPlanCheck).toHaveBeenCalledWith(1, "PLAN-123");
      expect(result).toHaveProperty("passed", true);
    });

    it("completeEveningSummary marks summary as done", async () => {
      const result = await employeePointsRouter.compliance.completeEveningSummary({ ctx, input: { logId: "LOG-456" }, rawInput: {}, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.completeEveningSummaryCheck).toHaveBeenCalledWith(1, "LOG-456");
    });

    it("completeNextDayPlan awards 2 bonus points", async () => {
      const result = await employeePointsRouter.compliance.completeNextDayPlan({ ctx, input: { planId: "PLAN-NEXT" }, rawInput: {}, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.completeNextDayPlanCheck).toHaveBeenCalledWith(1, "PLAN-NEXT");
      expect(result).toHaveProperty("points", 2);
    });
  });

  // ── History ──
  describe("history", () => {
    it("list returns transaction history", async () => {
      await employeePointsRouter.history.list({ ctx, input: { limit: 20 }, rawInput: {}, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getTransactionHistory).toHaveBeenCalledWith(1, 20);
    });

    it("monthlyStats returns period stats", async () => {
      await employeePointsRouter.history.monthlyStats({ ctx, input: { period: "2026-03" }, rawInput: {}, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getMonthlyStats).toHaveBeenCalledWith(1, "2026-03");
    });
  });

  // ── Catalog ──
  describe("catalog", () => {
    it("list returns redemption items", async () => {
      await employeePointsRouter.catalog.list({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getRedemptionCatalog).toHaveBeenCalled();
    });

    it("redeem creates a redemption request", async () => {
      const input = { catalogCode: "leave_full_day", startDate: "2026-04-01", endDate: "2026-04-01" };
      await employeePointsRouter.catalog.redeem({ ctx, input, rawInput: input, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.requestRedemption).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 1, catalogCode: "leave_full_day" }));
    });

    it("myRedemptions returns current user's redemptions", async () => {
      await employeePointsRouter.catalog.myRedemptions({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getMyRedemptions).toHaveBeenCalledWith(1);
    });
  });

  // ── Admin ──
  describe("admin", () => {
    it("pendingRedemptions returns pending list", async () => {
      await employeePointsRouter.admin.pendingRedemptions({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getPendingRedemptions).toHaveBeenCalled();
    });

    it("approve approves a redemption", async () => {
      await employeePointsRouter.admin.approve({ ctx, input: { redemptionId: 5, notes: "OK" }, rawInput: {}, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.approveRedemption).toHaveBeenCalledWith(5, 1, "OK");
    });

    it("reject rejects a redemption", async () => {
      await employeePointsRouter.admin.reject({ ctx, input: { redemptionId: 5, notes: "Insufficient" }, rawInput: {}, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.rejectRedemption).toHaveBeenCalledWith(5, 1, "Insufficient");
    });

    it("observationList returns at-risk employees", async () => {
      await employeePointsRouter.admin.observationList({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getObservationList).toHaveBeenCalled();
    });

    it("runPenalties triggers end-of-day check", async () => {
      const result = await employeePointsRouter.admin.runPenalties({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.runEndOfDayPenalties).toHaveBeenCalled();
    });

    it("evaluatePerformance calls monthly performance evaluation", async () => {
      const result = await employeePointsRouter.admin.evaluatePerformance({ ctx, input: { period: "2026-02" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.evaluateMonthlyPerformancePoints).toHaveBeenCalledWith("2026-02");
    });

    it("evaluateSalesM2 checks sales M2 pipeline", async () => {
      const result = await employeePointsRouter.admin.evaluateSalesM2({ ctx, input: { period: "2026-02" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any });
      expect(mockSvc.evaluateSalesM2Pipeline).toHaveBeenCalledWith("2026-02");
    });
  });

  describe("suggestion", () => {
    it("submit creates a new suggestion", async () => {
      const result = await employeePointsRouter.suggestion.submit({
        ctx, input: { title: "优化生产流程", description: "通过引入自动化工具减少手动操作步骤" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.submitSuggestion).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 1, title: "优化生产流程" }));
    });

    it("list returns suggestions", async () => {
      const result = await employeePointsRouter.suggestion.list({ ctx, input: {}, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.listSuggestions).toHaveBeenCalled();
    });

    it("getById returns single suggestion", async () => {
      const result = await employeePointsRouter.suggestion.getById({ ctx, input: { id: 1 }, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getSuggestion).toHaveBeenCalledWith(1);
    });

    it("evaluate sets value tier", async () => {
      const result = await employeePointsRouter.suggestion.evaluate({
        ctx, input: { id: 1, valueTier: "effective", evaluatorNotes: "good" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.evaluateSuggestion).toHaveBeenCalledWith(expect.objectContaining({ id: 1, valueTier: "effective" }));
    });

    it("approve triggers CEO approval", async () => {
      const result = await employeePointsRouter.suggestion.approve({
        ctx, input: { id: 1, approvalNotes: "approved" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.approveSuggestion).toHaveBeenCalledWith(expect.objectContaining({ id: 1, approvedBy: 1 }));
    });

    it("stats returns suggestion statistics", async () => {
      const result = await employeePointsRouter.suggestion.stats({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getSuggestionStats).toHaveBeenCalled();
    });
  });

  // ── Community ──
  describe("community", () => {
    it("listPosts returns community feed", async () => {
      const result = await employeePointsRouter.community.listPosts({ ctx, input: { limit: 20 }, rawInput: {}, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.listCommunityPosts).toHaveBeenCalledWith({ limit: 20 });
      expect(result).toHaveLength(1);
    });

    it("createPost creates user discussion post", async () => {
      const result = await employeePointsRouter.community.createPost({
        ctx, input: { title: "讨论帖", content: "大家好", postType: "discussion" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.createCommunityPost).toHaveBeenCalledWith(expect.objectContaining({ authorId: 1, title: "讨论帖", postType: "discussion" }));
    });

    it("acknowledge marks post as read", async () => {
      const result = await employeePointsRouter.community.acknowledge({
        ctx, input: { postId: 1 }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.acknowledgeCommunityPost).toHaveBeenCalledWith(1, 1);
      expect(result).toHaveProperty("success", true);
    });

    it("like increments post like count", async () => {
      const result = await employeePointsRouter.community.like({
        ctx, input: { postId: 1 }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.likeCommunityPost).toHaveBeenCalledWith(1);
    });

    it("stats returns community statistics", async () => {
      const result = await employeePointsRouter.community.stats({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.getCommunityStats).toHaveBeenCalled();
      expect(result).toHaveProperty("totalPosts", 5);
    });

    it("listSensitiveWords returns word list for admin", async () => {
      const result = await employeePointsRouter.community.listSensitiveWords({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any });
      expect(mockSvc.listSensitiveWords).toHaveBeenCalled();
    });

    it("addSensitiveWord adds new word", async () => {
      const result = await employeePointsRouter.community.addSensitiveWord({
        ctx, input: { word: "badword", action: "block" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.addSensitiveWord).toHaveBeenCalledWith(expect.objectContaining({ word: "badword", action: "block" }));
    });

    it("removeSensitiveWord deactivates word", async () => {
      const result = await employeePointsRouter.community.removeSensitiveWord({
        ctx, input: { id: 1 }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.removeSensitiveWord).toHaveBeenCalledWith(1);
    });
  });

  // ── Elite Benefit ──
  describe("eliteBenefit", () => {
    it("checkEligibility returns eligibility status", async () => {
      const result = await employeePointsRouter.eliteBenefit.checkEligibility({
        ctx, input: {}, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any,
      });
      expect(mockSvc.checkEliteEligibility).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("eligibility");
    });

    it("apply submits an elite benefit application", async () => {
      const result = await employeePointsRouter.eliteBenefit.apply({
        ctx, input: { benefitType: "alternating_rest" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.applyEliteBenefit).toHaveBeenCalledWith({ employeeId: 1, benefitType: "alternating_rest" });
      expect(result).toHaveProperty("success", true);
    });

    it("approve activates a benefit application", async () => {
      const result = await employeePointsRouter.eliteBenefit.approve({
        ctx, input: { applicationId: 1, notes: "Approved" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.approveEliteBenefit).toHaveBeenCalledWith(expect.objectContaining({ applicationId: 1, approverId: 1 }));
    });

    it("reject rejects a benefit application", async () => {
      const result = await employeePointsRouter.eliteBenefit.reject({
        ctx, input: { applicationId: 1, reason: "KPI too low" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.rejectEliteBenefit).toHaveBeenCalledWith(expect.objectContaining({ applicationId: 1 }));
    });

    it("list returns benefit applications", async () => {
      const result = await employeePointsRouter.eliteBenefit.list({
        ctx, input: { status: "active" }, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any,
      });
      expect(mockSvc.listEliteBenefitApplications).toHaveBeenCalled();
    });

    it("runMonthlyReview performs dynamic evaluation cycle", async () => {
      const result = await employeePointsRouter.eliteBenefit.runMonthlyReview({
        ctx, input: { period: "2026-03" }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.runMonthlyEliteReview).toHaveBeenCalledWith("2026-03");
      expect(result).toHaveProperty("warned");
      expect(result).toHaveProperty("revoked");
    });

    it("submitCommitment submits improvement commitment", async () => {
      const result = await employeePointsRouter.eliteBenefit.submitCommitment({
        ctx, input: { commitmentContent: "我承诺在接下来两个月内将KPI提升至85分以上，具体措施包括..." }, rawInput: undefined, path: "", type: "mutation" as const, signal: undefined as any,
      });
      expect(mockSvc.submitEliteCommitment).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 1 }));
      expect(result).toHaveProperty("success", true);
    });

    it("reviewHistory returns monthly review records", async () => {
      const result = await employeePointsRouter.eliteBenefit.reviewHistory({
        ctx, input: {}, rawInput: undefined, path: "", type: "query" as const, signal: undefined as any,
      });
      expect(mockSvc.getEliteReviewHistory).toHaveBeenCalledWith(1);
    });
  });
});
