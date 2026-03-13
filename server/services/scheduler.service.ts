/**
 * 定时任务调度服务
 * v1.3.94 - 管理系统中的定时任务
 * 包括：每日邮件提醒、周项目汇总、月成本报表、培训到期提醒
 */

import { requireDb } from "../db";
import { sql, eq, and, inArray } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("scheduler-svc");
import { sendTaskReminderEmails } from "./email-reminder.service";
import { sendEmail, generateHtmlEmail } from "./email.service";
import { notifyOwner } from "../_core/notification";
import { getExternalSyncScheduler } from "./external-sync-scheduler.service";
import { projects } from "../../drizzle/schema";
import { projectAgentReviews } from "../../drizzle/project-agent-schema";
import { submitTask } from "./task-worker.service";

// 定时任务配置
interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  cronExpression: string; // Cron表达式
  handler: () => Promise<TaskExecutionResult>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  category: 'reminder' | 'report' | 'maintenance' | 'sync';
}

// 任务执行结果
interface TaskExecutionResult {
  success: boolean;
  message: string;
  details?: any;
}

// ==================== 任务处理函数 ====================

// 1. 每日任务提醒
async function handleDailyTaskReminder(): Promise<TaskExecutionResult> {
  try {
    const result = await sendTaskReminderEmails();
    return {
      success: true,
      message: `每日任务提醒完成: ${result.sent}/${result.total} 成功`,
      details: result,
    };
  } catch (error) {
    return {
      success: false,
      message: `每日任务提醒失败: ${String(error)}`,
    };
  }
}

// 2. 周项目进度汇总
async function handleWeeklyProjectSummary(): Promise<TaskExecutionResult> {
  const db = await requireDb();
  
  try {
    // 获取本周项目进度数据
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const projectsResult = await db.execute(sql`
      SELECT 
        p.id,
        p.name,
        p.status,
        p.progress,
        p.bu_code,
        COUNT(DISTINCT pt.id) as task_count,
        COUNT(DISTINCT CASE WHEN pt.status = 'completed' THEN pt.id END) as completed_tasks
      FROM projects p
      LEFT JOIN project_tasks pt ON p.id = pt.project_id
      WHERE p.status IN ('active', 'in_progress')
      GROUP BY p.id, p.name, p.status, p.progress, p.bu_code
      ORDER BY p.bu_code, p.name
    `);
    
    const projects = (projectsResult[0] as any[]) || [];
    
    // 按BU分组统计
    const buStats: Record<string, { projects: number; avgProgress: number; tasks: number; completed: number }> = {};
    
    for (const project of projects) {
      const bu = project.bu_code || 'unknown';
      if (!buStats[bu]) {
        buStats[bu] = { projects: 0, avgProgress: 0, tasks: 0, completed: 0 };
      }
      buStats[bu].projects++;
      buStats[bu].avgProgress += Number(project.progress) || 0;
      buStats[bu].tasks += Number(project.task_count) || 0;
      buStats[bu].completed += Number(project.completed_tasks) || 0;
    }
    
    // 计算平均进度
    for (const bu of Object.keys(buStats)) {
      if (buStats[bu].projects > 0) {
        buStats[bu].avgProgress = Math.round(buStats[bu].avgProgress / buStats[bu].projects);
      }
    }
    
    // 生成汇总报告
    const reportContent = `
      <h2>📊 周项目进度汇总报告</h2>
      <p>统计周期: ${weekStart.toLocaleDateString('zh-CN')} - ${new Date().toLocaleDateString('zh-CN')}</p>
      
      <h3>各事业部项目概况</h3>
      <table style="width:100%; border-collapse:collapse; margin:20px 0;">
        <tr style="background:#f5f5f5;">
          <th style="padding:10px; border:1px solid #ddd;">事业部</th>
          <th style="padding:10px; border:1px solid #ddd;">项目数</th>
          <th style="padding:10px; border:1px solid #ddd;">平均进度</th>
          <th style="padding:10px; border:1px solid #ddd;">任务完成率</th>
        </tr>
        ${Object.entries(buStats).map(([bu, stats]) => `
          <tr>
            <td style="padding:10px; border:1px solid #ddd;">${bu}</td>
            <td style="padding:10px; border:1px solid #ddd;">${stats.projects}</td>
            <td style="padding:10px; border:1px solid #ddd;">${stats.avgProgress}%</td>
            <td style="padding:10px; border:1px solid #ddd;">${stats.tasks > 0 ? Math.round(stats.completed / stats.tasks * 100) : 0}%</td>
          </tr>
        `).join('')}
      </table>
      
      <p>总计: ${projects.length} 个活跃项目</p>
    `;
    
    // 发送通知
    await notifyOwner({
      title: '📊 周项目进度汇总报告',
      content: `本周共有 ${projects.length} 个活跃项目。\n\n各事业部统计:\n${Object.entries(buStats).map(([bu, stats]) => `- ${bu}: ${stats.projects}个项目, 平均进度${stats.avgProgress}%`).join('\n')}`,
    });
    
    return {
      success: true,
      message: `周项目汇总完成: ${projects.length} 个项目`,
      details: { projectCount: projects.length, buStats },
    };
  } catch (error) {
    return {
      success: false,
      message: `周项目汇总失败: ${String(error)}`,
    };
  }
}

