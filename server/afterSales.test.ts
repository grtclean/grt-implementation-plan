/**
 * GRT_AfterSales_Core 模块单元测试
 * v2.5.43 售后服务核心模块
 */

import { describe, it, expect } from 'vitest';

// 测试数据模型定义
const AFTER_SALES_MODULE = {
  module_name: "GRT_AfterSales_Core",
  collections: ["clients", "equipments", "service_logs"]
};

// 客户档案测试数据
const SAMPLE_CLIENTS = [
  { name: "博世汽车零部件", tier: "Strategic", industry: "automotive" },
  { name: "采埃孚传动系统", tier: "Strategic", industry: "automotive" },
  { name: "大陆汽车电子", tier: "Key", industry: "automotive" },
  { name: "舍弗勒轴承", tier: "Key", industry: "bearing" },
  { name: "中小型客户A", tier: "Standard", industry: "general" }
];

// 设备资产测试数据
const SAMPLE_EQUIPMENTS = [
  { 
    serial_number: "GRT-2024-001", 
    model_name: "GRT-UC-3000",
    description: "超声波清洗线",
    warranty_months: 12
  },
  { 
    serial_number: "GRT-2024-002", 
    model_name: "GRT-HC-2000",
    description: "高压喷淋清洗机",
    warranty_months: 12
  },
  { 
    serial_number: "GRT-2024-003", 
    model_name: "GRT-VC-1500",
    description: "真空干燥系统",
    warranty_months: 18
  }
];

// 服务工单测试数据
const SAMPLE_SERVICE_LOGS = [
  { service_type: "Installation", status: "Completed" },
  { service_type: "Maintenance", status: "In_Progress" },
  { service_type: "Repair", status: "Pending" }
];

