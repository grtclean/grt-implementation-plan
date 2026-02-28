import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };
const emptyListResponse = { items: [] as any[], total: 0, page: 1, pageSize: 10 };

export const reportSchedulerRouter = router({
  // 报表调度列表
  list: protectedProcedure.query(async () => {
    return emptyListResponse;
  }),

  // 获取报表调度详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async () => {
    return null;
  }),

  // 创建报表调度
  create: protectedProcedure.input(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    cronExpression: z.string().max(100).optional(),
    reportTypes: z.array(z.string().max(50)).optional(),
    enabled: z.boolean().optional(),
    recipients: z.array(z.object({
      type: z.string().max(50),
      target: z.string().max(500),
      name: z.string().max(200).optional(),
    })).optional(),
  })).mutation(async () => {
    return successResponse;
  }),

  // 更新报表调度
  update: protectedProcedure.input(z.object({
    id: z.string(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    cronExpression: z.string().max(100).optional(),
    reportTypes: z.array(z.string().max(50)).optional(),
    enabled: z.boolean().optional(),
  })).mutation(async () => {
    return successResponse;
  }),

  // 删除报表调度
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async () => {
    return successResponse;
  }),

  // 获取调度列表
  getSchedules: protectedProcedure.query(async () => {
    return [];
  }),

  // 更新调度
  updateSchedule: protectedProcedure.input(z.object({
    scheduleId: z.string(),
    enabled: z.boolean().optional(),
    cronExpression: z.string().max(100).optional(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    reportTypes: z.array(z.string().max(50)).optional(),
  })).mutation(async () => {
    return successResponse;
  }),

  // 添加接收人
  addRecipient: protectedProcedure.input(z.object({
    scheduleId: z.string(),
    type: z.string().max(50),
    target: z.string().max(500),
    name: z.string().max(200).optional(),
  })).mutation(async () => {
    return successResponse;
  }),

  // 移除接收人
  removeRecipient: protectedProcedure.input(z.object({
    scheduleId: z.string(),
    target: z.string().max(500),
  })).mutation(async () => {
    return successResponse;
  }),

  // 获取发送历史
  getHistory: protectedProcedure.query(async () => {
    return [];
  }),

  // 立即发送
  triggerSend: protectedProcedure.input(z.object({
    scheduleId: z.string(),
  })).mutation(async () => {
    return successResponse;
  }),

  // 预览报表
  previewReport: protectedProcedure.input(z.object({
    reportTypes: z.array(z.string().max(50)),
    period: z.string().max(50),
    format: z.string().max(50).optional(),
  })).mutation(async () => {
    return { preview: "" };
  }),
});
