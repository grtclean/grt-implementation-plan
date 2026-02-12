/**
 * AI Chat History Routes
 * 对话历史持久化tRPC路由
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as chatHistoryService from "./chatHistoryService";

// 助手类型枚举
const assistantTypeSchema = z.enum(["solution", "quotation", "planning", "kpi", "personal"]);

// 会话状态枚举
const sessionStatusSchema = z.enum(["active", "archived", "deleted"]);

// 消息角色枚举
const messageRoleSchema = z.enum(["user", "assistant", "system"]);

// 内容类型枚举
const contentTypeSchema = z.enum(["text", "table", "code", "file"]);

export const chatHistoryRouter = router({
  // ============================================
  // 会话管理
  // ============================================

  /**
   * 创建新会话
   */
  createSession: protectedProcedure
    .input(z.object({
      assistantType: assistantTypeSchema,
      title: z.string().optional(),
      projectId: z.number().optional(),
      customerId: z.number().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return chatHistoryService.createSession({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * 获取用户会话列表
   */
  getSessions: protectedProcedure
    .input(z.object({
      assistantType: assistantTypeSchema.optional(),
      status: sessionStatusSchema.optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return chatHistoryService.getUserSessions({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * 获取单个会话详情
   */
  getSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .query(async ({ input }) => {
      return chatHistoryService.getSessionById(input.sessionId);
    }),

  /**
   * 更新会话信息
   */
  updateSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      title: z.string().optional(),
      status: sessionStatusSchema.optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { sessionId, ...updates } = input;
      return chatHistoryService.updateSession(sessionId, updates);
    }),

  /**
   * 删除会话（软删除）
   */
  deleteSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return chatHistoryService.deleteSession(input.sessionId);
    }),

  /**
   * 归档会话
   */
  archiveSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return chatHistoryService.updateSession(input.sessionId, { status: "archived" });
    }),

  // ============================================
  // 消息管理
  // ============================================

  /**
   * 添加消息到会话
   */
  addMessage: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      role: messageRoleSchema,
      content: z.string(),
      contentType: contentTypeSchema.optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      return chatHistoryService.addMessage(input);
    }),

  /**
   * 获取会话消息列表
   */
  getMessages: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      limit: z.number().min(1).max(500).optional(),
      offset: z.number().min(0).optional(),
    }))
    .query(async ({ input }) => {
      return chatHistoryService.getSessionMessages(input);
    }),

  /**
   * 更新消息反馈
   */
  updateMessageFeedback: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      feedback: z.enum(["positive", "negative"]),
      feedbackContent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { messageId, ...feedback } = input;
      return chatHistoryService.updateMessageFeedback(messageId, feedback);
    }),

  /**
   * 切换消息收藏状态
   */
  toggleBookmark: protectedProcedure
    .input(z.object({
      messageId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return chatHistoryService.toggleMessageBookmark(input.messageId);
    }),

  /**
   * 获取收藏的消息
   */
  getBookmarkedMessages: protectedProcedure
    .query(async ({ ctx }) => {
      return chatHistoryService.getBookmarkedMessages(ctx.user.id);
    }),

  // ============================================
  // 模板管理
  // ============================================

  /**
   * 获取对话模板列表
   */
  getTemplates: protectedProcedure
    .input(z.object({
      assistantType: assistantTypeSchema.optional(),
      includePublic: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return chatHistoryService.getTemplates({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * 创建对话模板
   */
  createTemplate: protectedProcedure
    .input(z.object({
      assistantType: assistantTypeSchema,
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      content: z.string().min(1),
      category: z.string().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return chatHistoryService.createTemplate({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * 使用模板（增加使用次数）
   */
  useTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return chatHistoryService.useTemplate(input.templateId);
    }),

  // ============================================
  // 统计信息
  // ============================================

  /**
   * 获取用户对话统计
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      return chatHistoryService.getUserChatStats(ctx.user.id);
    }),
});
