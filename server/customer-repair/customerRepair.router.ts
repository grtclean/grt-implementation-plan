/**
 * 客户自助报修路由 (Customer Self-Service Repair Router)
 * Phase 21 P0: US-006
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { triageRepairRequest } from "./customerRepair.service";

export const customerRepairRouter = router({
  // US-006: 报修智能分诊 (mutation — invokes LLM)
  triage: protectedProcedure
    .input(
      z.object({
        customerName: z.string().min(1),
        equipmentModel: z.string().min(1),
        serialNumber: z.string().optional(),
        faultDescription: z.string().min(1),
        errorCodes: z.string().optional(),
        faultPhotos: z.string().optional(),
        operatingEnvironment: z.string().optional(),
        urgencyLevel: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await triageRepairRequest(input);
    }),
});
