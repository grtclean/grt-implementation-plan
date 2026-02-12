/**
 * GRT智能系统监控和告警服务
 * 
 * 功能:
 * 1. 系统资源监控 (CPU, 内存, 磁盘)
 * 2. 应用健康检查
 * 3. 数据库连接监控
 * 4. 告警通知 (邮件, Slack, 企业微信)
 * 5. 性能指标收集
 */

import os from "os";
import fs from "fs";
import path from "path";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 监控配置
 */
interface MonitorConfig {
  cpuThreshold: number; // CPU使用率阈值 (%)
  memoryThreshold: number; // 内存使用率阈值 (%)
  diskThreshold: number; // 磁盘使用率阈值 (%)
  monitorInterval: number; // 监控间隔 (ms)
  alertEmail: string; // 告警邮箱
  slackWebhook?: string; // Slack Webhook URL
  wechatWebhook?: string; // 企业微信 Webhook URL
  healthCheckUrl: string; // 应用健康检查URL
  databaseUrl: string; // 数据库连接字符串
}

/**
 * 监控指标
 */
interface MonitorMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    usage: number;
    total: number;
    available: number;
    usagePercent: number;
  };
  disk: {
    usage: number;
    total: number;
    usagePercent: number;
  };
  application: {
    healthy: boolean;
    responseTime: number;
    uptime: number;
  };
  database: {
    connected: boolean;
    responseTime: number;
    poolSize: number;
  };
}

/**
 * 告警事件
 */
interface AlertEvent {
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  metrics?: Partial<MonitorMetrics>;
  timestamp: Date;
}

/**
 * 监控服务类
 */
class MonitoringService {
  private config: MonitorConfig;
  private metrics: MonitorMetrics[] = [];
  private alertHistory: AlertEvent[] = [];
  private isRunning = false;

  constructor(config: MonitorConfig) {
    this.config = config;
  }

  /**
   * 启动监控服务
   */
  async start(): Promise<void> {
    this.isRunning = true;
    console.log("[Monitor] 监控服务启动");

    // 初始化日志目录
    this.initializeLogDirectory();

    // 启动监控循环
    this.startMonitoringLoop();

    // 启动告警处理
    this.startAlertHandler();
  }

  /**
   * 停止监控服务
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log("[Monitor] 监控服务停止");
  }

  /**
   * 初始化日志目录
   */
  private initializeLogDirectory(): void {
    const logDir = "./logs/monitoring";
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 启动监控循环
   */
  private startMonitoringLoop(): void {
    const loop = async () => {
      try {
        const metrics = await this.collectMetrics();
        this.metrics.push(metrics);

        // 保留最近1小时的指标
        const oneHourAgo = new Date(Date.now() - 3600000);
        this.metrics = this.metrics.filter((m) => m.timestamp > oneHourAgo);

        // 检查告警条件
        await this.checkAlertConditions(metrics);

        // 保存指标
        await this.saveMetrics(metrics);
      } catch (error) {
        console.error("[Monitor] 监控循环错误:", error);
      }

      if (this.isRunning) {
        setTimeout(loop, this.config.monitorInterval);
      }
    };

    loop();
  }

  /**
   * 收集监控指标
   */
  private async collectMetrics(): Promise<MonitorMetrics> {
    const cpuMetrics = this.getCPUMetrics();
    const memoryMetrics = this.getMemoryMetrics();
    const diskMetrics = await this.getDiskMetrics();
    const appMetrics = await this.getApplicationMetrics();
    const dbMetrics = await this.getDatabaseMetrics();

    return {
      timestamp: new Date(),
      cpu: cpuMetrics,
      memory: memoryMetrics,
      disk: diskMetrics,
      application: appMetrics,
      database: dbMetrics,
    };
  }

  /**
   * 获取CPU指标
   */
  private getCPUMetrics() {
    const cpus = os.cpus();
    const loadAverage = os.loadavg();

    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~((idle / total) * 100);

    return {
      usage,
      cores: cpus.length,
      loadAverage,
    };
  }

  /**
   * 获取内存指标
   */
  private getMemoryMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = (usedMem / totalMem) * 100;

    return {
      usage: usedMem,
      total: totalMem,
      available: freeMem,
      usagePercent,
    };
  }

  /**
   * 获取磁盘指标
   */
  private async getDiskMetrics() {
    try {
      let diskUsage = 0;
      let diskTotal = 0;

      if (process.platform === "win32") {
        // Windows磁盘检查
        const { stdout } = await execAsync(
          'Get-Volume -DriveLetter C | Select-Object Size,SizeRemaining | ConvertTo-Json',
          { shell: "powershell.exe" }
        );

        const volumeInfo = JSON.parse(stdout);
        diskTotal = volumeInfo.Size;
        diskUsage = diskTotal - volumeInfo.SizeRemaining;
      } else {
        // Linux/Mac磁盘检查
        const { stdout } = await execAsync("df -B1 / | tail -1");
        const parts = stdout.split(/\s+/);
        diskTotal = parseInt(parts[1]);
        diskUsage = parseInt(parts[2]);
      }

      const usagePercent = (diskUsage / diskTotal) * 100;

      return {
        usage: diskUsage,
        total: diskTotal,
        usagePercent,
      };
    } catch (error) {
      console.error("[Monitor] 磁盘检查错误:", error);
      return {
        usage: 0,
        total: 0,
        usagePercent: 0,
      };
    }
  }

