/**
 * AI Performance Engine Router — 4-dimension meeting scores
 *
 * Stub router for aiPerformance namespace.
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";

export const aiPerformanceRouter = router({
  getScores: publicProcedure
    .input(
      z.object({
        meetingId: z.number().optional(),
        userId: z.number().optional(),
      }).optional()
    )
    .query(async () => {
      return { items: [], total: 0 };
    }),
});
