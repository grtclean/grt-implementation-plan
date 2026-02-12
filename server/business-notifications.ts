/**
 * 业务流程钉钉通知集成
 * 将钉钉Webhook接入实际业务流程
 */

import {
  sendDingTalkMessage,
  sendAlertToDingTalk,
  sendCostAlertToDingTalk,
  sendMeetingReminderToDingTalk,
  AlertLevel,
  MeetingInfo,
} from './dingtalk-webhook';

// ============ 项目阶段门通知 ============

export interface ProjectGateChangeEvent {
  projectId: string;
  projectName: string;
  fromGate: string;
  toGate: string;
  changedBy: string;
  changeTime: Date;
  reason?: string;
  reviewers?: string[];
}

/**
 * 项目阶段门变更通知
 */
export async function notifyProjectGateChange(event: ProjectGateChangeEvent) {
  const gateNames: Record<string, string> = {
    M0: 'M0-项目立项',
    M1: 'M1-需求确认',
    M2: 'M2-方案设计',
    M3: 'M3-详细设计',
    M4: 'M4-生产制造',
    M5: 'M5-安装调试',
    M6: 'M6-验收交付',
    M7: 'M7-质保结束',
  };

  const fromName = gateNames[event.fromGate] || event.fromGate;
  const toName = gateNames[event.toGate] || event.toGate;

  let content = `**项目**: ${event.projectName}\n`;
  content += `**阶段变更**: ${fromName} → ${toName}\n`;
  content += `**操作人**: ${event.changedBy}\n`;
  content += `**变更时间**: ${event.changeTime.toLocaleString('zh-CN')}\n`;

  if (event.reason) {
    content += `\n**变更原因**: ${event.reason}`;
  }

  if (event.reviewers && event.reviewers.length > 0) {
    content += `\n\n**待审批人**: ${event.reviewers.join(', ')}`;
  }

  return sendDingTalkMessage({
    title: `📋 项目阶段变更: ${event.projectName}`,
    content,
    type: 'markdown',
  });
}

// ============ 成本预警通知 ============

export interface CostAlertEvent {
  projectId: string;
  projectName: string;
  alertType: 'budget_warning' | 'budget_exceeded' | 'cost_variance' | 'approval_required';
  budgetAmount: number;
  currentCost: number;
  threshold: number;
  manager?: string;
}

/**
 * 成本预警通知
 */
export async function notifyCostAlert(event: CostAlertEvent) {
  const usagePercent = (event.currentCost / event.budgetAmount) * 100;
  const remainingBudget = event.budgetAmount - event.currentCost;

  const alertTypeNames: Record<string, string> = {
    budget_warning: '预算预警',
    budget_exceeded: '预算超支',
    cost_variance: '成本偏差',
    approval_required: '需要审批',
  };

  const level: AlertLevel = 
    usagePercent >= 100 ? 'critical' :
    usagePercent >= 90 ? 'warning' : 'info';

  return sendCostAlertToDingTalk({
    projectId: event.projectId,
    projectName: event.projectName,
    alertType: alertTypeNames[event.alertType],
    threshold: event.threshold,
    currentValue: usagePercent / 100,
    message: `项目 "${event.projectName}" 成本预警:\n` +
      `- 预算: ¥${event.budgetAmount.toLocaleString()}\n` +
      `- 已用: ¥${event.currentCost.toLocaleString()} (${usagePercent.toFixed(1)}%)\n` +
      `- 剩余: ¥${remainingBudget.toLocaleString()}`,
  });
}

// ============ 售后服务通知 ============

export interface ServiceTicketEvent {
  ticketId: string;
  type: 'created' | 'assigned' | 'started' | 'completed' | 'escalated';
  customerName: string;
  equipmentName: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  assignee?: string;
  dueDate?: Date;
}

/**
 * 售后服务工单通知
 */
export async function notifyServiceTicket(event: ServiceTicketEvent) {
  const typeNames: Record<string, string> = {
    created: '新建',
    assigned: '已派工',
    started: '开始处理',
    completed: '已完成',
    escalated: '已升级',
  };

  const priorityIcons: Record<string, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴',
  };

  const priorityNames: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  };

  let content = `**工单号**: ${event.ticketId}\n`;
  content += `**状态**: ${typeNames[event.type]}\n`;
  content += `**优先级**: ${priorityIcons[event.priority]} ${priorityNames[event.priority]}\n`;
  content += `**客户**: ${event.customerName}\n`;
  content += `**设备**: ${event.equipmentName}\n`;

  if (event.assignee) {
    content += `**负责人**: ${event.assignee}\n`;
  }

  if (event.dueDate) {
    content += `**截止时间**: ${event.dueDate.toLocaleString('zh-CN')}\n`;
  }

  content += `\n**问题描述**: ${event.description}`;

  const level: AlertLevel = 
    event.priority === 'urgent' ? 'critical' :
    event.priority === 'high' ? 'warning' : 'info';

  return sendAlertToDingTalk({
    level,
    title: `🔧 售后工单${typeNames[event.type]}: ${event.ticketId}`,
    description: content,
    source: '售后服务系统',
    timestamp: new Date(),
  });
}

// ============ 质检异常通知 ============

export interface QCAlertEvent {
  recordId: string;
  productName: string;
  batchNumber: string;
  inspector: string;
  totalItems: number;
  failedItems: number;
  defectTypes: string[];
  severity: 'minor' | 'major' | 'critical';
}

/**
 * 质检异常通知
 */
