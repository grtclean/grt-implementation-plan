/**
 * 业务通知触发规则配置
 * 定义各业务场景的自动通知触发条件
 */

import { sendDingTalkMessageWithSign } from '../dingtalk-webhook-test';

// 钉钉配置
const DINGTALK_WEBHOOK_URL = process.env.DINGTALK_WEBHOOK_URL || 
  'https://oapi.dingtalk.com/robot/send?access_token=8d003ada94b037153ee995bdfe955049e378af2b7e54e6bb87b686c959893b6c';
const DINGTALK_SECRET = process.env.DINGTALK_WEBHOOK_SECRET || 
  'SEC179f421330c60dae9e928cdcafced74e38c80b2df72062e7eb08c14f98043235';

// 通知规则类型
export interface NotificationRule {
  id: string;
  name: string;
  type: 'project_gate' | 'cost_alert' | 'service_ticket' | 'qc_alert' | 'interview' | 'approval' | 'system';
  enabled: boolean;
  conditions: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
    value: any;
  }[];
  template: {
    title: string;
    content: string;
  };
  atAll: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

// 默认通知规则配置
export const defaultNotificationRules: NotificationRule[] = [
  // 项目阶段变更规则
  {
    id: 'rule_project_gate_change',
    name: '项目阶段变更通知',
    type: 'project_gate',
    enabled: true,
    conditions: [
      { field: 'status', operator: 'equals', value: 'approved' }
    ],
    template: {
      title: '📋 项目阶段变更',
      content: '项目【{{projectName}}】已通过【{{gateName}}】阶段评审\n\n' +
        '- 评审结果: {{result}}\n' +
        '- 评审人: {{reviewer}}\n' +
        '- 下一阶段: {{nextGate}}\n' +
        '- 评审时间: {{timestamp}}'
    },
    atAll: false,
    priority: 'normal'
  },
  {
    id: 'rule_project_gate_blocked',
    name: '项目阶段阻塞通知',
    type: 'project_gate',
    enabled: true,
    conditions: [
      { field: 'status', operator: 'equals', value: 'blocked' }
    ],
    template: {
      title: '🚫 项目阶段阻塞',
      content: '项目【{{projectName}}】在【{{gateName}}】阶段被阻塞\n\n' +
        '- 阻塞原因: {{reason}}\n' +
        '- 负责人: {{owner}}\n' +
        '- 需要处理: {{action}}'
    },
    atAll: true,
    priority: 'high'
  },
  
  // 成本预警规则
  {
    id: 'rule_cost_warning',
    name: '成本预警通知（80%）',
    type: 'cost_alert',
    enabled: true,
    conditions: [
      { field: 'usageRate', operator: 'greater_than', value: 0.8 }
    ],
    template: {
      title: '⚠️ 成本预警',
      content: '项目【{{projectName}}】成本预警\n\n' +
        '- 预算总额: ¥{{budget}}\n' +
        '- 已使用: ¥{{used}} ({{usageRate}}%)\n' +
        '- 剩余预算: ¥{{remaining}}\n' +
        '- 预警级别: {{level}}'
    },
    atAll: false,
    priority: 'high'
  },
  {
    id: 'rule_cost_critical',
    name: '成本超支通知（100%）',
    type: 'cost_alert',
    enabled: true,
    conditions: [
      { field: 'usageRate', operator: 'greater_than', value: 1.0 }
    ],
    template: {
      title: '🔴 成本超支',
      content: '项目【{{projectName}}】成本已超支！\n\n' +
        '- 预算总额: ¥{{budget}}\n' +
        '- 已使用: ¥{{used}} ({{usageRate}}%)\n' +
        '- 超支金额: ¥{{overrun}}\n' +
        '- 请立即处理！'
    },
    atAll: true,
    priority: 'urgent'
  },
  
  // 售后工单规则
  {
    id: 'rule_ticket_created',
    name: '新工单创建通知',
    type: 'service_ticket',
    enabled: true,
    conditions: [
      { field: 'event', operator: 'equals', value: 'created' }
    ],
    template: {
      title: '🔧 新售后工单',
      content: '收到新的售后工单\n\n' +
        '- 工单号: {{ticketId}}\n' +
        '- 客户: {{customerName}}\n' +
        '- 问题类型: {{issueType}}\n' +
        '- 优先级: {{priority}}\n' +
        '- 描述: {{description}}'
    },
    atAll: false,
    priority: 'normal'
  },
  {
    id: 'rule_ticket_escalated',
    name: '工单升级通知',
    type: 'service_ticket',
    enabled: true,
    conditions: [
      { field: 'event', operator: 'equals', value: 'escalated' }
    ],
    template: {
      title: '🚨 工单升级',
      content: '售后工单已升级\n\n' +
        '- 工单号: {{ticketId}}\n' +
        '- 客户: {{customerName}}\n' +
        '- 升级原因: {{reason}}\n' +
        '- 当前处理人: {{assignee}}\n' +
        '- 请优先处理！'
    },
    atAll: true,
    priority: 'high'
  },
  
  // 质检异常规则
  {
    id: 'rule_qc_defect',
    name: '质检缺陷通知',
    type: 'qc_alert',
    enabled: true,
    conditions: [
      { field: 'result', operator: 'equals', value: 'defect' }
    ],
    template: {
      title: '🔍 质检异常',
      content: '发现质检异常\n\n' +
        '- 产品: {{productName}}\n' +
        '- 批次号: {{batchNo}}\n' +
        '- 缺陷类型: {{defectType}}\n' +
        '- 缺陷数量: {{defectCount}}\n' +
        '- 检验员: {{inspector}}'
    },
    atAll: false,
    priority: 'high'
  },
  
  // 面试安排规则
  {
    id: 'rule_interview_scheduled',
    name: '面试安排通知',
    type: 'interview',
    enabled: true,
    conditions: [
      { field: 'event', operator: 'equals', value: 'scheduled' }
    ],
    template: {
      title: '👥 面试安排',
      content: '新的面试已安排\n\n' +
        '- 候选人: {{candidateName}}\n' +
        '- 应聘职位: {{position}}\n' +
        '- 面试时间: {{interviewTime}}\n' +
        '- 面试官: {{interviewer}}\n' +
        '- 面试地点: {{location}}'
    },
    atAll: false,
    priority: 'normal'
  },
  
  // 审批流程规则
  {
    id: 'rule_approval_pending',
    name: '待审批通知',
    type: 'approval',
    enabled: true,
    conditions: [
      { field: 'status', operator: 'equals', value: 'pending' }
    ],
    template: {
      title: '✅ 待审批',
      content: '您有新的审批任务\n\n' +
        '- 审批类型: {{approvalType}}\n' +
        '- 申请人: {{applicant}}\n' +
        '- 申请内容: {{content}}\n' +
        '- 金额: ¥{{amount}}\n' +
        '- 请及时处理'
    },
    atAll: false,
    priority: 'normal'
  },
  
  // 系统事件规则
  {
    id: 'rule_system_error',
    name: '系统错误通知',
    type: 'system',
    enabled: true,
    conditions: [
      { field: 'level', operator: 'equals', value: 'error' }
    ],
    template: {
      title: '⚙️ 系统错误',
      content: '系统发生错误\n\n' +
        '- 错误类型: {{errorType}}\n' +
        '- 错误信息: {{message}}\n' +
        '- 发生时间: {{timestamp}}\n' +
        '- 影响范围: {{scope}}'
    },
    atAll: true,
    priority: 'urgent'
  }
];

