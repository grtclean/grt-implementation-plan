import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { aiChatSessions, aiChatMessages } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";

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
    const [session] = await db.select().from(aiChatSessions).where(eq(aiChatSessions.id, parseInt(input.id)));
    return session || null;
  }),

  // 创建会话
  create: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const [session] = await db.insert(aiChatSessions).values({
      userId: input.userId || 1,
      assistantType: input.assistantType || "solution",
      title: input.title,
      projectId: input.projectId,
      customerId: input.customerId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    }).returning();
    return { success: true, message: "会话已创建", data: session };
  }),

  // 更新会话
  update: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.title !== undefined) updates.title = input.title;
    if (input.status !== undefined) updates.status = input.status;
    const [session] = await db.update(aiChatSessions)
      .set(updates)
      .where(eq(aiChatSessions.id, id))
      .returning();
    return { success: true, message: "更新成功", data: session };
  }),

  // 删除会话
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await db.delete(aiChatMessages).where(eq(aiChatMessages.sessionId, id));
    await db.delete(aiChatSessions).where(eq(aiChatSessions.id, id));
    return { success: true, message: "删除成功" };
  }),

  // 获取所有会话
  getSessions: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(aiChatSessions).orderBy(desc(aiChatSessions.lastActivityAt));
  }),

  // 创建新会话
  createSession: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const [session] = await db.insert(aiChatSessions).values({
      userId: input.userId || 1,
      assistantType: input.assistantType || "solution",
      title: input.title || "新会话",
    }).returning();
    return { success: true, message: "会话已创建", data: session };
  }),

  // 获取会话消息
  getMessages: protectedProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const sessionId = typeof input?.sessionId === "string" ? parseInt(input.sessionId) : (input?.sessionId || 0);
    return await db.select().from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(aiChatMessages.createdAt);
  }),

  // 添加消息
  addMessage: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const sessionId = typeof input.sessionId === "string" ? parseInt(input.sessionId) : input.sessionId;
    const [message] = await db.insert(aiChatMessages).values({
      sessionId,
      role: input.role || "user",
      content: input.content || "",
      contentType: input.contentType || "text",
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    }).returning();

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
