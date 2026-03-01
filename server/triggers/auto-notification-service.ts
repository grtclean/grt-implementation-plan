/**
 * 业务通知自动触发服务
 * 监听业务事件并自动发送通知
 */

import { sendDingTalkMessageWithSign } from '../dingtalk-webhook-test';
import { defaultNotificationRules, NotificationRule } from './notification-rules';

// 钉钉配置（从环境变量读取，禁止硬编码）
const DINGTALK_WEBHOOK_URL = process.env.DINGTALK_WEBHOOK_URL ?? '';
const DINGTALK_SECRET = process.env.DINGTALK_WEBHOOK_SECRET ?? '';

// 通知发送记录
interface NotificationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  type: string;
  title: string;
  content: string;
  status: 'success' | 'failed';
  error?: string;
  timestamp: Date;
  latency?: number;
}

// 内存中的通知日志（生产环境应存储到数据库）
const notificationLogs: NotificationLog[] = [];

/**
 * 渲染模板内容
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * 检查条件是否匹配
 */
function checkConditions(
  conditions: NotificationRule['conditions'],
  data: Record<string, any>
): boolean {
  return conditions.every(condition => {
    const value = data[condition.field];
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      default:
        return false;
    }
  });
}

/**
 * 发送通知
 */
async function sendNotification(
  rule: NotificationRule,
  data: Record<string, any>
): Promise<{ success: boolean; error?: string; latency?: number }> {
  const startTime = Date.now();
  
  try {
    const title = renderTemplate(rule.template.title, data);
    const content = renderTemplate(rule.template.content, data);
    
    // 根据优先级添加前缀
    let priorityPrefix = '';
    switch (rule.priority) {
      case 'urgent':
        priorityPrefix = '🚨 【紧急】';
        break;
      case 'high':
        priorityPrefix = '⚠️ 【重要】';
        break;
      case 'normal':
        priorityPrefix = '';
        break;
      case 'low':
        priorityPrefix = 'ℹ️ ';
        break;
    }
    
    const fullTitle = priorityPrefix + title;
    const fullContent = content + '\n\n---\n1'; // 添加关键词
    
    await sendDingTalkMessageWithSign(
      DINGTALK_WEBHOOK_URL,
      DINGTALK_SECRET,
      {
        title: fullTitle,
        content: fullContent,
        atAll: rule.atAll,
      }
    );
    
    const latency = Date.now() - startTime;
    
    // 记录日志
    notificationLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      title: fullTitle,
      content: fullContent,
      status: 'success',
      timestamp: new Date(),
      latency,
    });
    
    // 保留最近100条日志
    if (notificationLogs.length > 100) {
      notificationLogs.pop();
    }
    
    return { success: true, latency };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // 记录失败日志
    notificationLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      title: rule.template.title,
      content: rule.template.content,
      status: 'failed',
      error: errorMessage,
      timestamp: new Date(),
    });
    
    return { success: false, error: errorMessage };
  }
}

/**
 * 自动通知服务类
 */
export class AutoNotificationService {
  private rules: NotificationRule[];
  private enabled: boolean = true;
  
  constructor(rules: NotificationRule[] = defaultNotificationRules) {
    this.rules = rules;
  }
  
  /**
   * 启用/禁用服务
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * 获取服务状态
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * 获取所有规则
   */
  getRules(): NotificationRule[] {
    return this.rules;
  }
  
  /**
   * 启用/禁用特定规则
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }
  
  /**
   * 获取通知日志
   */
  getLogs(limit: number = 50): NotificationLog[] {
    return notificationLogs.slice(0, limit);
  }
  
  /**
   * 清除通知日志
   */
  clearLogs(): void {
    notificationLogs.length = 0;
  }
  
