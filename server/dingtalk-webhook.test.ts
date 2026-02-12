/**
 * 钉钉Webhook服务单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendDingTalkMessage,
  sendAlertToDingTalk,
  sendCostAlertToDingTalk,
  sendSystemAlertToDingTalk,
  sendMeetingReminderToDingTalk,
  testDingTalkConnection,
  sendTestAlert,
  sendTestMeetingReminder,
  updateDingTalkConfig,
  getDingTalkConfig,
  type AlertLevel,
  type AlertMessage,
  type MeetingInfo,
} from './dingtalk-webhook';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('钉钉Webhook服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置配置
    updateDingTalkConfig({
      enabled: true,
      keyword: '1',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendDingTalkMessage', () => {
    it('应该成功发送文本消息', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendDingTalkMessage({
        title: '测试标题',
        content: '测试内容',
        type: 'text',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('应该成功发送Markdown消息', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendDingTalkMessage({
        title: '测试标题',
        content: '**测试内容**',
        type: 'markdown',
      });

      expect(result.success).toBe(true);
    });

    it('应该在消息中包含关键词', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      await sendDingTalkMessage({
        title: '测试',
        content: '内容',
        type: 'text',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.text.content).toContain('[1]');
    });

    it('应该在URL中包含签名参数', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      await sendDingTalkMessage({
        title: '测试',
        content: '内容',
      });

      const callArgs = mockFetch.mock.calls[0];
      const url = callArgs[0];
      expect(url).toContain('timestamp=');
      expect(url).toContain('sign=');
    });

    it('应该处理API错误', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 310000, errmsg: 'keywords not in content' }),
      });

      const result = await sendDingTalkMessage({
        title: '测试',
        content: '内容',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('310000');
    });

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendDingTalkMessage({
        title: '测试',
        content: '内容',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('当Webhook禁用时应该返回错误', async () => {
      updateDingTalkConfig({ enabled: false });

      const result = await sendDingTalkMessage({
        title: '测试',
        content: '内容',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('钉钉Webhook未启用');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('应该支持@所有人', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      await sendDingTalkMessage({
        title: '紧急通知',
        content: '内容',
        atAll: true,
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.at.isAtAll).toBe(true);
    });
  });

  describe('sendAlertToDingTalk', () => {
    it('应该发送信息级别告警', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const alert: AlertMessage = {
        level: 'info',
        title: '系统通知',
        description: '系统运行正常',
        source: '监控系统',
        timestamp: new Date(),
      };

      const result = await sendAlertToDingTalk(alert);
      expect(result.success).toBe(true);
    });

    it('应该发送警告级别告警', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const alert: AlertMessage = {
        level: 'warning',
        title: '性能警告',
        description: 'CPU使用率超过80%',
        source: '性能监控',
        timestamp: new Date(),
      };

      const result = await sendAlertToDingTalk(alert);
      expect(result.success).toBe(true);
    });

    it('紧急告警应该@所有人', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const alert: AlertMessage = {
        level: 'emergency',
        title: '系统故障',
        description: '数据库连接失败',
        source: '系统监控',
        timestamp: new Date(),
      };

      await sendAlertToDingTalk(alert);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.at.isAtAll).toBe(true);
    });

    it('严重告警应该@所有人', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const alert: AlertMessage = {
        level: 'critical',
        title: '服务异常',
        description: 'API响应超时',
        source: '服务监控',
        timestamp: new Date(),
      };

      await sendAlertToDingTalk(alert);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.at.isAtAll).toBe(true);
    });

    it('应该包含项目信息', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const alert: AlertMessage = {
        level: 'warning',
        title: '项目告警',
        description: '项目进度延迟',
        source: '项目管理',
        projectId: 'proj-001',
        projectName: 'GRT智能系统',
        timestamp: new Date(),
      };

      await sendAlertToDingTalk(alert);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.markdown.text).toContain('GRT智能系统');
    });

    it('应该包含附加详情', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const alert: AlertMessage = {
        level: 'info',
        title: '详细告警',
        description: '测试详情',
        source: '测试',
        timestamp: new Date(),
        details: {
          '指标1': '值1',
          '指标2': '值2',
        },
      };

      await sendAlertToDingTalk(alert);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.markdown.text).toContain('指标1');
      expect(body.markdown.text).toContain('值1');
    });
  });

  describe('sendCostAlertToDingTalk', () => {
    it('应该发送成本预警', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendCostAlertToDingTalk({
        projectId: 'proj-001',
        projectName: '测试项目',
        alertType: '预算超支',
        threshold: 0.8,
        currentValue: 0.85,
        message: '项目成本已超过预算的85%',
      });

      expect(result.success).toBe(true);
    });

    it('超过阈值120%应该是严重级别', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      await sendCostAlertToDingTalk({
        projectId: 'proj-001',
        projectName: '测试项目',
        alertType: '预算超支',
        threshold: 0.8,
        currentValue: 1.0, // 超过0.8 * 1.2 = 0.96
        message: '项目成本已超过预算',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.at.isAtAll).toBe(true); // critical级别@所有人
    });
  });

  describe('sendSystemAlertToDingTalk', () => {
    it('应该发送系统健康告警', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendSystemAlertToDingTalk({
        type: 'health',
        title: '系统健康检查',
        description: '所有服务运行正常',
        severity: 'info',
      });

      expect(result.success).toBe(true);
    });

    it('应该发送性能告警', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendSystemAlertToDingTalk({
        type: 'performance',
        title: '性能告警',
        description: '响应时间过长',
        severity: 'warning',
        details: {
          '平均响应时间': '2.5s',
          '阈值': '1s',
        },
      });

      expect(result.success).toBe(true);
    });

    it('应该发送安全告警', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendSystemAlertToDingTalk({
        type: 'security',
        title: '安全告警',
        description: '检测到异常登录尝试',
        severity: 'critical',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendMeetingReminderToDingTalk', () => {
    it('应该发送会议提醒', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const meeting: MeetingInfo = {
        id: 'meeting-001',
        title: '项目周会',
        startTime: new Date(),
        location: '会议室A',
        organizer: '张三',
        participants: ['李四', '王五'],
        reminderMinutes: 15,
      };

      const result = await sendMeetingReminderToDingTalk(meeting);
      expect(result.success).toBe(true);
    });

    it('应该包含会议议程', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const meeting: MeetingInfo = {
        id: 'meeting-002',
        title: '技术评审',
        startTime: new Date(),
        location: '线上会议',
        organizer: '技术负责人',
        participants: ['开发组'],
        agenda: '1. 代码审查\n2. 架构讨论',
        reminderMinutes: 30,
      };

      await sendMeetingReminderToDingTalk(meeting);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.markdown.text).toContain('代码审查');
      expect(body.markdown.text).toContain('架构讨论');
    });
  });

  describe('testDingTalkConnection', () => {
    it('应该返回成功结果', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await testDingTalkConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('成功');
      expect(result.latency).toBeDefined();
    });

    it('应该返回失败结果', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 310000, errmsg: 'error' }),
      });

      const result = await testDingTalkConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('失败');
    });
  });

  describe('sendTestAlert', () => {
    it('应该发送测试告警', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendTestAlert();
      expect(result.success).toBe(true);
    });
  });

  describe('sendTestMeetingReminder', () => {
    it('应该发送测试会议提醒', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendTestMeetingReminder();
      expect(result.success).toBe(true);
    });
  });

  describe('配置管理', () => {
    it('应该能更新配置', () => {
      updateDingTalkConfig({
        keyword: 'GRT',
        enabled: false,
      });

      const config = getDingTalkConfig();
      expect(config.keyword).toBe('GRT');
      expect(config.enabled).toBe(false);
    });

    it('应该保留未更新的配置项', () => {
      const originalConfig = getDingTalkConfig();
      updateDingTalkConfig({ keyword: 'test' });

      const newConfig = getDingTalkConfig();
      expect(newConfig.webhookUrl).toBe(originalConfig.webhookUrl);
      expect(newConfig.secret).toBe(originalConfig.secret);
    });
  });
});
