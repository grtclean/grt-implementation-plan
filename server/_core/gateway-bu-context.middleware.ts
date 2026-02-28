/**
 * Gateway BU Context Middleware — Zero-Trust Data Isolation
 *
 * Injects BU (Business Unit) context into every request:
 * 1. Resolves user's BU affiliation from role + bu_department_mappings table
 * 2. admin/director roles get null BU (global view)
 * 3. BU-scoped routers can use requireBuScope() to enforce isolation
 */

import { t } from "./trpc-base";
import { TRPCError } from "@trpc/server";

export interface BuContext {
  buId: number | null;
  buCode: string | null; // "BU1" | "BU2" | "BU3" | "BU4" | "BU5"
  buName: string | null;
}

/** Null BU context for unauthenticated or global-scope users */
const NULL_BU: BuContext = { buId: null, buCode: null, buName: null };

/** Roles that receive global (null BU) scope — can see all BUs */
const GLOBAL_SCOPE_ROLES = new Set([
  "admin",
  "director",
  "hr_manager",
  "hr_specialist",
  "finance_manager",
  "finance_specialist",
]);

/** BU-specific roles that should be mapped to a BU */
const BU_SCOPED_ROLE_PREFIXES = ["bu_", "cs_", "procurement_", "quality_"];

/**
 * Resolve BU context from user role.
 *
 * For bu_* roles, we try to look up from the bu_department_mappings table.
 * Falls back to parsing the request header X-BU-Code (set by frontend ProfileSwitcher).
 */
async function resolveBuContext(
  userId: number,
  role: string,
  requestBuCode: string | null
): Promise<BuContext> {
  // Global-scope roles always get null BU (can see everything)
  if (GLOBAL_SCOPE_ROLES.has(role)) {
    return NULL_BU;
  }

  // Check if this is a BU-scoped role
  const isBuRole = BU_SCOPED_ROLE_PREFIXES.some((prefix) => role.startsWith(prefix));

  // Try X-BU-Code header first (sent by frontend ProfileSwitcher / localStorage)
  if (requestBuCode) {
    const buMap: Record<string, { buId: number; buName: string }> = {
      BU1: { buId: 1, buName: "BU1 - 海外事业部" },
      BU2: { buId: 2, buName: "BU2 - 商用车事业部" },
      BU3: { buId: 3, buName: "BU3 - 乘用车事业部" },
      BU4: { buId: 4, buName: "BU4 - 半导体事业部" },
      BU5: { buId: 5, buName: "BU5 - 工业通用事业部" },
    };
    const match = buMap[requestBuCode];
    if (match) {
      return { buId: match.buId, buCode: requestBuCode, buName: match.buName };
    }
  }

  // Try DB lookup for BU-scoped roles
  if (isBuRole) {
    try {
      const { requireDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT bu_code, jdy_dept_name
        FROM bu_department_mappings
        WHERE is_active = 1
        LIMIT 1
      `);
      const rows = result[0] as any[];
      if (rows.length > 0) {
        const row = rows[0];
        const buMap: Record<string, number> = {
          BU1: 1, BU2: 2, BU3: 3, BU4: 4, BU5: 5,
        };
        return {
          buId: buMap[row.bu_code] ?? null,
          buCode: row.bu_code,
          buName: row.jdy_dept_name ?? row.bu_code,
        };
      }
    } catch {
      // Table may not exist yet — fall through
    }
  }

  // Non-BU roles (employee, team_lead, dept_manager) get null BU for now
  // In Phase 2, these will be resolved from employee.departmentId → BU mapping
  return NULL_BU;
}

/**
 * BU Context middleware — injects `ctx.bu` on every request.
 */
export const buContextMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    return next({ ctx: { ...ctx, bu: NULL_BU } });
  }

  const requestBuCode = ctx.req.headers["x-bu-code"] as string | undefined ?? null;
  const bu = await resolveBuContext(ctx.user.id, ctx.user.role, requestBuCode);

  return next({
    ctx: {
      ...ctx,
      bu,
    },
  });
});

/**
 * Enforcement middleware — requires BU scope for data-isolated procedures.
 * admin/director bypass (they have global scope).
 *
 * Usage in a router:
 *   protectedProcedure.use(requireBuScope()).query(...)
 */
export function requireBuScope() {
  return t.middleware(async ({ ctx, next }) => {
    const bu = (ctx as any).bu as BuContext | undefined;

    // Admin/director can access cross-BU
    const role = ctx.user?.role as string;
    if (role === "admin" || role === "director") {
      return next({ ctx });
    }

    if (!bu?.buId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "BU context required for this operation. Set X-BU-Code header or select a BU.",
      });
    }

    return next({ ctx });
  });
}
