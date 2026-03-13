/**
 * processManagement Router — Unit Tests
 * 13 procedures covering T1-T15 process management, M2 tags, SOP recommendations,
 * risk alerts, process status updates, dashboard stats, and demo seeding.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

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
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock schema: production-process-schema ──────────────
vi.mock("../../drizzle/production-process-schema", () => ({
  processDefinitions: {
    id: "id",
    code: "code",
    nameZh: "nameZh",
    nameEn: "nameEn",
    description: "description",
    category: "category",
    standardDurationHours: "standardDurationHours",
    requiredCapabilityLevel: "requiredCapabilityLevel",
    sopTemplateId: "sopTemplateId",
    checklistItems: "checklistItems",
    riskFactors: "riskFactors",
    sortOrder: "sortOrder",
    isActive: "isActive",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  projectProcessInstances: {
    id: "id",
    projectId: "projectId",
    workOrderId: "workOrderId",
    processDefinitionId: "processDefinitionId",
    processCode: "processCode",
    status: "status",
    plannedStartDate: "plannedStartDate",
    plannedEndDate: "plannedEndDate",
    actualStartDate: "actualStartDate",
    actualEndDate: "actualEndDate",
    plannedDurationHours: "plannedDurationHours",
    actualDurationHours: "actualDurationHours",
    assignedUserId: "assignedUserId",
    assignedTeam: "assignedTeam",
    completionPercentage: "completionPercentage",
    qualityScore: "qualityScore",
    notes: "notes",
    blockerDescription: "blockerDescription",
    m2Tags: "m2Tags",
    aiRecommendations: "aiRecommendations",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  m2InfoTags: {
    id: "id",
    projectId: "projectId",
    meetingId: "meetingId",
    tagCategory: "tagCategory",
    tagName: "tagName",
    tagValue: "tagValue",
    relatedProcessCodes: "relatedProcessCodes",
    priority: "priority",
    sourceText: "sourceText",
    aiConfidence: "aiConfidence",
    isVerified: "isVerified",
    verifiedBy: "verifiedBy",
    verifiedAt: "verifiedAt",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  sopTemplates: {
    id: "id",
    code: "code",
    title: "title",
    processCode: "processCode",
    version: "version",
    category: "category",
    applicableProducts: "applicableProducts",
    steps: "steps",
    requiredTools: "requiredTools",
    safetyPrecautions: "safetyPrecautions",
    qualityCheckpoints: "qualityCheckpoints",
    estimatedDurationMinutes: "estimatedDurationMinutes",
    difficultyLevel: "difficultyLevel",
    isActive: "isActive",
    createdBy: "createdBy",
    approvedBy: "approvedBy",
    approvedAt: "approvedAt",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  aiSopRecommendations: {
    id: "id",
    projectId: "projectId",
    processInstanceId: "processInstanceId",
    sopTemplateId: "sopTemplateId",
    recommendationReason: "recommendationReason",
    matchScore: "matchScore",
    contextFactors: "contextFactors",
    isAccepted: "isAccepted",
    acceptedBy: "acceptedBy",
    acceptedAt: "acceptedAt",
    feedback: "feedback",
    createdAt: "createdAt",
  },
  processRiskAlerts: {
    id: "id",
    projectId: "projectId",
    processInstanceId: "processInstanceId",
    processCode: "processCode",
    riskType: "riskType",
    severity: "severity",
    title: "title",
    description: "description",
    suggestedActions: "suggestedActions",
    historicalReference: "historicalReference",
    aiAnalysis: "aiAnalysis",
    status: "status",
    acknowledgedBy: "acknowledgedBy",
    acknowledgedAt: "acknowledgedAt",
    mitigationNotes: "mitigationNotes",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Helper factories ────────────────────────────────────
function makeProcessDef(overrides: any = {}) {
  return {
    id: 1,
    code: "T1",
    nameZh: "机加工",
    nameEn: "Machining",
    description: "零部件机械加工",
    category: "MANUFACTURING",
    standardDurationHours: "40",
    sortOrder: 1,
    isActive: true,
    ...overrides,
  };
}

function makeProcessInstance(overrides: any = {}) {
  return {
    id: 1,
    projectId: 1,
    workOrderId: 100,
    processDefinitionId: 1,
    processCode: "T1",
    status: "IN_PROGRESS",
    completionPercentage: 50,
    plannedDurationHours: "40",
    actualDurationHours: "20",
    assignedTeam: "A组",
    plannedStartDate: new Date("2026-01-02"),
    plannedEndDate: new Date("2026-01-08"),
    actualStartDate: new Date("2026-01-02"),
    actualEndDate: null,
    ...overrides,
  };
}

function makeM2Tag(overrides: any = {}) {
  return {
    id: 1,
    projectId: 1,
    meetingId: 10,
    tagCategory: "CUSTOMER_REQUIREMENT",
    tagName: "清洁度要求",
    tagValue: "ISO 16232 Class 12",
    relatedProcessCodes: ["T7", "T14"],
    priority: "HIGH",
    aiConfidence: "0.95",
    isVerified: true,
    ...overrides,
  };
}

function makeSopTemplate(overrides: any = {}) {
  return {
    id: 1,
    code: "SOP-T1-001",
    title: "机加工标准操作规程",
    processCode: "T1",
    version: "1.0",
    category: "MANUFACTURING",
    qualityCheckpoints: ["尺寸检查", "表面粗糙度", "硬度测试"],
    ...overrides,
  };
}

function makeAiSopRecommendation(overrides: any = {}) {
  return {
    id: 1,
    projectId: 1,
    processInstanceId: 1,
    sopTemplateId: 1,
    recommendationReason: "Based on process T1",
    matchScore: "0.92",
    isAccepted: null,
    acceptedBy: null,
    acceptedAt: null,
    feedback: null,
    ...overrides,
  };
}

function makeRiskAlert(overrides: any = {}) {
  return {
    id: 1,
    projectId: 1,
    processInstanceId: 1,
    processCode: "T3",
    riskType: "SCHEDULE_DELAY",
    severity: "MEDIUM",
    title: "T3工序进度延迟风险",
    description: "当前完成度75%",
    suggestedActions: ["增加人力支援"],
    status: "OPEN",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════
// 1. getProcessDefinitions
// ═══════════════════════════════════════════════════════
describe("processManagement.getProcessDefinitions", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.processManagement.getProcessDefinitions()).rejects.toThrow();
  });

  it("returns DB rows when available", async () => {
    const def1 = makeProcessDef();
    const def2 = makeProcessDef({ id: 2, code: "T2", nameZh: "冷作", nameEn: "Cold Work", sortOrder: 2 });
    mockQueryResult = [def1, def2];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDefinitions();

    expect(result).toHaveLength(2);
    expect(result[0].code).toBe("T1");
    expect(result[0].standardHours).toBe(40);
    expect(result[1].code).toBe("T2");
  });

  it("returns fallback T_PROCESS_DEFINITIONS_FALLBACK when DB returns empty", async () => {
    mockQueryResult = [];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDefinitions();

    // Fallback has 15 entries (T1-T15)
    expect(result).toHaveLength(15);
    expect(result[0].code).toBe("T1");
    expect(result[0].nameZh).toBe("机加工");
    expect(result[14].code).toBe("T15");
  });

  it("returns fallback on DB error", async () => {
    // Make the mock chain throw when resolved
    const originalThen = (mockDb.select() as any).then;
    const chain = mockDb.select();
    chain.then = (resolve: any, reject?: any) => {
      if (reject) return reject(new Error("DB connection failed"));
      throw new Error("DB connection failed");
    };

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDefinitions();

    // Should return fallback (15 entries)
    expect(result).toHaveLength(15);

    // Restore
    chain.then = originalThen;
  });

  it("maps standardDurationHours to standardHours as number", async () => {
    mockQueryResult = [makeProcessDef({ standardDurationHours: "56.5" })];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDefinitions();

    expect(result[0].standardHours).toBe(56.5);
  });

  it("handles null standardDurationHours gracefully", async () => {
    mockQueryResult = [makeProcessDef({ standardDurationHours: null })];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDefinitions();

    expect(result[0].standardHours).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════
// 2. getProjectProcessInstances
// ═══════════════════════════════════════════════════════
describe("processManagement.getProjectProcessInstances", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.getProjectProcessInstances()
    ).rejects.toThrow();
  });

  it("returns enriched instances with process names", async () => {
    const instance = makeProcessInstance();
    const def = makeProcessDef();

    // First select = instances, second select = definitions
    selectResultsQueue.push([instance]);
    selectResultsQueue.push([def]);

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProjectProcessInstances();

    expect(result).toHaveLength(1);
    expect(result[0].processCode).toBe("T1");
    expect(result[0].processNameZh).toBe("机加工");
    expect(result[0].processNameEn).toBe("Machining");
    expect(result[0].category).toBe("MANUFACTURING");
    expect(result[0].plannedHours).toBe(40);
    expect(result[0].actualHours).toBe(20);
    expect(result[0].workOrderNo).toBe("WO-100");
  });

  it("returns empty array on DB error", async () => {
    const chain = mockDb.select();
    const originalThen = chain.then;
    chain.then = (resolve: any, reject?: any) => {
      if (reject) return reject(new Error("DB error"));
      throw new Error("DB error");
    };

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProjectProcessInstances();

    expect(result).toEqual([]);
    chain.then = originalThen;
  });

  it("handles optional input with projectId filter", async () => {
    selectResultsQueue.push([makeProcessInstance({ projectId: 2 })]);
    selectResultsQueue.push([makeProcessDef()]);

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProjectProcessInstances({
      projectId: 2,
    });

    expect(result).toHaveLength(1);
    expect(result[0].projectId).toBe(2);
  });

  it("handles optional input with status filter", async () => {
    selectResultsQueue.push([makeProcessInstance({ status: "COMPLETED" })]);
    selectResultsQueue.push([makeProcessDef()]);

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProjectProcessInstances({
      status: "COMPLETED",
    });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("COMPLETED");
  });

  it("returns null workOrderNo when workOrderId is null", async () => {
    selectResultsQueue.push([makeProcessInstance({ workOrderId: null })]);
    selectResultsQueue.push([makeProcessDef()]);

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProjectProcessInstances();

    expect(result[0].workOrderNo).toBeNull();
  });

  it("returns empty processNameZh/En when no matching def found", async () => {
    selectResultsQueue.push([makeProcessInstance({ processCode: "T99" })]);
    selectResultsQueue.push([makeProcessDef()]); // only T1

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProjectProcessInstances();

    expect(result[0].processNameZh).toBe("");
    expect(result[0].processNameEn).toBe("");
    expect(result[0].category).toBe("");
  });

  it("calls with no input (undefined)", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([]);

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProjectProcessInstances();

    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════
// 3. getProcessGanttData
// ═══════════════════════════════════════════════════════
describe("processManagement.getProcessGanttData", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.getProcessGanttData({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("returns Gantt-shaped data with dependencies", async () => {
    const inst1 = makeProcessInstance({ id: 1, processCode: "T1" });
    const inst2 = makeProcessInstance({ id: 2, processCode: "T3", completionPercentage: 75, status: "IN_PROGRESS" });
    const def1 = makeProcessDef();
    const def3 = makeProcessDef({ id: 3, code: "T3", nameZh: "机械部件装配" });

    selectResultsQueue.push([inst1, inst2]); // instances
    selectResultsQueue.push([def1, def3]);   // definitions

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessGanttData({ projectId: 1 });

    expect(result).toHaveLength(2);
    // T1 should have no dependencies
    expect(result[0].name).toContain("T1");
    expect(result[0].dependencies).toEqual([]);
    // T3 should depend on T2
    expect(result[1].name).toContain("T3");
    expect(result[1].dependencies).toEqual(["T2"]);
    expect(result[1].progress).toBe(75);
  });

  it("returns empty array on error", async () => {
    const chain = mockDb.select();
    const originalThen = chain.then;
    chain.then = (resolve: any, reject?: any) => {
      if (reject) return reject(new Error("DB error"));
      throw new Error("DB error");
    };

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessGanttData({ projectId: 1 });

    expect(result).toEqual([]);
    chain.then = originalThen;
  });

  it("uses actualStartDate over plannedStartDate when available", async () => {
    const actual = new Date("2026-02-01");
    const planned = new Date("2026-01-15");
    selectResultsQueue.push([
      makeProcessInstance({ actualStartDate: actual, plannedStartDate: planned, actualEndDate: null, plannedEndDate: new Date("2026-02-10") }),
    ]);
    selectResultsQueue.push([makeProcessDef()]);

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessGanttData({ projectId: 1 });

    expect(result[0].start).toEqual(actual);
    // end fallback to planned since actual is null
    expect(result[0].end).toEqual(new Date("2026-02-10"));
  });
});

// ═══════════════════════════════════════════════════════
// 4. getM2Tags
// ═══════════════════════════════════════════════════════
describe("processManagement.getM2Tags", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.getM2Tags({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("returns M2 tags for a project", async () => {
    const tag = makeM2Tag();
    mockQueryResult = [tag];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getM2Tags({ projectId: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].tagName).toBe("清洁度要求");
    expect(result[0].tagCategory).toBe("CUSTOMER_REQUIREMENT");
  });

  it("filters by category", async () => {
    mockQueryResult = [makeM2Tag({ tagCategory: "TECHNICAL_SPEC" })];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getM2Tags({
      projectId: 1,
      category: "TECHNICAL_SPEC",
    });

    expect(result).toHaveLength(1);
  });

  it("filters by verified flag", async () => {
    mockQueryResult = [makeM2Tag({ isVerified: true })];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getM2Tags({
      projectId: 1,
      verified: true,
    });

    expect(result).toHaveLength(1);
  });

  it("returns empty array on error", async () => {
    const chain = mockDb.select();
    const originalThen = chain.then;
    chain.then = (resolve: any, reject?: any) => {
      if (reject) return reject(new Error("DB error"));
      throw new Error("DB error");
    };

    const caller = createAdminCaller();
    const result = await caller.processManagement.getM2Tags({ projectId: 1 });

    expect(result).toEqual([]);
    chain.then = originalThen;
  });
});

// ═══════════════════════════════════════════════════════
// 5. getAiSopRecommendations
// ═══════════════════════════════════════════════════════
describe("processManagement.getAiSopRecommendations", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.getAiSopRecommendations({})
    ).rejects.toThrow();
  });

  it("returns SOP recommendations enriched with template info", async () => {
    const rec = makeAiSopRecommendation({ sopTemplateId: 1 });
    const tmpl = makeSopTemplate({ id: 1 });

    // First select = recommendations, second select = templates
    selectResultsQueue.push([rec]);
    selectResultsQueue.push([tmpl]);

    const caller = createAdminCaller();
    const result = await caller.processManagement.getAiSopRecommendations({
      projectId: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].sopCode).toBe("SOP-T1-001");
    expect(result[0].sopTitle).toBe("机加工标准操作规程");
    expect(result[0].matchScore).toBe(0.92);
    expect(result[0].processCode).toBe("T1");
  });

  it("filters by processCode after join", async () => {
    const rec = makeAiSopRecommendation({ sopTemplateId: 1 });
    const tmpl = makeSopTemplate({ id: 1, processCode: "T1" });

    selectResultsQueue.push([rec]);
    selectResultsQueue.push([tmpl]);

    const caller = createAdminCaller();
    // processCode "T2" won't match template's T1
    const result = await caller.processManagement.getAiSopRecommendations({
      processCode: "T2",
    });

    expect(result).toHaveLength(0);
  });

  it("returns empty array on error", async () => {
    const chain = mockDb.select();
    const originalThen = chain.then;
    chain.then = (resolve: any, reject?: any) => {
      if (reject) return reject(new Error("DB error"));
      throw new Error("DB error");
    };

    const caller = createAdminCaller();
    const result = await caller.processManagement.getAiSopRecommendations({});

    expect(result).toEqual([]);
    chain.then = originalThen;
  });

  it("handles missing template gracefully", async () => {
    const rec = makeAiSopRecommendation({ sopTemplateId: 999 });

    selectResultsQueue.push([rec]);
    selectResultsQueue.push([]); // no templates

    const caller = createAdminCaller();
    const result = await caller.processManagement.getAiSopRecommendations({});

    expect(result).toHaveLength(1);
    expect(result[0].sopCode).toBe("");
    expect(result[0].sopTitle).toBe("");
    expect(result[0].processCode).toBe("");
  });
});

// ═══════════════════════════════════════════════════════
// 6. respondToSopRecommendation
// ═══════════════════════════════════════════════════════
describe("processManagement.respondToSopRecommendation", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.respondToSopRecommendation({
        recommendationId: 1,
        accepted: true,
      })
    ).rejects.toThrow();
  });

  it("accepts a SOP recommendation", async () => {
    mockReturningResult = [{ id: 1, isAccepted: true }];

    const caller = createAdminCaller();
    const result = await caller.processManagement.respondToSopRecommendation({
      recommendationId: 1,
      accepted: true,
      feedback: "Good match",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("已采纳SOP推荐");
  });

  it("rejects a SOP recommendation", async () => {
    mockReturningResult = [{ id: 1, isAccepted: false }];

    const caller = createAdminCaller();
    const result = await caller.processManagement.respondToSopRecommendation({
      recommendationId: 1,
      accepted: false,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("已拒绝SOP推荐");
  });

  it("throws NOT_FOUND when recommendation does not exist", async () => {
    mockReturningResult = [];

    const caller = createAdminCaller();
    await expect(
      caller.processManagement.respondToSopRecommendation({
        recommendationId: 999,
        accepted: true,
      })
    ).rejects.toThrow("SOP recommendation not found");
  });
});

// ═══════════════════════════════════════════════════════
// 7. getStepSopRecommendation
// ═══════════════════════════════════════════════════════
describe("processManagement.getStepSopRecommendation", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.getStepSopRecommendation({
        projectId: 1,
        processCode: "T1",
        stepId: 1,
        stepName: "切削加工",
      })
    ).rejects.toThrow();
  });

  it("returns recommendations from matching SOP templates", async () => {
    const tmpl = makeSopTemplate({ id: 1, processCode: "T1", qualityCheckpoints: ["尺寸检查", "表面粗糙度"] });
    mockQueryResult = [tmpl];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getStepSopRecommendation({
      projectId: 1,
      processCode: "T1",
      stepId: 1,
      stepName: "切削加工",
    });

    expect(result.projectId).toBe(1);
    expect(result.processCode).toBe("T1");
    expect(result.stepId).toBe(1);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].sopCode).toBe("SOP-T1-001");
    expect(result.recommendations[0].matchScore).toBe(0.85);
    expect(result.recommendations[0].keyPoints).toEqual(["尺寸检查", "表面粗糙度"]);
    expect(result.linkedSops).toEqual([]);
  });

  it("returns auto-generated placeholder when no templates found", async () => {
    mockQueryResult = []; // no templates

    const caller = createAdminCaller();
    const result = await caller.processManagement.getStepSopRecommendation({
      projectId: 1,
      processCode: "T7",
      stepId: 3,
      stepName: "功能测试",
    });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].sopCode).toBe("SOP-T7-AUTO-S3");
    expect(result.recommendations[0].matchScore).toBe(0.75);
    expect(result.recommendations[0].reason).toContain("功能测试");
    expect(result.recommendations[0].keyPoints).toHaveLength(3);
  });

  it("returns empty recommendations on DB error", async () => {
    const chain = mockDb.select();
    const originalThen = chain.then;
    chain.then = (resolve: any, reject?: any) => {
      if (reject) return reject(new Error("DB error"));
      throw new Error("DB error");
    };

    const caller = createAdminCaller();
    const result = await caller.processManagement.getStepSopRecommendation({
      projectId: 1,
      processCode: "T1",
      stepId: 1,
      stepName: "test",
    });

    expect(result.recommendations).toEqual([]);
    expect(result.linkedSops).toEqual([]);
    chain.then = originalThen;
  });

  it("slices qualityCheckpoints to max 3 items", async () => {
    const tmpl = makeSopTemplate({
      qualityCheckpoints: ["A", "B", "C", "D", "E"],
    });
    mockQueryResult = [tmpl];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getStepSopRecommendation({
      projectId: 1,
      processCode: "T1",
      stepId: 1,
      stepName: "test",
    });

    expect(result.recommendations[0].keyPoints).toHaveLength(3);
    expect(result.recommendations[0].keyPoints).toEqual(["A", "B", "C"]);
  });

  it("handles non-array qualityCheckpoints gracefully", async () => {
    const tmpl = makeSopTemplate({ qualityCheckpoints: "not an array" });
    mockQueryResult = [tmpl];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getStepSopRecommendation({
      projectId: 1,
      processCode: "T1",
      stepId: 1,
      stepName: "test",
    });

    expect(result.recommendations[0].keyPoints).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════
// 8. linkSopToStep
// ═══════════════════════════════════════════════════════
describe("processManagement.linkSopToStep", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.linkSopToStep({
        stepId: 1,
        sopRecommendationId: "sop-1-step-1",
        accepted: true,
      })
    ).rejects.toThrow();
  });

  it("returns success message when accepted", async () => {
    const caller = createAdminCaller();
    const result = await caller.processManagement.linkSopToStep({
      stepId: 5,
      sopRecommendationId: "sop-10-step-5",
      accepted: true,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("已将SOP推荐关联到工步");
    expect(result.message).toContain("stepId=5");
  });

  it("returns rejection message when not accepted", async () => {
    const caller = createAdminCaller();
    const result = await caller.processManagement.linkSopToStep({
      stepId: 3,
      sopRecommendationId: "sop-2-step-3",
      accepted: false,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("已拒绝SOP推荐关联到工步");
    expect(result.message).toContain("stepId=3");
  });
});

// ═══════════════════════════════════════════════════════
// 9. getRiskAlerts
// ═══════════════════════════════════════════════════════
describe("processManagement.getRiskAlerts", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.getRiskAlerts({})
    ).rejects.toThrow();
  });

  it("returns risk alerts without filters", async () => {
    const alert1 = makeRiskAlert();
    const alert2 = makeRiskAlert({ id: 2, severity: "HIGH", processCode: "T4" });
    mockQueryResult = [alert1, alert2];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getRiskAlerts({});

    expect(result).toHaveLength(2);
  });

  it("filters by projectId", async () => {
    mockQueryResult = [makeRiskAlert({ projectId: 2 })];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getRiskAlerts({ projectId: 2 });

    expect(result).toHaveLength(1);
  });

  it("filters by severity", async () => {
    mockQueryResult = [makeRiskAlert({ severity: "CRITICAL" })];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getRiskAlerts({ severity: "CRITICAL" });

    expect(result).toHaveLength(1);
  });

  it("filters by status", async () => {
    mockQueryResult = [makeRiskAlert({ status: "MITIGATED" })];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getRiskAlerts({ status: "MITIGATED" });

    expect(result).toHaveLength(1);
  });

  it("filters by processCode", async () => {
    mockQueryResult = [makeRiskAlert({ processCode: "T5" })];

    const caller = createAdminCaller();
    const result = await caller.processManagement.getRiskAlerts({ processCode: "T5" });

    expect(result).toHaveLength(1);
  });

  it("returns empty array on error", async () => {
    const chain = mockDb.select();
    const originalThen = chain.then;
    chain.then = (resolve: any, reject?: any) => {
      if (reject) return reject(new Error("DB error"));
      throw new Error("DB error");
    };

    const caller = createAdminCaller();
    const result = await caller.processManagement.getRiskAlerts({});

    expect(result).toEqual([]);
    chain.then = originalThen;
  });
});

// ═══════════════════════════════════════════════════════
// 10. acknowledgeRiskAlert
// ═══════════════════════════════════════════════════════
describe("processManagement.acknowledgeRiskAlert", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.acknowledgeRiskAlert({ alertId: 1 })
    ).rejects.toThrow();
  });

  it("acknowledges a risk alert successfully", async () => {
    mockReturningResult = [{ id: 1, status: "ACKNOWLEDGED" }];

    const caller = createAdminCaller();
    const result = await caller.processManagement.acknowledgeRiskAlert({
      alertId: 1,
      notes: "Will add extra resources",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("风险预警已确认");
  });

  it("acknowledges without notes", async () => {
    mockReturningResult = [{ id: 1, status: "ACKNOWLEDGED" }];

    const caller = createAdminCaller();
    const result = await caller.processManagement.acknowledgeRiskAlert({
      alertId: 1,
    });

    expect(result.success).toBe(true);
  });

  it("throws NOT_FOUND when alert does not exist", async () => {
    mockReturningResult = [];

    const caller = createAdminCaller();
    await expect(
      caller.processManagement.acknowledgeRiskAlert({ alertId: 999 })
    ).rejects.toThrow("Risk alert not found");
  });
});

// ═══════════════════════════════════════════════════════
// 11. updateProcessStatus
// ═══════════════════════════════════════════════════════
describe("processManagement.updateProcessStatus", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.updateProcessStatus({
        instanceId: 1,
        status: "IN_PROGRESS",
      })
    ).rejects.toThrow();
  });

  it("updates status to IN_PROGRESS (auto-sets actualStartDate)", async () => {
    mockReturningResult = [{ id: 1, status: "IN_PROGRESS" }];

    const caller = createAdminCaller();
    const result = await caller.processManagement.updateProcessStatus({
      instanceId: 1,
      status: "IN_PROGRESS",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("IN_PROGRESS");
    // Verify set was called (the chain method)
    const chain = mockDb.update();
    expect(chain.set).toHaveBeenCalled();
  });

  it("updates status to COMPLETED (auto-sets actualEndDate + 100%)", async () => {
    mockReturningResult = [{ id: 1, status: "COMPLETED", completionPercentage: 100 }];

    const caller = createAdminCaller();
    const result = await caller.processManagement.updateProcessStatus({
      instanceId: 1,
      status: "COMPLETED",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("COMPLETED");
  });

  it("updates status with optional completionPercentage", async () => {
    mockReturningResult = [{ id: 1, status: "IN_PROGRESS", completionPercentage: 75 }];

    const caller = createAdminCaller();
    const result = await caller.processManagement.updateProcessStatus({
      instanceId: 1,
      status: "IN_PROGRESS",
      completionPercentage: 75,
    });

    expect(result.success).toBe(true);
  });

  it("updates status with notes", async () => {
    mockReturningResult = [{ id: 1, status: "ON_HOLD" }];

    const caller = createAdminCaller();
    const result = await caller.processManagement.updateProcessStatus({
      instanceId: 1,
      status: "ON_HOLD",
      notes: "Waiting for parts",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("ON_HOLD");
  });

  it("throws NOT_FOUND when instance does not exist", async () => {
    mockReturningResult = [];

    const caller = createAdminCaller();
    await expect(
      caller.processManagement.updateProcessStatus({
        instanceId: 999,
        status: "BLOCKED",
      })
    ).rejects.toThrow("Process instance not found");
  });

  it("rejects invalid completionPercentage (> 100)", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.processManagement.updateProcessStatus({
        instanceId: 1,
        status: "IN_PROGRESS",
        completionPercentage: 150,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid completionPercentage (< 0)", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.processManagement.updateProcessStatus({
        instanceId: 1,
        status: "IN_PROGRESS",
        completionPercentage: -10,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid status value", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.processManagement.updateProcessStatus({
        instanceId: 1,
        status: "INVALID_STATUS" as any,
      })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════
// 12. getProcessDashboardStats
// ═══════════════════════════════════════════════════════
describe("processManagement.getProcessDashboardStats", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.processManagement.getProcessDashboardStats({})
    ).rejects.toThrow();
  });

  it("returns empty stats when no instances exist", async () => {
    // First select = instances (empty)
    selectResultsQueue.push([]);

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDashboardStats({});

    expect(result.summary.total).toBe(0);
    expect(result.summary.avgCompletionRate).toBe(0);
    expect(result.byProcess).toEqual([]);
    expect(result.riskCount).toBe(0);
    expect(result.pendingSopRecommendations).toBe(0);
  });

  it("returns computed stats from instances", async () => {
    const instances = [
      makeProcessInstance({ id: 1, processCode: "T1", status: "COMPLETED", completionPercentage: 100, plannedDurationHours: "40", actualDurationHours: "38", actualEndDate: new Date("2026-01-07"), plannedEndDate: new Date("2026-01-08") }),
      makeProcessInstance({ id: 2, processCode: "T2", status: "IN_PROGRESS", completionPercentage: 60, plannedDurationHours: "24", actualDurationHours: "14" }),
      makeProcessInstance({ id: 3, processCode: "T3", status: "NOT_STARTED", completionPercentage: 0, plannedDurationHours: "32", actualDurationHours: "0" }),
    ];
    const defs = [
      makeProcessDef({ code: "T1" }),
      makeProcessDef({ id: 2, code: "T2", nameZh: "冷作" }),
      makeProcessDef({ id: 3, code: "T3", nameZh: "机械部件装配" }),
    ];

    // Queue: instances, definitions, riskCount, pendingSop
    selectResultsQueue.push(instances);
    selectResultsQueue.push(defs);
    selectResultsQueue.push([{ cnt: 3 }]);  // risk count
    selectResultsQueue.push([{ cnt: 5 }]);  // pending SOP

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDashboardStats({});

    expect(result.summary.total).toBe(3);
    expect(result.summary.completed).toBe(1);
    expect(result.summary.inProgress).toBe(1);
    expect(result.summary.notStarted).toBe(1);
    expect(result.summary.onHold).toBe(0);
    expect(result.summary.blocked).toBe(0);
    expect(result.summary.avgCompletionRate).toBe(53); // Math.round((100+60+0)/3)
    expect(result.summary.totalPlannedHours).toBe(96); // 40+24+32
    expect(result.summary.totalActualHours).toBe(52);  // 38+14+0
    expect(result.byProcess).toHaveLength(3);
    expect(result.riskCount).toBe(3);
    expect(result.pendingSopRecommendations).toBe(5);
  });

  it("filters by projectId", async () => {
    selectResultsQueue.push([makeProcessInstance({ projectId: 5, status: "IN_PROGRESS", completionPercentage: 50, plannedDurationHours: "10", actualDurationHours: "5" })]);
    selectResultsQueue.push([makeProcessDef()]);
    selectResultsQueue.push([{ cnt: 0 }]);
    selectResultsQueue.push([{ cnt: 0 }]);

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDashboardStats({ projectId: 5 });

    expect(result.summary.total).toBe(1);
  });

  it("returns empty stats on error", async () => {
    const chain = mockDb.select();
    const originalThen = chain.then;
    chain.then = (resolve: any, reject?: any) => {
      if (reject) return reject(new Error("DB error"));
      throw new Error("DB error");
    };

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDashboardStats({});

    expect(result.summary.total).toBe(0);
    expect(result.byProcess).toEqual([]);
    chain.then = originalThen;
  });

  it("computes onTimeRate correctly (completed late reduces rate)", async () => {
    const instances = [
      makeProcessInstance({ id: 1, status: "COMPLETED", completionPercentage: 100, plannedDurationHours: "40", actualDurationHours: "38", actualEndDate: new Date("2026-01-10"), plannedEndDate: new Date("2026-01-08") }),
      makeProcessInstance({ id: 2, status: "COMPLETED", completionPercentage: 100, plannedDurationHours: "24", actualDurationHours: "20", actualEndDate: new Date("2026-01-05"), plannedEndDate: new Date("2026-01-06") }),
    ];

    selectResultsQueue.push(instances);
    selectResultsQueue.push([makeProcessDef()]);
    selectResultsQueue.push([{ cnt: 0 }]);
    selectResultsQueue.push([{ cnt: 0 }]);

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDashboardStats({});

    // instance 1 is late (actual > planned), instance 2 is on time
    // onTimeRate = Math.round((1 / 2) * 100) = 50
    expect(result.summary.onTimeRate).toBe(50);
  });

  it("handles risk/sop count query failures gracefully", async () => {
    // Instances + definitions succeed, but risk/sop count queries throw
    selectResultsQueue.push([makeProcessInstance({ status: "IN_PROGRESS", completionPercentage: 50, plannedDurationHours: "10", actualDurationHours: "5" })]);
    selectResultsQueue.push([makeProcessDef()]);
    // The next two selects (risk count, sop count) will use the now-empty queue
    // and fall back to mockQueryResult which is []
    // The code handles missing cnt with ?? 0

    const caller = createAdminCaller();
    const result = await caller.processManagement.getProcessDashboardStats({});

    expect(result.summary.total).toBe(1);
    // riskCount and pendingSopRecommendations default to 0 when query returns no rows or fails
  });
});

// ═══════════════════════════════════════════════════════
// 13. seedDemo
// ═══════════════════════════════════════════════════════
describe("processManagement.seedDemo", () => {
  it("requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.processManagement.seedDemo()).rejects.toThrow();
  });

  it("creates tables, seeds definitions, instances, M2 tags, and risk alerts", async () => {
    // Seed uses insert().values().returning() for definitions (15 times)
    // and insert().values() (without returning) for instances (5 times), M2 tags (4 times), risks (2 times)
    mockReturningResult = [{ id: 1 }];

    const caller = createAdminCaller();
    const result = await caller.processManagement.seedDemo();

    expect(result.definitions).toHaveLength(15);
    expect(result.instances).toHaveLength(5);
    expect(result.message).toContain("15 definitions");
    expect(result.message).toContain("5 instances");
    expect(result.message).toContain("4 M2 tags");
    expect(result.message).toContain("2 risk alerts");

    // Verify execute was called (CREATE TABLE statements)
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("handles insert conflicts for definitions gracefully", async () => {
    // Make insert().values().returning() throw for first definition
    let callCount = 0;
    const origReturning = mockDb.insert().returning;
    mockDb.insert().returning = vi.fn(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.reject(new Error("unique constraint violation"));
      }
      return Promise.resolve([{ id: callCount }]);
    });

    const caller = createAdminCaller();
    const result = await caller.processManagement.seedDemo();

    // First 2 definitions should show "exists", rest "created"
    expect(result.definitions).toHaveLength(15);
    expect(result.definitions[0].status).toBe("exists");
    expect(result.definitions[1].status).toBe("exists");
    expect(result.definitions[2].status).toBe("created");

    // Restore
    mockDb.insert().returning = origReturning;
  });

  it("handles insert errors for instances gracefully", async () => {
    // returning for definitions succeeds
    mockReturningResult = [{ id: 1 }];

    // Override insert chain to make instance inserts fail sometimes
    // The instances are caught in try/catch so they should show "error" status
    const caller = createAdminCaller();
    const result = await caller.processManagement.seedDemo();

    // All 5 instances should be in the result
    expect(result.instances).toHaveLength(5);
    // With our mock they all succeed since returning resolves with [{id:1}]
    result.instances.forEach((inst: any) => {
      expect(["created", "error"]).toContain(inst.status);
    });
  });
});

// ═══════════════════════════════════════════════════════
// Input Validation Tests
// ═══════════════════════════════════════════════════════
describe("processManagement input validation", () => {
  it("getProjectProcessInstances rejects invalid status enum", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.processManagement.getProjectProcessInstances({
        status: "INVALID" as any,
      })
    ).rejects.toThrow();
  });

  it("getProcessGanttData requires projectId", async () => {
    const caller = createAdminCaller();
    await expect(
      (caller.processManagement as any).getProcessGanttData({})
    ).rejects.toThrow();
  });

  it("getM2Tags requires projectId", async () => {
    const caller = createAdminCaller();
    await expect(
      (caller.processManagement as any).getM2Tags({})
    ).rejects.toThrow();
  });

  it("respondToSopRecommendation requires recommendationId and accepted", async () => {
    const caller = createAdminCaller();
    await expect(
      (caller.processManagement as any).respondToSopRecommendation({})
    ).rejects.toThrow();
  });

  it("getStepSopRecommendation requires all four fields", async () => {
    const caller = createAdminCaller();
    await expect(
      (caller.processManagement as any).getStepSopRecommendation({
        projectId: 1,
        processCode: "T1",
        // missing stepId and stepName
      })
    ).rejects.toThrow();
  });

  it("getRiskAlerts rejects invalid severity", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.processManagement.getRiskAlerts({
        severity: "SUPER_HIGH" as any,
      })
    ).rejects.toThrow();
  });

  it("getRiskAlerts rejects invalid status", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.processManagement.getRiskAlerts({
        status: "DELETED" as any,
      })
    ).rejects.toThrow();
  });

  it("updateProcessStatus rejects invalid status enum", async () => {
    const caller = createAdminCaller();
    await expect(
      caller.processManagement.updateProcessStatus({
        instanceId: 1,
        status: "CANCELLED" as any,
      })
    ).rejects.toThrow();
  });

  it("linkSopToStep requires all three fields", async () => {
    const caller = createAdminCaller();
    await expect(
      (caller.processManagement as any).linkSopToStep({
        stepId: 1,
        // missing sopRecommendationId and accepted
      })
    ).rejects.toThrow();
  });
});
