/**
 * 每日工作计划 tRPC Router
 * v3: generatePlan → async task-worker, added getGenerateStatus polling
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as dailyPlanService from "../services/daily-work-plan.service";
import { submitTask, getTaskStatus } from "../services/task-worker.service";

export const dailyPlanRouter = router({
  getTodayPlan: protectedProcedure
    .query(async ({ ctx }) => {
      return dailyPlanService.getTodayPlan(ctx.user.id);
    }),

  /** Submit daily plan generation to async task-worker queue */
  generatePlan: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check if plan already exists today (idempotent)
      const existing = await dailyPlanService.getTodayPlan(ctx.user.id);
      if (existing && existing.tasks && existing.tasks.length > 0) {
        return { taskId: null, status: "already_exists", plan: existing };
      }
      // Submit async task
      const { taskId } = await submitTask(
        "DAILY_PLAN_GENERATION",
        { userId: ctx.user.id },
        String(ctx.user.id),
        { maxRetries: 2 },
      );
      return { taskId, status: "submitted" };
    }),

  /** Poll async task status for generatePlan */
  getGenerateStatus: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const task = await getTaskStatus(input.taskId);
      if (!task) return { status: "not_found" };
      return {
        status: task.status,
        result: task.resultData,
        error: task.errorMessage,
        completedAt: task.completedAt,
      };
    }),

  getPlanHistory: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return dailyPlanService.getPlanHistory(ctx.user.id, input ?? undefined);
    }),

  updateTaskStatus: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
      actualHours: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return dailyPlanService.updateTaskStatus(input.taskId, input.status, input.actualHours);
    }),

  addTask: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
      estimatedHours: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return dailyPlanService.addAdHocTask(ctx.user.id, input);
    }),

  getYesterdayIncomplete: protectedProcedure
    .query(async ({ ctx }) => {
      return dailyPlanService.getYesterdayIncomplete(ctx.user.id);
    }),

  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      return dailyPlanService.getPlanStats(ctx.user.id);
    }),

  refreshPlan: protectedProcedure
    .mutation(async ({ ctx }) => {
      return dailyPlanService.refreshDailyPlan(ctx.user.id);
    }),

  // ── v2: 8-source aggregated plan ──

  getAggregatedPlan: protectedProcedure
    .input(z.object({ role: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      // Canonical role from server auth context, not client input
      const role = ctx.user.role ?? input?.role ?? 'employee';
      return dailyPlanService.aggregateDailyItems(
        ctx.user.id,
        ctx.user.name ?? 'Unknown',
        role,
      );
    }),

  assignToUser: protectedProcedure
    .input(z.object({
      targetUserId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
      category: z.enum(['supervisor', 'customer_assignment']),
      sourceReference: z.string().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return dailyPlanService.assignInboxItem({
        ...input,
        assignedByName: ctx.user.name ?? 'Unknown',
      });
    }),

  addPersonalItem: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
      estimatedHours: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return dailyPlanService.addAdHocTask(ctx.user.id, input);
    }),
});
