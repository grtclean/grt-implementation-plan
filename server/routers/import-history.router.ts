import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { importHistory } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";
import { jsonValue } from "../../shared/validators";

export const importHistoryRouter = router({
  // 导入历史列表
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(importHistory).orderBy(desc(importHistory.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取导入详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(importHistory).where(eq(importHistory.id, parseInt(input.id)));
    return item || null;
  }),

  // 创建导入记录
  create: protectedProcedure.input(z.object({
    importType: z.string().max(100).optional(),
    fileName: z.string().max(255).optional(),
    fileSize: z.number().int().optional(),
    filePath: z.string().max(500).optional(),
    totalRows: z.number().int().optional(),
    fieldMapping: jsonValue.optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [record] = await db.insert(importHistory).values({
      importType: input.importType || "general",
      fileName: input.fileName || "unknown",
      fileSize: input.fileSize,
      filePath: input.filePath,
      totalRows: input.totalRows || 0,
      fieldMapping: input.fieldMapping ? JSON.stringify(input.fieldMapping) : undefined,
      status: "pending",
      createdBy: ctx.user.id,
    } as any).returning();
    return { success: true, message: "导入记录已创建", data: record };
  }),

  // 更新导入记录
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    importType: z.string().max(100).optional(),
    fileName: z.string().max(255).optional(),
    fileSize: z.number().int().optional(),
    filePath: z.string().max(500).optional(),
    totalRows: z.number().int().optional(),
    successCount: z.number().int().optional(),
    failedCount: z.number().int().optional(),
    skippedCount: z.number().int().optional(),
    fieldMapping: z.string().optional(),
    errorLog: z.string().optional(),
    importedData: z.string().optional(),
    status: z.string().max(50).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const { id: _id, ...updates } = input;
    const [record] = await db.update(importHistory)
      .set(updates as any)
      .where(eq(importHistory.id, id))
      .returning();
    return { success: true, message: "更新成功", data: record };
  }),

  // 删除导入记录
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(importHistory).where(eq(importHistory.id, parseInt(input.id)));
    return { success: true, message: "删除成功" };
  }),

  // 获取历史记录
  getHistory: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(importHistory).orderBy(desc(importHistory.createdAt)).limit(50);
  }),

  // 获取导入详细信息
  getDetails: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input?.id === "string" ? parseInt(input.id) : (input?.id || 0);
    const [item] = await db.select().from(importHistory).where(eq(importHistory.id, id));
    return { details: item || null };
  }),

  // 导入统计（前端调用 getStats）
  getStats: protectedProcedure.input(z.record(z.string(), z.unknown()).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const [total] = await db.select({ count: count() }).from(importHistory);
    const [pending] = await db.select({ count: count() }).from(importHistory).where(eq(importHistory.status, "pending"));
    const [completed] = await db.select({ count: count() }).from(importHistory).where(eq(importHistory.status, "completed"));
    const [failed] = await db.select({ count: count() }).from(importHistory).where(eq(importHistory.status, "failed"));
    return {
      total: total.count,
      pending: pending.count,
      completed: completed.count,
      failed: failed.count,
    };
  }),

  // 检查是否可回滚
  canRollback: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input?.id === "string" ? parseInt(input.id) : (input?.id || 0);
    const [item] = await db.select().from(importHistory).where(eq(importHistory.id, id));
    if (!item) return { canRollback: false, reason: "记录不存在" };
    if (item.status !== "completed") return { canRollback: false, reason: "只有已完成的导入才能回滚" };
    if (item.rollbackAt) return { canRollback: false, reason: "已经回滚过" };
    return { canRollback: true };
  }),

  // 回滚导入
  rollback: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
  }).optional()).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = typeof input?.id === "string" ? parseInt(input.id) : (input?.id || 0);
    const [item] = await db.select().from(importHistory).where(eq(importHistory.id, id));
    if (!item) return { success: false, message: "记录不存在" };
    if (item.rollbackAt) return { success: false, message: "已经回滚过" };

    const [updated] = await db.update(importHistory)
      .set({ rollbackAt: new Date(), rollbackBy: ctx.user.id, status: "rolled_back" } as any)
      .where(eq(importHistory.id, id))
      .returning();
    return { success: true, message: "回滚成功", data: updated };
  }),
});
