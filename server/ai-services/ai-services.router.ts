/**
 * AI Services Router - AI助手服务tRPC路由
 * 
 * 提供四种AI助手的API端点：
 * - aiSolution: AI方案助手
 * - aiQuotation: AI报价助手
 * - aiPlanning: AI计划助手
 * - aiKpi: AI KPI助手
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { jsonValue } from "@shared/validators";
import {
  chatWithAssistant,
  recommendSolution,
  generateQuotation,
  suggestPlan,
  evaluateKPI,
  type AIAssistantType,
  type ChatMessage
} from "./ai-assistant.service";

// 聊天消息Schema
const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date().optional()
});

// AI方案助手路由
export const aiSolutionRouter = router({
  // 对话接口
  chat: requirePermission('ai:hub:access')
    .input(z.object({
      messages: z.array(chatMessageSchema),
      context: z.record(z.string(), jsonValue).optional()
    }))
    .mutation(async ({ input }) => {
      const response = await chatWithAssistant(
        'solution',
        input.messages as ChatMessage[],
        input.context
      );
      return { response, timestamp: new Date() };
    }),

  // 方案推荐接口
  recommend: requirePermission('ai:hub:access')
    .input(z.object({
      product: z.string().min(1, "产品类型不能为空"),
      cleanlinessLevel: z.string().min(1, "清洁度要求不能为空"),
      cycleTime: z.number().positive("节拍必须为正数"),
      loadingForm: z.string().min(1, "上下料形式不能为空"),
      additionalRequirements: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const result = await recommendSolution(input);
      return {
        ...result,
        timestamp: new Date()
      };
    }),

  // 获取历史案例
  getHistoricalCases: protectedProcedure
    .input(z.object({
      product: z.string().optional(),
      cleanlinessLevel: z.string().optional(),
      limit: z.number().default(10)
    }))
    .query(async ({ input }) => {
      // TODO: 从数据库获取历史案例
      return {
        cases: [],
        total: 0
      };
    })
});

// AI报价助手路由
export const aiQuotationRouter = router({
  // 对话接口
  chat: requirePermission('ai:hub:access')
    .input(z.object({
      messages: z.array(chatMessageSchema),
      context: z.record(z.string(), jsonValue).optional()
    }))
    .mutation(async ({ input }) => {
      const response = await chatWithAssistant(
        'quotation',
        input.messages as ChatMessage[],
        input.context
      );
      return { response, timestamp: new Date() };
    }),

  // 生成报价
  generate: requirePermission('ai:hub:access')
    .input(z.object({
      projectName: z.string().min(1, "项目名称不能为空"),
      equipmentType: z.string().min(1, "设备类型不能为空"),
      specifications: z.record(z.string(), jsonValue),
      quantity: z.number().positive("数量必须为正数"),
      customerId: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const result = await generateQuotation(input);
      return {
        ...result,
        timestamp: new Date()
      };
    }),

  // 获取成本基准
  getCostStandards: protectedProcedure
    .query(async () => {
      // TODO: 从数据库获取年度成本基准
      return {
        laborCost: 150, // 人工工时成本（元/小时）
        overheadRate: 0.15, // 分摊成本率
        profitMargin: 0.20 // 利润率
      };
    })
});

// AI计划助手路由
export const aiPlanningRouter = router({
  // 对话接口
  chat: requirePermission('ai:hub:access')
    .input(z.object({
      messages: z.array(chatMessageSchema),
      context: z.record(z.string(), jsonValue).optional()
    }))
    .mutation(async ({ input }) => {
      const response = await chatWithAssistant(
        'planning',
        input.messages as ChatMessage[],
        input.context
      );
      return { response, timestamp: new Date() };
    }),

  // 生成计划建议
  suggest: protectedProcedure
    .input(z.object({
      planType: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual']),
      context: z.object({
        companyPlan: z.string().optional(),
        customerFeedback: z.array(z.string()).optional(),
        projectStatus: z.array(z.string()).optional(),
        meetingMinutes: z.array(z.string()).optional(),
        supervisorAssignments: z.array(z.string()).optional(),
        kpiStatus: z.string().optional(),
        unfinishedPlans: z.array(z.string()).optional()
      })
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await suggestPlan({
        ...input,
        userId: String(ctx.user!.id)
      });
      return {
        ...result,
        timestamp: new Date()
      };
    }),

  // 获取未完成计划
  getUnfinishedPlans: protectedProcedure
    .input(z.object({
      userId: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      // TODO: 从数据库获取未完成计划
      return {
        plans: [],
        total: 0
      };
    })
});

// AI KPI助手路由
export const aiKpiRouter = router({
  // 对话接口
  chat: requirePermission('ai:hub:access')
    .input(z.object({
      messages: z.array(chatMessageSchema),
      context: z.record(z.string(), jsonValue).optional()
    }))
    .mutation(async ({ input }) => {
      const response = await chatWithAssistant(
        'kpi',
        input.messages as ChatMessage[],
        input.context
      );
      return { response, timestamp: new Date() };
    }),

  // KPI评估
  evaluate: protectedProcedure
    .input(z.object({
      period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual']),
      metrics: z.object({
        tasksCompleted: z.number().optional(),
        tasksTotal: z.number().optional(),
        projectProgress: z.number().optional(),
        customerSatisfaction: z.number().optional(),
        trainingHours: z.number().optional()
      })
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await evaluateKPI({
        ...input,
        userId: String(ctx.user!.id)
      });
      return {
        ...result,
        timestamp: new Date()
      };
    }),

  // 获取KPI历史
  getHistory: protectedProcedure
    .input(z.object({
      period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual']),
      startDate: z.date().optional(),
      endDate: z.date().optional()
    }))
    .query(async ({ input, ctx }) => {
      // TODO: 从数据库获取KPI历史
      return {
        history: [],
        averageScore: 0
      };
    }),

  // 获取改进建议
  getSuggestions: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: 基于历史数据生成改进建议
      return {
        suggestions: [],
        priority: 'medium'
      };
    })
});

// 导出合并的AI服务路由
export const aiServicesRouter = router({
  solution: aiSolutionRouter,
  quotation: aiQuotationRouter,
  planning: aiPlanningRouter,
  kpi: aiKpiRouter
});
