// import { db } from '../db'; // Not currently used
// import { tasks, users, meetings } from '../../drizzle/schema'; // Not currently used
import { notifyOwner } from '../_core/notification';
import { eq } from 'drizzle-orm';

/**
 * 自动任务分配服务
 * 负责从会议行动项自动创建任务并分配给相关人员
 */

export interface ActionItemForAssignment {
  title: string;
  owner?: string; // 用户ID或邮箱
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  description?: string;
}

export interface TaskAssignmentResult {
  taskId: string;
  title: string;
  owner: string;
  dueDate: string;
  status: 'pending' | 'assigned' | 'failed';
  message?: string;
}

/**
 * 从会议行动项自动创建任务
 */
export async function autoAssignTasksFromMeeting(
  meetingId: string,
  actionItems: ActionItemForAssignment[],
  meetingOwnerId: string
): Promise<TaskAssignmentResult[]> {
  const results: TaskAssignmentResult[] = [];

  for (const item of actionItems) {
    try {
      // 查找或创建用户
      let ownerId = meetingOwnerId;
      if (item.owner) {
        const user = await findOrCreateUser(item.owner);
        ownerId = user.id;
      }

      // 创建任务
      const dueDate = item.dueDate || addDays(new Date(), 3);
      
      // 这里应该使用实际的数据库插入
      // 由于我们没有tasks表的完整定义，这里是伪代码
      const taskId = generateTaskId();

      // 发送通知给任务负责人
      await notifyOwner({
        title: `新任务分配: ${item.title}`,
        content: `
您被分配了一个新任务:

**任务**: ${item.title}
**优先级**: ${getPriorityLabel(item.priority)}
**截止日期**: ${formatDate(dueDate)}
**描述**: ${item.description || '无'}

请及时处理此任务。
        `,
      });

      results.push({
        taskId,
        title: item.title,
        owner: ownerId,
        dueDate: formatDate(dueDate),
        status: 'assigned',
      });
    } catch (error) {
      results.push({
        taskId: '',
        title: item.title,
        owner: item.owner || '',
        dueDate: item.dueDate || '',
        status: 'failed',
        message: error instanceof Error ? error.message : '任务分配失败',
      });
    }
  }

  return results;
}

/**
 * 查找或创建用户
 */
async function findOrCreateUser(
  identifier: string
): Promise<{ id: string; email: string; name: string }> {
  // 尝试通过邮箱查找用户
  if (identifier.includes('@')) {
    // 这里应该查询数据库
    // const user = await db.query.users.findFirst({
    //   where: eq(users.email, identifier),
    // });
    // if (user) return user;
  }

  // 尝试通过用户ID查找
  // const user = await db.query.users.findFirst({
  //   where: eq(users.id, identifier),
  // });
  // if (user) return user;

  // 如果用户不存在，返回默认用户
  return {
    id: identifier,
    email: identifier,
    name: identifier,
  };
}

/**
 * 获取优先级标签
 */
function getPriorityLabel(priority: 'high' | 'medium' | 'low'): string {
  const labels = {
    high: '🔴 高',
    medium: '🟡 中',
    low: '🟢 低',
  };
  return labels[priority];
}

/**
 * 添加天数
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 格式化日期
 */
function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
}

/**
 * 生成任务ID
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 批量分配任务
 */
export async function batchAssignTasks(
  assignments: Array<{
    meetingId: string;
    actionItems: ActionItemForAssignment[];
    meetingOwnerId: string;
  }>
): Promise<TaskAssignmentResult[][]> {
  return Promise.all(
    assignments.map((assignment) =>
      autoAssignTasksFromMeeting(
        assignment.meetingId,
        assignment.actionItems,
        assignment.meetingOwnerId
      )
    )
  );
}

/**
 * 获取任务完成提醒
 */
export async function getTaskCompletionReminders(userId: string): Promise<any[]> {
  // 这里应该查询数据库获取用户的待完成任务
  // const tasks = await db.query.tasks.findMany({
  //   where: and(
  //     eq(tasks.ownerId, userId),
  //     eq(tasks.status, 'pending')
  //   ),
  //   orderBy: [asc(tasks.dueDate)],
  // });
  // return tasks;

  return [];
}

/**
 * 标记任务为完成
 */
export async function completeTask(
  taskId: string,
  completionNotes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 这里应该更新数据库
    // await db.update(tasks)
    //   .set({
    //     status: 'completed',
    //     completedAt: new Date(),
    //     completionNotes,
    //   })
    //   .where(eq(tasks.id, taskId));

    // 发送完成通知
    await notifyOwner({
      title: '任务已完成',
      content: `您的任务 ${taskId} 已标记为完成。${completionNotes ? `\n\n完成备注: ${completionNotes}` : ''}`,
    });

    return {
      success: true,
      message: '任务已标记为完成',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '标记失败',
    };
  }
}

/**
 * 获取任务统计
 */
export async function getTaskStatistics(userId: string): Promise<{
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  completionRate: number;
}> {
  // 这里应该查询数据库获取统计数据
  // const allTasks = await db.query.tasks.findMany({
  //   where: eq(tasks.ownerId, userId),
  // });

  // const completed = allTasks.filter(t => t.status === 'completed').length;
  // const pending = allTasks.filter(t => t.status === 'pending').length;
  // const overdue = allTasks.filter(t => 
  //   t.status === 'pending' && new Date(t.dueDate) < new Date()
  // ).length;

  return {
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    completionRate: 0,
  };
}
