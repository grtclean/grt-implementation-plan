/**
 * 事业部管理系统 - tRPC路由
 * Business Unit Management System - tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as buQueries from "../db/bu-queries";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("bu");

/**
 * 验证模式
 */

const createBuSchema = z.object({
  code: z.string().min(1, "事业部代码不能为空"),
  name: z.string().min(1, "事业部名称不能为空"),
  description: z.string().optional(),
  managerId: z.number().optional(),
  parentBuId: z.number().optional(),
  fiscalYear: z.number().optional(),
  status: z.enum(["active", "inactive", "planning"]).default("active"),
});

const updateBuSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().optional(),
  managerId: z.number().optional(),
  parentBuId: z.number().optional(),
  fiscalYear: z.number().optional(),
  status: z.enum(["active", "inactive", "planning"]).optional(),
});

const performanceSchema = z.object({
  buId: z.number(),
  fiscalYear: z.number(),
  fiscalQuarter: z.number().optional(),
  revenue: z.number().optional(),
  revenueTarget: z.number().optional(),
  revenueAchievementRate: z.number().optional(),
  projectsCompleted: z.number().optional(),
  projectsOnTime: z.number().optional(),
  deliveryOnTimeRate: z.number().optional(),
  projectSatisfaction: z.number().optional(),
  totalCost: z.number().optional(),
  costBudget: z.number().optional(),
  costVarianceRate: z.number().optional(),
  laborCost: z.number().optional(),
  materialCost: z.number().optional(),
  defectRate: z.number().optional(),
  reworkRate: z.number().optional(),
  qualityScore: z.number().optional(),
  customerComplaintCount: z.number().optional(),
  customerSatisfaction: z.number().optional(),
  customerRetentionRate: z.number().optional(),
  newCustomerCount: z.number().optional(),
  customerLifetimeValue: z.number().optional(),
  employeeCount: z.number().optional(),
  employeeTurnoverRate: z.number().optional(),
  trainingHoursPerEmployee: z.number().optional(),
  employeeSatisfaction: z.number().optional(),
  innovationProjects: z.number().optional(),
  patentCount: z.number().optional(),
  processImprovementCount: z.number().optional(),
  innovationInvestment: z.number().optional(),
  overallScore: z.number().optional(),
  overallRating: z.string().optional(),
});

