/**
 * v2.5.44 售后服务模块扩展单元测试
 * 
 * 测试内容：
 * 1. Tier1客户和设备种子数据
 * 2. 维护提醒通知服务
 * 3. AI服务报告生成服务
 */

import { describe, it, expect } from "vitest";
import { 
  TIER1_CLIENTS, 
  TIER1_EQUIPMENTS, 
  TIER1_SERVICE_LOGS 
} from "./seed/seed-after-sales-tier1";
import { 
  MaintenanceReminderService,
  REMINDER_CONFIG,
  type MaintenanceReminder 
} from "./services/maintenance-reminder.service";
import { 
  ServiceReportGeneratorService,
  REPORT_LANGUAGES,
  type ServiceReportData 
} from "./services/service-report-generator.service";

// ============ Tier1种子数据测试 ============
describe("Tier1 Seed Data", () => {
  describe("TIER1_CLIENTS", () => {
    it("should have 5 Tier1 clients", () => {
      expect(TIER1_CLIENTS.length).toBe(5);
    });
    
    it("should have Strategic tier clients", () => {
      const strategicClients = TIER1_CLIENTS.filter(c => c.tier === "Strategic");
      expect(strategicClients.length).toBe(3);
    });
    
    it("should have Key tier clients", () => {
      const keyClients = TIER1_CLIENTS.filter(c => c.tier === "Key");
      expect(keyClients.length).toBe(2);
    });
    
    it("should include Bosch Suzhou", () => {
      const bosch = TIER1_CLIENTS.find(c => c.name.includes("博世") && c.name.includes("苏州"));
      expect(bosch).toBeDefined();
      expect(bosch?.tier).toBe("Strategic");
      expect(bosch?.slaLevel).toBe("Platinum");
    });
    
    it("should include ZF Shanghai", () => {
      const zf = TIER1_CLIENTS.find(c => c.name.includes("采埃孚") && c.name.includes("中国"));
      expect(zf).toBeDefined();
      expect(zf?.tier).toBe("Strategic");
    });
    
    it("should include Continental Wuhu", () => {
      const conti = TIER1_CLIENTS.find(c => c.name.includes("大陆") && c.name.includes("芜湖"));
      expect(conti).toBeDefined();
      expect(conti?.tier).toBe("Strategic");
    });
    
    it("should have valid SLA levels", () => {
      const validSlaLevels = ["Platinum", "Gold", "Silver", "Bronze"];
      TIER1_CLIENTS.forEach(client => {
        if (client.slaLevel) {
          expect(validSlaLevels).toContain(client.slaLevel);
        }
      });
    });
    
    it("should have response time for Strategic clients", () => {
      const strategicClients = TIER1_CLIENTS.filter(c => c.tier === "Strategic");
      strategicClients.forEach(client => {
        expect(client.responseTimeHours).toBe(4);
      });
    });
  });
  
  describe("TIER1_EQUIPMENTS", () => {
    it("should have equipments for all clients", () => {
      const clientNames = Object.keys(TIER1_EQUIPMENTS);
      expect(clientNames.length).toBe(5);
    });
    
    it("should have unique serial numbers", () => {
      const allSerialNumbers: string[] = [];
      Object.values(TIER1_EQUIPMENTS).forEach(equipments => {
        equipments.forEach(eq => allSerialNumbers.push(eq.serialNumber));
      });
      const uniqueSerialNumbers = new Set(allSerialNumbers);
      expect(uniqueSerialNumbers.size).toBe(allSerialNumbers.length);
    });
    
    it("should have valid equipment types", () => {
      const validTypes = ["超声波清洗机", "喷淋清洗机", "全自动清洗线", "重型零件清洗机", 
                         "齿轮清洗机", "ESD防护清洗机", "传感器清洗机", "电机零件清洗机", "商用车零件清洗机"];
      Object.values(TIER1_EQUIPMENTS).forEach(equipments => {
        equipments.forEach(eq => {
          expect(validTypes).toContain(eq.equipmentType);
        });
      });
    });
    
    it("should have GRT model names", () => {
      Object.values(TIER1_EQUIPMENTS).forEach(equipments => {
        equipments.forEach(eq => {
          expect(eq.modelName).toMatch(/^GRT-/);
        });
      });
    });
    
    it("should have maintenance cycle configured", () => {
      Object.values(TIER1_EQUIPMENTS).forEach(equipments => {
        equipments.forEach(eq => {
          expect(eq.maintenanceCycleMonths).toBeGreaterThan(0);
        });
      });
    });
    
    it("should have technical specs as JSON", () => {
      Object.values(TIER1_EQUIPMENTS).forEach(equipments => {
        equipments.forEach(eq => {
          expect(() => JSON.parse(eq.technicalSpecs)).not.toThrow();
        });
      });
    });
  });
  
  describe("TIER1_SERVICE_LOGS", () => {
    it("should have service logs", () => {
      expect(TIER1_SERVICE_LOGS.length).toBeGreaterThan(0);
    });
    
    it("should have valid service types", () => {
      const validTypes = ["Installation", "Maintenance", "Repair", "Inspection", "Upgrade", "Training"];
      TIER1_SERVICE_LOGS.forEach(log => {
        expect(validTypes).toContain(log.serviceType);
      });
    });
    
    it("should have completed status", () => {
      TIER1_SERVICE_LOGS.forEach(log => {
        expect(log.status).toBe("Completed");
      });
    });
    
    it("should have satisfaction ratings", () => {
      TIER1_SERVICE_LOGS.forEach(log => {
        expect(log.satisfactionRating).toBeGreaterThanOrEqual(1);
        expect(log.satisfactionRating).toBeLessThanOrEqual(5);
      });
    });
    
    it("should reference valid equipment serial numbers", () => {
      const allSerialNumbers: string[] = [];
      Object.values(TIER1_EQUIPMENTS).forEach(equipments => {
        equipments.forEach(eq => allSerialNumbers.push(eq.serialNumber));
      });
      
      TIER1_SERVICE_LOGS.forEach(log => {
        expect(allSerialNumbers).toContain(log.equipmentSerialNumber);
      });
    });
  });
});

