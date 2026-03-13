/**
 * P2 自动化路由 (P2 Automation Router)
 * Phase 21 P2: 工单→知识库 · NPS调查 · 评审→报价 · 质量月报 · BOM冻结通知 · 验收通知
 */
import { z } from "zod";
import { router, requirePermission } from "../_core/trpc";
import { convertTicketToKB, generateNPSSurvey, linkReviewToQuotation, generateQualityMonthlyReport, triggerBOMFreezeNotification, generateAcceptanceNotification } from "./p2Automation.service";

export const p2AutomationRouter = router({
  convertTicketToKB: requirePermission('mfg:process:manage')
    .input(z.object({ ticketId: z.string().min(1), ticketTitle: z.string().min(1), faultDescription: z.string().min(1), resolution: z.string().min(1), equipmentModel: z.string().min(1), resolvedBy: z.string().optional() }))
    .mutation(async ({ input }) => await convertTicketToKB(input)),

  generateNPSSurvey: requirePermission('mfg:process:manage')
    .input(z.object({ ticketId: z.string().min(1), customerName: z.string().min(1), serviceType: z.string().min(1), engineerName: z.string().min(1), resolutionSummary: z.string().min(1), historicalNPS: z.string().optional() }))
    .mutation(async ({ input }) => await generateNPSSurvey(input)),

  linkReviewToQuotation: requirePermission('mfg:process:manage')
    .input(z.object({ reviewId: z.string().min(1), projectName: z.string().min(1), reviewConclusions: z.string().min(1), technicalParameters: z.string().min(1), approvedSpecs: z.string().optional() }))
    .mutation(async ({ input }) => await linkReviewToQuotation(input)),

  generateQualityMonthlyReport: requirePermission('mfg:process:manage')
    .input(z.object({ month: z.string().min(1), inspectionData: z.string().min(1), defectData: z.string().min(1), ncrData: z.string().optional(), customerComplaints: z.string().optional(), previousMonthData: z.string().optional() }))
    .mutation(async ({ input }) => await generateQualityMonthlyReport(input)),

  triggerBOMFreezeNotification: requirePermission('mfg:process:manage')
    .input(z.object({ bomId: z.string().min(1), projectName: z.string().min(1), bomVersion: z.string().min(1), frozenBy: z.string().min(1), materialCount: z.number(), criticalParts: z.string().optional() }))
    .mutation(async ({ input }) => await triggerBOMFreezeNotification(input)),

  generateAcceptanceNotification: requirePermission('mfg:process:manage')
    .input(z.object({ projectName: z.string().min(1), inspectionResult: z.string().min(1), customerName: z.string().min(1), equipmentModel: z.string().min(1), inspectionDate: z.string().min(1), inspector: z.string().optional() }))
    .mutation(async ({ input }) => await generateAcceptanceNotification(input)),
});
