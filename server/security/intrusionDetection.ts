/**
 * GRT智能系统 - 入侵检测服务
 * 实时监控和检测可疑活动
 */

import { logThreatDetected, logSecurityEvent } from "./auditLog";
import { blockIP } from "./rateLimit";

// 威胁类型定义
export type ThreatType = 
  | 'brute_force'
  | 'sql_injection'
  | 'xss_attack'
  | 'path_traversal'
  | 'command_injection'
  | 'credential_stuffing'
  | 'session_hijacking'
  | 'api_abuse'
  | 'data_exfiltration'
  | 'privilege_escalation';

// 威胁事件
export interface ThreatEvent {
  type: ThreatType;
  ipAddress: string;
  userId?: number;
  requestPath: string;
  requestMethod: string;
  payload?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
}

// 检测规则
interface DetectionRule {
  name: string;
  type: ThreatType;
  patterns: RegExp[];
  threshold?: number;
  timeWindowMs?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'block' | 'alert';
}

// 事件追踪器
interface EventTracker {
  count: number;
  firstSeen: number;
  lastSeen: number;
  events: Array<{ timestamp: number; path: string }>;
}

// IP事件追踪
const ipEventTrackers = new Map<string, Map<ThreatType, EventTracker>>();

// 用户行为追踪
const userBehaviorTrackers = new Map<number, {
  lastActivity: number;
  requestCount: number;
  uniquePaths: Set<string>;
  sensitiveAccessCount: number;
}>();

