/**
 * AI Agent Fleet Router
 *
 * ~18 tRPC procedures for managing L1-L5 AI agent fleets:
 * - Fleet provisioning & management
 * - Agent control (activate/deactivate/config)
 * - Task execution & human review
 * - G-Token ledger queries
 * - Analytics & dashboards
 */

import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { requireDb } from "../db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  aiAgentFleet,
  gTokenLedger,
  agentTaskExecutions,
} from "../../drizzle/ai-agent-fleet-schema";
import {
  provisionFleetForEmployee,
  provisionFleetForAll,
  activateAgent,
  deactivateAgent,
  getFleetByEmployee,
  getAgentDashboard,
  executeAgentTask,
  reviewTaskExecution,
  getGTokenSummary,
  getFleetAnalytics,
  creditGToken,
} from "../services/ai-agent-fleet.service";

export const aiAgentFleetRouter = router({
  // ═══════════════════════════════════════════════════
  //  军团管理
  // ═══════════════════════════════════════════════════

  /**
   * 为当前用户创建L1-L5军团
   */
  provisionMyFleet: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) return { success: false, error: "用户未认证" };
      const result = await provisionFleetForEmployee(Number(userId));
      return { success: !result.error, ...result };
    } catch (err: any) {
      return { success: false, error: err.message, created: 0, skipped: 0 };
    }
  }),

  /**
   * 管理员：批量为所有有Master助理的员工创建军团
   */
  provisionAll: protectedProcedure.mutation(async () => {
    try {
      const result = await provisionFleetForAll();
      return { success: true, ...result };
    } catch (err: any) {
      return { success: false, error: err.message, created: 0, skipped: 0, errors: [] };
    }
  }),

  /**
   * 查询我的5个Agent
   */
  getMyFleet: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) return { agents: [], summary: { totalAgents: 0, activeCount: 0, totalBalance: "0", totalTasks: 0 } };
      return await getFleetByEmployee(Number(userId));
    } catch {
      return { agents: [], summary: { totalAgents: 0, activeCount: 0, totalBalance: "0", totalTasks: 0 } };
    }
  }),

  /**
   * 按员工ID查军团
   */
  getFleetByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      try {
        return await getFleetByEmployee(Number(input.employeeId));
      } catch {
        return { agents: [], summary: { totalAgents: 0, activeCount: 0, totalBalance: "0", totalTasks: 0 } };
      }
    }),

  // ═══════════════════════════════════════════════════
  //  Agent控制
  // ═══════════════════════════════════════════════════

  /**
   * 激活Agent
   */
  activateAgent: protectedProcedure
    .input(z.object({ agentId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      try {
        const ok = await activateAgent(Number(input.agentId));
        return { success: ok };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),

  /**
   * 暂停Agent
   */
  deactivateAgent: protectedProcedure
    .input(z.object({ agentId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      try {
        const ok = await deactivateAgent(Number(input.agentId));
        return { success: ok };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),

  /**
   * 修改Agent配置（竞标价格、并发数等）
   */
  updateAgentConfig: protectedProcedure
    .input(
      z.object({
        agentId: z.union([z.string(), z.number()]),
        canBidTasks: z.boolean().optional(),
        maxConcurrentTasks: z.number().optional(),
        bidPriceRangeLow: z.number().optional(),
        bidPriceRangeHigh: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const updates: Record<string, unknown> = {
          updatedAt: new Date().toISOString(),
        };
        if (input.canBidTasks !== undefined) updates.canBidTasks = input.canBidTasks;
        if (input.maxConcurrentTasks !== undefined)
          updates.maxConcurrentTasks = input.maxConcurrentTasks;
        if (input.bidPriceRangeLow !== undefined)
          updates.bidPriceRangeLow = String(input.bidPriceRangeLow);
        if (input.bidPriceRangeHigh !== undefined)
          updates.bidPriceRangeHigh = String(input.bidPriceRangeHigh);

        await db
          .update(aiAgentFleet)
          .set(updates as any)
          .where(eq(aiAgentFleet.id, Number(input.agentId)));

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),

  // ═══════════════════════════════════════════════════
  //  任务执行
  // ═══════════════════════════════════════════════════

  /**
   * 提交任务给Agent执行
   */
  executeTask: protectedProcedure
    .input(
      z.object({
        agentId: z.union([z.string(), z.number()]),
        taskType: z.enum([
          "document_draft",
          "data_analysis",
          "code_review",
          "report_generation",
          "meeting_summary",
          "email_draft",
          "risk_assessment",
          "quality_inspection",
        ]),
        taskTitle: z.string().min(1),
        taskInput: z.record(z.string(), z.unknown()).optional().default({}),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await executeAgentTask(
          Number(input.agentId),
          input.taskType,
          input.taskTitle,
          input.taskInput,
        );
        return { success: true, ...result };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),

  /**
   * 人类审核任务输出
   */
  reviewTaskOutput: protectedProcedure
    .input(
      z.object({
        executionId: z.union([z.string(), z.number()]),
        approved: z.boolean(),
        qualityScore: z.number().min(0).max(100).default(70),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user?.id || 0;
        const result = await reviewTaskExecution(
          Number(input.executionId),
          input.approved,
          input.qualityScore,
          Number(userId),
        );
        return { success: true, ...result };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),

  /**
   * Agent任务历史
   */
  getAgentTaskHistory: protectedProcedure
    .input(
      z.object({
        agentId: z.union([z.string(), z.number()]),
        limit: z.number().optional().default(20),
      }),
    )
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        return await db
          .select()
          .from(agentTaskExecutions)
          .where(eq(agentTaskExecutions.agentId, Number(input.agentId)))
          .orderBy(desc(agentTaskExecutions.createdAt))
          .limit(input.limit);
      } catch {
        return [];
      }
    }),

  // ═══════════════════════════════════════════════════
  //  G-Token
  // ═══════════════════════════════════════════════════

  /**
   * 查余额
   */
  getGTokenBalance: protectedProcedure
    .input(z.object({ agentId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const [agent] = await db
          .select({
            gTokenBalance: aiAgentFleet.gTokenBalance,
            totalEarned: aiAgentFleet.totalEarned,
            totalSpent: aiAgentFleet.totalSpent,
          })
          .from(aiAgentFleet)
          .where(eq(aiAgentFleet.id, Number(input.agentId)))
          .limit(1);
        return agent || { gTokenBalance: "0", totalEarned: "0", totalSpent: "0" };
      } catch {
        return { gTokenBalance: "0", totalEarned: "0", totalSpent: "0" };
      }
    }),

  /**
   * 交易流水
   */
  getGTokenHistory: protectedProcedure
    .input(
      z.object({
        agentId: z.union([z.string(), z.number()]).optional(),
        limit: z.number().optional().default(50),
      }),
    )
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        if (input.agentId) {
          return await db
            .select()
            .from(gTokenLedger)
            .where(eq(gTokenLedger.agentId, Number(input.agentId)))
            .orderBy(desc(gTokenLedger.createdAt))
            .limit(input.limit);
        }
        return await db
          .select()
          .from(gTokenLedger)
          .orderBy(desc(gTokenLedger.createdAt))
          .limit(input.limit);
      } catch {
        return [];
      }
    }),

  /**
   * 全系统G-Token统计
   */
  getGTokenSummary: protectedProcedure.query(async () => {
    try {
      return await getGTokenSummary();
    } catch {
      return {
        totalBalance: "0",
        totalEarned: "0",
        totalSpent: "0",
        totalAgents: 0,
        activeAgents: 0,
        totalTasks: 0,
      };
    }
  }),

  // ═══════════════════════════════════════════════════
  //  分析
  // ═══════════════════════════════════════════════════

  /**
   * 单Agent仪表板
   */
  getAgentDashboard: protectedProcedure
    .input(z.object({ agentId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      try {
        return await getAgentDashboard(Number(input.agentId));
      } catch {
        return null;
      }
    }),

  /**
   * 全公司军团分析
   */
  getFleetAnalytics: protectedProcedure.query(async () => {
    try {
      return await getFleetAnalytics();
    } catch {
      return { levelStats: [], summary: { totalBalance: "0", totalEarned: "0", totalSpent: "0", totalAgents: 0, activeAgents: 0, totalTasks: 0 } };
    }
  }),

  /**
   * 列出所有Agent（分页）
   */
  listAllAgents: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        status: z.enum(["inactive", "active", "paused", "decommissioned"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        let query;
        if (input.status) {
          query = db
            .select()
            .from(aiAgentFleet)
            .where(eq(aiAgentFleet.status, input.status))
            .orderBy(desc(aiAgentFleet.createdAt))
            .limit(input.limit)
            .offset(input.offset);
        } else {
          query = db
            .select()
            .from(aiAgentFleet)
            .orderBy(desc(aiAgentFleet.createdAt))
            .limit(input.limit)
            .offset(input.offset);
        }
        return await query;
      } catch {
        return [];
      }
    }),
});
