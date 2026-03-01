import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// Mock requireDb to throw — forces all queries to use fallback mock data.
// This mirrors the production pattern: DB unavailable → graceful fallback.
vi.mock("../utils/db-helpers", () => ({
  requireDb: vi.fn(async () => {
    throw new Error("DB unavailable in test");
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ==================== delivery.list ====================

describe("m7m9.delivery.list", () => {
  it("returns fallback data with correct structure", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.m7m9.delivery.list({ page: 1, pageSize: 20 });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page", 1);
    expect(result).toHaveProperty("pageSize", 20);

    const first = result.items[0];
    expect(first).toHaveProperty("deliveryCode");
    expect(first).toHaveProperty("projectNo");
    expect(first).toHaveProperty("customerName");
    expect(first).toHaveProperty("currentStage");
    expect(first).toHaveProperty("status");
  });

  it("contains deliveries in all stages", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.m7m9.delivery.list({ page: 1, pageSize: 20 });

    const stages = result.items.map((d: any) => d.currentStage);
    expect(stages).toContain("M7_Pre_Acceptance");
    expect(stages).toContain("M10_Site_Installation");
  });
});

// ==================== delivery.getById ====================

describe("m7m9.delivery.getById", () => {
  it("returns delivery for known id", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.m7m9.delivery.getById({ id: 1 });

    expect(result).not.toBeNull();
    expect(result).toHaveProperty("deliveryCode");
  });

  it("returns null for unknown id", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.m7m9.delivery.getById({ id: 99999 });

    expect(result).toBeNull();
  });
});

// ==================== delivery.create ====================

describe("m7m9.delivery.create", () => {
  it("creates delivery with valid input", async () => {
    const caller = createAuthenticatedCaller();
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

// ==================== delivery.getStats ====================

describe("m7m9.delivery.getStats", () => {
  it("returns expected structure", async () => {
    const caller = createAuthenticatedCaller();
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
    const result = await caller.m7m9.siteIssue.list({
      page: 1,
      pageSize: 20,
    });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);

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
