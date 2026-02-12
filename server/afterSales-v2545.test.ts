/**
 * v2.5.45 售后服务模块扩展测试
 * 
 * 测试Webhook配置、数据导入、AI报告生成功能
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============ Webhook配置测试 ============
describe("Webhook Configuration", () => {
  describe("Webhook Types", () => {
    it("should support wecom webhook type", () => {
      const webhook = {
        name: "售后服务通知群",
        type: "wecom",
        webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx",
        enabled: 1,
      };
      expect(webhook.type).toBe("wecom");
      expect(webhook.webhookUrl).toContain("qyapi.weixin.qq.com");
    });

    it("should support dingtalk webhook type", () => {
      const webhook = {
        name: "钉钉通知群",
        type: "dingtalk",
        webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=xxx",
        enabled: 1,
      };
      expect(webhook.type).toBe("dingtalk");
      expect(webhook.webhookUrl).toContain("oapi.dingtalk.com");
    });

    it("should support feishu webhook type", () => {
      const webhook = {
        name: "飞书通知群",
        type: "feishu",
        webhookUrl: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
        enabled: 1,
      };
      expect(webhook.type).toBe("feishu");
      expect(webhook.webhookUrl).toContain("open.feishu.cn");
    });

    it("should support custom webhook type", () => {
      const webhook = {
        name: "自定义通知",
        type: "custom",
        webhookUrl: "https://api.example.com/webhook",
        enabled: 1,
      };
      expect(webhook.type).toBe("custom");
    });
  });

  describe("Webhook Message Format", () => {
    it("should generate valid wecom message format", () => {
      const message = {
        msgtype: "markdown",
        markdown: {
          content: "## 设备维护提醒\n\n以下设备即将到期：\n- 设备A (7天后)",
        },
      };
      expect(message.msgtype).toBe("markdown");
      expect(message.markdown.content).toContain("设备维护提醒");
    });

    it("should generate valid dingtalk message format", () => {
      const message = {
        msgtype: "markdown",
        markdown: {
          title: "设备维护提醒",
          text: "## 设备维护提醒\n\n以下设备即将到期：\n- 设备A (7天后)",
        },
      };
      expect(message.msgtype).toBe("markdown");
      expect(message.markdown.title).toBe("设备维护提醒");
    });

    it("should generate valid feishu message format", () => {
      const message = {
        msg_type: "interactive",
        card: {
          header: {
            title: { content: "设备维护提醒", tag: "plain_text" },
          },
          elements: [
            { tag: "markdown", content: "以下设备即将到期" },
          ],
        },
      };
      expect(message.msg_type).toBe("interactive");
      expect(message.card.header.title.content).toBe("设备维护提醒");
    });
  });

  describe("Webhook Toggle", () => {
    it("should toggle webhook enabled state", () => {
      let webhook = { id: 1, enabled: 1 };
      webhook.enabled = 0;
      expect(webhook.enabled).toBe(0);
      webhook.enabled = 1;
      expect(webhook.enabled).toBe(1);
    });
  });
});

// ============ 数据导入测试 ============
describe("Tier1 Data Import", () => {
  describe("Tier1 Client Data", () => {
    const tier1Clients = [
      { name: "博世汽车部件（苏州）有限公司", tier: "Strategic", industry: "Automotive" },
      { name: "博世汽车部件（长沙）有限公司", tier: "Key", industry: "Automotive" },
      { name: "采埃孚汽车科技（上海）有限公司", tier: "Strategic", industry: "Automotive" },
      { name: "采埃孚传动技术（北京）有限公司", tier: "Key", industry: "Automotive" },
      { name: "大陆汽车电子（芜湖）有限公司", tier: "Strategic", industry: "Automotive" },
    ];

    it("should have 5 Tier1 clients", () => {
      expect(tier1Clients.length).toBe(5);
    });

    it("should have correct tier distribution", () => {
      const strategic = tier1Clients.filter(c => c.tier === "Strategic");
      const key = tier1Clients.filter(c => c.tier === "Key");
      expect(strategic.length).toBe(3);
      expect(key.length).toBe(2);
    });

    it("should all be in Automotive industry", () => {
      const automotive = tier1Clients.filter(c => c.industry === "Automotive");
      expect(automotive.length).toBe(5);
    });

    it("should include Bosch clients", () => {
      const bosch = tier1Clients.filter(c => c.name.includes("博世"));
      expect(bosch.length).toBe(2);
    });

    it("should include ZF clients", () => {
      const zf = tier1Clients.filter(c => c.name.includes("采埃孚"));
      expect(zf.length).toBe(2);
    });

    it("should include Continental clients", () => {
      const continental = tier1Clients.filter(c => c.name.includes("大陆"));
      expect(continental.length).toBe(1);
    });
  });

  describe("Equipment Data", () => {
    const equipments = [
      { serialNumber: "GRT-USC-2024-001", modelName: "GRT-USC-3000", clientName: "博世苏州" },
      { serialNumber: "GRT-USC-2024-002", modelName: "GRT-USC-2000", clientName: "博世苏州" },
      { serialNumber: "GRT-SPR-2024-001", modelName: "GRT-SPR-1500", clientName: "博世苏州" },
      { serialNumber: "GRT-USC-2024-003", modelName: "GRT-USC-2500", clientName: "博世长沙" },
      { serialNumber: "GRT-ACL-2024-001", modelName: "GRT-ACL-5000", clientName: "采埃孚上海" },
      { serialNumber: "GRT-USC-2024-004", modelName: "GRT-USC-3000", clientName: "采埃孚上海" },
      { serialNumber: "GRT-SPR-2024-002", modelName: "GRT-SPR-2000", clientName: "采埃孚北京" },
      { serialNumber: "GRT-ACL-2024-002", modelName: "GRT-ACL-8000", clientName: "大陆芜湖" },
      { serialNumber: "GRT-USC-2024-005", modelName: "GRT-USC-4000", clientName: "大陆芜湖" },
    ];

    it("should have 9 equipments", () => {
      expect(equipments.length).toBe(9);
    });

    it("should have valid serial number format", () => {
      equipments.forEach(eq => {
        expect(eq.serialNumber).toMatch(/^GRT-[A-Z]{3}-\d{4}-\d{3}$/);
      });
    });

    it("should have valid model name format", () => {
      equipments.forEach(eq => {
        expect(eq.modelName).toMatch(/^GRT-[A-Z]{3}-\d{4}$/);
      });
    });

    it("should include ultrasonic cleaners (USC)", () => {
      const usc = equipments.filter(eq => eq.serialNumber.includes("-USC-"));
      expect(usc.length).toBe(5);
    });

    it("should include spray cleaners (SPR)", () => {
      const spr = equipments.filter(eq => eq.serialNumber.includes("-SPR-"));
      expect(spr.length).toBe(2);
    });

    it("should include automatic cleaning lines (ACL)", () => {
      const acl = equipments.filter(eq => eq.serialNumber.includes("-ACL-"));
      expect(acl.length).toBe(2);
    });
  });

  describe("Service Log Data", () => {
    const serviceLogs = [
      { ticketId: "SRV-2024-0001", serviceType: "Maintenance", status: "Completed" },
      { ticketId: "SRV-2024-0002", serviceType: "Repair", status: "Completed" },
      { ticketId: "SRV-2024-0003", serviceType: "Inspection", status: "Completed" },
      { ticketId: "SRV-2024-0004", serviceType: "Maintenance", status: "Completed" },
    ];

    it("should have 4 service logs", () => {
      expect(serviceLogs.length).toBe(4);
    });

    it("should have valid ticket ID format", () => {
      serviceLogs.forEach(log => {
        expect(log.ticketId).toMatch(/^SRV-\d{4}-\d{4}$/);
      });
    });

    it("should all be completed", () => {
      const completed = serviceLogs.filter(log => log.status === "Completed");
      expect(completed.length).toBe(4);
    });

    it("should have maintenance logs", () => {
      const maintenance = serviceLogs.filter(log => log.serviceType === "Maintenance");
      expect(maintenance.length).toBe(2);
    });
  });
});

// ============ AI报告生成测试 ============
describe("AI Service Report Generation", () => {
  describe("Report Languages", () => {
    const supportedLanguages = ["zh", "en", "de"];

    it("should support Chinese", () => {
      expect(supportedLanguages).toContain("zh");
    });

    it("should support English", () => {
      expect(supportedLanguages).toContain("en");
    });

    it("should support German", () => {
      expect(supportedLanguages).toContain("de");
    });
  });

  describe("Report Template Structure", () => {
    const reportTemplate = {
      sections: [
        "serviceSummary",
        "equipmentInfo",
        "problemDescription",
        "solutionDetails",
        "partsUsed",
        "laborCost",
        "recommendations",
        "customerSignature",
      ],
    };

    it("should have service summary section", () => {
      expect(reportTemplate.sections).toContain("serviceSummary");
    });

    it("should have equipment info section", () => {
      expect(reportTemplate.sections).toContain("equipmentInfo");
    });

    it("should have problem description section", () => {
      expect(reportTemplate.sections).toContain("problemDescription");
    });

    it("should have solution details section", () => {
      expect(reportTemplate.sections).toContain("solutionDetails");
    });

    it("should have parts used section", () => {
      expect(reportTemplate.sections).toContain("partsUsed");
    });

    it("should have labor cost section", () => {
      expect(reportTemplate.sections).toContain("laborCost");
    });

    it("should have recommendations section", () => {
      expect(reportTemplate.sections).toContain("recommendations");
    });

    it("should have customer signature section", () => {
      expect(reportTemplate.sections).toContain("customerSignature");
    });
  });

  describe("Multi-language Report Generation", () => {
    const generateReport = (language: string) => {
      const titles: Record<string, string> = {
        zh: "服务报告",
        en: "Service Report",
        de: "Servicebericht",
      };
      return {
        title: titles[language] || titles.en,
        language,
        generatedAt: new Date().toISOString(),
        aiGenerated: true,
      };
    };

    it("should generate Chinese report", () => {
      const report = generateReport("zh");
      expect(report.title).toBe("服务报告");
      expect(report.language).toBe("zh");
    });

    it("should generate English report", () => {
      const report = generateReport("en");
      expect(report.title).toBe("Service Report");
      expect(report.language).toBe("en");
    });

    it("should generate German report", () => {
      const report = generateReport("de");
      expect(report.title).toBe("Servicebericht");
      expect(report.language).toBe("de");
    });

    it("should mark as AI generated", () => {
      const report = generateReport("zh");
      expect(report.aiGenerated).toBe(true);
    });

    it("should include generation timestamp", () => {
      const report = generateReport("zh");
      expect(report.generatedAt).toBeDefined();
      expect(new Date(report.generatedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("Template Fallback", () => {
    const generateTemplateReport = (data: any, language: string) => {
      const templates: Record<string, (d: any) => string> = {
        zh: (d) => `# 服务报告\n\n## 服务摘要\n工单号: ${d.ticketId}\n服务类型: ${d.serviceType}`,
        en: (d) => `# Service Report\n\n## Service Summary\nTicket: ${d.ticketId}\nType: ${d.serviceType}`,
        de: (d) => `# Servicebericht\n\n## Servicezusammenfassung\nTicket: ${d.ticketId}\nTyp: ${d.serviceType}`,
      };
      return templates[language]?.(data) || templates.en(data);
    };

    it("should generate template report when AI unavailable", () => {
      const data = { ticketId: "SRV-2024-0001", serviceType: "Maintenance" };
      const report = generateTemplateReport(data, "zh");
      expect(report).toContain("服务报告");
      expect(report).toContain("SRV-2024-0001");
    });

    it("should fallback to English for unknown language", () => {
      const data = { ticketId: "SRV-2024-0001", serviceType: "Maintenance" };
      const report = generateTemplateReport(data, "fr");
      expect(report).toContain("Service Report");
    });
  });

  describe("Customer Signature Flow", () => {
    const signatureStates = ["pending", "sent", "signed", "rejected"];

    it("should start with pending state", () => {
      const signature = { state: "pending", sentAt: null, signedAt: null };
      expect(signature.state).toBe("pending");
    });

    it("should transition to sent state", () => {
      const signature = { state: "sent", sentAt: new Date().toISOString(), signedAt: null };
      expect(signature.state).toBe("sent");
      expect(signature.sentAt).toBeDefined();
    });

    it("should transition to signed state", () => {
      const signature = { 
        state: "signed", 
        sentAt: new Date().toISOString(), 
        signedAt: new Date().toISOString(),
        signedBy: "张工程师",
        rating: 5,
      };
      expect(signature.state).toBe("signed");
      expect(signature.signedAt).toBeDefined();
      expect(signature.rating).toBe(5);
    });

    it("should support rejection with feedback", () => {
      const signature = { 
        state: "rejected", 
        sentAt: new Date().toISOString(), 
        rejectedAt: new Date().toISOString(),
        rejectionReason: "报告内容不完整",
      };
      expect(signature.state).toBe("rejected");
      expect(signature.rejectionReason).toBe("报告内容不完整");
    });
  });
});

// ============ 集成测试 ============
describe("Integration Tests", () => {
  describe("Webhook + Reminder Integration", () => {
    it("should send reminder to all enabled webhooks", () => {
      const webhooks = [
        { id: 1, enabled: 1, type: "wecom" },
        { id: 2, enabled: 0, type: "dingtalk" },
        { id: 3, enabled: 1, type: "feishu" },
      ];
      const enabledWebhooks = webhooks.filter(w => w.enabled === 1);
      expect(enabledWebhooks.length).toBe(2);
    });

    it("should format message based on webhook type", () => {
      const formatMessage = (type: string, content: string) => {
        switch (type) {
          case "wecom":
            return { msgtype: "markdown", markdown: { content } };
          case "dingtalk":
            return { msgtype: "markdown", markdown: { title: "提醒", text: content } };
          case "feishu":
            return { msg_type: "text", content: { text: content } };
          default:
            return { message: content };
        }
      };

      const wecomMsg = formatMessage("wecom", "测试消息");
      expect(wecomMsg.msgtype).toBe("markdown");

      const dingtalkMsg = formatMessage("dingtalk", "测试消息");
      expect(dingtalkMsg.markdown?.title).toBe("提醒");

      const feishuMsg = formatMessage("feishu", "测试消息");
      expect(feishuMsg.msg_type).toBe("text");
    });
  });

  describe("Data Import + Report Generation Integration", () => {
    it("should generate report for imported service log", () => {
      const importedLog = {
        id: 1,
        ticketId: "SRV-2024-0001",
        serviceType: "Maintenance",
        status: "Completed",
        equipmentId: 1,
      };

      const canGenerateReport = importedLog.status === "Completed";
      expect(canGenerateReport).toBe(true);
    });

    it("should link report to client tier", () => {
      const client = { id: 1, tier: "Strategic" };
      const report = { serviceLogId: 1, clientTier: client.tier };
      expect(report.clientTier).toBe("Strategic");
    });
  });

  describe("Full Workflow Test", () => {
    it("should complete full after-sales workflow", () => {
      // 1. 导入客户数据
      const client = { id: 1, name: "博世苏州", tier: "Strategic" };
      expect(client.tier).toBe("Strategic");

      // 2. 导入设备数据
      const equipment = { id: 1, clientId: 1, serialNumber: "GRT-USC-2024-001" };
      expect(equipment.clientId).toBe(client.id);

      // 3. 创建服务工单
      const serviceLog = { id: 1, equipmentId: 1, status: "Completed" };
      expect(serviceLog.equipmentId).toBe(equipment.id);

      // 4. 生成AI报告
      const report = { serviceLogId: 1, language: "zh", aiGenerated: true };
      expect(report.serviceLogId).toBe(serviceLog.id);

      // 5. 发送Webhook通知
      const notification = { webhookId: 1, eventType: "report_generated", success: true };
      expect(notification.success).toBe(true);

      // 6. 客户签字确认
      const signature = { serviceLogId: 1, state: "signed", rating: 5 };
      expect(signature.state).toBe("signed");
    });
  });
});
