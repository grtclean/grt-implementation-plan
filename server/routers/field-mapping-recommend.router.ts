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
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };

export const fieldMappingRecommendRouter = router({
  getRecommendations: publicProcedure
    .input(z.any())
    .query(() => {
      return [];
    }),

  applyRecommendation: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return successResponse;
    }),
});
