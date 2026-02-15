/**
 * 生产高级智能路由 (Production Advanced Router)
 * Phase 21 P1: US-010/011/012/018
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { analyzeShortage, optimizeRequisition, analyzeException, generateDailyReport } from "./productionAdvanced.service";

export const productionAdvancedRouter = router({
  analyzeShortage: protectedProcedure
    .input(z.object({ productionPlan: z.string().min(1), currentInventory: z.string().min(1), pendingOrders: z.string().optional(), historicalUsage: z.string().optional() }))
    .mutation(async ({ input }) => await analyzeShortage(input)),

  optimizeRequisition: protectedProcedure
    .input(z.object({ workstation: z.string().min(1), productionOrder: z.string().min(1), bomMaterials: z.string().min(1), warehouseInventory: z.string().min(1) }))
    .mutation(async ({ input }) => await optimizeRequisition(input)),

  analyzeException: protectedProcedure
    .input(z.object({ exceptionType: z.string().min(1), description: z.string().min(1), location: z.string().min(1), affectedOrders: z.string().optional(), equipmentId: z.string().optional(), reporterName: z.string().min(1) }))
    .mutation(async ({ input }) => await analyzeException(input)),

  generateDailyReport: protectedProcedure
    .input(z.object({ date: z.string().min(1), productionData: z.string().min(1), qualityData: z.string().min(1), equipmentData: z.string().optional(), abnormalEvents: z.string().optional(), tomorrowPlan: z.string().optional() }))
    .mutation(async ({ input }) => await generateDailyReport(input)),
});
