/**
 * v1.7.1 CCD检测集成路由
 * CCD Integration Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getCcdConfig,
  saveCcdConfig,
  onCcdDetectionResult,
  getCcdDetectionLogs,
  getCcdDetectionStats,
  getCcdInterlockHistory,
} from "./ccdIntegration.service";

export const ccdIntegrationRouter = router({
  /** 获取CCD集成配置 */
  getConfig: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(async ({ input }) => {
      return getCcdConfig(input.projectId);
    }),

  /** 保存CCD集成配置 */
  saveConfig: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      autoTriggerEnabled: z.boolean().optional(),
      severityThresholdCritical: z.number().min(0).max(100).optional(),
      severityThresholdMajor: z.number().min(0).max(100).optional(),
      severityThresholdMinor: z.number().min(0).max(100).optional(),
      processMapping: z.record(z.string(), z.string()).optional(),
      autoLockOnCritical: z.boolean().optional(),
      autoLockOnMajor: z.boolean().optional(),
      autoNotifyOnMinor: z.boolean().optional(),
      cooldownMinutes: z.number().min(1).max(60).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return saveCcdConfig({
        ...input,
        updatedBy: ctx.user?.name || ctx.user?.openId,
      });
    }),

  /** 提交CCD检测结果（核心桥接接口） */
  submitDetection: protectedProcedure
    .input(z.object({
      detectionId: z.string(),
      stationId: z.string(),
      projectId: z.string(),
      partId: z.string().optional(),
      partName: z.string().optional(),
      overallScore: z.number().min(0).max(100),
      defects: z.array(z.object({
        defectType: z.string(),
        location: z.string(),
        confidence: z.number().min(0).max(1),
        area: z.number().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
      })),
      inspectedAt: z.number().optional(),
      equipmentId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return onCcdDetectionResult({
        ...input,
        inspectedAt: input.inspectedAt || Date.now(),
        inspectorId: ctx.user?.name || ctx.user?.openId,
      });
    }),

  /** 获取CCD检测日志 */
  getLogs: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      stationId: z.string().optional(),
      processCode: z.string().optional(),
      severity: z.string().optional(),
      triggeredOnly: z.boolean().optional(),
      startTime: z.number().optional(),
      endTime: z.number().optional(),
      limit: z.number().min(1).max(200).optional(),
    }))
    .query(async ({ input }) => {
      return getCcdDetectionLogs(input);
    }),

  /** 获取CCD检测统计 */
  getStats: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      startTime: z.number().optional(),
      endTime: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const timeRange = input.startTime && input.endTime
        ? { start: input.startTime, end: input.endTime }
        : undefined;
      return getCcdDetectionStats(input.projectId, timeRange);
    }),

  /** 获取CCD检测与质量联动关联历史 */
  getInterlockHistory: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      return getCcdInterlockHistory(input.projectId, input.limit);
    }),
});
