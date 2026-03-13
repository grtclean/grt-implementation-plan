/**
 * Chat History Router — Unit Tests
 * 11 procedures across 2 groups:
 *   Queries    (4): list, getById, getSessions, getMessages, getStats
 *   Mutations  (6): create, update, delete, createSession, addMessage
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

/**
 * Two-layer mock: `db` (no .then) -> `chain` (thenable).
 * This avoids the JS thenable-unwrapping issue where Promise.resolve(obj)
 * calls obj.then() if it exists, destroying the mock.
 */
function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "onConflictDoNothing",
    "groupBy",
    "having",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve({ rows: [] })),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
  getDb: vi.fn(async () => mockDb),
}));

// ── Mock schema imports (column-name string objects) ────────
vi.mock("../../drizzle/schema", () => ({
  aiChatSessions: {
    id: "id",
    userId: "userId",
    assistantType: "assistantType",
    title: "title",
    status: "status",
    projectId: "projectId",
    customerId: "customerId",
    metadata: "metadata",
    messageCount: "messageCount",
    lastActivityAt: "lastActivityAt",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  aiChatMessages: {
    id: "id",
    sessionId: "sessionId",
    role: "role",
    content: "content",
    contentType: "contentType",
    metadata: "metadata",
    feedback: "feedback",
    feedbackContent: "feedbackContent",
    isBookmarked: "isBookmarked",
    createdAt: "createdAt",
  },
}));

// ── Mock drizzle-orm operators (pass-through) ───────────────
vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  or: vi.fn((...a: any[]) => a),
  desc: vi.fn((a: any) => a),
  asc: vi.fn((a: any) => a),
  sql: Object.assign(vi.fn((...a: any[]) => a), {
    raw: vi.fn((a: any) => a),
  }),
  ilike: vi.fn((...a: any[]) => a),
  count: vi.fn(() => "count"),
  gte: vi.fn((...a: any[]) => a),
}));

// ── Mock shared/validators (jsonValue) ──────────────────────
vi.mock("../../shared/validators", () => {
  const { z } = require("zod");
  return {
    jsonValue: z.any(),
  };
});

// ── Helpers ─────────────────────────────────────────────────
function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 1,
    assistantType: "solution",
    title: "Test Session",
    status: "active",
    projectId: null,
    customerId: null,
    metadata: null,
    messageCount: 0,
    lastActivityAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    sessionId: 1,
    role: "user",
    content: "Hello, world!",
    contentType: "text",
    metadata: null,
    feedback: null,
    feedbackContent: null,
    isBookmarked: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════
// QUERIES
// ══════════════════════════════════════════════════════════════

describe("chatHistory.list", () => {
  it("returns items and pagination info", async () => {
    const sessions = [makeSession(), makeSession({ id: 2, title: "Session 2" })];
    mockQueryResult = sessions;
    const caller = createAdminCaller();
    const result = await caller.chatHistory.list();
    expect(result).toEqual({
      items: sessions,
      total: 2,
      page: 1,
      pageSize: 2,
    });
  });

  it("returns empty list when no sessions exist", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.list();
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 0 });
  });

  it("returns single session", async () => {
    const session = makeSession();
    mockQueryResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.list();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.list()).rejects.toThrow();
  });
});

describe("chatHistory.getById", () => {
  it("returns a session by string id", async () => {
    const session = makeSession({ id: 42 });
    mockQueryResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getById({ id: "42" });
    expect(result).toEqual(session);
  });

  it("returns null when session not found", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getById({ id: "9999" });
    expect(result).toBeNull();
  });

  it("parses string id to integer", async () => {
    const session = makeSession({ id: 5 });
    mockQueryResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getById({ id: "5" });
    expect(result).toEqual(session);
    expect(mockDb.select).toHaveBeenCalled();
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.getById({ id: "1" })).rejects.toThrow();
  });
});

describe("chatHistory.getSessions", () => {
  it("returns all sessions ordered by lastActivityAt", async () => {
    const sessions = [
      makeSession({ id: 2, lastActivityAt: "2026-01-02T00:00:00.000Z" }),
      makeSession({ id: 1, lastActivityAt: "2026-01-01T00:00:00.000Z" }),
    ];
    mockQueryResult = sessions;
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getSessions();
    expect(result).toEqual(sessions);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no sessions", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getSessions();
    expect(result).toEqual([]);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.getSessions()).rejects.toThrow();
  });
});

