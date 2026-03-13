import { describe, it, expect, vi, beforeEach } from "vitest";

/* ── Mock setup (hoisted) ──────────────────────────────────────── */
const { selectResultsQueue, returningQueue, chainMethods } = vi.hoisted(() => {
  const selectResultsQueue: any[] = [];
  const returningQueue: any[] = [];
  const chainMethods = {
    where: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(function (this: any) { return this; }),
    groupBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => {
      const r = returningQueue.shift();
      return r !== undefined ? Promise.resolve(r) : Promise.resolve([{ id: 1 }]);
    }),
    then: vi.fn().mockImplementation((cb: any) => {
      const r = selectResultsQueue.shift();
      return Promise.resolve(cb(r !== undefined ? r : []));
    }),
  };
  return { selectResultsQueue, returningQueue, chainMethods };
});

vi.mock("../../drizzle/executive-review-schema", () => ({
  executiveReviewComments: { id: "id", reviewerId: "reviewer_id", targetType: "target_type", targetId: "target_id", period: "period", periodType: "period_type", status: "status", createdAt: "created_at" },
  executiveReviewSnapshots: { id: "id", scopeType: "scope_type", scopeId: "scope_id", period: "period", periodType: "period_type", avgKpiScore: "avg_kpi_score", taskCompletionRate: "task_completion_rate", onTimeRate: "on_time_rate", avgTaskQuality: "avg_task_quality", trainingCompletionRate: "training_completion_rate", okrProgressAvg: "okr_progress_avg" },
}));

vi.mock("../../drizzle/schema", () => ({
  users: { id: "id", name: "name", employeeId: "employee_id", department: "department", position: "position", role: "role" },
}));

vi.mock("../../drizzle/kpi-performance-schema", () => ({
  hrmMonthlyPerformanceReviews: { userId: "user_id", employeeId: "employee_id", monthDate: "month_date", overallKpiScore: "overall_kpi_score", bonusCoefficient: "bonus_coefficient", status: "status", kpiDetailsJson: "kpi_details_json" },
  hrmKpiLibrary: {},
  hrmPositionKpiTargets: {},
}));

vi.mock("../../drizzle/employee-growth-schema", () => ({
  employeeTaskMetrics: { userId: "user_id", employeeId: "employee_id", period: "period", tasksAssigned: "tasks_assigned", tasksCompleted: "tasks_completed", tasksOnTime: "tasks_on_time", tasksLate: "tasks_late", tasksOverdue: "tasks_overdue", avgQualityScore: "avg_quality_score", defectCount: "defect_count" },
  employeeRewardsPenalties: { userId: "user_id", employeeId: "employee_id", type: "type", category: "category", title: "title", amount: "amount", period: "period", issuedAt: "issued_at" },
  employeePeriodicReports: { userId: "user_id", reportType: "report_type", period: "period" },
}));

vi.mock("../../drizzle/perf-calibration-schema", () => ({
  perfCompositeScores: { employeeId: "employee_id", period: "period" },
  perf360Feedback: { id: "id", targetEmployeeId: "target_employee_id", relationship: "relationship", overallScore: "overall_score", strengths: "strengths", improvements: "improvements", isAnonymous: "is_anonymous", status: "status", period: "period" },
}));

vi.mock("../../drizzle/performance-schema", () => ({
  performanceRecords: { year: "year", quarter: "quarter" },
}));

vi.mock("../../drizzle/okr-schema", () => ({
  okrObjectives: { id: "id", year: "year", quarter: "quarter", ownerDepartment: "owner_department" },
  okrKeyResults: { objectiveId: "objective_id" },
}));

vi.mock("../../drizzle/battle-arena-schema", () => ({
  globalArenaRankings: { entityId: "entity_id", period: "period", entityType: "entity_type", rankPosition: "rank_position" },
}));

vi.mock("../db", () => ({
  db: {
    select: vi.fn().mockReturnValue(chainMethods),
    insert: vi.fn().mockReturnValue(chainMethods),
    update: vi.fn().mockReturnValue(chainMethods),
    delete: vi.fn().mockReturnValue(chainMethods),
  },
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  sql: vi.fn(),
  desc: vi.fn((col: any) => col),
  asc: vi.fn((col: any) => col),
  gte: vi.fn(),
  lte: vi.fn(),
  like: vi.fn(),
  inArray: vi.fn(),
  count: vi.fn(),
}));

/* ── Router import ──────────────────────────────────────────────── */
import { executiveReviewRouter } from "./executive-review.router";
import { router } from "../_core/trpc";

const appRouter = router({ executiveReview: executiveReviewRouter });
type AppRouter = typeof appRouter;

