/**
 * 系统定时任务调度路由
 * 管理员可查看/启停/手动触发定时任务
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { createChildLogger } from "../lib/logger";
import { getAllTasks, getTasksByCategory, getEnabledTasks, executeTask, getNextRunDescription } from "../services/scheduled-tasks.service";
import { processBusinessEvent, getSupportedEventTypes, type BusinessEvent } from "../services/finance-event-bridge.service";

const log = createChildLogger("system-scheduler");

export const systemSchedulerRouter = router({
  // 列出所有定时任务
  listTasks: adminProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(({ input }) => {
      const tasks = input.category ? getTasksByCategory(input.category) : getAllTasks();
      return {
        tasks: tasks.map(t => ({
          ...t,
          nextRunDescription: getNextRunDescription(t.schedule),
        })),
        total: tasks.length,
        enabled: tasks.filter(t => t.isEnabled).length,
        categories: ['finance', 'operations', 'hr', 'agent', 'system'],
      };
    }),

  // 手动触发任务
  triggerTask: adminProcedure
    .input(z.object({ taskCode: z.string() }))
    .mutation(async ({ input }) => {
      log.info({ taskCode: input.taskCode }, '手动触发定时任务');
      return executeTask(input.taskCode);
    }),

  // 批量触发某类任务
  triggerCategory: adminProcedure
    .input(z.object({ category: z.string() }))
    .mutation(async ({ input }) => {
      const tasks = getTasksByCategory(input.category).filter(t => t.isEnabled);
      const results = [];
      for (const task of tasks) {
        results.push(await executeTask(task.taskCode));
      }
      return { category: input.category, executed: results.length, results };
    }),

  // 处理业务事件→GL过账
  processFinanceEvent: adminProcedure
    .input(z.object({
      eventType: z.string(),
      sourceDocType: z.string(),
      sourceDocId: z.number(),
      sourceDocCode: z.string(),
      amount: z.number(),
      projectCode: z.string().optional(),
      departmentCode: z.string().optional(),
      costCenterCode: z.string().optional(),
      supplierId: z.number().optional(),
      customerId: z.number().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(({ input, ctx }) => {
      const event: BusinessEvent = {
        ...input,
        eventId: `EVT-${Date.now()}`,
        sourceModule: 'manual',
        userId: (ctx as any).userId || 0,
        timestamp: new Date().toISOString(),
      };
      return processBusinessEvent(event);
    }),

  // 获取支持的事件类型
  getSupportedEventTypes: protectedProcedure.query(() => {
    return { eventTypes: getSupportedEventTypes() };
  }),

  // 调度器仪表盘
  getSchedulerDashboard: adminProcedure.query(async () => {
    const all = getAllTasks();
    const enabled = getEnabledTasks();
    const byCategory = ['finance', 'operations', 'hr', 'agent', 'system'].map(cat => ({
      category: cat,
      total: all.filter(t => t.category === cat).length,
      enabled: enabled.filter(t => t.category === cat).length,
    }));

    // Query recent task executions
    let recentExecutions: any[] = [];
    try {
      const { requireDb } = await import("../db");
      const db = await requireDb();
      const { sql: sqlTag } = await import("drizzle-orm");
      const rows = await db.execute(sqlTag`
        SELECT task_code, task_name, status, duration_ms, result_summary, executed_at
        FROM task_execution_logs
        ORDER BY executed_at DESC
        LIMIT 20
      `);
      recentExecutions = ((rows as any).rows ?? []);
    } catch {
      // Table may not exist yet
    }

    return {
      totalTasks: all.length,
      enabledTasks: enabled.length,
      byCategory,
      recentExecutions,
      nextUpcoming: enabled.slice(0, 5).map(t => ({
        taskCode: t.taskCode,
        taskName: t.taskName,
        nextRun: getNextRunDescription(t.schedule),
      })),
    };
  }),
});
