/**
 * Targeted Showcase Router — Unit Tests
 * Covers template CRUD, guest link management, and token-gated access
 *
 * Run: pnpm test -- server/routers/targeted-showcase.router.test.ts
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
  })),
}));

// ─── Mock schema tables ──────────────────────────────────────────────
vi.mock("../../drizzle/showcase-schema", () => ({
  showcaseTemplates: {
    id: "id",
    productType: "productType",
    title: "title",
    subtitle: "subtitle",
    description: "description",
    equipmentImages: "equipmentImages",
    operationVideos: "operationVideos",
    heroVideoUrl: "heroVideoUrl",
    taktTimeSeconds: "taktTimeSeconds",
    cleaningEfficiency: "cleaningEfficiency",
    cleanlinessStandard: "cleanlinessStandard",
    throughputPerHour: "throughputPerHour",
    powerConsumptionKw: "powerConsumptionKw",
    priceRangeMin: "priceRangeMin",
    priceRangeMax: "priceRangeMax",
    priceCurrency: "priceCurrency",
    roiMonths: "roiMonths",
    configurations: "configurations",
    technicalSpecs: "technicalSpecs",
    isActive: "isActive",
    createdBy: "createdBy",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  guestAuthorizations: {
    id: "id",
    showcaseId: "showcaseId",
    targetClient: "targetClient",
    contactPerson: "contactPerson",
    contactEmail: "contactEmail",
    welcomeMessage: "welcomeMessage",
    accessToken: "accessToken",
    expiresAt: "expiresAt",
    maxViews: "maxViews",
    viewCount: "viewCount",
    firstViewedAt: "firstViewedAt",
    lastViewedAt: "lastViewedAt",
    isRevoked: "isRevoked",
    revokedAt: "revokedAt",
    revokedReason: "revokedReason",
    createdBy: "createdBy",
    createdAt: "createdAt",
  },
}));

// ─── Import test utilities AFTER mocks ───────────────────────────────
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
});

// ═════════════════════════════════════════════════════════════════════
// 1. Template sub-router
// ═════════════════════════════════════════════════════════════════════
describe("targetedShowcase.template", () => {
  it("list returns templates with total", async () => {
    selectResultsQueue = [[{ count: 3 }]];
    mockQueryResult = [{ id: 1, title: "KLT Cleaning", productType: "KLT" }];
    const caller = createAdminCaller();
    const result = await caller.targetedShowcase.template.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with productType filter", async () => {
    selectResultsQueue = [[{ count: 1 }]];
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.targetedShowcase.template.list({ productType: "KLT" });
    expect(result).toHaveProperty("total");
  });

  it("getById returns single template", async () => {
    mockQueryResult = [{ id: 1, title: "KLT Cleaning", productType: "KLT" }];
    const caller = createAdminCaller();
    const result = await caller.targetedShowcase.template.getById({ id: 1 });
    expect(result).toHaveProperty("id", 1);
  });

  it("getById throws NOT_FOUND", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    await expect(caller.targetedShowcase.template.getById({ id: 999 })).rejects.toThrow("Template not found");
  });

  it("create inserts template", async () => {
    mockReturningResult = [{ id: 10, title: "Turbine Cleaning", productType: "Turbine" }];
    const caller = createAdminCaller();
    const result = await caller.targetedShowcase.template.create({
      productType: "Turbine",
      title: "Turbine Cleaning",
      taktTimeSeconds: 45,
      cleaningEfficiency: "99.5%",
    });
    expect(result).toHaveProperty("id", 10);
  });

  it("update modifies template", async () => {
    mockReturningResult = [{ id: 1, title: "Updated KLT" }];
    const caller = createAdminCaller();
    const result = await caller.targetedShowcase.template.update({ id: 1, title: "Updated KLT" });
    expect(result).toHaveProperty("title", "Updated KLT");
  });

  it("update throws NOT_FOUND for missing template", async () => {
    mockReturningResult = [];
    const caller = createAdminCaller();
    await expect(caller.targetedShowcase.template.update({ id: 999, title: "X" })).rejects.toThrow("Template not found");
  });

  it("delete soft-deletes template", async () => {
    mockReturningResult = [{ id: 1, isActive: false }];
    const caller = createAdminCaller();
    const result = await caller.targetedShowcase.template.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. Guest Link sub-router
// ═════════════════════════════════════════════════════════════════════
describe("targetedShowcase.guestLink", () => {
  it("generateGuestLink creates a token", async () => {
    // First select: template exists
    selectResultsQueue = [[{ id: 1, title: "KLT" }]];
    mockReturningResult = [{
      id: 5,
      accessToken: "abc123",
      expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
      targetClient: "Schaeffler",
    }];
    const caller = createAdminCaller();
    const result = await caller.targetedShowcase.guestLink.generateGuestLink({
      showcaseId: 1,
      targetClient: "Schaeffler",
      expiresInHours: 48,
    });
    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("guestUrl");
    expect(result.targetClient).toBe("Schaeffler");
  });

  it("generateGuestLink fails for missing template", async () => {
    selectResultsQueue = [[]]; // no template
    const caller = createAdminCaller();
    await expect(
      caller.targetedShowcase.guestLink.generateGuestLink({
        showcaseId: 999,
        targetClient: "Test",
      }),
    ).rejects.toThrow("Template not found or inactive");
  });

  it("listAuthorizations returns sanitized results", async () => {
    selectResultsQueue = [[{ count: 2 }]];
    mockQueryResult = [
      { id: 1, targetClient: "Schaeffler", accessToken: "abcdef1234567890abcdef1234567890", viewCount: 5, expiresAt: "2026-04-01", isRevoked: false },
    ];
    const caller = createAdminCaller();
    const result = await caller.targetedShowcase.guestLink.listAuthorizations();
    expect(result.items[0]).toHaveProperty("tokenPreview");
    expect(result.items[0]).not.toHaveProperty("accessToken");
  });

  it("revokeLink marks link as revoked", async () => {
    mockReturningResult = [{ id: 1, isRevoked: true }];
    const caller = createAdminCaller();
    const result = await caller.targetedShowcase.guestLink.revokeLink({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("revokeLink throws NOT_FOUND for missing auth", async () => {
    mockReturningResult = [];
    const caller = createAdminCaller();
    await expect(caller.targetedShowcase.guestLink.revokeLink({ id: 999 })).rejects.toThrow("Authorization not found");
  });

  it("getAnalytics returns aggregated stats", async () => {
    selectResultsQueue = [
      [{ count: 10 }], // totalLinks
      [{ count: 5 }],  // activeLinks
      [{ sum: 42 }],   // totalViews
    ];
    const caller = createAdminCaller();
    const result = await caller.targetedShowcase.guestLink.getAnalytics();
    expect(result).toHaveProperty("totalLinks");
    expect(result).toHaveProperty("activeLinks");
    expect(result).toHaveProperty("totalViews");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. Guest (public, token-gated) sub-router
// ═════════════════════════════════════════════════════════════════════
describe("targetedShowcase.guest", () => {
  it("getShowcaseByToken returns showcase data for valid token", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    selectResultsQueue = [
      // 1st select: auth record
      [{
        id: 1,
        showcaseId: 1,
        targetClient: "Schaeffler",
        welcomeMessage: "GRT for Schaeffler KLT",
        accessToken: "validtoken",
        expiresAt: futureDate,
        maxViews: 100,
        viewCount: 3,
        isRevoked: false,
        firstViewedAt: null,
      }],
      // 2nd select: template
      [{
        id: 1,
        productType: "KLT",
        title: "KLT Cleaning Solution",
        subtitle: "Advanced ultrasonic",
        isActive: true,
        taktTimeSeconds: "45.00",
        cleaningEfficiency: "99.7%",
        equipmentImages: [],
        configurations: [],
        technicalSpecs: {},
      }],
    ];
    const caller = createAnonymousCaller();
    const result = await caller.targetedShowcase.guest.getShowcaseByToken({ token: "validtoken" });
    expect(result).toHaveProperty("targetClient", "Schaeffler");
    expect(result).toHaveProperty("title", "KLT Cleaning Solution");
    expect(result).toHaveProperty("expiresAt");
    expect(result.viewCount).toBe(4); // incremented
  });

  it("getShowcaseByToken returns FORBIDDEN for invalid token", async () => {
    selectResultsQueue = [[]]; // no auth record
    const caller = createAnonymousCaller();
    await expect(
      caller.targetedShowcase.guest.getShowcaseByToken({ token: "invalidtoken" }),
    ).rejects.toThrow("Invalid or expired access link");
  });

  it("getShowcaseByToken returns FORBIDDEN for expired token", async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    selectResultsQueue = [
      [{
        id: 1, showcaseId: 1, targetClient: "Test",
        accessToken: "expiredtoken", expiresAt: pastDate,
        viewCount: 1, isRevoked: false, maxViews: 100,
      }],
    ];
    const caller = createAnonymousCaller();
    await expect(
      caller.targetedShowcase.guest.getShowcaseByToken({ token: "expiredtoken" }),
    ).rejects.toThrow("expired");
  });

  it("getShowcaseByToken returns FORBIDDEN for revoked token", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    selectResultsQueue = [
      [{
        id: 1, showcaseId: 1, targetClient: "Test",
        accessToken: "revokedtoken", expiresAt: futureDate,
        viewCount: 1, isRevoked: true, maxViews: 100,
      }],
    ];
    const caller = createAnonymousCaller();
    await expect(
      caller.targetedShowcase.guest.getShowcaseByToken({ token: "revokedtoken" }),
    ).rejects.toThrow("revoked");
  });

  it("getShowcaseByToken returns FORBIDDEN for max-view-exceeded token", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    selectResultsQueue = [
      [{
        id: 1, showcaseId: 1, targetClient: "Test",
        accessToken: "maxedtoken", expiresAt: futureDate,
        viewCount: 100, isRevoked: false, maxViews: 100,
      }],
    ];
    const caller = createAnonymousCaller();
    await expect(
      caller.targetedShowcase.guest.getShowcaseByToken({ token: "maxedtoken" }),
    ).rejects.toThrow("Maximum view count reached");
  });
});
