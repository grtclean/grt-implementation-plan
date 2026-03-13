/**
 * v1.7.2 CCD WebSocket实时推送路由
 * CCD WebSocket Real-time Push Router
 */

import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { getCcdWebSocketStats, pushCcdDetectionResult } from "./ccdWebSocket.service";

export const ccdWebSocketRouter = router({
  /** 获取CCD WebSocket连接统计 */
  getStats: protectedProcedure
    .query(async () => {
      return getCcdWebSocketStats();
    }),

  /** 手动推送CCD检测结果（用于测试和调试） */
  testPush: protectedProcedure
    .input(z.object({
      detectionId: z.string(),
      stationId: z.string(),
      projectId: z.string(),
      processCode: z.string(),
      partId: z.string().optional(),
      partName: z.string().optional(),
      overallScore: z.number().min(0).max(100),
      severity: z.enum(['critical', 'major', 'minor', 'pass']),
      defectCount: z.number().min(0),
      triggeredInterlock: z.boolean(),
      inCooldown: z.boolean().optional(),
      defects: z.array(z.object({
        defectType: z.string(),
        location: z.string(),
        confidence: z.number().min(0).max(1),
        description: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const result = pushCcdDetectionResult({
        ...input,
        inCooldown: input.inCooldown ?? false,
        defects: input.defects || [],
        inspectedAt: Date.now(),
        processedAt: Date.now(),
      });
      return {
        pushed: true,
        ...result,
      };
    }),
});
