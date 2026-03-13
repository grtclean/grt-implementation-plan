import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from","where","orderBy","limit","offset","values","set",
    "onConflictDoUpdate","onConflictDoNothing","groupBy","having",
    "innerJoin","leftJoin","rightJoin","fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
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

vi.mock("../utils/db-helpers", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Schema mocks ────────────────────────────────────────────
vi.mock("../../drizzle/schema", () => ({
  deliveryExecutions: {
    id: "id", deliveryCode: "deliveryCode", projectId: "projectId",
    projectNo: "projectNo", customerName: "customerName",
    currentStage: "currentStage", status: "status",
    siteAddress: "siteAddress", siteContactName: "siteContactName",
    siteContactPhone: "siteContactPhone", plannedM7Date: "plannedM7Date",
    plannedM8Date: "plannedM8Date", plannedM9Date: "plannedM9Date",
    plannedM10Date: "plannedM10Date", specialRequirements: "specialRequirements",
    createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  siteIssueTickets: {
    id: "id", ticketCode: "ticketCode", deliveryId: "deliveryId",
    title: "title", issueCategory: "issueCategory", severity: "severity",
    status: "status", description: "description",
    reportedById: "reportedById", reportedByName: "reportedByName",
    targetResolutionDate: "targetResolutionDate",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  deliveryShipments: { id: "id", deliveryId: "deliveryId" },
  deliveryInstallations: { id: "id", deliveryId: "deliveryId" },
  deliverySatRecords: { id: "id", deliveryId: "deliveryId" },
  gateChecklistItems: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  asc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  relations: vi.fn(() => ({})),
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ==================== delivery.list ====================

describe("m7m9.delivery.list", () => {
  it("returns paginated list with correct structure", async () => {
    const caller = createAuthenticatedCaller();
    const deliveryRow = {
      id: 1, deliveryCode: "DEL-2026-001", projectNo: "PRJ-001",
      customerName: "客户A", currentStage: "M7_Pre_Acceptance", status: "Pending",
    };
    // First: rows, Second: count
    selectResultsQueue.push([deliveryRow]);
    selectResultsQueue.push([{ count: 1 }]);

    const result = await caller.m7m9.delivery.list({ page: 1, pageSize: 20 });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result).toHaveProperty("total", 1);
    expect(result).toHaveProperty("page", 1);
    expect(result).toHaveProperty("pageSize", 20);

    const first = result.items[0];
    expect(first).toHaveProperty("deliveryCode");
    expect(first).toHaveProperty("projectNo");
    expect(first).toHaveProperty("customerName");
    expect(first).toHaveProperty("currentStage");
    expect(first).toHaveProperty("status");
  });

  it("returns empty list when no deliveries", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ count: 0 }]);

    const result = await caller.m7m9.delivery.list({ page: 1, pageSize: 20 });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ==================== delivery.getById ====================

describe("m7m9.delivery.getById", () => {
  it("returns delivery for known id", async () => {
    const caller = createAuthenticatedCaller();
    const row = { id: 1, deliveryCode: "DEL-2026-001", customerName: "客户A" };
    mockQueryResult = [row];

    const result = await caller.m7m9.delivery.getById({ id: 1 });
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("deliveryCode");
  });

  it("returns null for unknown id", async () => {
    const caller = createAuthenticatedCaller();
    mockQueryResult = [];

    const result = await caller.m7m9.delivery.getById({ id: 99999 });
    expect(result).toBeNull();
  });
});

// ==================== delivery.create ====================

describe("m7m9.delivery.create", () => {
  it("creates delivery with valid input", async () => {
    const caller = createAuthenticatedCaller();
    mockReturningResult = [{ id: 10, deliveryCode: "DEL-2026-100" }];

    const result = await caller.m7m9.delivery.create({
      projectId: 1,
      projectNo: "PRJ-2026-099",
      customerName: "测试客户",
    });

    expect(result.success).toBe(true);
    expect(result.deliveryCode).toMatch(/^DEL-\d{4}-\d+$/);
    expect(result.id).toBeDefined();
  });

  it("rejects unauthenticated requests", async () => {
    const caller = createAnonymousCaller();

    await expect(
      caller.m7m9.delivery.create({
        projectId: 1,
        projectNo: "PRJ-2026-099",
      })
    ).rejects.toThrow();
  });
});

// ==================== delivery.update ====================

describe("m7m9.delivery.update", () => {
  it("updates delivery fields", async () => {
    const caller = createAuthenticatedCaller();
    // update chain resolves through .then
    selectResultsQueue.push([]);

    const result = await caller.m7m9.delivery.update({
      id: 1,
      customerName: "新客户",
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe("Delivery updated");
  });
});

// ==================== delivery.delete ====================

describe("m7m9.delivery.delete", () => {
  it("soft-deletes (cancels) delivery", async () => {
    const caller = createAuthenticatedCaller();
    // update chain resolves through .then
    selectResultsQueue.push([]);

    const result = await caller.m7m9.delivery.delete({ id: 1 });
    expect(result.success).toBe(true);
    expect(result.message).toBe("Delivery cancelled");
  });
});

// ==================== delivery.getStats ====================

describe("m7m9.delivery.getStats", () => {
  it("returns expected structure", async () => {
    const caller = createAuthenticatedCaller();
    // First: groupBy stage results
    selectResultsQueue.push([
      { stage: "M7_Pre_Acceptance", count: 3 },
      { stage: "M8_Installation", count: 2 },
      { stage: "M9_Final_Acceptance", count: 1 },
      { stage: "Completed", count: 5 },
    ]);
    // Second: blocked count
    selectResultsQueue.push([{ count: 1 }]);

    const result = await caller.m7m9.delivery.getStats();

    expect(result).toHaveProperty("byStage");
    expect(result.byStage).toHaveProperty("M7_Pre_Acceptance");
    expect(result.byStage).toHaveProperty("M8_Installation");
    expect(result.byStage).toHaveProperty("M9_Final_Acceptance");
    expect(result.byStage).toHaveProperty("Completed");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("blocked");
    expect(typeof result.total).toBe("number");
  });
});

// ==================== siteIssue.list ====================

describe("m7m9.siteIssue.list", () => {
  it("returns issue data with correct structure", async () => {
    const caller = createAuthenticatedCaller();
    const issueRow = {
      id: 1, ticketCode: "SITE-2026-001", deliveryId: 1,
      title: "缺少螺栓", issueCategory: "Missing_Part",
      severity: "High", status: "Open",
    };
    // First: rows, Second: count
    selectResultsQueue.push([issueRow]);
    selectResultsQueue.push([{ count: 1 }]);

    const result = await caller.m7m9.siteIssue.list({
      page: 1,
      pageSize: 20,
    });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);

    const first = result.items[0];
    expect(first).toHaveProperty("ticketCode");
    expect(first).toHaveProperty("deliveryId");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("issueCategory");
    expect(first).toHaveProperty("severity");
    expect(first).toHaveProperty("status");
  });
});

// ==================== siteIssue.create ====================

describe("m7m9.siteIssue.create", () => {
  it("creates issue with valid input", async () => {
    const caller = createAuthenticatedCaller();
    mockReturningResult = [{ id: 5, ticketCode: "SITE-2026-005" }];

    const result = await caller.m7m9.siteIssue.create({
      deliveryId: 1,
      issueCategory: "Missing_Part",
      severity: "High",
      title: "缺少螺栓",
    });

    expect(result.success).toBe(true);
    expect(result.ticketCode).toMatch(/^SITE-\d{4}-\d+$/);
    expect(result.id).toBeDefined();
  });

  it("rejects unauthenticated requests", async () => {
    const caller = createAnonymousCaller();

    await expect(
      caller.m7m9.siteIssue.create({
        deliveryId: 1,
        issueCategory: "Damage",
        severity: "Low",
        title: "表面划伤",
      })
    ).rejects.toThrow();
  });
});

// ==================== gateCheck.executeAIGateCheck ====================

describe("m7m9.gateCheck.executeAIGateCheck", () => {
  it("returns structured AI gate check result", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.m7m9.gateCheck.executeAIGateCheck({
      deliveryId: 1,
      currentStage: "M7_Pre_Acceptance",
      openIssueCount: 0,
      criticalIssueCount: 0,
      shippingCleanlinessReport: "https://example.com/report.pdf",
    });

    expect(result).toHaveProperty("decision");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("stage", "M7_Pre_Acceptance");
    expect(result).toHaveProperty("issues");
    expect(result).toHaveProperty("checkedAt");
    expect(result).toHaveProperty("recommendation");
    expect(["Green_Light", "Yellow_Hold", "Red_Block"]).toContain(
      result.decision
    );
  });

  it("returns Green_Light when all checks pass", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.m7m9.gateCheck.executeAIGateCheck({
      deliveryId: 1,
      currentStage: "M7_Pre_Acceptance",
      openIssueCount: 0,
      criticalIssueCount: 0,
      shippingCleanlinessReport: "https://example.com/report.pdf",
      cycleTimeActual: 30,
      cycleTimeTarget: 35,
    });

    expect(result.decision).toBe("Green_Light");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("returns Red_Block when critical issues exist", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.m7m9.gateCheck.executeAIGateCheck({
      deliveryId: 1,
      currentStage: "M7_Pre_Acceptance",
      openIssueCount: 5,
      criticalIssueCount: 3,
    });

    expect(result.decision).toBe("Red_Block");
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = createAnonymousCaller();

    await expect(
      caller.m7m9.gateCheck.executeAIGateCheck({
        deliveryId: 1,
        currentStage: "M7_Pre_Acceptance",
        openIssueCount: 0,
        criticalIssueCount: 0,
      })
    ).rejects.toThrow();
  });
});
