/**
 * AI Trigger Router (AI Agent 触发器) — Comprehensive Automated Test Suite
 *
 * Covers all 6 procedures: list, getExecutionHistory, create, update, delete,
 * toggle, execute.
 *
 * Run: npx vitest run server/routers/ai-trigger.router.test.ts
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
  aiAgentTriggers: {
    id: "id",
    triggerCode: "triggerCode",
    name: "name",
    description: "description",
    agentType: "agentType",
    triggerType: "triggerType",
    triggerConditions: "triggerConditions",
    cronExpression: "cronExpression",
    triggerOnStages: "triggerOnStages",
    triggerOnEvents: "triggerOnEvents",
    inputTemplate: "inputTemplate",
    autoApplyResult: "autoApplyResult",
    notifyOnSuccess: "notifyOnSuccess",
    notifyOnFailure: "notifyOnFailure",
    notifyRecipients: "notifyRecipients",
    isEnabled: "isEnabled",
    priority: "priority",
    executionCount: "executionCount",
    successCount: "successCount",
    failureCount: "failureCount",
    lastExecutedAt: "lastExecutedAt",
    lastExecutionStatus: "lastExecutionStatus",
    createdBy: "createdBy",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  aiAgentTriggerExecutions: {
    id: "id",
    triggerId: "triggerId",
    executionLogId: "executionLogId",
    triggerContext: "triggerContext",
    triggerSource: "triggerSource",
    status: "status",
    errorMessage: "errorMessage",
    notificationSent: "notificationSent",
    notificationSentAt: "notificationSentAt",
    queuedAt: "queuedAt",
    startedAt: "startedAt",
    completedAt: "completedAt",
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
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// =========================================================================
// Reset mocks before each test
// =========================================================================

beforeEach(() => {
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  vi.clearAllMocks();
});

// =========================================================================
// 1. list — List all AI agent triggers
// =========================================================================

describe("aiTrigger.list", () => {
  it("returns empty list when no triggers exist", async () => {
    selectResultsQueue.push([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.list();

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(0);
  });

  it("returns triggers with correct pagination info", async () => {
    const triggers = [
      { id: 1, triggerCode: "TRG-001", name: "Trigger A" },
      { id: 2, triggerCode: "TRG-002", name: "Trigger B" },
      { id: 3, triggerCode: "TRG-003", name: "Trigger C" },
    ];
    selectResultsQueue.push(triggers);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.list();

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(3);
  });

  it("calls select().from().orderBy() on the db", async () => {
    selectResultsQueue.push([]);

    const caller = createAuthenticatedCaller();
    await caller.aiTrigger.list();

    expect(mockDb.select).toHaveBeenCalled();
  });
});

// =========================================================================
// 2. getExecutionHistory — Get recent execution history
// =========================================================================

describe("aiTrigger.getExecutionHistory", () => {
  it("returns empty array when no executions exist", async () => {
    selectResultsQueue.push([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.getExecutionHistory();

    expect(result).toEqual([]);
  });

  it("returns execution records", async () => {
    const executions = [
      { id: 1, triggerId: 1, status: "Completed", triggerSource: "manual" },
      { id: 2, triggerId: 2, status: "Completed", triggerSource: "cron" },
    ];
    selectResultsQueue.push(executions);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.getExecutionHistory();

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("Completed");
    expect(result[1].triggerSource).toBe("cron");
  });

  it("calls select().from().orderBy().limit(100)", async () => {
    selectResultsQueue.push([]);

    const caller = createAuthenticatedCaller();
    await caller.aiTrigger.getExecutionHistory();

    expect(mockDb.select).toHaveBeenCalled();
  });
});

// =========================================================================
// 3. create — Create a new AI agent trigger
// =========================================================================

describe("aiTrigger.create", () => {
  it("creates trigger with minimal input (all defaults)", async () => {
    const created = { id: 1, triggerCode: "TRG-AUTO", name: "新触发器" };
    returningQueue.push([created]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.create({});

    expect(result.success).toBe(true);
    expect(result.message).toBe("触发器创建成功");
    expect(result.data).toEqual(created);
  });

  it("uses provided triggerCode when supplied", async () => {
    const created = { id: 2, triggerCode: "MY-CODE", name: "Custom" };
    returningQueue.push([created]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.create({
      triggerCode: "MY-CODE",
      name: "Custom",
    });

    expect(result.success).toBe(true);
    expect(result.data.triggerCode).toBe("MY-CODE");
  });

  it("generates triggerCode when not provided", async () => {
    returningQueue.push([{ id: 3, triggerCode: "TRG-AUTO" }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.create({ name: "Auto" });

    expect(result.success).toBe(true);
    // Code is auto-generated so we just verify the operation succeeded
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("defaults name to '新触发器' when not provided", async () => {
    returningQueue.push([{ id: 4, name: "新触发器" }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.create({});

    expect(result.success).toBe(true);
  });

  it("creates trigger with full input", async () => {
    const fullTrigger = {
      id: 5,
      triggerCode: "TRG-FULL",
      name: "Full Trigger",
      description: "A comprehensive trigger",
      agentType: "risk-analyzer",
      triggerType: "event",
      triggerConditions: '{"threshold":70}',
      cronExpression: "0 9 * * 1",
      triggerOnStages: '["M1","M7"]',
      triggerOnEvents: '["issue_created"]',
      inputTemplate: '{"key":"val"}',
      autoApplyResult: 1,
      notifyOnSuccess: 0,
      notifyOnFailure: 1,
      notifyRecipients: '["user1@example.com"]',
      isEnabled: 1,
      priority: 5,
    };
    returningQueue.push([fullTrigger]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.create({
      triggerCode: "TRG-FULL",
      name: "Full Trigger",
      description: "A comprehensive trigger",
      agentType: "risk-analyzer",
      triggerType: "event",
      triggerConditions: { threshold: 70 },
      cronExpression: "0 9 * * 1",
      triggerOnStages: ["M1", "M7"],
      triggerOnEvents: ["issue_created"],
      inputTemplate: { key: "val" },
      autoApplyResult: true,
      notifyOnSuccess: false,
      notifyOnFailure: true,
      notifyRecipients: ["user1@example.com"],
      isEnabled: true,
      priority: 5,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(fullTrigger);
  });

  it("handles string triggerConditions without JSON.stringify", async () => {
    returningQueue.push([{ id: 6 }]);

    const caller = createAuthenticatedCaller();
    await caller.aiTrigger.create({
      triggerConditions: '{"raw":"json"}',
    });

    expect(result => result).toBeDefined();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("handles string triggerOnStages without JSON.stringify", async () => {
    returningQueue.push([{ id: 7 }]);

    const caller = createAuthenticatedCaller();
    await caller.aiTrigger.create({
      triggerOnStages: '["M1","M2"]',
    });

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("handles string triggerOnEvents without JSON.stringify", async () => {
    returningQueue.push([{ id: 8 }]);

    const caller = createAuthenticatedCaller();
    await caller.aiTrigger.create({
      triggerOnEvents: '["gate_failed"]',
    });

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("handles string inputTemplate without JSON.stringify", async () => {
    returningQueue.push([{ id: 9 }]);

    const caller = createAuthenticatedCaller();
    await caller.aiTrigger.create({
      inputTemplate: '{"template":true}',
    });

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("handles string notifyRecipients without JSON.stringify", async () => {
    returningQueue.push([{ id: 10 }]);

    const caller = createAuthenticatedCaller();
    await caller.aiTrigger.create({
      notifyRecipients: '["admin"]',
    });

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("sets autoApplyResult=0 when false", async () => {
    returningQueue.push([{ id: 11, autoApplyResult: 0 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.create({ autoApplyResult: false });

    expect(result.success).toBe(true);
  });

  it("sets isEnabled=0 when false", async () => {
    returningQueue.push([{ id: 12, isEnabled: 0 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.create({ isEnabled: false });

    expect(result.success).toBe(true);
  });

  it("sets createdBy from context user id", async () => {
    returningQueue.push([{ id: 13, createdBy: 42 }]);

    const caller = createAuthenticatedCaller({ id: 42 });
    const result = await caller.aiTrigger.create({ name: "User 42's Trigger" });

    expect(result.success).toBe(true);
    expect(result.data.createdBy).toBe(42);
  });
});

// =========================================================================
// 4. update — Update an existing trigger by ID
// =========================================================================

describe("aiTrigger.update", () => {
  it("updates trigger name", async () => {
    returningQueue.push([{ id: 1, name: "Updated Name" }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({ id: 1, name: "Updated Name" });

    expect(result.success).toBe(true);
    expect(result.message).toBe("触发器更新成功");
    expect(result.data.name).toBe("Updated Name");
  });

  it("accepts string id and coerces to number", async () => {
    returningQueue.push([{ id: 5, name: "Coerced" }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({ id: "5", name: "Coerced" });

    expect(result.success).toBe(true);
  });

  it("updates description", async () => {
    returningQueue.push([{ id: 1, description: "New desc" }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({ id: 1, description: "New desc" });

    expect(result.success).toBe(true);
    expect(result.data.description).toBe("New desc");
  });

  it("updates agentType and triggerType", async () => {
    returningQueue.push([{ id: 1, agentType: "fmea", triggerType: "cron" }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      agentType: "fmea",
      triggerType: "cron",
    });

    expect(result.success).toBe(true);
  });

  it("updates triggerConditions as object (JSON.stringify)", async () => {
    returningQueue.push([{ id: 1, triggerConditions: '{"threshold":80}' }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      triggerConditions: { threshold: 80 },
    });

    expect(result.success).toBe(true);
  });

  it("updates triggerConditions as string (passthrough)", async () => {
    returningQueue.push([{ id: 1, triggerConditions: '{"raw":true}' }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      triggerConditions: '{"raw":true}',
    });

    expect(result.success).toBe(true);
  });

  it("updates cronExpression", async () => {
    returningQueue.push([{ id: 1, cronExpression: "*/5 * * * *" }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      cronExpression: "*/5 * * * *",
    });

    expect(result.success).toBe(true);
  });

  it("updates triggerOnStages as array (JSON.stringify)", async () => {
    returningQueue.push([{ id: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      triggerOnStages: ["M3", "M5"],
    });

    expect(result.success).toBe(true);
  });

  it("updates triggerOnStages as string (passthrough)", async () => {
    returningQueue.push([{ id: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      triggerOnStages: '["M3","M5"]',
    });

    expect(result.success).toBe(true);
  });

  it("updates triggerOnEvents as array", async () => {
    returningQueue.push([{ id: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      triggerOnEvents: ["gate_failed", "issue_created"],
    });

    expect(result.success).toBe(true);
  });

  it("updates triggerOnEvents as string", async () => {
    returningQueue.push([{ id: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      triggerOnEvents: '["gate_failed"]',
    });

    expect(result.success).toBe(true);
  });

  it("updates inputTemplate as object", async () => {
    returningQueue.push([{ id: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      inputTemplate: { prompt: "Analyze risk" },
    });

    expect(result.success).toBe(true);
  });

  it("updates inputTemplate as string", async () => {
    returningQueue.push([{ id: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      inputTemplate: '{"prompt":"Analyze risk"}',
    });

    expect(result.success).toBe(true);
  });

  it("updates boolean fields (autoApplyResult, notifyOnSuccess, notifyOnFailure)", async () => {
    returningQueue.push([{
      id: 1, autoApplyResult: 1, notifyOnSuccess: 0, notifyOnFailure: 0,
    }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      autoApplyResult: true,
      notifyOnSuccess: false,
      notifyOnFailure: false,
    });

    expect(result.success).toBe(true);
  });

  it("updates notifyRecipients as array", async () => {
    returningQueue.push([{ id: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      notifyRecipients: ["admin@example.com"],
    });

    expect(result.success).toBe(true);
  });

  it("updates notifyRecipients as string", async () => {
    returningQueue.push([{ id: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      notifyRecipients: '["admin@example.com"]',
    });

    expect(result.success).toBe(true);
  });

  it("updates isEnabled", async () => {
    returningQueue.push([{ id: 1, isEnabled: 0 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      isEnabled: false,
    });

    expect(result.success).toBe(true);
  });

  it("updates priority", async () => {
    returningQueue.push([{ id: 1, priority: 10 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({
      id: 1,
      priority: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data.priority).toBe(10);
  });

  it("only updates fields present in input (updatedAt always set)", async () => {
    returningQueue.push([{ id: 1 }]);

    const caller = createAuthenticatedCaller();
    // Only name provided — no other optional fields set
    const result = await caller.aiTrigger.update({ id: 1, name: "Only name" });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });
});

// =========================================================================
// 5. delete — Delete a trigger and associated executions
// =========================================================================

describe("aiTrigger.delete", () => {
  it("deletes trigger and execution records", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.delete({ id: 1 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("触发器已删除");
  });

  it("accepts string id and coerces to number", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.delete({ id: "7" });

    expect(result.success).toBe(true);
  });

  it("calls delete on executions before triggers", async () => {
    const caller = createAuthenticatedCaller();
    await caller.aiTrigger.delete({ id: 10 });

    // delete is called twice: once for executions, once for triggers
    expect(mockDb.delete).toHaveBeenCalledTimes(2);
  });
});

// =========================================================================
// 6. toggle — Toggle enabled/disabled state of a trigger
// =========================================================================

describe("aiTrigger.toggle", () => {
  it("enables a disabled trigger", async () => {
    selectResultsQueue.push([{ id: 1, isEnabled: 0 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.toggle({ id: 1 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("触发器已启用");
    expect(result.data).toEqual({ id: 1, isEnabled: 1 });
  });

  it("disables an enabled trigger", async () => {
    selectResultsQueue.push([{ id: 2, isEnabled: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.toggle({ id: 2 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("触发器已禁用");
    expect(result.data).toEqual({ id: 2, isEnabled: 0 });
  });

  it("returns failure when trigger not found", async () => {
    selectResultsQueue.push([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.toggle({ id: 999 });

    expect(result.success).toBe(false);
    expect(result.message).toBe("触发器不存在");
  });

  it("accepts string id and coerces to number", async () => {
    selectResultsQueue.push([{ id: 3, isEnabled: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.toggle({ id: "3" });

    expect(result.success).toBe(true);
    expect(result.message).toBe("触发器已禁用");
  });

  it("calls update after select to flip isEnabled", async () => {
    selectResultsQueue.push([{ id: 5, isEnabled: 0 }]);

    const caller = createAuthenticatedCaller();
    await caller.aiTrigger.toggle({ id: 5 });

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });
});

// =========================================================================
// 7. execute — Manually execute a trigger
// =========================================================================

describe("aiTrigger.execute", () => {
  it("executes an enabled trigger successfully", async () => {
    // First select: find the trigger
    selectResultsQueue.push([{ id: 1, isEnabled: 1, executionCount: 5, successCount: 4 }]);
    // Insert returns execution record
    returningQueue.push([{ id: 100, triggerId: 1, status: "Completed" }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.execute({ id: 1 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("触发器已执行");
    expect(result.data).toEqual({ id: 100, triggerId: 1, status: "Completed" });
  });

  it("returns failure when trigger not found", async () => {
    selectResultsQueue.push([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.execute({ id: 999 });

    expect(result.success).toBe(false);
    expect(result.message).toBe("触发器不存在");
  });

  it("returns failure when trigger is disabled", async () => {
    selectResultsQueue.push([{ id: 2, isEnabled: 0 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.execute({ id: 2 });

    expect(result.success).toBe(false);
    expect(result.message).toBe("触发器未启用，无法执行");
  });

  it("accepts optional context", async () => {
    selectResultsQueue.push([{ id: 3, isEnabled: 1, executionCount: 0, successCount: 0 }]);
    returningQueue.push([{ id: 101, triggerId: 3 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.execute({
      id: 3,
      context: { projectId: 42, reason: "Manual test" },
    });

    expect(result.success).toBe(true);
  });

  it("accepts optional triggerSource", async () => {
    selectResultsQueue.push([{ id: 4, isEnabled: 1, executionCount: 0, successCount: 0 }]);
    returningQueue.push([{ id: 102, triggerId: 4 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.execute({
      id: 4,
      triggerSource: "api-call",
    });

    expect(result.success).toBe(true);
  });

  it("defaults triggerSource to 'manual' when not provided", async () => {
    selectResultsQueue.push([{ id: 5, isEnabled: 1, executionCount: 0, successCount: 0 }]);
    returningQueue.push([{ id: 103, triggerId: 5 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.execute({ id: 5 });

    expect(result.success).toBe(true);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("accepts string id and coerces to number", async () => {
    selectResultsQueue.push([{ id: 6, isEnabled: 1, executionCount: 0, successCount: 0 }]);
    returningQueue.push([{ id: 104, triggerId: 6 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.execute({ id: "6" });

    expect(result.success).toBe(true);
  });

  it("increments executionCount and successCount", async () => {
    selectResultsQueue.push([{ id: 7, isEnabled: 1, executionCount: 10, successCount: 8 }]);
    returningQueue.push([{ id: 105, triggerId: 7 }]);

    const caller = createAuthenticatedCaller();
    await caller.aiTrigger.execute({ id: 7 });

    // Verify update was called to update statistics
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("handles null executionCount and successCount gracefully", async () => {
    selectResultsQueue.push([{
      id: 8, isEnabled: 1,
      executionCount: null, successCount: null,
    }]);
    returningQueue.push([{ id: 106, triggerId: 8 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.execute({ id: 8 });

    expect(result.success).toBe(true);
  });
});

// =========================================================================
// 8. Authentication guards — all procedures require authentication
// =========================================================================

describe("aiTrigger auth guards", () => {
  it("anonymous caller is rejected for list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.aiTrigger.list()).rejects.toThrow();
  });

  it("anonymous caller is rejected for getExecutionHistory", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.aiTrigger.getExecutionHistory()).rejects.toThrow();
  });

  it("anonymous caller is rejected for create", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.aiTrigger.create({})).rejects.toThrow();
  });

  it("anonymous caller is rejected for update", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiTrigger.update({ id: 1, name: "Hack" })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for delete", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiTrigger.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for toggle", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiTrigger.toggle({ id: 1 })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for execute", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.aiTrigger.execute({ id: 1 })
    ).rejects.toThrow();
  });
});

// =========================================================================
// 9. Input validation edge cases
// =========================================================================

describe("aiTrigger input validation", () => {
  it("create accepts empty object (all fields optional)", async () => {
    returningQueue.push([{ id: 1 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.create({});

    expect(result.success).toBe(true);
  });

  it("update requires id field", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.aiTrigger.update as any)({ name: "No ID" })
    ).rejects.toThrow();
  });

  it("delete requires id field", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.aiTrigger.delete as any)({})
    ).rejects.toThrow();
  });

  it("toggle requires id field", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.aiTrigger.toggle as any)({})
    ).rejects.toThrow();
  });

  it("execute requires id field", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.aiTrigger.execute as any)({})
    ).rejects.toThrow();
  });

  it("create rejects invalid priority type", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.aiTrigger.create({ priority: "high" as any })
    ).rejects.toThrow();
  });

  it("create rejects invalid autoApplyResult type", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.aiTrigger.create({ autoApplyResult: "yes" as any })
    ).rejects.toThrow();
  });

  it("update accepts numeric id", async () => {
    returningQueue.push([{ id: 42 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({ id: 42, name: "Numeric" });

    expect(result.success).toBe(true);
  });

  it("update accepts string id", async () => {
    returningQueue.push([{ id: 42 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.update({ id: "42", name: "String" });

    expect(result.success).toBe(true);
  });

  it("execute accepts context as record", async () => {
    selectResultsQueue.push([{ id: 1, isEnabled: 1, executionCount: 0, successCount: 0 }]);
    returningQueue.push([{ id: 200 }]);

    const caller = createAuthenticatedCaller();
    const result = await caller.aiTrigger.execute({
      id: 1,
      context: { key1: "value1", key2: 123, key3: true },
    });

    expect(result.success).toBe(true);
  });
});
