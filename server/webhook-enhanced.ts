/**
 * 增强的Webhook集成服务
 * 支持企业微信、钉钉、飞书等平台的消息推送
 * 集成告警和会议提醒发送功能
 */

import {
  WebhookConfig,
  WebhookMessage,
  WebhookResult,
  broadcastWebhookMessage,
  getAllWebhooks,
  registerWebhook,
} from './webhook';
import { createChildLogger } from './lib/logger';

const log = createChildLogger("webhook-enhanced");

// 告警级别
export type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';

// 告警消息
export interface AlertMessage {
  level: AlertLevel;
  title: string;
  description: string;
  source: string;
  projectId?: string;
  projectName?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

// 会议信息
export interface MeetingInfo {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  organizer: string;
  participants: string[];
  agenda?: string;
  reminderMinutes: number;
}

// 告警级别图标映射
const alertLevelIcons: Record<AlertLevel, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🔴',
  emergency: '🚨',
};

// 告警级别颜色映射（用于企业微信/钉钉卡片）
const alertLevelColors: Record<AlertLevel, string> = {
  info: 'blue',
  warning: 'orange',
  critical: 'red',
  emergency: 'red',
};

/**
 * 格式化告警消息为Webhook消息
 */
function formatAlertMessage(alert: AlertMessage): WebhookMessage {
  const icon = alertLevelIcons[alert.level];
  const levelText = {
    info: '信息',
    warning: '警告',
    critical: '严重',
    emergency: '紧急',
  }[alert.level];

  let content = `**级别**: ${icon} ${levelText}\n`;
  content += `**来源**: ${alert.source}\n`;
  
  if (alert.projectName) {
    content += `**项目**: ${alert.projectName}\n`;
  }
  
  content += `**时间**: ${alert.timestamp.toLocaleString('zh-CN')}\n\n`;
  content += `**详情**:\n${alert.description}`;
  
  if (alert.details) {
    content += '\n\n**附加信息**:\n';
    for (const [key, value] of Object.entries(alert.details)) {
      content += `- ${key}: ${value}\n`;
    }
  }

  return {
    title: `${icon} ${alert.title}`,
    content,
    type: 'markdown',
    mentionAll: alert.level === 'emergency' || alert.level === 'critical',
  };
}

/**
 * 格式化会议提醒消息为Webhook消息
 */
function formatMeetingReminderMessage(meeting: MeetingInfo): WebhookMessage {
  const startTimeStr = meeting.startTime.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  let content = `**会议**: ${meeting.title}\n`;
  content += `**时间**: ${startTimeStr}\n`;
  content += `**地点**: ${meeting.location}\n`;
  content += `**组织者**: ${meeting.organizer}\n`;
  
  if (meeting.participants.length > 0) {
    content += `**参与者**: ${meeting.participants.join(', ')}\n`;
  }
  
  if (meeting.agenda) {
    content += `\n**议程**:\n${meeting.agenda}`;
  }

  content += `\n\n⏰ 会议将在 ${meeting.reminderMinutes} 分钟后开始`;

  return {
    title: '📅 会议提醒',
    content,
    type: 'markdown',
    mentionUsers: meeting.participants,
  };
}

/**
 * 发送告警到所有已配置的Webhook
 */
export async function sendAlertToWebhooks(alert: AlertMessage): Promise<{
  success: boolean;
  results: WebhookResult[];
  summary: string;
}> {
  const webhooks = getAllWebhooks().filter(w => w.enabled);
  
  if (webhooks.length === 0) {
    return {
      success: false,
      results: [],
      summary: '没有配置启用的Webhook',
    };
  }

  const message = formatAlertMessage(alert);
  const results = await broadcastWebhookMessage(webhooks, message);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  return {
    success: successCount > 0,
    results,
    summary: `告警已发送到 ${successCount}/${results.length} 个Webhook${failCount > 0 ? `，${failCount} 个失败` : ''}`,
  };
}

/**
 * 发送会议提醒到所有已配置的Webhook
 */
export async function sendMeetingReminderToWebhooks(meeting: MeetingInfo): Promise<{
  success: boolean;
  results: WebhookResult[];
  summary: string;
}> {
  const webhooks = getAllWebhooks().filter(w => w.enabled);
  
  if (webhooks.length === 0) {
    return {
      success: false,
      results: [],
      summary: '没有配置启用的Webhook',
    };
  }

  const message = formatMeetingReminderMessage(meeting);
  const results = await broadcastWebhookMessage(webhooks, message);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  return {
    success: successCount > 0,
    results,
    summary: `会议提醒已发送到 ${successCount}/${results.length} 个Webhook${failCount > 0 ? `，${failCount} 个失败` : ''}`,
  };
}

/**
 * 发送成本预警到Webhook
 */