// 3. 月成本报表生成
async function handleMonthlyCostReport(): Promise<TaskExecutionResult> {
  const db = await requireDb();
  
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // 获取本月成本数据
    const costResult = await db.execute(sql`
      SELECT 
        p.bu_code,
        SUM(c.material_cost) as material_cost,
        SUM(c.labor_cost) as labor_cost,
        SUM(c.overhead_cost) as overhead_cost,
        SUM(c.total_cost) as total_cost,
        COUNT(DISTINCT p.id) as project_count
      FROM projects p
      LEFT JOIN project_costs c ON p.id = c.project_id
      WHERE c.cost_date >= ${monthStart.toISOString().split('T')[0]}
      AND c.cost_date <= ${monthEnd.toISOString().split('T')[0]}
      GROUP BY p.bu_code
    `);
    
    const costs = (costResult[0] as any[]) || [];
    
    // 计算总成本
    let totalMaterial = 0, totalLabor = 0, totalOverhead = 0, totalCost = 0;
    for (const cost of costs) {
      totalMaterial += Number(cost.material_cost) || 0;
      totalLabor += Number(cost.labor_cost) || 0;
      totalOverhead += Number(cost.overhead_cost) || 0;
      totalCost += Number(cost.total_cost) || 0;
    }
    
    // 发送通知
    await notifyOwner({
      title: '💰 月成本报表',
      content: `${now.getFullYear()}年${now.getMonth() + 1}月成本汇总:\n\n- 材料成本: ¥${totalMaterial.toLocaleString()}\n- 人工成本: ¥${totalLabor.toLocaleString()}\n- 管理费用: ¥${totalOverhead.toLocaleString()}\n- 总成本: ¥${totalCost.toLocaleString()}\n\n涉及 ${costs.length} 个事业部`,
    });
    
    return {
      success: true,
      message: `月成本报表生成完成: 总成本 ¥${totalCost.toLocaleString()}`,
      details: { totalMaterial, totalLabor, totalOverhead, totalCost, buCount: costs.length },
    };
  } catch (error) {
    return {
      success: false,
      message: `月成本报表生成失败: ${String(error)}`,
    };
  }
}

// 4. 培训到期提醒
async function handleTrainingExpiryReminder(): Promise<TaskExecutionResult> {
  const db = await requireDb();
  
  try {
    const today = new Date();
    const reminderDays = 7; // 提前7天提醒
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + reminderDays);
    
    // 获取即将到期的培训
    const trainingsResult = await db.execute(sql`
      SELECT 
        t.id,
        t.training_name,
        t.expiry_date,
        e.name as employee_name,
        e.email as employee_email,
        e.department
      FROM employee_trainings t
      JOIN company_employees e ON t.employee_id = e.id
      WHERE t.expiry_date <= ${expiryDate.toISOString().split('T')[0]}
      AND t.expiry_date >= ${today.toISOString().split('T')[0]}
      AND t.reminder_sent = FALSE
      ORDER BY t.expiry_date ASC
    `);
    
    const trainings = (trainingsResult[0] as any[]) || [];
    
    let sentCount = 0;
    for (const training of trainings) {
      try {
        // 发送提醒邮件
        await sendEmail({
          to: training.employee_email,
          subject: `⚠️ 培训到期提醒: ${training.training_name}`,
          html: generateHtmlEmail({
            title: '培训到期提醒',
            greeting: `尊敬的 ${training.employee_name}：`,
            content: `
              <p>您的以下培训即将到期，请及时安排复训：</p>
              <ul>
                <li><strong>培训名称:</strong> ${training.training_name}</li>
                <li><strong>到期日期:</strong> ${training.expiry_date}</li>
              </ul>
              <p>请联系人事部门安排复训时间。</p>
            `,
            ctaButton: {
              text: '查看培训详情',
              url: '/user-profile',
            },
          }),
        });
        
        // 标记已发送
        await db.execute(sql`
          UPDATE employee_trainings SET reminder_sent = TRUE WHERE id = ${training.id}
        `);
        
        sentCount++;
      } catch (error) {
        log.error({ err: error, employeeName: training.employee_name }, "培训提醒发送失败");
      }
    }
    
    // 发送汇总通知给管理员
    if (trainings.length > 0) {
      await notifyOwner({
        title: '📚 培训到期提醒汇总',
        content: `本周有 ${trainings.length} 个培训即将到期:\n\n${trainings.slice(0, 10).map(t => `- ${t.employee_name}: ${t.training_name} (${t.expiry_date})`).join('\n')}${trainings.length > 10 ? `\n... 等共 ${trainings.length} 条` : ''}`,
      });
    }
    
    return {
      success: true,
      message: `培训到期提醒完成: ${sentCount}/${trainings.length} 已发送`,
      details: { total: trainings.length, sent: sentCount },
    };
  } catch (error) {
    return {
      success: false,
      message: `培训到期提醒失败: ${String(error)}`,
    };
  }
}

