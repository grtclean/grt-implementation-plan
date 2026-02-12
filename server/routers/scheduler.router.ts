/**
 * 定时任务调度路由
 * 管理系统定时任务的API接口
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getScheduledTasksStatus,
  setTaskEnabled,
  triggerTask,
  updateTaskCron,
  checkAndRunScheduledTasks,
} from "../services/scheduler.service";

export const schedulerRouter = router({
  // 获取所有定时任务状态
  getStatus: protectedProcedure.query(async () => {
    return getScheduledTasksStatus();
  }),

  // 启用/禁用定时任务
  setEnabled: protectedProcedure
    .input(
      z.object({
        taskName: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const success = setTaskEnabled(input.taskName, input.enabled);
      return {
        success,
        message: success
          ? `任务 ${input.taskName} 已${input.enabled ? "启用" : "禁用"}`
          : `任务 ${input.taskName} 不存在`,
      };
    }),

  // 手动触发定时任务
  trigger: protectedProcedure
    .input(
      z.object({
        taskName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await triggerTask(input.taskName);
    }),

  // 更新任务的Cron表达式
  updateCron: protectedProcedure
    .input(
      z.object({
        taskName: z.string(),
        cronExpression: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const success = updateTaskCron(input.taskName, input.cronExpression);
      return {
        success,
        message: success
          ? `任务 ${input.taskName} 的执行时间已更新`
          : `任务 ${input.taskName} 不存在`,
      };
    }),

  // 立即检查并执行到期的任务
  checkAndRun: protectedProcedure.mutation(async () => {
    return await checkAndRunScheduledTasks();
  }),
});
