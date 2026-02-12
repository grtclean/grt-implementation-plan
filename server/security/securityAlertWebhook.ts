/**
 * 安全告警Webhook集成服务
 * 当检测到入侵尝试时自动发送企业微信/钉钉/飞书通知
 */

import { 
  WebhookMessage, 
  WebhookResult, 
  sendWeComMessage, 
  sendDingTalkMessage, 
  sendFeishuMessage 
} from '../webhook';

// 安全告警级别
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

// 安全告警类型
export type SecurityAlertType = 
  | 'intrusion_attempt'      // 入侵尝试
  | 'rate_limit_exceeded'    // 速率限制超出
  | 'ip_blocked'             // IP被封禁
  | 'sql_injection'          // SQL注入检测
  | 'xss_attack'             // XSS攻击检测
  | 'command_injection'      // 命令注入检测
  | 'unauthorized_access'    // 未授权访问
  | 'suspicious_activity'    // 可疑活动
  | 'license_violation'      // 许可证违规
  | 'data_exfiltration';     // 数据外泄尝试

// 安全告警配置
export interface SecurityAlertConfig {
  id: string;
  name: string;
  enabled: boolean;
  webhookType: 'wecom' | 'dingtalk' | 'feishu' | 'custom';
  webhookUrl: string;
  secret?: string;
  alertTypes: SecurityAlertType[];
  minSeverity: AlertSeverity;
  mentionAll: boolean;
  mentionUsers: string[];
  cooldownMinutes: number; // 冷却时间，避免告警风暴
  createdAt: Date;
  updatedAt: Date;
}

// 安全告警事件
export interface SecurityAlertEvent {
  id: string;
  type: SecurityAlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  sourceIp?: string;
  userId?: string;
  targetResource?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// 告警发送记录
export interface AlertSendRecord {
  alertId: string;
  configId: string;
  success: boolean;
  error?: string;
  sentAt: Date;
}

// 内存存储（实际应用中应使用数据库）
const alertConfigs: Map<string, SecurityAlertConfig> = new Map();
const alertHistory: AlertSendRecord[] = [];
const lastAlertTime: Map<string, Date> = new Map(); // 用于冷却时间检查

// 默认告警配置
const DEFAULT_COOLDOWN_MINUTES = 5;

/**
 * 获取告警级别对应的颜色和图标
 */
function getSeverityInfo(severity: AlertSeverity): { color: string; emoji: string; level: number } {
  switch (severity) {
    case 'info':
      return { color: 'blue', emoji: 'ℹ️', level: 1 };
    case 'warning':
      return { color: 'yellow', emoji: '⚠️', level: 2 };
    case 'critical':
      return { color: 'orange', emoji: '🚨', level: 3 };
    case 'emergency':
      return { color: 'red', emoji: '🆘', level: 4 };
    default:
      return { color: 'gray', emoji: '📢', level: 0 };
  }
}

/**
 * 获取告警类型的中文描述
 */
function getAlertTypeDescription(type: SecurityAlertType): string {
  const descriptions: Record<SecurityAlertType, string> = {
    intrusion_attempt: '入侵尝试',
    rate_limit_exceeded: '速率限制超出',
    ip_blocked: 'IP被封禁',
    sql_injection: 'SQL注入检测',
    xss_attack: 'XSS攻击检测',
    command_injection: '命令注入检测',
    unauthorized_access: '未授权访问',
    suspicious_activity: '可疑活动',
    license_violation: '许可证违规',
    data_exfiltration: '数据外泄尝试',
  };
  return descriptions[type] || type;
}

/**
 * 格式化安全告警消息
 */
function formatSecurityAlertMessage(event: SecurityAlertEvent): WebhookMessage {
  const severityInfo = getSeverityInfo(event.severity);
  const typeDesc = getAlertTypeDescription(event.type);
  
  const content = [
    `**告警类型**: ${typeDesc}`,
    `**告警级别**: ${severityInfo.emoji} ${event.severity.toUpperCase()}`,
    `**时间**: ${event.timestamp.toLocaleString('zh-CN')}`,
    event.sourceIp ? `**来源IP**: ${event.sourceIp}` : null,
    event.userId ? `**用户ID**: ${event.userId}` : null,
    event.targetResource ? `**目标资源**: ${event.targetResource}` : null,
    '',
    `**详情**: ${event.description}`,
  ].filter(Boolean).join('\n');
  
  return {
    title: `${severityInfo.emoji} GRT安全告警: ${event.title}`,
    content,
    type: 'markdown',
    mentionAll: event.severity === 'emergency' || event.severity === 'critical',
  };
}

/**
 * 检查是否在冷却时间内
 */
function isInCooldown(configId: string, cooldownMinutes: number): boolean {
  const lastTime = lastAlertTime.get(configId);
  if (!lastTime) return false;
  
  const cooldownMs = cooldownMinutes * 60 * 1000;
  return Date.now() - lastTime.getTime() < cooldownMs;
}

/**
 * 检查告警级别是否满足最低要求
 */
function meetsSeverityRequirement(eventSeverity: AlertSeverity, minSeverity: AlertSeverity): boolean {
  const severityLevels: Record<AlertSeverity, number> = {
    info: 1,
    warning: 2,
    critical: 3,
    emergency: 4,
  };
  return severityLevels[eventSeverity] >= severityLevels[minSeverity];
}

/**
 * 发送安全告警到Webhook
 */
export async function sendSecurityAlert(
  event: SecurityAlertEvent,
  config: SecurityAlertConfig
): Promise<WebhookResult> {
  // 检查是否启用
  if (!config.enabled) {
    return {
      success: false,
      webhookId: config.id,
      webhookName: config.name,
      error: '告警配置未启用',
      timestamp: new Date(),
    };
  }
  
  // 检查告警类型是否匹配
  if (!config.alertTypes.includes(event.type)) {
    return {
      success: false,
      webhookId: config.id,
      webhookName: config.name,
      error: '告警类型不匹配',
      timestamp: new Date(),
    };
  }
  
  // 检查告警级别是否满足要求
  if (!meetsSeverityRequirement(event.severity, config.minSeverity)) {
    return {
      success: false,
      webhookId: config.id,
      webhookName: config.name,
      error: '告警级别不满足最低要求',
      timestamp: new Date(),
    };
  }
  
  // 检查冷却时间
  if (isInCooldown(config.id, config.cooldownMinutes)) {
    return {
      success: false,
      webhookId: config.id,
      webhookName: config.name,
      error: `在冷却时间内（${config.cooldownMinutes}分钟）`,
      timestamp: new Date(),
    };
  }
  
  // 格式化消息
  const message = formatSecurityAlertMessage(event);
  message.mentionAll = config.mentionAll || message.mentionAll;
  message.mentionUsers = config.mentionUsers;
  
  // 根据Webhook类型发送
  let result: WebhookResult;
  
  switch (config.webhookType) {
    case 'wecom':
      result = await sendWeComMessage(config.webhookUrl, message);
      break;
    case 'dingtalk':
      result = await sendDingTalkMessage(config.webhookUrl, message);
      break;
    case 'feishu':
      result = await sendFeishuMessage(config.webhookUrl, message);
      break;
    case 'custom':
      // 自定义Webhook使用通用格式
      try {
        const response = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event,
            message,
            timestamp: new Date().toISOString(),
          }),
        });
        result = {
          success: response.ok,
          webhookId: config.id,
          webhookName: config.name,
          error: response.ok ? undefined : `HTTP ${response.status}`,
          timestamp: new Date(),
        };
      } catch (error) {
        result = {
          success: false,
          webhookId: config.id,
          webhookName: config.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
      break;
    default:
      result = {
        success: false,
        webhookId: config.id,
        webhookName: config.name,
        error: `不支持的Webhook类型: ${config.webhookType}`,
        timestamp: new Date(),
      };
  }
  
  // 更新最后发送时间
  if (result.success) {
    lastAlertTime.set(config.id, new Date());
  }
  
  // 记录发送历史
  alertHistory.push({
    alertId: event.id,
    configId: config.id,
    success: result.success,
    error: result.error,
    sentAt: new Date(),
  });
  
  return result;
}

