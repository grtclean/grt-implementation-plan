import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const ruleVersionRouter = router({
  list: publicProcedure.query(() => {
    return emptyListResponse;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(() => {
      return null;
    }),

  create: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return successResponse;
    }),

  update: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return successResponse;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(() => {
      return successResponse;
    }),

  getAll: publicProcedure.query(() => {
    return [];
  }),

  compare: publicProcedure
    .input(z.any())
    .query(() => {
      return { comparison: null as any };
    }),

  rollback: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return successResponse;
    }),
});
