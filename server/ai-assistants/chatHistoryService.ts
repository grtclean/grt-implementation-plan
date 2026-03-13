/**
 * AI Chat History Service
 * 对话历史持久化服务
 */

import { getDb, requireDb } from "../db";
import { aiChatSessions, aiChatMessages, aiChatTemplates } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// 助手类型定义
export type AssistantType = "solution" | "quotation" | "planning" | "kpi" | "personal";

// 消息角色定义
export type MessageRole = "user" | "assistant" | "system";

// 会话状态定义
export type SessionStatus = "active" | "archived" | "deleted";

/**
 * 创建新的对话会话
 */
export async function createSession(params: {
  userId: number;
  assistantType: AssistantType;
  title?: string;
  projectId?: number;
  customerId?: number;
  metadata?: Record<string, unknown>;
}) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiChatSessions).values({
    userId: params.userId,
    assistantType: params.assistantType,
    title: params.title || `新对话 - ${new Date().toLocaleString("zh-CN")}`,
    projectId: params.projectId,
    customerId: params.customerId,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    messageCount: 0,
    status: "active",
  });

  return { id: result[0].insertId };
}

/**
 * 获取用户的对话会话列表
 */
export async function getUserSessions(params: {
  userId: number;
  assistantType?: AssistantType;
  status?: SessionStatus;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  if (!db) return [];

  const conditions = [eq(aiChatSessions.userId, params.userId)];

  if (params.assistantType) {
    conditions.push(eq(aiChatSessions.assistantType, params.assistantType));
  }

  if (params.status) {
    conditions.push(eq(aiChatSessions.status, params.status));
  } else {
    // 默认不显示已删除的会话
    conditions.push(sql`${aiChatSessions.status} != 'deleted'`);
  }

  const sessions = await db
    .select()
    .from(aiChatSessions)
    .where(and(...conditions))
    .orderBy(desc(aiChatSessions.lastActivityAt))
    .limit(params.limit || 20)
    .offset(params.offset || 0);

  return sessions.map(session => ({
    ...session,
    metadata: session.metadata ? JSON.parse(session.metadata) : null,
  }));
}

/**
 * 获取单个会话详情
 */
export async function getSessionById(sessionId: number) {
  const db = await requireDb();
  if (!db) return null;

  const sessions = await db
    .select()
    .from(aiChatSessions)
    .where(eq(aiChatSessions.id, sessionId))
    .limit(1);

  if (sessions.length === 0) {
    return null;
  }

  const session = sessions[0];
  return {
    ...session,
    metadata: session.metadata ? JSON.parse(session.metadata) : null,
  };
}

/**
 * 更新会话信息
 */
export async function updateSession(sessionId: number, updates: {
  title?: string;
  status?: SessionStatus;
  metadata?: Record<string, unknown>;
}) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }

  if (updates.metadata !== undefined) {
    updateData.metadata = JSON.stringify(updates.metadata);
  }

  await db
    .update(aiChatSessions)
    .set(updateData)
    .where(eq(aiChatSessions.id, sessionId));

  return { success: true };
}

/**
 * 删除会话（软删除）
 */
export async function deleteSession(sessionId: number) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(aiChatSessions)
    .set({ status: "deleted" })
    .where(eq(aiChatSessions.id, sessionId));

  return { success: true };
}

/**
 * 添加消息到会话
 */
export async function addMessage(params: {
  sessionId: number;
  role: MessageRole;
  content: string;
  contentType?: "text" | "table" | "code" | "file";
  metadata?: Record<string, unknown>;
}) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  // 插入消息
  const result = await db.insert(aiChatMessages).values({
    sessionId: params.sessionId,
    role: params.role,
    content: params.content,
    contentType: params.contentType || "text",
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
  });

  // 更新会话的消息数量和最后活动时间
  await db
    .update(aiChatSessions)
    .set({
      messageCount: sql`${aiChatSessions.messageCount} + 1`,
      lastActivityAt: new Date().toISOString(),
    })
    .where(eq(aiChatSessions.id, params.sessionId));

  // 如果是第一条用户消息，自动更新会话标题
  const session = await getSessionById(params.sessionId);
  if (session && session.messageCount === 1 && params.role === "user") {
    const title = params.content.slice(0, 50) + (params.content.length > 50 ? "..." : "");
    await updateSession(params.sessionId, { title });
  }

  return { id: result[0].insertId };
}

/**
 * 获取会话的消息列表
 */
export async function getSessionMessages(params: {
  sessionId: number;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  if (!db) return [];

  const messages = await db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.sessionId, params.sessionId))
    .orderBy(aiChatMessages.createdAt)
    .limit(params.limit || 100)
    .offset(params.offset || 0);

  return messages.map(msg => ({
    ...msg,
    metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
  }));
}

/**
 * 更新消息反馈
 */
export async function updateMessageFeedback(messageId: number, feedback: {
  feedback: "positive" | "negative";
  feedbackContent?: string;
}) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(aiChatMessages)
    .set({
      feedback: feedback.feedback,
      feedbackContent: feedback.feedbackContent,
    })
    .where(eq(aiChatMessages.id, messageId));

  return { success: true };
}

