import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import {
  communityMembers,
  communityMessages,
  contentLibrary,
  sensitiveWords,
  communityStats,
  interactionLogs,
} from "../../drizzle/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";

export const communityRouter = router({
  // 社群列表（按成员统计分组展示）
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const members = await db.select().from(communityMembers).orderBy(desc(communityMembers.createdAt)).limit(100);
    return { items: members, total: members.length, page: 1, pageSize: members.length };
  }),

  // 获取成员详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [member] = await db.select().from(communityMembers).where(eq(communityMembers.id, parseInt(input.id))).limit(1000);
    return member || null;
  }),

  // 添加成员
  create: requirePermission('collab:community:post').input(z.object({
    externalId: z.string(),
    platform: z.enum(["wechat", "wecom", "dingtalk", "other"]).default("wechat"),
    nickname: z.string(),
    realName: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [member] = await db.insert(communityMembers).values(input).returning();
    return { success: true, message: "成员已添加", data: member };
  }),

  // 更新成员
  update: requirePermission('collab:community:post').input(z.object({
    id: z.string(),
    nickname: z.string().optional(),
    realName: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    tags: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...updates } = input;
    const [member] = await db.update(communityMembers)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(communityMembers.id, parseInt(id)))
      .returning();
    return { success: true, message: "更新成功", data: member };
  }),

  // 删除成员
  delete: requirePermission('collab:community:post').input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(communityMembers).where(eq(communityMembers.id, parseInt(input.id)));
    return { success: true, message: "删除成功" };
  }),

  // 获取帖子/消息
  getPosts: protectedProcedure.query(async () => {
    const db = await requireDb();
    const messages = await db.select().from(communityMessages)
      .where(eq(communityMessages.publishStatus, "published"))
      .orderBy(desc(communityMessages.createdAt))
      .limit(50);
    return messages;
  }),

  // 点赞
  like: requirePermission('collab:community:post').input(z.object({ messageId: z.number() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    // Log as interaction
    await db.insert(interactionLogs).values({
      interactionType: "feedback" as const,
      memberId: ctx.user!.id,
      messageId: input.messageId,
      originalContent: "like",
    });
    return { success: true, message: "点赞成功" };
  }),

  // 统计
  getStats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [memberCount] = await db.select({ count: count() }).from(communityMembers);
    const [activeCount] = await db.select({ count: count() }).from(communityMembers).where(eq(communityMembers.status, "active"));
    const [messageCount] = await db.select({ count: count() }).from(communityMessages);
    const [contentCount] = await db.select({ count: count() }).from(contentLibrary);

    // Get latest stats record
    const [latestStat] = await db.select().from(communityStats).orderBy(desc(communityStats.statDate)).limit(1);

    return {
      stats: {
        totalMembers: memberCount.count,
        activeMembers: activeCount.count,
        totalMessages: messageCount.count,
        totalContent: contentCount.count,
        ...(latestStat ? {
          questionsAsked: latestStat.questionsAsked,
          questionsAnswered: latestStat.questionsAnswered,
          avgResponseTime: latestStat.avgResponseTime,
          leadsGenerated: latestStat.leadsGenerated,
        } : {}),
      },
    };
  }),

  // 成员列表
  getMembers: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(communityMembers).orderBy(desc(communityMembers.lastActiveAt)).limit(100);
  }),

  // 验证成员
  verifyMember: requirePermission('collab:community:post').input(z.object({
    memberId: z.number(),
    status: z.enum(["verified", "rejected"]),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(communityMembers)
      .set({
        verificationStatus: input.status,
        status: input.status === "verified" ? ("active" as const) : ("pending" as const),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(communityMembers.id, input.memberId));
    return { success: true, message: input.status === "verified" ? "已验证" : "已拒绝" };
  }),

  // 创建内容
  createContent: requirePermission('collab:community:post').input(z.object({
    title: z.string(),
    content: z.string(),
    contentType: z.enum(["article", "case_study", "tip", "faq", "announcement", "tutorial"]).default("article"),
    category: z.string().optional(),
    tags: z.string().optional(),
    sourceType: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [item] = await db.insert(contentLibrary).values({
      title: input.title,
      content: input.content,
      contentType: input.contentType,
      category: input.category,
      tags: input.tags,
      authorId: ctx.user!.id,
    }).returning();
    return { success: true, message: "内容已创建", data: item };
  }),

  // 发布内容
  publishContent: requirePermission('collab:community:post').input(z.object({ contentId: z.number() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(contentLibrary)
      .set({
        approvalStatus: "approved" as const,
        pushStatus: "published" as const,
        pushedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(contentLibrary.id, input.contentId));
    return { success: true, message: "已发布" };
  }),

  // 获取待审核内容
  getPendingContent: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(contentLibrary)
      .where(eq(contentLibrary.approvalStatus, "draft"))
      .orderBy(desc(contentLibrary.createdAt)).limit(1000);
  }),

  // 审核内容
  approveContent: requirePermission('collab:community:post').input(z.object({
    contentId: z.number(),
    status: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const approved = input.status === "approved";
    await db.update(contentLibrary)
      .set({
        approvalStatus: approved ? ("approved" as const) : ("rejected" as const),
        approvedBy: ctx.user!.id,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(contentLibrary.id, input.contentId));
    return { success: true, message: approved ? "已通过" : "已拒绝" };
  }),

  // 敏感词列表
  getSensitiveWords: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(sensitiveWords).where(eq(sensitiveWords.isActive, 1)).orderBy(desc(sensitiveWords.createdAt)).limit(1000);
  }),

  // 添加敏感词
  addSensitiveWord: requirePermission('collab:community:post').input(z.object({
    word: z.string(),
    category: z.string().optional(),
    severity: z.string().optional(),
    action: z.string().optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [word] = await db.insert(sensitiveWords).values({
      word: input.word,
    }).returning();
    return { success: true, message: "敏感词已添加", data: word };
  }),

  // 初始化默认敏感词
  initDefaultSensitiveWords: requirePermission('collab:community:post').mutation(async () => {
    const db = await requireDb();
    const existing = await db.select({ count: count() }).from(sensitiveWords);
    if (existing[0].count > 0) return { success: true, message: "敏感词库已存在" };

    const defaults = [
      { word: "底价", category: "price" as const },
      { word: "回扣", category: "price" as const },
      { word: "佣金", category: "price" as const },
      { word: "成本价", category: "price" as const },
      { word: "配方", category: "formula" as const },
      { word: "客户名单", category: "customer" as const },
    ];

    for (const sw of defaults) {
      await db.insert(sensitiveWords).values(sw);
    }
    return { success: true, message: "默认敏感词已初始化" };
  }),

  // 待审核外发消息
  getPendingMessages: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(communityMessages)
      .where(and(
        eq(communityMessages.direction, "outbound"),
        eq(communityMessages.approvalStatus, "pending"),
      ))
      .orderBy(desc(communityMessages.createdAt)).limit(1000);
  }),

  // 审核外发消息
  approveOutboundMessage: requirePermission('collab:community:post').input(z.object({
    messageId: z.number(),
    status: z.string(),
    reason: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const approved = input.status === "approved";
    await db.update(communityMessages)
      .set({
        approvalStatus: approved ? ("approved" as const) : ("rejected" as const),
        approvedBy: ctx.user!.id,
        approvedAt: new Date().toISOString(),
        rejectionReason: approved ? undefined : input.reason,
        publishStatus: approved ? ("queued" as const) : ("draft" as const),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(communityMessages.id, input.messageId));
    return { success: true, message: approved ? "已批准" : "已拒绝" };
  }),
});
