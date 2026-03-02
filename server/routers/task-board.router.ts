/**
 * 统一任务看板路由
 * 跨模块任务管理，支持看板视图
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { projectTasks, projects } from "../../drizzle/schema";
import { eq, desc, and, count, sql, inArray } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const taskBoardRouter = router({
  // 任务列表（支持多种筛选）
  list: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    status: z.string().optional(),
    assigneeId: z.number().optional(),
    priority: z.string().optional(),
    phaseCode: z.string().optional(),
    type: z.string().optional(),
    limit: z.number().default(200),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(projectTasks)
      .orderBy(desc(projectTasks.updatedAt))
      .limit(input?.limit ?? 200);

    if (input?.projectId) items = items.filter(t => t.projectId === input.projectId);
    if (input?.status) items = items.filter(t => t.status === input.status);
    if (input?.assigneeId) items = items.filter(t => t.assigneeId === input.assigneeId);
    if (input?.priority) items = items.filter(t => t.priority === input.priority);
    if (input?.phaseCode) items = items.filter(t => t.phaseCode === input.phaseCode);
    if (input?.type) items = items.filter(t => t.type === input.type);

    return { items, total: items.length };
  }),

  // 看板视图（按状态分组）
  kanban: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    assigneeId: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(projectTasks).orderBy(projectTasks.priority).limit(1000);
    if (input?.projectId) items = items.filter(t => t.projectId === input.projectId);
    if (input?.assigneeId) items = items.filter(t => t.assigneeId === input.assigneeId);

    return {
      backlog: items.filter(t => t.status === "backlog"),
      todo: items.filter(t => t.status === "todo"),
      in_progress: items.filter(t => t.status === "in_progress"),
      review: items.filter(t => t.status === "review"),
      done: items.filter(t => t.status === "done"),
    };
  }),

  // 获取任务详情
  getById: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, toNum(input.id))).limit(1000);
    if (!task) return null;
    // Get project info
    const [project] = task.projectId
      ? await db.select({ name: projects.name, projectCode: projects.projectCode }).from(projects).where(eq(projects.id, task.projectId))
      : [null];
    // Get subtasks
    const subtasks = await db.select().from(projectTasks).where(eq(projectTasks.parentTaskId, task.id)).limit(1000);
    return { ...task, project, subtasks };
  }),

  // 创建任务
  create: protectedProcedure.input(z.object({
    projectId: z.number(),
    milestoneId: z.number().optional(),
    phaseCode: z.string().optional(),
    parentTaskId: z.number().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(["task", "issue", "risk", "change"]).default("task"),
    priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
    assigneeId: z.number().optional(),
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    estimatedHours: z.number().optional(),
    acceptanceCriteria: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const taskCode = `TSK-${Date.now().toString(36).toUpperCase()}`;
    const [task] = await db.insert(projectTasks).values({
      taskCode,
      projectId: input.projectId,
      milestoneId: input.milestoneId,
      phaseCode: input.phaseCode,
      parentTaskId: input.parentTaskId,
      name: input.name,
      description: input.description,
      type: input.type,
      priority: input.priority,
      status: "backlog",
      assigneeId: input.assigneeId,
      plannedStartDate: input.plannedStartDate,
      plannedEndDate: input.plannedEndDate,
      estimatedHours: input.estimatedHours,
      acceptanceCriteria: input.acceptanceCriteria,
    }).returning();
    return { success: true, message: "任务已创建", data: task };
  }),

  // 更新任务
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(["task", "issue", "risk", "change"]).optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).optional(),
    status: z.enum(["backlog", "todo", "in_progress", "review", "done", "cancelled"]).optional(),
    assigneeId: z.number().optional(),
    phaseCode: z.string().optional(),
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    actualStartDate: z.string().optional(),
    actualEndDate: z.string().optional(),
    estimatedHours: z.number().optional(),
    actualHours: z.number().optional(),
    completionPercent: z.number().optional(),
    acceptanceCriteria: z.string().optional(),
    remark: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id: _id, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) updates[key] = value;
    }
    // Auto-set dates on status change
    if (input.status === "in_progress" && !input.actualStartDate) {
      updates.actualStartDate = new Date().toISOString();
    }
    if (input.status === "done") {
      updates.actualEndDate = new Date().toISOString();
      updates.completionPercent = 100;
    }
    const [task] = await db.update(projectTasks)
      .set(updates)
      .where(eq(projectTasks.id, toNum(input.id)))
      .returning();
    if (!task) return { success: false, message: "任务不存在" };
    return { success: true, message: "任务已更新", data: task };
  }),

  // 移动任务状态（看板拖拽）— includes QMS safety guard
  moveStatus: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    status: z.enum(["backlog", "todo", "in_progress", "review", "done", "cancelled"]),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    // QMS Safety Guard: field_service tasks require safety checklist before completion
    if (input.status === "done") {
      const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, toNum(input.id))).limit(1000);
      if (task?.taskCategory === "field_service" && !task.safetyChecklistCompleted) {
        throw new Error("现场服务任务关闭前必须完成安全检查清单");
      }
    }
    const updates: Record<string, unknown> = {
      status: input.status,
      updatedAt: new Date().toISOString(),
    };
    if (input.status === "in_progress") updates.actualStartDate = new Date().toISOString();
    if (input.status === "done") {
      updates.actualEndDate = new Date().toISOString();
      updates.completionPercent = 100;
    }
    await db.update(projectTasks)
      .set(updates)
      .where(eq(projectTasks.id, toNum(input.id)));
    return { success: true, message: "状态已更新" };
  }),

  // 删除任务
  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    await db.transaction(async (tx) => {
      // Delete subtasks first
      await tx.delete(projectTasks).where(eq(projectTasks.parentTaskId, numId));
      await tx.delete(projectTasks).where(eq(projectTasks.id, numId));
    });
    return { success: true, message: "任务已删除" };
  }),

  // 批量更新状态
  batchUpdateStatus: protectedProcedure.input(z.object({
    ids: z.array(z.number()),
    status: z.enum(["backlog", "todo", "in_progress", "review", "done", "cancelled"]),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(projectTasks)
      .set({ status: input.status, updatedAt: new Date().toISOString() })
      .where(inArray(projectTasks.id, input.ids));
    return { success: true, message: `${input.ids.length} 个任务状态已更新` };
  }),

  // 任务统计
  getStats: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    assigneeId: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let tasks = await db.select().from(projectTasks).limit(1000);
    if (input?.projectId) tasks = tasks.filter(t => t.projectId === input.projectId);
    if (input?.assigneeId) tasks = tasks.filter(t => t.assigneeId === input.assigneeId);

    const totalEstimated = tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
    const totalActual = tasks.reduce((s, t) => s + (t.actualHours ?? 0), 0);

    return {
      total: tasks.length,
      byStatus: {
        backlog: tasks.filter(t => t.status === "backlog").length,
        todo: tasks.filter(t => t.status === "todo").length,
        in_progress: tasks.filter(t => t.status === "in_progress").length,
        review: tasks.filter(t => t.status === "review").length,
        done: tasks.filter(t => t.status === "done").length,
        cancelled: tasks.filter(t => t.status === "cancelled").length,
      },
      byType: {
        task: tasks.filter(t => t.type === "task").length,
        issue: tasks.filter(t => t.type === "issue").length,
        risk: tasks.filter(t => t.type === "risk").length,
        change: tasks.filter(t => t.type === "change").length,
      },
      byPriority: {
        critical: tasks.filter(t => t.priority === "critical").length,
        high: tasks.filter(t => t.priority === "high").length,
        medium: tasks.filter(t => t.priority === "medium").length,
        low: tasks.filter(t => t.priority === "low").length,
      },
      totalEstimatedHours: totalEstimated,
      totalActualHours: totalActual,
      averageCompletion: tasks.length
        ? Math.round(tasks.reduce((s, t) => s + (t.completionPercent ?? 0), 0) / tasks.length)
        : 0,
    };
  }),

  // 我的任务（当前用户）
  getMyTasks: protectedProcedure.input(z.object({
    assigneeId: z.number(),
    status: z.string().optional(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    let tasks = await db.select().from(projectTasks)
      .where(eq(projectTasks.assigneeId, input.assigneeId))
      .orderBy(projectTasks.priority).limit(1000);
    if (input.status) tasks = tasks.filter(t => t.status === input.status);
    return tasks;
  }),

  // 批量获取项目的任务计数（total + overdue）
  getCountsByProjects: protectedProcedure.input(z.object({
    projectIds: z.array(z.number()),
  })).query(async ({ input }) => {
    if (input.projectIds.length === 0) return {};
    const db = await requireDb();
    const tasks = await db.select().from(projectTasks)
      .where(inArray(projectTasks.projectId, input.projectIds));
    const now = new Date().toISOString();
    const result: Record<number, { total: number; overdue: number }> = {};
    for (const pid of input.projectIds) {
      result[pid] = { total: 0, overdue: 0 };
    }
    for (const t of tasks) {
      if (!result[t.projectId]) result[t.projectId] = { total: 0, overdue: 0 };
      result[t.projectId].total++;
      if (t.plannedEndDate && t.plannedEndDate < now && t.status !== "done" && t.status !== "cancelled") {
        result[t.projectId].overdue++;
      }
    }
    return result;
  }),
});
