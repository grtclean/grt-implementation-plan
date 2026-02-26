import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";

export const customerNdaRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async () => {
      return { items: [], total: 0 };
    }),
});
