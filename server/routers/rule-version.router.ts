import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const ruleVersionRouter = router({
  list: protectedProcedure.query(() => {
    return emptyListResponse;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(() => {
      return null;
    }),

  create: requirePermission('system:naming:manage')
    .input(z.object({ ruleId: z.union([z.string(), z.number()]).optional(), versionNumber: z.number().optional(), description: z.string().optional() }))
    .mutation(() => {
      return successResponse;
    }),

  update: requirePermission('system:naming:manage')
    .input(z.object({ id: z.union([z.string(), z.number()]), description: z.string().optional(), status: z.string().optional() }))
    .mutation(() => {
      return successResponse;
    }),

  delete: requirePermission('system:naming:manage')
    .input(z.object({ id: z.string() }))
    .mutation(() => {
      return successResponse;
    }),

  getAll: protectedProcedure.query(() => {
    return [];
  }),

  compare: protectedProcedure
    .input(z.object({ versionA: z.union([z.string(), z.number()]), versionB: z.union([z.string(), z.number()]) }))
    .query(() => {
      return { comparison: null as any };
    }),

  rollback: requirePermission('system:naming:manage')
    .input(z.object({ ruleId: z.union([z.string(), z.number()]), versionNumber: z.number() }))
    .mutation(() => {
      return successResponse;
    }),
});
