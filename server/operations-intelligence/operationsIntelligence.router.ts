/**
 * 运营智能路由 (Operations Intelligence Router)
 * Phase E: 供应商评估 · 库存优化 · 质量预测 · 生产效率
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  assessSupplier,
  optimizeInventory,
  predictQualityTrend,
  analyzeProductionEfficiency,
} from "./operationsIntelligence.service";

export const operationsIntelligenceRouter = router({
  // 供应商评估 (mutation — invokes LLM)
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
    .mutation(async ({ input }) => {
      return await assessSupplier(input);
    }),

  // 库存优化 (mutation — invokes LLM)
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
    .mutation(async ({ input }) => {
      return await optimizeInventory(input);
    }),

  // 质量趋势预测 (mutation — invokes LLM)
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
    .mutation(async ({ input }) => {
      return await predictQualityTrend(input);
    }),

  // 生产效率分析 (mutation — invokes LLM)
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
    .mutation(async ({ input }) => {
      return await analyzeProductionEfficiency(input);
    }),
});
