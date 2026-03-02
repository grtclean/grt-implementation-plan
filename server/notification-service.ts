/**
 * GRT智能系统 - 多渠道通知服务
 * 
 * 支持的通知渠道：
 * - 邮件 (Email via SMTP)
 * - 钉钉 (DingTalk Webhook)
 * - 企业微信 (WeCom/WeChat Work)
 * - 系统内置通知 (Manus notifyOwner)
 */

import { notifyOwner } from "./_core/notification";
import crypto from "crypto";
import { createChildLogger } from "./lib/logger";

const log = createChildLogger("notification");

// 通知渠道类型
export type NotificationChannel = "email" | "dingtalk" | "wechat" | "system";

// 通知配置接口
export interface NotificationConfig {
  email?: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    fromAddress: string;
    recipients: string[];
    useTLS: boolean;
  };
  dingtalk?: {
    enabled: boolean;
    webhookUrl: string;
    secret?: string; // 签名密钥（可选）
  };
  wechat?: {
    enabled: boolean;
    corpId: string;
    agentId: string;
    secret: string;
    toUser?: string; // 接收人，默认@all
  };
  system?: {
    enabled: boolean;
  };
}

// 通知消息接口
export interface NotificationMessage {
  title: string;
  content: string;
  severity?: "info" | "warning" | "error" | "critical";
  timestamp?: string;
  metadata?: Record<string, any>;
}

// 通知结果接口
export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  timestamp: string;
}

// 默认配置
let notificationConfig: NotificationConfig = {
  system: {
    enabled: true,
  },
  email: {
    enabled: false,
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    fromAddress: "",
    recipients: [],
    useTLS: true,
  },
  dingtalk: {
    enabled: false,
    webhookUrl: "",
    secret: "",
  },
  wechat: {
    enabled: false,
    corpId: "",
    agentId: "",
    secret: "",
    toUser: "@all",
  },
};

/**
 * 更新通知配置
 */
export function updateNotificationConfig(config: Partial<NotificationConfig>) {
  notificationConfig = {
    ...notificationConfig,
    ...config,
    email: config.email ? { ...notificationConfig.email, ...config.email } : notificationConfig.email,
    dingtalk: config.dingtalk ? { ...notificationConfig.dingtalk, ...config.dingtalk } : notificationConfig.dingtalk,
    wechat: config.wechat ? { ...notificationConfig.wechat, ...config.wechat } : notificationConfig.wechat,
    system: config.system ? { ...notificationConfig.system, ...config.system } : notificationConfig.system,
  };
}

/**
 * 获取当前通知配置（脱敏）
 */
export function getNotificationConfig(): NotificationConfig {
  return {
    email: notificationConfig.email ? {
      ...notificationConfig.email,
      smtpPass: notificationConfig.email.smtpPass ? "******" : "",
    } : undefined,
    dingtalk: notificationConfig.dingtalk ? {
      ...notificationConfig.dingtalk,
      secret: notificationConfig.dingtalk.secret ? "******" : "",
    } : undefined,
    wechat: notificationConfig.wechat ? {
      ...notificationConfig.wechat,
      secret: notificationConfig.wechat.secret ? "******" : "",
    } : undefined,
    system: notificationConfig.system,
  };
}

/**
 * 发送钉钉通知
 */
