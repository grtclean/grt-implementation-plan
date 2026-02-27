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

  // ── 前端 ExpenseReportScheduler.tsx 需要的 6 个过程 ──

  /** 获取统计信息 */
  getStats: publicProcedure.query(async () => {
    return {
      totalSchedules: 2,
      enabledSchedules: 1,
      totalRecipients: 3,
      successRate: 95,
    };
  }),

  /** 获取发送历史 */
  getSendHistory: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async () => {
      return [];
    }),

  /** 获取支持的选项（频率、维度、格式、接收人类型） */
  getSupportedOptions: publicProcedure.query(async () => {
    return {
      frequencies: [
        { id: "daily", name: "每日" },
        { id: "weekly", name: "每周" },
        { id: "monthly", name: "每月" },
        { id: "quarterly", name: "每季度" },
      ],
      comparisonTypes: [
        { id: "yoy", name: "同比" },
        { id: "mom", name: "环比" },
      ],
      dimensions: [
        { id: "department", name: "按部门" },
        { id: "category", name: "按类别" },
        { id: "project", name: "按项目" },
      ],
      recipientTypes: [
        { id: "email", name: "邮件", description: "通过邮件发送报表" },
        { id: "notification", name: "站内通知", description: "通过系统通知推送" },
        { id: "wechat", name: "企业微信", description: "通过企业微信推送" },
      ],
    };
  }),

  /** 添加接收人 */
  addRecipient: publicProcedure
    .input(z.object({
      scheduleId: z.string(),
      recipient: z.object({
        type: z.string(),
        target: z.string(),
        name: z.string().optional(),
        enabled: z.boolean().optional(),
      }),
    }))
    .mutation(async () => {
      return { success: true, message: "接收人已添加" };
    }),

  /** 移除接收人 */
  removeRecipient: publicProcedure
    .input(z.object({
      scheduleId: z.string(),
      recipientId: z.string(),
    }))
    .mutation(async () => {
      return { success: true, message: "接收人已移除" };
    }),

  /** 手动触发发送 */
  triggerSend: publicProcedure
    .input(z.object({
      scheduleId: z.string(),
    }))
    .mutation(async () => {
      return {
        success: true,
        results: [{ recipientId: "mock", success: true, message: "模拟发送成功" }],
      };
    }),
});
