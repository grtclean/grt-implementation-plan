/**
 * 每日工作计划 tRPC Router
 * v2: Added getAggregatedPlan, assignToUser, addPersonalItem
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as dailyPlanService from "../services/daily-work-plan.service";

export const dailyPlanRouter = router({
  getTodayPlan: protectedProcedure
    .query(async ({ ctx }) => {
      return dailyPlanService.getTodayPlan(ctx.user.id);
    }),

  generatePlan: protectedProcedure
    .mutation(async ({ ctx }) => {
      return dailyPlanService.generateDailyPlan(ctx.user.id);
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
    .input(z.object({ role: z.string() }))
    .query(async ({ ctx, input }) => {
      return dailyPlanService.aggregateDailyItems(
        ctx.user.id,
        ctx.user.name ?? 'Unknown',
        input.role,
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
