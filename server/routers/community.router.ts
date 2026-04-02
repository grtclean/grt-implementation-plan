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
import { communityPosts, communityComments, communitySensitiveWords } from "../../drizzle/employee-points-schema";
import { filterSensitiveContent } from "../services/employee-points.service";
import { eq, desc, and, count, sql, inArray } from "drizzle-orm";

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

  // ══════════════════════════════════════════════════════════
  // Forum — 客户技术论坛 (customer + employee accessible)
  // ══════════════════════════════════════════════════════════
  forum: router({
    listTopics: protectedProcedure.input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(50).default(20),
      postType: z.string().optional(),
      search: z.string().optional(),
    })).query(async ({ input }) => {
      const db = await requireDb();
      const offset = (input.page - 1) * input.pageSize;
      const forumTypes = ["discussion", "tech_forum", "product_qa", "knowledge"];
      let items = await db.select().from(communityPosts)
        .where(and(
          eq(communityPosts.isActive, true),
          input.postType ? eq(communityPosts.postType, input.postType as any) : sql`${communityPosts.postType} = ANY(${forumTypes})`,
        ))
        .orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      if (input.search) {
        const s = `%${input.search}%`;
        items = await db.select().from(communityPosts)
          .where(and(
            eq(communityPosts.isActive, true),
            sql`${communityPosts.postType} = ANY(${forumTypes})`,
            sql`(${communityPosts.title} ILIKE ${s} OR ${communityPosts.content} ILIKE ${s})`,
          ))
          .orderBy(desc(communityPosts.createdAt))
          .limit(input.pageSize)
          .offset(offset);
      }

      // Fetch author names from users table
      const authorIds = [...new Set(items.map(i => i.authorId).filter(id => id > 0))];
      let authorMap: Record<number, { name: string; company?: string; userType?: string }> = {};
      if (authorIds.length > 0) {
        try {
          const { users } = await import("../../drizzle/schema");
          const authors = await db.select({ id: users.id, name: users.name, company: sql<string>`company`, userType: sql<string>`user_type` })
            .from(users).where(inArray(users.id, authorIds)).limit(100);
          for (const a of authors) authorMap[a.id] = { name: a.name || "匿名", company: a.company, userType: a.userType };
        } catch { /* users table columns may vary */ }
      }

      return {
        items: items.map(i => ({
          ...i,
          authorName: authorMap[i.authorId]?.name || (i.authorId === 0 ? "系统" : "匿名"),
          authorCompany: authorMap[i.authorId]?.company || "",
          authorType: authorMap[i.authorId]?.userType || "employee",
        })),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

    getTopicDetail: protectedProcedure.input(z.object({
      postId: z.number(),
    })).query(async ({ input }) => {
      const db = await requireDb();
      // Increment view count
      await db.update(communityPosts).set({
        viewCount: sql`${communityPosts.viewCount} + 1`,
      }).where(eq(communityPosts.id, input.postId));

      const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, input.postId)).limit(1);
      if (!post) return null;

      const comments = await db.select().from(communityComments)
        .where(and(eq(communityComments.postId, input.postId), eq(communityComments.isActive, true)))
        .orderBy(communityComments.createdAt)
        .limit(200);

      // Fetch post author
      let postAuthor = { name: "系统", company: "", userType: "employee" };
      if (post.authorId > 0) {
        try {
          const { users } = await import("../../drizzle/schema");
          const [a] = await db.select({ name: users.name, company: sql<string>`company`, userType: sql<string>`user_type` })
            .from(users).where(eq(users.id, post.authorId)).limit(1);
          if (a) postAuthor = { name: a.name || "匿名", company: a.company || "", userType: a.userType || "employee" };
        } catch {}
      }

      return { post: { ...post, ...postAuthor }, comments };
    }),

    createTopic: protectedProcedure.input(z.object({
      title: z.string().min(2).max(300),
      content: z.string().min(5).max(10000),
      postType: z.enum(["tech_forum", "product_qa", "discussion", "knowledge"]).default("tech_forum"),
    })).mutation(async ({ input, ctx }) => {
      const titleCheck = await filterSensitiveContent(input.title);
      const contentCheck = await filterSensitiveContent(input.content);

      if (titleCheck.blockedWords.length > 0 || contentCheck.blockedWords.length > 0) {
        const blocked = [...titleCheck.blockedWords, ...contentCheck.blockedWords];
        throw new Error(`内容包含违禁词，无法发布: ${blocked.join(", ")}`);
      }

      const db = await requireDb();
      const [post] = await db.insert(communityPosts).values({
        authorId: ctx.user!.id,
        postType: input.postType as any,
        title: titleCheck.filteredText,
        content: contentCheck.filteredText,
        contentClean: titleCheck.clean && contentCheck.clean,
        scope: "company_wide",
      }).returning();

      return post;
    }),

    createComment: protectedProcedure.input(z.object({
      postId: z.number(),
      content: z.string().min(1).max(5000),
      parentId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const check = await filterSensitiveContent(input.content);
      if (check.blockedWords.length > 0) {
        throw new Error(`评论包含违禁词: ${check.blockedWords.join(", ")}`);
      }

      const db = await requireDb();
      const userName = ctx.user?.name || "匿名";
      let userCompany = "";
      let userType = "employee";
      try {
        const { users } = await import("../../drizzle/schema");
        const [u] = await db.select({ company: sql<string>`company`, userType: sql<string>`user_type` })
          .from(users).where(eq(users.id, ctx.user!.id)).limit(1);
        if (u) { userCompany = u.company || ""; userType = u.userType || "employee"; }
      } catch {}

      const [comment] = await db.insert(communityComments).values({
        postId: input.postId,
        authorId: ctx.user!.id,
        authorType: userType,
        authorName: userName,
        authorCompany: userCompany,
        parentId: input.parentId ?? null,
        content: check.filteredText,
        contentClean: check.clean,
        sensitiveWordsDetected: check.flaggedWords.length > 0 ? JSON.stringify(check.flaggedWords) : null,
      }).returning();

      // Increment comment count
      await db.update(communityPosts).set({
        commentCount: sql`${communityPosts.commentCount} + 1`,
      }).where(eq(communityPosts.id, input.postId));

      return comment;
    }),

    likeTopic: protectedProcedure.input(z.object({
      postId: z.number(),
    })).mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(communityPosts).set({
        likeCount: sql`${communityPosts.likeCount} + 1`,
      }).where(eq(communityPosts.id, input.postId));
      return { success: true };
    }),

    getForumStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const forumTypes = ["discussion", "tech_forum", "product_qa", "knowledge"];
      const [topicCount] = await db.select({ c: count() }).from(communityPosts)
        .where(and(eq(communityPosts.isActive, true), sql`${communityPosts.postType} = ANY(${forumTypes})`));
      const [commentCount] = await db.select({ c: count() }).from(communityComments)
        .where(eq(communityComments.isActive, true));
      const [myTopics] = await db.select({ c: count() }).from(communityPosts)
        .where(and(eq(communityPosts.authorId, ctx.user!.id), eq(communityPosts.isActive, true)));
      return {
        totalTopics: topicCount?.c ?? 0,
        totalComments: commentCount?.c ?? 0,
        myTopics: myTopics?.c ?? 0,
      };
    }),

    adminListFlagged: requirePermission('collab:community:post').query(async () => {
      const db = await requireDb();
      const flaggedPosts = await db.select().from(communityPosts)
        .where(and(eq(communityPosts.contentClean, false), eq(communityPosts.isActive, true)))
        .orderBy(desc(communityPosts.createdAt)).limit(50);
      const flaggedComments = await db.select().from(communityComments)
        .where(and(eq(communityComments.contentClean, false), eq(communityComments.isActive, true)))
        .orderBy(desc(communityComments.createdAt)).limit(50);
      return { posts: flaggedPosts, comments: flaggedComments };
    }),

    adminModerate: requirePermission('collab:community:post').input(z.object({
      targetType: z.enum(["post", "comment"]),
      targetId: z.number(),
      action: z.enum(["approve", "reject", "delete"]),
    })).mutation(async ({ input }) => {
      const db = await requireDb();
      if (input.targetType === "post") {
        if (input.action === "delete") {
          await db.update(communityPosts).set({ isActive: false }).where(eq(communityPosts.id, input.targetId));
        } else {
          await db.update(communityPosts).set({ contentClean: input.action === "approve" }).where(eq(communityPosts.id, input.targetId));
        }
      } else {
        if (input.action === "delete") {
          await db.update(communityComments).set({ isActive: false }).where(eq(communityComments.id, input.targetId));
        } else {
          await db.update(communityComments).set({
            isApproved: input.action === "approve",
            contentClean: input.action === "approve",
          }).where(eq(communityComments.id, input.targetId));
        }
      }
      return { success: true };
    }),
  }),
});
