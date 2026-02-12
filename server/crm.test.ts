import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

    it("allows authenticated user to list customers", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const result = await caller.crm.customers.list({});
      expect(Array.isArray(result)).toBe(true);
    });

    it("allows authenticated user to create customer", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const customer = await caller.crm.customers.create({
        name: "Test Customer " + Date.now(),
        type: "prospect",
        level: "B",
      });
      // createCustomer returns { id, customerCode }
      expect(customer).toHaveProperty("id");
      expect(customer).toHaveProperty("customerCode");
      expect(typeof customer.id).toBe("number");
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

  it("allows authenticated user to list tasks", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.devTasks.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows authenticated user to create task", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const task = await caller.devTasks.create({
      title: "Test Task " + Date.now(),
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "medium",
    });
    // createDevTask returns { id, taskCode }
    expect(task).toHaveProperty("id");
    expect(task).toHaveProperty("taskCode");
    expect(typeof task.id).toBe("number");
  });

  it("allows authenticated user to update task status", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    // First create a task
    const task = await caller.devTasks.create({
      title: "Task to Update " + Date.now(),
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "medium",
    });
    
    // Then update its status
    const updated = await caller.devTasks.update({
      id: task.id,
      status: "in_progress",
    });
    // updateDevTask returns { success: true }
    expect(updated).toHaveProperty("success");
    expect(updated.success).toBe(true);
  });
});
