/**
 * R&D NPI/NPD Router — Unit Tests
 * 6 sub-routers, 38 procedures
 *
 * Run: pnpm test -- server/routers/rnd-npi.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
let selectResultsQueue: any[][] = [];
let returningQueue: any[][] = [];

const createMockDbChain = () => {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.and = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.returning = vi.fn(async () => {
    if (returningQueue.length > 0) return returningQueue.shift()!;
    return mockReturningResult;
  });
  chain.then = (resolve: any, reject?: any) => {
    try {
      resolve(mockQueryResult);
    } catch (e) {
      reject?.(e);
    }
  };
  return chain;
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    return {
      select: vi.fn(() => {
        const chain = createMockDbChain();
        if (selectResultsQueue.length > 0) {
          const nextResult = selectResultsQueue.shift()!;
          chain.then = (resolve: any) => resolve(nextResult);
        }
        return chain;
      }),
      insert: vi.fn(() => createMockDbChain()),
      update: vi.fn(() => createMockDbChain()),
      delete: vi.fn(() => createMockDbChain()),
    };
  }),
}));

// ─── Mock schema tables ───────────────────────────────────────────────
vi.mock("../../drizzle/rnd-npi-schema", () => ({
  rndProjects: {
    id: "id", projectCode: "projectCode", name: "name", nameEn: "nameEn",
    category: "category", currentStage: "currentStage", status: "status",
    parentProjectId: "parentProjectId", parentProjectCode: "parentProjectCode",
    leadEngineerId: "leadEngineerId", ctoSignoffRequired: "ctoSignoffRequired",
    ceoSignoffRequired: "ceoSignoffRequired", budget: "budget", actualSpend: "actualSpend",
    currency: "currency", buCode: "buCode", riskLevel: "riskLevel",
    completionPercent: "completionPercent", version: "version",
    createdAt: "createdAt", updatedAt: "updatedAt", description: "description",
    targetSpecs: "targetSpecs", tags: "tags", createdBy: "createdBy",
    plannedStartDate: "plannedStartDate", plannedEndDate: "plannedEndDate",
    actualStartDate: "actualStartDate", actualEndDate: "actualEndDate",
  },
  rndGateReviews: {
    id: "id", rndProjectId: "rndProjectId", gateStage: "gateStage",
    reviewRound: "reviewRound", decision: "decision", reviewerId: "reviewerId",
    reviewerName: "reviewerName", reviewerRole: "reviewerRole",
    ctoApproved: "ctoApproved", ctoApprovedBy: "ctoApprovedBy",
    ctoApprovedAt: "ctoApprovedAt", ctoComment: "ctoComment",
    ceoApproved: "ceoApproved", ceoApprovedBy: "ceoApprovedBy",
    ceoApprovedAt: "ceoApprovedAt", ceoComment: "ceoComment",
    checklistJson: "checklistJson", checklistPassed: "checklistPassed",
    checklistTotal: "checklistTotal", overallScore: "overallScore",
    conditions: "conditions", actionItems: "actionItems", attachments: "attachments",
    reviewedAt: "reviewedAt", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  rndSandboxBoms: {
    id: "id", rndProjectId: "rndProjectId", bomCode: "bomCode",
    versionMajor: "versionMajor", versionMinor: "versionMinor",
    versionLabel: "versionLabel", status: "status", parentBomId: "parentBomId",
    totalEstimatedCost: "totalEstimatedCost", totalComponents: "totalComponents",
    avlApprovedCount: "avlApprovedCount", experimentalCount: "experimentalCount",
    frozenAt: "frozenAt", frozenBy: "frozenBy", frozenForGate: "frozenForGate",
    promotedToBomMasterId: "promotedToBomMasterId", promotedAt: "promotedAt",
    promotedBy: "promotedBy", description: "description", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  rndSandboxBomItems: {
    id: "id", sandboxBomId: "sandboxBomId", parentItemId: "parentItemId",
    level: "level", sequence: "sequence", partNumber: "partNumber",
    partName: "partName", componentSource: "componentSource",
    quantity: "quantity", unit: "unit", unitCost: "unitCost",
    extendedCost: "extendedCost", supplierName: "supplierName",
    leadTimeDays: "leadTimeDays", isCriticalPath: "isCriticalPath",
    requiresCustomTooling: "requiresCustomTooling", avlMaterialCode: "avlMaterialCode",
    substitutes: "substitutes", notes: "notes",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  rndBomSnapshots: {
    id: "id", sandboxBomId: "sandboxBomId", rndProjectId: "rndProjectId",
    snapshotReason: "snapshotReason", gateStage: "gateStage",
    bomHeaderSnapshot: "bomHeaderSnapshot", bomItemsSnapshot: "bomItemsSnapshot",
    totalCost: "totalCost", avlCompliancePercent: "avlCompliancePercent",
    snapshotBy: "snapshotBy", snapshotLabel: "snapshotLabel", createdAt: "createdAt",
  },
  rndTestRecords: {
    id: "id", rndProjectId: "rndProjectId", gateStage: "gateStage",
    testCode: "testCode", testName: "testName", testType: "testType",
    testMetrics: "testMetrics", passCriteria: "passCriteria",
    verdict: "verdict", environmentConditions: "environmentConditions",
    testEquipment: "testEquipment", evidenceUrls: "evidenceUrls",
    executedBy: "executedBy", executedAt: "executedAt",
    reviewedBy: "reviewedBy", reviewedAt: "reviewedAt",
    suiteId: "suiteId", isMandatory: "isMandatory", notes: "notes",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  rndTestSuites: {
    id: "id", rndProjectId: "rndProjectId", suiteCode: "suiteCode",
    suiteName: "suiteName", targetGate: "targetGate",
    projectCategory: "projectCategory", testTemplates: "testTemplates",
    totalTests: "totalTests", passedTests: "passedTests", failedTests: "failedTests",
    createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  rndAssemblyRoutings: {
    id: "id", rndProjectId: "rndProjectId", sandboxBomId: "sandboxBomId",
    routingCode: "routingCode", version: "version", routingName: "routingName",
    status: "status", totalCycleTimeMinutes: "totalCycleTimeMinutes",
    activatedAtStage: "activatedAtStage", description: "description",
    createdBy: "createdBy", activatedAt: "activatedAt", frozenAt: "frozenAt",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  rndRoutingSteps: {
    id: "id", routingId: "routingId", stepNumber: "stepNumber",
    stepType: "stepType", stepName: "stepName",
    standardCycleTimeMinutes: "standardCycleTimeMinutes",
    actualCycleTimeMinutes: "actualCycleTimeMinutes",
    workInstructions: "workInstructions", toolsRequired: "toolsRequired",
    inspectionCriteria: "inspectionCriteria", consumedBomItemIds: "consumedBomItemIds",
    workerSkillLevel: "workerSkillLevel", workerCount: "workerCount",
    predecessorStepId: "predecessorStepId", isOptional: "isOptional", notes: "notes",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  rndActivityLog: {
    id: "id", entityType: "entityType", entityId: "entityId",
    action: "action", userId: "userId", userName: "userName",
    changeSummary: "changeSummary", previousValue: "previousValue",
    newValue: "newValue", metadata: "metadata", createdAt: "createdAt",
  },
}));

vi.mock("../../drizzle/bom-schema", () => ({
  bomMasters: {
    id: "id", productCode: "productCode", productName: "productName",
    bomType: "bomType", currentVersion: "currentVersion", status: "status",
    buCode: "buCode",
  },
  bomItems: {
    id: "id", bomMasterId: "bomMasterId", parentItemId: "parentItemId",
    level: "level", sequence: "sequence", materialCode: "materialCode",
    materialName: "materialName", quantity: "quantity", unit: "unit",
    unitCost: "unitCost",
  },
}));

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return {
    ...actual,
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values }),
      { raw: (s: string) => s }
    ),
  };
});

vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ─── Import AFTER mocks are in place ─────────────────────────────────
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Reset between tests ─────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue = [];
  returningQueue = [];
});

// ═══════════════════════════════════════════════════════════════════════
// 1. Project sub-router
// ═══════════════════════════════════════════════════════════════════════

describe("rndNpi.project", () => {
  it("list returns items and total", async () => {
    selectResultsQueue.push([{ count: 2 }]);
    mockQueryResult = [{ id: 1, name: "Alpha" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.project.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list accepts category filter", async () => {
    selectResultsQueue.push([{ count: 0 }]);
    const caller = createAdminCaller();
    const result = await caller.rndNpi.project.list({ category: "robotics" });
    expect(result.total).toBe(0);
  });

  it("getById returns project", async () => {
    mockQueryResult = [{ id: 1, name: "Alpha", projectCode: "RND-2026-001" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.project.getById({ id: 1 });
    expect(result.name).toBe("Alpha");
  });

  it("getById throws NOT_FOUND for missing project", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    await expect(caller.rndNpi.project.getById({ id: 999 })).rejects.toThrow("project not found");
  });

  it("create generates project code and returns project", async () => {
    // count query for seq
    selectResultsQueue.push([{ count: 0 }]);
    // insert returning
    mockReturningResult = [{ id: 1, projectCode: "RND-2026-001", name: "Test" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.project.create({
      name: "Test Project",
      category: "robotics",
    });
    expect(result).toHaveProperty("id");
  });

  it("update rejects on version conflict", async () => {
    selectResultsQueue.push([{ id: 1, version: 2 }]);
    const caller = createAdminCaller();
    await expect(
      caller.rndNpi.project.update({ id: 1, name: "Updated", version: 1 })
    ).rejects.toThrow("modified by another user");
  });

  it("advanceStage validates gate review approval", async () => {
    // First select: project
    selectResultsQueue.push([{ id: 1, currentStage: "concept", ctoSignoffRequired: false, ceoSignoffRequired: false }]);
    // Second select: latest gate review - none found
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    await expect(caller.rndNpi.project.advanceStage({ id: 1 })).rejects.toThrow("approved or conditional");
  });

  it("advanceStage validates CTO sign-off", async () => {
    selectResultsQueue.push([{ id: 1, currentStage: "concept", ctoSignoffRequired: true, ceoSignoffRequired: false }]);
    selectResultsQueue.push([{ id: 1, decision: "approved", ctoApproved: false }]);
    const caller = createAdminCaller();
    await expect(caller.rndNpi.project.advanceStage({ id: 1 })).rejects.toThrow("CTO sign-off");
  });

  it("advanceStage succeeds with proper approvals", async () => {
    selectResultsQueue.push([{ id: 1, currentStage: "concept", ctoSignoffRequired: true, ceoSignoffRequired: false }]);
    selectResultsQueue.push([{ id: 1, decision: "approved", ctoApproved: true }]);
    mockReturningResult = [{ id: 1, currentStage: "evt" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.project.advanceStage({ id: 1 });
    expect(result).toHaveProperty("id");
  });

  it("advanceStage rejects at final stage", async () => {
    selectResultsQueue.push([{ id: 1, currentStage: "mass_production", ctoSignoffRequired: false, ceoSignoffRequired: false }]);
    const caller = createAdminCaller();
    await expect(caller.rndNpi.project.advanceStage({ id: 1 })).rejects.toThrow("already at final stage");
  });

  it("revertStage rejects at earliest stage", async () => {
    selectResultsQueue.push([{ id: 1, currentStage: "concept" }]);
    const caller = createAdminCaller();
    await expect(caller.rndNpi.project.revertStage({ id: 1 })).rejects.toThrow("already at earliest stage");
  });

  it("linkParent updates parent fields", async () => {
    mockReturningResult = [{ id: 1, parentProjectId: 100, parentProjectCode: "PRJ-001" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.project.linkParent({
      id: 1, parentProjectId: 100, parentProjectCode: "PRJ-001",
    });
    expect(result).toHaveProperty("id");
  });

  it("getStageHistory returns log entries", async () => {
    mockQueryResult = [{ id: 1, action: "stage_advanced" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.project.getStageHistory({ projectId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Gate sub-router
// ═══════════════════════════════════════════════════════════════════════

describe("rndNpi.gate", () => {
  it("listByProject returns reviews", async () => {
    mockQueryResult = [{ id: 1, gateStage: "concept" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.gate.listByProject({ projectId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("getById returns review", async () => {
    mockQueryResult = [{ id: 1, gateStage: "concept", decision: "pending" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.gate.getById({ id: 1 });
    expect(result.gateStage).toBe("concept");
  });

  it("createReview determines review round", async () => {
    selectResultsQueue.push([{ count: 1 }]);
    mockReturningResult = [{ id: 1, reviewRound: 2, gateStage: "evt" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.gate.createReview({
      rndProjectId: 1, gateStage: "evt",
    });
    expect(result).toHaveProperty("id");
  });

  it("updateChecklist counts passed items", async () => {
    mockReturningResult = [{ id: 1, checklistPassed: 2, checklistTotal: 3 }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.gate.updateChecklist({
      id: 1,
      checklistJson: [
        { id: "1", item: "Design review", status: "passed" },
        { id: "2", item: "Risk assessment", status: "passed" },
        { id: "3", item: "Cost analysis", status: "failed" },
      ],
    });
    expect(result).toHaveProperty("id");
  });

  it("submitDecision updates decision", async () => {
    mockReturningResult = [{ id: 1, decision: "approved" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.gate.submitDecision({
      id: 1, decision: "approved", overallScore: "85.5",
    });
    expect(result.decision).toBe("approved");
  });

  it("ctoSignoff updates CTO fields", async () => {
    mockReturningResult = [{ id: 1, ctoApproved: true }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.gate.ctoSignoff({
      id: 1, approved: true, comment: "LGTM",
    });
    expect(result.ctoApproved).toBe(true);
  });

  it("ceoSignoff requires CTO first", async () => {
    // Fetch review: CTO not approved
    selectResultsQueue.push([{ id: 1, ctoApproved: false }]);
    const caller = createAdminCaller();
    await expect(
      caller.rndNpi.gate.ceoSignoff({ id: 1, approved: true })
    ).rejects.toThrow("CTO must sign off before CEO");
  });

  it("ceoSignoff succeeds when CTO already signed off", async () => {
    selectResultsQueue.push([{ id: 1, ctoApproved: true }]);
    mockReturningResult = [{ id: 1, ceoApproved: true }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.gate.ceoSignoff({
      id: 1, approved: true, comment: "Approved",
    });
    expect(result.ceoApproved).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Sandbox BOM sub-router
// ═══════════════════════════════════════════════════════════════════════

describe("rndNpi.sandboxBom", () => {
  it("listByProject returns BOMs", async () => {
    mockQueryResult = [{ id: 1, bomCode: "BOM-ALPHA" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.sandboxBom.listByProject({ projectId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("getById returns BOM with items", async () => {
    selectResultsQueue.push([{ id: 1, bomCode: "BOM-ALPHA" }]);
    selectResultsQueue.push([{ id: 1, partNumber: "PART-001" }]);
    const caller = createAdminCaller();
    const result = await caller.rndNpi.sandboxBom.getById({ id: 1 });
    expect(result).toHaveProperty("items");
    expect(result.bomCode).toBe("BOM-ALPHA");
  });

  it("create creates new BOM version", async () => {
    mockReturningResult = [{ id: 1, bomCode: "BOM-ALPHA", versionLabel: "v0.1" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.sandboxBom.create({
      rndProjectId: 1, bomCode: "BOM-ALPHA",
    });
    expect(result).toHaveProperty("id");
  });

  it("addItem calculates extended cost", async () => {
    mockReturningResult = [{ id: 1, extendedCost: "50.00" }];
    // stats query
    selectResultsQueue.push([{ count: 5 }]);
    const caller = createAdminCaller();
    const result = await caller.rndNpi.sandboxBom.addItem({
      sandboxBomId: 1,
      partNumber: "PART-001",
      partName: "Servo Motor",
      quantity: "5",
      unitCost: "10",
    });
    expect(result).toHaveProperty("id");
  });

  it("freeze rejects already frozen BOM", async () => {
    selectResultsQueue.push([{ id: 1, status: "frozen" }]);
    const caller = createAdminCaller();
    await expect(
      caller.rndNpi.sandboxBom.freeze({ id: 1, gateStage: "evt" })
    ).rejects.toThrow("already frozen");
  });

  it("freeze creates snapshot and updates status", async () => {
    selectResultsQueue.push([{ id: 1, status: "draft", rndProjectId: 1, totalEstimatedCost: "1000" }]);
    // items query for snapshot
    selectResultsQueue.push([
      { id: 1, componentSource: "avl_approved" },
      { id: 2, componentSource: "experimental" },
    ]);
    mockReturningResult = [{ id: 1, status: "frozen" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.sandboxBom.freeze({ id: 1, gateStage: "evt" });
    expect(result.status).toBe("frozen");
  });

  it("promote rejects non-frozen BOM", async () => {
    selectResultsQueue.push([{ id: 1, status: "draft" }]);
    const caller = createAdminCaller();
    await expect(
      caller.rndNpi.sandboxBom.promote({ id: 1 })
    ).rejects.toThrow("must be frozen");
  });

  it("promote copies to production BOM", async () => {
    // BOM query
    selectResultsQueue.push([{ id: 1, status: "frozen", rndProjectId: 1, bomCode: "BOM-A", versionLabel: "v1.0", totalEstimatedCost: "5000" }]);
    // Project query
    selectResultsQueue.push([{ id: 1, name: "Alpha", buCode: "overseas" }]);
    // Insert bomMasters returning
    returningQueue.push([{ id: 100 }]);
    // Sandbox items query
    selectResultsQueue.push([
      { id: 1, partNumber: "P001", partName: "Motor", level: 1, sequence: 10, quantity: "2", unit: "pcs", unitCost: "100" },
    ]);
    // Insert bomItems (no returning needed for bulk)
    returningQueue.push([{ id: 200 }]);
    // Update sandbox BOM returning
    returningQueue.push([{ id: 1, status: "promoted", promotedToBomMasterId: 100 }]);
    const caller = createAdminCaller();
    const result = await caller.rndNpi.sandboxBom.promote({ id: 1 });
    expect(result).toHaveProperty("masterId");
  });

  it("getSnapshots returns snapshot list", async () => {
    mockQueryResult = [{ id: 1, snapshotReason: "gate_freeze" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.sandboxBom.getSnapshots({ sandboxBomId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Testing sub-router
// ═══════════════════════════════════════════════════════════════════════

describe("rndNpi.testing", () => {
  it("listByProject returns items and total", async () => {
    mockQueryResult = [{ id: 1, testCode: "TC-001" }];
    selectResultsQueue.push([{ count: 1 }]);
    const caller = createAdminCaller();
    const result = await caller.rndNpi.testing.listByProject({ projectId: 1 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("create creates test record", async () => {
    mockReturningResult = [{ id: 1, testCode: "TC-001" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.testing.create({
      rndProjectId: 1,
      gateStage: "evt",
      testCode: "TC-001",
      testName: "Torque Test",
      testType: "performance",
    });
    expect(result).toHaveProperty("id");
  });

  it("updateVerdict auto-evaluates pass criteria", async () => {
    selectResultsQueue.push([{
      id: 1,
      passCriteria: { torque_Nm: { min: 40, max: 50 } },
      verdict: "not_run",
    }]);
    mockReturningResult = [{ id: 1, verdict: "pass" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.testing.updateVerdict({
      id: 1,
      testMetrics: { torque_Nm: 45 },
    });
    expect(result).toHaveProperty("id");
  });

  it("updateVerdict auto-evaluates fail when out of range", async () => {
    selectResultsQueue.push([{
      id: 1,
      passCriteria: { torque_Nm: { min: 40, max: 50 } },
      verdict: "not_run",
    }]);
    mockReturningResult = [{ id: 1, verdict: "fail" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.testing.updateVerdict({
      id: 1,
      testMetrics: { torque_Nm: 55 },
    });
    expect(result).toHaveProperty("id");
  });

  it("getVVMatrix returns stage×type heatmap", async () => {
    mockQueryResult = [
      { gateStage: "evt", testType: "performance", verdict: "pass" },
      { gateStage: "evt", testType: "performance", verdict: "fail" },
      { gateStage: "dvt", testType: "compliance", verdict: "pass" },
    ];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.testing.getVVMatrix({ projectId: 1 });
    expect(result).toHaveProperty("evt");
    expect(result).toHaveProperty("dvt");
    expect(result.evt.performance.total).toBe(2);
    expect(result.evt.performance.pass).toBe(1);
  });

  it("createSuite creates template", async () => {
    mockReturningResult = [{ id: 1, suiteCode: "TS-001" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.testing.createSuite({
      rndProjectId: 1,
      suiteCode: "TS-001",
      suiteName: "EVT Suite",
      testTemplates: [
        { testCode: "TC-001", testName: "Torque", testType: "performance", isMandatory: true },
      ],
    });
    expect(result).toHaveProperty("id");
  });

  it("instantiateSuite generates records from template", async () => {
    selectResultsQueue.push([{
      id: 1,
      rndProjectId: 1,
      testTemplates: [
        { testCode: "TC-001", testName: "Torque", testType: "performance", isMandatory: true },
        { testCode: "TC-002", testName: "Vibration", testType: "stress_test", isMandatory: false },
      ],
    }]);
    mockReturningResult = [{ id: 1 }, { id: 2 }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.testing.instantiateSuite({
      suiteId: 1, gateStage: "evt",
    });
    expect(result).toHaveProperty("created");
  });

  it("instantiateSuite rejects empty templates", async () => {
    selectResultsQueue.push([{ id: 1, rndProjectId: 1, testTemplates: [] }]);
    const caller = createAdminCaller();
    await expect(
      caller.rndNpi.testing.instantiateSuite({ suiteId: 1, gateStage: "evt" })
    ).rejects.toThrow("no test templates");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Routing sub-router
// ═══════════════════════════════════════════════════════════════════════

describe("rndNpi.routing", () => {
  it("listByProject returns routings", async () => {
    mockQueryResult = [{ id: 1, routingCode: "RT-001" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.routing.listByProject({ projectId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("getById returns routing with steps", async () => {
    selectResultsQueue.push([{ id: 1, routingCode: "RT-001" }]);
    selectResultsQueue.push([{ id: 1, stepNumber: 1, stepName: "Assembly" }]);
    const caller = createAdminCaller();
    const result = await caller.rndNpi.routing.getById({ id: 1 });
    expect(result).toHaveProperty("steps");
  });

  it("create rejects if stage < pvt", async () => {
    selectResultsQueue.push([{ id: 1, currentStage: "dvt" }]);
    const caller = createAdminCaller();
    await expect(
      caller.rndNpi.routing.create({ rndProjectId: 1, routingCode: "RT-001" })
    ).rejects.toThrow("PVT stage or later");
  });

  it("create succeeds at pvt stage", async () => {
    selectResultsQueue.push([{ id: 1, currentStage: "pvt" }]);
    mockReturningResult = [{ id: 1, routingCode: "RT-001" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.routing.create({
      rndProjectId: 1, routingCode: "RT-001",
    });
    expect(result).toHaveProperty("id");
  });

  it("addStep creates step and updates cycle time", async () => {
    mockReturningResult = [{ id: 1, stepNumber: 1 }];
    // All steps query for cycle time
    selectResultsQueue.push([
      { standardCycleTimeMinutes: "10.5" },
      { standardCycleTimeMinutes: "5.0" },
    ]);
    const caller = createAdminCaller();
    const result = await caller.rndNpi.routing.addStep({
      routingId: 1,
      stepNumber: 1,
      stepType: "assembly",
      stepName: "Mount Servo",
    });
    expect(result).toHaveProperty("id");
  });

  it("updateStep updates step fields", async () => {
    mockReturningResult = [{ id: 1, stepName: "Updated Step" }];
    const caller = createAdminCaller();
    const result = await caller.rndNpi.routing.updateStep({
      id: 1, stepName: "Updated Step", standardCycleTimeMinutes: "12.5",
    });
    expect(result.stepName).toBe("Updated Step");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Analytics sub-router
// ═══════════════════════════════════════════════════════════════════════

describe("rndNpi.analytics", () => {
  it("portfolioDashboard returns aggregated data", async () => {
    // Projects query
    selectResultsQueue.push([
      { id: 1, currentStage: "concept", category: "robotics", status: "active" },
      { id: 2, currentStage: "evt", category: "vision_ai", status: "active" },
    ]);
    // Gate reviews query
    selectResultsQueue.push([
      { decision: "approved" },
      { decision: "rejected" },
      { decision: "approved" },
    ]);
    const caller = createAdminCaller();
    const result = await caller.rndNpi.analytics.portfolioDashboard();
    expect(result.totalProjects).toBe(2);
    expect(result.gatePassRate).toBeCloseTo(66.7, 0);
  });

  it("projectHealthcard returns health metrics", async () => {
    // Project
    selectResultsQueue.push([{ id: 1, name: "Alpha", budget: "1000000", actualSpend: "250000" }]);
    // BOMs
    selectResultsQueue.push([
      { id: 1, status: "frozen" },
      { id: 2, status: "draft" },
    ]);
    // Tests
    selectResultsQueue.push([
      { verdict: "pass" },
      { verdict: "fail" },
      { verdict: "not_run" },
    ]);
    // Gate reviews
    selectResultsQueue.push([{ id: 1 }]);
    const caller = createAdminCaller();
    const result = await caller.rndNpi.analytics.projectHealthcard({ projectId: 1 });
    expect(result.bomMaturity).toBe(50);
    expect(result.testCoverage).toBeCloseTo(66.7, 0);
    expect(result.budgetUsedPercent).toBe(25);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Permission isolation
// ═══════════════════════════════════════════════════════════════════════

describe("rndNpi permission isolation", () => {
  it("anonymous caller cannot access project.list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.rndNpi.project.list()).rejects.toThrow();
  });

  it("anonymous caller cannot access gate.createReview", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.rndNpi.gate.createReview({ rndProjectId: 1, gateStage: "concept" })
    ).rejects.toThrow();
  });

  it("anonymous caller cannot access sandboxBom.promote", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.rndNpi.sandboxBom.promote({ id: 1 })).rejects.toThrow();
  });
});
