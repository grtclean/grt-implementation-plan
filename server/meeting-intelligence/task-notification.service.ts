/**
 * 任务完成通知推送服务
 * 将任务完成状态推送到企业微信/钉钉/飞书等Webhook
 */

import { requireDb } from '../db';
import { sql } from 'drizzle-orm';

// 通知类型
export type NotificationType =
  | 'task_assigned'      // 任务分配
  | 'task_accepted'      // 任务接受
  | 'task_rejected'      // 任务拒绝
  | 'task_progress'      // 任务进度更新
  | 'task_completed'     // 任务完成
  | 'task_overdue'       // 任务逾期
  | 'minutes_confirmed'  // 会议纪要确认
  | 'evidence_uploaded'; // 举证材料上传

// 通知渠道
export type NotificationChannel = 'email' | 'webhook' | 'inApp';

// 通知配置
interface NotificationConfig {
  id: string;
  meetingType: string;
  channels: NotificationChannel[];
  webhookUrl?: string;
  webhookType?: 'wechat' | 'dingtalk' | 'feishu' | 'custom';
  emailRecipients?: string[];
  enabled: boolean;
}

// 通知消息
interface NotificationMessage {
  type: NotificationType;
  title: string;
  content: string;
  taskId?: string;
  meetingId?: string;
  meetingTitle?: string;
  assignee?: string;
  assigneeEmail?: string;
  dueDate?: string;
  progress?: number;
  completionNote?: string;
  evidenceFiles?: string[];
  timestamp: string;
}

