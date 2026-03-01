import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { expenseClaims, expenseLineItems, projects } from "../../drizzle/schema";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";

// Roles allowed to see ALL expenses (not just their own)
const FINANCE_ROLES = new Set(["admin", "director", "finance_manager", "finance_specialist", "hr_manager"]);

/**
 * Helper: resolve project IDs visible to the current user's BU.
 * Returns undefined if user has global scope (no filter needed).
 * Used to BU-scope expense claims that reference a project.
 */
async function buScopedProjectIds(ctx: any): Promise<number[] | undefined> {
  const buFilter = buScopeCondition(projects.buCode, ctx);
  if (!buFilter) return undefined;
  const db = await requireDb();
  const rows = await db.select({ id: projects.id }).from(projects).where(buFilter);
  return rows.map(r => r.id);
}

/** Check optimistic lock version — throws CONFLICT if stale */
async function checkExpenseVersion(db: any, id: number, expectedVersion?: number) {
  if (expectedVersion === undefined) return;
  const [current] = await db.select({ version: expenseClaims.version }).from(expenseClaims).where(eq(expenseClaims.id, id));
  if (current && current.version !== expectedVersion) {
    throw new TRPCError({ code: "CONFLICT", message: "版本冲突：报销单已被他人修改，请刷新后重试" });
  }
}

/** Verify the claim belongs to the current user (for non-finance roles) */
async function assertClaimOwnership(db: any, claimId: number, userId: number, role: string) {
  if (FINANCE_ROLES.has(role)) return; // finance roles can access any claim
  const [claim] = await db.select({ submitterId: expenseClaims.submitterId })
    .from(expenseClaims).where(eq(expenseClaims.id, claimId));
  if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: `报销单 #${claimId} 不存在` });
  if (claim.submitterId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "无权操作他人的报销单" });
  }
}

