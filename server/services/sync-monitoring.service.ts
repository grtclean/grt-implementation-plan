/**
 * Sync Monitoring Service
 * Provides dashboard summary, realtime status, task statistics, data flow stats,
 * error analysis, time series generation, alert management, and formatting utilities.
 */

import type { SyncTaskConfig, SyncExecution } from './auto-sync.service';

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

export interface MonitoringAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  timeWindow: number;
}

export interface TaskStats {
  taskId: string;
  taskName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgDuration: number;
  totalRecordsProcessed: number;
}

export interface DataFlowStats {
  totalRecordsIn: number;
  insertedRecords: number;
  updatedRecords: number;
  skippedRecords: number;
  failedRecords: number;
}

export interface ErrorAnalysis {
  errorType: string;
  count: number;
  taskName: string;
  lastOccurrence: number;
}

export interface TimeSeriesData {
  metric: string;
  dataPoints: Array<{
    timestamp: number;
    value: number;
  }>;
  timeRange: TimeRange;
}

export interface DashboardSummary {
  overview: {
    totalTasks: number;
    activeTasks: number;
    pausedTasks: number;
    totalExecutions: number;
    successRate: number;
  };
  performance: {
    avgDuration: number;
    totalRecordsProcessed: number;
  };
  dataFlow: DataFlowStats;
  taskStats: TaskStats[];
  alerts: MonitoringAlert[];
}

export interface RealtimeStatus {
  activeTasks: number;
  runningTasks: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  lastUpdate: number;
}

export interface AlertStatistics {
  total: number;
  acknowledged: number;
  pending: number;
  bySeverity: Record<string, number>;
}

// ============== Constants ==============

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule_error_rate',
    name: '错误率告警',
    type: 'error_rate',
    enabled: true,
    threshold: 0.3,
    severity: 'warning',
    timeWindow: 3600000,
  },
  {
    id: 'rule_long_running',
    name: '长时间运行告警',
    type: 'long_running',
    enabled: true,
    threshold: 300000,
    severity: 'warning',
    timeWindow: 3600000,
  },
  {
    id: 'rule_consecutive_failures',
    name: '连续失败告警',
    type: 'consecutive_failures',
    enabled: true,
    threshold: 3,
    severity: 'critical',
    timeWindow: 7200000,
  },
];

// ============== Time Range Helpers ==============

const TIME_RANGE_MS: Record<TimeRange, number> = {
  '1h': 3600000,
  '6h': 6 * 3600000,
  '24h': 24 * 3600000,
  '7d': 7 * 24 * 3600000,
  '30d': 30 * 24 * 3600000,
};

/**
 * Get the start timestamp for a given time range.
 */
export function getTimeRangeStart(timeRange: TimeRange): number {
  return Date.now() - TIME_RANGE_MS[timeRange];
}

/**
 * Filter executions to a specific time range.
 */
function filterExecutionsByTimeRange(
  executions: SyncExecution[],
  timeRange: TimeRange
): SyncExecution[] {
  const start = getTimeRangeStart(timeRange);
  return executions.filter((e) => e.startTime >= start);
}

// ============== Task Statistics ==============

/**
 * Calculate execution statistics for a single task within a time range.
 */
export function calculateTaskStats(
  task: SyncTaskConfig,
  executions: SyncExecution[],
  timeRange: TimeRange
): TaskStats {
  const filtered = filterExecutionsByTimeRange(executions, timeRange).filter(
    (e) => e.taskId === task.id
  );

  const successful = filtered.filter((e) => e.status === 'success');
  const failed = filtered.filter((e) => e.status === 'failed');

  const totalDuration = filtered.reduce(
    (acc, e) => acc + (e.endTime - e.startTime),
    0
  );

  const totalRecords = filtered.reduce(
    (acc, e) => acc + e.statistics.totalRecords,
    0
  );

  return {
    taskId: task.id,
    taskName: task.name,
    totalExecutions: filtered.length,
    successfulExecutions: successful.length,
    failedExecutions: failed.length,
    successRate: filtered.length > 0 ? successful.length / filtered.length : 0,
    avgDuration: filtered.length > 0 ? totalDuration / filtered.length : 0,
    totalRecordsProcessed: totalRecords,
  };
}

/**
 * Calculate data flow statistics across all executions in a time range.
 */