  /**
   * 触发项目阶段变更通知
   */
  async triggerProjectGateChange(data: {
    projectName: string;
    gateName: string;
    status: 'approved' | 'blocked' | 'pending';
    result?: string;
    reviewer?: string;
    nextGate?: string;
    reason?: string;
    owner?: string;
    action?: string;
  }): Promise<{ triggered: number; success: number; failed: number }> {
    if (!this.enabled) {
      return { triggered: 0, success: 0, failed: 0 };
    }
    
    const matchingRules = this.rules.filter(
      r => r.type === 'project_gate' && r.enabled && checkConditions(r.conditions, data)
    );
    
    let success = 0;
    let failed = 0;
    
    for (const rule of matchingRules) {
      const result = await sendNotification(rule, {
        ...data,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }
    
    return { triggered: matchingRules.length, success, failed };
  }
  
  /**
   * 触发成本预警通知
   */
  async triggerCostAlert(data: {
    projectName: string;
    budgetUsage: number;
    budget: number;
    spent: number;
    remaining: number;
    category?: string;
  }): Promise<{ triggered: number; success: number; failed: number }> {
    if (!this.enabled) {
      return { triggered: 0, success: 0, failed: 0 };
    }
    
    const matchingRules = this.rules.filter(
      r => r.type === 'cost_alert' && r.enabled && checkConditions(r.conditions, data)
    );
    
    let success = 0;
    let failed = 0;
    
    for (const rule of matchingRules) {
      const result = await sendNotification(rule, {
        ...data,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }
    
    return { triggered: matchingRules.length, success, failed };
  }
  
  /**
   * 触发售后工单通知
   */
  async triggerServiceTicket(data: {
    ticketId: string;
    customerName: string;
    issueType: string;
    priority: string;
    description: string;
    assignee?: string;
    status?: string;
  }): Promise<{ triggered: number; success: number; failed: number }> {
    if (!this.enabled) {
      return { triggered: 0, success: 0, failed: 0 };
    }
    
    const matchingRules = this.rules.filter(
      r => r.type === 'service_ticket' && r.enabled && checkConditions(r.conditions, data)
    );
    
    let success = 0;
    let failed = 0;
    
    for (const rule of matchingRules) {
      const result = await sendNotification(rule, {
        ...data,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }
    
    return { triggered: matchingRules.length, success, failed };
  }
  
  /**
   * 触发质检异常通知
   */
  async triggerQCAlert(data: {
    productName: string;
    batchNumber: string;
    defectType: string;
    defectRate: number;
    inspector: string;
    line?: string;
  }): Promise<{ triggered: number; success: number; failed: number }> {
    if (!this.enabled) {
      return { triggered: 0, success: 0, failed: 0 };
    }
    
    const matchingRules = this.rules.filter(
      r => r.type === 'qc_alert' && r.enabled && checkConditions(r.conditions, data)
    );
    
    let success = 0;
    let failed = 0;
    
    for (const rule of matchingRules) {
      const result = await sendNotification(rule, {
        ...data,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }
    
    return { triggered: matchingRules.length, success, failed };
  }
  
  /**
   * 触发面试安排通知
   */
  async triggerInterview(data: {
    candidateName: string;
    position: string;
    interviewTime: string;
    interviewer: string;
    location: string;
    round?: number;
  }): Promise<{ triggered: number; success: number; failed: number }> {
    if (!this.enabled) {
      return { triggered: 0, success: 0, failed: 0 };
    }
    
    const matchingRules = this.rules.filter(
      r => r.type === 'interview' && r.enabled && checkConditions(r.conditions, data)
    );
    
    let success = 0;
    let failed = 0;
    
    for (const rule of matchingRules) {
      const result = await sendNotification(rule, {
        ...data,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }
    
    return { triggered: matchingRules.length, success, failed };
  }
  
  /**
   * 触发审批流程通知
   */
  async triggerApproval(data: {
    approvalType: string;
    applicant: string;
    title: string;
    amount?: number;
    approver: string;
    status?: string;
  }): Promise<{ triggered: number; success: number; failed: number }> {
    if (!this.enabled) {
      return { triggered: 0, success: 0, failed: 0 };
    }
    
    const matchingRules = this.rules.filter(
      r => r.type === 'approval' && r.enabled && checkConditions(r.conditions, data)
    );
    
    let success = 0;
    let failed = 0;
    
    for (const rule of matchingRules) {
      const result = await sendNotification(rule, {
        ...data,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }
    
    return { triggered: matchingRules.length, success, failed };
  }
  
  /**
   * 触发系统事件通知
   */
  async triggerSystemEvent(data: {
    eventType: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    details?: string;
    source?: string;
  }): Promise<{ triggered: number; success: number; failed: number }> {
    if (!this.enabled) {
      return { triggered: 0, success: 0, failed: 0 };
    }
    
    const matchingRules = this.rules.filter(
      r => r.type === 'system' && r.enabled && checkConditions(r.conditions, data)
    );
    
    let success = 0;
    let failed = 0;
    
    for (const rule of matchingRules) {
      const result = await sendNotification(rule, {
        ...data,
        timestamp: new Date().toLocaleString('zh-CN'),
      });
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }
    
    return { triggered: matchingRules.length, success, failed };
  }
}

// 导出单例实例
export const autoNotificationService = new AutoNotificationService();

// 导出便捷函数
export const triggerProjectGateChange = autoNotificationService.triggerProjectGateChange.bind(autoNotificationService);
export const triggerCostAlert = autoNotificationService.triggerCostAlert.bind(autoNotificationService);
export const triggerServiceTicket = autoNotificationService.triggerServiceTicket.bind(autoNotificationService);
export const triggerQCAlert = autoNotificationService.triggerQCAlert.bind(autoNotificationService);
export const triggerInterview = autoNotificationService.triggerInterview.bind(autoNotificationService);
export const triggerApproval = autoNotificationService.triggerApproval.bind(autoNotificationService);
export const triggerSystemEvent = autoNotificationService.triggerSystemEvent.bind(autoNotificationService);
