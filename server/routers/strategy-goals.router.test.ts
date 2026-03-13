/**
 * Strategy Goals Router — Unit Tests
 * Tests 6 procedures: getCompanyGoals, getDivisionKpis, getDashboard,
 * updateDivisionKpi, decomposeToBuPlans, seedDemo
 *
 * IMPORTANT: This router has module-level state (tablesEnsured, seeded).
 * After the very first procedure call:
 *   - ensureTables() runs db.execute() twice → sets tablesEnsured=true
 *   - seedIfEmpty() sets seeded=true then does count check → shifts 1 queue entry
 * After that, ensureTables/seedIfEmpty are no-ops for ALL subsequent tests.
 * EXCEPT seedDemo which resets seeded=false.
 *
 * Queue consumption per operation:
 *   - db.select().from().where() awaited → shifts 1
 *   - db.delete().where() awaited → shifts 1
 *   - db.insert().values() (no .returning()) awaited → shifts 1
 *   - db.update().set().where() (no .returning()) awaited → shifts 1
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──
const { selectResultsQueue, mockReturningResult } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const mockReturningResult: any[] = [];
  return { selectResultsQueue, mockReturningResult };
});

// Mock DB
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
        const r = mockReturningResult.length > 0 ? [...mockReturningResult] : [{ id: 1 }];
        mockReturningResult.length = 0;
        return Object.assign(Promise.resolve(r), {
          then: (resolve: any) => Promise.resolve(r).then(resolve),
          catch: () => Promise.resolve(r),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };

    const db: any = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      execute: vi.fn(async () => ({})),
    };
    return db;
  }),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

// Mock BU context middleware (all 3 exports)
vi.mock("../_core/gateway-bu-context.middleware", () => ({
  buContextMiddleware: vi.fn((opts: any) => opts.next({ ctx: opts.ctx })),
  requireBuScope: vi.fn(() => vi.fn((opts: any) => opts.next({ ctx: opts.ctx }))),
  buScopeCondition: vi.fn(() => null),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  mockReturningResult.length = 0;
});

const caller = () => createAdminCaller();

// ── Sample data ──
const sampleGoal = {
  id: 1, year: 2026, metricName: "制造事业部营收",
  metricNameEn: "Manufacturing Division Revenue",
  targetValue: 280000000, currentValue: 68000000,
  unit: "CNY", weight: 0.30, category: "revenue",
  status: "active", createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

const sampleKpi = {
  id: 1, companyGoalId: 1, divisionName: "海外事业部",
  divisionCode: "BU1", managerName: "张海涛",
  metricName: "事业部营收", metricNameEn: "Division Revenue",
  targetValue: 85000000, currentValue: 22000000,
  unit: "CNY", weight: 0.30, evaluationCriteria: "全年营收",
  ragStatus: "A", completionPct: 25.9, year: 2026,
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

describe("strategy-goals router", () => {

  // ═══ getCompanyGoals ═══
  // FIRST test in suite: ensureTables runs (2 db.execute), seedIfEmpty runs (1 count check)
  describe("getCompanyGoals", () => {
    it("returns company goals for a year", async () => {
      // seedIfEmpty count check (first call only — sets seeded=true after this)
      selectResultsQueue.push([{ value: 6 }]);
      // Actual query
      selectResultsQueue.push([sampleGoal, { ...sampleGoal, id: 2, metricName: "FAT一次通过率" }]);
      const result = await caller().strategyGoals.getCompanyGoals({ year: 2026 });
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it("uses default year 2026", async () => {
      // seeded=true from previous test → seedIfEmpty is no-op
      selectResultsQueue.push([sampleGoal]);
      const result = await caller().strategyGoals.getCompanyGoals({});
      expect(result).toHaveLength(1);
    });
  });

  // ═══ getDivisionKpis ═══
  describe("getDivisionKpis", () => {
    it("returns KPIs for a year", async () => {
      selectResultsQueue.push([sampleKpi, { ...sampleKpi, id: 2 }]);
      const result = await caller().strategyGoals.getDivisionKpis({ year: 2026 });
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it("filters by divisionCode", async () => {
      selectResultsQueue.push([sampleKpi]);
      const result = await caller().strategyGoals.getDivisionKpis({
        year: 2026, divisionCode: "BU1",
      });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ getDashboard ═══
  describe("getDashboard", () => {
    it("returns complete dashboard view", async () => {
      // goals query
      selectResultsQueue.push([
        { ...sampleGoal, id: 1, targetValue: 100, currentValue: 80, weight: 0.5, category: "revenue", unit: "CNY" },
        { ...sampleGoal, id: 2, targetValue: 500, currentValue: 600, weight: 0.5, category: "quality", unit: "DPPM" },
      ]);
      // allKpis query
      selectResultsQueue.push([
        { ...sampleKpi, divisionCode: "BU1", ragStatus: "G", completionPct: 90, weight: 0.5 },
        { ...sampleKpi, id: 2, divisionCode: "BU1", ragStatus: "A", completionPct: 70, weight: 0.5 },
        { ...sampleKpi, id: 3, divisionCode: "BU2", divisionName: "商用车事业部", managerName: "王志强", ragStatus: "R", completionPct: 50, weight: 1.0 },
      ]);

      const result = await caller().strategyGoals.getDashboard({ year: 2026 });

      expect(result).toHaveProperty("companyGoals");
      expect(result.companyGoals).toHaveLength(2);
      expect(result).toHaveProperty("divisionSummary");
      expect(result.divisionSummary).toHaveLength(2); // BU1 and BU2
      expect(result).toHaveProperty("overallProgress");
      expect(typeof result.overallProgress).toBe("number");
      expect(result).toHaveProperty("aiAlignment");
      expect(result.aiAlignment).toHaveProperty("totalKpis", 3);
      expect(result.aiAlignment).toHaveProperty("green", 1);
      expect(result.aiAlignment).toHaveProperty("amber", 1);
      expect(result.aiAlignment).toHaveProperty("red", 1);
    });

    it("computes division weighted scores correctly", async () => {
      selectResultsQueue.push([sampleGoal]); // goals
      selectResultsQueue.push([
        { ...sampleKpi, divisionCode: "BU1", completionPct: 100, weight: 0.6, ragStatus: "G" },
        { ...sampleKpi, id: 2, divisionCode: "BU1", completionPct: 50, weight: 0.4, ragStatus: "A" },
      ]);

      const result = await caller().strategyGoals.getDashboard({ year: 2026 });
      const bu1 = result.divisionSummary.find((d: any) => d.divisionCode === "BU1");
      expect(bu1).toBeTruthy();
      // weightedScore = (100*0.6 + 50*0.4) / (0.6+0.4) = 80
      expect(bu1.weightedScore).toBe(80);
      expect(bu1.ragCounts).toEqual({ R: 0, A: 1, G: 1 });
    });

    it("returns 0 overall progress with no goals", async () => {
      selectResultsQueue.push([]); // goals: empty
      selectResultsQueue.push([]); // kpis: empty
      const result = await caller().strategyGoals.getDashboard({ year: 2025 });
      expect(result.overallProgress).toBe(0);
      expect(result.aiAlignment.totalKpis).toBe(0);
    });

    it("handles DPPM (lower-is-better) metric correctly", async () => {
      selectResultsQueue.push([
        { ...sampleGoal, targetValue: 500, currentValue: 400, weight: 1.0, category: "quality", unit: "DPPM" },
      ]);
      selectResultsQueue.push([]); // no kpis

      const result = await caller().strategyGoals.getDashboard({ year: 2026 });
      // DPPM: lower is better → pct = target / current * 100 = 500/400*100 = 125 → capped at 100
      // overallProgress = 100 * 1.0 / 1.0 = 100
      expect(result.overallProgress).toBe(100);
    });

    it("caps normal metrics at 100%", async () => {
      selectResultsQueue.push([
        { ...sampleGoal, targetValue: 100, currentValue: 150, weight: 1.0, category: "revenue", unit: "CNY" },
      ]);
      selectResultsQueue.push([]);
      const result = await caller().strategyGoals.getDashboard({ year: 2026 });
      expect(result.overallProgress).toBe(100);
    });

    it("computes syncPct correctly", async () => {
      selectResultsQueue.push([sampleGoal]);
      selectResultsQueue.push([
        { ...sampleKpi, ragStatus: "G" },
        { ...sampleKpi, id: 2, ragStatus: "G" },
        { ...sampleKpi, id: 3, ragStatus: "A" },
        { ...sampleKpi, id: 4, ragStatus: "R" },
      ]);
      const result = await caller().strategyGoals.getDashboard({ year: 2026 });
      // syncPct = round(green/total * 1000) / 10 = round(2/4*1000)/10 = 50.0
      expect(result.aiAlignment.syncPct).toBe(50);
    });
  });

  // ═══ updateDivisionKpi ═══
  describe("updateDivisionKpi", () => {
    it("updates currentValue", async () => {
      // update().set().where() is awaited → shifts 1 entry
      selectResultsQueue.push([]); // consumed by update chain
      const result = await caller().strategyGoals.updateDivisionKpi({
        id: 1, currentValue: 50000000,
      });
      expect(result).toEqual({ success: true });
    });

    it("updates ragStatus", async () => {
      selectResultsQueue.push([]);
      const result = await caller().strategyGoals.updateDivisionKpi({
        id: 1, ragStatus: "R",
      });
      expect(result).toEqual({ success: true });
    });

    it("updates completionPct", async () => {
      selectResultsQueue.push([]);
      const result = await caller().strategyGoals.updateDivisionKpi({
        id: 1, completionPct: 75.5,
      });
      expect(result).toEqual({ success: true });
    });

    it("rejects invalid ragStatus", async () => {
      await expect(caller().strategyGoals.updateDivisionKpi({
        id: 1, ragStatus: "X" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ decomposeToBuPlans ═══
  describe("decomposeToBuPlans", () => {
    it("creates BU sales plans from revenue KPIs", async () => {
      // select revenue KPIs
      selectResultsQueue.push([
        { ...sampleKpi, divisionCode: "BU1", targetValue: 85000000, weight: 0.30, metricName: "事业部营收" },
      ]);
      // check existing plan for BU1 → none
      selectResultsQueue.push([]);
      // insert plan returns via .returning()
      mockReturningResult.push({ id: 10 });
      // insert monthly details → shifts 1
      selectResultsQueue.push([]);
      const result = await caller().strategyGoals.decomposeToBuPlans({ year: 2026 });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("created", 1);
    });

    it("skips BUs with existing plans", async () => {
      selectResultsQueue.push([
        { ...sampleKpi, divisionCode: "BU1", targetValue: 85000000, metricName: "事业部营收" },
      ]);
      selectResultsQueue.push([{ id: 99 }]); // existing plan for BU1
      const result = await caller().strategyGoals.decomposeToBuPlans({ year: 2026 });
      expect(result.created).toBe(0);
    });

    it("returns failure when no revenue KPIs found", async () => {
      selectResultsQueue.push([]); // no revenue KPIs
      const result = await caller().strategyGoals.decomposeToBuPlans({ year: 2026 });
      expect(result.success).toBe(false);
      expect(result.created).toBe(0);
    });

    it("accepts custom growth rules", async () => {
      selectResultsQueue.push([]); // no KPIs
      const result = await caller().strategyGoals.decomposeToBuPlans({
        year: 2026,
        growthRules: { Q2_vs_Q1: 0.3, Q3_vs_Q2: 0.1, Q4_vs_Q3: 0.05 },
      });
      expect(result.success).toBe(false);
    });
  });

  // ═══ seedDemo ═══
  describe("seedDemo", () => {
    it("reseeds data and returns success", async () => {
      // delete divisionKpis → shifts 1
      selectResultsQueue.push([]);
      // delete companyGoals → shifts 1
      selectResultsQueue.push([]);
      // seedIfEmpty count check (seeded was reset to false by seedDemo)
      selectResultsQueue.push([{ value: 0 }]);
      // seed: insert companyGoals → shifts 1
      selectResultsQueue.push([]);
      // seed: select goals for FK mapping → shifts 1
      selectResultsQueue.push([
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 },
      ]);
      // seed: insert divisionKpis → shifts 1
      selectResultsQueue.push([]);
      const result = await caller().strategyGoals.seedDemo();
      expect(result).toHaveProperty("success", true);
      expect(result.message).toContain("6 company goals");
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getCompanyGoals", async () => {
      await expect(createAnonymousCaller().strategyGoals.getCompanyGoals({ year: 2026 })).rejects.toThrow();
    });
    it("rejects anonymous for getDivisionKpis", async () => {
      await expect(createAnonymousCaller().strategyGoals.getDivisionKpis({ year: 2026 })).rejects.toThrow();
    });
    it("rejects anonymous for getDashboard", async () => {
      await expect(createAnonymousCaller().strategyGoals.getDashboard({ year: 2026 })).rejects.toThrow();
    });
    it("rejects anonymous for updateDivisionKpi", async () => {
      await expect(createAnonymousCaller().strategyGoals.updateDivisionKpi({
        id: 1, currentValue: 100,
      })).rejects.toThrow();
    });
    it("rejects anonymous for decomposeToBuPlans", async () => {
      await expect(createAnonymousCaller().strategyGoals.decomposeToBuPlans({
        year: 2026,
      })).rejects.toThrow();
    });
    it("rejects anonymous for seedDemo", async () => {
      await expect(createAnonymousCaller().strategyGoals.seedDemo()).rejects.toThrow();
    });
  });
});
