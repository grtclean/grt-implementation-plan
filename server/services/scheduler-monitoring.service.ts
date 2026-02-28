/**
 * Scheduler Monitoring Service
 * Provides monitoring dashboard, device metrics, heatmaps, queue monitoring,
 * throughput tracking, alerts, and utility formatting.
 */

// ==================== Types ====================

export interface DeviceMetrics {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  utilization: number;
  memoryUsage: number;
  temperature: number;
  powerConsumption: number;
  taskCount: number;
  avgTaskDuration: number;
  errorRate: number;
  lastUpdated: number;
}

export interface QueueMetrics {
  queueId: string;
  queueName: string;
  depth: number;
  maxDepth: number;
  avgWaitTime: number;
  oldestTaskAge: number;
  priorityDistribution: Map<number, number>;
  taskTypeDistribution: Map<string, number>;
  timestamp: number;
}

export interface ThroughputMetrics {
  schedulerId: string;
  tasksCompleted: number;
  tasksPerSecond: number;
  bytesProcessed: number;
  bytesPerSecond: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  timestamp: number;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  deviceId?: string;
  acknowledged: boolean;
  timestamp: number;
}

export interface MonitoringDashboard {
  name: string;
  devices: Map<string, DeviceMetrics>;
  queues: Map<string, QueueMetrics>;
  throughput: ThroughputMetrics;
  throughputHistory: Map<string, ThroughputMetrics[]>;
  alerts: Alert[];
  acknowledgedAlerts: Alert[];
}

export interface UtilizationHeatmap {
  devices: { deviceId: string; deviceName: string }[];
  timeSlots: number[];
  data: number[][];
}

export interface ColorScale {
  min: number;
  max: number;
  colors: string[];
}

export interface QueueChart {
  type: string;
  queueId: string;
  data: { timestamp: number; depth: number }[];
}

export interface ThroughputChart {
  type: string;
  schedulerId: string;
  data: { timestamp: number; tps: number }[];
}

export interface ThroughputStats {
  avgTps: number;
  maxTps: number;
  minTps: number;
  avgLatency: number;
  totalTasksCompleted: number;
}

export interface DashboardSummary {
  deviceCount: number;
  avgUtilization: number;
  totalQueues: number;
  totalAlerts: number;
}

// ==================== Dashboard Management ====================

let alertCounter = 0;

export function createMonitoringDashboard(name: string): MonitoringDashboard {
  return {
    name,
    devices: new Map(),
    queues: new Map(),
    throughput: {
      schedulerId: '',
      tasksCompleted: 0,
      tasksPerSecond: 0,
      bytesProcessed: 0,
      bytesPerSecond: 0,
      avgLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      successRate: 0,
      timestamp: Date.now(),
    },
    throughputHistory: new Map(),
    alerts: [],
    acknowledgedAlerts: [],
  };
}

export function updateDeviceMetrics(dashboard: MonitoringDashboard, metrics: DeviceMetrics): void {
  dashboard.devices.set(metrics.deviceId, metrics);

  // Auto-generate alerts for high utilization (>= 90%)
  if (metrics.utilization >= 90) {
    const alert: Alert = {
      id: `alert-${++alertCounter}`,
      type: 'utilization',
      message: `High utilization on ${metrics.deviceName}: ${metrics.utilization}%`,
      severity: 'warning',
      deviceId: metrics.deviceId,
      acknowledged: false,
      timestamp: Date.now(),
    };
    dashboard.alerts.push(alert);
  }
}

// ==================== Heatmap ====================

export function createUtilizationHeatmap(dashboard: MonitoringDashboard, timeSlots: number): UtilizationHeatmap {
  const devices: { deviceId: string; deviceName: string }[] = [];
  const data: number[][] = [];

  for (const [deviceId, metrics] of dashboard.devices) {
    devices.push({ deviceId, deviceName: metrics.deviceName });
    const row: number[] = [];
    for (let i = 0; i < timeSlots; i++) {
      row.push(metrics.utilization + (Math.random() - 0.5) * 10);
    }
    data.push(row);
  }

  const slots: number[] = [];
  const now = Date.now();
  for (let i = 0; i < timeSlots; i++) {
    slots.push(now - (timeSlots - i) * 60000);
  }

  return { devices, timeSlots: slots, data };
}

export function getUtilizationColorScale(): ColorScale {
  return {
    min: 0,
    max: 100,
    colors: ['#00ff00', '#66ff00', '#ccff00', '#ffff00', '#ffcc00', '#ff6600', '#ff0000'],
  };
}

export function getColorForValue(value: number, scale: ColorScale): string {
  const normalized = Math.max(0, Math.min(1, (value - scale.min) / (scale.max - scale.min)));
  const index = Math.min(scale.colors.length - 1, Math.floor(normalized * scale.colors.length));
  return scale.colors[index];
}