const kpiSchema = z.object({
  buId: z.number(),
  kpiCode: z.string().min(1),
  kpiName: z.string().min(1),
  dimension: z.string().min(1),
  unit: z.string().optional(),
  fiscalYear: z.number(),
  targetValue: z.number().optional(),
  weight: z.number().optional(),
  excellentThreshold: z.number().optional(),
  goodThreshold: z.number().optional(),
  acceptableThreshold: z.number().optional(),
  calculationMethod: z.string().optional(),
  calculationFormula: z.string().optional(),
  dataSource: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

/**
 * 事业部路由
 */

export const buRouter = router({
  // 事业部管理
  list: protectedProcedure.query(async () => {
    try {
      const units = await buQueries.getAllBusinessUnits();
      return { success: true, data: units };
    } catch (error) {
      log.error({ err: error }, "Failed to list business units");
      return { success: false, error: "Failed to fetch business units" };
    }
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    try {
      const [unit] = await buQueries.getBusinessUnitById(input.id);
      return { success: true, data: unit || null };
    } catch (error) {
      log.error({ err: error }, "Failed to get business unit");
      return { success: false, error: "Failed to fetch business unit" };
    }
  }),

  getByCode: protectedProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
    try {
      const [unit] = await buQueries.getBusinessUnitByCode(input.code);
      return { success: true, data: unit || null };
    } catch (error) {
      log.error({ err: error }, "Failed to get business unit by code");
      return { success: false, error: "Failed to fetch business unit" };
    }
  }),

  create: protectedProcedure.input(createBuSchema).mutation(async ({ input }) => {
    try {
      const result = await buQueries.createBusinessUnit(input);
      return { success: true, data: result[0] };
    } catch (error) {
      log.error({ err: error }, "Failed to create business unit");
      return { success: false, error: "Failed to create business unit" };
    }
  }),

  update: protectedProcedure.input(updateBuSchema).mutation(async ({ input }) => {
    try {
      const { id, ...data } = input;
      const result = await buQueries.updateBusinessUnit(id, data);
      return { success: true, data: result[0] };
    } catch (error) {
      log.error({ err: error }, "Failed to update business unit");
      return { success: false, error: "Failed to update business unit" };
    }
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    try {
      await buQueries.deleteBusinessUnit(input.id);
      return { success: true };
    } catch (error) {
      log.error({ err: error }, "Failed to delete business unit");
      return { success: false, error: "Failed to delete business unit" };
    }
  }),

  // 绩效管理
  getPerformance: protectedProcedure
    .input(z.object({ buId: z.number(), fiscalYear: z.number() }))
    .query(async ({ input }) => {
      try {
        const performance = await buQueries.getPerformanceByBuAndYear(input.buId, input.fiscalYear);
        return { success: true, data: performance };
      } catch (error) {
        log.error({ err: error }, "Failed to get performance");
        return { success: false, error: "Failed to fetch performance data" };
      }
    }),

  savePerformance: protectedProcedure.input(performanceSchema).mutation(async ({ input }) => {
    try {
      const existing = await buQueries.getPerformanceByBuAndYear(input.buId, input.fiscalYear);

      let result;
      if (existing.length > 0) {
        result = await buQueries.updatePerformance(existing[0].id, input);
      } else {
        result = await buQueries.createPerformance(input);
      }

      return { success: true, data: result[0] };
    } catch (error) {
      log.error({ err: error }, "Failed to save performance");
      return { success: false, error: "Failed to save performance data" };
    }
  }),

  getPerformanceTrend: protectedProcedure
    .input(z.object({ buId: z.number(), startYear: z.number(), endYear: z.number() }))
    .query(async ({ input }) => {
      try {
        const trend = await buQueries.getPerformanceTrend(
          input.buId,
          input.startYear,
          input.endYear
        );
        return { success: true, data: trend };
      } catch (error) {
        log.error({ err: error }, "Failed to get performance trend");
        return { success: false, error: "Failed to fetch performance trend" };
      }
    }),

  // KPI管理
  getKpis: protectedProcedure
    .input(z.object({ buId: z.number(), fiscalYear: z.number() }))
    .query(async ({ input }) => {
      try {
        const kpis = await buQueries.getKpisByBu(input.buId, input.fiscalYear);
        return { success: true, data: kpis };
      } catch (error) {
        log.error({ err: error }, "Failed to get KPIs");
        return { success: false, error: "Failed to fetch KPIs" };
      }
    }),

  createKpi: protectedProcedure.input(kpiSchema).mutation(async ({ input }) => {
    try {
      const result = await buQueries.createKpi(input);
      return { success: true, data: result[0] };
    } catch (error) {
      log.error({ err: error }, "Failed to create KPI");
      return { success: false, error: "Failed to create KPI" };
    }
  }),

  updateKpi: protectedProcedure
    .input(z.object({ id: z.number(), ...kpiSchema.omit({ buId: true, kpiCode: true, fiscalYear: true }).shape }))
    .mutation(async ({ input }) => {
      try {
        const { id, ...data } = input;
        const result = await buQueries.updateKpi(id, data);
        return { success: true, data: result[0] };
      } catch (error) {
        log.error({ err: error }, "Failed to update KPI");
        return { success: false, error: "Failed to update KPI" };
      }
    }),

  // 统计
  getStatistics: protectedProcedure
    .input(z.object({ buId: z.number(), fiscalYear: z.number() }))
    .query(async ({ input }) => {
      try {
        const stats = await buQueries.getBuStatistics(input.buId, input.fiscalYear);
        return { success: true, data: stats };
      } catch (error) {
        log.error({ err: error }, "Failed to get statistics");
        return { success: false, error: "Failed to fetch statistics" };
      }
    }),

  // 员工管理
  getEmployees: protectedProcedure
    .input(z.object({ buId: z.number() }))
    .query(async ({ input }) => {
      try {
        const employees = await buQueries.getBuEmployees(input.buId);
        return { success: true, data: employees };
      } catch (error) {
        log.error({ err: error }, "Failed to get employees");
        return { success: false, error: "Failed to fetch employees" };
      }
    }),

  addEmployee: protectedProcedure
    .input(
      z.object({
        buId: z.number(),
        employeeId: z.number(),
        role: z.string().optional(),
        department: z.string().optional(),
        joinDate: z.string().optional(),
        status: z.enum(["active", "inactive", "on_leave"]).default("active"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await buQueries.addEmployeeToBu(input);
        return { success: true, data: result[0] };
      } catch (error) {
        log.error({ err: error }, "Failed to add employee");
        return { success: false, error: "Failed to add employee" };
      }
    }),

  removeEmployee: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await buQueries.removeBuEmployee(input.id);
        return { success: true };
      } catch (error) {
        log.error({ err: error }, "Failed to remove employee");
        return { success: false, error: "Failed to remove employee" };
      }
    }),
});
