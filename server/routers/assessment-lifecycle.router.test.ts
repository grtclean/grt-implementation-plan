/**
 * Assessment Lifecycle Router Tests — 测评生命周期管理
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock service ──
const mockSvc = vi.hoisted(() => ({
  // Rules
  listTriggerRules: vi.fn().mockResolvedValue([
    { id: 1, ruleCode: "onboarding_L1", ruleName: "入职基础能力测评", triggerType: "onboarding", isActive: true },
    { id: 2, ruleCode: "probation_assessment", ruleName: "转正综合测评", triggerType: "probation_end", isActive: true },
  ]),
  getTriggerRule: vi.fn().mockResolvedValue({
    id: 1, ruleCode: "onboarding_L1", ruleName: "入职基础能力测评",
    triggerType: "onboarding", conditions: { lifecycleStage: "G2", daysAfterHire: 30 },
    failureConsequences: [{ type: "mandatory_training" }],
  }),
  upsertTriggerRule: vi.fn().mockResolvedValue({ success: true, ruleCode: "custom_rule", action: "created" }),
  toggleTriggerRule: vi.fn().mockResolvedValue({ success: true, ruleCode: "onboarding_L1", isActive: false }),

  // Triggers
  evaluateTrigger: vi.fn().mockResolvedValue({
    triggered: true, ruleCode: "onboarding_L1", triggerLogId: 1,
    targetLevel: "L1", dueDate: "2026-04-01", isMultiRound: false,
  }),
  listTriggerLogs: vi.fn().mockResolvedValue([
    { id: 1, employeeId: 5, ruleCode: "onboarding_L1", triggerType: "onboarding", outcome: "pending" },
  ]),
  updateTriggerLogOutcome: vi.fn().mockResolvedValue({ success: true }),

  // Workflows
  listWorkflows: vi.fn().mockResolvedValue([
    { id: 1, employeeId: 5, positionKey: "mechanical_assembly", targetLevel: "L2", status: "in_progress" },
  ]),
  getWorkflowDetail: vi.fn().mockResolvedValue({
    id: 1, employeeId: 5, positionKey: "mechanical_assembly", targetLevel: "L2",
    status: "in_progress", currentRound: 1, totalRounds: 3,
    rounds: [
      { id: 1, roundNumber: 1, roundType: "written_test", status: "passed", score: "85.00" },
      { id: 2, roundNumber: 2, roundType: "practical_test", status: "pending" },
      { id: 3, roundNumber: 3, roundType: "interview", status: "pending" },
    ],
  }),
  updateRound: vi.fn().mockResolvedValue({ success: true }),
  completeRound: vi.fn().mockResolvedValue({ workflowStatus: "round_completed", nextRound: 2 }),
  createUpgradeWorkflow: vi.fn().mockResolvedValue({ id: 2 }),

  // Enforcements
  listEnforcements: vi.fn().mockResolvedValue([
    { id: 1, employeeId: 5, enforcementType: "revert_six_day_week", status: "active" },
  ]),
  getMyEnforcements: vi.fn().mockResolvedValue([
    { id: 1, enforcementType: "mandatory_training", status: "active" },
  ]),
  liftEnforcement: vi.fn().mockResolvedValue({ success: true }),

  // Benchmarks
  listBenchmarks: vi.fn().mockResolvedValue([
    { positionKey: "mechanical_assembly", period: "2026-02", avgPoints: 3200, minAcceptablePoints: 2500 },
  ]),
  upsertBenchmark: vi.fn().mockResolvedValue({ success: true, action: "updated" }),

  // Dashboard
  getDashboardStats: vi.fn().mockResolvedValue({
    activeRules: 10, totalWorkflows: 25,
    workflowsByStatus: [{ status: "in_progress", count: 5 }],
    activeEnforcements: 3,
    enforcementsByType: [{ type: "revert_six_day_week", count: 2 }],
    recentTriggers: [],
  }),
}));

vi.mock("../services/assessment-lifecycle.service", () => mockSvc);

vi.mock("../../drizzle/assessment-lifecycle-schema", () => ({
  assessmentTriggerRules: { id: "id", ruleCode: "rule_code", isActive: "is_active" },
  assessmentWorkflows: { id: "id", employeeId: "employee_id", status: "status" },
  assessmentWorkflowRounds: { id: "id", workflowId: "workflow_id" },
  assessmentTriggerLog: { id: "id", employeeId: "employee_id" },
  skillEnforcementActions: { id: "id", employeeId: "employee_id", status: "enforcement_status" },
  positionBenchmarkScores: { id: "id", positionKey: "position_key" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn((...a: any[]) => a), { raw: vi.fn((s: string) => s) }),
  desc: vi.fn((col: any) => col),
  inArray: vi.fn((...a: any[]) => a),
}));

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
    publicProcedure: { ...passthrough },
    requirePermission: vi.fn(() => passthrough),
  };
});

vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { assessmentLifecycleRouter } from "./assessment-lifecycle.router";

describe("assessment-lifecycle.router", () => {
  beforeEach(() => vi.clearAllMocks());

  const ctx = { user: { id: 1, name: "TestAdmin", role: "admin" } } as any;
  const call = (fn: any, input?: any) => fn({ ctx, input, rawInput: undefined, path: "", type: "query" as const });
  const mutate = (fn: any, input?: any) => fn({ ctx, input, rawInput: undefined, path: "", type: "mutation" as const });

  // ── Rules ──
  describe("rules", () => {
    it("list returns trigger rules", async () => {
      const result = await call(assessmentLifecycleRouter.rules.list, {});
      expect(mockSvc.listTriggerRules).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("get returns single rule", async () => {
      const result = await call(assessmentLifecycleRouter.rules.get, { ruleCode: "onboarding_L1" });
      expect(mockSvc.getTriggerRule).toHaveBeenCalledWith("onboarding_L1");
      expect(result).toHaveProperty("triggerType", "onboarding");
    });

    it("upsert creates/updates rule", async () => {
      const result = await mutate(assessmentLifecycleRouter.rules.upsert, {
        ruleCode: "custom_rule", ruleName: "自定义规则", triggerType: "manual",
        conditions: { note: "custom" },
      });
      expect(mockSvc.upsertTriggerRule).toHaveBeenCalled();
      expect(result).toHaveProperty("success", true);
    });

    it("toggle activates/deactivates rule", async () => {
      const result = await mutate(assessmentLifecycleRouter.rules.toggle, { ruleCode: "onboarding_L1", isActive: false });
      expect(mockSvc.toggleTriggerRule).toHaveBeenCalledWith("onboarding_L1", false);
      expect(result).toHaveProperty("isActive", false);
    });
  });

  // ── Triggers ──
  describe("triggers", () => {
    it("evaluate triggers an assessment", async () => {
      const result = await mutate(assessmentLifecycleRouter.triggers.evaluate, {
        employeeId: 5, triggerType: "onboarding", positionKey: "mechanical_assembly",
        triggerData: { source: "lifecycle" },
      });
      expect(mockSvc.evaluateTrigger).toHaveBeenCalled();
      expect(result).toHaveProperty("triggered", true);
      expect(result).toHaveProperty("ruleCode", "onboarding_L1");
    });

    it("listLogs returns trigger history", async () => {
      const result = await call(assessmentLifecycleRouter.triggers.listLogs, { employeeId: 5 });
      expect(mockSvc.listTriggerLogs).toHaveBeenCalledWith({ employeeId: 5 });
      expect(result).toHaveLength(1);
    });
  });

  // ── Workflows ──
  describe("workflows", () => {
    it("list returns workflows", async () => {
      const result = await call(assessmentLifecycleRouter.workflows.list, { employeeId: 5 });
      expect(mockSvc.listWorkflows).toHaveBeenCalledWith({ employeeId: 5 });
      expect(result).toHaveLength(1);
    });

    it("getDetail returns workflow with rounds", async () => {
      const result = await call(assessmentLifecycleRouter.workflows.getDetail, { workflowId: 1 });
      expect(mockSvc.getWorkflowDetail).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("totalRounds", 3);
      expect(result.rounds).toHaveLength(3);
    });

    it("updateRound modifies round details", async () => {
      const result = await mutate(assessmentLifecycleRouter.workflows.updateRound, {
        roundId: 2, scheduledDate: "2026-03-20", location: "会议室A",
      });
      expect(mockSvc.updateRound).toHaveBeenCalledWith(2, {
        scheduledDate: "2026-03-20", location: "会议室A",
      });
      expect(result).toHaveProperty("success", true);
    });

    it("completeRound advances workflow", async () => {
      const result = await mutate(assessmentLifecycleRouter.workflows.completeRound, {
        workflowId: 1, roundNumber: 1, score: 85, passed: true,
      });
      expect(mockSvc.completeRound).toHaveBeenCalledWith(1, 1, {
        score: 85, passed: true, notes: undefined, decidedBy: 1,
      });
      expect(result).toHaveProperty("nextRound", 2);
    });
  });

  // ── Enforcements ──
  describe("enforcements", () => {
    it("list returns enforcement actions", async () => {
      const result = await call(assessmentLifecycleRouter.enforcements.list, { status: "active" });
      expect(mockSvc.listEnforcements).toHaveBeenCalledWith({ status: "active" });
      expect(result).toHaveLength(1);
    });

    it("myActive returns current user enforcements", async () => {
      const result = await call(assessmentLifecycleRouter.enforcements.myActive);
      expect(mockSvc.getMyEnforcements).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(1);
    });

    it("lift removes enforcement", async () => {
      const result = await mutate(assessmentLifecycleRouter.enforcements.lift, {
        enforcementId: 1, reason: "重考通过",
      });
      expect(mockSvc.liftEnforcement).toHaveBeenCalledWith(1, {
        liftedBy: 1, reason: "重考通过",
        reassessmentPassed: undefined, reassessmentSessionId: undefined,
      });
      expect(result).toHaveProperty("success", true);
    });

    it("listByEmployee returns employee enforcements", async () => {
      const result = await call(assessmentLifecycleRouter.enforcements.listByEmployee, { employeeId: 5 });
      expect(mockSvc.listEnforcements).toHaveBeenCalledWith({ employeeId: 5 });
      expect(result).toHaveLength(1);
    });
  });

  // ── Benchmarks ──
  describe("benchmarks", () => {
    it("list returns position benchmarks", async () => {
      const result = await call(assessmentLifecycleRouter.benchmarks.list, { period: "2026-02" });
      expect(mockSvc.listBenchmarks).toHaveBeenCalledWith({ period: "2026-02" });
      expect(result).toHaveLength(1);
    });

    it("upsert creates/updates benchmark", async () => {
      const result = await mutate(assessmentLifecycleRouter.benchmarks.upsert, {
        positionKey: "welding", period: "2026-03", avgPoints: 3000, minAcceptablePoints: 2300,
      });
      expect(mockSvc.upsertBenchmark).toHaveBeenCalled();
      expect(result).toHaveProperty("success", true);
    });
  });

  // ── Dashboard ──
  describe("dashboard", () => {
    it("stats returns system overview", async () => {
      const result = await call(assessmentLifecycleRouter.dashboard.stats);
      expect(mockSvc.getDashboardStats).toHaveBeenCalled();
      expect(result).toHaveProperty("activeRules", 10);
      expect(result).toHaveProperty("totalWorkflows", 25);
      expect(result).toHaveProperty("activeEnforcements", 3);
    });
  });

  // ── Lifecycle Integration ──
  describe("lifecycle", () => {
    it("onboard triggers onboarding assessment", async () => {
      const result = await mutate(assessmentLifecycleRouter.lifecycle.onboard, {
        employeeId: 10, positionKey: "welding",
      });
      expect(mockSvc.evaluateTrigger).toHaveBeenCalledWith({
        employeeId: 10, triggerType: "onboarding", positionKey: "welding",
        triggerData: { source: "lifecycle_onboarding", stage: "G2" },
      });
      expect(result).toHaveProperty("triggered", true);
    });

    it("regularize triggers probation assessment at G7", async () => {
      const result = await mutate(assessmentLifecycleRouter.lifecycle.regularize, {
        employeeId: 10, positionKey: "welding", currentLevel: "L1",
      });
      expect(mockSvc.evaluateTrigger).toHaveBeenCalledWith({
        employeeId: 10, triggerType: "probation_end", positionKey: "welding",
        currentLevel: "L1", lifecycleStage: "G7",
        triggerData: { source: "lifecycle_regularization", stage: "G7" },
      });
    });

    it("transferPosition triggers position transfer assessment", async () => {
      const result = await mutate(assessmentLifecycleRouter.lifecycle.transferPosition, {
        employeeId: 10, newPositionKey: "electrical_engineer",
        previousPositionKey: "mechanical_assembly", currentLevel: "L2",
      });
      expect(mockSvc.evaluateTrigger).toHaveBeenCalledWith({
        employeeId: 10, triggerType: "position_transfer", positionKey: "electrical_engineer",
        currentLevel: "L2",
        triggerData: {
          source: "lifecycle_transfer",
          previousPosition: "mechanical_assembly",
          newPosition: "electrical_engineer",
        },
      });
    });
  });
});
