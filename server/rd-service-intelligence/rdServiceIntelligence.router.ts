/**
 * 研发与客服智能路由 (R&D & Service Intelligence Router)
 * Phase H: 需求分析 · 设计审查 · 故障诊断 · 预防维护
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  analyzeRequirements,
  reviewDesign,
  diagnoseFault,
  planMaintenance,
} from "./rdServiceIntelligence.service";

export const rdServiceIntelligenceRouter = router({
  // AI需求智能分析 (mutation — invokes LLM)
  analyzeRequirements: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1),
        customerName: z.string().min(1),
        industry: z.string().min(1),
        cleaningTarget: z.string().min(1),
        cleanlinessStandard: z.string().optional(),
        throughput: z.string().optional(),
        specialRequirements: z.string().optional(),
        budget: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await analyzeRequirements(input);
    }),

  // AI设计审查 (mutation — invokes LLM)
  reviewDesign: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1),
        designPhase: z.string().min(1),
        designDescription: z.string().min(1),
        keyParameters: z.string().min(1),
        materialsUsed: z.string().optional(),
        previousIssues: z.string().optional(),
        standardsRequired: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await reviewDesign(input);
    }),

  // AI故障诊断 (mutation — invokes LLM)
  diagnoseFault: protectedProcedure
    .input(
      z.object({
        equipmentModel: z.string().min(1),
        symptomDescription: z.string().min(1),
        errorCodes: z.string().optional(),
        operatingConditions: z.string().optional(),
        lastMaintenanceDate: z.string().optional(),
        equipmentAge: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await diagnoseFault(input);
    }),

  // AI预防性维护 (mutation — invokes LLM)
  planMaintenance: protectedProcedure
    .input(
      z.object({
        equipmentModel: z.string().min(1),
        installDate: z.string().min(1),
        operatingHours: z.number().min(0),
        lastMaintenanceDate: z.string().min(1),
        maintenanceHistory: z.string().optional(),
        environmentCondition: z.string().optional(),
        usageIntensity: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await planMaintenance(input);
    }),
});
