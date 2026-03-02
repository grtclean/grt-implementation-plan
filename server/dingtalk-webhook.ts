/**
 * 钉钉Webhook服务模块
 * 支持加签安全设置，集成告警和会议提醒功能
 */

import crypto from 'crypto';
import { createChildLogger } from './lib/logger';

const log = createChildLogger("dingtalk-wh");

// 钉钉Webhook配置
export interface DingTalkConfig {
  webhookUrl: string;
  secret: string;
  keyword?: string; // 自定义关键词
  enabled: boolean;
}

// 默认配置（从环境变量读取，禁止硬编码）
const DEFAULT_CONFIG: DingTalkConfig = {
  webhookUrl: process.env.DINGTALK_WEBHOOK_URL ?? '',
  secret: process.env.DINGTALK_WEBHOOK_SECRET ?? '',
  keyword: '1',
  enabled: !!(process.env.DINGTALK_WEBHOOK_URL && process.env.DINGTALK_WEBHOOK_SECRET),
};

// 当前配置
let currentConfig: DingTalkConfig = { ...DEFAULT_CONFIG };

/**
 * 更新钉钉配置
 */
export function updateDingTalkConfig(config: Partial<DingTalkConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 获取当前配置
 */
export function getDingTalkConfig(): DingTalkConfig {
  return { ...currentConfig };
}

/**
 * 生成钉钉加签签名
 */
function generateSign(timestamp: number, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  const sign = hmac.digest('base64');
  return encodeURIComponent(sign);
}

/**
 * 发送钉钉消息（带加签）
 */
export async function sendDingTalkMessage(
  message: {
    title: string;
    content: string;
    type?: 'text' | 'markdown';
    atAll?: boolean;
    atMobiles?: string[];
  },
  config?: DingTalkConfig
): Promise<{ success: boolean; error?: string; response?: any }> {
  const cfg = config || currentConfig;
  
  if (!cfg.enabled) {
    return { success: false, error: '钉钉Webhook未启用' };
  }
  
  // 生成时间戳和签名
  const timestamp = Date.now();
  const sign = generateSign(timestamp, cfg.secret);
  
  // 构建带签名的URL
  const signedUrl = `${cfg.webhookUrl}&timestamp=${timestamp}&sign=${sign}`;
  
  // 在内容中包含关键词以满足自定义关键词要求
  const keywordSuffix = cfg.keyword ? `\n\n---\n[${cfg.keyword}]` : '';
  
  // 构建消息体
  let payload: any;
  
  if (message.type === 'markdown') {
    payload = {
      msgtype: 'markdown',
      markdown: {
        title: message.title,
        text: `### ${message.title}\n\n${message.content}${keywordSuffix}`,
      },
      at: {
        isAtAll: message.atAll || false,
        atMobiles: message.atMobiles || [],
      },
    };
  } else {
    payload = {
      msgtype: 'text',
      text: {
        content: `${message.title}\n\n${message.content}${keywordSuffix}`,
      },
      at: {
        isAtAll: message.atAll || false,
        atMobiles: message.atMobiles || [],
      },
    };
  }
  
  try {
    const response = await fetch(signedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (result.errcode === 0) {
      log.info({ title: message.title }, "消息发送成功");
      return { success: true, response: result };
    } else {
      log.error({ errcode: result.errcode, errmsg: result.errmsg }, "消息发送失败");
      return { 
        success: false, 
        error: `钉钉API错误: ${result.errcode} - ${result.errmsg}`,
        response: result 
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error: errorMsg }, "消息发送异常");
    return {
      success: false,
      error: errorMsg,
    };
  }
}

// ============ 告警消息发送 ============

export type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';

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

const alertLevelIcons: Record<AlertLevel, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🔴',
  emergency: '🚨',
};

const alertLevelText: Record<AlertLevel, string> = {
  info: '信息',
  warning: '警告',
  critical: '严重',
  emergency: '紧急',
};

/**
 * 发送告警到钉钉
 */
export async function sendAlertToDingTalk(alert: AlertMessage): Promise<{
  success: boolean;
  error?: string;
}> {
  const icon = alertLevelIcons[alert.level];
  const levelText = alertLevelText[alert.level];
  
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
  
  return sendDingTalkMessage({
    title: `${icon} ${alert.title}`,
    content,
    type: 'markdown',
    atAll: alert.level === 'emergency' || alert.level === 'critical',
  });
}

/**
 * 发送成本预警到钉钉
 */
export async function sendCostAlertToDingTalk(costAlert: {
  projectId: string;
  projectName: string;
  alertType: string;
  threshold: number;
  currentValue: number;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
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
  
  return sendAlertToDingTalk(alert);
}

/**
 * 发送系统告警到钉钉
 */
export async function sendSystemAlertToDingTalk(systemAlert: {
  type: 'health' | 'performance' | 'security' | 'error';
  title: string;
  description: string;
  severity: AlertLevel;
  details?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
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
  
  return sendAlertToDingTalk(alert);
}

// ============ 会议提醒发送 ============

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

/**
 * 发送会议提醒到钉钉
 */
export async function sendMeetingReminderToDingTalk(meeting: MeetingInfo): Promise<{
  success: boolean;
  error?: string;
}> {
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
  
  content += `\n\n⏰ 会议将在 **${meeting.reminderMinutes}** 分钟后开始`;
  
  return sendDingTalkMessage({
    title: '📅 会议提醒',
    content,
    type: 'markdown',
  });
}

// ============ 测试功能 ============

/**
 * 测试钉钉Webhook连接
 */
export async function testDingTalkConnection(): Promise<{
  success: boolean;
  message: string;
  latency?: number;
}> {
  const startTime = Date.now();
  
  const result = await sendDingTalkMessage({
    title: '🔔 GRT系统连接测试',
    content: `这是一条来自GRT智能系统的测试消息。\n\n` +
      `⏰ 发送时间: ${new Date().toLocaleString('zh-CN')}\n` +
      `📡 Webhook类型: 钉钉群机器人\n` +
      `🔐 安全设置: 加签 + 自定义关键词`,
    type: 'markdown',
  });
  
  const latency = Date.now() - startTime;
  
  return {
    success: result.success,
    message: result.success 
      ? `钉钉Webhook连接成功，延迟: ${latency}ms` 
      : `钉钉Webhook连接失败: ${result.error}`,
    latency,
  };
}

/**
 * 发送测试告警
 */
export async function sendTestAlert(): Promise<{ success: boolean; error?: string }> {
  return sendAlertToDingTalk({
    level: 'info',
    title: 'GRT系统告警测试',
    description: '这是一条测试告警消息，用于验证钉钉Webhook告警功能是否正常工作。',
    source: 'GRT系统测试',
    timestamp: new Date(),
    details: {
      '测试类型': '功能验证',
      '发送方式': '钉钉群机器人',
    },
  });
}

/**
 * 发送测试会议提醒
 */
export async function sendTestMeetingReminder(): Promise<{ success: boolean; error?: string }> {
  return sendMeetingReminderToDingTalk({
    id: 'test-meeting-001',
    title: 'GRT系统周会',
    startTime: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后
    location: '会议室A / 腾讯会议',
    organizer: '系统管理员',
    participants: ['项目经理', '开发团队', '测试团队'],
    agenda: '1. 上周工作总结\n2. 本周工作计划\n3. 问题讨论',
    reminderMinutes: 30,
  });
}
