/**
 * Gateway Audit Middleware — API Contract-First
 *
 * Intercepts ALL tRPC requests:
 * 1. Logs endpoint path + userId + timestamp (when GATEWAY_AUDIT=true)
 * 2. Warns on unauthenticated access to non-whitelisted endpoints
 * 3. Phase 2: can switch to BLOCK mode for production enforcement
 */

import { t } from "./trpc-base";
import { TRPCError } from "@trpc/server";

/**
 * Whitelist: only these endpoints are allowed without authentication.
 * Everything else should be accessed via protectedProcedure.
 */
export const PUBLIC_ALLOWLIST = new Set([
  // Health / system
  "health.check",
  "echo.query",
  "system.getVersion",

  // Auth flow — must be public by definition
  "auth.login",
  "auth.register",
  "auth.refreshToken",
  "auth.loginLocal",
  "auth.registerLocal",

  // Public help content
  "help.listArticles",
  "help.getArticle",
  "help.listCategories",
]);

/**
 * Audit middleware — applied to the base `publicProcedure`.
 *
 * In audit mode (GATEWAY_AUDIT=true) every request is logged.
 * Unauthenticated access to non-whitelisted endpoints produces a WARNING log.
 * When GATEWAY_ENFORCE=true, unauthenticated non-whitelisted calls are BLOCKED.
 */
export const gatewayAuditMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const userId = ctx.user?.id ?? "anonymous";
  const endpoint = `${path}.${type}`;

  // Audit log (all requests)
  if (process.env.GATEWAY_AUDIT === "true") {
    console.log(
      `[GATEWAY] ${endpoint} | user=${userId} | role=${ctx.user?.role ?? "none"} | ${new Date().toISOString()}`
    );
  }

  // Admin audit — record all admin operations for accountability
  if (ctx.user?.role === "admin" && process.env.GATEWAY_AUDIT === "true") {
    console.log(
      `[GATEWAY:ADMIN] ${endpoint} | admin=${ctx.user.id} | ${new Date().toISOString()}`
    );
  }

  // Unauthenticated access to non-whitelisted endpoint
  if (!ctx.user && !PUBLIC_ALLOWLIST.has(endpoint)) {
    console.warn(`[GATEWAY:WARN] Unauthenticated access to ${endpoint}`);

    // Enforcement mode — block unauthenticated access
    if (process.env.GATEWAY_ENFORCE === "true") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
  }

  return next({ ctx });
});
