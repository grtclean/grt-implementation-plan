/**
 * 钉钉通知路由单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import {
  sendDingTalkMessage,
  testDingTalkConnection,
  sendAlertToDingTalk,
  sendCostAlertToDingTalk,
  sendMeetingReminderToDingTalk,
  getDingTalkConfig,
  updateDingTalkConfig,
} from '../dingtalk-webhook';

import {
  notifyProjectGateChange,
  notifyCostAlert,
  notifyServiceTicket,
  notifyQCAlert,
  notifyInterviewSchedule,
  notifyApproval,
  notifySystemEvent,
} from '../business-notifications';

describe('钉钉Webhook服务', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // 默认返回成功响应
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基础消息发送', () => {
    it('应该成功发送文本消息', async () => {
      const result = await sendDingTalkMessage({
        title: '测试标题',
        content: '测试内容',
        type: 'text',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('应该成功发送Markdown消息', async () => {
      const result = await sendDingTalkMessage({
        title: '测试标题',
        content: '**加粗内容**',
        type: 'markdown',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('应该在@所有人时设置atAll', async () => {
      await sendDingTalkMessage({
        title: '紧急通知',
        content: '紧急内容',
        type: 'text',
        atAll: true,
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.at.isAtAll).toBe(true);
    });

    it('应该处理API错误', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 310000, errmsg: 'keywords not in content' }),
      });

      const result = await sendDingTalkMessage({
        title: '测试',
        content: '测试',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('310000');
    });

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendDingTalkMessage({
        title: '测试',
        content: '测试',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('配置管理', () => {
    it('应该能获取当前配置', () => {
      const config = getDingTalkConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('webhookUrl');
      expect(config).toHaveProperty('secret');
    });

    it('应该能更新配置', () => {
      updateDingTalkConfig({ enabled: false });
      const config = getDingTalkConfig();
      expect(config.enabled).toBe(false);
      
      // 恢复默认
      updateDingTalkConfig({ enabled: true });
    });

    it('禁用时不应发送消息', async () => {
      updateDingTalkConfig({ enabled: false });
      
      const result = await sendDingTalkMessage({
        title: '测试',
        content: '测试',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('未启用');
      expect(mockFetch).not.toHaveBeenCalled();
      
      // 恢复默认
      updateDingTalkConfig({ enabled: true });
    });
  });

  describe('连接测试', () => {
    it('应该返回连接测试结果', async () => {
      const result = await testDingTalkConnection();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('latency');
    });
  });

  describe('告警消息', () => {
    it('应该发送info级别告警', async () => {
      const result = await sendAlertToDingTalk({
        level: 'info',
        title: '信息告警',
        description: '这是一条信息',
        source: '测试系统',
        timestamp: new Date(),
      });

      expect(result.success).toBe(true);
    });

    it('应该发送critical级别告警并@所有人', async () => {
      await sendAlertToDingTalk({
        level: 'critical',
        title: '严重告警',
        description: '严重问题',
        source: '测试系统',
        timestamp: new Date(),
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.at.isAtAll).toBe(true);
    });

    it('应该发送成本预警', async () => {
      const result = await sendCostAlertToDingTalk({
        projectId: 'P001',
        projectName: '测试项目',
        alertType: '预算预警',
        threshold: 0.8,
        currentValue: 0.85,
        message: '成本已达预算85%',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('会议提醒', () => {
    it('应该发送会议提醒', async () => {
      const result = await sendMeetingReminderToDingTalk({
        id: 'M001',
        title: '项目周会',
        startTime: new Date(Date.now() + 30 * 60 * 1000),
        location: '会议室A',
        organizer: '张三',
        participants: ['李四', '王五'],
        reminderMinutes: 30,
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('业务通知集成', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
    });
    updateDingTalkConfig({ enabled: true });
  });

  describe('项目阶段门通知', () => {
    it('应该发送阶段门变更通知', async () => {
      const result = await notifyProjectGateChange({
        projectId: 'P001',
        projectName: 'GRT智能系统',
        fromGate: 'M1',
        toGate: 'M2',
        changedBy: '项目经理',
        changeTime: new Date(),
        reason: '需求确认完成',
      });

      expect(result.success).toBe(true);
    });

    it('应该包含审批人信息', async () => {
      await notifyProjectGateChange({
        projectId: 'P001',
        projectName: 'GRT智能系统',
        fromGate: 'M2',
        toGate: 'M3',
        changedBy: '项目经理',
        changeTime: new Date(),
        reviewers: ['技术总监', '质量经理'],
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.markdown.text).toContain('待审批人');
    });
  });

  describe('成本预警通知', () => {
    it('应该发送预算预警', async () => {
      const result = await notifyCostAlert({
        projectId: 'P001',
        projectName: '测试项目',
        alertType: 'budget_warning',
        budgetAmount: 1000000,
        currentCost: 850000,
        threshold: 0.8,
      });

      expect(result.success).toBe(true);
    });

    it('超支时应该发送critical级别', async () => {
      await notifyCostAlert({
        projectId: 'P001',
        projectName: '测试项目',
        alertType: 'budget_exceeded',
        budgetAmount: 1000000,
        currentCost: 1200000,
        threshold: 1.0,
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('售后服务通知', () => {
    it('应该发送工单创建通知', async () => {
      const result = await notifyServiceTicket({
        ticketId: 'T001',
        type: 'created',
        customerName: '测试客户',
        equipmentName: '设备A',
        priority: 'high',
        description: '设备故障',
      });

      expect(result.success).toBe(true);
    });

    it('紧急工单应该发送critical级别', async () => {
      await notifyServiceTicket({
        ticketId: 'T002',
        type: 'escalated',
        customerName: '重要客户',
        equipmentName: '核心设备',
        priority: 'urgent',
        description: '紧急故障',
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('质检异常通知', () => {
    it('应该发送质检异常通知', async () => {
      const result = await notifyQCAlert({
        recordId: 'QC001',
        productName: '产品A',
        batchNumber: 'B20260131',
        inspector: '检验员张三',
        totalItems: 100,
        failedItems: 5,
        defectTypes: ['外观缺陷', '尺寸偏差'],
        severity: 'minor',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('面试安排通知', () => {
    it('应该发送面试提醒', async () => {
      const result = await notifyInterviewSchedule({
        candidateId: 'C001',
        candidateName: '候选人A',
        position: '高级工程师',
        interviewTime: new Date(Date.now() + 60 * 60 * 1000),
        interviewType: 'video',
        interviewers: ['技术经理', 'HR'],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('审批流程通知', () => {
    it('应该发送待审批通知', async () => {
      const result = await notifyApproval({
        approvalId: 'A001',
        type: 'expense',
        title: '差旅费报销',
        applicant: '员工A',
        amount: 5000,
        status: 'pending',
        approver: '部门经理',
      });

      expect(result.success).toBe(true);
    });

    it('应该发送审批通过通知', async () => {
      const result = await notifyApproval({
        approvalId: 'A002',
        type: 'leave',
        title: '年假申请',
        applicant: '员工B',
        status: 'approved',
        approver: '部门经理',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('系统事件通知', () => {
    it('应该发送系统维护通知', async () => {
      const result = await notifySystemEvent({
        type: 'maintenance',
        title: '系统维护通知',
        description: '系统将于今晚进行维护升级',
        severity: 'info',
        affectedServices: ['Web应用', 'API服务'],
        estimatedDuration: '2小时',
      });

      expect(result.success).toBe(true);
    });

    it('应该发送安全事件通知', async () => {
      const result = await notifySystemEvent({
        type: 'security',
        title: '安全告警',
        description: '检测到异常登录尝试',
        severity: 'warning',
      });

      expect(result.success).toBe(true);
    });
  });
});
