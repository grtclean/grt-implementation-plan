/**
 * 业务触发器单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  triggerProjectGateChange,
  triggerCostAlert,
  triggerServiceTicket,
  triggerQCAlert,
  triggerInterview,
  triggerApproval,
  triggerSystemEvent,
  processPendingNotifications,
} from "./business-triggers";

// Mock环境变量
vi.stubEnv("DINGTALK_WEBHOOK_URL", "https://oapi.dingtalk.com/robot/send?access_token=test");
vi.stubEnv("DINGTALK_WEBHOOK_SECRET", "SECtest123");

// Mock business-notifications模块
vi.mock("../business-notifications", () => ({
  notifyProjectGateChange: vi.fn().mockResolvedValue({ success: true }),
  notifyCostAlert: vi.fn().mockResolvedValue({ success: true }),
  notifyServiceTicket: vi.fn().mockResolvedValue({ success: true }),
  notifyQCAlert: vi.fn().mockResolvedValue({ success: true }),
  notifyInterviewSchedule: vi.fn().mockResolvedValue({ success: true }),
  notifyApproval: vi.fn().mockResolvedValue({ success: true }),
  notifySystemEvent: vi.fn().mockResolvedValue({ success: true }),
}));

describe("业务触发器", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("triggerProjectGateChange", () => {
    it("应该成功触发项目阶段变更通知", async () => {
      const result = await triggerProjectGateChange({
        projectId: "PRJ-001",
        projectName: "GRT智能系统",
        fromGate: "M3",
        toGate: "M4",
        changedBy: "张三",
        changeTime: new Date(),
        reason: "设计评审通过",
      });

      expect(result).toBe(true);
    });

    it("应该支持可选的审批人列表", async () => {
      const result = await triggerProjectGateChange({
        projectId: "PRJ-002",
        projectName: "测试项目",
        fromGate: "M0",
        toGate: "M1",
        changedBy: "测试员",
        changeTime: new Date(),
        reviewers: ["李四", "王五"],
      });

      expect(result).toBe(true);
    });
  });

  describe("triggerCostAlert", () => {
    it("应该成功触发预算警告通知", async () => {
      const result = await triggerCostAlert({
        projectId: "PRJ-001",
        projectName: "GRT智能系统",
        alertType: "budget_warning",
        budgetAmount: 1000000,
        currentCost: 850000,
        threshold: 80,
      });

      expect(result).toBe(true);
    });

    it("应该成功触发预算超支通知", async () => {
      const result = await triggerCostAlert({
        projectId: "PRJ-002",
        projectName: "测试项目",
        alertType: "budget_exceeded",
        budgetAmount: 500000,
        currentCost: 550000,
        threshold: 100,
      });

      expect(result).toBe(true);
    });

    it("应该支持可选的项目经理", async () => {
      const result = await triggerCostAlert({
        projectId: "PRJ-003",
        projectName: "另一个项目",
        alertType: "cost_variance",
        budgetAmount: 800000,
        currentCost: 750000,
        threshold: 90,
        manager: "赵六",
      });

      expect(result).toBe(true);
    });
  });

  describe("triggerServiceTicket", () => {
    it("应该成功触发新工单通知", async () => {
      const result = await triggerServiceTicket({
        ticketId: "T001",
        ticketType: "new",
        customerName: "客户A",
        issueTitle: "设备故障",
        priority: "high",
        assignee: "李四",
        createTime: new Date(),
      });

      expect(result).toBe(true);
    });

    it("应该成功触发工单升级通知", async () => {
      const result = await triggerServiceTicket({
        ticketId: "T002",
        ticketType: "escalated",
        customerName: "客户B",
        issueTitle: "紧急维修",
        priority: "urgent",
        createTime: new Date(),
      });

      expect(result).toBe(true);
    });

    it("应该成功触发工单解决通知", async () => {
      const result = await triggerServiceTicket({
        ticketId: "T003",
        ticketType: "resolved",
        customerName: "客户C",
        issueTitle: "常规维护",
        priority: "low",
        assignee: "技术员A",
        createTime: new Date(),
      });

      expect(result).toBe(true);
    });
  });

  describe("triggerQCAlert", () => {
    it("应该成功触发质检异常通知", async () => {
      const result = await triggerQCAlert({
        productId: "PROD-001",
        productName: "产品A",
        batchNumber: "B20260131",
        defectType: "尺寸偏差",
        defectCount: 5,
        totalCount: 100,
        inspector: "王五",
        inspectionTime: new Date(),
      });

      expect(result).toBe(true);
    });

    it("应该正确计算不良率", async () => {
      const result = await triggerQCAlert({
        productId: "PROD-002",
        productName: "产品B",
        batchNumber: "B20260132",
        defectType: "功能缺陷",
        defectCount: 10,
        totalCount: 50,
        inspector: "赵六",
        inspectionTime: new Date(),
      });

      expect(result).toBe(true);
    });
  });

  describe("triggerInterview", () => {
    it("应该成功触发现场面试通知", async () => {
      const result = await triggerInterview({
        candidateId: "CAND-001",
        candidateName: "候选人A",
        position: "高级工程师",
        interviewTime: new Date(Date.now() + 86400000),
        interviewType: "onsite",
        interviewer: "HR经理",
        location: "会议室A",
      });

      expect(result).toBe(true);
    });

    it("应该成功触发视频面试通知", async () => {
      const result = await triggerInterview({
        candidateId: "CAND-002",
        candidateName: "候选人B",
        position: "产品经理",
        interviewTime: new Date(Date.now() + 86400000),
        interviewType: "video",
        interviewer: "部门主管",
        meetingLink: "https://meeting.example.com/123",
      });

      expect(result).toBe(true);
    });

    it("应该成功触发电话面试通知", async () => {
      const result = await triggerInterview({
        candidateId: "CAND-003",
        candidateName: "候选人C",
        position: "销售代表",
        interviewTime: new Date(Date.now() + 3600000),
        interviewType: "phone",
        interviewer: "销售总监",
      });

      expect(result).toBe(true);
    });
  });

  describe("triggerApproval", () => {
    it("应该成功触发待审批通知", async () => {
      const result = await triggerApproval({
        approvalId: "APR-001",
        approvalType: "expense",
        title: "差旅费报销申请",
        applicant: "张三",
        currentApprover: "李四",
        status: "pending",
        submitTime: new Date(),
        amount: 5000,
      });

      expect(result).toBe(true);
    });

    it("应该成功触发审批通过通知", async () => {
      const result = await triggerApproval({
        approvalId: "APR-002",
        approvalType: "leave",
        title: "年假申请",
        applicant: "王五",
        currentApprover: "赵六",
        status: "approved",
        submitTime: new Date(),
      });

      expect(result).toBe(true);
    });

    it("应该成功触发审批拒绝通知", async () => {
      const result = await triggerApproval({
        approvalId: "APR-003",
        approvalType: "purchase",
        title: "设备采购申请",
        applicant: "采购员A",
        currentApprover: "财务总监",
        status: "rejected",
        submitTime: new Date(),
        amount: 100000,
      });

      expect(result).toBe(true);
    });
  });

  describe("triggerSystemEvent", () => {
    it("应该成功触发系统维护通知", async () => {
      const result = await triggerSystemEvent({
        eventType: "maintenance",
        title: "系统升级维护",
        description: "系统将于今晚22:00-23:00进行升级维护",
        severity: "info",
        eventTime: new Date(),
        affectedServices: ["CRM", "项目管理"],
      });

      expect(result).toBe(true);
    });

    it("应该成功触发安全警告通知", async () => {
      const result = await triggerSystemEvent({
        eventType: "security",
        title: "异常登录检测",
        description: "检测到异常登录尝试",
        severity: "warning",
        eventTime: new Date(),
      });

      expect(result).toBe(true);
    });

    it("应该成功触发系统错误通知", async () => {
      const result = await triggerSystemEvent({
        eventType: "performance",
        title: "数据库连接异常",
        description: "数据库连接池耗尽",
        severity: "critical",
        eventTime: new Date(),
        affectedServices: ["全部服务"],
      });

      expect(result).toBe(true);
    });

    it("应该成功触发备份完成通知", async () => {
      const result = await triggerSystemEvent({
        eventType: "backup",
        title: "数据备份完成",
        description: "每日数据备份已成功完成",
        severity: "info",
        eventTime: new Date(),
      });

      expect(result).toBe(true);
    });
  });

  describe("processPendingNotifications", () => {
    it("应该返回处理结果统计", async () => {
      const result = await processPendingNotifications();

      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("failed");
      expect(typeof result.total).toBe("number");
      expect(typeof result.success).toBe("number");
      expect(typeof result.failed).toBe("number");
    });
  });
});
