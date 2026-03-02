import { z } from "zod";
import { jsonValue } from "@shared/validators";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { costAlertRuleTemplates } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const ruleTemplateRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const [totalResult] = await db.select({ count: count() }).from(costAlertRuleTemplates);
      const total = totalResult?.count ?? 0;
      const items = await db.select().from(costAlertRuleTemplates).orderBy(desc(costAlertRuleTemplates.createdAt)).limit(limit).offset(offset);
      return { items, total, page: Math.floor(offset / limit) + 1, pageSize: limit };
    }),

  getById: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(costAlertRuleTemplates).where(eq(costAlertRuleTemplates.id, toNum(input.id))).limit(1000);
    return item || null;
  }),

  getAll: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      return await db.select().from(costAlertRuleTemplates).where(eq(costAlertRuleTemplates.isActive, 1)).orderBy(desc(costAlertRuleTemplates.usageCount)).limit(limit).offset(offset);
    }),

  create: protectedProcedure.input(z.object({
    name: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    templateType: z.string().max(50).optional(),
    category: z.string().max(50).optional(),
    ruleConfig: jsonValue.optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [template] = await db.insert(costAlertRuleTemplates).values({
      name: input.name || "新模板",
      description: input.description,
      templateType: input.templateType || "custom",
      category: input.category || "budget",
      ruleConfig: typeof input.ruleConfig === "string" ? input.ruleConfig : JSON.stringify(input.ruleConfig || {}),
      isActive: 1,
      createdBy: ctx.user.id,
    } as any).returning();
    return { success: true, message: "模板创建成功", data: template };
  }),

  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    ruleConfig: jsonValue.optional(),
    isActive: z.union([z.boolean(), z.number()]).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = toNum(input.id);
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.ruleConfig !== undefined) updates.ruleConfig = typeof input.ruleConfig === "string" ? input.ruleConfig : JSON.stringify(input.ruleConfig);
    if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0;
    const [template] = await db.update(costAlertRuleTemplates).set(updates).where(eq(costAlertRuleTemplates.id, id)).returning();
    return { success: true, message: "模板更新成功", data: template };
  }),

  delete: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(costAlertRuleTemplates).where(eq(costAlertRuleTemplates.id, toNum(input.id)));
    return { success: true, message: "模板已删除" };
  }),

  createRule: protectedProcedure.input(z.object({
    name: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    category: z.string().max(50).optional(),
    ruleConfig: jsonValue.optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [template] = await db.insert(costAlertRuleTemplates).values({
      name: input.name || "新规则",
      description: input.description,
      templateType: "custom",
      category: input.category || "budget",
      ruleConfig: typeof input.ruleConfig === "string" ? input.ruleConfig : JSON.stringify(input.ruleConfig || {}),
      isActive: 1,
    } as any).returning();
    return { success: true, message: "规则创建成功", data: template };
  }),

  saveAsTemplate: protectedProcedure.input(z.object({
    ruleId: z.union([z.string(), z.number()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().max(200).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const sourceId = toNum(input.ruleId || input.id);
    const [source] = await db.select().from(costAlertRuleTemplates).where(eq(costAlertRuleTemplates.id, sourceId)).limit(1000);
    if (!source) return { success: false, message: "源规则不存在" };
    const [template] = await db.insert(costAlertRuleTemplates).values({
      name: input.name || `${source.name} (模板)`,
      description: source.description,
      templateType: "custom",
      category: source.category,
      ruleConfig: source.ruleConfig,
      isActive: 1,
    }).returning();
    return { success: true, message: "已保存为模板", data: template };
  }),

  initBuiltin: protectedProcedure.mutation(async () => {
    const db = await requireDb();
    const [existing] = await db.select({ count: count() }).from(costAlertRuleTemplates);
    if (existing.count > 0) return { success: true, message: "内置模板已存在" };
    const builtins = [
      { name: "预算超支80%告警", templateType: "builtin" as const, category: "budget" as const, ruleConfig: JSON.stringify({ alertType: "budget_percent", threshold: 80, alertLevel: "warning" }) },
      { name: "预算超支100%告警", templateType: "builtin" as const, category: "budget" as const, ruleConfig: JSON.stringify({ alertType: "budget_percent", threshold: 100, alertLevel: "critical" }) },
      { name: "月度成本异常", templateType: "builtin" as const, category: "cost" as const, ruleConfig: JSON.stringify({ alertType: "month_increase", threshold: 30, alertLevel: "warning" }) },
    ];
    for (const tpl of builtins) {
      await db.insert(costAlertRuleTemplates).values({ ...tpl, isActive: 1 });
    }
    return { success: true, message: "内置模板已初始化" };
  }),
});
