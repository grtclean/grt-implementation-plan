import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

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
  create: requirePermission('system:data:migrate').input(z.object({ sourceField: z.string(), targetField: z.string(), transformRule: z.string().optional() })).mutation(async () => {
    return successResponse;
  }),

  // 更新字段映射
  update: requirePermission('system:data:migrate').input(z.object({ id: z.string(), sourceField: z.string().optional(), targetField: z.string().optional(), transformRule: z.string().optional() })).mutation(async () => {
    return successResponse;
  }),

  // 删除字段映射
  delete: requirePermission('system:data:migrate').input(z.object({ id: z.string() })).mutation(async () => {
    return successResponse;
  }),

  // 获取映射列表
  getMappings: protectedProcedure.query(async () => {
    return [];
  }),

  // 保存映射
  saveMappings: requirePermission('system:data:migrate').input(z.object({ mappings: z.array(z.object({ sourceField: z.string(), targetField: z.string(), transformRule: z.string().optional() })) })).mutation(async () => {
    return successResponse;
  }),

  // 获取推荐映射
  getRecommendations: protectedProcedure.input(z.object({ sourceFormat: z.string().optional(), targetFormat: z.string().optional() }).optional()).query(async () => {
    return [];
  }),
});
