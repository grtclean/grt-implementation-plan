/**
 * 告警规则配置集成模块
 * 
 * 功能:
 * 1. 预定义告警规则模板
 * 2. 规则配置管理
 * 3. 规则验证和应用
 * 4. 规则导入导出
 */

import DynamicThresholdEngine from "./dynamic-threshold-engine";

/**
 * 告警规则定义
 */
interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: ">" | "<" | ">=" | "<=" | "==";
  threshold: number;
  severity: "info" | "warning" | "critical" | "emergency";
  duration: number; // 秒
  enabled: boolean;
  channels: ("email" | "slack" | "wechat")[];
  description: string;
  tags: string[];
  lastModified: Date;
  modifiedBy: string;
}

/**
 * 告警规则集合
 */
interface AlertRuleSet {
  id: string;
  name: string;
  description: string;
  environment: "development" | "staging" | "production";
  rules: AlertRule[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 告警规则配置管理器
 */
class AlertRulesConfigManager {
  private ruleSets: Map<string, AlertRuleSet> = new Map();
  private thresholdEngine: DynamicThresholdEngine;
  private activeRuleSet: AlertRuleSet | null = null;

  constructor() {
    this.thresholdEngine = new DynamicThresholdEngine();
    this.initializeDefaultRuleSets();
  }

  /**
   * 初始化默认规则集
   */
  private initializeDefaultRuleSets(): void {
    // 生产环境标准规则集
    this.createRuleSet({
      id: "production_standard",
      name: "生产环境标准规则集",
      description: "适用于标准生产环境的告警规则",
      environment: "production",
      rules: [
        // CPU规则
        {
          id: "cpu_warning",
          name: "CPU使用率警告",
          metric: "cpu",
          condition: ">",
          threshold: 75,
          severity: "warning",
          duration: 300,
          enabled: true,
          channels: ["email", "slack"],
          description: "CPU使用率超过75%持续5分钟",
          tags: ["cpu", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
        {
          id: "cpu_critical",
          name: "CPU使用率严重",
          metric: "cpu",
          condition: ">",
          threshold: 85,
          severity: "critical",
          duration: 180,
          enabled: true,
          channels: ["email", "slack", "wechat"],
          description: "CPU使用率超过85%持续3分钟",
          tags: ["cpu", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },

        // 内存规则
        {
          id: "memory_warning",
          name: "内存使用率警告",
          metric: "memory",
          condition: ">",
          threshold: 85,
          severity: "warning",
          duration: 300,
          enabled: true,
          channels: ["email", "slack"],
          description: "内存使用率超过85%持续5分钟",
          tags: ["memory", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
        {
          id: "memory_critical",
          name: "内存使用率严重",
          metric: "memory",
          condition: ">",
          threshold: 92,
          severity: "critical",
          duration: 180,
          enabled: true,
          channels: ["email", "slack", "wechat"],
          description: "内存使用率超过92%持续3分钟",
          tags: ["memory", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },

        // 磁盘规则
        {
          id: "disk_warning",
          name: "磁盘使用率警告",
          metric: "disk",
          condition: ">",
          threshold: 85,
          severity: "warning",
          duration: 300,
          enabled: true,
          channels: ["email", "slack"],
          description: "磁盘使用率超过85%持续5分钟",
          tags: ["disk", "storage"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
        {
          id: "disk_critical",
          name: "磁盘使用率严重",
          metric: "disk",
          condition: ">",
          threshold: 92,
          severity: "critical",
          duration: 180,
          enabled: true,
          channels: ["email", "slack", "wechat"],
          description: "磁盘使用率超过92%持续3分钟",
          tags: ["disk", "storage"],
          lastModified: new Date(),
          modifiedBy: "system",
        },

        // 应用响应时间规则
        {
          id: "response_time_warning",
          name: "应用响应时间警告",
          metric: "responseTime",
          condition: ">",
          threshold: 1000,
          severity: "warning",
          duration: 300,
          enabled: true,
          channels: ["email", "slack"],
          description: "应用响应时间超过1秒持续5分钟",
          tags: ["application", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
        {
          id: "response_time_critical",
          name: "应用响应时间严重",
          metric: "responseTime",
          condition: ">",
          threshold: 3000,
          severity: "critical",
          duration: 180,
          enabled: true,
          channels: ["email", "slack", "wechat"],
          description: "应用响应时间超过3秒持续3分钟",
          tags: ["application", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },

        // 数据库连接规则
        {
          id: "db_connection_failed",
          name: "数据库连接失败",
          metric: "dbConnected",
          condition: "==",
          threshold: 0,
          severity: "emergency",
          duration: 60,
          enabled: true,
          channels: ["email", "slack", "wechat"],
          description: "数据库连接失败持续1分钟",
          tags: ["database", "critical"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
        {
          id: "db_response_time_warning",
          name: "数据库响应时间警告",
          metric: "dbResponseTime",
          condition: ">",
          threshold: 200,
          severity: "warning",
          duration: 300,
          enabled: true,
          channels: ["email", "slack"],
          description: "数据库响应时间超过200ms持续5分钟",
          tags: ["database", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },

        // 应用健康规则
        {
          id: "app_unhealthy",
          name: "应用不健康",
          metric: "appHealthy",
          condition: "==",
          threshold: 0,
          severity: "critical",
          duration: 120,
          enabled: true,
          channels: ["email", "slack", "wechat"],
          description: "应用健康检查失败持续2分钟",
          tags: ["application", "health"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
      ],
    });

    // 高性能环境规则集
    this.createRuleSet({
      id: "production_high_performance",
      name: "生产环境高性能规则集",
      description: "适用于高性能要求的生产环境",
      environment: "production",
      rules: [
        {
          id: "cpu_warning_hp",
          name: "CPU使用率警告",
          metric: "cpu",
          condition: ">",
          threshold: 70,
          severity: "warning",
          duration: 180,
          enabled: true,
          channels: ["email", "slack"],
          description: "CPU使用率超过70%持续3分钟",
          tags: ["cpu", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
        {
          id: "cpu_critical_hp",
          name: "CPU使用率严重",
          metric: "cpu",
          condition: ">",
          threshold: 80,
          severity: "critical",
          duration: 120,
          enabled: true,
          channels: ["email", "slack", "wechat"],
          description: "CPU使用率超过80%持续2分钟",
          tags: ["cpu", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
        {
          id: "response_time_warning_hp",
          name: "应用响应时间警告",
          metric: "responseTime",
          condition: ">",
          threshold: 500,
          severity: "warning",
          duration: 180,
          enabled: true,
          channels: ["email", "slack"],
          description: "应用响应时间超过500ms持续3分钟",
          tags: ["application", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
        {
          id: "response_time_critical_hp",
          name: "应用响应时间严重",
          metric: "responseTime",
          condition: ">",
          threshold: 1000,
          severity: "critical",
          duration: 120,
          enabled: true,
          channels: ["email", "slack", "wechat"],
          description: "应用响应时间超过1秒持续2分钟",
          tags: ["application", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
      ],
    });

    // 开发环境规则集
    this.createRuleSet({
      id: "development",
      name: "开发环境规则集",
      description: "适用于开发环境的宽松规则",
      environment: "development",
      rules: [
        {
          id: "cpu_warning_dev",
          name: "CPU使用率警告",
          metric: "cpu",
          condition: ">",
          threshold: 85,
          severity: "warning",
          duration: 600,
          enabled: true,
          channels: ["email"],
          description: "CPU使用率超过85%持续10分钟",
          tags: ["cpu", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
        {
          id: "memory_warning_dev",
          name: "内存使用率警告",
          metric: "memory",
          condition: ">",
          threshold: 90,
          severity: "warning",
          duration: 600,
          enabled: true,
          channels: ["email"],
          description: "内存使用率超过90%持续10分钟",
          tags: ["memory", "performance"],
          lastModified: new Date(),
          modifiedBy: "system",
        },
      ],
    });

    // 激活生产环境标准规则集
    this.activeRuleSet = this.ruleSets.get("production_standard") || null;
  }

  /**
   * 创建规则集
   */
  createRuleSet(ruleSet: AlertRuleSet): void {
    this.ruleSets.set(ruleSet.id, ruleSet);
  }

  /**
   * 激活规则集
   */
  activateRuleSet(ruleSetId: string): boolean {
    const ruleSet = this.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      console.error(`规则集 ${ruleSetId} 不存在`);
      return false;
    }

    this.activeRuleSet = ruleSet;
    console.log(`已激活规则集: ${ruleSet.name}`);
    return true;
  }

  /**
   * 获取活跃规则集
   */
  getActiveRuleSet(): AlertRuleSet | null {
    return this.activeRuleSet;
  }

  /**
   * 获取所有规则集
   */
  getAllRuleSets(): AlertRuleSet[] {
    return Array.from(this.ruleSets.values());
  }

  /**
   * 添加规则
   */
  addRule(ruleSetId: string, rule: AlertRule): boolean {
    const ruleSet = this.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      console.error(`规则集 ${ruleSetId} 不存在`);
      return false;
    }

    // 检查规则ID是否已存在
    if (ruleSet.rules.some((r) => r.id === rule.id)) {
      console.error(`规则 ${rule.id} 已存在`);
      return false;
    }

    ruleSet.rules.push(rule);
    ruleSet.updatedAt = new Date();
    return true;
  }

  /**
   * 更新规则
   */
  updateRule(ruleSetId: string, ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleSet = this.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      console.error(`规则集 ${ruleSetId} 不存在`);
      return false;
    }

    const rule = ruleSet.rules.find((r) => r.id === ruleId);
    if (!rule) {
      console.error(`规则 ${ruleId} 不存在`);
      return false;
    }

    Object.assign(rule, updates, {
      lastModified: new Date(),
    });
    ruleSet.updatedAt = new Date();
    return true;
  }

  /**
   * 删除规则
   */
  deleteRule(ruleSetId: string, ruleId: string): boolean {
    const ruleSet = this.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      console.error(`规则集 ${ruleSetId} 不存在`);
      return false;
    }

    const index = ruleSet.rules.findIndex((r) => r.id === ruleId);
    if (index === -1) {
      console.error(`规则 ${ruleId} 不存在`);
      return false;
    }

    ruleSet.rules.splice(index, 1);
    ruleSet.updatedAt = new Date();
    return true;
  }

  /**
   * 启用/禁用规则
   */
  toggleRule(ruleSetId: string, ruleId: string, enabled: boolean): boolean {
    return this.updateRule(ruleSetId, ruleId, { enabled });
  }

  /**
   * 获取规则集中的规则
   */
  getRules(ruleSetId: string): AlertRule[] {
    const ruleSet = this.ruleSets.get(ruleSetId);
    return ruleSet ? ruleSet.rules : [];
  }

  /**
   * 获取启用的规则
   */
  getEnabledRules(ruleSetId: string): AlertRule[] {
    const ruleSet = this.ruleSets.get(ruleSetId);
    return ruleSet ? ruleSet.rules.filter((r) => r.enabled) : [];
  }

  /**
   * 验证规则
   */
  validateRule(rule: AlertRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.id) errors.push("规则ID不能为空");
    if (!rule.name) errors.push("规则名称不能为空");
    if (!rule.metric) errors.push("指标不能为空");
    if (rule.threshold < 0) errors.push("阈值不能为负数");
    if (rule.duration < 0) errors.push("持续时间不能为负数");
    if (rule.channels.length === 0) errors.push("至少需要一个通知通道");

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 导出规则集为JSON
   */
  exportRuleSetAsJSON(ruleSetId: string): string {
    const ruleSet = this.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      throw new Error(`规则集 ${ruleSetId} 不存在`);
    }

    return JSON.stringify(ruleSet, null, 2);
  }

  /**
   * 导入规则集从JSON
   */
  importRuleSetFromJSON(jsonString: string): boolean {
    try {
      const ruleSet = JSON.parse(jsonString) as AlertRuleSet;

      // 验证规则集
      if (!ruleSet.id || !ruleSet.name || !Array.isArray(ruleSet.rules)) {
        throw new Error("无效的规则集格式");
      }

      // 验证所有规则
      for (const rule of ruleSet.rules) {
        const validation = this.validateRule(rule);
        if (!validation.valid) {
          throw new Error(`规则 ${rule.id} 验证失败: ${validation.errors.join(", ")}`);
        }
      }

      // 添加规则集
      ruleSet.createdAt = new Date();
      ruleSet.updatedAt = new Date();
      this.ruleSets.set(ruleSet.id, ruleSet);

      return true;
    } catch (error) {
      console.error("导入规则集失败:", error);
      return false;
    }
  }

  /**
   * 生成配置报告
   */
  generateConfigReport(): string {
    const report: string[] = [];

    report.push("=== 告警规则配置报告 ===\n");

    if (this.activeRuleSet) {
      report.push(`当前活跃规则集: ${this.activeRuleSet.name}`);
      report.push(`环境: ${this.activeRuleSet.environment}`);
      report.push(`规则数量: ${this.activeRuleSet.rules.length}`);
      report.push(`启用规则: ${this.activeRuleSet.rules.filter((r) => r.enabled).length}\n`);

      report.push("规则列表:");
      for (const rule of this.activeRuleSet.rules) {
        const status = rule.enabled ? "✓" : "✗";
        report.push(
          `  [${status}] ${rule.name} (${rule.metric} ${rule.condition} ${rule.threshold})`
        );
      }
    } else {
      report.push("未激活任何规则集");
    }

    report.push("\n可用规则集:");
    for (const ruleSet of this.ruleSets.values()) {
      report.push(`  - ${ruleSet.name} (${ruleSet.environment})`);
    }

    report.push("\n动态阈值引擎报告:");
    report.push(this.thresholdEngine.getThresholdReport());

    return report.join("\n");
  }
}

// ============================================================================
// 导出
// ============================================================================

export default AlertRulesConfigManager;
export { AlertRule, AlertRuleSet };

// ============================================================================
// 使用示例
// ============================================================================

/*
const manager = new AlertRulesConfigManager();

// 激活规则集
manager.activateRuleSet("production_standard");

// 添加自定义规则
const customRule: AlertRule = {
  id: "custom_rule_1",
  name: "自定义规则",
  metric: "cpu",
  condition: ">",
  threshold: 80,
  severity: "warning",
  duration: 300,
  enabled: true,
  channels: ["email", "slack"],
  description: "自定义CPU告警规则",
  tags: ["custom"],
  lastModified: new Date(),
  modifiedBy: "admin",
};

manager.addRule("production_standard", customRule);

// 生成报告
console.log(manager.generateConfigReport());

// 导出规则集
const json = manager.exportRuleSetAsJSON("production_standard");
console.log(json);
*/
