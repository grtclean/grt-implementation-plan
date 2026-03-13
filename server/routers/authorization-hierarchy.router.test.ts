/**
 * Authorization Hierarchy Router Tests — 授权层级审批制度
 *
 * 7 sub-routers, 26 test cases:
 * - policy (list / getById / upsert / getThresholds)
 * - creditTier (getMy / getByEmployee / list / recalculate / batchRecalculate / override)
 * - greenChannel (checkEligibility / use / getMyUsages / listUsages / getRules / updateRule)
 * - postFacto (submit / getMyPending / review / listOverdue)
 * - integrity (getMyScore / getLeaderboard / recognize / getDashboard)
 * - audit (search)
 * - resolve (resolveChain)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock service ──────────────────────────────────────────────────────────────
const mockSvc = vi.hoisted(() => ({
  // policy
  listPolicies: vi.fn().mockResolvedValue([
    {
      id: 1,
      policyCode: "TRAVEL_STANDARD",
      domain: "travel",
      policyName: "差旅审批标准",
      thresholdRules: [{ level: 1, levelLabel: "部门经理", minAmount: 0, maxAmount: 5000, approverRole: "manager", autoApprove: false, isRequired: true }],
      durationRules: [],
      buScope: null,
    },
    {
      id: 2,
      policyCode: "PROCUREMENT_HIGH",
      domain: "procurement",
      policyName: "采购高额审批",
      thresholdRules: [{ level: 2, levelLabel: "总监", minAmount: 5001, maxAmount: 50000, approverRole: "director", autoApprove: false, isRequired: true }],
      durationRules: [],
      buScope: "海外",
    },
  ]),
  getPolicyById: vi.fn().mockResolvedValue({
    id: 1,
    policyCode: "TRAVEL_STANDARD",
    domain: "travel",
    policyName: "差旅审批标准",
    thresholdRules: [{ level: 1, levelLabel: "部门经理", minAmount: 0, maxAmount: 5000, approverRole: "manager", autoApprove: false, isRequired: true }],
    durationRules: [{ maxDays: 30, approverLevel: 1, description: "30天内总监审批" }],
    buScope: null,
  }),
  upsertPolicy: vi.fn().mockResolvedValue({ id: 3, policyCode: "BUDGET_NEW", action: "created" }),

  // creditTier
  getCreditTier: vi.fn().mockResolvedValue({
    userId: 1,
    employeeName: "张三",
    creditTier: "gold",
    creditScore: 82,
    lastRecalculated: new Date("2026-03-01"),
  }),
  listCreditTiers: vi.fn().mockResolvedValue([
    { userId: 1, employeeName: "张三", creditTier: "gold", creditScore: 82 },
    { userId: 2, employeeName: "李四", creditTier: "silver", creditScore: 65 },
  ]),
  recalculateCreditScore: vi.fn().mockResolvedValue({ userId: 1, creditScore: 85, creditTier: "gold", recalculated: true }),
  overrideCreditTier: vi.fn().mockResolvedValue({ success: true, userId: 2, creditTier: "bronze", creditScore: 45 }),

  // greenChannel
  checkGreenChannelEligibility: vi.fn().mockResolvedValue({
    eligible: true,
    reason: "信用等级金牌，本月未使用绿色通道",
    maxAmountAllowed: 10000,
    remainingUsages: 3,
    cooldownEndsAt: null,
  }),
  useGreenChannel: vi.fn().mockResolvedValue({ id: 7, domain: "travel", amount: 3200, status: "used", postFactoDeadline: new Date("2026-03-20") }),
  listGreenChannelUsages: vi.fn().mockResolvedValue([
    { id: 7, userId: 1, domain: "travel", amount: 3200, usedAt: new Date("2026-03-13"), status: "used" },
  ]),
  listGreenChannelRules: vi.fn().mockResolvedValue([
    { id: 1, domain: "travel", maxAmountAllowed: 10000, autoApproveThreshold: 2000, cooldownDays: 7, monthlyUsageLimit: 3, postFactoDeadlineDays: 5, isActive: true },
    { id: 2, domain: "procurement", maxAmountAllowed: 20000, autoApproveThreshold: 5000, cooldownDays: 14, monthlyUsageLimit: 2, postFactoDeadlineDays: 7, isActive: true },
  ]),
  updateGreenChannelRule: vi.fn().mockResolvedValue({ success: true, id: 1, updated: { cooldownDays: 10 } }),

  // postFacto
  submitPostFacto: vi.fn().mockResolvedValue({ id: 5, status: "pending", dueDate: new Date("2026-03-20") }),
  getMyPendingPostFacto: vi.fn().mockResolvedValue([
    { id: 5, domain: "travel", reason: "紧急出差先行", status: "pending", dueDate: new Date("2026-03-20") },
  ]),
  reviewPostFacto: vi.fn().mockResolvedValue({ success: true, id: 5, status: "approved" }),
  listOverduePostFacto: vi.fn().mockResolvedValue([
    { id: 3, userId: 9, employeeName: "王五", domain: "procurement", status: "overdue", dueDate: new Date("2026-03-01") },
  ]),

  // integrity
  getIntegrityScore: vi.fn().mockResolvedValue({
    userId: 1,
    employeeName: "张三",
    period: "2026-03",
    integrityScore: 91,
    rank: 5,
    badges: ["transparency_award"],
  }),
  getIntegrityLeaderboard: vi.fn().mockResolvedValue([
    { userId: 3, employeeName: "赵六", integrityScore: 98, rank: 1 },
    { userId: 1, employeeName: "张三", integrityScore: 91, rank: 2 },
  ]),
  recognizeEmployee: vi.fn().mockResolvedValue({ success: true, recognitionType: "monthly_star", userId: 3 }),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalPolicies: 8,
    activePolicies: 7,
    totalCreditTiers: { platinum: 3, gold: 12, silver: 25, bronze: 8, restricted: 2 },
    greenChannelUsageThisMonth: 14,
    pendingPostFacto: 3,
    overduePostFacto: 1,
    avgIntegrityScore: 78.5,
  }),

  // audit
  searchAudit: vi.fn().mockResolvedValue([
    { id: 101, eventType: "green_channel", actorId: 1, actorName: "张三", domain: "travel", decision: "used", occurredAt: new Date("2026-03-13") },
    { id: 100, eventType: "credit_change", actorId: 99, actorName: "系统", domain: null, decision: "override_to_bronze", occurredAt: new Date("2026-03-12") },
  ]),
  recordAudit: vi.fn().mockResolvedValue({ id: 102, recorded: true }),

  // resolve
  resolveApprovalChain: vi.fn().mockResolvedValue({
    domain: "travel",
    amount: 8000,
    chain: [
      { level: 1, approverRole: "manager", approverUserId: 10, approverName: "部门经理陈七" },
      { level: 2, approverRole: "director", approverUserId: 20, approverName: "总监刘八" },
    ],
    greenChannelEligible: true,
    autoApprove: false,
  }),
}));

vi.mock("../services/authorization-hierarchy.service", () => mockSvc);

// ── Stub schemas (tables not needed since service is fully mocked) ─────────────
vi.mock("../../drizzle/authorization-hierarchy-schema", () => ({
  authorizationPolicies: { id: "id", domain: "domain", policyCode: "policy_code", isActive: "is_active" },
  employeeCreditTiers: { id: "id", userId: "user_id", creditTier: "credit_tier" },
  greenChannelUsages: { id: "id", userId: "user_id", domain: "domain", status: "status" },
  greenChannelRules: { id: "id", domain: "domain", isActive: "is_active" },
  postFactoSubmissions: { id: "id", userId: "user_id", status: "status" },
  integrityRecognitions: { id: "id", userId: "user_id", period: "period" },
  authorizationAuditLog: { id: "id", actorId: "actor_id", eventType: "event_type" },
}));

// ── drizzle-orm mock (include sql to avoid transitive import errors) ───────────
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return { ...actual };
});

// ── tRPC core mock ─────────────────────────────────────────────────────────────
vi.mock("../_core/trpc", () => {
  const passthrough = {
    use: vi.fn(() => passthrough),
    input: vi.fn(() => passthrough),
    query: vi.fn((fn: any) => fn),
    mutation: vi.fn((fn: any) => fn),
  };
  return {
    router: vi.fn((routes: any) => routes),
    protectedProcedure: { ...passthrough },
    adminProcedure: { ...passthrough },
    publicProcedure: { ...passthrough },
    requirePermission: vi.fn(() => passthrough),
  };
});

// ── Logger mock ────────────────────────────────────────────────────────────────
vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { authorizationHierarchyRouter } from "./authorization-hierarchy.router";

/* ── Test helpers ─────────────────────────────────────────────────────────── */

