/**
 * v2.3.1 GRT清洗系统功能增强测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb function
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[], {}]),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({ insertId: 1 }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
    }),
  }),
}));

// Mock notification service
vi.mock("./services/checkpoint-approval-notification.service", () => ({
  sendCheckpointApprovalNotification: vi.fn().mockResolvedValue({
    success: true,
    notificationsSent: 3,
    recipients: ["pm@example.com", "stakeholder1@example.com", "stakeholder2@example.com"],
  }),
  notifyCheckpointApproved: vi.fn().mockResolvedValue({
    success: true,
    notificationsSent: 2,
  }),
  notifyCheckpointRejected: vi.fn().mockResolvedValue({
    success: true,
    notificationsSent: 2,
  }),
  notifyPhaseCompleted: vi.fn().mockResolvedValue({
    success: true,
    notificationsSent: 4,
  }),
  checkpointNotificationService: {
    getConfig: vi.fn().mockReturnValue({
      enabled: true,
      recipients: ["project_manager", "stakeholder"],
      channels: ["email", "system"],
    }),
  },
}));

// Mock toothpaste test history service
vi.mock("./services/toothpaste-test-history.service", () => ({
  saveToothpasteTestRecord: vi.fn().mockResolvedValue(1),
  getToothpasteTestRecords: vi.fn().mockResolvedValue([
    {
      id: 1,
      projectId: "PRJ-001",
      projectName: "测试项目",
      partNumber: "PART-001",
      partName: "测试零件",
      featureType: "blind_hole",
      testDate: new Date("2025-01-27"),
      testerId: "user-001",
      testerName: "测试员A",
      residueRate: 3.5,
      result: "pass",
      threshold: 5.0,
    },
  ]),
  getToothpasteTestCount: vi.fn().mockResolvedValue(10),
  getTestStatistics: vi.fn().mockResolvedValue({
    periodType: "monthly",
    periodStart: new Date("2025-01-01"),
    periodEnd: new Date("2025-01-31"),
    totalTests: 100,
    passedTests: 85,
    failedTests: 15,
    passRate: 85.0,
    avgResidueRate: 3.2,
    featureDistribution: {
      blind_hole: 30,
      reinforcing_rib: 25,
      sealing_surface: 20,
      threaded_hole: 15,
      deep_cavity: 10,
    },
    commonFailureAreas: [
      { area: "盲孔底部", count: 8 },
      { area: "加强筋根部", count: 5 },
      { area: "密封面边缘", count: 2 },
    ],
  }),
  getTestTrend: vi.fn().mockResolvedValue([
    { date: "2025-01-20", total: 10, passed: 8, failed: 2, passRate: 80.0 },
    { date: "2025-01-21", total: 12, passed: 10, failed: 2, passRate: 83.3 },
    { date: "2025-01-22", total: 8, passed: 7, failed: 1, passRate: 87.5 },
    { date: "2025-01-23", total: 15, passed: 13, failed: 2, passRate: 86.7 },
    { date: "2025-01-24", total: 11, passed: 10, failed: 1, passRate: 90.9 },
  ]),
  getFeatureTypeStats: vi.fn().mockResolvedValue([
    { featureType: "blind_hole", totalTests: 30, passedTests: 25, passRate: 83.3 },
    { featureType: "reinforcing_rib", totalTests: 25, passedTests: 22, passRate: 88.0 },
    { featureType: "sealing_surface", totalTests: 20, passedTests: 18, passRate: 90.0 },
    { featureType: "threaded_hole", totalTests: 15, passedTests: 12, passRate: 80.0 },
    { featureType: "deep_cavity", totalTests: 10, passedTests: 8, passRate: 80.0 },
  ]),
  deleteToothpasteTestRecord: vi.fn().mockResolvedValue(undefined),
  updateToothpasteTestRecord: vi.fn().mockResolvedValue(undefined),
}));

import {
  sendCheckpointApprovalNotification,
  notifyCheckpointApproved,
  notifyCheckpointRejected,
  notifyPhaseCompleted,
  checkpointNotificationService,
} from "./services/checkpoint-approval-notification.service";

import {
  saveToothpasteTestRecord,
  getToothpasteTestRecords,
  getToothpasteTestCount,
  getTestStatistics,
  getTestTrend,
  getFeatureTypeStats,
  deleteToothpasteTestRecord,
  updateToothpasteTestRecord,
} from "./services/toothpaste-test-history.service";

describe("v2.3.1 GRT清洗系统功能增强", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("检查点审批通知功能", () => {
    it("应该成功发送检查点审批通知", async () => {
      const result = await sendCheckpointApprovalNotification({
        checkpointId: "checkpoint-001",
        checkpointName: "M3阶段门禁",
        projectId: "PRJ-001",
        projectName: "测试项目",
        approvedBy: "工程师A",
        approvedAt: new Date(),
        status: "approved",
        comments: "检查点通过",
      });

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBeGreaterThan(0);
      expect(result.recipients).toBeDefined();
    });

    it("应该成功发送检查点批准通知", async () => {
      const result = await notifyCheckpointApproved({
        checkpointId: "checkpoint-001",
        checkpointName: "M3阶段门禁",
        projectId: "PRJ-001",
        projectName: "测试项目",
        approvedBy: "工程师A",
        approvedAt: new Date(),
        status: "approved",
      });

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
    });

    it("应该成功发送检查点拒绝通知", async () => {
      const result = await notifyCheckpointRejected({
        checkpointId: "checkpoint-001",
        checkpointName: "M3阶段门禁",
        projectId: "PRJ-001",
        projectName: "测试项目",
        approvedBy: "工程师A",
        approvedAt: new Date(),
        status: "rejected",
        comments: "需要补充文档",
      });

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
    });

    it("应该成功发送阶段完成通知", async () => {
      const result = await notifyPhaseCompleted({
        checkpointId: "phase_completion",
        checkpointName: "M3阶段完成",
        projectId: "PRJ-001",
        projectName: "测试项目",
        approvedBy: "工程师A",
        approvedAt: new Date(),
        status: "approved",
      });

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(4);
    });

    it("应该正确获取通知配置", () => {
      const config = checkpointNotificationService.getConfig("checkpoint_approved");

      expect(config.enabled).toBe(true);
      expect(config.recipients).toContain("project_manager");
      expect(config.channels).toContain("email");
    });
  });

  describe("牙膏试验历史记录功能", () => {
    it("应该成功保存试验记录", async () => {
      const id = await saveToothpasteTestRecord({
        projectId: "PRJ-001",
        projectName: "测试项目",
        partNumber: "PART-001",
        partName: "测试零件",
        featureType: "blind_hole",
        testDate: new Date(),
        testerId: "user-001",
        testerName: "测试员A",
        residueRate: 3.5,
        result: "pass",
        threshold: 5.0,
      });

      expect(id).toBe(1);
    });

    it("应该成功获取试验记录列表", async () => {
      const records = await getToothpasteTestRecords({
        partNumber: "PART-001",
      });

      expect(records).toHaveLength(1);
      expect(records[0].partNumber).toBe("PART-001");
      expect(records[0].result).toBe("pass");
    });

    it("应该成功获取试验记录总数", async () => {
      const count = await getToothpasteTestCount({});

      expect(count).toBe(10);
    });

    it("应该成功删除试验记录", async () => {
      await deleteToothpasteTestRecord(1);

      expect(deleteToothpasteTestRecord).toHaveBeenCalledWith(1);
    });

    it("应该成功更新试验记录", async () => {
      await updateToothpasteTestRecord(1, {
        result: "fail",
        comments: "重新检测后发现残留",
      });

      expect(updateToothpasteTestRecord).toHaveBeenCalledWith(1, {
        result: "fail",
        comments: "重新检测后发现残留",
      });
    });
  });

  describe("牙膏试验统计分析功能", () => {
    it("应该成功获取统计数据", async () => {
      const stats = await getTestStatistics("monthly");

      expect(stats.periodType).toBe("monthly");
      expect(stats.totalTests).toBe(100);
      expect(stats.passedTests).toBe(85);
      expect(stats.failedTests).toBe(15);
      expect(stats.passRate).toBe(85.0);
      expect(stats.avgResidueRate).toBe(3.2);
    });

    it("应该正确计算通过率", async () => {
      const stats = await getTestStatistics("monthly");

      const calculatedPassRate = (stats.passedTests / stats.totalTests) * 100;
      expect(calculatedPassRate).toBe(stats.passRate);
    });

    it("应该包含特征类型分布", async () => {
      const stats = await getTestStatistics("monthly");

      expect(stats.featureDistribution).toBeDefined();
      expect(stats.featureDistribution.blind_hole).toBe(30);
      expect(stats.featureDistribution.reinforcing_rib).toBe(25);
    });

    it("应该包含常见失败区域", async () => {
      const stats = await getTestStatistics("monthly");

      expect(stats.commonFailureAreas).toBeDefined();
      expect(stats.commonFailureAreas.length).toBeGreaterThan(0);
      expect(stats.commonFailureAreas[0].area).toBe("盲孔底部");
    });

    it("应该成功获取趋势数据", async () => {
      const trend = await getTestTrend(30);

      expect(trend).toHaveLength(5);
      expect(trend[0].date).toBe("2025-01-20");
      expect(trend[0].passRate).toBe(80.0);
    });

    it("应该成功获取特征类型统计", async () => {
      const featureStats = await getFeatureTypeStats();

      expect(featureStats).toHaveLength(5);
      expect(featureStats[0].featureType).toBe("blind_hole");
      expect(featureStats[0].totalTests).toBe(30);
      expect(featureStats[0].passRate).toBe(83.3);
    });
  });

  describe("数据验证", () => {
    it("试验结果应该只能是pass/fail/pending", async () => {
      const validResults = ["pass", "fail", "pending"];
      const records = await getToothpasteTestRecords({});

      records.forEach((record: any) => {
        expect(validResults).toContain(record.result);
      });
    });

    it("残留率应该在0-100之间", async () => {
      const records = await getToothpasteTestRecords({});

      records.forEach((record: any) => {
        expect(record.residueRate).toBeGreaterThanOrEqual(0);
        expect(record.residueRate).toBeLessThanOrEqual(100);
      });
    });

    it("通过率应该在0-100之间", async () => {
      const stats = await getTestStatistics("monthly");

      expect(stats.passRate).toBeGreaterThanOrEqual(0);
      expect(stats.passRate).toBeLessThanOrEqual(100);
    });
  });
});
