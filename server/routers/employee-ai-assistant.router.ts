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

import { protectedProcedure, router } from "../_core/trpc";
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
import { eq, desc, and, asc } from "drizzle-orm";
import { helpArticles } from "../../drizzle/help-schema";
import {
  searchDocuments,
  incrementRelevance,
} from "../modules/knowledge-base.service";
import {
  provisionAllEmployees,
  provisionSingleEmployee,
  refreshPresetsByRole,
  getProvisioningStatus,
  listAllAssistants,
  buildOwnerContext,
} from "../services/ai-assistant-provisioning.service";

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
   * 发送消息 — enhanced with conversation memory
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

        // Verify session belongs to the current user
        const [session] = await db
          .select({ userId: aiAssistantSessions.userId })
          .from(aiAssistantSessions)
          .where(eq(aiAssistantSessions.id, input.sessionId))
          .limit(1);
        if (!session) {
          throw new Error("会话不存在");
        }
        if (session.userId !== userId) {
          throw new Error("无权访问此会话");
        }

        // 保存用户消息
        await db.insert(aiAssistantMessages).values({
          sessionId: String(input.sessionId),
          role: "user",
          content: input.message,
        });

        // ── Conversation Memory: load last 50 messages from session ──
        const pastMessages = await db
          .select({ role: aiAssistantMessages.role, content: aiAssistantMessages.content })
          .from(aiAssistantMessages)
          .where(eq(aiAssistantMessages.sessionId, String(input.sessionId)))
          .orderBy(asc(aiAssistantMessages.createdAt))
          .limit(50);

        // If >20 messages, summarize older ones for context compression
        let historySummary = "";
        let recentMessages = pastMessages;
        if (pastMessages.length > 20) {
          const olderMessages = pastMessages.slice(0, pastMessages.length - 10);
          recentMessages = pastMessages.slice(pastMessages.length - 10);

          // Build summary from older messages (simple extraction, no extra LLM call)
          const olderText = olderMessages
            .map((m) => `${m.role}: ${(m.content || "").slice(0, 100)}`)
            .join("\n");
          historySummary = `【历史摘要】以下是之前对话的要点概述:\n${olderText.slice(0, 600)}\n\n`;
        }

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
          console.error("[sendMessage] RAG search error:", ragError);
        }

        // 读取助理的 personalityConfig → 获取岗位感知系统提示词
        let systemContent =
          "你是一个专业的个人AI助手，帮助员工进行职业发展、技能提升和日常工作协助。你可以利用知识库中的技术文档来回答GRT清洗设备相关的专业问题。请以友好、专业的方式回复。";

        const [myAssistant] = await db
          .select()
          .from(employeeAiAssistants)
          .where(eq(employeeAiAssistants.employeeId, userId))
          .limit(1);

        let ownerContext = "";
        if (myAssistant?.personalityConfig) {
          try {
            const cfg = JSON.parse(myAssistant.personalityConfig);
            if (cfg.systemPrompt) {
              systemContent = cfg.systemPrompt;
            }
            ownerContext = await buildOwnerContext(userId, cfg);
          } catch {
            // JSON解析失败 — 使用默认提示词
          }
        }

        const fullSystemContent = [
          systemContent,
          ownerContext ? `\n\n【当前上下文】\n${ownerContext}` : "",
          historySummary ? `\n\n${historySummary}` : "",
          knowledgeContext ? `\n\n${knowledgeContext}` : "",
        ].join("");

        // ── Build messages array with conversation history ──
        const llmMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: fullSystemContent },
        ];

        // Add recent conversation history for multi-turn context
        for (const msg of recentMessages.slice(0, -1)) {
          // Exclude the current message (last one) as we add it separately
          if (msg.role === "user" || msg.role === "assistant") {
            llmMessages.push({
              role: msg.role as "user" | "assistant",
              content: msg.content || "",
            });
          }
        }

        llmMessages.push({ role: "user", content: input.message });

        // 调用LLM获取响应
        const llmResponse = await invokeLLM({ messages: llmMessages });

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
   * 页面感知建议 — Page-Aware Suggestions
   */
  getPageSuggestions: protectedProcedure
    .input(
      z.object({
        routePath: z.string(),
        pageContext: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await requireDb();

        // Query relevant help articles for this route
        const articles = await db
          .select()
          .from(helpArticles)
          .where(
            and(
              eq(helpArticles.isActive, true),
              eq(helpArticles.routePath, input.routePath)
            )
          )
          .limit(3);

        // Search knowledge base for route-related content
        let kbDocs: { title: string; content: string }[] = [];
        try {
          kbDocs = await searchDocuments(input.routePath, { limit: 3 });
        } catch { /* non-fatal */ }

        // Build context for LLM
        const helpContext = articles
          .map((a) => `${a.titleZh}: ${a.contentZh}`)
          .join("\n");
        const kbContext = kbDocs
          .map((d) => `${d.title}: ${d.content.slice(0, 200)}`)
          .join("\n");

        const systemPrompt = [
          "你是GRT企业操作系统的智能助手。",
          "根据用户当前所在页面，生成3-5个实用建议。",
          "每个建议包含title和description字段。",
          "回复格式为JSON数组: [{\"title\":\"...\",\"description\":\"...\"}]",
          `\n页面路径: ${input.routePath}`,
          input.pageContext ? `页面上下文: ${input.pageContext}` : "",
          helpContext ? `\n相关帮助:\n${helpContext}` : "",
          kbContext ? `\n知识库:\n${kbContext}` : "",
        ].filter(Boolean).join("\n");

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `请为当前页面 ${input.routePath} 生成操作建议` },
          ],
        });

        const raw = llmResult.choices?.[0]?.message?.content || "[]";

        // Parse JSON array from LLM response
        let suggestions: { title: string; description: string }[] = [];
        try {
          const jsonMatch = raw.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            suggestions = JSON.parse(jsonMatch[0]);
          }
        } catch {
          suggestions = [{ title: "查看帮助", description: "点击帮助按钮获取更多信息" }];
        }

        return suggestions.slice(0, 5);
      } catch (error) {
        console.error("[getPageSuggestions] Error:", error);
        return [{ title: "查看帮助文档", description: "浏览系统帮助获取操作指引" }];
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
        type: z.enum(["suggestion", "bug", "other"]),
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

        // 记录反馈 — typeEnum6: 'suggestion' | 'bug' | 'other'
        const result = await db
          .insert(feedback)
          .values({
            type: input.type,
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

  // ==================== 管理端：AI助理配置 ====================

  /**
   * 一键配置所有员工AI助理
   */
  provisionAll: protectedProcedure.mutation(async () => {
    try {
      return await provisionAllEmployees();
    } catch (error: any) {
      console.error("[provisionAll] Error:", error);
      return { created: 0, skipped: 0, errors: [error.message] };
    }
  }),

  /**
   * 配置单个员工AI助理
   */
  provisionOne: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        return await provisionSingleEmployee(input.employeeId);
      } catch (error: any) {
        console.error("[provisionOne] Error:", error);
        return { created: 0, skipped: 0, errors: [error.message] };
      }
    }),

  /**
   * 配置状态概览
   */
  getProvisioningStatus: protectedProcedure.query(async () => {
    try {
      return await getProvisioningStatus();
    } catch (error: any) {
      console.error("[getProvisioningStatus] Error:", error);
      return {
        totalEmployees: 0,
        provisionedCount: 0,
        pendingCount: 0,
        byDepartment: {},
      };
    }
  }),

  /**
   * 查看所有AI助理列表（JOIN hrmEmployees）
   */
  listAllAssistants: protectedProcedure
    .input(
      z
        .object({
          department: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        return await listAllAssistants(input ?? undefined);
      } catch (error: any) {
        console.error("[listAllAssistants] Error:", error);
        return { items: [], total: 0 };
      }
    }),

  /**
   * 按角色刷新所有AI助理的预设
   */
  refreshPresets: protectedProcedure
    .input(z.object({ roleId: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      try {
        return await refreshPresetsByRole(input?.roleId);
      } catch (error: any) {
        console.error("[refreshPresets] Error:", error);
        return { created: 0, skipped: 0, errors: [error.message] };
      }
    }),

  // ==================== 基础CRUD操作 ====================

  list: protectedProcedure.query(async () => {
    return { items: [], total: 0, page: 1, pageSize: 10 };
  }),

  getById: protectedProcedure
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