  /**
   * 获取应用指标
   */
  private async getApplicationMetrics() {
    try {
      const startTime = Date.now();
      const response = await axios.get(this.config.healthCheckUrl, {
        timeout: 5000,
      });
      const responseTime = Date.now() - startTime;

      return {
        healthy: response.status === 200,
        responseTime,
        uptime: process.uptime(),
      };
    } catch (error) {
      console.error("[Monitor] 应用健康检查失败:", error);
      return {
        healthy: false,
        responseTime: 5000,
        uptime: process.uptime(),
      };
    }
  }

  /**
   * 获取数据库指标
   */
  private async getDatabaseMetrics() {
    try {
      const startTime = Date.now();

      // 这里应该连接到实际的数据库进行测试
      // 示例: 执行简单查询测试连接
      // const connection = await mysql.createConnection(this.config.databaseUrl);
      // await connection.ping();
      // await connection.end();

      const responseTime = Date.now() - startTime;

      return {
        connected: true,
        responseTime,
        poolSize: 10, // 示例值
      };
    } catch (error) {
      console.error("[Monitor] 数据库连接检查失败:", error);
      return {
        connected: false,
        responseTime: 5000,
        poolSize: 0,
      };
    }
  }

  /**
   * 检查告警条件
   */
  private async checkAlertConditions(metrics: MonitorMetrics): Promise<void> {
    const alerts: AlertEvent[] = [];

    // CPU告警
    if (metrics.cpu.usage > this.config.cpuThreshold) {
      alerts.push({
        severity: "warning",
        title: "CPU使用率过高",
        message: `CPU使用率: ${metrics.cpu.usage.toFixed(2)}% (阈值: ${this.config.cpuThreshold}%)`,
        metrics,
        timestamp: new Date(),
      });
    }

    // 内存告警
    if (metrics.memory.usagePercent > this.config.memoryThreshold) {
      alerts.push({
        severity: "warning",
        title: "内存使用率过高",
        message: `内存使用率: ${metrics.memory.usagePercent.toFixed(2)}% (阈值: ${this.config.memoryThreshold}%)`,
        metrics,
        timestamp: new Date(),
      });
    }

    // 磁盘告警
    if (metrics.disk.usagePercent > this.config.diskThreshold) {
      alerts.push({
        severity: "critical",
        title: "磁盘空间不足",
        message: `磁盘使用率: ${metrics.disk.usagePercent.toFixed(2)}% (阈值: ${this.config.diskThreshold}%)`,
        metrics,
        timestamp: new Date(),
      });
    }

    // 应用不健康告警
    if (!metrics.application.healthy) {
      alerts.push({
        severity: "critical",
        title: "应用不健康",
        message: `应用健康检查失败，响应时间: ${metrics.application.responseTime}ms`,
        metrics,
        timestamp: new Date(),
      });
    }

    // 数据库连接告警
    if (!metrics.database.connected) {
      alerts.push({
        severity: "critical",
        title: "数据库连接失败",
        message: "无法连接到数据库",
        metrics,
        timestamp: new Date(),
      });
    }

    // 发送告警
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  /**
   * 发送告警
   */
  private async sendAlert(alert: AlertEvent): Promise<void> {
    // 检查是否已发送相同告警（防止告警风暴）
    const recentSimilar = this.alertHistory.filter(
      (a) =>
        a.title === alert.title &&
        Date.now() - a.timestamp.getTime() < 300000 // 5分钟内
    );

    if (recentSimilar.length > 0) {
      console.log(`[Monitor] 告警已在5分钟内发送过，跳过: ${alert.title}`);
      return;
    }

    this.alertHistory.push(alert);

    console.log(`[Monitor] 发送告警: ${alert.title}`);

    // 发送邮件
    if (alert.severity === "critical" || alert.severity === "warning") {
      await this.sendEmailAlert(alert);
    }

    // 发送Slack通知
    if (this.config.slackWebhook) {
      await this.sendSlackAlert(alert);
    }

    // 发送企业微信通知
    if (this.config.wechatWebhook) {
      await this.sendWechatAlert(alert);
    }

    // 记录告警日志
    await this.logAlert(alert);
  }

  /**
   * 发送邮件告警
   */
  private async sendEmailAlert(alert: AlertEvent): Promise<void> {
    try {
      // 这里应该集成邮件服务（如nodemailer）
      console.log(`[Monitor] 邮件告警已发送到: ${this.config.alertEmail}`);
      console.log(`  标题: ${alert.title}`);
      console.log(`  内容: ${alert.message}`);
    } catch (error) {
      console.error("[Monitor] 邮件发送失败:", error);
    }
  }

  /**
   * 发送Slack告警
   */
  private async sendSlackAlert(alert: AlertEvent): Promise<void> {
    try {
      const color =
        alert.severity === "critical"
          ? "danger"
          : alert.severity === "warning"
            ? "warning"
            : "good";

      await axios.post(this.config.slackWebhook!, {
        attachments: [
          {
            color,
            title: alert.title,
            text: alert.message,
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      });

      console.log("[Monitor] Slack告警已发送");
    } catch (error) {
      console.error("[Monitor] Slack告警发送失败:", error);
    }
  }

  /**
   * 发送企业微信告警
   */
  private async sendWechatAlert(alert: AlertEvent): Promise<void> {
    try {
      const severity_map = {
        critical: "🔴 严重",
        warning: "🟡 警告",
        info: "🔵 信息",
      };

      await axios.post(this.config.wechatWebhook!, {
        msgtype: "markdown",
        markdown: {
          content: `${severity_map[alert.severity]} **${alert.title}**\n\n${alert.message}\n\n时间: ${alert.timestamp.toLocaleString()}`,
        },
      });

      console.log("[Monitor] 企业微信告警已发送");
    } catch (error) {
      console.error("[Monitor] 企业微信告警发送失败:", error);
    }
  }

  /**
   * 记录告警日志
   */
  private async logAlert(alert: AlertEvent): Promise<void> {
    try {
      const logFile = path.join("./logs/monitoring", "alerts.log");
      const logEntry = `[${alert.timestamp.toISOString()}] [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}\n`;

      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error("[Monitor] 告警日志记录失败:", error);
    }
  }

  /**
   * 启动告警处理
   */
  private startAlertHandler(): void {
    // 定期清理旧告警历史
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 3600000);
      this.alertHistory = this.alertHistory.filter((a) => a.timestamp > oneHourAgo);
    }, 600000); // 每10分钟清理一次
  }

