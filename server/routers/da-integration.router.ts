/**
 * GRT 5.0 数字助理集成 tRPC 路由
 *
 * Auto-DDL: da_integrations table
 * Procedures: list, create, update, getStatus, triggerSync, getSyncHistory
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
    CREATE TABLE IF NOT EXISTS da_integrations (
      id SERIAL PRIMARY KEY,
      integration_name VARCHAR(200) NOT NULL,
      source_system VARCHAR(100) NOT NULL,
      target_system VARCHAR(100) NOT NULL,
      sync_direction VARCHAR(20) NOT NULL DEFAULT 'bidirectional',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      last_sync_at TIMESTAMP,
      sync_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      config JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tablesReady = true;
}

export const daIntegrationRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional(), page: z.number().default(1), pageSize: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const p = input ?? { page: 1, pageSize: 20 };
      const offset = ((p.page ?? 1) - 1) * (p.pageSize ?? 20);
      const limit = p.pageSize ?? 20;
      const where = p.status ? `WHERE status = '${p.status}'` : "";

      const items = await db.execute(sql.raw(
        `SELECT * FROM da_integrations ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      ));
      const countResult = await db.execute(sql.raw(
        `SELECT COUNT(*) as total FROM da_integrations ${where}`
      ));
      const total = Number((countResult as any).rows?.[0]?.total ?? (countResult as any)[0]?.total ?? 0);
      return { items: (items as any).rows ?? items, total, page: p.page ?? 1, pageSize: limit };
    }),

  create: requirePermission("system:erp:config")
    .input(
      z.object({
        integrationName: z.string(),
        sourceSystem: z.string(),
        targetSystem: z.string(),
        syncDirection: z.string().default("bidirectional"),
        config: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const configJson = input.config ? JSON.stringify(input.config) : null;
      await db.execute(sql`
        INSERT INTO da_integrations (integration_name, source_system, target_system, sync_direction, config)
        VALUES (${input.integrationName}, ${input.sourceSystem}, ${input.targetSystem},
                ${input.syncDirection}, ${configJson})
      `);
      return { success: true, message: "集成已创建" };
    }),

  update: requirePermission("system:erp:config")
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        integrationName: z.string().optional(),
        status: z.string().optional(),
        syncDirection: z.string().optional(),
        config: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      if (!input.integrationName && !input.status && !input.syncDirection && !input.config) {
        return { success: true, message: "无变更" };
      }
      await db.execute(sql`UPDATE da_integrations SET
        integration_name = COALESCE(${input.integrationName ?? null}, integration_name),
        status = COALESCE(${input.status ?? null}, status),
        sync_direction = COALESCE(${input.syncDirection ?? null}, sync_direction),
        config = COALESCE(${input.config ? JSON.stringify(input.config) : null}, config)
        WHERE id = ${id}`);
      return { success: true, message: "集成已更新" };
    }),

  getStatus: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT status, COUNT(*) as cnt FROM da_integrations GROUP BY status`
    ));
    const data = (rows as any).rows ?? rows;
    const totalIntegrations = data.reduce((s: number, r: any) => s + Number(r.cnt), 0);
    const activeIntegrations = Number(data.find((r: any) => r.status === "active")?.cnt ?? 0);
    const syncResult = await db.execute(sql.raw(
      `SELECT SUM(sync_count) as synced, MAX(last_sync_at) as last_sync FROM da_integrations`
    ));
    const syncRow = ((syncResult as any).rows ?? syncResult)[0] ?? {};
    return {
      status: "ok",
      totalIntegrations,
      activeIntegrations,
      syncedRecords: Number(syncRow.synced ?? 0),
      lastSyncTime: syncRow.last_sync ?? null,
      byAssistant: Object.fromEntries(data.map((r: any) => [r.status, Number(r.cnt)])),
    };
  }),

  triggerSync: requirePermission("system:erp:config")
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      await db.execute(sql.raw(
        `UPDATE da_integrations SET last_sync_at = CURRENT_TIMESTAMP, sync_count = sync_count + 1 WHERE id = ${id}`
      ));
      return { success: true, message: "同步已触发" };
    }),

  getSyncHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const limit = input?.limit ?? 20;
      const rows = await db.execute(sql.raw(
        `SELECT id, integration_name, source_system, target_system, last_sync_at, sync_count, error_count
         FROM da_integrations WHERE last_sync_at IS NOT NULL
         ORDER BY last_sync_at DESC LIMIT ${limit}`
      ));
      return (rows as any).rows ?? rows;
    }),

  /** Legacy alias */
  sync: requirePermission("system:erp:config").mutation(async () => {
    await ensureTables();
    return { success: true, message: "操作成功" };
  }),

  getIntegrationStats: protectedProcedure
    .input(z.object({ assistantType: z.string().optional() }).optional())
    .query(async () => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql.raw(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active,
                SUM(sync_count) as synced, MAX(last_sync_at) as last_sync
         FROM da_integrations`
      ));
      const r = ((rows as any).rows ?? rows)[0] ?? {};
      return {
        totalIntegrations: Number(r.total ?? 0),
        activeIntegrations: Number(r.active ?? 0),
        syncedRecords: Number(r.synced ?? 0),
        lastSyncTime: r.last_sync ?? null,
        byAssistant: {} as Record<string, number>,
      };
    }),
});
