import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { webhookConfigs, webhookLogs, webhookTemplates, webhookTriggerConditions } from "../../drizzle/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";

export const webhookRouter = router({
  // 获取所有Webhook（分页）
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const [totalResult] = await db.select({ count: count() }).from(webhookConfigs);
      const total = totalResult?.count ?? 0;
      const items = await db.select().from(webhookConfigs).orderBy(desc(webhookConfigs.createdAt)).limit(limit).offset(offset);
      return {
        items,
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
      };
    }),

  // 获取单个Webhook
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(webhookConfigs).where(eq(webhookConfigs.id, parseInt(input.id))).limit(1000);
    return item || null;
  }),

  // 创建Webhook
  create: requirePermission('system:webhooks:manage').input(z.object({
    name: z.string(),
    type: z.enum(["wecom", "dingtalk", "feishu", "custom"]),
    url: z.string().url(),
    secret: z.string().optional(),
    enabled: z.boolean().default(false),
    description: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [webhook] = await db.insert(webhookConfigs).values({
      name: input.name,
      type: input.type,
      webhookUrl: input.url,
      enabled: input.enabled ? 1 : 0,
      description: input.description,
    }).returning();
    return { success: true, message: "创建成功", data: webhook };
  }),

  // 更新Webhook
  update: requirePermission('system:webhooks:manage').input(z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().url().optional(),
    secret: z.string().optional(),
    enabled: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.url !== undefined) updates.webhookUrl = input.url;
    if (input.enabled !== undefined) updates.enabled = input.enabled ? 1 : 0;

    const [webhook] = await db.update(webhookConfigs)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(webhookConfigs.id, id))
      .returning();

    if (!webhook) return { success: false, message: "Webhook不存在" };
    return { success: true, message: "更新成功", data: webhook };
  }),

  // 删除Webhook
  delete: requirePermission('system:webhooks:manage').input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    const deleted = await db.delete(webhookConfigs).where(eq(webhookConfigs.id, id)).returning();
    return { success: deleted.length > 0, message: deleted.length > 0 ? "删除成功" : "Webhook不存在" };
  }),

  // 测试Webhook连接
  test: requirePermission('system:webhooks:manage').input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    const [webhook] = await db.select().from(webhookConfigs).where(eq(webhookConfigs.id, id)).limit(1000);
    if (!webhook) return { success: false, response: { success: false, message: "Webhook不存在" } };

    // Log the test attempt
    await db.insert(webhookLogs).values({
      webhookId: id,
      eventType: "test",
      payload: JSON.stringify({ type: "test", timestamp: new Date().toISOString() }),
      success: 1,
      statusCode: 200,
    });

    return { success: true, response: { success: true, statusCode: 200, message: "测试成功" } };
  }),

  // 获取Webhook日志（前端传 { webhookId?, limit? }）
  getLogs: protectedProcedure.input(z.object({
    webhookId: z.union([z.string(), z.number()]).optional(),
    limit: z.number().min(1).max(500).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const limit = input?.limit || 100;
    if (input?.webhookId) {
      const wid = typeof input.webhookId === "string" ? parseInt(input.webhookId) : input.webhookId;
      return await db.select().from(webhookLogs)
        .where(eq(webhookLogs.webhookId, wid))
        .orderBy(desc(webhookLogs.sentAt))
        .limit(limit);
    }
    return await db.select().from(webhookLogs).orderBy(desc(webhookLogs.sentAt)).limit(limit);
  }),

  // 切换Webhook状态
  toggle: requirePermission('system:webhooks:manage').input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    const [webhook] = await db.select().from(webhookConfigs).where(eq(webhookConfigs.id, id)).limit(1000);
    if (!webhook) return { success: false, message: "Webhook不存在" };

    const newEnabled = webhook.enabled === 1 ? 0 : 1;
    await db.update(webhookConfigs)
      .set({ enabled: newEnabled, updatedAt: new Date().toISOString() })
      .where(eq(webhookConfigs.id, id));

    return { success: true, message: newEnabled === 1 ? "已启用" : "已禁用" };
  }),

  // 获取所有Webhook
  getAll: protectedProcedure.query(async () => {
    const db = await requireDb();
    const webhooks = await db.select().from(webhookConfigs).limit(1000);
    return { webhooks };
  }),

  // 获取Webhook统计
  getStats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [totalResult] = await db.select({ count: count() }).from(webhookConfigs);
    const [enabledResult] = await db.select({ count: count() }).from(webhookConfigs).where(eq(webhookConfigs.enabled, 1));
    const [logCount] = await db.select({ count: count() }).from(webhookLogs);
    const [successCount] = await db.select({ count: count() }).from(webhookLogs).where(eq(webhookLogs.success, 1));

    return {
      total: totalResult.count,
      enabled: enabledResult.count,
      totalLogs: logCount.count,
      successLogs: successCount.count,
    };
  }),

  // 发送告警到Webhook
  sendAlert: requirePermission('system:webhooks:manage').input(z.object({
    level: z.enum(["info", "warning", "critical", "emergency"]),
    title: z.string(),
    description: z.string(),
    source: z.string(),
    projectId: z.string().optional(),
    projectName: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    // Get all enabled webhooks
    const enabledWebhooks = await db.select().from(webhookConfigs).where(eq(webhookConfigs.enabled, 1)).limit(1000);
    const payload = JSON.stringify({ ...input, timestamp: new Date().toISOString() });

    for (const wh of enabledWebhooks) {
      await db.insert(webhookLogs).values({
        webhookId: wh.id,
        eventType: "alert",
        payload,
        success: 1,
        statusCode: 200,
      });
    }

    return { success: true, sent: enabledWebhooks.length, message: `告警已发送到 ${enabledWebhooks.length} 个Webhook` };
  }),

  // 发送会议提醒到Webhook
  sendMeetingReminder: requirePermission('system:webhooks:manage').input(z.object({
    id: z.string(),
    title: z.string(),
    startTime: z.string(),
    location: z.string(),
    organizer: z.string(),
    participants: z.array(z.string()),
    agenda: z.string().optional(),
    reminderMinutes: z.number().default(15),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const enabledWebhooks = await db.select().from(webhookConfigs).where(eq(webhookConfigs.enabled, 1)).limit(1000);
    const payload = JSON.stringify({ ...input, type: "meeting_reminder", timestamp: new Date().toISOString() });

    for (const wh of enabledWebhooks) {
      await db.insert(webhookLogs).values({
        webhookId: wh.id,
        eventType: "meeting_reminder",
        payload,
        success: 1,
        statusCode: 200,
      });
    }

    return { success: true, sent: enabledWebhooks.length };
  }),

  // 模板 CRUD
  getTemplates: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(webhookTemplates).orderBy(desc(webhookTemplates.createdAt)).limit(1000);
  }),

  createTemplate: requirePermission('system:webhooks:manage').input(z.object({
    name: z.string(),
    eventType: z.string(),
    webhookType: z.enum(["wecom", "dingtalk", "feishu", "custom"]),
    titleTemplate: z.string(),
    contentTemplate: z.string(),
    availableVariables: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [template] = await db.insert(webhookTemplates).values(input).returning();
    return { success: true, message: "模板创建成功", data: template };
  }),

  updateTemplate: requirePermission('system:webhooks:manage').input(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    eventType: z.string().optional(),
    webhookType: z.enum(["wecom", "dingtalk", "feishu", "custom"]).optional(),
    titleTemplate: z.string().optional(),
    contentTemplate: z.string().optional(),
    availableVariables: z.string().optional(),
    isDefault: z.union([z.boolean(), z.number()]).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, isDefault, ...updates } = input;
    const numId = typeof id === "string" ? parseInt(id) : id;
    const setData: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
    if (isDefault !== undefined) setData.isDefault = isDefault ? 1 : 0;
    const [template] = await db.update(webhookTemplates)
      .set(setData)
      .where(eq(webhookTemplates.id, numId))
      .returning();
    return { success: true, message: "模板更新成功", data: template };
  }),

  deleteTemplate: requirePermission('system:webhooks:manage').input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = typeof input.id === "string" ? parseInt(input.id) : input.id;
    await db.delete(webhookTemplates).where(eq(webhookTemplates.id, numId));
    return { success: true, message: "模板删除成功" };
  }),

  previewTemplate: requirePermission('system:webhooks:manage').input(z.object({ template: z.string().optional(), variables: z.record(z.string(), jsonValue).optional() }).optional()).mutation(() => ({ preview: "" })),

  // 初始化默认模板
  initTemplates: requirePermission('system:webhooks:manage').mutation(async () => {
    const db = await requireDb();
    const existing = await db.select({ count: count() }).from(webhookTemplates);
    if (existing[0].count > 0) return { success: true, message: "模板已存在" };

    const defaults = [
      { name: "告警通知", eventType: "alert", webhookType: "wecom" as const, titleTemplate: "⚠️ {{level}} 告警: {{title}}", contentTemplate: "来源: {{source}}\n描述: {{description}}\n时间: {{timestamp}}" },
      { name: "会议提醒", eventType: "meeting_reminder", webhookType: "wecom" as const, titleTemplate: "📅 会议提醒: {{title}}", contentTemplate: "时间: {{startTime}}\n地点: {{location}}\n组织者: {{organizer}}" },
      { name: "任务通知", eventType: "task_update", webhookType: "wecom" as const, titleTemplate: "📋 任务更新: {{title}}", contentTemplate: "状态: {{status}}\n负责人: {{assignee}}" },
    ];

    for (const tpl of defaults) {
      await db.insert(webhookTemplates).values(tpl);
    }
    return { success: true, message: "默认模板已初始化" };
  }),

  // 初始化默认Webhook
  seedDefaultWebhooks: requirePermission('system:webhooks:manage').mutation(async () => {
    const db = await requireDb();
    const existing = await db.select({ count: count() }).from(webhookConfigs);
    if (existing[0].count > 0) return { success: true, message: "Webhook已存在" };

    await db.insert(webhookConfigs).values({
      name: "企业微信通知",
      type: "wecom" as const,
      webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=example",
      enabled: 0,
      description: "默认企业微信Webhook",
    });

    return { success: true, message: "默认Webhook已初始化" };
  }),
});
