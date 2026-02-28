/**
 * Auto Sync Service
 * Provides data source configuration, sync task management, scheduling,
 * connection validation, sync reports, and data source templates.
 */

export interface FieldMapping {
  sourceField: string;
  targetField: string;
}

export interface DataSourceConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  connection: Record<string, unknown>;
  mapping: FieldMapping[];
  createdAt: number;
  updatedAt: number;
}

export interface SyncSchedule {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  timezone: string;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

export interface SyncNotifications {
  onSuccess: boolean;
  onFailure: boolean;
  onWarning: boolean;
  recipients: string[];
}

export interface SyncTaskConfig {
  id: string;
  name: string;
  description: string;
  dataSourceId: string;
  targetEntity: string;
  schedule: SyncSchedule;
  syncMode: 'full' | 'incremental';
  incrementalConfig?: {
    timestampField: string;
    batchSize: number;
  };
  conflictResolution: 'overwrite' | 'skip' | 'merge';
  notifications: SyncNotifications;
  enabled: boolean;
  status: 'idle' | 'running' | 'paused' | 'error';
  createdAt: number;
  updatedAt: number;
}

export interface SyncExecution {
  taskId: string;
  executionId: string;
  startTime: number;
  endTime: number;
  status: 'success' | 'failed' | 'partial';
  statistics: {
    totalRecords: number;
    insertedRecords: number;
    updatedRecords: number;
    skippedRecords: number;
    failedRecords: number;
  };
  errors: string[];
  warnings: string[];
}

export interface SyncTaskSummary {
  totalTasks: number;
  enabledTasks: number;
  disabledTasks: number;
  runningTasks: number;
  errorTasks: number;
}

export interface SyncReport {
  taskName: string;
  taskId: string;
  summary: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalRecordsProcessed: number;
    avgDuration: number;
  };
  executions: SyncExecution[];
  generatedAt: number;
}

export interface DataSourceTemplate {
  name: string;
  type: string;
  description: string;
  defaultConnection: Record<string, unknown>;
  defaultMapping: FieldMapping[];
}

export interface ConnectionValidationResult {
  valid: boolean;
  message: string;
  latency?: number;
}

let dsCounter = 0;
let taskCounter = 0;

/**
 * Create a data source configuration from input parameters.
 */
