/**
 * Electrical Standards Governance Router — Unit Tests
 * 电气规范治理平台 — CE/UL/GB/SEMI/OEM
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

vi.mock("../../drizzle/electrical-standards-schema", () => ({
  electricalStandards: { id: "id", code: "code", framework: "framework", category: "category", title: "title", status: "status" },
  customerStandardProfiles: { id: "id", customerName: "customer_name", region: "region", baseFramework: "base_framework", isActive: "is_active", buCode: "bu_code" },
  projectStandardSelections: { id: "id", projectCode: "project_code", customerProfileId: "customer_profile_id", lockedAt: "locked_at", createdAt: "created_at" },
  complianceChecklistItems: { id: "id", projectCode: "project_code", standardId: "standard_id", checkPhase: "check_phase", status: "status" },
  electricalComplaints: { id: "id", complaintNumber: "complaint_number", customerName: "customer_name", severity: "severity", status: "status", category: "category", createdAt: "created_at" },
  electricalReviewRules: { id: "id", phase: "phase", framework: "framework", ruleCode: "rule_code", isActive: "is_active" },
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

import { electricalStandardsRouter } from "./electrical-standards.router";

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
// ── Standards Library ──────────────────────────────────
// ═══════════════════════════════════════════════════════

describe("standards.list", () => {
  it("returns all standards", async () => {
    selectResultsQueue.push([{ id: 1, code: "CE-LVD", framework: "CE" }, { id: 2, code: "UL508A", framework: "UL" }]);
    const result = await electricalStandardsRouter.standards.list({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });

  it("filters by framework", async () => {
    selectResultsQueue.push([{ id: 1, code: "CE-LVD", framework: "CE" }]);
    const result = await electricalStandardsRouter.standards.list({ input: { framework: "CE" }, ...makeCtx() });
    expect(result).toHaveLength(1);
  });
});

describe("standards.getById", () => {
  it("returns a single standard", async () => {
    selectResultsQueue.push([{ id: 1, code: "CE-LVD", title: "EU Low Voltage" }]);
    const result = await electricalStandardsRouter.standards.getById({ input: { id: 1 }, ...makeCtx() });
    expect(result?.code).toBe("CE-LVD");
  });

  it("returns null for non-existent", async () => {
    selectResultsQueue.push([]);
    const result = await electricalStandardsRouter.standards.getById({ input: { id: 999 }, ...makeCtx() });
    expect(result).toBeNull();
  });
});

describe("standards.create", () => {
  it("creates a new standard", async () => {
    mockReturningResult = [{ id: 5, code: "GB-NEW", framework: "GB" }];
    const result = await electricalStandardsRouter.standards.create({
      input: { code: "GB-NEW", framework: "GB", category: "wiring_cable", title: "Test Standard", version: "1.0" },
      ...makeCtx(),
    });
    expect(result.code).toBe("GB-NEW");
  });
});

describe("standards.statsByFramework", () => {
  it("returns grouped counts", async () => {
    selectResultsQueue.push([{ framework: "CE", count: 5 }, { framework: "UL", count: 3 }]);
    const result = await electricalStandardsRouter.standards.statsByFramework({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════
// ── Customer Profiles ──────────────────────────────────
// ═══════════════════════════════════════════════════════

describe("customerProfile.list", () => {
  it("returns active profiles", async () => {
    selectResultsQueue.push([{ id: 1, customerName: "BMW" }, { id: 2, customerName: "SVW" }]);
    const result = await electricalStandardsRouter.customerProfile.list({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("customerProfile.create", () => {
  it("creates a customer profile", async () => {
    mockReturningResult = [{ id: 10, customerName: "Tesla", region: "US", baseFramework: "UL" }];
    const result = await electricalStandardsRouter.customerProfile.create({
      input: { customerName: "Tesla", region: "US", baseFramework: "UL" },
      ...makeCtx(),
    });
    expect(result.customerName).toBe("Tesla");
  });
});

// ═══════════════════════════════════════════════════════
// ── Project Selections ─────────────────────────────────
// ═══════════════════════════════════════════════════════

describe("projectSelection.getByProject", () => {
  it("returns selection for a project", async () => {
    selectResultsQueue.push([{ id: 1, projectCode: "GRT-401" }]);
    const result = await electricalStandardsRouter.projectSelection.getByProject({ input: { projectCode: "GRT-401" }, ...makeCtx() });
    expect(result?.projectCode).toBe("GRT-401");
  });
});

describe("projectSelection.upsert", () => {
  it("creates new selection when none exists", async () => {
    selectResultsQueue.push([]); // existing check
    mockReturningResult = [{ id: 1, projectCode: "GRT-NEW" }];
    const result = await electricalStandardsRouter.projectSelection.upsert({
      input: { projectCode: "GRT-NEW", projectName: "New Project" },
      ...makeCtx(),
    });
    expect(result.projectCode).toBe("GRT-NEW");
  });

  it("rejects update when locked", async () => {
    selectResultsQueue.push([{ id: 1, projectCode: "GRT-LOCKED", lockedAt: new Date() }]);
    await expect(electricalStandardsRouter.projectSelection.upsert({
      input: { projectCode: "GRT-LOCKED" },
      ...makeCtx(),
    })).rejects.toThrow("locked");
  });
});

describe("projectSelection.lock", () => {
  it("locks project at M3", async () => {
    mockReturningResult = [{ id: 1, projectCode: "GRT-401", lockedAt: new Date() }];
    const result = await electricalStandardsRouter.projectSelection.lock({ input: { projectCode: "GRT-401" }, ...makeCtx() });
    expect(result.lockedAt).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════
// ── Compliance Checklist ───────────────────────────────
// ═══════════════════════════════════════════════════════

describe("checklist.getByProjectPhase", () => {
  it("returns checklist items", async () => {
    selectResultsQueue.push([{ id: 1, checkItem: "接地测试" }, { id: 2, checkItem: "绝缘测试" }]);
    const result = await electricalStandardsRouter.checklist.getByProjectPhase({ input: { projectCode: "GRT-401", phase: "M7" }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("checklist.generate", () => {
  it("generates checklist from rules", async () => {
    selectResultsQueue.push([{ id: 1 }]); // project selection
    selectResultsQueue.push([{ id: 1, ruleCode: "M7-CE-001", checklistTemplate: ["接地测试", "绝缘测试"] }]); // rules
    const result = await electricalStandardsRouter.checklist.generate({ input: { projectCode: "GRT-401", phase: "M7" }, ...makeCtx() });
    expect(result.generated).toBe(2);
  });
});

describe("checklist.updateStatus", () => {
  it("updates check status", async () => {
    mockReturningResult = [{ id: 1, status: "PASS" }];
    const result = await electricalStandardsRouter.checklist.updateStatus({ input: { id: 1, status: "PASS" }, ...makeCtx() });
    expect(result.status).toBe("PASS");
  });
});

describe("checklist.summary", () => {
  it("returns grouped summary", async () => {
    selectResultsQueue.push([{ phase: "M7", status: "PASS", count: 5 }, { phase: "M7", status: "FAIL", count: 1 }]);
    const result = await electricalStandardsRouter.checklist.summary({ input: { projectCode: "GRT-401" }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════
// ── Complaints ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════

describe("complaint.list", () => {
  it("returns complaints", async () => {
    selectResultsQueue.push([{ id: 1, severity: "CRITICAL" }]);
    const result = await electricalStandardsRouter.complaint.list({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(1);
  });
});

describe("complaint.create", () => {
  it("creates a complaint", async () => {
    mockReturningResult = [{ id: 3, complaintNumber: "EC-2026-003", severity: "MAJOR" }];
    const result = await electricalStandardsRouter.complaint.create({
      input: {
        complaintNumber: "EC-2026-003",
        customerName: "GM",
        category: "panel_enclosure",
        severity: "MAJOR",
        title: "UL标签缺失",
        description: "电控柜缺少UL508A标签",
      },
      ...makeCtx(),
    });
    expect(result.severity).toBe("MAJOR");
  });
});

describe("complaint.updateResolution", () => {
  it("updates resolution with corrective action", async () => {
    mockReturningResult = [{ id: 1, status: "resolved", correctiveAction: "Added UL labels" }];
    const result = await electricalStandardsRouter.complaint.updateResolution({
      input: { id: 1, status: "resolved", correctiveAction: "Added UL labels" },
      ...makeCtx(),
    });
    expect(result.status).toBe("resolved");
  });
});

describe("complaint.stats", () => {
  it("returns severity/category/status breakdown", async () => {
    selectResultsQueue.push([{ severity: "CRITICAL", count: 1 }]);
    selectResultsQueue.push([{ category: "safety_circuit", count: 1 }]);
    selectResultsQueue.push([{ status: "open", count: 2 }]);
    const result = await electricalStandardsRouter.complaint.stats({ input: undefined, ...makeCtx() });
    expect(result.bySeverity).toHaveLength(1);
    expect(result.byCategory).toHaveLength(1);
    expect(result.byStatus).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════
// ── Review Rules ───────────────────────────────────────
// ═══════════════════════════════════════════════════════

describe("reviewRule.list", () => {
  it("returns active rules", async () => {
    selectResultsQueue.push([{ id: 1, phase: "M0" }, { id: 2, phase: "M3" }]);
    const result = await electricalStandardsRouter.reviewRule.list({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("reviewRule.create", () => {
  it("creates a review rule", async () => {
    mockReturningResult = [{ id: 5, phase: "M8", ruleCode: "M8-SEMI-001" }];
    const result = await electricalStandardsRouter.reviewRule.create({
      input: { phase: "M8", framework: "SEMI", ruleCode: "M8-SEMI-001", title: "SEMI S2 FAT验证" },
      ...makeCtx(),
    });
    expect(result.ruleCode).toBe("M8-SEMI-001");
  });
});

// ═══════════════════════════════════════════════════════
// ── Dashboard ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════

describe("dashboard.overview", () => {
  it("returns all summary counts", async () => {
    selectResultsQueue.push([{ count: 12 }]); // standards
    selectResultsQueue.push([{ count: 5 }]);  // customers
    selectResultsQueue.push([{ count: 3 }]);  // projects
    selectResultsQueue.push([{ count: 2 }]);  // open complaints
    selectResultsQueue.push([{ count: 1 }]);  // critical complaints
    const result = await electricalStandardsRouter.dashboard.overview({ input: undefined, ...makeCtx() });
    expect(result.activeStandardCount).toBe(12);
    expect(result.customerProfileCount).toBe(5);
    expect(result.criticalComplaintCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════
// ── Structure validation ───────────────────────────────
// ═══════════════════════════════════════════════════════

describe("router structure", () => {
  it("has all 7 sub-routers", () => {
    expect(electricalStandardsRouter.standards).toBeDefined();
    expect(electricalStandardsRouter.customerProfile).toBeDefined();
    expect(electricalStandardsRouter.projectSelection).toBeDefined();
    expect(electricalStandardsRouter.checklist).toBeDefined();
    expect(electricalStandardsRouter.complaint).toBeDefined();
    expect(electricalStandardsRouter.reviewRule).toBeDefined();
    expect(electricalStandardsRouter.dashboard).toBeDefined();
  });
});
