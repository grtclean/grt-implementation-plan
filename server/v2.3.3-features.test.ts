import { describe, it, expect } from "vitest";
import {
  createTimeoutConfig,
  checkApprovalTimeout,
  executeEscalation,
  sendReminder,
  processTimeoutApprovals,
  getEscalationHistory,
  getTimeoutStatistics,
  type ApprovalRecord,
  type TimeoutConfig,
} from "./services/approval-timeout-escalation.service";
import {
  createScheduledReportConfig,
  calculateNextRunTime,
  generateReport,
  sendReport,
  executeScheduledReport,
  getScheduledReportConfigs,
  getDeliveryHistory,
  getDeliveryStatistics,
  type ScheduleConfig,
} from "./services/scheduled-report.service";
import {
  getCleaningTestHistory,
  generateOverlayData,
  analyzeComparison,
  exportComparisonReport,
  type CleaningTestRecord,
  type ComparisonAnalysis,
} from "./services/heatmap-comparison.service";

describe("v2.3.3 GRT清洗系统功能增强", () => {
  // ==================== 热力图历史对比功能测试 ====================
  describe("热力图历史对比功能", () => {
    const mockTestRecord1: CleaningTestRecord = {
      id: "test-001",
      testDate: new Date("2024-01-15"),
      featureType: "blind_hole",
      partNumber: "P001",
      projectId: "proj-001",
      engineerId: "eng-001",
      heatmapData: [
        { x: 0, y: 0, z: 0, pressure: 120, intensity: 0.8, action: "spray", timestamp: Date.now() },
        { x: 10, y: 10, z: 5, pressure: 125, intensity: 0.85, action: "spray", timestamp: Date.now() },
      ],
      avgPressure: 122.5,
      maxPressure: 125,
      coveragePercentage: 85,
      cleaningResult: "pass",
    };

    const mockTestRecord2: CleaningTestRecord = {
      id: "test-002",
      testDate: new Date("2024-01-20"),
      featureType: "blind_hole",
      partNumber: "P001",
      projectId: "proj-001",
      engineerId: "eng-001",
      heatmapData: [
        { x: 0, y: 0, z: 0, pressure: 130, intensity: 0.9, action: "spray", timestamp: Date.now() },
        { x: 10, y: 10, z: 5, pressure: 135, intensity: 0.92, action: "spray", timestamp: Date.now() },
      ],
      avgPressure: 132.5,
      maxPressure: 135,
      coveragePercentage: 92,
      cleaningResult: "pass",
    };

    it("应该能够获取清洗测试历史记录", async () => {
      const history = await getCleaningTestHistory({
        featureType: "blind_hole",
        limit: 10,
      });
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });

    it("应该能够生成叠加数据", () => {
      const overlayData = generateOverlayData([mockTestRecord1, mockTestRecord2], {
        mode: "average",
        opacity: 0.7,
        colorScale: "viridis",
      });
      
      expect(overlayData).toBeDefined();
      expect(Array.isArray(overlayData)).toBe(true);
    });

    it("应该能够分析对比结果", () => {
      const analysis = analyzeComparison([mockTestRecord1, mockTestRecord2]);
      
      expect(analysis).toBeDefined();
      expect(analysis.testIds).toContain("test-001");
      expect(analysis.testIds).toContain("test-002");
      expect(analysis.pressureDifference).toBeDefined();
      expect(analysis.coverageDifference).toBeDefined();
      expect(analysis.improvementTrend).toBeDefined();
    });

    it("应该能够导出对比报告", () => {
      const analysis = analyzeComparison([mockTestRecord1, mockTestRecord2]);
      const report = exportComparisonReport([mockTestRecord1, mockTestRecord2], analysis);
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.details).toBeDefined();
    });

    it("应该能够检测改进趋势", () => {
      const analysis = analyzeComparison([mockTestRecord1, mockTestRecord2]);
      
      expect(["improving", "declining", "stable"]).toContain(analysis.improvementTrend);
    });
  });

  // ==================== 审批超时自动升级功能测试 ====================
  describe("审批超时自动升级功能", () => {
    it("应该能够创建超时配置", () => {
      const config = createTimeoutConfig({
        approvalChainId: "chain-001",
        stepIndex: 0,
        timeoutHours: 24,
        escalationAction: "escalate_to_next",
      });
      
      expect(config).toBeDefined();
      expect(config.id).toBeDefined();
      expect(config.timeoutHours).toBe(24);
      expect(config.escalationAction).toBe("escalate_to_next");
      expect(config.reminderIntervals).toEqual([4, 8, 16]);
    });

    it("应该能够检测审批是否超时", () => {
      const overdueRecord: ApprovalRecord = {
        id: "apr-001",
        approvalChainId: "chain-001",
        checkpointId: "cp-001",
        currentStepIndex: 0,
        status: "pending",
        assignedTo: "engineer",
        assignedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25小时前
        dueAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1小时前到期
        remindersSent: 3,
      };

      const result = checkApprovalTimeout(overdueRecord);
      
      expect(result.isOverdue).toBe(true);
      expect(result.hoursOverdue).toBeGreaterThan(0);
      expect(result.shouldEscalate).toBe(true);
    });

    it("应该能够检测未超时的审批", () => {
      const pendingRecord: ApprovalRecord = {
        id: "apr-002",
        approvalChainId: "chain-001",
        checkpointId: "cp-002",
        currentStepIndex: 0,
        status: "pending",
        assignedTo: "engineer",
        assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
        dueAt: new Date(Date.now() + 22 * 60 * 60 * 1000), // 22小时后到期
        remindersSent: 0,
      };

      const result = checkApprovalTimeout(pendingRecord);
      
      expect(result.isOverdue).toBe(false);
      expect(result.shouldEscalate).toBe(false);
    });

    it("应该能够执行升级操作", async () => {
      const record: ApprovalRecord = {
        id: "apr-001",
        approvalChainId: "chain-001",
        checkpointId: "cp-001",
        currentStepIndex: 0,
        status: "pending",
        assignedTo: "engineer",
        assignedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        dueAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        remindersSent: 3,
      };

      const config = createTimeoutConfig({
        approvalChainId: "chain-001",
        stepIndex: 0,
      });

      const event = await executeEscalation(record, config);
      
      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.fromApprover).toBe("engineer");
      expect(event.action).toBe("escalate_to_next");
      expect(event.notificationsSent.length).toBeGreaterThan(0);
    });

    it("应该能够发送提醒通知", async () => {
      const record: ApprovalRecord = {
        id: "apr-001",
        approvalChainId: "chain-001",
        checkpointId: "cp-001",
        currentStepIndex: 0,
        status: "pending",
        assignedTo: "engineer",
        assignedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        dueAt: new Date(Date.now() + 19 * 60 * 60 * 1000),
        remindersSent: 0,
      };

      const reminder = await sendReminder(record, 1);
      
      expect(reminder).toBeDefined();
      expect(reminder.recipientId).toBe("engineer");
      expect(reminder.reminderNumber).toBe(1);
      expect(reminder.status).toBe("delivered");
    });

    it("应该能够处理所有超时审批", async () => {
      const result = await processTimeoutApprovals();
      
      expect(result).toBeDefined();
      expect(result.processed).toBeGreaterThanOrEqual(0);
      expect(result.escalated).toBeGreaterThanOrEqual(0);
      expect(result.reminded).toBeGreaterThanOrEqual(0);
    });

    it("应该能够获取升级历史", async () => {
      const history = await getEscalationHistory({ limit: 10 });
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });

    it("应该能够获取超时统计", async () => {
      const history = await getEscalationHistory({});
      const stats = getTimeoutStatistics(history);
      
      expect(stats).toBeDefined();
      expect(stats.totalEscalations).toBeDefined();
      expect(stats.byAction).toBeDefined();
      expect(stats.byApprover).toBeDefined();
    });
  });

  // ==================== 报表定时发送功能测试 ====================
  describe("报表定时发送功能", () => {
    it("应该能够创建定时发送配置", () => {
      const config = createScheduledReportConfig({
        name: "测试周报",
        reportType: "weekly",
        reportFormat: "excel",
        dataSource: "toothpaste_tests",
        schedule: {
          type: "cron",
          cronExpression: "0 9 * * 1",
          timezone: "Asia/Shanghai",
        },
        recipients: [
          { type: "role", value: "project_manager", name: "项目经理" },
        ],
        deliveryChannels: ["email"],
        createdBy: "admin",
      });
      
      expect(config).toBeDefined();
      expect(config.id).toBeDefined();
      expect(config.name).toBe("测试周报");
      expect(config.reportType).toBe("weekly");
      expect(config.enabled).toBe(true);
      expect(config.nextRunAt).toBeDefined();
    });

    it("应该能够计算下次执行时间 - 周报", () => {
      const schedule: ScheduleConfig = {
        type: "cron",
        cronExpression: "0 9 * * 1", // 每周一9点
        timezone: "Asia/Shanghai",
      };

      const nextRun = calculateNextRunTime(schedule);
      
      expect(nextRun).toBeDefined();
      expect(nextRun.getHours()).toBe(9);
      expect(nextRun.getDay()).toBe(1); // 周一
    });

    it("应该能够计算下次执行时间 - 月报", () => {
      const schedule: ScheduleConfig = {
        type: "cron",
        cronExpression: "0 9 1 * *", // 每月1号9点
        timezone: "Asia/Shanghai",
      };

      const nextRun = calculateNextRunTime(schedule);
      
      expect(nextRun).toBeDefined();
      expect(nextRun.getHours()).toBe(9);
      expect(nextRun.getDate()).toBe(1);
    });

    it("应该能够计算下次执行时间 - 间隔", () => {
      const schedule: ScheduleConfig = {
        type: "interval",
        intervalHours: 24,
        timezone: "Asia/Shanghai",
      };

      const nextRun = calculateNextRunTime(schedule);
      const expectedTime = new Date();
      expectedTime.setHours(expectedTime.getHours() + 24);
      
      expect(nextRun).toBeDefined();
      // 允许1分钟误差
      expect(Math.abs(nextRun.getTime() - expectedTime.getTime())).toBeLessThan(60000);
    });

    it("应该能够生成报表", async () => {
      const config = createScheduledReportConfig({
        name: "测试报表",
        reportType: "weekly",
        reportFormat: "excel",
        dataSource: "toothpaste_tests",
        schedule: { type: "cron", cronExpression: "0 9 * * 1" },
        recipients: [{ type: "email", value: "test@example.com" }],
        createdBy: "admin",
      });

      const dateRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const report = await generateReport(config, dateRange);
      
      expect(report).toBeDefined();
      expect(report.content).toBeDefined();
      expect(report.fileName).toContain("测试报表");
      expect(report.format).toBe("excel");
    });

    it("应该能够发送报表", async () => {
      const config = createScheduledReportConfig({
        name: "测试报表",
        reportType: "weekly",
        reportFormat: "excel",
        dataSource: "toothpaste_tests",
        schedule: { type: "cron", cronExpression: "0 9 * * 1" },
        recipients: [{ type: "email", value: "test@example.com" }],
        createdBy: "admin",
      });

      const report = {
        content: "test content",
        fileName: "test_report.xlsx",
        format: "excel" as const,
      };

      const record = await sendReport(config, report);
      
      expect(record).toBeDefined();
      expect(record.status).toBe("sent");
      expect(record.recipients.length).toBeGreaterThan(0);
    });

    it("应该能够执行定时任务", async () => {
      const config = createScheduledReportConfig({
        name: "测试报表",
        reportType: "weekly",
        reportFormat: "excel",
        dataSource: "toothpaste_tests",
        schedule: { type: "cron", cronExpression: "0 9 * * 1" },
        recipients: [{ type: "email", value: "test@example.com" }],
        createdBy: "admin",
      });

      const record = await executeScheduledReport(config);
      
      expect(record).toBeDefined();
      expect(record.configId).toBe(config.id);
      expect(record.status).toBe("sent");
    });

    it("应该能够获取所有定时报表配置", async () => {
      const configs = await getScheduledReportConfigs();
      
      expect(configs).toBeDefined();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });

    it("应该能够获取发送历史", async () => {
      const history = await getDeliveryHistory({ limit: 10 });
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });

    it("应该能够获取发送统计", async () => {
      const history = await getDeliveryHistory({});
      const stats = getDeliveryStatistics(history);
      
      expect(stats).toBeDefined();
      expect(stats.totalSent).toBeDefined();
      expect(stats.successRate).toBeDefined();
      expect(stats.byReportType).toBeDefined();
      expect(stats.byChannel).toBeDefined();
    });

    it("应该支持多种报表格式", async () => {
      const formats = ["excel", "pdf", "html", "csv"] as const;
      
      for (const format of formats) {
        const config = createScheduledReportConfig({
          name: `${format}格式报表`,
          reportType: "weekly",
          reportFormat: format,
          dataSource: "toothpaste_tests",
          schedule: { type: "cron", cronExpression: "0 9 * * 1" },
          recipients: [{ type: "email", value: "test@example.com" }],
          createdBy: "admin",
        });

        const dateRange = {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        };

        const report = await generateReport(config, dateRange);
        
        expect(report.format).toBe(format);
        expect(report.content).toBeDefined();
      }
    });

    it("应该支持多种发送渠道", () => {
      const channels = ["email", "system", "webhook", "ftp"] as const;
      
      const config = createScheduledReportConfig({
        name: "多渠道报表",
        reportType: "weekly",
        reportFormat: "excel",
        dataSource: "toothpaste_tests",
        schedule: { type: "cron", cronExpression: "0 9 * * 1" },
        recipients: [{ type: "email", value: "test@example.com" }],
        deliveryChannels: [...channels],
        createdBy: "admin",
      });
      
      expect(config.deliveryChannels).toEqual(channels);
    });
  });
});
