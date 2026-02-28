/**
 * v1.7.1 薪酬报表可视化路由
 * Salary Report Visualization Router
 */

import { z } from "zod";
import { requirePermission, router } from "../_core/trpc";

// All salary report procedures require hrm_salary_detail permission
const salaryProcedure = requirePermission('hrm_salary_detail');
import {
  getMonthlyBonusDistribution,
  getProcessComparisonData,
  getPerformanceSalaryCorrelation,
  getSalaryTrendData,
  getWorkerSalaryTrend,
  getSalaryDashboardData,
} from "./salaryReport.service";

export const salaryReportRouter = router({
  /** 获取月度奖金分布 */
  bonusDistribution: salaryProcedure
    .input(z.object({
      periodStart: z.number(),
      periodEnd: z.number(),
    }))
    .query(async ({ input }) => {
      return getMonthlyBonusDistribution(input);
    }),

  /** 获取工序对比分析 */
  processComparison: salaryProcedure
    .input(z.object({
      periodStart: z.number(),
      periodEnd: z.number(),
    }))
    .query(async ({ input }) => {
      return getProcessComparisonData(input);
    }),

  /** 获取绩效-薪酬相关性 */
  correlation: salaryProcedure
    .input(z.object({
      periodStart: z.number(),
      periodEnd: z.number(),
      metric: z.enum(['efficiency', 'quality', 'overall']).optional(),
    }))
    .query(async ({ input }) => {
      return getPerformanceSalaryCorrelation(input);
    }),

  /** 获取薪酬趋势数据 */
  trend: salaryProcedure
    .input(z.object({
      periodType: z.enum(['weekly', 'monthly', 'quarterly']),
      periodsCount: z.number().min(2).max(52).optional(),
    }))
    .query(async ({ input }) => {
      return getSalaryTrendData(input);
    }),

  /** 获取员工个人薪酬趋势 */
  workerTrend: salaryProcedure
    .input(z.object({
      workerId: z.string(),
      limit: z.number().min(1).max(52).optional(),
    }))
    .query(async ({ input }) => {
      return getWorkerSalaryTrend(input.workerId, input.limit);
    }),

  /** 获取薪酬仪表盘数据 */
  dashboard: salaryProcedure
    .input(z.object({
      periodStart: z.number(),
      periodEnd: z.number(),
      periodType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getSalaryDashboardData(input);
    }),
});
