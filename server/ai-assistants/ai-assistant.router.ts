/**
 * AI助手tRPC路由
 * 提供AI助手的CRUD和执行接口
 */

import { z } from 'zod';
import { jsonValue } from '../../shared/validators';
import {router, protectedProcedure, requirePermission} from '../_core/trpc';
import {
  createEmployeeDA,
  getEmployeeDA,
  updateEmployeeDA,
  createFunctionalAssistant,
  getFunctionalAssistant,
  getActiveFunctionalAssistants,
  getExecutionModeConfig,
  logAiSuggestionExecution,
  getAiSuggestionLogs,
  updateAiSuggestionStatus,
  recordUserFeedback,
  generateAiSuggestion,
  executeSingleAiAction,
  getAiAssistantStats,
} from './ai-assistant.service';

export const aiAssistantRouter = router({
  // ============ 员工数字助手 ============
  
  // 创建员工数字助手
  createEmployeeDA: requirePermission('ai:assistant:chat')
    .input(z.object({
      employeeId: z.string(),
      displayName: z.string().optional(),
      capabilities: z.record(z.string(), z.boolean()).optional(),
    }))
    .mutation(async ({ input }) => {
      return createEmployeeDA({
        employeeId: input.employeeId,
        displayName: input.displayName,
        assistantCode: `${input.employeeId}-DA`,
      });
    }),
  
  // 获取员工数字助手
  getEmployeeDA: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
    }))
    .query(async ({ input }) => {
      return getEmployeeDA(input.employeeId);
    }),
  
  // 更新员工数字助手
  updateEmployeeDA: requirePermission('ai:assistant:chat')
    .input(z.object({
      id: z.number(),
      displayName: z.string().optional(),
      capabilities: z.record(z.string(), z.boolean()).optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      return updateEmployeeDA(id, updateData);
    }),
  
  // ============ 功能型AI助手 ============
  
  // 创建功能型AI助手
  createFunctionalAssistant: protectedProcedure
    .input(z.object({
      assistantType: z.enum([
        'solution',
        'quotation',
        'planning',
        'kpi',
        'interview',
        'purchase',
        'engineering',
        'quality'
      ]),
      assistantCode: z.string(),
      displayName: z.string(),
      description: z.string().optional(),
      systemPrompt: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return createFunctionalAssistant({
        assistantType: input.assistantType as any,
        assistantCode: input.assistantCode,
        displayName: input.displayName,
        description: input.description,
        systemPrompt: input.systemPrompt,
        temperature: input.temperature ? String(input.temperature) : undefined,
        maxTokens: input.maxTokens,
      });
    }),
  
  // 获取功能型AI助手
  getFunctionalAssistant: protectedProcedure
    .input(z.object({
      assistantType: z.string(),
    }))
    .query(async ({ input }) => {
      return getFunctionalAssistant(input.assistantType);
    }),
  
  // 获取所有活跃的功能型助手
  getActiveFunctionalAssistants: protectedProcedure
    .query(async () => {
      return getActiveFunctionalAssistants();
    }),
  
  // ============ AI建议执行 ============
  
  // 生成AI建议
  generateSuggestion: requirePermission('ai:assistant:chat')
    .input(z.object({
      assistantType: z.string(),
      mode: z.enum(['internal', 'generative']),
      processType: z.string(),
      processId: z.string(),
      context: z.record(z.string(), jsonValue).optional(),
    }))
    .mutation(async ({ input }) => {
      return generateAiSuggestion(
        input.assistantType,
        input.mode,
        input.context || {}
      );
    }),
  
  // 执行单个AI任务
  executeSingleAction: requirePermission('ai:assistant:chat')
    .input(z.object({
      assistantId: z.number(),
      processType: z.string(),
      processId: z.string(),
      stepCode: z.string(),
      actionId: z.string(),
      mode: z.enum(['internal', 'generative']),
    }))
    .mutation(async ({ input }) => {
      return executeSingleAiAction(
        input.assistantId,
        input.processType,
        input.processId,
        input.stepCode,
        input.actionId,
        input.mode
      );
    }),
  
  // 获取AI建议执行日志
  getSuggestionLogs: protectedProcedure
    .input(z.object({
      processType: z.string(),
      processId: z.string(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return getAiSuggestionLogs(
        input.processType,
        input.processId,
        input.limit
      );
    }),
  
  // 更新AI建议执行状态
  updateSuggestionStatus: requirePermission('ai:assistant:chat')
    .input(z.object({
      logId: z.number(),
      status: z.enum(['pending', 'running', 'success', 'partial_success', 'failed']),
      result: z.record(z.string(), jsonValue).optional(),
      error: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return updateAiSuggestionStatus(
        input.logId,
        input.status,
        input.result,
        input.error
      );
    }),
  
  // 记录用户反馈
  recordFeedback: requirePermission('ai:assistant:chat')
    .input(z.object({
      logId: z.number(),
      feedback: z.enum(['helpful', 'neutral', 'unhelpful']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return recordUserFeedback(input.logId, input.feedback, input.notes);
    }),
  
  // ============ 统计信息 ============
  
  // 获取AI助手统计信息
  getStats: protectedProcedure
    .query(async () => {
      return getAiAssistantStats();
    }),

  // ── 前端 AIAssistantPage.tsx 需要的过程 ──

  listAssistants: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      return [];
    }),

  createAssistant: requirePermission('ai:assistant:chat')
    .input(z.record(z.string(), jsonValue).optional())
    .mutation(async () => {
      return { success: true, id: `ast_${Date.now()}` };
    }),
});
