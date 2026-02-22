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
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const expenseForecastRouter = router({
  list: publicProcedure.query(() => {
    return emptyListResponse;
  }),

  getForecast: publicProcedure
    .input(z.any())
    .query(() => {
      return [];
    }),

  generateForecast: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return [];
    }),
});
