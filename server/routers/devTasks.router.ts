import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createDevTask,
  getAllDevTasks,
  getDevTaskById,
  updateDevTask,
  deleteDevTask,
  initDefaultDevTasks,
} from "../db";

/**
 * DevTasks Router - 开发任务管理
 * 提供开发任务的CRUD操作和初始化功能
 */
export const devTasksRouter = router({
  // 列表查询 - 返回数组格式
  list: protectedProcedure
    .input(
      z.object({
        version: z.string().optional(),
        module: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const tasks = await getAllDevTasks(input || {});
        // 确保返回数组格式
        return Array.isArray(tasks) ? tasks : [];
      } catch (error) {
        console.error("[devTasks.list] Error:", error);
        return [];
      }
    }),

  // 根据ID获取单个任务
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getDevTaskById(input.id);
      } catch (error) {
        console.error("[devTasks.getById] Error:", error);
        return null;
      }
    }),

  // 创建任务
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        version: z.string(),
        module: z.string(),
        type: z.enum(["feature", "bugfix", "refactor", "docs", "test"]).default("feature"),
        priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
        estimatedHours: z.number().optional(),
        claudePrompt: z.string().optional(),
        acceptanceCriteria: z.string().optional(),
        assignee: z.string().optional(),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await createDevTask({
          title: input.title,
          description: input.description || null,
          version: input.version,
          module: input.module,
          type: input.type,
          priority: input.priority,
          estimatedHours: input.estimatedHours || null,
          claudePrompt: input.claudePrompt || null,
          acceptanceCriteria: input.acceptanceCriteria || null,
          dueDate: input.dueDate || null,
          status: "backlog",
        });
        return result;
      } catch (error) {
        console.error("[devTasks.create] Error:", error);
        throw error;
      }
    }),

  // 更新任务
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        version: z.string().optional(),
        module: z.string().optional(),
        type: z.enum(["feature", "bugfix", "refactor", "docs", "test"]).optional(),
        priority: z.enum(["critical", "high", "medium", "low"]).optional(),
        status: z.enum(["backlog", "todo", "in_progress", "review", "done"]).optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        claudePrompt: z.string().optional(),
        acceptanceCriteria: z.string().optional(),
        assignee: z.string().optional(),
        dueDate: z.string().optional(),
        startDate: z.string().optional(),
        completedDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, startDate, completedDate, dueDate, ...data } = input;
        const updateData: any = { ...data };

        if (startDate) {
          updateData.startDate = new Date(startDate);
        }
        if (completedDate) {
          updateData.completedDate = new Date(completedDate);
        }
        if (dueDate) {
          updateData.dueDate = new Date(dueDate);
        }
        
        return await updateDevTask(id, updateData);
      } catch (error) {
        console.error("[devTasks.update] Error:", error);
        throw error;
      }
    }),

  // 删除任务
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        return await deleteDevTask(input.id);
      } catch (error) {
        console.error("[devTasks.delete] Error:", error);
        throw error;
      }
    }),

  // 初始化默认任务
  init: protectedProcedure.mutation(async () => {
    try {
      return await initDefaultDevTasks();
    } catch (error) {
      console.error("[devTasks.init] Error:", error);
      throw error;
    }
  }),

  // 批量删除测试任务
  deleteTestTasks: protectedProcedure.mutation(async () => {
    try {
      const tasks = await getAllDevTasks({});
      const testTasks = tasks.filter((task: any) => 
        task.title?.toLowerCase().includes('test task') || 
        task.title?.toLowerCase().includes('task to update')
      );
      
      let deletedCount = 0;
      for (const task of testTasks) {
        await deleteDevTask(task.id);
        deletedCount++;
      }
      
      return { 
        success: true, 
        deletedCount,
        message: `成功删除 ${deletedCount} 个测试任务`
      };
    } catch (error) {
      console.error("[devTasks.deleteTestTasks] Error:", error);
      throw error;
    }
  }),
});
