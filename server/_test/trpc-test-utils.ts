/**
 * tRPC Caller convenience functions for router tests.
 *
 * Usage:
 *   import { createAuthenticatedCaller, createAnonymousCaller } from "./_test/trpc-test-utils";
 *
 *   const caller = createAuthenticatedCaller();
 *   const result = await caller.project.list();
 */
import { appRouter } from "../routers";
import {
  createMockContext,
  createAnonymousContext,
  createAdminContext,
} from "./helpers";

type AuthenticatedUser = NonNullable<
  Parameters<typeof createMockContext>[0]
>;

/**
 * Create a tRPC caller with an authenticated regular-user context.
 */
export function createAuthenticatedCaller(overrides?: Partial<AuthenticatedUser>) {
  return appRouter.createCaller(createMockContext(overrides));
}

/**
 * Create a tRPC caller with an unauthenticated context.
 */
export function createAnonymousCaller() {
  return appRouter.createCaller(createAnonymousContext());
}

/**
 * Create a tRPC caller with an admin context.
 */
export function createAdminCaller(overrides?: Partial<AuthenticatedUser>) {
  return appRouter.createCaller(createAdminContext(overrides));
}
