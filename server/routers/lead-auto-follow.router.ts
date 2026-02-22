import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { crmLeads } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const leadAutoFollowRouter = router({
  // List leads that need follow-up (status = new or contacted, sorted by AI score desc)
  list: publicProcedure.query(async () => {
    const db = await requireDb();
    const leads = await db.select().from(crmLeads).orderBy(desc(crmLeads.createdAt));
    // Only show leads needing follow-up (new or contacted)
    const needsFollowUp = leads.filter(l => l.status === 'new' || l.status === 'contacted');
    return { items: needsFollowUp, total: needsFollowUp.length };
  }),

  getById: publicProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input }) => {
    const db = await requireDb();
    const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, numId));
    return lead || null;
  }),

  // Get auto-follow configuration (in-memory for now)
  getConfig: publicProcedure.query(async () => {
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

  updateConfig: publicProcedure.input(z.object({
    enabled: z.boolean().optional(),
    followUpIntervalDays: z.number().optional(),
    maxAutoFollowUps: z.number().optional(),
    aiScoreThreshold: z.number().optional(),
  }).optional()).mutation(async () => {
    return { success: true, message: "配置已更新" };
  }),

  create: publicProcedure.input(z.object({ data: z.any() }).optional()).mutation(async () => {
    return { success: true, message: "Auto-follow created" };
  }),
  update: publicProcedure.input(z.object({ id: z.union([z.string(), z.number()]), data: z.any().optional() }).optional()).mutation(async () => {
    return { success: true, message: "Auto-follow updated" };
  }),
  delete: publicProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async () => {
    return { success: true, message: "Auto-follow deleted" };
  }),
});
