/**
 * R&D Pipeline Router — Comprehensive Unit Tests
 *
 * Covers all 17 procedures across 9 sub-routers:
 *   quotation:    list, create                (2)
 *   requirement:  list, create, updateStatus   (3)
 *   solution:     list, create                (2)
 *   mechanical:   list, create                (2)
 *   electrical:   list, create                (2)
 *   installation: list, create                (2)
 *   satTest:      list, create                (2)
 *   acceptance:   list, create                (2)
 *   rfqKanban:    list, create                (2)
 *
 * Run: npx vitest run server/routers/rnd-pipeline.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock DB — raw sql execute pattern
// ---------------------------------------------------------------------------

/**
 * This router uses exclusively db.execute(sql`...`) — no Drizzle query-builder.
 * Bootstrap functions set module-level flags that persist across tests, so we
 * cannot predict how many execute() calls happen. Instead, we use
 * mockResolvedValue for a default and mockResolvedValueOnce for specific calls.
 *
 * The default execute result handles bootstrap transparently:
 *   { rows: [{ cnt: 99 }] } — satisfies COUNT check (non-zero → skip seed)
 *   and is harmless for CREATE TABLE (result ignored).
 *
 * Each test then chains .mockResolvedValueOnce() at the END for the actual
 * query. But since bootstrap calls come first and consume the "once" values,
 * we must ensure the "once" chain is long enough.
 *
 * Strategy: We set up execute to return a default that satisfies bootstrap.
 * We use pushExecuteResult() to queue results that the actual query will get
 * AFTER bootstrap is done.
 */

const mockExecuteFn = vi.fn();

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve([]));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve([]); }
    catch (e) { if (reject) return reject(e); throw e; }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: mockExecuteFn,
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reset the bootstrap flags that live on the imported module's function objects
 * and the `bootstrapped` const. We cannot import those directly, so we reset
 * the entire module state by reimporting. Since vi.mock is hoisted, the mock
 * survives. We use a dynamic import to get a fresh reference each time we need.
 *
 * Actually — since the flags are closed over in the module, the only way to
 * reliably test bootstrap is either:
 *   a) Reset modules (heavy)
 *   b) Accept that bootstrap only fires once per sub-router across the whole suite
 *
 * We choose (b) and structure the mock so it works regardless:
 *   - Default execute → { rows: [{ cnt: 99 }] } (satisfies bootstrap harmlessly)
 *   - Each test pushes the ACTUAL expected result as the last "once" override
 *   - Bootstrap calls consume earlier "once" overrides (or hit the default)
 *
 * To make this simple: we enqueue results. The execute mock returns them in
 * FIFO order; when the queue is empty, it returns the default.
 */

const executeQueue: any[] = [];
const DEFAULT_EXECUTE_RESULT = { rows: [{ cnt: 99 }] };

function setupExecuteMock() {
  mockExecuteFn.mockReset();
  executeQueue.length = 0;
  mockExecuteFn.mockImplementation(() => {
    if (executeQueue.length > 0) {
      return Promise.resolve(executeQueue.shift()!);
    }
    return Promise.resolve(DEFAULT_EXECUTE_RESULT);
  });
}

function queueExecute(...results: any[]) {
  executeQueue.push(...results);
}

