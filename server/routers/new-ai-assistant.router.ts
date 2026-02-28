import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const newAiAssistantRouter = router({
  list: protectedProcedure.query(() => {
    return emptyListResponse;
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

  chat: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return { response: "" };
    }),

  getConfig: protectedProcedure.query(() => {
    return { config: null };
  }),

  // ── 前端 AiAssistantPanel.tsx 需要的过程 ──

  getStats: protectedProcedure.query(() => {
    return { employeeDigitalAssistants: 0, functionalAssistants: 0, totalSuggestions: 0 };
  }),

  getActiveFunctionalAssistants: protectedProcedure.query(() => {
    return [];
  }),

  getEmployeeDA: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(() => {
      return null;
    }),
});