export function generateHeatmapSVG(heatmap: UtilizationHeatmap): string {
  const cellWidth = 40;
  const cellHeight = 30;
  const width = heatmap.timeSlots.length * cellWidth + 150;
  const height = heatmap.devices.length * cellHeight + 50;
  const scale = getUtilizationColorScale();

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="white"/>`;

  for (let row = 0; row < heatmap.data.length; row++) {
    for (let col = 0; col < heatmap.data[row].length; col++) {
      const color = getColorForValue(heatmap.data[row][col], scale);
      svg += `<rect x="${col * cellWidth + 150}" y="${row * cellHeight}" width="${cellWidth}" height="${cellHeight}" fill="${color}"/>`;
    }
  }

  svg += '</svg>';
  return svg;
}

// ==================== Queue Monitoring ====================

export function updateQueueMetrics(dashboard: MonitoringDashboard, metrics: QueueMetrics): void {
  dashboard.queues.set(metrics.queueId, metrics);
}

export function generateQueueDepthChart(dashboard: MonitoringDashboard, queueId: string): QueueChart {
  const queue = dashboard.queues.get(queueId);
  return {
    type: 'area',
    queueId,
    data: queue ? [{ timestamp: queue.timestamp, depth: queue.depth }] : [],
  };
}

export function getQueueSummary(dashboard: MonitoringDashboard): { totalQueues: number; totalTasks: number; avgWaitTime: number } {
  let totalTasks = 0;
  let totalWaitTime = 0;

  for (const [, queue] of dashboard.queues) {
    totalTasks += queue.depth;
    totalWaitTime += queue.avgWaitTime;
  }

  return {
    totalQueues: dashboard.queues.size,
    totalTasks,
    avgWaitTime: dashboard.queues.size > 0 ? totalWaitTime / dashboard.queues.size : 0,
  };
}

// ==================== Throughput Monitoring ====================

export function updateThroughputMetrics(dashboard: MonitoringDashboard, metrics: ThroughputMetrics): void {
  dashboard.throughput = metrics;

  if (!dashboard.throughputHistory.has(metrics.schedulerId)) {
    dashboard.throughputHistory.set(metrics.schedulerId, []);
  }
  dashboard.throughputHistory.get(metrics.schedulerId)!.push({ ...metrics });
}

export function generateThroughputChart(dashboard: MonitoringDashboard, schedulerId: string): ThroughputChart {
  const history = dashboard.throughputHistory.get(schedulerId) || [];
  return {
    type: 'line',
    schedulerId,
    data: history.map((m) => ({ timestamp: m.timestamp, tps: m.tasksPerSecond })),
  };
}

export function calculateThroughputStats(dashboard: MonitoringDashboard, schedulerId: string): ThroughputStats {
  const history = dashboard.throughputHistory.get(schedulerId) || [];

  if (history.length === 0) {
    return { avgTps: 0, maxTps: 0, minTps: 0, avgLatency: 0, totalTasksCompleted: 0 };
  }

  const tpsValues = history.map((m) => m.tasksPerSecond);
  const avgTps = tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length;
  const maxTps = Math.max(...tpsValues);
  const minTps = Math.min(...tpsValues);
  const avgLatency = history.reduce((a, m) => a + m.avgLatency, 0) / history.length;
  const totalTasksCompleted = history[history.length - 1].tasksCompleted;

  return { avgTps, maxTps, minTps, avgLatency, totalTasksCompleted };
}

// ==================== Alert Management ====================

export function acknowledgeAlert(dashboard: MonitoringDashboard, alertId: string): boolean {
  const index = dashboard.alerts.findIndex((a) => a.id === alertId);
  if (index === -1) return false;

  const alert = dashboard.alerts[index];
  alert.acknowledged = true;
  dashboard.acknowledgedAlerts.push(alert);
  dashboard.alerts.splice(index, 1);
  return true;
}

export function getActiveAlerts(dashboard: MonitoringDashboard): Alert[] {
  return dashboard.alerts.filter((a) => !a.acknowledged);
}

export function clearAcknowledgedAlerts(dashboard: MonitoringDashboard): number {
  const count = dashboard.acknowledgedAlerts.length;
  dashboard.acknowledgedAlerts = [];
  return count;
}

// ==================== Dashboard Summary & Export ====================

export function getDashboardSummary(dashboard: MonitoringDashboard): DashboardSummary {
  let totalUtilization = 0;
  for (const [, device] of dashboard.devices) {
    totalUtilization += device.utilization;
  }

  return {
    deviceCount: dashboard.devices.size,
    avgUtilization: dashboard.devices.size > 0 ? totalUtilization / dashboard.devices.size : 0,
    totalQueues: dashboard.queues.size,
    totalAlerts: dashboard.alerts.length,
  };
}

export function exportDashboardData(dashboard: MonitoringDashboard): string {
  const devices: Record<string, DeviceMetrics> = {};
  for (const [id, metrics] of dashboard.devices) {
    devices[id] = metrics;
  }

  const queues: Record<string, unknown> = {};
  for (const [id, metrics] of dashboard.queues) {
    queues[id] = {
      ...metrics,
      priorityDistribution: Object.fromEntries(metrics.priorityDistribution),
      taskTypeDistribution: Object.fromEntries(metrics.taskTypeDistribution),
    };
  }

  return JSON.stringify({
    name: dashboard.name,
    devices,
    queues,
    throughput: dashboard.throughput,
    alerts: dashboard.alerts,
    exportedAt: Date.now(),
  });
}

// ==================== Formatting Utilities ====================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${Math.round(value * 100) / 100} ${units[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}