// ============ 维护提醒服务测试 ============
describe("MaintenanceReminderService", () => {
  describe("REMINDER_CONFIG", () => {
    it("should have reminder days configured", () => {
      expect(REMINDER_CONFIG.REMINDER_DAYS).toEqual([30, 14, 7, 3, 1]);
    });
    
    it("should have reminder levels for each day threshold", () => {
      REMINDER_CONFIG.REMINDER_DAYS.forEach(days => {
        expect(REMINDER_CONFIG.REMINDER_LEVELS[days]).toBeDefined();
      });
    });
    
    it("should have tier priority configured", () => {
      expect(REMINDER_CONFIG.TIER_PRIORITY.Strategic).toBe(1);
      expect(REMINDER_CONFIG.TIER_PRIORITY.Key).toBe(2);
      expect(REMINDER_CONFIG.TIER_PRIORITY.Standard).toBe(3);
    });
  });
  
  describe("generateWeChatMessage", () => {
    it("should return empty message for no reminders", () => {
      const message = MaintenanceReminderService.generateWeChatMessage([]);
      expect(message).toContain("暂无即将到期");
    });
    
    it("should generate message with reminder count", () => {
      const reminders: MaintenanceReminder[] = [
        {
          equipmentId: 1,
          serialNumber: "GRT-TEST-001",
          modelName: "GRT-5000-PRO",
          clientId: 1,
          clientName: "Test Client",
          clientTier: "Strategic",
          nextDueDate: "2025-02-15",
          daysUntilDue: 15,
          reminderLevel: "warning",
        },
      ];
      
      const message = MaintenanceReminderService.generateWeChatMessage(reminders);
      expect(message).toContain("设备维护提醒");
      expect(message).toContain("1 台设备");
      expect(message).toContain("GRT-TEST-001");
    });
    
    it("should highlight overdue equipment", () => {
      const reminders: MaintenanceReminder[] = [
        {
          equipmentId: 1,
          serialNumber: "GRT-OVERDUE-001",
          modelName: "GRT-3000-STD",
          clientId: 1,
          clientName: "Test Client",
          clientTier: "Key",
          nextDueDate: "2025-01-20",
          daysUntilDue: -5,
          reminderLevel: "overdue",
        },
      ];
      
      const message = MaintenanceReminderService.generateWeChatMessage(reminders);
      expect(message).toContain("已逾期");
      expect(message).toContain("🔴");
    });
    
    it("should group by client", () => {
      const reminders: MaintenanceReminder[] = [
        {
          equipmentId: 1,
          serialNumber: "GRT-A-001",
          modelName: "GRT-5000",
          clientId: 1,
          clientName: "Client A",
          clientTier: "Strategic",
          nextDueDate: "2025-02-15",
          daysUntilDue: 15,
          reminderLevel: "warning",
        },
        {
          equipmentId: 2,
          serialNumber: "GRT-B-001",
          modelName: "GRT-3000",
          clientId: 2,
          clientName: "Client B",
          clientTier: "Key",
          nextDueDate: "2025-02-20",
          daysUntilDue: 20,
          reminderLevel: "info",
        },
      ];
      
      const message = MaintenanceReminderService.generateWeChatMessage(reminders);
      expect(message).toContain("Client A");
      expect(message).toContain("Client B");
    });
  });
  
  describe("generateDingTalkMessage", () => {
    it("should return markdown message type", () => {
      const reminders: MaintenanceReminder[] = [];
      const result = MaintenanceReminderService.generateDingTalkMessage(reminders);
      expect(result.msgtype).toBe("markdown");
    });
    
    it("should include @all for urgent reminders", () => {
      const reminders: MaintenanceReminder[] = [
        {
          equipmentId: 1,
          serialNumber: "GRT-URGENT-001",
          modelName: "GRT-5000",
          clientId: 1,
          clientName: "Urgent Client",
          clientTier: "Strategic",
          nextDueDate: "2025-01-30",
          daysUntilDue: 2,
          reminderLevel: "critical",
        },
      ];
      
      const result = MaintenanceReminderService.generateDingTalkMessage(reminders);
      expect(result.at?.isAtAll).toBe(true);
    });
  });
});

