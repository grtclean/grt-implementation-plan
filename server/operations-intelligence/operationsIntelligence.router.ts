/**
 * 运营智能路由 (Operations Intelligence Router)
 * Phase E: 供应商评估 · 库存优化 · 质量预测 · 生产效率
 *
 * All LLM operations now use async task queue.
 */

import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { submitTask, getTaskStatus } from "../services/task-worker.service";

export const operationsIntelligenceRouter = router({
  assessSupplier: protectedProcedure
    .input(
      z.object({
        supplierName: z.string().min(1),
        category: z.string().min(1),
        deliveryOnTime: z.number().min(0).max(100),
        qualityPassRate: z.number().min(0).max(100),
        avgLeadDays: z.number().min(0),
        priceCompetitiveness: z.string().optional(),
        responseTime: z.string().optional(),
        certifications: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "OPS_ASSESS_SUPPLIER",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  optimizeInventory: protectedProcedure
    .input(
      z.object({
        materialName: z.string().min(1),
        currentStock: z.number().min(0),
        avgDailyUsage: z.number().min(0),
        leadTimeDays: z.number().min(0),
        unitCost: z.number().optional(),
        demandVariability: z.string().optional(),
        serviceLevel: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "OPS_OPTIMIZE_INVENTORY",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  predictQuality: protectedProcedure
    .input(
      z.object({
        processName: z.string().min(1),
        recentDefectRate: z.number().min(0).max(100),
        inspectionCount: z.number().min(0),
        defectTypes: z.string().optional(),
        materialBatch: z.string().optional(),
        equipmentAge: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "OPS_PREDICT_QUALITY",
        input as Record<string, unknown>,
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return { taskId, status: "processing" as const };
    }),

  analyzeEfficiency: protectedProcedure
    .input(
      z.object({
        processStep: z.string().min(1),
        plannedCycleTime: z.number().min(0),
        actualCycleTime: z.number().min(0),
        throughput: z.number().min(0),
        downtime: z.number().min(0).max(100),
        workerCount: z.number().optional(),
        defectRate: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { taskId } = await submitTask(
        "OPS_ANALYZE_EFFICIENCY",
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
