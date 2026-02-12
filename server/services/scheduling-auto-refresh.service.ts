/**
 * 排程自动刷新服务
 * 当报工数据更新时自动触发重新排程
 */

import { getDb } from '../db';
import { SchedulingEngine, type SchedulingInput } from './scheduling.service';
import { v4 as uuidv4 } from 'uuid';

// ==================== 类型定义 ====================

export interface WorkReportEvent {
  type: 'work_report_submitted' | 'work_report_updated' | 'work_report_deleted';
  taskId: string;
  resourceId: string;
  reportedHours: number;
  reportDate: string;
  timestamp: Date;
}

export interface AutoRefreshConfig {
  enabled: boolean;
  triggerDelay: number; // 延迟触发时间（毫秒），用于批量更新
  minIntervalMinutes: number; // 最小刷新间隔（分钟）
  affectedBuThreshold: number; // 影响BU数量阈值，超过则触发全局刷新
  notifyOnRefresh: boolean; // 刷新完成后是否通知
}

export interface RefreshResult {
  triggered: boolean;
  reason: string;
  jobId?: string;
  affectedTasks: number;
  timestamp: Date;
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: AutoRefreshConfig = {
  enabled: true,
  triggerDelay: 5000, // 5秒延迟，等待批量更新
  minIntervalMinutes: 15, // 最小15分钟间隔
  affectedBuThreshold: 2, // 影响2个以上BU时触发全局刷新
  notifyOnRefresh: true,
};

// ==================== 状态管理 ====================

let pendingEvents: WorkReportEvent[] = [];
let refreshTimer: NodeJS.Timeout | null = null;
let lastRefreshTime: Date | null = null;
let currentConfig: AutoRefreshConfig = { ...DEFAULT_CONFIG };

// ==================== 核心功能 ====================

/**
 * 更新自动刷新配置
 */
export function updateAutoRefreshConfig(config: Partial<AutoRefreshConfig>): AutoRefreshConfig {
  currentConfig = { ...currentConfig, ...config };
  return currentConfig;
}

/**
 * 获取当前配置
 */
export function getAutoRefreshConfig(): AutoRefreshConfig {
  return { ...currentConfig };
}

/**
 * 处理报工事件
 */
export async function handleWorkReportEvent(event: WorkReportEvent): Promise<void> {
  if (!currentConfig.enabled) {
    console.log('[AutoRefresh] 自动刷新已禁用，忽略事件');
    return;
  }

  // 添加到待处理队列
  pendingEvents.push(event);
  console.log(`[AutoRefresh] 收到报工事件: ${event.type}, 任务: ${event.taskId}`);

  // 重置延迟触发器
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  // 设置延迟触发
  refreshTimer = setTimeout(async () => {
    await processRefresh();
  }, currentConfig.triggerDelay);
}

/**
 * 处理刷新逻辑
 */
async function processRefresh(): Promise<RefreshResult> {
  const events = [...pendingEvents];
  pendingEvents = [];
  refreshTimer = null;

  // 检查最小间隔
  if (lastRefreshTime) {
    const elapsed = Date.now() - lastRefreshTime.getTime();
    const minInterval = currentConfig.minIntervalMinutes * 60 * 1000;
    if (elapsed < minInterval) {
      const waitMinutes = Math.ceil((minInterval - elapsed) / 60000);
      console.log(`[AutoRefresh] 距离上次刷新不足${currentConfig.minIntervalMinutes}分钟，跳过本次刷新`);
      return {
        triggered: false,
        reason: `距离上次刷新不足${currentConfig.minIntervalMinutes}分钟，需等待${waitMinutes}分钟`,
        affectedTasks: 0,
        timestamp: new Date(),
      };
    }
  }

  // 分析影响范围
  const affectedTaskIds = new Set(events.map(e => e.taskId));
  const affectedResourceIds = new Set(events.map(e => e.resourceId));

  console.log(`[AutoRefresh] 处理${events.length}个事件，影响${affectedTaskIds.size}个任务`);

  try {
    // 获取受影响任务的BU分布
    const db: any = await getDb();
    const taskIdList = Array.from(affectedTaskIds);
    
    if (taskIdList.length === 0) {
      return {
        triggered: false,
        reason: '没有受影响的任务',
        affectedTasks: 0,
        timestamp: new Date(),
      };
    }

    const placeholders = taskIdList.map(() => '?').join(',');
    const [taskRows] = await db.execute(
      `SELECT DISTINCT bu_code FROM scheduling_tasks WHERE id IN (${placeholders})`,
      taskIdList
    ) as any[];

    const affectedBus = new Set(taskRows.map((r: any) => r.bu_code));
    const isGlobalRefresh = affectedBus.size >= currentConfig.affectedBuThreshold;

    console.log(`[AutoRefresh] 影响${affectedBus.size}个BU，${isGlobalRefresh ? '触发全局刷新' : '触发局部刷新'}`);

    // 执行排程
    const result = await executeAutoRefresh(
      isGlobalRefresh ? undefined : Array.from(affectedTaskIds),
      isGlobalRefresh
    );

    lastRefreshTime = new Date();

    return {
      triggered: true,
      reason: isGlobalRefresh ? '全局刷新' : '局部刷新',
      jobId: result.jobId,
      affectedTasks: affectedTaskIds.size,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('[AutoRefresh] 刷新失败:', error);
    return {
      triggered: false,
      reason: `刷新失败: ${error instanceof Error ? error.message : '未知错误'}`,
      affectedTasks: affectedTaskIds.size,
      timestamp: new Date(),
    };
  }
}

/**
 * 执行自动刷新排程
 */
async function executeAutoRefresh(
  taskIds?: string[],
  isGlobal: boolean = false
): Promise<{ jobId: string; success: boolean }> {
  const db: any = await getDb();
  const jobId = uuidv4();
  const jobName = `自动刷新-${new Date().toISOString().split('T')[0]}-${isGlobal ? '全局' : '局部'}`;

  // 获取任务
  let taskQuery = 'SELECT * FROM scheduling_tasks WHERE status IN (?, ?)';
  const taskParams: any[] = ['pending', 'scheduled'];
  
  if (taskIds && taskIds.length > 0) {
    const placeholders = taskIds.map(() => '?').join(',');
    taskQuery += ` AND id IN (${placeholders})`;
    taskParams.push(...taskIds);
  }

  const [taskRows] = await db.execute(taskQuery, taskParams) as any[];

  // 获取资源
  const [resourceRows] = await db.execute(
    'SELECT * FROM scheduling_resources WHERE status = ?',
    ['available']
  ) as any[];

  // 获取约束
  const [constraintRows] = await db.execute(
    'SELECT * FROM scheduling_constraints WHERE is_active = ?',
    [true]
  ) as any[];

  // 转换数据格式
  const tasks = taskRows.map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    buCode: row.bu_code,
    taskName: row.task_name,
    taskType: row.task_type,
    estimatedHours: parseFloat(row.estimated_hours),
    priority: row.priority,
    earliestStart: row.earliest_start ? new Date(row.earliest_start) : undefined,
    latestFinish: row.latest_finish ? new Date(row.latest_finish) : undefined,
    predecessorTasks: JSON.parse(row.predecessor_tasks || '[]'),
    requiredSkills: JSON.parse(row.required_skills || '[]'),
    requiredResources: JSON.parse(row.required_resources || '[]'),
  }));

  const resources = resourceRows.map((row: any) => ({
    id: row.id,
    resourceType: row.resource_type,
    resourceName: row.resource_name,
    buCode: row.bu_code,
    skills: JSON.parse(row.skills || '[]'),
    capacityPerDay: parseFloat(row.capacity_per_day),
    costPerHour: parseFloat(row.cost_per_hour),
    availabilityCalendar: JSON.parse(row.availability_calendar || '[]'),
  }));

  const constraints = constraintRows.map((row: any) => ({
    id: row.id,
    constraintType: row.constraint_type,
    constraintName: row.constraint_name,
    description: row.description,
    parameters: JSON.parse(row.parameters || '{}'),
    priority: row.priority,
    isHardConstraint: row.is_hard_constraint === 1,
    penaltyWeight: parseFloat(row.penalty_weight),
  }));

  // 执行排程
  const input: SchedulingInput = {
    tasks,
    resources,
    constraints,
    objectiveWeights: { delayWeight: 1, changeoverWeight: 0.5 },
    solverConfig: { maxTimeSeconds: 60, optimizationLevel: 'balanced' },
    planningHorizon: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  };

  const engine = new SchedulingEngine(input);
  const result = engine.solve();

  // 保存排程任务记录
  await db.execute(
    `INSERT INTO scheduling_jobs 
     (id, job_name, status, input_summary, objective_value, solve_time_seconds, result_summary)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      jobId,
      jobName,
      result.feasible ? 'completed' : 'failed',
      JSON.stringify({ taskCount: tasks.length, resourceCount: resources.length, isGlobal }),
      result.objectiveValue,
      result.solveTimeSeconds,
      JSON.stringify({ 
        message: result.message,
        scheduledTasks: result.scheduledTasks.length,
        feasible: result.feasible,
      }),
    ]
  );

  // 更新任务排程结果
  for (const scheduled of result.scheduledTasks) {
    await db.execute(
      `UPDATE scheduling_tasks 
       SET scheduled_start = ?, scheduled_end = ?, assigned_resource_id = ?, status = ?
       WHERE id = ?`,
      [
        scheduled.scheduledStart.toISOString(),
        scheduled.scheduledEnd.toISOString(),
        scheduled.resourceId,
        'scheduled',
        scheduled.taskId,
      ]
    );
  }

  console.log(`[AutoRefresh] 排程完成，任务ID: ${jobId}，成功: ${result.feasible}`);

  return { jobId, success: result.feasible };
}

/**
 * 手动触发刷新
 */
export async function triggerManualRefresh(): Promise<RefreshResult> {
  console.log('[AutoRefresh] 手动触发刷新');
  
  // 清除待处理事件
  pendingEvents = [];
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  try {
    const result = await executeAutoRefresh(undefined, true);
    lastRefreshTime = new Date();

    return {
      triggered: true,
      reason: '手动触发全局刷新',
      jobId: result.jobId,
      affectedTasks: 0,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      triggered: false,
      reason: `刷新失败: ${error instanceof Error ? error.message : '未知错误'}`,
      affectedTasks: 0,
      timestamp: new Date(),
    };
  }
}

/**
 * 获取刷新状态
 */
export function getRefreshStatus(): {
  enabled: boolean;
  lastRefreshTime: Date | null;
  pendingEventsCount: number;
  config: AutoRefreshConfig;
} {
  return {
    enabled: currentConfig.enabled,
    lastRefreshTime,
    pendingEventsCount: pendingEvents.length,
    config: currentConfig,
  };
}

/**
 * 模拟报工事件（用于测试）
 */
export async function simulateWorkReportEvent(
  taskId: string,
  resourceId: string,
  reportedHours: number
): Promise<void> {
  const event: WorkReportEvent = {
    type: 'work_report_submitted',
    taskId,
    resourceId,
    reportedHours,
    reportDate: new Date().toISOString().split('T')[0],
    timestamp: new Date(),
  };

  await handleWorkReportEvent(event);
}
