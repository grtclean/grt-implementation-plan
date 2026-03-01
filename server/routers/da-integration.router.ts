/**
 * GRT 5.0 数字助理集成 tRPC 路由 (stub)
 *
 * 功能:
 * - 集成状态查询
 * - 同步触发
 * - 集成统计
 *
 * No DB tables — returns empty/stub data.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };

export const daIntegrationRouter = router({
  getStatus: protectedProcedure.query(() => {
    return { status: "ok" };
  }),

  sync: protectedProcedure.mutation(() => {
    return successResponse;
  }),

  getIntegrationStats: protectedProcedure
    .input(z.object({ assistantType: z.string().optional() }).optional())
    .query(() => {
      return {
        totalIntegrations: 0,
        activeIntegrations: 0,
        syncedRecords: 0,
        lastSyncTime: null as string | null,
        byAssistant: {} as Record<string, number>,
      };
    }),
});
