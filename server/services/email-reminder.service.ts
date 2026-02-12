/**
 * 邮件提醒服务
 * v1.3.92 - 每日任务提醒邮件发送（默认下午3:00）
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// 邮件模板类型
export interface TaskReminderEmail {
  userId: string;
  userName: string;
  email: string;
  tasks: Array<{
    id: number;
    title: string;
    taskType: string;
    priority: string;
    dueTime?: string;
  }>;
  overdueTasks: Array<{
    id: number;
    title: string;
    taskType: string;
    dueDate: string;
  }>;
}

// 获取需要发送提醒的用户和任务
export async function getUsersNeedingReminder(): Promise<TaskReminderEmail[]> {
  const db = await requireDb();
  const today = new Date().toISOString().split('T')[0];
  
  // 获取启用了任务提醒的用户
  const usersResult = await db.execute(sql`
    SELECT DISTINCT 
      p.user_id,
      e.name as user_name,
      e.email
    FROM user_profiles p
    LEFT JOIN company_employees e ON p.employee_id = e.employee_id
    WHERE p.task_reminder_enabled = TRUE
    AND p.task_reminder_email = TRUE
  `);
  
  const users = (usersResult[0] as any[]) || [];
  const result: TaskReminderEmail[] = [];
  
  for (const user of users) {
    // 获取今日任务
    const tasksResult = await db.execute(sql`
      SELECT id, title, task_type, priority, due_time
      FROM user_tasks
      WHERE user_id = ${user.user_id}
      AND due_date = ${today}
      AND status IN ('pending', 'in_progress')
      AND reminder_sent = FALSE
      ORDER BY priority DESC, due_time ASC
    `);
    
    // 获取逾期任务
    const overdueResult = await db.execute(sql`
      SELECT id, title, task_type, due_date
      FROM user_tasks
      WHERE user_id = ${user.user_id}
      AND due_date < ${today}
      AND status IN ('pending', 'in_progress')
      ORDER BY due_date ASC
    `);
    
    const tasks = (tasksResult[0] as any[]) || [];
    const overdueTasks = (overdueResult[0] as any[]) || [];
    
    // 只有有任务的用户才需要发送提醒
    if (tasks.length > 0 || overdueTasks.length > 0) {
      result.push({
        userId: user.user_id,
        userName: user.user_name || '用户',
        email: user.email,
        tasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          taskType: t.task_type,
          priority: t.priority,
          dueTime: t.due_time,
        })),
        overdueTasks: overdueTasks.map(t => ({
          id: t.id,
          title: t.title,
          taskType: t.task_type,
          dueDate: t.due_date,
        })),
      });
    }
  }
  
  return result;
}

// 生成邮件内容
export function generateEmailContent(data: TaskReminderEmail): { subject: string; body: string } {
  const today = new Date().toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });
  
  const taskTypeLabels: Record<string, string> = {
    work_plan: '工作计划',
    training: '培训',
    project: '项目',
    performance: '绩效',
    report: '报告',
    other: '其他',
  };
  
  const priorityLabels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  };
  
  let body = `
尊敬的 ${data.userName}：

您好！以下是您 ${today} 的任务提醒：

`;

  if (data.tasks.length > 0) {
    body += `📋 今日待办任务（${data.tasks.length}项）：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    data.tasks.forEach((task, index) => {
      const priorityEmoji = task.priority === 'urgent' ? '🔴' : 
                           task.priority === 'high' ? '🟠' : 
                           task.priority === 'medium' ? '🟡' : '🟢';
      body += `${index + 1}. ${priorityEmoji} [${taskTypeLabels[task.taskType] || task.taskType}] ${task.title}
   优先级：${priorityLabels[task.priority] || task.priority}${task.dueTime ? ` | 截止时间：${task.dueTime}` : ''}

`;
    });
  }

  if (data.overdueTasks.length > 0) {
    body += `
⚠️ 逾期任务（${data.overdueTasks.length}项）：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    data.overdueTasks.forEach((task, index) => {
      body += `${index + 1}. 🔴 [${taskTypeLabels[task.taskType] || task.taskType}] ${task.title}
   原定日期：${task.dueDate}

`;
    });
  }

  body += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 温馨提示：
- 请及时完成今日任务，避免影响绩效评分
- 逾期任务请尽快处理或联系相关负责人
- 如需调整任务设置，请访问"个人设置"页面

祝您工作顺利！

GRT智能系统
`;

  const subject = data.overdueTasks.length > 0 
    ? `⚠️ 任务提醒：您有${data.tasks.length}项今日任务和${data.overdueTasks.length}项逾期任务`
    : `📋 任务提醒：您有${data.tasks.length}项今日任务待完成`;

  return { subject, body };
}

// 发送任务提醒邮件
export async function sendTaskReminderEmails(): Promise<{
  total: number;
  sent: number;
  failed: number;
  details: Array<{ userId: string; status: 'sent' | 'failed'; error?: string }>;
}> {
  const db = await requireDb();
  const usersToRemind = await getUsersNeedingReminder();
  
  const result = {
    total: usersToRemind.length,
    sent: 0,
    failed: 0,
    details: [] as Array<{ userId: string; status: 'sent' | 'failed'; error?: string }>,
  };
  
  for (const userData of usersToRemind) {
    try {
      const { subject, body } = generateEmailContent(userData);
      
      // 使用系统通知功能发送（实际项目中应替换为邮件服务）
      // TODO: 集成实际的邮件发送服务（如SendGrid、AWS SES等）
      await notifyOwner({
        title: `任务提醒 - ${userData.userName}`,
        content: `${subject}\n\n${body}`,
      });
      
      // 标记任务提醒已发送
      for (const task of userData.tasks) {
        await db.execute(sql`
          UPDATE user_tasks SET 
            reminder_sent = TRUE,
            reminder_sent_at = CURRENT_TIMESTAMP
          WHERE id = ${task.id}
        `);
        
        // 记录提醒日志
        await db.execute(sql`
          INSERT INTO task_reminder_logs (user_id, task_id, reminder_type, status)
          VALUES (${userData.userId}, ${task.id}, 'email', 'sent')
        `);
      }
      
      result.sent++;
      result.details.push({ userId: userData.userId, status: 'sent' });
      
    } catch (error) {
      result.failed++;
      result.details.push({ 
        userId: userData.userId, 
        status: 'failed', 
        error: String(error) 
      });
      
      // 记录失败日志
      for (const task of userData.tasks) {
        await db.execute(sql`
          INSERT INTO task_reminder_logs (user_id, task_id, reminder_type, status, error_message)
          VALUES (${userData.userId}, ${task.id}, 'email', 'failed', ${String(error)})
        `);
      }
    }
  }
  
  return result;
}

// 检查是否到达提醒时间
export function isReminderTime(targetTime: string = '15:00'): boolean {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return currentTime === targetTime;
}

// 获取提醒统计
export async function getReminderStats(): Promise<{
  todayReminders: number;
  pendingReminders: number;
  failedReminders: number;
}> {
  const db = await requireDb();
  const today = new Date().toISOString().split('T')[0];
  
  const statsResult = await db.execute(sql`
    SELECT 
      COUNT(CASE WHEN DATE(sent_at) = ${today} AND status = 'sent' THEN 1 END) as today_sent,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN DATE(sent_at) = ${today} AND status = 'failed' THEN 1 END) as today_failed
    FROM task_reminder_logs
  `);
  
  const stats = (statsResult[0] as any[])[0] || {};
  
  return {
    todayReminders: Number(stats.today_sent) || 0,
    pendingReminders: Number(stats.pending) || 0,
    failedReminders: Number(stats.today_failed) || 0,
  };
}
