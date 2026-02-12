/**
 * GRT智能系统 - 安全审计日志服务
 * 记录所有安全相关事件，支持不可篡改的审计追踪
 */

import { requireDb } from "../db";
import { securityAuditLogs } from "../../drizzle/schema";
import crypto from "crypto";

// 安全事件类型
export type SecurityEventType =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed'
  | 'auth.mfa.success'
  | 'auth.mfa.failed'
  | 'auth.password.change'
  | 'auth.password.reset'
  | 'access.denied'
  | 'access.sensitive'
  | 'access.admin'
  | 'data.view'
  | 'data.export'
  | 'data.modify'
  | 'data.delete'
  | 'system.config.change'
  | 'system.user.create'
  | 'system.user.modify'
  | 'system.user.delete'
  | 'threat.ratelimit'
  | 'threat.injection'
  | 'threat.xss'
  | 'threat.suspicious'
  | 'license.check'
  | 'license.violation';

// 严重程度
export type Severity = 'low' | 'medium' | 'high' | 'critical';

// 审计日志条目
export interface AuditLogEntry {
  eventType: SecurityEventType;
  severity: Severity;
  userId?: number;
  userName?: string;
  ipAddress: string;
  userAgent?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  result: 'success' | 'failure' | 'blocked';
  details?: Record<string, any>;
  requestPath?: string;
  requestMethod?: string;
}

// 事件严重程度映射
const EVENT_SEVERITY_MAP: Record<SecurityEventType, Severity> = {
  'auth.login': 'low',
  'auth.logout': 'low',
  'auth.failed': 'medium',
  'auth.mfa.success': 'low',
  'auth.mfa.failed': 'high',
  'auth.password.change': 'medium',
  'auth.password.reset': 'medium',
  'access.denied': 'medium',
  'access.sensitive': 'high',
  'access.admin': 'high',
  'data.view': 'low',
  'data.export': 'medium',
  'data.modify': 'medium',
  'data.delete': 'high',
  'system.config.change': 'high',
  'system.user.create': 'medium',
  'system.user.modify': 'medium',
  'system.user.delete': 'high',
  'threat.ratelimit': 'medium',
  'threat.injection': 'critical',
  'threat.xss': 'critical',
  'threat.suspicious': 'high',
  'license.check': 'low',
  'license.violation': 'critical',
};

/**
 * 生成事件指纹（用于去重和完整性验证）
 */
