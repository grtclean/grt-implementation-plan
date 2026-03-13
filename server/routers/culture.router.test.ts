/**
 * Culture Router — Unit Tests (星火大屏 & 奋斗者殿堂)
 *
 * 4 procedures:
 *   getSparkDashboardData — concurrent feeds + strivers query
 *   getRecentFeeds        — paginated feeds query
 *   addLiveFeed           — add frontline feed (mutation)
 *   awardStriver          — award striver medal (mutation)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function createChain() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return Promise.resolve(resolve(getNextResult())); }
    catch (e) { if (reject) return Promise.resolve(reject(e)); return Promise.reject(e); }
  };
  chain.catch = vi.fn(() => Promise.resolve());
  return chain;
}

function createMockDb() {
  const db: any = {
    select: vi.fn(() => createChain()),
    insert: vi.fn(() => createChain()),
    update: vi.fn(() => createChain()),
    delete: vi.fn(() => createChain()),
    execute: vi.fn(() => Promise.resolve({ rows: [] })),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../permission-management/permission.service", () => ({
  permissionService: { checkPermission: vi.fn().mockResolvedValue(true) },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../../drizzle/spark-hope-schema", () => ({
  striversHall: {
    id: "id", userId: "userId", userName: "userName",
    achievementTitle: "achievementTitle", medalLevel: "medalLevel",
    storySummary: "storySummary", awardedBy: "awardedBy",
    awardedAt: "awardedAt", buCode: "buCode", isActive: "isActive",
    createdAt: "createdAt",
  },
  globalLiveFeeds: {
    id: "id", projectId: "projectId", projectName: "projectName",
    location: "location", feedMessage: "feedMessage", feedType: "feedType",
    reportedBy: "reportedBy", importance: "importance", isLive: "isLive",
    createdAt: "createdAt",
  },
}));

vi.mock("drizzle-orm", () => {
  const sqlTag = (...args: any[]) => ({ type: "sql", args });
  sqlTag.raw = vi.fn((s: string) => s);
  sqlTag.join = vi.fn((...args: any[]) => ({ type: "sql.join", args }));
  sqlTag.empty = "";
  return {
    eq: vi.fn((...args: any[]) => ({ type: "eq", args })),
    and: vi.fn((...args: any[]) => ({ type: "and", args })),
    desc: vi.fn((...args: any[]) => ({ type: "desc", args })),
    sql: sqlTag,
    SQL: class SQL {},
  };
});

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ═══════════════════════════════════════════════════════════

describe("culture router", () => {

  // ── getSparkDashboardData ──
  describe("getSparkDashboardData", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.culture.getSparkDashboardData()).rejects.toThrow();
    });

    it("returns feeds, strivers, and ceoQuote", async () => {
      const caller = createAdminCaller();
      mockDb.$count.mockResolvedValue(1);
      // Default result for all selects — both feeds and strivers will get this
      mockQueryResult = [
        { id: 1, projectName: "Chart M11", location: "US-Detroit", feedMessage: "Test", feedType: "MILESTONE", reportedBy: "焦斌", importance: "high", createdAt: "2026-03-05" },
      ];

      const result = await caller.culture.getSparkDashboardData();

      expect(result.feeds).toBeDefined();
      expect(result.strivers).toBeDefined();
      expect(result.ceoQuote).toBe("努力工作，掌控自己的人生。");
      expect(Array.isArray(result.feeds)).toBe(true);
      expect(Array.isArray(result.strivers)).toBe(true);
    });

    it("returns arrays when no data", async () => {
      const caller = createAdminCaller();
      mockDb.$count.mockResolvedValue(1);
      mockQueryResult = [];

      const result = await caller.culture.getSparkDashboardData();
      expect(result.feeds).toBeDefined();
      expect(result.strivers).toBeDefined();
      expect(result.ceoQuote).toBeTruthy();
    });
  });

  // ── getRecentFeeds ──
  describe("getRecentFeeds", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.culture.getRecentFeeds()).rejects.toThrow();
    });

    it("returns feeds with pagination", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([
        { id: 1, location: "US-Detroit", feedMessage: "Test feed" },
        { id: 2, location: "CN-Suzhou", feedMessage: "Another feed" },
      ]);

      const result = await caller.culture.getRecentFeeds({ limit: 10, offset: 0 });
      expect(result).toHaveLength(2);
    });
  });

  // ── addLiveFeed ──
  describe("addLiveFeed", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.culture.addLiveFeed({
          location: "US-Detroit",
          feedMessage: "Chart 现场验收通过",
        })
      ).rejects.toThrow();
    });

    it("creates a new feed and returns success", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 42 }];

      const result = await caller.culture.addLiveFeed({
        location: "US-Detroit",
        feedMessage: "Chart 现场：设备水温达到极值，完美运行",
        feedType: "MILESTONE",
        importance: "high",
        projectId: "CHART-M11",
        projectName: "北美 Chart 13 站",
      });

      expect(result.success).toBe(true);
      expect(result.feedId).toBe(42);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("rejects empty feedMessage", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.culture.addLiveFeed({
          location: "US-Detroit",
          feedMessage: "",
        })
      ).rejects.toThrow();
    });
  });

  // ── awardStriver ──
  describe("awardStriver", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.culture.awardStriver({
          userName: "王海涛",
          achievementTitle: "攻坚者",
          medalLevel: "GOLD",
        })
      ).rejects.toThrow();
    });

    it("creates a GOLD medal award", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1 }];

      const result = await caller.culture.awardStriver({
        userName: "王海涛",
        achievementTitle: "零排放样本工程攻坚者",
        medalLevel: "GOLD",
        storySummary: "用 120 天完成 8 个月的交付",
        buCode: "overseas",
      });

      expect(result.success).toBe(true);
      expect(result.striverId).toBe(1);
    });

    it("creates a SILVER medal award", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 2 }];

      const result = await caller.culture.awardStriver({
        userName: "李明",
        achievementTitle: "合规吹哨人",
        medalLevel: "SILVER",
      });

      expect(result.success).toBe(true);
      expect(result.striverId).toBe(2);
    });

    it("rejects invalid medal level", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.culture.awardStriver({
          userName: "Test",
          achievementTitle: "Test",
          medalLevel: "PLATINUM" as any,
        })
      ).rejects.toThrow();
    });
  });
});
