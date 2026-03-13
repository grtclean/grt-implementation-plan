/**
 * 生产工序步骤管理路由 (Production Process Steps Router)
 * 
 * tRPC路由定义，提供工序步骤管理的所有API端点
 * 包括：BOM步骤CRUD、AI预设、工时打卡、附件管理、历史参照
 */

import { z } from "zod";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import {
  // BOM步骤
  createBomStep,
  updateBomStep,
  deleteBomStep,
  getBomSteps,
  getBomStepsByProject,
  getBomStepById,
  reorderBomSteps,
  // AI预设步骤
  createAiPresetStep,
  getAiPresetSteps,
  getAiPresetStepsByProject,
  confirmAiPresetStep,
  batchConfirmAiPresetSteps,
  adoptAiPresetAsBomStep,
  batchAdoptAiPresets,
  // 工时打卡
  startTimeLog,
  endTimeLog,
  getTimeLogs,
  getTimeLogsByWorker,
  getActiveTimeLogs,
  // 附件
  addStepAttachment,
  getStepAttachments,
  deleteStepAttachment,
  // AI历史参照
  generateAiPresetSteps,
  generateAiPresetsForRange,
  findSimilarProjects,
  getHistoricalReferences,
  // 映射与概览
  getProcessCodesForMilestone,
  getMilestonesForProcessCode,
  getProjectProcessOverview,
  // 统计
  getProcessStepStats,
  // 常量
  T_TO_M_MAPPING,
  M_TO_T_MAPPING,
  // 工序进度看板
  getProjectProgressDashboard,
  // 产线员工移动端视图
  getWorkerAssignments,
  getWorkerTimeHistory,
  getWorkerDailySummary,
  // AI准确度反馈
  getAiAccuracyDashboard,
  // P0: 减少手动输入
  completeStepWithAutoTime,
  batchAdoptAiPresetsByProject,
  // 物料-工步关联
  linkMaterialToStep,
  getStepMaterials,
  checkMaterialReadiness,
  updateMaterialAvailability,
  // BOM步骤返工
  triggerRework,
  getReworkHistory,
} from "./processSteps.service";

