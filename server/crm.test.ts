import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB so tests never hit a real database
vi.mock("./db", async (importOriginal) => {
  const orig = await importOriginal<Record<string, any>>();
  return {
    ...orig,
    getDb: vi.fn(async () => null),
    requireDb: vi.fn(async () => { throw new Error("DB unavailable in test"); }),
    getAllMigrationTasks: vi.fn(async () => []),
    getMigrationTaskById: vi.fn(async () => null),
    createMigrationTask: vi.fn(async () => ({ id: 1 })),
    updateMigrationTask: vi.fn(async () => ({ id: 1 })),
    deleteMigrationTask: vi.fn(async () => true),
    initDefaultMigrationTasks: vi.fn(async () => {}),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {} as any,
    res: {} as any,
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {} as any,
    res: {} as any,
  };
}

describe("CRM API", () => {
  describe("customers", () => {
    it("requires authentication for list", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.crm.customers.list({})).rejects.toThrow();
    });

    it("rejects list when DB is unavailable", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      await expect(caller.crm.customers.list({})).rejects.toThrow();
    });

    it("rejects create when DB is unavailable", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      await expect(
        caller.crm.customers.create({
          name: "Test Customer " + Date.now(),
          type: "prospect",
          level: "B",
        })
      ).rejects.toThrow();
    });
  });

  describe("contacts", () => {
    it("requires authentication for list", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.crm.contacts.list({})).rejects.toThrow();
    });
  });

  describe("opportunities", () => {
    it("requires authentication for list", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.crm.opportunities.list({})).rejects.toThrow();
    });
  });
});

describe("Dev Tasks API", () => {
  it("requires authentication for list", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.devTasks.list({})).rejects.toThrow();
  });

  it("returns empty list when DB is unavailable", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.devTasks.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects create when DB is unavailable", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.devTasks.create({
        title: "Test Task " + Date.now(),
        version: "v1.1",
        module: "crm",
        type: "feature",
        priority: "medium",
      })
    ).rejects.toThrow();
  });

  it("rejects update when DB is unavailable", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.devTasks.update({
        id: 1,
        status: "in_progress",
      })
    ).rejects.toThrow();
  });
});