export function calculateDataFlowStats(
  executions: SyncExecution[],
  timeRange: TimeRange
): DataFlowStats {
  const filtered = filterExecutionsByTimeRange(executions, timeRange);

  return {
    totalRecordsIn: filtered.reduce(
      (acc, e) => acc + e.statistics.totalRecords,
      0
    ),
    insertedRecords: filtered.reduce(
      (acc, e) => acc + e.statistics.insertedRecords,
      0
    ),
    updatedRecords: filtered.reduce(
      (acc, e) => acc + e.statistics.updatedRecords,
      0
    ),
    skippedRecords: filtered.reduce(
      (acc, e) => acc + e.statistics.skippedRecords,
      0
    ),
    failedRecords: filtered.reduce(
      (acc, e) => acc + e.statistics.failedRecords,
      0
    ),
  };
}

// ============== Error Analysis ==============

/**
 * Analyze errors from executions in a time range.
 */
export function analyzeErrors(
  executions: SyncExecution[],
  timeRange: TimeRange,
  tasks: SyncTaskConfig[]
): ErrorAnalysis[] {
  const filtered = filterExecutionsByTimeRange(executions, timeRange);
  const errorMap = new Map<string, ErrorAnalysis>();
  const taskMap = new Map<string, string>();

  for (const task of tasks) {
    taskMap.set(task.id, task.name);
  }

  for (const exec of filtered) {
    for (const error of exec.errors) {
      const existing = errorMap.get(error);
      if (existing) {
        existing.count++;
        existing.lastOccurrence = Math.max(
          existing.lastOccurrence,
          exec.startTime
        );
      } else {
        errorMap.set(error, {
          errorType: error,
          count: 1,
          taskName: taskMap.get(exec.taskId) ?? 'Unknown',
          lastOccurrence: exec.startTime,
        });
      }
    }
  }

  return Array.from(errorMap.values());
}

// ============== Time Series ==============

/**
 * Generate time series data for a given metric and time range.
 */
export function generateTimeSeries(
  executions: SyncExecution[],
  metric: 'execution_count' | 'success_rate' | 'avg_duration' | 'records_processed',
  timeRange: TimeRange
): TimeSeriesData {
  const filtered = filterExecutionsByTimeRange(executions, timeRange);
  const rangeMs = TIME_RANGE_MS[timeRange];
  const bucketCount = Math.min(24, Math.max(6, Math.ceil(rangeMs / 3600000)));
  const bucketSize = rangeMs / bucketCount;
  const start = getTimeRangeStart(timeRange);

  const dataPoints: Array<{ timestamp: number; value: number }> = [];

  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = start + i * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    const bucketExecs = filtered.filter(
      (e) => e.startTime >= bucketStart && e.startTime < bucketEnd
    );

    let value = 0;
    switch (metric) {
      case 'execution_count':
        value = bucketExecs.length;
        break;
      case 'success_rate':
        value =
          bucketExecs.length > 0
            ? bucketExecs.filter((e) => e.status === 'success').length /
              bucketExecs.length
            : 0;
        break;
      case 'avg_duration':
        value =
          bucketExecs.length > 0
            ? bucketExecs.reduce(
                (acc, e) => acc + (e.endTime - e.startTime),
                0
              ) / bucketExecs.length
            : 0;
        break;
      case 'records_processed':
        value = bucketExecs.reduce(
          (acc, e) => acc + e.statistics.totalRecords,
          0
        );
        break;
    }

    dataPoints.push({
      timestamp: bucketStart + bucketSize / 2,
      value,
    });
  }

  return {
    metric,
    dataPoints,
    timeRange,
  };
}

// ============== Dashboard Summary ==============

/**
 * Generate a complete dashboard summary.
 */
export function generateDashboardSummary(
  tasks: SyncTaskConfig[],
  executions: SyncExecution[],
  alerts: MonitoringAlert[],
  timeRange: TimeRange
): DashboardSummary {
  const filtered = filterExecutionsByTimeRange(executions, timeRange);
  const activeTasks = tasks.filter((t) => t.enabled).length;
  const pausedTasks = tasks.filter((t) => !t.enabled).length;
  const successful = filtered.filter((e) => e.status === 'success');

  const totalDuration = filtered.reduce(
    (acc, e) => acc + (e.endTime - e.startTime),
    0
  );
  const totalRecords = filtered.reduce(
    (acc, e) => acc + e.statistics.totalRecords,
    0
  );

  const taskStats = tasks.map((task) =>
    calculateTaskStats(task, executions, timeRange)
  );
  const dataFlow = calculateDataFlowStats(executions, timeRange);

  return {
    overview: {
      totalTasks: tasks.length,
      activeTasks,
      pausedTasks,
      totalExecutions: filtered.length,
      successRate:
        filtered.length > 0 ? successful.length / filtered.length : 0,
    },
    performance: {
      avgDuration:
        filtered.length > 0 ? totalDuration / filtered.length : 0,
      totalRecordsProcessed: totalRecords,
    },
    dataFlow,
    taskStats,
    alerts,
  };
}

