/**
 * Performance Record Router — BU quarterly performance with freeze/optimistic lock
 *
 * Features:
 * - CRUD with optimistic locking (version field)
 * - Freeze/unfreeze with reason tracking
 * - Quarterly dashboard aggregation
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import type { BuContext } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { performanceRecords } from "../../drizzle/performance-schema";
import { eq, and, desc, sql, count, type SQL } from "drizzle-orm";

/** BU code → buId mapping (matches gateway-bu-context.middleware buMap) */
const BU_CODE_TO_ID: Record<string, number> = { BU1: 1, BU2: 2, BU3: 3, BU4: 4, BU5: 5 };
const GLOBAL_SCOPE_ROLES = new Set(["admin", "director", "hr_manager", "hr_specialist", "finance_manager", "finance_specialist"]);

/** Resolve BU ID filter from context. Returns undefined for global-scope users. */
function resolveBuIdFilter(ctx: any): number | undefined {
  const role = ctx.user?.role ?? "";
  if (GLOBAL_SCOPE_ROLES.has(role)) return undefined;
  const buCode = (ctx as any).bu?.buCode as string | undefined;
  if (buCode && BU_CODE_TO_ID[buCode] !== undefined) return BU_CODE_TO_ID[buCode];
  return undefined; // graceful fallback — no filter
}

/** Roles that can view/manage all employees' performance records */
const PERF_MANAGER_ROLES = new Set(["admin", "director", "hr_manager", "hr_specialist", "dept_manager", "finance_manager"]);

