/**
 * AI Purchase Assistant tRPC Routes
 * 采购助手API路由
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { PurchaseAssistant } from "./purchaseAssistant";

// ============================================================================
// Purchase Assistant Routes
// ============================================================================

export const purchaseAssistantRouter = router({
  /**
   * 推荐供应商
   */
  recommendSupplier: protectedProcedure
    .input(z.object({
      materialId: z.number(),
      requirements: z.object({
        maxPrice: z.number().optional(),
        minQualityRating: z.string().optional(),
        maxLeadTimeDays: z.number().optional(),
        preferDomestic: z.boolean().optional(),
      }),
    }))
    .query(async ({ input }) => {
      const recommendations = await PurchaseAssistant.recommendSupplier(
        input.materialId,
        input.requirements
      );
      return { success: true, data: recommendations };
    }),

  /**
   * 供应商价格比较
   */
  compareSupplierPrices: protectedProcedure
    .input(z.object({
      materialId: z.number(),
      supplierIds: z.array(z.number()).min(1),
    }))
    .query(async ({ input }) => {
      const matrix = await PurchaseAssistant.compareSupplierPrices(
        input.materialId,
        input.supplierIds
      );
      return { success: true, data: matrix };
    }),

  /**
   * 建议采购策略
   */
  suggestPurchaseStrategy: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      const strategy = await PurchaseAssistant.suggestPurchaseStrategy(
        input.projectId
      );
      return { success: true, data: strategy };
    }),

  /**
   * 从BOM生成采购计划
   */
  generatePurchasePlan: protectedProcedure
    .input(z.object({
      bomId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const plan = await PurchaseAssistant.generatePurchasePlan(input.bomId);
      return { success: true, data: plan };
    }),

  /**
   * 供应商风险评估
   */
  assessSupplierRisk: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
    }))
    .query(async ({ input }) => {
      const assessment = await PurchaseAssistant.assessSupplierRisk(
        input.supplierId
      );
      return { success: true, data: assessment };
    }),
});
