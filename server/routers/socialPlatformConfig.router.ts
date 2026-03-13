/**
 * 社群平台配置路由
 * Social Platform Configuration Router
 * 
 * 管理企业微信、钉钉、飞书等平台的连接配置
 */

import { z } from 'zod';
import {protectedProcedure, router, requirePermission} from '../_core/trpc';
import { requireDb } from '../db';
import { sql } from 'drizzle-orm';
import * as wecomService from '../services/wecom.service';
import * as dingtalkService from '../services/dingtalk.service';
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("social-config");

// 平台类型枚举
const PlatformEnum = z.enum(['wecom', 'dingtalk', 'feishu']);
type Platform = z.infer<typeof PlatformEnum>;

// 平台配置Schema
const WeComConfigSchema = z.object({
  corpId: z.string().min(1, '企业ID不能为空'),
  agentId: z.string().optional(),
  secret: z.string().min(1, '应用Secret不能为空'),
  token: z.string().optional(),
  encodingAESKey: z.string().optional(),
});

const DingTalkConfigSchema = z.object({
  appKey: z.string().min(1, 'AppKey不能为空'),
  appSecret: z.string().min(1, 'AppSecret不能为空'),
  agentId: z.string().optional(),
  robotWebhook: z.string().url().optional(),
  robotSecret: z.string().optional(),
});

const FeishuConfigSchema = z.object({
  appId: z.string().min(1, 'App ID不能为空'),
  appSecret: z.string().min(1, 'App Secret不能为空'),
  encryptKey: z.string().optional(),
  verificationToken: z.string().optional(),
});