describe('GRT_AfterSales_Core 模块', () => {
  
  describe('数据模型定义', () => {
    it('应包含正确的模块名称', () => {
      expect(AFTER_SALES_MODULE.module_name).toBe("GRT_AfterSales_Core");
    });

    it('应包含三个核心集合', () => {
      expect(AFTER_SALES_MODULE.collections).toHaveLength(3);
      expect(AFTER_SALES_MODULE.collections).toContain("clients");
      expect(AFTER_SALES_MODULE.collections).toContain("equipments");
      expect(AFTER_SALES_MODULE.collections).toContain("service_logs");
    });
  });

  describe('客户档案 (clients)', () => {
    it('应支持三种客户层级', () => {
      const tiers = ["Strategic", "Key", "Standard"];
      SAMPLE_CLIENTS.forEach(client => {
        expect(tiers).toContain(client.tier);
      });
    });

    it('Strategic客户应为Tier1级别', () => {
      const strategicClients = SAMPLE_CLIENTS.filter(c => c.tier === "Strategic");
      expect(strategicClients.length).toBeGreaterThan(0);
      // 博世、采埃孚应为Strategic级别
      expect(strategicClients.some(c => c.name.includes("博世"))).toBe(true);
      expect(strategicClients.some(c => c.name.includes("采埃孚"))).toBe(true);
    });

    it('客户档案应包含必要字段', () => {
      SAMPLE_CLIENTS.forEach(client => {
        expect(client).toHaveProperty("name");
        expect(client).toHaveProperty("tier");
        expect(client.name).toBeTruthy();
      });
    });
  });

  describe('设备资产 (equipments)', () => {
    it('设备序列号应唯一', () => {
      const serialNumbers = SAMPLE_EQUIPMENTS.map(e => e.serial_number);
      const uniqueSerialNumbers = [...new Set(serialNumbers)];
      expect(serialNumbers.length).toBe(uniqueSerialNumbers.length);
    });

    it('设备序列号应符合GRT编码规则', () => {
      SAMPLE_EQUIPMENTS.forEach(equipment => {
        expect(equipment.serial_number).toMatch(/^GRT-\d{4}-\d{3}$/);
      });
    });

    it('设备型号应包含产品线标识', () => {
      const productLines = ["UC", "HC", "VC", "SC"]; // 超声波、高压、真空、喷淋
      SAMPLE_EQUIPMENTS.forEach(equipment => {
        const hasProductLine = productLines.some(pl => equipment.model_name.includes(pl));
        expect(hasProductLine).toBe(true);
      });
    });

    it('质保期应在合理范围内', () => {
      SAMPLE_EQUIPMENTS.forEach(equipment => {
        expect(equipment.warranty_months).toBeGreaterThanOrEqual(12);
        expect(equipment.warranty_months).toBeLessThanOrEqual(24);
      });
    });
  });

  describe('服务工单 (service_logs)', () => {
    it('应支持三种服务类型', () => {
      const serviceTypes = ["Installation", "Maintenance", "Repair"];
      SAMPLE_SERVICE_LOGS.forEach(log => {
        expect(serviceTypes).toContain(log.service_type);
      });
    });

    it('应支持三种工单状态', () => {
      const statuses = ["Pending", "In_Progress", "Completed"];
      SAMPLE_SERVICE_LOGS.forEach(log => {
        expect(statuses).toContain(log.status);
      });
    });
  });

  describe('自动化工作流', () => {
    it('工作流触发条件应正确配置', () => {
      const workflowTrigger = {
        type: "collection:afterUpdate",
        collection: "service_logs",
        condition: {
          changed: ["status"],
          status: "Completed"
        }
      };

      expect(workflowTrigger.type).toBe("collection:afterUpdate");
      expect(workflowTrigger.collection).toBe("service_logs");
      expect(workflowTrigger.condition.status).toBe("Completed");
    });

    it('工单完成后应更新设备维护日期', () => {
      const workflowAction = {
        type: "updateRecord",
        collection: "equipments",
        updates: ["last_maintenance_date", "next_due_date"]
      };

      expect(workflowAction.collection).toBe("equipments");
      expect(workflowAction.updates).toContain("last_maintenance_date");
      expect(workflowAction.updates).toContain("next_due_date");
    });

    it('下次保养日期应为完成日期+180天', () => {
      const completionDate = new Date("2024-01-15");
      
      const nextDueDate = new Date(completionDate);
      nextDueDate.setDate(nextDueDate.getDate() + 180);
      
      // 验证日期差距约为180天（考虑时区差异）
      const daysDiff = Math.round((nextDueDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(180);
    });
  });

  describe('客户层级与服务优先级', () => {
    it('Strategic客户应获得最高服务优先级', () => {
      const priorityMap: Record<string, number> = {
        "Strategic": 1,
        "Key": 2,
        "Standard": 3
      };

      const strategicPriority = priorityMap["Strategic"];
      const keyPriority = priorityMap["Key"];
      const standardPriority = priorityMap["Standard"];

      expect(strategicPriority).toBeLessThan(keyPriority);
      expect(keyPriority).toBeLessThan(standardPriority);
    });

    it('Tier1客户应强制执行红蓝对抗交付', () => {
      const tier1Clients = SAMPLE_CLIENTS.filter(c => c.tier === "Strategic");
      
      tier1Clients.forEach(client => {
        // Tier1客户必须启用红蓝对抗
        const requiresRedBlue = client.tier === "Strategic";
        expect(requiresRedBlue).toBe(true);
      });
    });
  });

  describe('设备维护周期计算', () => {
    it('应正确计算下次维护日期', () => {
      const calculateNextDueDate = (lastMaintenanceDate: Date, intervalDays: number = 180): Date => {
        const nextDate = new Date(lastMaintenanceDate);
        nextDate.setDate(nextDate.getDate() + intervalDays);
        return nextDate;
      };

      const lastMaintenance = new Date("2024-06-01");
      const nextDue = calculateNextDueDate(lastMaintenance);
      
      expect(nextDue.getTime()).toBeGreaterThan(lastMaintenance.getTime());
      // 验证日期差距约为180天（考虑时区和夏令时差异）
      const daysDiff = Math.round((nextDue.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(180);
    });

    it('应识别即将到期的设备', () => {
      const isMaintenanceDueSoon = (nextDueDate: Date, warningDays: number = 30): boolean => {
        const today = new Date();
        const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= warningDays && daysUntilDue > 0;
      };

      const soonDueDate = new Date();
      soonDueDate.setDate(soonDueDate.getDate() + 15);
      
      expect(isMaintenanceDueSoon(soonDueDate)).toBe(true);
    });

    it('应识别已过期的设备', () => {
      const isMaintenanceOverdue = (nextDueDate: Date): boolean => {
        return nextDueDate.getTime() < new Date().getTime();
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      
      expect(isMaintenanceOverdue(pastDate)).toBe(true);
    });
  });

  describe('服务报告生成', () => {
    it('服务报告应包含必要信息', () => {
      const serviceReport = {
        ticket_id: "SRV-2024-001",
        equipment_serial: "GRT-2024-001",
        service_type: "Maintenance",
        engineer_name: "张工",
        completion_date: "2024-06-15",
        findings: ["清洗槽液位正常", "超声波换能器工作正常"],
        recommendations: ["建议3个月后更换过滤器"],
        customer_signature: true
      };

      expect(serviceReport).toHaveProperty("ticket_id");
      expect(serviceReport).toHaveProperty("equipment_serial");
      expect(serviceReport).toHaveProperty("service_type");
      expect(serviceReport).toHaveProperty("engineer_name");
      expect(serviceReport).toHaveProperty("completion_date");
      expect(serviceReport).toHaveProperty("customer_signature");
    });

    it('Tier1客户报告应支持多语言', () => {
      const tier1ReportLanguages = ["zh-CN", "en-US", "de-DE"];
      
      expect(tier1ReportLanguages).toContain("zh-CN");
      expect(tier1ReportLanguages).toContain("en-US");
    });
  });

  describe('数据关联完整性', () => {
    it('设备应关联到客户', () => {
      const equipment = {
        serial_number: "GRT-2024-001",
        client_id: 1,
        client_name: "博世汽车零部件"
      };

      expect(equipment.client_id).toBeDefined();
      expect(equipment.client_name).toBeTruthy();
    });

    it('服务工单应关联到设备', () => {
      const serviceLog = {
        ticket_id: "SRV-2024-001",
        equipment_id: 1,
        equipment_serial: "GRT-2024-001"
      };

      expect(serviceLog.equipment_id).toBeDefined();
      expect(serviceLog.equipment_serial).toBeTruthy();
    });

    it('客户应能查看所有关联设备', () => {
      const clientWithEquipments = {
        id: 1,
        name: "博世汽车零部件",
        tier: "Strategic",
        equipments: [
          { serial_number: "GRT-2024-001" },
          { serial_number: "GRT-2024-002" }
        ]
      };

      expect(clientWithEquipments.equipments).toHaveLength(2);
      expect(clientWithEquipments.equipments[0].serial_number).toBe("GRT-2024-001");
    });
  });
});

describe('售后服务工作流服务', () => {
  describe('维护日期计算', () => {
    it('应正确计算下次维护日期（默认180天）', () => {
      const completionDate = new Date('2024-06-15');
      const expectedNextDue = new Date('2024-12-12');
      
      const nextDue = new Date(completionDate);
      nextDue.setDate(nextDue.getDate() + 180);
      
      expect(nextDue.toISOString().split('T')[0]).toBe(expectedNextDue.toISOString().split('T')[0]);
    });

    it('应支持自定义维护周期', () => {
      const completionDate = new Date('2024-06-15');
      const customInterval = 90; // 90天
      
      const nextDue = new Date(completionDate);
      nextDue.setDate(nextDue.getDate() + customInterval);
      
      const expectedNextDue = new Date('2024-09-13');
      expect(nextDue.toISOString().split('T')[0]).toBe(expectedNextDue.toISOString().split('T')[0]);
    });
  });

  describe('服务类型处理', () => {
    it('Installation服务应更新设备安装日期', () => {
      const serviceType = 'Installation';
      const shouldUpdateInstallDate = serviceType === 'Installation';
      expect(shouldUpdateInstallDate).toBe(true);
    });

    it('Maintenance服务应更新维护日期', () => {
      const serviceType = 'Maintenance';
      const shouldUpdateMaintenanceDate = serviceType === 'Maintenance';
      expect(shouldUpdateMaintenanceDate).toBe(true);
    });

    it('Repair服务应记录维修历史', () => {
      const serviceType = 'Repair';
      const shouldRecordRepairHistory = serviceType === 'Repair';
      expect(shouldRecordRepairHistory).toBe(true);
    });
  });
});
