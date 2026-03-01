/**
 * AI Performance Router — Unit Tests
 * Tests 6 procedures: getScores, dashboard, leaderboard, actionItemStats,
 * userDetail, seedDemo
 *
 * Uses both chain pattern (select/insert) AND db.execute(sql`...`) for actionItemStats.
 * Role-scoped: HR/Global roles see all, non-HR see own data only.
 * All procedures wrapped in try/catch returning empty defaults on error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, executeResults } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const executeResults: any[] = [];
  return { selectResultsQueue, executeResults };
});

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      set: vi.fn(() => chain),
      values: vi.fn(() => chain),
      returning: vi.fn(() => {
        return Object.assign(Promise.resolve([{ id: 1 }]), {
          then: (resolve: any) => Promise.resolve([{ id: 1 }]).then(resolve),
          catch: () => Promise.resolve([{ id: 1 }]),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      execute: vi.fn(async () => {
        return executeResults.length > 0 ? executeResults.shift()! : { rows: [] };
      }),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(
    (..._args: any[]) => "sql-tag",
    { raw: vi.fn() },
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  executeResults.length = 0;
});

const caller = () => createAuthenticatedCaller();
const adminCaller = () => createAdminCaller();

const samplePerf = {
  id: 1, userId: 1, userName: "张三", month: "2026-02",
  breadthScore: 80, depthScore: 75, executionScore: 85, disciplineScore: 78,
  meetingScore: 80, totalScore: 80,
  meetingsAttended: 5, meetingsTotal: 7,
  actionItemsCompleted: 8, actionItemsTotal: 10,
};

const sampleActionItem = {
  id: 1, meetingId: 100, assignedTo: 1, assignedToName: "张三",
  taskDesc: "Follow up on motor specs", status: "COMPLETED",
  dueDate: "2026-02-15", completedAt: "2026-02-14",
  createdAt: "2026-02-01",
};

describe("ai-performance router", () => {

  // ═══ getScores ═══
  describe("getScores", () => {
    it("returns scores for own user (default)", async () => {
      selectResultsQueue.push([samplePerf, { ...samplePerf, id: 2, month: "2026-01" }]);
      const result = await caller().aiPerformance.getScores({});
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty when non-HR queries another user", async () => {
      // caller has user.id=1, role=employee → cannot see user 999
      const result = await caller().aiPerformance.getScores({ userId: 999 });
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("admin can see other users", async () => {
      selectResultsQueue.push([{ ...samplePerf, userId: 5 }]);
      const result = await adminCaller().aiPerformance.getScores({ userId: 5 });
      expect(result.items).toHaveLength(1);
    });

    it("returns own data for specific userId matching ctx.user.id", async () => {
      selectResultsQueue.push([samplePerf]);
      const result = await caller().aiPerformance.getScores({ userId: 1 });
      expect(result.items).toHaveLength(1);
    });
  });

  // ═══ dashboard ═══
  describe("dashboard", () => {
    it("returns aggregated dashboard for admin", async () => {
      // latestMonth query
      selectResultsQueue.push([{ month: "2026-02" }]);
      // monthData query
      selectResultsQueue.push([
        { ...samplePerf, meetingScore: 80, actionItemsTotal: 10, actionItemsCompleted: 8 },
        { ...samplePerf, id: 2, userId: 2, userName: "李四", meetingScore: 70, actionItemsTotal: 5, actionItemsCompleted: 4 },
      ]);
      const result = await adminCaller().aiPerformance.dashboard({});
      expect(result.avgMeetingScore).toBe(75); // (80+70)/2
      expect(result.actionItemCompletionRate).toBe(80); // 12/15*100
      expect(result.employeesEvaluated).toBe(2);
      expect(result.topPerformer).toHaveProperty("name", "张三");
      expect(result.topPerformer).toHaveProperty("score", 80);
    });

    it("returns empty when no data", async () => {
      selectResultsQueue.push([]); // no latestMonth
      const result = await adminCaller().aiPerformance.dashboard({});
      expect(result.avgMeetingScore).toBe(0);
      expect(result.topPerformer).toBeNull();
    });

    it("scopes to own data for non-admin", async () => {
      selectResultsQueue.push([{ month: "2026-02" }]);
      selectResultsQueue.push([samplePerf]); // only own data
      const result = await caller().aiPerformance.dashboard({});
      expect(result.employeesEvaluated).toBe(1);
    });
  });

  // ═══ leaderboard ═══
  describe("leaderboard", () => {
    it("returns ranked employees for admin", async () => {
      selectResultsQueue.push([{ month: "2026-02" }]); // latest month
      selectResultsQueue.push([
        { ...samplePerf, meetingScore: 90, userId: 2, userName: "李四" },
        { ...samplePerf, meetingScore: 80 },
      ]);
      const result = await adminCaller().aiPerformance.leaderboard({ limit: 10 });
      expect(result).toHaveLength(2);
      expect(result[0].meetingScore).toBe(90);
      expect(result[0].userName).toBe("李四");
      expect(result[0]).toHaveProperty("breadth");
      expect(result[0]).toHaveProperty("actionItemRate");
    });

    it("returns empty when no month data", async () => {
      selectResultsQueue.push([]); // no data
      const result = await adminCaller().aiPerformance.leaderboard({ limit: 10 });
      expect(result).toEqual([]);
    });

    it("uses specified month", async () => {
      selectResultsQueue.push([samplePerf]);
      const result = await adminCaller().aiPerformance.leaderboard({ limit: 5, month: "2026-01" });
      expect(result).toHaveLength(1);
    });

    it("computes actionItemRate correctly", async () => {
      selectResultsQueue.push([{ month: "2026-02" }]);
      selectResultsQueue.push([{ ...samplePerf, actionItemsTotal: 10, actionItemsCompleted: 7 }]);
      const result = await adminCaller().aiPerformance.leaderboard({ limit: 10 });
      expect(result[0].actionItemRate).toBe(70); // 7/10*100
    });

    it("returns 0 actionItemRate when no items", async () => {
      selectResultsQueue.push([{ month: "2026-02" }]);
      selectResultsQueue.push([{ ...samplePerf, actionItemsTotal: 0, actionItemsCompleted: 0 }]);
      const result = await adminCaller().aiPerformance.leaderboard({ limit: 10 });
      expect(result[0].actionItemRate).toBe(0);
    });

    it("falls back to User#N when userName is null", async () => {
      selectResultsQueue.push([{ month: "2026-02" }]);
      selectResultsQueue.push([{ ...samplePerf, userName: null }]);
      const result = await adminCaller().aiPerformance.leaderboard({ limit: 10 });
      expect(result[0].userName).toBe("User#1");
    });
  });

  // ═══ actionItemStats ═══
  describe("actionItemStats", () => {
    it("returns monthly action item stats", async () => {
      executeResults.push({
        rows: [
          { month: "2026-02", total: 20, completed: 15, overdue: 2 },
          { month: "2026-01", total: 18, completed: 14, overdue: 1 },
        ],
      });
      const result = await caller().aiPerformance.actionItemStats({ months: 6 });
      expect(result).toHaveLength(2);
      // reversed order (earliest first)
      expect(result[0].month).toBe("2026-01");
      expect(result[0].rate).toBe(78); // 14/18*100
      expect(result[1].month).toBe("2026-02");
      expect(result[1].rate).toBe(75); // 15/20*100
    });

    it("returns empty on no data", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().aiPerformance.actionItemStats({ months: 6 });
      expect(result).toEqual([]);
    });

    it("handles missing rows property", async () => {
      executeResults.push({}); // no rows key
      const result = await caller().aiPerformance.actionItemStats({ months: 3 });
      expect(result).toEqual([]);
    });
  });

  // ═══ userDetail ═══
  describe("userDetail", () => {
    it("returns own detail (non-HR)", async () => {
      selectResultsQueue.push([samplePerf]); // history
      selectResultsQueue.push([sampleActionItem]); // actionItems
      const result = await caller().aiPerformance.userDetail({ userId: 1, months: 6 });
      expect(result.history).toHaveLength(1);
      expect(result.actionItems).toHaveLength(1);
    });

    it("blocks non-HR from viewing other users", async () => {
      const result = await caller().aiPerformance.userDetail({ userId: 999, months: 6 });
      expect(result.history).toEqual([]);
      expect(result.actionItems).toEqual([]);
    });

    it("admin can view any user", async () => {
      selectResultsQueue.push([{ ...samplePerf, userId: 5 }]);
      selectResultsQueue.push([{ ...sampleActionItem, assignedTo: 5 }]);
      const result = await adminCaller().aiPerformance.userDetail({ userId: 5, months: 6 });
      expect(result.history).toHaveLength(1);
    });
  });

  // ═══ seedDemo ═══
  describe("seedDemo", () => {
    it("skips when data already exists", async () => {
      selectResultsQueue.push([{ value: 48 }]); // count > 0
      const result = await caller().aiPerformance.seedDemo();
      expect(result.ok).toBe(true);
      expect(result.message).toContain("already exists");
    });

    it("seeds data when empty", async () => {
      selectResultsQueue.push([{ value: 0 }]); // empty
      selectResultsQueue.push([]); // insert perf records
      selectResultsQueue.push([]); // insert action items
      const result = await caller().aiPerformance.seedDemo();
      expect(result.ok).toBe(true);
      expect(result.count).toBe(48); // 8 users × 6 months
      expect(result.actionItems).toBe(40); // 8 users × 5 items
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getScores", async () => {
      await expect(createAnonymousCaller().aiPerformance.getScores({})).rejects.toThrow();
    });
    it("rejects anonymous for dashboard", async () => {
      await expect(createAnonymousCaller().aiPerformance.dashboard({})).rejects.toThrow();
    });
    it("rejects anonymous for leaderboard", async () => {
      await expect(createAnonymousCaller().aiPerformance.leaderboard({ limit: 10 })).rejects.toThrow();
    });
    it("rejects anonymous for actionItemStats", async () => {
      await expect(createAnonymousCaller().aiPerformance.actionItemStats({ months: 6 })).rejects.toThrow();
    });
    it("rejects anonymous for userDetail", async () => {
      await expect(createAnonymousCaller().aiPerformance.userDetail({ userId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for seedDemo", async () => {
      await expect(createAnonymousCaller().aiPerformance.seedDemo()).rejects.toThrow();
    });
  });
});
