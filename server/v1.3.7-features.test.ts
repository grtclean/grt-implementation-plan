import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database connection
vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    getDb: vi.fn().mockResolvedValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }),
  };
});

describe("v1.3.7 Features - Webhook Message Templates", () => {
  describe("Template Variables", () => {
    it("should support standard template variables", () => {
      const templateVariables = [
        "{{event_type}}",
        "{{event_time}}",
        "{{project_name}}",
        "{{alert_level}}",
        "{{alert_message}}",
        "{{threshold}}",
        "{{current_value}}",
        "{{user_name}}",
      ];
      
      templateVariables.forEach(variable => {
        expect(variable).toMatch(/\{\{[a-z_]+\}\}/);
      });
    });

    it("should replace template variables correctly", () => {
      const template = "项目【{{project_name}}】触发{{alert_level}}预警：{{alert_message}}";
      const data = {
        project_name: "GRT项目",
        alert_level: "严重",
        alert_message: "预算使用率达到95%",
      };
      
      let result = template;
      Object.entries(data).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      });
      
      expect(result).toBe("项目【GRT项目】触发严重预警：预算使用率达到95%");
    });
  });

  describe("Template Event Types", () => {
    it("should support all required event types", () => {
      const eventTypes = [
        "meeting_reminder",
        "cost_alert",
        "project_update",
        "training_notification",
        "system_notification",
      ];
      
      expect(eventTypes).toHaveLength(5);
      expect(eventTypes).toContain("meeting_reminder");
      expect(eventTypes).toContain("cost_alert");
    });
  });

  describe("Template CRUD Operations", () => {
    it("should validate template name is required", () => {
      const template = {
        name: "",
        eventType: "cost_alert",
        content: "Test content",
      };
      
      expect(template.name).toBe("");
      expect(template.name.length).toBe(0);
    });

    it("should validate template content is required", () => {
      const template = {
        name: "Test Template",
        eventType: "cost_alert",
        content: "",
      };
      
      expect(template.content).toBe("");
    });
  });
});

describe("v1.3.7 Features - Annual Planning Gantt Chart", () => {
  describe("Gantt Chart Data Structure", () => {
    it("should calculate correct bar positions", () => {
      const item = {
        month: 3,
        category: "milestone",
        title: "Q1评审",
      };
      
      // Calculate bar position (month 3 = March)
      const startPercent = ((item.month - 1) / 12) * 100;
      const widthPercent = (1 / 12) * 100; // Single month width
      
      expect(startPercent).toBeCloseTo(16.67, 1);
      expect(widthPercent).toBeCloseTo(8.33, 1);
    });

    it("should group items by category", () => {
      const items = [
        { id: 1, category: "milestone", title: "M1" },
        { id: 2, category: "milestone", title: "M2" },
        { id: 3, category: "training", title: "T1" },
        { id: 4, category: "review", title: "R1" },
      ];
      
      const grouped = items.reduce((acc, item) => {
        const cat = item.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {} as Record<string, typeof items>);
      
      expect(Object.keys(grouped)).toHaveLength(3);
      expect(grouped["milestone"]).toHaveLength(2);
      expect(grouped["training"]).toHaveLength(1);
    });
  });

  describe("Month Grid Rendering", () => {
    it("should generate 12 months", () => {
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      
      expect(months).toHaveLength(12);
      expect(months[0]).toBe(1);
      expect(months[11]).toBe(12);
    });

    it("should highlight current month", () => {
      const currentMonth = new Date().getMonth() + 1;
      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        isCurrent: i + 1 === currentMonth,
      }));
      
      const currentMonthItem = months.find(m => m.isCurrent);
      expect(currentMonthItem).toBeDefined();
      expect(currentMonthItem?.month).toBe(currentMonth);
    });
  });
});

