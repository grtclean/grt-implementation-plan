/**
 * 审计日志服务 (Audit Logger)
 * 
 * 功能：记录系统关键操作的审计日志
 * 
 * 日志类型：
 * 1. 用户操作日志
 * 2. 系统事件日志
 * 3. AI决策日志
 * 4. 安全事件日志
 * 5. 数据变更日志
 */

import { createChildLogger } from "../lib/logger";
const log = createChildLogger("audit");

// 审计日志类型
export type AuditLogType = 
  | 'user_action'      // 用户操作
  | 'system_event'     // 系统事件
  | 'ai_decision'      // AI决策
  | 'security_event'   // 安全事件
  | 'data_change'      // 数据变更
  | 'state_transition' // 状态转换
  | 'api_call'         // API调用
  | 'authentication';  // 认证事件

// 审计日志级别
export type AuditLogLevel = 'info' | 'warning' | 'error' | 'critical';

// 审计日志条目
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  type: AuditLogType;
  level: AuditLogLevel;
  action: string;
  actor: {
    userId?: string;
    userName?: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  target: {
    entityType?: string;
    entityId?: string;
    entityName?: string;
  };
  details: Record<string, any>;
  result: 'success' | 'failure' | 'blocked' | 'pending';
  errorMessage?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

// 审计日志查询参数
export interface AuditLogQuery {
  startDate?: Date;
  endDate?: Date;
  type?: AuditLogType | AuditLogType[];
  level?: AuditLogLevel | AuditLogLevel[];
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  result?: 'success' | 'failure' | 'blocked' | 'pending';
  limit?: number;
  offset?: number;
}

// 内存存储（生产环境应使用数据库）
const auditLogs: AuditLogEntry[] = [];
let logIdCounter = 0;

/**
 * 生成唯一日志ID
 */
function generateLogId(): string {
  logIdCounter++;
  const timestamp = Date.now().toString(36);
  const counter = logIdCounter.toString(36).padStart(4, '0');
  return `AUD_${timestamp}_${counter}`;
}

/**
 * 审计日志服务类
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private enabled: boolean = true;
  private retentionDays: number = 90;

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * 记录审计日志
   */
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    if (!this.enabled) {
      return {} as AuditLogEntry;
    }

    const logEntry: AuditLogEntry = {
      id: generateLogId(),
      timestamp: new Date(),
      ...entry
    };

    auditLogs.push(logEntry);

    // 控制台输出（开发环境）
    this.printLog(logEntry);

    // 触发告警（如果是严重事件）
    if (logEntry.level === 'critical' || logEntry.level === 'error') {
      this.triggerAlert(logEntry);
    }

    return logEntry;
  }

  /**
   * 记录用户操作
   */
  logUserAction(
    action: string,
    actor: AuditLogEntry['actor'],
    target: AuditLogEntry['target'],
    details: Record<string, any>,
    result: AuditLogEntry['result'] = 'success'
  ): AuditLogEntry {
    return this.log({
      type: 'user_action',
      level: result === 'failure' ? 'warning' : 'info',
      action,
      actor,
      target,
      details,
      result
    });
  }

  /**
   * 记录AI决策
   */
  logAIDecision(
    action: string,
    actor: AuditLogEntry['actor'],
    details: {
      input: any;
      output: any;
      model?: string;
      confidence?: number;
      riskScore?: number;
      decision: 'proceed' | 'warn' | 'block';
    },
    result: AuditLogEntry['result'] = 'success'
  ): AuditLogEntry {
    return this.log({
      type: 'ai_decision',
      level: details.decision === 'block' ? 'warning' : 'info',
      action,
      actor,
      target: {},
      details,
      result
    });
  }

  /**
   * 记录安全事件
   */
  logSecurityEvent(
    action: string,
    actor: AuditLogEntry['actor'],
    details: Record<string, any>,
    level: AuditLogLevel = 'warning'
  ): AuditLogEntry {
    return this.log({
      type: 'security_event',
      level,
      action,
      actor,
      target: {},
      details,
      result: level === 'critical' ? 'blocked' : 'success'
    });
  }

  /**
   * 记录状态转换
   */
  logStateTransition(
    entityType: string,
    entityId: string,
    fromState: string,
    toState: string,
    actor: AuditLogEntry['actor'],
    details?: Record<string, any>
  ): AuditLogEntry {
    return this.log({
      type: 'state_transition',
      level: 'info',
      action: `${fromState} -> ${toState}`,
      actor,
      target: { entityType, entityId },
      details: {
        fromState,
        toState,
        ...details
      },
      result: 'success'
    });
  }

  /**
   * 记录数据变更
   */
  logDataChange(
    entityType: string,
    entityId: string,
    changeType: 'create' | 'update' | 'delete',
    actor: AuditLogEntry['actor'],
    changes: {
      before?: Record<string, any>;
      after?: Record<string, any>;
      fields?: string[];
    }
  ): AuditLogEntry {
    return this.log({
      type: 'data_change',
      level: 'info',
      action: changeType,
      actor,
      target: { entityType, entityId },
      details: changes,
      result: 'success'
    });
  }

  /**
   * 记录认证事件
   */
  logAuthentication(
    action: 'login' | 'logout' | 'token_refresh' | 'password_change' | 'mfa_verify',
    actor: AuditLogEntry['actor'],
    result: AuditLogEntry['result'],
    details?: Record<string, any>
  ): AuditLogEntry {
    return this.log({
      type: 'authentication',
      level: result === 'failure' ? 'warning' : 'info',
      action,
      actor,
      target: {},
      details: details || {},
      result
    });
  }

  /**
   * 记录API调用
   */
  logAPICall(
    endpoint: string,
    method: string,
    actor: AuditLogEntry['actor'],
    details: {
      requestBody?: any;
      responseStatus?: number;
      responseTime?: number;
    },
    result: AuditLogEntry['result']
  ): AuditLogEntry {
    return this.log({
      type: 'api_call',
      level: result === 'failure' ? 'warning' : 'info',
      action: `${method} ${endpoint}`,
      actor,
      target: {},
      details,
      result,
      duration: details.responseTime
    });
  }

  /**
   * 查询审计日志
   */
  query(params: AuditLogQuery): {
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  } {
    let filtered = [...auditLogs];

    // 按时间范围过滤
    if (params.startDate) {
      filtered = filtered.filter(log => log.timestamp >= params.startDate!);
    }
    if (params.endDate) {
      filtered = filtered.filter(log => log.timestamp <= params.endDate!);
    }

    // 按类型过滤
    if (params.type) {
      const types = Array.isArray(params.type) ? params.type : [params.type];
      filtered = filtered.filter(log => types.includes(log.type));
    }

    // 按级别过滤
    if (params.level) {
      const levels = Array.isArray(params.level) ? params.level : [params.level];
      filtered = filtered.filter(log => levels.includes(log.level));
    }

    // 按用户过滤
    if (params.userId) {
      filtered = filtered.filter(log => log.actor.userId === params.userId);
    }

    // 按实体过滤
    if (params.entityType) {
      filtered = filtered.filter(log => log.target.entityType === params.entityType);
    }
    if (params.entityId) {
      filtered = filtered.filter(log => log.target.entityId === params.entityId);
    }

    // 按操作过滤
    if (params.action) {
      filtered = filtered.filter(log => log.action.includes(params.action!));
    }

    // 按结果过滤
    if (params.result) {
      filtered = filtered.filter(log => log.result === params.result);
    }

    // 按时间倒序排列
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filtered.length;
    const offset = params.offset || 0;
    const limit = params.limit || 50;

    return {
      logs: filtered.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * 获取统计信息
   */
  getStatistics(startDate?: Date, endDate?: Date): {
    totalLogs: number;
    byType: Record<string, number>;
    byLevel: Record<string, number>;
    byResult: Record<string, number>;
    topActions: Array<{ action: string; count: number }>;
    topUsers: Array<{ userId: string; userName: string; count: number }>;
  } {
    let logs = auditLogs;

    if (startDate) {
      logs = logs.filter(log => log.timestamp >= startDate);
    }
    if (endDate) {
      logs = logs.filter(log => log.timestamp <= endDate);
    }

    const byType: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    const byResult: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};
    const userCounts: Record<string, { userName: string; count: number }> = {};

    for (const log of logs) {
      byType[log.type] = (byType[log.type] || 0) + 1;
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byResult[log.result] = (byResult[log.result] || 0) + 1;
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;

      if (log.actor.userId) {
        if (!userCounts[log.actor.userId]) {
          userCounts[log.actor.userId] = { userName: log.actor.userName || '', count: 0 };
        }
        userCounts[log.actor.userId].count++;
      }
    }

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topUsers = Object.entries(userCounts)
      .map(([userId, data]) => ({ userId, userName: data.userName, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalLogs: logs.length,
      byType,
      byLevel,
      byResult,
      topActions,
      topUsers
    };
  }

  /**
   * 清理过期日志
   */
  cleanup(): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const initialCount = auditLogs.length;
    const remainingLogs = auditLogs.filter(log => log.timestamp >= cutoffDate);
    auditLogs.length = 0;
    auditLogs.push(...remainingLogs);

    return initialCount - auditLogs.length;
  }

  /**
   * 打印日志到控制台
   */
  private printLog(entry: AuditLogEntry): void {
    const levelColors: Record<AuditLogLevel, string> = {
      info: '\x1b[36m',    // Cyan
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      critical: '\x1b[35m' // Magenta
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    log.info({ level: entry.level, type: entry.type, action: entry.action, user: entry.actor.userName || entry.actor.userId || 'system', result: entry.result }, "Audit log entry");
  }

  /**
   * 触发告警
   */
  private triggerAlert(entry: AuditLogEntry): void {
    // TODO: 集成告警服务
    log.error({ level: entry.level, action: entry.action }, "Audit alert triggered");
  }

  /**
   * 启用/禁用审计日志
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 设置日志保留天数
   */
  setRetentionDays(days: number): void {
    this.retentionDays = days;
  }
}

// 导出单例
export const auditLogger = AuditLogger.getInstance();
