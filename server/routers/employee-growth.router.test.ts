import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Drizzle mock ──────────────────────────────────────────────
const selectResultsQueue: unknown[][] = [];
const returningQueue: unknown[][] = [];
function nextSelect() { return selectResultsQueue.shift() ?? []; }
function nextReturning() { return returningQueue.shift() ?? [{ id: 1 }]; }

const chainMethods = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(() => nextReturning()),
  then: vi.fn((cb: (v: unknown) => unknown) => Promise.resolve(cb(nextSelect()))),
};

const mockDb = {
  select: vi.fn(() => chainMethods),
  selectDistinct: vi.fn(() => chainMethods),
  insert: vi.fn(() => chainMethods),
  update: vi.fn(() => chainMethods),
  delete: vi.fn(() => chainMethods),
};

vi.mock("../db", () => ({ requireDb: () => mockDb }));
vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

// ── Import router & helpers ──────────────────────────────────
import { employeeGrowthRouter } from "./employee-growth.router";
import { router } from "../_core/trpc";

// Caller factories
function createAuthenticatedCaller(userId = 1) {
  const appRouter = router({ employeeGrowth: employeeGrowthRouter });
  return appRouter.createCaller({
    user: { id: userId, role: "admin", username: "test", name: "Test User" },
    headers: {},
    language: "zh",
  } as never);
}

// ── Reset before each test ────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;

  // Reset chain methods
  Object.values(chainMethods).forEach((fn) => {
    if (typeof fn === "function" && "mockReturnThis" in fn) {
      fn.mockReturnThis();
    }
  });
  chainMethods.returning.mockImplementation(() => nextReturning());
  chainMethods.then.mockImplementation((cb: (v: unknown) => unknown) => Promise.resolve(cb(nextSelect())));
});

// ═══════════════════════════════════════════════════════════════
// 1. Material Sub-Router
// ═══════════════════════════════════════════════════════════════

describe("employeeGrowth.material", () => {
  it("list returns paginated materials", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { id: 1, code: "TM-001", title: "入职手册", category: "handbook" },
    ]);
    selectResultsQueue.push([{ count: 1 }]);
    const result = await caller.employeeGrowth.material.list({});
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("getById returns a material", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, code: "TM-001", title: "入职手册" }]);
    const result = await caller.employeeGrowth.material.getById({ id: 1 });
    expect(result.code).toBe("TM-001");
  });

  it("getById throws NOT_FOUND for missing material", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    await expect(caller.employeeGrowth.material.getById({ id: 999 })).rejects.toThrow();
  });

  it("create returns new material", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 1, code: "TM-NEW", title: "新资料", category: "video" }]);
    const result = await caller.employeeGrowth.material.create({
      code: "TM-NEW", title: "新资料", category: "video",
    });
    expect(result.code).toBe("TM-NEW");
  });

  it("update returns updated material", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 1, title: "Updated" }]);
    const result = await caller.employeeGrowth.material.update({ id: 1, title: "Updated" });
    expect(result.title).toBe("Updated");
  });

  it("archive sets status to archived", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeGrowth.material.archive({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("search returns filtered materials", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, title: "ERP培训" }]);
    const result = await caller.employeeGrowth.material.search({ query: "ERP" });
    expect(result).toHaveLength(1);
  });

  it("stats returns category counts", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ category: "video", count: 3 }]);
    const result = await caller.employeeGrowth.material.stats();
    expect(result[0].category).toBe("video");
  });

  it("getCategories returns category list", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeGrowth.material.getCategories();
    expect(result).toContain("video");
    expect(result).toContain("3d_model");
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. StagePlan Sub-Router
// ═══════════════════════════════════════════════════════════════

describe("employeeGrowth.stagePlan", () => {
  it("getMyPlans returns plans for current user", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { id: 1, lifecycleStage: "onboarding", status: "completed" },
      { id: 2, lifecycleStage: "3_month", status: "active" },
    ]);
    const result = await caller.employeeGrowth.stagePlan.getMyPlans();
    expect(result).toHaveLength(2);
  });

  it("create returns new stage plan", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 1, lifecycleStage: "onboarding" }]);
    const result = await caller.employeeGrowth.stagePlan.create({
      employeeId: 1, userId: 1, lifecycleStage: "onboarding",
      planName: "入职培训", dueDate: "2026-03-25", triggerDate: "2026-03-12",
    });
    expect(result.lifecycleStage).toBe("onboarding");
  });

  it("bulkCreateOnboarding creates 4 stage plans", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([
      { id: 1, lifecycleStage: "onboarding" },
      { id: 2, lifecycleStage: "3_month" },
      { id: 3, lifecycleStage: "6_month" },
      { id: 4, lifecycleStage: "12_month" },
    ]);
    const result = await caller.employeeGrowth.stagePlan.bulkCreateOnboarding({
      employeeId: 1, userId: 1, employeeName: "张三", hireDate: "2026-03-01",
    });
    expect(result).toHaveLength(4);
  });

  it("updateStatus updates plan status", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 1, status: "active" }]);
    const result = await caller.employeeGrowth.stagePlan.updateStatus({ id: 1, status: "active" });
    expect(result.status).toBe("active");
  });

  it("submitTest records test score and pass/fail", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, userId: 1, completionCriteria: { minScore: 60 } }]);
    returningQueue.push([{ id: 1, testScore: 85, testPassed: true }]);
    const result = await caller.employeeGrowth.stagePlan.submitTest({ id: 1, testScore: 85 });
    expect(result.testPassed).toBe(true);
  });

  it("submitTest throws NOT_FOUND for missing plan", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    await expect(caller.employeeGrowth.stagePlan.submitTest({ id: 999, testScore: 50 })).rejects.toThrow();
  });

  it("supervisorSignoff completes plan", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 1, status: "completed", supervisorSignoff: 1 }]);
    const result = await caller.employeeGrowth.stagePlan.supervisorSignoff({ id: 1 });
    expect(result.status).toBe("completed");
  });

  it("getUpcoming returns pending plans within date range", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, status: "pending", dueDate: "2026-03-20" }]);
    const result = await caller.employeeGrowth.stagePlan.getUpcoming({});
    expect(result).toHaveLength(1);
  });

  it("getOverview returns status/stage counts", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ status: "completed", stage: "onboarding", count: 5 }]);
    const result = await caller.employeeGrowth.stagePlan.getOverview();
    expect(result[0].count).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. RewardPenalty Sub-Router
