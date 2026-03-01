import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { crmLeads, crmOpportunitiesV2, crmCustomersV2 } from "../../drizzle/schema";
import { eq, desc, count, sql, and } from "drizzle-orm";

/** Helper: fetch leads with BU scope applied */
async function fetchLeadsBuScoped(ctx: any) {
  const db = await requireDb();
  const buFilter = buScopeCondition(crmLeads.buCode, ctx);
  if (buFilter) {
    return db.select().from(crmLeads).where(buFilter).orderBy(desc(crmLeads.createdAt));
  }
  return db.select().from(crmLeads).orderBy(desc(crmLeads.createdAt));
}

export const leadAnalyticsRouter = router({
  // Return all leads with analytics annotations (BU-scoped)
  list: protectedProcedure.input(z.object({
    status: z.string().optional(),
    priority: z.string().optional(),
  }).optional()).query(async ({ input, ctx }) => {
    let items = await fetchLeadsBuScoped(ctx);
    if (input?.status) items = items.filter(l => l.status === input.status);
    if (input?.priority) items = items.filter(l => l.priority === input.priority);
    return { items, total: items.length };
  }),

  getById: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const buFilter = buScopeCondition(crmLeads.buCode, ctx);
    const conditions = [eq(crmLeads.id, numId)];
    if (buFilter) conditions.push(buFilter);
    const [lead] = await db.select().from(crmLeads).where(and(...conditions));
    return lead || null;
  }),

  // Aggregate analytics (BU-scoped)
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const leads = await fetchLeadsBuScoped(ctx);
    const total = leads.length;
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalScore = 0;
    for (const l of leads) {
      byStatus[l.status || 'unknown'] = (byStatus[l.status || 'unknown'] || 0) + 1;
      bySource[l.source || 'unknown'] = (bySource[l.source || 'unknown'] || 0) + 1;
      byPriority[l.priority || 'unknown'] = (byPriority[l.priority || 'unknown'] || 0) + 1;
      totalScore += Number(l.aiConfidenceScore) || 0;
    }
    return {
      total,
      avgAiScore: total > 0 ? Math.round(totalScore / total) : 0,
      byStatus,
      bySource,
      byPriority,
    };
  }),

  getConversionRate: protectedProcedure.query(async ({ ctx }) => {
    const leads = await fetchLeadsBuScoped(ctx);
    const total = leads.length;
    const converted = leads.filter(l => l.status === 'converted').length;
    return { rate: total > 0 ? Math.round((converted / total) * 100) : 0, total, converted };
  }),

  getSourceDistribution: protectedProcedure.query(async ({ ctx }) => {
    const leads = await fetchLeadsBuScoped(ctx);
    const dist: Record<string, number> = {};
    for (const l of leads) {
      dist[l.source || 'unknown'] = (dist[l.source || 'unknown'] || 0) + 1;
    }
    return Object.entries(dist).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  }),

  // Keep stub CRUD for compat
  create: protectedProcedure.input(z.object({ data: z.record(z.string(), z.unknown()).optional() }).optional()).mutation(async () => {
    return { success: true, message: "Use crm.leads.create instead" };
  }),
  update: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]), data: z.record(z.string(), z.unknown()).optional() }).optional()).mutation(async () => {
    return { success: true, message: "Use crm.leads.update instead" };
  }),
  delete: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async () => {
    return { success: true, message: "Use crm.leads.update instead" };
  }),

  // ── 前端 LeadManagement.tsx 需要的过程 ──

  getFunnelData: protectedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const leads = await fetchLeadsBuScoped(ctx);
      const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
      const funnel = stages.map(stage => ({
        stage,
        count: leads.filter(l => l.status === stage).length,
      }));
      return { funnel, total: leads.length };
    }),

  getTrendData: protectedProcedure
    .input(z.object({ period: z.string().optional(), months: z.number().optional() }).optional())
    .query(async () => {
      return { trend: [], period: 'month' };
    }),

  getSourceAnalysis: protectedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const leads = await fetchLeadsBuScoped(ctx);
      const dist: Record<string, number> = {};
      for (const l of leads) {
        dist[l.source || 'unknown'] = (dist[l.source || 'unknown'] || 0) + 1;
      }
      return Object.entries(dist).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
    }),

  getSalesPerformance: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      return { performers: [], avgConversion: 0 };
    }),
});
