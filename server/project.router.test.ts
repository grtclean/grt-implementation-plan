import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller, createAdminCaller } from "./_test/trpc-test-utils";

// Mock requireDb so we never hit a real database
// Default result for queries — can be overridden per-test via mockQueryResult
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];

const createMockDbChain = () => {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.and = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.returning = vi.fn(async () => mockReturningResult);
  // Make chain thenable so await db.select().from(x).where(y) resolves
  chain.then = (resolve: any, reject?: any) => {
    try { resolve(mockQueryResult); } catch (e) { reject?.(e); }
  };
  return chain;
};

vi.mock("./db", () => ({
  requireDb: vi.fn(async () => {
    const chain = createMockDbChain();
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
});

describe("project.list", () => {
  it("returns DB data when available", async () => {
    const dbRows = [
      {
        id: 10,
        projectCode: "PRJ-2026-000001",
        name: "Test Project",
        shortName: null,
        type: "standard",
        priority: "medium",
        status: "active",
        currentPhase: "M0",
        budget: 100000,
        actualCost: 0,
        completionPercent: 0,
        description: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    mockQueryResult = dbRows;

    const caller = createAdminCaller();
    const result = await caller.project.list();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Project");
  });

  it("throws when DB is unavailable", async () => {
    const { requireDb } = await import("./db");
    vi.mocked(requireDb).mockRejectedValueOnce(new Error("DB connection failed"));

    const caller = createAdminCaller();
    await expect(caller.project.list()).rejects.toThrow();
  });
});

describe("project.getById", () => {
  it("returns project when found in DB", async () => {
    const row = {
      id: 1,
      projectCode: "PRJ-2026-000001",
      name: "Found Project",
      shortName: null,
      type: "standard",
      priority: "medium",
      status: "draft",
      currentPhase: "M0",
      budget: null,
      actualCost: null,
      completionPercent: null,
      description: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockQueryResult = [row];

    const caller = createAdminCaller();
    const result = await caller.project.getById({ id: 1 });

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Found Project");
  });

  it("returns null for non-existent id when DB returns empty", async () => {
    mockQueryResult = [];

    const caller = createAdminCaller();
    const result = await caller.project.getById({ id: 99999 });

    expect(result).toBeNull();
  });
});

describe("project.create", () => {
  it("creates project with valid input", async () => {
    mockReturningResult = [{ id: 42 }];

    const caller = createAdminCaller();
    const result = await caller.project.create({
      name: "New Project",
      type: "standard",
      priority: "high",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe(42);
    expect(result.projectCode).toMatch(/^PRJ-\d{4}-\d{6}$/);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = createAnonymousCaller();

    await expect(
      caller.project.create({ name: "Unauthorized", type: "standard", priority: "medium" }),
    ).rejects.toThrow();
  });

  it("rejects empty name via Zod validation", async () => {
    const caller = createAdminCaller();

    await expect(
      caller.project.create({ name: "", type: "standard", priority: "medium" }),
    ).rejects.toThrow();
  });
});

describe("project.delete", () => {
  it("returns success for valid delete request", async () => {
    mockReturningResult = [{ id: 1 }];
    const caller = createAdminCaller();
    const result = await caller.project.delete({ id: 1 });

    expect(result).toMatchObject({ success: true });
  });
});

describe("project.statistics", () => {
  it("returns expected structure", async () => {
    mockQueryResult = [];

    const caller = createAdminCaller();
    const result = await caller.project.statistics();

    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("byStatus");
    expect(result.byStatus).toHaveProperty("draft");
    expect(result.byStatus).toHaveProperty("active");
    expect(result.byStatus).toHaveProperty("completed");
    expect(result).toHaveProperty("byType");
    expect(result).toHaveProperty("byPriority");
    expect(result).toHaveProperty("totalBudget");
    expect(typeof result.total).toBe("number");
  });

  it("throws when DB is unavailable", async () => {
    const { requireDb } = await import("./db");
    vi.mocked(requireDb).mockRejectedValueOnce(new Error("DB down"));

    const caller = createAdminCaller();
    await expect(caller.project.statistics()).rejects.toThrow();
  });
});
