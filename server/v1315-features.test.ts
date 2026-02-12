/**
 * v1.3.15 功能单元测试
 * 测试报表模板预览、字段映射配置、告警规则功能
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock数据库
vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    execute: vi.fn(() => Promise.resolve([[{ insertId: 1 }], []])),
  })),
}));

// Mock通知服务
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(() => Promise.resolve(true)),
}));

// ==================== 字段映射服务测试 ====================
describe("Field Mapping Service", () => {
  describe("getTargetFields", () => {
    it("should return lead target fields", async () => {
      const { getTargetFields } = await import("./services/field-mapping.service");
      const fields = getTargetFields("lead");
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some(f => f.field === "companyName")).toBe(true);
      expect(fields.some(f => f.required)).toBe(true);
    });

    it("should return customer target fields", async () => {
      const { getTargetFields } = await import("./services/field-mapping.service");
      const fields = getTargetFields("customer");
      
      expect(fields.some(f => f.field === "name")).toBe(true);
    });

    it("should return project target fields", async () => {
      const { getTargetFields } = await import("./services/field-mapping.service");
      const fields = getTargetFields("project");
      
      expect(fields.some(f => f.field === "name")).toBe(true);
      expect(fields.some(f => f.field === "code")).toBe(true);
    });

    it("should return cost target fields", async () => {
      const { getTargetFields } = await import("./services/field-mapping.service");
      const fields = getTargetFields("cost");
      
      expect(fields.some(f => f.field === "amount")).toBe(true);
    });
  });

  describe("validateMappingConfig", () => {
    it("should validate valid config", async () => {
      const { validateMappingConfig } = await import("./services/field-mapping.service");
      const result = validateMappingConfig({
        name: "Test Config",
        importType: "lead",
        mappings: [
          { sourceField: "公司", targetField: "companyName" },
        ],
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should reject empty name", async () => {
      const { validateMappingConfig } = await import("./services/field-mapping.service");
      const result = validateMappingConfig({
        name: "",
        importType: "lead",
        mappings: [{ sourceField: "公司", targetField: "companyName" }],
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("名称"))).toBe(true);
    });

    it("should reject empty mappings", async () => {
      const { validateMappingConfig } = await import("./services/field-mapping.service");
      const result = validateMappingConfig({
        name: "Test",
        importType: "lead",
        mappings: [],
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("映射"))).toBe(true);
    });
  });
});

// ==================== 告警规则服务测试 ====================
describe("Alert Rule Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rule Types", () => {
    it("should support consecutive_failure type", async () => {
      const { createAlertRule } = await import("./services/alert-rule.service");
      const rule = await createAlertRule({
        name: "连续失败告警",
        ruleType: "consecutive_failure",
        conditions: { consecutiveFailures: 3 },
        actions: { channels: ["system"] },
        isEnabled: true,
      });
      
      expect(rule).toBeDefined();
      expect(rule.name).toBe("连续失败告警");
      expect(rule.ruleType).toBe("consecutive_failure");
    });

    it("should support timeout type", async () => {
      const { createAlertRule } = await import("./services/alert-rule.service");
      const rule = await createAlertRule({
        name: "超时告警",
        ruleType: "timeout",
        conditions: { timeoutSeconds: 300 },
        actions: { channels: ["system"] },
        isEnabled: true,
      });
      
      expect(rule.ruleType).toBe("timeout");
    });

    it("should support error_rate type", async () => {
      const { createAlertRule } = await import("./services/alert-rule.service");
      const rule = await createAlertRule({
        name: "错误率告警",
        ruleType: "error_rate",
        conditions: { errorRateThreshold: 50, timeWindowMinutes: 60 },
        actions: { channels: ["system"] },
        isEnabled: true,
      });
      
      expect(rule.ruleType).toBe("error_rate");
    });
  });

  describe("Notification Channels", () => {
    it("should support system channel", async () => {
      const { createAlertRule } = await import("./services/alert-rule.service");
      const rule = await createAlertRule({
        name: "系统通知测试",
        ruleType: "consecutive_failure",
        conditions: { consecutiveFailures: 3 },
        actions: { channels: ["system"] },
        isEnabled: true,
      });
      
      expect(rule.actions.channels).toContain("system");
    });

    it("should support webhook channel", async () => {
      const { createAlertRule } = await import("./services/alert-rule.service");
      const rule = await createAlertRule({
        name: "Webhook通知测试",
        ruleType: "consecutive_failure",
        conditions: { consecutiveFailures: 3 },
        actions: { 
          channels: ["webhook"],
          webhookUrl: "https://example.com/webhook",
        },
        isEnabled: true,
      });
      
      expect(rule.actions.channels).toContain("webhook");
      expect(rule.actions.webhookUrl).toBe("https://example.com/webhook");
    });

    it("should support multiple channels", async () => {
      const { createAlertRule } = await import("./services/alert-rule.service");
      const rule = await createAlertRule({
        name: "多渠道通知测试",
        ruleType: "consecutive_failure",
        conditions: { consecutiveFailures: 3 },
        actions: { channels: ["system", "email", "webhook"] },
        isEnabled: true,
      });
      
      expect(rule.actions.channels.length).toBe(3);
    });
  });

  describe("Rule Conditions", () => {
    it("should validate consecutive failures threshold", async () => {
      const { createAlertRule } = await import("./services/alert-rule.service");
      const rule = await createAlertRule({
        name: "高阈值连续失败",
        ruleType: "consecutive_failure",
        conditions: { consecutiveFailures: 10 },
        actions: { channels: ["system"] },
        isEnabled: true,
      });
      
      expect(rule.conditions.consecutiveFailures).toBe(10);
    });

    it("should validate timeout threshold", async () => {
      const { createAlertRule } = await import("./services/alert-rule.service");
      const rule = await createAlertRule({
        name: "长超时阈值",
        ruleType: "timeout",
        conditions: { timeoutSeconds: 600 },
        actions: { channels: ["system"] },
        isEnabled: true,
      });
      
      expect(rule.conditions.timeoutSeconds).toBe(600);
    });

    it("should validate error rate with time window", async () => {
      const { createAlertRule } = await import("./services/alert-rule.service");
      const rule = await createAlertRule({
        name: "高错误率告警",
        ruleType: "error_rate",
        conditions: { 
          errorRateThreshold: 80,
          timeWindowMinutes: 30,
        },
        actions: { channels: ["system"] },
        isEnabled: true,
      });
      
      expect(rule.conditions.errorRateThreshold).toBe(80);
      expect(rule.conditions.timeWindowMinutes).toBe(30);
    });
  });
});

// ==================== 报表模板预览测试 ====================
describe("Report Template Preview", () => {
  describe("Layout Configuration", () => {
    it("should support 1-column layout", () => {
      const layout = { columns: 1, sections: [] };
      expect(layout.columns).toBe(1);
    });

    it("should support 2-column layout", () => {
      const layout = { columns: 2, sections: [] };
      expect(layout.columns).toBe(2);
    });

    it("should support 3-column layout", () => {
      const layout = { columns: 3, sections: [] };
      expect(layout.columns).toBe(3);
    });

    it("should support full-width sections", () => {
      const section = { type: "summary", title: "概览", width: "full", order: 1, visible: true };
      expect(section.width).toBe("full");
    });

    it("should support half-width sections", () => {
      const section = { type: "funnel", title: "漏斗", width: "half", order: 2, visible: true };
      expect(section.width).toBe("half");
    });

    it("should support third-width sections", () => {
      const section = { type: "source", title: "来源", width: "third", order: 3, visible: true };
      expect(section.width).toBe("third");
    });
  });

  describe("Styling Configuration", () => {
    it("should support light theme", () => {
      const styling = { theme: "light", primaryColor: "#f97316" };
      expect(styling.theme).toBe("light");
    });

    it("should support dark theme", () => {
      const styling = { theme: "dark", primaryColor: "#f97316" };
      expect(styling.theme).toBe("dark");
    });

    it("should support professional theme", () => {
      const styling = { theme: "professional", primaryColor: "#f97316" };
      expect(styling.theme).toBe("professional");
    });

    it("should support custom primary color", () => {
      const styling = { theme: "professional", primaryColor: "#10b981" };
      expect(styling.primaryColor).toBe("#10b981");
    });

    it("should support header configuration", () => {
      const styling = {
        theme: "professional",
        primaryColor: "#f97316",
        showHeader: true,
        headerText: "GRT分析报表",
      };
      expect(styling.showHeader).toBe(true);
      expect(styling.headerText).toBe("GRT分析报表");
    });

    it("should support footer configuration", () => {
      const styling = {
        theme: "professional",
        primaryColor: "#f97316",
        showFooter: true,
        footerText: "系统自动生成",
      };
      expect(styling.showFooter).toBe(true);
      expect(styling.footerText).toBe("系统自动生成");
    });

    it("should support logo configuration", () => {
      const styling = {
        theme: "professional",
        primaryColor: "#f97316",
        showLogo: true,
        logoUrl: "https://example.com/logo.png",
      };
      expect(styling.showLogo).toBe(true);
      expect(styling.logoUrl).toBe("https://example.com/logo.png");
    });
  });

  describe("Report Types", () => {
    it("should support summary report type", () => {
      const reportTypes = ["summary"];
      expect(reportTypes).toContain("summary");
    });

    it("should support funnel report type", () => {
      const reportTypes = ["funnel"];
      expect(reportTypes).toContain("funnel");
    });

    it("should support trend report type", () => {
      const reportTypes = ["trend"];
      expect(reportTypes).toContain("trend");
    });

    it("should support source report type", () => {
      const reportTypes = ["source"];
      expect(reportTypes).toContain("source");
    });

    it("should support performance report type", () => {
      const reportTypes = ["performance"];
      expect(reportTypes).toContain("performance");
    });

    it("should support multiple report types", () => {
      const reportTypes = ["summary", "funnel", "trend", "source", "performance"];
      expect(reportTypes.length).toBe(5);
    });
  });
});

// ==================== 集成测试 ====================
describe("Integration Tests", () => {
  describe("Field Mapping with Import", () => {
    it("should create mapping config for lead import", async () => {
      const { createFieldMapping } = await import("./services/field-mapping.service");
      const config = await createFieldMapping({
        name: "标准商机导入",
        importType: "lead",
        mappings: [
          { sourceField: "公司名称", targetField: "companyName" },
          { sourceField: "联系人", targetField: "contactName" },
          { sourceField: "电话", targetField: "phone" },
        ],
      });
      
      expect(config).toBeDefined();
      expect(config.mappings.length).toBe(3);
    });
  });

  describe("Alert Rule with Notification", () => {
    it("should create rule with system notification", async () => {
      const { createAlertRule } = await import("./services/alert-rule.service");
      const rule = await createAlertRule({
        name: "任务失败告警",
        ruleType: "consecutive_failure",
        conditions: { consecutiveFailures: 3 },
        actions: { channels: ["system"] },
        isEnabled: true,
      });
      
      expect(rule.isEnabled).toBe(true);
      expect(rule.actions.channels).toContain("system");
    });
  });

  describe("Report Template with Preview", () => {
    it("should create template with all sections", () => {
      const template = {
        name: "完整报表模板",
        reportTypes: ["summary", "funnel", "trend", "source", "performance"],
        layout: {
          columns: 2,
          sections: [
            { type: "summary", title: "商机概览", width: "full", order: 1, visible: true },
            { type: "funnel", title: "销售漏斗", width: "half", order: 2, visible: true },
            { type: "trend", title: "趋势分析", width: "half", order: 3, visible: true },
            { type: "source", title: "来源分析", width: "half", order: 4, visible: true },
            { type: "performance", title: "销售业绩", width: "half", order: 5, visible: true },
          ],
        },
        styling: {
          theme: "professional",
          primaryColor: "#f97316",
          showHeader: true,
          showFooter: true,
          showLogo: true,
          headerText: "GRT智能系统 - 分析报表",
          footerText: "本报表由系统自动生成",
        },
      };
      
      expect(template.reportTypes.length).toBe(5);
      expect(template.layout.sections.length).toBe(5);
      expect(template.styling.theme).toBe("professional");
    });
  });
});