export const performanceRecordRouter = router({
  /**
   * list — paginated performance records with filters
   */
  list: protectedProcedure
    .input(z.object({
      buId: z.number().optional(),
      userId: z.number().optional(),
      year: z.number().optional(),
      quarter: z.number().min(1).max(4).optional(),
      status: z.string().optional(),
      isFrozen: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();

      const conditions: SQL[] = [];
      // Non-manager roles can only see their own records
      if (!PERF_MANAGER_ROLES.has(ctx.user!.role ?? "employee")) {
        conditions.push(eq(performanceRecords.userId, ctx.user!.id));
      } else {
        if (input.userId) conditions.push(eq(performanceRecords.userId, input.userId));
      }

      // BU isolation: restrict to user's BU unless overridden by explicit input
      if (input.buId) {
        conditions.push(eq(performanceRecords.buId, input.buId));
      } else {
        const buIdFilter = resolveBuIdFilter(ctx);
        if (buIdFilter !== undefined) conditions.push(eq(performanceRecords.buId, buIdFilter));
      }
      if (input.year) conditions.push(eq(performanceRecords.year, input.year));
      if (input.quarter) conditions.push(eq(performanceRecords.quarter, input.quarter));
      if (input.status) conditions.push(eq(performanceRecords.status, input.status));
      if (input.isFrozen !== undefined) conditions.push(eq(performanceRecords.isFrozen, input.isFrozen));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalResult] = await Promise.all([
        db.select().from(performanceRecords)
          .where(where)
          .orderBy(desc(performanceRecords.year), desc(performanceRecords.quarter))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ total: count() }).from(performanceRecords).where(where),
      ]);

      return {
        items: rows,
        total: totalResult[0]?.total ?? 0,
      };
    }),

  /**
   * getById — single record with full detail
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.select().from(performanceRecords).where(eq(performanceRecords.id, input.id)).limit(1000);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Performance record not found" });
      // Non-manager roles can only view their own records
      if (!PERF_MANAGER_ROLES.has(ctx.user!.role ?? "employee") && row.userId !== ctx.user!.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot view other users' performance records" });
      }
      return row;
    }),

  /**
   * create — new quarterly performance record
   */
  create: protectedProcedure
    .input(z.object({
      buId: z.number().optional(),
      departmentId: z.number().optional(),
      userId: z.number().optional(),
      year: z.number(),
      quarter: z.number().min(1).max(4),
      revenueTarget: z.string().optional(),
      revenueActual: z.string().optional(),
      profitTarget: z.string().optional(),
      profitActual: z.string().optional(),
      kpiScore: z.string().optional(),
      bonusCoefficient: z.string().optional(),
      kpiDetailsJson: z.array(z.object({
        kpiName: z.string(),
        weight: z.number(),
        target: z.number(),
        actual: z.number(),
        score: z.number(),
      })).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Non-managers can only create their own records
      const targetUserId = input.userId ?? ctx.user!.id;
      if (targetUserId !== ctx.user!.id && !PERF_MANAGER_ROLES.has(ctx.user!.role ?? "employee")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权为他人创建绩效记录" });
      }
      const db = await requireDb();
      const [record] = await db.insert(performanceRecords).values({
        ...input,
        userId: targetUserId,
        status: "draft",
        isFrozen: false,
        version: 1,
        createdBy: ctx.user!.id,
      }).returning();
      return record;
    }),

  /**
   * update — with optimistic lock check (version must match)
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      version: z.number(),  // must match current DB version
      revenueActual: z.string().optional(),
      profitActual: z.string().optional(),
      kpiScore: z.string().optional(),
      bonusCoefficient: z.string().optional(),
      kpiDetailsJson: z.array(z.object({
        kpiName: z.string(),
        weight: z.number(),
        target: z.number(),
        actual: z.number(),
        score: z.number(),
      })).optional(),
      status: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Check frozen
      const [current] = await db.select().from(performanceRecords).where(eq(performanceRecords.id, input.id)).limit(1000);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
      if (current.isFrozen) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "记录已冻结，无法修改。请先解冻。" });
      }

      // Optimistic lock
      const { id, version, ...updates } = input;
      const [updated] = await db.update(performanceRecords)
        .set({
          ...updates,
          version: version + 1,
          updatedAt: new Date().toISOString(),
        })
        .where(and(
          eq(performanceRecords.id, id),
          eq(performanceRecords.version, version),
        ))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "并发冲突：记录已被其他用户修改。请刷新后重试。",
        });
      }

      return updated;
    }),

  /**
   * freeze — freeze a performance record (e.g., during violation investigation)
   */
  freeze: requirePermission('hrm_performance')
    .input(z.object({
      id: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      // Atomic: only freeze if not already frozen
      const [updated] = await db.update(performanceRecords)
        .set({
          isFrozen: true,
          frozenAt: new Date().toISOString(),
          frozenBy: ctx.user!.name ?? `User#${ctx.user!.id}`,
          frozenReason: input.reason,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(performanceRecords.id, input.id), eq(performanceRecords.isFrozen, false)))
        .returning();

      if (!updated) throw new TRPCError({ code: "CONFLICT", message: "记录不存在或已冻结" });
      return updated;
    }),

  /**
   * unfreeze — unfreeze a performance record (after violation resolved)
   */
  unfreeze: requirePermission('hrm_performance')
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      // Atomic: only unfreeze if currently frozen
      const [updated] = await db.update(performanceRecords)
        .set({
          isFrozen: false,
          frozenReason: input.reason ? `解冻(${ctx.user!.name}): ${input.reason}` : null,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(performanceRecords.id, input.id), eq(performanceRecords.isFrozen, true)))
        .returning();

      if (!updated) throw new TRPCError({ code: "CONFLICT", message: "记录不存在或未冻结" });
      return updated;
    }),

  /**
   * dashboard — quarterly summary with BU breakdown
   */
  dashboard: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
      quarter: z.number().min(1).max(4).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = new Date();
      const year = input.year ?? now.getFullYear();
      const quarter = input.quarter ?? Math.ceil((now.getMonth() + 1) / 3);

      try {
        // BU isolation on dashboard
        const dashConditions = [
          eq(performanceRecords.year, year),
          eq(performanceRecords.quarter, quarter),
        ];
        const buIdFilter = resolveBuIdFilter(ctx);
        if (buIdFilter !== undefined) dashConditions.push(eq(performanceRecords.buId, buIdFilter));

        const rows = await db.select().from(performanceRecords)
          .where(and(...dashConditions)).limit(1000);

        const totalRecords = rows.length;
        const frozenCount = rows.filter(r => r.isFrozen).length;
        const avgKpi = totalRecords > 0
          ? rows.reduce((sum, r) => sum + (Number(r.kpiScore) || 0), 0) / totalRecords
          : 0;
        const avgBonus = totalRecords > 0
          ? rows.reduce((sum, r) => sum + (Number(r.bonusCoefficient) || 1), 0) / totalRecords
          : 1;

        // Group by BU
        const byBU = new Map<number, { buId: number; count: number; avgKpi: number; frozenCount: number }>();
        for (const r of rows) {
          const buId = r.buId ?? 0;
          const existing = byBU.get(buId) || { buId, count: 0, avgKpi: 0, frozenCount: 0 };
          existing.count++;
          existing.avgKpi += Number(r.kpiScore) || 0;
          if (r.isFrozen) existing.frozenCount++;
          byBU.set(buId, existing);
        }

        const buBreakdown = Array.from(byBU.values()).map(b => ({
          ...b,
          avgKpi: b.count > 0 ? Math.round((b.avgKpi / b.count) * 100) / 100 : 0,
        }));

        return {
          year,
          quarter,
          totalRecords,
          frozenCount,
          avgKpi: Math.round(avgKpi * 100) / 100,
          avgBonus: Math.round(avgBonus * 100) / 100,
          buBreakdown,
        };
      } catch {
        return {
          year,
          quarter,
          totalRecords: 0,
          frozenCount: 0,
          avgKpi: 0,
          avgBonus: 1,
          buBreakdown: [],
        };
      }
    }),

  /**
   * seedDemo — create demo performance records
   */
  seedDemo: requirePermission('hr:performance:manage').mutation(async () => {
    const db = await requireDb();

    // Ensure table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS performance_records (
        id SERIAL PRIMARY KEY,
        bu_id INTEGER,
        department_id INTEGER,
        user_id INTEGER,
        year INTEGER NOT NULL,
        quarter INTEGER NOT NULL,
        revenue_target DECIMAL(15,2),
        revenue_actual DECIMAL(15,2),
        profit_target DECIMAL(15,2),
        profit_actual DECIMAL(15,2),
        kpi_score DECIMAL(5,2),
        bonus_coefficient DECIMAL(4,2) DEFAULT 1.00,
        kpi_details_json JSONB,
        is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
        frozen_at TIMESTAMP,
        frozen_by VARCHAR(50),
        frozen_reason VARCHAR(500),
        version INTEGER NOT NULL DEFAULT 1,
        reviewed_by INTEGER,
        reviewed_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'draft',
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const BU_NAMES = ["海外BU", "商用车BU", "乘用车BU", "半导体BU", "工业通用BU"];
    const records = BU_NAMES.map((name, i) => ({
      buId: i + 1,
      year: 2026,
      quarter: 1,
      revenueTarget: String((i + 1) * 5000000),
      revenueActual: String(Math.round((i + 1) * 5000000 * (0.85 + Math.random() * 0.3))),
      profitTarget: String((i + 1) * 1000000),
      profitActual: String(Math.round((i + 1) * 1000000 * (0.8 + Math.random() * 0.4))),
      kpiScore: String(Math.round((65 + Math.random() * 30) * 100) / 100),
      bonusCoefficient: String(Math.round((0.8 + Math.random() * 0.8) * 100) / 100),
      status: "submitted",
      isFrozen: i === 0,  // First BU is frozen (for demo)
      frozenReason: i === 0 ? "MAJOR违规: 客户退货事件调查中" : undefined,
      frozenAt: i === 0 ? new Date().toISOString() : undefined,
      frozenBy: i === 0 ? "system" : undefined,
      version: 1,
      createdBy: 1,
    }));

    const results = [];
    for (const rec of records) {
      try {
        const [row] = await db.insert(performanceRecords).values(rec).returning();
        results.push({ id: row.id, buId: rec.buId, status: "created" });
      } catch (err) {
        results.push({ id: 0, buId: rec.buId, status: "error", error: String(err) });
      }
    }

    return { seeded: results.length, results };
  }),
});
