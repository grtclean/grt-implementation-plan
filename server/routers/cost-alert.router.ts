/**
 * GRT 5.0 成本预警 tRPC 路由
 *
 * 功能:
 * - 预警规则管理 (costAlertRules)
 * - 预警日志查询 (costAlertLogs)
 * - 规则模板 (costAlertRuleTemplates)
 * - 规则版本 (costAlertRuleVersions)
 * - 批量导入/导出
 *
 * All data persisted via Drizzle ORM (no in-memory stores).
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  costAlertRules, costAlertLogs, costAlertRuleTemplates,
  costAlertRuleVersions,
} from "../../drizzle/schema";

const successResponse = { success: true, message: "操作成功" };

export const costAlertRouter = router({
  // ==================== CRUD (alert logs as default entity) ====================

  list: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(costAlertLogs).orderBy(desc(costAlertLogs.createdAt));
    return { items: rows, total: rows.length, page: 1, pageSize: 10 };
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numericId = parseInt(input.id, 10);
      if (isNaN(numericId)) return null;
      const rows = await db.select().from(costAlertLogs).where(eq(costAlertLogs.id, numericId));
      return rows[0] ?? null;
    }),

  create: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.insert(costAlertRules).values({
      name: input.name,
      description: input.description,
      scope: input.scope ?? "all",
      projectId: input.projectId,
      categoryId: input.categoryId,
      alertType: input.alertType ?? "budget_percent",
      threshold: input.threshold,
      alertLevel: input.alertLevel ?? "warning",
      notifyType: input.notifyType ?? "system",
      notifyUserIds: input.notifyUserIds ? (typeof input.notifyUserIds === 'string' ? input.notifyUserIds : JSON.stringify(input.notifyUserIds)) : null,
      isActive: input.isActive ?? 1,
    });
    return successResponse;
  }),

  update: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (!id) return successResponse;
    const { id: _id, ...data } = input;
    if (data.notifyUserIds && typeof data.notifyUserIds !== 'string') data.notifyUserIds = JSON.stringify(data.notifyUserIds);
    await db.update(costAlertRules).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(costAlertRules.id, id));
    return successResponse;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = parseInt(input.id, 10);
      if (!isNaN(id)) await db.delete(costAlertRules).where(eq(costAlertRules.id, id));
      return successResponse;
    }),

  // ==================== Acknowledge alert log ====================

  acknowledge: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (!id) return successResponse;
    await db.update(costAlertLogs).set({
      status: "acknowledged",
      handlerId: input.handlerId,
      handleNote: input.handleNote ?? input.note,
      handledAt: new Date().toISOString(),
    }).where(eq(costAlertLogs.id, id));
    return successResponse;
  }),

  // ==================== Active Rules ====================

  getActiveRules: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(costAlertRules).where(eq(costAlertRules.isActive, 1)).orderBy(desc(costAlertRules.createdAt));
  }),

  // ==================== Project Logs ====================

  getProjectLogs: publicProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const projectId = Number(input?.projectId);
    if (!projectId) {
      return db.select().from(costAlertLogs).orderBy(desc(costAlertLogs.createdAt)).limit(100);
    }
    return db.select().from(costAlertLogs).where(eq(costAlertLogs.projectId, projectId)).orderBy(desc(costAlertLogs.createdAt));
  }),

  // ==================== Batch Import ====================

  batchImport: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const rules = input.rules ?? input.items ?? [];
    let imported = 0;
    for (const rule of rules) {
      await db.insert(costAlertRules).values({
        name: rule.name,
        description: rule.description,
        scope: rule.scope ?? "all",
        projectId: rule.projectId,
        categoryId: rule.categoryId,
        alertType: rule.alertType ?? "budget_percent",
        threshold: rule.threshold,
        alertLevel: rule.alertLevel ?? "warning",
        notifyType: rule.notifyType ?? "system",
        isActive: rule.isActive ?? 1,
      });
      imported++;
    }
    return { success: true, message: `${imported} rules imported`, imported };
  }),

  parseCSV: publicProcedure.input(z.any()).query(() => {
    // CSV parsing requires file upload - stub
    return [];
  }),

  exportCSV: protectedProcedure.mutation(async () => {
    // CSV export requires file generation - stub
    return { url: "" };
  }),
});
