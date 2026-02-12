/**
 * 钉钉通知路由
 * 提供钉钉Webhook测试和业务通知API
 */

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import {
  testDingTalkConnection,
  sendTestAlert,
  sendTestMeetingReminder,
  getDingTalkConfig,
  updateDingTalkConfig,
} from '../dingtalk-webhook';
import {
  notifyProjectGateChange,
  notifyCostAlert,
  notifyServiceTicket,
  notifyQCAlert,
  notifyInterviewSchedule,
  notifyApproval,
  notifySystemEvent,
} from '../business-notifications';

export const dingtalkRouter = router({
  // 获取钉钉配置状态（不返回敏感信息）
  getStatus: publicProcedure.query(() => {
    const config = getDingTalkConfig();
    return {
      enabled: config.enabled,
      hasWebhook: !!config.webhookUrl,
      hasSecret: !!config.secret,
      keyword: config.keyword,
    };
  }),

  // 测试钉钉连接
  testConnection: protectedProcedure.mutation(async () => {
    return testDingTalkConnection();
  }),

  // 发送测试告警
  sendTestAlert: protectedProcedure.mutation(async () => {
    return sendTestAlert();
  }),

  // 发送测试会议提醒
  sendTestMeetingReminder: protectedProcedure.mutation(async () => {
    return sendTestMeetingReminder();
  }),

  // 启用/禁用钉钉通知
  setEnabled: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ input }) => {
      updateDingTalkConfig({ enabled: input.enabled });
      return { success: true, enabled: input.enabled };
    }),

  // ============ 业务通知API ============

  // 项目阶段门变更通知
  notifyGateChange: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      projectName: z.string(),
      fromGate: z.string(),
      toGate: z.string(),
      changedBy: z.string(),
      reason: z.string().optional(),
      reviewers: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      return notifyProjectGateChange({
        ...input,
        changeTime: new Date(),
      });
    }),

  // 成本预警通知
  notifyCostAlert: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      projectName: z.string(),
      alertType: z.enum(['budget_warning', 'budget_exceeded', 'cost_variance', 'approval_required']),
      budgetAmount: z.number(),
      currentCost: z.number(),
      threshold: z.number(),
      manager: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return notifyCostAlert(input);
    }),

  // 售后服务工单通知
  notifyServiceTicket: protectedProcedure
    .input(z.object({
      ticketId: z.string(),
      type: z.enum(['created', 'assigned', 'started', 'completed', 'escalated']),
      customerName: z.string(),
      equipmentName: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      description: z.string(),
      assignee: z.string().optional(),
      dueDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      return notifyServiceTicket(input);
    }),

  // 质检异常通知
  notifyQCAlert: protectedProcedure
    .input(z.object({
      recordId: z.string(),
      productName: z.string(),
      batchNumber: z.string(),
      inspector: z.string(),
      totalItems: z.number(),
      failedItems: z.number(),
      defectTypes: z.array(z.string()),
      severity: z.enum(['minor', 'major', 'critical']),
    }))
    .mutation(async ({ input }) => {
      return notifyQCAlert(input);
    }),

  // 面试安排通知
  notifyInterview: protectedProcedure
    .input(z.object({
      candidateId: z.string(),
      candidateName: z.string(),
      position: z.string(),
      interviewTime: z.date(),
      interviewType: z.enum(['phone', 'video', 'onsite']),
      interviewers: z.array(z.string()),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return notifyInterviewSchedule(input);
    }),

  // 审批流程通知
  notifyApproval: protectedProcedure
    .input(z.object({
      approvalId: z.string(),
      type: z.enum(['expense', 'leave', 'purchase', 'project', 'contract']),
      title: z.string(),
      applicant: z.string(),
      amount: z.number().optional(),
      status: z.enum(['pending', 'approved', 'rejected']),
      approver: z.string(),
      reason: z.string().optional(),
      deadline: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      return notifyApproval(input);
    }),

  // 系统事件通知
  notifySystemEvent: protectedProcedure
    .input(z.object({
      type: z.enum(['deployment', 'backup', 'maintenance', 'error', 'security']),
      title: z.string(),
      description: z.string(),
      severity: z.enum(['info', 'warning', 'critical', 'emergency']),
      affectedServices: z.array(z.string()).optional(),
      estimatedDuration: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return notifySystemEvent(input);
    }),
});
