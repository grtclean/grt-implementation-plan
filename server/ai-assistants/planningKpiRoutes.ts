/**
 * AI Planning & KPI Assistant tRPC Routes
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { jsonValue } from "@shared/validators";
import * as planningAssistant from "./planningAssistant";
import * as kpiAssistant from "./kpiAssistant";

export const planningAssistantRouter = router({
  // 生成计划
  generatePlan: protectedProcedure
    .input(z.object({
      planType: z.enum(["daily", "weekly", "monthly", "quarterly", "annual", "training", "visit", "phase"]),
      period: z.string(),
      departmentId: z.number().optional(),
      parentPlanId: z.string().optional(),
      dataSources: z.array(z.object({
        sourceType: z.string(),
        sourceReferenceId: z.string().optional(),
        content: z.string(),
        weight: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return planningAssistant.generatePlan({
        ...input,
        ownerId: ctx.user.id,
      });
    }),

  // 保存计划
  savePlan: protectedProcedure
    .input(z.object({
      plan: z.object({
        planId: z.string(),
        title: z.string(),
        objectives: z.array(jsonValue),
        tasks: z.array(jsonValue),
        resources: z.array(jsonValue),
        risks: z.array(jsonValue),
        aiSummary: z.string(),
        startDate: z.string(),
        endDate: z.string(),
      }),
      planType: z.enum(["daily", "weekly", "monthly", "quarterly", "annual", "training", "visit", "phase"]),
      period: z.string(),
      departmentId: z.number().optional(),
      parentPlanId: z.string().optional(),
      dataSources: z.array(z.object({
        sourceType: z.string(),
        sourceReferenceId: z.string().optional(),
        content: z.string(),
        weight: z.number().optional(),
      })).optional(),
      requiresApproval: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { plan, requiresApproval, ...inputData } = input;
      return planningAssistant.savePlan(plan, { ...inputData, ownerId: ctx.user.id }, requiresApproval);
    }),

  // 添加跟踪记录
  addTrackingRecord: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      trackingSource: z.enum(["meeting", "sop", "training", "email", "report", "customer", "manual"]),
      sourceReference: z.string().optional(),
      trackingContent: z.string(),
      progressUpdate: z.number().optional(),
      evidenceFiles: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return planningAssistant.addTrackingRecord({
        ...input,
        recordedBy: ctx.user.id,
      });
    }),

  // 创建执行说明
  createExecutionNote: protectedProcedure
    .input(z.object({
      planId: z.string(),
      originalPlan: z.string(),
      actualExecution: z.string(),
      deviationReason: z.string().optional(),
      lessonsLearned: z.string().optional(),
      suggestions: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return planningAssistant.createExecutionNote({
        ...input,
        createdBy: ctx.user.id,
      });
    }),

  // 获取计划详情
  getPlanById: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .query(async ({ input }) => {
      return planningAssistant.getPlanById(input.planId);
    }),

  // 获取计划列表
  listPlans: protectedProcedure
    .input(z.object({
      ownerId: z.number().optional(),
      departmentId: z.number().optional(),
      planType: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return planningAssistant.listPlans({
        ...input,
        ownerId: input.ownerId ?? ctx.user.id,
      });
    }),

  // 更新任务状态
  updateTaskStatus: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      status: z.enum(["pending", "in_progress", "completed", "cancelled", "blocked"]),
      progress: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return planningAssistant.updateTaskStatus(input.taskId, input.status, input.progress);
    }),

  // 审批计划
  approvePlan: protectedProcedure
    .input(z.object({
      planId: z.string(),
      action: z.enum(["approve", "reject"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return planningAssistant.approvePlan(input.planId, ctx.user.id, input.action);
    }),

  // 获取未完成任务
  getIncompleteTasks: protectedProcedure
    .query(async ({ ctx }) => {
      return planningAssistant.getIncompleteTasks(ctx.user.id);
    }),

  // 获取执行说明
  getExecutionNotes: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .query(async ({ input }) => {
      return planningAssistant.getExecutionNotes(input.planId);
    }),
});

export const kpiAssistantRouter = router({
  // 计算KPI评分
  calculateScore: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      periodType: z.enum(["current_day", "daily", "weekly", "monthly", "quarterly", "annual"]),
      periodValue: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return kpiAssistant.calculateKpiScore({
        employeeId: input.employeeId ?? ctx.user.id,
        periodType: input.periodType,
        periodValue: input.periodValue,
      });
    }),

  // 生成沟通建议
  generateCommunicationSuggestion: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      triggerReason: z.string(),
      scoreId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return kpiAssistant.generateCommunicationSuggestion({
        employeeId: input.employeeId,
        supervisorId: ctx.user.id,
        triggerReason: input.triggerReason,
        scoreId: input.scoreId,
      });
    }),

  // 生成邮件通知
  generateEmailNotification: protectedProcedure
    .input(z.object({
      emailType: z.enum(["daily_reminder", "weekly_summary", "performance_alert", "improvement_suggestion", "recognition", "task_reminder"]),
      recipientType: z.enum(["employee", "supervisor", "team", "hr"]),
      recipientId: z.number(),
      recipientEmail: z.string().optional(),
      relatedScoreId: z.string().optional(),
      requiresApproval: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return kpiAssistant.generateEmailNotification(input);
    }),

  // 审批沟通建议
  approveCommunicationSuggestion: protectedProcedure
    .input(z.object({
      suggestionId: z.string(),
      action: z.enum(["approve", "reject"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return kpiAssistant.approveCommunicationSuggestion(input.suggestionId, ctx.user.id, input.action);
    }),

  // 审批邮件通知
  approveEmailNotification: protectedProcedure
    .input(z.object({
      notificationId: z.string(),
      action: z.enum(["approve", "reject"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return kpiAssistant.approveEmailNotification(input.notificationId, ctx.user.id, input.action);
    }),

  // 记录沟通效果
  recordCommunicationEffectiveness: protectedProcedure
    .input(z.object({
      communicationId: z.string(),
      employeeId: z.number(),
      baselineScore: z.number(),
      targetImprovement: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return kpiAssistant.recordCommunicationEffectiveness(input);
    }),

  // 获取评分历史
  getScoreHistory: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return kpiAssistant.getScoreHistory(input.employeeId ?? ctx.user.id, input.limit);
    }),

  // 获取待处理沟通建议
  getPendingCommunicationSuggestions: protectedProcedure
    .query(async ({ ctx }) => {
      return kpiAssistant.getPendingCommunicationSuggestions(ctx.user.id);
    }),

  // 获取待审批邮件通知
  getPendingEmailNotifications: protectedProcedure
    .query(async ({ ctx }) => {
      return kpiAssistant.getPendingEmailNotifications(ctx.user.id);
    }),

  // 创建评估记录
  createAssessment: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      assessmentPeriod: z.string(),
      assessmentType: z.enum(["self", "supervisor", "peer", "ai"]),
      assessmentContent: z.string(),
      score: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return kpiAssistant.createAssessment({
        ...input,
        assessedBy: ctx.user.id,
      });
    }),

  // 初始化默认KPI配置
  initializeDefaultKpiConfigs: protectedProcedure
    .mutation(async () => {
      return kpiAssistant.initializeDefaultKpiConfigs();
    }),
});
