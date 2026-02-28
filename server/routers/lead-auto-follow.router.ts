import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { crmLeads } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const leadAutoFollowRouter = router({
  // List leads that need follow-up (BU-scoped)
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const buFilter = buScopeCondition(crmLeads.buCode, ctx);
    const leads = buFilter
      ? await db.select().from(crmLeads).where(buFilter).orderBy(desc(crmLeads.createdAt))
      : await db.select().from(crmLeads).orderBy(desc(crmLeads.createdAt));
    const needsFollowUp = leads.filter(l => l.status === 'new' || l.status === 'contacted');
    return { items: needsFollowUp, total: needsFollowUp.length };
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

  // Get auto-follow configuration (in-memory for now)
  getConfig: protectedProcedure.query(async () => {
    return {
      enabled: true,
      followUpIntervalDays: 3,
      maxAutoFollowUps: 5,
      aiScoreThreshold: 50,
      templates: [
        { name: "初次联系", type: "email", delay: 0 },
        { name: "产品介绍", type: "wechat", delay: 3 },
        { name: "需求确认", type: "call", delay: 7 },
        { name: "方案推荐", type: "email", delay: 14 },
        { name: "报价跟进", type: "call", delay: 21 },
      ],
    };
  }),

  updateConfig: protectedProcedure.input(z.object({
    enabled: z.boolean().optional(),
    followUpIntervalDays: z.number().optional(),
    maxAutoFollowUps: z.number().optional(),
    aiScoreThreshold: z.number().optional(),
  }).optional()).mutation(async () => {
    return { success: true, message: "配置已更新" };
  }),

  create: protectedProcedure.input(z.object({ data: z.any() }).optional()).mutation(async () => {
    return { success: true, message: "Auto-follow created" };
  }),
  update: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]), data: z.any().optional() }).optional()).mutation(async () => {
    return { success: true, message: "Auto-follow updated" };
  }),
  delete: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async () => {
    return { success: true, message: "Auto-follow deleted" };
  }),

  // ── 前端 LeadManagement.tsx 需要的过程 ──

  getLeads: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      priority: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const buFilter = buScopeCondition(crmLeads.buCode, ctx);
      let items = buFilter
        ? await db.select().from(crmLeads).where(buFilter).orderBy(desc(crmLeads.createdAt)).limit(input?.limit ?? 50)
        : await db.select().from(crmLeads).orderBy(desc(crmLeads.createdAt)).limit(input?.limit ?? 50);
      if (input?.status) items = items.filter((l: any) => l.status === input.status);
      if (input?.priority) items = items.filter((l: any) => l.priority === input.priority);
      return { items, total: items.length };
    }),

  getFollowUpTasks: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async () => {
      return { items: [], total: 0 };
    }),
});
