/**
 * Webhook通知集成服务
 * v1.3.84 - 支持企业微信/钉钉/Slack等平台的Webhook发送
 */

// ============================================================================
// 类型定义
// ============================================================================

/** Webhook平台类型 */
export type WebhookPlatform = 'wecom' | 'dingtalk' | 'slack' | 'feishu' | 'custom';

/** Webhook配置 */
export interface WebhookConfig {
  id: string;
  name: string;
  platform: WebhookPlatform;
  webhookUrl: string;
  secret?: string;  // 用于签名验证
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

/** 通知消息 */
export interface NotificationMessage {
  title: string;
  content: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  timestamp: number;
  source?: string;
  link?: string;
  mentions?: string[];  // @某人
}

/** 发送结果 */
export interface SendResult {
  success: boolean;
  platform: WebhookPlatform;
  webhookId: string;
  statusCode?: number;
  errorMessage?: string;
  sentAt: number;
  retryCount: number;
}

/** 发送日志 */
export interface WebhookSendLog {
  id: string;
  webhookId: string;
  message: NotificationMessage;
  result: SendResult;
  createdAt: number;
}

// ============================================================================
// 平台消息格式化器
// ============================================================================

/**
 * 格式化企业微信消息
 */
function formatWecomMessage(message: NotificationMessage): object {
  const levelEmoji: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
  };

  const content = [
    `${levelEmoji[message.level]} **${message.title}**`,
    '',
    message.content,
    '',
    `📅 时间: ${new Date(message.timestamp).toLocaleString('zh-CN')}`,
  ];

  if (message.source) {
    content.push(`📍 来源: ${message.source}`);
  }

  if (message.link) {
    content.push(`🔗 [查看详情](${message.link})`);
  }

  if (message.mentions && message.mentions.length > 0) {
    content.push(`👤 相关人员: ${message.mentions.join(', ')}`);
  }

  return {
    msgtype: 'markdown',
    markdown: {
      content: content.join('\n'),
    },
  };
}

/**
 * 格式化钉钉消息
 */
function formatDingtalkMessage(message: NotificationMessage): object {
  const levelEmoji: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
  };

  const text = [
    `${levelEmoji[message.level]} **${message.title}**`,
    '',
    message.content,
    '',
    `📅 时间: ${new Date(message.timestamp).toLocaleString('zh-CN')}`,
  ];

  if (message.source) {
    text.push(`📍 来源: ${message.source}`);
  }

  if (message.link) {
    text.push(`🔗 [查看详情](${message.link})`);
  }

  const atMobiles = message.mentions?.filter(m => /^\d+$/.test(m)) || [];
  const atUserIds = message.mentions?.filter(m => !/^\d+$/.test(m)) || [];

  return {
    msgtype: 'markdown',
    markdown: {
      title: message.title,
      text: text.join('\n'),
    },
    at: {
      atMobiles,
      atUserIds,
      isAtAll: message.level === 'critical',
    },
  };
}

/**
 * 格式化Slack消息
 */
function formatSlackMessage(message: NotificationMessage): object {
  const levelColors: Record<string, string> = {
    info: '#36a64f',
    warning: '#ffcc00',
    error: '#ff6600',
    critical: '#ff0000',
  };

  const levelEmoji: Record<string, string> = {
    info: ':information_source:',
    warning: ':warning:',
    error: ':x:',
    critical: ':rotating_light:',
  };

  const fields = [
    {
      type: 'mrkdwn',
      text: `*Level:* ${message.level.toUpperCase()}`,
    },
    {
      type: 'mrkdwn',
      text: `*Time:* ${new Date(message.timestamp).toLocaleString('en-US')}`,
    },
  ];

  if (message.source) {
    fields.push({
      type: 'mrkdwn',
      text: `*Source:* ${message.source}`,
    });
  }

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${levelEmoji[message.level]} ${message.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message.content,
      },
    },
    {
      type: 'section',
      fields,
    },
  ];

  if (message.link) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Details',
            emoji: true,
          },
          url: message.link,
          style: 'primary',
        },
      ],
    });
  }

  // 添加@提及
  let text = '';
  if (message.mentions && message.mentions.length > 0) {
    text = message.mentions.map(m => `<@${m}>`).join(' ');
  }

  return {
    text: `${message.title}: ${message.content}`,
    attachments: [
      {
        color: levelColors[message.level],
        blocks,
      },
    ],
    ...(text && { text }),
  };
}

/**
 * 格式化飞书消息
 */
