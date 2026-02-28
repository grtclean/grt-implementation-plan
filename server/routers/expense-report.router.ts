import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { expenseClaims, expenseLineItems } from "../../drizzle/schema";
import { eq, desc, count, sql } from "drizzle-orm";

export const expenseReportRouter = router({
  // 报销列表
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(expenseClaims).orderBy(desc(expenseClaims.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取报销详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    const [claim] = await db.select().from(expenseClaims).where(eq(expenseClaims.id, id));
    if (!claim) return null;

    const lineItems = await db.select().from(expenseLineItems)
      .where(eq(expenseLineItems.expenseClaimId, id))
      .orderBy(expenseLineItems.lineNumber);

    return { ...claim, lineItems };
  }),

  // 创建报销
  create: protectedProcedure.input(z.object({
    submitterId: z.number().optional(),
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
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const code = `EC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).toUpperCase().slice(-3)}`;
    const [claim] = await db.insert(expenseClaims).values({
      claimCode: code,
      submitterId: input.submitterId || 1,
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

  // 更新报销
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    claimTitle: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    totalAmount: z.union([z.string(), z.number()]).optional(),
    notes: z.string().max(5000).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
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

  // 删除报销
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await db.delete(expenseLineItems).where(eq(expenseLineItems.expenseClaimId, id));
    await db.delete(expenseClaims).where(eq(expenseClaims.id, id));
    return { success: true, message: "删除成功" };
  }),

  // 提交报销
  submit: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const [claim] = await db.update(expenseClaims)
      .set({ status: "submitted", submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(expenseClaims.id, id))
      .returning();
    return { success: true, message: "已提交", data: claim };
  }),

  // 审批通过
  approve: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]), approverId: z.number().optional() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const [claim] = await db.update(expenseClaims)
      .set({
        status: "approved",
        managerApprovedAt: new Date().toISOString(),
        managerApprovedBy: input.approverId || 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(expenseClaims.id, id))
      .returning();
    return { success: true, message: "已批准", data: claim };
  }),

  // 拒绝
  reject: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]), reason: z.string().max(2000).optional(), rejectionReason: z.string().max(2000).optional() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const [claim] = await db.update(expenseClaims)
      .set({
        status: "rejected",
        rejectionReason: input.reason || input.rejectionReason,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(expenseClaims.id, id))
      .returning();
    return { success: true, message: "已拒绝", data: claim };
  }),

  // 生成报表（前端 ExpenseReport.tsx 调用）
  generateReport: protectedProcedure.input(z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const items = await db.select().from(expenseClaims).orderBy(desc(expenseClaims.createdAt)).limit(200);

    // Group by claimType for dimension breakdown
    const byType = await db.select({
      claimType: expenseClaims.claimType,
      total: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      count: count(),
    }).from(expenseClaims).groupBy(expenseClaims.claimType);

    const [totalResult] = await db.select({
      total: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      count: count(),
    }).from(expenseClaims);

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

  // 导出Excel（前端 ExpenseReport.tsx 调用）
  exportToExcel: protectedProcedure.input(z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional()).mutation(async ({ input }) => {
    const db = await requireDb();
    const items = await db.select().from(expenseClaims).orderBy(desc(expenseClaims.createdAt)).limit(500);
    // Return CSV data for client-side download
    const header = "报销编号,标题,类型,金额,币种,状态,提交时间\n";
    const rows = items.map(i =>
      `${i.claimCode},${i.claimTitle || ""},${i.claimType},${i.totalAmount},${i.currency || "CNY"},${i.status},${i.createdAt}`
    ).join("\n");
    const csvContent = header + rows;
    return { data: Buffer.from(csvContent).toString("base64"), mimeType: "text/csv" };
  }),

  // 部门排名（前端 ExpenseReport.tsx 调用）
  getDepartmentRanking: protectedProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const ranking = await db.select({
      departmentId: expenseClaims.departmentId,
      total: sql<string>`COALESCE(SUM(CAST(${expenseClaims.totalAmount} AS NUMERIC)), 0)`,
      count: count(),
    }).from(expenseClaims)
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