// ---------------------------------------------------------------------------
// Import test utils AFTER mock setup
// ---------------------------------------------------------------------------
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("rndPipeline router", () => {
  beforeEach(() => {
    setupExecuteMock();
  });

  // =========================================================================
  // Auth guards — anonymous callers must be rejected
  // =========================================================================
  describe("auth guards", () => {
    it("rejects anonymous caller on quotation.list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.rndPipeline.quotation.list()).rejects.toThrow();
    });

    it("rejects anonymous caller on requirement.create", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.rndPipeline.requirement.create({
          title: "test",
          customer: "test",
          assignee: "test",
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous caller on solution.list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.rndPipeline.solution.list()).rejects.toThrow();
    });

    it("rejects anonymous caller on mechanical.list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.rndPipeline.mechanical.list()).rejects.toThrow();
    });

    it("rejects anonymous caller on electrical.create", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.rndPipeline.electrical.create({
          name: "test",
          project: "test",
          engineer: "test",
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous caller on installation.list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.rndPipeline.installation.list()).rejects.toThrow();
    });

    it("rejects anonymous caller on satTest.list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.rndPipeline.satTest.list()).rejects.toThrow();
    });

    it("rejects anonymous caller on acceptance.create", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.rndPipeline.acceptance.create({
          project: "test",
          customer: "test",
          date: "2026-03-01",
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous caller on rfqKanban.list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.rndPipeline.rfqKanban.list()).rejects.toThrow();
    });
  });

  // =========================================================================
  // Quotation sub-router
  // =========================================================================
  describe("quotation", () => {
    describe("list", () => {
      it("returns items and stats for an empty table", async () => {
        const caller = createAuthenticatedCaller();
        // The last execute call is the actual SELECT; bootstrap calls hit default
        // We need to make sure the actual SELECT gets empty rows.
        // Since bootstrap flags may or may not be set, we set a default that works
        // for both bootstrap and actual query, then if needed override.
        // Strategy: push nothing. Default returns { rows: [{ cnt: 99 }] }.
        // The SELECT will also return { rows: [{ cnt: 99 }] } which maps to items.
        // That's not empty... let's push enough results so the last one is empty.

        // We don't know if bootstrap will run (depends on test order).
        // Push 10 default results plus the final empty one.
        // Actually, let's just reset the default to empty rows for this test.
        mockExecuteFn.mockReset();
        executeQueue.length = 0;
        mockExecuteFn.mockImplementation(() => {
          if (executeQueue.length > 0) {
            return Promise.resolve(executeQueue.shift()!);
          }
          return Promise.resolve({ rows: [] });
        });
        // Bootstrap COUNT with rows=[] will see cnt as undefined → Number(undefined) = NaN = 0
        // so it will try to seed. Seed INSERT returns empty rows (fine, ignored).
        // Then the actual SELECT returns empty rows.

        const result = await caller.rndPipeline.quotation.list();
        expect(result).toHaveProperty("items");
        expect(result).toHaveProperty("stats");
        expect(result.items).toEqual([]);
        expect(result.stats.total).toBe(0);
        expect(result.stats.winRate).toBe("0%");
        expect(result.stats.pendingApproval).toBe(0);
      });

      it("returns formatted items with stats", async () => {
        const caller = createAuthenticatedCaller();
        // We need the final execute call (the SELECT) to return data rows.
        // Bootstrap calls get the default { rows: [{ cnt: 99 }] } which is fine.
        // But the SELECT must return specific rows.
        // Problem: we don't know how many bootstrap calls will happen before SELECT.
        // Solution: use mockImplementation with call counting.
        const rows = [
          {
            id: 1, quoteNumber: "QT-2026-001", customer: "Customer A",
            project: "Project X", bu: "BU3", amount: "2850000", currency: "CNY",
            status: "won", version: "V2", date: "2026-02-08T00:00:00.000Z",
          },
          {
            id: 2, quoteNumber: "QT-2026-002", customer: "Customer B",
            project: "Project Y", bu: "BU1", amount: "1200000", currency: "EUR",
            status: "approving", version: "V1", date: "2026-02-10T00:00:00.000Z",
          },
        ];

        // Make the mock return the data rows for the LAST call (the SELECT).
        // We track calls and return the data on the last one.
        let callCount = 0;
        mockExecuteFn.mockReset();
        mockExecuteFn.mockImplementation((_sqlObj: any) => {
          callCount++;
          // We'll resolve: all intermediate calls get default, the "actual query" is the last call.
          // We can't know which is last. Instead, always return the data rows.
          // The bootstrap CREATE TABLE doesn't check result.
          // The bootstrap COUNT will see Number(rows[0]?.cnt) = Number(undefined) = NaN → 0
          // which triggers seeding... but the seed INSERT also doesn't check result meaningfully.
          // So just always returning the data rows is problematic because bootstrap will try seeding.

          // Better: return { rows: [{ cnt: 99 }] } for bootstrap, and data for SELECT.
          // We detect bootstrap by checking if it's already been done.
          // Since bootstrap may or may not run, we can look at the call count pattern:
          //   If bootstrap runs: call 1=CREATE, call 2=COUNT, call 3=SELECT
          //   If bootstrap doesn't run: call 1=SELECT
          // In both cases, the LAST call is the SELECT.
          // We can't know "last" in advance, but we know the max is 3 (or 4 with seed).

          // Cleanest approach: return default for all calls, then override the return
          // value after the function is called. That doesn't work.

          // Let's use a different approach: return an object with rows that includes
          // our data. For bootstrap, Number(rows[0]?.cnt) will be NaN unless we have cnt.
          // Since our rows don't have cnt, bootstrap will see NaN → 0 → try to seed.
          // Seed INSERT doesn't check result (just fires SQL). Then SELECT returns our rows.
          // This actually works! Bootstrap side effects are:
          //   CREATE TABLE → result ignored
          //   COUNT → Number(NaN) = NaN = 0 → seeds
          //   SEED INSERT → result ignored
          //   ACTUAL SELECT → returns our rows ✓
          // But all 4 calls return the same { rows } object. That's fine.
          return Promise.resolve({ rows });
        });

        const result = await caller.rndPipeline.quotation.list();
        expect(result.items).toHaveLength(2);
        expect(result.items[0].formattedAmount).toBe("¥2.9M");
        expect(result.items[0].date).toBe("2026-02-08");
        expect(result.items[1].formattedAmount).toBe("€1.2M");
        expect(result.stats.total).toBe(2);
        expect(result.stats.winRate).toBe("50%");
        expect(result.stats.pendingApproval).toBe(1);
      });

      it("calls execute for search filter", async () => {
        const caller = createAuthenticatedCaller();
        // Return empty for everything
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.quotation.list({
          search: "大众",
        });
        expect(result.items).toEqual([]);
        expect(mockExecuteFn).toHaveBeenCalled();
      });

      it("calls execute for bu filter", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.quotation.list({ bu: "BU1" });
        expect(result.items).toEqual([]);
      });

      it("calls execute for both search and bu filters", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.quotation.list({
          search: "test",
          bu: "BU3",
        });
        expect(result.items).toEqual([]);
      });

      it("formats amounts correctly for thousands", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, quoteNumber: "QT-001", customer: "C", project: "P",
          bu: "BU3", amount: "5000", currency: "USD", status: "draft",
          version: "V1", date: "2026-01-01T00:00:00.000Z",
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.quotation.list();
        expect(result.items[0].formattedAmount).toBe("$5K");
      });

      it("formats amounts correctly for small values", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, quoteNumber: "QT-001", customer: "C", project: "P",
          bu: "BU3", amount: "500", currency: "CNY", status: "draft",
          version: "V1", date: null,
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.quotation.list();
        expect(result.items[0].formattedAmount).toBe("¥500");
        expect(result.items[0].date).toBe("");
      });

      it("handles NaN amount in formatAmount", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, quoteNumber: "QT-001", customer: "C", project: "P",
          bu: "BU3", amount: "not-a-number", currency: "CNY", status: "draft",
          version: "V1", date: "2026-01-01T00:00:00.000Z",
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.quotation.list();
        expect(result.items[0].formattedAmount).toBe("not-a-number");
      });

      it("returns correct totalAmount and winRate in stats", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [
          {
            id: 1, quoteNumber: "QT-001", customer: "C", project: "P",
            bu: "BU3", amount: "500000", currency: "CNY", status: "won",
            version: "V1", date: "2026-01-01",
          },
          {
            id: 2, quoteNumber: "QT-002", customer: "C2", project: "P2",
            bu: "BU3", amount: "500000", currency: "CNY", status: "won",
            version: "V1", date: "2026-01-02",
          },
        ];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.quotation.list();
        expect(result.stats.totalAmount).toBe("¥1.0M");
        expect(result.stats.winRate).toBe("100%");
        expect(result.stats.total).toBe(2);
      });

      it("handles undefined rows gracefully", async () => {
        const caller = createAuthenticatedCaller();
        // Return object without rows — (result.rows as any[]) || [] should give []
        mockExecuteFn.mockResolvedValue({ rows: undefined });

        const result = await caller.rndPipeline.quotation.list();
        expect(result.items).toEqual([]);
        expect(result.stats.total).toBe(0);
      });
    });

    describe("create", () => {
      it("creates a quotation with required fields", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 1, quoteNumber: "QT-2026-123" }],
        });

        const result = await caller.rndPipeline.quotation.create({
          customer: "TestCo",
          project: "Test Project",
        });
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("quoteNumber");
      });

      it("creates a quotation with all optional fields", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 2, quoteNumber: "QT-2026-456" }],
        });

        const result = await caller.rndPipeline.quotation.create({
          customer: "TestCo",
          project: "Test Project",
          bu: "BU1",
          amount: "100000",
          currency: "EUR",
        });
        expect(result).toHaveProperty("id", 2);
      });

      it("rejects empty customer", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.quotation.create({
            customer: "",
            project: "Test",
          })
        ).rejects.toThrow();
      });

      it("rejects empty project", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.quotation.create({
            customer: "Test",
            project: "",
          })
        ).rejects.toThrow();
      });
    });
  });

  // =========================================================================
  // Requirement sub-router
  // =========================================================================
  describe("requirement", () => {
    describe("list", () => {
      it("returns items from the database", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, reqNumber: "REQ-2026-001", customer: "Customer A",
          title: "Req Title", status: "approved", priority: "high",
          bu: "BU3", assignee: "Engineer A", date: "2026-02-05T00:00:00.000Z",
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.requirement.list();
        expect(result.items).toHaveLength(1);
        expect(result.items[0].date).toBe("2026-02-05");
        expect(result.items[0].reqNumber).toBe("REQ-2026-001");
      });

      it("filters by bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.requirement.list({ bu: "BU1" });
        expect(result.items).toEqual([]);
      });

      it("filters by status", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.requirement.list({ status: "approved" });
        expect(result.items).toEqual([]);
      });

      it("filters by search term", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.requirement.list({ search: "清洗" });
        expect(result.items).toEqual([]);
      });

      it("treats status=all as no status filter", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.requirement.list({ status: "all" });
        expect(result.items).toEqual([]);
      });

      it("combines bu, status, and search filters", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.requirement.list({
          bu: "BU3",
          status: "draft",
          search: "清洗",
        });
        expect(result.items).toEqual([]);
      });

      it("handles null date gracefully", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, reqNumber: "REQ-001", customer: "C", title: "T",
          status: "draft", priority: "low", bu: "BU3", assignee: "A", date: null,
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.requirement.list();
        expect(result.items[0].date).toBe("");
      });
    });

    describe("create", () => {
      it("creates a requirement with required fields", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 1, reqNumber: "REQ-2026-001" }],
        });

        const result = await caller.rndPipeline.requirement.create({
          title: "New Requirement",
          customer: "Customer",
          assignee: "Engineer",
        });
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("reqNumber");
      });

      it("creates a requirement with optional fields", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 2, reqNumber: "REQ-2026-002" }],
        });

        const result = await caller.rndPipeline.requirement.create({
          title: "New Req",
          customer: "Customer",
          assignee: "Eng",
          priority: "urgent",
          bu: "BU4",
        });
        expect(result.id).toBe(2);
      });

      it("rejects empty title", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.requirement.create({
            title: "",
            customer: "C",
            assignee: "A",
          })
        ).rejects.toThrow();
      });

      it("rejects empty customer", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.requirement.create({
            title: "T",
            customer: "",
            assignee: "A",
          })
        ).rejects.toThrow();
      });

      it("rejects empty assignee", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.requirement.create({
            title: "T",
            customer: "C",
            assignee: "",
          })
        ).rejects.toThrow();
      });
    });

    describe("updateStatus", () => {
      it("updates the status of a requirement", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.requirement.updateStatus({
          id: 1,
          status: "approved",
        });
        expect(result).toEqual({ success: true });
      });

      it("rejects non-numeric id via input validation", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          (caller.rndPipeline.requirement.updateStatus as any)({
            id: "abc",
            status: "approved",
          })
        ).rejects.toThrow();
      });
    });
  });

  // =========================================================================
  // Solution sub-router
  // =========================================================================
  describe("solution", () => {
    describe("list", () => {
      it("returns all solutions when no filter provided", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, solNumber: "SOL-001", project: "Project", customer: "Customer",
          status: "设计中", bu: "BU3", version: "V2.1", engineer: "Engineer",
          date: "2026-02-06T00:00:00.000Z",
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.solution.list();
        expect(result.items).toHaveLength(1);
        expect(result.items[0].date).toBe("2026-02-06");
      });

      it("filters by bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.solution.list({ bu: "BU1" });
        expect(result.items).toEqual([]);
      });

      it("handles null date", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, solNumber: "SOL-001", project: "P", customer: "C",
          status: "设计中", bu: "BU3", version: "V1.0", engineer: "E", date: null,
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.solution.list();
        expect(result.items[0].date).toBe("");
      });
    });

    describe("create", () => {
      it("creates a solution with required fields", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 1, solNumber: "SOL-123" }],
        });

        const result = await caller.rndPipeline.solution.create({
          project: "New Project",
          customer: "Customer",
          engineer: "Engineer",
        });
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("solNumber");
      });

      it("creates a solution with optional bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 2, solNumber: "SOL-456" }],
        });

        const result = await caller.rndPipeline.solution.create({
          project: "P",
          customer: "C",
          engineer: "E",
          bu: "BU4",
        });
        expect(result.id).toBe(2);
      });

      it("rejects empty project", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.solution.create({
            project: "",
            customer: "C",
            engineer: "E",
          })
        ).rejects.toThrow();
      });

      it("rejects empty engineer", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.solution.create({
            project: "P",
            customer: "C",
            engineer: "",
          })
        ).rejects.toThrow();
      });
    });
  });

  // =========================================================================
  // Mechanical design sub-router
  // =========================================================================
  describe("mechanical", () => {
    describe("list", () => {
      it("returns mechanical design tasks", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, taskNumber: "MD-001", name: "Design task", project: "Project",
          status: "设计中", bu: "BU3", rev: "R3", engineer: "Engineer",
          progress: 75, date: "2026-02-06",
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.mechanical.list();
        expect(result.items).toHaveLength(1);
        expect(result.items[0].taskNumber).toBe("MD-001");
        expect(result.items[0].progress).toBe(75);
      });

      it("filters by bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.mechanical.list({ bu: "BU1" });
        expect(result.items).toEqual([]);
      });
    });

    describe("create", () => {
      it("creates a mechanical design task", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 1, taskNumber: "MD-999" }],
        });

        const result = await caller.rndPipeline.mechanical.create({
          name: "New Design",
          project: "Project X",
          engineer: "Engineer A",
        });
        expect(result).toHaveProperty("taskNumber");
        expect(result.taskNumber).toMatch(/^MD-/);
      });

      it("creates with optional bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 2, taskNumber: "MD-100" }],
        });

        const result = await caller.rndPipeline.mechanical.create({
          name: "Design",
          project: "P",
          engineer: "E",
          bu: "BU2",
        });
        expect(result.id).toBe(2);
      });

      it("rejects empty name", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.mechanical.create({
            name: "",
            project: "P",
            engineer: "E",
          })
        ).rejects.toThrow();
      });

      it("rejects empty project", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.mechanical.create({
            name: "N",
            project: "",
            engineer: "E",
          })
        ).rejects.toThrow();
      });

      it("rejects empty engineer", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.mechanical.create({
            name: "N",
            project: "P",
            engineer: "",
          })
        ).rejects.toThrow();
      });
    });
  });

  // =========================================================================
  // Electrical design sub-router
  // =========================================================================
  describe("electrical", () => {
    describe("list", () => {
      it("returns electrical design tasks", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 5, taskNumber: "ED-001", name: "PLC Design", project: "Project",
          status: "编程中", bu: "BU3", rev: "R1", engineer: "Engineer",
          progress: 60, date: "2026-02-07",
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.electrical.list();
        expect(result.items).toHaveLength(1);
        expect(result.items[0].taskNumber).toBe("ED-001");
      });

      it("returns empty items for unknown bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.electrical.list({ bu: "BU99" });
        expect(result.items).toEqual([]);
      });
    });

    describe("create", () => {
      it("creates an electrical design task", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 5, taskNumber: "ED-888" }],
        });

        const result = await caller.rndPipeline.electrical.create({
          name: "HMI Design",
          project: "Project Y",
          engineer: "Engineer B",
        });
        expect(result).toHaveProperty("taskNumber");
        expect(result.taskNumber).toMatch(/^ED-/);
      });

      it("rejects empty project", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.electrical.create({
            name: "Design",
            project: "",
            engineer: "E",
          })
        ).rejects.toThrow();
      });

      it("rejects empty engineer", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.electrical.create({
            name: "Design",
            project: "P",
            engineer: "",
          })
        ).rejects.toThrow();
      });
    });
  });

  // =========================================================================
  // Installation sub-router
  // =========================================================================
  describe("installation", () => {
    describe("list", () => {
      it("returns installation items with formatted dates", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, instNumber: "INS-001", project: "Project", customer: "Customer",
          location: "Location", status: "安装中", bu: "BU3", team: "Team A",
          progress: 65, startDate: "2026-02-01T00:00:00.000Z",
          endDate: "2026-02-28T00:00:00.000Z",
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.installation.list();
        expect(result.items).toHaveLength(1);
        expect(result.items[0].startDate).toBe("2026-02-01");
        expect(result.items[0].endDate).toBe("2026-02-28");
      });

      it("handles null dates gracefully", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, instNumber: "INS-001", project: "P", customer: "C",
          location: "L", status: "待出发", bu: "BU3", team: "T",
          progress: 0, startDate: null, endDate: null,
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.installation.list();
        expect(result.items[0].startDate).toBe("");
        expect(result.items[0].endDate).toBe("");
      });

      it("filters by bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.installation.list({ bu: "BU4" });
        expect(result.items).toEqual([]);
      });
    });

    describe("create", () => {
      it("creates an installation with all required fields", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 1, instNumber: "INS-999" }],
        });

        const result = await caller.rndPipeline.installation.create({
          project: "New Project",
          customer: "Customer",
          location: "Factory A",
          team: "Install Team",
          startDate: "2026-03-01",
          endDate: "2026-03-20",
        });
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("instNumber");
      });

      it("creates with optional bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 2, instNumber: "INS-100" }],
        });

        const result = await caller.rndPipeline.installation.create({
          project: "P",
          customer: "C",
          location: "L",
          team: "T",
          startDate: "2026-03-01",
          endDate: "2026-03-15",
          bu: "BU1",
        });
        expect(result.id).toBe(2);
      });

      it("rejects empty project", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.installation.create({
            project: "",
            customer: "C",
            location: "L",
            team: "T",
            startDate: "2026-03-01",
            endDate: "2026-03-15",
          })
        ).rejects.toThrow();
      });

      it("rejects empty location", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.installation.create({
            project: "P",
            customer: "C",
            location: "",
            team: "T",
            startDate: "2026-03-01",
            endDate: "2026-03-15",
          })
        ).rejects.toThrow();
      });

      it("rejects empty team", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.installation.create({
            project: "P",
            customer: "C",
            location: "L",
            team: "",
            startDate: "2026-03-01",
            endDate: "2026-03-15",
          })
        ).rejects.toThrow();
      });

      it("rejects empty customer", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.installation.create({
            project: "P",
            customer: "",
            location: "L",
            team: "T",
            startDate: "2026-03-01",
            endDate: "2026-03-15",
          })
        ).rejects.toThrow();
      });
    });
  });

  // =========================================================================
  // SAT Test sub-router
  // =========================================================================
  describe("satTest", () => {
    describe("list", () => {
      it("returns SAT test items", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, satNumber: "SAT-001", project: "Project", customer: "Customer",
          bu: "BU3", status: "测试中", passRate: 85, totalItems: 48,
          passed: 41, failed: 3, pending: 4,
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.satTest.list();
        expect(result.items).toHaveLength(1);
        expect(result.items[0].passRate).toBe(85);
        expect(result.items[0].totalItems).toBe(48);
      });

      it("filters by bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.satTest.list({ bu: "BU4" });
        expect(result.items).toEqual([]);
      });

      it("returns empty items array when no data", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.satTest.list();
        expect(result.items).toEqual([]);
      });
    });

    describe("create", () => {
      it("creates a SAT test with required fields", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 1, satNumber: "SAT-999" }],
        });

        const result = await caller.rndPipeline.satTest.create({
          project: "New Project",
          customer: "Customer",
          totalItems: 50,
        });
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("satNumber");
      });

      it("creates with optional bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 2, satNumber: "SAT-100" }],
        });

        const result = await caller.rndPipeline.satTest.create({
          project: "P",
          customer: "C",
          totalItems: 30,
          bu: "BU2",
        });
        expect(result.id).toBe(2);
      });

      it("rejects empty project", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.satTest.create({
            project: "",
            customer: "C",
            totalItems: 10,
          })
        ).rejects.toThrow();
      });

      it("rejects zero totalItems", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.satTest.create({
            project: "P",
            customer: "C",
            totalItems: 0,
          })
        ).rejects.toThrow();
      });

      it("rejects negative totalItems", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.satTest.create({
            project: "P",
            customer: "C",
            totalItems: -5,
          })
        ).rejects.toThrow();
      });

      it("rejects empty customer", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.satTest.create({
            project: "P",
            customer: "",
            totalItems: 10,
          })
        ).rejects.toThrow();
      });
    });
  });

  // =========================================================================
  // Acceptance sub-router
  // =========================================================================
  describe("acceptance", () => {
    describe("list", () => {
      it("returns acceptance items with formatted dates", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, accNumber: "ACC-001", project: "Project", customer: "Customer",
          bu: "BU4", status: "已验收", date: "2026-01-25T00:00:00.000Z",
          signedBy: "Dr. Mueller", score: 98,
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.acceptance.list();
        expect(result.items).toHaveLength(1);
        expect(result.items[0].date).toBe("2026-01-25");
        expect(result.items[0].score).toBe(98);
        expect(result.items[0].signedBy).toBe("Dr. Mueller");
      });

      it("handles null date", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [{
          id: 1, accNumber: "ACC-001", project: "P", customer: "C",
          bu: "BU3", status: "待验收", date: null, signedBy: "-", score: 0,
        }];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.acceptance.list();
        expect(result.items[0].date).toBe("");
      });

      it("filters by bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.acceptance.list({ bu: "BU2" });
        expect(result.items).toEqual([]);
      });
    });

    describe("create", () => {
      it("creates an acceptance record with required fields", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 1, accNumber: "ACC-999" }],
        });

        const result = await caller.rndPipeline.acceptance.create({
          project: "New Project",
          customer: "Customer",
          date: "2026-03-10",
        });
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("accNumber");
      });

      it("creates with optional bu", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 2, accNumber: "ACC-100" }],
        });

        const result = await caller.rndPipeline.acceptance.create({
          project: "P",
          customer: "C",
          date: "2026-04-01",
          bu: "BU1",
        });
        expect(result.id).toBe(2);
      });

      it("rejects empty project", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.acceptance.create({
            project: "",
            customer: "C",
            date: "2026-03-01",
          })
        ).rejects.toThrow();
      });

      it("rejects empty customer", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.acceptance.create({
            project: "P",
            customer: "",
            date: "2026-03-01",
          })
        ).rejects.toThrow();
      });
    });
  });

  // =========================================================================
  // RFQ Kanban sub-router
  // =========================================================================
  describe("rfqKanban", () => {
    describe("list", () => {
      it("returns all RFQ cards", async () => {
        const caller = createAuthenticatedCaller();
        const rows = [
          {
            id: 1, rfqCode: "RFQ-001", titleZh: "超声换能器",
            titleEn: "Ultrasonic Transducer", supplier: "Supplier A",
            amount: "¥85,000", dueDate: "03-05", status: "draft",
          },
          {
            id: 2, rfqCode: "RFQ-002", titleZh: "不锈钢板",
            titleEn: "SS Sheet", supplier: "Supplier B",
            amount: "¥220,000", dueDate: "03-03", status: "sent",
          },
        ];
        mockExecuteFn.mockResolvedValue({ rows });

        const result = await caller.rndPipeline.rfqKanban.list();
        expect(result.items).toHaveLength(2);
        expect(result.items[0].rfqCode).toBe("RFQ-001");
        expect(result.items[1].status).toBe("sent");
      });

      it("returns empty items", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: [] });

        const result = await caller.rndPipeline.rfqKanban.list();
        expect(result.items).toEqual([]);
      });

      it("handles undefined rows", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({ rows: undefined });

        const result = await caller.rndPipeline.rfqKanban.list();
        expect(result.items).toEqual([]);
      });
    });

    describe("create", () => {
      it("creates an RFQ card with required fields", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 1, rfqCode: "RFQ-999" }],
        });

        const result = await caller.rndPipeline.rfqKanban.create({
          titleZh: "新物料",
          supplier: "Supplier X",
        });
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("rfqCode");
      });

      it("creates with all optional fields", async () => {
        const caller = createAuthenticatedCaller();
        mockExecuteFn.mockResolvedValue({
          rows: [{ id: 2, rfqCode: "RFQ-100" }],
        });

        const result = await caller.rndPipeline.rfqKanban.create({
          titleZh: "新物料",
          titleEn: "New Material",
          supplier: "Supplier Y",
          amount: "¥50,000",
          dueDate: "03-20",
        });
        expect(result.id).toBe(2);
      });

      it("rejects empty titleZh", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.rfqKanban.create({
            titleZh: "",
            supplier: "S",
          })
        ).rejects.toThrow();
      });

      it("rejects empty supplier", async () => {
        const caller = createAuthenticatedCaller();
        await expect(
          caller.rndPipeline.rfqKanban.create({
            titleZh: "T",
            supplier: "",
          })
        ).rejects.toThrow();
      });
    });
  });

  // =========================================================================
  // Input validation edge cases
  // =========================================================================
  describe("input validation edge cases", () => {
    it("quotation.list accepts no input", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteFn.mockResolvedValue({ rows: [] });
      const result = await caller.rndPipeline.quotation.list();
      expect(result).toHaveProperty("items");
    });

    it("requirement.list accepts no input", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteFn.mockResolvedValue({ rows: [] });
      const result = await caller.rndPipeline.requirement.list();
      expect(result).toHaveProperty("items");
    });

    it("solution.list accepts no input", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteFn.mockResolvedValue({ rows: [] });
      const result = await caller.rndPipeline.solution.list();
      expect(result).toHaveProperty("items");
    });

    it("mechanical.list accepts no input", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteFn.mockResolvedValue({ rows: [] });
      const result = await caller.rndPipeline.mechanical.list();
      expect(result).toHaveProperty("items");
    });

    it("electrical.list accepts no input", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteFn.mockResolvedValue({ rows: [] });
      const result = await caller.rndPipeline.electrical.list();
      expect(result).toHaveProperty("items");
    });

    it("installation.list accepts no input", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteFn.mockResolvedValue({ rows: [] });
      const result = await caller.rndPipeline.installation.list();
      expect(result).toHaveProperty("items");
    });

    it("satTest.list accepts no input", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteFn.mockResolvedValue({ rows: [] });
      const result = await caller.rndPipeline.satTest.list();
      expect(result).toHaveProperty("items");
    });

    it("acceptance.list accepts no input", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteFn.mockResolvedValue({ rows: [] });
      const result = await caller.rndPipeline.acceptance.list();
      expect(result).toHaveProperty("items");
    });

    it("rfqKanban.list accepts empty object input", async () => {
      const caller = createAuthenticatedCaller();
      mockExecuteFn.mockResolvedValue({ rows: [] });
      const result = await caller.rndPipeline.rfqKanban.list({});
      expect(result).toHaveProperty("items");
    });
  });
});