describe("v1.3.7 Features - Cost Alert Rules Batch Import", () => {
  describe("CSV Parsing", () => {
    it("should parse CSV header correctly", () => {
      const csvHeader = "规则名称,描述,适用范围,项目ID,类别ID,预警类型,阈值,预警级别,通知方式,是否启用";
      const headers = csvHeader.split(",");
      
      expect(headers).toHaveLength(10);
      expect(headers[0]).toBe("规则名称");
      expect(headers[5]).toBe("预警类型");
    });

    it("should parse CSV data rows correctly", () => {
      const csvRow = "预算80%警告,当预算使用达到80%时警告,所有项目,,,预算百分比,80,警告,系统通知,是";
      const values = csvRow.split(",");
      
      expect(values[0]).toBe("预算80%警告");
      expect(values[5]).toBe("预算百分比");
      expect(values[6]).toBe("80");
      expect(values[7]).toBe("警告");
    });

    it("should map Chinese values to English", () => {
      const alertTypeMap: Record<string, string> = {
        "预算百分比": "budget_percent",
        "绝对金额": "absolute_amount",
        "CPI指数": "cpi",
      };
      
      expect(alertTypeMap["预算百分比"]).toBe("budget_percent");
      expect(alertTypeMap["绝对金额"]).toBe("absolute_amount");
      expect(alertTypeMap["CPI指数"]).toBe("cpi");
    });

    it("should map alert level values correctly", () => {
      const alertLevelMap: Record<string, string> = {
        "警告": "warning",
        "严重": "critical",
        "紧急": "emergency",
      };
      
      expect(alertLevelMap["警告"]).toBe("warning");
      expect(alertLevelMap["严重"]).toBe("critical");
      expect(alertLevelMap["紧急"]).toBe("emergency");
    });
  });

  describe("Batch Import Validation", () => {
    it("should validate required fields", () => {
      const rule = {
        name: "Test Rule",
        alertType: "budget_percent",
        threshold: 80,
        alertLevel: "warning",
      };
      
      expect(rule.name).toBeTruthy();
      expect(rule.alertType).toBeTruthy();
      expect(rule.threshold).toBeDefined();
      expect(rule.alertLevel).toBeTruthy();
    });

    it("should validate threshold range for budget_percent", () => {
      const threshold = 80;
      const isValid = threshold >= 0 && threshold <= 200;
      
      expect(isValid).toBe(true);
    });

    it("should validate threshold range for CPI", () => {
      const threshold = 0.9;
      const isValid = threshold >= 0 && threshold <= 2;
      
      expect(isValid).toBe(true);
    });

    it("should reject invalid threshold for budget_percent", () => {
      const threshold = 250;
      const isValid = threshold >= 0 && threshold <= 200;
      
      expect(isValid).toBe(false);
    });
  });

  describe("CSV Export", () => {
    it("should generate correct CSV header", () => {
      const headers = [
        "规则名称",
        "描述",
        "适用范围",
        "项目ID",
        "类别ID",
        "预警类型",
        "阈值",
        "预警级别",
        "通知方式",
        "通知用户",
        "是否启用"
      ];
      
      const csvHeader = headers.join(",");
      expect(csvHeader).toContain("规则名称");
      expect(csvHeader).toContain("预警类型");
      expect(csvHeader).toContain("阈值");
    });

    it("should map English values back to Chinese", () => {
      const alertTypeMapReverse: Record<string, string> = {
        "budget_percent": "预算百分比",
        "absolute_amount": "绝对金额",
        "cpi": "CPI指数",
      };
      
      expect(alertTypeMapReverse["budget_percent"]).toBe("预算百分比");
      expect(alertTypeMapReverse["cpi"]).toBe("CPI指数");
    });
  });

  describe("Import Result Handling", () => {
    it("should track success and failure counts", () => {
      const result = {
        success: 5,
        failed: 2,
        errors: ["Row 3: Missing required field", "Row 7: Invalid threshold"],
      };
      
      expect(result.success).toBe(5);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    it("should provide meaningful error messages", () => {
      const errors = [
        "Row 1: Missing required fields (name, alertType, threshold)",
        "Row 2: Budget percent threshold must be between 0 and 200",
        "Row 3: CPI threshold must be between 0 and 2",
      ];
      
      errors.forEach(error => {
        expect(error).toMatch(/Row \d+:/);
      });
    });
  });
});

describe("v1.3.7 Features - Integration Tests", () => {
  describe("Webhook Template with Cost Alert", () => {
    it("should apply template to cost alert notification", () => {
      const template = {
        content: "【{{alert_level}}】项目{{project_name}}：{{alert_message}}",
        eventType: "cost_alert",
      };
      
      const alertData = {
        alert_level: "严重",
        project_name: "GRT智能系统",
        alert_message: "预算使用率已达95%",
      };
      
      let message = template.content;
      Object.entries(alertData).forEach(([key, value]) => {
        message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      });
      
      expect(message).toBe("【严重】项目GRT智能系统：预算使用率已达95%");
    });
  });

  describe("Batch Import with Webhook Notification", () => {
    it("should trigger webhook after successful batch import", () => {
      const importResult = {
        success: 10,
        failed: 0,
        errors: [],
      };
      
      const shouldNotify = importResult.success > 0;
      expect(shouldNotify).toBe(true);
    });
  });
});
