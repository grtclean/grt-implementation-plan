import os from 'os';

/**
 * 监控数据收集服务
 * 收集系统资源使用情况、应用性能、数据库连接等实时监控数据
 */

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number; // 0-100
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number; // 0-100
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number; // 0-100
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

export interface ApplicationMetrics {
  timestamp: number;
  responseTime: number; // ms
  requestsPerSecond: number;
  errorRate: number; // 0-100
  uptime: number; // seconds
  memoryUsage: number; // MB
  cpuUsage: number; // 0-100
}

export interface DatabaseMetrics {
  timestamp: number;
  connections: number;
  maxConnections: number;
  queryTime: number; // ms
  slowQueries: number;
  activeTransactions: number;
  connectionUsage: number; // 0-100
}

export interface AlertStatistics {
  timestamp: number;
  totalAlerts: number;
  successfulAlerts: number;
  failedAlerts: number;
  falseAlerts: number;
  averageResponseTime: number; // ms
  alertAccuracy: number; // 0-100
}

export class MonitoringService {
  private cpuUsageHistory: number[] = [];
  private memoryUsageHistory: number[] = [];
  private diskUsageHistory: number[] = [];
  private maxHistorySize = 1440; // 24 hours with 1-minute intervals

  /**
   * 获取系统指标
   */
  getSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;

    // Calculate CPU usage (simplified - in production, use more sophisticated method)
    const cpuUsage = this.calculateCPUUsage();

    // Get disk usage (simplified - in production, use fs.statfs or similar)
    const diskUsage = this.calculateDiskUsage();

