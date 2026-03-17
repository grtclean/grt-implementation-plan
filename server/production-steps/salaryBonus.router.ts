/**
 * v1.7.0 绩效数据与薪酬模块联动 tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, requirePermission, router } from "../_core/trpc";
import {
  getSalaryRules,
  getSalaryRule,
  createSalaryRule,
  updateSalaryRule,
  calculateSalaryBonus,
  batchCalculateSalaryBonus,
  getSalaryBonusRecords,
  getSalaryBonusDetail,
  updateSalaryBonusStatus,
  getSalaryBonusStats,
  exportSalaryBonusCSV,
} from "./salaryBonus.service";

export const salaryBonusRouter = router({
  // ============ 薪酬计算规则 ============
  getRules: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }))
    .query(async ({ input }) => {
      return getSalaryRules(input.activeOnly);
    }),

  getRule: protectedProcedure
    .input(z.object({ ruleId: z.number() }))
    .query(async ({ input }) => {
      return getSalaryRule(input.ruleId);
    }),

  createRule: requirePermission("hrm_salary_detail")
    .input(z.object({
      ruleName: z.string(),
      ruleCode: z.string(),
      description: z.string().optional(),
      efficiencyBaseAmount: z.number().optional(),
      efficiencyThreshold: z.number().optional(),
      efficiencyMaxMultiplier: z.number().optional(),
      efficiencyWeight: z.number().optional(),
      qualityBaseAmount: z.number().optional(),
      qualityThreshold: z.number().optional(),
      qualityMaxMultiplier: z.number().optional(),
      qualityWeight: z.number().optional(),
      attendanceBaseAmount: z.number().optional(),
      attendanceThreshold: z.number().optional(),
      attendanceWeight: z.number().optional(),
      rankTop1Bonus: z.number().optional(),
      rankTop3Bonus: z.number().optional(),
      rankTop5Bonus: z.number().optional(),
      defectPenaltyPerCount: z.number().optional(),
      criticalDefectPenalty: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createSalaryRule({ ...input, createdBy: ctx.user!.openId });
    }),

  updateRule: requirePermission("hrm_salary_detail")
    .input(z.object({
      ruleId: z.number(),
      ruleName: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      efficiencyBaseAmount: z.number().optional(),
      efficiencyThreshold: z.number().optional(),
      efficiencyMaxMultiplier: z.number().optional(),
      efficiencyWeight: z.number().optional(),
      qualityBaseAmount: z.number().optional(),
      qualityThreshold: z.number().optional(),
      qualityMaxMultiplier: z.number().optional(),
      qualityWeight: z.number().optional(),
      attendanceBaseAmount: z.number().optional(),
      attendanceThreshold: z.number().optional(),
      attendanceWeight: z.number().optional(),
      rankTop1Bonus: z.number().optional(),
      rankTop3Bonus: z.number().optional(),
      rankTop5Bonus: z.number().optional(),
      defectPenaltyPerCount: z.number().optional(),
      criticalDefectPenalty: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { ruleId, ...params } = input;
      return updateSalaryRule(ruleId, params);
    }),

  // ============ 薪酬计算 ============
  calculate: requirePermission("hrm_salary_detail")
    .input(z.object({
      workerId: z.string(),
      workerName: z.string(),
      periodType: z.enum(['weekly', 'monthly', 'quarterly', 'annual']),
      periodStart: z.number(),
      periodEnd: z.number(),
      ruleId: z.number().optional(),
      baseSalary: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return calculateSalaryBonus(input);
    }),

  batchCalculate: requirePermission("hrm_salary_detail")
    .input(z.object({
      periodType: z.enum(['weekly', 'monthly', 'quarterly', 'annual']),
      periodStart: z.number(),
      periodEnd: z.number(),
      ruleId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return batchCalculateSalaryBonus(input);
    }),

  // ============ 薪酬记录查询 ============
  list: requirePermission("hrm_salary_detail")
    .input(z.object({
      workerId: z.string().optional(),
      periodType: z.string().optional(),
      periodStart: z.number().optional(),
      periodEnd: z.number().optional(),
      status: z.string().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return getSalaryBonusRecords(input);
    }),

  detail: requirePermission("hrm_salary_detail")
    .input(z.object({ recordId: z.number() }))
    .query(async ({ input }) => {
      return getSalaryBonusDetail(input.recordId);
    }),

  updateStatus: requirePermission("hrm_salary_detail")
    .input(z.object({
      recordId: z.number(),
      status: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return updateSalaryBonusStatus(input.recordId, {
        status: input.status,
        reviewedBy: input.status === 'reviewed' ? (ctx.user!.name || ctx.user!.openId) : undefined,
        approvedBy: input.status === 'approved' ? (ctx.user!.name || ctx.user!.openId) : undefined,
        notes: input.notes,
      });
    }),

  // ============ 统计和导出 ============
  stats: requirePermission("hrm_salary_detail")
    .input(z.object({
      periodType: z.string().optional(),
      periodStart: z.number().optional(),
      periodEnd: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return getSalaryBonusStats(input.periodType, input.periodStart, input.periodEnd);
    }),

  exportCSV: requirePermission("hrm_salary_detail")
    .input(z.object({
      periodStart: z.number().optional(),
      periodEnd: z.number().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return exportSalaryBonusCSV(input);
    }),
});