/**
 * 广播安全告警到所有匹配的配置
 */
export async function broadcastSecurityAlert(event: SecurityAlertEvent): Promise<WebhookResult[]> {
  const results: WebhookResult[] = [];
  
  for (const config of Array.from(alertConfigs.values())) {
    const result = await sendSecurityAlert(event, config);
    results.push(result);
  }
  
  return results;
}

/**
 * 创建安全告警事件
 */
export function createSecurityAlertEvent(
  type: SecurityAlertType,
  severity: AlertSeverity,
  title: string,
  description: string,
  options?: {
    sourceIp?: string;
    userId?: string;
    targetResource?: string;
    details?: Record<string, any>;
  }
): SecurityAlertEvent {
  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    title,
    description,
    sourceIp: options?.sourceIp,
    userId: options?.userId,
    targetResource: options?.targetResource,
    details: options?.details,
    timestamp: new Date(),
  };
}

// ==================== 告警配置管理 ====================

/**
 * 添加告警配置
 */
export function addAlertConfig(config: Omit<SecurityAlertConfig, 'id' | 'createdAt' | 'updatedAt'>): SecurityAlertConfig {
  const id = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  
  const newConfig: SecurityAlertConfig = {
    ...config,
    id,
    createdAt: now,
    updatedAt: now,
  };
  
  alertConfigs.set(id, newConfig);
  return newConfig;
}

/**
 * 更新告警配置
 */
export function updateAlertConfig(id: string, updates: Partial<SecurityAlertConfig>): SecurityAlertConfig | null {
  const config = alertConfigs.get(id);
  if (!config) return null;
  
  const updatedConfig: SecurityAlertConfig = {
    ...config,
    ...updates,
    id, // 确保ID不被覆盖
    createdAt: config.createdAt, // 确保创建时间不被覆盖
    updatedAt: new Date(),
  };
  
  alertConfigs.set(id, updatedConfig);
  return updatedConfig;
}

/**
 * 删除告警配置
 */
