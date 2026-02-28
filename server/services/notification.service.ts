import { notifyOwner } from '../_core/notification';
import type { InferSelectModel } from 'drizzle-orm';
import { meetings, meetingNotes, aiInsights } from '../../drizzle/schema';

type Meeting = InferSelectModel<typeof meetings>;
type MeetingNote = InferSelectModel<typeof meetingNotes>;
type AIInsight = InferSelectModel<typeof aiInsights>;

export enum NotificationType {
  // 会议通知
  MEETING_CREATED = 'meeting_created',
  MEETING_UPDATED = 'meeting_updated',
  MEETING_CANCELLED = 'meeting_cancelled',
  MEETING_STARTED = 'meeting_started',
  MEETING_ENDED = 'meeting_ended',
  MEETING_REMINDER = 'meeting_reminder',

  // 笔记通知
  NOTES_UPDATED = 'notes_updated',
  NOTES_SHARED = 'notes_shared',

  // AI通知
  AI_ANALYSIS_READY = 'ai_analysis_ready',
  AI_INSIGHT_GENERATED = 'ai_insight_generated',

  // 任务通知
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',

  // 权限通知
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  content: string;
  meetingId?: string;
  taskId?: string;
  recipientId?: number;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 发送会议创建通知
 */
export async function notifyMeetingCreated(
  meeting: Meeting,
  creatorName: string,
  recipients: string[]
): Promise<boolean> {
  const title = `新会议创建: ${meeting.title}`;
  const content = `
${creatorName} 创建了新会议

会议类型: ${meeting.meetingType}
开始时间: ${new Date(meeting.startTime).toLocaleString('zh-CN')}
${meeting.projectPhase ? `项目阶段: ${meeting.projectPhase}` : ''}
${meeting.description ? `描述: ${meeting.description}` : ''}

请及时查看会议详情并确认参加。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送会议更新通知
 */
export async function notifyMeetingUpdated(
  meeting: Meeting,
  changes: Record<string, unknown>,
  updatedByName: string
): Promise<boolean> {
  const title = `会议已更新: ${meeting.title}`;
  const changesList = Object.entries(changes)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  const content = `
${updatedByName} 更新了会议信息

${changesList}

新状态: ${meeting.status}
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送会议取消通知
 */
export async function notifyMeetingCancelled(
  meeting: Meeting,
  reason: string,
  cancelledByName: string
): Promise<boolean> {
  const title = `会议已取消: ${meeting.title}`;
  const content = `
${cancelledByName} 取消了会议

会议: ${meeting.title}
原定时间: ${new Date(meeting.startTime).toLocaleString('zh-CN')}
取消原因: ${reason}

如有疑问，请联系会议组织者。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送会议开始提醒
 */
export async function notifyMeetingStarting(
  meeting: Meeting,
  minutesBefore: number = 15
): Promise<boolean> {
  const title = `会议即将开始: ${meeting.title}`;
  const content = `
会议将在 ${minutesBefore} 分钟后开始

会议: ${meeting.title}
开始时间: ${new Date(meeting.startTime).toLocaleString('zh-CN')}
会议类型: ${meeting.meetingType}
${meeting.projectPhase ? `项目阶段: ${meeting.projectPhase}` : ''}

请准时加入会议。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送会议结束通知
 */
export async function notifyMeetingEnded(
  meeting: Meeting,
  summary: string
): Promise<boolean> {
  const title = `会议已结束: ${meeting.title}`;
  const content = `
会议已结束

会议: ${meeting.title}
结束时间: ${new Date().toLocaleString('zh-CN')}

会议总结:
${summary}

请查看会议笔记和AI洞察。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送笔记更新通知
 */
export async function notifyNotesUpdated(
  meeting: Meeting,
  updatedByName: string,
  changesSummary: string
): Promise<boolean> {
  const title = `会议笔记已更新: ${meeting.title}`;
  const content = `
${updatedByName} 更新了会议笔记

会议: ${meeting.title}

更新内容:
${changesSummary}

请查看完整的会议笔记。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送AI分析完成通知
 */
export async function notifyAIAnalysisReady(
  meeting: Meeting,
  insightTypes: string[]
): Promise<boolean> {
  const title = `AI分析已完成: ${meeting.title}`;
  const content = `
会议的AI分析已完成

会议: ${meeting.title}

生成的洞察:
${insightTypes.map((type) => `- ${type}`).join('\n')}

包括:
- 会议总结
- 行动项
- 关键决策
- 风险识别
- 机会发现

请查看完整的AI洞察报告。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送任务分配通知
 */
export async function notifyTaskAssigned(
  taskTitle: string,
  assignedToName: string,
  dueDate: Date,
  meetingTitle: string,
  assignedByName: string
): Promise<boolean> {
  const title = `新任务分配: ${taskTitle}`;
  const content = `
${assignedByName} 为您分配了新任务

任务: ${taskTitle}
截止日期: ${dueDate.toLocaleString('zh-CN')}
来自会议: ${meetingTitle}

请及时完成任务。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送任务超期提醒
 */
export async function notifyTaskOverdue(
  taskTitle: string,
  dueDate: Date,
  daysOverdue: number
): Promise<boolean> {
  const title = `任务超期提醒: ${taskTitle}`;
  const content = `
您的任务已超期

任务: ${taskTitle}
原截止日期: ${dueDate.toLocaleString('zh-CN')}
超期天数: ${daysOverdue} 天

请尽快完成任务。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送权限授予通知
 */
export async function notifyPermissionGranted(
  userName: string,
  channelName: string,
  role: string,
  grantedByName: string
): Promise<boolean> {
  const title = `权限已授予: ${channelName}`;
  const content = `
${grantedByName} 为您授予了新权限

频道: ${channelName}
角色: ${role}

您现在可以访问该频道的内容。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送权限撤销通知
 */
export async function notifyPermissionRevoked(
  channelName: string,
  revokedByName: string
): Promise<boolean> {
  const title = `权限已撤销: ${channelName}`;
  const content = `
${revokedByName} 撤销了您对该频道的权限

频道: ${channelName}

如有疑问，请联系频道管理员。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送会议提醒（每日）
 */
export async function notifyDailyMeetingReminder(
  meetings: Meeting[]
): Promise<boolean> {
  if (meetings.length === 0) {
    return true;
  }

  const title = `今日会议提醒 (${meetings.length} 场)`;
  const meetingsList = meetings
    .map((m) => `- ${new Date(m.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} ${m.title}`)
    .join('\n');

  const content = `
您今天有 ${meetings.length} 场会议

${meetingsList}

请提前做好准备。
  `.trim();

  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 发送自定义通知
 */
export async function sendCustomNotification(
  title: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  return await notifyOwner({
    title,
    content,
  });
}

/**
 * 获取通知类型的显示名称
 */
export function getNotificationTypeName(type: NotificationType): string {
  const names: Record<NotificationType, string> = {
    [NotificationType.MEETING_CREATED]: '会议创建',
    [NotificationType.MEETING_UPDATED]: '会议更新',
    [NotificationType.MEETING_CANCELLED]: '会议取消',
    [NotificationType.MEETING_STARTED]: '会议开始',
    [NotificationType.MEETING_ENDED]: '会议结束',
    [NotificationType.MEETING_REMINDER]: '会议提醒',
    [NotificationType.NOTES_UPDATED]: '笔记更新',
    [NotificationType.NOTES_SHARED]: '笔记分享',
    [NotificationType.AI_ANALYSIS_READY]: 'AI分析完成',
    [NotificationType.AI_INSIGHT_GENERATED]: 'AI洞察生成',
    [NotificationType.TASK_ASSIGNED]: '任务分配',
    [NotificationType.TASK_COMPLETED]: '任务完成',
    [NotificationType.TASK_OVERDUE]: '任务超期',
    [NotificationType.PERMISSION_GRANTED]: '权限授予',
    [NotificationType.PERMISSION_REVOKED]: '权限撤销',
  };

  return names[type] || '系统通知';
}
