/**
 * Interview Assistant tRPC路由
 * 
 * 提供面试助手的API接口
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  analyzeResume,
  generateInterviewStrategy,
  generateInterviewQuestions,
  assessCandidate,
  generateInterviewReport,
} from "./interviewAssistant";

export const interviewAssistantRouter = router({
  // 分析简历
  analyzeResume: protectedProcedure
    .input(z.object({
      resumeText: z.string().min(50, "简历内容太短"),
      positionId: z.number().optional(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await analyzeResume({
        userId: ctx.user!.id,
        userName: ctx.user!.name || undefined,
        sessionId: input.sessionId,
        resumeText: input.resumeText,
        positionId: input.positionId,
      });
    }),

  // 生成面试策略
  generateStrategy: protectedProcedure
    .input(z.object({
      candidateId: z.number(),
      positionId: z.number(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await generateInterviewStrategy({
        userId: ctx.user!.id,
        userName: ctx.user!.name || undefined,
        sessionId: input.sessionId,
        candidateId: input.candidateId,
        positionId: input.positionId,
      });
    }),

  // 生成面试问题
  generateQuestions: protectedProcedure
    .input(z.object({
      positionId: z.number(),
      category: z.enum(["technical", "behavioral", "situational", "cultural", "motivation"]).optional(),
      count: z.number().min(1).max(20).optional().default(5),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      customFocus: z.string().optional(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await generateInterviewQuestions({
        userId: ctx.user!.id,
        userName: ctx.user!.name || undefined,
        sessionId: input.sessionId,
        positionId: input.positionId,
        category: input.category,
        count: input.count,
        difficulty: input.difficulty,
        customFocus: input.customFocus,
      });
    }),

  // 评估候选人
  assessCandidate: protectedProcedure
    .input(z.object({
      candidateId: z.number(),
      interviewNotes: z.string().min(50, "面试记录太短"),
      interviewerFeedback: z.string().optional(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await assessCandidate({
        userId: ctx.user!.id,
        userName: ctx.user!.name || undefined,
        sessionId: input.sessionId,
        candidateId: input.candidateId,
        interviewNotes: input.interviewNotes,
        interviewerFeedback: input.interviewerFeedback,
      });
    }),

  // 生成面试报告
  generateReport: protectedProcedure
    .input(z.object({
      candidateId: z.number(),
      format: z.enum(["summary", "detailed"]).optional().default("summary"),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await generateInterviewReport({
        userId: ctx.user!.id,
        userName: ctx.user!.name || undefined,
        sessionId: input.sessionId,
        candidateId: input.candidateId,
        format: input.format,
      });
    }),
});

export type InterviewAssistantRouter = typeof interviewAssistantRouter;
