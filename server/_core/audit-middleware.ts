/**
 * Mutation Auto-Audit Middleware
 *
 * Automatically logs all mutation calls to sys_audit_logs.
 * Fire-and-forget: DB write runs asynchronously — never blocks the response.
 */

import { sysAuditLogs } from "../../drizzle/governance-schema";

/**
 * Creates a tRPC middleware that records mutation invocations to the audit log.
 * Should be attached to protectedProcedure so ctx.user is guaranteed.
 */
export function createAuditMiddleware(tInstance: any) {
  return tInstance.middleware(async ({ ctx, next, type, path, rawInput }: any) => {
    // Only audit mutations; skip in test environment
    if (type !== "mutation" || process.env.NODE_ENV === "test" || process.env.VITEST) return next({ ctx });

    const result = await next({ ctx });

    // Fire-and-forget: log asynchronously, never block the response
    try {
      const db = (await import("../db")).requireDb();
      const resolvedDb = await db;
      resolvedDb.insert(sysAuditLogs).values({
        entityType: path ?? "unknown",
        action: "UPDATE",
        actorId: ctx.user?.id ? Number(ctx.user.id) : undefined,
        actorName: ctx.user?.name ?? ctx.user?.openId ?? "system",
        newData: typeof rawInput === "object" ? rawInput : { input: rawInput },
        ipAddress: ctx.ip ?? undefined,
        metadata: { route: path, type: "mutation-auto-audit" },
      }).then(() => {}).catch(() => {});
    } catch {
      // Never throw from audit — it's non-critical
    }

    return result;
  });
}
