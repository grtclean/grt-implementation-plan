/**
 * Mechanical Configuration Standards Router — Unit Tests
 * 机械配置标准治理平台 — 10 sub-routers, ~45 procedures
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────

let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDbChain() {
  const chain: any = {};
  for (const m of ["from", "where", "and", "orderBy", "groupBy", "limit", "offset", "values", "set"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); } catch (e) { if (reject) return reject(e); throw e; }
  };
  return chain;
}

const mockDb: any = {
  select: vi.fn(() => createMockDbChain()),
  insert: vi.fn(() => createMockDbChain()),
  update: vi.fn(() => createMockDbChain()),
  delete: vi.fn(() => createMockDbChain()),
};

// ── Mock tRPC ───────────────────────────────────────────

vi.mock("../_core/trpc", () => {
  const passthrough: any = {
    input: vi.fn().mockReturnThis(),
    query: vi.fn((fn: any) => fn),
    mutation: vi.fn((fn: any) => fn),
    use: vi.fn().mockReturnThis(),
  };
  return {
    router: vi.fn((routes: any) => routes),
    protectedProcedure: passthrough,
    requirePermission: vi.fn(() => passthrough),
  };
});

vi.mock("../../drizzle/mechanical-config-schema", () => ({
  mechanicalStandards: { id: "id", code: "code", origin: "origin", category: "category", title: "title", status: "status" },
  mechCustomerConfigs: { id: "id", customerName: "customer_name", region: "region", isActive: "is_active", buCode: "bu_code" },
  mechConfigLineItems: { id: "id", configId: "config_id", category: "category", sortOrder: "sort_order" },
  mechStandardLinks: { id: "id", sourceId: "source_id", targetId: "target_id", linkType: "link_type" },
  mechProjectSelections: { id: "id", projectCode: "project_code", customerConfigId: "customer_config_id", lockedAt: "locked_at", createdAt: "created_at" },
  mechQuotationChecks: { id: "id", projectCode: "project_code", quotationNumber: "quotation_number", complianceStatus: "compliance_status", category: "category" },
  mechPhaseChecklists: { id: "id", projectCode: "project_code", phase: "phase", status: "status" },
  mechAcceptanceRecords: { id: "id", projectCode: "project_code", acceptancePhase: "acceptance_phase", result: "result", category: "category" },
  mechReviewRules: { id: "id", phase: "phase", origin: "origin", ruleCode: "rule_code", isActive: "is_active" },
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  ilike: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({ strings, values })), {
    raw: vi.fn((s: string) => s),
  }),
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

// ── Import router after mocks ───────────────────────────

import { mechanicalConfigRouter } from "./mechanical-config.router";

function makeCtx(user = { id: 1, name: "CTO", role: "admin" }) {
  return { ctx: { db: mockDb, user } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue.length = 0;
});

// ═══════════════════════════════════════════════════════
// ── 1. Standards Library ──────────────────────────────
// ═══════════════════════════════════════════════════════

describe("standards.list", () => {
  it("returns all standards", async () => {
    selectResultsQueue.push([{ id: 1, code: "GRT-MS-001" }, { id: 2, code: "ISO 2768-mK" }]);
    const result = await mechanicalConfigRouter.standards.list({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });

  it("filters by origin", async () => {
    selectResultsQueue.push([{ id: 1, code: "GRT-MS-001", origin: "GRT_INTERNAL" }]);
    const result = await mechanicalConfigRouter.standards.list({ input: { origin: "GRT_INTERNAL" }, ...makeCtx() });
    expect(result).toHaveLength(1);
  });
});

describe("standards.getById", () => {
  it("returns a single standard", async () => {
    selectResultsQueue.push([{ id: 1, code: "GRT-MS-001" }]);
    const result = await mechanicalConfigRouter.standards.getById({ input: { id: 1 }, ...makeCtx() });
    expect(result?.code).toBe("GRT-MS-001");
  });

  it("returns null for non-existent", async () => {
    selectResultsQueue.push([]);
    const result = await mechanicalConfigRouter.standards.getById({ input: { id: 999 }, ...makeCtx() });
    expect(result).toBeNull();
  });
});

describe("standards.create", () => {
  it("creates a new standard", async () => {
    mockReturningResult = [{ id: 5, code: "GRT-MS-006", origin: "GRT_INTERNAL" }];
    const result = await mechanicalConfigRouter.standards.create({
      input: { code: "GRT-MS-006", origin: "GRT_INTERNAL", category: "structural_frame", title: "Test Standard", version: "1.0" },
      ...makeCtx(),
    });
    expect(result.code).toBe("GRT-MS-006");
  });
});

describe("standards.statsByOrigin", () => {
  it("returns grouped counts", async () => {
    selectResultsQueue.push([{ origin: "GRT_INTERNAL", count: 5 }, { origin: "ISO", count: 3 }]);
    const result = await mechanicalConfigRouter.standards.statsByOrigin({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("standards.statsByCategory", () => {
  it("returns grouped counts by category", async () => {
    selectResultsQueue.push([{ category: "structural_frame", count: 4 }]);
    const result = await mechanicalConfigRouter.standards.statsByCategory({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════
// ── 2. Customer Configs ──────────────────────────────
// ═══════════════════════════════════════════════════════

describe("customerConfig.list", () => {
  it("returns active configs", async () => {
    selectResultsQueue.push([{ id: 1, customerName: "BMW" }, { id: 2, customerName: "SVW" }]);
    const result = await mechanicalConfigRouter.customerConfig.list({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("customerConfig.create", () => {
  it("creates a customer config", async () => {
    mockReturningResult = [{ id: 10, customerName: "Tesla", region: "US" }];
    const result = await mechanicalConfigRouter.customerConfig.create({
      input: { customerName: "Tesla", region: "US" },
      ...makeCtx(),
    });
    expect(result.customerName).toBe("Tesla");
  });
});

// ═══════════════════════════════════════════════════════
// ── 3. Config Line Items ─────────────────────────────
// ═══════════════════════════════════════════════════════

describe("lineItem.listByConfig", () => {
  it("returns line items for a config", async () => {
    selectResultsQueue.push([{ id: 1, itemName: "设备底座" }, { id: 2, itemName: "安全围栏" }]);
    const result = await mechanicalConfigRouter.lineItem.listByConfig({ input: { configId: 1 }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("lineItem.create", () => {
  it("creates a line item", async () => {
    mockReturningResult = [{ id: 3, itemCode: "FRM-003", itemName: "调节脚杯" }];
    const result = await mechanicalConfigRouter.lineItem.create({
      input: { configId: 1, category: "structural_frame", itemCode: "FRM-003", itemName: "调节脚杯" },
      ...makeCtx(),
    });
    expect(result.itemCode).toBe("FRM-003");
  });
});

describe("lineItem.remove", () => {
  it("deletes a line item", async () => {
    const result = await mechanicalConfigRouter.lineItem.remove({ input: { id: 1 }, ...makeCtx() });
    expect(result.deleted).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// ── 4. Knowledge Graph ───────────────────────────────
// ═══════════════════════════════════════════════════════

describe("knowledgeGraph.getLinks", () => {
  it("returns outgoing and incoming links", async () => {
    selectResultsQueue.push([{ id: 1, sourceId: 1, targetId: 6, linkType: "references" }]); // outgoing
    selectResultsQueue.push([{ id: 5, sourceId: 9, targetId: 1, linkType: "derives_from" }]); // incoming
    const result = await mechanicalConfigRouter.knowledgeGraph.getLinks({ input: { standardId: 1 }, ...makeCtx() });
    expect(result.outgoing).toHaveLength(1);
    expect(result.incoming).toHaveLength(1);
  });
});

describe("knowledgeGraph.getFullGraph", () => {
  it("returns nodes and edges", async () => {
    selectResultsQueue.push([{ id: 1 }, { id: 2 }]); // links
    selectResultsQueue.push([{ id: 1, code: "GRT-MS-001" }, { id: 2, code: "ISO 2768-mK" }]); // nodes
    const result = await mechanicalConfigRouter.knowledgeGraph.getFullGraph({ input: undefined, ...makeCtx() });
    expect(result.edges).toHaveLength(2);
    expect(result.nodes).toHaveLength(2);
  });
});

describe("knowledgeGraph.createLink", () => {
  it("creates a knowledge graph link", async () => {
    mockReturningResult = [{ id: 10, sourceId: 1, targetId: 2, linkType: "references" }];
    const result = await mechanicalConfigRouter.knowledgeGraph.createLink({
      input: { sourceId: 1, targetId: 2, linkType: "references", strength: 80 },
      ...makeCtx(),
    });
    expect(result.linkType).toBe("references");
  });
});

describe("knowledgeGraph.removeLink", () => {
  it("removes a link", async () => {
    const result = await mechanicalConfigRouter.knowledgeGraph.removeLink({ input: { id: 1 }, ...makeCtx() });
    expect(result.deleted).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// ── 5. Project Selections ────────────────────────────
// ═══════════════════════════════════════════════════════

describe("projectSelection.getByProject", () => {
  it("returns selection for a project", async () => {
    selectResultsQueue.push([{ id: 1, projectCode: "GRT-312" }]);
    const result = await mechanicalConfigRouter.projectSelection.getByProject({ input: { projectCode: "GRT-312" }, ...makeCtx() });
    expect(result?.projectCode).toBe("GRT-312");
  });
});

describe("projectSelection.upsert", () => {
  it("creates new selection when none exists", async () => {
    selectResultsQueue.push([]); // existing check
    mockReturningResult = [{ id: 1, projectCode: "GRT-NEW" }];
    const result = await mechanicalConfigRouter.projectSelection.upsert({
      input: { projectCode: "GRT-NEW", projectName: "New Project" },
      ...makeCtx(),
    });
    expect(result.projectCode).toBe("GRT-NEW");
  });

  it("rejects update when locked", async () => {
    selectResultsQueue.push([{ id: 1, projectCode: "GRT-LOCKED", lockedAt: new Date() }]);
    await expect(mechanicalConfigRouter.projectSelection.upsert({
      input: { projectCode: "GRT-LOCKED" },
      ...makeCtx(),
    })).rejects.toThrow("locked");
  });
});

describe("projectSelection.lock", () => {
  it("locks project at M3", async () => {
    mockReturningResult = [{ id: 1, projectCode: "GRT-312", lockedAt: new Date() }];
    const result = await mechanicalConfigRouter.projectSelection.lock({ input: { projectCode: "GRT-312" }, ...makeCtx() });
    expect(result.lockedAt).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════
// ── 6. Quotation Compliance ──────────────────────────
// ═══════════════════════════════════════════════════════

describe("quotation.listByProject", () => {
  it("returns quotation checks", async () => {
    selectResultsQueue.push([{ id: 1, checkItem: "设备底座" }]);
    const result = await mechanicalConfigRouter.quotation.listByProject({ input: { projectCode: "GRT-312" }, ...makeCtx() });
    expect(result).toHaveLength(1);
  });
});

describe("quotation.generate", () => {
  it("generates checks from config line items", async () => {
    selectResultsQueue.push([
      { id: 1, itemName: "设备底座", category: "structural_frame", specification: "Q345B", standardId: null },
      { id: 2, itemName: "安全围栏", category: "safety_guarding", specification: "Troax", standardId: 7 },
    ]);
    const result = await mechanicalConfigRouter.quotation.generate({
      input: { projectCode: "GRT-NEW", quotationNumber: "QT-2026-001", customerConfigId: 1 },
      ...makeCtx(),
    });
    expect(result.generated).toBe(2);
  });
});

describe("quotation.summary", () => {
  it("returns status summary", async () => {
    selectResultsQueue.push([{ status: "PASS", count: 5 }, { status: "FAIL", count: 1 }]);
    const result = await mechanicalConfigRouter.quotation.summary({ input: { projectCode: "GRT-312" }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════
// ── 7. Phase Checklists ──────────────────────────────
// ═══════════════════════════════════════════════════════

describe("phaseChecklist.getByProjectPhase", () => {
  it("returns checklist items", async () => {
    selectResultsQueue.push([{ id: 1, checkItem: "焊接件尺寸检验" }, { id: 2, checkItem: "涂装质量检验" }]);
    const result = await mechanicalConfigRouter.phaseChecklist.getByProjectPhase({ input: { projectCode: "GRT-312", phase: "M5" }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("phaseChecklist.generate", () => {
  it("generates checklist from review rules", async () => {
    selectResultsQueue.push([{ id: 1, ruleCode: "M5-MECH-001", checklistTemplate: ["焊接件尺寸检验", "涂装质量检验", "装配精度检验"] }]);
    const result = await mechanicalConfigRouter.phaseChecklist.generate({ input: { projectCode: "GRT-312", phase: "M5" }, ...makeCtx() });
    expect(result.generated).toBe(3);
  });
});

describe("phaseChecklist.updateStatus", () => {
  it("updates check status", async () => {
    mockReturningResult = [{ id: 1, status: "PASS" }];
    const result = await mechanicalConfigRouter.phaseChecklist.updateStatus({ input: { id: 1, status: "PASS" }, ...makeCtx() });
    expect(result.status).toBe("PASS");
  });
});

describe("phaseChecklist.summary", () => {
  it("returns grouped summary", async () => {
    selectResultsQueue.push([{ phase: "M5", status: "PASS", count: 3 }, { phase: "M5", status: "FAIL", count: 1 }]);
    const result = await mechanicalConfigRouter.phaseChecklist.summary({ input: { projectCode: "GRT-312" }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════
// ── 8. Customer Acceptance ───────────────────────────
// ═══════════════════════════════════════════════════════

describe("acceptance.listByProject", () => {
  it("returns acceptance records", async () => {
    selectResultsQueue.push([{ id: 1, result: "ACCEPTED" }, { id: 2, result: "CONDITIONAL" }]);
    const result = await mechanicalConfigRouter.acceptance.listByProject({ input: { projectCode: "GRT-312" }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("acceptance.create", () => {
  it("creates an acceptance record", async () => {
    mockReturningResult = [{ id: 5, projectCode: "GRT-405", result: "PENDING" }];
    const result = await mechanicalConfigRouter.acceptance.create({
      input: { projectCode: "GRT-405", customerName: "Infineon", acceptancePhase: "FAT", checkItem: "洁净室颗粒计数", category: "sealing" },
      ...makeCtx(),
    });
    expect(result.projectCode).toBe("GRT-405");
  });
});

describe("acceptance.updateResult", () => {
  it("updates result with corrective action", async () => {
    mockReturningResult = [{ id: 1, result: "CONDITIONAL", correctiveAction: "Rework done" }];
    const result = await mechanicalConfigRouter.acceptance.updateResult({
      input: { id: 1, result: "CONDITIONAL", correctiveAction: "Rework done" },
      ...makeCtx(),
    });
    expect(result.result).toBe("CONDITIONAL");
  });
});

describe("acceptance.satisfactionSummary", () => {
  it("returns result breakdown and average score", async () => {
    selectResultsQueue.push([{ result: "ACCEPTED", count: 3 }, { result: "CONDITIONAL", count: 1 }]);
    selectResultsQueue.push([{ avg: 82.5 }]);
    const result = await mechanicalConfigRouter.acceptance.satisfactionSummary({ input: { projectCode: "GRT-312" }, ...makeCtx() });
    expect(result.byResult).toHaveLength(2);
    expect(result.averageScore).toBe(82.5);
  });
});

// ═══════════════════════════════════════════════════════
// ── 9. Review Rules ──────────────────────────────────
// ═══════════════════════════════════════════════════════

describe("reviewRule.list", () => {
  it("returns active rules", async () => {
    selectResultsQueue.push([{ id: 1, phase: "M0" }, { id: 2, phase: "M3" }]);
    const result = await mechanicalConfigRouter.reviewRule.list({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("reviewRule.create", () => {
  it("creates a review rule", async () => {
    mockReturningResult = [{ id: 5, phase: "M8", ruleCode: "M8-MECH-002" }];
    const result = await mechanicalConfigRouter.reviewRule.create({
      input: { phase: "M8", origin: "GRT_INTERNAL", ruleCode: "M8-MECH-002", title: "M8振动测试" },
      ...makeCtx(),
    });
    expect(result.ruleCode).toBe("M8-MECH-002");
  });
});

// ═══════════════════════════════════════════════════════
// ── 10. Dashboard ────────────────────────────────────
// ═══════════════════════════════════════════════════════

describe("dashboard.overview", () => {
  it("returns all summary counts", async () => {
    selectResultsQueue.push([{ count: 18 }]); // standards
    selectResultsQueue.push([{ count: 5 }]);  // customer configs
    selectResultsQueue.push([{ count: 3 }]);  // project selections
    selectResultsQueue.push([{ count: 2 }]);  // pending acceptance
    selectResultsQueue.push([{ count: 1 }]);  // rejected acceptance
    selectResultsQueue.push([{ count: 8 }]);  // knowledge links
    const result = await mechanicalConfigRouter.dashboard.overview({ input: undefined, ...makeCtx() });
    expect(result.activeStandardCount).toBe(18);
    expect(result.customerConfigCount).toBe(5);
    expect(result.knowledgeGraphEdges).toBe(8);
    expect(result.rejectedAcceptanceCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════
// ── Structure validation ─────────────────────────────
// ═══════════════════════════════════════════════════════

describe("router structure", () => {
  it("has all 10 sub-routers", () => {
    expect(mechanicalConfigRouter.standards).toBeDefined();
    expect(mechanicalConfigRouter.customerConfig).toBeDefined();
    expect(mechanicalConfigRouter.lineItem).toBeDefined();
    expect(mechanicalConfigRouter.knowledgeGraph).toBeDefined();
    expect(mechanicalConfigRouter.projectSelection).toBeDefined();
    expect(mechanicalConfigRouter.quotation).toBeDefined();
    expect(mechanicalConfigRouter.phaseChecklist).toBeDefined();
    expect(mechanicalConfigRouter.acceptance).toBeDefined();
    expect(mechanicalConfigRouter.reviewRule).toBeDefined();
    expect(mechanicalConfigRouter.dashboard).toBeDefined();
  });
});