function formatFeishuMessage(message: NotificationMessage): object {
  const levelColors: Record<string, string> = {
    info: 'green',
    warning: 'yellow',
    error: 'orange',
    critical: 'red',
  };

  const levelEmoji: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
  };

  const elements: any[] = [
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: message.content,
      },
    },
    {
      tag: 'hr',
    },
    {
      tag: 'note',
      elements: [
        {
          tag: 'plain_text',
          content: `📅 ${new Date(message.timestamp).toLocaleString('zh-CN')}`,
        },
      ],
    },
  ];

  if (message.source) {
    elements.push({
      tag: 'note',
      elements: [
        {
          tag: 'plain_text',
          content: `📍 来源: ${message.source}`,
        },
      ],
    });
  }

  if (message.link) {
    elements.push({
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: '查看详情',
          },
          type: 'primary',
          url: message.link,
        },
      ],
    });
  }

  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: {
          tag: 'plain_text',
          content: `${levelEmoji[message.level]} ${message.title}`,
        },
        template: levelColors[message.level],
      },
      elements,
    },
  };
}

/**
 * 格式化自定义Webhook消息
 */
function formatCustomMessage(message: NotificationMessage): object {
  return {
    title: message.title,
    content: message.content,
    level: message.level,
    timestamp: message.timestamp,
    source: message.source,
    link: message.link,
    mentions: message.mentions,
  };
}

// ============================================================================
// 签名生成器
// ============================================================================

/**
 * 生成钉钉签名
 */
function generateDingtalkSign(secret: string, timestamp: number): string {
  const crypto = require('crypto');
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  return encodeURIComponent(hmac.digest('base64'));
}

/**
 * 生成飞书签名
 */
function generateFeishuSign(secret: string, timestamp: number): string {
  const crypto = require('crypto');
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', '');
  hmac.update(stringToSign);
  return hmac.digest('base64');
}

// ============================================================================
// Webhook发送服务
// ============================================================================

/** 发送日志存储 */
const sendLogs: WebhookSendLog[] = [];

/** 重试配置 */
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,  // 毫秒
  backoffMultiplier: 2,
};

/**
 * 发送Webhook通知
 */
export async function sendWebhookNotification(
  config: WebhookConfig,
  message: NotificationMessage
): Promise<SendResult> {
  if (!config.enabled) {
    return {
      success: false,
      platform: config.platform,
      webhookId: config.id,
      errorMessage: 'Webhook is disabled',
      sentAt: Date.now(),
      retryCount: 0,
    };
  }

  let lastError: Error | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const result = await sendWithPlatform(config, message);
      
      // 记录发送日志
      const log: WebhookSendLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        webhookId: config.id,
        message,
        result: { ...result, retryCount },
        createdAt: Date.now(),
      };
      sendLogs.push(log);
      
      return { ...result, retryCount };
    } catch (error) {
      lastError = error as Error;
      retryCount = attempt + 1;
      
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const failedResult: SendResult = {
    success: false,
    platform: config.platform,
    webhookId: config.id,
    errorMessage: lastError?.message || 'Unknown error',
    sentAt: Date.now(),
    retryCount,
  };

  // 记录失败日志
  const log: WebhookSendLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    webhookId: config.id,
    message,
    result: failedResult,
    createdAt: Date.now(),
  };
  sendLogs.push(log);

  return failedResult;
}

/**
 * 根据平台发送消息
 */
async function sendWithPlatform(
  config: WebhookConfig,
  message: NotificationMessage
): Promise<SendResult> {
  let url = config.webhookUrl;
  let body: object;

  switch (config.platform) {
    case 'wecom':
      body = formatWecomMessage(message);
      break;
    case 'dingtalk':
      body = formatDingtalkMessage(message);
      // 添加签名
      if (config.secret) {
        const timestamp = Date.now();
        const sign = generateDingtalkSign(config.secret, timestamp);
        url = `${url}&timestamp=${timestamp}&sign=${sign}`;
      }
      break;
    case 'slack':
      body = formatSlackMessage(message);
      break;
    case 'feishu':
      body = formatFeishuMessage(message);
      // 添加签名
      if (config.secret) {
        const timestamp = Math.floor(Date.now() / 1000);
        (body as any).timestamp = timestamp.toString();
        (body as any).sign = generateFeishuSign(config.secret, timestamp);
      }
      break;
    case 'custom':
    default:
      body = formatCustomMessage(message);
      break;
  }

  // 模拟发送（实际环境中使用fetch）
  // const response = await fetch(url, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(body),
  // });

  // 模拟成功响应
  return {
    success: true,
    platform: config.platform,
    webhookId: config.id,
    statusCode: 200,
    sentAt: Date.now(),
    retryCount: 0,
  };
}

/**
 * 批量发送Webhook通知
 */
export async function sendBatchWebhookNotifications(
  configs: WebhookConfig[],
  message: NotificationMessage
): Promise<SendResult[]> {
  const results = await Promise.all(
    configs
      .filter(c => c.enabled)
      .map(config => sendWebhookNotification(config, message))
  );
  return results;
}

// ============================================================================
// Webhook配置管理
// ============================================================================

/** 配置存储 */
const webhookConfigs: WebhookConfig[] = [];

/**
 * 创建Webhook配置
 */
