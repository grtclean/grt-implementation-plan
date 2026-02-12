/**
 * GRT智能系统 - 系统健康检查与迁移评估插件
 * 版本: v2.6.2
 * 
 * 功能：
 * - 自动检测：数据库大小、附件数量、API延迟
 * - 一键镜像：负载超70%时生成配置JSON导出包
 * - 迁移评估：评估本地到云端迁移的可行性
 */

// 健康检查类型
export const HEALTH_CHECK_TYPES = [
  'database',
  'storage',
  'api_latency',
  'memory',
  'cpu',
  'disk',
  'network'
] as const;
export type HealthCheckType = typeof HEALTH_CHECK_TYPES[number];

// 健康状态
export const HEALTH_LEVELS = ['healthy', 'warning', 'critical', 'unknown'] as const;
export type HealthLevel = typeof HEALTH_LEVELS[number];

// 健康检查结果
export interface HealthCheckResult {
  type: HealthCheckType;
  level: HealthLevel;
  value: number;
  unit: string;
  threshold: {
    warning: number;
    critical: number;
  };
  message: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

// 系统健康报告
export interface SystemHealthReport {
  reportId: string;
  organizationId: string;
  timestamp: Date;
  overallHealth: HealthLevel;
  checks: HealthCheckResult[];
  recommendations: string[];
  migrationReadiness: MigrationReadiness;
}

// 迁移就绪度
export interface MigrationReadiness {
  score: number;  // 0-100
  level: 'ready' | 'needs_preparation' | 'not_ready';
  blockers: string[];
  warnings: string[];
  estimatedMigrationTime: string;
  estimatedDowntime: string;
}

// 数据库统计
export interface DatabaseStats {
  totalSizeMb: number;
  tableCount: number;
  rowCount: number;
  indexSizeMb: number;
  largestTables: Array<{
    name: string;
    sizeMb: number;
    rowCount: number;
  }>;
}

// 存储统计
export interface StorageStats {
  totalSizeGb: number;
  fileCount: number;
  largestFiles: Array<{
    key: string;
    sizeMb: number;
    lastModified: Date;
  }>;
  fileTypeDistribution: Record<string, { count: number; sizeMb: number }>;
}

// API延迟统计
export interface ApiLatencyStats {
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  requestsPerSecond: number;
}

// 系统负载
export interface SystemLoad {
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  networkBandwidthMbps: number;
  activeConnections: number;
}

// 健康检查阈值配置
export interface HealthThresholds {
  database: {
    sizeWarningGb: number;
    sizeCriticalGb: number;
  };
  storage: {
    usageWarningPercent: number;
    usageCriticalPercent: number;
  };
  apiLatency: {
    warningMs: number;
    criticalMs: number;
  };
  cpu: {
    warningPercent: number;
    criticalPercent: number;
  };
  memory: {
    warningPercent: number;
    criticalPercent: number;
  };
  disk: {
    warningPercent: number;
    criticalPercent: number;
  };
}

// 默认阈值
export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  database: {
    sizeWarningGb: 50,
    sizeCriticalGb: 100
  },
  storage: {
    usageWarningPercent: 70,
    usageCriticalPercent: 90
  },
  apiLatency: {
    warningMs: 500,
    criticalMs: 2000
  },
  cpu: {
    warningPercent: 70,
    criticalPercent: 90
  },
  memory: {
    warningPercent: 70,
    criticalPercent: 90
  },
  disk: {
    warningPercent: 70,
    criticalPercent: 90
  }
};

/**
 * 评估健康级别
 */
export function evaluateHealthLevel(
  value: number,
  warningThreshold: number,
  criticalThreshold: number
): HealthLevel {
  if (value >= criticalThreshold) {
    return 'critical';
  }
  if (value >= warningThreshold) {
    return 'warning';
  }
  return 'healthy';
}

/**
 * 计算整体健康状态
 */
export function calculateOverallHealth(checks: HealthCheckResult[]): HealthLevel {
  if (checks.some(c => c.level === 'critical')) {
    return 'critical';
  }
  if (checks.some(c => c.level === 'warning')) {
    return 'warning';
  }
  if (checks.some(c => c.level === 'unknown')) {
    return 'unknown';
  }
  return 'healthy';
}

/**
 * 生成健康检查建议
 */
