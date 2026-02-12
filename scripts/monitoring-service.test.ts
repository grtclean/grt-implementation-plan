/**
 * 监控告警系统单元测试
 * 
 * 测试覆盖:
 * 1. 指标收集
 * 2. 告警规则评估
 * 3. 告警去重
 * 4. 告警升级
 * 5. 通知发送
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * 模拟监控服务
 */
class MonitoringService {
  private metrics: any[] = [];
  private alerts: any[] = [];
  private alertDeduplication: Map<string, number> = new Map();
  private consecutiveAlerts: Map<string, number> = new Map();

  /**
   * 收集CPU指标
   */
  collectCPUMetrics(): { usage: number; cores: number; loadAverage: number[] } {
    return {
      usage: Math.random() * 100,
      cores: 8,
      loadAverage: [2.5, 2.3, 2.1],
    };
  }

  /**
   * 收集内存指标
   */
  collectMemoryMetrics(): { usage: number; total: number; usagePercent: number } {
    const total = 16 * 1024 * 1024 * 1024; // 16GB
    const usage = Math.random() * total;
    return {
      usage,
      total,
      usagePercent: (usage / total) * 100,
    };
  }

  /**
   * 收集磁盘指标
   */
  collectDiskMetrics(): { usage: number; total: number; usagePercent: number } {
    const total = 500 * 1024 * 1024 * 1024; // 500GB
    const usage = Math.random() * total;
    return {
      usage,
      total,
      usagePercent: (usage / total) * 100,
    };
  }