// ═══════════════════════════════════════════════════════════════

describe("employeeGrowth.rewardPenalty", () => {
  it("list returns paginated rewards/penalties", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, type: "reward", title: "优秀员工" }]);
    selectResultsQueue.push([{ count: 1 }]);
    const result = await caller.employeeGrowth.rewardPenalty.list({});
    expect(result.items).toHaveLength(1);
  });

  it("create returns new reward", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 1, type: "reward", title: "创新奖" }]);
    const result = await caller.employeeGrowth.rewardPenalty.create({
      userId: 2, type: "reward", category: "innovation", title: "创新奖", issuedAt: "2026-03-01",
    });
    expect(result.type).toBe("reward");
  });

  it("getSummary returns aggregated stats", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { type: "reward", amount: 500, category: "innovation", status: "active" },
      { type: "penalty", amount: 100, category: "late_delivery", status: "active" },
    ]);
    const result = await caller.employeeGrowth.rewardPenalty.getSummary({});
    expect(result.totalRewards).toBe(1);
    expect(result.totalPenalties).toBe(1);
    expect(result.netAmount).toBe(400);
  });

  it("appeal updates status to appealed", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, userId: 1, type: "penalty" }]);
    returningQueue.push([{ id: 1, status: "appealed" }]);
    const result = await caller.employeeGrowth.rewardPenalty.appeal({ id: 1, reason: "不合理" });
    expect(result.status).toBe("appealed");
  });

  it("appeal throws for non-penalty items", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, userId: 1, type: "reward" }]);
    await expect(caller.employeeGrowth.rewardPenalty.appeal({ id: 1, reason: "test" })).rejects.toThrow();
  });

  it("revoke sets status to revoked", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeGrowth.rewardPenalty.revoke({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("getMonthly returns period-filtered records", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, period: "2026-03" }]);
    const result = await caller.employeeGrowth.rewardPenalty.getMonthly({ period: "2026-03" });
    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. TaskMetrics Sub-Router
// ═══════════════════════════════════════════════════════════════

describe("employeeGrowth.taskMetrics", () => {
  it("getByEmployee returns monthly metrics", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { period: "2026-03", tasksAssigned: 10, tasksCompleted: 8, avgQualityScore: 85 },
    ]);
    const result = await caller.employeeGrowth.taskMetrics.getByEmployee({});
    expect(result).toHaveLength(1);
  });

  it("upsert creates new metrics", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    returningQueue.push([{ id: 1, period: "2026-03", tasksAssigned: 10 }]);
    const result = await caller.employeeGrowth.taskMetrics.upsert({
      userId: 1, period: "2026-03", tasksAssigned: 10, tasksCompleted: 8,
    });
    expect(result.tasksAssigned).toBe(10);
  });

  it("upsert updates existing metrics", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, userId: 1, period: "2026-03" }]);
    returningQueue.push([{ id: 1, period: "2026-03", tasksAssigned: 15 }]);
    const result = await caller.employeeGrowth.taskMetrics.upsert({
      userId: 1, period: "2026-03", tasksAssigned: 15, tasksCompleted: 12,
    });
    expect(result.tasksAssigned).toBe(15);
  });

  it("getDashboard returns aggregated dashboard", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { tasksAssigned: 10, tasksCompleted: 8, tasksOnTime: 7, avgQualityScore: 85, defectCount: 1 },
      { tasksAssigned: 12, tasksCompleted: 10, tasksOnTime: 9, avgQualityScore: 90, defectCount: 0 },
    ]);
    const result = await caller.employeeGrowth.taskMetrics.getDashboard({ period: "2026-03" });
    expect(result.total).toBe(2);
    expect(result.avgQuality).toBeGreaterThan(0);
  });

  it("getDashboard returns zeros for empty period", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    const result = await caller.employeeGrowth.taskMetrics.getDashboard({ period: "2025-01" });
    expect(result.total).toBe(0);
  });

  it("getTrend returns multi-month trend", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { period: "2026-01" }, { period: "2026-02" }, { period: "2026-03" },
    ]);
    const result = await caller.employeeGrowth.taskMetrics.getTrend({ months: 6 });
    expect(result).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. CloudHallAccess Sub-Router
