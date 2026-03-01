/**
 * 项目智能路由 (Project Intelligence Router)
 * Phase D: 知识问答 · 相似项目 · 变更影响 · 风险预测
 *
 * All LLM operations now use async task queue (submitTask → poll getTaskStatus).
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { submitTask, getTaskStatus } from "../services/task-worker.service";

export const projectIntelligenceRouter = router({
  // 知识库问答 (async — submits to task queue)
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
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "PROJECT_ASK_KNOWLEDGE",
        { question: input.question, history: input.history },
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  // 相似项目搜索 (async — submits to task queue)
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
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "PROJECT_FIND_SIMILAR",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  // 变更影响分析 (async — submits to task queue)
  analyzeChangeImpact: protectedProcedure
    .input(
      z.object({
        changeType: z.string().min(1),
        changeDescription: z.string().min(1),
        affectedComponent: z.string().optional(),
        projectId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "PROJECT_CHANGE_IMPACT",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  // 项目风险预测 (async — submits to task queue)
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
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "PROJECT_RISK_PREDICT",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  /** Generic task status poller for all intelligence operations */
  getTaskResult: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const task = await getTaskStatus(input.taskId);
      if (!task) return { taskStatus: "not_found" as const, result: null };
      if (task.status === "completed") return { taskStatus: "completed" as const, result: task.resultData };
      if (task.status === "failed") return { taskStatus: "failed" as const, result: null, error: task.errorMessage };
      return { taskStatus: task.status as "pending" | "processing", result: null };
    }),
});
