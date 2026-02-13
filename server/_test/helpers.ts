/**
 * Shared mock factories for tRPC router tests.
 *
 * Usage:
 *   import { createMockContext, createAnonymousContext, createAdminContext } from "./_test/helpers";
 */
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const baseUser: AuthenticatedUser = {
  id: 1,
  openId: "test-user-001",
  email: "test@example.com",
  name: "Test User",
  loginMethod: "manus",
  role: "user",
  languagePreference: "zh",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastSignedIn: new Date().toISOString(),
};

function createMockReq(overrides?: Partial<TrpcContext["req"]>): TrpcContext["req"] {
  return {
    protocol: "https",
    headers: {},
    ...overrides,
  } as TrpcContext["req"];
}

function createMockRes(overrides?: Partial<TrpcContext["res"]>): TrpcContext["res"] {
  return {
    clearCookie: () => {},
    ...overrides,
  } as TrpcContext["res"];
}

/**
 * Create a mock context for an authenticated regular user.
 */
export function createMockContext(
  overrides?: Partial<AuthenticatedUser>,
): TrpcContext {
  return {
    user: { ...baseUser, ...overrides },
    req: createMockReq(),
    res: createMockRes(),
  };
}

/**
 * Create a mock context for an unauthenticated request.
 */
export function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: createMockReq(),
    res: createMockRes(),
  };
}

/**
 * Create a mock context for an admin user.
 */
export function createAdminContext(
  overrides?: Partial<AuthenticatedUser>,
): TrpcContext {
  return {
    user: {
      ...baseUser,
      id: 999,
      openId: "admin-001",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      ...overrides,
    },
    req: createMockReq(),
    res: createMockRes(),
  };
}
