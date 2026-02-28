/**
 * AI执行模式路由
 * 提供系统内AI和泛式AI两种执行模式的API
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  executeAI,
  recordAdoption,
  getModeConfig,
  getEffectivenessStats,
  getRecentLogs,
  type AIExecutionMode,
} from "../services/ai-execution-mode.service";

// 执行模式枚举
const executionModeSchema = z.enum(["internal", "generative", "shadow"]);

// 执行请求Schema
const executeInputSchema = z.object({
  assistantType: z.string().min(1, "助手类型不能为空"),
  mode: executionModeSchema,
  content: z.string().min(1, "内容不能为空"),
  context: z.object({
    processType: z.string().optional(),
    processId: z.string().optional(),
    stepCode: z.string().optional(),
    suggestionMode: z.string().optional(),
  }).optional(),
});

// 采纳记录Schema
const recordAdoptionInputSchema = z.object({
  sessionId: z.string().min(1, "会话ID不能为空"),
  isAdopted: z.boolean(),
  feedback: z.string().optional(),
});

export const aiExecutionModeRouter = router({
  // 获取模式配置
  getModeConfig: protectedProcedure
    .input(z.object({ assistantType: z.string() }).optional())
    .query(({ input }) => {
      return getModeConfig(input?.assistantType || 'default');
    }),

  // 执行AI请求
  execute: protectedProcedure
    .input(executeInputSchema)
    .mutation(async ({ input }) => {
      const result = await executeAI({
        assistantType: input.assistantType,
        mode: input.mode as AIExecutionMode,
        content: input.content,
        context: input.context,
      });
      
      return {
        content: result.content,
        mode: result.mode,
        sessionId: result.sessionId,
        timestamp: result.timestamp.toISOString(),
        tokensUsed: result.tokensUsed,
      };
    }),

  // 记录采纳反馈
  recordAdoption: protectedProcedure
    .input(recordAdoptionInputSchema)
    .mutation(({ input }) => {
      const record = recordAdoption(
        input.sessionId,
        input.isAdopted,
        input.feedback
      );
      
      return {
        success: true,
        record: {
          ...record,
          timestamp: record.timestamp.toISOString(),
        },
      };
    }),

  // 获取效果统计
  getEffectivenessStats: protectedProcedure
    .input(z.object({
      assistantType: z.string().optional(),
      mode: z.enum(["internal", "generative"]).optional(),
    }).optional())
    .query(({ input }) => {
      return getEffectivenessStats(input?.assistantType, input?.mode);
    }),

  // 获取最近日志
  getRecentLogs: protectedProcedure
    .input(z.object({ 
      limit: z.number().optional(),
      assistantType: z.string().optional(),
    }).optional())
    .query(({ input }) => {
      const logs = getRecentLogs(input?.limit || 10);
      return logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      }));
    }),

  // 列表（兼容占位符接口）
  list: protectedProcedure.query(() => ({ items: [], total: 0 })),
  
  // 获取单个（兼容占位符接口）
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(() => null),
  
  // 创建（兼容占位符接口）
  create: protectedProcedure
    .input(z.any())
    .mutation(() => ({ success: true })),
  
  // 更新（兼容占位符接口）
  update: protectedProcedure
    .input(z.any())
    .mutation(() => ({ success: true })),
  
  // 删除（兼容占位符接口）
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(() => ({ success: true })),
});

export type AiExecutionModeRouter = typeof aiExecutionModeRouter;
