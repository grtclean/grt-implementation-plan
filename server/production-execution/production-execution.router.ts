/**
 * Production Execution Module - tRPC Router
 * T1-T15工作流程管理、工时采集、阶段审批API
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "./production-execution.db";

// ============================================================================
// 输入验证Schema
// ============================================================================

const stageStatusSchema = z.enum(['Pending', 'In_Progress', 'Completed', 'Alert', 'Blocked']);
const approvalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'AUTO_APPROVED']);
const approvalTypeSchema = z.enum(['STAGE_START', 'STAGE_COMPLETE', 'GATE_PASS', 'EXCEPTION']);
const timeSourceTypeSchema = z.enum(['MANUAL', 'CLOCK_IN', 'UWB', 'BADGE', 'AUTO_CALC']);
const workTypeSchema = z.enum(['REGULAR', 'OVERTIME', 'TRAINING', 'MEETING', 'OTHER']);

// ============================================================================
// 路由定义
// ============================================================================

export const productionExecutionRouter = router({
  // ==========================================================================
  // 阶段定义查询
  // ==========================================================================
  
  /**
   * 获取所有T1-T15阶段定义
   */
  getStageDefinitions: protectedProcedure.query(async () => {
    const definitions = await db.getStageDefinitions();
    return {
      success: true,
      data: definitions,
      count: definitions.length,
    };
  }),

  /**
   * 根据阶段代码获取阶段定义
   */
  getStageDefinitionByCode: protectedProcedure
    .input(z.object({ stageCode: z.string() }))
    .query(async ({ input }) => {
      const definition = await db.getStageDefinitionByCode(input.stageCode);
      return {
        success: !!definition,
        data: definition,
      };
    }),

  // ==========================================================================
  // 项目生产阶段管理
  // ==========================================================================

  /**
   * 获取项目的所有生产阶段
   */
  getProjectStages: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const stages = await db.getProjectStages(input.projectId);
      const stats = await db.getProjectStageStats(input.projectId);
      return {
        success: true,
        data: {
          stages,
          stats,
        },
      };
    }),

  /**
   * 获取单个阶段详情
   */
  getStageById: protectedProcedure
    .input(z.object({ stageId: z.number() }))
    .query(async ({ input }) => {
      const stage = await db.getStageById(input.stageId);
      if (!stage) {
        return { success: false, error: 'Stage not found' };
      }
      
      // 获取阶段的AI知识
      const aiKnowledge = await db.getAiKnowledgeForStage(stage.stageCode);
      
      return {
        success: true,
        data: {
          stage,
          aiKnowledge,
        },
      };
    }),

  /**
   * 为项目初始化所有生产阶段
   */
  initializeProjectStages: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      contextData: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createProjectStages(input.projectId, input.contextData);
      return {
        success: true,
        message: 'Project stages initialized successfully',
      };
    }),

  /**
   * 更新阶段状态
   */
  updateStageStatus: protectedProcedure
    .input(z.object({
      stageId: z.number(),
      status: stageStatusSchema,
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateStageStatus(
        input.stageId,
        input.status,
        ctx.user?.id,
        ctx.user?.name,
        input.reason
      );
      return {
        success: true,
        message: 'Stage status updated successfully',
      };
    }),

  /**
   * 更新阶段进度
   */
  updateStageProgress: protectedProcedure
    .input(z.object({
      stageId: z.number(),
      completionPercentage: z.number().min(0).max(100),
      actualHours: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.updateStageProgress(
        input.stageId,
        input.completionPercentage,
        input.actualHours,
        input.notes
      );
      return {
        success: true,
        message: 'Stage progress updated successfully',
      };
    }),

  // ==========================================================================
  // 工时记录管理
  // ==========================================================================

  /**
   * 获取工时记录
   */
  getTimeRecords: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      userId: z.number().optional(),
      stageId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const records = await db.getTimeRecords(input);
      return {
        success: true,
        data: records,
        count: records.length,
      };
    }),

  /**
   * 创建工时记录
   */
  createTimeRecord: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      productionStageId: z.number().optional(),
      stageCode: z.string().optional(),
      recordDate: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      duration: z.number().optional(),
      sourceType: timeSourceTypeSchema,
      deviceId: z.string().optional(),
      locationData: z.string().optional(),
      workType: workTypeSchema.optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const recordId = await db.createTimeRecord({
        ...input,
        userId: ctx.user?.id || 0,
        userName: ctx.user?.name,
      });
      return {
        success: true,
        data: { id: recordId },
        message: 'Time record created successfully',
      };
    }),

  /**
   * 获取项目工时汇总
   */
  getTimeSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const summary = await db.getTimeSummaryByProject(input.projectId);
      return {
        success: true,
        data: summary,
      };
    }),

  /**
   * 批量导入UWB/打卡工时数据
   */
  importTimeRecords: protectedProcedure
    .input(z.object({
      records: z.array(z.object({
        userId: z.number(),
        userName: z.string().optional(),
        projectId: z.number(),
        productionStageId: z.number().optional(),
        stageCode: z.string().optional(),
        recordDate: z.string(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        duration: z.number().optional(),
        sourceType: timeSourceTypeSchema,
        deviceId: z.string().optional(),
        locationData: z.string().optional(),
        workType: workTypeSchema.optional(),
        description: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const results = [];
      for (const record of input.records) {
        try {
          const id = await db.createTimeRecord(record);
          results.push({ success: true, id });
        } catch (error) {
          results.push({ success: false, error: String(error) });
        }
      }
      return {
        success: true,
        data: results,
        imported: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      };
    }),

  // ==========================================================================
  // 阶段审批管理
  // ==========================================================================

  /**
   * 获取审批记录
   */
  getApprovals: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      stageId: z.number().optional(),
      status: approvalStatusSchema.optional(),
      approverId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const approvals = await db.getStageApprovals(input);
      return {
        success: true,
        data: approvals,
        count: approvals.length,
      };
    }),

  /**
   * 获取当前用户待审批列表
   */
  getPendingApprovals: protectedProcedure
    .input(z.object({
      userRole: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const approvals = await db.getPendingApprovalsForUser(
        ctx.user?.id || 0,
        input.userRole
      );
      return {
        success: true,
        data: approvals,
        count: approvals.length,
      };
    }),

  /**
   * 创建审批请求
   */
  createApprovalRequest: protectedProcedure
    .input(z.object({
      productionStageId: z.number(),
      projectId: z.number(),
      stageCode: z.string(),
      approvalRuleId: z.number().optional(),
      approvalType: approvalTypeSchema,
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const approvalId = await db.createApprovalRequest({
        ...input,
        requestedBy: ctx.user?.id || 0,
        requestedByName: ctx.user?.name,
      });
      return {
        success: true,
        data: { id: approvalId },
        message: 'Approval request created successfully',
      };
    }),

  /**
   * 处理审批（批准/拒绝）
   */
  processApproval: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
      status: z.enum(['APPROVED', 'REJECTED']),
      comments: z.string().optional(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.processApproval(
        input.approvalId,
        ctx.user?.id || 0,
        ctx.user?.name || '',
        ctx.user?.role || 'USER',
        input.status,
        input.comments,
        input.rejectionReason
      );
      return {
        success: true,
        message: `Approval ${input.status.toLowerCase()} successfully`,
      };
    }),

  // ==========================================================================
  // 集成状态管理
  // ==========================================================================

  /**
   * 获取所有集成状态
   */
  getIntegrationStatuses: protectedProcedure.query(async () => {
    const statuses = await db.getIntegrationStatuses();
    return {
      success: true,
      data: statuses,
    };
  }),

  /**
   * 更新集成状态
   */
  updateIntegrationStatus: protectedProcedure
    .input(z.object({
      integrationCode: z.string(),
      status: z.enum(['CONNECTED', 'DISCONNECTED', 'ERROR', 'SYNCING']),
      errorMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.updateIntegrationStatus(
        input.integrationCode,
        input.status,
        input.errorMessage
      );
      return {
        success: true,
        message: 'Integration status updated successfully',
      };
    }),

  // ==========================================================================
  // AI知识库
  // ==========================================================================

  /**
   * 获取阶段的AI知识/洞察
   */
  getAiKnowledge: protectedProcedure
    .input(z.object({ stageCode: z.string() }))
    .query(async ({ input }) => {
      const knowledge = await db.getAiKnowledgeForStage(input.stageCode);
      return {
        success: true,
        data: knowledge,
      };
    }),

  // ==========================================================================
  // 统计和报表
  // ==========================================================================

  /**
   * 获取项目生产统计
   */
  getProjectStats: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const stats = await db.getProjectStageStats(input.projectId);
      return {
        success: true,
        data: stats,
      };
    }),

  /**
   * 获取项目完整的生产执行数据（用于仪表板）
   */
  getProjectDashboardData: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const [stages, stats, timeSummary, integrations] = await Promise.all([
        db.getProjectStages(input.projectId),
        db.getProjectStageStats(input.projectId),
        db.getTimeSummaryByProject(input.projectId),
        db.getIntegrationStatuses(),
      ]);
      
      return {
        success: true,
        data: {
          stages,
          stats,
          timeSummary,
          integrations,
        },
      };
    }),

  // ==========================================================================
  // UWB设备同步管理
  // ==========================================================================

  /**
   * 获取UWB同步服务状态
   */
  getUwbSyncStatus: protectedProcedure.query(async () => {
    const { uwbSyncService } = await import('./uwb-sync.service');
    const status = uwbSyncService.getStatus();
    return {
      success: true,
      data: status,
    };
  }),

  /**
   * 手动触发UWB数据同步
   */
  triggerUwbSync: protectedProcedure.mutation(async () => {
    const { uwbSyncService } = await import('./uwb-sync.service');
    const result = await uwbSyncService.manualSync();
    return {
      success: result.success,
      data: result,
      message: `Synced ${result.syncedRecords} records`,
    };
  }),

  /**
   * 启动UWB同步服务
   */
  startUwbSync: protectedProcedure
    .input(z.object({ intervalSeconds: z.number().min(10).max(3600).optional() }))
    .mutation(async ({ input }) => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      await uwbSyncService.start(input.intervalSeconds || 30);
      return {
        success: true,
        message: 'UWB sync service started',
      };
    }),

  /**
   * 停止UWB同步服务
   */
  stopUwbSync: protectedProcedure.mutation(async () => {
    const { uwbSyncService } = await import('./uwb-sync.service');
    uwbSyncService.stop();
    return {
      success: true,
      message: 'UWB sync service stopped',
    };
  }),

  /**
   * 添加UWB设备配置
   */
  addUwbDevice: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      deviceType: z.enum(['ANCHOR', 'TAG']),
      deviceName: z.string(),
      location: z.string(),
      zoneId: z.string().optional(),
      zoneName: z.string().optional(),
      config: z.object({
        protocol: z.enum(['DECAWAVE', 'UBISENSE', 'SEWIO', 'POZYX', 'CUSTOM']),
        apiEndpoint: z.string().optional(),
        apiKey: z.string().optional(),
        refreshInterval: z.number().optional(),
        positionThreshold: z.number().optional(),
        zoneDefinitions: z.array(z.object({
          zoneId: z.string(),
          zoneName: z.string(),
          stageCode: z.string(),
          coordinates: z.object({
            x1: z.number(),
            y1: z.number(),
            x2: z.number(),
            y2: z.number(),
          }),
          floorLevel: z.number(),
        })).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      await uwbSyncService.addDevice({
        id: input.deviceId,
        deviceType: input.deviceType,
        deviceName: input.deviceName,
        location: input.location,
        zoneId: input.zoneId || '',
        zoneName: input.zoneName || '',
        isActive: true,
        lastHeartbeat: new Date(),
        config: {
          protocol: input.config.protocol,
          apiEndpoint: input.config.apiEndpoint,
          apiKey: input.config.apiKey,
          refreshInterval: input.config.refreshInterval || 30,
          positionThreshold: input.config.positionThreshold || 0.5,
          zoneDefinitions: input.config.zoneDefinitions || [],
        },
      });
      return {
        success: true,
        message: 'UWB device added successfully',
      };
    }),

  /**
   * 移除UWB设备
   */
  removeUwbDevice: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ input }) => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      await uwbSyncService.removeDevice(input.deviceId);
      return {
        success: true,
        message: 'UWB device removed successfully',
      };
    }),

  // ==========================================================================
  // 审批通知推送管理
  // ==========================================================================

  /**
   * 获取通知配置
   */
  getNotificationConfig: protectedProcedure.query(async () => {
    const { notificationService } = await import('./notification.service');
    const channels = notificationService.getConfiguredChannels();
    return {
      success: true,
      data: {
        configuredChannels: channels,
        wecom: notificationService.getConfig('WECOM'),
        dingtalk: notificationService.getConfig('DINGTALK'),
        system: notificationService.getConfig('SYSTEM'),
      },
    };
  }),

  /**
   * 更新通知配置
   */
  updateNotificationConfig: protectedProcedure
    .input(z.object({
      channel: z.enum(['WECOM', 'DINGTALK', 'EMAIL', 'SMS', 'SYSTEM']),
      enabled: z.boolean(),
      webhookUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { notificationService } = await import('./notification.service');
      notificationService.updateConfig(input.channel, {
        enabled: input.enabled,
        webhookUrl: input.webhookUrl,
      });
      return {
        success: true,
        message: `Notification channel ${input.channel} updated`,
      };
    }),

  /**
   * 发送审批请求通知
   */
  sendApprovalRequestNotification: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      projectName: z.string(),
      stageCode: z.string(),
      stageName: z.string(),
      requestedBy: z.string(),
      approvalType: z.string(),
      actionUrl: z.string(),
      recipients: z.array(z.object({
        userId: z.number(),
        userName: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        wecomId: z.string().optional(),
        dingtalkId: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { notifyApprovalRequest } = await import('./notification.service');
      const results = await notifyApprovalRequest(
        input.projectId,
        input.projectName,
        input.stageCode,
        input.stageName,
        input.requestedBy,
        input.approvalType,
        input.actionUrl,
        input.recipients
      );
      return {
        success: results.some(r => r.success),
        data: results,
      };
    }),

  /**
   * 发送审批结果通知
   */
  sendApprovalResultNotification: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      projectName: z.string(),
      stageCode: z.string(),
      stageName: z.string(),
      approverId: z.string(),
      status: z.enum(['APPROVED', 'REJECTED']),
      comments: z.string().optional(),
      rejectionReason: z.string().optional(),
      recipients: z.array(z.object({
        userId: z.number(),
        userName: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        wecomId: z.string().optional(),
        dingtalkId: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { notifyApprovalResult } = await import('./notification.service');
      const results = await notifyApprovalResult(
        input.projectId,
        input.projectName,
        input.stageCode,
        input.stageName,
        input.approverId,
        input.status,
        input.comments || '',
        input.rejectionReason || '',
        input.recipients
      );
      return {
        success: results.some(r => r.success),
        data: results,
      };
    }),

  /**
   * 发送阶段状态通知
   */
  sendStageStatusNotification: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      projectName: z.string(),
      stageCode: z.string(),
      stageName: z.string(),
      status: z.enum(['STARTED', 'COMPLETED', 'ALERT']),
      metadata: z.record(z.string(), z.any()).optional(),
      recipients: z.array(z.object({
        userId: z.number(),
        userName: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        wecomId: z.string().optional(),
        dingtalkId: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { notifyStageStatus } = await import('./notification.service');
      const results = await notifyStageStatus(
        input.projectId,
        input.projectName,
        input.stageCode,
        input.stageName,
        input.status,
        input.metadata || {},
        input.recipients
      );
      return {
        success: results.some(r => r.success),
        data: results,
      };
    }),

  /**
   * 测试通知渠道
   */
  testNotificationChannel: protectedProcedure
    .input(z.object({
      channel: z.enum(['WECOM', 'DINGTALK', 'EMAIL', 'SMS', 'SYSTEM']),
    }))
    .mutation(async ({ input, ctx }) => {
      const { notificationService } = await import('./notification.service');
      const results = await notificationService.send(
        {
          type: 'STAGE_ALERT',
          title: 'Test Notification',
          titleZh: '测试通知',
          content: 'This is a test notification from GRT System.',
          contentZh: '这是来自GRT系统的测试通知。',
          metadata: {
            alertType: 'TEST',
            alertDescription: 'Testing notification channel connectivity',
          },
        },
        [{
          userId: ctx.user.id,
          userName: ctx.user.name,
        }],
        [input.channel]
      );
      return {
        success: results[0]?.success || false,
        data: results[0],
      };
    }),
});

export type ProductionExecutionRouter = typeof productionExecutionRouter;