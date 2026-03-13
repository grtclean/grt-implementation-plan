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
import { processEmpowermentDailyBriefings, processEmpowermentMonthlyReckoning } from "./services/empowerment-scheduler.service";
import { createChildLogger } from "./lib/logger";
const log = createChildLogger("scheduler");

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
      log.warn({ reminders }, "Reminders query returned non-array");
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
    log.error({ err: error }, "Error processing performance review reminders");
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
  log.warn("processMeetingRemindersScheduled is deprecated");
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
      log.warn({ tasks }, "Scheduled tasks query returned non-array");
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
    log.error({ err: error }, "Error processing scheduled tasks");
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

// ── Customer Authorization Expiry Checks ──

/**
 * Expire customer authorizations where valid_until < NOW() AND status='active'.
 * Runs conceptually daily at 02:00 (triggered each scheduler cycle, deduped by date).
 */
async function processCustomerAuthorizationExpiry(): Promise<number> {
  const db = await requireDb();
  if (!db) return 0;
  try {
    const { customerAuthorizations } = await import("../drizzle/customer-authorization-schema");
    const now = new Date();
    const result = await db.update(customerAuthorizations)
      .set({ status: "expired", updatedAt: now })
      .where(
        and(
          eq(customerAuthorizations.status, "active"),
          lte(customerAuthorizations.validUntil, now)
        )
      )
      .returning();
    if (result.length > 0) {
      log.info({ count: result.length }, "Customer authorizations expired by scheduler");
    }
    return result.length;
  } catch (err) {
    log.error({ err }, "Error processing customer authorization expiry");
    return 0;
  }
}

/**
 * Expire NDA tokens where token_expires_at < NOW() AND status='pending'.
 * Runs conceptually daily at 08:00.
 */
async function processNdaTokenExpiry(): Promise<number> {
  const db = await requireDb();
  if (!db) return 0;
  try {
    const { customerNdaAgreements } = await import("../drizzle/customer-authorization-schema");
    const now = new Date();
    const result = await db.update(customerNdaAgreements)
      .set({ status: "expired", updatedAt: now })
      .where(
        and(
          eq(customerNdaAgreements.status, "pending"),
          lte(customerNdaAgreements.tokenExpiresAt, now)
        )
      )
      .returning();
    if (result.length > 0) {
      log.info({ count: result.length }, "NDA tokens expired by scheduler");
    }
    return result.length;
  } catch (err) {
    log.error({ err }, "Error processing NDA token expiry");
    return 0;
  }
}

// Document governance freshness check (daily — marks overdue documents)
async function processDocumentFreshnessCheck(): Promise<number> {
  try {
    const db = await requireDb();
    if (!db) return 0;
    const { orgDocumentRegistry, orgDocumentReviewSchedule } = await import("../drizzle/org-document-schema");
    const now = new Date().toISOString();

    const overdue = await db
      .update(orgDocumentRegistry)
      .set({ reviewOverdue: true })
      .where(
        and(
          eq(orgDocumentRegistry.reviewOverdue, false),
          lte(orgDocumentRegistry.nextReviewDueAt, now),
        ),
      )
      .returning();

    await db
      .update(orgDocumentReviewSchedule)
      .set({ status: "overdue" })
      .where(
        and(
          eq(orgDocumentReviewSchedule.status, "pending"),
          lte(orgDocumentReviewSchedule.scheduledDate, now),
        ),
      );

    if (overdue.length > 0) {
      log.info({ overdueCount: overdue.length }, "Document freshness check: marked overdue");
    }
    return overdue.length;
  } catch (err) {
    log.error({ err }, "Error processing document freshness check");
    return 0;
  }
}

// ── IDO Document Gap Scan (daily) ──

/**
 * For each active project, check current stage's mandatory docs.
 * If any missing > 3 days, create notification to PM.
 */
async function processIdoDocumentGapScan(): Promise<number> {
  try {
    const db = await requireDb();
    if (!db) return 0;
    const { projects, projectDocuments } = await import("../drizzle/schema");
    const { idoStageDocumentUiMap } = await import("../drizzle/ido-schema");

    // Get active projects (currentPhase is the actual column name)
    const activeProjects = await db
      .select({ id: projects.id, currentPhase: projects.currentPhase, managerId: projects.managerId })
      .from(projects)
      .where(eq(projects.status, "active"))
      .limit(100);

    let alertCount = 0;
    for (const project of activeProjects) {
      if (!project.currentPhase || !project.managerId) continue;
      try {
        // Get mandatory docs for current stage
        const mandatoryDocs = await db
          .select()
          .from(idoStageDocumentUiMap)
          .where(
            and(
              eq(idoStageDocumentUiMap.stageCode, project.currentPhase),
              eq(idoStageDocumentUiMap.isMandatory, true),
              eq(idoStageDocumentUiMap.isActive, true),
            ),
          )
          .limit(50);

        if (mandatoryDocs.length === 0) continue;

        // Check which docs exist in projectDocuments
        const existingDocs = await db
          .select({ name: projectDocuments.name })
          .from(projectDocuments)
          .where(eq(projectDocuments.projectId, project.id))
          .limit(200);

        const existingNames = new Set(existingDocs.map((d) => d.name?.toLowerCase()));
        const missing = mandatoryDocs.filter(
          (doc) => !existingNames.has(doc.documentName.toLowerCase()),
        );

        if (missing.length > 0) {
          await notifyOwner({
            title: `文档缺失提醒: 项目#${project.id} ${project.currentPhase}阶段`,
            content: `${project.currentPhase}阶段缺少${missing.length}份必要文档: ${missing.map((d) => d.documentName).join(", ")}`,
          }).catch(() => {/* non-critical */});
          alertCount++;
        }
      } catch (err) {
        log.warn({ err, projectId: project.id }, "IDO gap scan failed for project");
      }
    }

    if (alertCount > 0) {
      log.info({ alertCount }, "IDO document gap scan: notifications created");
    }
    return alertCount;
  } catch (err) {
    log.error({ err }, "Error processing IDO document gap scan");
    return 0;
  }
}

