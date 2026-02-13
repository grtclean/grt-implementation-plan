/**
 * AI Quality Assistant tRPC Routes
 * 质量管理助手API路由
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { QualityAssistant } from "./qualityAssistant";

// ============================================================================
// Quality Assistant Routes
// ============================================================================

export const qualityAssistantRouter = router({
  /**
   * 缺陷分析 - 根因分析与鱼骨图数据
   */
  analyzeDefect: protectedProcedure
    .input(z.object({
      defectDescription: z.string().min(1),
      equipmentModel: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const analysis = await QualityAssistant.analyzeDefect(
        input.defectDescription,
        input.equipmentModel
      );
      return { success: true, data: analysis };
    }),

  /**
   * 建议检验计划
   */
  suggestInspectionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      stage: z.enum(["incoming", "process", "final", "fat"]),
    }))
    .query(async ({ input }) => {
      const plan = await QualityAssistant.suggestInspectionPlan(
        input.projectId,
        input.stage
      );
      return { success: true, data: plan };
    }),

  /**
   * 生成质量报告
   */
  generateQualityReport: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      period: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const report = await QualityAssistant.generateQualityReport(
        input.projectId,
        input.period
      );
      return { success: true, data: report };
    }),

  /**
   * CAPA追踪
   */
  trackCAPAActions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      const tracking = await QualityAssistant.trackCAPAActions(input.projectId);
      return { success: true, data: tracking };
    }),

  /**
   * 过程能力评估 (Cp/Cpk)
   */
  assessProcessCapability: protectedProcedure
    .input(z.object({
      processId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await QualityAssistant.assessProcessCapability(
        input.processId
      );
      return { success: true, data: result };
    }),
});
