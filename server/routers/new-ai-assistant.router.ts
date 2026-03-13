import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

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

  create: requirePermission('ai:assistant:chat')
    .input(z.object({ name: z.string().optional(), type: z.string().optional(), config: z.record(z.string(), jsonValue).optional(), displayName: z.string().optional() }))
    .mutation(() => {
      return successResponse;
    }),

  update: requirePermission('ai:assistant:chat')
    .input(z.object({ id: z.string(), name: z.string().optional(), config: z.record(z.string(), jsonValue).optional(), displayName: z.string().optional() }))
    .mutation(() => {
      return successResponse;
    }),

  delete: requirePermission('ai:assistant:chat')
    .input(z.object({ id: z.string() }))
    .mutation(() => {
      return successResponse;
    }),

  chat: requirePermission('ai:assistant:chat')
    .input(z.object({ message: z.string().optional(), sessionId: z.string().optional() }))
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