export async function notifyQCAlert(event: QCAlertEvent) {
  const passRate = ((event.totalItems - event.failedItems) / event.totalItems * 100).toFixed(1);

  const severityNames: Record<string, string> = {
    minor: '轻微',
    major: '主要',
    critical: '严重',
  };

  const level: AlertLevel = 
    event.severity === 'critical' ? 'critical' :
    event.severity === 'major' ? 'warning' : 'info';

  let content = `**产品**: ${event.productName}\n`;
  content += `**批次**: ${event.batchNumber}\n`;
  content += `**检验员**: ${event.inspector}\n`;
  content += `**检验数量**: ${event.totalItems}\n`;
  content += `**不合格数**: ${event.failedItems}\n`;
  content += `**合格率**: ${passRate}%\n`;
  content += `**缺陷等级**: ${severityNames[event.severity]}\n`;

  if (event.defectTypes.length > 0) {
    content += `\n**缺陷类型**:\n${event.defectTypes.map(d => `- ${d}`).join('\n')}`;
  }

  return sendAlertToDingTalk({
    level,
    title: `🔍 质检异常: ${event.productName}`,
    description: content,
    source: '质量管理系统',
    timestamp: new Date(),
  });
}

// ============ 招聘面试通知 ============

export interface InterviewEvent {
  candidateId: string;
  candidateName: string;
  position: string;
  interviewTime: Date;
  interviewType: 'phone' | 'video' | 'onsite';
  interviewers: string[];
  location?: string;
  notes?: string;
}

/**
 * 面试安排通知
 */
export async function notifyInterviewSchedule(event: InterviewEvent) {
  const typeNames: Record<string, string> = {
    phone: '电话面试',
    video: '视频面试',
    onsite: '现场面试',
  };

  const meeting: MeetingInfo = {
    id: `interview-${event.candidateId}`,
    title: `${typeNames[event.interviewType]}: ${event.candidateName} - ${event.position}`,
    startTime: event.interviewTime,
    location: event.location || (event.interviewType === 'video' ? '腾讯会议/钉钉会议' : '公司会议室'),
    organizer: 'HR部门',
    participants: event.interviewers,
    agenda: event.notes || `面试候选人: ${event.candidateName}\n应聘职位: ${event.position}`,
    reminderMinutes: 30,
  };

  return sendMeetingReminderToDingTalk(meeting);
}

// ============ 审批流程通知 ============

export interface ApprovalEvent {
  approvalId: string;
  type: 'expense' | 'leave' | 'purchase' | 'project' | 'contract';
  title: string;
  applicant: string;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected';
  approver: string;
  reason?: string;
  deadline?: Date;
}

/**
 * 审批流程通知
 */
export async function notifyApproval(event: ApprovalEvent) {
  const typeNames: Record<string, string> = {
    expense: '费用报销',
    leave: '请假申请',
    purchase: '采购申请',
    project: '项目审批',
    contract: '合同审批',
  };

  const statusNames: Record<string, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
  };

  const statusIcons: Record<string, string> = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
  };

  let content = `**审批类型**: ${typeNames[event.type]}\n`;
  content += `**申请人**: ${event.applicant}\n`;
  content += `**审批人**: ${event.approver}\n`;
  content += `**状态**: ${statusIcons[event.status]} ${statusNames[event.status]}\n`;

  if (event.amount) {
    content += `**金额**: ¥${event.amount.toLocaleString()}\n`;
  }

  if (event.deadline) {
    content += `**截止时间**: ${event.deadline.toLocaleString('zh-CN')}\n`;
  }

  if (event.reason) {
    content += `\n**${event.status === 'rejected' ? '驳回原因' : '备注'}**: ${event.reason}`;
  }

  return sendDingTalkMessage({
    title: `${statusIcons[event.status]} ${typeNames[event.type]}: ${event.title}`,
    content,
    type: 'markdown',
    atAll: event.status === 'pending' && event.type === 'project',
  });
}

// ============ 系统事件通知 ============

export interface SystemEvent {
  type: 'deployment' | 'backup' | 'maintenance' | 'error' | 'security';
  title: string;
  description: string;
  severity: AlertLevel;
  affectedServices?: string[];
  estimatedDuration?: string;
}

/**
 * 系统事件通知
 */
export async function notifySystemEvent(event: SystemEvent) {
  const typeNames: Record<string, string> = {
    deployment: '系统部署',
    backup: '数据备份',
    maintenance: '系统维护',
    error: '系统错误',
    security: '安全事件',
  };

  let content = `**事件类型**: ${typeNames[event.type]}\n`;
  content += `**时间**: ${new Date().toLocaleString('zh-CN')}\n`;
  content += `\n**详情**: ${event.description}`;

  if (event.affectedServices && event.affectedServices.length > 0) {
    content += `\n\n**影响服务**:\n${event.affectedServices.map(s => `- ${s}`).join('\n')}`;
  }

  if (event.estimatedDuration) {
    content += `\n\n**预计持续时间**: ${event.estimatedDuration}`;
  }

  return sendAlertToDingTalk({
    level: event.severity,
    title: event.title,
    description: content,
    source: typeNames[event.type],
    timestamp: new Date(),
  });
}

// ============ 批量通知工具 ============

/**
 * 批量发送通知（带延迟避免触发限流）
 */
export async function sendBatchNotifications<T>(
  items: T[],
  notifyFn: (item: T) => Promise<{ success: boolean; error?: string }>,
  delayMs: number = 1000
): Promise<{ total: number; success: number; failed: number; errors: string[] }> {
  const results = {
    total: items.length,
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const item of items) {
    const result = await notifyFn(item);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      if (result.error) {
        results.errors.push(result.error);
      }
    }

    // 延迟避免触发限流
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
