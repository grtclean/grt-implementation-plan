/**
 * PDM Router — Unit Tests
 * 8 sub-routers, ~55 procedures
 *
 * Run: pnpm test -- server/routers/pdm.router.test.ts
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
  chain.groupBy = vi.fn(() => chain);
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
  requireDb: vi.fn(async () => ({
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
  })),
}));

// ─── Mock PDM schema ─────────────────────────────────────────────────
vi.mock("../../drizzle/pdm-schema", () => ({
  pdmProducts: {
    id: "id", productCode: "productCode", productName: "productName",
    productFamily: "productFamily", productCategory: "productCategory",
    description: "description", stationCount: "stationCount",
    lifecycleStatus: "lifecycleStatus", defaultProjectId: "defaultProjectId",
    latestBaselineId: "latestBaselineId", buCode: "buCode",
    maturityLevel: "maturityLevel", totalProjectsBuilt: "totalProjectsBuilt",
    standards: "standards", customerSegments: "customerSegments",
    createdBy: "createdBy", updatedBy: "updatedBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  pdmBaselines: {
    id: "id", productId: "productId", projectId: "projectId",
    gateStage: "gateStage", baselineName: "baselineName",
    bomMasterId: "bomMasterId", bomVersion: "bomVersion",
    plmDocumentIds: "plmDocumentIds", plcProjectId: "plcProjectId",
    plcVersionTag: "plcVersionTag", stationSnapshot: "stationSnapshot",
    status: "status", previousBaselineId: "previousBaselineId",
    approvedBy: "approvedBy", approvedAt: "approvedAt", notes: "notes",
    createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  pdmEcoWorkflow: {
    id: "id", ecoId: "ecoId", stepType: "stepType", stepOrder: "stepOrder",
    status: "status", assigneeId: "assigneeId", assigneeName: "assigneeName",
    impactedBomIds: "impactedBomIds", impactedDocIds: "impactedDocIds",
    impactedStationIds: "impactedStationIds", costImpact: "costImpact",
    productionImpact: "productionImpact", fieldRetrofitNeeded: "fieldRetrofitNeeded",
    decision: "decision", decisionNotes: "decisionNotes",
    completedAt: "completedAt", completedBy: "completedBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  pdmRequirements: {
    id: "id", projectId: "projectId", productId: "productId",
    requirementCode: "requirementCode", title: "title", description: "description",
    category: "category", sourceType: "sourceType", sourceReference: "sourceReference",
    priority: "priority", designStationIds: "designStationIds",
    bomItemIds: "bomItemIds", verificationMethod: "verificationMethod",
    verificationItemIds: "verificationItemIds",
    verificationStatus: "verificationStatus", verificationNotes: "verificationNotes",
    createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  pdmReadinessChecks: {
    id: "id", projectId: "projectId", productId: "productId",
    checkType: "checkType", status: "status", autoValidated: "autoValidated",
    validationDetails: "validationDetails", waiverApprovedBy: "waiverApprovedBy",
    waiverReason: "waiverReason", waivedAt: "waivedAt", checkedAt: "checkedAt",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  pdmAsBuiltDeviations: {
    id: "id", projectId: "projectId", productId: "productId",
    baselineId: "baselineId", stationCode: "stationCode",
    deviationType: "deviationType", severity: "severity",
    componentCode: "componentCode", componentName: "componentName",
    designedValue: "designedValue", actualValue: "actualValue",
    reason: "reason", approvalStatus: "approvalStatus",
    approvedBy: "approvedBy", approvedAt: "approvedAt",
    ecoId: "ecoId", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  pdmFieldInsights: {
    id: "id", productId: "productId", projectId: "projectId",
    insightType: "insightType", title: "title", description: "description",
    affectedStationTypes: "affectedStationTypes",
    sourceServiceLogIds: "sourceServiceLogIds",
    occurrenceCount: "occurrenceCount", severityScore: "severityScore",
    suggestedEcoId: "suggestedEcoId", status: "status",
    resolvedAt: "resolvedAt", resolvedBy: "resolvedBy",
    createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
}));

vi.mock("../../drizzle/schema", () => ({
  changeEvents: {
    id: "id", projectId: "projectId", type: "type", title: "title",
    description: "description", sourceChangeId: "sourceChangeId",
    status: "status", affectedItems: "affectedItems",
    createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
}));

// ─── Mock services ───────────────────────────────────────────────────
vi.mock("../services/pdm.service", () => ({
  captureBaseline: vi.fn(async () => ({
    baselineId: 1,
    snapshot: {
      bomMasterId: 10,
      bomVersion: "V2.1",
      plmDocumentIds: [1, 2, 3],
      plcProjectId: 5,
      plcVersionTag: "V1.0.0",
      stationSnapshot: [{ stationCode: "ST01", stationName: "清洗", stationType: "ultrasonic" }],
    },
  })),
  runReadinessChecks: vi.fn(async () => [
    { checkType: "bom_approved", passed: true, details: "BOM已审批" },
    { checkType: "plm_released", passed: true, details: "PLM文档已发布" },
    { checkType: "plc_promoted", passed: false, details: "未找到已批准PLC版本" },
    { checkType: "eplan_exported", passed: true, details: "EPLAN已导出" },
    { checkType: "standards_validated", passed: true, details: "标准验证通过" },
    { checkType: "fmea_completed", passed: true, details: "FMEA已完成" },
    { checkType: "conflict_free", passed: true, details: "无设计冲突" },
  ]),
  detectFieldInsights: vi.fn(async () => ({ newInsights: 0, totalInsights: 5 })),
}));

vi.mock("../modules/changeEvent.service", () => ({
  createChangeEvent: vi.fn(async (input: any) => ({
    event: { id: 100, ...input },
    downstreamEvent: null,
  })),
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

// ─── Import AFTER mocks ─────────────────────────────────────────────
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Reset ──────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue = [];
  returningQueue = [];
});

// ═════════════════════════════════════════════════════════════════════
// Auth guards
// ═════════════════════════════════════════════════════════════════════

describe("pdm auth guards", () => {
  it("product.list requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.pdm.product.list()).rejects.toThrow();
  });

  it("product.create requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.pdm.product.create({
        productCode: "TST-01",
        productName: "Test",
        productFamily: "USC",
      })
    ).rejects.toThrow();
  });

  it("eco.submitEcr requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.pdm.eco.submitEcr({ projectId: 1, title: "Test ECR" })
    ).rejects.toThrow();
  });

  it("eco.approveEco requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.pdm.eco.approveEco({ ecoId: 1, approved: true })
    ).rejects.toThrow();
  });

  it("asBuilt.create requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.pdm.asBuilt.create({
        projectId: 1,
        deviationType: "material_substitution",
      })
    ).rejects.toThrow();
  });

  it("fieldInsight.create requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.pdm.fieldInsight.create({
        productId: 1,
        insightType: "recurring_failure",
        title: "Test",
      })
    ).rejects.toThrow();
  });

  it("readiness.overrideCheck requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.pdm.readiness.overrideCheck({ id: 1, waiverReason: "Test" })
    ).rejects.toThrow();
  });

  it("dashboard.getOverview requires authentication", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.pdm.dashboard.getOverview()).rejects.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 1. Product sub-router
// ═════════════════════════════════════════════════════════════════════

describe("pdm.product", () => {
  it("list returns items and total", async () => {
    selectResultsQueue.push([{ count: 2 }]);
    mockQueryResult = [
      { id: 1, productCode: "USC-15-A", productName: "15工位超声波清洗机" },
    ];
    const caller = createAdminCaller();
    const result = await caller.pdm.product.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total", 2);
  });

  it("list accepts family filter", async () => {
    selectResultsQueue.push([{ count: 1 }]);
    mockQueryResult = [{ id: 1, productFamily: "USC" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.product.list({ family: "USC" });
    expect(result.total).toBe(1);
  });

  it("getById returns product", async () => {
    mockQueryResult = [{ id: 1, productCode: "USC-15-A" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.product.getById({ id: 1 });
    expect(result.productCode).toBe("USC-15-A");
  });

  it("getById throws NOT_FOUND", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    await expect(caller.pdm.product.getById({ id: 999 })).rejects.toThrow("Product not found");
  });

  it("create inserts product", async () => {
    mockReturningResult = [{ id: 1, productCode: "NEW-01", productFamily: "SPR" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.product.create({
      productCode: "NEW-01",
      productName: "New Product",
      productFamily: "SPR",
    });
    expect(result.productCode).toBe("NEW-01");
  });

  it("getStats returns aggregates", async () => {
    selectResultsQueue.push([{ count: 3 }]);
    selectResultsQueue.push([{ family: "USC", count: 2 }]);
    mockQueryResult = [{ status: "production", count: 1 }];
    const caller = createAdminCaller();
    const result = await caller.pdm.product.getStats();
    expect(result).toHaveProperty("total", 3);
    expect(result).toHaveProperty("byFamily");
    expect(result).toHaveProperty("byStatus");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. Baseline sub-router
// ═════════════════════════════════════════════════════════════════════

describe("pdm.baseline", () => {
  it("list returns baselines", async () => {
    selectResultsQueue.push([{ count: 2 }]);
    mockQueryResult = [{ id: 1, gateStage: "M5" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.baseline.list({ productId: 1 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total", 2);
  });

  it("getById returns baseline", async () => {
    mockQueryResult = [{ id: 1, gateStage: "M5", bomVersion: "V2.1" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.baseline.getById({ id: 1 });
    expect(result.gateStage).toBe("M5");
  });

  it("create calls captureBaseline service", async () => {
    const caller = createAdminCaller();
    const result = await caller.pdm.baseline.create({
      productId: 1,
      projectId: 1,
      gateStage: "M5",
      baselineName: "M5 Design Freeze",
    });
    expect(result).toHaveProperty("baselineId", 1);
    expect(result).toHaveProperty("snapshot");
  });

  it("compare returns diff", async () => {
    selectResultsQueue.push([{ id: 1, bomVersion: "V2.1", plcVersionTag: "V1.0", stationSnapshot: [], plmDocumentIds: [1, 2] }]);
    mockQueryResult = [{ id: 2, bomVersion: "V2.3", plcVersionTag: "V1.1", stationSnapshot: [{}], plmDocumentIds: [1, 2, 3] }];
    const caller = createAdminCaller();
    const result = await caller.pdm.baseline.compare({ baselineIdA: 1, baselineIdB: 2 });
    expect(result).toHaveProperty("diff");
    expect(result.diff.bomVersionChanged).toBe(true);
  });

  it("getHistory returns ordered baselines", async () => {
    mockQueryResult = [{ id: 2, gateStage: "M8" }, { id: 1, gateStage: "M5" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.baseline.getHistory({ productId: 1 });
    expect(result).toHaveLength(2);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. ECO sub-router
// ═════════════════════════════════════════════════════════════════════

describe("pdm.eco", () => {
  it("submitEcr creates change event and 7 steps", async () => {
    const caller = createAdminCaller();
    const result = await caller.pdm.eco.submitEcr({
      projectId: 1,
      title: "Replace pump model",
    });
    expect(result).toHaveProperty("ecoId", 100);
    expect(result).toHaveProperty("stepsCreated", 7);
  });

  it("getWorkflow returns steps ordered", async () => {
    mockQueryResult = [
      { id: 1, stepType: "ecr_submit", stepOrder: 1, status: "completed" },
      { id: 2, stepType: "impact_analysis", stepOrder: 2, status: "in_progress" },
    ];
    const caller = createAdminCaller();
    const result = await caller.pdm.eco.getWorkflow({ ecoId: 100 });
    expect(result).toHaveLength(2);
    expect(result[0].stepType).toBe("ecr_submit");
  });

  it("advanceStep completes current and advances next", async () => {
    // Current step
    selectResultsQueue.push([{ id: 1, ecoId: 100, stepType: "ecr_submit", stepOrder: 1 }]);
    // Next step
    selectResultsQueue.push([{ id: 2, ecoId: 100, stepType: "impact_analysis", stepOrder: 2 }]);
    const caller = createAdminCaller();
    const result = await caller.pdm.eco.advanceStep({ stepId: 1 });
    expect(result).toHaveProperty("completed", "ecr_submit");
    expect(result).toHaveProperty("next", "impact_analysis");
  });

  it("advanceStep handles last step (no next)", async () => {
    selectResultsQueue.push([{ id: 7, ecoId: 100, stepType: "close", stepOrder: 7 }]);
    mockQueryResult = []; // no next step
    const caller = createAdminCaller();
    const result = await caller.pdm.eco.advanceStep({ stepId: 7 });
    expect(result.next).toBeNull();
  });

  it("approveEco triggers cascade on approval", async () => {
    selectResultsQueue.push([{ id: 4, ecoId: 100, stepType: "approval" }]);
    const caller = createAdminCaller();
    const result = await caller.pdm.eco.approveEco({ ecoId: 100, approved: true });
    expect(result.approved).toBe(true);
  });

  it("approveEco handles rejection", async () => {
    selectResultsQueue.push([{ id: 4, ecoId: 100, stepType: "approval" }]);
    const caller = createAdminCaller();
    const result = await caller.pdm.eco.approveEco({ ecoId: 100, approved: false, notes: "Not justified" });
    expect(result.approved).toBe(false);
  });

  it("listPendingApprovals returns pending approval steps", async () => {
    mockQueryResult = [{ id: 4, ecoId: 100, stepType: "approval", status: "in_progress" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.eco.listPendingApprovals();
    expect(result).toHaveLength(1);
  });

  it("getStats returns ECO statistics", async () => {
    selectResultsQueue.push([{ count: 21 }]);
    mockQueryResult = [{ status: "completed", count: 14 }, { status: "pending", count: 7 }];
    const caller = createAdminCaller();
    const result = await caller.pdm.eco.getStats();
    expect(result).toHaveProperty("totalSteps", 21);
    expect(result).toHaveProperty("byStatus");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. Requirement sub-router
// ═════════════════════════════════════════════════════════════════════

describe("pdm.requirement", () => {
  it("list returns requirements", async () => {
    selectResultsQueue.push([{ count: 5 }]);
    mockQueryResult = [{ id: 1, requirementCode: "REQ-001", title: "清洗洁净度" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.requirement.list({ projectId: 1 });
    expect(result).toHaveProperty("total", 5);
  });

  it("create inserts requirement", async () => {
    mockReturningResult = [{ id: 1, requirementCode: "REQ-NEW", category: "safety" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.requirement.create({
      projectId: 1,
      requirementCode: "REQ-NEW",
      title: "Safety Test",
      category: "safety",
    });
    expect(result.category).toBe("safety");
  });

  it("getMatrix returns traceability matrix", async () => {
    mockQueryResult = [
      { id: 1, requirementCode: "REQ-001", title: "Test", category: "functional",
        designStationIds: [1, 2], bomItemIds: [10], verificationItemIds: [100],
        verificationStatus: "passed" },
      { id: 2, requirementCode: "REQ-002", title: "Test2", category: "safety",
        designStationIds: null, bomItemIds: null, verificationItemIds: null,
        verificationStatus: "not_started" },
    ];
    const caller = createAdminCaller();
    const result = await caller.pdm.requirement.getMatrix({ projectId: 1 });
    expect(result).toHaveLength(2);
    expect(result[0].hasDesignLink).toBe(true);
    expect(result[1].hasDesignLink).toBe(false);
  });

  it("getCoverage returns coverage percentages", async () => {
    mockQueryResult = [
      { designStationIds: [1], verificationItemIds: [10], verificationStatus: "passed" },
      { designStationIds: null, verificationItemIds: null, verificationStatus: "not_started" },
    ];
    const caller = createAdminCaller();
    const result = await caller.pdm.requirement.getCoverage({ projectId: 1 });
    expect(result).toHaveProperty("total", 2);
    expect(result).toHaveProperty("designCoverage", 50);
    expect(result).toHaveProperty("passRate", 50);
  });

  it("linkDesign updates station and BOM links", async () => {
    mockReturningResult = [{ id: 1, designStationIds: [1, 2], bomItemIds: [10] }];
    const caller = createAdminCaller();
    const result = await caller.pdm.requirement.linkDesign({
      id: 1, designStationIds: [1, 2], bomItemIds: [10],
    });
    expect(result.designStationIds).toEqual([1, 2]);
  });

  it("linkVerification updates verification item IDs", async () => {
    mockReturningResult = [{ id: 1, verificationItemIds: [100, 101] }];
    const caller = createAdminCaller();
    const result = await caller.pdm.requirement.linkVerification({
      id: 1, verificationItemIds: [100, 101],
    });
    expect(result.verificationItemIds).toEqual([100, 101]);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. Readiness sub-router
// ═════════════════════════════════════════════════════════════════════

describe("pdm.readiness", () => {
  it("runChecks returns 7 checks with score", async () => {
    const caller = createAdminCaller();
    const result = await caller.pdm.readiness.runChecks({ projectId: 1 });
    expect(result.results).toHaveLength(7);
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("allPassed");
    // One check failed (plc_promoted), so allPassed should be false
    expect(result.allPassed).toBe(false);
  });

  it("getChecks returns persisted checks", async () => {
    mockQueryResult = [
      { id: 1, checkType: "bom_approved", status: "passed" },
      { id: 2, checkType: "plm_released", status: "passed" },
    ];
    const caller = createAdminCaller();
    const result = await caller.pdm.readiness.getChecks({ projectId: 1 });
    expect(result).toHaveLength(2);
  });

  it("overrideCheck waives a check", async () => {
    mockReturningResult = [{ id: 1, status: "waived", waiverReason: "Approved by CTO" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.readiness.overrideCheck({
      id: 1, waiverReason: "Approved by CTO",
    });
    expect(result.status).toBe("waived");
  });

  it("getReadinessScore calculates score", async () => {
    mockQueryResult = [
      { status: "passed" }, { status: "passed" }, { status: "passed" },
      { status: "failed" }, { status: "waived" }, { status: "not_checked" },
      { status: "passed" },
    ];
    const caller = createAdminCaller();
    const result = await caller.pdm.readiness.getReadinessScore({ projectId: 1 });
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("total", 7);
    expect(result.passed).toBe(5); // 4 passed + 1 waived
  });
});

// ═════════════════════════════════════════════════════════════════════
// 6. As-Built Deviation sub-router
// ═════════════════════════════════════════════════════════════════════

describe("pdm.asBuilt", () => {
  it("list returns deviations", async () => {
    selectResultsQueue.push([{ count: 3 }]);
    mockQueryResult = [{ id: 1, deviationType: "material_substitution" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.asBuilt.list({ projectId: 1 });
    expect(result).toHaveProperty("total", 3);
  });

  it("create inserts deviation", async () => {
    mockReturningResult = [{ id: 1, deviationType: "material_substitution", severity: "minor" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.asBuilt.create({
      projectId: 1,
      deviationType: "material_substitution",
      severity: "minor",
      designedValue: "Q235 Steel",
      actualValue: "Q345 Steel",
    });
    expect(result.deviationType).toBe("material_substitution");
  });

  it("approve updates approval status", async () => {
    mockReturningResult = [{ id: 1, approvalStatus: "approved" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.asBuilt.approve({ id: 1, approved: true });
    expect(result.approvalStatus).toBe("approved");
  });

  it("compareToBaseline returns deviation summary", async () => {
    mockQueryResult = [
      { id: 1, severity: "critical", approvalStatus: "pending" },
      { id: 2, severity: "minor", approvalStatus: "approved" },
      { id: 3, severity: "major", approvalStatus: "pending" },
    ];
    const caller = createAdminCaller();
    const result = await caller.pdm.asBuilt.compareToBaseline({ projectId: 1, baselineId: 1 });
    expect(result.summary.total).toBe(3);
    expect(result.summary.critical).toBe(1);
    expect(result.summary.major).toBe(1);
    expect(result.summary.minor).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 7. Field Insight sub-router
// ═════════════════════════════════════════════════════════════════════

describe("pdm.fieldInsight", () => {
  it("list returns insights", async () => {
    selectResultsQueue.push([{ count: 5 }]);
    mockQueryResult = [{ id: 1, insightType: "recurring_failure", severityScore: 8 }];
    const caller = createAdminCaller();
    const result = await caller.pdm.fieldInsight.list({ productId: 1 });
    expect(result).toHaveProperty("total", 5);
  });

  it("create inserts insight", async () => {
    mockReturningResult = [{ id: 1, insightType: "design_weakness", title: "Pump seal leak" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.fieldInsight.create({
      productId: 1,
      insightType: "design_weakness",
      title: "Pump seal leak",
      severityScore: 7,
      occurrenceCount: 5,
    });
    expect(result.title).toBe("Pump seal leak");
  });

  it("autoDetect calls detectFieldInsights service", async () => {
    const caller = createAdminCaller();
    const result = await caller.pdm.fieldInsight.autoDetect({ productId: 1 });
    expect(result).toHaveProperty("totalInsights", 5);
  });

  it("createEcoFromInsight creates ECO from insight", async () => {
    selectResultsQueue.push([{ id: 1, title: "Pump seal leak", description: "Frequent failures" }]);
    const caller = createAdminCaller();
    const result = await caller.pdm.fieldInsight.createEcoFromInsight({
      insightId: 1,
      projectId: 1,
    });
    expect(result).toHaveProperty("ecoId", 100);
    expect(result).toHaveProperty("insightId", 1);
  });

  it("resolve marks insight as resolved", async () => {
    mockReturningResult = [{ id: 1, status: "resolved" }];
    const caller = createAdminCaller();
    const result = await caller.pdm.fieldInsight.resolve({ id: 1 });
    expect(result.status).toBe("resolved");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 8. Dashboard sub-router
// ═════════════════════════════════════════════════════════════════════

describe("pdm.dashboard", () => {
  it("getOverview returns all counts", async () => {
    selectResultsQueue.push([{ count: 3 }]);  // products
    selectResultsQueue.push([{ count: 5 }]);  // baselines
    selectResultsQueue.push([{ count: 21 }]); // eco steps
    selectResultsQueue.push([{ count: 15 }]); // requirements
    selectResultsQueue.push([{ count: 4 }]);  // deviations
    selectResultsQueue.push([{ count: 8 }]);  // insights
    mockQueryResult = [{ status: "production", count: 2 }];
    const caller = createAdminCaller();
    const result = await caller.pdm.dashboard.getOverview();
    expect(result).toHaveProperty("products", 3);
    expect(result).toHaveProperty("baselines", 5);
    expect(result).toHaveProperty("requirements", 15);
  });

  it("getProductHealth returns health metrics", async () => {
    selectResultsQueue.push([{ id: 1, productCode: "USC-15-A", maturityLevel: 85 }]);
    selectResultsQueue.push([{ count: 2 }]);
    selectResultsQueue.push([{ count: 1 }]);
    mockQueryResult = [{ count: 3 }];
    const caller = createAdminCaller();
    const result = await caller.pdm.dashboard.getProductHealth({ productId: 1 });
    expect(result).toHaveProperty("product");
    expect(result).toHaveProperty("baselines", 2);
    expect(result).toHaveProperty("maturityLevel", 85);
  });

  it("getTraceabilityGaps identifies gaps", async () => {
    mockQueryResult = [
      { designStationIds: [1], verificationItemIds: null, verificationStatus: "not_started" },
      { designStationIds: null, verificationItemIds: [10], verificationStatus: "passed" },
      { designStationIds: [2], verificationItemIds: [20], verificationStatus: "failed" },
    ];
    const caller = createAdminCaller();
    const result = await caller.pdm.dashboard.getTraceabilityGaps({ projectId: 1 });
    expect(result).toHaveProperty("total", 3);
    expect(result.noDesignLink).toBe(1);
    expect(result.noVerification).toBe(1);
    expect(result.failedVerification).toBe(1);
  });

  it("getReadinessSummary returns aggregated checks", async () => {
    mockQueryResult = [
      { checkType: "bom_approved", status: "passed", count: 5 },
      { checkType: "plc_promoted", status: "failed", count: 2 },
    ];
    const caller = createAdminCaller();
    const result = await caller.pdm.dashboard.getReadinessSummary();
    expect(result).toHaveLength(2);
  });

  it("getFieldFeedbackTrend returns trend data", async () => {
    selectResultsQueue.push([{ insightType: "recurring_failure", count: 10 }]);
    mockQueryResult = [{ status: "open", count: 5 }, { status: "resolved", count: 3 }];
    const caller = createAdminCaller();
    const result = await caller.pdm.dashboard.getFieldFeedbackTrend();
    expect(result).toHaveProperty("byType");
    expect(result).toHaveProperty("byStatus");
  });

  it("getEcoTimeline returns completed steps", async () => {
    mockQueryResult = [
      { id: 1, stepType: "close", status: "completed", completedAt: "2026-03-01" },
    ];
    const caller = createAdminCaller();
    const result = await caller.pdm.dashboard.getEcoTimeline();
    expect(result).toHaveLength(1);
  });
});
