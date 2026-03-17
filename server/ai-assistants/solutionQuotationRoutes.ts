/**
 * AI Solution & Quotation Assistant tRPC Routes
 * 
 * 提供方案准备和报价助手的API接口
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { SolutionAssistant, type ProcessParameters } from "./solutionAssistant";
import { QuotationAssistant, type QuotationInput } from "./quotationAssistant";

// ============================================================================
// 输入验证Schema
// ============================================================================

const processParametersSchema = z.object({
  workpieceName: z.string(),
  workpieceType: z.string().optional(),
  workpieceMaterial: z.string().optional(),
  workpieceDimensions: z.string().optional(),
  workpieceWeight: z.number().optional(),
  cleanlinessStandard: z.string().optional(),
  cleanlinessValue: z.string().optional(),
  particleSize: z.string().optional(),
  residueLimit: z.string().optional(),
  targetCycleTime: z.number().optional(),
  dailyCapacity: z.number().optional(),
  shifts: z.number().optional(),
  loadingMethod: z.string().optional(),
  unloadingMethod: z.string().optional(),
  palletSpec: z.string().optional(),
  blindHoleCleaning: z.boolean().optional(),
  deburring: z.boolean().optional(),
  rustPrevention: z.boolean().optional(),
  additionalRequirements: z.string().optional()
});

const quotationInputSchema = z.object({
  customerName: z.string(),
  customerType: z.enum(["oem", "tier1", "tier2", "other"]).optional(),
  equipmentModel: z.string(),
  equipmentQuantity: z.number().optional(),
  solutionId: z.string().optional(),
  projectNo: z.string().optional(),
  customizations: z.array(z.object({
    description: z.string(),
    estimatedCost: z.number().optional()
  })).optional(),
  deliveryTime: z.string().optional(),
  paymentTerms: z.string().optional(),
  warrantyYears: z.number().optional(),
  competitorPrice: z.number().optional(),
  competitorName: z.string().optional(),
  competitionLevel: z.enum(["low", "medium", "high"]).optional(),
  isStrategicCustomer: z.boolean().optional(),
  isRepeatCustomer: z.boolean().optional()
});

// ============================================================================
// Solution Assistant Routes
// ============================================================================

export const solutionAssistantRouter = router({
  /**
   * 解析自然语言工艺参数
   */
  parseParameters: protectedProcedure
    .input(z.object({
      naturalLanguageInput: z.string()
    }))
    .mutation(async ({ input }) => {
      const params = await SolutionAssistant.parseProcessParameters(input.naturalLanguageInput);
      return { success: true, data: params };
    }),

  /**
   * 推荐方案
   */
  recommend: protectedProcedure
    .input(z.object({
      parameters: processParametersSchema,
      maxResults: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const report = await SolutionAssistant.recommendSolutions(
        input.parameters as ProcessParameters,
        ctx.user!.id,
        input.maxResults || 5
      );
      return { success: true, data: report };
    }),

  /**
   * 从项目交付中学习
   */
  learnFromDelivery: protectedProcedure
    .input(z.object({
      solutionId: z.string(),
      projectNo: z.string(),
      learningContent: z.object({
        actualCycleTime: z.number().optional(),
        actualCleanliness: z.string().optional(),
        customerFeedback: z.string().optional(),
        issuesEncountered: z.array(z.string()).optional(),
        optimizations: z.array(z.string()).optional(),
        performanceMetrics: z.record(z.string(), z.number()).optional()
      })
    }))
    .mutation(async ({ input }) => {
      await SolutionAssistant.learnFromProjectDelivery(
        input.solutionId,
        input.projectNo,
        input.learningContent
      );
      return { success: true };
    }),

  /**
   * 创建新方案
   */
  create: protectedProcedure
    .input(z.object({
      solutionName: z.string(),
      sourceType: z.enum(["grt_internal", "competitor", "industry_standard"]).optional(),
      customerName: z.string().optional(),
      projectNo: z.string().optional(),
      equipmentModel: z.string().optional(),
      workpieceType: z.string().optional(),
      workpieceCategory: z.enum(["shell", "shaft", "gear", "valve", "cylinder", "precision", "other"]).optional(),
      workpieceMaterial: z.string().optional(),
      workpieceDimensions: z.string().optional(),
      workpieceWeight: z.number().optional(),
      cleanlinessStandard: z.string().optional(),
      cleanlinessValue: z.string().optional(),
      cycleTime: z.number().optional(),
      dailyCapacity: z.number().optional(),
      loadingMethod: z.string().optional(),
      unloadingMethod: z.string().optional(),
      processFlow: z.string().optional(),
      processParameters: z.string().optional(),
      specialRequirements: z.string().optional(),
      deliveryDate: z.string().optional(),
      lessonsLearned: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const solutionId = await SolutionAssistant.createSolution({
        ...input,
        solutionId: `SOL-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        workpieceWeight: input.workpieceWeight ? String(input.workpieceWeight) : undefined,
        deliveryDate: input.deliveryDate,
        createdBy: ctx.user!.id
      });
      return { success: true, solutionId };
    }),

  /**
   * 获取方案详情
   */
  getById: protectedProcedure
    .input(z.object({
      solutionId: z.string()
    }))
    .query(async ({ input }) => {
      const solution = await SolutionAssistant.getSolutionById(input.solutionId);
      return { success: true, data: solution };
    }),

  /**
   * 获取方案列表
   */
  list: protectedProcedure
    .input(z.object({
      sourceType: z.enum(["grt_internal", "competitor", "industry_standard"]).optional(),
      workpieceCategory: z.string().optional(),
      equipmentModel: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional()
    }))
    .query(async ({ input }) => {
      const solutions = await SolutionAssistant.listSolutions(input);
      return { success: true, data: solutions };
    }),

  /**
   * 提交推荐反馈
   */
  submitFeedback: protectedProcedure
    .input(z.object({
      recommendationId: z.string(),
      selectedSolutionId: z.string(),
      feedbackScore: z.number().min(1).max(5),
      feedbackComment: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      await SolutionAssistant.submitRecommendationFeedback(
        input.recommendationId,
        input.selectedSolutionId,
        input.feedbackScore,
        input.feedbackComment
      );
      return { success: true };
    })
});

// ============================================================================
// Quotation Assistant Routes
// ============================================================================

export const quotationAssistantRouter = router({
  /**
   * 计算成本明细
   */
  calculateCost: protectedProcedure
    .input(quotationInputSchema)
    .mutation(async ({ input }) => {
      const costBreakdown = await QuotationAssistant.calculateCostBreakdown(input as QuotationInput);
      return { success: true, data: costBreakdown };
    }),

  /**
   * 推荐报价
   */
  recommend: protectedProcedure
    .input(quotationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const report = await QuotationAssistant.recommendQuotation(
        input as QuotationInput,
        ctx.user!.id
      );
      return { success: true, data: report };
    }),

  /**
   * 记录投标结果
   */
  recordBidResult: protectedProcedure
    .input(z.object({
      quotationId: z.string(),
      result: z.enum(["won", "lost"]),
      finalPrice: z.number().optional(),
      competitorPrice: z.number().optional(),
      competitorName: z.string().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      await QuotationAssistant.recordBidResult(
        input.quotationId,
        input.result,
        input.finalPrice,
        input.competitorPrice,
        input.competitorName,
        input.notes
      );
      return { success: true };
    }),

  /**
   * 创建报价
   */
  create: protectedProcedure
    .input(z.object({
      projectNo: z.string().optional(),
      solutionId: z.string().optional(),
      customerName: z.string(),
      customerType: z.enum(["oem", "tier1", "tier2", "other"]).optional(),
      equipmentModel: z.string(),
      equipmentQuantity: z.number().optional(),
      basePrice: z.number(),
      customizationCost: z.number().optional(),
      installationCost: z.number().optional(),
      trainingCost: z.number().optional(),
      warrantyCost: z.number().optional(),
      otherCosts: z.number().optional(),
      totalCost: z.number(),
      totalPrice: z.number(),
      discountRate: z.number().optional(),
      finalPrice: z.number().optional(),
      currency: z.string().optional(),
      quotationDate: z.string(),
      validUntil: z.string().optional(),
      paymentTerms: z.string().optional(),
      deliveryTerms: z.string().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const quotationId = await QuotationAssistant.createQuotation({
        ...input,
        quotationId: `QUO-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        basePrice: String(input.basePrice),
        customizationCost: input.customizationCost ? String(input.customizationCost) : undefined,
        installationCost: input.installationCost ? String(input.installationCost) : undefined,
        trainingCost: input.trainingCost ? String(input.trainingCost) : undefined,
        warrantyCost: input.warrantyCost ? String(input.warrantyCost) : undefined,
        otherCosts: input.otherCosts ? String(input.otherCosts) : undefined,
        totalCost: String(input.totalCost),
        totalPrice: String(input.totalPrice),
        discountRate: input.discountRate ? String(input.discountRate) : undefined,
        finalPrice: input.finalPrice ? String(input.finalPrice) : undefined,
        quotationDate: input.quotationDate,
        validUntil: input.validUntil,
        createdBy: ctx.user!.id
      });
      return { success: true, quotationId };
    }),

  /**
   * 获取报价详情
   */
  getById: protectedProcedure
    .input(z.object({
      quotationId: z.string()
    }))
    .query(async ({ input }) => {
      const quotation = await QuotationAssistant.getQuotationById(input.quotationId);
      return { success: true, data: quotation };
    }),

  /**
   * 获取报价列表
   */
  list: protectedProcedure
    .input(z.object({
      customerType: z.enum(["oem", "tier1", "tier2", "other"]).optional(),
      equipmentModel: z.string().optional(),
      bidResult: z.enum(["won", "lost", "pending"]).optional(),
      limit: z.number().optional(),
      offset: z.number().optional()
    }))
    .query(async ({ input }) => {
      const quotations = await QuotationAssistant.listQuotations(input);
      return { success: true, data: quotations };
    }),

  /**
   * 提交报价推荐反馈
   */
  submitFeedback: protectedProcedure
    .input(z.object({
      recommendationId: z.string(),
      selectedStrategy: z.string(),
      finalQuotationId: z.string(),
      feedbackScore: z.number().min(1).max(5),
      feedbackComment: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      await QuotationAssistant.submitQuotationFeedback(
        input.recommendationId,
        input.selectedStrategy,
        input.finalQuotationId,
        input.feedbackScore,
        input.feedbackComment
      );
      return { success: true };
    })
});

export default { solutionAssistantRouter, quotationAssistantRouter };
