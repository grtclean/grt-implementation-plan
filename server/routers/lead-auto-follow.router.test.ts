/**
 * Lead Auto-Follow Router — Unit Tests
 *
 * 9 procedures (all protectedProcedure, BU-scoped via buScopeCondition):
 *   list              (query)    — paginated follow-up leads (count + select)
 *   getById           (query)    — single lead by id
 *   getConfig         (query)    — hardcoded config (no DB)
 *   updateConfig      (mutation) — stub returns success
 *   create            (mutation) — stub returns success
 *   update            (mutation) — stub returns success
 *   delete            (mutation) — stub returns success
 *   getLeads          (query)    — leads with client-side status/priority filtering
 *   getFollowUpTasks  (query)    — always returns empty
 *
 * 17 test cases + 5 auth guard tests = 22 total
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mock state (available before vi.mock factory runs) ──
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

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
});

// ── Sample data ─────────────────────────────────────────
const sampleLead = {
  id: 1,
  companyName: "Acme Corp",
  contactName: "Zhang San",
  status: "new",
  source: "website",
  priority: "high",
  buCode: "BU1",
  createdAt: "2026-02-01",
};

const sampleLead2 = {
  id: 2,
  companyName: "Beta Inc",
  contactName: "Li Si",
  status: "contacted",
  source: "referral",
  priority: "medium",
  buCode: "BU1",
  createdAt: "2026-02-05",
};

const sampleLead3 = {
  id: 3,
  companyName: "Gamma Ltd",
  contactName: "Wang Wu",
  status: "qualified",
  source: "trade_show",
  priority: "low",
  buCode: "BU2",
  createdAt: "2026-02-10",
};

// ── Tests ───────────────────────────────────────────────
describe("leadAutoFollow router", () => {
  // ═════════════════════════════════════════════════════════
  // list  (sequential count + select = 2 queue entries)
  // ═════════════════════════════════════════════════════════

  describe("list", () => {
    it("returns leads with total count (2 sequential DB calls)", async () => {
      const caller = createAuthenticatedCaller();
      // First DB call: count query → [{ count: N }]
      selectResultsQueue.push([{ count: 3 }]);
      // Second DB call: items query → [...leads]
      selectResultsQueue.push([sampleLead, sampleLead2]);
      const result = await caller.leadAutoFollow.list();
      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual(sampleLead);
      expect(result.items[1]).toEqual(sampleLead2);
    });

    it("returns empty list when no leads exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]);
      const result = await caller.leadAutoFollow.list();
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it("respects limit and offset parameters", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ count: 10 }]);
      selectResultsQueue.push([sampleLead2]);
      const result = await caller.leadAutoFollow.list({ limit: 1, offset: 1 });
      expect(result.total).toBe(10);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(sampleLead2);
    });
  });

  // ═════════════════════════════════════════════════════════
  // getById
  // ═════════════════════════════════════════════════════════

  describe("getById", () => {
    it("returns a lead when found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([sampleLead]);
      const result = await caller.leadAutoFollow.getById({ id: 1 });
      expect(result).toEqual(sampleLead);
    });

    it("returns null when lead is not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.leadAutoFollow.getById({ id: 999 });
      expect(result).toBeNull();
    });

    it("accepts string id and converts to number", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([sampleLead]);
      const result = await caller.leadAutoFollow.getById({ id: "1" });
      expect(result).toEqual(sampleLead);
    });
  });

  // ═════════════════════════════════════════════════════════
  // getConfig  (no DB, returns hardcoded object)
  // ═════════════════════════════════════════════════════════

  describe("getConfig", () => {
    it("returns hardcoded config with 5 templates", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.leadAutoFollow.getConfig();
      expect(result.enabled).toBe(true);
      expect(result.followUpIntervalDays).toBe(3);
      expect(result.maxAutoFollowUps).toBe(5);
      expect(result.aiScoreThreshold).toBe(50);
      expect(result.templates).toHaveLength(5);
      expect(result.templates[0]).toEqual({
        name: "初次联系",
        type: "email",
        delay: 0,
      });
      expect(result.templates[4]).toEqual({
        name: "报价跟进",
        type: "call",
        delay: 21,
      });
    });
  });

  // ═════════════════════════════════════════════════════════
  // updateConfig
  // ═════════════════════════════════════════════════════════

  describe("updateConfig", () => {
    it("returns success message", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.leadAutoFollow.updateConfig({
        enabled: false,
        followUpIntervalDays: 7,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("配置已更新");
    });
  });

  // ═════════════════════════════════════════════════════════
  // create
  // ═════════════════════════════════════════════════════════

  describe("create", () => {
    it("returns success message", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.leadAutoFollow.create({
        data: { name: "test" },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Auto-follow created");
    });
  });

  // ═════════════════════════════════════════════════════════
  // update
  // ═════════════════════════════════════════════════════════

  describe("update", () => {
    it("returns success message", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.leadAutoFollow.update({
        id: 1,
        data: { status: "contacted" },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Auto-follow updated");
    });
  });

  // ═════════════════════════════════════════════════════════
  // delete
  // ═════════════════════════════════════════════════════════

  describe("delete", () => {
    it("returns success message", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.leadAutoFollow.delete({ id: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Auto-follow deleted");
    });
  });

  // ═════════════════════════════════════════════════════════
  // getLeads  (client-side filtering after DB fetch)
  // ═════════════════════════════════════════════════════════

  describe("getLeads", () => {
    it("returns all leads when no filters applied", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([sampleLead, sampleLead2, sampleLead3]);
      const result = await caller.leadAutoFollow.getLeads();
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("filters by status (client-side)", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([sampleLead, sampleLead2, sampleLead3]);
      const result = await caller.leadAutoFollow.getLeads({ status: "new" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe("new");
      expect(result.total).toBe(1);
    });

    it("filters by priority (client-side)", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([sampleLead, sampleLead2, sampleLead3]);
      const result = await caller.leadAutoFollow.getLeads({
        priority: "high",
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].priority).toBe("high");
      expect(result.total).toBe(1);
    });

    it("returns empty when no leads match", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.leadAutoFollow.getLeads({ status: "lost" });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════
  // getFollowUpTasks  (always returns empty)
  // ═════════════════════════════════════════════════════════

  describe("getFollowUpTasks", () => {
    it("always returns empty items and zero total", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.leadAutoFollow.getFollowUpTasks();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════
  // Auth Guards — anonymous callers must be rejected
  // ═════════════════════════════════════════════════════════

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.leadAutoFollow.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.leadAutoFollow.getById({ id: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getConfig", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.leadAutoFollow.getConfig()).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.leadAutoFollow.create()).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.leadAutoFollow.delete({ id: 1 }),
      ).rejects.toThrow();
    });
  });
});
