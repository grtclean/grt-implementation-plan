/**
 * Lead Analytics Router — Unit Tests
 * Tests 11 procedures: list, getById, getAnalytics, getConversionRate,
 *   getSourceDistribution, create, update, delete, getFunnelData,
 *   getTrendData, getSourceAnalysis, getSalesPerformance
 *
 * BU-scoped via buScopeCondition. Client-side aggregation on fetched leads.
 * Stub CRUD (create/update/delete) return static success messages.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  return { selectResultsQueue };
});

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
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
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

vi.mock("../_core/gateway-bu-context.middleware", () => ({
  buScopeCondition: vi.fn(() => null),
  buContextMiddleware: vi.fn(async ({ ctx, next }: any) => next({ ctx })),
  requireBuScope: vi.fn(() => vi.fn(async ({ ctx, next }: any) => next({ ctx }))),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleLeads = [
  { id: 1, status: "new", source: "website", priority: "high", aiConfidenceScore: 80, buCode: "BU1" },
  { id: 2, status: "contacted", source: "exhibition", priority: "medium", aiConfidenceScore: 60, buCode: "BU1" },
  { id: 3, status: "converted", source: "website", priority: "high", aiConfidenceScore: 90, buCode: "BU1" },
  { id: 4, status: "qualified", source: "referral", priority: "low", aiConfidenceScore: 40, buCode: "BU2" },
];

describe("lead-analytics router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns all leads", async () => {
      selectResultsQueue.push(sampleLeads);
      const result = await caller().leadAnalytics.list();
      expect(result.items).toHaveLength(4);
      expect(result.total).toBe(4);
    });

    it("filters by status", async () => {
      selectResultsQueue.push(sampleLeads);
      const result = await caller().leadAnalytics.list({ status: "new" });
      expect(result.items).toHaveLength(1);
    });

    it("filters by priority", async () => {
      selectResultsQueue.push(sampleLeads);
      const result = await caller().leadAnalytics.list({ priority: "high" });
      expect(result.items).toHaveLength(2);
    });

    it("returns empty when no matches", async () => {
      selectResultsQueue.push([]);
      const result = await caller().leadAnalytics.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns lead by numeric id", async () => {
      selectResultsQueue.push([sampleLeads[0]]);
      const result = await caller().leadAnalytics.getById({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.status).toBe("new");
    });

    it("returns null when not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().leadAnalytics.getById({ id: 999 });
      expect(result).toBeNull();
    });

    it("accepts string id", async () => {
      selectResultsQueue.push([sampleLeads[0]]);
      const result = await caller().leadAnalytics.getById({ id: "1" });
      expect(result).toBeTruthy();
    });
  });

  // ═══ getAnalytics ═══
  describe("getAnalytics", () => {
    it("aggregates lead statistics", async () => {
      selectResultsQueue.push(sampleLeads);
      const result = await caller().leadAnalytics.getAnalytics();
      expect(result.total).toBe(4);
      expect(result.byStatus.new).toBe(1);
      expect(result.byStatus.contacted).toBe(1);
      expect(result.byStatus.converted).toBe(1);
      expect(result.byStatus.qualified).toBe(1);
      expect(result.bySource.website).toBe(2);
      expect(result.bySource.exhibition).toBe(1);
      expect(result.byPriority.high).toBe(2);
      expect(result.avgAiScore).toBe(68); // (80+60+90+40)/4 = 67.5 → 68
    });

    it("returns zeros when no leads", async () => {
      selectResultsQueue.push([]);
      const result = await caller().leadAnalytics.getAnalytics();
      expect(result.total).toBe(0);
      expect(result.avgAiScore).toBe(0);
    });
  });

  // ═══ getConversionRate ═══
  describe("getConversionRate", () => {
    it("calculates conversion rate", async () => {
      selectResultsQueue.push(sampleLeads);
      const result = await caller().leadAnalytics.getConversionRate();
      expect(result.total).toBe(4);
      expect(result.converted).toBe(1);
      expect(result.rate).toBe(25); // 1/4 * 100 = 25
    });

    it("returns zero rate when no leads", async () => {
      selectResultsQueue.push([]);
      const result = await caller().leadAnalytics.getConversionRate();
      expect(result.rate).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getSourceDistribution ═══
  describe("getSourceDistribution", () => {
    it("returns source distribution sorted by count", async () => {
      selectResultsQueue.push(sampleLeads);
      const result = await caller().leadAnalytics.getSourceDistribution();
      expect(result).toHaveLength(3);
      expect(result[0].source).toBe("website");
      expect(result[0].count).toBe(2);
    });

    it("returns empty when no leads", async () => {
      selectResultsQueue.push([]);
      const result = await caller().leadAnalytics.getSourceDistribution();
      expect(result).toEqual([]);
    });
  });

  // ═══ Stub CRUD ═══
  describe("stub CRUD", () => {
    it("create returns redirect message", async () => {
      const result = await caller().leadAnalytics.create();
      expect(result.success).toBe(true);
      expect(result.message).toContain("crm");
    });

    it("update returns redirect message", async () => {
      const result = await caller().leadAnalytics.update({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("delete returns redirect message", async () => {
      const result = await caller().leadAnalytics.delete({ id: 1 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getFunnelData ═══
  describe("getFunnelData", () => {
    it("returns funnel stages with counts", async () => {
      selectResultsQueue.push(sampleLeads);
      const result = await caller().leadAnalytics.getFunnelData();
      expect(result.funnel).toHaveLength(7);
      expect(result.total).toBe(4);
      const newStage = result.funnel.find((f: any) => f.stage === "new");
      expect(newStage!.count).toBe(1);
    });
  });

  // ═══ getTrendData ═══
  describe("getTrendData", () => {
    it("returns empty trend", async () => {
      const result = await caller().leadAnalytics.getTrendData();
      expect(result.trend).toEqual([]);
      expect(result.period).toBe("month");
    });
  });

  // ═══ getSourceAnalysis ═══
  describe("getSourceAnalysis", () => {
    it("returns source analysis sorted by count", async () => {
      selectResultsQueue.push(sampleLeads);
      const result = await caller().leadAnalytics.getSourceAnalysis();
      expect(result[0].source).toBe("website");
    });
  });

  // ═══ getSalesPerformance ═══
  describe("getSalesPerformance", () => {
    it("returns empty performers", async () => {
      const result = await caller().leadAnalytics.getSalesPerformance();
      expect(result.performers).toEqual([]);
      expect(result.avgConversion).toBe(0);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().leadAnalytics.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().leadAnalytics.getById({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for getAnalytics", async () => {
      await expect(createAnonymousCaller().leadAnalytics.getAnalytics()).rejects.toThrow();
    });
    it("rejects anonymous for getConversionRate", async () => {
      await expect(createAnonymousCaller().leadAnalytics.getConversionRate()).rejects.toThrow();
    });
    it("rejects anonymous for getFunnelData", async () => {
      await expect(createAnonymousCaller().leadAnalytics.getFunnelData()).rejects.toThrow();
    });
  });
});
