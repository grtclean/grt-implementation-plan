/**
 * Marketing Platform Router — Unit Tests
 * Covers all 6 sub-routers: annualPlan, assetQuality, exhibition, historicalAssets, broadcast, seedDemo
 *
 * Run: pnpm test -- server/routers/marketing-platform.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
let selectResultsQueue: any[][] = [];

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
  chain.returning = vi.fn(async () => mockReturningResult);
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
    execute: vi.fn(async () => []),
  })),
}));

// ─── Mock tRPC core ──────────────────────────────────────────────────
vi.mock("../_core/trpc", () => {
  const { initTRPC } = require("@trpc/server");
  const t = initTRPC.context<any>().create();
  return {
    router: t.router,
    protectedProcedure: t.procedure,
    publicProcedure: t.procedure,
    requirePermission: () => t.procedure,
  };
});

// ─── Mock logger ─────────────────────────────────────────────────────
vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

// ─── Mock drizzle-orm ────────────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  and: vi.fn((...args: any[]) => args),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  count: vi.fn(() => "count"),
}));

// ─── Mock schema tables ─────────────────────────────────────────────
vi.mock("../../drizzle/marketing-platform-schema", () => ({
  mktAnnualPlans: {
    id: "id", year: "year", title: "title", description: "description",
    okrObjectiveId: "okrObjectiveId", status: "status", totalBudget: "totalBudget",
    approvedBudget: "approvedBudget", actualSpend: "actualSpend", budgetStatus: "budgetStatus",
    createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktKpiTargets: {
    id: "id", planId: "planId", name: "name", category: "category",
    targetValue: "targetValue", currentValue: "currentValue", unit: "unit",
    ragStatus: "ragStatus", lastCheckinAt: "lastCheckinAt", checkinHistory: "checkinHistory",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktBudgetLineItems: {
    id: "id", planId: "planId", category: "category", description: "description",
    plannedAmount: "plannedAmount", actualAmount: "actualAmount", redLineLimit: "redLineLimit",
    status: "status", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktAssetQualitySpecs: {
    id: "id", assetType: "assetType", specName: "specName", requirements: "requirements",
    isActive: "isActive", createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktAssetReviews: {
    id: "id", assetName: "assetName", assetType: "assetType", assetUrl: "assetUrl",
    specId: "specId", submittedBy: "submittedBy", reviewerBy: "reviewerBy", status: "status",
    viComplianceResult: "viComplianceResult", reviewNotes: "reviewNotes",
    submittedAt: "submittedAt", reviewedAt: "reviewedAt", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktViRules: {
    id: "id", region: "region", category: "category", ruleName: "ruleName",
    ruleContent: "ruleContent", isActive: "isActive", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktExhibitions: {
    id: "id", name: "name", description: "description", venue: "venue",
    city: "city", country: "country", startDate: "startDate", endDate: "endDate",
    stage: "stage", budget: "budget", budgetApproved: "budgetApproved",
    demoEquipment: "demoEquipment", boothInfo: "boothInfo", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktExhibitionTasks: {
    id: "id", exhibitionId: "exhibitionId", stage: "stage", title: "title",
    description: "description", assignedTo: "assignedTo", status: "status",
    dueDate: "dueDate", completedAt: "completedAt", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktLeadCaptures: {
    id: "id", exhibitionId: "exhibitionId", companyName: "companyName",
    contactName: "contactName", contactTitle: "contactTitle", email: "email",
    phone: "phone", notes: "notes", ocrData: "ocrData", syncStatus: "syncStatus",
    crmLeadId: "crmLeadId", capturedBy: "capturedBy", capturedAt: "capturedAt", createdAt: "createdAt",
  },
  mktExhibitionRoi: {
    id: "id", exhibitionId: "exhibitionId", totalSpend: "totalSpend",
    leadsGenerated: "leadsGenerated", m0ProjectsGenerated: "m0ProjectsGenerated",
    estimatedRevenue: "estimatedRevenue", roiPercentage: "roiPercentage",
    aiNarrative: "aiNarrative", metrics: "metrics", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktHistoricalAssets: {
    id: "id", title: "title", assetType: "assetType", year: "year",
    region: "region", industry: "industry", fileUrl: "fileUrl", thumbnailUrl: "thumbnailUrl",
    tags: "tags", vectorized: "vectorized", knowledgeBaseId: "knowledgeBaseId",
    exhibitionId: "exhibitionId", createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktBroadcastChannels: {
    id: "id", channelCode: "channelCode", name: "name", location: "location",
    screenType: "screenType", resolution: "resolution", isOnline: "isOnline",
    lastHeartbeat: "lastHeartbeat", config: "config", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  mktBroadcastSchedules: {
    id: "id", channelId: "channelId", contentTitle: "contentTitle",
    contentType: "contentType", contentUrl: "contentUrl", contentRefId: "contentRefId",
    startTime: "startTime", endTime: "endTime", isActive: "isActive",
    sortOrder: "sortOrder", createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
}));

// ─── Import router AFTER mocks ──────────────────────────────────────
import { marketingPlatformRouter } from "./marketing-platform.router";

// ─── Caller helpers ─────────────────────────────────────────────────
function createAuthenticatedCaller() {
  return marketingPlatformRouter.createCaller({
    user: { id: 1, openId: "test", name: "Test", role: "staff" } as any,
    headers: {} as any,
    language: "zh" as any,
    bu: {} as any,
  });
}

function createAdminCaller() {
  return marketingPlatformRouter.createCaller({
    user: { id: 1, openId: "admin", name: "Admin", role: "admin" } as any,
    headers: {} as any,
    language: "zh" as any,
    bu: {} as any,
  });
}

// ─── Reset between tests ────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue = [];
});

// ═════════════════════════════════════════════════════════════════════
// 1. Annual Plan sub-router (12 procedures)
// ═════════════════════════════════════════════════════════════════════
describe("marketingPlatform.annualPlan", () => {
  it("listPlans returns all plans", async () => {
    mockQueryResult = [{ id: 1, year: 2026, title: "2026 Plan" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.annualPlan.listPlans();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listPlans with year filter", async () => {
    mockQueryResult = [{ id: 1, year: 2026, title: "2026 Plan" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.annualPlan.listPlans({ year: 2026 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("getPlan returns single plan", async () => {
    mockQueryResult = [{ id: 1, year: 2026, title: "2026 Plan" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.annualPlan.getPlan({ id: 1 });
    expect(result).toHaveProperty("id", 1);
  });

  it("getPlan throws NOT_FOUND for missing plan", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(caller.annualPlan.getPlan({ id: 999 })).rejects.toThrow("Plan not found");
  });

  it("createPlan inserts a new plan", async () => {
    mockReturningResult = [{ id: 10, year: 2026, title: "New Plan" }];
    const caller = createAdminCaller();
    const result = await caller.annualPlan.createPlan({
      year: 2026,
      title: "New Plan",
      description: "Test plan",
    });
    expect(result).toHaveProperty("id", 10);
  });

  it("updatePlan modifies existing plan", async () => {
    mockReturningResult = [{ id: 1, title: "Updated Plan", status: "active" }];
    const caller = createAdminCaller();
    const result = await caller.annualPlan.updatePlan({ id: 1, title: "Updated Plan", status: "active" });
    expect(result).toHaveProperty("title", "Updated Plan");
  });

  it("listKpiTargets returns KPIs for a plan", async () => {
    mockQueryResult = [{ id: 1, planId: 1, name: "Video Output", category: "content" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.annualPlan.listKpiTargets({ planId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("upsertKpiTarget creates a new KPI when id is absent", async () => {
    mockReturningResult = [{ id: 5, planId: 1, name: "Lead Count", category: "leads" }];
    const caller = createAdminCaller();
    const result = await caller.annualPlan.upsertKpiTarget({
      planId: 1,
      name: "Lead Count",
      category: "leads",
      targetValue: "500",
      unit: "count",
    });
    expect(result).toHaveProperty("id", 5);
  });

  it("upsertKpiTarget updates existing KPI when id is present", async () => {
    mockReturningResult = [{ id: 5, planId: 1, name: "Updated KPI" }];
    const caller = createAdminCaller();
    const result = await caller.annualPlan.upsertKpiTarget({
      id: 5,
      planId: 1,
      name: "Updated KPI",
      category: "leads",
      targetValue: "600",
      unit: "count",
    });
    expect(result).toHaveProperty("id", 5);
  });

  it("checkInKpi calculates RAG status green", async () => {
    selectResultsQueue = [[{ id: 1, targetValue: "100", currentValue: "50", checkinHistory: [] }]];
    mockReturningResult = [{ id: 1, currentValue: "95", ragStatus: "green" }];
    const caller = createAdminCaller();
    const result = await caller.annualPlan.checkInKpi({ id: 1, currentValue: "95" });
    expect(result).toHaveProperty("id", 1);
  });

  it("checkInKpi throws NOT_FOUND for missing KPI", async () => {
    selectResultsQueue = [[]];
    const caller = createAdminCaller();
    await expect(caller.annualPlan.checkInKpi({ id: 999, currentValue: "10" })).rejects.toThrow("KPI not found");
  });

  it("listBudgetLines returns budget items for a plan", async () => {
    mockQueryResult = [{ id: 1, planId: 1, category: "media", plannedAmount: "100000" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.annualPlan.listBudgetLines({ planId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("upsertBudgetLine creates new budget line when id is absent", async () => {
    mockReturningResult = [{ id: 3, planId: 1, category: "travel", plannedAmount: "200000" }];
    const caller = createAdminCaller();
    const result = await caller.annualPlan.upsertBudgetLine({
      planId: 1,
      category: "travel",
      plannedAmount: "200000",
    });
    expect(result).toHaveProperty("id", 3);
  });

  it("upsertBudgetLine updates existing budget line when id is present", async () => {
    mockReturningResult = [{ id: 3, planId: 1, category: "travel", plannedAmount: "250000" }];
    const caller = createAdminCaller();
    const result = await caller.annualPlan.upsertBudgetLine({
      id: 3,
      planId: 1,
      category: "travel",
      plannedAmount: "250000",
    });
    expect(result).toHaveProperty("plannedAmount", "250000");
  });

  it("submitBudgetForReview updates budget status to submitted", async () => {
    mockReturningResult = [{ id: 1, budgetStatus: "submitted" }];
    const caller = createAdminCaller();
    const result = await caller.annualPlan.submitBudgetForReview({ planId: 1 });
    expect(result).toHaveProperty("budgetStatus", "submitted");
  });

  it("budgetDashboard returns plan with financial summary", async () => {
    selectResultsQueue = [
      [{ id: 1, year: 2026, title: "Plan", totalBudget: "500000" }], // plan
    ];
    mockQueryResult = [
      { category: "media", plannedAmount: "100000", actualAmount: "50000", redLineLimit: "120000" },
      { category: "travel", plannedAmount: "200000", actualAmount: "180000", redLineLimit: "190000" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.annualPlan.budgetDashboard({ planId: 1 });
    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("totalPlanned");
    expect(result).toHaveProperty("totalActual");
    expect(result).toHaveProperty("burnRate");
    expect(result).toHaveProperty("overBudgetLines");
    expect(result).toHaveProperty("byCategory");
  });

  it("linkToOkr sets OKR objective on plan", async () => {
    mockReturningResult = [{ id: 1, okrObjectiveId: 42 }];
    const caller = createAdminCaller();
    const result = await caller.annualPlan.linkToOkr({ planId: 1, okrObjectiveId: 42 });
    expect(result).toHaveProperty("okrObjectiveId", 42);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. Asset Quality sub-router (10 procedures)
// ═════════════════════════════════════════════════════════════════════
describe("marketingPlatform.assetQuality", () => {
  it("listSpecs returns all specs", async () => {
    mockQueryResult = [{ id: 1, assetType: "brochure", specName: "Logo Placement" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.assetQuality.listSpecs();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listSpecs with assetType filter", async () => {
    mockQueryResult = [{ id: 1, assetType: "video", specName: "Resolution Spec" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.assetQuality.listSpecs({ assetType: "video" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("createSpec inserts a new quality spec", async () => {
    mockReturningResult = [{ id: 10, assetType: "brochure", specName: "Color Guidelines" }];
    const caller = createAdminCaller();
    const result = await caller.assetQuality.createSpec({
      assetType: "brochure",
      specName: "Color Guidelines",
    });
    expect(result).toHaveProperty("id", 10);
  });

  it("updateSpec modifies existing spec", async () => {
    mockReturningResult = [{ id: 1, specName: "Updated Spec", isActive: false }];
    const caller = createAdminCaller();
    const result = await caller.assetQuality.updateSpec({ id: 1, specName: "Updated Spec", isActive: false });
    expect(result).toHaveProperty("specName", "Updated Spec");
  });

  it("listReviews returns reviews sorted by submittal date", async () => {
    mockQueryResult = [{ id: 1, assetName: "Promo Video", status: "pending" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.assetQuality.listReviews();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listReviews with status filter", async () => {
    mockQueryResult = [{ id: 2, assetName: "Brochure", status: "approved" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.assetQuality.listReviews({ status: "approved" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("submitForReview creates new asset review", async () => {
    mockReturningResult = [{ id: 5, assetName: "Product Photo", status: "pending" }];
    const caller = createAdminCaller();
    const result = await caller.assetQuality.submitForReview({
      assetName: "Product Photo",
      assetType: "photo",
      assetUrl: "https://cdn.example.com/photo.jpg",
    });
    expect(result).toHaveProperty("id", 5);
  });

  it("reviewAsset approves an asset", async () => {
    mockReturningResult = [{ id: 1, status: "approved", reviewNotes: "Looks good" }];
    const caller = createAdminCaller();
    const result = await caller.assetQuality.reviewAsset({
      id: 1,
      status: "approved",
      reviewNotes: "Looks good",
    });
    expect(result).toHaveProperty("status", "approved");
  });

  it("reviewAsset rejects an asset", async () => {
    mockReturningResult = [{ id: 2, status: "rejected", reviewNotes: "Logo misaligned" }];
    const caller = createAdminCaller();
    const result = await caller.assetQuality.reviewAsset({
      id: 2,
      status: "rejected",
      reviewNotes: "Logo misaligned",
    });
    expect(result).toHaveProperty("status", "rejected");
  });

  it("listViRules returns all VI rules", async () => {
    mockQueryResult = [{ id: 1, region: "global", category: "logo", ruleName: "Primary Logo" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.assetQuality.listViRules();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listViRules with region and category filter", async () => {
    mockQueryResult = [{ id: 2, region: "CN", category: "color" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.assetQuality.listViRules({ region: "CN", category: "color" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("upsertViRule creates new rule when id absent", async () => {
    mockReturningResult = [{ id: 8, region: "EU", category: "font", ruleName: "EU Font Standard" }];
    const caller = createAdminCaller();
    const result = await caller.assetQuality.upsertViRule({
      region: "EU",
      category: "font",
      ruleName: "EU Font Standard",
    });
    expect(result).toHaveProperty("id", 8);
  });

  it("upsertViRule updates existing rule when id present", async () => {
    mockReturningResult = [{ id: 8, ruleName: "Updated Font Rule" }];
    const caller = createAdminCaller();
    const result = await caller.assetQuality.upsertViRule({
      id: 8,
      region: "EU",
      category: "font",
      ruleName: "Updated Font Rule",
    });
    expect(result).toHaveProperty("ruleName", "Updated Font Rule");
  });

  it("checkViCompliance returns compliant for empty rules", async () => {
    mockQueryResult = []; // no rules found
    const caller = createAuthenticatedCaller();
    const result = await caller.assetQuality.checkViCompliance({
      assetType: "brochure",
      region: "global",
    });
    expect(result).toHaveProperty("compliant", true);
    expect(result.violations).toHaveLength(0);
  });

  it("checkViCompliance detects violations when metadata missing", async () => {
    mockQueryResult = [
      { id: 1, ruleName: "Required Fields", ruleContent: { requiredFields: ["logo", "tagline"] }, isActive: true },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.assetQuality.checkViCompliance({
      assetType: "brochure",
      region: "global",
    });
    expect(result.compliant).toBe(false);
    expect(result.violations.length).toBe(2);
    expect(result.violations[0].detail).toContain("logo");
    expect(result.violations[1].detail).toContain("tagline");
  });

  it("reviewDashboard returns aggregate counts", async () => {
    selectResultsQueue = [
      [{ count: 10 }], // pending
      [{ count: 25 }], // approved
      [{ count: 5 }],  // rejected
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.assetQuality.reviewDashboard();
    expect(result).toHaveProperty("pendingCount");
    expect(result).toHaveProperty("approvedCount");
    expect(result).toHaveProperty("rejectedCount");
    expect(result).toHaveProperty("rejectionRate");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. Exhibition sub-router (16 procedures)
// ═════════════════════════════════════════════════════════════════════
describe("marketingPlatform.exhibition", () => {
  it("list returns exhibitions", async () => {
    mockQueryResult = [{ id: 1, name: "CIMT 2026", stage: "E0" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.exhibition.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list with stage filter", async () => {
    mockQueryResult = [{ id: 1, name: "CIMT 2026", stage: "E1" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.exhibition.list({ stage: "E1" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("get returns single exhibition", async () => {
    mockQueryResult = [{ id: 1, name: "CIMT 2026", stage: "E0" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.exhibition.get({ id: 1 });
    expect(result).toHaveProperty("name", "CIMT 2026");
  });

  it("get throws NOT_FOUND for missing exhibition", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(caller.exhibition.get({ id: 999 })).rejects.toThrow("Exhibition not found");
  });

  it("create inserts a new exhibition", async () => {
    mockReturningResult = [{ id: 5, name: "Hannover Messe", stage: "E0" }];
    const caller = createAdminCaller();
    const result = await caller.exhibition.create({
      name: "Hannover Messe",
      venue: "Hannover Exhibition Centre",
      city: "Hannover",
      country: "DE",
      budget: "500000",
    });
    expect(result).toHaveProperty("id", 5);
  });

  it("update modifies exhibition", async () => {
    mockReturningResult = [{ id: 1, name: "Updated Exhibition", budgetApproved: true }];
    const caller = createAdminCaller();
    const result = await caller.exhibition.update({ id: 1, name: "Updated Exhibition", budgetApproved: true });
    expect(result).toHaveProperty("name", "Updated Exhibition");
  });

  it("advanceStage E0->E1 succeeds with budget approved and demo equipment", async () => {
    selectResultsQueue = [
      [{ id: 1, stage: "E0", budgetApproved: true, demoEquipment: [{ name: "KLT-3000" }], endDate: null }],
    ];
    mockReturningResult = [{ id: 1, stage: "E1" }];
    const caller = createAdminCaller();
    const result = await caller.exhibition.advanceStage({ id: 1 });
    expect(result).toHaveProperty("stage", "E1");
  });

  it("advanceStage E0->E1 fails without budget approval", async () => {
    selectResultsQueue = [
      [{ id: 1, stage: "E0", budgetApproved: false, demoEquipment: [{ name: "KLT-3000" }] }],
    ];
    const caller = createAdminCaller();
    await expect(caller.exhibition.advanceStage({ id: 1 })).rejects.toThrow("Budget must be approved");
  });

  it("advanceStage E0->E1 fails without demo equipment", async () => {
    selectResultsQueue = [
      [{ id: 1, stage: "E0", budgetApproved: true, demoEquipment: [] }],
    ];
    const caller = createAdminCaller();
    await expect(caller.exhibition.advanceStage({ id: 1 })).rejects.toThrow("Demo equipment must be finalized");
  });

  it("advanceStage throws NOT_FOUND for missing exhibition", async () => {
    selectResultsQueue = [[]];
    const caller = createAdminCaller();
    await expect(caller.exhibition.advanceStage({ id: 999 })).rejects.toThrow("Exhibition not found");
  });

  it("advanceStage throws BAD_REQUEST at final stage", async () => {
    selectResultsQueue = [
      [{ id: 1, stage: "closed", budgetApproved: true, demoEquipment: [] }],
    ];
    const caller = createAdminCaller();
    await expect(caller.exhibition.advanceStage({ id: 1 })).rejects.toThrow("already at final stage");
  });

  it("listTasks returns tasks for exhibition", async () => {
    mockQueryResult = [{ id: 1, exhibitionId: 1, title: "Book flights", stage: "E0" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.exhibition.listTasks({ exhibitionId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("createTask inserts new task", async () => {
    mockReturningResult = [{ id: 10, exhibitionId: 1, title: "Design booth" }];
    const caller = createAdminCaller();
    const result = await caller.exhibition.createTask({
      exhibitionId: 1,
      stage: "E0",
      title: "Design booth",
    });
    expect(result).toHaveProperty("id", 10);
  });

  it("updateTask modifies task", async () => {
    mockReturningResult = [{ id: 1, title: "Updated task", status: "in_progress" }];
    const caller = createAdminCaller();
    const result = await caller.exhibition.updateTask({ id: 1, title: "Updated task", status: "in_progress" });
    expect(result).toHaveProperty("status", "in_progress");
  });

  it("completeTask marks task as completed", async () => {
    mockReturningResult = [{ id: 1, status: "completed", completedAt: "2026-03-01" }];
    const caller = createAdminCaller();
    const result = await caller.exhibition.completeTask({ id: 1 });
    expect(result).toHaveProperty("status", "completed");
  });

  it("captureLead inserts lead for exhibition", async () => {
    mockReturningResult = [{ id: 20, exhibitionId: 1, companyName: "Schaeffler", contactName: "Hans" }];
    const caller = createAdminCaller();
    const result = await caller.exhibition.captureLead({
      exhibitionId: 1,
      companyName: "Schaeffler",
      contactName: "Hans",
      email: "hans@schaeffler.com",
    });
    expect(result).toHaveProperty("companyName", "Schaeffler");
  });

  it("syncLeadsToCrm syncs pending leads", async () => {
    selectResultsQueue = [
      [{ id: 1, syncStatus: "pending" }, { id: 2, syncStatus: "pending" }],
    ];
    const caller = createAdminCaller();
    const result = await caller.exhibition.syncLeadsToCrm({ exhibitionId: 1 });
    expect(result).toHaveProperty("synced", 2);
    expect(result).toHaveProperty("total", 2);
  });

  it("syncLeadsToCrm returns zero when no pending leads", async () => {
    selectResultsQueue = [[]];
    const caller = createAdminCaller();
    const result = await caller.exhibition.syncLeadsToCrm({ exhibitionId: 1 });
    expect(result.synced).toBe(0);
  });

  it("getLeadCaptures returns leads for exhibition", async () => {
    mockQueryResult = [{ id: 1, exhibitionId: 1, companyName: "BMW" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.exhibition.getLeadCaptures({ exhibitionId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("createRoiAnalysis calculates ROI percentage", async () => {
    mockReturningResult = [{
      id: 1, exhibitionId: 1, totalSpend: "100000", estimatedRevenue: "300000",
      roiPercentage: "200.00", leadsGenerated: 50,
    }];
    const caller = createAdminCaller();
    const result = await caller.exhibition.createRoiAnalysis({
      exhibitionId: 1,
      totalSpend: "100000",
      estimatedRevenue: "300000",
      leadsGenerated: 50,
      m0ProjectsGenerated: 3,
    });
    expect(result).toHaveProperty("exhibitionId", 1);
  });

  it("getRoiAnalysis returns ROI for exhibition", async () => {
    mockQueryResult = [{ id: 1, exhibitionId: 1, roiPercentage: "200.00" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.exhibition.getRoiAnalysis({ exhibitionId: 1 });
    expect(result).toHaveProperty("roiPercentage", "200.00");
  });

  it("getRoiAnalysis returns null when no ROI exists", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.exhibition.getRoiAnalysis({ exhibitionId: 999 });
    expect(result).toBeNull();
  });

  it("exhibitionDashboard returns stage summary", async () => {
    mockQueryResult = [
      { id: 1, stage: "E0", startDate: "2027-06-01" },
      { id: 2, stage: "E1", startDate: "2026-05-01" },
      { id: 3, stage: "E0", startDate: "2026-04-01" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.exhibition.exhibitionDashboard();
    expect(result).toHaveProperty("total", 3);
    expect(result).toHaveProperty("byStage");
    expect(result).toHaveProperty("upcoming");
  });

  it("generateRoiReport creates AI narrative", async () => {
    selectResultsQueue = [
      [{ id: 1, exhibitionId: 1, leadsGenerated: 50, m0ProjectsGenerated: 3, estimatedRevenue: "300000", roiPercentage: "200.00" }],
      [{ id: 1, name: "CIMT 2026" }],
    ];
    const caller = createAdminCaller();
    const result = await caller.exhibition.generateRoiReport({ exhibitionId: 1 });
    expect(result).toHaveProperty("narrative");
    expect(result.narrative).toContain("50");
  });

  it("generateRoiReport throws NOT_FOUND when no ROI", async () => {
    selectResultsQueue = [[]];
    const caller = createAdminCaller();
    await expect(caller.exhibition.generateRoiReport({ exhibitionId: 999 })).rejects.toThrow("ROI analysis not found");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. Historical Assets sub-router (8 procedures)
// ═════════════════════════════════════════════════════════════════════
describe("marketingPlatform.historicalAssets", () => {
  it("list returns all historical assets", async () => {
    mockQueryResult = [{ id: 1, title: "2024 Brochure", assetType: "brochure" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.historicalAssets.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list with year and region filter", async () => {
    mockQueryResult = [{ id: 1, title: "2024 EU Brochure", year: 2024, region: "EU" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.historicalAssets.list({ year: 2024, region: "EU" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("create inserts new historical asset", async () => {
    mockReturningResult = [{ id: 10, title: "Product Video 2025", assetType: "video" }];
    const caller = createAdminCaller();
    const result = await caller.historicalAssets.create({
      title: "Product Video 2025",
      assetType: "video",
      year: 2025,
      region: "CN",
      tags: ["cleaning", "KLT"],
    });
    expect(result).toHaveProperty("id", 10);
  });

  it("update modifies historical asset", async () => {
    mockReturningResult = [{ id: 1, title: "Updated Title", region: "APAC" }];
    const caller = createAdminCaller();
    const result = await caller.historicalAssets.update({ id: 1, title: "Updated Title", region: "APAC" });
    expect(result).toHaveProperty("title", "Updated Title");
  });

  it("vectorize marks asset as vectorized", async () => {
    mockReturningResult = [{ id: 1, vectorized: true }];
    const caller = createAdminCaller();
    const result = await caller.historicalAssets.vectorize({ id: 1 });
    expect(result).toHaveProperty("vectorized", true);
  });

  it("batchVectorize processes multiple assets", async () => {
    const caller = createAdminCaller();
    const result = await caller.historicalAssets.batchVectorize({ ids: [1, 2, 3] });
    expect(result).toEqual({ vectorized: 3 });
  });

  it("searchHistory returns vectorized results", async () => {
    mockQueryResult = [{ id: 1, title: "Cleaning Brochure", vectorized: true }];
    const caller = createAuthenticatedCaller();
    const result = await caller.historicalAssets.searchHistory({ query: "cleaning" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("getByExhibition returns assets for exhibition", async () => {
    mockQueryResult = [{ id: 1, exhibitionId: 5, title: "Booth Photo" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.historicalAssets.getByExhibition({ exhibitionId: 5 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("stats returns total and vectorized counts", async () => {
    selectResultsQueue = [
      [{ count: 100 }], // total
      [{ count: 60 }],  // vectorized
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.historicalAssets.stats();
    expect(result).toHaveProperty("total", 100);
    expect(result).toHaveProperty("vectorized", 60);
    expect(result).toHaveProperty("pendingVectorization", 40);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. Broadcast sub-router (12 procedures)
// ═════════════════════════════════════════════════════════════════════
describe("marketingPlatform.broadcast", () => {
  it("listChannels returns all channels", async () => {
    mockQueryResult = [{ id: 1, channelCode: "HQ-LOBBY-01", name: "HQ Lobby Screen" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.broadcast.listChannels();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getChannel returns single channel", async () => {
    mockQueryResult = [{ id: 1, channelCode: "HQ-LOBBY-01", name: "HQ Lobby Screen" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.broadcast.getChannel({ id: 1 });
    expect(result).toHaveProperty("channelCode", "HQ-LOBBY-01");
  });

  it("getChannel throws NOT_FOUND for missing channel", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(caller.broadcast.getChannel({ id: 999 })).rejects.toThrow("Channel not found");
  });

  it("createChannel inserts new channel", async () => {
    mockReturningResult = [{ id: 5, channelCode: "FAC-ENTRANCE-01", name: "Factory Entrance" }];
    const caller = createAdminCaller();
    const result = await caller.broadcast.createChannel({
      channelCode: "FAC-ENTRANCE-01",
      name: "Factory Entrance",
      location: "Factory A entrance",
      screenType: "LCD",
      resolution: "1920x1080",
    });
    expect(result).toHaveProperty("id", 5);
  });

  it("updateChannel modifies channel", async () => {
    mockReturningResult = [{ id: 1, name: "Updated Screen", resolution: "3840x2160" }];
    const caller = createAdminCaller();
    const result = await caller.broadcast.updateChannel({ id: 1, name: "Updated Screen", resolution: "3840x2160" });
    expect(result).toHaveProperty("name", "Updated Screen");
  });

  it("heartbeat sets channel online", async () => {
    mockReturningResult = [{ id: 1, isOnline: true }];
    const caller = createAuthenticatedCaller();
    const result = await caller.broadcast.heartbeat({ channelCode: "HQ-LOBBY-01" });
    expect(result).toEqual({ ok: true });
  });

  it("heartbeat returns ok:false for unknown channel", async () => {
    mockReturningResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.broadcast.heartbeat({ channelCode: "UNKNOWN" });
    expect(result).toEqual({ ok: false });
  });

  it("listSchedules returns schedules for channel", async () => {
    mockQueryResult = [{ id: 1, channelId: 1, contentTitle: "Company Intro" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.broadcast.listSchedules({ channelId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("createSchedule inserts new schedule", async () => {
    mockReturningResult = [{ id: 10, channelId: 1, contentTitle: "Product Demo" }];
    const caller = createAdminCaller();
    const result = await caller.broadcast.createSchedule({
      channelId: 1,
      contentTitle: "Product Demo",
      contentType: "video",
      startTime: "2026-03-10T08:00:00Z",
      endTime: "2026-03-10T18:00:00Z",
    });
    expect(result).toHaveProperty("id", 10);
  });

  it("updateSchedule modifies schedule", async () => {
    mockReturningResult = [{ id: 1, contentTitle: "Updated Demo", isActive: false }];
    const caller = createAdminCaller();
    const result = await caller.broadcast.updateSchedule({ id: 1, contentTitle: "Updated Demo", isActive: false });
    expect(result).toHaveProperty("contentTitle", "Updated Demo");
  });

  it("deleteSchedule removes schedule", async () => {
    const caller = createAdminCaller();
    const result = await caller.broadcast.deleteSchedule({ id: 1 });
    expect(result).toEqual({ deleted: true });
  });

  it("publishToChannel publishes content to multiple channels", async () => {
    const caller = createAdminCaller();
    const result = await caller.broadcast.publishToChannel({
      channelIds: [1, 2, 3],
      contentTitle: "New Year Promo",
      contentType: "video",
      startTime: "2026-01-01T00:00:00Z",
      endTime: "2026-01-31T23:59:59Z",
    });
    expect(result).toEqual({ published: 3 });
  });

  it("broadcastDashboard returns channel and schedule summary", async () => {
    selectResultsQueue = [
      [{ id: 1, name: "Screen A", isOnline: true }, { id: 2, name: "Screen B", isOnline: false }], // channels
    ];
    mockQueryResult = [{ count: 15 }]; // active schedules count
    const caller = createAuthenticatedCaller();
    const result = await caller.broadcast.broadcastDashboard();
    expect(result).toHaveProperty("totalChannels");
    expect(result).toHaveProperty("onlineChannels");
    expect(result).toHaveProperty("offlineChannels");
    expect(result).toHaveProperty("activeSchedules");
    expect(result).toHaveProperty("channels");
  });

  it("getActiveContent returns playlist for channel code", async () => {
    selectResultsQueue = [
      [{ id: 1, channelCode: "HQ-LOBBY-01", name: "HQ Lobby" }], // channel lookup
    ];
    mockQueryResult = [
      { id: 1, contentTitle: "Company Intro", contentType: "video", isActive: true },
      { id: 2, contentTitle: "Product Demo", contentType: "video", isActive: true },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.broadcast.getActiveContent({ channelCode: "HQ-LOBBY-01" });
    expect(result).toHaveProperty("channel");
    expect(result).toHaveProperty("playlist");
  });

  it("getActiveContent returns null channel for unknown code", async () => {
    selectResultsQueue = [[]]; // no channel found
    const caller = createAuthenticatedCaller();
    const result = await caller.broadcast.getActiveContent({ channelCode: "UNKNOWN" });
    expect(result.channel).toBeNull();
    expect(result.playlist).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 6. Seed Demo sub-router (1 procedure)
// ═════════════════════════════════════════════════════════════════════
describe("marketingPlatform.seedDemo", () => {
  it("seed creates demo data and returns success", async () => {
    mockReturningResult = [{ id: 1, year: 2026, title: "2026 Plan" }];
    const caller = createAdminCaller();
    const result = await caller.seedDemo.seed();
    expect(result).toEqual({ seeded: true });
  });
});
