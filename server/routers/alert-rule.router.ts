/**
 * Alert Rule Router
 * 成本预警规则管理 — replaces placeholder alertRuleRouter
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { costAlertRules, costAlertLogs } from "../../drizzle/schema";
import { eq, desc, count, sql } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const alertRuleRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(costAlertRules).orderBy(desc(costAlertRules.createdAt));
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  listHistory: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(costAlertLogs).orderBy(desc(costAlertLogs.createdAt)).limit(100);
  }),

  getStatistics: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [ruleCount] = await db.select({ count: count() }).from(costAlertRules);
    const [activeCount] = await db.select({ count: count() }).from(costAlertRules).where(eq(costAlertRules.isActive, 1));
    const [logCount] = await db.select({ count: count() }).from(costAlertLogs);
    const [pendingCount] = await db.select({ count: count() }).from(costAlertLogs).where(eq(costAlertLogs.status, "pending"));
    return {
      statistics: {
        totalRules: ruleCount.count,
        activeRules: activeCount.count,
        totalAlerts: logCount.count,
        pendingAlerts: pendingCount.count,
      },
    };
  }),

  create: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const [rule] = await db.insert(costAlertRules).values({
      name: input.name || "新规则",
      description: input.description,
      scope: input.scope || "all",
      projectId: input.projectId,
      categoryId: input.categoryId,
      alertType: input.alertType || "budget_percent",
      threshold: input.threshold || 80,
      alertLevel: input.alertLevel || "warning",
      notifyType: input.notifyType || "system",
      notifyUserIds: input.notifyUserIds,
      isActive: input.isActive !== undefined ? (input.isActive ? 1 : 0) : 1,
    }).returning();
    return { success: true, message: "规则创建成功", data: rule };
  }),

  update: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = toNum(input.id);
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.scope !== undefined) updates.scope = input.scope;
    if (input.alertType !== undefined) updates.alertType = input.alertType;
    if (input.threshold !== undefined) updates.threshold = input.threshold;
    if (input.alertLevel !== undefined) updates.alertLevel = input.alertLevel;
    if (input.notifyType !== undefined) updates.notifyType = input.notifyType;
    if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0;
    const [rule] = await db.update(costAlertRules).set(updates).where(eq(costAlertRules.id, id)).returning();
    return { success: true, message: "规则更新成功", data: rule };
  }),

  delete: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(costAlertRules).where(eq(costAlertRules.id, toNum(input.id)));
    return { success: true, message: "规则已删除" };
  }),

  toggleEnabled: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = toNum(input.id);
    const [rule] = await db.select().from(costAlertRules).where(eq(costAlertRules.id, id));
    if (!rule) return { success: false, message: "规则不存在" };
    const newActive = rule.isActive === 1 ? 0 : 1;
    await db.update(costAlertRules).set({ isActive: newActive, updatedAt: new Date().toISOString() }).where(eq(costAlertRules.id, id));
    return { success: true, message: newActive === 1 ? "已启用" : "已禁用" };
  }),

  acknowledge: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = toNum(input.id || input.alertId);
    await db.update(costAlertLogs).set({
      status: "acknowledged" as any,
      handleNote: input.handleNote || input.note,
      handledAt: new Date().toISOString(),
    }).where(eq(costAlertLogs.id, id));
    return { success: true, message: "已确认" };
  }),
});
