/**
 * 绩效薪资自助查询 tRPC Router
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as perfSalaryService from "./perfSalary.service";

export const perfSalaryRouter = router({
  myProfile: protectedProcedure
    .query(async ({ ctx }) => {
      return perfSalaryService.getMyProfile(ctx.user.id);
    }),

  performanceGrades: protectedProcedure
    .query(async () => {
      return perfSalaryService.getPerformanceGrades();
    }),

  mySalaryRecords: protectedProcedure
    .query(async ({ ctx }) => {
      return perfSalaryService.getMySalaryRecords(ctx.user.id);
    }),

  salaryDetail: protectedProcedure
    .input(z.object({ calculationId: z.number() }))
    .query(async ({ ctx, input }) => {
      return perfSalaryService.getMySalaryDetail(ctx.user.id, input.calculationId);
    }),

  performanceTrend: protectedProcedure
    .input(z.object({ periods: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return perfSalaryService.getPerformanceTrend(ctx.user.id, input?.periods);
    }),
});
