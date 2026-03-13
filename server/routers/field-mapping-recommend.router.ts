/**
 * GRT 5.0 字段映射推荐 tRPC 路由 (stub)
 *
 * 功能:
 * - 获取字段映射推荐
 * - 应用推荐映射
 *
 * No DB tables — returns empty/stub data.
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };

export const fieldMappingRecommendRouter = router({
  getRecommendations: protectedProcedure
    .input(z.object({ sourceFormat: z.string().optional(), targetFormat: z.string().optional(), sourceFields: z.array(z.string()).optional(), importType: z.string().optional() }).optional())
    .query(() => {
      return [];
    }),

  applyRecommendation: requirePermission('system:data:migrate')
    .input(z.object({ recommendationId: z.union([z.string(), z.number()]) }))
    .mutation(() => {
      return successResponse;
    }),
});
