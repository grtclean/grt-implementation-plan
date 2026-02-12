/**
 * GRT智能系统 - 告警规则配置模块
 * 用于生产环境监控和异常检测
 */

import { notifyOwner } from '../_core/notification';

// 告警级别
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

// 告警规则接口
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  level: AlertLevel;
  condition: AlertCondition;
  actions: AlertAction[];
  cooldownMinutes: number;
  isActive: boolean;
}

// 告警条件
export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains';
  threshold: number | string;
  duration?: number; // 持续时间（秒）
}

// 告警动作
export interface AlertAction {
  type: 'notify_owner' | 'webhook' | 'email' | 'wecom' | 'dingtalk' | 'log';
  config?: Record<string, any>;
}

// 告警记录
export interface AlertRecord {
  ruleId: string;
  level: AlertLevel;
  message: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// 默认告警规则
export const defaultAlertRules: AlertRule[] = [
  // 系统健康告警
  {
    id: 'SYS001',
    name: '内存使用率过高',
    description: '系统内存使用率超过80%时触发告警',
    level: AlertLevel.WARNING,
    condition: {
      metric: 'memory_usage_percent',
      operator: 'gt',
      threshold: 80,
      duration: 300 // 持续5分钟
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'log' }
    ],
    cooldownMinutes: 30,
    isActive: true
  },
  {
    id: 'SYS002',
    name: '内存使用率危急',
    description: '系统内存使用率超过95%时触发紧急告警',
    level: AlertLevel.CRITICAL,
    condition: {
      metric: 'memory_usage_percent',
      operator: 'gt',
      threshold: 95
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'wecom' },
      { type: 'log' }
    ],
    cooldownMinutes: 5,
    isActive: true
  },
  
  // 数据库告警
  {
    id: 'DB001',
    name: '数据库连接失败',
    description: '数据库连接不可用时触发告警',
    level: AlertLevel.CRITICAL,
    condition: {
      metric: 'database_status',
      operator: 'eq',
      threshold: 'error'
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'wecom' },
      { type: 'log' }
    ],
    cooldownMinutes: 5,
    isActive: true
  },
  {
    id: 'DB002',
    name: '数据库响应缓慢',
    description: '数据库查询延迟超过1秒时触发告警',
    level: AlertLevel.WARNING,
    condition: {
      metric: 'database_latency_ms',
      operator: 'gt',
      threshold: 1000,
      duration: 60
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'log' }
    ],
    cooldownMinutes: 15,
    isActive: true
  },
  
  // API告警
  {
    id: 'API001',
    name: 'API错误率过高',
    description: 'API错误率超过5%时触发告警',
    level: AlertLevel.WARNING,
    condition: {
      metric: 'api_error_rate_percent',
      operator: 'gt',
      threshold: 5,
      duration: 300
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'log' }
    ],
    cooldownMinutes: 15,
    isActive: true
  },
  {
    id: 'API002',
    name: 'API响应时间过长',
    description: 'API平均响应时间超过2秒时触发告警',
    level: AlertLevel.WARNING,
    condition: {
      metric: 'api_response_time_ms',
      operator: 'gt',
      threshold: 2000,
      duration: 300
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'log' }
    ],
    cooldownMinutes: 15,
    isActive: true
  },
  
  // 业务告警 - 项目管理
  {
    id: 'BIZ001',
    name: '项目成本超支预警',
    description: '项目实际成本超出目标成本15%时触发告警',
    level: AlertLevel.WARNING,
    condition: {
      metric: 'project_cost_variance_percent',
      operator: 'gt',
      threshold: 15
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'email' },
      { type: 'log' }
    ],
    cooldownMinutes: 60,
    isActive: true
  },
  {
    id: 'BIZ002',
    name: '项目成本严重超支',
    description: '项目实际成本超出目标成本30%时触发紧急告警',
    level: AlertLevel.CRITICAL,
    condition: {
      metric: 'project_cost_variance_percent',
      operator: 'gt',
      threshold: 30
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'wecom' },
      { type: 'email' },
      { type: 'log' }
    ],
    cooldownMinutes: 30,
    isActive: true
  },
  {
    id: 'BIZ003',
    name: '项目里程碑延期',
    description: '项目里程碑延期超过7天时触发告警',
    level: AlertLevel.WARNING,
    condition: {
      metric: 'milestone_delay_days',
      operator: 'gt',
      threshold: 7
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'log' }
    ],
    cooldownMinutes: 1440, // 24小时
    isActive: true
  },
  
  // 业务告警 - AI Coach
  {
    id: 'AI001',
    name: 'AI Coach拦截率过高',
    description: 'AI Coach拦截率超过20%时触发告警（可能规则过严）',
    level: AlertLevel.INFO,
    condition: {
      metric: 'ai_coach_block_rate_percent',
      operator: 'gt',
      threshold: 20,
      duration: 3600
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'log' }
    ],
    cooldownMinutes: 240,
    isActive: true
  },
  {
    id: 'AI002',
    name: 'AI Coach服务不可用',
    description: 'AI Coach服务连续失败超过5次时触发告警',
    level: AlertLevel.CRITICAL,
    condition: {
      metric: 'ai_coach_consecutive_failures',
      operator: 'gt',
      threshold: 5
    },
    actions: [
      { type: 'notify_owner' },
      { type: 'wecom' },
      { type: 'log' }
    ],
    cooldownMinutes: 15,
    isActive: true
  }
];

// 告警状态存储（内存）
const alertState = new Map<string, {
  lastTriggered: Date;
  activeAlert?: AlertRecord;
}>();

/**
 * 告警管理器
 */
export class AlertManager {
  private rules: AlertRule[];
  private records: AlertRecord[] = [];

