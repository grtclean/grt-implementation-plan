import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const deadlockMonitorRouter = router({
  // 死锁监控列表
  list: protectedProcedure.query(async () => {
    return emptyListResponse;
  }),

  // 获取死锁详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async () => {
    return null;
  }),

  // 创建监控规则
  create: requirePermission('system:monitoring:view').input(z.object({ name: z.string().optional(), resourceType: z.string().optional(), threshold: z.number().optional() })).mutation(async () => {
    return successResponse;
  }),

  // 更新监控规则
  update: requirePermission('system:monitoring:view').input(z.object({ id: z.string(), name: z.string().optional(), threshold: z.number().optional(), isActive: z.boolean().optional() })).mutation(async () => {
    return successResponse;
  }),

  // 删除监控规则
  delete: requirePermission('system:monitoring:view').input(z.object({ id: z.string() })).mutation(async () => {
    return successResponse;
  }),

  // 获取监控状态
  getStatus: protectedProcedure.query(async () => {
    return { status: "ok" };
  }),

  // 获取死锁列表
  getDeadlocks: protectedProcedure.query(async () => {
    return [];
  }),

  // 解决死锁
  resolveDeadlock: requirePermission('system:monitoring:view').input(z.object({ id: z.union([z.string(), z.number()]), resolution: z.string().optional() })).mutation(async () => {
    return successResponse;
  }),

  // 获取历史记录
  getHistory: protectedProcedure.query(async () => {
    return [];
  }),
});