const ctx = { user: { id: 1, name: "张三", role: "admin" } } as any;

/** Simulate a tRPC query call */
const call = (fn: any, input?: any) =>
  fn({ ctx, input, rawInput: undefined, path: "", type: "query" as const });

/** Simulate a tRPC mutation call */
const mutate = (fn: any, input?: any) =>
  fn({ ctx, input, rawInput: undefined, path: "", type: "mutation" as const });

/* ═══════════════════════════════════════════════════════════════════════════ */

describe("authorization-hierarchy.router", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── policy ─────────────────────────────────────────────────────────────────
  describe("policy", () => {
    it("list — returns all policies when no domain filter supplied", async () => {
      const result = await call(authorizationHierarchyRouter.policy.list);
      expect(mockSvc.listPolicies).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("policyCode", "TRAVEL_STANDARD");
    });

    it("list — filters by domain when supplied", async () => {
      await call(authorizationHierarchyRouter.policy.list, { domain: "travel" });
      expect(mockSvc.listPolicies).toHaveBeenCalledWith("travel");
    });

    it("getById — returns single policy by id", async () => {
      const result = await call(authorizationHierarchyRouter.policy.getById, { id: 1 });
      expect(mockSvc.getPolicyById).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("policyCode", "TRAVEL_STANDARD");
      expect(result.durationRules).toHaveLength(1);
    });

    it("upsert — creates a new policy and returns id + action", async () => {
      const result = await mutate(authorizationHierarchyRouter.policy.upsert, {
        policyCode: "BUDGET_NEW",
        domain: "budget",
        policyName: "预算超支审批",
        thresholdRules: [
          { level: 1, levelLabel: "经理", minAmount: 0, maxAmount: 10000, approverRole: "manager", autoApprove: false, isRequired: true },
        ],
      });
      expect(mockSvc.upsertPolicy).toHaveBeenCalledWith(
        expect.objectContaining({ policyCode: "BUDGET_NEW", createdBy: "张三" }),
      );
      expect(result).toHaveProperty("action", "created");
      expect(result).toHaveProperty("id", 3);
    });

    it("getThresholds — returns threshold matrix mapped from policies", async () => {
      const result = await call(authorizationHierarchyRouter.policy.getThresholds, { domain: "travel" });
      expect(mockSvc.listPolicies).toHaveBeenCalledWith("travel");
      // Result is a mapped array — each item exposes thresholds + policyCode
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("policyCode");
      expect(result[0]).toHaveProperty("thresholds");
      expect(result[0]).toHaveProperty("durationRules");
    });
  });

  // ── creditTier ─────────────────────────────────────────────────────────────
  describe("creditTier", () => {
    it("getMy — returns caller's own credit tier", async () => {
      const result = await call(authorizationHierarchyRouter.creditTier.getMy);
      expect(mockSvc.getCreditTier).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("creditTier", "gold");
      expect(result).toHaveProperty("creditScore", 82);
    });

    it("getByEmployee — returns specified employee's tier", async () => {
      const result = await call(authorizationHierarchyRouter.creditTier.getByEmployee, { userId: 5 });
      expect(mockSvc.getCreditTier).toHaveBeenCalledWith(5);
      expect(result).toHaveProperty("creditTier", "gold");
    });

    it("list — returns all credit tiers with defaults", async () => {
      const result = await call(authorizationHierarchyRouter.creditTier.list);
      expect(mockSvc.listCreditTiers).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(2);
      expect(result[1]).toHaveProperty("creditTier", "silver");
    });

    it("list — passes filter options when provided", async () => {
      await call(authorizationHierarchyRouter.creditTier.list, { tier: "gold", limit: 50, offset: 0 });
      expect(mockSvc.listCreditTiers).toHaveBeenCalledWith({ tier: "gold", limit: 50, offset: 0 });
    });

    it("recalculate — triggers score recalculation for one employee", async () => {
      const result = await mutate(authorizationHierarchyRouter.creditTier.recalculate, { userId: 1 });
      expect(mockSvc.recalculateCreditScore).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("recalculated", true);
      expect(result).toHaveProperty("creditTier", "gold");
    });

    it("batchRecalculate — iterates all tiers and recalculates each", async () => {
      const result = await mutate(authorizationHierarchyRouter.creditTier.batchRecalculate);
      // listCreditTiers called first to get all users
      expect(mockSvc.listCreditTiers).toHaveBeenCalledWith({ limit: 500 });
      // recalculateCreditScore called once per tier entry (2 in mock)
      expect(mockSvc.recalculateCreditScore).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty("updated", 2);
    });

    it("override — manually sets tier + records audit entry", async () => {
      const result = await mutate(authorizationHierarchyRouter.creditTier.override, {
        userId: 2,
        creditTier: "bronze",
        creditScore: 45,
      });
      expect(mockSvc.overrideCreditTier).toHaveBeenCalledWith(2, "bronze", 45, 1);
      expect(mockSvc.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "credit_change",
          actorId: 1,
          targetUserId: 2,
          decision: "override_to_bronze",
          metadata: { newScore: 45 },
        }),
      );
      expect(result).toHaveProperty("success", true);
    });
  });

  // ── greenChannel ───────────────────────────────────────────────────────────
  describe("greenChannel", () => {
    it("checkEligibility — returns eligibility status for domain + amount", async () => {
      const result = await call(authorizationHierarchyRouter.greenChannel.checkEligibility, {
        domain: "travel",
        amount: 3200,
      });
      expect(mockSvc.checkGreenChannelEligibility).toHaveBeenCalledWith(1, "travel", 3200);
      expect(result).toHaveProperty("eligible", true);
      expect(result).toHaveProperty("maxAmountAllowed", 10000);
      expect(result).toHaveProperty("remainingUsages", 3);
    });

    it("use — records green channel usage and returns deadline", async () => {
      const result = await mutate(authorizationHierarchyRouter.greenChannel.use, {
        domain: "travel",
        amount: 3200,
        description: "紧急出差机票",
      });
      expect(mockSvc.useGreenChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          employeeName: "张三",
          domain: "travel",
          amount: 3200,
          description: "紧急出差机票",
        }),
      );
      expect(result).toHaveProperty("id", 7);
      expect(result).toHaveProperty("status", "used");
    });

    it("getMyUsages — returns caller's own usage history", async () => {
      const result = await call(authorizationHierarchyRouter.greenChannel.getMyUsages);
      expect(mockSvc.listGreenChannelUsages).toHaveBeenCalledWith(1, 20);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("domain", "travel");
    });

    it("getMyUsages — respects custom limit", async () => {
      await call(authorizationHierarchyRouter.greenChannel.getMyUsages, { limit: 5 });
      expect(mockSvc.listGreenChannelUsages).toHaveBeenCalledWith(1, 5);
    });

    it("listUsages — admin view of all usages", async () => {
      const result = await call(authorizationHierarchyRouter.greenChannel.listUsages);
      expect(mockSvc.listGreenChannelUsages).toHaveBeenCalledWith(undefined, 50);
      expect(result).toHaveLength(1);
    });

    it("listUsages — filters by userId when specified", async () => {
      await call(authorizationHierarchyRouter.greenChannel.listUsages, { userId: 3, limit: 10 });
      expect(mockSvc.listGreenChannelUsages).toHaveBeenCalledWith(3, 10);
    });

    it("getRules — returns GC rules, optionally filtered by domain", async () => {
      const result = await call(authorizationHierarchyRouter.greenChannel.getRules);
      expect(mockSvc.listGreenChannelRules).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("domain", "travel");
    });

    it("updateRule — updates GC rule and returns confirmation", async () => {
      const result = await mutate(authorizationHierarchyRouter.greenChannel.updateRule, {
        id: 1,
        cooldownDays: 10,
        monthlyUsageLimit: 2,
      });
      expect(mockSvc.updateGreenChannelRule).toHaveBeenCalledWith(
        1,
        { cooldownDays: 10, monthlyUsageLimit: 2 },
      );
      expect(result).toHaveProperty("success", true);
    });
  });

  // ── postFacto ──────────────────────────────────────────────────────────────
  describe("postFacto", () => {
    it("submit — submits post-facto documentation", async () => {
      const result = await mutate(authorizationHierarchyRouter.postFacto.submit, {
        domain: "travel",
        actionDate: "2026-03-13",
        reason: "紧急出差先行订票，无法事先走审批",
        urgencyJustification: "24小时内出发",
        supportingDocuments: [
          { fileName: "ticket.pdf", fileUrl: "https://cdn.example.com/ticket.pdf", uploadedAt: "2026-03-13T10:00:00Z", docType: "travel_receipt" },
        ],
      });
      expect(mockSvc.submitPostFacto).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          employeeName: "张三",
          domain: "travel",
          reason: "紧急出差先行订票，无法事先走审批",
        }),
      );
      expect(result).toHaveProperty("id", 5);
      expect(result).toHaveProperty("status", "pending");
    });

    it("getMyPending — returns caller's pending submissions", async () => {
      const result = await call(authorizationHierarchyRouter.postFacto.getMyPending);
      expect(mockSvc.getMyPendingPostFacto).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("status", "pending");
    });

    it("review — approves a post-facto submission", async () => {
      const result = await mutate(authorizationHierarchyRouter.postFacto.review, {
        id: 5,
        status: "approved",
        comment: "材料齐全，情况紧急，予以批准",
      });
      expect(mockSvc.reviewPostFacto).toHaveBeenCalledWith(
        5, 1, "张三", "approved", "材料齐全，情况紧急，予以批准",
      );
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("status", "approved");
    });

    it("review — rejects a post-facto submission", async () => {
      mockSvc.reviewPostFacto.mockResolvedValueOnce({ success: true, id: 5, status: "rejected" });
      const result = await mutate(authorizationHierarchyRouter.postFacto.review, {
        id: 5,
        status: "rejected",
        comment: "理由不充分",
      });
      expect(result).toHaveProperty("status", "rejected");
    });

    it("listOverdue — returns overdue post-facto submissions", async () => {
      const result = await call(authorizationHierarchyRouter.postFacto.listOverdue);
      expect(mockSvc.listOverduePostFacto).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("status", "overdue");
      expect(result[0]).toHaveProperty("domain", "procurement");
    });
  });

  // ── integrity ──────────────────────────────────────────────────────────────
  describe("integrity", () => {
    it("getMyScore — returns caller's integrity score for current period", async () => {
      const result = await call(authorizationHierarchyRouter.integrity.getMyScore);
      expect(mockSvc.getIntegrityScore).toHaveBeenCalledWith(1, undefined);
      expect(result).toHaveProperty("integrityScore", 91);
      expect(result).toHaveProperty("rank", 5);
      expect(result.badges).toContain("transparency_award");
    });

    it("getMyScore — passes period when supplied", async () => {
      await call(authorizationHierarchyRouter.integrity.getMyScore, { period: "2026-02" });
      expect(mockSvc.getIntegrityScore).toHaveBeenCalledWith(1, "2026-02");
    });

    it("getLeaderboard — returns ranked leaderboard", async () => {
      const result = await call(authorizationHierarchyRouter.integrity.getLeaderboard);
      expect(mockSvc.getIntegrityLeaderboard).toHaveBeenCalledWith(undefined, 20);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("rank", 1);
      expect(result[0]).toHaveProperty("integrityScore", 98);
    });

    it("getLeaderboard — respects period + limit options", async () => {
      await call(authorizationHierarchyRouter.integrity.getLeaderboard, { period: "2026-02", limit: 10 });
      expect(mockSvc.getIntegrityLeaderboard).toHaveBeenCalledWith("2026-02", 10);
    });

    it("recognize — records a public employee recognition", async () => {
      const result = await mutate(authorizationHierarchyRouter.integrity.recognize, {
        userId: 3,
        employeeName: "赵六",
        period: "2026-03",
        recognitionType: "monthly_star",
        note: "本月主动公开超支原因，获同事高度信任",
      });
      expect(mockSvc.recognizeEmployee).toHaveBeenCalledWith(
        3, "赵六", "2026-03", "monthly_star",
        "本月主动公开超支原因，获同事高度信任",
        1,
      );
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("recognitionType", "monthly_star");
    });

    it("getDashboard — returns system-wide integrity & authorization stats", async () => {
      const result = await call(authorizationHierarchyRouter.integrity.getDashboard);
      expect(mockSvc.getDashboardStats).toHaveBeenCalled();
      expect(result).toHaveProperty("totalPolicies", 8);
      expect(result).toHaveProperty("pendingPostFacto", 3);
      expect(result).toHaveProperty("avgIntegrityScore", 78.5);
      expect(result.totalCreditTiers).toHaveProperty("gold", 12);
    });
  });

  // ── audit ──────────────────────────────────────────────────────────────────
  describe("audit", () => {
    it("search — returns audit trail with default options", async () => {
      const result = await call(authorizationHierarchyRouter.audit.search);
      expect(mockSvc.searchAudit).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, offset: 0 }),
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("eventType", "green_channel");
    });

    it("search — filters by domain, eventType, actorId", async () => {
      await call(authorizationHierarchyRouter.audit.search, {
        domain: "travel",
        eventType: "green_channel",
        actorId: 1,
        limit: 20,
        offset: 0,
      });
      expect(mockSvc.searchAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: "travel",
          eventType: "green_channel",
          actorId: 1,
          limit: 20,
          offset: 0,
        }),
      );
    });

    it("search — converts date strings to Date objects", async () => {
      await call(authorizationHierarchyRouter.audit.search, {
        startDate: "2026-03-01",
        endDate: "2026-03-13",
      });
      const calledWith = mockSvc.searchAudit.mock.calls[0][0];
      expect(calledWith.startDate).toBeInstanceOf(Date);
      expect(calledWith.endDate).toBeInstanceOf(Date);
    });
  });

  // ── resolve ────────────────────────────────────────────────────────────────
  describe("resolve", () => {
    it("resolveChain — resolves the full approval chain for a domain + amount", async () => {
      const result = await call(authorizationHierarchyRouter.resolve.resolveChain, {
        domain: "travel",
        amount: 8000,
      });
      expect(mockSvc.resolveApprovalChain).toHaveBeenCalledWith("travel", 8000, 1, undefined);
      expect(result).toHaveProperty("domain", "travel");
      expect(result.chain).toHaveLength(2);
      expect(result.chain[0]).toHaveProperty("approverRole", "manager");
      expect(result.chain[1]).toHaveProperty("approverRole", "director");
      expect(result).toHaveProperty("greenChannelEligible", true);
    });

    it("resolveChain — passes buCode when supplied", async () => {
      await call(authorizationHierarchyRouter.resolve.resolveChain, {
        domain: "procurement",
        amount: 25000,
        buCode: "海外",
      });
      expect(mockSvc.resolveApprovalChain).toHaveBeenCalledWith("procurement", 25000, 1, "海外");
    });
  });
});
