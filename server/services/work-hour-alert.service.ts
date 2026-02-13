/**
 * Work Hour Alert Service
 * Monitors task work hours for overruns and generates alerts.
 */

export const DEFAULT_THRESHOLD_PERCENT = 120;

export interface WorkHourAlertRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  taskType: string;
  thresholdPercent: number;
  alertLevel: string;
  notificationChannels: string[];
  recipients: string[];
  isActive: boolean;
}

export interface WorkHourAlert {
  id: number;
  alertCode: string;
  ruleId: number;
  taskId: number;
  workOrderId: number;
  workerId?: number;
  workerName?: string;
  estimatedHours: number;
  actualHours: number;
  overrunPercent: number;
  alertLevel: string;
  alertTime: string;
  status: string;
  resolvedAt?: string;
}

export interface TaskCheckInput {
  taskId: number;
  workOrderId: number;
  taskType: string;
  workerId?: number;
  workerName?: string;
  estimatedHours: number;
  actualHours: number;
}

export interface TaskCheckResult {
  shouldAlert: boolean;
  overrunPercent: number;
  highestAlertLevel: string;
}

export interface AlertStatistics {
  totalAlerts: number;
  pendingAlerts: number;
  resolvedAlerts: number;
  acknowledgedAlerts: number;
  topOverrunTasks: { taskId: number; overrunPercent: number }[];
}

export interface AlertMessage {
  title: string;
  message: string;
  urgency: string;
}

export interface AlertTrendEntry {
  date: string;
  count: number;
  resolved: number;
}

export function generateAlertCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WHA-${ts}-${rand}`;
}

export function generateRuleCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WHR-${ts}-${rand}`;
}

export function calculateOverrunPercent(estimatedHours: number, actualHours: number): number {
  if (estimatedHours <= 0 || actualHours <= 0) return 0;
  return Math.round((actualHours / estimatedHours) * 100);
}

export function checkAlertTrigger(
  estimatedHours: number,
  actualHours: number,
  thresholdPercent: number
): boolean {
  const overrunPercent = calculateOverrunPercent(estimatedHours, actualHours);
  return overrunPercent >= thresholdPercent;
}

export function determineAlertLevel(
  overrunPercent: number,
  rules: WorkHourAlertRule[]
): string {
  // Sort rules by threshold descending to find highest matching level
  const sorted = [...rules].sort((a, b) => b.thresholdPercent - a.thresholdPercent);
  for (const rule of sorted) {
    if (overrunPercent >= rule.thresholdPercent) {
      return rule.alertLevel;
    }
  }
  return "Info";
}

export function matchAlertRules(
  taskType: string,
  rules: WorkHourAlertRule[]
): WorkHourAlertRule[] {
  return rules.filter(
    (r) => r.isActive && (r.taskType === "All" || r.taskType === taskType)
  );
}

export function checkTaskWorkHours(
  task: TaskCheckInput,
  rules: WorkHourAlertRule[]
): TaskCheckResult {
  const matchedRules = matchAlertRules(task.taskType, rules);
  const overrunPercent = calculateOverrunPercent(task.estimatedHours, task.actualHours);

  let shouldAlert = false;
  let highestAlertLevel = "Info";

  for (const rule of matchedRules) {
    if (overrunPercent >= rule.thresholdPercent) {
      shouldAlert = true;
      // Simple level priority
      const levelPriority: Record<string, number> = {
        Info: 1,
        Warning: 2,
        Critical: 3,
      };
      if ((levelPriority[rule.alertLevel] || 0) > (levelPriority[highestAlertLevel] || 0)) {
        highestAlertLevel = rule.alertLevel;
      }
    }
  }

  return { shouldAlert, overrunPercent, highestAlertLevel };
}

export function batchCheckWorkHours(
  tasks: TaskCheckInput[],
  rules: WorkHourAlertRule[]
): TaskCheckResult[] {
  return tasks
    .map((task) => checkTaskWorkHours(task, rules))
    .filter((result) => result.shouldAlert);
}

export function calculateAlertStatistics(alerts: WorkHourAlert[]): AlertStatistics {
  const pendingAlerts = alerts.filter((a) => a.status === "Pending").length;
  const resolvedAlerts = alerts.filter((a) => a.status === "Resolved").length;
  const acknowledgedAlerts = alerts.filter((a) => a.status === "Acknowledged").length;

  const topOverrunTasks = [...alerts]
    .sort((a, b) => b.overrunPercent - a.overrunPercent)
    .slice(0, 5)
    .map((a) => ({ taskId: a.taskId, overrunPercent: a.overrunPercent }));

  return {
    totalAlerts: alerts.length,
    pendingAlerts,
    resolvedAlerts,
    acknowledgedAlerts,
    topOverrunTasks,
  };
}

export function formatAlertMessage(alert: WorkHourAlert, taskName?: string): AlertMessage {
  const levelMap: Record<string, string> = {
    Critical: "严重",
    Warning: "警告",
    Info: "提示",
  };
  const levelText = levelMap[alert.alertLevel] || alert.alertLevel;
  const workerText = alert.workerName ? ` (${alert.workerName})` : "";

  return {
    title: `[${levelText}] 工时超预估预警`,
    message: `任务${workerText}实际工时已达预估的${alert.overrunPercent}%`,
    urgency: `请关注`,
  };
}

export function validateAlertRule(rule: Partial<WorkHourAlertRule> & { ruleName?: string; notificationChannels?: string[] }): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!rule.ruleName || rule.ruleName.trim() === "") {
    errors.push("规则名称不能为空");
  }
  if (!rule.thresholdPercent || rule.thresholdPercent < 100) {
    errors.push("阈值百分比必须大于等于100");
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function createDefaultAlertRules(): Partial<WorkHourAlertRule>[] {
  return [
    {
      ruleCode: generateRuleCode(),
      ruleName: "工时超预估120%预警",
      taskType: "All",
      thresholdPercent: 120,
      alertLevel: "Warning",
      notificationChannels: ["system"],
      recipients: [],
      isActive: true,
    },
    {
      ruleCode: generateRuleCode(),
      ruleName: "工时超预估150%严重预警",
      taskType: "All",
      thresholdPercent: 150,
      alertLevel: "Critical",
      notificationChannels: ["system", "email"],
      recipients: [],
      isActive: true,
    },
  ];
}

export function calculateAlertTrend(alerts: WorkHourAlert[], days: number): AlertTrendEntry[] {
  const today = new Date();
  const trend: AlertTrendEntry[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayAlerts = alerts.filter((a) => a.alertTime.startsWith(dateStr));
    const resolved = dayAlerts.filter((a) => a.status === "Resolved").length;

    trend.push({
      date: dateStr,
      count: dayAlerts.length,
      resolved,
    });
  }

  return trend;
}

export function createWorkHourAlertService() {
  return {
    generateAlertCode,
    generateRuleCode,
    calculateOverrunPercent,
    checkAlertTrigger,
    determineAlertLevel,
    matchAlertRules,
    checkTaskWorkHours,
    batchCheckWorkHours,
    calculateAlertStatistics,
    formatAlertMessage,
    validateAlertRule,
    createDefaultAlertRules,
    calculateAlertTrend,
  };
}