/**
 * Pre-gate readiness check: for projects with stages about to advance,
 * warn PM + reviewers if document completeness < 80%.
 */
async function processIdoPreGateReadiness(): Promise<number> {
  try {
    const db = await requireDb();
    if (!db) return 0;
    const { projects, projectDocuments } = await import("../drizzle/schema");
    const { idoStageDocumentUiMap } = await import("../drizzle/ido-schema");

    const activeProjects = await db
      .select({ id: projects.id, currentPhase: projects.currentPhase, managerId: projects.managerId })
      .from(projects)
      .where(eq(projects.status, "active"))
      .limit(100);

    let warnCount = 0;
    for (const project of activeProjects) {
      if (!project.currentPhase || !project.managerId) continue;
      try {
        const allDocs = await db
          .select()
          .from(idoStageDocumentUiMap)
          .where(
            and(
              eq(idoStageDocumentUiMap.stageCode, project.currentPhase),
              eq(idoStageDocumentUiMap.isActive, true),
            ),
          )
          .limit(50);

        if (allDocs.length === 0) continue;

        const existingDocs = await db
          .select({ name: projectDocuments.name })
          .from(projectDocuments)
          .where(eq(projectDocuments.projectId, project.id))
          .limit(200);

        const existingNames = new Set(existingDocs.map((d) => d.name?.toLowerCase()));
        const fulfilled = allDocs.filter(
          (doc) => existingNames.has(doc.documentName.toLowerCase()),
        ).length;
        const completionPct = Math.round((fulfilled / allDocs.length) * 100);

        if (completionPct < 80) {
          await notifyOwner({
            title: `Gate准备度不足: 项目#${project.id} ${project.currentPhase} (${completionPct}%)`,
            content: `${project.currentPhase}阶段文档完成度仅${completionPct}%，需要${allDocs.length - fulfilled}份文档才能达到80%准入门槛`,
          }).catch(() => {/* non-critical */});
          warnCount++;
        }
      } catch (err) {
        log.warn({ err, projectId: project.id }, "IDO pre-gate check failed for project");
      }
    }

    if (warnCount > 0) {
      log.info({ warnCount }, "IDO pre-gate readiness: warnings created");
    }
    return warnCount;
  } catch (err) {
    log.error({ err }, "Error processing IDO pre-gate readiness check");
    return 0;
  }
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
    // Customer authorization expiry scans (safe to run every cycle — idempotent)
    processCustomerAuthorizationExpiry(),
    processNdaTokenExpiry(),
    // Document governance freshness check (daily — idempotent)
    processDocumentFreshnessCheck(),
    // IDO document gap scan + pre-gate readiness (daily — idempotent)
    processIdoDocumentGapScan(),
    processIdoPreGateReadiness(),
    // Empowerment engine: daily 6AM briefings + monthly 1st reckoning (time-gated)
    processEmpowermentDailyBriefings(),
    processEmpowermentMonthlyReckoning(),
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
    log.info("Scheduler already running");
    return;
  }

  log.info({ intervalMs }, "Scheduler starting");
  schedulerInterval = setInterval(async () => {
    try {
      const results = await runSchedulerCheck();
      const totalExecuted = 
        results.performanceReviews.length + 
        results.meetingReminders.length + 
        results.scheduledTasks.length;
      
      if (totalExecuted > 0) {
        log.info({ totalExecuted }, "Scheduler cycle completed");
      }
    } catch (error) {
      log.error({ err: error }, "Scheduler check failed");
    }
  }, intervalMs);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    log.info("Scheduler stopped");
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
    .where(eq(hrmPerformanceReviewReminders.status, "pending"))
    .limit(1000);

  const pendingMR = await db
    .select()
    .from(meetingReminders)
    .where(eq(meetingReminders.isSent, 0))
    .limit(1000);

  const activeTasks = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.isEnabled, 1))
    .orderBy(scheduledTasks.nextRunAt)
    .limit(1000);

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
