import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const fieldMappingRouter = router({
  // 字段映射列表
  list: protectedProcedure.query(async () => {
    return emptyListResponse;
  }),

  // 获取字段映射详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async () => {
    return null;
  }),

  // 创建字段映射
  create: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 更新字段映射
  update: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 删除字段映射
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async () => {
    return successResponse;
  }),

  // 获取映射列表
  getMappings: protectedProcedure.query(async () => {
    return [];
  }),

  // 保存映射
  saveMappings: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 获取推荐映射
  getRecommendations: protectedProcedure.input(z.any()).query(async () => {
    return [];
  }),
});
