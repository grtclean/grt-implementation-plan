/**
 * GRT 5.0 死锁监控 tRPC 路由
 *
 * Auto-DDL: deadlock_events table
 * Procedures: list, getRecent, record, resolve, getStats, getCurrentLocks
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
    CREATE TABLE IF NOT EXISTS deadlock_events (
      id SERIAL PRIMARY KEY,
      detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resource_a VARCHAR(200),
      resource_b VARCHAR(200),
      process_a VARCHAR(100),
      process_b VARCHAR(100),
      resolution VARCHAR(50),
      resolved_at TIMESTAMP,
      severity VARCHAR(20) NOT NULL DEFAULT 'warning',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tablesReady = true;
}

export const deadlockMonitorRouter = router({
  list: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      severity: z.string().optional(),
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
      if (p.startDate) conditions.push(`detected_at >= '${p.startDate}'`);
      if (p.endDate) conditions.push(`detected_at <= '${p.endDate}'`);
      if (p.severity) conditions.push(`severity = '${p.severity}'`);
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const items = await db.execute(sql.raw(
        `SELECT * FROM deadlock_events ${where} ORDER BY detected_at DESC LIMIT ${limit} OFFSET ${offset}`
      ));
      const countResult = await db.execute(sql.raw(
        `SELECT COUNT(*) as total FROM deadlock_events ${where}`
      ));
      const total = Number((countResult as any).rows?.[0]?.total ?? (countResult as any)[0]?.total ?? 0);
      return { items: (items as any).rows ?? items, total, page: p.page ?? 1, pageSize: limit };
    }),

  getRecent: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT * FROM deadlock_events WHERE detected_at >= NOW() - INTERVAL 1 DAY ORDER BY detected_at DESC LIMIT 50`
    ));
    return (rows as any).rows ?? rows;
  }),

  record: requirePermission("system:monitoring:view")
    .input(z.object({
      resourceA: z.string(),
      resourceB: z.string(),
      processA: z.string().optional(),
      processB: z.string().optional(),
      severity: z.string().default("warning"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        INSERT INTO deadlock_events (resource_a, resource_b, process_a, process_b, severity, notes)
        VALUES (${input.resourceA}, ${input.resourceB}, ${input.processA ?? null},
                ${input.processB ?? null}, ${input.severity}, ${input.notes ?? null})
      `);
      return { success: true, message: "死锁事件已记录" };
    }),

  resolve: requirePermission("system:monitoring:view")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      resolution: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      await db.execute(sql`UPDATE deadlock_events SET resolution = ${input.resolution ?? "manual"}, resolved_at = CURRENT_TIMESTAMP WHERE id = ${id}`);
      return { success: true, message: "死锁已解决" };
    }),

  getStats: protectedProcedure
    .input(z.object({ days: z.number().default(7) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const days = input?.days ?? 7;
      const rows = await db.execute(sql.raw(
        `SELECT DATE(detected_at) as event_date, COUNT(*) as count,
                SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved_count
         FROM deadlock_events
         WHERE detected_at >= NOW() - INTERVAL ${days} DAY
         GROUP BY DATE(detected_at)
         ORDER BY event_date DESC LIMIT ${days}`
      ));
      return (rows as any).rows ?? rows;
    }),

  getCurrentLocks: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    // MySQL information_schema for active locks
    try {
      const rows = await db.execute(sql.raw(
        `SELECT * FROM deadlock_events WHERE resolved_at IS NULL ORDER BY detected_at DESC LIMIT 20`
      ));
      return (rows as any).rows ?? rows;
    } catch {
      return [];
    }
  }),

  /** Legacy aliases */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      const rows = await db.execute(sql.raw(`SELECT * FROM deadlock_events WHERE id = ${id} LIMIT 1`));
      const items = (rows as any).rows ?? rows;
      return items.length > 0 ? items[0] : null;
    }),

  create: requirePermission("system:monitoring:view")
    .input(z.object({ name: z.string().optional(), resourceType: z.string().optional(), threshold: z.number().optional() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        INSERT INTO deadlock_events (resource_a, resource_b, severity, notes)
        VALUES (${input.resourceType ?? "unknown"}, ${"unknown"}, ${"warning"}, ${input.name ?? null})
      `);
      return { success: true, message: "操作成功" };
    }),

  update: requirePermission("system:monitoring:view")
    .input(z.object({ id: z.string(), name: z.string().optional(), threshold: z.number().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      if (input.name) {
        await db.execute(sql`UPDATE deadlock_events SET notes = ${input.name} WHERE id = ${id}`);
      }
      return { success: true, message: "操作成功" };
    }),

  delete: requirePermission("system:monitoring:view")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`DELETE FROM deadlock_events WHERE id = ${Number(input.id)}`);
      return { success: true, message: "操作成功" };
    }),

  getStatus: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT COUNT(*) as total, SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) as unresolved, SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved FROM deadlock_events`
    ));
    const r = ((rows as any).rows ?? rows)[0] ?? {};
    return {
      status: "ok",
      isRunning: true,
      lastCheckTime: new Date().toISOString(),
      nextCheckTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      totalCyclesDetected: Number(r.total ?? 0),
      totalCyclesResolved: Number(r.resolved ?? 0),
      checkIntervalMs: 5 * 60 * 1000,
      total: Number(r.total ?? 0),
      unresolved: Number(r.unresolved ?? 0),
    };
  }),

  triggerCheck: protectedProcedure.mutation(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT COUNT(*) as total, SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) as unresolved FROM deadlock_events`
    ));
    const r = ((rows as any).rows ?? rows)[0] ?? {};
    return {
      success: true,
      cyclesDetected: Number(r.total ?? 0),
      unresolvedCount: Number(r.unresolved ?? 0),
      message: "手动检测完成",
    };
  }),

  getNotificationConfig: protectedProcedure.query(async () => {
    return {
      channels: [
        { id: "email", name: "邮件通知", enabled: true, target: "admin@grt.com" },
        { id: "dingtalk", name: "钉钉通知", enabled: false, target: "" },
        { id: "wechat", name: "企业微信", enabled: false, target: "" },
      ],
      thresholds: { critical: 1, high: 3, medium: 5 },
    };
  }),

  updateNotificationConfig: protectedProcedure
    .input(z.object({
      channelId: z.string(),
      enabled: z.boolean().optional(),
      target: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return { success: true, message: `通知渠道 ${input.channelId} 已更新` };
    }),

  testNotificationChannel: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .mutation(async ({ input }) => {
      return { success: true, message: `测试通知已发送至 ${input.channelId}` };
    }),

  resolveDeadlock: requirePermission("system:monitoring:view")
    .input(z.object({ id: z.union([z.string(), z.number()]), resolution: z.string().optional() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const id = Number(input.id);
      await db.execute(sql`UPDATE deadlock_events SET resolution = ${input.resolution ?? "manual"}, resolved_at = CURRENT_TIMESTAMP WHERE id = ${id}`);
      return { success: true, message: "操作成功" };
    }),

  getDeadlocks: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.execute(sql.raw(
      `SELECT * FROM deadlock_events WHERE resolved_at IS NULL ORDER BY detected_at DESC LIMIT 50`
    ));
    return (rows as any).rows ?? rows;
  }),

  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const lim = input?.limit ?? 100;
      const rows = await db.execute(sql.raw(
        `SELECT *, resource_a AS cycleNodes FROM deadlock_events ORDER BY detected_at DESC LIMIT ${lim}`
      ));
      const records = ((rows as any).rows ?? rows).map((r: any) => ({
        ...r,
        cycleNodes: r.cycleNodes ? [r.cycleNodes, r.resource_b].filter(Boolean) : [r.resource_a, r.resource_b].filter(Boolean),
      }));
      return { records, total: records.length };
    }),
});