export const expenseReportRouter = router({
  // 报销列表 — scoped by user role + BU isolation
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const role = ctx.user.role ?? "employee";
    const isFinance = FINANCE_ROLES.has(role);

    const conditions: any[] = [];
    // Role-based scoping: non-finance users only see their own claims
    if (!isFinance) {
      conditions.push(eq(expenseClaims.submitterId, ctx.user.id));
    }
    // BU isolation: restrict to expenses for projects in user's BU
    const scopedIds = await buScopedProjectIds(ctx);
    if (scopedIds) {
      conditions.push(inArray(expenseClaims.projectId, scopedIds.length > 0 ? scopedIds : [0]));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const items = await db.select().from(expenseClaims)
      .where(whereCondition)
      .orderBy(desc(expenseClaims.createdAt))
      .limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取报销详情 — ownership check
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await assertClaimOwnership(db, id, ctx.user.id, ctx.user.role ?? "employee");

    const [claim] = await db.select().from(expenseClaims).where(eq(expenseClaims.id, id));
    if (!claim) return null;

    const lineItems = await db.select().from(expenseLineItems)
      .where(eq(expenseLineItems.expenseClaimId, id))
      .orderBy(expenseLineItems.lineNumber);

    return { ...claim, lineItems };
  }),

  // 创建报销 — ctx.user.id as submitter
  create: protectedProcedure.input(z.object({
    travelRecordId: z.number().optional(),
    tripRequestId: z.number().optional(),
    projectId: z.number().optional(),
    customerId: z.number().optional(),
    departmentId: z.number().optional(),
    claimType: z.string().max(50).optional(),
    claimTitle: z.string().max(500).optional(),
    title: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    totalAmount: z.union([z.string(), z.number()]).optional(),
    currency: z.string().max(10).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const code = `EC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).toUpperCase().slice(-3)}`;
    const [claim] = await db.insert(expenseClaims).values({
      claimCode: code,
      submitterId: ctx.user.id,
      travelRecordId: input.travelRecordId,
      tripRequestId: input.tripRequestId,
      projectId: input.projectId,
      customerId: input.customerId,
      departmentId: input.departmentId,
      claimType: (input.claimType || "other") as "travel" | "meal" | "transportation" | "accommodation" | "equipment" | "project" | "daily" | "other",
      claimTitle: input.claimTitle || input.title,
      description: input.description,
      totalAmount: String(input.totalAmount || 0),
      currency: input.currency || "CNY",
      status: "draft",
    }).returning();
    return { success: true, message: "报销已创建", data: claim };
  }),

  // 更新报销 (with optimistic locking + ownership check)
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    expectedVersion: z.number().optional(),
    claimTitle: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    totalAmount: z.union([z.string(), z.number()]).optional(),
    notes: z.string().max(5000).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    await assertClaimOwnership(db, id, ctx.user.id, ctx.user.role ?? "employee");
    await checkExpenseVersion(db, id, input.expectedVersion);
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      version: sql`${expenseClaims.version} + 1`,
    };
    if (input.claimTitle !== undefined) updates.claimTitle = input.claimTitle;
    if (input.description !== undefined) updates.description = input.description;
    if (input.totalAmount !== undefined) updates.totalAmount = String(input.totalAmount);
    if (input.notes !== undefined) updates.notes = input.notes;

    const [claim] = await db.update(expenseClaims)
      .set(updates)
      .where(eq(expenseClaims.id, id))
      .returning();
    return { success: true, message: "更新成功", data: claim };
  }),

  // 删除报销 — ownership check, only draft can be deleted
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await assertClaimOwnership(db, id, ctx.user.id, ctx.user.role ?? "employee");

    // Only draft claims can be deleted
    const [claim] = await db.select({ status: expenseClaims.status }).from(expenseClaims).where(eq(expenseClaims.id, id));
    if (claim && claim.status !== "draft") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "仅草稿状态的报销单可以删除" });
    }

    await db.delete(expenseLineItems).where(eq(expenseLineItems.expenseClaimId, id));
    await db.delete(expenseClaims).where(eq(expenseClaims.id, id));
    return { success: true, message: "删除成功" };
  }),

  // 提交报销 (with optimistic locking + ownership check)
  submit: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    expectedVersion: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    await assertClaimOwnership(db, id, ctx.user.id, ctx.user.role ?? "employee");
    await checkExpenseVersion(db, id, input.expectedVersion);
    const [claim] = await db.update(expenseClaims)
      .set({
        status: "submitted",
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: sql`${expenseClaims.version} + 1`,
      })
      .where(eq(expenseClaims.id, id))
      .returning();
    return { success: true, message: "已提交", data: claim };
  }),

  // 审批通过 — ctx.user.id as approver, role gate + self-approval prevention
  approve: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    expectedVersion: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;

    // Role gate: only finance/management roles can approve
    const role = ctx.user.role ?? "employee";
    if (!FINANCE_ROLES.has(role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅财务/管理角色可审批报销单" });
    }

    await checkExpenseVersion(db, id, input.expectedVersion);

    // Prevent self-approval
    const [existing] = await db.select({ submitterId: expenseClaims.submitterId, status: expenseClaims.status })
      .from(expenseClaims).where(eq(expenseClaims.id, id));
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: `报销单 #${id} 不存在` });
    if (existing.submitterId === ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "不能审批自己提交的报销单" });
    }
    if (existing.status !== "submitted" && existing.status !== "pending_review") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `报销单状态为 ${existing.status}，无法审批` });
    }

    const [claim] = await db.update(expenseClaims)
      .set({
        status: "approved",
        managerApprovedAt: new Date().toISOString(),
        managerApprovedBy: ctx.user.id,
        updatedAt: new Date().toISOString(),
        version: sql`${expenseClaims.version} + 1`,
      })
      .where(eq(expenseClaims.id, id))
      .returning();
    return { success: true, message: "已批准", data: claim };
  }),

  // 拒绝 — role gate + self-rejection prevention
  reject: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    expectedVersion: z.number().optional(),
    reason: z.string().max(2000).optional(),
    rejectionReason: z.string().max(2000).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;

    // Role gate: only finance/management roles can reject
    const role = ctx.user.role ?? "employee";
    if (!FINANCE_ROLES.has(role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅财务/管理角色可驳回报销单" });
    }

    await checkExpenseVersion(db, id, input.expectedVersion);

    const [existing] = await db.select({ submitterId: expenseClaims.submitterId, status: expenseClaims.status })
      .from(expenseClaims).where(eq(expenseClaims.id, id));
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: `报销单 #${id} 不存在` });
    // Prevent self-rejection
    if (existing.submitterId === ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "不能驳回自己提交的报销单" });
    }
    if (existing.status !== "submitted" && existing.status !== "pending_review") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `报销单状态为 ${existing.status}，无法驳回` });
    }

    const [claim] = await db.update(expenseClaims)
      .set({
        status: "rejected",
        rejectionReason: input.reason || input.rejectionReason,
        updatedAt: new Date().toISOString(),
        version: sql`${expenseClaims.version} + 1`,
      })
      .where(eq(expenseClaims.id, id))
      .returning();
    return { success: true, message: "已拒绝", data: claim };
  }),

  // 生成报表 — scoped by role + BU isolation
  generateReport: protectedProcedure.input(z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const role = ctx.user.role ?? "employee";
    const isFinance = FINANCE_ROLES.has(role);

    const conditions: any[] = [];
    if (!isFinance) {
      conditions.push(eq(expenseClaims.submitterId, ctx.user.id));
    }
    // BU isolation
    const scopedIds = await buScopedProjectIds(ctx);
    if (scopedIds) {
      conditions.push(inArray(expenseClaims.projectId, scopedIds.length > 0 ? scopedIds : [0]));
    }
    const scopeCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db.select().from(expenseClaims)
      .where(scopeCondition)
      .orderBy(desc(expenseClaims.createdAt)).limit(200);

    // Group by claimType for dimension breakdown
    const byType = await db.select({
      claimType: expenseClaims.claimType,
      total: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      count: count(),
    }).from(expenseClaims).where(scopeCondition).groupBy(expenseClaims.claimType);

    const [totalResult] = await db.select({
      total: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      count: count(),
    }).from(expenseClaims).where(scopeCondition);

    return {
      items,
      summary: {
        totalAmount: Number(totalResult.total) || 0,
        totalCount: totalResult.count,
      },
      breakdown: byType.map(b => ({
        category: b.claimType,
        amount: Number(b.total),
        count: b.count,
      })),
    };
  }),

  // 导出Excel — scoped by role + BU isolation
  exportToExcel: protectedProcedure.input(z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional()).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const role = ctx.user.role ?? "employee";
    const isFinance = FINANCE_ROLES.has(role);

    const conditions: any[] = [];
    if (!isFinance) {
      conditions.push(eq(expenseClaims.submitterId, ctx.user.id));
    }
    // BU isolation
    const scopedIds = await buScopedProjectIds(ctx);
    if (scopedIds) {
      conditions.push(inArray(expenseClaims.projectId, scopedIds.length > 0 ? scopedIds : [0]));
    }
    const scopeCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db.select().from(expenseClaims)
      .where(scopeCondition)
      .orderBy(desc(expenseClaims.createdAt)).limit(500);
    // Return CSV data for client-side download
    const header = "报销编号,标题,类型,金额,币种,状态,提交时间\n";
    const rows = items.map(i =>
      `${i.claimCode},${i.claimTitle || ""},${i.claimType},${i.totalAmount},${i.currency || "CNY"},${i.status},${i.createdAt}`
    ).join("\n");
    const csvContent = header + rows;
    return { data: Buffer.from(csvContent).toString("base64"), mimeType: "text/csv" };
  }),

  // 部门排名 — finance roles only + BU isolation
  getDepartmentRanking: protectedProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
    const role = ctx.user.role ?? "employee";
    if (!FINANCE_ROLES.has(role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅财务/管理角色可查看部门排名" });
    }

    const db = await requireDb();
    // BU isolation
    const scopedIds = await buScopedProjectIds(ctx);
    const buWhere = scopedIds
      ? inArray(expenseClaims.projectId, scopedIds.length > 0 ? scopedIds : [0])
      : undefined;

    const ranking = await db.select({
      departmentId: expenseClaims.departmentId,
      total: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      count: count(),
    }).from(expenseClaims)
      .where(buWhere)
      .groupBy(expenseClaims.departmentId)
      .orderBy(sql`SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)) DESC`)
      .limit(20);

    return ranking.map(r => ({
      departmentId: r.departmentId,
      totalAmount: Number(r.total),
      claimCount: r.count,
    }));
  }),
});