export const processStepsRouter = router({
  // ============================================================
  // BOM步骤管理（工程师手动输入 - 左列）
  // ============================================================

  createBomStep: protectedProcedure
    .input(z.object({
      processInstanceId: z.number(),
      projectId: z.number(),
      processCode: z.string(),
      stepNumber: z.number(),
      stepName: z.string(),
      processRequirements: z.string().optional(),
      processDescription: z.string().optional(),
      bomItemReference: z.string().optional(),
      theoreticalHours: z.number().optional(),
      plannedWorkerName: z.string().optional(),
      plannedWorkerId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createBomStep({ ...input, createdBy: ctx.user.id, status: 'pending' });
    }),

  updateBomStep: protectedProcedure
    .input(z.object({
      id: z.number(),
      stepNumber: z.number().optional(),
      stepName: z.string().optional(),
      processRequirements: z.string().optional(),
      processDescription: z.string().optional(),
      bomItemReference: z.string().optional(),
      theoreticalHours: z.number().optional(),
      plannedWorkerName: z.string().optional(),
      plannedWorkerId: z.number().optional(),
      status: z.enum(["pending", "in_progress", "completed", "rework"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateBomStep(id, data);
    }),

  // P0: 工时自动推断 - 完成步骤时自动创建工时记录
  completeStepWithAutoTime: requirePermission('mfg:steps:manage')
    .input(z.object({
      stepId: z.number(),
      projectId: z.number(),
      processCode: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return completeStepWithAutoTime(
        input.stepId,
        input.projectId,
        input.processCode,
        ctx.user.id,
        ctx.user.name || `用户#${ctx.user.id}`,
        input.notes
      );
    }),

  deleteBomStep: requirePermission('mfg:steps:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteBomStep(input.id);
    }),

  getBomSteps: protectedProcedure
    .input(z.object({ processInstanceId: z.number() }))
    .query(async ({ input }) => {
      return getBomSteps(input.processInstanceId);
    }),

  getBomStepsByProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      processCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getBomStepsByProject(input.projectId, input.processCode);
    }),

  getBomStepById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getBomStepById(input.id);
    }),

  reorderBomSteps: requirePermission('mfg:steps:manage')
    .input(z.object({
      processInstanceId: z.number(),
      stepIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      return reorderBomSteps(input.processInstanceId, input.stepIds);
    }),

  // ============================================================
  // AI预设步骤管理（AI智慧预设 - 右列）
  // ============================================================

  getAiPresetSteps: protectedProcedure
    .input(z.object({ processInstanceId: z.number() }))
    .query(async ({ input }) => {
      return getAiPresetSteps(input.processInstanceId);
    }),

  getAiPresetStepsByProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      processCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getAiPresetStepsByProject(input.projectId, input.processCode);
    }),

  confirmAiPresetStep: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["confirmed", "modified", "rejected"]),
      modifications: z.object({
        stepName: z.string().optional(),
        processRequirements: z.string().optional(),
        processDescription: z.string().optional(),
        theoreticalHours: z.number().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return confirmAiPresetStep(input.id, ctx.user.id, input.status, input.modifications);
    }),

  batchConfirmAiPresetSteps: requirePermission('mfg:steps:manage')
    .input(z.object({
      ids: z.array(z.number()),
      status: z.enum(["confirmed", "modified", "rejected"]),
    }))
    .mutation(async ({ input, ctx }) => {
      return batchConfirmAiPresetSteps(input.ids, ctx.user.id, input.status);
    }),

  adoptAiPresetAsBomStep: requirePermission('mfg:steps:manage')
    .input(z.object({ aiPresetId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return adoptAiPresetAsBomStep(input.aiPresetId, ctx.user.id);
    }),

  batchAdoptAiPresets: requirePermission('mfg:steps:manage')
    .input(z.object({ aiPresetIds: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      return batchAdoptAiPresets(input.aiPresetIds, ctx.user.id);
    }),

  // P0: AI预设工步批量采纳（按项目/工序，支持选择性或全量采纳）
  batchAdoptAiPresetsByProject: requirePermission('mfg:steps:manage')
    .input(z.object({
      projectId: z.number(),
      processCode: z.string(),
      presetIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return batchAdoptAiPresetsByProject(
        input.projectId,
        input.processCode,
        ctx.user.id,
        input.presetIds
      );
    }),

  // ============================================================
  // 产线员工工时打卡
  // ============================================================

  startTimeLog: requirePermission('mfg:steps:manage')
    .input(z.object({ bomStepId: z.number() }))
    .mutation(async ({ ctx }) => {
      // 使用当前登录用户作为打卡员工
      return startTimeLog(ctx.user.id, ctx.user.id, ctx.user.name || `员工#${ctx.user.id}`);
    }),

  // 允许指定员工（管理员安排）
  startTimeLogForWorker: requirePermission('mfg:steps:manage')
    .input(z.object({
      bomStepId: z.number(),
      workerId: z.number(),
      workerName: z.string(),
    }))
    .mutation(async ({ input }) => {
      return startTimeLog(input.bomStepId, input.workerId, input.workerName);
    }),

  endTimeLog: requirePermission('mfg:steps:manage')
    .input(z.object({
      timeLogId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return endTimeLog(input.timeLogId, input.notes);
    }),

  getTimeLogs: protectedProcedure
    .input(z.object({ bomStepId: z.number() }))
    .query(async ({ input }) => {
      return getTimeLogs(input.bomStepId);
    }),

  getMyTimeLogs: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      return getTimeLogsByWorker(ctx.user.id, input.projectId);
    }),

  getMyActiveTimeLogs: protectedProcedure
    .query(async ({ ctx }) => {
      return getActiveTimeLogs(ctx.user.id);
    }),

  // ============================================================
  // 附件管理
  // ============================================================

  addStepAttachment: requirePermission('mfg:steps:manage')
    .input(z.object({
      stepId: z.number(),
      stepType: z.enum(["bom", "ai_preset"]),
      fileName: z.string(),
      fileUrl: z.string(),
      fileType: z.string().optional(),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return addStepAttachment({ ...input, uploadedBy: ctx.user.id });
    }),

  getStepAttachments: protectedProcedure
    .input(z.object({
      stepId: z.number(),
      stepType: z.enum(["bom", "ai_preset"]),
    }))
    .query(async ({ input }) => {
      return getStepAttachments(input.stepId, input.stepType);
    }),

  deleteStepAttachment: requirePermission('mfg:steps:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteStepAttachment(input.id);
    }),

  // ============================================================
  // AI智慧预设（历史项目参照）
  // ============================================================

  generateAiPresetSteps: requirePermission('mfg:steps:manage')
    .input(z.object({
      targetProjectId: z.number(),
      processInstanceId: z.number(),
      processCode: z.string(),
      sourceProjectId: z.number(),
      currentBomItems: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateAiPresetSteps(
        input.targetProjectId,
        input.processInstanceId,
        input.processCode,
        input.sourceProjectId,
        input.currentBomItems
      );
    }),

  generateAiPresetsForRange: requirePermission('mfg:steps:manage')
    .input(z.object({
      targetProjectId: z.number(),
      sourceProjectId: z.number(),
      processCodeStart: z.string(),
      processCodeEnd: z.string(),
      currentBomItems: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateAiPresetsForRange(
        input.targetProjectId,
        input.sourceProjectId,
        input.processCodeStart,
        input.processCodeEnd,
        input.currentBomItems
      );
    }),

  findSimilarProjects: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      limit: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      return findSimilarProjects(input.projectId, input.limit);
    }),

  getHistoricalReferences: protectedProcedure
    .input(z.object({ targetProjectId: z.number() }))
    .query(async ({ input }) => {
      return getHistoricalReferences(input.targetProjectId);
    }),

  // ============================================================
  // T-M映射与项目概览
  // ============================================================

  getTMMapping: protectedProcedure
    .query(async () => {
      return { tToM: T_TO_M_MAPPING, mToT: M_TO_T_MAPPING };
    }),

  getProcessCodesForMilestone: protectedProcedure
    .input(z.object({ milestoneCode: z.string() }))
    .query(async ({ input }) => {
      return getProcessCodesForMilestone(input.milestoneCode);
    }),

  getMilestonesForProcessCode: protectedProcedure
    .input(z.object({ processCode: z.string() }))
    .query(async ({ input }) => {
      return getMilestonesForProcessCode(input.processCode);
    }),

  getProjectProcessOverview: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return getProjectProcessOverview(input.projectId);
    }),

  // ============================================================
  // 统计
  // ============================================================

  getProcessStepStats: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return getProcessStepStats(input.projectId);
    }),

  // ============================================================
  // 工序进度看板
  // ============================================================

  getProjectProgressDashboard: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return getProjectProgressDashboard(input.projectId);
    }),

  // ============================================================
  // 产线员工移动端视图
  // ============================================================

  getWorkerAssignments: protectedProcedure
    .query(async ({ ctx }) => {
      return getWorkerAssignments(ctx.user.id);
    }),

  getWorkerTimeHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(50) }))
    .query(async ({ input, ctx }) => {
      return getWorkerTimeHistory(ctx.user.id, input.limit);
    }),

  getWorkerDailySummary: protectedProcedure
    .query(async ({ ctx }) => {
      return getWorkerDailySummary(ctx.user.id);
    }),

  // ============================================================
  // AI预设准确度反馈
  // ============================================================

  getAiAccuracyDashboard: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(async ({ input }) => {
      return getAiAccuracyDashboard(input.projectId);
    }),

  // ============================================================
  // 物料-工步关联与备料校验
  // ============================================================

  linkMaterial: requirePermission('mfg:steps:manage')
    .input(z.object({
      bomStepId: z.number(),
      materialCode: z.string(),
      materialName: z.string(),
      requiredQty: z.number().default(1),
      unit: z.string().default("pcs"),
    }))
    .mutation(async ({ input }) => {
      return linkMaterialToStep(
        input.bomStepId,
        input.materialCode,
        input.materialName,
        input.requiredQty,
        input.unit
      );
    }),

  getStepMaterials: protectedProcedure
    .input(z.object({ bomStepId: z.number() }))
    .query(async ({ input }) => {
      return getStepMaterials(input.bomStepId);
    }),

  checkMaterialReadiness: protectedProcedure
    .input(z.object({ bomStepId: z.number() }))
    .query(async ({ input }) => {
      return checkMaterialReadiness(input.bomStepId);
    }),

  updateMaterialAvailability: requirePermission('mfg:steps:manage')
    .input(z.object({
      stepMaterialId: z.number(),
      availableQty: z.number(),
    }))
    .mutation(async ({ input }) => {
      return updateMaterialAvailability(input.stepMaterialId, input.availableQty);
    }),

  // ============================================================
  // BOM步骤返工流程
  // ============================================================

  triggerRework: requirePermission('mfg:steps:manage')
    .input(z.object({
      stepId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return triggerRework(input.stepId, ctx.user.id, input.reason);
    }),

  getReworkHistory: protectedProcedure
    .input(z.object({ stepId: z.number() }))
    .query(async ({ input }) => {
      return getReworkHistory(input.stepId);
    }),
});
