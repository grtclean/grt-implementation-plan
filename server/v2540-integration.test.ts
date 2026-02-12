/**
 * v2.5.40 集成测试
 * 测试种子数据导入、Webhook配置、M7/M8/M9触发流程
 */

import { describe, it, expect } from "vitest";
import { TEMPLATES } from "./scripts/seed-gate-checklist";

describe("v2.5.40 种子数据模板验证", () => {
  describe("M7/M8/M9检查清单模板", () => {
    it("M7检查清单应包含28项检查项", () => {
      expect(TEMPLATES.M7).toHaveLength(28);
    });

    it("M8检查清单应包含13项检查项", () => {
      expect(TEMPLATES.M8).toHaveLength(13);
    });

    it("M9检查清单应包含11项检查项", () => {
      expect(TEMPLATES.M9).toHaveLength(11);
    });

    it("所有检查项应包含必要字段", () => {
      const allItems = [...TEMPLATES.M7, ...TEMPLATES.M8, ...TEMPLATES.M9];
      allItems.forEach((item) => {
        expect(item).toHaveProperty("category");
        expect(item).toHaveProperty("item");
        expect(item).toHaveProperty("weight");
        expect(item).toHaveProperty("required");
        expect(item).toHaveProperty("criteria");
        expect(item).toHaveProperty("sortOrder");
      });
    });

    it("检查项权重应在1-20范围内", () => {
      const allItems = [...TEMPLATES.M7, ...TEMPLATES.M8, ...TEMPLATES.M9];
      allItems.forEach((item) => {
        expect(item.weight).toBeGreaterThanOrEqual(1);
        expect(item.weight).toBeLessThanOrEqual(20);
      });
    });

    it("M7检查清单应覆盖7大类别", () => {
      const categories = new Set(TEMPLATES.M7.map((item) => item.category));
      expect(categories.size).toBe(7);
      expect(categories.has("cleaning_performance")).toBe(true);
      expect(categories.has("mechanical_system")).toBe(true);
      expect(categories.has("electrical_control")).toBe(true);
      expect(categories.has("process_parameters")).toBe(true);
      expect(categories.has("cycle_time")).toBe(true);
      expect(categories.has("safety_compliance")).toBe(true);
      expect(categories.has("documentation")).toBe(true);
    });
  });

  describe("Webhook配置模板", () => {
    it("应包含至少2个Webhook配置", () => {
      expect(TEMPLATES.WEBHOOK.length).toBeGreaterThanOrEqual(2);
    });

    it("所有Webhook配置应包含必要字段", () => {
      TEMPLATES.WEBHOOK.forEach((config) => {
        expect(config).toHaveProperty("configCode");
        expect(config).toHaveProperty("name");
        expect(config).toHaveProperty("webhookUrl");
        expect(config).toHaveProperty("webhookType");
        expect(config).toHaveProperty("eventTypes");
        expect(config).toHaveProperty("isEnabled");
      });
    });

    it("Webhook类型应为有效枚举值", () => {
      const validTypes = ["wecom", "dingtalk", "feishu", "custom"];
      TEMPLATES.WEBHOOK.forEach((config) => {
        expect(validTypes).toContain(config.webhookType);
      });
    });

    it("应包含Gate检查结果通知Webhook", () => {
      const gateWebhook = TEMPLATES.WEBHOOK.find(
        (w) => w.configCode === "WH-GATE-001"
      );
      expect(gateWebhook).toBeDefined();
      expect(gateWebhook?.eventTypes).toContain("gate_check");
    });

    it("应包含AI诊断建议通知Webhook", () => {
      const aiWebhook = TEMPLATES.WEBHOOK.find(
        (w) => w.configCode === "WH-AI-001"
      );
      expect(aiWebhook).toBeDefined();
      expect(aiWebhook?.eventTypes).toContain("ai_diagnosis");
    });
  });

  describe("AI触发器配置模板", () => {
    it("应包含至少7个触发器配置", () => {
      expect(TEMPLATES.TRIGGER.length).toBeGreaterThanOrEqual(7);
    });

    it("所有触发器配置应包含必要字段", () => {
      TEMPLATES.TRIGGER.forEach((config) => {
        expect(config).toHaveProperty("triggerCode");
        expect(config).toHaveProperty("name");
        expect(config).toHaveProperty("agentType");
        expect(config).toHaveProperty("triggerType");
        expect(config).toHaveProperty("triggerConditions");
        expect(config).toHaveProperty("isEnabled");
        expect(config).toHaveProperty("priority");
      });
    });

    it("Agent类型应为有效枚举值", () => {
      const validAgentTypes = [
        "Risk_Radar",
        "Technical_Writer",
        "Gatekeeper",
        "Site_Copilot",
      ];
      TEMPLATES.TRIGGER.forEach((config) => {
        expect(validAgentTypes).toContain(config.agentType);
      });
    });

    it("触发类型应为有效枚举值", () => {
      const validTriggerTypes = [
        "Stage_Change",
        "Time_Based",
        "Event_Based",
        "Threshold_Based",
        "Manual",
      ];
      TEMPLATES.TRIGGER.forEach((config) => {
        expect(validTriggerTypes).toContain(config.triggerType);
      });
    });

    it("应包含M7阶段触发器", () => {
      const m7Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M7-GATE-001"
      );
      expect(m7Trigger).toBeDefined();
      expect(m7Trigger?.agentType).toBe("Gatekeeper");
      expect(m7Trigger?.triggerType).toBe("Stage_Change");
    });

    it("应包含M8阶段触发器", () => {
      const m8Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M8-GATE-001"
      );
      expect(m8Trigger).toBeDefined();
      expect(m8Trigger?.agentType).toBe("Gatekeeper");
      expect(m8Trigger?.triggerType).toBe("Stage_Change");
    });

    it("应包含M9阶段触发器", () => {
      const m9Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M9-GATE-001"
      );
      expect(m9Trigger).toBeDefined();
      expect(m9Trigger?.agentType).toBe("Gatekeeper");
      expect(m9Trigger?.triggerType).toBe("Stage_Change");
    });

    it("应包含M9定期检查触发器", () => {
      const m9PeriodicTrigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M9-PERIODIC-001"
      );
      expect(m9PeriodicTrigger).toBeDefined();
      expect(m9PeriodicTrigger?.triggerType).toBe("Time_Based");
    });

    it("应包含Tier1客户风险分析触发器", () => {
      const riskTrigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-RISK-001"
      );
      expect(riskTrigger).toBeDefined();
      expect(riskTrigger?.agentType).toBe("Risk_Radar");
      expect(riskTrigger?.triggerType).toBe("Event_Based");
    });

    it("应包含现场问题诊断触发器", () => {
      const siteTrigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-SITE-001"
      );
      expect(siteTrigger).toBeDefined();
      expect(siteTrigger?.agentType).toBe("Site_Copilot");
      expect(siteTrigger?.triggerType).toBe("Event_Based");
    });
  });
});