// 5. 绩效评估提醒
async function handlePerformanceReviewReminder(): Promise<TaskExecutionResult> {
  const db = await requireDb();
  
  try {
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    // 每月25日提醒下月绩效评估
    if (dayOfMonth !== 25) {
      return {
        success: true,
        message: '非绩效提醒日期，跳过执行',
      };
    }
    
    // 获取需要提醒的用户
    const usersResult = await db.execute(sql`
      SELECT 
        p.user_id,
        e.name,
        e.email,
        e.department
      FROM user_profiles p
      JOIN company_employees e ON p.employee_id = e.id
      WHERE p.performance_reminder_enabled = TRUE
    `);
    
    const users = (usersResult[0] as any[]) || [];
    
    let sentCount = 0;
    for (const user of users) {
      try {
        await sendEmail({
          to: user.email,
          subject: '📊 月度绩效评估提醒',
          html: generateHtmlEmail({
            title: '月度绩效评估提醒',
            greeting: `尊敬的 ${user.name}：`,
            content: `
              <p>本月即将结束，请及时完成以下绩效相关工作：</p>
              <ul>
                <li>✅ 完成本月工作总结</li>
                <li>✅ 更新项目进度和成果</li>
                <li>✅ 提交绩效自评</li>
                <li>✅ 准备下月工作计划</li>
              </ul>
              <p>请在月底前完成，避免影响绩效评分。</p>
            `,
            ctaButton: {
              text: '填写绩效自评',
              url: '/user-profile',
            },
          }),
        });
        sentCount++;
      } catch (error) {
        log.error({ err: error, userName: user.name }, "绩效提醒发送失败");
      }
    }
    
    return {
      success: true,
      message: `绩效评估提醒完成: ${sentCount}/${users.length} 已发送`,
      details: { total: users.length, sent: sentCount },
    };
  } catch (error) {
    return {
      success: false,
      message: `绩效评估提醒失败: ${String(error)}`,
    };
  }
}

// 6. 外部平台组织架构同步
async function handleExternalSyncOrgSync(): Promise<TaskExecutionResult> {
  try {
    const scheduler = getExternalSyncScheduler();
    const enabledTasks = await scheduler.getEnabledTasks();

    if (enabledTasks.length === 0) {
      return {
        success: true,
        message: '无启用的简道云同步任务',
      };
    }

    let executedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const task of enabledTasks) {
      try {
        const result = await scheduler.executeTask(task.id, 'schedule');
        if (result.status === 'failed') {
          failedCount++;
          if (result.errorMessage) errors.push(result.errorMessage);
        } else {
          executedCount++;
        }
      } catch (error: any) {
        failedCount++;
        errors.push(`Task ${task.task_name}: ${error.message}`);
      }
    }

    return {
      success: failedCount === 0,
      message: `简道云同步完成: ${executedCount} 成功, ${failedCount} 失败 (共 ${enabledTasks.length} 个任务)`,
      details: { executedCount, failedCount, errors },
    };
  } catch (error) {
    return {
      success: false,
      message: `简道云同步失败: ${String(error)}`,
    };
  }
}

// ==================== 项目延期预测 ====================

