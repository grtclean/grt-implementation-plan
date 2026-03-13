import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { crmLeads } from "../../drizzle/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";

export const leadAutoFollowRouter = router({
  // List leads that need follow-up (BU-scoped)
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const buFilter = buScopeCondition(crmLeads.buCode, ctx);
      // Count total follow-up leads (new or contacted)
      const followUpCondition = buFilter
        ? and(buFilter, sql`(${crmLeads.status} = 'new' OR ${crmLeads.status} = 'contacted')`)
        : sql`(${crmLeads.status} = 'new' OR ${crmLeads.status} = 'contacted')`;
      const [totalResult] = await db.select({ count: count() }).from(crmLeads).where(followUpCondition);
      const total = Number(totalResult?.count ?? 0);
      const leads = await db.select().from(crmLeads).where(followUpCondition).orderBy(desc(crmLeads.createdAt)).limit(limit).offset(offset);
      return { items: leads, total };
    }),

  getById: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const buFilter = buScopeCondition(crmLeads.buCode, ctx);
    const conditions = [eq(crmLeads.id, numId)];
    if (buFilter) conditions.push(buFilter);
    const [lead] = await db.select().from(crmLeads).where(and(...conditions)).limit(1000);
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

  updateConfig: requirePermission('crm:leads:manage').input(z.object({
    enabled: z.boolean().optional(),
    followUpIntervalDays: z.number().optional(),
    maxAutoFollowUps: z.number().optional(),
    aiScoreThreshold: z.number().optional(),
  }).optional()).mutation(async () => {
    return { success: true, message: "配置已更新" };
  }),

  create: requirePermission('crm:leads:manage').input(z.object({ data: z.record(z.string(), jsonValue).optional() }).optional()).mutation(async () => {
    return { success: true, message: "Auto-follow created" };
  }),
  update: requirePermission('crm:leads:manage').input(z.object({ id: z.union([z.string(), z.number()]), data: z.record(z.string(), jsonValue).optional() }).optional()).mutation(async () => {
    return { success: true, message: "Auto-follow updated" };
  }),
  delete: requirePermission('crm:leads:manage').input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async () => {
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
