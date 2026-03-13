import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { travelRecords } from "../../drizzle/schema";
import { desc, count, sql, eq } from "drizzle-orm";

/** Roles that can see company-wide travel data */
const TRAVEL_ADMIN_ROLES = new Set(["admin", "director", "finance_manager", "hr_manager", "dept_manager"]);

export const travelDashboardRouter = router({
  getData: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const role = ctx.user.role ?? "employee";
    const isAdmin = TRAVEL_ADMIN_ROLES.has(role);
    const whereCondition = isAdmin ? undefined : eq(travelRecords.employeeId, ctx.user.id);

    const records = await db.select().from(travelRecords).where(whereCondition).orderBy(desc(travelRecords.createdAt)).limit(100);
    const [totalResult] = await db.select({ count: count() }).from(travelRecords).where(whereCondition);
    const [budgetResult] = await db.select({
      totalBudget: sql<string>`COALESCE(SUM(CAST(${travelRecords.totalBudget} AS NUMERIC)), 0)`,
      totalExpense: sql<string>`COALESCE(SUM(CAST(${travelRecords.actualExpense} AS NUMERIC)), 0)`,
    }).from(travelRecords).where(whereCondition);
    return {
      data: {
        records,
        totalTrips: totalResult.count,
        totalBudget: Number(budgetResult.totalBudget) || 0,
        totalExpense: Number(budgetResult.totalExpense) || 0,
      },
    };
  }),
});
