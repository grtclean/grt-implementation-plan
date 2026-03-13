/**
 * SOP工艺卡片编辑器路由 (SOP Process Card Editor Router)
 * Phase 21 P0: US-005
 */

import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { generateProcessCard } from "./sopEditor.service";

export const sopEditorRouter = router({
  // US-005: AI工艺卡片生成 (mutation — invokes LLM)
  generateCard: protectedProcedure
    .input(
      z.object({
        productType: z.string().min(1),
        workpieceDescription: z.string().min(1),
        cleaningMethod: z.string().min(1),
        cleanlinessTarget: z.string().min(1),
        materialType: z.string().optional(),
        batchSize: z.number().optional(),
        specialRequirements: z.string().optional(),
        existingSOPReference: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await generateProcessCard(input);
    }),
});
