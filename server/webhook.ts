/**
 * Webhook集成服务
 * 支持企业微信、钉钉、飞书等平台的消息推送
 */

// Webhook类型
export type WebhookType = 'wecom' | 'dingtalk' | 'feishu' | 'custom';

// Webhook配置
export interface WebhookConfig {
  id: string;
  name: string;
  type: WebhookType;
  url: string;
  secret?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 消息格式
export interface WebhookMessage {
  title: string;
  content: string;
  type?: 'text' | 'markdown' | 'card';
  mentionAll?: boolean;
  mentionUsers?: string[];
}

// 发送结果
export interface WebhookResult {
  success: boolean;
  webhookId: string;
  webhookName: string;
  error?: string;
  timestamp: Date;
}

// 内存存储（实际应用中应使用数据库）
const webhookStore: Map<string, WebhookConfig> = new Map();

/**
 * 格式化企业微信消息
 */
function formatWeComMessage(message: WebhookMessage): object {
  if (message.type === 'markdown') {
    return {
      msgtype: 'markdown',
      markdown: {
        content: `### ${message.title}\n\n${message.content}`,
      },
    };
  }
  
  return {
    msgtype: 'text',
    text: {
      content: `${message.title}\n\n${message.content}`,
      mentioned_list: message.mentionAll ? ['@all'] : message.mentionUsers || [],
    },
  };
}

/**
 * 格式化钉钉消息
 */
function formatDingTalkMessage(message: WebhookMessage): object {
  if (message.type === 'markdown') {
    return {
      msgtype: 'markdown',
      markdown: {
        title: message.title,
        text: `### ${message.title}\n\n${message.content}`,
      },
      at: {
        isAtAll: message.mentionAll || false,
        atUserIds: message.mentionUsers || [],
      },
    };
  }
  
  return {
    msgtype: 'text',
    text: {
      content: `${message.title}\n\n${message.content}`,
    },
    at: {
      isAtAll: message.mentionAll || false,
      atUserIds: message.mentionUsers || [],
    },
  };
}

/**
 * 格式化飞书消息
 */
function formatFeishuMessage(message: WebhookMessage): object {
  if (message.type === 'card') {
    return {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: message.title,
          },
          template: 'blue',
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: message.content,
            },
          },
        ],
      },
    };
  }
  
  return {
    msg_type: 'text',
    content: {
      text: `${message.title}\n\n${message.content}`,
    },
  };
}

/**
 * 格式化自定义Webhook消息
 */
function formatCustomMessage(message: WebhookMessage): object {
  return {
    title: message.title,
    content: message.content,
    type: message.type || 'text',
    timestamp: new Date().toISOString(),
  };
}

/**
 * 发送企业微信消息
 */
export async function sendWeComMessage(
  webhookUrl: string,
  message: WebhookMessage
): Promise<WebhookResult> {
  const payload = formatWeComMessage(message);
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    return {
      success: result.errcode === 0,
      webhookId: 'wecom',
      webhookName: '企业微信',
      error: result.errcode !== 0 ? result.errmsg : undefined,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      webhookId: 'wecom',
      webhookName: '企业微信',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * 发送钉钉消息
 */
export async function sendDingTalkMessage(
  webhookUrl: string,
  message: WebhookMessage
): Promise<WebhookResult> {
  const payload = formatDingTalkMessage(message);
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    return {
      success: result.errcode === 0,
      webhookId: 'dingtalk',
      webhookName: '钉钉',
      error: result.errcode !== 0 ? result.errmsg : undefined,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      webhookId: 'dingtalk',
      webhookName: '钉钉',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * 发送飞书消息
 */
export async function sendFeishuMessage(
  webhookUrl: string,
  message: WebhookMessage
): Promise<WebhookResult> {
  const payload = formatFeishuMessage(message);
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    return {
      success: result.code === 0,
      webhookId: 'feishu',
      webhookName: '飞书',
      error: result.code !== 0 ? result.msg : undefined,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      webhookId: 'feishu',
      webhookName: '飞书',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * 发送自定义Webhook消息
 */
export async function sendCustomWebhookMessage(
  webhookUrl: string,
  message: WebhookMessage
): Promise<WebhookResult> {
  const payload = formatCustomMessage(message);
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    return {
      success: response.ok,
      webhookId: 'custom',
      webhookName: '自定义Webhook',
      error: !response.ok ? `HTTP ${response.status}` : undefined,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      webhookId: 'custom',
      webhookName: '自定义Webhook',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * 广播消息到多个Webhook
 */
export async function broadcastWebhookMessage(
  webhooks: WebhookConfig[],
  message: WebhookMessage
): Promise<WebhookResult[]> {
  const results: WebhookResult[] = [];
  
  for (const webhook of webhooks) {
    if (!webhook.enabled) continue;
    
    let result: WebhookResult;
    
    switch (webhook.type) {
      case 'wecom':
        result = await sendWeComMessage(webhook.url, message);
        break;
      case 'dingtalk':
        result = await sendDingTalkMessage(webhook.url, message);
        break;
      case 'feishu':
        result = await sendFeishuMessage(webhook.url, message);
        break;
      case 'custom':
      default:
        result = await sendCustomWebhookMessage(webhook.url, message);
        break;
    }
    
    result.webhookId = webhook.id;
    result.webhookName = webhook.name;
    results.push(result);
  }
  
  return results;
}

/**
 * 发送会议提醒Webhook
 */
export async function sendMeetingReminderWebhook(
  webhooks: WebhookConfig[],
  meetingInfo: {
    title: string;
    startTime: Date;
    location: string;
    participants: string[];
  }
): Promise<WebhookResult[]> {
  const message: WebhookMessage = {
    title: '📅 会议提醒',
    content: `**${meetingInfo.title}**\n\n` +
      `⏰ 时间: ${meetingInfo.startTime.toLocaleString()}\n` +
      `📍 地点: ${meetingInfo.location}\n` +
      `👥 参与者: ${meetingInfo.participants?.join(', ') || '无'}`,
    type: 'markdown',
    mentionUsers: meetingInfo.participants,
  };
  
  return broadcastWebhookMessage(webhooks, message);
}

/**
 * 注册Webhook
 */
export function registerWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>): WebhookConfig {
  const webhook: WebhookConfig = {
    ...config,
    id: `webhook-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  webhookStore.set(webhook.id, webhook);
  return webhook;
}

/**
 * 获取所有Webhook
 */
export function getAllWebhooks(): WebhookConfig[] {
  return Array.from(webhookStore.values());
}

/**
 * 获取单个Webhook
 */
export function getWebhook(id: string): WebhookConfig | undefined {
  return webhookStore.get(id);
}

/**
 * 更新Webhook
 */
export function updateWebhook(id: string, updates: Partial<WebhookConfig>): WebhookConfig | null {
  const webhook = webhookStore.get(id);
  if (!webhook) return null;
  
  Object.assign(webhook, updates, { updatedAt: new Date() });
  return webhook;
}

/**
 * 删除Webhook
 */
export function deleteWebhook(id: string): boolean {
  return webhookStore.delete(id);
}
