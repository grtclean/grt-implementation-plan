/**
 * 用户Profile服务
 * v1.3.92 - 用户个人设置和任务提醒管理
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// 用户Profile类型定义
export interface UserProfile {
  id?: number;
  userId: string;
  employeeId?: string;
  
  // 工作计划偏好
  workPlanFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  workPlanReminderEnabled: boolean;
  workPlanReminderTime: string;
  
  // 培训计划偏好
  trainingPlanEnabled: boolean;
  trainingReminderDaysBefore: number;
  
  // 项目计划偏好
  projectPlanEnabled: boolean;
  projectMilestoneReminder: boolean;
  
  // 绩效/报告偏好
  performanceReportEnabled: boolean;
  performanceReportFrequency: 'weekly' | 'monthly' | 'quarterly';
  
  // 任务提醒设置
  taskReminderEnabled: boolean;
  taskReminderTime: string;
  taskReminderEmail: boolean;
  taskReminderSystem: boolean;
  
  // 邮件通知设置
  emailNotificationsEnabled: boolean;
  emailDigestFrequency: 'realtime' | 'daily' | 'weekly';
}

// 用户任务类型定义
export interface UserTask {
  id?: number;
  userId: string;
  employeeId?: string;
  taskType: 'work_plan' | 'training' | 'project' | 'performance' | 'report' | 'other';
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  relatedProjectId?: string;
  relatedTrainingId?: string;
  reminderSent?: boolean;
  reminderSentAt?: string;
  createdAt?: string;
  completedAt?: string;
}

// 获取用户Profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM user_profiles WHERE user_id = ${userId}
  `);
  
  if (!(result as any)[0] || ((result as any)[0] as any[]).length === 0) {
    return null;
  }
  
  const row = ((result as any)[0] as any[])[0];
  return mapRowToProfile(row);
}

// 创建或更新用户Profile
export async function upsertUserProfile(profile: Partial<UserProfile> & { userId: string }): Promise<UserProfile> {
  const db = await requireDb();
  
  // 检查是否存在
  const existing = await getUserProfile(profile.userId);
  
  if (existing) {
    // 更新
    await db.execute(sql`
      UPDATE user_profiles SET
        employee_id = ${profile.employeeId || existing.employeeId},
        work_plan_frequency = ${profile.workPlanFrequency || existing.workPlanFrequency},
        work_plan_reminder_enabled = ${profile.workPlanReminderEnabled ?? existing.workPlanReminderEnabled},
        work_plan_reminder_time = ${profile.workPlanReminderTime || existing.workPlanReminderTime},
        training_plan_enabled = ${profile.trainingPlanEnabled ?? existing.trainingPlanEnabled},
        training_reminder_days_before = ${profile.trainingReminderDaysBefore ?? existing.trainingReminderDaysBefore},
        project_plan_enabled = ${profile.projectPlanEnabled ?? existing.projectPlanEnabled},
        project_milestone_reminder = ${profile.projectMilestoneReminder ?? existing.projectMilestoneReminder},
        performance_report_enabled = ${profile.performanceReportEnabled ?? existing.performanceReportEnabled},
        performance_report_frequency = ${profile.performanceReportFrequency || existing.performanceReportFrequency},
        task_reminder_enabled = ${profile.taskReminderEnabled ?? existing.taskReminderEnabled},
        task_reminder_time = ${profile.taskReminderTime || existing.taskReminderTime},
        task_reminder_email = ${profile.taskReminderEmail ?? existing.taskReminderEmail},
        task_reminder_system = ${profile.taskReminderSystem ?? existing.taskReminderSystem},
        email_notifications_enabled = ${profile.emailNotificationsEnabled ?? existing.emailNotificationsEnabled},
        email_digest_frequency = ${profile.emailDigestFrequency || existing.emailDigestFrequency}
      WHERE user_id = ${profile.userId}
    `);
  } else {
    // 创建
    await db.execute(sql`
      INSERT INTO user_profiles (
        user_id, employee_id,
        work_plan_frequency, work_plan_reminder_enabled, work_plan_reminder_time,
        training_plan_enabled, training_reminder_days_before,
        project_plan_enabled, project_milestone_reminder,
        performance_report_enabled, performance_report_frequency,
        task_reminder_enabled, task_reminder_time, task_reminder_email, task_reminder_system,
        email_notifications_enabled, email_digest_frequency
      ) VALUES (
        ${profile.userId}, ${profile.employeeId || null},
        ${profile.workPlanFrequency || 'weekly'}, ${profile.workPlanReminderEnabled ?? true}, ${profile.workPlanReminderTime || '09:00:00'},
        ${profile.trainingPlanEnabled ?? true}, ${profile.trainingReminderDaysBefore ?? 3},
        ${profile.projectPlanEnabled ?? true}, ${profile.projectMilestoneReminder ?? true},
        ${profile.performanceReportEnabled ?? true}, ${profile.performanceReportFrequency || 'monthly'},
        ${profile.taskReminderEnabled ?? true}, ${profile.taskReminderTime || '15:00:00'}, ${profile.taskReminderEmail ?? true}, ${profile.taskReminderSystem ?? true},
        ${profile.emailNotificationsEnabled ?? true}, ${profile.emailDigestFrequency || 'daily'}
      )
    `);
  }
  
  return (await getUserProfile(profile.userId))!;
}

// 获取用户任务列表
export async function getUserTasks(userId: string, options?: {
  status?: string;
  taskType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<UserTask[]> {
  const db = await requireDb();
  
  let query = sql`SELECT * FROM user_tasks WHERE user_id = ${userId}`;
  
  if (options?.status) {
    query = sql`${query} AND status = ${options.status}`;
  }
  if (options?.taskType) {
    query = sql`${query} AND task_type = ${options.taskType}`;
  }
  if (options?.startDate) {
    query = sql`${query} AND due_date >= ${options.startDate}`;
  }
  if (options?.endDate) {
    query = sql`${query} AND due_date <= ${options.endDate}`;
  }
  
  query = sql`${query} ORDER BY due_date ASC, priority DESC`;
  
  const result = await db.execute(query);
  return (((result as any)[0] as any[]) || []).map(mapRowToTask);
}

// 获取今日待完成任务
export async function getTodayTasks(userId: string): Promise<UserTask[]> {
  const db = await requireDb();
  const today = new Date().toISOString().split('T')[0];
  
  const result = await db.execute(sql`
    SELECT * FROM user_tasks 
    WHERE user_id = ${userId} 
    AND due_date = ${today}
    AND status IN ('pending', 'in_progress')
    ORDER BY priority DESC, due_time ASC
  `);
  
  return (((result as any)[0] as any[]) || []).map(mapRowToTask);
}

// 创建用户任务
export async function createUserTask(task: Omit<UserTask, 'id' | 'createdAt'>): Promise<UserTask> {
  const db = await requireDb();
  
  const result = await db.execute(sql`
    INSERT INTO user_tasks (
      user_id, employee_id, task_type, title, description,
      due_date, due_time, priority, status,
      related_project_id, related_training_id
    ) VALUES (
      ${task.userId}, ${task.employeeId || null}, ${task.taskType}, ${task.title}, ${task.description || null},
      ${task.dueDate}, ${task.dueTime || null}, ${task.priority || 'medium'}, ${task.status || 'pending'},
      ${task.relatedProjectId || null}, ${task.relatedTrainingId || null}
    )
  `);
  
  const insertId = ((result as any)[0] as any).insertId;
  return { ...task, id: insertId };
}

// 更新任务状态
export async function updateTaskStatus(taskId: number, status: UserTask['status']): Promise<void> {
  const db = await requireDb();
  
  const completedAt = status === 'completed' ? sql`CURRENT_TIMESTAMP` : sql`NULL`;
  
  await db.execute(sql`
    UPDATE user_tasks SET 
      status = ${status},
      completed_at = ${completedAt}
    WHERE id = ${taskId}
  `);
}

// 获取需要发送提醒的任务
export async function getTasksNeedingReminder(reminderTime: string): Promise<Array<UserTask & { userEmail?: string }>> {
  const db = await requireDb();
  const today = new Date().toISOString().split('T')[0];
  
  const result = await db.execute(sql`
    SELECT t.*, p.task_reminder_email, p.task_reminder_system
    FROM user_tasks t
    LEFT JOIN user_profiles p ON t.user_id = p.user_id
    WHERE t.due_date = ${today}
    AND t.status IN ('pending', 'in_progress')
    AND t.reminder_sent = FALSE
    AND (p.task_reminder_enabled = TRUE OR p.task_reminder_enabled IS NULL)
  `);
  
  return (((result as any)[0] as any[]) || []).map(mapRowToTask);
}

// 标记提醒已发送
export async function markReminderSent(taskId: number): Promise<void> {
  const db = await requireDb();
  
  await db.execute(sql`
    UPDATE user_tasks SET 
      reminder_sent = TRUE,
      reminder_sent_at = CURRENT_TIMESTAMP
    WHERE id = ${taskId}
  `);
}

// 记录提醒日志
export async function logReminder(userId: string, taskId: number, type: 'email' | 'system' | 'sms', status: 'sent' | 'failed', errorMessage?: string): Promise<void> {
  const db = await requireDb();
  
  await db.execute(sql`
    INSERT INTO task_reminder_logs (user_id, task_id, reminder_type, status, error_message)
    VALUES (${userId}, ${taskId}, ${type}, ${status}, ${errorMessage || null})
  `);
}

// 获取逾期任务
export async function getOverdueTasks(userId?: string): Promise<UserTask[]> {
  const db = await requireDb();
  const today = new Date().toISOString().split('T')[0];
  
  let query = sql`
    SELECT * FROM user_tasks 
    WHERE due_date < ${today}
    AND status IN ('pending', 'in_progress')
  `;
  
  if (userId) {
    query = sql`${query} AND user_id = ${userId}`;
  }
  
  query = sql`${query} ORDER BY due_date ASC`;
  
  const result = await db.execute(query);
  return (((result as any)[0] as any[]) || []).map(mapRowToTask);
}

// 辅助函数：映射数据库行到Profile对象
function mapRowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    employeeId: row.employee_id,
    workPlanFrequency: row.work_plan_frequency,
    workPlanReminderEnabled: Boolean(row.work_plan_reminder_enabled),
    workPlanReminderTime: row.work_plan_reminder_time,
    trainingPlanEnabled: Boolean(row.training_plan_enabled),
    trainingReminderDaysBefore: row.training_reminder_days_before,
    projectPlanEnabled: Boolean(row.project_plan_enabled),
    projectMilestoneReminder: Boolean(row.project_milestone_reminder),
    performanceReportEnabled: Boolean(row.performance_report_enabled),
    performanceReportFrequency: row.performance_report_frequency,
    taskReminderEnabled: Boolean(row.task_reminder_enabled),
    taskReminderTime: row.task_reminder_time,
    taskReminderEmail: Boolean(row.task_reminder_email),
    taskReminderSystem: Boolean(row.task_reminder_system),
    emailNotificationsEnabled: Boolean(row.email_notifications_enabled),
    emailDigestFrequency: row.email_digest_frequency,
  };
}

// 辅助函数：映射数据库行到Task对象
function mapRowToTask(row: any): UserTask {
  return {
    id: row.id,
    userId: row.user_id,
    employeeId: row.employee_id,
    taskType: row.task_type,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    dueTime: row.due_time,
    priority: row.priority,
    status: row.status,
    relatedProjectId: row.related_project_id,
    relatedTrainingId: row.related_training_id,
    reminderSent: Boolean(row.reminder_sent),
    reminderSentAt: row.reminder_sent_at,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
