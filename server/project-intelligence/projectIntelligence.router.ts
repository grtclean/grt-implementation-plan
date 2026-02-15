/**
 * 项目智能路由 (Project Intelligence Router)
 * Phase D: 知识问答 · 相似项目 · 变更影响 · 风险预测
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  askProjectKnowledge,
  findSimilarProjects,
  analyzeChangeImpact,
  predictProjectRisk,
} from "./projectIntelligence.service";

export const projectIntelligenceRouter = router({
  // 知识库问答 (mutation — invokes LLM)
  askKnowledge: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1),
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
      const result = await askProjectKnowledge(input.question, input.history);
      return result;
    }),

  // 相似项目搜索 (mutation — invokes LLM)
  findSimilar: protectedProcedure
    .input(
      z.object({
        industry: z.string().optional(),
        equipment: z.string().optional(),
        workpiece: z.string().optional(),
        material: z.string().optional(),
        standard: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await findSimilarProjects(input);
      return result;
    }),

  // 变更影响分析 (mutation — invokes LLM)
  analyzeChangeImpact: protectedProcedure
    .input(
      z.object({
        changeType: z.string().min(1),
        changeDescription: z.string().min(1),
        affectedComponent: z.string().optional(),
        projectId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await analyzeChangeImpact(input);
      return result;
    }),

  // 项目风险预测 (mutation — invokes LLM)
  predictRisk: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1),
        currentStage: z.string().min(1),
        totalBudget: z.number().optional(),
        daysElapsed: z.number().optional(),
        daysPlanned: z.number().optional(),
        gatePassRate: z.number().optional(),
        openIssues: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await predictProjectRisk(input);
      return result;
    }),
});
