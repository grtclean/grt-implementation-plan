import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { TRPCError } from "@trpc/server";
import { permissionService } from "../permission-management/permission.service";

// Re-export t from trpc-base (single initialization point — avoids circular deps)
export { t } from "./trpc-base";
import { t } from "./trpc-base";

// Gateway middleware
import { gatewayAuditMiddleware } from "./gateway-audit.middleware";
import { buContextMiddleware } from "./gateway-bu-context.middleware";

// Rate limiting
import { createRateLimitMiddleware, RATE_LIMIT_PRESETS } from "../security/rateLimit";

// Mutation auto-audit
import { createAuditMiddleware } from "./audit-middleware";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("trpc");

export const router = t.router;

/**
 * Global rate limit middleware — 100 req/min per user/IP.
 * Applied to ALL procedures via publicProcedure chain.
 */
const globalRateLimitMiddleware = t.middleware(createRateLimitMiddleware(RATE_LIMIT_PRESETS.global));

/**
 * publicProcedure — rate limit + audit + BU context applied to ALL requests.
 */
export const publicProcedure = t.procedure
  .use(globalRateLimitMiddleware)
  .use(gatewayAuditMiddleware)
  .use(buContextMiddleware);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * safeMutation middleware — wraps mutations in uniform error handling.
 * Catches any thrown error, logs it, and re-throws as a typed TRPCError
 * so the frontend always receives { code, message } instead of raw 500s.
 *
 * Applied globally to protectedProcedure — all 1000+ mutations are covered.
 */
export const safeMutationMiddleware = t.middleware(async ({ ctx, next, type }) => {
  if (type !== 'mutation') return next({ ctx });
  try {
    return await next({ ctx });
  } catch (err) {
    // Already a TRPCError — re-throw as-is
    if (err instanceof TRPCError) throw err;

    const message = err instanceof Error ? err.message : 'Unknown mutation error';

    // GRT开发第一定律: DB conflicts → 409 CONFLICT, never 500
    if (isDbConflictError(err)) {
      log.warn(`[safeMutation] DB conflict: ${message}`);
      throw new TRPCError({
        code: 'CONFLICT',
        message: `数据冲突 / Data conflict: ${message}`,
        cause: err,
      });
    }

    log.error(`[safeMutation] ${message}`);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message,
      cause: err,
    });
  }
});

/**
 * Detect PostgreSQL unique constraint / serialization / deadlock errors.
 * Maps to HTTP 409 instead of 500.
 */
function isDbConflictError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as any).code;
  // PostgreSQL error codes:
  // 23505 = unique_violation
  // 40001 = serialization_failure
  // 40P01 = deadlock_detected
  return code === '23505' || code === '40001' || code === '40P01';
}

/**
 * Mutation auto-audit middleware — fire-and-forget logging of all mutations.
 */
const mutationAuditMiddleware = createAuditMiddleware(t);

/**
 * Customer route guard — blocks customer users from accessing internal-only routers.
 * Uses CUSTOMER_BLOCKED_ROUTERS from shared/customer-access.ts.
 */
import { isCustomerUser, CUSTOMER_BLOCKED_ROUTERS } from "@shared/customer-access";

const customerRouteGuard = t.middleware(async ({ ctx, next, path }) => {
  if (!ctx.user) return next({ ctx });

  // Only restrict customer users
  const user = ctx.user as any;
  if (!isCustomerUser({ userType: user.userType, effectiveRole: user.effectiveRole })) {
    return next({ ctx });
  }

  // Check if the router prefix is blocked
  const routerPrefix = path.split(".")[0];
  if (CUSTOMER_BLOCKED_ROUTERS.has(routerPrefix)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "该模块暂未对客户账户开放 / This module is not available for customer accounts",
    });
  }

  return next({ ctx });
});

/**
 * Compliance commitment gateway — blocks all business routes if the user
 * has not signed the monthly self-discipline commitment.
 *
 * Exempt paths (checked via tRPC procedure path prefix):
 *   - securityCompliance.checkMonthlyCommitment
 *   - securityCompliance.signCommitment
 *   - auth.*
 *   - health
 *
 * Uses an in-memory LRU cache (userId+period → signed) to avoid hitting DB
 * on every request.  Cache entry lives for 5 minutes.
 */
const commitmentCache = new Map<string, { signed: boolean; ts: number }>();
const CACHE_TTL = 5 * 60_000; // 5 minutes