describe("chatHistory.getMessages", () => {
  it("returns messages for a numeric sessionId", async () => {
    const messages = [makeMessage(), makeMessage({ id: 2, content: "Hi" })];
    mockQueryResult = messages;
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getMessages({ sessionId: 1 });
    expect(result).toEqual(messages);
  });

  it("returns messages for a string sessionId", async () => {
    const messages = [makeMessage({ sessionId: 5 })];
    mockQueryResult = messages;
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getMessages({ sessionId: "5" });
    expect(result).toEqual(messages);
  });

  it("returns empty array when no messages", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getMessages({ sessionId: 1 });
    expect(result).toEqual([]);
  });

  it("handles undefined input (defaults sessionId to 0)", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getMessages();
    expect(result).toEqual([]);
  });

  it("handles empty object input", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getMessages({});
    expect(result).toEqual([]);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.getMessages({ sessionId: 1 })).rejects.toThrow();
  });
});

describe("chatHistory.getStats", () => {
  it("returns session and message counts", async () => {
    selectResultsQueue.push([{ count: 10 }]); // totalSessions
    selectResultsQueue.push([{ count: 150 }]); // totalMessages
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getStats();
    expect(result).toEqual({
      stats: {
        totalSessions: 10,
        totalMessages: 150,
      },
    });
  });

  it("returns zeros when no data", async () => {
    selectResultsQueue.push([{ count: 0 }]); // totalSessions
    selectResultsQueue.push([{ count: 0 }]); // totalMessages
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getStats();
    expect(result).toEqual({
      stats: {
        totalSessions: 0,
        totalMessages: 0,
      },
    });
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.getStats()).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════
// MUTATIONS
// ══════════════════════════════════════════════════════════════

describe("chatHistory.create", () => {
  it("creates a session with all fields", async () => {
    const session = makeSession({ id: 10, assistantType: "planning", projectId: 5, customerId: 3 });
    mockReturningResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.create({
      assistantType: "planning",
      title: "Planning Session",
      projectId: 5,
      customerId: 3,
      metadata: { key: "value" },
    });
    expect(result).toEqual({ success: true, message: "会话已创建", data: session });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("creates a session with minimal fields (defaults assistantType to solution)", async () => {
    const session = makeSession({ id: 11 });
    mockReturningResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.create({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual(session);
  });

  it("creates a session with specific assistantType", async () => {
    const session = makeSession({ id: 12, assistantType: "kpi" });
    mockReturningResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.create({ assistantType: "kpi" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(session);
  });

  it("creates a session with metadata object", async () => {
    const session = makeSession({ id: 13, metadata: '{"foo":"bar"}' });
    mockReturningResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.create({
      metadata: { foo: "bar" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.chatHistory.create({ title: "Test" })
    ).rejects.toThrow();
  });

  it("rejects invalid assistantType", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.chatHistory.create({ assistantType: "invalid" as any })
    ).rejects.toThrow();
  });

  it("rejects title exceeding 200 characters", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.chatHistory.create({ title: "x".repeat(201) })
    ).rejects.toThrow();
  });
});

describe("chatHistory.update", () => {
  it("updates session title", async () => {
    const updated = makeSession({ title: "Updated Title" });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.update({
      id: 1,
      title: "Updated Title",
    });
    expect(result).toEqual({ success: true, message: "更新成功", data: updated });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("updates session status", async () => {
    const updated = makeSession({ status: "archived" });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.update({
      id: 1,
      status: "archived",
    });
    expect(result.success).toBe(true);
    expect(result.data.status).toBe("archived");
  });

  it("updates session with string id", async () => {
    const updated = makeSession({ id: 5, title: "New" });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.update({
      id: "5",
      title: "New",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(updated);
  });

  it("updates session with numeric id", async () => {
    const updated = makeSession({ id: 7, status: "deleted" });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.update({
      id: 7,
      status: "deleted",
    });
    expect(result.success).toBe(true);
    expect(result.data.status).toBe("deleted");
  });

  it("updates both title and status at once", async () => {
    const updated = makeSession({ title: "Archived Session", status: "archived" });
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.update({
      id: 1,
      title: "Archived Session",
      status: "archived",
    });
    expect(result.success).toBe(true);
    expect(result.data.title).toBe("Archived Session");
    expect(result.data.status).toBe("archived");
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.chatHistory.update({ id: 1, title: "Nope" })
    ).rejects.toThrow();
  });

  it("rejects invalid status value", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.chatHistory.update({ id: 1, status: "invalid" as any })
    ).rejects.toThrow();
  });

  it("rejects title exceeding 200 characters", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.chatHistory.update({ id: 1, title: "x".repeat(201) })
    ).rejects.toThrow();
  });
});

describe("chatHistory.delete", () => {
  it("deletes messages and session", async () => {
    // delete messages (thenable chain) then delete session (thenable chain)
    selectResultsQueue.push([]); // delete messages result
    selectResultsQueue.push([]); // delete session result
    const caller = createAdminCaller();
    const result = await caller.chatHistory.delete({ id: "1" });
    expect(result).toEqual({ success: true, message: "删除成功" });
    expect(mockDb.delete).toHaveBeenCalledTimes(2);
  });

  it("parses string id to integer for deletion", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.chatHistory.delete({ id: "42" });
    expect(result.success).toBe(true);
  });

  it("succeeds even when no messages exist for the session", async () => {
    selectResultsQueue.push([]); // no messages to delete
    selectResultsQueue.push([]); // delete session
    const caller = createAdminCaller();
    const result = await caller.chatHistory.delete({ id: "10" });
    expect(result).toEqual({ success: true, message: "删除成功" });
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.chatHistory.delete({ id: "1" })
    ).rejects.toThrow();
  });
});

describe("chatHistory.createSession", () => {
  it("creates a session with assistantType and title", async () => {
    const session = makeSession({ id: 20, assistantType: "quotation", title: "Quote Session" });
    mockReturningResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.createSession({
      assistantType: "quotation",
      title: "Quote Session",
    });
    expect(result).toEqual({ success: true, message: "会话已创建", data: session });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("creates a session with defaults (solution type, 新会话 title)", async () => {
    const session = makeSession({ id: 21, assistantType: "solution", title: "新会话" });
    mockReturningResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.createSession({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual(session);
  });

  it("creates with personal assistantType", async () => {
    const session = makeSession({ id: 22, assistantType: "personal" });
    mockReturningResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.createSession({
      assistantType: "personal",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.chatHistory.createSession({ title: "Test" })
    ).rejects.toThrow();
  });

  it("rejects invalid assistantType", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.chatHistory.createSession({ assistantType: "bogus" as any })
    ).rejects.toThrow();
  });
});

describe("chatHistory.addMessage", () => {
  it("inserts a message and updates session stats", async () => {
    const message = makeMessage({ id: 100, sessionId: 1, role: "user", content: "Hello" });
    mockReturningResult = [message];
    // count subquery result
    selectResultsQueue.push([{ count: 5 }]);
    // update session (thenable chain)
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.chatHistory.addMessage({
      sessionId: 1,
      role: "user",
      content: "Hello",
      contentType: "text",
    });
    expect(result).toEqual({ success: true, message: "消息已添加", data: message });
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("inserts a message with string sessionId", async () => {
    const message = makeMessage({ id: 101, sessionId: 5 });
    mockReturningResult = [message];
    selectResultsQueue.push([{ count: 3 }]);
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.chatHistory.addMessage({
      sessionId: "5",
      role: "assistant",
      content: "Response",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(message);
  });

  it("defaults role to user and content to empty string", async () => {
    const message = makeMessage({ id: 102, role: "user", content: "" });
    mockReturningResult = [message];
    selectResultsQueue.push([{ count: 1 }]);
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.chatHistory.addMessage({
      sessionId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("inserts a message with system role", async () => {
    const message = makeMessage({ id: 103, role: "system", content: "System prompt" });
    mockReturningResult = [message];
    selectResultsQueue.push([{ count: 2 }]);
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.chatHistory.addMessage({
      sessionId: 1,
      role: "system",
      content: "System prompt",
    });
    expect(result.success).toBe(true);
  });

  it("inserts a message with code contentType", async () => {
    const message = makeMessage({ id: 104, contentType: "code" });
    mockReturningResult = [message];
    selectResultsQueue.push([{ count: 4 }]);
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.chatHistory.addMessage({
      sessionId: 1,
      content: "const x = 1;",
      contentType: "code",
    });
    expect(result.success).toBe(true);
  });

  it("inserts a message with table contentType", async () => {
    const message = makeMessage({ id: 105, contentType: "table" });
    mockReturningResult = [message];
    selectResultsQueue.push([{ count: 6 }]);
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.chatHistory.addMessage({
      sessionId: 1,
      content: "| A | B |",
      contentType: "table",
    });
    expect(result.success).toBe(true);
  });

  it("inserts a message with file contentType", async () => {
    const message = makeMessage({ id: 106, contentType: "file" });
    mockReturningResult = [message];
    selectResultsQueue.push([{ count: 7 }]);
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.chatHistory.addMessage({
      sessionId: 1,
      content: "file://path/to/file",
      contentType: "file",
    });
    expect(result.success).toBe(true);
  });

  it("inserts a message with metadata", async () => {
    const message = makeMessage({ id: 107, metadata: '{"source":"api"}' });
    mockReturningResult = [message];
    selectResultsQueue.push([{ count: 8 }]);
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.chatHistory.addMessage({
      sessionId: 1,
      content: "With metadata",
      metadata: { source: "api" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.chatHistory.addMessage({ sessionId: 1, content: "test" })
    ).rejects.toThrow();
  });

  it("rejects invalid role", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.chatHistory.addMessage({ sessionId: 1, role: "invalid" as any })
    ).rejects.toThrow();
  });

  it("rejects invalid contentType", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.chatHistory.addMessage({ sessionId: 1, contentType: "html" as any })
    ).rejects.toThrow();
  });

  it("rejects content exceeding 50000 characters", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.chatHistory.addMessage({ sessionId: 1, content: "x".repeat(50001) })
    ).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════
// INPUT VALIDATION EDGE CASES
// ══════════════════════════════════════════════════════════════

describe("chatHistory — input validation edge cases", () => {
  it("getById rejects missing id", async () => {
    const caller = createAdminCaller();
    await expect(
      (caller.chatHistory.getById as any)({})
    ).rejects.toThrow();
  });

  it("create accepts empty object", async () => {
    const session = makeSession();
    mockReturningResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.create({});
    expect(result.success).toBe(true);
  });

  it("update accepts only id (no title or status)", async () => {
    const updated = makeSession();
    mockReturningResult = [updated];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.update({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("createSession accepts empty object", async () => {
    const session = makeSession();
    mockReturningResult = [session];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.createSession({});
    expect(result.success).toBe(true);
  });

  it("getMessages accepts undefined input", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.chatHistory.getMessages(undefined);
    expect(result).toEqual([]);
  });

  it("create all valid assistantType values", async () => {
    const types = ["solution", "quotation", "planning", "kpi", "personal"] as const;
    for (const t of types) {
      mockReturningResult = [makeSession({ assistantType: t })];
      const caller = createAdminCaller();
      const result = await caller.chatHistory.create({ assistantType: t });
      expect(result.success).toBe(true);
    }
  });

  it("update all valid status values", async () => {
    const statuses = ["active", "archived", "deleted"] as const;
    for (const s of statuses) {
      mockReturningResult = [makeSession({ status: s })];
      const caller = createAdminCaller();
      const result = await caller.chatHistory.update({ id: 1, status: s });
      expect(result.success).toBe(true);
    }
  });

  it("addMessage all valid role values", async () => {
    const roles = ["user", "assistant", "system"] as const;
    for (const r of roles) {
      mockReturningResult = [makeMessage({ role: r })];
      selectResultsQueue.push([{ count: 1 }]);
      selectResultsQueue.push([]);
      const caller = createAdminCaller();
      const result = await caller.chatHistory.addMessage({ sessionId: 1, role: r, content: "test" });
      expect(result.success).toBe(true);
    }
  });

  it("addMessage all valid contentType values", async () => {
    const types = ["text", "table", "code", "file"] as const;
    for (const ct of types) {
      mockReturningResult = [makeMessage({ contentType: ct })];
      selectResultsQueue.push([{ count: 1 }]);
      selectResultsQueue.push([]);
      const caller = createAdminCaller();
      const result = await caller.chatHistory.addMessage({ sessionId: 1, contentType: ct, content: "test" });
      expect(result.success).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// AUTHENTICATION GUARDS
// ══════════════════════════════════════════════════════════════

describe("chatHistory — authentication", () => {
  it("rejects anonymous for list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.list()).rejects.toThrow();
  });

  it("rejects anonymous for getById", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.getById({ id: "1" })).rejects.toThrow();
  });

  it("rejects anonymous for create", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.create({})).rejects.toThrow();
  });

  it("rejects anonymous for update", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.update({ id: 1 })).rejects.toThrow();
  });

  it("rejects anonymous for delete", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.delete({ id: "1" })).rejects.toThrow();
  });

  it("rejects anonymous for getSessions", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.getSessions()).rejects.toThrow();
  });

  it("rejects anonymous for createSession", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.createSession({})).rejects.toThrow();
  });

  it("rejects anonymous for getMessages", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.getMessages({ sessionId: 1 })).rejects.toThrow();
  });

  it("rejects anonymous for addMessage", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.chatHistory.addMessage({ sessionId: 1, content: "test" })
    ).rejects.toThrow();
  });

  it("rejects anonymous for getStats", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.chatHistory.getStats()).rejects.toThrow();
  });
});
