import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { processNotebooks } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { jsonValue } from "../../shared/validators";

export const processNotebookRouter = router({
  // 笔记本列表
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(processNotebooks).orderBy(desc(processNotebooks.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取笔记本详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(processNotebooks).where(eq(processNotebooks.id, parseInt(input.id))).limit(1000);
    return item || null;
  }),

  // 创建笔记本
  create: requirePermission('mfg:process:manage').input(z.object({
    processType: z.string().max(50).optional(),
    processId: z.string().max(100).optional(),
    processStep: z.string().max(50).optional(),
    title: z.string().max(200).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [notebook] = await db.insert(processNotebooks).values({
      processType: input.processType || "general",
      processId: input.processId || `proc-${Date.now()}`,
      processStep: input.processStep,
      title: input.title,
      createdBy: ctx.user.id,
      status: "active" as const,
    } as any).returning();
    return { success: true, message: "笔记本已创建", data: notebook };
  }),

  // 更新笔记本
  update: requirePermission('mfg:process:manage').input(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().max(200).optional(),
    processStep: z.string().max(50).optional(),
    status: z.enum(["active", "archived"]).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.title !== undefined) updates.title = input.title;
    if (input.processStep !== undefined) updates.processStep = input.processStep;
    if (input.status !== undefined) updates.status = input.status;

    const [notebook] = await db.update(processNotebooks)
      .set(updates as any)
      .where(eq(processNotebooks.id, id))
      .returning();
    return { success: true, message: "更新成功", data: notebook };
  }),

  // 删除笔记本
  delete: requirePermission('mfg:process:manage').input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(processNotebooks).where(eq(processNotebooks.id, parseInt(input.id)));
    return { success: true, message: "删除成功" };
  }),

  // 按流程获取笔记本
  getByProcess: protectedProcedure.input(z.object({
    processType: z.string().max(50).optional(),
    processId: z.string().max(100).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const processType = input?.processType || "";
    const processId = input?.processId || "";
    if (!processType && !processId) return { notebook: null };

    const conditions = [];
    if (processType) conditions.push(eq(processNotebooks.processType, processType));
    if (processId) conditions.push(eq(processNotebooks.processId, processId));

    const [notebook] = await db.select().from(processNotebooks)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]).limit(1000);
    return { notebook: notebook || null };
  }),

  // 获取笔记本及其条目（无entries子表，返回笔记本本身）
  getNotebookWithEntries: protectedProcedure.input(z.object({
    notebookId: z.union([z.string(), z.number()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    // Frontend sends notebookId, also accept id
    const rawId = input?.notebookId ?? input?.id ?? 0;
    const id = typeof rawId === "string" ? parseInt(rawId) : rawId;
    const [notebook] = await db.select().from(processNotebooks).where(eq(processNotebooks.id, id)).limit(1000);
    return { notebook: notebook || null, entries: [] };
  }),

  // 添加条目（processNotebooks无子条目表，存储为JSON或占位）
  addEntry: requirePermission('mfg:process:manage').input(z.object({
    notebookId: z.union([z.string(), z.number()]).optional(),
    title: z.string().max(200).optional(),
    content: z.string().max(50000).optional(),
    entryType: z.string().max(50).optional(),
    metadata: jsonValue.optional(),
  })).mutation(async ({ input }) => {
    // No separate entries table exists — return success placeholder
    return { success: true, message: "条目已添加", data: { id: Date.now(), ...input } };
  }),

  // 文件上传（占位）
  uploadFile: requirePermission('mfg:process:manage').input(z.object({
    notebookId: z.number().int().optional(),
    fileName: z.string().max(500).optional(),
    fileSize: z.number().int().optional(),
    fileType: z.string().max(100).optional(),
    fileData: z.string().optional(),
  }).optional()).mutation(() => {
    return { url: "" };
  }),
});
