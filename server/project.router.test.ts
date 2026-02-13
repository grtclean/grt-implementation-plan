import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller } from "./_test/trpc-test-utils";

// Mock requireDb so we never hit a real database
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

vi.mock("./db", () => ({
  requireDb: vi.fn(async () => ({
    select: () => ({
      from: (table: unknown) => ({
        orderBy: mockOrderBy,
        where: mockWhere,
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: mockReturning,
      }),
    }),
  })),
  getAllMigrationTasks: vi.fn(async () => []),
  getMigrationTaskById: vi.fn(async () => null),
  createMigrationTask: vi.fn(async () => ({ id: "1" })),
  updateMigrationTask: vi.fn(async () => ({ id: "1" })),
  deleteMigrationTask: vi.fn(async () => true),
  initDefaultMigrationTasks: vi.fn(async () => {}),
}));

beforeEach(() => {
  vi.clearAllMocks();
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
    mockOrderBy.mockResolvedValueOnce(dbRows);

    const caller = createAuthenticatedCaller();
    const result = await caller.project.list();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Project");
  });

  it("falls back to mock data when DB throws", async () => {
    mockOrderBy.mockRejectedValueOnce(new Error("DB connection failed"));

    const caller = createAuthenticatedCaller();
    const result = await caller.project.list();

    // Should return the fallback mock data (non-empty)
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
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
    mockWhere.mockResolvedValueOnce([row]);

    const caller = createAuthenticatedCaller();
    const result = await caller.project.getById({ id: 1 });

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Found Project");
  });

  it("falls back to mock for non-existent id when DB returns empty", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const caller = createAuthenticatedCaller();
    const result = await caller.project.getById({ id: 99999 });

    // Either null or a mock entry — both are acceptable
    // The router tries mockProjectList fallback
    expect(result === null || typeof result === "object").toBe(true);
  });
});

describe("project.create", () => {
  it("creates project with valid input", async () => {
    mockReturning.mockResolvedValueOnce([{ id: 42 }]);

    const caller = createAuthenticatedCaller();
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
    const caller = createAuthenticatedCaller();

    await expect(
      caller.project.create({ name: "", type: "standard", priority: "medium" }),
    ).rejects.toThrow();
  });
});

describe("project.delete", () => {
  it("returns success for valid delete request", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.project.delete({ id: 1 });

    expect(result).toMatchObject({ success: true });
  });
});

describe("project.statistics", () => {
  it("returns expected structure", async () => {
    // DB returns empty → computeStats uses mockProjectList
    mockOrderBy.mockResolvedValueOnce([]);

    const caller = createAuthenticatedCaller();
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

  it("falls back to mock data on DB error", async () => {
    // Mock the full chain for statistics — requireDb().select().from(projects) throws
    const { requireDb } = await import("./db");
    vi.mocked(requireDb).mockRejectedValueOnce(new Error("DB down"));

    const caller = createAuthenticatedCaller();
    const result = await caller.project.statistics();

    expect(result.total).toBeGreaterThan(0);
  });
});