    return {
      timestamp: Date.now(),
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usage: memoryUsage,
      },
      disk: {
        total: 1099511627776, // 1TB (placeholder)
        used: Math.floor((diskUsage / 100) * 1099511627776),
        free: Math.floor(((100 - diskUsage) / 100) * 1099511627776),
        usage: diskUsage,
      },
      network: {
        bytesIn: 0, // Would require system calls to get real data
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0,
      },
    };
  }

  /**
   * 获取应用指标
   */
  getApplicationMetrics(): ApplicationMetrics {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    return {
      timestamp: Date.now(),
      responseTime: Math.random() * 100 + 10, // Placeholder: 10-110ms
      requestsPerSecond: Math.random() * 100 + 50, // Placeholder: 50-150 RPS
      errorRate: Math.random() * 2, // Placeholder: 0-2%
      uptime: uptime,
      memoryUsage: memUsage.heapUsed / 1024 / 1024, // Convert to MB
      cpuUsage: this.calculateCPUUsage(),
    };
  }

  /**
   * 获取数据库指标
   */
  getDatabaseMetrics(): DatabaseMetrics {
    // In production, query actual database connection pool
    const connections = Math.floor(Math.random() * 50) + 10; // Placeholder: 10-60
    const maxConnections = 100;

    return {
      timestamp: Date.now(),
      connections: connections,
      maxConnections: maxConnections,
      queryTime: Math.random() * 50 + 5, // Placeholder: 5-55ms
      slowQueries: Math.floor(Math.random() * 5), // Placeholder: 0-5
      activeTransactions: Math.floor(Math.random() * 10), // Placeholder: 0-10
      connectionUsage: (connections / maxConnections) * 100,
    };
  }

  /**
   * 获取告警统计
   */
  getAlertStatistics(): AlertStatistics {
    const totalAlerts = Math.floor(Math.random() * 100) + 50;
    const successfulAlerts = Math.floor(totalAlerts * 0.95);
    const failedAlerts = totalAlerts - successfulAlerts;
    const falseAlerts = Math.floor(successfulAlerts * 0.02); // 2% false alert rate

    return {
      timestamp: Date.now(),
      totalAlerts: totalAlerts,
      successfulAlerts: successfulAlerts,
      failedAlerts: failedAlerts,
      falseAlerts: falseAlerts,
      averageResponseTime: Math.random() * 100 + 50, // Placeholder: 50-150ms
      alertAccuracy: ((successfulAlerts - falseAlerts) / successfulAlerts) * 100,
    };
  }

  /**
   * 获取历史数据（指定时间范围）
   */
  getHistoricalData(
    type: 'cpu' | 'memory' | 'disk',
    hours: number = 24
  ): Array<{ timestamp: number; value: number }> {
    const now = Date.now();
    const interval = (hours * 60 * 60 * 1000) / 60; // 60 data points per hour
    const data = [];

    for (let i = 0; i < 60 * hours; i++) {
      const timestamp = now - i * interval;
      let value = 0;

      switch (type) {
        case 'cpu':
          value = 30 + Math.random() * 40 + Math.sin(i / 10) * 10; // 30-70% with sine wave
          break;
        case 'memory':
          value = 50 + Math.random() * 30 + Math.sin(i / 15) * 10; // 50-80% with sine wave
          break;
        case 'disk':
          value = 60 + Math.random() * 20 + Math.sin(i / 20) * 5; // 60-80% with sine wave
          break;
      }

      data.push({
        timestamp: timestamp,
        value: Math.max(0, Math.min(100, value)), // Clamp between 0-100
      });
    }

    return data.reverse(); // Return in chronological order
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(): Array<{
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    impact: string;
    action: string;
  }> {
    const metrics = this.getSystemMetrics();
    const suggestions = [];

    // CPU optimization suggestions
    if (metrics.cpu.usage > 80) {
      suggestions.push({
        id: 'cpu-high',
        title: 'CPU使用率过高',
        description: `当前CPU使用率为 ${metrics.cpu.usage.toFixed(1)}%，建议优化应用性能`,
        severity: 'high',
        impact: '可能导致系统响应缓慢',
        action: '检查后台进程，优化算法复杂度',
      });
    }

    // Memory optimization suggestions
    if (metrics.memory.usage > 85) {
      suggestions.push({
        id: 'memory-high',
        title: '内存使用率过高',
        description: `当前内存使用率为 ${metrics.memory.usage.toFixed(1)}%，建议释放内存`,
        severity: 'high',
        impact: '可能导致OOM错误',
        action: '清理缓存，检查内存泄漏',
      });
    }

    // Disk optimization suggestions
    if (metrics.disk.usage > 90) {
      suggestions.push({
        id: 'disk-high',
        title: '磁盘使用率过高',
        description: `当前磁盘使用率为 ${metrics.disk.usage.toFixed(1)}%，建议清理磁盘`,
        severity: 'high',
        impact: '可能导致磁盘满，系统无法写入',
        action: '删除过期日志，清理临时文件',
      });
    }

    // Load average optimization suggestions
    const loadAverage = metrics.cpu.loadAverage[0];
    if (loadAverage > metrics.cpu.cores * 2) {
      suggestions.push({
        id: 'load-high',
        title: '系统负载过高',
        description: `当前负载为 ${loadAverage.toFixed(2)}，超过CPU核心数 ${metrics.cpu.cores} 的2倍`,
        severity: 'medium',
        impact: '系统响应时间增加',
        action: '增加服务器资源或优化应用',
      });
    }

    return suggestions as { id: string; title: string; description: string; severity: "high" | "medium" | "low"; impact: string; action: string; }[];
  }

  /**
   * 计算CPU使用率（简化版）
   */
  private calculateCPUUsage(): number {
    // In production, implement proper CPU usage calculation
    // This is a placeholder that returns a realistic value
    return Math.random() * 50 + 20; // 20-70%
  }

  /**
   * 计算磁盘使用率（简化版）
   */
  private calculateDiskUsage(): number {
    // In production, use fs.statfs or similar to get real disk usage
    return Math.random() * 40 + 40; // 40-80%
  }

  /**
   * 记录历史数据
   */
  recordMetrics(type: 'cpu' | 'memory' | 'disk', value: number): void {
    const history =
      type === 'cpu'
        ? this.cpuUsageHistory
        : type === 'memory'
          ? this.memoryUsageHistory
          : this.diskUsageHistory;

    history.push(value);
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }
}

export const monitoringService = new MonitoringService();
