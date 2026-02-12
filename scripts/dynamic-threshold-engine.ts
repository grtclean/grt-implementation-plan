/**
 * 动态阈值引擎
 * 
 * 功能:
 * 1. 时间段动态阈值
 * 2. 周期性动态阈值
 * 3. 学习型动态阈值
 * 4. 虚假告警防护
 * 5. 告警升级策略
 */

/**
 * 时间段配置
 */
interface TimeBasedThreshold {
  id: string;
  name: string;
  timeRange: {
    start: string; // "HH:mm"
    end: string; // "HH:mm"
  };
  thresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
    responseTime: { warning: number; critical: number };
  };
  enabled: boolean;
}

/**
 * 周期性配置
 */
interface PeriodicThreshold {
  id: string;
  period: "weekday" | "weekend" | "month_start" | "month_mid" | "month_end";
  thresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
    responseTime: { warning: number; critical: number };
  };
  enabled: boolean;
}

/**
 * 学习型阈值配置
 */
interface LearningThresholdConfig {
  metric: string;
  baselinePercentile: number; // 95
  safetyMargin: number; // 10 (%)
  updateInterval: number; // 毫秒
  minDataPoints: number; // 最少数据点
  enabled: boolean;
}

/**
 * 动态阈值引擎
 */
class DynamicThresholdEngine {
  private timeBasedThresholds: Map<string, TimeBasedThreshold> = new Map();
  private periodicThresholds: Map<string, PeriodicThreshold> = new Map();
  private learningConfigs: Map<string, LearningThresholdConfig> = new Map();
  private metricsHistory: Map<string, number[]> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  private alertDeduplication: Map<string, number> = new Map();
  private consecutiveAlerts: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultThresholds();
  }

  /**
   * 初始化默认阈值
   */
  private initializeDefaultThresholds(): void {
    // 工作时间阈值
    this.addTimeBasedThreshold({
      id: "working_hours",
      name: "工作时间 (09:00-18:00)",
      timeRange: { start: "09:00", end: "18:00" },
      thresholds: {
        cpu: { warning: 75, critical: 85 },
        memory: { warning: 85, critical: 92 },
        disk: { warning: 85, critical: 92 },
        responseTime: { warning: 1000, critical: 3000 },
      },
      enabled: true,
    });

    // 非工作时间阈值
    this.addTimeBasedThreshold({
      id: "off_hours",
      name: "非工作时间 (18:00-09:00)",
      timeRange: { start: "18:00", end: "09:00" },
      thresholds: {
        cpu: { warning: 85, critical: 95 },
        memory: { warning: 90, critical: 95 },
        disk: { warning: 90, critical: 95 },
        responseTime: { warning: 2000, critical: 5000 },
      },
      enabled: true,
    });

    // 工作日阈值
    this.addPeriodicThreshold({
      id: "weekday",
      period: "weekday",
      thresholds: {
        cpu: { warning: 75, critical: 85 },
        memory: { warning: 85, critical: 92 },
        disk: { warning: 85, critical: 92 },
        responseTime: { warning: 1000, critical: 3000 },
      },
      enabled: true,
    });

    // 周末阈值
    this.addPeriodicThreshold({
      id: "weekend",
      period: "weekend",
      thresholds: {
        cpu: { warning: 85, critical: 95 },
        memory: { warning: 90, critical: 95 },
        disk: { warning: 90, critical: 95 },
        responseTime: { warning: 2000, critical: 5000 },
      },
      enabled: true,
    });

    // 月底高峰阈值
    this.addPeriodicThreshold({
      id: "month_end",
      period: "month_end",
      thresholds: {
        cpu: { warning: 70, critical: 80 },
        memory: { warning: 80, critical: 90 },
        disk: { warning: 80, critical: 90 },
        responseTime: { warning: 800, critical: 2000 },
      },
      enabled: true,
    });

    // 学习型阈值配置
    this.addLearningThresholdConfig({
      metric: "cpu",
      baselinePercentile: 95,
      safetyMargin: 10,
      updateInterval: 86400000, // 每天
      minDataPoints: 1440,
      enabled: true,
    });

    this.addLearningThresholdConfig({
      metric: "memory",
      baselinePercentile: 90,
      safetyMargin: 5,
      updateInterval: 86400000,
      minDataPoints: 1440,
      enabled: true,
    });
  }

  /**
   * 添加时间段阈值
   */
  addTimeBasedThreshold(threshold: TimeBasedThreshold): void {
    this.timeBasedThresholds.set(threshold.id, threshold);
  }

  /**
   * 添加周期性阈值
   */
  addPeriodicThreshold(threshold: PeriodicThreshold): void {
    this.periodicThresholds.set(threshold.id, threshold);
  }

  /**
   * 添加学习型阈值配置
   */
  addLearningThresholdConfig(config: LearningThresholdConfig): void {
    this.learningConfigs.set(config.metric, config);
  }

  /**
   * 获取当前阈值
   */
  getCurrentThreshold(metric: string): { warning: number; critical: number } {
    // 1. 检查学习型阈值
    const learningThreshold = this.getLearningThreshold(metric);
    if (learningThreshold) {
      return learningThreshold;
    }

    // 2. 检查时间段阈值
    const timeThreshold = this.getTimeBasedThreshold(metric);
    if (timeThreshold) {
      return timeThreshold;
    }

    // 3. 检查周期性阈值
    const periodicThreshold = this.getPeriodicThreshold(metric);
    if (periodicThreshold) {
      return periodicThreshold;
    }

    // 4. 返回默认值
    return this.getDefaultThreshold(metric);
  }

  /**
   * 获取学习型阈值
   */
  private getLearningThreshold(metric: string): { warning: number; critical: number } | null {
    const config = this.learningConfigs.get(metric);
    if (!config || !config.enabled) {
      return null;
    }

    const history = this.metricsHistory.get(metric) || [];
    if (history.length < config.minDataPoints) {
      return null;
    }

    // 检查是否需要更新
    const lastUpdate = this.lastUpdateTime.get(`learning_${metric}`) || 0;
    if (Date.now() - lastUpdate < config.updateInterval) {
      // 返回缓存的阈值
      const cached = this.lastUpdateTime.get(`threshold_${metric}`);
      if (cached) {
        return { warning: cached * 0.9, critical: cached };
      }
    }

    // 计算新的阈值
    const threshold = this.calculateDynamicThreshold(history, config);
    this.lastUpdateTime.set(`learning_${metric}`, Date.now());
    this.lastUpdateTime.set(`threshold_${metric}`, threshold);

    return {
      warning: Math.round(threshold * 0.9),
      critical: Math.round(threshold),
    };
  }

  /**
   * 计算动态阈值
   */
  private calculateDynamicThreshold(values: number[], config: LearningThresholdConfig): number {
    // 过滤异常值
    const filtered = this.filterOutliers(values);

    // 计算百分位数
    const sorted = filtered.sort((a, b) => a - b);
    const index = Math.ceil((config.baselinePercentile / 100) * sorted.length) - 1;
    const baseline = sorted[Math.max(0, index)];

    // 应用安全边际
    return baseline * (1 + config.safetyMargin / 100);
  }

  /**
   * 过滤异常值
   */
  private filterOutliers(values: number[], stdDevThreshold: number = 2): number[] {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2)) / values.length;
    const stdDev = Math.sqrt(variance);

    return values.filter((v) => Math.abs(v - mean) <= stdDevThreshold * stdDev);
  }

  /**
   * 获取时间段阈值
   */
  private getTimeBasedThreshold(metric: string): { warning: number; critical: number } | null {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    for (const threshold of this.timeBasedThresholds.values()) {
      if (!threshold.enabled) continue;

      if (this.isTimeInRange(currentTime, threshold.timeRange)) {
        const thresholds = threshold.thresholds as any;
        return thresholds[metric];
      }
    }

    return null;
  }

  /**
   * 检查时间是否在范围内
   */
  private isTimeInRange(
    currentTime: string,
    timeRange: { start: string; end: string }
  ): boolean {
    const [currentHour, currentMin] = currentTime.split(":").map(Number);
    const [startHour, startMin] = timeRange.start.split(":").map(Number);
    const [endHour, endMin] = timeRange.end.split(":").map(Number);

    const current = currentHour * 60 + currentMin;
    const start = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;

    if (start <= end) {
      return current >= start && current < end;
    } else {
      // 跨越午夜
      return current >= start || current < end;
    }
  }

  /**
   * 获取周期性阈值
   */
  private getPeriodicThreshold(metric: string): { warning: number; critical: number } | null {
    const period = this.getCurrentPeriod();

    for (const threshold of this.periodicThresholds.values()) {
      if (!threshold.enabled || threshold.period !== period) continue;

      const thresholds = threshold.thresholds as any;
      return thresholds[metric];
    }

    return null;
  }

  /**
   * 获取当前周期
   */
  private getCurrentPeriod(): PeriodicThreshold["period"] {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();

    // 检查周末
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "weekend";
    }

    // 检查月份阶段
    if (dayOfMonth <= 10) {
      return "month_start";
    } else if (dayOfMonth <= 20) {
      return "month_mid";
    } else {
      return "month_end";
    }
  }

  /**
   * 获取默认阈值
   */
  private getDefaultThreshold(metric: string): { warning: number; critical: number } {
    const defaults: Record<string, { warning: number; critical: number }> = {
      cpu: { warning: 75, critical: 85 },
      memory: { warning: 85, critical: 92 },
      disk: { warning: 85, critical: 92 },
      responseTime: { warning: 1000, critical: 3000 },
      dbResponseTime: { warning: 200, critical: 500 },
    };

    return defaults[metric] || { warning: 80, critical: 90 };
  }

  /**
   * 记录指标值
   */
  recordMetric(metric: string, value: number): void {
    if (!this.metricsHistory.has(metric)) {
      this.metricsHistory.set(metric, []);
    }

    const history = this.metricsHistory.get(metric)!;
    history.push(value);

    // 保留最近7天的数据 (10080个数据点，每分钟一个)
    if (history.length > 10080) {
      history.shift();
    }
  }

  /**
   * 检查是否应该发送告警
   */
  shouldSendAlert(
    alertId: string,
    severity: "warning" | "critical",
    deduplicationWindow: number = 300000 // 5分钟
  ): boolean {
    const lastAlertTime = this.alertDeduplication.get(alertId) || 0;
    const now = Date.now();

    if (now - lastAlertTime > deduplicationWindow) {
      this.alertDeduplication.set(alertId, now);
      return true;
    }

    return false;
  }

  /**
   * 检查是否应该升级告警
   */
  shouldEscalateAlert(alertId: string, escalationThreshold: number = 3): boolean {
    const count = (this.consecutiveAlerts.get(alertId) || 0) + 1;
    this.consecutiveAlerts.set(alertId, count);

    if (count >= escalationThreshold) {
      this.consecutiveAlerts.set(alertId, 0);
      return true;
    }

    return false;
  }

  /**
   * 重置告警计数
   */
  resetAlertCount(alertId: string): void {
    this.consecutiveAlerts.set(alertId, 0);
  }

  /**
   * 获取阈值统计报告
   */
  getThresholdReport(): string {
    const report: string[] = [];

    report.push("=== 动态阈值引擎报告 ===\n");

    // 时间段阈值
    report.push("时间段阈值:");
    for (const threshold of this.timeBasedThresholds.values()) {
      if (threshold.enabled) {
        report.push(`  ${threshold.name}`);
        report.push(`    CPU: ${threshold.thresholds.cpu.warning}% / ${threshold.thresholds.cpu.critical}%`);
        report.push(`    内存: ${threshold.thresholds.memory.warning}% / ${threshold.thresholds.memory.critical}%`);
      }
    }

    // 周期性阈值
    report.push("\n周期性阈值:");
    for (const threshold of this.periodicThresholds.values()) {
      if (threshold.enabled) {
        report.push(`  ${threshold.period}`);
        report.push(`    CPU: ${threshold.thresholds.cpu.warning}% / ${threshold.thresholds.cpu.critical}%`);
      }
    }

    // 学习型阈值
    report.push("\n学习型阈值:");
    for (const config of this.learningConfigs.values()) {
      if (config.enabled) {
        const history = this.metricsHistory.get(config.metric) || [];
        report.push(`  ${config.metric}: ${history.length}个数据点`);
      }
    }

    // 当前阈值
    report.push("\n当前阈值:");
    const metrics = ["cpu", "memory", "disk"];
    for (const metric of metrics) {
      const threshold = this.getCurrentThreshold(metric);
      report.push(`  ${metric}: ${threshold.warning} / ${threshold.critical}`);
    }

    return report.join("\n");
  }

  /**
   * 获取阈值历史
   */
  getThresholdHistory(metric: string, limit: number = 100): number[] {
    const history = this.metricsHistory.get(metric) || [];
    return history.slice(-limit);
  }
}

// ============================================================================
// 导出
// ============================================================================

export default DynamicThresholdEngine;
export { TimeBasedThreshold, PeriodicThreshold, LearningThresholdConfig };

// ============================================================================
// 使用示例
// ============================================================================

/*
const engine = new DynamicThresholdEngine();

// 记录指标
engine.recordMetric("cpu", 45);
engine.recordMetric("cpu", 50);
engine.recordMetric("memory", 65);

// 获取当前阈值
const cpuThreshold = engine.getCurrentThreshold("cpu");
console.log("CPU阈值:", cpuThreshold);

// 检查是否应该发送告警
if (engine.shouldSendAlert("cpu_warning")) {
  console.log("发送CPU警告告警");
}

// 生成报告
console.log(engine.getThresholdReport());
*/
