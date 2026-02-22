import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const templateUsageStatsRouter = router({
  // 模板使用统计列表
  list: publicProcedure.query(async () => {
    return emptyListResponse;
  }),

  // 获取汇总
  getSummary: publicProcedure.query(async () => {
    return { summary: {} };
  }),

  // 获取趋势
  getTrends: publicProcedure.query(async () => {
    return [];
  }),

  // 获取热度排行
  getPopularity: publicProcedure.query(async () => {
    return [];
  }),

  // 获取用户活跃度
  getUserActivity: publicProcedure.query(async () => {
    return [];
  }),

  // 获取小时分布
  getHourlyDistribution: publicProcedure.query(async () => {
    return [];
  }),

  // 获取报表类型分布
  getReportTypeDistribution: publicProcedure.query(async () => {
    return [];
  }),
});
