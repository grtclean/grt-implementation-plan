/**
 * 三套工时对账路由 (Time Reconciliation Router)
 *
 * Provides tRPC endpoints for time reconciliation between:
 * - UWB work hours
 * - BOM step time logs
 * - Production execution time records
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import {
  reconcileTimeRecords,
  getDiscrepancies,
  resolveDiscrepancy,
} from "./time-reconciliation.service";

export const timeReconciliationRouter = router({
  /**
   * Reconcile time records from three sources for a given project and date.
   * Returns a full reconciliation report with matched records, discrepancies,
   * totals per source, and recommendations.
   */
  reconcile: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
        userId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const report = await reconcileTimeRecords({
        projectId: input.projectId,
        date: input.date,
        userId: input.userId,
      });
      return report;
    }),

  /**
   * Get unresolved discrepancies for a project within a date range.
   */
  getDiscrepancies: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        dateRange: z.object({
          start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
          end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
        }),
      })
    )
    .query(async ({ input }) => {
      const discrepancies = await getDiscrepancies({
        projectId: input.projectId,
        dateRange: input.dateRange,
      });
      return discrepancies;
    }),

  /**
   * Resolve a discrepancy by providing a resolution note and adjusted hours.
   */
  resolveDiscrepancy: protectedProcedure
    .input(
      z.object({
        discrepancyId: z.string(),
        resolution: z.string().min(1, "Resolution note is required"),
        adjustedHours: z.number().min(0, "Adjusted hours must be non-negative"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await resolveDiscrepancy({
        discrepancyId: input.discrepancyId,
        resolution: input.resolution,
        adjustedHours: input.adjustedHours,
        resolvedBy: ctx.user.id,
      });
      return result;
    }),
});
