import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { costAlertRuleTemplates } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const ruleTemplateRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(costAlertRuleTemplates).orderBy(desc(costAlertRuleTemplates.createdAt));
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  getById: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(costAlertRuleTemplates).where(eq(costAlertRuleTemplates.id, toNum(input.id)));
    return item || null;
  }),

  getAll: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(costAlertRuleTemplates).where(eq(costAlertRuleTemplates.isActive, 1)).orderBy(desc(costAlertRuleTemplates.usageCount));
  }),

  create: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const [template] = await db.insert(costAlertRuleTemplates).values({
      name: input.name || "新模板",
      description: input.description,
      templateType: input.templateType || "custom",
      category: input.category || "budget",
      ruleConfig: typeof input.ruleConfig === "string" ? input.ruleConfig : JSON.stringify(input.ruleConfig || {}),
      isActive: 1,
      createdBy: input.createdBy,
    }).returning();
    return { success: true, message: "模板创建成功", data: template };
  }),

  update: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
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

  createRule: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const [template] = await db.insert(costAlertRuleTemplates).values({
      name: input.name || "新规则",
      description: input.description,
      templateType: "custom",
      category: input.category || "budget",
      ruleConfig: typeof input.ruleConfig === "string" ? input.ruleConfig : JSON.stringify(input.ruleConfig || {}),
      isActive: 1,
    }).returning();
    return { success: true, message: "规则创建成功", data: template };
  }),

  saveAsTemplate: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const sourceId = toNum(input.ruleId || input.id);
    const [source] = await db.select().from(costAlertRuleTemplates).where(eq(costAlertRuleTemplates.id, sourceId));
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
