/**
 * Smart Cockpit — Task Cockpit Router
 * Time tracking, prerequisites checking, and categorized task management.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { projectTasks, taskTimeSessions, taskPrerequisites } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const taskCockpitRouter = router({
  // Fetch tasks grouped by category for a project
  getTasksForCockpit: protectedProcedure.input(z.object({
    projectId: z.number(),
    assigneeId: z.number().optional(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    let tasks = await db.select().from(projectTasks)
      .where(eq(projectTasks.projectId, input.projectId))
      .orderBy(desc(projectTasks.updatedAt));
    if (input.assigneeId) tasks = tasks.filter(t => t.assigneeId === input.assigneeId);

    const grouped = {
      milestone: tasks.filter(t => t.taskCategory === "milestone"),
      approval: tasks.filter(t => t.taskCategory === "approval"),
      hr_training: tasks.filter(t => t.taskCategory === "hr_training"),
      field_service: tasks.filter(t => t.taskCategory === "field_service"),
      other: tasks.filter(t => !t.taskCategory || !["milestone", "approval", "hr_training", "field_service"].includes(t.taskCategory)),
    };
    return grouped;
  }),

  // Start a time tracking session
  startTimer: protectedProcedure.input(z.object({
    taskId: z.union([z.string(), z.number()]),
    projectId: z.number(),
    phaseCode: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    // Close any active session for this user
    const activeSessions = await db.select().from(taskTimeSessions)
      .where(and(eq(taskTimeSessions.userId, ctx.user.id), eq(taskTimeSessions.isActive, true)));
    for (const session of activeSessions) {
      const now = new Date();
      const started = new Date(session.startedAt);
      const durationMin = Math.round((now.getTime() - started.getTime()) / 60000);
      await db.update(taskTimeSessions)
        .set({ isActive: false, endedAt: now.toISOString(), durationMin, updatedAt: now.toISOString() })
        .where(eq(taskTimeSessions.id, session.id));
    }
    // Open new session
    const [newSession] = await db.insert(taskTimeSessions).values({
      taskId: toNum(input.taskId),
      projectId: input.projectId,
      userId: ctx.user.id,
      phaseCode: input.phaseCode ?? null,
      startedAt: new Date().toISOString(),
      isActive: true,
    }).returning();
    return { success: true, session: newSession };
  }),

  // Stop the active timer
  stopTimer: protectedProcedure.input(z.object({
    sessionId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [session] = await db.select().from(taskTimeSessions)
      .where(eq(taskTimeSessions.id, input.sessionId));
    if (!session) return { success: false, message: "计时会话不存在" };
    if (!session.isActive) return { success: false, message: "计时已停止" };

    const now = new Date();
    const started = new Date(session.startedAt);
    const durationMin = Math.round((now.getTime() - started.getTime()) / 60000);

    await db.update(taskTimeSessions)
      .set({ isActive: false, endedAt: now.toISOString(), durationMin, updatedAt: now.toISOString() })
      .where(eq(taskTimeSessions.id, input.sessionId));

    // Accumulate into projectTasks.actualHours
    const [task] = await db.select().from(projectTasks)
      .where(eq(projectTasks.id, session.taskId));
    if (task) {
      const currentHours = task.actualHours ?? 0;
      const addedHours = Math.round(durationMin / 60 * 10) / 10; // round to 0.1h
      await db.update(projectTasks)
        .set({ actualHours: Math.round(currentHours + addedHours), updatedAt: now.toISOString() })
        .where(eq(projectTasks.id, session.taskId));
    }

    return { success: true, durationMin };
  }),

  // Get the currently running timer for a user
  getActiveSession: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const [session] = await db.select().from(taskTimeSessions)
      .where(and(eq(taskTimeSessions.userId, ctx.user.id), eq(taskTimeSessions.isActive, true)))
      .limit(1);
    return session ?? null;
  }),

  // Check prerequisites for completing a task
  checkPrerequisites: protectedProcedure.input(z.object({
    taskId: z.union([z.string(), z.number()]),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const [task] = await db.select().from(projectTasks)
      .where(eq(projectTasks.id, toNum(input.taskId)));
    if (!task) return { canComplete: false, blockers: [{ message: "任务不存在" }], warnings: [] };

    const blockers: { message: string }[] = [];
    const warnings: { message: string }[] = [];

    // Load prerequisite rules matching this task's category and phase
    if (task.taskCategory && task.phaseCode) {
      const rules = await db.select().from(taskPrerequisites)
        .where(and(
          eq(taskPrerequisites.taskType, task.taskCategory),
          eq(taskPrerequisites.phaseCode, task.phaseCode),
          eq(taskPrerequisites.isActive, true),
        ));
      for (const rule of rules) {
        // field_value check: safety_checklist_completed
        if (rule.checkType === "field_value" && rule.requiredColumnName === "safety_checklist_completed") {
          if (!task.safetyChecklistCompleted) {
            if (rule.severity === "hard") blockers.push({ message: rule.errorMessage });
            else warnings.push({ message: rule.errorMessage });
          }
        }
        // task_status check: another task type must be done
        if (rule.checkType === "task_status" && rule.requiredTaskType) {
          const relatedTasks = await db.select().from(projectTasks)
            .where(and(
              eq(projectTasks.projectId, task.projectId),
              eq(projectTasks.taskCategory, rule.requiredTaskType),
            ));
          const allDone = relatedTasks.length > 0 && relatedTasks.every(t => t.status === (rule.requiredTaskStatus ?? "done"));
          if (!allDone) {
            if (rule.severity === "hard") blockers.push({ message: rule.errorMessage });
            else warnings.push({ message: rule.errorMessage });
          }
        }
        // gate_checklist check: placeholder (checks against stageGate module)
        if (rule.checkType === "gate_checklist") {
          // Future: query project_gate_checklists to verify gate passed
          // For now, this is a soft-check placeholder
          warnings.push({ message: rule.errorMessage + " (待门径集成)" });
        }
      }
    }

    // Built-in: field_service always needs safety checklist
    if (task.taskCategory === "field_service" && !task.safetyChecklistCompleted) {
      const already = blockers.some(b => b.message.includes("安全检查"));
      if (!already) blockers.push({ message: "现场服务任务需先完成安全检查清单" });
    }

    return { canComplete: blockers.length === 0, blockers, warnings };
  }),

  // Complete a task (with server-side prerequisite enforcement)
  completeTask: protectedProcedure.input(z.object({
    taskId: z.union([z.string(), z.number()]),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.taskId);
    const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, numId));
    if (!task) return { success: false, message: "任务不存在" };

    // QMS Safety Guard
    if (task.taskCategory === "field_service" && !task.safetyChecklistCompleted) {
      throw new Error("现场服务任务关闭前必须完成安全检查清单");
    }

    await db.update(projectTasks).set({
      status: "done",
      actualEndDate: new Date().toISOString(),
      completionPercent: 100,
      updatedAt: new Date().toISOString(),
    }).where(eq(projectTasks.id, numId));

    return { success: true, message: "任务已完成" };
  }),

  // Seed prerequisite rules (idempotent — skips if rules exist)
  seedPrerequisites: protectedProcedure.mutation(async () => {
    const db = await requireDb();
    const existing = await db.select().from(taskPrerequisites);
    if (existing.length > 0) return { success: true, message: "规则已存在，跳过播种", count: existing.length };

    const rules = [
      { taskType: "procurement", phaseCode: "M5", description: "采购任务需BOM在M4门禁审批通过", checkType: "gate_checklist", requiredGateStage: "M4", requiredCheckItem: "BOM审批", errorMessage: "无法采购：BOM尚未在M4门禁中审批通过", severity: "hard" },
      { taskType: "field_service", phaseCode: "M10", description: "现场服务需安全检查清单完成", checkType: "field_value", requiredTableName: "project_tasks", requiredColumnName: "safety_checklist_completed", errorMessage: "现场服务任务需先完成安全检查清单", severity: "hard" },
      { taskType: "field_service", phaseCode: "M11", description: "SAT验收需安全检查清单完成", checkType: "field_value", requiredTableName: "project_tasks", requiredColumnName: "safety_checklist_completed", errorMessage: "SAT验收需先完成安全检查清单", severity: "hard" },
      { taskType: "production", phaseCode: "M5", description: "生产启动需设计评审任务已完成", checkType: "task_status", requiredTaskType: "milestone", requiredTaskStatus: "done", errorMessage: "生产启动需设计评审任务已完成", severity: "hard" },
      { taskType: "shipping", phaseCode: "M8", description: "发货前需FAT验收门禁通过", checkType: "gate_checklist", requiredGateStage: "M7", requiredCheckItem: "FAT验收", errorMessage: "发货前需FAT验收(M7)门禁通过", severity: "hard" },
    ];
    await db.insert(taskPrerequisites).values(rules);
    return { success: true, message: "已播种5条前置条件规则", count: 5 };
  }),

  // Toggle safety checklist completed flag
  setSafetyChecklistComplete: protectedProcedure.input(z.object({
    taskId: z.union([z.string(), z.number()]),
    completed: z.boolean(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(projectTasks).set({
      safetyChecklistCompleted: input.completed,
      updatedAt: new Date().toISOString(),
    }).where(eq(projectTasks.id, toNum(input.taskId)));
    return { success: true };
  }),
});
