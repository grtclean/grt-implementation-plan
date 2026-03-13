import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

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

  create: requirePermission('hr:employees:edit')
    .input(z.object({ name: z.string().optional(), type: z.string().optional(), config: z.record(z.string(), jsonValue).optional(), employeeId: z.string().optional(), assistantCode: z.string().optional(), displayName: z.string().optional(), workHabits: z.string().optional(), preferences: z.string().optional(), expertise: z.string().optional(), communicationStyle: z.string().optional(), canTaskAssist: z.boolean().optional(), canScheduleManage: z.boolean().optional(), canDocumentDraft: z.boolean().optional(), canDataAnalysis: z.boolean().optional(), canCommunicationProxy: z.boolean().optional() }))
    .mutation(() => {
      return successResponse;
    }),

  update: requirePermission('hr:employees:edit')
    .input(z.object({ id: z.string(), name: z.string().optional(), config: z.record(z.string(), jsonValue).optional(), displayName: z.string().optional(), workHabits: z.string().optional(), preferences: z.string().optional(), expertise: z.string().optional(), communicationStyle: z.string().optional(), canTaskAssist: z.boolean().optional(), canScheduleManage: z.boolean().optional(), canDocumentDraft: z.boolean().optional(), canDataAnalysis: z.boolean().optional(), canCommunicationProxy: z.boolean().optional() }))
    .mutation(() => {
      return successResponse;
    }),

  delete: requirePermission('hr:employees:edit')
    .input(z.object({ id: z.string() }))
    .mutation(() => {
      return successResponse;
    }),

  toggleStatus: requirePermission('hr:employees:edit')
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(() => {
      return successResponse;
    }),

  getMyDA: protectedProcedure.query(() => {
    return { da: null };
  }),

  chat: requirePermission('hr:employees:edit')
    .input(z.object({ message: z.string().optional(), sessionId: z.string().optional() }))
    .mutation(() => {
      return { response: "" };
    }),

  getHistory: protectedProcedure.query(() => {
    return [];
  }),
});
