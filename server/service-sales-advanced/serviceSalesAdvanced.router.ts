/**
 * 服务与销售高级路由 (Service & Sales Advanced Router)
 * Phase 21 P1: US-014/015/016/017
 */
import { z } from "zod";
import { router, requirePermission } from "../_core/trpc";
import { guideRemoteAssistance, analyzeSLA, convertOpportunity, analyzeFieldFeedback } from "./serviceSalesAdvanced.service";

export const serviceSalesAdvancedRouter = router({
  guideRemoteAssistance: requirePermission('service:tickets:manage')
    .input(z.object({ equipmentModel: z.string().min(1), faultDescription: z.string().min(1), customerSkillLevel: z.string().min(1), availableTools: z.string().optional(), previousAttempts: z.string().optional() }))
    .mutation(async ({ input }) => await guideRemoteAssistance(input)),

  analyzeSLA: requirePermission('service:tickets:manage')
    .input(z.object({ period: z.string().min(1), ticketData: z.string().min(1), slaTargets: z.string().min(1), engineerData: z.string().optional() }))
    .mutation(async ({ input }) => await analyzeSLA(input)),

  convertOpportunity: requirePermission('service:tickets:manage')
    .input(z.object({ opportunityName: z.string().min(1), customerName: z.string().min(1), industry: z.string().min(1), productInterest: z.string().min(1), budget: z.string().optional(), notes: z.string().optional() }))
    .mutation(async ({ input }) => await convertOpportunity(input)),

  analyzeFieldFeedback: requirePermission('service:tickets:manage')
    .input(z.object({ period: z.string().min(1), faultRecords: z.string().min(1), equipmentModels: z.string().min(1), recurringThreshold: z.number().optional() }))
    .mutation(async ({ input }) => await analyzeFieldFeedback(input)),
});
