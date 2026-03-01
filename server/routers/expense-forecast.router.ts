/**
 * GRT 5.0 费用预测 tRPC 路由 (stub)
 *
 * 功能:
 * - 费用预测列表
 * - 获取预测详情
 * - 生成预测
 *
 * No DB tables — returns empty/stub data.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const expenseForecastRouter = router({
  list: protectedProcedure.query(() => {
    return emptyListResponse;
  }),

  getForecast: protectedProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional(), category: z.string().optional() }).optional())
    .query(() => {
      return [];
    }),

  generateForecast: protectedProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional(), category: z.string().optional() }).optional())
    .mutation(() => {
      return [];
    }),
});
