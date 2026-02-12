/**
 * 社群管理增强功能 - tRPC路由
 * 功能：脱敏规则配置、AI回复模板管理、消息统计分析、群成员画像
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { TRPCError } from "@trpc/server";
import {
  getDeidentificationRules,
  createDeidentificationRule,
  updateDeidentificationRule,
  deleteDeidentificationRule,
  applyDeidentification,
  getAIReplyTemplates,
  createAIReplyTemplate,
  updateAIReplyTemplate,
  deleteAIReplyTemplate,
  incrementTemplateUsage,
  getMessageStats,
  getMemberProfiles,
  getGroupActivityStats,
} from "../services/social-community-enhanced.service";

export const socialCommunityEnhancedRouter = router({
  // ==================== 脱敏规则管理 ====================
  
  // 获取脱敏规则列表
  getDeidentificationRules: protectedProcedure
    .input(z.object({
      category: z.enum(['price', 'formula', 'personal', 'business', 'custom']).optional(),
      isEnabled: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getDeidentificationRules(input);
    }),

  // 创建脱敏规则
  createDeidentificationRule: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      pattern: z.string().min(1),
      patternType: z.enum(['keyword', 'regex', 'ai_detect']),
      replacement: z.string().default('[***]'),
      category: z.enum(['price', 'formula', 'personal', 'business', 'custom']),
      priority: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      return await createDeidentificationRule(input);
    }),

  // 更新脱敏规则
  updateDeidentificationRule: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      pattern: z.string().optional(),
      patternType: z.enum(['keyword', 'regex', 'ai_detect']).optional(),
      replacement: z.string().optional(),
      category: z.enum(['price', 'formula', 'personal', 'business', 'custom']).optional(),
      priority: z.number().optional(),
      isEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await updateDeidentificationRule(id, updates);
      return { success: true };
    }),

  // 删除脱敏规则
  deleteDeidentificationRule: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDeidentificationRule(input.id);
      return { success: true };
    }),

  // 测试脱敏规则
  testDeidentification: protectedProcedure
    .input(z.object({
      text: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      return await applyDeidentification(input.text);
    }),

  // ==================== AI回复模板管理 ====================
  
  // 获取AI回复模板列表
  getAIReplyTemplates: protectedProcedure
    .input(z.object({
      category: z.enum(['greeting', 'technical', 'sales', 'support', 'farewell', 'custom']).optional(),
      isDefault: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getAIReplyTemplates(input);
    }),

  // 创建AI回复模板
  createAIReplyTemplate: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      category: z.enum(['greeting', 'technical', 'sales', 'support', 'farewell', 'custom']),
      promptTemplate: z.string().min(1),
      systemPrompt: z.string().min(1),
      variables: z.array(z.string()).optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return await createAIReplyTemplate(input);
    }),

  // 更新AI回复模板
  updateAIReplyTemplate: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      category: z.enum(['greeting', 'technical', 'sales', 'support', 'farewell', 'custom']).optional(),
      promptTemplate: z.string().optional(),
      systemPrompt: z.string().optional(),
      variables: z.array(z.string()).optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await updateAIReplyTemplate(id, updates);
      return { success: true };
    }),

  // 删除AI回复模板
  deleteAIReplyTemplate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAIReplyTemplate(input.id);
      return { success: true };
    }),

  // 使用模板生成回复
  useTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      variables: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { templateId, variables } = input;
      
      // 获取模板
      const templatesResult = await (db as any).execute(
        `SELECT * FROM ai_reply_templates WHERE id = ?`,
        [templateId]
      );
      const templates = (templatesResult.rows || templatesResult[0] || []) as any[];

      if (templates.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '模板不存在' });
      }

      const template = templates[0];
      
      // 替换变量
      let prompt = template.prompt_template;
      for (const [key, value] of Object.entries(variables)) {
        prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      
      // 增加使用次数
      await incrementTemplateUsage(templateId);
      
      return {
        systemPrompt: template.system_prompt,
        userPrompt: prompt,
        templateName: template.name,
      };
    }),

  // ==================== 消息统计分析 ====================
  
  // 获取消息统计
  getMessageStats: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      groupId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getMessageStats(input);
    }),

  // 获取消息趋势
  getMessageTrend: protectedProcedure
    .input(z.object({
      groupId: z.number().optional(),
      days: z.number().default(30),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { groupId, days = 30 } = input || {};
      
      let query = `
        SELECT DATE(received_at) as date, COUNT(*) as count
        FROM social_messages
        WHERE received_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `;
      const params: any[] = [days];
      
      if (groupId) {
        query += ` AND group_id = ?`;
        params.push(groupId);
      }
      
      query += ` GROUP BY DATE(received_at) ORDER BY date ASC`;
      
      const queryResult = await (db as any).execute(query, params);
      const rows = (queryResult.rows || queryResult[0] || []) as any[];
      return rows as { date: string; count: number }[];
    }),

  // ==================== 群成员画像 ====================
  
  // 获取群成员画像
  getMemberProfiles: protectedProcedure
    .input(z.object({
      groupId: z.number(),
    }))
    .query(async ({ input }) => {
      return await getMemberProfiles(input.groupId);
    }),

  // 获取群组活跃度统计
  getGroupActivityStats: protectedProcedure
    .input(z.object({
      groupId: z.number(),
    }))
    .query(async ({ input }) => {
      return await getGroupActivityStats(input.groupId);
    }),

  // 获取影响力用户
  getInfluencers: protectedProcedure
    .input(z.object({
      groupId: z.number().optional(),
      limit: z.number().default(10),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { groupId, limit = 10 } = input || {};
      
      let query = `
        SELECT sm.*, sg.name as group_name,
               (SELECT COUNT(*) FROM social_messages WHERE sender_wx_id = sm.wx_id) as message_count
        FROM social_members sm
        LEFT JOIN social_groups sg ON sm.group_id = sg.id
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (groupId) {
        query += ` AND sm.group_id = ?`;
        params.push(groupId);
      }
      
      query += ` ORDER BY message_count DESC LIMIT ?`;
      params.push(limit);
      
      const queryResult = await (db as any).execute(query, params);
      const rows = (queryResult.rows || queryResult[0] || []) as any[];
      return rows;
    }),

  // ==================== Webhook配置 ====================
  
  // 获取Social Bridge配置
  getSocialBridgeConfig: adminProcedure
    .input(z.object({
      groupId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const groupsResult = await (db as any).execute(
        `SELECT bridge_config FROM social_groups WHERE id = ?`,
        [input.groupId]
      );
      const groups = (groupsResult.rows || groupsResult[0] || []) as any[];

      if (groups.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '群组不存在' });
      }

      const config = groups[0].bridge_config;
      return config ? JSON.parse(config) : {};
    }),

  // 更新Social Bridge配置
  updateSocialBridgeConfig: adminProcedure
    .input(z.object({
      groupId: z.number(),
      webhookUrl: z.string().url().optional(),
      webhookSecret: z.string().optional(),
      enableAutoReply: z.boolean().optional(),
      replyDelay: z.number().min(0).max(3600).optional(), // 秒
      filterKeywords: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { groupId, ...config } = input;
      
      await (db as any).execute(
        `UPDATE social_groups SET bridge_config = ? WHERE id = ?`,
        [JSON.stringify(config), groupId]
      );
      
      return { success: true };
    }),

  // 测试Webhook连接
  testWebhookConnection: adminProcedure
    .input(z.object({
      webhookUrl: z.string().url(),
      webhookSecret: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(input.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(input.webhookSecret ? { 'X-Webhook-Secret': input.webhookSecret } : {}),
          },
          body: JSON.stringify({
            type: 'test',
            message: 'GRT智能系统Webhook连接测试',
            timestamp: new Date().toISOString(),
          }),
        });
        
        return {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),
});

export default socialCommunityEnhancedRouter;
