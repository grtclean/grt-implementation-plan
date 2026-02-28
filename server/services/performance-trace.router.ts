/**
 * Performance Trace Router (Task #76)
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as ptSvc from "./performance-trace.service";

export const performanceTraceRouter = router({
  trace: protectedProcedure
    .input(z.object({ userId: z.number(), metric: z.string(), value: z.number(),
      source: z.object({ type: z.string().optional(), id: z.number().optional(), description: z.string().optional(), unit: z.string().optional(), period: z.string().optional() }).optional() }))
    .mutation(async ({ input }) => {
      return ptSvc.tracePerformance(input.userId, input.metric, input.value, input.source);
    }),

  chain: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => { return ptSvc.getPerformanceChain(input.userId); }),

  report: protectedProcedure
    .input(z.object({ userId: z.number(), period: z.string() }))
    .query(async ({ input }) => { return ptSvc.generatePerformanceReport(input.userId, input.period); }),

  teamCompare: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => { return ptSvc.compareTeamPerformance(input.teamId); }),
});