// ═══════════════════════════════════════════════════════════════

describe("employeeGrowth.cloudHallAccess", () => {
  it("requestAccess creates new grant request", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    returningQueue.push([{ id: 1, grantStatus: "pending", contentType: "3d_model" }]);
    const result = await caller.employeeGrowth.cloudHallAccess.requestAccess({
      contentType: "3d_model", contentId: 1, contentTitle: "SP-5000模型",
    });
    expect(result.grantStatus).toBe("pending");
  });

  it("requestAccess returns existing approved grant", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, grantStatus: "approved" }]);
    const result = await caller.employeeGrowth.cloudHallAccess.requestAccess({
      contentType: "3d_model", contentId: 1,
    });
    expect(result.grantStatus).toBe("approved");
  });

  it("listMyGrants returns user grants", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, grantStatus: "approved" }]);
    const result = await caller.employeeGrowth.cloudHallAccess.listMyGrants();
    expect(result).toHaveLength(1);
  });

  it("listPending returns pending grants", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, grantStatus: "pending" }]);
    const result = await caller.employeeGrowth.cloudHallAccess.listPending();
    expect(result).toHaveLength(1);
  });

  it("approve sets grant to approved with validity", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 1, grantStatus: "approved" }]);
    const result = await caller.employeeGrowth.cloudHallAccess.approve({ id: 1 });
    expect(result.grantStatus).toBe("approved");
  });

  it("reject sets grant to rejected", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 1, grantStatus: "rejected" }]);
    const result = await caller.employeeGrowth.cloudHallAccess.reject({ id: 1, reason: "权限不足" });
    expect(result.grantStatus).toBe("rejected");
  });

  it("revoke sets grant to revoked", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeGrowth.cloudHallAccess.revoke({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("getAccessibleContent returns approved grants", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, grantStatus: "approved" }]);
    const result = await caller.employeeGrowth.cloudHallAccess.getAccessibleContent();
    expect(result).toHaveLength(1);
  });

  it("logAccess increments view count", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeGrowth.cloudHallAccess.logAccess({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. PeriodicReport Sub-Router
// ═══════════════════════════════════════════════════════════════

describe("employeeGrowth.periodicReport", () => {
  it("getOrCreate returns existing report", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, reportType: "daily", period: "2026-03-12" }]);
    const result = await caller.employeeGrowth.periodicReport.getOrCreate({
      reportType: "daily", period: "2026-03-12",
    });
    expect(result.reportType).toBe("daily");
  });

  it("getOrCreate creates new report when none exists", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    returningQueue.push([{ id: 1, reportType: "daily", period: "2026-03-12", status: "draft" }]);
    const result = await caller.employeeGrowth.periodicReport.getOrCreate({
      reportType: "daily", period: "2026-03-12",
    });
    expect(result.status).toBe("draft");
  });

  it("submitDaily creates/updates daily report", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    returningQueue.push([{ id: 1, status: "submitted", completionRate: 66.67 }]);
    const result = await caller.employeeGrowth.periodicReport.submitDaily({
      period: "2026-03-12",
      plannedItems: [
        { title: "任务A", priority: "high", estimatedHours: 2 },
        { title: "任务B", priority: "normal", estimatedHours: 1 },
        { title: "任务C", priority: "low", estimatedHours: 1 },
      ],
      completedItems: [
        { title: "任务A", status: "done", actualHours: 2.5 },
        { title: "任务B", status: "done", actualHours: 1 },
        { title: "任务C", status: "not_started", actualHours: 0 },
      ],
    });
    expect(result.status).toBe("submitted");
  });

  it("submitWeekly creates weekly report", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    returningQueue.push([{ id: 1, reportType: "weekly", status: "submitted" }]);
    const result = await caller.employeeGrowth.periodicReport.submitWeekly({
      period: "2026-W11",
      keyAccomplishments: ["完成ERP培训", "通过质量体系测试"],
      challenges: ["设备调试延迟"],
      nextPeriodGoals: ["完成3个月培训计划"],
    });
    expect(result.status).toBe("submitted");
  });

  it("listHistory returns paginated history", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { id: 1, period: "2026-03-12" },
      { id: 2, period: "2026-03-11" },
    ]);
    selectResultsQueue.push([{ count: 2 }]);
    const result = await caller.employeeGrowth.periodicReport.listHistory({
      reportType: "daily", year: "2026",
    });
    expect(result.items).toHaveLength(2);
  });

  it("managerReview updates report with comments", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 1, status: "reviewed", managerComments: "表现优秀" }]);
    const result = await caller.employeeGrowth.periodicReport.managerReview({
      id: 1, comments: "表现优秀",
    });
    expect(result.status).toBe("reviewed");
    expect(result.managerComments).toBe("表现优秀");
  });

  it("getYears returns distinct years", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { period: "2026-03-12" }, { period: "2025-12-01" }, { period: "2026-01-15" },
    ]);
    const result = await caller.employeeGrowth.periodicReport.getYears({});
    expect(result).toContain("2026");
    expect(result).toContain("2025");
  });

  it("getReportTypes returns all report types", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.employeeGrowth.periodicReport.getReportTypes();
    expect(result).toEqual(["daily", "weekly", "monthly", "quarterly", "annual"]);
  });

  it("getEnrichedMonthly returns enriched data from multiple sources", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([{ id: 1, reportType: "monthly", period: "2026-03" }]);
    selectResultsQueue.push([{ period: "2026-03", tasksCompleted: 8 }]);
    selectResultsQueue.push([
      { type: "reward", period: "2026-03" },
      { type: "penalty", period: "2026-03" },
    ]);
    const result = await caller.employeeGrowth.periodicReport.getEnrichedMonthly({ period: "2026-03" });
    expect(result.report).toBeTruthy();
    expect(result.taskMetrics).toBeTruthy();
    expect(result.rewardSummary.rewards).toBe(1);
    expect(result.rewardSummary.penalties).toBe(1);
  });

  it("saveReport updates report fields", async () => {
    const caller = createAuthenticatedCaller();
    returningQueue.push([{ id: 1, status: "submitted" }]);
    const result = await caller.employeeGrowth.periodicReport.saveReport({
      id: 1,
      keyAccomplishments: ["Test"],
      status: "submitted",
    });
    expect(result.status).toBe("submitted");
  });
});