function generateFingerprint(entry: AuditLogEntry, timestamp: Date): string {
  const data = JSON.stringify({
    eventType: entry.eventType,
    userId: entry.userId,
    ipAddress: entry.ipAddress,
    action: entry.action,
    resource: entry.resource,
    timestamp: timestamp.toISOString(),
  });
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * 生成链式哈希（确保日志不可篡改）
 */
let lastLogHash = 'GENESIS';

function generateChainHash(entry: AuditLogEntry, fingerprint: string): string {
  const data = `${lastLogHash}:${fingerprint}:${JSON.stringify(entry)}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  lastLogHash = hash;
  return hash;
}

/**
 * 记录安全审计日志
 */
export async function logSecurityEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await requireDb();
    const timestamp = new Date();
    const fingerprint = generateFingerprint(entry, timestamp);
    const chainHash = generateChainHash(entry, fingerprint);
    
    // 自动设置严重程度（如果未指定）
    const severity = entry.severity || EVENT_SEVERITY_MAP[entry.eventType] || 'medium';
    
    await db.insert(securityAuditLogs).values({
      eventType: entry.eventType,
      severity,
      userId: entry.userId,
      userName: entry.userName,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      result: entry.result,
      details: entry.details ? JSON.stringify(entry.details) : null,
      requestPath: entry.requestPath,
      requestMethod: entry.requestMethod,
      fingerprint,
      chainHash,
      createdAt: timestamp.toISOString(),
    });
    
    // 如果是高危或严重事件，触发告警
    if (severity === 'high' || severity === 'critical') {
      await triggerSecurityAlert(entry, severity);
    }
  } catch (error) {
    // 审计日志失败不应影响业务流程，但需要记录到控制台
    console.error('[Security Audit] Failed to log event:', error);
    console.error('[Security Audit] Event data:', JSON.stringify(entry));
  }
}

/**
 * 触发安全告警
 */
async function triggerSecurityAlert(entry: AuditLogEntry, severity: Severity): Promise<void> {
  // TODO: 实现告警通知（邮件、短信、Webhook等）
  console.warn(`[Security Alert] ${severity.toUpperCase()}: ${entry.eventType} - ${entry.action}`);
  console.warn(`[Security Alert] Details:`, JSON.stringify(entry.details));
}

/**
 * 便捷方法：记录登录事件
 */
export async function logLogin(
  userId: number,
  userName: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  details?: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    eventType: success ? 'auth.login' : 'auth.failed',
    severity: success ? 'low' : 'medium',
    userId: success ? userId : undefined,
    userName,
    ipAddress,
    userAgent,
    action: success ? '用户登录成功' : '用户登录失败',
    result: success ? 'success' : 'failure',
    details: {
      ...details,
      attemptedUser: userName,
    },
  });
}

/**
 * 便捷方法：记录敏感数据访问
 */
export async function logSensitiveAccess(
  userId: number,
  userName: string,
  ipAddress: string,
  resource: string,
  resourceId: string,
  action: string,
  allowed: boolean,
  details?: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    eventType: 'access.sensitive',
    severity: 'high',
    userId,
    userName,
    ipAddress,
    action,
    resource,
    resourceId,
    result: allowed ? 'success' : 'blocked',
    details,
  });
}

/**
 * 便捷方法：记录数据导出
 */
export async function logDataExport(
  userId: number,
  userName: string,
  ipAddress: string,
  resource: string,
  recordCount: number,
  format: string,
  details?: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    eventType: 'data.export',
    severity: 'medium',
    userId,
    userName,
    ipAddress,
    action: `导出${resource}数据`,
    resource,
    result: 'success',
    details: {
      ...details,
      recordCount,
      format,
    },
  });
}

/**
 * 便捷方法：记录威胁检测
 */
export async function logThreatDetected(
  threatType: 'ratelimit' | 'injection' | 'xss' | 'suspicious',
  ipAddress: string,
  requestPath: string,
  details: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    eventType: `threat.${threatType}` as SecurityEventType,
    severity: threatType === 'ratelimit' ? 'medium' : 'critical',
    ipAddress,
    action: `检测到${threatType}威胁`,
    requestPath,
    result: 'blocked',
    details,
  });
}

/**
 * 便捷方法：记录系统配置变更
 */
export async function logConfigChange(
  userId: number,
  userName: string,
  ipAddress: string,
  configKey: string,
  oldValue: any,
  newValue: any
): Promise<void> {
  await logSecurityEvent({
    eventType: 'system.config.change',
    severity: 'high',
    userId,
    userName,
    ipAddress,
    action: `修改系统配置: ${configKey}`,
    resource: 'system_config',
    resourceId: configKey,
    result: 'success',
    details: {
      configKey,
      oldValue: typeof oldValue === 'string' && oldValue.length > 100 
        ? oldValue.substring(0, 100) + '...' 
        : oldValue,
      newValue: typeof newValue === 'string' && newValue.length > 100 
        ? newValue.substring(0, 100) + '...' 
        : newValue,
    },
  });
}

/**
 * 便捷方法：记录许可证检查
 */
export async function logLicenseCheck(
  valid: boolean,
  licenseKey: string,
  details?: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    eventType: valid ? 'license.check' : 'license.violation',
    severity: valid ? 'low' : 'critical',
    ipAddress: 'system',
    action: valid ? '许可证验证通过' : '许可证验证失败',
    result: valid ? 'success' : 'failure',
    details: {
      ...details,
      licenseKeyPrefix: licenseKey.substring(0, 8) + '...',
    },
  });
}
