import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { crmLeads, crmOpportunitiesV2, crmCustomersV2 } from "../../drizzle/schema";
import { eq, desc, count, sql } from "drizzle-orm";

export const leadAnalyticsRouter = router({
  // Return all leads with analytics annotations
  list: publicProcedure.input(z.object({
    status: z.string().optional(),
    priority: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(crmLeads).orderBy(desc(crmLeads.createdAt));
    if (input?.status) items = items.filter(l => l.status === input.status);
    if (input?.priority) items = items.filter(l => l.priority === input.priority);
    return { items, total: items.length };
  }),

  getById: publicProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input }) => {
    const db = await requireDb();
    const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, numId));
    return lead || null;
  }),

  // Aggregate analytics
  getAnalytics: publicProcedure.query(async () => {
    const db = await requireDb();
    const leads = await db.select().from(crmLeads);
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

  getConversionRate: publicProcedure.query(async () => {
    const db = await requireDb();
    const leads = await db.select().from(crmLeads);
    const total = leads.length;
    const converted = leads.filter(l => l.status === 'converted').length;
    return { rate: total > 0 ? Math.round((converted / total) * 100) : 0, total, converted };
  }),

  getSourceDistribution: publicProcedure.query(async () => {
    const db = await requireDb();
    const leads = await db.select().from(crmLeads);
    const dist: Record<string, number> = {};
    for (const l of leads) {
      dist[l.source || 'unknown'] = (dist[l.source || 'unknown'] || 0) + 1;
    }
    return Object.entries(dist).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  }),

  // Keep stub CRUD for compat
  create: publicProcedure.input(z.object({ data: z.any() }).optional()).mutation(async () => {
    return { success: true, message: "Use crm.leads.create instead" };
  }),
  update: publicProcedure.input(z.object({ id: z.union([z.string(), z.number()]), data: z.any().optional() }).optional()).mutation(async () => {
    return { success: true, message: "Use crm.leads.update instead" };
  }),
  delete: publicProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async () => {
    return { success: true, message: "Use crm.leads.update instead" };
  }),

  // ── 前端 LeadManagement.tsx 需要的过程 ──

  getFunnelData: publicProcedure
    .input(z.object({}).optional())
    .query(async () => {
      const db = await requireDb();
      const leads = await db.select().from(crmLeads);
      const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
      const funnel = stages.map(stage => ({
        stage,
        count: leads.filter(l => l.status === stage).length,
      }));
      return { funnel, total: leads.length };
    }),

  getTrendData: publicProcedure
    .input(z.object({ period: z.string().optional(), months: z.number().optional() }).optional())
    .query(async () => {
      return { trend: [], period: 'month' };
    }),

  getSourceAnalysis: publicProcedure
    .input(z.object({}).optional())
    .query(async () => {
      const db = await requireDb();
      const leads = await db.select().from(crmLeads);
      const dist: Record<string, number> = {};
      for (const l of leads) {
        dist[l.source || 'unknown'] = (dist[l.source || 'unknown'] || 0) + 1;
      }
      return Object.entries(dist).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
    }),

  getSalesPerformance: publicProcedure
    .input(z.object({}).optional())
    .query(async () => {
      return { performers: [], avgConversion: 0 };
    }),
});