async function handleProjectDelayPrediction(): Promise<TaskExecutionResult> {
  try {
    const db = await requireDb();
    const activePhases = ["M4", "M5", "M6", "M7"];
    const activeProjects = await db.select().from(projects)
      .where(and(
        eq(projects.status as any, "active"),
        inArray(projects.currentPhase as any, activePhases),
      ))
      .limit(1000);

    let tasksSubmitted = 0;
    for (const project of activeProjects) {
      try {
        const now = new Date().toISOString();
        const [review] = await db.insert(projectAgentReviews).values({
          projectId: project.id,
          reviewType: "delay_prediction",
          triggerPhase: project.currentPhase || "M5",
          inputSummary: `延期预测: ${project.name} (${project.currentPhase})`,
          status: "pending",
          reviewedBy: "scheduler",
          createdAt: now,
          updatedAt: now,
        }).returning();

        const { taskId } = await submitTask(
          "PROJECT_DELAY_PREDICTION",
          {
            reviewId: review.id,
            projectName: project.name,
            currentPhase: project.currentPhase,
            healthStatus: project.healthStatus,
            budget: project.budget,
            actualCost: project.actualCost,
            completionPercent: project.completionPercent,
          },
          "scheduler",
        );

        await db.update(projectAgentReviews)
          .set({ aiTaskId: taskId })
          .where(eq(projectAgentReviews.id, review.id));

        tasksSubmitted++;
      } catch (err) {
        log.error({ err, projectId: project.id }, "delay prediction failed for project");
      }
    }

    return {
      success: true,
      message: `延期预测完成: 扫描${activeProjects.length}个项目, 提交${tasksSubmitted}个AI任务`,
      details: { projectsScanned: activeProjects.length, tasksSubmitted },
    };
  } catch (error) {
    return {
      success: false,
      message: `延期预测失败: ${String(error)}`,
    };
  }
}

// ==================== 系统定时任务列表 ====================

const scheduledTasks: ScheduledTask[] = [
  {
    id: "daily-task-reminder",
    name: "每日任务提醒",
    description: "每天下午3:00发送当日任务提醒邮件",
    cronExpression: "0 0 15 * * *", // 每天下午3:00
    handler: handleDailyTaskReminder,
    enabled: true,
    category: 'reminder',
  },
  {
    id: "weekly-project-summary",
    name: "周项目进度汇总",
    description: "每周一上午9:00生成项目进度汇总报告",
    cronExpression: "0 0 9 * * 1", // 每周一上午9:00
    handler: handleWeeklyProjectSummary,
    enabled: true,
    category: 'report',
  },
  {
    id: "monthly-cost-report",
    name: "月成本报表",
    description: "每月1日上午8:00生成上月成本报表",
    cronExpression: "0 0 8 1 * *", // 每月1日上午8:00
    handler: handleMonthlyCostReport,
    enabled: true,
    category: 'report',
  },
  {
    id: "training-expiry-reminder",
    name: "培训到期提醒",
    description: "每天上午10:00检查并发送培训到期提醒",
    cronExpression: "0 0 10 * * *", // 每天上午10:00
    handler: handleTrainingExpiryReminder,
    enabled: true,
    category: 'reminder',
  },
  {
    id: "performance-review-reminder",
    name: "绩效评估提醒",
    description: "每月25日提醒员工完成绩效自评",
    cronExpression: "0 0 9 25 * *", // 每月25日上午9:00
    handler: handlePerformanceReviewReminder,
    enabled: true,
    category: 'reminder',
  },
  {
    id: "external-sync-org",
    name: "外部平台组织架构同步",
    description: "每天凌晨2点同步外部平台组织架构（用户/部门/角色/角色成员）",
    cronExpression: "0 0 2 * * *", // 每天凌晨2:00
    handler: handleExternalSyncOrgSync,
    enabled: true,
    category: 'sync',
  },
  {
    id: "project-delay-prediction",
    name: "项目延期风险预测",
    description: "每6小时扫描M4-M7阶段活跃项目，AI预测延期风险",
    cronExpression: "0 0 */6 * * *", // 每6小时
    handler: handleProjectDelayPrediction,
    enabled: true,
    category: 'maintenance',
  },
];

// ==================== 调度器核心函数 ====================

// 解析Cron表达式获取下次执行时间
function parseCronField(field: string, currentValue: number): number {
  if (field === '*') return currentValue;
  // Handle step expression: */N → next multiple of N from current value
  if (field.startsWith('*/')) {
    const step = parseInt(field.substring(2));
    if (!isNaN(step) && step > 0) {
      return Math.ceil((currentValue + 1) / step) * step;
    }
    return currentValue;
  }
  const val = parseInt(field);
  return isNaN(val) ? currentValue : val;
}

