/**
 * Travel Dashboard Router — Unit Tests
 * Tests 1 procedure: getData
 *
 * Role-based access: TRAVEL_ADMIN_ROLES see all data, others filtered by employeeId.
 * Does 3 sequential queries: records, count, budget aggregation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue } = vi.hoisted(() => ({
  selectResultsQueue: [] as any[][],
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
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

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

const sampleRecords = [
  { id: 1, employeeId: 1, destination: "上海", totalBudget: "5000", actualExpense: "4200", createdAt: "2026-02-01" },
  { id: 2, employeeId: 1, destination: "北京", totalBudget: "8000", actualExpense: "7500", createdAt: "2026-02-15" },
];

describe("travel-dashboard router", () => {

  describe("getData", () => {
    it("returns travel data with records and aggregates", async () => {
      selectResultsQueue.push(sampleRecords);                    // records
      selectResultsQueue.push([{ count: 2 }]);                   // total count
      selectResultsQueue.push([{ totalBudget: "13000", totalExpense: "11700" }]); // budget
      const result = await caller().travelDashboard.getData();
      expect(result.data.records).toHaveLength(2);
      expect(result.data.totalTrips).toBe(2);
      expect(result.data.totalBudget).toBe(13000);
      expect(result.data.totalExpense).toBe(11700);
    });

    it("returns zeros when no records", async () => {
      selectResultsQueue.push([]);                               // records
      selectResultsQueue.push([{ count: 0 }]);                   // total
      selectResultsQueue.push([{ totalBudget: "0", totalExpense: "0" }]); // budget
      const result = await caller().travelDashboard.getData();
      expect(result.data.records).toEqual([]);
      expect(result.data.totalTrips).toBe(0);
      expect(result.data.totalBudget).toBe(0);
      expect(result.data.totalExpense).toBe(0);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for getData", async () => {
      await expect(createAnonymousCaller().travelDashboard.getData()).rejects.toThrow();
    });
  });
});
