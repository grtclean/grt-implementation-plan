import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const notificationChannelTestRouter = router({
  list: protectedProcedure.query(() => {
    return emptyListResponse;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(() => {
      return null;
    }),

  create: protectedProcedure
    .input(z.object({ channelType: z.string().optional(), name: z.string().optional(), config: z.record(z.string(), z.unknown()).optional() }))
    .mutation(() => {
      return successResponse;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), config: z.record(z.string(), z.unknown()).optional() }))
    .mutation(() => {
      return successResponse;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(() => {
      return successResponse;
    }),

  testChannel: protectedProcedure
    .input(z.object({ channelId: z.union([z.string(), z.number()]).optional(), message: z.string().optional() }))
    .mutation(() => {
      return { success: true };
    }),

  getTestHistory: protectedProcedure.query(() => {
    return [];
  }),
});
