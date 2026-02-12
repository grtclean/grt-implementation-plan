/**
 * 业务触发器服务
 * 在业务操作时自动触发钉钉通知
 */

import {
  notifyProjectGateChange,
  notifyCostAlert,
  notifyServiceTicket,
  notifyQCAlert,
  notifyInterviewSchedule,
  notifyApproval,
  notifySystemEvent,
  ProjectGateChangeEvent,
  CostAlertEvent,
  ServiceTicketEvent,
  QCAlertEvent,
  InterviewEvent,
  ApprovalEvent,
  SystemEvent,
} from "../business-notifications";

// 通知开关配置（可从数据库读取）
interface NotificationSettings {
  project_gate: boolean;
  cost_alert: boolean;
  service_ticket: boolean;
  qc_alert: boolean;
  interview: boolean;
  approval: boolean;
  system: boolean;
}

const getNotificationSettings = (): NotificationSettings => ({
  project_gate: true,
  cost_alert: true,
  service_ticket: true,
  qc_alert: true,
  interview: true,
  approval: true,
  system: true,
});

// 检查钉钉配置是否可用
const isDingTalkConfigured = (): boolean => {
  return !!(process.env.DINGTALK_WEBHOOK_URL);
};

/**
 * 项目阶段变更触发器
 */
export async function triggerProjectGateChange(params: {
  projectId: string;
  projectName: string;
  fromGate: string;
  toGate: string;
  changedBy: string;
  changeTime: Date;
  reason?: string;
  reviewers?: string[];
}): Promise<boolean> {
  const settings = getNotificationSettings();
  if (!settings.project_gate) return false;
  if (!isDingTalkConfigured()) return false;

  try {
    await notifyProjectGateChange(params);
    console.log(`[Trigger] 项目阶段变更通知已发送: ${params.projectName}`);
    return true;
  } catch (error) {
    console.error(`[Trigger] 项目阶段变更通知发送失败:`, error);
    return false;
  }
}

/**
 * 成本预警触发器
 */
export async function triggerCostAlert(params: {
  projectId: string;
  projectName: string;
  alertType: 'budget_warning' | 'budget_exceeded' | 'cost_variance' | 'approval_required';
  budgetAmount: number;
  currentCost: number;
  threshold: number;
  manager?: string;
}): Promise<boolean> {
  const settings = getNotificationSettings();
  if (!settings.cost_alert) return false;
  if (!isDingTalkConfigured()) return false;

  try {
    await notifyCostAlert(params);
    console.log(`[Trigger] 成本预警通知已发送: ${params.projectName}`);
    return true;
  } catch (error) {
    console.error(`[Trigger] 成本预警通知发送失败:`, error);
    return false;
  }
}

/**
 * 售后工单触发器
 */
export async function triggerServiceTicket(params: {
  ticketId: string;
  ticketType: 'new' | 'assigned' | 'escalated' | 'resolved' | 'closed';
  customerName: string;
  issueTitle: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  createTime: Date;
}): Promise<boolean> {
  const settings = getNotificationSettings();
  if (!settings.service_ticket) return false;
  if (!isDingTalkConfigured()) return false;

  try {
    await notifyServiceTicket({
      ticketId: params.ticketId,
      type: params.ticketType === 'new' ? 'created' : params.ticketType as any,
      customerName: params.customerName,
      equipmentName: params.issueTitle,
      priority: params.priority,
      description: params.issueTitle,
      assignee: params.assignee,
      dueDate: params.createTime,
    });
    console.log(`[Trigger] 售后工单通知已发送: ${params.ticketId}`);
    return true;
  } catch (error) {
    console.error(`[Trigger] 售后工单通知发送失败:`, error);
    return false;
  }
}

/**
 * 质检异常触发器
 */
