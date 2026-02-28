/**
 * GRT 5.0 超预算审批 tRPC 路由 (stub)
 *
 * 功能:
 * - 超预算审批列表
 * - 按 ID 查询
 * - 创建/审批/驳回
 * - 待审批列表
 *
 * No DB tables — returns empty/stub data.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const budgetOverrunApprovalRouter = router({
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

  approve: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return successResponse;
    }),

  reject: protectedProcedure
    .input(z.any())
    .mutation(() => {
      return successResponse;
    }),

  getPendingApprovals: protectedProcedure.query(() => {
    return [];
  }),
});
