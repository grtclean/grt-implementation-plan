/**
 * Gateway Audit Middleware — API Contract-First
 *
 * Intercepts ALL tRPC requests:
 * 1. Logs endpoint path + userId + timestamp (always enabled)
 * 2. Blocks unauthenticated access to non-whitelisted endpoints (GATEWAY_ENFORCE=true by default)
 * 3. Persists admin operations to sys_audit_logs table for accountability
 */

import { t } from "./trpc-base";
import { TRPCError } from "@trpc/server";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("gateway");

/**
 * Whitelist: only these endpoints are allowed without authentication.
 * Everything else should be accessed via protectedProcedure.
 */
export const PUBLIC_ALLOWLIST = new Set([
  // Health / system
  "health.check.query",
  "echo.query.query",
  "system.getVersion.query",

  // Auth flow — must be public by definition
  "auth.login.mutation",
  "auth.register.mutation",
  "auth.refreshToken.mutation",
  "auth.loginLocal.mutation",
  "auth.registerLocal.mutation",
  "auth.me.query",

  // Public help content (all read-only queries)
  "help.listArticles.query",
  "help.getArticle.query",
  "help.listCategories.query",
  "help.getContextualHelp.query",
  "help.searchHelp.query",
  "help.getCategories.query",
  "help.getPopularArticles.query",
  "help.getChangelog.query",
  "help.getWalkthroughs.query",

  // Robot cleaning showroom — public customer demo endpoints
  "robotCleaning.showroom.getDemoData.query",
  "robotCleaning.showroom.getParameterCurves.query",
  "robotCleaning.showroom.getAdaptiveHistory.query",
  "robotCleaning.showroom.getKpiOverview.query",
  "robotCleaning.showroom.getDemoCleaningPipeline.query",
  "robotCleaning.showroom.getDemoInlineQC.query",
  "robotCleaning.showroom.getDemoAIDecisions.query",

  // Targeted showcase — token-gated guest access (validated inside procedure)
  "targetedShowcase.guest.getShowcaseByToken.query",

  // Customer portal — public login + post-login profile/reading (credential-gated inside procedure)
  "customerConfigSandbox.portalUser.verifyCredentials.mutation",
  "customerConfigSandbox.portalUser.portalGetProfile.query",
  "customerConfigSandbox.portalUser.portalGetReadingChannels.query",
]);

/**
 * Persist admin audit log to sys_audit_logs table (fire-and-forget).
 * Uses dynamic import to avoid circular dependency.
 */
async function persistAuditLog(entry: {
  entityType: string;
  action: string;
  actorId: number;
  actorName: string;
  newData?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { requireDb } = await import("../db");
    const { sysAuditLogs } = await import("../../drizzle/governance-schema");
    const db = await requireDb();
    await db.insert(sysAuditLogs).values({
      entityType: entry.entityType,
      action: entry.action as any,
      actorId: entry.actorId,
      actorName: entry.actorName,
      newData: entry.newData,
    });
  } catch (err) {
    // Fire-and-forget — don't block the request
    log.error({ err }, "Failed to persist audit log");
  }
}

/**
 * Audit middleware — applied to the base `publicProcedure`.
 *
 * - All requests are logged (console).
 * - Admin operations are persisted to sys_audit_logs (P0-3 fix).
 * - GATEWAY_ENFORCE defaults to "true" — unauthenticated non-whitelisted calls are BLOCKED.
 *   Set GATEWAY_ENFORCE=false to revert to WARN-only mode.
 */
export const gatewayAuditMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const userId = ctx.user?.id ?? "anonymous";
  const endpoint = `${path}.${type}`;
  const timestamp = new Date().toISOString();

  // Audit log (all requests)
  log.info({ endpoint, userId, role: ctx.user?.role ?? "none" }, "API request");

  // Admin audit — persist to DB for accountability (P0-3 fix)
  if (ctx.user?.role === "admin") {
    log.info({ endpoint, adminId: ctx.user.id }, "Admin API access");
    // Fire-and-forget: persist to sys_audit_logs
    persistAuditLog({
      entityType: "gateway_admin_access",
      action: "VIEW",
      actorId: ctx.user.id,
      actorName: ctx.user.name ?? `admin#${ctx.user.id}`,
      newData: { endpoint, type, timestamp },
    });
  }

  // Unauthenticated access to non-whitelisted endpoint
  if (!ctx.user && !PUBLIC_ALLOWLIST.has(endpoint)) {
    log.warn({ endpoint }, "Unauthenticated access attempt");

    // Enforcement mode — default to BLOCK (P0-2 fix)
    // Set GATEWAY_ENFORCE=false to disable blocking (development only)
    const enforceMode = process.env.GATEWAY_ENFORCE !== "false";
    if (enforceMode) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
  }

  return next({ ctx });
});
