/**
 * BI Report Router — Unit Tests
 *
 * 4 sub-routers (~22 procedures):
 *   period (5), department (5), individual (6), access (6)
 *
 * Run: pnpm test -- server/routers/bi-report.router.test.ts
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
  execute: vi.fn(() => Promise.resolve({ rows: [] })),
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
vi.mock("../../drizzle/bi-report-schema", () => ({
  biReportPeriods: {
    id: "id", periodType: "period_type", periodLabel: "period_label",
    startDate: "start_date", endDate: "end_date", status: "status",
    executiveSummary: "executive_summary", generatedBy: "generated_by",
    generationTaskId: "generation_task_id", createdAt: "created_at", updatedAt: "updated_at",
  },
  biDepartmentMetrics: {
    id: "id", reportPeriodId: "report_period_id", departmentCode: "department_code",
    departmentName: "department_name", departmentType: "department_type",
    targetRevenue: "target_revenue", actualRevenue: "actual_revenue", achievementRate: "achievement_rate",
    rewardCount: "reward_count", penaltyCount: "penalty_count", rewardAmount: "reward_amount",
    penaltyAmount: "penalty_amount", planTotal: "plan_total", planCompleted: "plan_completed",
    planAchievementRate: "plan_achievement_rate", trainingSessions: "training_sessions",
    trainingAttendees: "training_attendees", trainingQualityScore: "training_quality_score",
    headcount: "headcount", activeProjects: "active_projects", aiEvaluation: "ai_evaluation",
    buCode: "bu_code", createdAt: "created_at",
  },
  biIndividualMetrics: {
    id: "id", reportPeriodId: "report_period_id", userId: "user_id",
    userName: "user_name", departmentCode: "department_code", departmentName: "department_name",
    position: "position", targetValue: "target_value", actualValue: "actual_value",
    achievementRate: "achievement_rate", rewards: "rewards", penalties: "penalties",
    planItemsTotal: "plan_items_total", planItemsCompleted: "plan_items_completed",
    planAchievementRate: "plan_achievement_rate", trainingAttended: "training_attended",
    trainingHours: "training_hours", trainingScore: "training_score",
    kpiScore: "kpi_score", rankInDepartment: "rank_in_department", rankOverall: "rank_overall",
    aiCoordinatedEvaluation: "ai_coordinated_evaluation", buCode: "bu_code", createdAt: "created_at",
  },
  biReportAccessRules: {
    id: "id", periodType: "period_type", departmentCode: "department_code",
    grantedToRole: "granted_to_role", grantedToUserId: "granted_to_user_id",
    accessLevel: "access_level", grantedBy: "granted_by", expiresAt: "expires_at",
    isActive: "is_active", createdAt: "created_at",
  },
  biPeriodTypeEnum: {},
  biReportStatusEnum: {},
  biAccessLevelEnum: {},
}));

vi.mock("../../drizzle/schema", () => ({
  users: { id: "id" },
}));

const mockSubmitTask = vi.fn(async () => ({ taskId: 42 }));
vi.mock("../services/task-worker.service", () => ({
  submitTask: (...args: any[]) => mockSubmitTask(...args),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
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
  count: vi.fn(() => "count"),
}));

// ── Import router ──────────────────────────────────────
import { biReportRouter } from "./bi-report.router";

const mockCtx = {
  user: { id: 1, name: "Test User", role: "admin", email: "test@test.com" },
  bu: { buId: 1, buCode: "BU_OS", buName: "海外", departmentCode: null },
};

describe("bi-report.router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = [];
    mockReturningResult = [{ id: 1 }];
    selectResultsQueue.length = 0;
    returningQueue.length = 0;
  });

  // ══════════════════════════════════════════════════════
  // Period
  // ══════════════════════════════════════════════════════

  describe("period", () => {
    it("create — creates a report period", async () => {
      returningQueue.push([{ id: 1, periodType: "monthly", periodLabel: "2026-03" }]);
      const result = await (biReportRouter as any).period.create({
        input: { periodType: "monthly", periodLabel: "2026-03", startDate: "2026-03-01", endDate: "2026-03-31" },
        ctx: mockCtx,
      });
      expect(result.periodLabel).toBe("2026-03");
    });

    it("list — returns periods", async () => {
      selectResultsQueue.push([
        { id: 1, periodType: "monthly", periodLabel: "2026-03" },
        { id: 2, periodType: "monthly", periodLabel: "2026-02" },
      ]);
      const result = await (biReportRouter as any).period.list({
        input: { periodType: "monthly" },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
    });

    it("get — returns single period", async () => {
      selectResultsQueue.push([{ id: 1, periodLabel: "2026-03" }]);
      const result = await (biReportRouter as any).period.get({
        input: { id: 1 },
        ctx: mockCtx,
      });
      expect(result.periodLabel).toBe("2026-03");
    });

    it("publish — triggers AI summary and sets generating", async () => {
      returningQueue.push([{ id: 1, status: "generating", generationTaskId: 42 }]);
      const result = await (biReportRouter as any).period.publish({
        input: { id: 1 },
        ctx: mockCtx,
      });
      expect(result.status).toBe("generating");
      expect(result.taskId).toBe(42);
    });

    it("archive — archives old report", async () => {
      returningQueue.push([{ id: 1, status: "archived" }]);
      const result = await (biReportRouter as any).period.archive({
        input: { id: 1 },
        ctx: mockCtx,
      });
      expect(result.status).toBe("archived");
    });
  });

  // ══════════════════════════════════════════════════════
  // Department
  // ══════════════════════════════════════════════════════

  describe("department", () => {
    it("upsert — creates/updates dept metrics", async () => {
      returningQueue.push([{ id: 1, departmentCode: "SALES_DEPT", achievementRate: "78.50" }]);
      const result = await (biReportRouter as any).department.upsert({
        input: {
          reportPeriodId: 1, departmentCode: "SALES_DEPT", departmentName: "销售部",
          targetRevenue: "10000000", actualRevenue: "7850000",
          planTotal: 20, planCompleted: 17,
        },
        ctx: mockCtx,
      });
      expect(result.departmentCode).toBe("SALES_DEPT");
    });

    it("getByPeriod — returns all dept metrics", async () => {
      selectResultsQueue.push([
        { departmentCode: "SALES", achievementRate: "85.00" },
        { departmentCode: "PROC", achievementRate: "72.00" },
      ]);
      const result = await (biReportRouter as any).department.getByPeriod({
        input: { reportPeriodId: 1 },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
    });

    it("getHorizontalComparison — returns ranked by metric", async () => {
      selectResultsQueue.push([
        { departmentName: "海外事业部", achievementRate: "92.30" },
        { departmentName: "商用车事业部", achievementRate: "78.90" },
      ]);
      const result = await (biReportRouter as any).department.getHorizontalComparison({
        input: { reportPeriodId: 1, sortBy: "achievement_rate" },
        ctx: mockCtx,
      });
      expect(result[0].achievementRate).toBe("92.30");
    });

    it("getByDept — returns single dept", async () => {
      selectResultsQueue.push([{ departmentCode: "SALES_DEPT", headcount: 25 }]);
      const result = await (biReportRouter as any).department.getByDept({
        input: { reportPeriodId: 1, departmentCode: "SALES_DEPT" },
        ctx: mockCtx,
      });
      expect(result.headcount).toBe(25);
    });

    it("generateAiEval — triggers AI evaluation", async () => {
      const result = await (biReportRouter as any).department.generateAiEval({
        input: { reportPeriodId: 1, departmentCode: "SALES_DEPT" },
        ctx: mockCtx,
      });
      expect(result.taskId).toBe(42);
      expect(result.status).toBe("generating");
    });
  });

  // ══════════════════════════════════════════════════════
  // Individual
  // ══════════════════════════════════════════════════════

  describe("individual", () => {
    it("upsert — creates/updates individual metrics", async () => {
      returningQueue.push([{ id: 1, userId: 5, kpiScore: "88.50" }]);
      const result = await (biReportRouter as any).individual.upsert({
        input: {
          reportPeriodId: 1, userId: 5, userName: "吴卫成",
          departmentCode: "SALES", targetValue: "5000000", actualValue: "4200000",
          planItemsTotal: 10, planItemsCompleted: 8,
        },
        ctx: mockCtx,
      });
      expect(result.userId).toBe(5);
    });

    it("getByPeriod — returns all individuals", async () => {
      selectResultsQueue.push([
        { userId: 1, userName: "吴卫成", kpiScore: "96.50" },
        { userId: 2, userName: "焦斌", kpiScore: "93.20" },
      ]);
      const result = await (biReportRouter as any).individual.getByPeriod({
        input: { reportPeriodId: 1 },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
    });

    it("getByUser — returns single user metrics", async () => {
      selectResultsQueue.push([{ userId: 5, userName: "赵雪梅", achievementRate: "82.10" }]);
      const result = await (biReportRouter as any).individual.getByUser({
        input: { reportPeriodId: 1, userId: 5 },
        ctx: mockCtx,
      });
      expect(result.userName).toBe("赵雪梅");
    });

    it("getByDept — returns dept members vertically", async () => {
      selectResultsQueue.push([
        { userId: 1, rankInDepartment: 1 },
        { userId: 2, rankInDepartment: 2 },
        { userId: 3, rankInDepartment: 3 },
      ]);
      const result = await (biReportRouter as any).individual.getByDept({
        input: { reportPeriodId: 1, departmentCode: "SALES" },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(3);
    });

    it("getRankings — returns overall rankings", async () => {
      selectResultsQueue.push([
        { userId: 1, kpiScore: "96.50", rankOverall: 1 },
        { userId: 2, kpiScore: "93.20", rankOverall: 2 },
      ]);
      const result = await (biReportRouter as any).individual.getRankings({
        input: { reportPeriodId: 1, sortBy: "kpi_score", limit: 10 },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
      expect(result[0].kpiScore).toBe("96.50");
    });

    it("generateAiEval — triggers AI individual evaluation", async () => {
      const result = await (biReportRouter as any).individual.generateAiEval({
        input: { reportPeriodId: 1, userId: 5 },
        ctx: mockCtx,
      });
      expect(result.taskId).toBe(42);
    });
  });

  // ══════════════════════════════════════════════════════
  // Access
  // ══════════════════════════════════════════════════════

  describe("access", () => {
    it("grant — creates access rule", async () => {
      returningQueue.push([{ id: 1, grantedToRole: "bu_gm", accessLevel: "view_detail" }]);
      const result = await (biReportRouter as any).access.grant({
        input: { grantedToRole: "bu_gm", accessLevel: "view_detail" },
        ctx: mockCtx,
      });
      expect(result.grantedToRole).toBe("bu_gm");
    });

    it("revoke — deactivates access rule", async () => {
      returningQueue.push([{ id: 1, isActive: false }]);
      const result = await (biReportRouter as any).access.revoke({
        input: { id: 1 },
        ctx: mockCtx,
      });
      expect(result.isActive).toBe(false);
    });

    it("listRules — returns active rules", async () => {
      selectResultsQueue.push([
        { id: 1, grantedToRole: "bu_gm", isActive: true },
        { id: 2, grantedToRole: "director", isActive: true },
      ]);
      const result = await (biReportRouter as any).access.listRules({
        input: { activeOnly: true },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
    });

    it("checkAccess — admin has full access", async () => {
      const result = await (biReportRouter as any).access.checkAccess({
        input: { periodType: "monthly" },
        ctx: mockCtx,
      });
      expect(result.hasAccess).toBe(true);
      expect(result.level).toBe("manage");
    });

    it("listMyReports — returns published reports", async () => {
      selectResultsQueue.push([
        { id: 1, periodLabel: "2026-03", status: "published" },
      ]);
      const result = await (biReportRouter as any).access.listMyReports({
        input: { periodType: "monthly" },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(1);
    });

    it("getAccessibleDepts — returns department list", async () => {
      selectResultsQueue.push([
        { departmentCode: "SALES", departmentName: "销售部" },
        { departmentCode: "PROC", departmentName: "采购部" },
      ]);
      const result = await (biReportRouter as any).access.getAccessibleDepts({
        input: { reportPeriodId: 1 },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
    });
  });
});
