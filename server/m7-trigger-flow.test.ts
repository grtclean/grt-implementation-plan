/**
 * M7阶段触发流程集成测试
 * 测试完整的M7阶段变更 -> AI触发器执行 -> Webhook通知流程
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TEMPLATES } from "./scripts/seed-gate-checklist";

describe("M7 Trigger Flow Integration", () => {
  describe("Phase Change Detection", () => {
    it("should detect M7 phase change trigger condition", () => {
      const m7Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M7-GATE-001"
      );
      
      expect(m7Trigger).toBeDefined();
      expect(m7Trigger?.triggerType).toBe("Stage_Change");
      
      const conditions = JSON.parse(m7Trigger!.triggerConditions);
      expect(conditions.toPhase).toBe("M7_Pre_Acceptance");
      expect(conditions.fromPhase).toBe("M6_Manufacturing");
    });

    it("should have M7 in trigger stages", () => {
      const m7Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M7-GATE-001"
      );
      
      const stages = JSON.parse(m7Trigger!.triggerOnStages);
      expect(stages).toContain("M7");
    });
  });

  describe("Gate Checklist Validation", () => {
    it("should have M7 checklist items for pre-acceptance", () => {
      const m7Items = TEMPLATES.M7;
      expect(m7Items.length).toBeGreaterThan(0);
      
      // 验证关键检查类别存在
      const categories = [...new Set(m7Items.map(item => item.category))];
      expect(categories).toContain("cleaning_performance");
      expect(categories).toContain("mechanical_system");
      expect(categories).toContain("electrical_control");
    });

    it("should have proper weights for M7 items", () => {
      const m7Items = TEMPLATES.M7;
      
      // 所有权重应该在1-20之间（关键项可以更高）
      for (const item of m7Items) {
        expect(item.weight).toBeGreaterThanOrEqual(1);
        expect(item.weight).toBeLessThanOrEqual(20);
      }
      
      // 关键项目权重应该更高
      const criticalItems = m7Items.filter(item => item.weight >= 8);
      expect(criticalItems.length).toBeGreaterThan(0);
    });

    it("should have ISO 16232 cleanliness check items", () => {
      const m7Items = TEMPLATES.M7;
      
      // 查找清洁度相关检查项
      const cleanlinessItems = m7Items.filter(
        item => item.item.includes("清洁度") || 
                item.item.includes("ISO 16232") ||
                item.item.includes("颗粒")
      );
      
      expect(cleanlinessItems.length).toBeGreaterThan(0);
    });
  });

  describe("Webhook Notification", () => {
    it("should have Gate check webhook configured", () => {
      const gateWebhook = TEMPLATES.WEBHOOK.find(
        (w) => w.configCode === "WH-GATE-001"
      );
      
      expect(gateWebhook).toBeDefined();
      expect(gateWebhook?.webhookType).toBe("wecom");
      
      const events = gateWebhook!.eventTypes.split(",");
      expect(events).toContain("gate_check_passed");
      expect(events).toContain("gate_check_failed");
    });

    it("should have AI diagnosis webhook configured", () => {
      const aiWebhook = TEMPLATES.WEBHOOK.find(
        (w) => w.configCode === "WH-AI-001"
      );
      
      expect(aiWebhook).toBeDefined();
      expect(aiWebhook?.webhookType).toBe("dingtalk");
      
      const events = aiWebhook!.eventTypes.split(",");
      expect(events).toContain("ai_diagnosis_completed");
    });
  });

  describe("AI Agent Configuration", () => {
    it("should have Gatekeeper agent for M7", () => {
      const m7Trigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-M7-GATE-001"
      );
      
      expect(m7Trigger?.agentType).toBe("Gatekeeper");
    });

    it("should have Risk Radar for Tier1 customers", () => {
      const riskTrigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-RISK-001"
      );
      
      expect(riskTrigger).toBeDefined();
      expect(riskTrigger?.agentType).toBe("Risk_Radar");
      
      const conditions = JSON.parse(riskTrigger!.triggerConditions);
      expect(conditions.customerTier).toBe("Tier1");
    });

    it("should have Site Copilot for critical issues", () => {
      const siteTrigger = TEMPLATES.TRIGGER.find(
        (t) => t.triggerCode === "TRG-SITE-001"
      );
      
      expect(siteTrigger).toBeDefined();
      expect(siteTrigger?.agentType).toBe("Site_Copilot");
      
      const conditions = JSON.parse(siteTrigger!.triggerConditions);
      expect(conditions.severity).toContain("Critical");
      expect(conditions.severity).toContain("High");
    });
  });

  describe("Flow Sequence Validation", () => {
    it("should have correct trigger priority order", () => {
      const triggers = TEMPLATES.TRIGGER;
      
      // M7 Gate检查应该有最高优先级
      const m7Trigger = triggers.find(t => t.triggerCode === "TRG-M7-GATE-001");
      const riskTrigger = triggers.find(t => t.triggerCode === "TRG-RISK-001");
      const siteTrigger = triggers.find(t => t.triggerCode === "TRG-SITE-001");
      
      expect(m7Trigger?.priority).toBe(1);
      expect(riskTrigger?.priority).toBe(1);
      expect(siteTrigger?.priority).toBe(2);
    });

    it("should have all triggers enabled by default", () => {
      for (const trigger of TEMPLATES.TRIGGER) {
        expect(trigger.isEnabled).toBe(1);
      }
    });
  });

  describe("Industrial Cleaning Equipment Specifics", () => {
    it("should have cleaning performance checks", () => {
      const cleaningItems = TEMPLATES.M7.filter(
        item => item.category === "cleaning_performance"
      );
      
      expect(cleaningItems.length).toBeGreaterThan(0);
      
      // 验证关键清洗性能检查项
      const itemNames = cleaningItems.map(item => item.item);
      expect(itemNames.some(name => name.includes("清洗"))).toBe(true);
    });

    it("should have mechanical system checks", () => {
      const mechanicalItems = TEMPLATES.M7.filter(
        item => item.category === "mechanical_system"
      );
      
      expect(mechanicalItems.length).toBeGreaterThan(0);
    });

    it("should have electrical control checks", () => {
      const electricalItems = TEMPLATES.M7.filter(
        item => item.category === "electrical_control"
      );
      
      expect(electricalItems.length).toBeGreaterThan(0);
    });

    it("should have process parameter checks", () => {
      const processItems = TEMPLATES.M7.filter(
        item => item.category === "process_parameters"
      );
      
      expect(processItems.length).toBeGreaterThan(0);
    });

    it("should have safety compliance checks", () => {
      const safetyItems = TEMPLATES.M7.filter(
        item => item.category === "safety_compliance"
      );
      
      expect(safetyItems.length).toBeGreaterThan(0);
    });
  });

  describe("M8 Final Acceptance Checks", () => {
    it("should have M8 checklist items", () => {
      expect(TEMPLATES.M8.length).toBeGreaterThan(0);
    });

    it("should include customer verification items", () => {
      const m8Items = TEMPLATES.M8;
      const customerItems = m8Items.filter(
        item => item.item.includes("客户") || item.item.includes("验收")
      );
      
      expect(customerItems.length).toBeGreaterThan(0);
    });
  });

  describe("M9 Warranty Period Checks", () => {
    it("should have M9 checklist items", () => {
      expect(TEMPLATES.M9.length).toBeGreaterThan(0);
    });

    it("should include maintenance and monitoring items", () => {
      const m9Items = TEMPLATES.M9;
      const maintenanceItems = m9Items.filter(
        item => item.item.includes("维护") || 
                item.item.includes("监控") ||
                item.item.includes("OEE")
      );
      
      expect(maintenanceItems.length).toBeGreaterThan(0);
    });
  });
});