function createCaller(role: string = "ceo") {
  return appRouter.createCaller({
    user: { id: 1, name: "Test CEO", role, email: "ceo@test.com" },
  } as any);
}

function createStaffCaller() {
  return appRouter.createCaller({
    user: { id: 2, name: "Staff", role: "staff", email: "staff@test.com" },
  } as any);
}

/* ── Tests ───────────────────────────────────────────────────────── */
beforeEach(() => {
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  vi.clearAllMocks();
});

describe("executiveReview.company", () => {
  it("getSnapshot returns company snapshot", async () => {
    const snap = { id: 1, scopeType: "company", avgKpiScore: "78.5" };
    selectResultsQueue.push([snap]);
    const result = await createCaller().executiveReview.company.getSnapshot({ period: "2026-03", periodType: "monthly" });
    expect(result).toEqual(snap);
  });

  it("getSnapshot returns null when no data", async () => {
    selectResultsQueue.push([]);
    const result = await createCaller().executiveReview.company.getSnapshot({ period: "2099-01" });
    expect(result).toBeNull();
  });

  it("getDepartmentComparison returns department list", async () => {
    const depts = [{ scopeId: "事业一部", avgKpiScore: "82" }];
    selectResultsQueue.push(depts);
    const result = await createCaller().executiveReview.company.getDepartmentComparison({ period: "2026-03" });
    expect(result).toEqual(depts);
  });

  it("getBuComparison returns BU list", async () => {
    selectResultsQueue.push([{ scopeId: "overseas" }]);
    const result = await createCaller().executiveReview.company.getBuComparison({ period: "2026-03" });
    expect(result).toHaveLength(1);
  });

  it("getTrend returns historical data", async () => {
    selectResultsQueue.push([{ period: "2026-03" }, { period: "2026-02" }]);
    const result = await createCaller().executiveReview.company.getTrend({ scopeType: "company", scopeId: "all", limit: 6 });
    expect(result).toHaveLength(2);
  });

  it("upsertSnapshot creates new snapshot", async () => {
    selectResultsQueue.push([]); // no existing
    returningQueue.push([{ id: 10 }]);
    const result = await createCaller().executiveReview.company.upsertSnapshot({
      scopeType: "department", scopeId: "品质部", scopeName: "品质部",
      period: "2026-03", periodType: "monthly", data: { avgKpiScore: "85" },
    });
    expect(result.action).toBe("created");
    expect(result.id).toBe(10);
  });

  it("upsertSnapshot updates existing snapshot", async () => {
    selectResultsQueue.push([{ id: 5 }]); // existing found
    const result = await createCaller().executiveReview.company.upsertSnapshot({
      scopeType: "department", scopeId: "品质部", scopeName: "品质部",
      period: "2026-03", periodType: "monthly", data: { avgKpiScore: "88" },
    });
    expect(result.action).toBe("updated");
  });

  it("rejects non-executive roles", async () => {
    await expect(createStaffCaller().executiveReview.company.getSnapshot({ period: "2026-03" }))
      .rejects.toThrow("需要部门经理及以上权限");
  });
});

describe("executiveReview.department", () => {
  it("getSnapshot returns department data", async () => {
    selectResultsQueue.push([{ scopeId: "品质部", avgKpiScore: "82" }]);
    const result = await createCaller().executiveReview.department.getSnapshot({ department: "品质部", period: "2026-03" });
    expect(result).toBeTruthy();
  });

  it("getEmployeeKpis returns employee KPI list", async () => {
    selectResultsQueue.push([{ userId: 1, overallKpiScore: "85" }]);
    const result = await createCaller().executiveReview.department.getEmployeeKpis({ department: "品质部", period: "2026-03" });
    expect(result).toHaveLength(1);
  });

  it("getTaskMetrics returns task metrics", async () => {
    selectResultsQueue.push([{ userId: 1, tasksAssigned: 20, tasksCompleted: 18 }]);
    const result = await createCaller().executiveReview.department.getTaskMetrics({ department: "品质部", period: "2026-03" });
    expect(result[0].tasksAssigned).toBe(20);
  });

  it("getRewardPenaltySummary returns items", async () => {
    selectResultsQueue.push([{ type: "reward", title: "优秀员工" }]);
    const result = await createCaller().executiveReview.department.getRewardPenaltySummary({ department: "品质部", period: "2026-03" });
    expect(result[0].type).toBe("reward");
  });
});

