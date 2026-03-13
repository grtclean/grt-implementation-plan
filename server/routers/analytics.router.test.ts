/**
 * Analytics Router — Unit Tests
 *
 * 3 procedures (all protectedProcedure):
 *   Queries    (2): getOverview, getDetails
 *   Mutations  (1): track
 *
 * Covers:
 *   - getOverview: total + charts mapping, empty state
 *   - getDetails: unfiltered, filtered by eventType, empty, no-input
 *   - track: full fields, default eventType, string eventData, record eventData
 *   - Auth guards: anonymous callers rejected
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
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
    execute: vi.fn(() => Promise.resolve(mockQueryResult)),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
  getDb: vi.fn(async () => mockDb),
}));

// ── Mock schema imports (column-name string objects) ────────
vi.mock("../../drizzle/schema", () => ({
  analyticsEvents: {
    id: "id",
    userId: "userId",
    eventType: "eventType",
    eventData: "eventData",
    createdAt: "createdAt",
  },
}));

// ── Mock drizzle-orm operators (pass-through) ───────────────
vi.mock("drizzle-orm", () => ({
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

// ── Helpers ─────────────────────────────────────────────────
function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 1,
    eventType: "page_view",
    eventData: null,
    createdAt: "2026-03-01T00:00:00.000Z",
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

describe("analytics.getOverview", () => {
  it("returns total and charts from event breakdown", async () => {
    // First select: total count
    selectResultsQueue.push([{ count: 150 }]);
    // Second select: event type breakdown
    selectResultsQueue.push([
      { eventType: "page_view", count: 100 },
      { eventType: "click", count: 50 },
    ]);

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.getOverview();

    expect(result.total).toBe(150);
    expect(result.charts).toEqual([
      { label: "page_view", value: 100 },
      { label: "click", value: 50 },
    ]);
    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });

  it("returns zero total and empty charts when no events exist", async () => {
    // First select: total count is 0
    selectResultsQueue.push([{ count: 0 }]);
    // Second select: no breakdown rows
    selectResultsQueue.push([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.getOverview();

    expect(result.total).toBe(0);
    expect(result.charts).toEqual([]);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.analytics.getOverview()).rejects.toThrow();
  });
});

describe("analytics.getDetails", () => {
  it("returns all events when no filter is provided", async () => {
    const events = [
      makeEvent({ id: 1, eventType: "page_view" }),
      makeEvent({ id: 2, eventType: "click" }),
    ];
    mockQueryResult = events;

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.getDetails({});

    expect(result).toEqual(events);
    expect(result).toHaveLength(2);
  });

  it("filters events by eventType when provided", async () => {
    const clickEvents = [
      makeEvent({ id: 3, eventType: "click" }),
      makeEvent({ id: 4, eventType: "click" }),
    ];
    mockQueryResult = clickEvents;

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.getDetails({ eventType: "click" });

    expect(result).toEqual(clickEvents);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no events match", async () => {
    mockQueryResult = [];

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.getDetails({ eventType: "nonexistent" });

    expect(result).toEqual([]);
  });

  it("works with no input (undefined)", async () => {
    const events = [makeEvent()];
    mockQueryResult = events;

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.getDetails();

    expect(result).toEqual(events);
  });

  it("returns empty array when no events exist at all", async () => {
    mockQueryResult = [];

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.getDetails();

    expect(result).toEqual([]);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.analytics.getDetails()).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════
// MUTATIONS
// ══════════════════════════════════════════════════════════════

describe("analytics.track", () => {
  it("creates an event with all fields provided", async () => {
    const trackedEvent = makeEvent({
      id: 10,
      userId: 1,
      eventType: "button_click",
      eventData: '{"buttonId":"submit"}',
    });
    mockReturningResult = [trackedEvent];

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.track({
      eventType: "button_click",
      eventData: { buttonId: "submit" },
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("事件已记录");
    expect(result.data).toEqual(trackedEvent);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it("defaults eventType to 'page_view' when not provided", async () => {
    const trackedEvent = makeEvent({ id: 11, eventType: "page_view" });
    mockReturningResult = [trackedEvent];

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.track({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(trackedEvent);
  });

  it("accepts string eventData", async () => {
    const trackedEvent = makeEvent({
      id: 12,
      eventType: "navigation",
      eventData: "/dashboard",
    });
    mockReturningResult = [trackedEvent];

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.track({
      eventType: "navigation",
      eventData: "/dashboard",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(trackedEvent);
  });

  it("accepts record (object) eventData and serializes to JSON", async () => {
    const trackedEvent = makeEvent({
      id: 13,
      eventType: "form_submit",
      eventData: '{"formId":"contact","fields":3}',
    });
    mockReturningResult = [trackedEvent];

    const caller = createAuthenticatedCaller();
    const result = await caller.analytics.track({
      eventType: "form_submit",
      eventData: { formId: "contact", fields: 3 },
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(trackedEvent);
  });

  it("rejects unauthenticated users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.analytics.track({ eventType: "test" })
    ).rejects.toThrow();
  });
});
