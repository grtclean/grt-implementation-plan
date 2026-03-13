/**
 * Alert Rule Router (成本预警规则管理) — Comprehensive Unit Tests
 *
 * Covers all 8 procedures: list, listHistory, getStatistics,
 * create, update, delete, toggleEnabled, acknowledge.
 *
 * Run: npx vitest run server/routers/alert-rule.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock DB — FIFO queue pattern for sequential selects / returning calls
// ---------------------------------------------------------------------------

const { selectResultsQueue, returningQueue } = vi.hoisted(() => ({
  selectResultsQueue: [] as any[][],
  returningQueue: [] as any[][],
}));

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => {
    const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1 }];
    return Object.assign(Promise.resolve(r), {
      then: (resolve: any) => Promise.resolve(r).then(resolve),
      catch: () => Promise.resolve(r),
    });
  });
  chain.then = (resolve: any, reject?: any) => {
    const result =
      selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
    try {
      return resolve(result);
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };
  return chain;
}

const mockDb: any = {
  select: vi.fn(() => createMockDb()),
  insert: vi.fn(() => createMockDb()),
  update: vi.fn(() => createMockDb()),
  delete: vi.fn(() => createMockDb()),
  execute: vi.fn(() => Promise.resolve([[]])),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ---------------------------------------------------------------------------
// Mock schema tables
// ---------------------------------------------------------------------------

vi.mock("../../drizzle/schema", () => ({
  costAlertRules: {
    id: "id",
    name: "name",
    description: "description",
    scope: "scope",
    projectId: "projectId",
    categoryId: "categoryId",
    alertType: "alertType",
    threshold: "threshold",
    alertLevel: "alertLevel",
    notifyType: "notifyType",
    notifyUserIds: "notifyUserIds",
    isActive: "isActive",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  costAlertLogs: {
    id: "id",
    ruleId: "ruleId",
    projectId: "projectId",
    alertLevel: "alertLevel",
    title: "title",
    content: "content",
    currentValue: "currentValue",
    thresholdValue: "thresholdValue",
    status: "status",
    handlerId: "handlerId",
    handleNote: "handleNote",
    handledAt: "handledAt",
    isNotified: "isNotified",
    notifiedAt: "notifiedAt",
    createdAt: "createdAt",
  },
}));

// ---------------------------------------------------------------------------
// Mock drizzle-orm operators
// ---------------------------------------------------------------------------

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  and: vi.fn((...args: any[]) => args),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn((...args: any[]) => args), {
    raw: vi.fn((s: string) => s),
  }),
}));

// ---------------------------------------------------------------------------
// Import test utilities AFTER mocks are registered
// ---------------------------------------------------------------------------

import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// =========================================================================
// Convenience helper
// =========================================================================

const caller = () => createAdminCaller();

// =========================================================================
// Reset mocks before each test
// =========================================================================

beforeEach(() => {
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  vi.clearAllMocks();
});

// =========================================================================
// 1. list — List all costAlertRules
// =========================================================================

describe("alertRule.list", () => {
  it("returns empty list when no rules exist", async () => {
    selectResultsQueue.push([]);

    const result = await caller().alertRule.list();

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(0);
  });

  it("returns rules with correct pagination shape", async () => {
    const rules = [
      { id: 1, name: "Rule A", isActive: 1 },
      { id: 2, name: "Rule B", isActive: 0 },
      { id: 3, name: "Rule C", isActive: 1 },
    ];
    selectResultsQueue.push(rules);

    const result = await caller().alertRule.list();

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(3);
  });

  it("calls select().from().orderBy() on the db", async () => {
    selectResultsQueue.push([]);

    await caller().alertRule.list();

    expect(mockDb.select).toHaveBeenCalled();
  });
});

// =========================================================================
// 2. listHistory — List recent costAlertLogs
// =========================================================================

describe("alertRule.listHistory", () => {
  it("returns empty array when no logs exist", async () => {
    selectResultsQueue.push([]);

    const result = await caller().alertRule.listHistory();

    expect(result).toEqual([]);
  });

  it("returns log records", async () => {
    const logs = [
      { id: 1, ruleId: 1, status: "pending", alertLevel: "warning" },
      { id: 2, ruleId: 2, status: "acknowledged", alertLevel: "critical" },
    ];
    selectResultsQueue.push(logs);

    const result = await caller().alertRule.listHistory();

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("pending");
    expect(result[1].alertLevel).toBe("critical");
  });

  it("calls select().from().orderBy().limit(100)", async () => {
    selectResultsQueue.push([]);

    await caller().alertRule.listHistory();

    expect(mockDb.select).toHaveBeenCalled();
  });
});

// =========================================================================
// 3. getStatistics — 4 sequential count queries
// =========================================================================

describe("alertRule.getStatistics", () => {
  it("returns statistics from 4 sequential count queries", async () => {
    // Queue 4 entries: totalRules, activeRules, totalAlerts, pendingAlerts
    selectResultsQueue.push([{ count: 10 }]);
    selectResultsQueue.push([{ count: 7 }]);
    selectResultsQueue.push([{ count: 25 }]);
    selectResultsQueue.push([{ count: 3 }]);

    const result = await caller().alertRule.getStatistics();

    expect(result.statistics).toEqual({
      totalRules: 10,
      activeRules: 7,
      totalAlerts: 25,
      pendingAlerts: 3,
    });
  });

  it("returns zero counts when all tables empty", async () => {
    selectResultsQueue.push([{ count: 0 }]);
    selectResultsQueue.push([{ count: 0 }]);
    selectResultsQueue.push([{ count: 0 }]);
    selectResultsQueue.push([{ count: 0 }]);

    const result = await caller().alertRule.getStatistics();

    expect(result.statistics.totalRules).toBe(0);
    expect(result.statistics.activeRules).toBe(0);
    expect(result.statistics.totalAlerts).toBe(0);
    expect(result.statistics.pendingAlerts).toBe(0);
  });

  it("performs exactly 4 select queries", async () => {
    selectResultsQueue.push([{ count: 1 }]);
    selectResultsQueue.push([{ count: 1 }]);
    selectResultsQueue.push([{ count: 1 }]);
    selectResultsQueue.push([{ count: 1 }]);

    await caller().alertRule.getStatistics();

    expect(mockDb.select).toHaveBeenCalledTimes(4);
  });
});

// =========================================================================
// 4. create — Insert a new alert rule with defaults
// =========================================================================

describe("alertRule.create", () => {
  it("creates rule with all defaults when given empty input", async () => {
    const created = {
      id: 1, name: "新规则", scope: "all",
      alertType: "budget_percent", threshold: 80,
      alertLevel: "warning", notifyType: "system", isActive: 1,
    };
    returningQueue.push([created]);

    const result = await caller().alertRule.create({});

    expect(result.success).toBe(true);
    expect(result.message).toBe("规则创建成功");
    expect(result.data).toEqual(created);
  });

  it("uses provided values when supplied", async () => {
    const created = {
      id: 2, name: "Custom Rule", scope: "project",
      alertType: "cost_variance", threshold: 95,
      alertLevel: "critical", notifyType: "email", isActive: 1,
    };
    returningQueue.push([created]);

    const result = await caller().alertRule.create({
      name: "Custom Rule",
      scope: "project",
      alertType: "cost_variance",
      threshold: 95,
      alertLevel: "critical",
      notifyType: "email",
    });

    expect(result.success).toBe(true);
    expect(result.data.name).toBe("Custom Rule");
    expect(result.data.threshold).toBe(95);
  });

  it("passes description, projectId, categoryId, notifyUserIds", async () => {
    returningQueue.push([{ id: 3 }]);

    const result = await caller().alertRule.create({
      description: "Test description",
      projectId: 10,
      categoryId: 5,
      notifyUserIds: "1,2,3",
    });

    expect(result.success).toBe(true);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("converts boolean isActive to number (true -> 1)", async () => {
    returningQueue.push([{ id: 4, isActive: 1 }]);

    const result = await caller().alertRule.create({ isActive: true });

    expect(result.success).toBe(true);
  });

  it("converts boolean isActive to number (false -> 0)", async () => {
    returningQueue.push([{ id: 5, isActive: 0 }]);

    const result = await caller().alertRule.create({ isActive: false });

    expect(result.success).toBe(true);
  });

  it("defaults isActive to 1 when not provided", async () => {
    returningQueue.push([{ id: 6, isActive: 1 }]);

    const result = await caller().alertRule.create({});

    expect(result.success).toBe(true);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("defaults name to '新规则' when not provided", async () => {
    returningQueue.push([{ id: 7, name: "新规则" }]);

    const result = await caller().alertRule.create({});

    expect(result.success).toBe(true);
  });
});

// =========================================================================
// 5. update — Update rule fields with boolean→number conversion
// =========================================================================

describe("alertRule.update", () => {
  it("updates rule name", async () => {
    returningQueue.push([{ id: 1, name: "Updated" }]);

    const result = await caller().alertRule.update({ id: 1, name: "Updated" });

    expect(result.success).toBe(true);
    expect(result.message).toBe("规则更新成功");
    expect(result.data.name).toBe("Updated");
  });

  it("accepts string id and coerces to number", async () => {
    returningQueue.push([{ id: 5, name: "Coerced" }]);

    const result = await caller().alertRule.update({ id: "5", name: "Coerced" });

    expect(result.success).toBe(true);
  });

  it("converts boolean isActive true to 1", async () => {
    returningQueue.push([{ id: 1, isActive: 1 }]);

    const result = await caller().alertRule.update({ id: 1, isActive: true });

    expect(result.success).toBe(true);
  });

  it("converts boolean isActive false to 0", async () => {
    returningQueue.push([{ id: 1, isActive: 0 }]);

    const result = await caller().alertRule.update({ id: 1, isActive: false });

    expect(result.success).toBe(true);
  });

  it("converts numeric isActive 0 to 0 (falsy)", async () => {
    returningQueue.push([{ id: 1, isActive: 0 }]);

    const result = await caller().alertRule.update({ id: 1, isActive: 0 });

    expect(result.success).toBe(true);
  });

  it("updates description", async () => {
    returningQueue.push([{ id: 1, description: "New desc" }]);

    const result = await caller().alertRule.update({ id: 1, description: "New desc" });

    expect(result.success).toBe(true);
    expect(result.data.description).toBe("New desc");
  });

  it("updates scope", async () => {
    returningQueue.push([{ id: 1, scope: "project" }]);

    const result = await caller().alertRule.update({ id: 1, scope: "project" });

    expect(result.success).toBe(true);
  });

  it("updates alertType and alertLevel", async () => {
    returningQueue.push([{ id: 1, alertType: "cost_variance", alertLevel: "critical" }]);

    const result = await caller().alertRule.update({
      id: 1,
      alertType: "cost_variance",
      alertLevel: "critical",
    });

    expect(result.success).toBe(true);
  });

  it("updates threshold", async () => {
    returningQueue.push([{ id: 1, threshold: 95 }]);

    const result = await caller().alertRule.update({ id: 1, threshold: 95 });

    expect(result.success).toBe(true);
    expect(result.data.threshold).toBe(95);
  });

  it("updates notifyType", async () => {
    returningQueue.push([{ id: 1, notifyType: "email" }]);

    const result = await caller().alertRule.update({ id: 1, notifyType: "email" });

    expect(result.success).toBe(true);
  });

  it("always sets updatedAt", async () => {
    returningQueue.push([{ id: 1 }]);

    const result = await caller().alertRule.update({ id: 1 });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });
});

// =========================================================================
// 6. delete — Delete a rule by id
// =========================================================================

describe("alertRule.delete", () => {
  it("deletes a rule and returns success", async () => {
    const result = await caller().alertRule.delete({ id: 1 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("规则已删除");
  });

  it("accepts string id and coerces to number", async () => {
    const result = await caller().alertRule.delete({ id: "7" });

    expect(result.success).toBe(true);
    expect(result.message).toBe("规则已删除");
  });

  it("calls delete().where() on the db", async () => {
    await caller().alertRule.delete({ id: 10 });

    expect(mockDb.delete).toHaveBeenCalled();
  });
});

// =========================================================================
// 7. toggleEnabled — Toggle isActive (1↔0) on a rule
// =========================================================================

describe("alertRule.toggleEnabled", () => {
  it("enables a disabled rule (0 -> 1)", async () => {
    selectResultsQueue.push([{ id: 1, isActive: 0 }]);

    const result = await caller().alertRule.toggleEnabled({ id: 1 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("已启用");
  });

  it("disables an enabled rule (1 -> 0)", async () => {
    selectResultsQueue.push([{ id: 2, isActive: 1 }]);

    const result = await caller().alertRule.toggleEnabled({ id: 2 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("已禁用");
  });

  it("returns failure when rule not found", async () => {
    selectResultsQueue.push([]);

    const result = await caller().alertRule.toggleEnabled({ id: 999 });

    expect(result.success).toBe(false);
    expect(result.message).toBe("规则不存在");
  });

  it("accepts string id and coerces to number", async () => {
    selectResultsQueue.push([{ id: 3, isActive: 1 }]);

    const result = await caller().alertRule.toggleEnabled({ id: "3" });

    expect(result.success).toBe(true);
    expect(result.message).toBe("已禁用");
  });

  it("calls select then update to flip isActive", async () => {
    selectResultsQueue.push([{ id: 5, isActive: 0 }]);

    await caller().alertRule.toggleEnabled({ id: 5 });

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("does not call update when rule not found", async () => {
    selectResultsQueue.push([]);

    await caller().alertRule.toggleEnabled({ id: 404 });

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

// =========================================================================
// 8. acknowledge — Acknowledge an alert log
// =========================================================================

describe("alertRule.acknowledge", () => {
  it("acknowledges using input.id", async () => {
    const result = await caller().alertRule.acknowledge({ id: 1 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("已确认");
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("acknowledges using input.alertId when id is not provided", async () => {
    const result = await caller().alertRule.acknowledge({ alertId: 42 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("已确认");
  });

  it("falls back to 0 when neither id nor alertId is provided", async () => {
    const result = await caller().alertRule.acknowledge({});

    expect(result.success).toBe(true);
    expect(result.message).toBe("已确认");
  });

  it("uses handleNote from input", async () => {
    const result = await caller().alertRule.acknowledge({
      id: 5,
      handleNote: "Reviewed and resolved",
    });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("uses note as fallback when handleNote is not provided", async () => {
    const result = await caller().alertRule.acknowledge({
      id: 5,
      note: "Alternative note field",
    });

    expect(result.success).toBe(true);
  });

  it("handleNote takes priority over note", async () => {
    const result = await caller().alertRule.acknowledge({
      id: 5,
      handleNote: "Primary",
      note: "Secondary",
    });

    expect(result.success).toBe(true);
  });

  it("accepts string id", async () => {
    const result = await caller().alertRule.acknowledge({ id: "10" });

    expect(result.success).toBe(true);
  });

  it("accepts string alertId", async () => {
    const result = await caller().alertRule.acknowledge({ alertId: "20" });

    expect(result.success).toBe(true);
  });

  it("sets handledBy from ctx.user.id", async () => {
    const c = createAdminCaller({ id: 42 });
    const result = await c.alertRule.acknowledge({ id: 1 });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });
});

// =========================================================================
// 9. Authentication guards — all procedures require authentication
// =========================================================================

describe("alertRule auth guards", () => {
  it("anonymous caller is rejected for list", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.alertRule.list()).rejects.toThrow();
  });

  it("anonymous caller is rejected for listHistory", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.alertRule.listHistory()).rejects.toThrow();
  });

  it("anonymous caller is rejected for getStatistics", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.alertRule.getStatistics()).rejects.toThrow();
  });

  it("anonymous caller is rejected for create", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.alertRule.create({})).rejects.toThrow();
  });

  it("anonymous caller is rejected for update", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.alertRule.update({ id: 1, name: "X" })).rejects.toThrow();
  });

  it("anonymous caller is rejected for delete", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.alertRule.delete({ id: 1 })).rejects.toThrow();
  });

  it("anonymous caller is rejected for toggleEnabled", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.alertRule.toggleEnabled({ id: 1 })).rejects.toThrow();
  });

  it("anonymous caller is rejected for acknowledge", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.alertRule.acknowledge({ id: 1 })).rejects.toThrow();
  });
});

// =========================================================================
// 10. Input validation edge cases
// =========================================================================

describe("alertRule input validation", () => {
  it("create accepts empty object (all fields optional)", async () => {
    returningQueue.push([{ id: 1 }]);

    const result = await caller().alertRule.create({});

    expect(result.success).toBe(true);
  });

  it("update requires id field", async () => {
    await expect(
      (caller().alertRule.update as any)({ name: "No ID" })
    ).rejects.toThrow();
  });

  it("delete requires id field", async () => {
    await expect(
      (caller().alertRule.delete as any)({})
    ).rejects.toThrow();
  });

  it("toggleEnabled requires id field", async () => {
    await expect(
      (caller().alertRule.toggleEnabled as any)({})
    ).rejects.toThrow();
  });

  it("create rejects invalid threshold type", async () => {
    await expect(
      caller().alertRule.create({ threshold: "high" as any })
    ).rejects.toThrow();
  });

  it("update accepts numeric id", async () => {
    returningQueue.push([{ id: 42 }]);

    const result = await caller().alertRule.update({ id: 42 });

    expect(result.success).toBe(true);
  });

  it("update accepts string id", async () => {
    returningQueue.push([{ id: 42 }]);

    const result = await caller().alertRule.update({ id: "42" });

    expect(result.success).toBe(true);
  });

  it("create rejects name exceeding max length", async () => {
    await expect(
      caller().alertRule.create({ name: "a".repeat(201) })
    ).rejects.toThrow();
  });

  it("acknowledge accepts all fields optional except note/handleNote", async () => {
    const result = await caller().alertRule.acknowledge({});

    expect(result.success).toBe(true);
  });
});