describe("executiveReview.employee", () => {
  it("getProfile returns multi-source employee data", async () => {
    selectResultsQueue.push([{ id: 1, name: "张三", department: "品质部" }]); // user
    selectResultsQueue.push([{ overallKpiScore: "85" }]); // kpiReview
    selectResultsQueue.push([{ tasksAssigned: 10 }]); // taskMetric
    selectResultsQueue.push([{ aiCompositeScore: "82" }]); // compositeScore
    selectResultsQueue.push([{ type: "reward" }]); // rewards
    selectResultsQueue.push([{ bonusTier: "A" }]); // arenaRank
    const result = await createCaller().executiveReview.employee.getProfile({ userId: 1, period: "2026-03" });
    expect(result.user).toBeTruthy();
    expect(result.kpiReview).toBeTruthy();
    expect(result.arenaRank).toBeTruthy();
  });

  it("getKpiTrend returns monthly scores", async () => {
    selectResultsQueue.push([{ monthDate: "2026-03", overallKpiScore: "80" }, { monthDate: "2026-02", overallKpiScore: "78" }]);
    const result = await createCaller().executiveReview.employee.getKpiTrend({ userId: 1, months: 12 });
    expect(result).toHaveLength(2);
  });

  it("getTaskTrend returns task history", async () => {
    selectResultsQueue.push([{ period: "2026-03" }]);
    const result = await createCaller().executiveReview.employee.getTaskTrend({ userId: 1, months: 6 });
    expect(result).toHaveLength(1);
  });

  it("getReports returns periodic reports", async () => {
    selectResultsQueue.push([{ reportType: "monthly", period: "2026-03" }]);
    const result = await createCaller().executiveReview.employee.getReports({ userId: 1, reportType: "monthly" });
    expect(result[0].reportType).toBe("monthly");
  });

  it("get360Feedback returns feedback entries", async () => {
    selectResultsQueue.push([{ relationship: "manager", overallScore: "90" }]);
    const result = await createCaller().executiveReview.employee.get360Feedback({ userId: 1, period: "2026-03" });
    expect(result[0].relationship).toBe("manager");
  });

  it("search returns matched employees", async () => {
    selectResultsQueue.push([{ id: 1, name: "张三" }]);
    const result = await createCaller().executiveReview.employee.search({ query: "张" });
    expect(result[0].name).toBe("张三");
  });
});

describe("executiveReview.project", () => {
  it("getByProject returns performance records", async () => {
    selectResultsQueue.push([{ year: 2026, quarter: 1, kpiScore: "78" }]);
    const result = await createCaller().executiveReview.project.getByProject({ period: "2026" });
    expect(result[0].year).toBe(2026);
  });

  it("getOkrStatus returns objectives and key results", async () => {
    selectResultsQueue.push([{ id: 1, code: "O1", title: "收入增长" }]); // objectives
    selectResultsQueue.push([{ objectiveId: 1, code: "KR1", progressPercent: "65" }]); // keyResults
    const result = await createCaller().executiveReview.project.getOkrStatus({ year: 2026 });
    expect(result.objectives).toHaveLength(1);
    expect(result.keyResults).toHaveLength(1);
  });

  it("getOkrStatus returns empty keyResults when no objectives", async () => {
    selectResultsQueue.push([]); // no objectives
    const result = await createCaller().executiveReview.project.getOkrStatus({ year: 2099 });
    expect(result.objectives).toHaveLength(0);
    expect(result.keyResults).toHaveLength(0);
  });
});

