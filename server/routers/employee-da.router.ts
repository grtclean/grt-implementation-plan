/**
 * GRT 5.0 员工数字助理 tRPC 路由
 *
 * Auto-DDL: employee_digital_assistants table
 * Procedures: list, getByEmployee, create, update, toggleEnabled, recordInteraction, getPopular
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

let tablesReady = false;

async function ensureTables() {
  if (tablesReady) return;
  const db = await requireDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS employee_digital_assistants (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL,
      employee_name VARCHAR(100),
      assistant_type VARCHAR(50) NOT NULL DEFAULT 'general',
      persona_config JSON,
      enabled BOOLEAN NOT NULL DEFAULT true,
      usage_count INTEGER NOT NULL DEFAULT 0,
      last_interaction_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tablesReady = true;
}

export const employeeDARouter = router({
  list: protectedProcedure
    .input(z.object({
      assistantType: z.string().optional(),
      enabled: z.boolean().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const p = input ?? { page: 1, pageSize: 20 };
      const offset = ((p.page ?? 1) - 1) * (p.pageSize ?? 20);
      const limit = p.pageSize ?? 20;

      const conditions: string[] = [];
      if (p.assistantType) conditions.push(`assistant_type = '${p.assistantType}'`);
      if (p.enabled !== undefined) conditions.push(`enabled = ${p.enabled ? 1 : 0}`);
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const items = await db.execute(sql.raw(
        `SELECT * FROM employee_digital_assistants ${where} ORDER BY usage_count DESC LIMIT ${limit} OFFSET ${offset}`
      ));
      return (items as any).rows ?? items;
    }),

  listFunctional: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT * FROM employee_digital_assistants WHERE enabled = true ORDER BY assistant_type, employee_name LIMIT 100`
    ));
    return (rows as any).rows ?? rows;
  }),

  getByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const empId = Number(input.employeeId);
      const rows = await db.execute(sql.raw(
        `SELECT * FROM employee_digital_assistants WHERE employee_id = ${empId} LIMIT 10`
      ));
      return (rows as any).rows ?? rows;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      const rows = await db.execute(sql.raw(
        `SELECT * FROM employee_digital_assistants WHERE id = ${id} LIMIT 1`
      ));
      const items = (rows as any).rows ?? rows;
      return items.length > 0 ? items[0] : null;
    }),

  create: requirePermission("hr:employees:edit")
    .input(z.object({
      name: z.string().optional(),
      type: z.string().optional(),
      config: z.record(z.string(), z.any()).optional(),
      employeeId: z.union([z.string(), z.number()]).optional(),
      assistantCode: z.string().optional(),
      displayName: z.string().optional(),
      workHabits: z.string().optional(),
      preferences: z.string().optional(),
      expertise: z.string().optional(),
      communicationStyle: z.string().optional(),
      canTaskAssist: z.boolean().optional(),
      canScheduleManage: z.boolean().optional(),
      canDocumentDraft: z.boolean().optional(),
      canDataAnalysis: z.boolean().optional(),
      canCommunicationProxy: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const empId = input.employeeId ? Number(input.employeeId) : 0;
      const empName = input.displayName ?? input.name ?? "unknown";
      const assistantType = input.type ?? "general";
      const personaConfig = JSON.stringify({
        assistantCode: input.assistantCode,
        workHabits: input.workHabits,
        preferences: input.preferences,
        expertise: input.expertise,
        communicationStyle: input.communicationStyle,
        capabilities: {
          taskAssist: input.canTaskAssist ?? false,
          scheduleManage: input.canScheduleManage ?? false,
          documentDraft: input.canDocumentDraft ?? false,
          dataAnalysis: input.canDataAnalysis ?? false,
          communicationProxy: input.canCommunicationProxy ?? false,
        },
        ...(input.config ?? {}),
      });

      await db.execute(sql`
        INSERT INTO employee_digital_assistants (employee_id, employee_name, assistant_type, persona_config)
        VALUES (${empId}, ${empName}, ${assistantType}, ${personaConfig})
      `);
      return { success: true, message: "数字助理已创建" };
    }),

  update: requirePermission("hr:employees:edit")
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      config: z.record(z.string(), z.any()).optional(),
      displayName: z.string().optional(),
      workHabits: z.string().optional(),
      preferences: z.string().optional(),
      expertise: z.string().optional(),
      communicationStyle: z.string().optional(),
      canTaskAssist: z.boolean().optional(),
      canScheduleManage: z.boolean().optional(),
      canDocumentDraft: z.boolean().optional(),
      canDataAnalysis: z.boolean().optional(),
      canCommunicationProxy: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      const empName = input.displayName ?? input.name ?? null;
      const personaConfig = JSON.stringify({
        workHabits: input.workHabits,
        preferences: input.preferences,
        expertise: input.expertise,
        communicationStyle: input.communicationStyle,
        capabilities: {
          taskAssist: input.canTaskAssist,
          scheduleManage: input.canScheduleManage,
          documentDraft: input.canDocumentDraft,
          dataAnalysis: input.canDataAnalysis,
          communicationProxy: input.canCommunicationProxy,
        },
        ...(input.config ?? {}),
      });
      await db.execute(sql`UPDATE employee_digital_assistants SET updated_at = CURRENT_TIMESTAMP, employee_name = COALESCE(${empName}, employee_name), persona_config = ${personaConfig} WHERE id = ${id}`);
      return { success: true, message: "数字助理已更新" };
    }),

  delete: requirePermission("hr:employees:edit")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`DELETE FROM employee_digital_assistants WHERE id = ${Number(input.id)}`);
      return { success: true, message: "数字助理已删除" };
    }),

  toggleEnabled: requirePermission("hr:employees:edit")
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      await db.execute(sql.raw(
        `UPDATE employee_digital_assistants SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`
      ));
      return { success: true, message: "状态已切换" };
    }),

  toggleStatus: requirePermission("hr:employees:edit")
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      await db.execute(sql.raw(
        `UPDATE employee_digital_assistants SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`
      ));
      return { success: true, message: "操作成功" };
    }),

  recordInteraction: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      await db.execute(sql.raw(
        `UPDATE employee_digital_assistants SET usage_count = usage_count + 1, last_interaction_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`
      ));
      return { success: true, message: "交互已记录" };
    }),

  getPopular: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const limit = input?.limit ?? 10;
      const rows = await db.execute(sql.raw(
        `SELECT * FROM employee_digital_assistants WHERE enabled = true ORDER BY usage_count DESC LIMIT ${limit}`
      ));
      return (rows as any).rows ?? rows;
    }),

  getMyDA: protectedProcedure.query(async ({ ctx }) => {
    await ensureTables();
    const db = await requireDb();
    const userId = (ctx as any).user?.id;
    if (!userId) return { da: null };
    const rows = await db.execute(sql.raw(
      `SELECT * FROM employee_digital_assistants WHERE employee_id = ${userId} AND enabled = true LIMIT 1`
    ));
    const items = (rows as any).rows ?? rows;
    return { da: items.length > 0 ? items[0] : null };
  }),

  chat: requirePermission("hr:employees:edit")
    .input(z.object({ message: z.string().optional(), sessionId: z.string().optional() }))
    .mutation(async () => {
      await ensureTables();
      return { response: "数字助理功能开发中" };
    }),

  getHistory: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT * FROM employee_digital_assistants ORDER BY last_interaction_at DESC LIMIT 50`
    ));
    return (rows as any).rows ?? rows;
  }),
});
