/**
 * 数字化交接班路由 (Digital Shift Handover Router)
 * Phase 21 P0: US-004
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { analyzeShiftHandover } from "./shiftHandover.service";

export const shiftHandoverRouter = router({
  // US-004: AI交接班风险分析 (mutation — invokes LLM)
  analyze: protectedProcedure
    .input(
      z.object({
        currentShift: z.string().min(1),
        nextShift: z.string().min(1),
        handoverPerson: z.string().min(1),
        productionOutput: z.string().min(1),
        equipmentStatus: z.string().min(1),
        qualityIssues: z.string().optional(),
        abnormalEvents: z.string().optional(),
        pendingTasks: z.string().min(1),
        safetyNotes: z.string().optional(),
        materialStatus: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await analyzeShiftHandover(input);
    }),
});
