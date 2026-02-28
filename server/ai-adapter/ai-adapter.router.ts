/**
 * GRT Intelligent System - AI Adapter tRPC Router
 * Version: 1.3.77
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  AIServiceFactory,
  getAIService,
  generateText,
  analyzeBOM,
  translateDocument,
  type AppRegion,
  type AIMessage,
} from './AIServiceFactory';

// =============================================================================
// 输入验证Schema
// =============================================================================
const regionSchema = z.enum(['US', 'DE', 'CN', 'OFFLINE']);
const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

// =============================================================================
// AI适配器路由
// =============================================================================
export const aiAdapterRouter = router({
  // ---------------------------------------------------------------------------
  // 获取当前区域和AI服务信息
  // ---------------------------------------------------------------------------
  getServiceInfo: protectedProcedure.query(() => {
    const region = AIServiceFactory.detectRegion();
    const service = getAIService();
    const availableAdapters = AIServiceFactory.getAvailableAdapters();
    
    return {
      currentRegion: region,
      currentProvider: service.provider,
      availableAdapters,
    };
  }),

  // ---------------------------------------------------------------------------
  // 健康检查所有适配器
  // ---------------------------------------------------------------------------
  healthCheckAll: protectedProcedure.query(async () => {
    const results = await AIServiceFactory.healthCheckAll();
    return {
      timestamp: new Date().toISOString(),
      results,
    };
  }),

  // ---------------------------------------------------------------------------
  // 生成文本
  // ---------------------------------------------------------------------------
  generateText: protectedProcedure
    .input(z.object({
      messages: z.array(messageSchema),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(32000).optional(),
      region: regionSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generateText({
        messages: input.messages as AIMessage[],
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      }, input.region as AppRegion | undefined);
      
      return result;
    }),

  // ---------------------------------------------------------------------------
  // 分析BOM
  // ---------------------------------------------------------------------------
  analyzeBOM: protectedProcedure
    .input(z.object({
      bomContent: z.string(),
      projectContext: z.string().optional(),
      region: regionSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await analyzeBOM(
        input.bomContent,
        input.projectContext,
        input.region as AppRegion | undefined
      );
      
      return result;
    }),

  // ---------------------------------------------------------------------------
  // 翻译文档
  // ---------------------------------------------------------------------------
  translateDocument: protectedProcedure
    .input(z.object({
      text: z.string(),
      targetLanguage: z.string(),
      sourceLanguage: z.string().optional(),
      region: regionSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await translateDocument(
        input.text,
        input.targetLanguage,
        input.sourceLanguage,
        input.region as AppRegion | undefined
      );
      
      return result;
    }),

  // ---------------------------------------------------------------------------
  // 切换区域（用于测试）
  // ---------------------------------------------------------------------------
  switchRegion: protectedProcedure
    .input(z.object({
      region: regionSchema,
    }))
    .mutation(({ input }) => {
      const service = AIServiceFactory.getInstance(input.region as AppRegion);
      return {
        success: true,
        newRegion: input.region,
        provider: service.provider,
      };
    }),
});

export type AIAdapterRouter = typeof aiAdapterRouter;