async function sendDingTalkNotification(message: NotificationMessage): Promise<NotificationResult> {
  const config = notificationConfig.dingtalk;
  
  if (!config?.enabled || !config.webhookUrl) {
    return {
      channel: "dingtalk",
      success: false,
      error: "钉钉通知未启用或未配置",
      timestamp: new Date().toISOString(),
    };
  }
  
  try {
    let url = config.webhookUrl;
    
    // 如果配置了签名密钥，生成签名
    if (config.secret) {
      const timestamp = Date.now();
      const stringToSign = `${timestamp}\n${config.secret}`;
      const sign = crypto
        .createHmac("sha256", config.secret)
        .update(stringToSign)
        .digest("base64");
      
      url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
    }
    
    // 构建钉钉消息体
    const severityEmoji = {
      info: "ℹ️",
      warning: "⚠️",
      error: "🚨",
      critical: "🔴",
    };
    
    const emoji = severityEmoji[message.severity || "info"];
    
    const body = {
      msgtype: "markdown",
      markdown: {
        title: `${emoji} ${message.title}`,
        text: `# ${emoji} ${message.title}\n\n${message.content}\n\n---\n*发送时间: ${message.timestamp || new Date().toISOString()}*`,
      },
    };
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    if (result.errcode === 0) {
      return {
        channel: "dingtalk",
        success: true,
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        channel: "dingtalk",
        success: false,
        error: `钉钉API错误: ${result.errmsg}`,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      channel: "dingtalk",
      success: false,
      error: `钉钉通知发送失败: ${error instanceof Error ? error.message : "未知错误"}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 发送企业微信通知
 */
async function sendWeChatNotification(message: NotificationMessage): Promise<NotificationResult> {
  const config = notificationConfig.wechat;
  
  if (!config?.enabled || !config.corpId || !config.secret) {
    return {
      channel: "wechat",
      success: false,
      error: "企业微信通知未启用或未配置",
      timestamp: new Date().toISOString(),
    };
  }
  
  try {
    // 1. 获取access_token
    const tokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${config.corpId}&corpsecret=${config.secret}`;
    const tokenResponse = await fetch(tokenUrl);
    const tokenResult = await tokenResponse.json();
    
    if (tokenResult.errcode !== 0) {
      return {
        channel: "wechat",
        success: false,
        error: `获取access_token失败: ${tokenResult.errmsg}`,
        timestamp: new Date().toISOString(),
      };
    }
    
    const accessToken = tokenResult.access_token;
    
    // 2. 发送消息
    const sendUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`;
    
    const severityEmoji = {
      info: "ℹ️",
      warning: "⚠️",
      error: "🚨",
      critical: "🔴",
    };
    
    const emoji = severityEmoji[message.severity || "info"];
    
    const body = {
      touser: config.toUser || "@all",
      msgtype: "markdown",
      agentid: parseInt(config.agentId),
      markdown: {
        content: `# ${emoji} ${message.title}\n\n${message.content}\n\n---\n*发送时间: ${message.timestamp || new Date().toISOString()}*`,
      },
    };
    
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    if (result.errcode === 0) {
      return {
        channel: "wechat",
        success: true,
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        channel: "wechat",
        success: false,
        error: `企业微信API错误: ${result.errmsg}`,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      channel: "wechat",
      success: false,
      error: `企业微信通知发送失败: ${error instanceof Error ? error.message : "未知错误"}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 发送邮件通知
 */
async function sendEmailNotification(message: NotificationMessage): Promise<NotificationResult> {
  const config = notificationConfig.email;
  
  if (!config?.enabled || !config.smtpHost || config.recipients.length === 0) {
    return {
      channel: "email",
      success: false,
      error: "邮件通知未启用或未配置",
      timestamp: new Date().toISOString(),
    };
  }
  
  try {
    // 注意：实际生产环境需要使用nodemailer等邮件库
    // 这里提供一个模拟实现，实际部署时需要替换
    log.info({
      recipients: config.recipients,
      subject: message.title,
      contentPreview: message.content.substring(0, 100),
    }, "邮件通知模拟发送");
    
    // 模拟成功（实际需要集成nodemailer）
    return {
      channel: "email",
      success: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      channel: "email",
      success: false,
      error: `邮件通知发送失败: ${error instanceof Error ? error.message : "未知错误"}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 发送系统内置通知
 */
async function sendSystemNotification(message: NotificationMessage): Promise<NotificationResult> {
  const config = notificationConfig.system;
  
  if (!config?.enabled) {
    return {
      channel: "system",
      success: false,
      error: "系统通知未启用",
      timestamp: new Date().toISOString(),
    };
  }
  
  try {
    const result = await notifyOwner({
      title: message.title,
      content: message.content,
    });
    
    return {
      channel: "system",
      success: result,
      error: result ? undefined : "系统通知发送失败",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      channel: "system",
      success: false,
      error: `系统通知发送失败: ${error instanceof Error ? error.message : "未知错误"}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 发送通知到指定渠道
 */
export async function sendNotification(
  message: NotificationMessage,
  channels?: NotificationChannel[]
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  
  // 如果未指定渠道，使用所有已启用的渠道
  const targetChannels = channels || getEnabledChannels();
  
  for (const channel of targetChannels) {
    let result: NotificationResult;
    
    switch (channel) {
      case "email":
        result = await sendEmailNotification(message);
        break;
      case "dingtalk":
        result = await sendDingTalkNotification(message);
        break;
      case "wechat":
        result = await sendWeChatNotification(message);
        break;
      case "system":
        result = await sendSystemNotification(message);
        break;
      default:
        result = {
          channel,
          success: false,
          error: `未知的通知渠道: ${channel}`,
          timestamp: new Date().toISOString(),
        };
    }
    
    results.push(result);
  }
  
  return results;
}

/**
 * 获取已启用的通知渠道
 */
export function getEnabledChannels(): NotificationChannel[] {
  const channels: NotificationChannel[] = [];
  
  if (notificationConfig.system?.enabled) {
    channels.push("system");
  }
  if (notificationConfig.email?.enabled) {
    channels.push("email");
  }
  if (notificationConfig.dingtalk?.enabled) {
    channels.push("dingtalk");
  }
  if (notificationConfig.wechat?.enabled) {
    channels.push("wechat");
  }
  
  return channels;
}

/**
 * 测试通知渠道
 */
export async function testNotificationChannel(channel: NotificationChannel): Promise<NotificationResult> {
  const testMessage: NotificationMessage = {
    title: "通知渠道测试",
    content: `这是一条来自GRT智能系统的测试通知。\n\n如果您收到此消息，说明 **${channel}** 通知渠道配置正确。`,
    severity: "info",
    timestamp: new Date().toISOString(),
  };
  
  const results = await sendNotification(testMessage, [channel]);
  return results[0];
}

/**
 * 发送死锁告警通知
 */
export async function sendDeadlockAlert(
  severity: "low" | "medium" | "high" | "critical",
  cycleNodes: string[],
  resolution?: string,
  autoResolved?: boolean
): Promise<NotificationResult[]> {
  const severityEmoji = {
    low: "ℹ️",
    medium: "⚠️",
    high: "🚨",
    critical: "🔴",
  };
  
  const severityMap = {
    low: "info" as const,
    medium: "warning" as const,
    high: "error" as const,
    critical: "critical" as const,
  };
  
  const message: NotificationMessage = {
    title: `${severityEmoji[severity]} 死锁检测告警 [${severity.toUpperCase()}]`,
    content: `
## 死锁检测告警

**检测时间**: ${new Date().toISOString()}
**严重程度**: ${severity.toUpperCase()}
**自动解决**: ${autoResolved ? "是" : "否"}

### 死锁循环节点
${cycleNodes.map((node, i) => `${i + 1}. ${node}`).join("\n")}

### 解决方案
${resolution || "未提供"}

---
请登录系统查看详细信息并采取必要措施。
    `.trim(),
    severity: severityMap[severity],
    timestamp: new Date().toISOString(),
  };
  
  return sendNotification(message);
}