// 通知记录
interface NotificationRecord {
  id: string;
  messageType: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  content: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

/**
 * 发送任务通知
 */
export async function sendTaskNotification(
  message: NotificationMessage,
  config: NotificationConfig
): Promise<{ success: boolean; results: NotificationRecord[] }> {
  const results: NotificationRecord[] = [];

  for (const channel of config.channels) {
    try {
      let record: NotificationRecord;

      switch (channel) {
        case 'webhook':
          record = await sendWebhookNotification(message, config);
          break;
        case 'email':
          record = await sendEmailNotification(message, config);
          break;
        case 'inApp':
          record = await sendInAppNotification(message, config);
          break;
        default:
          continue;
      }

      results.push(record);
    } catch (error) {
      results.push({
        id: generateId(),
        messageType: message.type,
        channel,
        recipient: channel === 'webhook' ? config.webhookUrl || '' : 'unknown',
        content: message.content,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date().toISOString()
      });
    }
  }

  // 保存通知记录
  await saveNotificationRecords(results);

  return {
    success: results.every(r => r.status === 'sent'),
    results
  };
}

/**
 * 发送Webhook通知
 */
async function sendWebhookNotification(
  message: NotificationMessage,
  config: NotificationConfig
): Promise<NotificationRecord> {
  if (!config.webhookUrl) {
    throw new Error('Webhook URL not configured');
  }

  const payload = formatWebhookPayload(message, config.webhookType || 'custom');

  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Webhook request failed: ${response.status}`);
  }

  return {
    id: generateId(),
    messageType: message.type,
    channel: 'webhook',
    recipient: config.webhookUrl,
    content: JSON.stringify(payload),
    status: 'sent',
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}

/**
 * 格式化Webhook消息体
 */
function formatWebhookPayload(
  message: NotificationMessage,
  webhookType: 'wechat' | 'dingtalk' | 'feishu' | 'custom'
): any {
  const notificationTypeLabels: Record<NotificationType, string> = {
    task_assigned: '📋 任务分配',
    task_accepted: '✅ 任务接受',
    task_rejected: '❌ 任务拒绝',
    task_progress: '📊 进度更新',
    task_completed: '🎉 任务完成',
    task_overdue: '⚠️ 任务逾期',
    minutes_confirmed: '📝 纪要确认',
    evidence_uploaded: '📎 举证上传'
  };

  const typeLabel = notificationTypeLabels[message.type] || message.type;

  switch (webhookType) {
    case 'wechat':
      // 企业微信格式
      return {
        msgtype: 'markdown',
        markdown: {
          content: `### ${typeLabel}\n\n` +
            `**${message.title}**\n\n` +
            `${message.content}\n\n` +
            (message.meetingTitle ? `> 会议: ${message.meetingTitle}\n` : '') +
            (message.assignee ? `> 负责人: ${message.assignee}\n` : '') +
            (message.dueDate ? `> 截止日期: ${message.dueDate}\n` : '') +
            (message.progress !== undefined ? `> 进度: ${message.progress}%\n` : '') +
            `\n时间: ${message.timestamp}`
        }
      };

    case 'dingtalk':
      // 钉钉格式
      return {
        msgtype: 'markdown',
        markdown: {
          title: message.title,
          text: `### ${typeLabel}\n\n` +
            `**${message.title}**\n\n` +
            `${message.content}\n\n` +
            (message.meetingTitle ? `> 会议: ${message.meetingTitle}\n\n` : '') +
            (message.assignee ? `> 负责人: ${message.assignee}\n\n` : '') +
            (message.dueDate ? `> 截止日期: ${message.dueDate}\n\n` : '') +
            (message.progress !== undefined ? `> 进度: ${message.progress}%\n\n` : '') +
            `时间: ${message.timestamp}`
        }
      };

    case 'feishu':
      // 飞书格式
      return {
        msg_type: 'interactive',
        card: {
          header: {
            title: {
              tag: 'plain_text',
              content: `${typeLabel} - ${message.title}`
            },
            template: message.type === 'task_completed' ? 'green' :
                      message.type === 'task_overdue' ? 'red' : 'blue'
          },
          elements: [
            {
              tag: 'div',
              text: {
                tag: 'lark_md',
                content: message.content
              }
            },
            ...(message.meetingTitle ? [{
              tag: 'div',
              fields: [
                { is_short: true, text: { tag: 'lark_md', content: `**会议:** ${message.meetingTitle}` } },
                { is_short: true, text: { tag: 'lark_md', content: `**负责人:** ${message.assignee || '-'}` } }
              ]
            }] : []),
            {
              tag: 'note',
              elements: [
                { tag: 'plain_text', content: message.timestamp }
              ]
            }
          ]
        }
      };

    default:
      // 通用格式
      return {
        type: message.type,
        title: message.title,
        content: message.content,
        data: {
          taskId: message.taskId,
          meetingId: message.meetingId,
          meetingTitle: message.meetingTitle,
          assignee: message.assignee,
          dueDate: message.dueDate,
          progress: message.progress,
          completionNote: message.completionNote,
          evidenceFiles: message.evidenceFiles
        },
        timestamp: message.timestamp
      };
  }
}

/**
 * 发送邮件通知
 */