export function generateRecommendations(checks: HealthCheckResult[]): string[] {
  const recommendations: string[] = [];
  
  for (const check of checks) {
    if (check.level === 'critical' || check.level === 'warning') {
      switch (check.type) {
        case 'database':
          recommendations.push('建议进行数据库优化：清理历史数据、优化索引、考虑分表策略');
          break;
        case 'storage':
          recommendations.push('建议清理存储空间：删除过期文件、压缩大文件、迁移冷数据');
          break;
        case 'api_latency':
          recommendations.push('建议优化API性能：增加缓存、优化查询、考虑负载均衡');
          break;
        case 'cpu':
          recommendations.push('建议优化CPU使用：检查高CPU进程、优化算法、考虑扩容');
          break;
        case 'memory':
          recommendations.push('建议优化内存使用：检查内存泄漏、优化缓存策略、考虑扩容');
          break;
        case 'disk':
          recommendations.push('建议扩展磁盘空间：清理日志、归档旧数据、升级存储');
          break;
      }
    }
  }
  
  return Array.from(new Set(recommendations));  // 去重
}

/**
 * 评估迁移就绪度
 */
export function evaluateMigrationReadiness(
  healthReport: Omit<SystemHealthReport, 'migrationReadiness'>,
  databaseStats: DatabaseStats,
  storageStats: StorageStats
): MigrationReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let score = 100;
  
  // 检查健康状态
  if (healthReport.overallHealth === 'critical') {
    blockers.push('系统存在严重健康问题，需要先解决后再进行迁移');
    score -= 50;
  } else if (healthReport.overallHealth === 'warning') {
    warnings.push('系统存在警告级别问题，建议先优化后再迁移');
    score -= 20;
  }
  
  // 检查数据库大小
  if (databaseStats.totalSizeMb > 100 * 1024) {  // > 100GB
    blockers.push('数据库超过100GB，需要制定分批迁移计划');
    score -= 30;
  } else if (databaseStats.totalSizeMb > 50 * 1024) {  // > 50GB
    warnings.push('数据库较大（>50GB），迁移可能需要较长时间');
    score -= 10;
  }
  
  // 检查存储大小
  if (storageStats.totalSizeGb > 500) {  // > 500GB
    blockers.push('存储超过500GB，需要制定增量同步策略');
    score -= 30;
  } else if (storageStats.totalSizeGb > 100) {  // > 100GB
    warnings.push('存储较大（>100GB），建议使用增量同步');
    score -= 10;
  }
  
  // 检查文件数量
  if (storageStats.fileCount > 1000000) {  // > 100万
    warnings.push('文件数量超过100万，迁移需要较长时间');
    score -= 10;
  }
  
  // 确定就绪级别
  let level: MigrationReadiness['level'];
  if (blockers.length > 0 || score < 50) {
    level = 'not_ready';
  } else if (warnings.length > 0 || score < 80) {
    level = 'needs_preparation';
  } else {
    level = 'ready';
  }
  
  // 估算迁移时间
  const dbMigrationHours = Math.ceil(databaseStats.totalSizeMb / 1024 / 10);  // 假设10GB/小时
  const storageMigrationHours = Math.ceil(storageStats.totalSizeGb / 50);  // 假设50GB/小时
  const totalHours = Math.max(dbMigrationHours, storageMigrationHours);
  
  return {
    score: Math.max(0, score),
    level,
    blockers,
    warnings,
    estimatedMigrationTime: `${totalHours}小时`,
    estimatedDowntime: level === 'ready' ? '< 30分钟' : `${Math.ceil(totalHours / 4)}小时`
  };
}

/**
 * 导出配置接口
 */
export interface ConfigExport {
  exportId: string;
  organizationId: string;
  timestamp: Date;
  version: string;
  config: {
    database: {
      schema: unknown;
      migrations: unknown[];
    };
    storage: {
      buckets: string[];
      policies: unknown[];
    };
    application: {
      settings: Record<string, unknown>;
      features: string[];
    };
    users: {
      roles: unknown[];
      permissions: unknown[];
    };
  };
  checksum: string;
}

/**
 * 生成配置导出包
 */
export function generateConfigExport(
  organizationId: string,
  config: ConfigExport['config']
): ConfigExport {
  const timestamp = new Date();
  const exportId = `export-${organizationId}-${timestamp.getTime().toString(36)}`;
  
  // 计算校验和（简化实现）
  const checksum = generateChecksum(JSON.stringify(config));
  
  return {
    exportId,
    organizationId,
    timestamp,
    version: '2.6.2',
    config,
    checksum
  };
}

/**
 * 生成校验和
 */
function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * 健康检查调度配置
 */
export interface HealthCheckSchedule {
  enabled: boolean;
  intervalMinutes: number;
  alertThreshold: HealthLevel;
  alertChannels: ('email' | 'webhook' | 'sms')[];
  retentionDays: number;
}

// 默认调度配置
export const DEFAULT_HEALTH_CHECK_SCHEDULE: HealthCheckSchedule = {
  enabled: true,
  intervalMinutes: 5,
  alertThreshold: 'warning',
  alertChannels: ['email', 'webhook'],
  retentionDays: 30
};

/**
 * 生成报告ID
 */
export function generateReportId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `health-${timestamp}-${random}`;
}

/**
 * 格式化大小显示
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  if (ms < 3600000) {
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}
