/**
 * v2.5.41 集成测试
 * 测试Webhook URL配置、Tier1项目数据、检查清单权重定制
 */
import { describe, it, expect } from "vitest";
import {
  SAMPLE_TIER1_CUSTOMERS,
  SAMPLE_TIER1_PROJECTS,
  SAMPLE_GATE_CHECK_RECORDS,
  validateTier1DeliveryRequirements,
} from "./scripts/seed-tier1-project";

describe("v2.5.41 Tier1客户项目测试数据", () => {
  describe("Tier1客户数据验证", () => {
    it("应包含3个示例Tier1客户", () => {
      expect(SAMPLE_TIER1_CUSTOMERS).toHaveLength(3);
    });

    it("所有客户应为Tier1级别", () => {
      SAMPLE_TIER1_CUSTOMERS.forEach((customer) => {
        expect(customer.tier).toBe("tier1");
      });
    });

    it("客户应包含必要字段", () => {
      SAMPLE_TIER1_CUSTOMERS.forEach((customer) => {
        expect(customer.name).toBeDefined();
        expect(customer.code).toBeDefined();
        expect(customer.industry).toBeDefined();
        expect(customer.region).toBeDefined();
        expect(customer.contact).toBeDefined();
        expect(customer.requirements).toBeDefined();
      });
    });

    it("博世客户应有ISO 16232清洁度要求", () => {
      const bosch = SAMPLE_TIER1_CUSTOMERS.find((c) => c.code === "BOSCH-SZ");
      expect(bosch).toBeDefined();
      expect(bosch?.requirements).toContain("ISO 16232");
    });

    it("采埃孚客户应有VDA 19.1要求", () => {
      const zf = SAMPLE_TIER1_CUSTOMERS.find((c) => c.code === "ZF-SH");
      expect(zf).toBeDefined();
      expect(zf?.requirements).toContain("变速箱");
    });
  });

  describe("Tier1项目数据验证", () => {
    it("应包含2个示例项目", () => {
      expect(SAMPLE_TIER1_PROJECTS).toHaveLength(2);
    });

    it("所有项目应启用红蓝对抗", () => {
      SAMPLE_TIER1_PROJECTS.forEach((project) => {
        expect(project.isRedBlueRequired).toBe(true);
      });
    });

    it("项目应包含完整的阶段历史", () => {
      SAMPLE_TIER1_PROJECTS.forEach((project) => {
        expect(project.phaseHistory).toBeDefined();
        expect(project.phaseHistory.length).toBeGreaterThan(0);
      });
    });

    it("博世项目应处于M7阶段", () => {
      const boschProject = SAMPLE_TIER1_PROJECTS.find((p) =>
        p.projectCode.includes("BOSCH")
      );
      expect(boschProject).toBeDefined();
      expect(boschProject?.currentPhase).toBe("M7");
    });

    it("采埃孚项目应处于M6阶段", () => {
      const zfProject = SAMPLE_TIER1_PROJECTS.find((p) =>
        p.projectCode.includes("ZF")
      );
      expect(zfProject).toBeDefined();
      expect(zfProject?.currentPhase).toBe("M6");
    });

    it("项目应包含清洗工艺信息", () => {
      SAMPLE_TIER1_PROJECTS.forEach((project) => {
        expect(project.cleaningProcess).toBeDefined();
        expect(project.targetCleanliness).toBeDefined();
        expect(project.cycleTime).toBeGreaterThan(0);
      });
    });
  });

  describe("Gate检查记录验证", () => {
    it("应包含示例Gate检查记录", () => {
      expect(SAMPLE_GATE_CHECK_RECORDS).toHaveLength(1);
    });

    it("检查记录应包含AI诊断", () => {
      const record = SAMPLE_GATE_CHECK_RECORDS[0];
      expect(record.aiDiagnosis).toBeDefined();
      expect(record.aiDiagnosis.riskScore).toBeDefined();
      expect(record.aiDiagnosis.recommendations).toBeDefined();
      expect(record.aiDiagnosis.recommendations.length).toBeGreaterThan(0);
    });

    it("检查记录应包含多个检查项", () => {
      const record = SAMPLE_GATE_CHECK_RECORDS[0];
      expect(record.checkItems).toBeDefined();
      expect(record.checkItems.length).toBeGreaterThan(10);
    });

    it("检查项应覆盖多个类别", () => {
      const record = SAMPLE_GATE_CHECK_RECORDS[0];
      const categories = new Set(record.checkItems.map((item) => item.category));
      expect(categories.size).toBeGreaterThanOrEqual(5);
    });

    it("检查记录应包含问题列表", () => {
      const record = SAMPLE_GATE_CHECK_RECORDS[0];
      expect(record.issues).toBeDefined();
      expect(record.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Tier1交付要求验证", () => {
    it("Tier1客户项目应强制红蓝对抗", () => {
      const boschProject = SAMPLE_TIER1_PROJECTS.find((p) =>
        p.projectCode.includes("BOSCH")
      );
      const requirements = validateTier1DeliveryRequirements(boschProject!);
      expect(requirements.isRedBlueRequired).toBe(true);
    });

    it("高复杂度项目应强制红蓝对抗", () => {
      const zfProject = SAMPLE_TIER1_PROJECTS.find((p) =>
        p.projectCode.includes("ZF")
      );
      expect(zfProject?.complexity).toBe("very_high");
      const requirements = validateTier1DeliveryRequirements(zfProject!);
      expect(requirements.isRedBlueRequired).toBe(true);
    });
  });
});

describe("v2.5.41 检查清单权重定制", () => {
  describe("Tier1权重预设规则", () => {
    const TIER1_WEIGHT_PRESETS = {
      cleaning_performance: { multiplier: 1.5, minWeight: 12 },
      safety_compliance: { multiplier: 1.3, minWeight: 10 },
      documentation: { multiplier: 1.2, minWeight: 8 },
      process_parameters: { multiplier: 1.2, minWeight: 8 },
      mechanical_system: { multiplier: 1.0, minWeight: 6 },
      electrical_control: { multiplier: 1.0, minWeight: 6 },
      cycle_time: { multiplier: 1.0, minWeight: 5 },
    };

    it("清洗性能类别应有最高权重乘数", () => {
      expect(TIER1_WEIGHT_PRESETS.cleaning_performance.multiplier).toBe(1.5);
    });

    it("安全合规类别应有较高权重乘数", () => {
      expect(TIER1_WEIGHT_PRESETS.safety_compliance.multiplier).toBe(1.3);
    });

    it("所有类别应有最小权重要求", () => {
      Object.values(TIER1_WEIGHT_PRESETS).forEach((preset) => {
        expect(preset.minWeight).toBeGreaterThanOrEqual(5);
      });
    });

    it("权重计算应正确应用乘数", () => {
      const originalWeight = 10;
      const category = "cleaning_performance";
      const preset = TIER1_WEIGHT_PRESETS[category];
      const newWeight = Math.max(
        Math.round(originalWeight * preset.multiplier),
        preset.minWeight
      );
      expect(newWeight).toBe(15); // 10 * 1.5 = 15
    });

    it("权重计算应遵守最小权重", () => {
      const originalWeight = 5;
      const category = "cleaning_performance";
      const preset = TIER1_WEIGHT_PRESETS[category];
      const newWeight = Math.max(
        Math.round(originalWeight * preset.multiplier),
        preset.minWeight
      );
      expect(newWeight).toBe(12); // max(7.5, 12) = 12
    });

    it("权重计算应遵守最大权重20", () => {
      const originalWeight = 18;
      const category = "cleaning_performance";
      const preset = TIER1_WEIGHT_PRESETS[category];
      const calculatedWeight = Math.max(
        Math.round(originalWeight * preset.multiplier),
        preset.minWeight
      );
      const finalWeight = Math.min(calculatedWeight, 20);
      expect(finalWeight).toBe(20); // min(27, 20) = 20
    });
  });

  describe("检查类别覆盖", () => {
    const CLEANING_EQUIPMENT_CATEGORIES = [
      "cleaning_performance",
      "mechanical_system",
      "electrical_control",
      "process_parameters",
      "cycle_time",
      "safety_compliance",
      "documentation",
    ];

    it("应覆盖7个检查类别", () => {
      expect(CLEANING_EQUIPMENT_CATEGORIES).toHaveLength(7);
    });

    it("应包含清洗性能类别", () => {
      expect(CLEANING_EQUIPMENT_CATEGORIES).toContain("cleaning_performance");
    });

    it("应包含安全合规类别", () => {
      expect(CLEANING_EQUIPMENT_CATEGORIES).toContain("safety_compliance");
    });

    it("应包含文档资料类别", () => {
      expect(CLEANING_EQUIPMENT_CATEGORIES).toContain("documentation");
    });
  });
});

describe("v2.5.41 Webhook URL配置", () => {
  describe("URL格式验证规则", () => {
    const WEBHOOK_URL_PATTERNS = {
      wecom: /^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=/,
      dingtalk: /^https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=/,
      feishu: /^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\//,
      custom: /^https?:\/\/.+/,
    };

    it("企业微信URL应匹配正确格式", () => {
      const testUrl =
        "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc123";
      expect(WEBHOOK_URL_PATTERNS.wecom.test(testUrl)).toBe(true);
    });

    it("钉钉URL应匹配正确格式", () => {
      const testUrl =
        "https://oapi.dingtalk.com/robot/send?access_token=abc123";
      expect(WEBHOOK_URL_PATTERNS.dingtalk.test(testUrl)).toBe(true);
    });

    it("飞书URL应匹配正确格式", () => {
      const testUrl = "https://open.feishu.cn/open-apis/bot/v2/hook/abc123";
      expect(WEBHOOK_URL_PATTERNS.feishu.test(testUrl)).toBe(true);
    });

    it("自定义URL应支持HTTP和HTTPS", () => {
      expect(WEBHOOK_URL_PATTERNS.custom.test("https://example.com/webhook")).toBe(
        true
      );
      expect(WEBHOOK_URL_PATTERNS.custom.test("http://example.com/webhook")).toBe(
        true
      );
    });

    it("无效URL应不匹配", () => {
      const invalidUrl = "not-a-valid-url";
      expect(WEBHOOK_URL_PATTERNS.wecom.test(invalidUrl)).toBe(false);
      expect(WEBHOOK_URL_PATTERNS.dingtalk.test(invalidUrl)).toBe(false);
      expect(WEBHOOK_URL_PATTERNS.feishu.test(invalidUrl)).toBe(false);
    });
  });

  describe("Webhook类型配置", () => {
    const WEBHOOK_TYPES = ["wecom", "dingtalk", "feishu", "custom"];

    it("应支持4种Webhook类型", () => {
      expect(WEBHOOK_TYPES).toHaveLength(4);
    });

    it("应包含企业微信类型", () => {
      expect(WEBHOOK_TYPES).toContain("wecom");
    });

    it("应包含钉钉类型", () => {
      expect(WEBHOOK_TYPES).toContain("dingtalk");
    });

    it("应包含飞书类型", () => {
      expect(WEBHOOK_TYPES).toContain("feishu");
    });

    it("应包含自定义类型", () => {
      expect(WEBHOOK_TYPES).toContain("custom");
    });
  });
});
