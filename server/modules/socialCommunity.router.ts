/**
 * 社群管理与AI助手系统 - tRPC路由
 * 模块功能：微信群消息监听、AI回复草拟、人工审核发布
 */

import { z } from "zod";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import {
  initializePlatform,
  getPlatformService,
  sendDingTalkWebhook,
  getPlatformStats,
  SocialPlatformType,
} from "../services/social-platforms";
import { jsonValue } from "@shared/validators";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("social-community");

// ==================== 社群管理路由 ====================
export const socialCommunityRouter = router({
  // ==================== 社群组管理 ====================
  
  // 获取所有社群组
  getGroups: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'archived', 'suspended']).optional(),
      type: z.enum(['technical', 'sales', 'support', 'general']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb() as any;
      const { status, type, page = 1, pageSize = 20 } = input || {};

      let query = `SELECT * FROM social_groups WHERE 1=1`;
      const params: unknown[] = [];
      
      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }
      if (type) {
        query += ` AND type = ?`;
        params.push(type);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await db.execute(query, params);
      
      // 获取总数
      let countQuery = `SELECT COUNT(*) as total FROM social_groups WHERE 1=1`;
      const countParams: any[] = [];
      if (status) {
        countQuery += ` AND status = ?`;
        countParams.push(status);
      }
      if (type) {
        countQuery += ` AND type = ?`;
        countParams.push(type);
      }
      const [countResult] = await db.execute(countQuery, countParams);
      
      return {
        items: rows as any[],
        total: (countResult as any[])[0]?.total || 0,
        page,
        pageSize,
      };
    }),

  // 创建社群组
  createGroup: adminProcedure
    .input(z.object({
      groupWxId: z.string().min(1),
      name: z.string().min(1),
      type: z.enum(['technical', 'sales', 'support', 'general']).default('general'),
      description: z.string().optional(),
      bridgeConfig: z.record(z.string(), jsonValue).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb() as any;
      const { groupWxId, name, type, description, bridgeConfig } = input;
      
      const [result] = await db.execute(
        `INSERT INTO social_groups (group_wx_id, name, type, description, bridge_config) VALUES (?, ?, ?, ?, ?)`,
        [groupWxId, name, type, description || null, bridgeConfig ? JSON.stringify(bridgeConfig) : null]
      );
      
      return { id: (result as any).insertId, success: true };
    }),

  // 更新社群组
  updateGroup: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(['technical', 'sales', 'support', 'general']).optional(),
      description: z.string().optional(),
      status: z.enum(['active', 'archived', 'suspended']).optional(),
      bridgeConfig: z.record(z.string(), jsonValue).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb() as any;
      const { id, ...updates } = input;
      
      const setClauses: string[] = [];
      const params: unknown[] = [];
      
      if (updates.name !== undefined) {
        setClauses.push('name = ?');
        params.push(updates.name);
      }
      if (updates.type !== undefined) {
        setClauses.push('type = ?');
        params.push(updates.type);
      }
      if (updates.description !== undefined) {
        setClauses.push('description = ?');
        params.push(updates.description);
      }
      if (updates.status !== undefined) {
        setClauses.push('status = ?');
        params.push(updates.status);
      }
      if (updates.bridgeConfig !== undefined) {
        setClauses.push('bridge_config = ?');
        params.push(JSON.stringify(updates.bridgeConfig));
      }
      
      if (setClauses.length === 0) {
        return { success: true };
      }
      
      params.push(id);
      await db.execute(
        `UPDATE social_groups SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      );
      
      return { success: true };
    }),

  // ==================== 消息管理 ====================
  
  // 获取消息列表
  getMessages: protectedProcedure
    .input(z.object({
      groupId: z.number().optional(),
      needsReply: z.boolean().optional(),
      isSensitive: z.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb() as any;
      const { groupId, needsReply, isSensitive, startDate, endDate, page = 1, pageSize = 50 } = input || {};
      
      let query = `SELECT m.*, g.name as group_name FROM social_messages m 
                   LEFT JOIN social_groups g ON m.group_id = g.id WHERE 1=1`;
      const params: unknown[] = [];
      
      if (groupId) {
        query += ` AND m.group_id = ?`;
        params.push(groupId);
      }
      if (needsReply !== undefined) {
        query += ` AND m.needs_reply = ?`;
        params.push(needsReply);
      }
      if (isSensitive !== undefined) {
        query += ` AND m.is_sensitive = ?`;
        params.push(isSensitive);
      }
      if (startDate) {
        query += ` AND m.received_at >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND m.received_at <= ?`;
        params.push(endDate);
      }
      
      query += ` ORDER BY m.received_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await db.execute(query, params);
      
      return {
        items: rows as any[],
        page,
        pageSize,
      };
    }),

  // 接收消息（来自Social Bridge的Webhook）
  receiveMessage: requirePermission('collab:community:post')
    .input(z.object({
      groupWxId: z.string(),
      senderWxId: z.string(),
      senderName: z.string().optional(),
      content: z.string(),
      contentType: z.enum(['text', 'image', 'file', 'voice', 'video', 'link']).default('text'),
      receivedAt: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb() as any;
      const { groupWxId, senderWxId, senderName, content, contentType, receivedAt } = input;
      
      // 查找群组
      const [groups] = await db.execute(
        `SELECT id FROM social_groups WHERE group_wx_id = ?`,
        [groupWxId]
      );
      
      if ((groups as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '群组不存在' });
      }
      
      const groupId = (groups as any[])[0].id;
      
      // 敏感词检测（简单实现，可扩展）
      const sensitiveKeywords = ['价格', '报价', '配方', '工艺', '专利', '机密'];
      const foundKeywords = sensitiveKeywords.filter(kw => content.includes(kw));
      const isSensitive = foundKeywords.length > 0;
      
      // 脱敏处理
      let deidentifiedContent = content;
      if (isSensitive) {
        // 简单脱敏：替换敏感词
        foundKeywords.forEach(kw => {
          deidentifiedContent = deidentifiedContent.replace(new RegExp(kw, 'g'), '[***]');
        });
      }
      
      // 判断是否需要回复（包含问号或@机器人）
      const needsReply = content.includes('?') || content.includes('？') || content.includes('@GRT');
      
      const [result] = await db.execute(
        `INSERT INTO social_messages 
         (group_id, sender_wx_id, sender_name, content, content_type, is_sensitive, 
          deidentified_content, sensitive_keywords, needs_reply, received_at, processed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [groupId, senderWxId, senderName || null, content, contentType, isSensitive,
         deidentifiedContent, foundKeywords.length > 0 ? JSON.stringify(foundKeywords) : null,
         needsReply, receivedAt]
      );
      
      const messageId = (result as any).insertId;
      
      // 如果需要回复，自动生成AI草稿
      if (needsReply) {
        await generateAIDraft(db, messageId, deidentifiedContent);
      }
      
      return { id: messageId, needsReply, isSensitive };
    }),

  // ==================== AI草稿管理 ====================
  
  // 获取待审核草稿
  getDrafts: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'approved', 'rejected', 'modified']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb() as any;
      const { status, page = 1, pageSize = 20 } = input || {};
      
      let query = `SELECT d.*, m.content as original_message, m.sender_name, g.name as group_name
                   FROM ai_draft_replies d
                   LEFT JOIN social_messages m ON d.message_id = m.id
                   LEFT JOIN social_groups g ON m.group_id = g.id
                   WHERE 1=1`;
      const params: unknown[] = [];
      
      if (status) {
        query += ` AND d.review_status = ?`;
        params.push(status);
      }
      
      query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await db.execute(query, params);
      
      return {
        items: rows as any[],
        page,
        pageSize,
      };
    }),

  // 审核草稿
  reviewDraft: requirePermission('collab:community:post')
    .input(z.object({
      draftId: z.number(),
      action: z.enum(['approve', 'reject', 'modify']),
      comment: z.string().optional(),
      modifiedContent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb() as any;
      const { draftId, action, comment, modifiedContent } = input;
      
      const reviewStatus = action === 'approve' ? 'approved' : 
                          action === 'reject' ? 'rejected' : 'modified';
      
      const finalContent = action === 'modify' ? modifiedContent : null;
      
      await db.execute(
        `UPDATE ai_draft_replies 
         SET review_status = ?, reviewer_id = ?, reviewer_comment = ?, 
             final_content = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [reviewStatus, ctx.user?.id || null, comment || null, finalContent, draftId]
      );
      
      // 如果批准，加入发布队列
      if (action === 'approve' || action === 'modify') {
        // 获取草稿信息
        const [drafts] = await db.execute(
          `SELECT d.*, m.group_id FROM ai_draft_replies d
           LEFT JOIN social_messages m ON d.message_id = m.id
           WHERE d.id = ?`,
          [draftId]
        );
        
        if ((drafts as any[]).length > 0) {
          const draft = (drafts as any[])[0];
          const content = finalContent || draft.draft_content;
          
          await db.execute(
            `INSERT INTO publish_queue (draft_id, target_group_id, content, status)
             VALUES (?, ?, ?, 'queued')`,
            [draftId, draft.group_id, content]
          );
        }
      }
      
      return { success: true };
    }),

  // 重新生成AI草稿
  regenerateDraft: requirePermission('collab:community:post')
    .input(z.object({
      messageId: z.number(),
      additionalContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb() as any;
      const { messageId, additionalContext } = input;
      
      // 获取原始消息
      const [messages] = await db.execute(
        `SELECT deidentified_content FROM social_messages WHERE id = ?`,
        [messageId]
      );
      
      if ((messages as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '消息不存在' });
      }
      
      const content = (messages as any[])[0].deidentified_content;
      const fullContext = additionalContext ? `${content}\n\n额外上下文: ${additionalContext}` : content;
      
      await generateAIDraft(db, messageId, fullContext);
      
      return { success: true };
    }),

  // ==================== 发布队列管理 ====================
  
  // 获取发布队列
  getPublishQueue: protectedProcedure
    .input(z.object({
      status: z.enum(['queued', 'sending', 'sent', 'failed', 'cancelled']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb() as any;
      const { status, page = 1, pageSize = 20 } = input || {};
      
      let query = `SELECT pq.*, g.name as group_name, g.group_wx_id
                   FROM publish_queue pq
                   LEFT JOIN social_groups g ON pq.target_group_id = g.id
                   WHERE 1=1`;
      const params: unknown[] = [];
      
      if (status) {
        query += ` AND pq.status = ?`;
        params.push(status);
      }
      
      query += ` ORDER BY pq.created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await db.execute(query, params);
      
      return {
        items: rows as any[],
        page,
        pageSize,
      };
    }),

  // 发送消息（调用Social Bridge）
  sendMessage: adminProcedure
    .input(z.object({
      queueId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb() as any;
      const { queueId } = input;
      
      // 更新状态为发送中
      await db.execute(
        `UPDATE publish_queue SET status = 'sending' WHERE id = ?`,
        [queueId]
      );
      
      // 获取发送信息
      const [items] = await db.execute(
        `SELECT pq.*, g.group_wx_id, g.bridge_config
         FROM publish_queue pq
         LEFT JOIN social_groups g ON pq.target_group_id = g.id
         WHERE pq.id = ?`,
        [queueId]
      );
      
      if ((items as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '发布任务不存在' });
      }
      
      const item = (items as any[])[0];
      
      try {
        // TODO: 实际调用Social Bridge API发送消息
        // const bridgeConfig = item.bridge_config ? JSON.parse(item.bridge_config) : {};
        // await callSocialBridge(bridgeConfig, item.group_wx_id, item.content);
        
        // 模拟发送成功
        await db.execute(
          `UPDATE publish_queue SET status = 'sent', sent_at = NOW() WHERE id = ?`,
          [queueId]
        );
        
        return { success: true };
      } catch (error: any) {
        // 发送失败
        await db.execute(
          `UPDATE publish_queue SET status = 'failed', error_message = ?, retry_count = retry_count + 1 WHERE id = ?`,
          [error.message, queueId]
        );
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '发送失败: ' + error.message });
      }
    }),

  // 取消发送
  cancelPublish: adminProcedure
    .input(z.object({
      queueId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb() as any;
      const { queueId } = input;
      
      await db.execute(
        `UPDATE publish_queue SET status = 'cancelled' WHERE id = ? AND status = 'queued'`,
        [queueId]
      );
      
      return { success: true };
    }),

  // ==================== 成员管理 ====================
  
  // 获取群成员
  getMembers: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      role: z.enum(['member', 'admin', 'expert', 'bot']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await requireDb() as any;
      const { groupId, role, page, pageSize } = input;
      
      let query = `SELECT * FROM social_members WHERE group_id = ?`;
      const params: unknown[] = [groupId];
      
      if (role) {
        query += ` AND role = ?`;
        params.push(role);
      }
      
      query += ` ORDER BY interaction_count DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await db.execute(query, params);
      
      return {
        items: rows as any[],
        page,
        pageSize,
      };
    }),

  // ==================== 统计分析 ====================
  
  // 获取社群统计
  getStats: protectedProcedure
    .query(async () => {
      const db = await requireDb() as any;
      
      // 群组统计 - 活跃群组数
      const [activeGroupsResult] = await db.execute(
        `SELECT COUNT(*) as count FROM social_groups WHERE status = 'active'`
      );
      const activeGroups = (activeGroupsResult as any[])[0]?.count || 0;
      
      // 消息统计（今日）
      const [messageStatsResult] = await db.execute(
        `SELECT COUNT(*) as total FROM social_messages WHERE DATE(received_at) = CURRENT_DATE`
      );
      const todayMessages = (messageStatsResult as any[])[0]?.total || 0;
      
      // 草稿统计 - 待审核数
      const [pendingDraftsResult] = await db.execute(
        `SELECT COUNT(*) as count FROM ai_draft_replies WHERE review_status = 'pending'`
      );
      const pendingDrafts = (pendingDraftsResult as any[])[0]?.count || 0;
      
      // AI回复率计算
      const [replyStatsResult] = await db.execute(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN needs_reply = 1 THEN 1 ELSE 0 END) as needs_reply
         FROM social_messages`
      );
      const replyStats = (replyStatsResult as any[])[0] || { total: 0, needs_reply: 0 };
      
      const [repliedCountResult] = await db.execute(
        `SELECT COUNT(DISTINCT message_id) as count FROM ai_draft_replies WHERE review_status = 'approved'`
      );
      const repliedCount = (repliedCountResult as any[])[0]?.count || 0;
      
      const aiReplyRate = replyStats.needs_reply > 0 
        ? Math.round((repliedCount / replyStats.needs_reply) * 100) 
        : 0;
      
      return {
        activeGroups,
        todayMessages,
        pendingDrafts,
        aiReplyRate,
      };
    }),

  // ==================== 平台配置管理 ====================
  
  // 获取平台配置列表
  getPlatformConfigs: adminProcedure
    .query(async () => {
      const db = await requireDb() as any;
      const [rows] = await db.execute(
        `SELECT * FROM social_platform_configs ORDER BY created_at DESC`
      );
      return rows as any[];
    }),

  // 保存平台配置
  savePlatformConfig: adminProcedure
    .input(z.object({
      platform: z.enum(['wecom', 'dingtalk', 'feishu']),
      enabled: z.boolean().default(true),
      config: z.record(z.string(), jsonValue),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb() as any;
      const { platform, enabled, config } = input;
      
      // 检查是否已存在
      const [existing] = await db.execute(
        `SELECT id FROM social_platform_configs WHERE platform = ?`,
        [platform]
      );
      
      if ((existing as any[]).length > 0) {
        // 更新
        await db.execute(
          `UPDATE social_platform_configs SET enabled = ?, config = ?, updated_at = NOW() WHERE platform = ?`,
          [enabled, JSON.stringify(config), platform]
        );
      } else {
        // 插入
        await db.execute(
          `INSERT INTO social_platform_configs (platform, enabled, config) VALUES (?, ?, ?)`,
          [platform, enabled, JSON.stringify(config)]
        );
      }
      
      // 如果启用，尝试初始化平台服务
      if (enabled) {
        try {
          await initializePlatform({
            platform: platform as SocialPlatformType,
            enabled: true,
            [platform]: config,
          });
        } catch (error) {
          log.error({ err: error, platform }, "Platform initialization failed");
          // 不抛出错误，配置已保存
        }
      }
      
      return { success: true };
    }),

  // 测试平台连接
  testPlatformConnection: adminProcedure
    .input(z.object({
      platform: z.enum(['wecom', 'dingtalk', 'feishu']),
    }))
    .mutation(async ({ input }) => {
      const { platform } = input;
      const service = getPlatformService(platform as SocialPlatformType);
      
      if (!service) {
        return {
          success: false,
          error: `平台${platform}未配置或未启用`,
        };
      }
      
      try {
        // 尝试获取访问令牌来测试连接
        await service.getAccessToken();
        return {
          success: true,
          message: `${platform}连接成功`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '连接失败',
        };
      }
    }),

  // 发送钉钉Webhook消息（群机器人）
  sendDingTalkNotification: protectedProcedure
    .input(z.object({
      webhookUrl: z.string().url(),
      content: z.string(),
      msgtype: z.enum(['text', 'markdown', 'link', 'actionCard']).default('text'),
      title: z.string().optional(),
      atMobiles: z.array(z.string()).optional(),
      atUserIds: z.array(z.string()).optional(),
      isAtAll: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { webhookUrl, content, msgtype, title, atMobiles, atUserIds, isAtAll } = input;
      
      const result = await sendDingTalkWebhook(webhookUrl, content, {
        msgtype,
        title,
        atMobiles,
        atUserIds,
        isAtAll,
      });
      
      return result;
    }),

  // 获取平台统计
  getPlatformStats: protectedProcedure
    .query(async () => {
      return getPlatformStats();
    }),
});

// ==================== 辅助函数 ====================

// 生成AI草稿
async function generateAIDraft(db: any, messageId: number, content: string) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是GRT智能系统的社群AI助手，负责为技术交流群中的问题生成专业、友好的回复。
规则：
1. 回复要专业但易懂
2. 涉及具体价格、配方等敏感信息时，引导用户联系销售或技术支持
3. 保持友好、专业的语气
4. 回复长度控制在200字以内`
        },
        {
          role: 'user',
          content: `请为以下消息生成回复：\n\n${content}`
        }
      ],
    });
    
    const draftContent = response.choices[0]?.message?.content || '抱歉，暂时无法生成回复，请稍后重试。';
    const confidenceScore = 0.85; // 可以根据实际情况计算
    
    await db.execute(
      `INSERT INTO ai_draft_replies (message_id, draft_content, confidence_score, model_used, prompt_template)
       VALUES (?, ?, ?, 'gemini-pro', 'social_reply_v1')`,
      [messageId, draftContent, confidenceScore]
    );
  } catch (error) {
    log.error({ err: error }, "Failed to generate AI draft");
    // 生成默认草稿
    await db.execute(
      `INSERT INTO ai_draft_replies (message_id, draft_content, confidence_score, model_used)
       VALUES (?, '感谢您的提问，我们的技术团队会尽快回复您。', 0.5, 'fallback')`,
      [messageId]
    );
  }
}

export default socialCommunityRouter;
