/**
 * 质量检查、物料流转追踪、员工绩效排行榜 tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createQualityCheckpoint,
  getQualityCheckpoints,
  updateQualityCheckpoint,
  deleteQualityCheckpoint,
  submitCheckResult,
  getCheckResults,
  analyzeCCDImage,
  createQualityDefect,
  getQualityDefects,
  updateDefectStatus,
  getQualityDashboardStats,
  createMaterialFlow,
  updateMaterialFlowStatus,
  getMaterialFlowRecords,
  updateMaterialLocation,
  getMaterialLocations,
  getMaterialFlowStats,
  detectBottlenecks,
  getBottlenecks,
  updateBottleneckStatus,
  calculateWorkerPerformance,
  getPerformanceLeaderboard,
  getWorkerPerformanceTrend,
  getTeamPerformanceComparison,
} from "./qualityMaterialPerformance.service";

export const qualityMaterialPerformanceRouter = router({
  // ============ 质量检查点 ============
  createCheckpoint: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      processCode: z.string(),
      bomStepId: z.number().optional(),
      checkpointName: z.string(),
      checkpointType: z.enum(['visual_inspection', 'ccd_detection', 'dimensional_check', 'functional_test', 'pressure_test', 'cleanliness_test']),
      description: z.string().optional(),
      acceptanceCriteria: z.string().optional(),
      isMandatory: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createQualityCheckpoint({ ...input, createdBy: ctx.user.openId });
    }),

  getCheckpoints: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      processCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getQualityCheckpoints(input.projectId, input.processCode);
    }),

  updateCheckpoint: protectedProcedure
    .input(z.object({
      id: z.number(),
      checkpointName: z.string().optional(),
      checkpointType: z.enum(['visual_inspection', 'ccd_detection', 'dimensional_check', 'functional_test', 'pressure_test', 'cleanliness_test']).optional(),
      description: z.string().optional(),
      acceptanceCriteria: z.string().optional(),
      isMandatory: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateQualityCheckpoint(id, data);
    }),

  deleteCheckpoint: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteQualityCheckpoint(input.id);
    }),

  // ============ 质量检查结果 ============
  submitResult: protectedProcedure
    .input(z.object({
      checkpointId: z.number(),
      projectId: z.string(),
      processCode: z.string(),
      result: z.enum(['pass', 'fail', 'conditional_pass', 'pending']),
      score: z.number().optional(),
      ccdImageUrl: z.string().optional(),
      ccdAnalysisData: z.any().optional(),
      defectCount: z.number().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return submitCheckResult({
        ...input,
        inspectorId: ctx.user.openId,
        inspectorName: ctx.user.name,
      });
    }),

  getResults: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      processCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getCheckResults(input.projectId, input.processCode);
    }),

  analyzeCCD: protectedProcedure
    .input(z.object({
      imageUrl: z.string(),
      checkpointName: z.string(),
      acceptanceCriteria: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return analyzeCCDImage(input.imageUrl, input.checkpointName, input.acceptanceCriteria);
    }),

  // ============ 质量缺陷 ============
  createDefect: protectedProcedure
    .input(z.object({
      checkResultId: z.number(),
      projectId: z.string(),
      processCode: z.string(),
      defectType: z.enum(['dimensional', 'surface', 'functional', 'assembly', 'material', 'cleanliness', 'other']),
      severity: z.enum(['critical', 'major', 'minor', 'cosmetic']),
      description: z.string(),
      imageUrl: z.string().optional(),
      rootCause: z.string().optional(),
      correctiveAction: z.string().optional(),
      assignedTo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return createQualityDefect(input);
    }),

  getDefects: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      processCode: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getQualityDefects(input.projectId, input.processCode, input.status);
    }),

  updateDefectStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string(),
      rootCause: z.string().optional(),
      correctiveAction: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return updateDefectStatus(input.id, input.status, input.rootCause, input.correctiveAction);
    }),

  qualityDashboard: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return getQualityDashboardStats(input.projectId);
    }),

  // ============ 物料流转 ============
  createFlow: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      materialId: z.string(),
      materialName: z.string(),
      materialType: z.enum(['part', 'component', 'assembly', 'raw_material', 'consumable']),
      fromProcess: z.string().optional(),
      toProcess: z.string(),
      quantity: z.number().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createMaterialFlow({
        ...input,
        operatorId: ctx.user.openId,
        operatorName: ctx.user.name,
      });
    }),

  updateFlowStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string(),
    }))
    .mutation(async ({ input }) => {
      return updateMaterialFlowStatus(input.id, input.status);
    }),

  getFlowRecords: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      processCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getMaterialFlowRecords(input.projectId, input.processCode);
    }),

  updateLocation: protectedProcedure
    .input(z.object({
      materialId: z.string(),
      projectId: z.string().optional(),
      uwbTagId: z.string().optional(),
      locationX: z.number().optional(),
      locationY: z.number().optional(),
      locationZ: z.number().optional(),
      zoneName: z.string().optional(),
      currentProcess: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return updateMaterialLocation(input);
    }),

  getLocations: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(async ({ input }) => {
      return getMaterialLocations(input.projectId);
    }),

  flowStats: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return getMaterialFlowStats(input.projectId);
    }),

  // ============ 瓶颈分析 ============
  detectBottlenecks: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      return detectBottlenecks(input.projectId);
    }),

  getBottlenecks: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getBottlenecks(input.projectId, input.status);
    }),

  updateBottleneckStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string(),
    }))
    .mutation(async ({ input }) => {
      return updateBottleneckStatus(input.id, input.status);
    }),

  // ============ 员工绩效 ============
  calculatePerformance: protectedProcedure
    .input(z.object({
      workerId: z.string(),
      workerName: z.string(),
      periodType: z.enum(['daily', 'weekly', 'monthly']),
      periodStart: z.number(),
      periodEnd: z.number(),
    }))
    .mutation(async ({ input }) => {
      return calculateWorkerPerformance(
        input.workerId, input.workerName,
        input.periodType, input.periodStart, input.periodEnd
      );
    }),

  leaderboard: protectedProcedure
    .input(z.object({
      periodType: z.enum(['daily', 'weekly', 'monthly']),
      periodStart: z.number().optional(),
      periodEnd: z.number().optional(),
      projectId: z.string().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return getPerformanceLeaderboard(input);
    }),

  workerTrend: protectedProcedure
    .input(z.object({
      workerId: z.string(),
      periodType: z.enum(['daily', 'weekly', 'monthly']),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return getWorkerPerformanceTrend(input.workerId, input.periodType, input.limit);
    }),

  teamComparison: protectedProcedure
    .input(z.object({
      periodType: z.enum(['daily', 'weekly', 'monthly']),
      periodStart: z.number(),
      periodEnd: z.number(),
    }))
    .query(async ({ input }) => {
      return getTeamPerformanceComparison(input.periodType, input.periodStart, input.periodEnd);
    }),
});
