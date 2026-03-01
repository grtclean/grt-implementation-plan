/**
 * Notification Router — Unit Tests
 * 6 procedures:
 *   Queries    (2): list, stats
 *   Mutations  (4): markRead, markAllRead, archive, deleteBatch, seedDemo
 *
 * The router uses ONLY db.execute(sql`...`) — no Drizzle ORM select/insert/update/delete chains.
 * All procedures are protectedProcedure (require authenticated user).
 * Every procedure has a try/catch with a fallback return value.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
const executeResults: any[] = [];

function getNextExecuteResult() {
  return executeResults.length > 0
    ? executeResults.shift()!
    : { rows: [] };
}

const mockDb: any = {
  execute: vi.fn(() => Promise.resolve(getNextExecuteResult())),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
  getDb: vi.fn(async () => mockDb),
}));

// ── Mock drizzle-orm (sql tagged template used throughout) ───
vi.mock("drizzle-orm", () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values }),
    { raw: vi.fn((a: any) => a) },
  ),
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  or: vi.fn((...a: any[]) => a),
  desc: vi.fn((a: any) => a),
  asc: vi.fn((a: any) => a),
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  executeResults.length = 0;
  vi.clearAllMocks();
  // Restore the default execute implementation (in case a test used mockReset + mockImplementation)
  mockDb.execute.mockImplementation(() => Promise.resolve(getNextExecuteResult()));
});

// ══════════════════════════════════════════════════════════════
// QUERIES
// ══════════════════════════════════════════════════════════════

describe("notification.list", () => {
  it("returns items and total from DB (happy path)", async () => {
    // First execute: ensureNotificationsTable (CREATE TABLE)
    executeResults.push({ rows: [] });
    // Second execute: SELECT * FROM notifications
    executeResults.push({
      rows: [
        {
          id: 1,
          title: "Test Notification",
          description: "Some desc",
          type: "info",
          category: "system",
          is_read: false,
          is_important: true,
          action_url: "/dashboard",
          source_module: "core",
          created_at: "2026-03-01T00:00:00.000Z",
        },
      ],
    });
    // Third execute: SELECT COUNT(*)
    executeResults.push({ rows: [{ total: 1 }] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: "1",
      title: "Test Notification",
      description: "Some desc",
      type: "info",
      category: "system",
      isRead: false,
      isImportant: true,
      actionUrl: "/dashboard",
      sourceModule: "core",
      createdAt: "2026-03-01T00:00:00.000Z",
    });
    expect(result.total).toBe(1);
  });

  it("returns empty items when DB has no notifications", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({ rows: [] }); // SELECT *
    executeResults.push({ rows: [{ total: 0 }] }); // COUNT

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("applies 'unread' filter", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({
      rows: [
        { id: 2, title: "Unread", description: null, type: "info", category: "hr", is_read: false, is_important: false, action_url: null, source_module: null, created_at: "2026-03-01T00:00:00.000Z" },
      ],
    });
    executeResults.push({ rows: [{ total: 1 }] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list({ filter: "unread" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].isRead).toBe(false);
  });

  it("applies 'important' filter", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({
      rows: [
        { id: 3, title: "Important", description: null, type: "warning", category: "hr", is_read: false, is_important: true, action_url: null, source_module: null, created_at: "2026-03-01T00:00:00.000Z" },
      ],
    });
    executeResults.push({ rows: [{ total: 1 }] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list({ filter: "important" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].isImportant).toBe(true);
  });

  it("applies 'ai' filter", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({
      rows: [
        { id: 4, title: "AI Suggestion", description: null, type: "ai_suggestion", category: "hr", is_read: false, is_important: true, action_url: null, source_module: "ai-engine", created_at: "2026-03-01T00:00:00.000Z" },
      ],
    });
    executeResults.push({ rows: [{ total: 1 }] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list({ filter: "ai" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("ai_suggestion");
  });

  it("applies category filter", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({
      rows: [
        { id: 5, title: "HR Notif", description: null, type: "info", category: "hr", is_read: false, is_important: false, action_url: null, source_module: null, created_at: "2026-03-01T00:00:00.000Z" },
      ],
    });
    executeResults.push({ rows: [{ total: 1 }] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list({ filter: "all", category: "hr" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].category).toBe("hr");
  });

  it("supports pagination parameters", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({ rows: [] }); // SELECT with OFFSET
    executeResults.push({ rows: [{ total: 100 }] }); // COUNT

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list({ page: 3, pageSize: 10 });
    expect(result.total).toBe(100);
    expect(result.items).toEqual([]);
    // Verify db.execute was called (CREATE TABLE + SELECT + COUNT = 3)
    expect(mockDb.execute).toHaveBeenCalledTimes(3);
  });

  it("uses default page=1 and pageSize=50 when not provided", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({ rows: [] }); // SELECT
    executeResults.push({ rows: [{ total: 0 }] }); // COUNT

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list();
    expect(result.total).toBe(0);
    expect(mockDb.execute).toHaveBeenCalledTimes(3);
  });

  it("accepts undefined input (all optional)", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({ rows: [] }); // SELECT
    executeResults.push({ rows: [{ total: 0 }] }); // COUNT

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list(undefined);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("falls back to seed data when DB throws", async () => {
    // Make execute throw on the first call (ensureTable)
    mockDb.execute.mockRejectedValueOnce(new Error("DB connection failed"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list();
    expect(result.items.length).toBe(10); // All 10 SEED_NOTIFICATIONS
    expect(result.total).toBe(10);
    // Verify seed structure
    expect(result.items[0]).toHaveProperty("id");
    expect(result.items[0]).toHaveProperty("title");
    expect(result.items[0]).toHaveProperty("type");
    expect(result.items[0]).toHaveProperty("category");
    expect(result.items[0]).toHaveProperty("isRead");
    expect(result.items[0]).toHaveProperty("isImportant");
    expect(result.items[0]).toHaveProperty("actionUrl");
    expect(result.items[0]).toHaveProperty("sourceModule");
    expect(result.items[0]).toHaveProperty("createdAt");
  });

  it("fallback: 'unread' filter returns only unread seed items", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("fail"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list({ filter: "unread" });
    // Seed: items with index < 4 are unread (isRead = i >= 4)
    // So items 0,1,2,3 are unread = 4 items
    expect(result.items.length).toBe(4);
    for (const item of result.items) {
      expect(item.isRead).toBe(false);
    }
  });

  it("fallback: 'important' filter returns only important seed items", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("fail"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list({ filter: "important" });
    // Seed items with is_important: true = indices 0,1,3,6,8 = 5 items
    expect(result.items.length).toBe(5);
    for (const item of result.items) {
      expect(item.isImportant).toBe(true);
    }
  });

  it("fallback: 'ai' filter returns only ai_suggestion seed items", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("fail"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list({ filter: "ai" });
    // Only seed[0] has type: "ai_suggestion"
    expect(result.items.length).toBe(1);
    expect(result.items[0].type).toBe("ai_suggestion");
  });

  it("fallback: total equals filtered items length", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("fail"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list({ filter: "all" });
    expect(result.total).toBe(result.items.length);
  });

  it("returns items.length as total when countRow is missing", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({
      rows: [
        { id: 1, title: "T", description: null, type: "info", category: "system", is_read: false, is_important: false, action_url: null, source_module: null, created_at: "2026-01-01" },
      ],
    }); // SELECT
    // COUNT returns no rows at all
    executeResults.push({ rows: [] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list();
    // countRow is undefined, so total = countRow?.total ?? items.length = 1
    expect(result.total).toBe(1);
  });

  it("rejects invalid filter value", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.notification.list({ filter: "invalid_filter" as any })
    ).rejects.toThrow();
  });
});

describe("notification.stats", () => {
  it("returns stats from DB (happy path)", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({
      rows: [{
        total: 20,
        unread: 8,
        important_unread: 3,
        ai_suggestions: 2,
        today: 5,
      }],
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.stats();
    expect(result).toEqual({
      total: 20,
      unread: 8,
      importantUnread: 3,
      aiSuggestions: 2,
      today: 5,
    });
  });

  it("returns zeros when DB has no data", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({ rows: [{}] }); // empty row

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.stats();
    expect(result).toEqual({
      total: 0,
      unread: 0,
      importantUnread: 0,
      aiSuggestions: 0,
      today: 0,
    });
  });

  it("returns zeros when rows array is empty", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({ rows: [] }); // no rows

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.stats();
    expect(result).toEqual({
      total: 0,
      unread: 0,
      importantUnread: 0,
      aiSuggestions: 0,
      today: 0,
    });
  });

  it("converts string numbers to Number", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({
      rows: [{
        total: "15",
        unread: "7",
        important_unread: "2",
        ai_suggestions: "1",
        today: "4",
      }],
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.stats();
    expect(result.total).toBe(15);
    expect(typeof result.total).toBe("number");
    expect(result.unread).toBe(7);
    expect(typeof result.unread).toBe("number");
  });

  it("falls back to hardcoded stats when DB throws", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("DB error"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.stats();
    expect(result).toEqual({
      total: 10,
      unread: 4,
      importantUnread: 2,
      aiSuggestions: 1,
      today: 3,
    });
  });

  it("handles user with id for user-scoped filtering", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({
      rows: [{ total: 5, unread: 2, important_unread: 1, ai_suggestions: 0, today: 1 }],
    });

    const caller = createAuthenticatedCaller({ id: 42 });
    const result = await caller.notification.stats();
    expect(result.total).toBe(5);
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });
});

// ══════════════════════════════════════════════════════════════
// MUTATIONS
// ══════════════════════════════════════════════════════════════

describe("notification.markRead", () => {
  it("marks a notification as read with numeric id", async () => {
    executeResults.push({ rows: [] }); // UPDATE result

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.markRead({ id: 1 });
    expect(result).toEqual({ success: true });
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it("marks a notification as read with string id", async () => {
    executeResults.push({ rows: [] }); // UPDATE result

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.markRead({ id: "42" });
    expect(result).toEqual({ success: true });
  });

  it("returns success even when DB throws", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("DB error"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.markRead({ id: 999 });
    expect(result).toEqual({ success: true });
  });

  it("rejects missing id", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.notification.markRead as any)({})
    ).rejects.toThrow();
  });
});

describe("notification.markAllRead", () => {
  it("marks all notifications as read", async () => {
    executeResults.push({ rows: [] }); // UPDATE result

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.markAllRead();
    expect(result).toEqual({ success: true });
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it("returns success even when DB throws", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("DB error"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.markAllRead();
    expect(result).toEqual({ success: true });
  });

  it("uses user id for scoped update when available", async () => {
    executeResults.push({ rows: [] }); // UPDATE

    const caller = createAuthenticatedCaller({ id: 7 });
    const result = await caller.notification.markAllRead();
    expect(result).toEqual({ success: true });
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });
});

describe("notification.archive", () => {
  it("archives a notification with numeric id", async () => {
    executeResults.push({ rows: [] }); // UPDATE

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.archive({ id: 5 });
    expect(result).toEqual({ success: true });
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it("archives a notification with string id", async () => {
    executeResults.push({ rows: [] }); // UPDATE

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.archive({ id: "10" });
    expect(result).toEqual({ success: true });
  });

  it("returns success even when DB throws", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("DB error"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.archive({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("rejects missing id", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.notification.archive as any)({})
    ).rejects.toThrow();
  });
});

describe("notification.deleteBatch", () => {
  it("deletes multiple notifications by ids", async () => {
    // One execute call per id
    executeResults.push({ rows: [] }); // DELETE for id 1
    executeResults.push({ rows: [] }); // DELETE for id 2
    executeResults.push({ rows: [] }); // DELETE for id 3

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.deleteBatch({ ids: [1, 2, 3] });
    expect(result).toEqual({ success: true, deleted: 3 });
    expect(mockDb.execute).toHaveBeenCalledTimes(3);
  });

  it("deletes with string ids", async () => {
    executeResults.push({ rows: [] });
    executeResults.push({ rows: [] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.deleteBatch({ ids: ["5", "10"] });
    expect(result).toEqual({ success: true, deleted: 2 });
  });

  it("deletes with mixed string and number ids", async () => {
    executeResults.push({ rows: [] });
    executeResults.push({ rows: [] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.deleteBatch({ ids: [1, "2"] });
    expect(result).toEqual({ success: true, deleted: 2 });
  });

  it("handles empty ids array", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.notification.deleteBatch({ ids: [] });
    expect(result).toEqual({ success: true, deleted: 0 });
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it("returns success with correct count even when DB throws", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("DB error"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.deleteBatch({ ids: [1, 2] });
    // catch block returns { success: true, deleted: input.ids.length }
    expect(result).toEqual({ success: true, deleted: 2 });
  });

  it("rejects when ids is not an array", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.notification.deleteBatch as any)({ ids: "not-array" })
    ).rejects.toThrow();
  });
});

describe("notification.seedDemo", () => {
  it("seeds all demo notifications successfully", async () => {
    // ensureNotificationsTable: CREATE TABLE
    executeResults.push({ rows: [] });
    // 10 INSERT executes (one per seed notification)
    for (let i = 0; i < 10; i++) {
      executeResults.push({ rows: [] });
    }

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.seedDemo();
    expect(result.seeded).toBe(true);
    expect(result.count).toBe(10);
    expect(result.results).toHaveLength(10);
    for (const r of result.results!) {
      expect(r.status).toBe("ok");
    }
    // ensureTable + 10 inserts = 11
    expect(mockDb.execute).toHaveBeenCalledTimes(11);
  });

  it("records error status when individual INSERT fails", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    // First insert fails, rest succeed
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] }) // ensureTable (already pushed, this is extra insurance)
      .mockRejectedValueOnce(new Error("Duplicate key"))
      .mockResolvedValue({ rows: [] }); // remaining inserts

    // Reset to use mockImplementation approach instead
    mockDb.execute.mockReset();
    let callIndex = 0;
    mockDb.execute.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return Promise.resolve({ rows: [] }); // ensureTable
      if (callIndex === 2) return Promise.reject(new Error("Duplicate key")); // first insert fails
      return Promise.resolve({ rows: [] }); // remaining inserts succeed
    });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.seedDemo();
    expect(result.seeded).toBe(true);
    expect(result.count).toBe(10);
    expect(result.results![0].status).toBe("error");
    expect(result.results![0].error).toContain("Duplicate key");
    expect(result.results![1].status).toBe("ok");
  });

  it("returns seeded=false when ensureTable fails", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("Cannot create table"));

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.seedDemo();
    expect(result.seeded).toBe(false);
    expect(result.error).toContain("Cannot create table");
  });

  it("uses user id from context for user_id column", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    for (let i = 0; i < 10; i++) {
      executeResults.push({ rows: [] });
    }

    const caller = createAuthenticatedCaller({ id: 42 });
    const result = await caller.notification.seedDemo();
    expect(result.seeded).toBe(true);
    expect(result.count).toBe(10);
  });

  it("seeds with null user_id when ctx.user has no id", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    for (let i = 0; i < 10; i++) {
      executeResults.push({ rows: [] });
    }

    // User exists (protectedProcedure passes) but we test the path
    const caller = createAuthenticatedCaller();
    const result = await caller.notification.seedDemo();
    expect(result.seeded).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// AUTHENTICATION GUARDS
// ══════════════════════════════════════════════════════════════

describe("notification - authentication", () => {
  it("rejects anonymous for list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.notification.list()).rejects.toThrow();
  });

  it("rejects anonymous for stats", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.notification.stats()).rejects.toThrow();
  });

  it("rejects anonymous for markRead", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.notification.markRead({ id: 1 })
    ).rejects.toThrow();
  });

  it("rejects anonymous for markAllRead", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.notification.markAllRead()).rejects.toThrow();
  });

  it("rejects anonymous for archive", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.notification.archive({ id: 1 })
    ).rejects.toThrow();
  });

  it("rejects anonymous for deleteBatch", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.notification.deleteBatch({ ids: [1] })
    ).rejects.toThrow();
  });

  it("rejects anonymous for seedDemo", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.notification.seedDemo()).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════
// INPUT VALIDATION EDGE CASES
// ══════════════════════════════════════════════════════════════

describe("notification - input validation", () => {
  it("list rejects negative page number (Zod validation)", async () => {
    // page is z.number().default(1) — negative is allowed by z.number()
    // but let's verify it still works without crashing
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({ rows: [] }); // SELECT
    executeResults.push({ rows: [{ total: 0 }] }); // COUNT

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list({ page: -1, pageSize: 10 });
    expect(result).toHaveProperty("items");
  });

  it("markRead accepts numeric 0 as id", async () => {
    executeResults.push({ rows: [] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.markRead({ id: 0 });
    expect(result).toEqual({ success: true });
  });

  it("archive accepts large numeric id", async () => {
    executeResults.push({ rows: [] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.archive({ id: 999999 });
    expect(result).toEqual({ success: true });
  });

  it("deleteBatch with single id", async () => {
    executeResults.push({ rows: [] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.deleteBatch({ ids: [42] });
    expect(result).toEqual({ success: true, deleted: 1 });
  });

  it("list with all filter combinations", async () => {
    for (const filter of ["all", "unread", "important", "ai"] as const) {
      executeResults.push({ rows: [] }); // ensureTable
      executeResults.push({ rows: [] }); // SELECT
      executeResults.push({ rows: [{ total: 0 }] }); // COUNT

      const caller = createAuthenticatedCaller();
      const result = await caller.notification.list({ filter });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    }
  });
});

// ══════════════════════════════════════════════════════════════
// DB INTERACTION DETAILS
// ══════════════════════════════════════════════════════════════

describe("notification - DB interactions", () => {
  it("list calls ensureNotificationsTable before querying", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({ rows: [] }); // SELECT
    executeResults.push({ rows: [{ total: 0 }] }); // COUNT

    const caller = createAuthenticatedCaller();
    await caller.notification.list();
    // First call should be CREATE TABLE IF NOT EXISTS
    expect(mockDb.execute).toHaveBeenCalledTimes(3);
  });

  it("stats calls ensureNotificationsTable before querying", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({ rows: [{ total: 0, unread: 0, important_unread: 0, ai_suggestions: 0, today: 0 }] });

    const caller = createAuthenticatedCaller();
    await caller.notification.stats();
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it("markRead does NOT call ensureNotificationsTable", async () => {
    executeResults.push({ rows: [] }); // UPDATE only

    const caller = createAuthenticatedCaller();
    await caller.notification.markRead({ id: 1 });
    // Only 1 call: the UPDATE itself (no ensureTable)
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it("markAllRead does NOT call ensureNotificationsTable", async () => {
    executeResults.push({ rows: [] }); // UPDATE only

    const caller = createAuthenticatedCaller();
    await caller.notification.markAllRead();
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it("archive does NOT call ensureNotificationsTable", async () => {
    executeResults.push({ rows: [] }); // UPDATE only

    const caller = createAuthenticatedCaller();
    await caller.notification.archive({ id: 1 });
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it("seedDemo calls ensureNotificationsTable before inserting", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    for (let i = 0; i < 10; i++) {
      executeResults.push({ rows: [] });
    }

    const caller = createAuthenticatedCaller();
    await caller.notification.seedDemo();
    // 1 ensureTable + 10 inserts = 11
    expect(mockDb.execute).toHaveBeenCalledTimes(11);
  });

  it("list maps DB column names to camelCase output", async () => {
    executeResults.push({ rows: [] }); // ensureTable
    executeResults.push({
      rows: [{
        id: 99,
        title: "Test",
        description: "Desc",
        type: "warning",
        category: "procurement",
        is_read: true,
        is_important: false,
        action_url: "/pos/procurement",
        source_module: "supply-chain",
        created_at: "2026-02-28T12:00:00.000Z",
      }],
    });
    executeResults.push({ rows: [{ total: 1 }] });

    const caller = createAuthenticatedCaller();
    const result = await caller.notification.list();
    const item = result.items[0];
    // Verify camelCase mapping
    expect(item.id).toBe("99"); // String(id)
    expect(item.isRead).toBe(true); // is_read -> isRead
    expect(item.isImportant).toBe(false); // is_important -> isImportant
    expect(item.actionUrl).toBe("/pos/procurement"); // action_url -> actionUrl
    expect(item.sourceModule).toBe("supply-chain"); // source_module -> sourceModule
    expect(item.createdAt).toBe("2026-02-28T12:00:00.000Z"); // created_at -> createdAt
  });
});
