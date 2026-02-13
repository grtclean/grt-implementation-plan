/**
 * AI Service Assistant tRPC Routes
 * 售后服务助手API路由
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { ServiceAssistant } from "./serviceAssistant";

// ============================================================================
// Service Assistant Routes
// ============================================================================

export const serviceAssistantRouter = router({
  /**
   * 故障诊断
   */
  diagnoseFault: protectedProcedure
    .input(z.object({
      symptoms: z.array(z.string()).min(1),
      equipmentModel: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const diagnosis = await ServiceAssistant.diagnoseFault(
        input.symptoms,
        input.equipmentModel
      );
      return { success: true, data: diagnosis };
    }),

  /**
   * 建议维护计划
   */
  suggestMaintenancePlan: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
    }))
    .query(async ({ input }) => {
      const plan = await ServiceAssistant.suggestMaintenancePlan(
        input.equipmentId
      );
      return { success: true, data: plan };
    }),

  /**
   * 生成服务报告
   */
  generateServiceReport: protectedProcedure
    .input(z.object({
      serviceTicketId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const report = await ServiceAssistant.generateServiceReport(
        input.serviceTicketId
      );
      return { success: true, data: report };
    }),

  /**
   * 匹配知识库文章
   */
  matchKBArticles: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const results = await ServiceAssistant.matchKBArticles(input.query);
      return { success: true, data: results };
    }),

  /**
   * 估算维修时间
   */
  estimateRepairTime: protectedProcedure
    .input(z.object({
      faultType: z.string().min(1),
      equipmentModel: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const estimate = await ServiceAssistant.estimateRepairTime(
        input.faultType,
        input.equipmentModel
      );
      return { success: true, data: estimate };
    }),
});
