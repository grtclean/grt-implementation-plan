/**
 * Performance Calibration Router — Unit Tests
 *
 * Covers all 8 sub-routers (~42 procedures):
 *   weightConfig (5), compositeScore (7), feedback360 (7),
 *   forcedDistribution (4), calibration (8), manualOverride (4),
 *   incentive (5), dashboard (2)
 *
 * Run: pnpm test -- server/routers/perf-calibration.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function createMockDbChain() {
  const chain: any = {};
  for (const m of [
    "from", "where", "and", "orderBy", "groupBy", "limit", "offset", "values", "set",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
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
vi.mock("../../drizzle/perf-calibration-schema", () => ({
  perfScoringWeightConfigs: { id: "id", department: "department", role: "role", buCode: "bu_code", isActive: "is_active", createdAt: "created_at" },
  perfCompositeScores: { id: "id", employeeId: "employee_id", period: "period", department: "department", status: "status", finalScore: "final_score", finalGrade: "final_grade", aiCompositeScore: "ai_composite_score", aiGrade: "ai_grade", overrideBy: "override_by", overrideAt: "override_at", calibrationSessionId: "calibration_session_id" },
  perf360Feedback: { id: "id", targetEmployeeId: "target_employee_id", reviewerEmployeeId: "reviewer_employee_id", period: "period", status: "status", relationship: "relationship", overallScore: "overall_score", createdAt: "created_at" },
  perfForcedDistributionConfigs: { id: "id", department: "department", buCode: "bu_code", isActive: "is_active", createdAt: "created_at" },
  perfCalibrationSessions: { id: "id", period: "period", status: "status", scope: "scope", createdAt: "created_at" },
  perfCalibrationAdjustments: { id: "id", sessionId: "session_id", compositeScoreId: "composite_score_id", employeeId: "employee_id", undoneAt: "undone_at", createdAt: "created_at" },
  perfIncentiveCatalog: { id: "id", code: "code", category: "category", isActive: "is_active", calculationMethod: "calculation_method" },
  compositeScoreStatusEnum: {},
  feedbackRelationshipEnum: {},
  calibrationSessionStatusEnum: {},
  incentiveCategoryEnum: {},
  incentiveCalcMethodEnum: {},
  perfGradeEnum: {},
}));

vi.mock("../../drizzle/smart-payroll-schema", () => ({
  payrollExcellenceAwards: { id: "id", employeeId: "employee_id", period: "period", awardAmount: "award_amount", awardType: "award_type", createdAt: "created_at" },
}));

// ── Mock composite scoring service ──────────────────────
vi.mock("../services/perf-composite-scoring.service", () => ({
  calculateCompositeScore: vi.fn(async () => ({
    employeeId: 1,
    aiCompositeScore: 82.5,
    aiGrade: "A",
    breakdown: { kpiScore: 85, aeiScore: 80, okrScore: 75, competencyScore: 80, feedbackScore: 90, attendanceFactor: 0.98, kpiWeight: 30, aeiWeight: 20, okrWeight: 20, competencyWeight: 15, feedbackWeight: 15, weightedSum: 82.5 },
    weightConfigId: 1,
  })),
  calculateBatchComposite: vi.fn(async () => ({ processed: 10, errors: 0 })),
  checkForcedDistribution: vi.fn(async () => ({
    totalCount: 50,
    distribution: {
      S: { count: 3, actualPct: 6, maxPct: 5, violation: true },
      A: { count: 10, actualPct: 20, maxPct: 20, violation: false },
      B: { count: 25, actualPct: 50, maxPct: 50, violation: false },
      C: { count: 10, actualPct: 20, maxPct: 20, violation: false },
      D: { count: 2, actualPct: 4, maxPct: 5, violation: false },
    },
    hasViolations: true,
    isStrict: false,
  })),
  scoreToGrade: vi.fn((score: number) => {
    if (score >= 90) return "S";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    return "D";
  }),
}));

vi.mock("../../drizzle/schema", () => ({
  aiTasks: { id: "id", taskType: "task_type", status: "status", inputData: "input_data", createdBy: "created_by" },
}));

vi.mock("../workers/payrollCalculator", () => ({
  processPayrollTask: vi.fn(async () => {}),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  sql: vi.fn((...args: any[]) => args),
  avg: vi.fn(() => "avg"),
  isNull: vi.fn((col: any) => col),
  sum: vi.fn(() => "sum"),
}));

// ── Import router ───────────────────────────────────────
import { perfCalibrationRouter } from "./perf-calibration.router";

const mockCtx = { user: { id: 1, name: "Test Admin", role: "admin" } };

// ── Reset state ─────────────────────────────────────────
beforeEach(() => {
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue.length = 0;
  vi.clearAllMocks();
});

// ============================================================================
// Sub-Router 1: Weight Config
// ============================================================================

describe("perfCalibration.weightConfig", () => {
  it("list returns weight configs", async () => {
    mockQueryResult = [{ id: 1, kpiWeight: "30.00", aeiWeight: "20.00" }];
    const result = await perfCalibrationRouter.weightConfig.list({ ctx: mockCtx } as any);
    expect(Array.isArray(result)).toBe(true);
  });

  it("getDefault returns null when no default exists", async () => {
    mockQueryResult = [];
    const result = await perfCalibrationRouter.weightConfig.getDefault({ ctx: mockCtx } as any);
    expect(result).toBe(null);
  });

  it("upsert creates new config", async () => {
    const result = await perfCalibrationRouter.weightConfig.upsert({
      input: { kpiWeight: "35.00", aeiWeight: "15.00", okrWeight: "20.00", competencyWeight: "15.00", feedbackWeight: "15.00" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("action", "created");
  });

  it("upsert updates existing config", async () => {
    const result = await perfCalibrationRouter.weightConfig.upsert({
      input: { id: 1, kpiWeight: "35.00" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("action", "updated");
  });

  it("delete deactivates config", async () => {
    const result = await perfCalibrationRouter.weightConfig.delete({
      input: { id: 1 },
      ctx: mockCtx,
    } as any);
    expect(result).toEqual({ success: true });
  });
});

// ============================================================================
// Sub-Router 2: Composite Score
// ============================================================================

describe("perfCalibration.compositeScore", () => {
  it("calculate creates new score", async () => {
    selectResultsQueue.push([]); // no existing score
    const result = await perfCalibrationRouter.compositeScore.calculate({
      input: { employeeId: 1, period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("aiCompositeScore", 82.5);
    expect(result).toHaveProperty("action", "created");
  });

  it("calculate updates existing score", async () => {
    selectResultsQueue.push([{ id: 5, employeeId: 1 }]); // existing score
    const result = await perfCalibrationRouter.compositeScore.calculate({
      input: { employeeId: 1, period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("action", "updated");
  });

  it("calculateBatch returns processed count", async () => {
    const result = await perfCalibrationRouter.compositeScore.calculateBatch({
      input: { period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toEqual({ processed: 10, errors: 0 });
  });

  it("getByEmployee returns scores array", async () => {
    mockQueryResult = [{ id: 1, period: "2026-03", finalScore: "82.50" }];
    const result = await perfCalibrationRouter.compositeScore.getByEmployee({
      input: { employeeId: 1 },
      ctx: mockCtx,
    } as any);
    expect(Array.isArray(result)).toBe(true);
  });

  it("listByDepartment returns filtered scores", async () => {
    mockQueryResult = [{ id: 1 }, { id: 2 }];
    const result = await perfCalibrationRouter.compositeScore.listByDepartment({
      input: { department: "研发部", period: "2026-03", limit: 100 },
      ctx: mockCtx,
    } as any);
    expect(Array.isArray(result)).toBe(true);
  });

  it("getDistribution returns grade counts", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ final_grade: "A", cnt: 10 }, { final_grade: "B", cnt: 20 }],
    });
    const result = await perfCalibrationRouter.compositeScore.getDistribution({
      input: { period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("grade", "A");
  });

  it("export returns scores array", async () => {
    mockQueryResult = [{ id: 1 }];
    const result = await perfCalibrationRouter.compositeScore.export({
      input: { period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ============================================================================
// Sub-Router 3: 360° Feedback
// ============================================================================

describe("perfCalibration.feedback360", () => {
  it("requestFeedback creates feedback record", async () => {
    mockReturningResult = [{ id: 1, targetEmployeeId: 2, reviewerEmployeeId: 3 }];
    const result = await perfCalibrationRouter.feedback360.requestFeedback({
      input: {
        targetEmployeeId: 2,
        reviewerEmployeeId: 3,
        relationship: "peer",
        period: "2026-03",
      },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("id");
  });

  it("submit updates feedback status", async () => {
    selectResultsQueue.push([{ id: 1, reviewerEmployeeId: 1, status: "pending" }]);
    const result = await perfCalibrationRouter.feedback360.submit({
      input: { feedbackId: 1, questionnaire: [], overallScore: "85" },
      ctx: mockCtx,
    } as any);
    expect(result).toEqual({ success: true });
  });

  it("submit rejects if not the reviewer", async () => {
    selectResultsQueue.push([{ id: 1, reviewerEmployeeId: 999, status: "pending" }]);
    await expect(
      perfCalibrationRouter.feedback360.submit({
        input: { feedbackId: 1, questionnaire: [], overallScore: "85" },
        ctx: mockCtx,
      } as any),
    ).rejects.toThrow("Not your feedback to submit");
  });

  it("getMyPending returns pending feedback", async () => {
    mockQueryResult = [{ id: 1, status: "pending" }];
    const result = await perfCalibrationRouter.feedback360.getMyPending({ ctx: mockCtx } as any);
    expect(Array.isArray(result)).toBe(true);
  });

  it("getForEmployee returns feedback for target", async () => {
    mockQueryResult = [{ id: 1 }];
    const result = await perfCalibrationRouter.feedback360.getForEmployee({
      input: { employeeId: 2, period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(Array.isArray(result)).toBe(true);
  });

  it("getAggregated returns aggregated scores by relationship", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        { relationship: "peer", response_count: 3, avg_score: 82.5 },
        { relationship: "manager", response_count: 1, avg_score: 90.0 },
      ],
    });
    const result = await perfCalibrationRouter.feedback360.getAggregated({
      input: { employeeId: 2, period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("relationship", "peer");
  });

  it("generateQuestionnaire returns questions for relationship", async () => {
    const result = await perfCalibrationRouter.feedback360.generateQuestionnaire({
      input: { relationship: "manager" },
      ctx: mockCtx,
    } as any);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================================
// Sub-Router 4: Forced Distribution
// ============================================================================

describe("perfCalibration.forcedDistribution", () => {
  it("getConfig returns active configs", async () => {
    mockQueryResult = [{ id: 1, gradeSMaxPct: "5.00" }];
    const result = await perfCalibrationRouter.forcedDistribution.getConfig({ ctx: mockCtx } as any);
    expect(Array.isArray(result)).toBe(true);
  });

  it("upsert creates new config", async () => {
    const result = await perfCalibrationRouter.forcedDistribution.upsert({
      input: { gradeSMaxPct: "5.00", gradeAMaxPct: "20.00", gradeBMaxPct: "50.00", gradeCMaxPct: "20.00", gradeDMaxPct: "5.00" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("action", "created");
  });

  it("simulate returns distribution check", async () => {
    const result = await perfCalibrationRouter.forcedDistribution.simulate({
      input: { department: null, period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("totalCount", 50);
    expect(result).toHaveProperty("hasViolations", true);
  });

  it("listViolations returns violating departments", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [{ department: "研发部" }] });
    const result = await perfCalibrationRouter.forcedDistribution.listViolations({
      input: { period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ============================================================================
// Sub-Router 5: Calibration Sessions
// ============================================================================

describe("perfCalibration.calibration", () => {
  it("createSession creates new session", async () => {
    mockReturningResult = [{ id: 1, title: "Q1 Calibration", scope: "company", period: "2026-Q1", status: "draft" }];
    const result = await perfCalibrationRouter.calibration.createSession({
      input: { title: "Q1 Calibration", scope: "company", period: "2026-Q1" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("id");
  });

  it("getSession returns session with adjustments", async () => {
    selectResultsQueue.push([{ id: 1, title: "Q1 Calibration", status: "in_progress" }]);
    selectResultsQueue.push([{ id: 1, sessionId: 1, previousGrade: "B", newGrade: "A" }]);
    const result = await perfCalibrationRouter.calibration.getSession({
      input: { id: 1 },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("title", "Q1 Calibration");
    expect(result).toHaveProperty("adjustments");
  });

  it("getSession returns null for missing session", async () => {
    selectResultsQueue.push([]);
    const result = await perfCalibrationRouter.calibration.getSession({
      input: { id: 999 },
      ctx: mockCtx,
    } as any);
    expect(result).toBe(null);
  });

  it("listSessions returns sessions array", async () => {
    mockQueryResult = [{ id: 1 }, { id: 2 }];
    const result = await perfCalibrationRouter.calibration.listSessions({
      input: { period: "2026-Q1" },
      ctx: mockCtx,
    } as any);
    expect(Array.isArray(result)).toBe(true);
  });

  it("startSession changes status to in_progress", async () => {
    selectResultsQueue.push([{ id: 1, status: "draft", scope: "company", period: "2026-Q1" }]);
    const result = await perfCalibrationRouter.calibration.startSession({
      input: { id: 1 },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("success", true);
  });

  it("startSession rejects non-draft sessions", async () => {
    selectResultsQueue.push([{ id: 1, status: "in_progress", scope: "company", period: "2026-Q1" }]);
    await expect(
      perfCalibrationRouter.calibration.startSession({ input: { id: 1 }, ctx: mockCtx } as any),
    ).rejects.toThrow("Session must be in draft status");
  });

  it("recordAdjustment creates adjustment and updates score", async () => {
    selectResultsQueue.push([{ id: 5, finalGrade: "B", finalScore: "75.00", aiCompositeScore: "75.00", aiGrade: "B" }]);
    mockReturningResult = [{ id: 1, previousGrade: "B", newGrade: "A" }];
    const result = await perfCalibrationRouter.calibration.recordAdjustment({
      input: { sessionId: 1, compositeScoreId: 5, employeeId: 1, newGrade: "A", newScore: "85.00", adjustmentReason: "Outstanding project delivery" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("previousGrade", "B");
    expect(result).toHaveProperty("newGrade", "A");
  });

  it("completeSession finalizes session and scores", async () => {
    selectResultsQueue.push([{ id: 1, status: "in_progress", scope: "company", period: "2026-Q1" }]);
    const result = await perfCalibrationRouter.calibration.completeSession({
      input: { id: 1 },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("success", true);
  });
});

// ============================================================================
// Sub-Router 6: Manual Override
// ============================================================================

describe("perfCalibration.manualOverride", () => {
  it("override applies manual score change", async () => {
    selectResultsQueue.push([{ id: 1, status: "ai_scored" }]);
    const result = await perfCalibrationRouter.manualOverride.override({
      input: { compositeScoreId: 1, newScore: "88.00", newGrade: "A", justification: "Exceptional project work" },
      ctx: mockCtx,
    } as any);
    expect(result).toEqual({ success: true });
  });

  it("override rejects locked scores", async () => {
    selectResultsQueue.push([{ id: 1, status: "locked" }]);
    await expect(
      perfCalibrationRouter.manualOverride.override({
        input: { compositeScoreId: 1, newScore: "88.00", newGrade: "A", justification: "Should fail" },
        ctx: mockCtx,
      } as any),
    ).rejects.toThrow("Score is locked");
  });

  it("batchOverride updates multiple scores", async () => {
    const result = await perfCalibrationRouter.manualOverride.batchOverride({
      input: {
        overrides: [
          { compositeScoreId: 1, newScore: "88.00", newGrade: "A", justification: "Reason one" },
          { compositeScoreId: 2, newScore: "72.00", newGrade: "B", justification: "Reason two" },
        ],
      },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("updated", 2);
    expect(result).toHaveProperty("total", 2);
  });

  it("revert restores AI score", async () => {
    selectResultsQueue.push([{ id: 1, status: "calibrated", aiCompositeScore: "82.50", aiGrade: "A" }]);
    const result = await perfCalibrationRouter.manualOverride.revert({
      input: { compositeScoreId: 1 },
      ctx: mockCtx,
    } as any);
    expect(result).toEqual({ success: true });
  });

  it("revert rejects locked scores", async () => {
    selectResultsQueue.push([{ id: 1, status: "locked" }]);
    await expect(
      perfCalibrationRouter.manualOverride.revert({ input: { compositeScoreId: 1 }, ctx: mockCtx } as any),
    ).rejects.toThrow("Score is locked");
  });
});

// ============================================================================
// Sub-Router 7: Incentive
// ============================================================================

describe("perfCalibration.incentive", () => {
  it("listCatalog returns active items", async () => {
    mockQueryResult = [{ id: 1, code: "SKILL_TECH", name: "技术津贴" }];
    const result = await perfCalibrationRouter.incentive.listCatalog({ ctx: mockCtx } as any);
    expect(Array.isArray(result)).toBe(true);
  });

  it("upsertCatalogItem creates new item", async () => {
    const result = await perfCalibrationRouter.incentive.upsertCatalogItem({
      input: { code: "NEW_BONUS", name: "新奖金", category: "project_bonus" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("action", "created");
  });

  it("awardIncentive creates payroll excellence award", async () => {
    selectResultsQueue.push([{ id: 1, code: "SKILL_TECH", name: "技术津贴", maxAmount: "5000.00" }]);
    mockReturningResult = [{ id: 1 }];
    const result = await perfCalibrationRouter.incentive.awardIncentive({
      input: { employeeId: 1, catalogItemId: 1, amount: "2000.00", period: "2026-03", justification: "Monthly tech premium" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("awardId");
  });

  it("awardIncentive rejects when amount exceeds max", async () => {
    selectResultsQueue.push([{ id: 1, code: "SKILL_TECH", name: "技术津贴", maxAmount: "5000.00" }]);
    await expect(
      perfCalibrationRouter.incentive.awardIncentive({
        input: { employeeId: 1, catalogItemId: 1, amount: "9999.00", period: "2026-03", justification: "Over limit" },
        ctx: mockCtx,
      } as any),
    ).rejects.toThrow("Amount exceeds max");
  });

  it("getIncentiveSummary returns type breakdown", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        { award_type: "SKILL_TECH", award_count: 5, total_amount: 10000 },
        { award_type: "PROJ_COMP", award_count: 2, total_amount: 15000 },
      ],
    });
    const result = await perfCalibrationRouter.incentive.getIncentiveSummary({
      input: { period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveLength(2);
  });
});

// ============================================================================
// Sub-Router 8: Dashboard
// ============================================================================

describe("perfCalibration.dashboard", () => {
  it("ceoCockpit returns comprehensive dashboard data", async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ final_grade: "A", cnt: 10 }, { final_grade: "B", cnt: 20 }] })
      .mockResolvedValueOnce({ rows: [{ department: "研发部", headcount: 30, avg_score: 78.5, top_performers: 8 }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 3 }] });
    selectResultsQueue.push([{ id: 1, status: "in_progress" }]); // sessions
    const result = await perfCalibrationRouter.dashboard.ceoCockpit({
      input: { period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("distribution");
    expect(result).toHaveProperty("departments");
    expect(result).toHaveProperty("period", "2026-03");
  });

  it("aiRecommendations returns anomaly list", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        { id: 1, employee_id: 1, employee_name: "张三", department: "研发部", ai_composite_score: 85, ai_grade: "A", final_score: 70, final_grade: "B", gap: 15 },
      ],
    });
    const result = await perfCalibrationRouter.dashboard.aiRecommendations({
      input: { period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("gap", 15);
    expect(result[0].recommendation).toContain("建议复核");
  });
});

// ============================================================================
// Sub-Router 9: Pipeline — Monthly Salary Preparation
// ============================================================================

describe("perfCalibration.pipeline", () => {
  it("getReadinessReport returns step-by-step status", async () => {
    // 7 db.execute calls + 1 for total employees
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ cnt: 30 }] })   // KPI
      .mockResolvedValueOnce({ rows: [{ cnt: 25 }] })   // AEI
      .mockResolvedValueOnce({ rows: [{ cnt: 28 }] })   // Attendance
      .mockResolvedValueOnce({ rows: [{ cnt: 15 }] })   // 360 feedback
      .mockResolvedValueOnce({ rows: [{ cnt: 20, finalized_cnt: 10 }] }) // Composite
      .mockResolvedValueOnce({ rows: [{ cnt: 18, approved_cnt: 5, paid_cnt: 2 }] }) // Payroll
      .mockResolvedValueOnce({ rows: [{ cnt: 35 }] });  // Total employees
    const result = await perfCalibrationRouter.pipeline.getReadinessReport({
      input: { period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("period", "2026-03");
    expect(result).toHaveProperty("totalEmployees", 35);
    expect(result.steps).toHaveLength(8);
    expect(result).toHaveProperty("canProceed");
  });

  it("prepareMonthlySalary triggers composite + payroll batch", async () => {
    mockReturningResult = [{ id: 99 }]; // ai_tasks insert
    const result = await perfCalibrationRouter.pipeline.prepareMonthlySalary({
      input: { period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("payrollTaskId", 99);
    expect(result).toHaveProperty("payrollStatus", "queued");
    expect(result).toHaveProperty("compositeScoring");
  });

  it("getKpiAlignment returns employee alignment data with summary", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          employee_id: 1, employee_name: "张三", department: "研发部",
          score_breakdown_json: JSON.stringify({ kpi: { score: 82 }, aei: { score: 78 } }),
          ai_composite_score: "80.00", ai_grade: "A", final_score: "85.00", final_grade: "A",
          status: "finalized", gross_salary: "15000.00", net_salary: "12000.00",
          performance_bonus: "3000.00", payroll_status: "FINANCE_APPROVED",
        },
      ],
    });
    const result = await perfCalibrationRouter.pipeline.getKpiAlignment({
      input: { period: "2026-03" },
      ctx: mockCtx,
    } as any);
    expect(result).toHaveProperty("period", "2026-03");
    expect(result.employees).toHaveLength(1);
    expect(result.employees[0]).toHaveProperty("kpiScore", 82);
    expect(result.employees[0]).toHaveProperty("hasOverride", true);
    expect(result.summary).toHaveProperty("totalEmployees", 1);
    expect(result.summary).toHaveProperty("overrideCount", 1);
    expect(result.summary).toHaveProperty("totalPerformanceBonus", 3000);
  });
});