// ============ 服务报告生成服务测试 ============
describe("ServiceReportGeneratorService", () => {
  describe("REPORT_LANGUAGES", () => {
    it("should support Chinese", () => {
      expect(REPORT_LANGUAGES.zh).toBeDefined();
      expect(REPORT_LANGUAGES.zh.name).toBe("中文");
      expect(REPORT_LANGUAGES.zh.title).toBe("服务报告");
    });
    
    it("should support English", () => {
      expect(REPORT_LANGUAGES.en).toBeDefined();
      expect(REPORT_LANGUAGES.en.name).toBe("English");
      expect(REPORT_LANGUAGES.en.title).toBe("Service Report");
    });
    
    it("should support German", () => {
      expect(REPORT_LANGUAGES.de).toBeDefined();
      expect(REPORT_LANGUAGES.de.name).toBe("Deutsch");
      expect(REPORT_LANGUAGES.de.title).toBe("Servicebericht");
    });
    
    it("should have all required sections", () => {
      const requiredSections = ["summary", "equipment", "issue", "solution", "parts", "cost", "recommendation", "signature"];
      
      Object.values(REPORT_LANGUAGES).forEach(lang => {
        requiredSections.forEach(section => {
          expect(lang.sections[section as keyof typeof lang.sections]).toBeDefined();
        });
      });
    });
  });
  
  describe("generateReportFromTemplate", () => {
    const mockData: ServiceReportData = {
      ticketId: "SVC-TEST-001",
      reportDate: "2025-01-29",
      language: "zh",
      clientName: "Test Client",
      clientTier: "Strategic",
      serialNumber: "GRT-TEST-001",
      modelName: "GRT-5000-PRO",
      serviceType: "Maintenance",
      priority: "Medium",
      issueDescription: "定期维护",
      workPerformed: "更换滤芯，清洗喷嘴",
      laborCost: "2000",
      partsCost: "500",
      totalCost: "2500",
      assignedEngineerName: "工程师A",
      completionDate: "2025-01-29",
    };
    
    it("should generate Chinese report", () => {
      const report = ServiceReportGeneratorService.generateReportFromTemplate(mockData, "zh");
      expect(report.language).toBe("zh");
      expect(report.title).toBe("服务报告");
      expect(report.content).toContain("服务摘要");
      expect(report.content).toContain("GRT-TEST-001");
    });
    
    it("should generate English report", () => {
      const report = ServiceReportGeneratorService.generateReportFromTemplate(mockData, "en");
      expect(report.language).toBe("en");
      expect(report.title).toBe("Service Report");
      expect(report.content).toContain("Service Summary");
    });
    
    it("should generate German report", () => {
      const report = ServiceReportGeneratorService.generateReportFromTemplate(mockData, "de");
      expect(report.language).toBe("de");
      expect(report.title).toBe("Servicebericht");
      expect(report.content).toContain("Servicezusammenfassung");
    });
    
    it("should include all sections", () => {
      const report = ServiceReportGeneratorService.generateReportFromTemplate(mockData, "zh");
      expect(report.sections.summary).toBeDefined();
      expect(report.sections.equipment).toBeDefined();
      expect(report.sections.issue).toBeDefined();
      expect(report.sections.solution).toBeDefined();
      expect(report.sections.parts).toBeDefined();
      expect(report.sections.cost).toBeDefined();
      expect(report.sections.recommendation).toBeDefined();
    });
    
    it("should mark as non-AI generated", () => {
      const report = ServiceReportGeneratorService.generateReportFromTemplate(mockData, "zh");
      expect(report.aiGenerated).toBe(false);
    });
    
    it("should include ticket ID in content", () => {
      const report = ServiceReportGeneratorService.generateReportFromTemplate(mockData, "zh");
      expect(report.content).toContain("SVC-TEST-001");
    });
    
    it("should include cost breakdown", () => {
      const report = ServiceReportGeneratorService.generateReportFromTemplate(mockData, "zh");
      expect(report.sections.cost).toContain("2000");
      expect(report.sections.cost).toContain("500");
      expect(report.sections.cost).toContain("2500");
    });
  });
});

