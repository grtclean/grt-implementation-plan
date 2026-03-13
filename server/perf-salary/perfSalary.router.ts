/**
 * 绩效薪资自助查询 tRPC Router
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import * as perfSalaryService from "./perfSalary.service";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

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

  getDeptSalaryOverview: requirePermission('hr:salary:view').query(async () => {
    const db = await requireDb();
    try {
      const result = await db.execute(sql`
        SELECT
          e.department as dept,
          COUNT(e.id)::int as headcount,
          COALESCE(AVG(s.gross_salary), 0)::numeric(10,0) as avg_salary,
          COALESCE(SUM(s.gross_salary), 0)::numeric(12,0) as total_cost
        FROM company_employees e
        LEFT JOIN salary_calculations s ON s.employee_id = e.id
        WHERE e.status = 'active'
        GROUP BY e.department
        HAVING COUNT(e.id) > 0
        ORDER BY total_cost DESC
        LIMIT 50
      `);
      const rows = ((result as any).rows ?? []).map((r: any) => ({
        dept: r.dept || '未分配',
        headcount: Number(r.headcount ?? 0),
        avgSalary: Number(r.avg_salary ?? 0),
        totalCost: Number(r.total_cost ?? 0),
      }));
      return { departments: rows };
    } catch {
      return { departments: [] };
    }
  }),
});
