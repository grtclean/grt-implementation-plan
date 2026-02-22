import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const reportSchedulerRouter = router({
  // 报表调度列表
  list: publicProcedure.query(async () => {
    return emptyListResponse;
  }),

  // 获取报表调度详情
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async () => {
    return null;
  }),

  // 创建报表调度
  create: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 更新报表调度
  update: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 删除报表调度
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async () => {
    return successResponse;
  }),

  // 获取调度列表
  getSchedules: publicProcedure.query(async () => {
    return [];
  }),

  // 更新调度
  updateSchedule: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 添加接收人
  addRecipient: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 移除接收人
  removeRecipient: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 获取发送历史
  getHistory: publicProcedure.query(async () => {
    return [];
  }),

  // 立即发送
  triggerSend: protectedProcedure.input(z.any()).mutation(async () => {
    return successResponse;
  }),

  // 预览报表
  previewReport: protectedProcedure.input(z.any()).mutation(async () => {
    return { preview: "" };
  }),
});
