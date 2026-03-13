import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { aiChatSessions, aiChatMessages } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";
import { jsonValue } from "../../shared/validators";

export const chatHistoryRouter = router({
  // 会话列表
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(aiChatSessions).orderBy(desc(aiChatSessions.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取会话详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [session] = await db.select().from(aiChatSessions).where(eq(aiChatSessions.id, parseInt(input.id))).limit(1000);
    return session || null;
  }),

  // 创建会话
  create: requirePermission('ai:assistant:chat').input(z.object({
    assistantType: z.enum(["solution", "quotation", "planning", "kpi", "personal"]).optional(),
    title: z.string().max(200).optional(),
    projectId: z.number().int().optional(),
    customerId: z.number().int().optional(),
    metadata: jsonValue.optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [session] = await db.insert(aiChatSessions).values({
      userId: ctx.user.id,
      assistantType: input.assistantType || "solution",
      title: input.title,
      projectId: input.projectId,
      customerId: input.customerId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    } as any).returning();
    return { success: true, message: "会话已创建", data: session };
  }),

  // 更新会话
  update: requirePermission('ai:assistant:chat').input(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().max(200).optional(),
    status: z.enum(["active", "archived", "deleted"]).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.title !== undefined) updates.title = input.title;
    if (input.status !== undefined) updates.status = input.status;
    const [session] = await db.update(aiChatSessions)
      .set(updates as any)
      .where(eq(aiChatSessions.id, id))
      .returning();
    return { success: true, message: "更新成功", data: session };
  }),

  // 删除会话
  delete: requirePermission('ai:assistant:chat').input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await db.delete(aiChatMessages).where(eq(aiChatMessages.sessionId, id));
    await db.delete(aiChatSessions).where(eq(aiChatSessions.id, id));
    return { success: true, message: "删除成功" };
  }),

  // 获取所有会话
  getSessions: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(aiChatSessions).orderBy(desc(aiChatSessions.lastActivityAt)).limit(1000);
  }),

  // 创建新会话
  createSession: requirePermission('ai:assistant:chat').input(z.object({
    assistantType: z.enum(["solution", "quotation", "planning", "kpi", "personal"]).optional(),
    title: z.string().max(200).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [session] = await db.insert(aiChatSessions).values({
      userId: ctx.user.id,
      assistantType: input.assistantType || "solution",
      title: input.title || "新会话",
    } as any).returning();
    return { success: true, message: "会话已创建", data: session };
  }),

  // 获取会话消息
  getMessages: protectedProcedure.input(z.object({
    sessionId: z.union([z.string(), z.number()]).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const sessionId = typeof input?.sessionId === "string" ? parseInt(input.sessionId) : (input?.sessionId || 0);
    return await db.select().from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(aiChatMessages.createdAt).limit(1000);
  }),

  // 添加消息
  addMessage: requirePermission('ai:assistant:chat').input(z.object({
    sessionId: z.union([z.string(), z.number()]),
    role: z.enum(["user", "assistant", "system"]).optional(),
    content: z.string().max(50000).optional(),
    contentType: z.enum(["text", "table", "code", "file"]).optional(),
    metadata: jsonValue.optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const sessionId = typeof input.sessionId === "string" ? parseInt(input.sessionId) : input.sessionId;
    const [message] = await db.insert(aiChatMessages).values({
      sessionId,
      role: input.role || "user",
      content: input.content || "",
      contentType: input.contentType || "text",
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    } as any).returning();

    // Update session message count and last activity
    await db.update(aiChatSessions)
      .set({
        messageCount: (await db.select({ count: count() }).from(aiChatMessages).where(eq(aiChatMessages.sessionId, sessionId)))[0].count,
        lastActivityAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(aiChatSessions.id, sessionId));

    return { success: true, message: "消息已添加", data: message };
  }),

  // 统计
  getStats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [totalSessions] = await db.select({ count: count() }).from(aiChatSessions);
    const [totalMessages] = await db.select({ count: count() }).from(aiChatMessages);
    return {
      stats: {
        totalSessions: totalSessions.count,
        totalMessages: totalMessages.count,
      },
    };
  }),
});