export function deleteAlertConfig(id: string): boolean {
  return alertConfigs.delete(id);
}

/**
 * 获取告警配置
 */
export function getAlertConfig(id: string): SecurityAlertConfig | undefined {
  return alertConfigs.get(id);
}

/**
 * 获取所有告警配置
 */
export function getAllAlertConfigs(): SecurityAlertConfig[] {
  return Array.from(alertConfigs.values());
}

/**
 * 启用/禁用告警配置
 */
export function toggleAlertConfig(id: string, enabled: boolean): SecurityAlertConfig | null {
  return updateAlertConfig(id, { enabled });
}

/**
 * 获取告警发送历史
 */
export function getAlertHistory(options?: {
  configId?: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}): AlertSendRecord[] {
  let records = [...alertHistory];
  
  if (options?.configId) {
    records = records.filter(r => r.configId === options.configId);
  }
  
  if (options?.startDate) {
    records = records.filter(r => r.sentAt >= options.startDate!);
  }
  
  if (options?.endDate) {
    records = records.filter(r => r.sentAt <= options.endDate!);
  }
  
  // 按时间倒序
  records.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  
  if (options?.limit) {
    records = records.slice(0, options.limit);
  }
  
  return records;
}

/**
 * 获取告警统计
 */
export function getAlertStats(): {
  totalConfigs: number;
  enabledConfigs: number;
  totalAlertsSent: number;
  successfulAlerts: number;
  failedAlerts: number;
  last24HoursAlerts: number;
} {
  const configs = Array.from(alertConfigs.values());
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return {
    totalConfigs: configs.length,
    enabledConfigs: configs.filter(c => c.enabled).length,
    totalAlertsSent: alertHistory.length,
    successfulAlerts: alertHistory.filter(r => r.success).length,
    failedAlerts: alertHistory.filter(r => !r.success).length,
    last24HoursAlerts: alertHistory.filter(r => r.sentAt >= oneDayAgo).length,
  };
}

/**
 * 测试告警配置
 */
export async function testAlertConfig(configId: string): Promise<WebhookResult> {
  const config = alertConfigs.get(configId);
  if (!config) {
    return {
      success: false,
      webhookId: configId,
      webhookName: 'Unknown',
      error: '配置不存在',
      timestamp: new Date(),
    };
  }
  
  // 创建测试告警事件
  const testEvent = createSecurityAlertEvent(
    'suspicious_activity',
    'info',
    '测试告警',
    '这是一条测试告警消息，用于验证Webhook配置是否正确。',
    {
      sourceIp: '127.0.0.1',
      targetResource: '/api/test',
      details: { test: true },
    }
  );
  
  // 临时启用配置以发送测试
  const originalEnabled = config.enabled;
  config.enabled = true;
  
  // 临时禁用冷却时间
  const originalCooldown = config.cooldownMinutes;
  config.cooldownMinutes = 0;
  
  const result = await sendSecurityAlert(testEvent, config);
  
  // 恢复原始配置
  config.enabled = originalEnabled;
  config.cooldownMinutes = originalCooldown;
  
  return result;
}

// ==================== 预置告警配置模板 ====================

/**
 * 获取预置告警配置模板
 */
export function getAlertConfigTemplates(): Omit<SecurityAlertConfig, 'id' | 'createdAt' | 'updatedAt' | 'webhookUrl'>[] {
  return [
    {
      name: '入侵检测告警（企业微信）',
      enabled: true,
      webhookType: 'wecom',
      alertTypes: ['intrusion_attempt', 'sql_injection', 'xss_attack', 'command_injection'],
      minSeverity: 'warning',
      mentionAll: false,
      mentionUsers: [],
      cooldownMinutes: 5,
    },
    {
      name: '紧急安全告警（钉钉）',
      enabled: true,
      webhookType: 'dingtalk',
      alertTypes: ['intrusion_attempt', 'unauthorized_access', 'data_exfiltration', 'license_violation'],
      minSeverity: 'critical',
      mentionAll: true,
      mentionUsers: [],
      cooldownMinutes: 1,
    },
    {
      name: '全量安全告警（飞书）',
      enabled: true,
      webhookType: 'feishu',
      alertTypes: [
        'intrusion_attempt', 'rate_limit_exceeded', 'ip_blocked', 
        'sql_injection', 'xss_attack', 'command_injection',
        'unauthorized_access', 'suspicious_activity', 'license_violation', 'data_exfiltration'
      ],
      minSeverity: 'info',
      mentionAll: false,
      mentionUsers: [],
      cooldownMinutes: 10,
    },
  ];
}

/**
 * 从模板创建告警配置
 */
export function createAlertConfigFromTemplate(
  templateIndex: number,
  webhookUrl: string,
  overrides?: Partial<SecurityAlertConfig>
): SecurityAlertConfig | null {
  const templates = getAlertConfigTemplates();
  if (templateIndex < 0 || templateIndex >= templates.length) {
    return null;
  }
  
  const template = templates[templateIndex];
  return addAlertConfig({
    ...template,
    webhookUrl,
    ...overrides,
  });
}