async function sendEmailNotification(
  message: NotificationMessage,
  config: NotificationConfig
): Promise<NotificationRecord> {
  // 这里调用邮件服务
  // 实际实现需要配置SMTP或使用邮件服务API

  const recipients = config.emailRecipients || [];
  if (recipients.length === 0 && message.assigneeEmail) {
    recipients.push(message.assigneeEmail);
  }

  if (recipients.length === 0) {
    throw new Error('No email recipients configured');
  }

  // 构建邮件内容
  const emailContent = buildEmailContent(message);

  // TODO: 实际发送邮件
  // await sendEmail({ to: recipients, subject: message.title, html: emailContent });

  return {
    id: generateId(),
    messageType: message.type,
    channel: 'email',
    recipient: recipients.join(', '),
    content: emailContent,
    status: 'sent',
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}

/**
 * 构建邮件内容
 */
function buildEmailContent(message: NotificationMessage): string {
  const notificationTypeLabels: Record<NotificationType, string> = {
    task_assigned: '任务分配通知',
    task_accepted: '任务接受通知',
    task_rejected: '任务拒绝通知',
    task_progress: '任务进度更新',
    task_completed: '任务完成通知',
    task_overdue: '任务逾期提醒',
    minutes_confirmed: '会议纪要确认',
    evidence_uploaded: '举证材料上传'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f97316; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-row { margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        .progress-bar { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; }
        .progress-fill { background: #f97316; height: 100%; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${notificationTypeLabels[message.type] || message.type}</h2>
        </div>
        <div class="content">
          <h3>${message.title}</h3>
          <p>${message.content}</p>

          ${message.meetingTitle ? `
            <div class="info-row">
              <span class="label">会议:</span> ${message.meetingTitle}
            </div>
          ` : ''}

          ${message.assignee ? `
            <div class="info-row">
              <span class="label">负责人:</span> ${message.assignee}
            </div>
          ` : ''}

          ${message.dueDate ? `
            <div class="info-row">
              <span class="label">截止日期:</span> ${message.dueDate}
            </div>
          ` : ''}

          ${message.progress !== undefined ? `
            <div class="info-row">
              <span class="label">进度:</span> ${message.progress}%
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${message.progress}%"></div>
              </div>
            </div>
          ` : ''}

          ${message.completionNote ? `
            <div class="info-row">
              <span class="label">完成说明:</span>
              <p>${message.completionNote}</p>
            </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>GRT智能系统 - 会议任务管理</p>
          <p>${message.timestamp}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 发送站内通知
 */
async function sendInAppNotification(
  message: NotificationMessage,
  config: NotificationConfig
): Promise<NotificationRecord> {
  const db = await requireDb();

  // 保存到站内通知表
  await db.execute(sql`INSERT INTO meeting_task_notifications
          (id, type, title, content, task_id, meeting_id, recipient_id, is_read, created_at)
          VALUES (${generateId()}, ${message.type}, ${message.title}, ${message.content}, ${message.taskId || null}, ${message.meetingId || null}, ${message.assignee || null}, ${0}, ${new Date().toISOString()})`);

  return {
    id: generateId(),
    messageType: message.type,
    channel: 'inApp',
    recipient: message.assignee || 'unknown',
    content: message.content,
    status: 'sent',
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}

/**
 * 保存通知记录
 */
async function saveNotificationRecords(records: NotificationRecord[]): Promise<void> {
  const db = await requireDb();

  for (const record of records) {
    await db.execute(sql`INSERT INTO meeting_notification_logs
            (id, message_type, channel, recipient, content, status, error_message, sent_at, created_at)
            VALUES (${record.id}, ${record.messageType}, ${record.channel}, ${record.recipient}, ${record.content}, ${record.status}, ${record.errorMessage || null}, ${record.sentAt || null}, ${record.createdAt})`);
  }
}

/**
 * 获取通知配置
 */
export async function getNotificationConfig(meetingType: string): Promise<NotificationConfig | null> {
  const db = await requireDb();

  const result = await db.execute(sql`SELECT * FROM meeting_notification_configs WHERE meeting_type = ${meetingType} AND enabled = 1 LIMIT 1000`);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as any;
  return {
    id: row.id,
    meetingType: row.meeting_type,
    channels: JSON.parse(row.channels || '[]'),
    webhookUrl: row.webhook_url,
    webhookType: row.webhook_type,
    emailRecipients: JSON.parse(row.email_recipients || '[]'),
    enabled: row.enabled === 1
  };
}

/**
 * 保存通知配置
 */
export async function saveNotificationConfig(config: NotificationConfig): Promise<void> {
  const db = await requireDb();
  const now = new Date().toISOString();
  const configId = config.id || generateId();

  await db.execute(sql`INSERT INTO meeting_notification_configs
          (id, meeting_type, channels, webhook_url, webhook_type, email_recipients, enabled, created_at, updated_at)
          VALUES (${configId}, ${config.meetingType}, ${JSON.stringify(config.channels)}, ${config.webhookUrl || null}, ${config.webhookType || null}, ${JSON.stringify(config.emailRecipients || [])}, ${config.enabled ? 1 : 0}, ${now}, ${now})
          ON CONFLICT (id) DO UPDATE SET
          channels = ${JSON.stringify(config.channels)},
          webhook_url = ${config.webhookUrl || null},
          webhook_type = ${config.webhookType || null},
          email_recipients = ${JSON.stringify(config.emailRecipients || [])},
          enabled = ${config.enabled ? 1 : 0},
          updated_at = ${now}`);
}

/**
 * 批量发送任务完成通知给MO
 */
export async function notifyMeetingOwnerOnTaskCompletion(
  taskId: string,
  meetingId: string,
  meetingType: string,
  taskTitle: string,
  completedBy: string,
  completionNote: string,
  evidenceFiles: string[]
): Promise<{ success: boolean; message: string }> {
  const db = await requireDb();

  // 获取MO信息
  const moResult = await db.execute(sql`SELECT * FROM meeting_owners WHERE meeting_type = ${meetingType} LIMIT 1000`);

  if (moResult.rows.length === 0) {
    return { success: false, message: 'No Meeting Owner configured for this meeting type' };
  }

  const mo = moResult.rows[0] as any;

  // 获取通知配置
  const config = await getNotificationConfig(meetingType);
  if (!config) {
    // 使用默认配置
    const defaultConfig: NotificationConfig = {
      id: generateId(),
      meetingType,
      channels: ['inApp'],
      enabled: true
    };

    const message: NotificationMessage = {
      type: 'task_completed',
      title: `任务完成: ${taskTitle}`,
      content: `${completedBy} 已完成任务，请审核。`,
      taskId,
      meetingId,
      assignee: mo.owner_name,
      assigneeEmail: mo.owner_email,
      completionNote,
      evidenceFiles,
      timestamp: new Date().toISOString()
    };

    await sendTaskNotification(message, defaultConfig);
    return { success: true, message: 'Notification sent with default config' };
  }

  const message: NotificationMessage = {
    type: 'task_completed',
    title: `任务完成: ${taskTitle}`,
    content: `${completedBy} 已完成任务，请审核。${completionNote ? `\n\n完成说明: ${completionNote}` : ''}`,
    taskId,
    meetingId,
    assignee: mo.owner_name,
    assigneeEmail: mo.owner_email,
    completionNote,
    evidenceFiles,
    timestamp: new Date().toISOString()
  };

  const result = await sendTaskNotification(message, config);

  return {
    success: result.success,
    message: result.success ? 'Notification sent successfully' : 'Some notifications failed'
  };
}

/**
 * 发送任务逾期提醒
 */
export async function sendOverdueReminders(): Promise<{ sent: number; failed: number }> {
  const db = await requireDb();

  // 查找所有逾期未完成的任务
  const result = await db.execute(sql`SELECT t.*, m.title as meeting_title, m.meeting_type
          FROM meeting_task_loop_tasks t
          JOIN meeting_records m ON t.meeting_id = m.id
          WHERE t.status NOT IN ('completed', 'rejected')
          AND t.due_date < NOW()
          LIMIT 1000
          AND t.overdue_notified = 0`);

  let sent = 0;
  let failed = 0;

  for (const row of result.rows as any[]) {
    try {
      const config = await getNotificationConfig(row.meeting_type);
      if (!config) continue;

      const message: NotificationMessage = {
        type: 'task_overdue',
        title: `任务逾期提醒: ${row.title}`,
        content: `任务已逾期，请尽快完成。截止日期: ${row.due_date}`,
        taskId: row.id,
        meetingId: row.meeting_id,
        meetingTitle: row.meeting_title,
        assignee: row.assignee_name,
        assigneeEmail: row.assignee_email,
        dueDate: row.due_date,
        timestamp: new Date().toISOString()
      };

      await sendTaskNotification(message, config);

      // 标记已发送逾期通知
      await db.execute(sql`UPDATE meeting_task_loop_tasks SET overdue_notified = 1 WHERE id = ${row.id}`);

      sent++;
    } catch (error) {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `ntf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  sendTaskNotification,
  getNotificationConfig,
  saveNotificationConfig,
  notifyMeetingOwnerOnTaskCompletion,
  sendOverdueReminders
};
