import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { TRPCError } from "@trpc/server";
import { permissionService } from "../permission-management/permission.service";

// Re-export t from trpc-base (single initialization point — avoids circular deps)
export { t } from "./trpc-base";
import { t } from "./trpc-base";

// Gateway middleware
import { gatewayAuditMiddleware } from "./gateway-audit.middleware";
import { buContextMiddleware } from "./gateway-bu-context.middleware";

export const router = t.router;

/**
 * publicProcedure — audit middleware applied to ALL requests.
 * Logs unauthenticated access to non-whitelisted endpoints.
 * BU context is injected for data isolation.
 */
export const publicProcedure = t.procedure
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

export const protectedProcedure = publicProcedure.use(requireUser);

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

/**
 * safeMutation middleware — wraps mutations in uniform error handling.
 * Catches any thrown error, logs it, and re-throws as a typed TRPCError
 * so the frontend always receives { code, message } instead of raw 500s.
 */
export const safeMutationMiddleware = t.middleware(async ({ ctx, next, type }) => {
  if (type !== 'mutation') return next({ ctx });
  try {
    return await next({ ctx });
  } catch (err) {
    // Already a TRPCError — re-throw as-is
    if (err instanceof TRPCError) throw err;

    const message = err instanceof Error ? err.message : 'Unknown mutation error';
    console.error(`[safeMutation] ${message}`);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message,
      cause: err,
    });
  }
});

/** Protected procedure with uniform mutation error handling */
export const safeMutationProcedure = protectedProcedure.use(safeMutationMiddleware);

export function requirePermission(permissionCode: string) {
  return protectedProcedure.use(
    t.middleware(async ({ ctx, next }) => {
      // Admin fallback: admin role always passes
      if (ctx.user.role === 'admin') {
        return next({ ctx });
      }

      const ok = await safeCheckPermission(String(ctx.user.id), permissionCode);
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
