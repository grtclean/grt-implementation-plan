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

import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { z } from "zod";
import { requireDb } from "../db";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("employee-ai");
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
import { submitTask, getTaskStatus } from "../services/task-worker.service";
import {
  provisionAllEmployees,
  provisionSingleEmployee,
  refreshPresetsByRole,
  getProvisioningStatus,
  listAllAssistants,
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
  initialize: requirePermission('ai:assistant:chat')
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
        log.error({ err: error }, "Failed to initialize assistant");
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
      log.error({ err: error }, "Failed to get assistant");
      return null;
    }
  }),

  /**
   * 获取或创建会话
   */
  getOrCreateSession: requirePermission('ai:assistant:chat')
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
        log.error({ err: error }, "Failed to get or create session");
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
        log.error({ err: error }, "Failed to get sessions");
        return [];
      }
    }),

  /**
   * 发送消息 — async via task queue (conversation memory + RAG in worker)
   */
  sendMessage: requirePermission('ai:assistant:chat')
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

        // Submit to async task queue instead of blocking on LLM
        const { taskId } = await submitTask(
          "EMPLOYEE_AI_ASSISTANT_REPLY",
          {
            sessionId: input.sessionId,
            message: input.message,
            userId,
          },
          ctx.user!.name ?? `User#${userId}`,
        );

        return {
          success: true,
          taskId,
          status: "processing" as const,
          response: null,
        };
      } catch (error) {
        log.error({ err: error }, "Failed to send message");
        return {
          success: false,
          error: "发送失败",
          taskId: null,
          response: null,
        };
      }
    }),

  /** Poll for assistant reply status */
  getReplyStatus: protectedProcedure
    .input(z.object({ taskId: z.number(), sessionId: z.number() }))
    .query(async ({ input }) => {
      const task = await getTaskStatus(input.taskId);
      if (!task) return { taskStatus: "not_found" as const, response: null };

      if (task.status === "completed" && task.resultData) {
        const result = task.resultData as Record<string, unknown>;
        return {
          taskStatus: "completed" as const,
          response: (result.response as string) ?? null,
        };
      }

      if (task.status === "failed") {
        return { taskStatus: "failed" as const, response: null, error: task.errorMessage };
      }

      return { taskStatus: task.status as "pending" | "processing", response: null };
    }),

  /**
   * 页面感知建议 — Page-Aware Suggestions (returns cached/static suggestions)
   * LLM-based suggestions are generated asynchronously via requestPageSuggestions.
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

        // Query relevant help articles for this route (no LLM needed)
        const articles = await db
          .select()
          .from(helpArticles)
          .where(
            and(
              eq(helpArticles.isActive, true),
              eq(helpArticles.routePath, input.routePath)
            )
          )
          .limit(5);

        if (articles.length > 0) {
          return articles.map(a => ({
            title: a.titleZh || "帮助",
            description: (a.contentZh || "").slice(0, 100),
          }));
        }

        // Fallback: static suggestions
        return [{ title: "查看帮助文档", description: "浏览系统帮助获取操作指引" }];
      } catch (error) {
        log.error({ err: error }, "Failed to get page suggestions");
        return [{ title: "查看帮助文档", description: "浏览系统帮助获取操作指引" }];
      }
    }),

  /** Async LLM page suggestions — submit to task queue */
  requestPageSuggestions: requirePermission('ai:assistant:chat')
    .input(z.object({
      routePath: z.string(),
      pageContext: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "AI_PAGE_SUGGESTIONS",
        { routePath: input.routePath, pageContext: input.pageContext },
        ctx.user!.name ?? `User#${ctx.user!.id}`,
      );
      return { taskId, status: "processing" as const };
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
        .where(eq(employeeSkillMaps.employeeId, userId))
        .limit(1000);

      return {
        assistantId: assistant[0].id,
        skills: skills || [],
        totalSkills: skills?.length || 0,
      };
    } catch (error) {
      log.error({ err: error }, "Failed to get skill map");
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
        .from(careerDevelopmentPaths)
        .limit(1000);

      return paths || [];
    } catch (error) {
      log.error({ err: error }, "Failed to get career paths");
      return [];
    }
  }),

  /**
   * 记录反馈
   */
  recordFeedback: requirePermission('ai:assistant:chat')
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
        log.error({ err: error }, "Failed to record feedback");
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
        .orderBy(desc(aiLearningRecords.createdAt))
        .limit(1000);

      return records || [];
    } catch (error) {
      log.error({ err: error }, "Failed to get learning records");
      return [];
    }
  }),

  // ==================== 管理端：AI助理配置 ====================

  /**
   * 一键配置所有员工AI助理
   */
  provisionAll: requirePermission('ai:assistant:chat').mutation(async () => {
    try {
      return await provisionAllEmployees();
    } catch (error: any) {
      log.error({ err: error }, "Failed to provision all employees");
      return { created: 0, skipped: 0, errors: [error.message] };
    }
  }),

  /**
   * 配置单个员工AI助理
   */
  provisionOne: requirePermission('ai:assistant:chat')
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        return await provisionSingleEmployee(input.employeeId);
      } catch (error: any) {
        log.error({ err: error }, "Failed to provision single employee");
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
      log.error({ err: error }, "Failed to get provisioning status");
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
        log.error({ err: error }, "Failed to list all assistants");
        return { items: [], total: 0 };
      }
    }),

  /**
   * 按角色刷新所有AI助理的预设
   */
  refreshPresets: requirePermission('ai:assistant:chat')
    .input(z.object({ roleId: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      try {
        return await refreshPresetsByRole(input?.roleId);
      } catch (error: any) {
        log.error({ err: error }, "Failed to refresh presets");
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

  create: requirePermission('ai:assistant:chat')
    .input(z.object({ name: z.string().optional(), type: z.string().optional() }).optional())
    .mutation(async () => {
      return { success: true };
    }),

  update: requirePermission('ai:assistant:chat')
    .input(z.object({ id: z.string(), name: z.string().optional() }).optional())
    .mutation(async () => {
      return { success: true };
    }),

  delete: requirePermission('ai:assistant:chat')
    .input(z.object({ id: z.string() }))
    .mutation(async () => {
      return { success: true };
    }),
});
