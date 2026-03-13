/**
 * 定时任务调度路由
 * 管理系统定时任务的API接口
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import {
  getScheduledTasksStatus,
  setTaskEnabled,
  triggerTask,
  updateTaskCron,
  checkAndRunScheduledTasks,
} from "../services/scheduler.service";

// Ring buffer for execution logs
interface ExecutionLogEntry {
  id: string;
  taskId: string;
  taskName: string;
  startTime: string;
  endTime: string | null;
  status: "running" | "success" | "failed";
  duration: number;
  message: string;
}

const executionLogs: ExecutionLogEntry[] = [];
const MAX_LOGS = 50;

export function recordExecution(entry: Omit<ExecutionLogEntry, 'id'>) {
  const log: ExecutionLogEntry = { ...entry, id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
  executionLogs.unshift(log);
  if (executionLogs.length > MAX_LOGS) executionLogs.length = MAX_LOGS;
  return log;
}

export const schedulerRouter = router({
  // 获取所有定时任务状态
  getStatus: protectedProcedure.query(async () => {
    return getScheduledTasksStatus();
  }),

  // 启用/禁用定时任务
  setEnabled: requirePermission('system:scheduler:manage')
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
  trigger: requirePermission('system:scheduler:manage')
    .input(
      z.object({
        taskName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await triggerTask(input.taskName);
    }),

  // 更新任务的Cron表达式
  updateCron: requirePermission('system:scheduler:manage')
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

  // 获取执行日志
  getExecutionLogs: protectedProcedure.query(async () => {
    return { logs: executionLogs };
  }),

  // 立即检查并执行到期的任务
  checkAndRun: requirePermission('system:scheduler:manage').mutation(async () => {
    return await checkAndRunScheduledTasks();
  }),
});
