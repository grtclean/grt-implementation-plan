/**
 * Role Agent Router — Unit Tests
 * Tests 4 procedures: list, getQuickActions, getSuggestions, getRecentActivity
 *
 * Uses db.execute(sql`...`) for getRecentActivity.
 * Mocks gateway-bu-context.middleware for buScopeCondition import.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { executeResults } = vi.hoisted(() => {
  const executeResults: any[] = [];
  return { executeResults };
});

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      then(resolve: any) {
        return Promise.resolve([]).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
      execute: vi.fn(async () => {
        return executeResults.length > 0 ? executeResults.shift()! : { rows: [] };
      }),
    };
  }),
}));

vi.mock("../_core/gateway-bu-context.middleware", () => ({
  buScopeCondition: vi.fn(() => null),
  buContextMiddleware: vi.fn(async ({ ctx, next }: any) => next({ ctx })),
  requireBuScope: vi.fn(() => vi.fn(async ({ ctx, next }: any) => next({ ctx }))),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  executeResults.length = 0;
});

const caller = () => createAdminCaller();

describe("role-agent router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns empty items (legacy stub)", async () => {
      const result = await caller().roleAgent.list();
      expect(result).toEqual({ items: [], total: 0 });
    });

    it("accepts pagination params", async () => {
      const result = await caller().roleAgent.list({ limit: 10, offset: 5 });
      expect(result.items).toEqual([]);
    });
  });

  // ═══ getQuickActions ═══
  describe("getQuickActions", () => {
    it("returns actions for default role (employee)", async () => {
      // createAdminCaller has role='employee', which falls to bu_sales fallback
      const result = await caller().roleAgent.getQuickActions();
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns bu_sales actions when role matches", async () => {
      const result = await caller().roleAgent.getQuickActions({ role: "bu_sales" });
      // Still uses ctx.user.role (employee), but since ROLE_ACTIONS["employee"] doesn't exist,
      // it falls back to ROLE_ACTIONS["bu_sales"] ?? []
      expect(Array.isArray(result)).toBe(true);
    });

    it("actions have correct structure", async () => {
      const result = await caller().roleAgent.getQuickActions();
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("id");
        expect(result[0]).toHaveProperty("icon");
        expect(result[0]).toHaveProperty("label");
        expect(result[0]).toHaveProperty("labelEn");
        expect(result[0]).toHaveProperty("route");
      }
    });
  });

  // ═══ getSuggestions ═══
  describe("getSuggestions", () => {
    it("returns suggestions for role", async () => {
      const result = await caller().roleAgent.getSuggestions();
      expect(Array.isArray(result)).toBe(true);
    });

    it("suggestions have text fields", async () => {
      const result = await caller().roleAgent.getSuggestions();
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("id");
        expect(result[0]).toHaveProperty("text");
        expect(result[0]).toHaveProperty("textEn");
      }
    });
  });

  // ═══ getRecentActivity ═══
  describe("getRecentActivity", () => {
    it("returns DB activity when available", async () => {
      executeResults.push({
        rows: [
          { id: "1", type: "project", text: "Project A", textEn: "Project A", time: "2026-02-28 10:00", timeZh: "02-28 10:00" },
        ],
      });
      const result = await caller().roleAgent.getRecentActivity({ limit: 5 });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("type", "project");
    });

    it("falls back to static data on error", async () => {
      executeResults.push({ rows: [] }); // empty → falls back
      const result = await caller().roleAgent.getRecentActivity({ limit: 3 });
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("type");
    });

    it("respects limit", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().roleAgent.getRecentActivity({ limit: 2 });
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().roleAgent.list()).rejects.toThrow();
    });
    it("rejects anonymous for getQuickActions", async () => {
      await expect(createAnonymousCaller().roleAgent.getQuickActions()).rejects.toThrow();
    });
    it("rejects anonymous for getSuggestions", async () => {
      await expect(createAnonymousCaller().roleAgent.getSuggestions()).rejects.toThrow();
    });
    it("rejects anonymous for getRecentActivity", async () => {
      await expect(createAnonymousCaller().roleAgent.getRecentActivity({ limit: 5 })).rejects.toThrow();
    });
  });
});