function getNextRunTime(cronExpression: string): Date {
  const parts = cronExpression.split(" ");
  if (parts.length !== 6) {
    throw new Error("Invalid cron expression");
  }

  const [seconds, minutes, hours, dayOfMonth, month, dayOfWeek] = parts;
  const now = new Date();
  const next = new Date(now);

  // 设置时间
  next.setSeconds(seconds === '*' ? 0 : parseCronField(seconds, now.getSeconds()));
  next.setMinutes(minutes === '*' ? 0 : parseCronField(minutes, now.getMinutes()));

  // Handle hours — step expressions like */6
  if (hours.startsWith('*/')) {
    const step = parseInt(hours.substring(2));
    const nextHour = Math.ceil((now.getHours() + 1) / step) * step;
    next.setHours(nextHour >= 24 ? step : nextHour);
    next.setMinutes(0);
    next.setSeconds(0);
    if (nextHour >= 24) {
      next.setDate(next.getDate() + 1);
    }
  } else {
    next.setHours(hours === '*' ? 0 : parseInt(hours));
  }

  // 处理日期
  if (dayOfMonth !== '*') {
    next.setDate(parseInt(dayOfMonth));
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  } else if (dayOfWeek !== '*') {
    // 处理星期
    const targetDay = parseInt(dayOfWeek);
    const currentDay = next.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0 || (daysToAdd === 0 && next <= now)) {
      daysToAdd += 7;
    }
    next.setDate(next.getDate() + daysToAdd);
  } else {
    // 每天执行
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

// 检查是否应该执行任务
function shouldRunTask(task: ScheduledTask): boolean {
  if (!task.enabled) return false;
  
  const now = new Date();
  const nextRun = task.nextRun || getNextRunTime(task.cronExpression);
  
  return now >= nextRun;
}

// 执行定时任务检查
export async function checkAndRunScheduledTasks(): Promise<{
  executed: string[];
  skipped: string[];
  errors: { task: string; error: string }[];
}> {
  const executed: string[] = [];
  const skipped: string[] = [];
  const errors: { task: string; error: string }[] = [];
  
  for (const task of scheduledTasks) {
    if (shouldRunTask(task)) {
      try {
        const result = await task.handler();
        task.lastRun = new Date();
        task.nextRun = getNextRunTime(task.cronExpression);
        executed.push(task.name);
      } catch (error) {
        errors.push({
          task: task.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      skipped.push(task.name);
    }
  }
  
  return { executed, skipped, errors };
}

// 获取所有定时任务状态
export function getScheduledTasksStatus(): {
  tasks: {
    id: string;
    name: string;
    description: string;
    cronExpression: string;
    enabled: boolean;
    category: string;
    lastRun?: string;
    nextRun?: string;
  }[];
} {
  return {
    tasks: scheduledTasks.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description,
      cronExpression: task.cronExpression,
      enabled: task.enabled,
      category: task.category,
      lastRun: task.lastRun?.toISOString(),
      nextRun: (task.nextRun || getNextRunTime(task.cronExpression)).toISOString(),
    })),
  };
}

// 启用/禁用定时任务
export function setTaskEnabled(taskId: string, enabled: boolean): boolean {
  const task = scheduledTasks.find((t) => t.id === taskId);
  if (!task) return false;
  
  task.enabled = enabled;
  if (enabled) {
    task.nextRun = getNextRunTime(task.cronExpression);
  }
  return true;
}

// 手动触发定时任务
export async function triggerTask(taskId: string): Promise<TaskExecutionResult> {
  const task = scheduledTasks.find((t) => t.id === taskId);
  if (!task) {
    return { success: false, message: `任务 ${taskId} 不存在` };
  }
  
  try {
    const result = await task.handler();
    task.lastRun = new Date();
    task.nextRun = getNextRunTime(task.cronExpression);
    return result;
  } catch (error) {
    return {
      success: false,
      message: `任务 ${task.name} 执行失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// 更新任务的Cron表达式
export function updateTaskCron(taskId: string, cronExpression: string): boolean {
  const task = scheduledTasks.find((t) => t.id === taskId);
  if (!task) return false;
  
  task.cronExpression = cronExpression;
  task.nextRun = getNextRunTime(cronExpression);
  return true;
}

// 初始化调度器
export function initScheduler(): void {
  log.info("初始化定时任务调度器");
  
  for (const task of scheduledTasks) {
    task.nextRun = getNextRunTime(task.cronExpression);
    log.info({ taskName: task.name, nextRun: task.nextRun.toISOString() }, "任务下次执行时间");
  }
  
  // 每分钟检查一次是否有任务需要执行
  setInterval(async () => {
    const result = await checkAndRunScheduledTasks();
    if (result.errors.length > 0) {
      log.error({ errors: result.errors }, "任务执行错误");
    }
  }, 60 * 1000); // 每分钟检查一次
  
  log.info({ taskCount: scheduledTasks.length }, "定时任务调度器已启动");
}