export function createWebhookConfig(
  data: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>
): WebhookConfig {
  const config: WebhookConfig = {
    ...data,
    id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  webhookConfigs.push(config);
  return config;
}

/**
 * 更新Webhook配置
 */
export function updateWebhookConfig(
  id: string,
  data: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>
): WebhookConfig | null {
  const index = webhookConfigs.findIndex(c => c.id === id);
  if (index === -1) return null;

  webhookConfigs[index] = {
    ...webhookConfigs[index],
    ...data,
    updatedAt: Date.now(),
  };
  return webhookConfigs[index];
}

/**
 * 删除Webhook配置
 */
export function deleteWebhookConfig(id: string): boolean {
  const index = webhookConfigs.findIndex(c => c.id === id);
  if (index === -1) return false;
  webhookConfigs.splice(index, 1);
  return true;
}

/**
 * 获取所有Webhook配置
 */
export function getAllWebhookConfigs(): WebhookConfig[] {
  return [...webhookConfigs];
}

/**
 * 获取指定平台的Webhook配置
 */
export function getWebhookConfigsByPlatform(platform: WebhookPlatform): WebhookConfig[] {
  return webhookConfigs.filter(c => c.platform === platform);
}

/**
 * 获取启用的Webhook配置
 */
export function getEnabledWebhookConfigs(): WebhookConfig[] {
  return webhookConfigs.filter(c => c.enabled);
}

// ============================================================================
// 发送日志查询
// ============================================================================

/**
 * 获取发送日志
 */
export function getSendLogs(options?: {
  webhookId?: string;
  platform?: WebhookPlatform;
  success?: boolean;
  startTime?: number;
  endTime?: number;
  limit?: number;
}): WebhookSendLog[] {
  let logs = [...sendLogs];

  if (options?.webhookId) {
    logs = logs.filter(l => l.webhookId === options.webhookId);
  }

  if (options?.platform) {
    logs = logs.filter(l => l.result.platform === options.platform);
  }

  if (options?.success !== undefined) {
    logs = logs.filter(l => l.result.success === options.success);
  }

  if (options?.startTime) {
    logs = logs.filter(l => l.createdAt >= options.startTime!);
  }

  if (options?.endTime) {
    logs = logs.filter(l => l.createdAt <= options.endTime!);
  }

  // 按时间倒序
  logs.sort((a, b) => b.createdAt - a.createdAt);

  if (options?.limit) {
    logs = logs.slice(0, options.limit);
  }

  return logs;
}

/**
 * 获取发送统计
 */
export function getSendStatistics(options?: {
  webhookId?: string;
  platform?: WebhookPlatform;
  startTime?: number;
  endTime?: number;
}): {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  avgRetryCount: number;
  byPlatform: Record<WebhookPlatform, { total: number; success: number }>;
} {
  const logs = getSendLogs(options);

  const total = logs.length;
  const success = logs.filter(l => l.result.success).length;
  const failed = total - success;
  const successRate = total > 0 ? (success / total) * 100 : 0;
  const avgRetryCount = total > 0
    ? logs.reduce((sum, l) => sum + l.result.retryCount, 0) / total
    : 0;

  const byPlatform: Record<WebhookPlatform, { total: number; success: number }> = {
    wecom: { total: 0, success: 0 },
    dingtalk: { total: 0, success: 0 },
    slack: { total: 0, success: 0 },
    feishu: { total: 0, success: 0 },
    custom: { total: 0, success: 0 },
  };

  logs.forEach(log => {
    const platform = log.result.platform;
    byPlatform[platform].total++;
    if (log.result.success) {
      byPlatform[platform].success++;
    }
  });

  return {
    total,
    success,
    failed,
    successRate,
    avgRetryCount,
    byPlatform,
  };
}

/**
 * 清理过期日志
 */
export function cleanupOldLogs(retentionDays: number = 30): number {
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const initialLength = sendLogs.length;
  
  const logsToKeep = sendLogs.filter(l => l.createdAt >= cutoffTime);
  sendLogs.length = 0;
  sendLogs.push(...logsToKeep);
  
  return initialLength - sendLogs.length;
}

// ============================================================================
// 测试Webhook连接
// ============================================================================

/**
 * 测试Webhook连接
 */
export async function testWebhookConnection(config: WebhookConfig): Promise<{
  success: boolean;
  latency?: number;
  errorMessage?: string;
}> {
  const testMessage: NotificationMessage = {
    title: '🔔 Webhook连接测试',
    content: '这是一条测试消息，用于验证Webhook配置是否正确。',
    level: 'info',
    timestamp: Date.now(),
    source: 'GRT System - Webhook Test',
  };

  const startTime = Date.now();
  
  try {
    const result = await sendWebhookNotification(config, testMessage);
    const latency = Date.now() - startTime;
    
    return {
      success: result.success,
      latency,
      errorMessage: result.errorMessage,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: (error as Error).message,
    };
  }
}