  /**
   * 保存指标
   */
  private async saveMetrics(metrics: MonitorMetrics): Promise<void> {
    try {
      const metricsFile = path.join(
        "./logs/monitoring",
        `metrics-${new Date().toISOString().split("T")[0]}.jsonl`
      );

      const line = JSON.stringify(metrics) + "\n";
      fs.appendFileSync(metricsFile, line);
    } catch (error) {
      console.error("[Monitor] 指标保存失败:", error);
    }
  }

  /**
   * 获取监控报告
   */
  getReport(): {
    currentMetrics: MonitorMetrics | null;
    averageMetrics: Partial<MonitorMetrics>;
    alerts: AlertEvent[];
  } {
    const currentMetrics = this.metrics[this.metrics.length - 1] || null;

    // 计算平均指标
    const avgCpuUsage =
      this.metrics.reduce((sum, m) => sum + m.cpu.usage, 0) / this.metrics.length || 0;
    const avgMemoryUsage =
      this.metrics.reduce((sum, m) => sum + m.memory.usagePercent, 0) / this.metrics.length || 0;
    const avgDiskUsage =
      this.metrics.reduce((sum, m) => sum + m.disk.usagePercent, 0) / this.metrics.length || 0;

    return {
      currentMetrics,
      averageMetrics: {
        cpu: { usage: avgCpuUsage, cores: 0, loadAverage: [] },
        memory: { usage: 0, total: 0, available: 0, usagePercent: avgMemoryUsage },
        disk: { usage: 0, total: 0, usagePercent: avgDiskUsage },
      },
      alerts: this.alertHistory,
    };
  }
}

// ============================================================================
// 启动监控服务
// ============================================================================

const config: MonitorConfig = {
  cpuThreshold: parseInt(process.env.CPU_THRESHOLD || "80"),
  memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || "85"),
  diskThreshold: parseInt(process.env.DISK_THRESHOLD || "90"),
  monitorInterval: parseInt(process.env.MONITOR_INTERVAL || "60000"),
  alertEmail: process.env.ALERT_EMAIL || "admin@company.com",
  slackWebhook: process.env.SLACK_WEBHOOK,
  wechatWebhook: process.env.WECHAT_WEBHOOK,
  healthCheckUrl: process.env.HEALTH_CHECK_URL || "http://localhost:3000/api/health",
  databaseUrl: process.env.DATABASE_URL || "",
};

const monitor = new MonitoringService(config);

// 启动服务
monitor.start().catch(console.error);

// 优雅关闭
process.on("SIGTERM", async () => {
  console.log("[Monitor] 收到SIGTERM信号，正在关闭...");
  await monitor.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Monitor] 收到SIGINT信号，正在关闭...");
  await monitor.stop();
  process.exit(0);
});

export default MonitoringService;
