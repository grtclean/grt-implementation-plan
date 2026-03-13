/**
 * 安全系统增强功能 - tRPC路由
 * 功能：告警Webhook配置、日志归档策略
 */

import { z } from "zod";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import { AlertWebhookService, LogArchiveService } from "../services/security-enhanced.service";

export const securityEnhancedRouter = router({
  // ==================== 告警Webhook ====================

  saveWebhookConfig: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string(),
      channelType: z.enum(["dingtalk", "wecom", "feishu", "slack", "custom"]),
      webhookUrl: z.string().url(),
      secret: z.string().optional(),
      enabled: z.boolean().default(true),
      alertTypes: z.array(z.string()).default([]),
      minSeverity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      rateLimit: z.number().default(60),
      template: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return AlertWebhookService.saveConfig(input, ctx.user!.id);
    }),

  getWebhookConfigs: protectedProcedure.query(async () => {
    return AlertWebhookService.getConfigs();
  }),

  testWebhook: adminProcedure
    .input(z.object({
      channelType: z.enum(["dingtalk", "wecom", "feishu", "slack", "custom"]),
      webhookUrl: z.string().url(),
      secret: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return AlertWebhookService.testWebhook({
        name: "test", channelType: input.channelType, webhookUrl: input.webhookUrl,
        secret: input.secret, enabled: true, alertTypes: [], minSeverity: "low",
      });
    }),

  sendTestAlert: adminProcedure
    .input(z.object({ webhookId: z.number() }))
    .mutation(async ({ input }) => {
      const testAlert = {
        id: 0, title: "测试告警", description: "这是一条测试告警消息",
        severity: "low" as const, type: "test", timestamp: new Date().toISOString(),
      };
      return AlertWebhookService.sendAlert(testAlert);
    }),

  // ==================== 日志归档 ====================

  saveArchivePolicy: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string(),
      logType: z.string(),
      retentionDays: z.number().min(1).default(90),
      archiveAfterDays: z.number().min(1).default(30),
      compressionEnabled: z.boolean().default(true),
      storageLocation: z.string().default("/archives"),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      return LogArchiveService.savePolicy(input, ctx.user!.id);
    }),

  getArchivePolicies: protectedProcedure.query(async () => {
    return LogArchiveService.getPolicies();
  }),

  executeArchive: adminProcedure
    .input(z.object({ policyId: z.number() }))
    .mutation(async ({ input }) => {
      return LogArchiveService.executeArchive(input.policyId);
    }),

  getArchiveHistory: protectedProcedure
    .input(z.object({ policyId: z.number().optional(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return LogArchiveService.getArchiveHistory(input.policyId, input.limit);
    }),

  getStorageStats: protectedProcedure.query(async () => {
    return LogArchiveService.getStorageStats();
  }),
});
