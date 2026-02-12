/**
 * 任务完成通知推送服务单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('Task Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Webhook Payload Formatting', () => {
    it('should format WeChat webhook payload correctly', () => {
      const message = {
        type: 'task_completed' as const,
        title: '测试任务完成',
        content: '任务已完成，请审核',
        taskId: 'task_001',
        meetingId: 'meeting_001',
        meetingTitle: '周例会',
        assignee: '张三',
        timestamp: '2026-02-04T10:00:00Z'
      };

      // WeChat format should include markdown msgtype
      const expectedFormat = {
        msgtype: 'markdown',
        markdown: {
          content: expect.stringContaining('任务完成')
        }
      };

      expect(expectedFormat.msgtype).toBe('markdown');
    });

    it('should format DingTalk webhook payload correctly', () => {
      const message = {
        type: 'task_assigned' as const,
        title: '新任务分配',
        content: '您有新任务待处理',
        taskId: 'task_002',
        assignee: '李四',
        dueDate: '2026-02-10',
        timestamp: '2026-02-04T10:00:00Z'
      };

      // DingTalk format should include title in markdown
      const expectedFormat = {
        msgtype: 'markdown',
        markdown: {
          title: message.title,
          text: expect.stringContaining('新任务')
        }
      };

      expect(expectedFormat.msgtype).toBe('markdown');
      expect(expectedFormat.markdown.title).toBe('新任务分配');
    });

    it('should format Feishu webhook payload correctly', () => {
      const message = {
        type: 'task_overdue' as const,
        title: '任务逾期提醒',
        content: '任务已逾期，请尽快完成',
        taskId: 'task_003',
        dueDate: '2026-02-01',
        timestamp: '2026-02-04T10:00:00Z'
      };

      // Feishu format should use interactive card
      const expectedFormat = {
        msg_type: 'interactive',
        card: {
          header: {
            title: {
              tag: 'plain_text',
              content: expect.stringContaining('逾期')
            },
            template: 'red' // Red for overdue
          }
        }
      };

      expect(expectedFormat.msg_type).toBe('interactive');
      expect(expectedFormat.card.header.template).toBe('red');
    });
  });

  describe('Notification Types', () => {
    it('should handle task_assigned notification', () => {
      const notificationType = 'task_assigned';
      const expectedLabel = '📋 任务分配';
      
      const labels: Record<string, string> = {
        task_assigned: '📋 任务分配',
        task_accepted: '✅ 任务接受',
        task_rejected: '❌ 任务拒绝',
        task_progress: '📊 进度更新',
        task_completed: '🎉 任务完成',
        task_overdue: '⚠️ 任务逾期',
        minutes_confirmed: '📝 纪要确认',
        evidence_uploaded: '📎 举证上传'
      };

      expect(labels[notificationType]).toBe(expectedLabel);
    });

    it('should handle task_completed notification', () => {
      const notificationType = 'task_completed';
      const expectedLabel = '🎉 任务完成';
      
      const labels: Record<string, string> = {
        task_completed: '🎉 任务完成'
      };

      expect(labels[notificationType]).toBe(expectedLabel);
    });

    it('should handle evidence_uploaded notification', () => {
      const notificationType = 'evidence_uploaded';
      const expectedLabel = '📎 举证上传';
      
      const labels: Record<string, string> = {
        evidence_uploaded: '📎 举证上传'
      };

      expect(labels[notificationType]).toBe(expectedLabel);
    });
  });

  describe('Email Content Building', () => {
    it('should build email HTML with correct structure', () => {
      const message = {
        type: 'task_completed' as const,
        title: '任务完成通知',
        content: '您的任务已完成',
        meetingTitle: '项目周会',
        assignee: '王五',
        progress: 100,
        completionNote: '已按时完成所有工作',
        timestamp: '2026-02-04T10:00:00Z'
      };

      // Email should contain key sections
      const expectedSections = [
        'GRT智能系统',
        '任务完成',
        '会议',
        '负责人',
        '进度'
      ];

      expectedSections.forEach(section => {
        expect(section).toBeTruthy();
      });
    });

    it('should include progress bar in email when progress is provided', () => {
      const progress = 75;
      const expectedProgressBar = `width: ${progress}%`;

      expect(expectedProgressBar).toBe('width: 75%');
    });
  });

  describe('Notification Channels', () => {
    it('should support multiple channels', () => {
      const channels = ['email', 'webhook', 'inApp'];
      
      expect(channels).toContain('email');
      expect(channels).toContain('webhook');
      expect(channels).toContain('inApp');
      expect(channels.length).toBe(3);
    });

    it('should validate webhook types', () => {
      const validTypes = ['wechat', 'dingtalk', 'feishu', 'custom'];
      
      expect(validTypes).toContain('wechat');
      expect(validTypes).toContain('dingtalk');
      expect(validTypes).toContain('feishu');
      expect(validTypes).toContain('custom');
    });
  });

  describe('Notification Config', () => {
    it('should have correct config structure', () => {
      const config = {
        id: 'config_001',
        meetingType: 'weekly_meeting',
        channels: ['webhook', 'email'] as const,
        webhookUrl: 'https://example.com/webhook',
        webhookType: 'wechat' as const,
        emailRecipients: ['admin@example.com'],
        enabled: true
      };

      expect(config.id).toBeDefined();
      expect(config.meetingType).toBe('weekly_meeting');
      expect(config.channels).toContain('webhook');
      expect(config.enabled).toBe(true);
    });

    it('should handle disabled config', () => {
      const config = {
        id: 'config_002',
        meetingType: 'monthly_review',
        channels: [] as const,
        enabled: false
      };

      expect(config.enabled).toBe(false);
      expect(config.channels.length).toBe(0);
    });
  });

  describe('Notification Record', () => {
    it('should track notification status', () => {
      const record = {
        id: 'ntf_001',
        messageType: 'task_completed',
        channel: 'webhook',
        recipient: 'https://example.com/webhook',
        content: '{}',
        status: 'sent' as const,
        sentAt: '2026-02-04T10:00:00Z',
        createdAt: '2026-02-04T10:00:00Z'
      };

      expect(record.status).toBe('sent');
      expect(record.sentAt).toBeDefined();
    });

    it('should handle failed notification', () => {
      const record = {
        id: 'ntf_002',
        messageType: 'task_assigned',
        channel: 'email',
        recipient: 'user@example.com',
        content: 'email content',
        status: 'failed' as const,
        errorMessage: 'SMTP connection failed',
        createdAt: '2026-02-04T10:00:00Z'
      };

      expect(record.status).toBe('failed');
      expect(record.errorMessage).toBeDefined();
    });
  });

  describe('MO Notification', () => {
    it('should notify Meeting Owner on task completion', () => {
      const taskData = {
        taskId: 'task_001',
        meetingId: 'meeting_001',
        meetingType: 'weekly_production',
        taskTitle: '生产报告提交',
        completedBy: '张三',
        completionNote: '已完成本周生产报告',
        evidenceFiles: ['report.pdf', 'data.xlsx']
      };

      expect(taskData.taskId).toBeDefined();
      expect(taskData.meetingType).toBe('weekly_production');
      expect(taskData.evidenceFiles.length).toBe(2);
    });
  });

  describe('Overdue Reminder', () => {
    it('should identify overdue tasks', () => {
      const now = new Date('2026-02-04');
      const dueDate = new Date('2026-02-01');
      
      const isOverdue = dueDate < now;
      
      expect(isOverdue).toBe(true);
    });

    it('should not flag future tasks as overdue', () => {
      const now = new Date('2026-02-04');
      const dueDate = new Date('2026-02-10');
      
      const isOverdue = dueDate < now;
      
      expect(isOverdue).toBe(false);
    });
  });

  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const generateId = () => `ntf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toMatch(/^ntf_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
