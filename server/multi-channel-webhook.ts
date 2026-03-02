/**
 * 多渠道Webhook服务模块
 * 支持钉钉、企业微信、飞书三种通知渠道
 */

import crypto from 'crypto';

// ==================== 类型定义 ====================

export type WebhookChannel = 'dingtalk' | 'wecom' | 'feishu';

export interface WebhookConfig {
  channel: WebhookChannel;
  webhookUrl: string;
  secret?: string;  // 钉钉加签密钥 / 企业微信签名密钥
  keyword?: string; // 钉钉自定义关键词
  enabled: boolean;
}

export interface WebhookMessage {
  title: string;
  content: string;
  type?: 'text' | 'markdown';
  atAll?: boolean;
  atMobiles?: string[];
}

export interface WebhookResult {
  success: boolean;
  channel: WebhookChannel;
  error?: string;
  response?: any;
}

// ==================== 钉钉Webhook ====================

/**
 * 生成钉钉加签签名
 */
function generateDingTalkSign(timestamp: number, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  const sign = hmac.digest('base64');
  return encodeURIComponent(sign);
}

/**
 * 发送钉钉消息
 */
export async function sendDingTalkMessage(
  config: WebhookConfig,
  message: WebhookMessage
): Promise<WebhookResult> {
  let url = config.webhookUrl;
  
  // 如果有加签密钥，添加签名
  if (config.secret) {
    const timestamp = Date.now();
    const sign = generateDingTalkSign(timestamp, config.secret);
    url = `${url}&timestamp=${timestamp}&sign=${sign}`;
  }
  
  // 构建消息体
  const keyword = config.keyword || '';
  let payload: any;
  
  if (message.type === 'markdown') {
    payload = {
      msgtype: 'markdown',
      markdown: {
        title: message.title,
        text: `### ${message.title}\n\n${message.content}${keyword ? `\n\n[${keyword}]` : ''}`,
      },
      at: {
        atMobiles: message.atMobiles || [],
        isAtAll: message.atAll || false,
      },
    };
  } else {
    payload = {
      msgtype: 'text',
      text: {
        content: `${message.title}\n\n${message.content}${keyword ? `\n\n[${keyword}]` : ''}`,
      },
      at: {
        atMobiles: message.atMobiles || [],
        isAtAll: message.atAll || false,
      },
    };
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (result.errcode === 0) {
      return { success: true, channel: 'dingtalk', response: result };
    } else {
      return {
        success: false,
        channel: 'dingtalk',
        error: `钉钉API错误: ${result.errcode} - ${result.errmsg}`,
        response: result,
      };
    }
  } catch (error) {
    return {
      success: false,
      channel: 'dingtalk',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== 企业微信Webhook ====================

/**
 * 发送企业微信消息
 * 企业微信群机器人Webhook URL格式：
 * https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx
 */
export async function sendWeComMessage(
  config: WebhookConfig,
  message: WebhookMessage
): Promise<WebhookResult> {
  let payload: any;
  
  if (message.type === 'markdown') {
    // 企业微信markdown格式
    payload = {
      msgtype: 'markdown',
      markdown: {
        content: `### ${message.title}\n\n${message.content}`,
      },
    };
  } else {
    // 企业微信text格式
    payload = {
      msgtype: 'text',
      text: {
        content: `${message.title}\n\n${message.content}`,
        mentioned_list: message.atAll ? ['@all'] : [],
        mentioned_mobile_list: message.atMobiles || [],
      },
    };
  }
  
  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (result.errcode === 0) {
      return { success: true, channel: 'wecom', response: result };
    } else {
      return {
        success: false,
        channel: 'wecom',
        error: `企业微信API错误: ${result.errcode} - ${result.errmsg}`,
        response: result,
      };
    }
  } catch (error) {
    return {
      success: false,
      channel: 'wecom',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== 飞书Webhook ====================

/**
 * 生成飞书签名
 */
function generateFeishuSign(timestamp: number, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', '');
  hmac.update(stringToSign);
  const sign = hmac.digest('base64');
  return sign;
}

/**
 * 发送飞书消息
 * 飞书群机器人Webhook URL格式：
 * https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx
 */
export async function sendFeishuMessage(
  config: WebhookConfig,
  message: WebhookMessage
): Promise<WebhookResult> {
  let payload: any;
  
  // 飞书签名（如果有密钥）
  let timestamp: number | undefined;
  let sign: string | undefined;
  
  if (config.secret) {
    timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `${timestamp}\n${config.secret}`;
    const hmac = crypto.createHmac('sha256', config.secret);
    hmac.update(stringToSign);
    sign = hmac.digest('base64');
  }
  
  if (message.type === 'markdown') {
    // 飞书富文本消息（post类型）
    payload = {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: message.title,
            content: [
              [
                {
                  tag: 'text',
                  text: message.content,
                },
              ],
            ],
          },
        },
      },
    };
  } else {
    // 飞书text格式
    payload = {
      msg_type: 'text',
      content: {
        text: `${message.title}\n\n${message.content}`,
      },
    };
  }
  
  // 添加签名信息
  if (timestamp && sign) {
    payload.timestamp = String(timestamp);
    payload.sign = sign;
  }
  
  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (result.code === 0 || result.StatusCode === 0) {
      return { success: true, channel: 'feishu', response: result };
    } else {
      return {
        success: false,
        channel: 'feishu',
        error: `飞书API错误: ${result.code || result.StatusCode} - ${result.msg || result.StatusMessage}`,
        response: result,
      };
    }
  } catch (error) {
    return {
      success: false,
      channel: 'feishu',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== 统一发送接口 ====================

/**
 * 统一发送消息到指定渠道
 */
export async function sendMessage(
  config: WebhookConfig,
  message: WebhookMessage
): Promise<WebhookResult> {
  if (!config.enabled) {
    return {
      success: false,
      channel: config.channel,
      error: '该渠道未启用',
    };
  }
  
  switch (config.channel) {
    case 'dingtalk':
      return sendDingTalkMessage(config, message);
    case 'wecom':
      return sendWeComMessage(config, message);
    case 'feishu':
      return sendFeishuMessage(config, message);
    default:
      return {
        success: false,
        channel: config.channel,
        error: `不支持的渠道: ${config.channel}`,
      };
  }
}

/**
 * 发送消息到所有已启用的渠道
 */
export async function sendToAllChannels(
  configs: WebhookConfig[],
  message: WebhookMessage
): Promise<WebhookResult[]> {
  const enabledConfigs = configs.filter(c => c.enabled);
  const results = await Promise.all(
    enabledConfigs.map(config => sendMessage(config, message))
  );
  return results;
}

// ==================== 渠道配置管理 ====================

/**
 * 渠道配置存储（内存存储，实际应用中应持久化到数据库）
 */
let channelConfigs: WebhookConfig[] = [
  {
    channel: 'dingtalk',
    webhookUrl: process.env.DINGTALK_WEBHOOK_URL || '',
    secret: process.env.DINGTALK_WEBHOOK_SECRET || '',
    keyword: '1',
    enabled: !!(process.env.DINGTALK_WEBHOOK_URL),
  },
  {
    channel: 'wecom',
    webhookUrl: '',
    enabled: false,
  },
  {
    channel: 'feishu',
    webhookUrl: '',
    enabled: false,
  },
];

/**
 * 获取所有渠道配置
 */
export function getChannelConfigs(): WebhookConfig[] {
  return channelConfigs;
}

/**
 * 获取指定渠道配置
 */
export function getChannelConfig(channel: WebhookChannel): WebhookConfig | undefined {
  return channelConfigs.find(c => c.channel === channel);
}

/**
 * 更新渠道配置
 */
export function updateChannelConfig(config: WebhookConfig): void {
  const index = channelConfigs.findIndex(c => c.channel === config.channel);
  if (index >= 0) {
    channelConfigs[index] = config;
  } else {
    channelConfigs.push(config);
  }
}

/**
 * 启用/禁用渠道
 */
export function setChannelEnabled(channel: WebhookChannel, enabled: boolean): void {
  const config = channelConfigs.find(c => c.channel === channel);
  if (config) {
    config.enabled = enabled;
  }
}

// ==================== 测试函数 ====================

/**
 * 测试指定渠道连接
 */
export async function testChannelConnection(channel: WebhookChannel): Promise<WebhookResult> {
  const config = getChannelConfig(channel);
  if (!config) {
    return {
      success: false,
      channel,
      error: '渠道配置不存在',
    };
  }
  
  if (!config.webhookUrl) {
    return {
      success: false,
      channel,
      error: 'Webhook URL未配置',
    };
  }
  
  const testMessage: WebhookMessage = {
    title: '🔔 GRT系统连接测试',
    content: `这是一条来自GRT智能系统的测试消息。\n\n` +
      `⏰ 发送时间: ${new Date().toLocaleString('zh-CN')}\n` +
      `📡 渠道类型: ${getChannelDisplayName(channel)}\n` +
      `🔐 状态: 连接测试`,
    type: 'markdown',
  };
  
  // 临时启用进行测试
  const originalEnabled = config.enabled;
  config.enabled = true;
  
  const result = await sendMessage(config, testMessage);
  
  // 恢复原始状态
  config.enabled = originalEnabled;
  
  return result;
}

/**
 * 获取渠道显示名称
 */
export function getChannelDisplayName(channel: WebhookChannel): string {
  const names: Record<WebhookChannel, string> = {
    dingtalk: '钉钉',
    wecom: '企业微信',
    feishu: '飞书',
  };
  return names[channel] || channel;
}

/**
 * 获取渠道图标
 */
export function getChannelIcon(channel: WebhookChannel): string {
  const icons: Record<WebhookChannel, string> = {
    dingtalk: '🔔',
    wecom: '💬',
    feishu: '🐦',
  };
  return icons[channel] || '📢';
}
