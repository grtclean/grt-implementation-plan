/**
 * Production Dashboard Service
 * Provides functions for production dashboard visualization, metrics, and formatting.
 */

export interface WorkOrderSummary {
  id: number;
  workOrderCode: string;
  productName: string;
  productModel: string | null;
  quantity: number;
  priority: string;
  status: string;
  completionRate: number;
  estimatedHours: number;
  actualHours: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  assignedTeam: string | null;
}

export interface WorkerEfficiency {
  workerId: number;
  workerName: string;
  tasksCompleted: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  efficiency: number;
  qualityPassRate: number;
  ranking: number;
}

export interface DashboardMetrics {
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  pendingWorkOrders: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  averageEfficiency: number;
  averageCompletionRate: number;
  onTimeDeliveryRate: number;
}

export interface ProductionDashboardData {
  metrics: DashboardMetrics;
  workOrdersByStatus: { status: string; count: number; percentage: number }[];
  tasksByType: { taskType: string; count: number; completedCount: number; inProgressCount: number }[];
  tasksByStatus: { status: string; count: number; percentage: number }[];
  topWorkers: WorkerEfficiency[];
  recentWorkOrders: WorkOrderSummary[];
  urgentWorkOrders: WorkOrderSummary[];
  lastUpdated: string;
}

export interface StatusDistributionEntry {
  status: string;
  count: number;
  percentage: number;
}

export interface TaskTypeDistributionEntry {
  taskType: string;
  count: number;
  completedCount: number;
  inProgressCount: number;
}

export interface FormattedDashboard {
  summary: string;
  highlights: string[];
  warnings: string[];
}

export function calculateEfficiency(estimatedHours: number, actualHours: number): number {
  if (estimatedHours <= 0 || actualHours <= 0) return 0;
  return Math.round((estimatedHours / actualHours) * 100);
}

export function calculateCompletionRate(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function calculateOnTimeDeliveryRate(onTime: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((onTime / total) * 100);
}

export function getPriorityWeight(priority: string): number {
  switch (priority) {
    case "Top_Urgent":
      return 3;
    case "Urgent":
      return 2;
    case "Normal":
      return 1;
    default:
      return 0;
  }
}

export function sortByPriority<T extends { priority: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority)
  );
}

export function calculateStatusDistribution(
  items: { status: string }[]
): StatusDistributionEntry[] {
  if (items.length === 0) return [];
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.status] = (counts[item.status] || 0) + 1;
  }
  return Object.entries(counts).map(([status, count]) => ({
    status,
    count,
    percentage: Math.round((count / items.length) * 100),
  }));
}

export function calculateTaskTypeDistribution(
  tasks: { taskType: string; status: string }[]
): TaskTypeDistributionEntry[] {
  const map: Record<string, { count: number; completedCount: number; inProgressCount: number }> = {};
  for (const task of tasks) {
    if (!map[task.taskType]) {
      map[task.taskType] = { count: 0, completedCount: 0, inProgressCount: 0 };
    }
    map[task.taskType].count++;
    if (task.status === "Completed") {
      map[task.taskType].completedCount++;
    } else if (task.status === "In_Progress") {
      map[task.taskType].inProgressCount++;
    }
  }
  return Object.entries(map).map(([taskType, data]) => ({
    taskType,
    ...data,
  }));
}

export function calculateWorkerRankings(
  workers: Omit<WorkerEfficiency, "ranking">[]
): WorkerEfficiency[] {
  const sorted = [...workers].sort((a, b) => b.efficiency - a.efficiency);
  return sorted.map((w, i) => ({ ...w, ranking: i + 1 }));
}

export function aggregateDashboardMetrics(
  workOrders: WorkOrderSummary[],
  tasks: { status: string; estimatedHours: number; actualHours: number }[]
): DashboardMetrics {
  const activeWorkOrders = workOrders.filter((wo) => wo.status === "In_Progress").length;
  const completedWorkOrders = workOrders.filter((wo) => wo.status === "Completed").length;
  const pendingWorkOrders = workOrders.filter((wo) => wo.status === "Pending").length;

  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "In_Progress").length;

  const totalEstimated = tasks.reduce((s, t) => s + t.estimatedHours, 0);
  const totalActual = tasks.reduce((s, t) => s + t.actualHours, 0);
  const averageEfficiency = totalActual > 0 ? Math.round((totalEstimated / totalActual) * 100) : 0;

  const averageCompletionRate =
    workOrders.length > 0
      ? Math.round(workOrders.reduce((s, wo) => s + wo.completionRate, 0) / workOrders.length)
      : 0;

  return {
    totalWorkOrders: workOrders.length,
    activeWorkOrders,
    completedWorkOrders,
    pendingWorkOrders,
    totalTasks: tasks.length,
    completedTasks,
    inProgressTasks,
    averageEfficiency,
    averageCompletionRate,
    onTimeDeliveryRate: 0,
  };
}

export function generateDashboardConfigCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DASH-${ts}-${rand}`;
}

export function validateRefreshInterval(seconds: number): number {
  if (seconds < 5) return 5;
  if (seconds > 300) return 300;
  return seconds;
}

export function formatDashboardForDisplay(data: ProductionDashboardData): FormattedDashboard {
  const { metrics, urgentWorkOrders } = data;
  const summary = `共 ${metrics.totalWorkOrders} 个工单，${metrics.activeWorkOrders} 个进行中，${metrics.completedWorkOrders} 个已完成`;

  const highlights: string[] = [];
  if (metrics.averageEfficiency > 100) {
    highlights.push("整体效率超过预期");
  }
  if (metrics.onTimeDeliveryRate >= 90) {
    highlights.push("准时交付率优秀");
  }

  const warnings: string[] = [];
  if (urgentWorkOrders.length > 0) {
    warnings.push(`有 ${urgentWorkOrders.length} 个紧急工单需要关注`);
  }
  if (metrics.averageEfficiency < 80) {
    warnings.push("整体效率偏低，需要分析原因");
  }

  return { summary, highlights, warnings };
}

export function createProductionDashboardService() {
  return {
    calculateEfficiency,
    calculateCompletionRate,
    calculateOnTimeDeliveryRate,
    getPriorityWeight,
    sortByPriority,
    calculateStatusDistribution,
    calculateTaskTypeDistribution,
    calculateWorkerRankings,
    aggregateDashboardMetrics,
    generateDashboardConfigCode,
    validateRefreshInterval,
    formatDashboardForDisplay,
  };
}
