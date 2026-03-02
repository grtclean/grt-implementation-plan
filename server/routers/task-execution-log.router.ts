import { z } from "zod";
import { jsonValue } from "@shared/validators";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { taskExecutionLogs } from "../../drizzle/schema";
import { eq, desc, count, sql, lt } from "drizzle-orm";

export const taskExecutionLogRouter = router({
  // 日志列表
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(taskExecutionLogs).orderBy(desc(taskExecutionLogs.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取日志详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(taskExecutionLogs).where(eq(taskExecutionLogs.id, parseInt(input.id))).limit(1000);
    return item || null;
  }),

  // 创建日志
  create: protectedProcedure.input(z.object({
    taskId: z.string().optional(),
    taskName: z.string().optional(),
    taskType: z.string().optional(),
    cronExpression: z.string().optional(),
    status: z.string().optional(),
    inputParams: jsonValue.optional(),
    triggeredBy: z.string().optional(),
    metadata: jsonValue.optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [log] = await db.insert(taskExecutionLogs).values({
      taskId: input.taskId || `task-${Date.now()}`,
      taskName: input.taskName || "未命名任务",
      taskType: input.taskType || "cron",
      cronExpression: input.cronExpression,
      status: input.status || "running",
      startTime: new Date(),
      inputParams: input.inputParams ? JSON.stringify(input.inputParams) : undefined,
      triggeredBy: input.triggeredBy || "system",
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    }).returning();
    return { success: true, message: "日志已创建", data: log };
  }),

  // 更新日志
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    status: z.string().optional(),
    endTime: z.string().optional(),
    duration: z.number().optional(),
    outputResult: jsonValue.optional(),
    errorMessage: z.string().optional(),
    errorStack: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const updates: Record<string, unknown> = {};
    if (input.status !== undefined) updates.status = input.status;
    if (input.endTime !== undefined) updates.endTime = new Date(input.endTime);
    if (input.duration !== undefined) updates.duration = input.duration;
    if (input.outputResult !== undefined) updates.outputResult = typeof input.outputResult === "string" ? input.outputResult : JSON.stringify(input.outputResult);
    if (input.errorMessage !== undefined) updates.errorMessage = input.errorMessage;
    if (input.errorStack !== undefined) updates.errorStack = input.errorStack;

    const [log] = await db.update(taskExecutionLogs)
      .set(updates)
      .where(eq(taskExecutionLogs.id, id))
      .returning();
    return { success: true, message: "更新成功", data: log };
  }),

  // 删除日志
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(taskExecutionLogs).where(eq(taskExecutionLogs.id, parseInt(input.id)));
    return { success: true, message: "删除成功" };
  }),

  // 统计
  getStats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [total] = await db.select({ count: count() }).from(taskExecutionLogs);
    const [running] = await db.select({ count: count() }).from(taskExecutionLogs).where(eq(taskExecutionLogs.status, "running"));
    const [completed] = await db.select({ count: count() }).from(taskExecutionLogs).where(eq(taskExecutionLogs.status, "completed"));
    const [failed] = await db.select({ count: count() }).from(taskExecutionLogs).where(eq(taskExecutionLogs.status, "failed"));
    return {
      stats: {
        total: total.count,
        running: running.count,
        completed: completed.count,
        failed: failed.count,
      },
    };
  }),

  // 导出CSV
  exportCSV: protectedProcedure.mutation(async () => {
    const db = await requireDb();
    const logs = await db.select().from(taskExecutionLogs).orderBy(desc(taskExecutionLogs.createdAt)).limit(1000);
    // Return data for client-side CSV generation
    return { url: "", data: logs };
  }),

  // 清理旧日志
  cleanup: protectedProcedure.input(z.object({
    daysToKeep: z.number().int().min(1).max(365).optional(),
  }).optional()).mutation(async ({ input }) => {
    const db = await requireDb();
    const daysToKeep = input?.daysToKeep || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    await db.delete(taskExecutionLogs).where(lt(taskExecutionLogs.createdAt, cutoff));
    return { success: true, message: `已清理 ${daysToKeep} 天前的日志` };
  }),
});
