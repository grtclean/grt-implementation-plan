/**
 * 员工AI助手路由 - 完整实现
 * 
 * 功能：
 * 1. 个人助手初始化
 * 2. 会话管理
 * 3. 消息发送和接收
 * 4. 技能地图
 * 5. 职业路径
 * 6. 学习记录
 */

import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { requireDb } from "../db";
import {
  employeeAiAssistants,
  aiAssistantSessions,
  aiAssistantMessages,
  employeeSkillMaps,
  careerDevelopmentPaths,
  feedback,
  aiLearningRecords,
} from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  searchDocuments,
  incrementRelevance,
} from "../modules/knowledge-base.service";

// ==================== 输入验证 ====================

const InitializeInput = z.object({
  assistantType: z.string().optional().default("general"),
});

const GetOrCreateSessionInput = z.object({
  sessionTitle: z.string().optional(),
});

const SendMessageInput = z.object({
  sessionId: z.number(),
  message: z.string(),
});

const GetSessionsInput = z.object({
  limit: z.number().optional().default(10),
});

// ==================== 路由实现 ====================

export const employeeAiAssistantRouter = router({
  /**
   * 初始化个人AI助手
   */
  initialize: protectedProcedure
    .input(InitializeInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await requireDb();
        const userId = ctx.user?.id;

        if (!userId) {
          return {
            success: false,
            error: "用户未认证",
          };
        }

        // 检查是否已初始化
        const existing = await db
          .select()
          .from(employeeAiAssistants)
          .where(eq(employeeAiAssistants.employeeId, userId))
          .limit(1);

        if (existing.length > 0) {
          return {
            success: true,
            message: "助手已初始化",
            assistantId: existing[0].id,
          };
        }

        // 创建新的助手记录
        const result = await db
          .insert(employeeAiAssistants)
          .values({
            employeeId: userId,
            assistantCode: `AST-${Date.now()}`,
            assistantName: `个人助手-${new Date().toLocaleDateString()}`,
            assistantType: (input.assistantType || "general") as any,
            status: "active",
          })
          .returning();

        return {
          success: true,
          message: "助手初始化成功",
          assistantId: result[0]?.id,
        };
      } catch (error) {
        console.error("[initialize] Error:", error);
        return {
          success: false,
          error: "初始化失败",
        };
      }
    }),

  /**
   * 获取我的助手信息
   */
  getMyAssistant: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await requireDb();
      const userId = ctx.user?.id;

      if (!userId) {
        return null;
      }

      const result = await db
        .select()
        .from(employeeAiAssistants)
        .where(eq(employeeAiAssistants.employeeId, userId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("[getMyAssistant] Error:", error);
      return null;
    }
  }),

  /**
   * 获取或创建会话
   */
  getOrCreateSession: protectedProcedure
    .input(GetOrCreateSessionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await requireDb();
        const userId = ctx.user?.id;

        if (!userId) {
          throw new Error("用户未认证");
        }

        // 获取用户的助手
        const assistant = await db
          .select()
          .from(employeeAiAssistants)
          .where(eq(employeeAiAssistants.employeeId, userId))
          .limit(1);

        if (!assistant[0]) {
          throw new Error("助手未初始化");
        }

        // 创建新会话
        const result = await db
          .insert(aiAssistantSessions)
          .values({
            sessionId: `session-${Date.now()}`,
            assistantId: assistant[0].id,
            userId: userId,
            title: input.sessionTitle || `会话 - ${new Date().toLocaleString()}`,
            status: "active",
          })
          .returning();

        return {
          sessionId: result[0]?.id,
          title: result[0]?.title,
        };
      } catch (error) {
        console.error("[getOrCreateSession] Error:", error);
        throw error;
      }
    }),

  /**
   * 获取我的会话列表
   */
  getMySessions: protectedProcedure
    .input(GetSessionsInput)
    .query(async ({ ctx, input }) => {
      try {
        const db = await requireDb();
        const userId = ctx.user?.id;

        if (!userId) {
          return [];
        }

        // 获取用户的助手
        const assistant = await db
          .select()
          .from(employeeAiAssistants)
          .where(eq(employeeAiAssistants.employeeId, userId))
          .limit(1);

        if (!assistant[0]) {
          return [];
        }

        // 获取会话列表
        const result = await db
          .select()
          .from(aiAssistantSessions)
          .where(eq(aiAssistantSessions.assistantId, assistant[0].id))
          .orderBy(desc(aiAssistantSessions.createdAt))
          .limit(input.limit);

        return result;
      } catch (error) {
        console.error("[getMySessions] Error:", error);
        return [];
      }
    }),

  /**
   * 发送消息
   */
  sendMessage: protectedProcedure
    .input(SendMessageInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await requireDb();
        const userId = ctx.user?.id;

        if (!userId) {
          throw new Error("用户未认证");
        }

        // 保存用户消息
        await db.insert(aiAssistantMessages).values({
          sessionId: String(input.sessionId),
          role: "user",
          content: input.message,
        });

        // RAG: 检索知识库中与用户消息相关的文档
        let knowledgeContext = "";
        let matchedDocIds: number[] = [];
        try {
          const searchResults = await searchDocuments(input.message, { limit: 3 });
          if (searchResults.length > 0) {
            matchedDocIds = searchResults.map((r) => r.id);
            const knowledgeEntries = searchResults
              .map(
                (r, i) =>
                  `[知识条目${i + 1}] ${r.title}\n类别: ${r.category}\n内容: ${r.content}`
              )
              .join("\n\n");
            knowledgeContext = `基于以下知识库条目:\n\n${knowledgeEntries}\n\n`;
          }
        } catch (ragError) {
          // RAG查询失败不应阻断LLM调用，继续使用无上下文模式
          console.error("[sendMessage] RAG search error:", ragError);
        }

        // 构建用户消息（如果有知识库上下文则注入）
        const userContent = knowledgeContext
          ? `${knowledgeContext}请基于以上知识库信息回答用户的问题: ${input.message}`
          : input.message;

        // 调用LLM获取响应
        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "你是一个专业的个人AI助手，帮助员工进行职业发展、技能提升和日常工作协助。你可以利用知识库中的技术文档来回答GRT清洗设备相关的专业问题。请以友好、专业的方式回复。",
            },
            {
              role: "user",
              content: userContent,
            },
          ],
        });

        // RAG: 对匹配的知识文档提升相关性分数
        for (const docId of matchedDocIds) {
          try {
            await incrementRelevance(docId);
          } catch (relError) {
            console.error("[sendMessage] incrementRelevance error:", relError);
          }
        }

        const assistantContent =
          llmResponse.choices?.[0]?.message?.content || "无法生成回复";

        // 保存助手消息
        await db.insert(aiAssistantMessages).values({
          sessionId: String(input.sessionId),
          role: "assistant",
          content: assistantContent,
        });

        return {
          success: true,
          response: assistantContent,
        };
      } catch (error) {
        console.error("[sendMessage] Error:", error);
        return {
          success: false,
          error: "发送失败",
        };
      }
    }),

  /**
   * 获取技能地图
   */
  getSkillMap: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await requireDb();
      const userId = ctx.user?.id;

      if (!userId) {
        return null;
      }

      // 获取用户的助手
      const assistant = await db
        .select()
        .from(employeeAiAssistants)
        .where(eq(employeeAiAssistants.employeeId, userId))
        .limit(1);

      if (!assistant[0]) {
        return null;
      }

      // 获取技能评估
      const skills = await db
        .select()
        .from(employeeSkillMaps)
        .where(eq(employeeSkillMaps.employeeId, userId));

      return {
        assistantId: assistant[0].id,
        skills: skills || [],
        totalSkills: skills?.length || 0,
      };
    } catch (error) {
      console.error("[getSkillMap] Error:", error);
      return null;
    }
  }),

  /**
   * 获取职业路径
   */
  getCareerPaths: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await requireDb();
      const userId = ctx.user?.id;

      if (!userId) {
        return [];
      }

      // 获取用户的助手
      const assistant = await db
        .select()
        .from(employeeAiAssistants)
        .where(eq(employeeAiAssistants.employeeId, userId))
        .limit(1);

      if (!assistant[0]) {
        return [];
      }

      // 获取职业路径
      const paths = await db
        .select()
        .from(careerDevelopmentPaths);

      return paths || [];
    } catch (error) {
      console.error("[getCareerPaths] Error:", error);
      return [];
    }
  }),

  /**
   * 记录反馈
   */
  recordFeedback: protectedProcedure
    .input(
      z.object({
        type: z.string(),
        content: z.string(),
        rating: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await requireDb();
        const userId = ctx.user?.id;

        if (!userId) {
          throw new Error("用户未认证");
        }

        // 获取用户的助手
        const assistant = await db
          .select()
          .from(employeeAiAssistants)
          .where(eq(employeeAiAssistants.employeeId, userId))
          .limit(1);

        if (!assistant[0]) {
          throw new Error("助手未初始化");
        }

        // 记录反馈
        const result = await db
          .insert(feedback)
          .values({
            type: input.type as "suggestion" | "bug" | "other",
            content: input.content,
          })
          .returning();

        return {
          success: true,
          feedbackId: result[0]?.id,
        };
      } catch (error) {
        console.error("[recordFeedback] Error:", error);
        return {
          success: false,
          error: "记录失败",
        };
      }
    }),

  /**
   * 获取学习记录
   */
  getLearningRecords: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await requireDb();
      const userId = ctx.user?.id;

      if (!userId) {
        return [];
      }

      // 获取用户的助手
      const assistant = await db
        .select()
        .from(employeeAiAssistants)
        .where(eq(employeeAiAssistants.employeeId, userId))
        .limit(1);

      if (!assistant[0]) {
        return [];
      }

      // 获取学习记录
      const records = await db
        .select()
        .from(aiLearningRecords)
        .orderBy(desc(aiLearningRecords.createdAt));

      return records || [];
    } catch (error) {
      console.error("[getLearningRecords] Error:", error);
      return [];
    }
  }),

  /**
   * 基础CRUD操作
   */
  list: publicProcedure.query(async () => {
    return { items: [], total: 0, page: 1, pageSize: 10 };
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async () => {
      return null;
    }),

  create: protectedProcedure
    .input(z.any())
    .mutation(async () => {
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.any())
    .mutation(async () => {
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async () => {
      return { success: true };
    }),
});