export async function triggerQCAlert(params: {
  productId: string;
  productName: string;
  batchNumber: string;
  defectType: string;
  defectCount: number;
  totalCount: number;
  inspector: string;
  inspectionTime: Date;
}): Promise<boolean> {
  const settings = getNotificationSettings();
  if (!settings.qc_alert) return false;
  if (!isDingTalkConfigured()) return false;

  try {
    await notifyQCAlert({
      recordId: params.productId,
      productName: params.productName,
      batchNumber: params.batchNumber,
      inspector: params.inspector,
      totalItems: params.totalCount,
      failedItems: params.defectCount,
      defectTypes: [params.defectType],
      severity: params.defectCount > params.totalCount * 0.1 ? 'critical' : 'major',
    });
    console.log(`[Trigger] 质检异常通知已发送: ${params.batchNumber}`);
    return true;
  } catch (error) {
    console.error(`[Trigger] 质检异常通知发送失败:`, error);
    return false;
  }
}

/**
 * 面试安排触发器
 */
export async function triggerInterview(params: {
  candidateId: string;
  candidateName: string;
  position: string;
  interviewTime: Date;
  interviewType: 'phone' | 'video' | 'onsite';
  interviewer: string;
  location?: string;
  meetingLink?: string;
}): Promise<boolean> {
  const settings = getNotificationSettings();
  if (!settings.interview) return false;
  if (!isDingTalkConfigured()) return false;

  try {
    await notifyInterviewSchedule({
      candidateId: params.candidateId,
      candidateName: params.candidateName,
      position: params.position,
      interviewTime: params.interviewTime,
      interviewType: params.interviewType,
      interviewers: [params.interviewer],
      location: params.location,
      notes: params.meetingLink ? `会议链接: ${params.meetingLink}` : undefined,
    });
    console.log(`[Trigger] 面试安排通知已发送: ${params.candidateName}`);
    return true;
  } catch (error) {
    console.error(`[Trigger] 面试安排通知发送失败:`, error);
    return false;
  }
}

/**
 * 审批流程触发器
 */
export async function triggerApproval(params: {
  approvalId: string;
  approvalType: 'expense' | 'leave' | 'purchase' | 'contract' | 'project';
  title: string;
  applicant: string;
  amount?: number;
  currentApprover: string;
  status: 'pending' | 'approved' | 'rejected';
  submitTime: Date;
}): Promise<boolean> {
  const settings = getNotificationSettings();
  if (!settings.approval) return false;
  if (!isDingTalkConfigured()) return false;

  try {
    await notifyApproval({
      approvalId: params.approvalId,
      type: params.approvalType,
      title: params.title,
      applicant: params.applicant,
      amount: params.amount,
      status: params.status,
      approver: params.currentApprover,
      deadline: params.submitTime,
    });
    console.log(`[Trigger] 审批流程通知已发送: ${params.title}`);
    return true;
  } catch (error) {
    console.error(`[Trigger] 审批流程通知发送失败:`, error);
    return false;
  }
}

/**
 * 系统事件触发器
 */
export async function triggerSystemEvent(params: {
  eventType: 'maintenance' | 'security' | 'performance' | 'backup' | 'update';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  eventTime: Date;
  affectedServices?: string[];
}): Promise<boolean> {
  const settings = getNotificationSettings();
  if (!settings.system) return false;
  if (!isDingTalkConfigured()) return false;

  try {
    await notifySystemEvent({
      type: params.eventType === 'update' ? 'deployment' : params.eventType === 'performance' ? 'error' : params.eventType as any,
      title: params.title,
      description: params.description,
      severity: params.severity,
      affectedServices: params.affectedServices,
    });
    console.log(`[Trigger] 系统事件通知已发送: ${params.title}`);
    return true;
  } catch (error) {
    console.error(`[Trigger] 系统事件通知发送失败:`, error);
    return false;
  }
}

/**
 * 批量触发器 - 用于定时任务
 */
export async function processPendingNotifications(): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  // 这里可以从数据库读取待发送的通知队列
  // 目前返回模拟结果
  return {
    total: 0,
    success: 0,
    failed: 0,
  };
}

export default {
  triggerProjectGateChange,
  triggerCostAlert,
  triggerServiceTicket,
  triggerQCAlert,
  triggerInterview,
  triggerApproval,
  triggerSystemEvent,
  processPendingNotifications,
};