describe("executiveReview.review", () => {
  it("create inserts a comment", async () => {
    returningQueue.push([{ id: 42 }]);
    const result = await createCaller().executiveReview.review.create({
      targetType: "department", targetId: "品质部", targetName: "品质部",
      period: "2026-03", periodType: "monthly", rating: 4, comment: "表现良好",
    });
    expect(result?.id).toBe(42);
  });

  it("listByTarget returns comments", async () => {
    selectResultsQueue.push([{ id: 1, comment: "做得好" }]);
    const result = await createCaller().executiveReview.review.listByTarget({ targetType: "department", targetId: "品质部" });
    expect(result[0].comment).toBe("做得好");
  });

  it("listByReviewer returns reviewer's comments", async () => {
    selectResultsQueue.push([{ id: 1, targetName: "事业一部" }]);
    const result = await createCaller().executiveReview.review.listByReviewer({});
    expect(result).toHaveLength(1);
  });

  it("update modifies own comment", async () => {
    selectResultsQueue.push([{ id: 1, reviewerId: 1 }]); // owned by caller
    const result = await createCaller().executiveReview.review.update({ id: 1, comment: "更新评价" });
    expect(result.success).toBe(true);
  });

  it("update rejects editing others' comment", async () => {
    selectResultsQueue.push([{ id: 1, reviewerId: 999 }]); // not owned
    await expect(createCaller().executiveReview.review.update({ id: 1, comment: "hack" }))
      .rejects.toThrow("只能编辑自己的评价");
  });

  it("archive soft-deletes own comment", async () => {
    selectResultsQueue.push([{ id: 1, reviewerId: 1 }]);
    const result = await createCaller().executiveReview.review.archive({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("archive rejects others' comment", async () => {
    selectResultsQueue.push([{ id: 1, reviewerId: 999 }]);
    await expect(createCaller().executiveReview.review.archive({ id: 1 }))
      .rejects.toThrow("只能删除自己的评价");
  });

  it("getStats returns aggregated counts", async () => {
    selectResultsQueue.push([{ targetType: "department", count: 5 }]);
    const result = await createCaller().executiveReview.review.getStats({ period: "2026-03" });
    expect(result[0].count).toBe(5);
  });
});

describe("executiveReview.comparison", () => {
  it("horizontal returns sorted departments", async () => {
    selectResultsQueue.push([{ scopeName: "品质部", avgKpiScore: "82" }]);
    const result = await createCaller().executiveReview.comparison.horizontal({ period: "2026-03", metric: "avgKpiScore" });
    expect(result).toHaveLength(1);
  });

  it("vertical returns multi-period data", async () => {
    selectResultsQueue.push([{ period: "2026-01" }, { period: "2026-02" }]);
    const result = await createCaller().executiveReview.comparison.vertical({
      scopeType: "department", scopeId: "品质部", periods: ["2026-01", "2026-02"],
    });
    expect(result).toHaveLength(2);
  });

  it("vertical returns empty for empty periods", async () => {
    const result = await createCaller().executiveReview.comparison.vertical({
      scopeType: "department", scopeId: "品质部", periods: [],
    });
    expect(result).toEqual([]);
  });

  it("arenaRanking returns rankings", async () => {
    selectResultsQueue.push([{ entityName: "张三", rankPosition: 1, bonusTier: "S" }]);
    const result = await createCaller().executiveReview.comparison.arenaRanking({ period: "2026-03" });
    expect(result[0].bonusTier).toBe("S");
  });
});

describe("executiveReview.dashboard", () => {
  it("getSummary returns aggregated data", async () => {
    selectResultsQueue.push([{ scopeType: "company", avgKpiScore: "78" }]); // company
    selectResultsQueue.push([{ scopeType: "department", scopeName: "品质部" }]); // departments
    selectResultsQueue.push([{ scopeType: "bu", scopeName: "海外" }]); // bus
    selectResultsQueue.push([{ targetType: "department", count: 3 }]); // reviewStats
    const result = await createCaller().executiveReview.dashboard.getSummary({ period: "2026-03" });
    expect(result.company).toBeTruthy();
    expect(result.departments).toHaveLength(1);
    expect(result.bus).toHaveLength(1);
  });

  it("getAvailablePeriods returns period list", async () => {
    selectResultsQueue.push([{ period: "2026-03", periodType: "monthly" }]);
    const result = await createCaller().executiveReview.dashboard.getAvailablePeriods();
    expect(result[0].period).toBe("2026-03");
  });
});

describe("access control", () => {
  it("bu_gm role can access", async () => {
    selectResultsQueue.push([]);
    const caller = createCaller("bu_gm");
    const result = await caller.executiveReview.company.getSnapshot({ period: "2026-03" });
    expect(result).toBeNull();
  });

  it("dept_manager role can access", async () => {
    selectResultsQueue.push([]);
    const caller = createCaller("dept_manager");
    const result = await caller.executiveReview.company.getSnapshot({ period: "2026-03" });
    expect(result).toBeNull();
  });

  it("hr_director role can access", async () => {
    selectResultsQueue.push([]);
    const caller = createCaller("hr_director");
    const result = await caller.executiveReview.company.getSnapshot({ period: "2026-03" });
    expect(result).toBeNull();
  });

  it("staff role is rejected", async () => {
    await expect(createStaffCaller().executiveReview.department.getSnapshot({ department: "品质部", period: "2026-03" }))
      .rejects.toThrow("需要部门经理及以上权限");
  });

  it("employee role is rejected", async () => {
    const caller = appRouter.createCaller({
      user: { id: 3, name: "Worker", role: "employee", email: "w@test.com" },
    } as any);
    await expect(caller.executiveReview.comparison.horizontal({ period: "2026-03", metric: "avgKpiScore" }))
      .rejects.toThrow("需要部门经理及以上权限");
  });
});
