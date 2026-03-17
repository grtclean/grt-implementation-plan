/**
 * 销售与财务智能路由 (Sales & Finance Intelligence Router)
 * Phase G: 销售预测 · 客户流失 · 预算异常 · 成本优化
 *
 * All LLM operations now use async task queue.
 */

import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { submitTask, getTaskStatus } from "../services/task-worker.service";

export const salesFinanceIntelligenceRouter = router({
  forecastSales: protectedProcedure
    .input(
      z.object({
        businessUnit: z.string().min(1),
        productLine: z.string().min(1),
        historicalRevenue: z.number().min(0),
        currentPipeline: z.number().min(0),
        seasonality: z.string().optional(),
        marketCondition: z.string().optional(),
        timeHorizon: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "SF_FORECAST_SALES",
        input as Record<string, unknown>,
        ctx.user!.name ?? `User#${ctx.user!.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  predictChurn: protectedProcedure
    .input(
      z.object({
        customerName: z.string().min(1),
        industry: z.string().min(1),
        contractValue: z.number().min(0),
        lastOrderDate: z.string().min(1),
        orderFrequency: z.string().min(1),
        satisfactionScore: z.number().min(1).max(10).optional(),
        complaintCount: z.number().min(0).optional(),
        competitorActivity: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "SF_PREDICT_CHURN",
        input as Record<string, unknown>,
        ctx.user!.name ?? `User#${ctx.user!.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  analyzeBudget: protectedProcedure
    .input(
      z.object({
        department: z.string().min(1),
        budgetPeriod: z.string().min(1),
        allocatedBudget: z.number().min(0),
        actualSpend: z.number().min(0),
        categories: z.string().min(1),
        overrunItems: z.string().optional(),
        comparisonPeriod: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "SF_ANALYZE_BUDGET",
        input as Record<string, unknown>,
        ctx.user!.name ?? `User#${ctx.user!.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  optimizeCost: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1),
        totalBudget: z.number().min(0),
        costBreakdown: z.string().min(1),
        targetMargin: z.number().min(0).max(100),
        materialCosts: z.string().optional(),
        laborHours: z.number().optional(),
        overheadRate: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "SF_OPTIMIZE_COST",
        input as Record<string, unknown>,
        ctx.user!.name ?? `User#${ctx.user!.id}`,
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
