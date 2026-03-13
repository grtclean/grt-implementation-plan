/**
 * Battle Arena Router — Unit Tests
 *
 * 3 sub-routers (~16 procedures):
 *   battleReport (6), rankings (6), arena (4)
 *
 * Run: pnpm test -- server/routers/battle-arena.router.test.ts
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
vi.mock("../../drizzle/battle-arena-schema", () => ({
  monthlyBattleReports: {
    id: "id", userId: "user_id", period: "period",
    aiGeneratedSummary: "ai_generated_summary", actualVsTargetKpi: "actual_vs_target_kpi",
    improvementActionPlan: "improvement_action_plan", aiTacticalSuggestions: "ai_tactical_suggestions",
    meetingHighlights: "meeting_highlights", status: "status",
    generationTaskId: "generation_task_id", buCode: "bu_code",
    createdAt: "created_at", updatedAt: "updated_at",
  },
  globalArenaRankings: {
    id: "id", period: "period", entityType: "entity_type",
    entityId: "entity_id", entityName: "entity_name",
    comprehensiveScore: "comprehensive_score", rankPosition: "rank_position",
    totalInCategory: "total_in_category", bonusTier: "bonus_tier",
    scoreBreakdown: "score_breakdown", bonusMultiplier: "bonus_multiplier",
    previousRank: "previous_rank", rankChange: "rank_change",
    buCode: "bu_code", department: "department", createdAt: "created_at",
  },
  arenaEntityTypeEnum: {},
  arenaBonusTierEnum: {},
  battleReportStatusEnum: {},
}));

vi.mock("../../drizzle/schema", () => ({
  users: { id: "id" },
}));

const mockSubmitTask = vi.fn(async () => 42);
vi.mock("../services/task-worker.service", () => ({
  submitTask: (...args: any[]) => mockSubmitTask(...args),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

vi.mock("drizzle-orm", () => ({
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
import { battleArenaRouter } from "./battle-arena.router";

const mockCtx = {
  user: { id: 1, name: "Test User", role: "user", email: "test@test.com" },
  bu: { buId: 1, buCode: "BU_OS", buName: "海外", departmentCode: null },
};

describe("battle-arena.router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = [];
    mockReturningResult = [{ id: 1 }];
    selectResultsQueue.length = 0;
    returningQueue.length = 0;
  });

  // ══════════════════════════════════════════════════════
  // Battle Report
  // ══════════════════════════════════════════════════════

  describe("report", () => {
    it("generate — creates report and triggers task", async () => {
      // Check existing: not found
      selectResultsQueue.push([]);
      // Insert returning
      returningQueue.push([{ id: 10 }]);

      const result = await (battleArenaRouter as any).report.generate({
        input: { userId: 1, period: "2026-03" },
        ctx: mockCtx,
      });
      expect(result.reportId).toBe(10);
      expect(result.taskId).toBe(42);
      expect(result.status).toBe("generating");
    });

    it("generate — returns existing if already exists", async () => {
      selectResultsQueue.push([{ id: 5 }]);
      const result = await (battleArenaRouter as any).report.generate({
        input: { userId: 1, period: "2026-03" },
        ctx: mockCtx,
      });
      expect(result.reportId).toBe(5);
      expect(result.status).toBe("already_exists");
    });

    it("getMyReport — returns user's report", async () => {
      const report = { id: 1, userId: 1, period: "2026-03", status: "ai_draft" };
      selectResultsQueue.push([report]);
      const result = await (battleArenaRouter as any).report.getMyReport({
        input: { period: "2026-03" },
        ctx: mockCtx,
      });
      expect(result.period).toBe("2026-03");
    });

    it("getMyReport — returns null if not found", async () => {
      selectResultsQueue.push([]);
      const result = await (battleArenaRouter as any).report.getMyReport({
        input: { period: "2026-01" },
        ctx: mockCtx,
      });
      expect(result).toBeNull();
    });

    it("submitPlan — updates improvement plan", async () => {
      returningQueue.push([{ id: 1, status: "user_submitted", improvementActionPlan: "Plan X" }]);
      const result = await (battleArenaRouter as any).report.submitPlan({
        input: { reportId: 1, improvementActionPlan: "Plan X" },
        ctx: mockCtx,
      });
      expect(result.status).toBe("user_submitted");
    });

    it("getByUser — returns report by userId+period", async () => {
      selectResultsQueue.push([{ id: 3, userId: 5, period: "2026-03" }]);
      const result = await (battleArenaRouter as any).report.getByUser({
        input: { userId: 5, period: "2026-03" },
        ctx: mockCtx,
      });
      expect(result.userId).toBe(5);
    });

    it("listByPeriod — returns all reports for period", async () => {
      selectResultsQueue.push([
        { id: 1, period: "2026-03" },
        { id: 2, period: "2026-03" },
      ]);
      const result = await (battleArenaRouter as any).report.listByPeriod({
        input: { period: "2026-03" },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
    });

    it("lockReport — locks report", async () => {
      returningQueue.push([{ id: 1, status: "locked" }]);
      const result = await (battleArenaRouter as any).report.lockReport({
        input: { reportId: 1 },
        ctx: mockCtx,
      });
      expect(result.status).toBe("locked");
    });
  });

  // ══════════════════════════════════════════════════════
  // Rankings
  // ══════════════════════════════════════════════════════

  describe("rankings", () => {
    it("computeRankings — triggers async computation", async () => {
      const result = await (battleArenaRouter as any).rankings.computeRankings({
        input: { period: "2026-03" },
        ctx: mockCtx,
      });
      expect(result.taskId).toBe(42);
      expect(result.status).toBe("computing");
    });

    it("getLeaderboard — returns ranked entities", async () => {
      const rankings = [
        { entityName: "Alice", rankPosition: 1, bonusTier: "S", comprehensiveScore: "95.00" },
        { entityName: "Bob", rankPosition: 2, bonusTier: "A", comprehensiveScore: "82.50" },
      ];
      selectResultsQueue.push(rankings);
      const result = await (battleArenaRouter as any).rankings.getLeaderboard({
        input: { period: "2026-03", entityType: "SALES" },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
      expect(result[0].bonusTier).toBe("S");
    });

    it("getMyRank — returns user's ranking", async () => {
      selectResultsQueue.push([{ entityId: 1, rankPosition: 5, bonusTier: "A" }]);
      const result = await (battleArenaRouter as any).rankings.getMyRank({
        input: { period: "2026-03" },
        ctx: mockCtx,
      });
      expect(result[0].rankPosition).toBe(5);
    });

    it("getBonusGapChart — returns top/bottom with gap", async () => {
      selectResultsQueue.push([
        { entityName: "Top1", bonusMultiplier: "3.00", rankPosition: 1 },
      ]);
      selectResultsQueue.push([
        { entityName: "Bottom1", bonusMultiplier: "0.50", rankPosition: 20 },
      ]);
      const result = await (battleArenaRouter as any).rankings.getBonusGapChart({
        input: { period: "2026-03", entityType: "SALES" },
        ctx: mockCtx,
      });
      expect(result.gapMultiplier).toBe("6x");
      expect(result.topMultiplier).toBe(3);
    });

    it("getEntityDetail — returns single entity detail", async () => {
      selectResultsQueue.push([{ entityId: 5, scoreBreakdown: { kpiScore: 90 } }]);
      const result = await (battleArenaRouter as any).rankings.getEntityDetail({
        input: { period: "2026-03", entityType: "SALES", entityId: 5 },
        ctx: mockCtx,
      });
      expect(result.entityId).toBe(5);
    });

    it("getRankHistory — returns history across periods", async () => {
      selectResultsQueue.push([
        { period: "2026-03", rankPosition: 3, bonusTier: "A" },
        { period: "2026-02", rankPosition: 5, bonusTier: "B" },
      ]);
      const result = await (battleArenaRouter as any).rankings.getRankHistory({
        input: { entityId: 1, entityType: "SALES" },
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
    });
  });

  // ══════════════════════════════════════════════════════
  // Arena
  // ══════════════════════════════════════════════════════

  describe("arena", () => {
    it("getWarRoomData — returns grouped boards + tier counts", async () => {
      selectResultsQueue.push([
        { entityType: "SALES", entityName: "A", rankPosition: 1, bonusTier: "S" },
        { entityType: "SALES", entityName: "B", rankPosition: 2, bonusTier: "A" },
        { entityType: "ENGINEER", entityName: "C", rankPosition: 1, bonusTier: "S" },
      ]);
      const result = await (battleArenaRouter as any).arena.getWarRoomData({
        input: { period: "2026-03" },
        ctx: mockCtx,
      });
      expect(result.boards.SALES).toHaveLength(2);
      expect(result.boards.ENGINEER).toHaveLength(1);
      expect(result.tierCounts.S).toBe(2);
      expect(result.totalEntities).toBe(3);
    });

    it("getArenaOverview — returns stats", async () => {
      selectResultsQueue.push([{ totalRankings: 50 }]);
      selectResultsQueue.push([{ totalReports: 30 }]);
      const result = await (battleArenaRouter as any).arena.getArenaOverview({
        input: { period: "2026-03" },
        ctx: mockCtx,
      });
      expect(result.totalRankings).toBe(50);
      expect(result.totalReports).toBe(30);
    });

    it("getEntityTypes — returns 4 categories", async () => {
      const result = await (battleArenaRouter as any).arena.getEntityTypes({
        input: undefined,
        ctx: mockCtx,
      });
      expect(result).toHaveLength(4);
      expect(result[0].type).toBe("SALES");
    });

    it("getPeriods — returns available periods", async () => {
      mockDb.execute.mockResolvedValueOnce({ rows: [{ period: "2026-03" }, { period: "2026-02" }] });
      const result = await (battleArenaRouter as any).arena.getPeriods({
        input: undefined,
        ctx: mockCtx,
      });
      expect(result).toHaveLength(2);
    });
  });
});
