import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

export const equipmentComplianceRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async () => {
      return { items: [], total: 0 };
    }),
});
