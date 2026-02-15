/**
 * 区域合规与本地化路由 (Regional Compliance & Localization Router)
 * Phase I: CN劳动法/五险一金/认证/工作日/VAT/本地化
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { analyzeCNOvertime, calculateSocialInsurance, assessRegionalCertification, calculateWorkingDaysAI, calculateVAT, localizeContent } from "./regionalCompliance.service";

export const regionalComplianceRouter = router({
  analyzeCNOvertime: protectedProcedure
    .input(z.object({ employeeData: z.string().min(1), month: z.string().min(1), overtimeRecords: z.string().min(1) }))
    .mutation(async ({ input }) => await analyzeCNOvertime(input)),

  calculateSocialInsurance: protectedProcedure
    .input(z.object({ city: z.string().min(1), baseSalary: z.number(), housingFundRate: z.number(), employeeCount: z.number().optional() }))
    .mutation(async ({ input }) => await calculateSocialInsurance(input)),

  assessRegionalCertification: protectedProcedure
    .input(z.object({ equipmentModel: z.string().min(1), targetMarkets: z.string().min(1), currentCerts: z.string().optional(), designPhase: z.string().min(1) }))
    .mutation(async ({ input }) => await assessRegionalCertification(input)),

  calculateWorkingDays: protectedProcedure
    .input(z.object({ startDate: z.string().min(1), estimatedDays: z.number(), region: z.string().min(1), includeBuffer: z.boolean() }))
    .mutation(async ({ input }) => await calculateWorkingDaysAI(input)),

  calculateVAT: protectedProcedure
    .input(z.object({ amount: z.number(), currency: z.string().min(1), fromRegion: z.string().min(1), toRegion: z.string().min(1), productType: z.string().min(1), isB2B: z.boolean() }))
    .mutation(async ({ input }) => await calculateVAT(input)),

  localizeContent: protectedProcedure
    .input(z.object({ content: z.string().min(1), sourceLanguage: z.string().min(1), targetLanguage: z.string().min(1), contentType: z.string().min(1), industry: z.string().min(1) }))
    .mutation(async ({ input }) => await localizeContent(input)),
});
