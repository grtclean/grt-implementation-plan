import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const expenseReportSchedulerRouter = router({
  // 报销计划列表
  list: publicProcedure.query(async () => {
    return emptyListResponse;
  }),

  // 获取报销计划详情
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async () => {
    return null;
  }),

  // 创建报销计划
  create: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 更新报销计划
  update: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 删除报销计划
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async () => {
    return successResponse;
  }),

  // 获取调度列表
  getSchedules: publicProcedure.query(async () => {
    return [];
  }),

  // 创建调度
  createSchedule: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 更新调度
  updateSchedule: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 删除调度
  deleteSchedule: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 启停调度
  toggleSchedule: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 立即触发
  triggerNow: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 获取执行历史
  getExecutionHistory: publicProcedure.query(async () => {
    return [];
  }),
});
