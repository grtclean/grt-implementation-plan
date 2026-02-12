/**
 * Webhook配置管理路由
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { requireDb } from '../db';
import { sql } from 'drizzle-orm';

// Webhook配置Schema
const webhookConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '请输入配置名称'),
  platform: z.enum(['wechat_work', 'dingtalk', 'feishu', 'slack', 'custom']),
  webhookUrl: z.string().url('请输入有效的URL'),
  secret: z.string().optional(),
  isActive: z.boolean().default(true),
  events: z.array(z.string()).min(1, '请至少选择一个触发事件'),
  meetingTypes: z.array(z.string()).default([])
});

export const webhookConfigRouter = router({
  // 获取Webhook配置列表
  getWebhookConfigs: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      const db = await requireDb();

      const result = await db.execute(sql`SELECT * FROM meeting_webhook_configs ORDER BY created_at DESC`);

      const configs = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        platform: row.platform,
        webhookUrl: row.webhook_url,
        secret: row.secret,
        isActive: row.is_active === 1,
        events: JSON.parse(row.events || '[]'),
        meetingTypes: JSON.parse(row.meeting_types || '[]'),
        createdAt: row.created_at,
        lastTestedAt: row.last_tested_at,
        lastTestResult: row.last_test_result
      }));

      return { configs };
    }),

  // 保存Webhook配置
  saveWebhookConfig: protectedProcedure
    .input(webhookConfigSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();

      if (input.id) {
        // 更新
        await db.execute(sql`UPDATE meeting_webhook_configs SET
                name = ${input.name}, platform = ${input.platform}, webhook_url = ${input.webhookUrl}, secret = ${input.secret || null},
                is_active = ${input.isActive ? 1 : 0}, events = ${JSON.stringify(input.events)}, meeting_types = ${JSON.stringify(input.meetingTypes)}, updated_at = ${now}
                WHERE id = ${input.id}`);

        return { success: true, id: input.id };
      } else {
        // 新建
        const id = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await db.execute(sql`INSERT INTO meeting_webhook_configs
                (id, name, platform, webhook_url, secret, is_active, events, meeting_types, created_at, updated_at)
                VALUES (${id}, ${input.name}, ${input.platform}, ${input.webhookUrl}, ${input.secret || null}, ${input.isActive ? 1 : 0}, ${JSON.stringify(input.events)}, ${JSON.stringify(input.meetingTypes)}, ${now}, ${now})`);

        return { success: true, id };
      }
    }),

  // 删除Webhook配置
  deleteWebhookConfig: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      await db.execute(sql`DELETE FROM meeting_webhook_configs WHERE id = ${input.id}`);

      return { success: true };
    }),

  // 切换Webhook启用状态
  toggleWebhookConfig: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      await db.execute(sql`UPDATE meeting_webhook_configs SET is_active = ${input.isActive ? 1 : 0}, updated_at = ${new Date().toISOString()} WHERE id = ${input.id}`);

      return { success: true };
    }),

  // 测试Webhook
  testWebhook: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // 获取配置
      const result = await db.execute(sql`SELECT * FROM meeting_webhook_configs WHERE id = ${input.id}`);

      if (result.rows.length === 0) {
        return { success: false, error: '配置不存在' };
      }

      const config = result.rows[0] as any;
      const webhookUrl = config.webhook_url;
      const platform = config.platform;

      // 构建测试消息
      const testMessage = buildTestMessage(platform, config.name);

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testMessage)
        });

        const success = response.ok;
        const now = new Date().toISOString();

        // 更新测试结果
        await db.execute(sql`UPDATE meeting_webhook_configs SET last_tested_at = ${now}, last_test_result = ${success ? 'success' : 'failed'} WHERE id = ${input.id}`);

        if (!success) {
          const errorText = await response.text();
          return { success: false, error: `HTTP ${response.status}: ${errorText}` };
        }

        return { success: true };
      } catch (error) {
        const now = new Date().toISOString();

        await db.execute(sql`UPDATE meeting_webhook_configs SET last_tested_at = ${now}, last_test_result = ${'failed'} WHERE id = ${input.id}`);

        return {
          success: false,
          error: error instanceof Error ? error.message : '网络请求失败'
        };
      }
    })
});

/**
 * 构建测试消息
 */
function buildTestMessage(platform: string, configName: string): any {
  const timestamp = new Date().toLocaleString('zh-CN');

  switch (platform) {
    case 'wechat_work':
      return {
        msgtype: 'markdown',
        markdown: {
          content: `### 🔔 GRT智能会议系统 - Webhook测试\n\n` +
            `**配置名称:** ${configName}\n\n` +
            `**测试时间:** ${timestamp}\n\n` +
            `> 这是一条测试消息，如果您看到此消息，说明Webhook配置正确。`
        }
      };

    case 'dingtalk':
      return {
        msgtype: 'markdown',
        markdown: {
          title: 'GRT智能会议系统 - Webhook测试',
          text: `### 🔔 GRT智能会议系统 - Webhook测试\n\n` +
            `**配置名称:** ${configName}\n\n` +
            `**测试时间:** ${timestamp}\n\n` +
            `> 这是一条测试消息，如果您看到此消息，说明Webhook配置正确。`
        }
      };

    case 'feishu':
      return {
        msg_type: 'interactive',
        card: {
          header: {
            title: {
              tag: 'plain_text',
              content: '🔔 GRT智能会议系统 - Webhook测试'
            },
            template: 'blue'
          },
          elements: [
            {
              tag: 'div',
              text: {
                tag: 'lark_md',
                content: `**配置名称:** ${configName}\n**测试时间:** ${timestamp}`
              }
            },
            {
              tag: 'note',
              elements: [
                {
                  tag: 'plain_text',
                  content: '这是一条测试消息，如果您看到此消息，说明Webhook配置正确。'
                }
              ]
            }
          ]
        }
      };

    case 'slack':
      return {
        text: `🔔 *GRT智能会议系统 - Webhook测试*\n\n` +
          `*配置名称:* ${configName}\n` +
          `*测试时间:* ${timestamp}\n\n` +
          `> 这是一条测试消息，如果您看到此消息，说明Webhook配置正确。`
      };

    default:
      return {
        type: 'test',
        title: 'GRT智能会议系统 - Webhook测试',
        configName,
        timestamp,
        message: '这是一条测试消息，如果您看到此消息，说明Webhook配置正确。'
      };
  }
}

export default webhookConfigRouter;