// 通知规则引擎
export class NotificationRuleEngine {
  private rules: NotificationRule[];
  
  constructor(rules: NotificationRule[] = defaultNotificationRules) {
    this.rules = rules;
  }
  
  /**
   * 检查数据是否匹配规则条件
   */
  private matchConditions(data: Record<string, any>, conditions: NotificationRule['conditions']): boolean {
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
   * 渲染消息模板
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
    });
  }
  
  /**
   * 触发通知
   */
  async trigger(
    type: NotificationRule['type'],
    data: Record<string, any>
  ): Promise<{ triggered: boolean; ruleId?: string; result?: any }> {
    // 查找匹配的启用规则
    const matchingRules = this.rules.filter(
      rule => rule.type === type && rule.enabled && this.matchConditions(data, rule.conditions)
    );
    
    if (matchingRules.length === 0) {
      return { triggered: false };
    }
    
    // 按优先级排序，取最高优先级的规则
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    matchingRules.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    const rule = matchingRules[0];
    
    // 渲染消息
    const title = this.renderTemplate(rule.template.title, data);
    const content = this.renderTemplate(rule.template.content, data);
    
    // 发送钉钉消息
    const result = await sendDingTalkMessageWithSign(
      DINGTALK_WEBHOOK_URL,
      DINGTALK_SECRET,
      {
        title,
        content,
        type: 'markdown',
        atAll: rule.atAll
      }
    );
    
    return {
      triggered: true,
      ruleId: rule.id,
      result
    };
  }
  
  /**
   * 获取所有规则
   */
  getRules(): NotificationRule[] {
    return this.rules;
  }
  
  /**
   * 更新规则
   */
  updateRule(ruleId: string, updates: Partial<NotificationRule>): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;
    
    this.rules[index] = { ...this.rules[index], ...updates };
    return true;
  }
  
  /**
   * 启用/禁用规则
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    return this.updateRule(ruleId, { enabled });
  }
}

// 导出单例
export const notificationRuleEngine = new NotificationRuleEngine();

// 便捷触发函数
export async function triggerNotification(
  type: NotificationRule['type'],
  data: Record<string, any>
): Promise<{ triggered: boolean; ruleId?: string; result?: any }> {
  return notificationRuleEngine.trigger(type, data);
}

// 业务场景触发函数
export const BusinessNotifications = {
  /**
   * 项目阶段变更通知
   */
  async projectGateChange(data: {
    projectName: string;
    gateName: string;
    status: 'approved' | 'blocked' | 'pending';
    result?: string;
    reviewer?: string;
    nextGate?: string;
    reason?: string;
    owner?: string;
    action?: string;
  }) {
    return triggerNotification('project_gate', {
      ...data,
      timestamp: new Date().toLocaleString('zh-CN')
    });
  },
  
  /**
   * 成本预警通知
   */
  async costAlert(data: {
    projectName: string;
    budget: number;
    used: number;
  }) {
    const usageRate = data.used / data.budget;
    const remaining = data.budget - data.used;
    const overrun = data.used > data.budget ? data.used - data.budget : 0;
    const level = usageRate > 1 ? '超支' : usageRate > 0.9 ? '严重' : '警告';
    
    return triggerNotification('cost_alert', {
      ...data,
      usageRate: (usageRate * 100).toFixed(1),
      remaining: remaining.toFixed(2),
      overrun: overrun.toFixed(2),
      level
    });
  },
  
  /**
   * 售后工单通知
   */
  async serviceTicket(data: {
    ticketId: string;
    customerName: string;
    event: 'created' | 'escalated' | 'resolved';
    issueType?: string;
    priority?: string;
    description?: string;
    reason?: string;
    assignee?: string;
  }) {
    return triggerNotification('service_ticket', data);
  },
  
  /**
   * 质检异常通知
   */
  async qcAlert(data: {
    productName: string;
    batchNo: string;
    result: 'pass' | 'defect' | 'rework';
    defectType?: string;
    defectCount?: number;
    inspector?: string;
  }) {
    return triggerNotification('qc_alert', data);
  },
  
  /**
   * 面试安排通知
   */
  async interviewScheduled(data: {
    candidateName: string;
    position: string;
    interviewTime: string;
    interviewer: string;
    location: string;
  }) {
    return triggerNotification('interview', {
      ...data,
      event: 'scheduled'
    });
  },
  
  /**
   * 审批通知
   */
  async approvalPending(data: {
    approvalType: string;
    applicant: string;
    content: string;
    amount?: number;
  }) {
    return triggerNotification('approval', {
      ...data,
      status: 'pending'
    });
  },
  
  /**
   * 系统事件通知
   */
  async systemEvent(data: {
    errorType: string;
    message: string;
    level: 'info' | 'warning' | 'error';
    scope?: string;
  }) {
    return triggerNotification('system', {
      ...data,
      timestamp: new Date().toLocaleString('zh-CN')
    });
  }
};
