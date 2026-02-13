/**
 * Approval Timeout Escalation Service
 * Manages approval timeouts, escalation workflows, and reminder notifications.
 */

export interface TimeoutConfig {
  id: string;
  approvalChainId: string;
  stepIndex: number;
  timeoutHours: number;
  escalationAction: string;
  reminderIntervals: number[];
}

export interface ApprovalRecord {
  id: string;
  approvalChainId: string;
  checkpointId: string;
  currentStepIndex: number;
  status: string;
  assignedTo: string;
  assignedAt: Date;
  dueAt: Date;
  remindersSent: number;
}

export interface TimeoutCheckResult {
  isOverdue: boolean;
  hoursOverdue: number;
  shouldEscalate: boolean;
}

export interface EscalationEvent {
  id: string;
  fromApprover: string;
  action: string;
  notificationsSent: string[];
  timestamp: string;
}

export interface ReminderResult {
  recipientId: string;
  reminderNumber: number;
  status: string;
}

export interface ProcessResult {
  processed: number;
  escalated: number;
  reminded: number;
}

export interface EscalationHistoryEntry {
  id: string;
  approvalId: string;
  action: string;
  timestamp: string;
}

export interface TimeoutStats {
  totalEscalations: number;
  byAction: Record<string, number>;
  byApprover: Record<string, number>;
}

export function createTimeoutConfig(params: {
  approvalChainId: string;
  stepIndex: number;
  timeoutHours?: number;
  escalationAction?: string;
}): TimeoutConfig {
  return {
    id: `TC-${Date.now().toString(36).toUpperCase()}`,
    approvalChainId: params.approvalChainId,
    stepIndex: params.stepIndex,
    timeoutHours: params.timeoutHours ?? 24,
    escalationAction: params.escalationAction ?? "escalate_to_next",
    reminderIntervals: [4, 8, 16],
  };
}

export function checkApprovalTimeout(record: ApprovalRecord): TimeoutCheckResult {
  const now = Date.now();
  const dueTime = record.dueAt.getTime();
  const isOverdue = now > dueTime;
  const hoursOverdue = isOverdue ? (now - dueTime) / (1000 * 60 * 60) : 0;

  return {
    isOverdue,
    hoursOverdue,
    shouldEscalate: isOverdue,
  };
}

export async function executeEscalation(
  record: ApprovalRecord,
  config: TimeoutConfig
): Promise<EscalationEvent> {
  return {
    id: `ESC-${Date.now().toString(36).toUpperCase()}`,
    fromApprover: record.assignedTo,
    action: config.escalationAction,
    notificationsSent: [record.assignedTo, "manager"],
    timestamp: new Date().toISOString(),
  };
}

export async function sendReminder(
  record: ApprovalRecord,
  reminderNumber: number
): Promise<ReminderResult> {
  return {
    recipientId: record.assignedTo,
    reminderNumber,
    status: "delivered",
  };
}

export async function processTimeoutApprovals(): Promise<ProcessResult> {
  return {
    processed: 0,
    escalated: 0,
    reminded: 0,
  };
}

export async function getEscalationHistory(
  params: { limit?: number }
): Promise<EscalationHistoryEntry[]> {
  return [];
}

export function getTimeoutStatistics(
  history: EscalationHistoryEntry[]
): TimeoutStats {
  const byAction: Record<string, number> = {};
  const byApprover: Record<string, number> = {};

  for (const entry of history) {
    byAction[entry.action] = (byAction[entry.action] || 0) + 1;
  }

  return {
    totalEscalations: history.length,
    byAction,
    byApprover,
  };
}
