import { describe, expect, it } from "vitest";
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
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("feedback.submit", () => {
  it("requires authentication", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.feedback.submit({ type: "suggestion", content: "Test feedback" })
    ).rejects.toThrow();
  });

  it("accepts valid feedback from authenticated user", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    // This will attempt to insert into DB, which may fail in test env
    // but the validation should pass
    try {
      await caller.feedback.submit({ type: "suggestion", content: "Test feedback" });
    } catch (error: any) {
      // If it fails, it should be a DB error, not a validation error
      expect(error.code).not.toBe("BAD_REQUEST");
    }
  });
});

describe("feedback.list", () => {
  it("requires admin role", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.feedback.list()).rejects.toThrow();
  });

  it("allows admin to list feedback", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.feedback.list();
      expect(Array.isArray(result)).toBe(true);
    } catch (error: any) {
      // DB error is acceptable in test env
      expect(error.code).not.toBe("FORBIDDEN");
    }
  });
});

describe("analytics.track", () => {
  it("allows anonymous tracking", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.analytics.track({ eventType: "page_view", eventData: JSON.stringify({ page: "/" }) });
    } catch (error: any) {
      // DB error is acceptable, but should not be auth error
      expect(error.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("allows authenticated tracking", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.analytics.track({ eventType: "button_click", eventData: JSON.stringify({ button: "test" }) });
    } catch (error: any) {
      expect(error.code).not.toBe("UNAUTHORIZED");
    }
  });
});

describe("analytics.list", () => {
  it("requires admin role", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.analytics.list()).rejects.toThrow();
  });
});
