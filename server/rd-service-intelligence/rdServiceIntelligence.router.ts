/**
 * 研发与客服智能路由 (R&D & Service Intelligence Router)
 * Phase H: 需求分析 · 设计审查 · 故障诊断 · 预防维护
 *
 * All LLM operations now use async task queue.
 */

import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { submitTask, getTaskStatus } from "../services/task-worker.service";

export const rdServiceIntelligenceRouter = router({
  analyzeRequirements: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1),
        customerName: z.string().min(1),
        industry: z.string().min(1),
        cleaningTarget: z.string().min(1),
        cleanlinessStandard: z.string().optional(),
        throughput: z.string().optional(),
        specialRequirements: z.string().optional(),
        budget: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "RD_ANALYZE_REQUIREMENTS",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  reviewDesign: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1),
        designPhase: z.string().min(1),
        designDescription: z.string().min(1),
        keyParameters: z.string().min(1),
        materialsUsed: z.string().optional(),
        previousIssues: z.string().optional(),
        standardsRequired: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "RD_REVIEW_DESIGN",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  diagnoseFault: protectedProcedure
    .input(
      z.object({
        equipmentModel: z.string().min(1),
        symptomDescription: z.string().min(1),
        errorCodes: z.string().optional(),
        operatingConditions: z.string().optional(),
        lastMaintenanceDate: z.string().optional(),
        equipmentAge: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "RD_DIAGNOSE_FAULT",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  planMaintenance: protectedProcedure
    .input(
      z.object({
        equipmentModel: z.string().min(1),
        installDate: z.string().min(1),
        operatingHours: z.number().min(0),
        lastMaintenanceDate: z.string().min(1),
        maintenanceHistory: z.string().optional(),
        environmentCondition: z.string().optional(),
        usageIntensity: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "RD_PLAN_MAINTENANCE",
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
