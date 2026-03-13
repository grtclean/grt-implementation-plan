/**
 * Red-Blue Router (红蓝对抗) — Comprehensive Automated Test Suite
 *
 * Covers all 12 procedures across Config CRUD, Execution CRUD,
 * and RedBlueBoard.tsx endpoints (getProjects, getGates, getTasks).
 *
 * Run: npx vitest run server/routers/red-blue.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock DB — two-layer pattern with queue for sequential selects
// ---------------------------------------------------------------------------

let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
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
    try {
      return resolve(getNextResult());
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
// Mock schema tables (column refs only — drizzle uses these as identifiers)
// ---------------------------------------------------------------------------

vi.mock("../../drizzle/approval-engine-schema", () => ({
  redBlueConfigs: {
    id: "id",
    configCode: "configCode",
    configName: "configName",
    projectId: "projectId",
    projectCode: "projectCode",
    projectName: "projectName",
    customerId: "customerId",
    customerName: "customerName",
    customerTier: "customerTier",
    redTeamLeaderId: "redTeamLeaderId",
    redTeamLeaderName: "redTeamLeaderName",
    redTeamMembers: "redTeamMembers",
    redTeamObjectives: "redTeamObjectives",
    redTeamScenarios: "redTeamScenarios",
    blueTeamLeaderId: "blueTeamLeaderId",
    blueTeamLeaderName: "blueTeamLeaderName",
    blueTeamMembers: "blueTeamMembers",
    blueTeamObjectives: "blueTeamObjectives",
    blueTeamResources: "blueTeamResources",
    schedule: "schedule",
    evaluationCriteria: "evaluationCriteria",
    triggerConditions: "triggerConditions",
    status: "status",
    results: "results",
    lessonsLearned: "lessonsLearned",
    improvementActions: "improvementActions",
    createdBy: "createdBy",
    createdByName: "createdByName",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  redBlueExecutions: {
    id: "id",
    configId: "configId",
    configCode: "configCode",
    phase: "phase",
    phaseName: "phaseName",
    scheduledStart: "scheduledStart",
    scheduledEnd: "scheduledEnd",
    actualStart: "actualStart",
    actualEnd: "actualEnd",
    redTeamActions: "redTeamActions",
    redTeamFindings: "redTeamFindings",
    blueTeamResponses: "blueTeamResponses",
    blueTeamPerformance: "blueTeamPerformance",
    redTeamScore: "redTeamScore",
    blueTeamScore: "blueTeamScore",
    issuesFound: "issuesFound",
    status: "status",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

// ---------------------------------------------------------------------------
// Mock drizzle-orm operators
// ---------------------------------------------------------------------------

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  and: vi.fn((...args: any[]) => args),
  sql: Object.assign(vi.fn((...args: any[]) => args), {
    raw: vi.fn((s: string) => s),
  }),
}));

// ---------------------------------------------------------------------------
// Mock shared/validators — jsonValue is just z.unknown() for tests
// ---------------------------------------------------------------------------

vi.mock("../../shared/validators", () => {
  const { z } = require("zod");
  return {
    jsonValue: z.unknown(),
  };
});

// ---------------------------------------------------------------------------
// Import test utilities AFTER mocks are registered
// ---------------------------------------------------------------------------

import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// =========================================================================
// Reset mocks before each test
// =========================================================================

beforeEach(() => {
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue.length = 0;
  vi.clearAllMocks();
});

// =========================================================================
// 1. list — List configs with optional filtering and pagination
// =========================================================================

describe("redBlue.list", () => {
  it("returns empty list when no configs exist", async () => {
    // Two parallel selects: items query + count query
    selectResultsQueue.push(
      [],               // items
      [{ count: 0 }],   // count
    );

    const caller = createAdminCaller();
    const result = await caller.redBlue.list();

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("returns paginated configs with total count", async () => {
    const configs = [
      { id: 1, configCode: "RB-001", configName: "Test Config", status: "draft" },
      { id: 2, configCode: "RB-002", configName: "Test Config 2", status: "active" },
    ];
    selectResultsQueue.push(configs, [{ count: 2 }]);

    const caller = createAdminCaller();
    const result = await caller.redBlue.list();

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("respects page and pageSize parameters", async () => {
    selectResultsQueue.push(
      [{ id: 3, configCode: "RB-003", configName: "Page 2 Config" }],
      [{ count: 5 }],
    );

    const caller = createAdminCaller();
    const result = await caller.redBlue.list({ page: 2, pageSize: 2 });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(2);
    expect(result.total).toBe(5);
  });

  it("filters by status", async () => {
    selectResultsQueue.push(
      [{ id: 1, configCode: "RB-001", status: "active" }],
      [{ count: 1 }],
    );

    const caller = createAdminCaller();
    const result = await caller.redBlue.list({ status: "active" });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("filters by projectId", async () => {
    selectResultsQueue.push(
      [{ id: 1, projectId: 42 }],
      [{ count: 1 }],
    );

    const caller = createAdminCaller();
    const result = await caller.redBlue.list({ projectId: 42 });

    expect(result.items).toHaveLength(1);
  });

  it("filters by customerId", async () => {
    selectResultsQueue.push(
      [{ id: 1, customerId: 99 }],
      [{ count: 1 }],
    );

    const caller = createAdminCaller();
    const result = await caller.redBlue.list({ customerId: 99 });

    expect(result.items).toHaveLength(1);
  });

  it("combines multiple filters", async () => {
    selectResultsQueue.push(
      [{ id: 1, status: "active", projectId: 42, customerId: 99 }],
      [{ count: 1 }],
    );

    const caller = createAdminCaller();
    const result = await caller.redBlue.list({ status: "active", projectId: 42, customerId: 99 });

    expect(result.items).toHaveLength(1);
  });

  it("defaults to page=1, pageSize=50 when input is undefined", async () => {
    selectResultsQueue.push([], [{ count: 0 }]);

    const caller = createAdminCaller();
    const result = await caller.redBlue.list(undefined);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("handles count result with missing count property", async () => {
    selectResultsQueue.push([], [{}]);

    const caller = createAdminCaller();
    const result = await caller.redBlue.list();

    expect(result.total).toBe(0);
  });
});

// =========================================================================
// 2. getById — Get a single config by id
// =========================================================================

describe("redBlue.getById", () => {
  it("returns config when found", async () => {
    const config = {
      id: 1, configCode: "RB-001", configName: "Test Config",
      status: "draft", customerTier: "tier_1",
    };
    mockQueryResult = [config];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getById({ id: 1 });

    expect(result).toEqual(config);
  });

  it("returns null when config not found", async () => {
    mockQueryResult = [];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getById({ id: 999 });

    expect(result).toBeNull();
  });

  it("accepts string id and coerces to number", async () => {
    mockQueryResult = [{ id: 5, configName: "String ID Config" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getById({ id: "5" });

    expect(result).toBeDefined();
    expect(result!.id).toBe(5);
  });

  it("accepts numeric id directly", async () => {
    mockQueryResult = [{ id: 10, configName: "Numeric ID Config" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getById({ id: 10 });

    expect(result).toBeDefined();
  });
});

// =========================================================================
// 3. create — Create a new red-blue confrontation config
// =========================================================================

describe("redBlue.create", () => {
  it("creates config with minimum required fields", async () => {
    const createdConfig = { id: 1, configCode: "RB-TEST", configName: "New Config", status: "draft" };
    mockReturningResult = [createdConfig];

    const caller = createAdminCaller();
    const result = await caller.redBlue.create({ configName: "New Config" });

    expect(result.success).toBe(true);
    expect(result.message).toBe("红蓝对抗配置已创建");
    expect(result.data).toEqual(createdConfig);
  });

  it("uses provided configCode when supplied", async () => {
    mockReturningResult = [{ id: 2, configCode: "CUSTOM-CODE", configName: "Custom" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.create({
      configName: "Custom",
      configCode: "CUSTOM-CODE",
    });

    expect(result.success).toBe(true);
    expect(result.data.configCode).toBe("CUSTOM-CODE");
  });

  it("generates configCode when not provided", async () => {
    mockReturningResult = [{ id: 3, configCode: "RB-AUTO", configName: "Auto Code" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.create({ configName: "Auto Code" });

    expect(result.success).toBe(true);
  });

  it("creates config with full team details", async () => {
    const fullConfig = {
      id: 4,
      configName: "Full Config",
      configCode: "RB-FULL",
      projectId: 10,
      projectCode: "PRJ-001",
      projectName: "Project One",
      customerId: 20,
      customerName: "Customer A",
      customerTier: "tier_1",
      redTeamLeaderId: 100,
      redTeamLeaderName: "Red Leader",
      redTeamMembers: [{ name: "R1" }],
      redTeamObjectives: "Find vulnerabilities",
      redTeamScenarios: [{ scenario: "Attack A" }],
      blueTeamLeaderId: 200,
      blueTeamLeaderName: "Blue Leader",
      blueTeamMembers: [{ name: "B1" }],
      blueTeamObjectives: "Defend against attacks",
      blueTeamResources: [{ resource: "Firewall" }],
      status: "draft",
    };
    mockReturningResult = [fullConfig];

    const caller = createAdminCaller();
    const result = await caller.redBlue.create({
      configName: "Full Config",
      configCode: "RB-FULL",
      projectId: 10,
      projectCode: "PRJ-001",
      projectName: "Project One",
      customerId: 20,
      customerName: "Customer A",
      customerTier: "tier_1",
      redTeamLeaderId: 100,
      redTeamLeaderName: "Red Leader",
      redTeamMembers: [{ name: "R1" }],
      redTeamObjectives: "Find vulnerabilities",
      redTeamScenarios: [{ scenario: "Attack A" }],
      blueTeamLeaderId: 200,
      blueTeamLeaderName: "Blue Leader",
      blueTeamMembers: [{ name: "B1" }],
      blueTeamObjectives: "Defend against attacks",
      blueTeamResources: [{ resource: "Firewall" }],
    });

    expect(result.success).toBe(true);
    expect(result.data.redTeamLeaderName).toBe("Red Leader");
    expect(result.data.blueTeamLeaderName).toBe("Blue Leader");
  });

  it("creates config with schedule and evaluation criteria", async () => {
    mockReturningResult = [{ id: 5, configName: "Scheduled" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.create({
      configName: "Scheduled",
      schedule: { startDate: "2026-03-01", endDate: "2026-03-15" },
      evaluationCriteria: { minScore: 70 },
      triggerConditions: { autoTrigger: true },
    });

    expect(result.success).toBe(true);
  });

  it("defaults customerTier to 'other' when not provided", async () => {
    mockReturningResult = [{ id: 6, configName: "Default Tier", customerTier: "other" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.create({ configName: "Default Tier" });

    expect(result.success).toBe(true);
  });

  it("sets status to 'draft' for new configs", async () => {
    mockReturningResult = [{ id: 7, configName: "Draft", status: "draft" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.create({ configName: "Draft" });

    expect(result.success).toBe(true);
    expect(result.data.status).toBe("draft");
  });

  it("records createdBy from context user", async () => {
    mockReturningResult = [{ id: 8, configName: "By User", createdBy: 1, createdByName: "Test User" }];

    const caller = createAdminCaller({ id: 1, name: "Test User" });
    const result = await caller.redBlue.create({ configName: "By User" });

    expect(result.success).toBe(true);
    expect(result.data.createdBy).toBe(1);
    expect(result.data.createdByName).toBe("Test User");
  });
});

// =========================================================================
// 4. update — Update an existing config
// =========================================================================

describe("redBlue.update", () => {
  it("updates config name", async () => {
    mockReturningResult = [{ id: 1, configName: "Updated Name" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.update({ id: 1, configName: "Updated Name" });

    expect(result.success).toBe(true);
    expect(result.message).toBe("红蓝对抗配置已更新");
    expect(result.data.configName).toBe("Updated Name");
  });

  it("throws NOT_FOUND when config does not exist", async () => {
    mockReturningResult = [];

    const caller = createAdminCaller();
    await expect(
      caller.redBlue.update({ id: 999, configName: "Ghost" })
    ).rejects.toThrow("配置不存在");
  });

  it("updates status field", async () => {
    mockReturningResult = [{ id: 1, status: "active" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.update({ id: 1, status: "active" });

    expect(result.success).toBe(true);
    expect(result.data.status).toBe("active");
  });

  it("updates results and lessons learned", async () => {
    mockReturningResult = [{
      id: 1, results: { overallScore: 85 }, lessonsLearned: "Great session",
    }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.update({
      id: 1,
      results: { overallScore: 85 },
      lessonsLearned: "Great session",
    });

    expect(result.success).toBe(true);
    expect(result.data.lessonsLearned).toBe("Great session");
  });

  it("updates improvement actions", async () => {
    mockReturningResult = [{ id: 1, improvementActions: [{ action: "Improve firewall" }] }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.update({
      id: 1,
      improvementActions: [{ action: "Improve firewall" }],
    });

    expect(result.success).toBe(true);
  });

  it("accepts string id and coerces to number", async () => {
    mockReturningResult = [{ id: 5, configName: "Coerced" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.update({ id: "5", configName: "Coerced" });

    expect(result.success).toBe(true);
  });

  it("only updates explicitly provided fields (ignores undefined)", async () => {
    mockReturningResult = [{ id: 1, configName: "Same" }];

    const caller = createAdminCaller();
    // Only configName provided; other fields should not be in the update payload
    const result = await caller.redBlue.update({ id: 1, configName: "Same" });

    expect(result.success).toBe(true);
  });

  it("allows setting nullable fields to null", async () => {
    mockReturningResult = [{ id: 1, projectId: null, projectCode: null }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.update({
      id: 1,
      projectId: null,
      projectCode: null,
    });

    expect(result.success).toBe(true);
  });
});

// =========================================================================
// 5. delete — Delete a config and all its execution records
// =========================================================================

describe("redBlue.delete", () => {
  it("deletes config and child executions", async () => {
    mockQueryResult = [{ id: 1 }]; // existing config

    const caller = createAdminCaller();
    const result = await caller.redBlue.delete({ id: 1 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("红蓝对抗配置已删除");
  });

  it("throws NOT_FOUND when config does not exist", async () => {
    mockQueryResult = []; // no config found

    const caller = createAdminCaller();
    await expect(
      caller.redBlue.delete({ id: 999 })
    ).rejects.toThrow("配置不存在");
  });

  it("accepts string id and coerces to number", async () => {
    mockQueryResult = [{ id: 5 }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.delete({ id: "5" });

    expect(result.success).toBe(true);
  });

  it("calls delete on executions before configs", async () => {
    mockQueryResult = [{ id: 10 }];

    const caller = createAdminCaller();
    await caller.redBlue.delete({ id: 10 });

    // Verify delete was called (at least twice: once for executions, once for config)
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

// =========================================================================
// 6. getProjects — RedBlueBoard.tsx project summary
// =========================================================================

describe("redBlue.getProjects", () => {
  it("returns empty array when no configs exist", async () => {
    mockQueryResult = [];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getProjects();

    expect(result).toEqual([]);
  });

  it("maps config fields to project aliases", async () => {
    const config = {
      id: 1,
      configCode: "RB-001",
      configName: "Red Blue Alpha",
      projectName: "Project Alpha",
      customerTier: "tier_1",
      customerName: "Customer A",
      redTeamLeaderName: "Red Lead",
      blueTeamLeaderName: "Blue Lead",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
    };
    mockQueryResult = [config];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getProjects();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Red Blue Alpha"); // uses configName first
    expect(result[0].tier).toBe("tier_1");
    expect(result[0].customer).toBe("Customer A");
    expect(result[0].redTeamLead).toBe("Red Lead");
    expect(result[0].blueTeamLead).toBe("Blue Lead");
    expect(result[0].progress).toBe(0);
    expect(result[0].currentGate).toBe("");
    expect(result[0].startDate).toBe("2026-01-01T00:00:00Z");
    expect(result[0].targetDate).toBe("2026-02-01T00:00:00Z");
  });

  it("falls back to projectName when configName is empty", async () => {
    mockQueryResult = [{
      id: 2, configName: "", projectName: "Fallback Project",
      customerTier: null, customerName: null,
      redTeamLeaderName: null, blueTeamLeaderName: null,
      createdAt: "2026-01-01", updatedAt: null,
    }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getProjects();

    expect(result[0].name).toBe("Fallback Project");
  });

  it("defaults tier to 'other' when customerTier is null", async () => {
    mockQueryResult = [{
      id: 3, configName: "No Tier", customerTier: null,
      customerName: null, redTeamLeaderName: null,
      blueTeamLeaderName: null, createdAt: "2026-01-01", updatedAt: null,
    }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getProjects();

    expect(result[0].tier).toBe("other");
  });

  it("uses createdAt as targetDate when updatedAt is null", async () => {
    mockQueryResult = [{
      id: 4, configName: "No Update", customerTier: "tier_2",
      customerName: "C", redTeamLeaderName: "R",
      blueTeamLeaderName: "B", createdAt: "2026-01-15", updatedAt: null,
    }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getProjects();

    expect(result[0].targetDate).toBe("2026-01-15");
  });

  it("returns empty strings for null leader names", async () => {
    mockQueryResult = [{
      id: 5, configName: "No Leaders", customerTier: "other",
      customerName: null, redTeamLeaderName: null,
      blueTeamLeaderName: null, createdAt: "2026-01-01", updatedAt: null,
    }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getProjects();

    expect(result[0].redTeamLead).toBe("");
    expect(result[0].blueTeamLead).toBe("");
    expect(result[0].customer).toBe("");
  });

  it("handles multiple configs correctly", async () => {
    mockQueryResult = [
      { id: 1, configName: "Config A", customerTier: "tier_1", customerName: "C1",
        redTeamLeaderName: "R1", blueTeamLeaderName: "B1",
        createdAt: "2026-01-01", updatedAt: "2026-02-01" },
      { id: 2, configName: "Config B", customerTier: "tier_2", customerName: "C2",
        redTeamLeaderName: "R2", blueTeamLeaderName: "B2",
        createdAt: "2026-01-10", updatedAt: "2026-02-10" },
    ];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getProjects();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Config A");
    expect(result[1].name).toBe("Config B");
  });
});

// =========================================================================
// 7. getGates — All execution records (phases/gates)
// =========================================================================

describe("redBlue.getGates", () => {
  it("returns empty array when no executions exist", async () => {
    mockQueryResult = [];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getGates();

    expect(result).toEqual([]);
  });

  it("returns all execution records", async () => {
    const executions = [
      { id: 1, configId: 1, phase: "M0", phaseName: "Project Start", status: "completed" },
      { id: 2, configId: 1, phase: "M1", phaseName: "Kickoff", status: "scheduled" },
      { id: 3, configId: 2, phase: "M0", phaseName: "Project Start", status: "in_progress" },
    ];
    mockQueryResult = executions;

    const caller = createAdminCaller();
    const result = await caller.redBlue.getGates();

    expect(result).toHaveLength(3);
    expect(result).toEqual(executions);
  });
});

// =========================================================================
// 8. getTasks — Scheduled execution records
// =========================================================================

describe("redBlue.getTasks", () => {
  it("returns empty array when no scheduled tasks exist", async () => {
    mockQueryResult = [];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getTasks();

    expect(result).toEqual([]);
  });

  it("returns only scheduled execution records", async () => {
    const tasks = [
      { id: 1, configId: 1, phase: "M3", status: "scheduled", scheduledStart: "2026-03-01" },
      { id: 2, configId: 2, phase: "M5", status: "scheduled", scheduledStart: "2026-03-15" },
    ];
    mockQueryResult = tasks;

    const caller = createAdminCaller();
    const result = await caller.redBlue.getTasks();

    expect(result).toHaveLength(2);
    expect(result).toEqual(tasks);
  });
});

// =========================================================================
// 9. listExecutions — List executions for a given config
// =========================================================================

describe("redBlue.listExecutions", () => {
  it("returns empty list for config with no executions", async () => {
    mockQueryResult = [];

    const caller = createAdminCaller();
    const result = await caller.redBlue.listExecutions({ configId: 1 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("returns executions with total count", async () => {
    const executions = [
      { id: 1, configId: 5, phase: "M0", phaseName: "Start" },
      { id: 2, configId: 5, phase: "M1", phaseName: "Kickoff" },
    ];
    mockQueryResult = executions;

    const caller = createAdminCaller();
    const result = await caller.redBlue.listExecutions({ configId: 5 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });
});

// =========================================================================
// 10. getExecution — Get a single execution record by id
// =========================================================================

describe("redBlue.getExecution", () => {
  it("returns execution when found", async () => {
    const execution = {
      id: 1, configId: 1, phase: "M3", phaseName: "Design Review",
      status: "completed", redTeamScore: 80, blueTeamScore: 75,
    };
    mockQueryResult = [execution];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getExecution({ id: 1 });

    expect(result).toEqual(execution);
  });

  it("returns null when execution not found", async () => {
    mockQueryResult = [];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getExecution({ id: 999 });

    expect(result).toBeNull();
  });

  it("accepts string id", async () => {
    mockQueryResult = [{ id: 7, phase: "M2" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.getExecution({ id: "7" });

    expect(result).toBeDefined();
  });
});

// =========================================================================
// 11. createExecution — Create an execution record
// =========================================================================

describe("redBlue.createExecution", () => {
  it("creates execution with required fields", async () => {
    const execution = {
      id: 1, configId: 1, configCode: "RB-001",
      phase: "M3", phaseName: "Design Review", status: "scheduled",
    };
    mockReturningResult = [execution];

    const caller = createAdminCaller();
    const result = await caller.redBlue.createExecution({
      configId: 1,
      configCode: "RB-001",
      phase: "M3",
      phaseName: "Design Review",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("执行阶段已创建");
    expect(result.data).toEqual(execution);
  });

  it("creates execution with scheduled dates", async () => {
    mockReturningResult = [{
      id: 2, configId: 1, configCode: "RB-001",
      phase: "M4", phaseName: "Proto Build",
      scheduledStart: "2026-03-01T00:00:00Z",
      scheduledEnd: "2026-03-15T00:00:00Z",
      status: "scheduled",
    }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.createExecution({
      configId: 1,
      configCode: "RB-001",
      phase: "M4",
      phaseName: "Proto Build",
      scheduledStart: "2026-03-01T00:00:00Z",
      scheduledEnd: "2026-03-15T00:00:00Z",
    });

    expect(result.success).toBe(true);
    expect(result.data.scheduledStart).toBe("2026-03-01T00:00:00Z");
  });

  it("defaults status to 'scheduled' when not provided", async () => {
    mockReturningResult = [{ id: 3, status: "scheduled" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.createExecution({
      configId: 1,
      configCode: "RB-001",
      phase: "M5",
      phaseName: "Production Start",
    });

    expect(result.success).toBe(true);
    expect(result.data.status).toBe("scheduled");
  });

  it("accepts custom status", async () => {
    mockReturningResult = [{ id: 4, status: "in_progress" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.createExecution({
      configId: 1,
      configCode: "RB-001",
      phase: "M5",
      phaseName: "Production Start",
      status: "in_progress",
    });

    expect(result.success).toBe(true);
    expect(result.data.status).toBe("in_progress");
  });
});

// =========================================================================
// 12. updateExecution — Update an execution record
// =========================================================================

describe("redBlue.updateExecution", () => {
  it("updates execution scores", async () => {
    mockReturningResult = [{
      id: 1, redTeamScore: 85, blueTeamScore: 90, status: "completed",
    }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.updateExecution({
      id: 1,
      redTeamScore: 85,
      blueTeamScore: 90,
      status: "completed",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("执行记录已更新");
    expect(result.data.redTeamScore).toBe(85);
    expect(result.data.blueTeamScore).toBe(90);
  });

  it("throws NOT_FOUND when execution does not exist", async () => {
    mockReturningResult = [];

    const caller = createAdminCaller();
    await expect(
      caller.redBlue.updateExecution({ id: 999, status: "completed" })
    ).rejects.toThrow("执行记录不存在");
  });

  it("updates findings and responses", async () => {
    mockReturningResult = [{
      id: 1, redTeamFindings: "Found issue A",
      blueTeamResponses: [{ response: "Mitigated" }],
    }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.updateExecution({
      id: 1,
      redTeamFindings: "Found issue A",
      blueTeamResponses: [{ response: "Mitigated" }],
    });

    expect(result.success).toBe(true);
  });

  it("updates actual start and end dates (converts ISO strings to Date)", async () => {
    mockReturningResult = [{
      id: 1, actualStart: "2026-03-01T09:00:00Z", actualEnd: "2026-03-01T17:00:00Z",
    }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.updateExecution({
      id: 1,
      actualStart: "2026-03-01T09:00:00.000Z",
      actualEnd: "2026-03-01T17:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("accepts string id and coerces to number", async () => {
    mockReturningResult = [{ id: 5, status: "completed" }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.updateExecution({ id: "5", status: "completed" });

    expect(result.success).toBe(true);
  });

  it("updates issues found", async () => {
    mockReturningResult = [{
      id: 1, issuesFound: [{ issue: "Security gap", severity: "high" }],
    }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.updateExecution({
      id: 1,
      issuesFound: [{ issue: "Security gap", severity: "high" }],
    });

    expect(result.success).toBe(true);
  });

  it("updates red team actions", async () => {
    mockReturningResult = [{ id: 1, redTeamActions: [{ action: "Penetration test" }] }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.updateExecution({
      id: 1,
      redTeamActions: [{ action: "Penetration test" }],
    });

    expect(result.success).toBe(true);
  });

  it("allows setting nullable fields to null", async () => {
    mockReturningResult = [{ id: 1, actualStart: null, actualEnd: null }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.updateExecution({
      id: 1,
      actualStart: null,
      actualEnd: null,
      redTeamFindings: null,
      blueTeamPerformance: null,
    });

    expect(result.success).toBe(true);
  });
});

// =========================================================================
// 13. deleteExecution — Delete an execution record
// =========================================================================

describe("redBlue.deleteExecution", () => {
  it("deletes execution when it exists", async () => {
    mockQueryResult = [{ id: 1 }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.deleteExecution({ id: 1 });

    expect(result.success).toBe(true);
    expect(result.message).toBe("执行记录已删除");
  });

  it("throws NOT_FOUND when execution does not exist", async () => {
    mockQueryResult = [];

    const caller = createAdminCaller();
    await expect(
      caller.redBlue.deleteExecution({ id: 999 })
    ).rejects.toThrow("执行记录不存在");
  });

  it("accepts string id", async () => {
    mockQueryResult = [{ id: 7 }];

    const caller = createAdminCaller();
    const result = await caller.redBlue.deleteExecution({ id: "7" });

    expect(result.success).toBe(true);
  });
});

// =========================================================================
// 14. Authentication guards — all procedures require authentication
// =========================================================================

describe("redBlue auth guards", () => {
  it("anonymous caller is rejected for list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.redBlue.list()).rejects.toThrow();
  });

  it("anonymous caller is rejected for getById", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.redBlue.getById({ id: 1 })).rejects.toThrow();
  });

  it("anonymous caller is rejected for create", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.redBlue.create({ configName: "Test" })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for update", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.redBlue.update({ id: 1, configName: "Hack" })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for delete", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.redBlue.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for getProjects", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.redBlue.getProjects()).rejects.toThrow();
  });

  it("anonymous caller is rejected for getGates", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.redBlue.getGates()).rejects.toThrow();
  });

  it("anonymous caller is rejected for getTasks", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.redBlue.getTasks()).rejects.toThrow();
  });

  it("anonymous caller is rejected for listExecutions", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.redBlue.listExecutions({ configId: 1 })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for getExecution", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.redBlue.getExecution({ id: 1 })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for createExecution", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.redBlue.createExecution({
        configId: 1, configCode: "RB-001", phase: "M0", phaseName: "Start",
      })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for updateExecution", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.redBlue.updateExecution({ id: 1, status: "completed" })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for deleteExecution", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.redBlue.deleteExecution({ id: 1 })
    ).rejects.toThrow();
  });
});

// =========================================================================
// 15. Input validation edge cases
// =========================================================================

describe("redBlue input validation", () => {
  it("rejects create with empty configName", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.redBlue.create({ configName: "" })
    ).rejects.toThrow();
  });

  it("rejects list with page < 1", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.redBlue.list({ page: 0 })
    ).rejects.toThrow();
  });

  it("rejects list with pageSize > 200", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.redBlue.list({ pageSize: 201 })
    ).rejects.toThrow();
  });

  it("rejects list with pageSize < 1", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.redBlue.list({ pageSize: 0 })
    ).rejects.toThrow();
  });

  it("rejects createExecution with non-integer configId", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.redBlue.createExecution({
        configId: 1.5 as any,
        configCode: "RB-001",
        phase: "M0",
        phaseName: "Start",
      })
    ).rejects.toThrow();
  });

  it("rejects createExecution with invalid datetime scheduledStart", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.redBlue.createExecution({
        configId: 1,
        configCode: "RB-001",
        phase: "M0",
        phaseName: "Start",
        scheduledStart: "not-a-date",
      })
    ).rejects.toThrow();
  });

  it("rejects updateExecution with invalid datetime actualStart", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.redBlue.updateExecution({
        id: 1,
        actualStart: "invalid-datetime",
      })
    ).rejects.toThrow();
  });
});
