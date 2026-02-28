/**
 * OKR Engine Router — Objectives & Key Results
 *
 * Provides:
 *   - list: list objectives (legacy stub)
 *   - dashboard: aggregate OKR KPIs (avg progress, level breakdown, etc.)
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

export const okrRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async () => {
      return { items: [], total: 0 };
    }),

  /** Dashboard aggregate KPIs */
  dashboard: protectedProcedure
    .query(async () => {
      return {
        totalObjectives: 0,
        avgProgress: 0,
        onTrack: 0,
        atRisk: 0,
        behind: 0,
        companyLevel: 0,
        buLevel: 0,
        deptLevel: 0,
        teamLevel: 0,
      };
    }),
});