// ============ 集成测试 ============
describe("Integration Tests", () => {
  describe("Tier1 Data Completeness", () => {
    it("should have equipment for each client", () => {
      TIER1_CLIENTS.forEach(client => {
        const equipments = TIER1_EQUIPMENTS[client.name];
        expect(equipments).toBeDefined();
        expect(equipments.length).toBeGreaterThan(0);
      });
    });
    
    it("should have total equipment count >= 8", () => {
      let totalEquipments = 0;
      Object.values(TIER1_EQUIPMENTS).forEach(equipments => {
        totalEquipments += equipments.length;
      });
      expect(totalEquipments).toBeGreaterThanOrEqual(8);
    });
    
    it("should have service logs for major clients", () => {
      const majorClientSerials = new Set<string>();
      
      // 获取Strategic客户的设备序列号
      TIER1_CLIENTS.filter(c => c.tier === "Strategic").forEach(client => {
        const equipments = TIER1_EQUIPMENTS[client.name] || [];
        equipments.forEach(eq => majorClientSerials.add(eq.serialNumber));
      });
      
      // 检查是否有对应的服务记录
      const loggedSerials = new Set(TIER1_SERVICE_LOGS.map(l => l.equipmentSerialNumber));
      const hasLogsForMajorClients = [...majorClientSerials].some(serial => loggedSerials.has(serial));
      expect(hasLogsForMajorClients).toBe(true);
    });
  });
  
  describe("Reminder and Report Workflow", () => {
    it("should be able to generate reminder message from equipment data", () => {
      // 模拟从设备数据创建提醒
      const firstClient = TIER1_CLIENTS[0];
      const firstEquipment = TIER1_EQUIPMENTS[firstClient.name][0];
      
      const reminder: MaintenanceReminder = {
        equipmentId: 1,
        serialNumber: firstEquipment.serialNumber,
        modelName: firstEquipment.modelName,
        clientId: 1,
        clientName: firstClient.name,
        clientTier: firstClient.tier,
        nextDueDate: firstEquipment.nextDueDate || "2025-03-15",
        daysUntilDue: 45,
        reminderLevel: "info",
      };
      
      const message = MaintenanceReminderService.generateWeChatMessage([reminder]);
      expect(message).toContain(firstClient.name);
      expect(message).toContain(firstEquipment.serialNumber);
    });
    
    it("should be able to generate report data from service log", () => {
      const firstLog = TIER1_SERVICE_LOGS[0];
      const equipmentSerial = firstLog.equipmentSerialNumber;
      
      // 找到对应的设备和客户
      let foundEquipment: any = null;
      let foundClientName: string = "";
      
      for (const [clientName, equipments] of Object.entries(TIER1_EQUIPMENTS)) {
        const eq = equipments.find(e => e.serialNumber === equipmentSerial);
        if (eq) {
          foundEquipment = eq;
          foundClientName = clientName;
          break;
        }
      }
      
      expect(foundEquipment).not.toBeNull();
      
      const foundClient = TIER1_CLIENTS.find(c => c.name === foundClientName);
      expect(foundClient).toBeDefined();
      
      // 创建报告数据
      const reportData: ServiceReportData = {
        ticketId: "SVC-TEST-001",
        reportDate: "2025-01-29",
        language: "zh",
        clientName: foundClientName,
        clientTier: foundClient!.tier,
        serialNumber: foundEquipment.serialNumber,
        modelName: foundEquipment.modelName,
        serviceType: firstLog.serviceType,
        priority: firstLog.priority,
        issueDescription: firstLog.issueDescription,
        workPerformed: firstLog.workPerformed,
        laborCost: firstLog.laborCost,
        partsCost: firstLog.partsCost,
        totalCost: firstLog.totalCost,
      };
      
      const report = ServiceReportGeneratorService.generateReportFromTemplate(reportData, "zh");
      expect(report.content).toContain(foundEquipment.serialNumber);
      expect(report.content).toContain(foundClientName);
    });
  });
});
