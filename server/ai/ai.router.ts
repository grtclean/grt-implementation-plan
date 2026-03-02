/**
 * AI服务路由
 * 提供语义分析、风险评估、AI Coach等功能的API
 */

import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import { router, protectedProcedure } from "../_core/trpc";
import {
  analyzeSemantics,
  assessRisk,
  askAICoach,
  reviewForm,
  isVertexAIConfigured,
} from "./vertex-ai-service";

export const aiRouter = router({
  // 获取AI服务状态
  getStatus: protectedProcedure.query(async () => {
    return {
      configured: isVertexAIConfigured(),
      services: {
        semanticAnalysis: true,
        riskAssessment: true,
        aiCoach: true,
        formReview: true,
      },
    };
  }),

  // 语义分析
  analyzeSemantics: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1),
        context: z.string().optional(),
        language: z.enum(["zh", "en"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return analyzeSemantics(input);
    }),

  // 风险评估
  assessRisk: protectedProcedure
    .input(
      z.object({
        type: z.enum(["project", "cost", "quality", "delivery", "security"]),
        data: z.record(z.string(), jsonValue),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return assessRisk(input);
    }),

  // AI Coach问答
  askCoach: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1),
        context: z.string().optional(),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      return askAICoach(input);
    }),

  // 表单智能审核
  reviewForm: protectedProcedure
    .input(
      z.object({
        formType: z.string(),
        formData: z.record(z.string(), jsonValue),
        rules: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return reviewForm(input);
    }),
});

export default aiRouter;