// ============== Realtime Status ==============

/**
 * Get the real-time status of the sync system.
 */
export function getRealtimeStatus(
  tasks: SyncTaskConfig[],
  executions: SyncExecution[]
): RealtimeStatus {
  const activeTasks = tasks.filter((t) => t.enabled).length;
  const runningTasks = tasks.filter((t) => t.status === 'running').length;

  // Determine system health based on recent failures
  const recentExecs = executions.filter(
    (e) => e.startTime >= Date.now() - 3600000
  );
  const recentFailures = recentExecs.filter((e) => e.status === 'failed');

  let systemHealth: 'healthy' | 'degraded' | 'critical';
  if (recentExecs.length === 0) {
    systemHealth = 'healthy';
  } else {
    const failureRate = recentFailures.length / recentExecs.length;
    if (failureRate >= 0.5) {
      systemHealth = 'critical';
    } else if (failureRate >= 0.2) {
      systemHealth = 'degraded';
    } else {
      systemHealth = 'healthy';
    }
  }

  return {
    activeTasks,
    runningTasks,
    systemHealth,
    lastUpdate: Date.now(),
  };
}

// ============== Alert Management ==============

/**
 * Check alert rules against current tasks and executions.
 */
export function checkAlertRules(
  rules: AlertRule[],
  tasks: SyncTaskConfig[],
  executions: SyncExecution[],
  existingAlerts: MonitoringAlert[]
): MonitoringAlert[] {
  const newAlerts: MonitoringAlert[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const windowStart = Date.now() - rule.timeWindow;
    const recentExecs = executions.filter((e) => e.startTime >= windowStart);

    if (rule.type === 'error_rate' && recentExecs.length > 0) {
      const failureRate =
        recentExecs.filter((e) => e.status === 'failed').length /
        recentExecs.length;
      if (failureRate > rule.threshold) {
        newAlerts.push({
          id: `alert_${Date.now()}_${rule.id}`,
          type: rule.type,
          severity: rule.severity,
          message: `错误率 ${(failureRate * 100).toFixed(1)}% 超过阈值 ${(rule.threshold * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          acknowledged: false,
        });
      }
    }

    if (rule.type === 'consecutive_failures') {
      for (const task of tasks) {
        const taskExecs = recentExecs
          .filter((e) => e.taskId === task.id)
          .sort((a, b) => b.startTime - a.startTime);
        let consecutiveFails = 0;
        for (const exec of taskExecs) {
          if (exec.status === 'failed') consecutiveFails++;
          else break;
        }
        if (consecutiveFails >= rule.threshold) {
          newAlerts.push({
            id: `alert_${Date.now()}_${rule.id}_${task.id}`,
            type: rule.type,
            severity: rule.severity,
            message: `任务 ${task.name} 连续失败 ${consecutiveFails} 次`,
            timestamp: Date.now(),
            acknowledged: false,
          });
        }
      }
    }
  }

  return newAlerts;
}

/**
 * Acknowledge an alert by ID.
 */
export function acknowledgeAlert(
  alerts: MonitoringAlert[],
  alertId: string,
  acknowledgedBy: string
): MonitoringAlert[] {
  return alerts.map((alert) => {
    if (alert.id === alertId) {
      return {
        ...alert,
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: Date.now(),
      };
    }
    return alert;
  });
}

/**
 * Get alert statistics for a time range.
 */
export function getAlertStatistics(
  alerts: MonitoringAlert[],
  timeRange: TimeRange
): AlertStatistics {
  const start = getTimeRangeStart(timeRange);
  const filtered = alerts.filter((a) => a.timestamp >= start);

  const bySeverity: Record<string, number> = {};
  for (const alert of filtered) {
    bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
  }

  return {
    total: filtered.length,
    acknowledged: filtered.filter((a) => a.acknowledged).length,
    pending: filtered.filter((a) => !a.acknowledged).length,
    bySeverity,
  };
}

// ============== Formatting Utilities ==============

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Format a data volume in bytes to a human-readable string.
 */
export function formatDataVolume(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