describe("v2.5.40 M7/M8/M9阶段流程验证", () => {
  describe("阶段变更检测", () => {
    it("M7触发器应检测M6->M7阶段变更", () => {
      const m7Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M7-GATE-001"
      );
      const conditions = JSON.parse(m7Trigger?.triggerConditions || "{}");
      expect(conditions.fromPhase).toBe("M6_Manufacturing");
      expect(conditions.toPhase).toBe("M7_Pre_Acceptance");
    });

    it("M8触发器应检测M7->M8阶段变更", () => {
      const m8Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M8-GATE-001"
      );
      const conditions = JSON.parse(m8Trigger?.triggerConditions || "{}");
      expect(conditions.fromPhase).toBe("M7_Pre_Acceptance");
      expect(conditions.toPhase).toBe("M8_Final_Acceptance");
    });

    it("M9触发器应检测M8->M9阶段变更", () => {
      const m9Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M9-GATE-001"
      );
      const conditions = JSON.parse(m9Trigger?.triggerConditions || "{}");
      expect(conditions.fromPhase).toBe("M8_Final_Acceptance");
      expect(conditions.toPhase).toBe("M9_Warranty");
    });
  });

  describe("Gate检查前置条件", () => {
    it("M8触发器应要求M7检查已通过", () => {
      const m8Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M8-GATE-001"
      );
      const conditions = JSON.parse(m8Trigger?.triggerConditions || "{}");
      expect(conditions.requireM7Passed).toBe(true);
    });

    it("M9触发器应要求M8检查已通过", () => {
      const m9Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M9-GATE-001"
      );
      const conditions = JSON.parse(m9Trigger?.triggerConditions || "{}");
      expect(conditions.requireM8Passed).toBe(true);
    });
  });

  describe("工业清洗设备专用检查项", () => {
    it("M7应包含清洁度测试（ISO 16232标准）", () => {
      const isoItem = TEMPLATES.M7.find((item) =>
        item.criteria?.includes("ISO 16232")
      );
      expect(isoItem).toBeDefined();
      expect(isoItem?.category).toBe("cleaning_performance");
    });

    it("M7应包含喷淋系统检查", () => {
      const sprayItem = TEMPLATES.M7.find((item) =>
        item.item.includes("喷淋系统")
      );
      expect(sprayItem).toBeDefined();
      expect(sprayItem?.category).toBe("mechanical_system");
    });

    it("M7应包含PLC程序功能测试", () => {
      const plcItem = TEMPLATES.M7.find((item) =>
        item.item.includes("PLC程序")
      );
      expect(plcItem).toBeDefined();
      expect(plcItem?.category).toBe("electrical_control");
    });

    it("M8应包含产线节拍匹配测试", () => {
      const cycleItem = TEMPLATES.M8.find((item) =>
        item.item.includes("产线节拍")
      );
      expect(cycleItem).toBeDefined();
      expect(cycleItem?.weight).toBeGreaterThanOrEqual(10);
    });

    it("M9应包含OEE监控检查", () => {
      const oeeItem = TEMPLATES.M9.find((item) => item.item.includes("OEE"));
      expect(oeeItem).toBeDefined();
      expect(oeeItem?.criteria).toContain("85%");
    });
  });
});