// 检测规则配置
const DETECTION_RULES: DetectionRule[] = [
  // SQL注入检测
  {
    name: 'SQL Injection - Basic',
    type: 'sql_injection',
    patterns: [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|into|table|database)\b)/i,
      /('|")\s*(or|and)\s*('|"|\d)/i,
      /;\s*(drop|delete|update|insert)/i,
      /--\s*$/,
      /\/\*.*\*\//,
      /\bwaitfor\s+delay\b/i,
      /\bsleep\s*\(/i,
      /\bbenchmark\s*\(/i,
    ],
    severity: 'critical',
    action: 'block',
  },
  
  // XSS攻击检测
  {
    name: 'XSS Attack',
    type: 'xss_attack',
    patterns: [
      /<script[^>]*>[\s\S]*?<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<svg[^>]*onload/i,
      /expression\s*\(/i,
    ],
    severity: 'critical',
    action: 'block',
  },
  
  // 路径遍历检测
  {
    name: 'Path Traversal',
    type: 'path_traversal',
    patterns: [
      /\.\.\/|\.\.\\/, 
      /%2e%2e%2f/i,
      /%2e%2e\//i,
      /\.\.%2f/i,
      /etc\/passwd/i,
      /etc\/shadow/i,
      /proc\/self/i,
    ],
    severity: 'high',
    action: 'block',
  },
  
  // 命令注入检测
  {
    name: 'Command Injection',
    type: 'command_injection',
    patterns: [
      /[;&|`$]\s*\b(cat|ls|rm|wget|curl|bash|sh|nc|netcat|python|perl|ruby|php)\b/i,
      /\$\([^)]+\)/,
      /`[^`]+`/,
      /\|\s*(cat|ls|rm|wget|curl)/i,
      />\s*\/dev\/tcp/i,
    ],
    severity: 'critical',
    action: 'block',
  },
  
  // 暴力破解检测
  {
    name: 'Brute Force - Login',
    type: 'brute_force',
    patterns: [
      /\/api\/.*login/i,
      /\/api\/.*auth/i,
      /\/api\/.*signin/i,
    ],
    threshold: 10,
    timeWindowMs: 60000, // 1分钟内10次
    severity: 'high',
    action: 'block',
  },
  
  // API滥用检测
  {
    name: 'API Abuse',
    type: 'api_abuse',
    patterns: [
      /\/api\//i,
    ],
    threshold: 100,
    timeWindowMs: 60000, // 1分钟内100次
    severity: 'medium',
    action: 'alert',
  },
  
  // 凭证填充检测
  {
    name: 'Credential Stuffing',
    type: 'credential_stuffing',
    patterns: [
      /\/api\/.*login/i,
    ],
    threshold: 5,
    timeWindowMs: 300000, // 5分钟内5次不同用户名
    severity: 'high',
    action: 'block',
  },
];

/**
 * 分析请求并检测威胁
 */
export async function analyzeRequest(request: {
  ipAddress: string;
  userId?: number;
  path: string;
  method: string;
  body?: string;
  query?: string;
  headers?: Record<string, string>;
}): Promise<{
  safe: boolean;
  threats: ThreatEvent[];
  blocked: boolean;
}> {
  const threats: ThreatEvent[] = [];
  let shouldBlock = false;
  
  const content = `${request.path} ${request.query || ''} ${request.body || ''}`;
  
  for (const rule of DETECTION_RULES) {
    // 检查模式匹配
    const patternMatched = rule.patterns.some(pattern => pattern.test(content));
    
    if (patternMatched) {
      // 如果有阈值，检查频率
      if (rule.threshold && rule.timeWindowMs) {
        const isThresholdExceeded = checkThreshold(
          request.ipAddress,
          rule.type,
          request.path,
          rule.threshold,
          rule.timeWindowMs
        );
        
        if (!isThresholdExceeded) {
          continue; // 未超过阈值，不触发
        }
      }
      
      const threat: ThreatEvent = {
        type: rule.type,
        ipAddress: request.ipAddress,
        userId: request.userId,
        requestPath: request.path,
        requestMethod: request.method,
        payload: content.length > 500 ? content.substring(0, 500) + '...' : content,
        timestamp: new Date(),
        severity: rule.severity,
        blocked: rule.action === 'block',
      };
      
      threats.push(threat);
      
      if (rule.action === 'block') {
        shouldBlock = true;
      }
      
      // 记录威胁
      await logThreatDetected(
        rule.type === 'sql_injection' ? 'injection' :
        rule.type === 'xss_attack' ? 'xss' :
        'suspicious',
        request.ipAddress,
        request.path,
        {
          ruleName: rule.name,
          severity: rule.severity,
          payload: threat.payload,
        }
      );
    }
  }
  
  // 如果需要阻止，添加到黑名单
  if (shouldBlock) {
    blockIP(request.ipAddress, 30 * 60 * 1000); // 阻止30分钟
  }
  
  return {
    safe: threats.length === 0,
    threats,
    blocked: shouldBlock,
  };
}

/**
 * 检查是否超过阈值
 */
function checkThreshold(
  ipAddress: string,
  threatType: ThreatType,
  path: string,
  threshold: number,
  timeWindowMs: number
): boolean {
  const now = Date.now();
  
  // 获取或创建IP的事件追踪器
  if (!ipEventTrackers.has(ipAddress)) {
    ipEventTrackers.set(ipAddress, new Map());
  }
  const ipTrackers = ipEventTrackers.get(ipAddress)!;
  
  // 获取或创建威胁类型的追踪器
  if (!ipTrackers.has(threatType)) {
    ipTrackers.set(threatType, {
      count: 0,
      firstSeen: now,
      lastSeen: now,
      events: [],
    });
  }
  const tracker = ipTrackers.get(threatType)!;
  
  // 清理过期事件
  tracker.events = tracker.events.filter(e => now - e.timestamp < timeWindowMs);
  
  // 添加新事件
  tracker.events.push({ timestamp: now, path });
  tracker.count = tracker.events.length;
  tracker.lastSeen = now;
  
  return tracker.count >= threshold;
}

/**
 * 分析用户行为异常
 */
export async function analyzeUserBehavior(
  userId: number,
  action: string,
  resource?: string
): Promise<{
  anomaly: boolean;
  score: number;
  reasons: string[];
}> {
  const now = Date.now();
  const reasons: string[] = [];
  let anomalyScore = 0;
  
  // 获取或创建用户行为追踪器
  if (!userBehaviorTrackers.has(userId)) {
    userBehaviorTrackers.set(userId, {
      lastActivity: now,
      requestCount: 0,
      uniquePaths: new Set(),
      sensitiveAccessCount: 0,
    });
  }
  const tracker = userBehaviorTrackers.get(userId)!;
  
  // 检查时间间隔异常（太快）
  const timeSinceLastActivity = now - tracker.lastActivity;
  if (timeSinceLastActivity < 100) { // 小于100ms
    anomalyScore += 20;
    reasons.push('请求频率异常（小于100ms）');
  }
  
  // 更新追踪器
  tracker.lastActivity = now;
  tracker.requestCount++;
  if (resource) {
    tracker.uniquePaths.add(resource);
  }
  
  // 检查敏感资源访问
  const sensitivePatterns = [
    /admin/i,
    /config/i,
    /user.*password/i,
    /export/i,
    /backup/i,
    /delete/i,
  ];
  
  if (resource && sensitivePatterns.some(p => p.test(resource))) {
    tracker.sensitiveAccessCount++;
    
    if (tracker.sensitiveAccessCount > 10) {
      anomalyScore += 30;
      reasons.push('敏感资源访问次数过多');
    }
  }
  
  // 检查访问路径多样性异常
  if (tracker.uniquePaths.size > 50 && tracker.requestCount < 100) {
    anomalyScore += 25;
    reasons.push('短时间内访问路径过于分散');
  }
  
  // 记录异常行为
  if (anomalyScore >= 50) {
    await logSecurityEvent({
      eventType: 'threat.suspicious',
      severity: anomalyScore >= 70 ? 'high' : 'medium',
      userId,
      ipAddress: 'unknown',
      action: '检测到异常用户行为',
      result: 'success',
      details: {
        anomalyScore,
        reasons,
        action,
        resource,
      },
    });
  }
  
  return {
    anomaly: anomalyScore >= 50,
    score: anomalyScore,
    reasons,
  };
}

/**
 * 检测数据泄露尝试
 */
export async function detectDataExfiltration(
  userId: number,
  ipAddress: string,
  dataType: string,
  recordCount: number,
  format: string
): Promise<{
  suspicious: boolean;
  reasons: string[];
}> {
  const reasons: string[] = [];
  let suspicious = false;
  
  // 检查导出数量异常
  if (recordCount > 1000) {
    suspicious = true;
    reasons.push(`导出数量异常（${recordCount}条）`);
  }
  
  // 检查敏感数据类型
  const sensitiveDataTypes = ['customer', 'price', 'formula', 'employee', 'salary'];
  if (sensitiveDataTypes.some(t => dataType.toLowerCase().includes(t))) {
    if (recordCount > 100) {
      suspicious = true;
      reasons.push(`敏感数据大量导出（${dataType}）`);
    }
  }
  
  // 检查导出格式
  if (format === 'csv' || format === 'xlsx') {
    // 可下载格式，增加警惕
    if (recordCount > 500) {
      suspicious = true;
      reasons.push('大量数据导出为可下载格式');
    }
  }
  
  if (suspicious) {
    await logSecurityEvent({
      eventType: 'data.export',
      severity: 'high',
      userId,
      ipAddress,
      action: '检测到可疑数据导出',
      resource: dataType,
      result: 'success',
      details: {
        recordCount,
        format,
        reasons,
      },
    });
  }
  
  return { suspicious, reasons };
}

/**
 * 清理过期的追踪数据
 */
export function cleanupTrackers(): void {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1小时
  
  // 清理IP事件追踪器
  for (const [ip, trackers] of Array.from(ipEventTrackers)) {
    for (const [type, tracker] of Array.from(trackers)) {
      if (now - tracker.lastSeen > maxAge) {
        trackers.delete(type);
      }
    }
    if (trackers.size === 0) {
      ipEventTrackers.delete(ip);
    }
  }

  // 清理用户行为追踪器
  for (const [userId, tracker] of Array.from(userBehaviorTrackers)) {
    if (now - tracker.lastActivity > maxAge) {
      userBehaviorTrackers.delete(userId);
    }
  }
}

// 定期清理
setInterval(cleanupTrackers, 15 * 60 * 1000); // 每15分钟清理一次

/**
 * 获取威胁统计
 */
export function getThreatStats(): {
  activeTrackers: number;
  userTrackers: number;
  threatsByType: Record<ThreatType, number>;
} {
  const threatsByType: Record<string, number> = {};
  
  for (const [, trackers] of Array.from(ipEventTrackers)) {
    for (const [type, tracker] of Array.from(trackers)) {
      threatsByType[type] = (threatsByType[type] || 0) + tracker.count;
    }
  }
  
  return {
    activeTrackers: ipEventTrackers.size,
    userTrackers: userBehaviorTrackers.size,
    threatsByType: threatsByType as Record<ThreatType, number>,
  };
}
