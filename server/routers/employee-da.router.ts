import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const employeeDARouter = router({
  list: protectedProcedure.query(() => {
    return [];
  }),

  listFunctional: protectedProcedure.query(() => {
    return [];
  }),

  getById: protectedProcedure
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

  toggleStatus: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return successResponse;
    }),

  getMyDA: protectedProcedure.query(() => {
    return { da: null };
  }),

  chat: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return { response: "" };
    }),

  getHistory: protectedProcedure.query(() => {
    return [];
  }),
});
