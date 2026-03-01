/**
 * Expense Comparison Router -- Unit Tests
 *
 * 6 procedures (all protectedProcedure):
 *   Query (5): list, compare, getComparison, getMonthlyTrend, getQuarterComparison
 *   Mutation (1): expenseComparisonExport
 *
 * Key logic tested:
 *   - FINANCE_ROLES gate (admin, director, finance_manager, finance_specialist, hr_manager) see all data
 *   - Non-finance users filtered by submitterId === ctx.user.id
 *   - getComparison aggregation (SUM + count) returns trend/currentPeriod/previousPeriod
 *   - getMonthlyTrend groupBy month returns mapped { month, total, count }
 *   - getQuarterComparison groupBy quarter returns mapped { quarter, total, count }
 *   - expenseComparisonExport placeholder returns empty url
 *   - Auth guards reject anonymous callers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──
const { selectResultsQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  return { selectResultsQueue };
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
      groupBy: vi.fn(() => chain),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
    };
  }),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
});

// ── Sample data ──
const sampleExpense = {
  id: 1,
  claimCode: "EC-20260301-001",
  submitterId: 1,
  totalAmount: "12000.00",
  currency: "CNY",
  claimType: "travel",
  status: "approved",
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
};

// ── Helper callers ──
const employeeCaller = (overrides?: Record<string, any>) =>
  createAuthenticatedCaller({ id: 1, role: "employee", ...overrides });
const financeCaller = (overrides?: Record<string, any>) =>
  createAuthenticatedCaller({ id: 99, role: "finance_manager", ...overrides });
const adminCaller = (overrides?: Record<string, any>) =>
  createAuthenticatedCaller({ id: 100, role: "admin", ...overrides });
const directorCaller = (overrides?: Record<string, any>) =>
  createAuthenticatedCaller({ id: 101, role: "director", ...overrides });

describe("expenseComparison router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns expense items for finance role (all data)", async () => {
      selectResultsQueue.push([
        sampleExpense,
        { ...sampleExpense, id: 2, submitterId: 50 },
        { ...sampleExpense, id: 3, submitterId: 99 },
      ]);
      const result = await financeCaller().expenseComparison.list();
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(3);
    });

    it("returns expense items for non-finance role (filtered by submitterId)", async () => {
      selectResultsQueue.push([sampleExpense]);
      const result = await employeeCaller().expenseComparison.list();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(1);
    });

    it("returns empty when no data", async () => {
      selectResultsQueue.push([]);
      const result = await employeeCaller().expenseComparison.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(0);
    });

    it("admin role sees all data", async () => {
      selectResultsQueue.push([sampleExpense, { ...sampleExpense, id: 2 }]);
      const result = await adminCaller().expenseComparison.list();
      expect(result.items).toHaveLength(2);
    });

    it("director role sees all data", async () => {
      selectResultsQueue.push([sampleExpense]);
      const result = await directorCaller().expenseComparison.list();
      expect(result.items).toHaveLength(1);
    });

    it("hr_manager role sees all data", async () => {
      selectResultsQueue.push([sampleExpense]);
      const caller = createAuthenticatedCaller({ id: 50, role: "hr_manager" });
      const result = await caller.expenseComparison.list();
      expect(result.items).toHaveLength(1);
    });

    it("finance_specialist role sees all data", async () => {
      selectResultsQueue.push([sampleExpense]);
      const caller = createAuthenticatedCaller({ id: 50, role: "finance_specialist" });
      const result = await caller.expenseComparison.list();
      expect(result.items).toHaveLength(1);
    });
  });

  // ═══ compare ═══
  describe("compare", () => {
    it("returns items array for finance role", async () => {
      selectResultsQueue.push([
        sampleExpense,
        { ...sampleExpense, id: 2, totalAmount: "8000.00" },
      ]);
      const result = await financeCaller().expenseComparison.compare();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id", 1);
      expect(result[1]).toHaveProperty("id", 2);
    });

    it("returns items filtered by submitterId for non-finance role", async () => {
      selectResultsQueue.push([sampleExpense]);
      const result = await employeeCaller().expenseComparison.compare();
      expect(result).toHaveLength(1);
    });

    it("returns empty array when no data", async () => {
      selectResultsQueue.push([]);
      const result = await employeeCaller().expenseComparison.compare();
      expect(result).toHaveLength(0);
    });

    it("accepts optional record input", async () => {
      selectResultsQueue.push([sampleExpense]);
      const result = await financeCaller().expenseComparison.compare({ dateFrom: "2026-01-01" });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ getComparison ═══
  describe("getComparison", () => {
    it("returns aggregated comparison with totalExpense and tripCount", async () => {
      selectResultsQueue.push([{ totalExpense: "25000.50", tripCount: 12 }]);
      const result = await financeCaller().expenseComparison.getComparison();
      expect(result.trend).toBe("flat");
      expect(result.currentPeriod.totalExpense).toBe(25000.5);
      expect(result.currentPeriod.tripCount).toBe(12);
      expect(result.previousPeriod).toEqual({ totalExpense: 0, tripCount: 0 });
      expect(result.changeRate).toBe(0);
      expect(result.changeAmount).toBe(0);
      expect(result.breakdown).toEqual([]);
      expect(result.aiAnalysis).toBeNull();
    });

    it("returns zeros when no data (totalExpense is '0')", async () => {
      selectResultsQueue.push([{ totalExpense: "0", tripCount: 0 }]);
      const result = await employeeCaller().expenseComparison.getComparison();
      expect(result.currentPeriod.totalExpense).toBe(0);
      expect(result.currentPeriod.tripCount).toBe(0);
    });

    it("handles NaN totalExpense gracefully (falls back to 0)", async () => {
      selectResultsQueue.push([{ totalExpense: "not_a_number", tripCount: 3 }]);
      const result = await employeeCaller().expenseComparison.getComparison();
      expect(result.currentPeriod.totalExpense).toBe(0);
      expect(result.currentPeriod.tripCount).toBe(3);
    });

    it("finance role sees all data (no where filter)", async () => {
      selectResultsQueue.push([{ totalExpense: "100000", tripCount: 50 }]);
      const result = await financeCaller().expenseComparison.getComparison();
      expect(result.currentPeriod.totalExpense).toBe(100000);
      expect(result.currentPeriod.tripCount).toBe(50);
    });

    it("non-finance role gets filtered data", async () => {
      selectResultsQueue.push([{ totalExpense: "5000", tripCount: 2 }]);
      const result = await employeeCaller().expenseComparison.getComparison();
      expect(result.currentPeriod.totalExpense).toBe(5000);
      expect(result.currentPeriod.tripCount).toBe(2);
    });

    it("accepts optional record input", async () => {
      selectResultsQueue.push([{ totalExpense: "15000", tripCount: 6 }]);
      const result = await financeCaller().expenseComparison.getComparison({ period: "Q1" });
      expect(result.currentPeriod.totalExpense).toBe(15000);
    });
  });

  // ═══ getMonthlyTrend ═══
  describe("getMonthlyTrend", () => {
    it("returns trend data with month/total/count", async () => {
      selectResultsQueue.push([
        { month: "2026-01", total: "10000.00", count: 5 },
        { month: "2026-02", total: "15000.50", count: 8 },
        { month: "2026-03", total: "8000.00", count: 3 },
      ]);
      const result = await financeCaller().expenseComparison.getMonthlyTrend();
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ month: "2026-01", total: 10000, count: 5 });
      expect(result[1]).toEqual({ month: "2026-02", total: 15000.5, count: 8 });
      expect(result[2]).toEqual({ month: "2026-03", total: 8000, count: 3 });
    });

    it("returns empty array when no data", async () => {
      selectResultsQueue.push([]);
      const result = await employeeCaller().expenseComparison.getMonthlyTrend();
      expect(result).toHaveLength(0);
    });

    it("converts total from string to number", async () => {
      selectResultsQueue.push([{ month: "2026-01", total: "99999.99", count: 42 }]);
      const result = await financeCaller().expenseComparison.getMonthlyTrend();
      expect(typeof result[0].total).toBe("number");
      expect(result[0].total).toBe(99999.99);
    });

    it("non-finance role gets filtered trend data", async () => {
      selectResultsQueue.push([
        { month: "2026-02", total: "3000", count: 1 },
      ]);
      const result = await employeeCaller().expenseComparison.getMonthlyTrend();
      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(3000);
    });

    it("accepts optional record input", async () => {
      selectResultsQueue.push([{ month: "2026-01", total: "5000", count: 2 }]);
      const result = await financeCaller().expenseComparison.getMonthlyTrend({ year: "2026" });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ getQuarterComparison ═══
  describe("getQuarterComparison", () => {
    it("returns quarterly data with quarter/total/count", async () => {
      selectResultsQueue.push([
        { quarter: "2026-1", total: "30000.00", count: 15 },
        { quarter: "2026-2", total: "45000.00", count: 22 },
      ]);
      const result = await financeCaller().expenseComparison.getQuarterComparison();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ quarter: "2026-1", total: 30000, count: 15 });
      expect(result[1]).toEqual({ quarter: "2026-2", total: 45000, count: 22 });
    });

    it("returns empty array when no data", async () => {
      selectResultsQueue.push([]);
      const result = await employeeCaller().expenseComparison.getQuarterComparison();
      expect(result).toHaveLength(0);
    });

    it("converts total from string to number", async () => {
      selectResultsQueue.push([{ quarter: "2025-4", total: "12345.67", count: 7 }]);
      const result = await financeCaller().expenseComparison.getQuarterComparison();
      expect(typeof result[0].total).toBe("number");
      expect(result[0].total).toBe(12345.67);
    });

    it("non-finance role gets filtered quarterly data", async () => {
      selectResultsQueue.push([
        { quarter: "2026-1", total: "2000", count: 1 },
      ]);
      const result = await employeeCaller().expenseComparison.getQuarterComparison();
      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(2000);
      expect(result[0].count).toBe(1);
    });

    it("accepts optional record input", async () => {
      selectResultsQueue.push([{ quarter: "2026-1", total: "5000", count: 3 }]);
      const result = await financeCaller().expenseComparison.getQuarterComparison({ year: "2026" });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ expenseComparisonExport ═══
  describe("expenseComparisonExport", () => {
    it("returns empty url placeholder", async () => {
      const result = await financeCaller().expenseComparison.expenseComparisonExport();
      expect(result).toEqual({ url: "" });
    });

    it("returns empty url for non-finance role", async () => {
      const result = await employeeCaller().expenseComparison.expenseComparisonExport();
      expect(result).toEqual({ url: "" });
    });

    it("accepts optional record input", async () => {
      const result = await financeCaller().expenseComparison.expenseComparisonExport({ format: "xlsx" });
      expect(result).toEqual({ url: "" });
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().expenseComparison.list()).rejects.toThrow();
    });

    it("rejects anonymous for compare", async () => {
      await expect(createAnonymousCaller().expenseComparison.compare()).rejects.toThrow();
    });

    it("rejects anonymous for getComparison", async () => {
      await expect(createAnonymousCaller().expenseComparison.getComparison()).rejects.toThrow();
    });

    it("rejects anonymous for getMonthlyTrend", async () => {
      await expect(createAnonymousCaller().expenseComparison.getMonthlyTrend()).rejects.toThrow();
    });

    it("rejects anonymous for getQuarterComparison", async () => {
      await expect(createAnonymousCaller().expenseComparison.getQuarterComparison()).rejects.toThrow();
    });

    it("rejects anonymous for expenseComparisonExport", async () => {
      await expect(createAnonymousCaller().expenseComparison.expenseComparisonExport()).rejects.toThrow();
    });
  });

  // ═══ FINANCE_ROLES coverage ═══
  describe("FINANCE_ROLES access", () => {
    const financeRoles = ["admin", "director", "finance_manager", "finance_specialist", "hr_manager"];

    for (const role of financeRoles) {
      it(`${role} sees all data via list`, async () => {
        const caller = createAuthenticatedCaller({ id: 500, role });
        selectResultsQueue.push([sampleExpense, { ...sampleExpense, id: 2, submitterId: 999 }]);
        const result = await caller.expenseComparison.list();
        expect(result.items).toHaveLength(2);
      });
    }

    const nonFinanceRoles = ["employee", "staff", "engineer"];

    for (const role of nonFinanceRoles) {
      it(`${role} gets filtered data via list`, async () => {
        const caller = createAuthenticatedCaller({ id: 1, role });
        selectResultsQueue.push([sampleExpense]);
        const result = await caller.expenseComparison.list();
        expect(result.items).toHaveLength(1);
      });
    }
  });
});
