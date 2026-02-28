import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const templateUsageStatsRouter = router({
  // 模板使用统计列表
  list: protectedProcedure.query(async () => {
    return emptyListResponse;
  }),

  // 获取汇总
  getSummary: protectedProcedure.query(async () => {
    return { summary: {} };
  }),

  // 获取趋势
  getTrends: protectedProcedure.query(async () => {
    return [];
  }),

  // 获取热度排行
  getPopularity: protectedProcedure.query(async () => {
    return [];
  }),

  // 获取用户活跃度
  getUserActivity: protectedProcedure.query(async () => {
    return [];
  }),

  // 获取小时分布
  getHourlyDistribution: protectedProcedure.query(async () => {
    return [];
  }),

  // 获取报表类型分布
  getReportTypeDistribution: protectedProcedure.query(async () => {
    return [];
  }),
});