  constructor(rules: AlertRule[] = defaultAlertRules) {
    this.rules = rules;
  }

  /**
   * 检查指标并触发告警
   */
  async checkMetric(metric: string, value: number | string): Promise<AlertRecord | null> {
    const matchingRules = this.rules.filter(
      rule => rule.isActive && rule.condition.metric === metric
    );

    for (const rule of matchingRules) {
      if (this.evaluateCondition(rule.condition, value)) {
        // 检查冷却时间
        const state = alertState.get(rule.id);
        if (state?.lastTriggered) {
          const cooldownMs = rule.cooldownMinutes * 60 * 1000;
          if (Date.now() - state.lastTriggered.getTime() < cooldownMs) {
            console.log(`[Alert] Rule ${rule.id} is in cooldown period`);
            continue;
          }
        }

        // 触发告警
        const record = await this.triggerAlert(rule, value);
        return record;
      }
    }

    return null;
  }

  /**
   * 评估告警条件
   */
  private evaluateCondition(condition: AlertCondition, value: number | string): boolean {
    const { operator, threshold } = condition;

    switch (operator) {
      case 'gt':
        return Number(value) > Number(threshold);
      case 'lt':
        return Number(value) < Number(threshold);
      case 'eq':
        return value === threshold;
      case 'gte':
        return Number(value) >= Number(threshold);
      case 'lte':
        return Number(value) <= Number(threshold);
      case 'contains':
        return String(value).includes(String(threshold));
      default:
        return false;
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(rule: AlertRule, value: number | string): Promise<AlertRecord> {
    const record: AlertRecord = {
      ruleId: rule.id,
      level: rule.level,
      message: `${rule.name}: ${rule.description} (当前值: ${value})`,
      triggeredAt: new Date(),
      acknowledged: false
    };

    // 更新状态
    alertState.set(rule.id, {
      lastTriggered: new Date(),
      activeAlert: record
    });

    // 记录告警
    this.records.push(record);

    // 执行告警动作
    for (const action of rule.actions) {
      await this.executeAction(action, rule, record);
    }

    console.log(`[Alert] Triggered: ${rule.id} - ${rule.name}`);
    return record;
  }

  /**
   * 执行告警动作
   */
  private async executeAction(
    action: AlertAction,
    rule: AlertRule,
    record: AlertRecord
  ): Promise<void> {
    switch (action.type) {
      case 'notify_owner':
        await notifyOwner({
          title: `[${rule.level.toUpperCase()}] ${rule.name}`,
          content: record.message
        });
        break;

      case 'webhook':
        if (action.config?.url) {
          try {
            await fetch(action.config.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                rule,
                record,
                timestamp: new Date().toISOString()
              })
            });
          } catch (error) {
            console.error('[Alert] Webhook failed:', error);
          }
        }
        break;

      case 'wecom':
      case 'dingtalk':
        // 通过Webhook增强服务发送告警
        try {
          const { sendSystemAlertToWebhooks } = await import('../webhook-enhanced');
          await sendSystemAlertToWebhooks({
            type: 'error',
            title: rule.name,
            description: record.message,
            severity: rule.level as any,
            details: {
              '规则ID': rule.id,
              '触发时间': record.triggeredAt.toLocaleString('zh-CN'),
            },
          });
          console.log(`[Alert] Webhook notification sent: ${record.message}`);
        } catch (error) {
          console.error('[Alert] Webhook notification failed:', error);
        }
        break;

      case 'email':
        // TODO: 实现邮件通知
        console.log(`[Alert] Email notification: ${record.message}`);
        break;

      case 'log':
        console.log(`[Alert][${rule.level}] ${record.message}`);
        break;
    }
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(ruleId: string, acknowledgedBy: string): boolean {
    const state = alertState.get(ruleId);
    if (state?.activeAlert && !state.activeAlert.acknowledged) {
      state.activeAlert.acknowledged = true;
      state.activeAlert.acknowledgedBy = acknowledgedBy;
      state.activeAlert.acknowledgedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * 解决告警
   */
  resolveAlert(ruleId: string): boolean {
    const state = alertState.get(ruleId);
    if (state?.activeAlert) {
      state.activeAlert.resolvedAt = new Date();
      alertState.delete(ruleId);
      return true;
    }
    return false;
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): AlertRecord[] {
    const active: AlertRecord[] = [];
    alertState.forEach((state) => {
      if (state.activeAlert && !state.activeAlert.resolvedAt) {
        active.push(state.activeAlert);
      }
    });
    return active;
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit: number = 100): AlertRecord[] {
    return this.records.slice(-limit);
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  /**
   * 更新规则
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
      return true;
    }
    return false;
  }

  /**
   * 禁用规则
   */
  disableRule(ruleId: string): boolean {
    return this.updateRule(ruleId, { isActive: false });
  }

  /**
   * 启用规则
   */
  enableRule(ruleId: string): boolean {
    return this.updateRule(ruleId, { isActive: true });
  }

  /**
   * 获取所有规则
   */
  getRules(): AlertRule[] {
    return this.rules;
  }
}

// 导出单例
export const alertManager = new AlertManager();

/**
 * 健康检查时自动检测告警
 */
export async function checkHealthAlerts(healthData: {
  memory: { used: number; total: number };
  database: { status: string; latency: number };
}): Promise<void> {
  const memoryPercent = (healthData.memory.used / healthData.memory.total) * 100;
  
  // 检查内存使用率
  await alertManager.checkMetric('memory_usage_percent', memoryPercent);
  
  // 检查数据库状态
  await alertManager.checkMetric('database_status', healthData.database.status);
  
  // 检查数据库延迟
  if (healthData.database.latency > 0) {
    await alertManager.checkMetric('database_latency_ms', healthData.database.latency);
  }
}
