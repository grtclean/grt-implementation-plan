import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const hrLifecycleRouter = router({
  // 员工生命周期列表
  list: protectedProcedure.query(async () => {
    return emptyListResponse;
  }),

  // 获取生命周期详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async () => {
    return null;
  }),

  // 创建生命周期记录
  create: requirePermission('hr:lifecycle:view').input(z.object({ employeeId: z.union([z.string(), z.number()]), stage: z.string().optional(), notes: z.string().optional() })).mutation(async () => {
    return successResponse;
  }),

  // 更新生命周期记录
  update: requirePermission('hr:lifecycle:view').input(z.object({ id: z.string(), stage: z.string().optional(), notes: z.string().optional() })).mutation(async () => {
    return successResponse;
  }),

  // 删除生命周期记录
  delete: requirePermission('hr:lifecycle:view').input(z.object({ id: z.string() })).mutation(async () => {
    return successResponse;
  }),

  // 获取阶段列表
  getStages: protectedProcedure.query(async () => {
    return [];
  }),

  // 获取员工生命周期
  getEmployeeLifecycle: protectedProcedure.input(z.object({ employeeId: z.union([z.string(), z.number()]) })).query(async () => {
    return { lifecycle: null };
  }),

  // 更新阶段
  updateStage: requirePermission('hr:lifecycle:view').input(z.object({ lifecycleId: z.union([z.string(), z.number()]), stage: z.string() })).mutation(async () => {
    return successResponse;
  }),
});