export const socialPlatformConfigRouter = router({
  /**
   * 获取所有平台配置
   */
  getAll: protectedProcedure.query(async () => {
    const db = await requireDb();
    if (!db) return [];
    
    const result = await db.execute(sql`
      SELECT 
        id, platform, enabled, config, webhookUrl,
        lastSyncAt, syncStatus, syncErrorMsg,
        createdAt, updatedAt
      FROM social_platform_configs
      ORDER BY platform
    `);
    
    const rows = result.rows as any[];
    
    // 解析配置JSON，隐藏敏感信息
    return rows.map(row => {
      let parsedConfig = null;
      if (row.config) {
        try {
          const config = JSON.parse(row.config);
          // 隐藏敏感字段
          parsedConfig = {
            ...config,
            secret: config.secret ? '******' : undefined,
            appSecret: config.appSecret ? '******' : undefined,
            encodingAESKey: config.encodingAESKey ? '******' : undefined,
            robotSecret: config.robotSecret ? '******' : undefined,
          };
        } catch (e) {
          parsedConfig = null;
        }
      }
      
      return {
        ...row,
        config: parsedConfig,
        webhookSecret: row.webhookSecret ? '******' : null,
      };
    });
  }),

  /**
   * 获取单个平台配置
   */
  getByPlatform: protectedProcedure
    .input(z.object({ platform: PlatformEnum }))
    .query(async ({ input }) => {
      const db = await requireDb();
      if (!db) return null;
      
      const result = await db.execute(sql`
        SELECT 
          id, platform, enabled, config, webhookUrl,
          lastSyncAt, syncStatus, syncErrorMsg,
          createdAt, updatedAt
        FROM social_platform_configs
        WHERE platform = ${input.platform}
        LIMIT 1
      `);
      
      const rows = result.rows as any[];
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      let parsedConfig = null;
      if (row.config) {
        try {
          const config = JSON.parse(row.config);
          // 隐藏敏感字段
          parsedConfig = {
            ...config,
            secret: config.secret ? '******' : undefined,
            appSecret: config.appSecret ? '******' : undefined,
            encodingAESKey: config.encodingAESKey ? '******' : undefined,
            robotSecret: config.robotSecret ? '******' : undefined,
          };
        } catch (e) {
          parsedConfig = null;
        }
      }
      
      return {
        ...row,
        config: parsedConfig,
      };
    }),

  /**
   * 保存企业微信配置
   */
  saveWeComConfig: requirePermission('system:dingtalk:config')
    .input(z.object({
      config: WeComConfigSchema,
      webhookUrl: z.string().optional(),
      webhookSecret: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (!db) return { success: false, message: '数据库连接失败' };
      
      const configJson = JSON.stringify(input.config);
      
      // 使用UPSERT
      await db.execute(sql`
        INSERT INTO social_platform_configs 
          (platform, enabled, config, webhookUrl, webhookSecret, syncStatus)
        VALUES 
          ('wecom', 0, ${configJson}, ${input.webhookUrl || null}, ${input.webhookSecret || null}, 'idle')
        ON DUPLICATE KEY UPDATE
          config = ${configJson},
          webhookUrl = ${input.webhookUrl || null},
          webhookSecret = ${input.webhookSecret || null},
          updatedAt = NOW()
      `);
      
      return { success: true, message: '企业微信配置已保存' };
    }),

  /**
   * 保存钉钉配置
   */
  saveDingTalkConfig: requirePermission('system:dingtalk:config')
    .input(z.object({
      config: DingTalkConfigSchema,
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (!db) return { success: false, message: '数据库连接失败' };
      
      const configJson = JSON.stringify(input.config);
      
      // 使用UPSERT
      await db.execute(sql`
        INSERT INTO social_platform_configs 
          (platform, enabled, config, webhookUrl, webhookSecret, syncStatus)
        VALUES 
          ('dingtalk', 0, ${configJson}, ${input.config.robotWebhook || null}, ${input.config.robotSecret || null}, 'idle')
        ON DUPLICATE KEY UPDATE
          config = ${configJson},
          webhookUrl = ${input.config.robotWebhook || null},
          webhookSecret = ${input.config.robotSecret || null},
          updatedAt = NOW()
      `);
      
      return { success: true, message: '钉钉配置已保存' };
    }),

  /**
   * 保存飞书配置
   */
  saveFeishuConfig: requirePermission('system:dingtalk:config')
    .input(z.object({
      config: FeishuConfigSchema,
      webhookUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (!db) return { success: false, message: '数据库连接失败' };
      
      const configJson = JSON.stringify(input.config);
      
      // 使用UPSERT
      await db.execute(sql`
        INSERT INTO social_platform_configs 
          (platform, enabled, config, webhookUrl, syncStatus)
        VALUES 
          ('feishu', 0, ${configJson}, ${input.webhookUrl || null}, 'idle')
        ON DUPLICATE KEY UPDATE
          config = ${configJson},
          webhookUrl = ${input.webhookUrl || null},
          updatedAt = NOW()
      `);
      
      return { success: true, message: '飞书配置已保存' };
    }),

  /**
   * 启用/禁用平台
   */
  togglePlatform: requirePermission('system:dingtalk:config')
    .input(z.object({
      platform: PlatformEnum,
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (!db) return { success: false, message: '数据库连接失败' };
      
      await db.execute(sql`
        UPDATE social_platform_configs
        SET enabled = ${input.enabled ? 1 : 0}, updatedAt = NOW()
        WHERE platform = ${input.platform}
      `);
      
      return { 
        success: true, 
        message: input.enabled ? '平台已启用' : '平台已禁用' 
      };
    }),

  /**
   * 测试平台连接
   */
  testConnection: requirePermission('system:dingtalk:config')
    .input(z.object({ platform: PlatformEnum }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (!db) return { success: false, message: '数据库连接失败' };
      
      // 获取配置
      const result = await db.execute(sql`
        SELECT config, webhookUrl, webhookSecret
        FROM social_platform_configs
        WHERE platform = ${input.platform}
        LIMIT 1
      `);
      
      const rows = result.rows as any[];
      if (rows.length === 0) {
        return { success: false, message: '未找到平台配置' };
      }
      
      const row = rows[0];
      if (!row.config) {
        return { success: false, message: '平台配置为空' };
      }
      
      let config;
      try {
        config = JSON.parse(row.config);
      } catch (e) {
        return { success: false, message: '配置格式错误' };
      }
      
      // 根据平台类型测试连接
      switch (input.platform) {
        case 'wecom':
          return await wecomService.testConnection(config);
        
        case 'dingtalk':
          // 先测试API连接
          const apiResult = await dingtalkService.testConnection(config);
          if (!apiResult.success) {
            return apiResult;
          }
          
          // 如果配置了机器人Webhook，也测试一下
          if (config.robotWebhook) {
            const robotResult = await dingtalkService.testRobotWebhook(
              config.robotWebhook,
              config.robotSecret
            );
            if (!robotResult.success) {
              return {
                success: true,
                message: `API连接成功，但机器人Webhook测试失败: ${robotResult.message}`
              };
            }
          }
          
          return apiResult;
        
        case 'feishu':
          // 飞书连接测试（待实现）
          return { success: false, message: '飞书连接测试功能开发中' };
        
        default:
          return { success: false, message: '不支持的平台类型' };
      }
    }),

  /**
   * 同步平台数据
   */
  syncData: requirePermission('system:dingtalk:config')
    .input(z.object({ platform: PlatformEnum }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (!db) return { success: false, message: '数据库连接失败' };
      
      // 更新同步状态
      await db.execute(sql`
        UPDATE social_platform_configs
        SET syncStatus = 'syncing', updatedAt = NOW()
        WHERE platform = ${input.platform}
      `);
      
      try {
        // 获取配置
        const result = await db.execute(sql`
          SELECT config
          FROM social_platform_configs
          WHERE platform = ${input.platform}
          LIMIT 1
        `);
        
        const rows = result.rows as any[];
        if (rows.length === 0 || !rows[0].config) {
          throw new Error('未找到平台配置');
        }
        
        const config = JSON.parse(rows[0].config);
        
        // 根据平台类型同步数据
        let syncedGroups = 0;
        let syncedMessages = 0;
        
        switch (input.platform) {
          case 'wecom':
            // 企业微信同步逻辑
            const wecomUsers = await wecomService.getDepartmentUsers(config, 1);
            log.info({ count: wecomUsers.length }, "Synced WeCom users");
            break;
          
          case 'dingtalk':
            // 钉钉同步逻辑
            const depts = await dingtalkService.getDepartmentList(config);
            log.info({ count: depts.length }, "Synced DingTalk departments");
            break;
          
          case 'feishu':
            // 飞书同步逻辑（待实现）
            break;
        }
        
        // 更新同步状态
        await db.execute(sql`
          UPDATE social_platform_configs
          SET 
            syncStatus = 'idle',
            lastSyncAt = NOW(),
            syncErrorMsg = NULL,
            updatedAt = NOW()
          WHERE platform = ${input.platform}
        `);
        
        return { 
          success: true, 
          message: '数据同步完成',
          syncedGroups,
          syncedMessages
        };
      } catch (error) {
        // 更新错误状态
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        await db.execute(sql`
          UPDATE social_platform_configs
          SET 
            syncStatus = 'error',
            syncErrorMsg = ${errorMsg},
            updatedAt = NOW()
          WHERE platform = ${input.platform}
        `);
        
        return { success: false, message: `同步失败: ${errorMsg}` };
      }
    }),

  /**
   * 删除平台配置
   */
  deleteConfig: requirePermission('system:dingtalk:config')
    .input(z.object({ platform: PlatformEnum }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (!db) return { success: false, message: '数据库连接失败' };
      
      await db.execute(sql`
        DELETE FROM social_platform_configs
        WHERE platform = ${input.platform}
      `);
      
      return { success: true, message: '配置已删除' };
    }),

  /**
   * 发送测试消息
   */
  sendTestMessage: requirePermission('system:dingtalk:config')
    .input(z.object({
      platform: PlatformEnum,
      message: z.string().min(1, '消息内容不能为空'),
      targetId: z.string().optional(), // 群ID或用户ID
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (!db) return { success: false, message: '数据库连接失败' };
      
      // 获取配置
      const result = await db.execute(sql`
        SELECT config, webhookUrl, webhookSecret
        FROM social_platform_configs
        WHERE platform = ${input.platform}
        LIMIT 1
      `);
      
      const rows = result.rows as any[];
      if (rows.length === 0) {
        return { success: false, message: '未找到平台配置' };
      }
      
      const row = rows[0];
      if (!row.config) {
        return { success: false, message: '平台配置为空' };
      }
      
      const config = JSON.parse(row.config);
      
      switch (input.platform) {
        case 'wecom':
          if (!input.targetId) {
            return { success: false, message: '企业微信需要指定群聊ID' };
          }
          const wecomResult = await wecomService.sendGroupMessage(
            config,
            input.targetId,
            input.message
          );
          return { 
            success: wecomResult, 
            message: wecomResult ? '消息发送成功' : '消息发送失败' 
          };
        
        case 'dingtalk':
          // 优先使用机器人Webhook
          if (config.robotWebhook) {
            const robotResult = await dingtalkService.sendRobotMessage(
              config.robotWebhook,
              config.robotSecret,
              input.message
            );
            return { 
              success: robotResult, 
              message: robotResult ? '机器人消息发送成功' : '机器人消息发送失败' 
            };
          }
          return { success: false, message: '钉钉需要配置机器人Webhook' };
        
        case 'feishu':
          return { success: false, message: '飞书消息发送功能开发中' };
        
        default:
          return { success: false, message: '不支持的平台类型' };
      }
    }),
});