export function createDataSourceConfig(input: {
  name: string;
  type: string;
  enabled: boolean;
  connection: Record<string, unknown>;
  mapping: FieldMapping[];
}): DataSourceConfig {
  dsCounter++;
  return {
    id: `ds_${Date.now()}_${dsCounter}`,
    name: input.name,
    type: input.type,
    enabled: input.enabled,
    connection: input.connection,
    mapping: input.mapping,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Create a sync task configuration from input parameters.
 */
export function createSyncTaskConfig(input: {
  name: string;
  description: string;
  dataSourceId: string;
  targetEntity: string;
  schedule: SyncSchedule;
  syncMode: 'full' | 'incremental';
  incrementalConfig?: { timestampField: string; batchSize: number };
  conflictResolution: 'overwrite' | 'skip' | 'merge';
  notifications: SyncNotifications;
  enabled: boolean;
}): SyncTaskConfig {
  taskCounter++;
  return {
    id: `task_${Date.now()}_${taskCounter}`,
    name: input.name,
    description: input.description,
    dataSourceId: input.dataSourceId,
    targetEntity: input.targetEntity,
    schedule: input.schedule,
    syncMode: input.syncMode,
    incrementalConfig: input.incrementalConfig,
    conflictResolution: input.conflictResolution,
    notifications: input.notifications,
    enabled: input.enabled,
    status: 'idle',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Calculate the next run time based on a schedule.
 */
export function calculateNextRunTime(schedule: SyncSchedule): number {
  const now = Date.now();
  const frequencyMs: Record<string, number> = {
    hourly: 3600000,
    daily: 86400000,
    weekly: 604800000,
    monthly: 2592000000,
  };
  return now + (frequencyMs[schedule.frequency] ?? 3600000);
}

/**
 * Validate a data source connection (simulated, always returns valid).
 */
export async function validateDataSourceConnection(
  config: DataSourceConfig
): Promise<ConnectionValidationResult> {
  // Simulated validation - always succeeds
  return {
    valid: true,
    message: `Successfully connected to ${config.name}`,
    latency: 50,
  };
}

/**
 * Get a summary of sync task statuses.
 */
export function getSyncTaskSummary(
  tasks: SyncTaskConfig[],
  _executions: SyncExecution[]
): SyncTaskSummary {
  return {
    totalTasks: tasks.length,
    enabledTasks: tasks.filter((t) => t.enabled).length,
    disabledTasks: tasks.filter((t) => !t.enabled).length,
    runningTasks: tasks.filter((t) => t.status === 'running').length,
    errorTasks: tasks.filter((t) => t.status === 'error').length,
  };
}

/**
 * Generate a sync report for a given task and its execution history.
 */
export function generateSyncReport(
  task: SyncTaskConfig,
  executions: SyncExecution[]
): SyncReport {
  const taskExecutions = executions.filter((e) => e.taskId === task.id);
  const successfulExecutions = taskExecutions.filter(
    (e) => e.status === 'success'
  );
  const failedExecutions = taskExecutions.filter((e) => e.status === 'failed');

  const totalRecords = taskExecutions.reduce(
    (acc, e) => acc + e.statistics.totalRecords,
    0
  );
  const totalDuration = taskExecutions.reduce(
    (acc, e) => acc + (e.endTime - e.startTime),
    0
  );

  return {
    taskName: task.name,
    taskId: task.id,
    summary: {
      totalExecutions: taskExecutions.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: failedExecutions.length,
      totalRecordsProcessed: totalRecords,
      avgDuration:
        taskExecutions.length > 0
          ? totalDuration / taskExecutions.length
          : 0,
    },
    executions: taskExecutions,
    generatedAt: Date.now(),
  };
}

const DATA_SOURCE_TEMPLATES: DataSourceTemplate[] = [
  {
    name: 'ERP数据源',
    type: 'rest_api',
    description: 'ERP系统数据源模板',
    defaultConnection: {
      url: 'https://erp.example.com/api',
      timeout: 30000,
    },
    defaultMapping: [
      { sourceField: 'id', targetField: 'serialNumber' },
      { sourceField: 'status', targetField: 'status' },
    ],
  },
  {
    name: 'MES数据源',
    type: 'database',
    description: 'MES系统数据源模板',
    defaultConnection: {
      host: 'mes.example.com',
      port: 3306,
      database: 'mes_db',
    },
    defaultMapping: [
      { sourceField: 'sn', targetField: 'serialNumber' },
      { sourceField: 'result', targetField: 'status' },
    ],
  },
  {
    name: 'IoT数据源',
    type: 'mqtt',
    description: 'IoT设备数据源模板',
    defaultConnection: {
      broker: 'mqtt://iot.example.com',
      topic: 'devices/#',
    },
    defaultMapping: [
      { sourceField: 'deviceId', targetField: 'unitId' },
      { sourceField: 'data', targetField: 'sensorData' },
    ],
  },
];

/**
 * Get available data source templates.
 */
export function getDataSourceTemplates(): DataSourceTemplate[] {
  return [...DATA_SOURCE_TEMPLATES];
}

/**
 * Create a data source configuration from a template, with optional overrides.
 */
export function createDataSourceFromTemplate(
  templateIndex: number,
  overrides: { name?: string; connection?: Record<string, unknown> } = {}
): DataSourceConfig {
  const template = DATA_SOURCE_TEMPLATES[templateIndex] ?? DATA_SOURCE_TEMPLATES[0];
  dsCounter++;
  return {
    id: `ds_tpl_${Date.now()}_${dsCounter}`,
    name: overrides.name ?? template.name,
    type: template.type,
    enabled: true,
    connection: { ...template.defaultConnection, ...overrides.connection },
    mapping: [...template.defaultMapping],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
