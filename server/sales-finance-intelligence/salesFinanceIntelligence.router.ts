/**
 * 销售与财务智能路由 (Sales & Finance Intelligence Router)
 * Phase G: 销售预测 · 客户流失 · 预算异常 · 成本优化
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  forecastSales,
  predictChurn,
  analyzeBudget,
  optimizeCost,
} from "./salesFinanceIntelligence.service";

export const salesFinanceIntelligenceRouter = router({
  // 销售预测 (mutation — invokes LLM)
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
    .mutation(async ({ input }) => {
      return await forecastSales(input);
    }),

  // 客户流失预测 (mutation — invokes LLM)
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
    .mutation(async ({ input }) => {
      return await predictChurn(input);
    }),

  // 预算异常分析 (mutation — invokes LLM)
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
    .mutation(async ({ input }) => {
      return await analyzeBudget(input);
    }),

  // 成本优化 (mutation — invokes LLM)
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
    .mutation(async ({ input }) => {
      return await optimizeCost(input);
    }),
});
