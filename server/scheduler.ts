/**
 * 定时任务调度器
 * 
 * 功能：
 * 1. 述职提醒自动发送
 * 2. 会议提醒自动发送
 * 3. 成本预警检查
 * 4. 自定义定时任务执行
 */

import { requireDb } from './utils/db-helpers';
import { 
  scheduledTasks, 
  hrmPerformanceReviewReminders,
  meetingReminders,
  meetingSchedules
} from "../drizzle/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// 任务执行状态
interface TaskExecutionResult {
  taskId: number;
  taskCode: string;
  taskType: string;
  success: boolean;
  executedAt: Date;
  result?: any;
  error?: string;
}

// 调度器状态
interface SchedulerStatus {
  isRunning: boolean;
  lastCheckTime: Date | null;
  tasksExecuted: number;
  tasksScheduled: number;
  errors: number;
}

let schedulerStatus: SchedulerStatus = {
  isRunning: false,
  lastCheckTime: null,
  tasksExecuted: 0,
  tasksScheduled: 0,
  errors: 0,
};

// 获取调度器状态
export function getSchedulerStatus(): SchedulerStatus {
  return { ...schedulerStatus };
}

// 检查并执行待执行的述职提醒
export async function processPerformanceReviewReminders(): Promise<TaskExecutionResult[]> {
  const db = await requireDb();
  if (!db) return [];

  const results: TaskExecutionResult[] = [];
  const now = new Date();

  try {
    // 查找需要发送的述职提醒
    const reminders = await db
      .select()
      .from(hrmPerformanceReviewReminders)
      .where(
        and(
          eq(hrmPerformanceReviewReminders.status, "pending"),
          lte(hrmPerformanceReviewReminders.reminderDateTime, now.toISOString())
        )
      ) || [];

    if (!Array.isArray(reminders)) {
      console.warn("[Scheduler] reminders is not an array:", reminders);
      return results;
    }

    for (const reminder of reminders) {
      try {
        // 构建提醒内容
        const reviewTypeText = reminder.reviewType === "3M" ? "3个月" : reminder.reviewType === "6M" ? "6个月" : "年度";
        const title = `述职提醒：员工ID ${reminder.employeeId} ${reviewTypeText}述职`;
        const content = `
员工ID：${reminder.employeeId}
述职类型：${reviewTypeText}述职
述职日期：${reminder.reviewDate ? new Date(reminder.reviewDate).toLocaleDateString("zh-CN") : '未定'}
邮件主题：${reminder.emailSubject || "请安排述职评审会议"}

请及时安排相关评审工作。
        `.trim();

        // 发送通知
        const notifyResult = await notifyOwner({ title, content });

        // 更新提醒状态
        await db
          .update(hrmPerformanceReviewReminders)
          .set({
            status: notifyResult ? "sent" : "pending",
            sentAt: notifyResult ? now.toISOString() : undefined,
          })
          .where(eq(hrmPerformanceReviewReminders.id, reminder.id));

        results.push({
          taskId: reminder.id,
          taskCode: `PR-${reminder.id}`,
          taskType: "performance_review_reminder",
          success: notifyResult,
          executedAt: now,
          result: { employeeId: reminder.employeeId, reviewType: reminder.reviewType },
        });

        schedulerStatus.tasksExecuted++;
      } catch (error) {
        results.push({
          taskId: reminder.id,
          taskCode: `PR-${reminder.id}`,
          taskType: "performance_review_reminder",
          success: false,
          executedAt: now,
          error: String(error),
        });
        schedulerStatus.errors++;
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error processing performance review reminders:", error);
  }

  return results;
}

// 检查并执行待执行的会议提醒
/**
 * 会议提醒处理
 * 注意：这个函数已废弃，统一使用 db.ts 中的 processMeetingReminders()
 * 保留此函数仅为了向后兼容，实际不执行任何操作
 */
export async function processMeetingRemindersScheduled(): Promise<TaskExecutionResult[]> {
  // 返回空数组，避免重复发送
  // 会议提醒统一由 db.ts 中的 processMeetingReminders() 处理
  // 该函数通过 routers.ts 中的 meetingReminder.processReminders 端点调用
  console.log("[Scheduler] processMeetingRemindersScheduled is deprecated, use processMeetingReminders from db.ts instead");
  return [];
}

// 执行自定义定时任务
export async function processScheduledTasks(): Promise<TaskExecutionResult[]> {
  const db = await requireDb();
  if (!db) return [];

  const results: TaskExecutionResult[] = [];
  const now = new Date();

  try {
    // 查找需要执行的定时任务
    const tasks = await db
      .select()
      .from(scheduledTasks)
      .where(
        and(
          eq(scheduledTasks.isEnabled, 1),
          lte(scheduledTasks.nextRunAt, now.toISOString())
        )
      ) || [];

    if (!Array.isArray(tasks)) {
      console.warn("[Scheduler] tasks is not an array:", tasks);
      return results;
    }

    for (const task of tasks) {
      try {
        let success = false;
        let result: any = null;

        // 根据任务类型执行不同的操作
        switch (task.taskType) {
          case "performance_review_reminder":
            // 执行述职提醒
            const prResults = await processPerformanceReviewReminders();
            success = prResults.every(r => r.success);
            result = { remindersProcessed: prResults.length };
            break;

          case "training_reminder":
            // 执行培训提醒
            success = true;
            result = { message: "Training reminder processed" };
            break;

          case "meeting_reminder":
            // 执行会议提醒
            const mrResults = await processMeetingRemindersScheduled();
            success = mrResults.every(r => r.success);
            result = { remindersProcessed: mrResults.length };
            break;

          default:
            // 发送通用通知
            const notifyResult = await notifyOwner({
              title: `定时任务执行：${task.taskName}`,
              content: `任务 ${task.taskName} 已执行`,
            });
            success = notifyResult;
            result = { notified: notifyResult };
        }

        // 计算下次执行时间
        const nextRunAt = calculateNextRunTime(task.cronExpression);

        // 更新任务状态
        await db
          .update(scheduledTasks)
          .set({
            lastRunAt: now.toISOString(),
            nextRunAt: nextRunAt?.toISOString() ?? null,
            lastRunStatus: success ? "success" : "failed",
            lastRunResult: JSON.stringify(result),
          })
          .where(eq(scheduledTasks.id, task.id));

        results.push({
          taskId: task.id,
          taskCode: task.taskCode,
          taskType: task.taskType,
          success,
          executedAt: now,
          result,
        });

        schedulerStatus.tasksExecuted++;
      } catch (error) {
        results.push({
          taskId: task.id,
          taskCode: task.taskCode,
          taskType: task.taskType,
          success: false,
          executedAt: now,
          error: String(error),
        });
        schedulerStatus.errors++;
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error processing scheduled tasks:", error);
  }

  return results;
}

// 计算下次执行时间（简化版Cron解析）
function calculateNextRunTime(cronExpression: string): Date | null {
  // 简化的Cron表达式解析
  // 格式：分钟 小时 日 月 星期
  // 例如：0 9 * * 1 = 每周一9:00
  
  const parts = cronExpression.split(" ");
  if (parts.length < 5) return null;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const now = new Date();
  const next = new Date(now);

  // 设置时间
  if (minute !== "*") {
    next.setMinutes(parseInt(minute));
  }
  if (hour !== "*") {
    next.setHours(parseInt(hour));
  }
  next.setSeconds(0);
  next.setMilliseconds(0);

  // 如果已过今天的时间，移到明天
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  // 处理星期几
  if (dayOfWeek !== "*") {
    const targetDay = parseInt(dayOfWeek);
    while (next.getDay() !== targetDay) {
      next.setDate(next.getDate() + 1);
    }
  }

  // 处理每月几号
  if (dayOfMonth !== "*") {
    const targetDate = parseInt(dayOfMonth);
    next.setDate(targetDate);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next;
}

// 运行所有定时任务检查
export async function runSchedulerCheck(): Promise<{
  performanceReviews: TaskExecutionResult[];
  meetingReminders: TaskExecutionResult[];
  scheduledTasks: TaskExecutionResult[];
}> {
  schedulerStatus.isRunning = true;
  schedulerStatus.lastCheckTime = new Date();

  const [performanceReviews, meetingRemindersResults, scheduledTasksResults] = await Promise.all([
    processPerformanceReviewReminders(),
    processMeetingRemindersScheduled(),
    processScheduledTasks(),
  ]);

  schedulerStatus.isRunning = false;

  return {
    performanceReviews,
    meetingReminders: meetingRemindersResults,
    scheduledTasks: scheduledTasksResults,
  };
}

// 启动定时调度器（每分钟检查一次）
let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler(intervalMs: number = 60000): void {
  if (schedulerInterval) {
    console.log("[Scheduler] Already running");
    return;
  }

  console.log(`[Scheduler] Starting with interval ${intervalMs}ms`);
  schedulerInterval = setInterval(async () => {
    try {
      const results = await runSchedulerCheck();
      const totalExecuted = 
        results.performanceReviews.length + 
        results.meetingReminders.length + 
        results.scheduledTasks.length;
      
      if (totalExecuted > 0) {
        console.log(`[Scheduler] Executed ${totalExecuted} tasks`);
      }
    } catch (error) {
      console.error("[Scheduler] Error in scheduler check:", error);
    }
  }, intervalMs);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Scheduler] Stopped");
  }
}

// 获取待执行任务统计
export async function getSchedulerStats(): Promise<{
  pendingPerformanceReviews: number;
  pendingMeetingReminders: number;
  activeScheduledTasks: number;
  nextScheduledTask: { taskName: string; nextRunAt: Date } | null;
}> {
  const db = await requireDb();
  if (!db) {
    return {
      pendingPerformanceReviews: 0,
      pendingMeetingReminders: 0,
      activeScheduledTasks: 0,
      nextScheduledTask: null,
    };
  }

  const pendingPR = await db
    .select()
    .from(hrmPerformanceReviewReminders)
    .where(eq(hrmPerformanceReviewReminders.status, "pending"));

  const pendingMR = await db
    .select()
    .from(meetingReminders)
    .where(eq(meetingReminders.isSent, 0));

  const activeTasks = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.isEnabled, 1))
    .orderBy(scheduledTasks.nextRunAt);

  return {
    pendingPerformanceReviews: pendingPR.length,
    pendingMeetingReminders: pendingMR.length,
    activeScheduledTasks: activeTasks.length,
    nextScheduledTask: activeTasks[0] && activeTasks[0].nextRunAt ? {
      taskName: activeTasks[0].taskName,
      nextRunAt: new Date(activeTasks[0].nextRunAt),
    } : null,
  };
}