const commitmentGateway = t.middleware(async ({ ctx, next, path }) => {
  // Skip in test environment — compliance checking shouldn't block unit tests
  if (process.env.VITEST) return next({ ctx });

  // Exempt paths: security commitment routes, auth, health, bootstrap
  const exemptPrefixes = [
    "securityCompliance.checkMonthlyCommitment",
    "securityCompliance.signCommitment",
    "securityCompliance.logAuditEvent",
    "auth.",
    "health",
    "echo",
    "goLive.readiness.seedFoundationData",
    "goLive.readiness.getReadinessScorecard",
    "goLive.readiness.getBlockers",
  ];
  if (exemptPrefixes.some(p => path.startsWith(p))) {
    return next({ ctx });
  }

  // Only enforce on authenticated users
  if (!ctx.user) return next({ ctx });

  // Admin bypass — admins are always allowed through
  if (ctx.user.role === 'admin') return next({ ctx });

  // Launch phase bypass — temporarily skip commitment check during system rollout
  // TODO: Remove after 2026-Q2 when all employees have been trained on commitment signing
  if (process.env.COMMITMENT_ENFORCE !== 'true') return next({ ctx });

  // Customer bypass — customer users don't sign employee compliance commitments
  if (isCustomerUser(ctx.user as any)) return next({ ctx });

  const period = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const cacheKey = `${ctx.user.id}:${period}`;
  const cached = commitmentCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    if (cached.signed) return next({ ctx });
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "需先签署本月自律承诺书 / Monthly compliance commitment required",
    });
  }

  // Check DB
  try {
    const { requireDb } = await import("../db");
    const db = await requireDb();
    const { complianceCommitments } = await import("../../drizzle/security-compliance-schema");
    const { eq, and } = await import("drizzle-orm");

    const [record] = await db.select({ id: complianceCommitments.id })
      .from(complianceCommitments)
      .where(and(
        eq(complianceCommitments.userId, ctx.user.id),
        eq(complianceCommitments.period, period),
        eq(complianceCommitments.isAgreed, true),
      ))
      .limit(1);

    const signed = !!record;
    commitmentCache.set(cacheKey, { signed, ts: Date.now() });

    // Evict old cache entries (simple size cap)
    if (commitmentCache.size > 10_000) {
      const oldest = commitmentCache.keys().next().value;
      if (oldest) commitmentCache.delete(oldest);
    }

    if (!signed) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "需先签署本月自律承诺书 / Monthly compliance commitment required",
      });
    }
  } catch (err) {
    // If it's already our TRPCError, re-throw
    if (err instanceof TRPCError) throw err;
    // If DB is unavailable, let the request through (fail-open for availability)
    log.warn({ err }, "[commitmentGateway] DB check failed, allowing request");
  }

  return next({ ctx });
});

/**
 * protectedProcedure — requires authenticated user + mutation error handling + auto-audit + compliance commitment.
 * All mutations automatically get try-catch wrapping via safeMutationMiddleware,
 * and are recorded to sys_audit_logs via mutationAuditMiddleware.
 * Compliance commitment gateway blocks business routes if unsigned.
 */
export const protectedProcedure = publicProcedure
  .use(requireUser)
  .use(customerRouteGuard)
  .use(safeMutationMiddleware)
  .use(mutationAuditMiddleware)
  .use(commitmentGateway);

/** Legacy alias — protectedProcedure now includes safeMutation globally */
export const safeMutationProcedure = protectedProcedure;

export const adminProcedure = publicProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Safe permission check — wraps permissionService.checkPermission in try/catch.
 * Returns false if DB is unavailable (admins still pass via fallback above).
 */
async function safeCheckPermission(userId: string, permissionCode: string): Promise<boolean> {
  try {
    return await permissionService.checkPermission(userId, permissionCode);
  } catch {
    return false;
  }
}

export function requirePermission(permissionCode: string) {
  return protectedProcedure.use(
    t.middleware(async ({ ctx, next }) => {
      // Admin fallback: admin role always passes
      if (ctx.user!.role === 'admin') {
        return next({ ctx });
      }

      const ok = await safeCheckPermission(ctx.user!.openId || String(ctx.user!.id), permissionCode);
      if (!ok) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Missing permission: ${permissionCode}`,
        });
      }

      return next({ ctx });
    })
  );
}

// ── OEM API Key Authentication ──────────────────────────────
// Separate auth path for external B2B clients using API keys.
// Branches from publicProcedure (no session required).

import { createHash } from "crypto";

export type OemClientContext = {
  clientId: number;
  scopes: string[];
  keyId: number;
  rateLimitPerHour: number;
};

function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

const oemApiKeyMiddleware = t.middleware(async ({ ctx, next }) => {
  const apiKey = ctx.req.headers["x-api-key"];
  if (!apiKey || typeof apiKey !== "string") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "API key required (x-api-key header)" });
  }

  const keyHash = hashApiKey(apiKey);

  const { requireDb } = await import("../db");
  const db = await requireDb();
  const { oemApiKeys } = await import("../../drizzle/oem-portal-schema");
  const { eq, and } = await import("drizzle-orm");

  const [keyRecord] = await db.select().from(oemApiKeys)
    .where(and(eq(oemApiKeys.keyHash, keyHash), eq(oemApiKeys.status, "active")))
    .limit(1);

  if (!keyRecord) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired API key" });
  }

  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "API key has expired" });
  }

  // Fire-and-forget: update last_used_at
  db.update(oemApiKeys).set({ lastUsedAt: new Date() }).where(eq(oemApiKeys.id, keyRecord.id)).catch(() => {});

  const oemClient: OemClientContext = {
    clientId: keyRecord.clientId,
    scopes: (keyRecord.scopes as string[]) || [],
    keyId: keyRecord.id,
    rateLimitPerHour: keyRecord.rateLimitPerHour,
  };

  return next({ ctx: { ...ctx, oemClient } });
});

export const oemApiProcedure = publicProcedure.use(oemApiKeyMiddleware);

export function requireOemScope(scope: string) {
  return oemApiProcedure.use(
    t.middleware(async ({ ctx, next }) => {
      const oemClient = (ctx as any).oemClient as OemClientContext;
      if (!oemClient?.scopes?.includes(scope)) {
        throw new TRPCError({ code: "FORBIDDEN", message: `Missing scope: ${scope}` });
      }
      return next({ ctx });
    })
  );
}