describe("v2.5.40 Webhook通知格式验证", () => {
  describe("Gate检查结果通知", () => {
    it("应支持企业微信Markdown格式", () => {
      const wecomWebhook = TEMPLATES.WEBHOOK.find(
        (w) => w.webhookType === "wecom"
      );
      expect(wecomWebhook).toBeDefined();
    });

    it("应支持钉钉Markdown格式", () => {
      const dingtalkWebhook = TEMPLATES.WEBHOOK.find(
        (w) => w.webhookType === "dingtalk"
      );
      expect(dingtalkWebhook).toBeDefined();
    });
  });

  describe("事件类型配置", () => {
    it("Gate检查Webhook应订阅passed/failed/conditional事件", () => {
      const gateWebhook = TEMPLATES.WEBHOOK.find(
        (w) => w.configCode === "WH-GATE-001"
      );
      expect(gateWebhook?.eventTypes).toContain("gate_check_passed");
      expect(gateWebhook?.eventTypes).toContain("gate_check_failed");
      expect(gateWebhook?.eventTypes).toContain("gate_check_conditional");
    });

    it("AI诊断Webhook应订阅diagnosis和risk_alert事件", () => {
      const aiWebhook = TEMPLATES.WEBHOOK.find(
        (w) => w.configCode === "WH-AI-001"
      );
      expect(aiWebhook?.eventTypes).toContain("ai_diagnosis_completed");
      expect(aiWebhook?.eventTypes).toContain("risk_alert_high");
    });
  });
});