  /**
   * 检查告警条件
   */
  checkAlertCondition(metric: string, value: number, threshold: number, condition: string): boolean {
    switch (condition) {
      case ">":
        return value > threshold;
      case "<":
        return value < threshold;
      case ">=":
        return value >= threshold;
      case "<=":
        return value <= threshold;
      case "==":
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * 评估告警规则
   */
  evaluateAlertRules(
    rules: Array<{ id: string; metric: string; threshold: number; condition: string; severity: string }>
  ): Array<{ ruleId: string; triggered: boolean; severity: string }> {
    const results: Array<{ ruleId: string; triggered: boolean; severity: string }> = [];

    for (const rule of rules) {
      let value = 0;

      if (rule.metric === "cpu") {
        value = this.collectCPUMetrics().usage;
      } else if (rule.metric === "memory") {
        value = this.collectMemoryMetrics().usagePercent;
      } else if (rule.metric === "disk") {
        value = this.collectDiskMetrics().usagePercent;
      }

      const triggered = this.checkAlertCondition(rule.metric, value, rule.threshold, rule.condition);

      results.push({
        ruleId: rule.id,
        triggered,
        severity: rule.severity,
      });
    }

    return results;
  }

  /**
   * 检查是否应该发送告警（去重）
   */
  shouldSendAlert(alertId: string, deduplicationWindow: number = 300000): boolean {
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
   * 发送邮件告警
   */
  sendEmailAlert(email: string, subject: string, body: string): { sent: boolean; messageId: string } {
    return {
      sent: true,
      messageId: `msg_${Date.now()}`,
    };
  }

  /**
   * 发送Slack告警
   */
  sendSlackAlert(webhook: string, message: string): { sent: boolean; timestamp: string } {
    return {
      sent: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 发送企业微信告警
   */
  sendWechatAlert(webhook: string, message: string): { sent: boolean; errcode: number } {
    return {
      sent: true,
      errcode: 0,
    };
  }

  /**
   * 记录告警
   */
  logAlert(alert: any): { logged: boolean; alertId: string } {
    const alertId = `alert_${Date.now()}`;
    this.alerts.push({ ...alert, alertId });
    return { logged: true, alertId };
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit: number = 100): any[] {
    return this.alerts.slice(-limit);
  }

  /**
   * 获取告警统计
   */
  getAlertStatistics(): {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    infoAlerts: number;
  } {
    const stats = {
      totalAlerts: this.alerts.length,
      criticalAlerts: 0,
      warningAlerts: 0,
      infoAlerts: 0,
    };

    for (const alert of this.alerts) {
      if (alert.severity === "critical") stats.criticalAlerts++;
      else if (alert.severity === "warning") stats.warningAlerts++;
      else if (alert.severity === "info") stats.infoAlerts++;
    }

    return stats;
  }
}

// ============================================================================
// 单元测试
// ============================================================================

describe("MonitoringService", () => {
  let monitoring: MonitoringService;

  beforeEach(() => {
    monitoring = new MonitoringService();
  });

  describe("指标收集", () => {
    it("应该收集CPU指标", () => {
      const metrics = monitoring.collectCPUMetrics();

      expect(metrics).toHaveProperty("usage");
      expect(metrics).toHaveProperty("cores");
      expect(metrics).toHaveProperty("loadAverage");
      expect(metrics.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.usage).toBeLessThanOrEqual(100);
      expect(metrics.cores).toBe(8);
      expect(metrics.loadAverage).toHaveLength(3);
    });

    it("应该收集内存指标", () => {
      const metrics = monitoring.collectMemoryMetrics();

      expect(metrics).toHaveProperty("usage");
      expect(metrics).toHaveProperty("total");
      expect(metrics).toHaveProperty("usagePercent");
      expect(metrics.usagePercent).toBeGreaterThanOrEqual(0);
      expect(metrics.usagePercent).toBeLessThanOrEqual(100);
    });

    it("应该收集磁盘指标", () => {
      const metrics = monitoring.collectDiskMetrics();

      expect(metrics).toHaveProperty("usage");
      expect(metrics).toHaveProperty("total");
      expect(metrics).toHaveProperty("usagePercent");
      expect(metrics.usagePercent).toBeGreaterThanOrEqual(0);
      expect(metrics.usagePercent).toBeLessThanOrEqual(100);
    });
  });

  describe("告警条件检查", () => {
    it("应该正确检查 > 条件", () => {
      expect(monitoring.checkAlertCondition("cpu", 85, 80, ">")).toBe(true);
      expect(monitoring.checkAlertCondition("cpu", 75, 80, ">")).toBe(false);
    });

    it("应该正确检查 < 条件", () => {
      expect(monitoring.checkAlertCondition("cpu", 75, 80, "<")).toBe(true);
      expect(monitoring.checkAlertCondition("cpu", 85, 80, "<")).toBe(false);
    });

    it("应该正确检查 >= 条件", () => {
      expect(monitoring.checkAlertCondition("cpu", 80, 80, ">=")).toBe(true);
      expect(monitoring.checkAlertCondition("cpu", 75, 80, ">=")).toBe(false);
    });

    it("应该正确检查 <= 条件", () => {
      expect(monitoring.checkAlertCondition("cpu", 80, 80, "<=")).toBe(true);
      expect(monitoring.checkAlertCondition("cpu", 85, 80, "<=")).toBe(false);
    });

    it("应该正确检查 == 条件", () => {
      expect(monitoring.checkAlertCondition("cpu", 80, 80, "==")).toBe(true);
      expect(monitoring.checkAlertCondition("cpu", 85, 80, "==")).toBe(false);
    });
  });

  describe("告警规则评估", () => {
    it("应该评估CPU告警规则", () => {
      const rules = [
        { id: "cpu_warning", metric: "cpu", threshold: 75, condition: ">", severity: "warning" },
        { id: "cpu_critical", metric: "cpu", threshold: 85, condition: ">", severity: "critical" },
      ];

      const results = monitoring.evaluateAlertRules(rules);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty("ruleId");
      expect(results[0]).toHaveProperty("triggered");
      expect(results[0]).toHaveProperty("severity");
    });

    it("应该评估内存告警规则", () => {
      const rules = [
        { id: "memory_warning", metric: "memory", threshold: 85, condition: ">", severity: "warning" },
      ];

      const results = monitoring.evaluateAlertRules(rules);

      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe("memory_warning");
    });

    it("应该评估磁盘告警规则", () => {
      const rules = [
        { id: "disk_critical", metric: "disk", threshold: 90, condition: ">", severity: "critical" },
      ];

      const results = monitoring.evaluateAlertRules(rules);

      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe("disk_critical");
    });
  });

  describe("告警去重", () => {
    it("应该允许首次发送告警", () => {
      const result = monitoring.shouldSendAlert("cpu_warning");
      expect(result).toBe(true);
    });

    it("应该在去重窗口内拒绝重复告警", () => {
      monitoring.shouldSendAlert("cpu_warning");
      const result = monitoring.shouldSendAlert("cpu_warning", 300000); // 5分钟
      expect(result).toBe(false);
    });

    it("应该在去重窗口外允许重复告警", () => {
      monitoring.shouldSendAlert("cpu_warning");
      // 模拟时间流逝（实际测试中需要mock时间）
      const result = monitoring.shouldSendAlert("cpu_warning", 0); // 0毫秒窗口
      expect(result).toBe(true);
    });

    it("应该为不同的告警ID分别处理", () => {
      const result1 = monitoring.shouldSendAlert("cpu_warning");
      const result2 = monitoring.shouldSendAlert("memory_warning");

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe("告警升级", () => {
    it("应该在达到升级阈值时升级告警", () => {
      let escalated = false;

      for (let i = 0; i < 3; i++) {
        if (monitoring.shouldEscalateAlert("cpu_warning", 3)) {
          escalated = true;
          break;
        }
      }

      expect(escalated).toBe(true);
    });

    it("应该在升级后重置计数", () => {
      for (let i = 0; i < 3; i++) {
        monitoring.shouldEscalateAlert("cpu_warning", 3);
      }

      const result = monitoring.shouldEscalateAlert("cpu_warning", 3);
      expect(result).toBe(false);
    });

    it("应该支持手动重置告警计数", () => {
      monitoring.shouldEscalateAlert("cpu_warning", 3);
      monitoring.shouldEscalateAlert("cpu_warning", 3);
      monitoring.resetAlertCount("cpu_warning");

      const result = monitoring.shouldEscalateAlert("cpu_warning", 3);
      expect(result).toBe(false);
    });
  });

  describe("通知发送", () => {
    it("应该发送邮件告警", () => {
      const result = monitoring.sendEmailAlert(
        "admin@company.com",
        "CPU告警",
        "CPU使用率超过80%"
      );

      expect(result.sent).toBe(true);
      expect(result).toHaveProperty("messageId");
    });

    it("应该发送Slack告警", () => {
      const result = monitoring.sendSlackAlert(
        "https://hooks.slack.com/services/...",
        "CPU使用率超过80%"
      );

      expect(result.sent).toBe(true);
      expect(result).toHaveProperty("timestamp");
    });

    it("应该发送企业微信告警", () => {
      const result = monitoring.sendWechatAlert(
        "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...",
        "CPU使用率超过80%"
      );

      expect(result.sent).toBe(true);
      expect(result.errcode).toBe(0);
    });
  });

  describe("告警记录", () => {
    it("应该记录告警", () => {
      const alert = {
        severity: "warning",
        title: "CPU告警",
        message: "CPU使用率超过80%",
      };

      const result = monitoring.logAlert(alert);

      expect(result.logged).toBe(true);
      expect(result).toHaveProperty("alertId");
    });

    it("应该获取告警历史", () => {
      for (let i = 0; i < 5; i++) {
        monitoring.logAlert({
          severity: "warning",
          title: `告警 ${i}`,
          message: `消息 ${i}`,
        });
      }

      const history = monitoring.getAlertHistory();

      expect(history).toHaveLength(5);
    });

    it("应该限制告警历史数量", () => {
      for (let i = 0; i < 150; i++) {
        monitoring.logAlert({
          severity: "warning",
          title: `告警 ${i}`,
          message: `消息 ${i}`,
        });
      }

      const history = monitoring.getAlertHistory(100);

      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe("告警统计", () => {
    it("应该统计告警数量", () => {
      monitoring.logAlert({ severity: "critical", title: "严重告警", message: "内容" });
      monitoring.logAlert({ severity: "warning", title: "警告告警", message: "内容" });
      monitoring.logAlert({ severity: "info", title: "信息告警", message: "内容" });

      const stats = monitoring.getAlertStatistics();

      expect(stats.totalAlerts).toBe(3);
      expect(stats.criticalAlerts).toBe(1);
      expect(stats.warningAlerts).toBe(1);
      expect(stats.infoAlerts).toBe(1);
    });

    it("应该正确计算严重告警数量", () => {
      for (let i = 0; i < 5; i++) {
        monitoring.logAlert({ severity: "critical", title: "严重告警", message: "内容" });
      }

      const stats = monitoring.getAlertStatistics();

      expect(stats.criticalAlerts).toBe(5);
      expect(stats.totalAlerts).toBe(5);
    });

    it("应该返回空统计", () => {
      const stats = monitoring.getAlertStatistics();

      expect(stats.totalAlerts).toBe(0);
      expect(stats.criticalAlerts).toBe(0);
      expect(stats.warningAlerts).toBe(0);
      expect(stats.infoAlerts).toBe(0);
    });
  });

  describe("集成测试", () => {
    it("应该完整处理告警流程", () => {
      // 1. 收集指标
      const cpuMetrics = monitoring.collectCPUMetrics();
      expect(cpuMetrics.usage).toBeDefined();

      // 2. 评估规则
      const rules = [
        { id: "cpu_warning", metric: "cpu", threshold: 75, condition: ">", severity: "warning" },
      ];
      const results = monitoring.evaluateAlertRules(rules);
      expect(results).toHaveLength(1);

      // 3. 检查去重
      if (results[0].triggered) {
        const shouldSend = monitoring.shouldSendAlert("cpu_warning");
        expect(shouldSend).toBe(true);

        // 4. 发送通知
        const emailResult = monitoring.sendEmailAlert(
          "admin@company.com",
          "CPU告警",
          "CPU使用率超过75%"
        );
        expect(emailResult.sent).toBe(true);

        // 5. 记录告警
        const logResult = monitoring.logAlert({
          severity: "warning",
          title: "CPU告警",
          message: "CPU使用率超过75%",
        });
        expect(logResult.logged).toBe(true);
      }
    });

    it("应该处理多个告警", () => {
      const alerts = [
        { severity: "warning", title: "CPU告警", message: "CPU使用率超过75%" },
        { severity: "critical", title: "内存告警", message: "内存使用率超过90%" },
        { severity: "critical", title: "磁盘告警", message: "磁盘使用率超过95%" },
      ];

      for (const alert of alerts) {
        monitoring.logAlert(alert);
      }

      const stats = monitoring.getAlertStatistics();

      expect(stats.totalAlerts).toBe(3);
      expect(stats.criticalAlerts).toBe(2);
      expect(stats.warningAlerts).toBe(1);
    });
  });
});