export async function sendCostAlertToWebhooks(costAlert: {
  projectId: string;
  projectName: string;
  alertType: string;
  threshold: number;
  currentValue: number;
  message: string;
}): Promise<{
  success: boolean;
  results: WebhookResult[];
  summary: string;
}> {
  const alert: AlertMessage = {
    level: costAlert.currentValue >= costAlert.threshold * 1.2 ? 'critical' : 'warning',
    title: `成本预警: ${costAlert.alertType}`,
    description: costAlert.message,
    source: '成本管理系统',
    projectId: costAlert.projectId,
    projectName: costAlert.projectName,
    timestamp: new Date(),
    details: {
      '预警阈值': `${(costAlert.threshold * 100).toFixed(0)}%`,
      '当前值': `${(costAlert.currentValue * 100).toFixed(0)}%`,
      '偏差': `${((costAlert.currentValue - costAlert.threshold) * 100).toFixed(1)}%`,
    },
  };

  return sendAlertToWebhooks(alert);
}

/**
 * 发送系统告警到Webhook
 */
export async function sendSystemAlertToWebhooks(systemAlert: {
  type: 'health' | 'performance' | 'security' | 'error';
  title: string;
  description: string;
  severity: AlertLevel;
  details?: Record<string, any>;
}): Promise<{
  success: boolean;
  results: WebhookResult[];
  summary: string;
}> {
  const sourceMap = {
    health: '系统健康监控',
    performance: '性能监控',
    security: '安全监控',
    error: '错误监控',
  };

  const alert: AlertMessage = {
    level: systemAlert.severity,
    title: systemAlert.title,
    description: systemAlert.description,
    source: sourceMap[systemAlert.type],
    timestamp: new Date(),
    details: systemAlert.details,
  };

  return sendAlertToWebhooks(alert);
}

/**
 * 初始化默认Webhook配置
 * 用户需要替换为实际的Webhook URL
 */
export function initializeDefaultWebhooks(): void {
  // 检查是否已有Webhook配置
  const existing = getAllWebhooks();
  if (existing.length > 0) {
    log.info({}, "已存在Webhook配置，跳过初始化");
    return;
  }

  // 注册企业微信示例Webhook（需要用户替换URL）
  registerWebhook({
    name: '运维团队-企业微信',
    type: 'wecom',
    url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY_HERE',
    enabled: false, // 默认禁用，用户配置后启用
  });

  // 注册钉钉示例Webhook（需要用户替换URL）
  registerWebhook({
    name: '运维团队-钉钉',
    type: 'dingtalk',
    url: 'https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN_HERE',
    enabled: false, // 默认禁用，用户配置后启用
  });

  // 注册飞书示例Webhook（需要用户替换URL）
  registerWebhook({
    name: '运维团队-飞书',
    type: 'feishu',
    url: 'https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_HOOK_ID_HERE',
    enabled: false, // 默认禁用，用户配置后启用
  });

  log.info({}, "已初始化默认Webhook配置模板");
}

/**
 * 测试Webhook连接
 */
export async function testWebhookConnection(webhookId: string): Promise<{
  success: boolean;
  message: string;
  latency?: number;
}> {
  const webhooks = getAllWebhooks();
  const webhook = webhooks.find(w => w.id === webhookId);
  
  if (!webhook) {
    return {
      success: false,
      message: `未找到Webhook: ${webhookId}`,
    };
  }

  const startTime = Date.now();
  
  const testMessage: WebhookMessage = {
    title: '🔔 Webhook连接测试',
    content: `这是一条来自GRT系统的测试消息。\n\n时间: ${new Date().toLocaleString('zh-CN')}\nWebhook: ${webhook.name}`,
    type: 'text',
  };

  const results = await broadcastWebhookMessage([{ ...webhook, enabled: true }], testMessage);
  const latency = Date.now() - startTime;
  
  if (results.length === 0) {
    return {
      success: false,
      message: 'Webhook发送失败：无响应',
      latency,
    };
  }

  const result = results[0];
  
  return {
    success: result.success,
    message: result.success 
      ? `Webhook连接成功，延迟: ${latency}ms` 
      : `Webhook连接失败: ${result.error}`,
    latency,
  };
}

/**
 * 获取Webhook统计信息
 */
export function getWebhookStats(): {
  total: number;
  enabled: number;
  disabled: number;
  byType: Record<string, number>;
} {
  const webhooks = getAllWebhooks();
  
  const byType: Record<string, number> = {};
  let enabled = 0;
  let disabled = 0;
  
  for (const webhook of webhooks) {
    if (webhook.enabled) {
      enabled++;
    } else {
      disabled++;
    }
    
    byType[webhook.type] = (byType[webhook.type] || 0) + 1;
  }
  
  return {
    total: webhooks.length,
    enabled,
    disabled,
    byType,
  };
}
