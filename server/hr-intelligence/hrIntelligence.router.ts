/**
 * HR智能路由 (HR Intelligence Router)
 * Phase F: 人才评估 · 培训推荐 · 薪酬分析 · 人力规划
 *
 * All LLM operations now use async task queue.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { submitTask, getTaskStatus } from "../services/task-worker.service";

export const hrIntelligenceRouter = router({
  assessTalent: protectedProcedure
    .input(
      z.object({
        employeeName: z.string().min(1),
        role: z.string().min(1),
        department: z.string().min(1),
        yearsOfExperience: z.number().min(0),
        skillTags: z.string().optional(),
        performanceSummary: z.string().optional(),
        certifications: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "HR_ASSESS_TALENT",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  recommendTraining: protectedProcedure
    .input(
      z.object({
        role: z.string().min(1),
        currentSkills: z.string().min(1),
        targetSkills: z.string().min(1),
        experienceLevel: z.string().min(1),
        learningPreference: z.string().optional(),
        department: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "HR_RECOMMEND_TRAINING",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  analyzeCompensation: protectedProcedure
    .input(
      z.object({
        position: z.string().min(1),
        department: z.string().min(1),
        experienceYears: z.number().min(0),
        currentSalary: z.number().min(0),
        location: z.string().optional(),
        performanceGrade: z.string().optional(),
        education: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "HR_ANALYZE_COMPENSATION",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  planWorkforce: protectedProcedure
    .input(
      z.object({
        department: z.string().min(1),
        currentHeadcount: z.number().min(0),
        plannedProjects: z.string().min(1),
        attritionRate: z.number().min(0).max(100),
        budgetConstraint: z.string().optional(),
        growthTarget: z.string().optional(),
        timeHorizon: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "HR_PLAN_WORKFORCE",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  /** Generic task status poller */
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