/**
 * 切换消息收藏状态
 */
export async function toggleMessageBookmark(messageId: number) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  // 获取当前状态
  const messages = await db
    .select({ isBookmarked: aiChatMessages.isBookmarked })
    .from(aiChatMessages)
    .where(eq(aiChatMessages.id, messageId))
    .limit(1);

  if (messages.length === 0) {
    throw new Error("Message not found");
  }

  const newStatus = messages[0].isBookmarked ? 0 : 1;

  await db
    .update(aiChatMessages)
    .set({ isBookmarked: newStatus })
    .where(eq(aiChatMessages.id, messageId));

  return { isBookmarked: newStatus === 1 };
}

/**
 * 获取用户收藏的消息
 */
export async function getBookmarkedMessages(userId: number) {
  const db = await requireDb();
  if (!db) return [];

  const messages = await db
    .select({
      message: aiChatMessages,
      session: aiChatSessions,
    })
    .from(aiChatMessages)
    .innerJoin(aiChatSessions, eq(aiChatMessages.sessionId, aiChatSessions.id))
    .where(and(
      eq(aiChatSessions.userId, userId),
      eq(aiChatMessages.isBookmarked, 1)
    ))
    .orderBy(desc(aiChatMessages.createdAt))
    .limit(1000);

  return messages.map(({ message, session }) => ({
    ...message,
    metadata: message.metadata ? JSON.parse(message.metadata) : null,
    sessionTitle: session.title,
    assistantType: session.assistantType,
  }));
}

/**
 * 获取对话模板列表
 */
export async function getTemplates(params: {
  userId?: number;
  assistantType?: AssistantType;
  includePublic?: boolean;
}) {
  const db = await requireDb();
  if (!db) return [];

  const conditions = [];

  if (params.assistantType) {
    conditions.push(eq(aiChatTemplates.assistantType, params.assistantType));
  }

  if (params.userId) {
    if (params.includePublic) {
      conditions.push(sql`(${aiChatTemplates.userId} = ${params.userId} OR ${aiChatTemplates.isPublic} = true)`);
    } else {
      conditions.push(eq(aiChatTemplates.userId, params.userId));
    }
  } else if (params.includePublic) {
    conditions.push(eq(aiChatTemplates.isPublic, 1));
  }

  const templates = await db
    .select()
    .from(aiChatTemplates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiChatTemplates.usageCount))
    .limit(1000);

  return templates;
}

/**
 * 创建对话模板
 */
export async function createTemplate(params: {
  userId: number;
  assistantType: AssistantType;
  name: string;
  description?: string;
  content: string;
  category?: string;
  isPublic?: boolean;
}) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiChatTemplates).values({
    userId: params.userId,
    assistantType: params.assistantType,
    name: params.name,
    description: params.description,
    content: params.content,
    category: params.category,
    isPublic: params.isPublic ? 1 : 0,
  });

  return { id: result[0].insertId };
}

/**
 * 使用模板（增加使用次数）
 */
export async function useTemplate(templateId: number) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(aiChatTemplates)
    .set({
      usageCount: sql`${aiChatTemplates.usageCount} + 1`,
    })
    .where(eq(aiChatTemplates.id, templateId));

  return { success: true };
}

/**
 * 获取用户的对话统计
 */
export async function getUserChatStats(userId: number) {
  const db = await requireDb();
  if (!db) return { sessionsByType: {}, totalSessions: 0, totalMessages: 0, bookmarkedMessages: 0 };

  // 获取各助手类型的会话数量
  const sessionStats = await db
    .select({
      assistantType: aiChatSessions.assistantType,
      count: sql<number>`COUNT(*)`,
    })
    .from(aiChatSessions)
    .where(and(
      eq(aiChatSessions.userId, userId),
      sql`${aiChatSessions.status} != 'deleted'`
    ))
    .groupBy(aiChatSessions.assistantType);

  // 获取总消息数
  const messageStats = await db
    .select({
      totalMessages: sql<number>`COUNT(*)`,
    })
    .from(aiChatMessages)
    .innerJoin(aiChatSessions, eq(aiChatMessages.sessionId, aiChatSessions.id))
    .where(eq(aiChatSessions.userId, userId));

  // 获取收藏消息数
  const bookmarkStats = await db
    .select({
      bookmarkedCount: sql<number>`COUNT(*)`,
    })
    .from(aiChatMessages)
    .innerJoin(aiChatSessions, eq(aiChatMessages.sessionId, aiChatSessions.id))
    .where(and(
      eq(aiChatSessions.userId, userId),
      eq(aiChatMessages.isBookmarked, 1)
    ));

  return {
    sessionsByType: sessionStats.reduce((acc: Record<string, number>, stat: { assistantType: string; count: number }) => {
      acc[stat.assistantType] = stat.count;
      return acc;
    }, {} as Record<string, number>),
    totalSessions: sessionStats.reduce((sum: number, stat: { count: number }) => sum + stat.count, 0),
    totalMessages: messageStats[0]?.totalMessages || 0,
    bookmarkedMessages: bookmarkStats[0]?.bookmarkedCount || 0,
  };
}
