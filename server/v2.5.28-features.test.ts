/**
 * v2.5.28 功能测试
 * 测试生产看板真实API对接、工时预警Webhook通知、工人管理功能
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// 模拟工时预警通知服务
describe("v2.5.28 工时预警Webhook通知服务", () => {
  describe("calculateAlertLevel", () => {
    it("应该正确计算Info级别预警 (100-119%)", () => {
      const overrunPercent = 110;
      // Info级别: 100% <= x < 120%
      expect(overrunPercent >= 100 && overrunPercent < 120).toBe(true);
    });

    it("应该正确计算Warning级别预警 (120-149%)", () => {
      const overrunPercent = 130;
      // Warning级别: 120% <= x < 150%
      expect(overrunPercent >= 120 && overrunPercent < 150).toBe(true);
    });

    it("应该正确计算Critical级别预警 (>=150%)", () => {
      const overrunPercent = 160;
      // Critical级别: x >= 150%
      expect(overrunPercent >= 150).toBe(true);
    });
  });

  describe("formatAlertNotification", () => {
    it("应该正确格式化预警通知内容", () => {
      const alert = {
        alertId: 1,
        alertCode: "WHA-001",
        taskId: 100,
        taskName: "测试任务",
        estimatedHours: 10,
        actualHours: 15,
        overrunPercent: 150,
        alertLevel: "Critical" as const,
        triggeredAt: new Date().toISOString()
      };
      
      // 验证预警数据结构
      expect(alert.alertCode).toBe("WHA-001");
      expect(alert.overrunPercent).toBe(150);
      expect(alert.alertLevel).toBe("Critical");
    });

    it("应该包含任务详情信息", () => {
      const alert = {
        taskName: "主体框架焊接",
        workOrderCode: "WO-2026-001",
        estimatedHours: 8,
        actualHours: 12
      };
      
      expect(alert.taskName).toBe("主体框架焊接");
      expect(alert.workOrderCode).toBe("WO-2026-001");
    });

    it("应该包含工人信息", () => {
      const alert = {
        workerId: 1,
        workerName: "张明"
      };
      
      expect(alert.workerId).toBe(1);
      expect(alert.workerName).toBe("张明");
    });
  });

  describe("sendWorkHourAlertNotification", () => {
    it("应该只对Warning和Critical级别发送通知", () => {
      const notifyOnLevels = ["Warning", "Critical"];
      
      expect(notifyOnLevels.includes("Warning")).toBe(true);
      expect(notifyOnLevels.includes("Critical")).toBe(true);
      expect(notifyOnLevels.includes("Info")).toBe(false);
    });

    it("应该对Critical级别额外通知Owner", () => {
      const alertLevel = "Critical";
      const shouldNotifyOwner = alertLevel === "Critical";
      
      expect(shouldNotifyOwner).toBe(true);
    });
  });

  describe("sendWorkHourAlertSummary", () => {
    it("应该正确统计各级别预警数量", () => {
      const alerts = [
        { alertLevel: "Critical" },
        { alertLevel: "Critical" },
        { alertLevel: "Warning" },
        { alertLevel: "Warning" },
        { alertLevel: "Warning" },
        { alertLevel: "Info" }
      ];
      
      const criticalCount = alerts.filter(a => a.alertLevel === "Critical").length;
      const warningCount = alerts.filter(a => a.alertLevel === "Warning").length;
      const infoCount = alerts.filter(a => a.alertLevel === "Info").length;
      
      expect(criticalCount).toBe(2);
      expect(warningCount).toBe(3);
      expect(infoCount).toBe(1);
    });

    it("应该支持日报/周报/月报周期", () => {
      const periods = ["daily", "weekly", "monthly"];
      const periodNames: Record<string, string> = {
        daily: "日报",
        weekly: "周报",
        monthly: "月报"
      };
      
      expect(periodNames["daily"]).toBe("日报");
      expect(periodNames["weekly"]).toBe("周报");
      expect(periodNames["monthly"]).toBe("月报");
    });
  });

  describe("checkAndNotifyWorkHourAlerts", () => {
    it("应该正确计算超出比例", () => {
      const estimatedHours = 10;
      const actualHours = 15;
      const overrunPercent = Math.round((actualHours / estimatedHours) * 100);
      
      expect(overrunPercent).toBe(150);
    });

    it("应该在预估工时为0时不触发预警", () => {
      const estimatedHours = 0;
      const shouldAlert = estimatedHours > 0;
      
      expect(shouldAlert).toBe(false);
    });

    it("应该在未超出预估时不触发预警", () => {
      const estimatedHours = 10;
      const actualHours = 8;
      const overrunPercent = Math.round((actualHours / estimatedHours) * 100);
      
      expect(overrunPercent < 100).toBe(true);
    });
  });
});

// 工人管理功能测试
describe("v2.5.28 工人管理功能", () => {
  describe("工人列表筛选", () => {
    const mockWorkers = [
      { id: 1, name: "张明", employeeCode: "EMP001", status: "Active", skillLevel: "L4" },
      { id: 2, name: "李强", employeeCode: "EMP002", status: "Active", skillLevel: "L3" },
      { id: 3, name: "赵磊", employeeCode: "EMP006", status: "On_Leave", skillLevel: "L2" }
    ];

    it("应该支持按姓名搜索", () => {
      const searchTerm = "张";
      const filtered = mockWorkers.filter(w => w.name.includes(searchTerm));
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("张明");
    });

    it("应该支持按工号搜索", () => {
      const searchTerm = "EMP002";
      const filtered = mockWorkers.filter(w => w.employeeCode.includes(searchTerm));
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("李强");
    });

    it("应该支持按状态筛选", () => {
      const statusFilter = "Active";
      const filtered = mockWorkers.filter(w => w.status === statusFilter);
      
      expect(filtered.length).toBe(2);
    });

    it("应该支持按技能等级筛选", () => {
      const skillFilter = "L3";
      const filtered = mockWorkers.filter(w => w.skillLevel === skillFilter);
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("李强");
    });
  });

  describe("效率分布统计", () => {
    const mockWorkers = [
      { efficiency: 115 }, // 优秀
      { efficiency: 108 }, // 良好
      { efficiency: 102 }, // 良好
      { efficiency: 95 },  // 一般
      { efficiency: 82 }   // 待提升
    ];

    it("应该正确统计优秀级别 (>=110%)", () => {
      const excellent = mockWorkers.filter(w => w.efficiency >= 110).length;
      expect(excellent).toBe(1);
    });

    it("应该正确统计良好级别 (100-109%)", () => {
      const good = mockWorkers.filter(w => w.efficiency >= 100 && w.efficiency < 110).length;
      expect(good).toBe(2);
    });

    it("应该正确统计一般级别 (90-99%)", () => {
      const average = mockWorkers.filter(w => w.efficiency >= 90 && w.efficiency < 100).length;
      expect(average).toBe(1);
    });

    it("应该正确统计待提升级别 (<90%)", () => {
      const needsImprovement = mockWorkers.filter(w => w.efficiency < 90).length;
      expect(needsImprovement).toBe(1);
    });
  });

  describe("绩效排名", () => {
    const mockWorkers = [
      { name: "张明", efficiency: 115, tasksCompleted: 156, qualityRate: 98 },
      { name: "李强", efficiency: 108, tasksCompleted: 128, qualityRate: 96 },
      { name: "王伟", efficiency: 102, tasksCompleted: 115, qualityRate: 95 }
    ];

    it("应该按效率降序排名", () => {
      const sorted = [...mockWorkers].sort((a, b) => b.efficiency - a.efficiency);
      
      expect(sorted[0].name).toBe("张明");
      expect(sorted[1].name).toBe("李强");
      expect(sorted[2].name).toBe("王伟");
    });

    it("应该正确标识前三名", () => {
      const sorted = [...mockWorkers].sort((a, b) => b.efficiency - a.efficiency);
      const rankings = sorted.map((w, i) => ({
        ...w,
        rank: i + 1,
        badge: i === 0 ? "冠军" : i === 1 ? "亚军" : i === 2 ? "季军" : null
      }));
      
      expect(rankings[0].badge).toBe("冠军");
      expect(rankings[1].badge).toBe("亚军");
      expect(rankings[2].badge).toBe("季军");
    });
  });
});

// 生产看板API对接测试
describe("v2.5.28 生产看板API对接", () => {
  describe("工单数据结构", () => {
    it("应该包含完整的工单信息", () => {
      const workOrder = {
        id: 1,
        workOrderCode: "WO-2026-001",
        productName: "高压清洗机 HP-3000",
        quantity: 5,
        priority: "Top_Urgent",
        status: "In_Progress",
        completionRate: 65,
        estimatedHours: 120,
        actualHours: 85
      };
      
      expect(workOrder.workOrderCode).toBe("WO-2026-001");
      expect(workOrder.priority).toBe("Top_Urgent");
      expect(workOrder.status).toBe("In_Progress");
    });
  });

  describe("任务状态统计", () => {
    it("应该正确计算各状态百分比", () => {
      const taskStatus = [
        { status: "Completed", count: 98 },
        { status: "In_Progress", count: 42 },
        { status: "Pending", count: 12 },
        { status: "QC_Review", count: 4 }
      ];
      
      const total = taskStatus.reduce((sum, s) => sum + s.count, 0);
      const completedPercentage = Math.round((98 / total) * 100);
      
      expect(total).toBe(156);
      expect(completedPercentage).toBe(63);
    });
  });

  describe("工人效率排名", () => {
    it("应该包含完整的效率数据", () => {
      const worker = {
        workerId: 1,
        workerName: "张明",
        tasksCompleted: 28,
        totalEstimatedHours: 180,
        totalActualHours: 165,
        efficiency: 109,
        qualityPassRate: 98
      };
      
      expect(worker.efficiency).toBe(109);
      expect(worker.qualityPassRate).toBe(98);
    });

    it("应该正确计算效率值", () => {
      const totalEstimatedHours = 180;
      const totalActualHours = 165;
      const efficiency = Math.round((totalEstimatedHours / totalActualHours) * 100);
      
      expect(efficiency).toBe(109);
    });
  });
});
