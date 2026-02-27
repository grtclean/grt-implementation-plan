import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const newAiAssistantRouter = router({
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

  chat: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return { response: "" };
    }),

  getConfig: publicProcedure.query(() => {
    return { config: null };
  }),

  // ── 前端 AiAssistantPanel.tsx 需要的过程 ──

  getStats: publicProcedure.query(() => {
    return { employeeDigitalAssistants: 0, functionalAssistants: 0, totalSuggestions: 0 };
  }),

  getActiveFunctionalAssistants: publicProcedure.query(() => {
    return [];
  }),

  getEmployeeDA: publicProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(() => {
      return null;
    }),
});
