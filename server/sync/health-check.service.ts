/**
 * 同步健康检查服务
 * v1.3.83 - 定期检查各区域节点连接状态
 */

import { requireDb } from '../db';
import { sql } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("sync-health");

// 类型定义
export type RegionCode = 'CN' | 'US' | 'DE';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'offline';

export interface RegionHealth {
  region: RegionCode;
  status: HealthStatus;
  latency: number;
  lastSync: number | null;
  syncSuccessRate: number;
  failedSyncsLast24h: number;
  pendingConflicts: number;
  lastChecked: number;
  errorMessage: string | null;
}

export interface HealthCheckResult {
  timestamp: number;
  overallStatus: HealthStatus;
  regions: RegionHealth[];
  alerts: HealthAlert[];
}

export interface HealthAlert {
  id: string;
  severity: 'warning' | 'error' | 'critical';
  region: RegionCode | 'global';
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

// 健康检查阈值配置
const HEALTH_THRESHOLDS = {
  latency: {
    healthy: 200,      // ms
    degraded: 500,     // ms
    unhealthy: 1000,   // ms
  },
  successRate: {
    healthy: 95,       // %
    degraded: 80,      // %
    unhealthy: 60,     // %
  },
  failedSyncs: {
    warning: 3,
    error: 5,
    critical: 10,
  },
  pendingConflicts: {
    warning: 5,
    error: 10,
    critical: 20,
  },
};

// 模拟区域端点
const REGION_ENDPOINTS: Record<RegionCode, string> = {
  CN: 'https://cn-sync.grt-system.internal',
  US: 'https://us-sync.grt-system.internal',
  DE: 'https://de-sync.grt-system.internal',
};

/**
 * 生成唯一ID
 */
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * 检查单个区域的健康状态
 */
async function checkRegionHealth(region: RegionCode): Promise<RegionHealth> {
  const now = Date.now();
  
  try {
    // 模拟延迟测量（实际应该ping区域端点）
    const startTime = Date.now();
    // 模拟网络延迟
    const latency = Math.floor(Math.random() * 300) + 50;
    
    // 查询最近24小时的同步统计
    const statsResult = await (await requireDb()).execute(sql`
      SELECT
        COUNT(*) as total_syncs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_syncs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_syncs,
        MAX(CASE WHEN status = 'completed' THEN created_at ELSE NULL END) as last_successful_sync
      FROM sync_execution_logs
      WHERE (source_region = ${region} OR target_region = ${region})
        AND created_at > ${now - 24 * 60 * 60 * 1000}
    `);
    
    // 查询待处理冲突数
    const conflictResult = await (await requireDb()).execute(sql`
      SELECT COUNT(*) as pending_conflicts
      FROM sync_conflicts
      WHERE (source_region = ${region} OR target_region = ${region})
        AND status = 'pending'
    `);
    
    const stats = ((statsResult as any)[0] as any[])[0] || {};
    const conflicts = ((conflictResult as any)[0] as any[])[0] || {};
    
    const totalSyncs = stats.total_syncs || 0;
    const successfulSyncs = stats.successful_syncs || 0;
    const failedSyncs = stats.failed_syncs || 0;
    const lastSync = stats.last_successful_sync || null;
    const pendingConflicts = conflicts.pending_conflicts || 0;
    
    const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100;
    
    // 确定健康状态
    let status: HealthStatus = 'healthy';
    
    if (latency > HEALTH_THRESHOLDS.latency.unhealthy) {
      status = 'unhealthy';
    } else if (latency > HEALTH_THRESHOLDS.latency.degraded) {
      status = 'degraded';
    }
    
    if (successRate < HEALTH_THRESHOLDS.successRate.unhealthy) {
      status = 'unhealthy';
    } else if (successRate < HEALTH_THRESHOLDS.successRate.degraded && status !== 'unhealthy') {
      status = 'degraded';
    }
    
    return {
      region,
      status,
      latency,
      lastSync,
      syncSuccessRate: Math.round(successRate * 100) / 100,
      failedSyncsLast24h: failedSyncs,
      pendingConflicts,
      lastChecked: now,
      errorMessage: null,
    };
  } catch (error) {
    return {
      region,
      status: 'offline',
      latency: -1,
      lastSync: null,
      syncSuccessRate: 0,
      failedSyncsLast24h: 0,
      pendingConflicts: 0,
      lastChecked: now,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 生成健康告警
 */
function generateAlerts(regions: RegionHealth[]): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  const now = Date.now();
  
  for (const region of regions) {
    // 检查离线状态
    if (region.status === 'offline') {
      alerts.push({
        id: generateAlertId(),
        severity: 'critical',
        region: region.region,
        message: `区域 ${region.region} 节点离线: ${region.errorMessage || '无法连接'}`,
        timestamp: now,
        acknowledged: false,
      });
      continue;
    }
    
    // 检查延迟
    if (region.latency > HEALTH_THRESHOLDS.latency.unhealthy) {
      alerts.push({
        id: generateAlertId(),
        severity: 'error',
        region: region.region,
        message: `区域 ${region.region} 延迟过高: ${region.latency}ms`,
        timestamp: now,
        acknowledged: false,
      });
    } else if (region.latency > HEALTH_THRESHOLDS.latency.degraded) {
      alerts.push({
        id: generateAlertId(),
        severity: 'warning',
        region: region.region,
        message: `区域 ${region.region} 延迟偏高: ${region.latency}ms`,
        timestamp: now,
        acknowledged: false,
      });
    }
    
    // 检查同步失败次数
    if (region.failedSyncsLast24h >= HEALTH_THRESHOLDS.failedSyncs.critical) {
      alerts.push({
        id: generateAlertId(),
        severity: 'critical',
        region: region.region,
        message: `区域 ${region.region} 24小时内同步失败 ${region.failedSyncsLast24h} 次`,
        timestamp: now,
        acknowledged: false,
      });
    } else if (region.failedSyncsLast24h >= HEALTH_THRESHOLDS.failedSyncs.error) {
      alerts.push({
        id: generateAlertId(),
        severity: 'error',
        region: region.region,
        message: `区域 ${region.region} 24小时内同步失败 ${region.failedSyncsLast24h} 次`,
        timestamp: now,
        acknowledged: false,
      });
    }
    
    // 检查待处理冲突
    if (region.pendingConflicts >= HEALTH_THRESHOLDS.pendingConflicts.critical) {
      alerts.push({
        id: generateAlertId(),
        severity: 'critical',
        region: region.region,
        message: `区域 ${region.region} 有 ${region.pendingConflicts} 个待处理冲突`,
        timestamp: now,
        acknowledged: false,
      });
    } else if (region.pendingConflicts >= HEALTH_THRESHOLDS.pendingConflicts.warning) {
      alerts.push({
        id: generateAlertId(),
        severity: 'warning',
        region: region.region,
        message: `区域 ${region.region} 有 ${region.pendingConflicts} 个待处理冲突`,
        timestamp: now,
        acknowledged: false,
      });
    }
    
    // 检查成功率
    if (region.syncSuccessRate < HEALTH_THRESHOLDS.successRate.unhealthy) {
      alerts.push({
        id: generateAlertId(),
        severity: 'error',
        region: region.region,
        message: `区域 ${region.region} 同步成功率过低: ${region.syncSuccessRate}%`,
        timestamp: now,
        acknowledged: false,
      });
    }
  }
  
  return alerts;
}

/**
 * 计算整体健康状态
 */
function calculateOverallStatus(regions: RegionHealth[]): HealthStatus {
  const statuses = regions.map(r => r.status);
  
  if (statuses.includes('offline')) return 'offline';
  if (statuses.includes('unhealthy')) return 'unhealthy';
  if (statuses.includes('degraded')) return 'degraded';
  return 'healthy';
}

/**
 * 执行完整健康检查
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const regions: RegionCode[] = ['CN', 'US', 'DE'];
  const regionHealths = await Promise.all(regions.map(checkRegionHealth));
  
  const alerts = generateAlerts(regionHealths);
  const overallStatus = calculateOverallStatus(regionHealths);
  
  const result: HealthCheckResult = {
    timestamp: Date.now(),
    overallStatus,
    regions: regionHealths,
    alerts,
  };
  
  // 记录健康检查结果
  await recordHealthCheck(result);
  
  // 如果有严重告警，发送通知
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    await sendHealthAlertNotification(criticalAlerts);
  }
  
  return result;
}

/**
 * 记录健康检查结果到数据库
 */
async function recordHealthCheck(result: HealthCheckResult): Promise<void> {
  try {
    await (await requireDb()).execute(sql`
      INSERT INTO sync_health_checks (
        id, timestamp, overall_status, regions_data, alerts_count, created_at
      ) VALUES (
        ${`hc_${Date.now()}`},
        ${result.timestamp},
        ${result.overallStatus},
        ${JSON.stringify(result.regions)},
        ${result.alerts.length},
        ${Date.now()}
      )
    `);
  } catch (error) {
    // 表可能不存在，静默失败
    log.error({ err: error }, "Failed to record health check");
  }
}

/**
 * 发送健康告警通知
 */
async function sendHealthAlertNotification(alerts: HealthAlert[]): Promise<void> {
  const alertMessages = alerts.map(a => `• [${a.severity.toUpperCase()}] ${a.message}`).join('\n');
  
  const title = `⚠️ 同步系统健康告警 (${alerts.length}个严重问题)`;
  const content = `
检测到以下严重问题需要立即处理：

${alertMessages}

检查时间: ${new Date().toLocaleString('zh-CN')}

请尽快登录系统查看详情并处理。
  `.trim();
  
  await notifyOwner({ title, content });
}

/**
 * 获取最近的健康检查历史
 */
export async function getHealthCheckHistory(limit: number = 24): Promise<HealthCheckResult[]> {
  try {
    const result = await (await requireDb()).execute(sql`
      SELECT * FROM sync_health_checks
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `);
    
    return ((result as any)[0] as any[]).map(row => ({
      timestamp: row.timestamp,
      overallStatus: row.overall_status as HealthStatus,
      regions: JSON.parse(row.regions_data),
      alerts: [],
    }));
  } catch (error) {
    return [];
  }
}

/**
 * 获取区域健康趋势
 */
export async function getRegionHealthTrend(
  region: RegionCode,
  hours: number = 24
): Promise<{ timestamp: number; status: HealthStatus; latency: number }[]> {
  try {
    const since = Date.now() - hours * 60 * 60 * 1000;
    
    const result = await (await requireDb()).execute(sql`
      SELECT timestamp, regions_data
      FROM sync_health_checks
      WHERE timestamp > ${since}
      ORDER BY timestamp ASC
    `);
    
    return ((result as any)[0] as any[]).map(row => {
      const regions = JSON.parse(row.regions_data) as RegionHealth[];
      const regionData = regions.find(r => r.region === region);
      return {
        timestamp: row.timestamp,
        status: regionData?.status || 'offline',
        latency: regionData?.latency || -1,
      };
    });
  } catch (error) {
    return [];
  }
}

/**
 * 健康检查定时任务配置
 */
export const HEALTH_CHECK_SCHEDULE = {
  // 每5分钟执行一次健康检查
  cronExpression: '0 */5 * * * *',
  // 任务名称
  taskName: 'sync-health-check',
  // 任务描述
  description: '定期检查CN/US/DE区域节点连接状态和同步健康度',
};

/**
 * 启动健康检查定时任务
 */
export function startHealthCheckScheduler(): void {
  // 这里实际应该使用node-cron或类似库
  // 为了演示，我们只是导出配置
  log.info({ cron: HEALTH_CHECK_SCHEDULE.cronExpression }, "Scheduler configured");
}

/**
 * 手动触发健康检查
 */
export async function triggerManualHealthCheck(): Promise<HealthCheckResult> {
  log.info({}, "Manual health check triggered");
  return performHealthCheck();
}
