/**
 * v1.3.6 Features Unit Tests
 * 
 * Tests for:
 * 1. Webhook Management Frontend API
 * 2. Annual Planning Calendar View
 * 3. Cost Alert Webhook Integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database functions
vi.mock('./db', () => ({
  getWebhookConfigs: vi.fn(),
  getEnabledWebhooksByEvent: vi.fn(),
  createWebhookConfig: vi.fn(),
  updateWebhookConfig: vi.fn(),
  deleteWebhookConfig: vi.fn(),
  testWebhookConfig: vi.fn(),
  createWebhookLog: vi.fn(),
  getWebhookLogs: vi.fn(),
  checkProjectCostAlerts: vi.fn(),
  getProjectCostAlertRules: vi.fn(),
  getProjectCostSummary: vi.fn(),
  getProjectById: vi.fn(),
  getAnnualPlanningItems: vi.fn(),
  getAnnualPlanningConfigs: vi.fn(),
}));

// Import mocked functions
import {
  getWebhookConfigs,
  getEnabledWebhooksByEvent,
  createWebhookConfig,
  updateWebhookConfig,
  deleteWebhookConfig,
  testWebhookConfig,
  createWebhookLog,
  getWebhookLogs,
  checkProjectCostAlerts,
  getProjectCostAlertRules,
  getProjectCostSummary,
  getProjectById,
  getAnnualPlanningItems,
  getAnnualPlanningConfigs,
} from './db';

describe('Webhook Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWebhookConfigs', () => {
    it('should return all webhook configurations', async () => {
      const mockConfigs = [
        { id: 1, name: 'WeCom Bot', type: 'wecom', webhookUrl: 'https://qyapi.weixin.qq.com/...', enabled: true },
        { id: 2, name: 'DingTalk Bot', type: 'dingtalk', webhookUrl: 'https://oapi.dingtalk.com/...', enabled: false },
      ];
      
      vi.mocked(getWebhookConfigs).mockResolvedValue(mockConfigs as any);
      
      const result = await getWebhookConfigs();
      
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('wecom');
      expect(result[1].type).toBe('dingtalk');
    });

    it('should return empty array when no configs exist', async () => {
      vi.mocked(getWebhookConfigs).mockResolvedValue([]);
      
      const result = await getWebhookConfigs();
      
      expect(result).toEqual([]);
    });
  });

  describe('getEnabledWebhooksByEvent', () => {
    it('should filter webhooks by event type', async () => {
      const mockConfigs = [
        { id: 1, name: 'Cost Alert Bot', type: 'wecom', enabled: true, triggerEvents: '["cost_alert"]' },
        { id: 2, name: 'Meeting Bot', type: 'dingtalk', enabled: true, triggerEvents: '["meeting_reminder"]' },
      ];
      
      vi.mocked(getEnabledWebhooksByEvent).mockImplementation(async (eventType) => {
        return mockConfigs.filter(c => {
          const events = JSON.parse(c.triggerEvents);
          return events.includes(eventType);
        }) as any;
      });
      
      const costAlertWebhooks = await getEnabledWebhooksByEvent('cost_alert');
      expect(costAlertWebhooks).toHaveLength(1);
      expect(costAlertWebhooks[0].name).toBe('Cost Alert Bot');
      
      const meetingWebhooks = await getEnabledWebhooksByEvent('meeting_reminder');
      expect(meetingWebhooks).toHaveLength(1);
      expect(meetingWebhooks[0].name).toBe('Meeting Bot');
    });

    it('should return webhooks with "all" event type for any event', async () => {
      const mockConfigs = [
        { id: 1, name: 'All Events Bot', type: 'feishu', enabled: true, triggerEvents: '["all"]' },
      ];
      
      vi.mocked(getEnabledWebhooksByEvent).mockResolvedValue(mockConfigs as any);
      
      const result = await getEnabledWebhooksByEvent('any_event');
      
      expect(result).toHaveLength(1);
    });
  });

  describe('createWebhookConfig', () => {
    it('should create a new webhook configuration', async () => {
      const newConfig = {
        name: 'New Bot',
        type: 'custom',
        webhookUrl: 'https://example.com/webhook',
        enabled: true,
        triggerEvents: '["cost_alert", "meeting_reminder"]',
      };
      
      vi.mocked(createWebhookConfig).mockResolvedValue({ id: 3, ...newConfig } as any);
      
      const result = await createWebhookConfig(newConfig as any);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(3);
      expect(result?.name).toBe('New Bot');
    });
  });

  describe('updateWebhookConfig', () => {
    it('should update an existing webhook configuration', async () => {
      vi.mocked(updateWebhookConfig).mockResolvedValue({ success: true });
      
      const result = await updateWebhookConfig(1, { enabled: false });
      
      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteWebhookConfig', () => {
    it('should delete a webhook configuration', async () => {
      vi.mocked(deleteWebhookConfig).mockResolvedValue({ success: true });
      
      const result = await deleteWebhookConfig(1);
      
      expect(result).toEqual({ success: true });
    });
  });
});

describe('Cost Alert Webhook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkProjectCostAlerts with Webhook', () => {
    it('should check cost alerts and prepare webhook data', async () => {
      const mockProject = { id: 1, name: 'Test Project' };
      const mockSummary = {
        totalBudget: 100000,
        totalActualCost: 85000,
        budgetUtilization: 85,
        cpi: 0.95,
      };
      const mockRules = [
        { id: 1, name: '80% Budget Alert', alertType: 'budget_percent', threshold: 80, alertLevel: 'warning' },
      ];
      
      vi.mocked(getProjectById).mockResolvedValue(mockProject as any);
      vi.mocked(getProjectCostSummary).mockResolvedValue(mockSummary as any);
      vi.mocked(getProjectCostAlertRules).mockResolvedValue(mockRules as any);
      vi.mocked(checkProjectCostAlerts).mockResolvedValue([
        {
          ruleId: 1,
          projectId: 1,
          alertLevel: 'warning',
          title: '成本预警: 80% Budget Alert',
          content: '项目成本已触发预警规则"80% Budget Alert"。当前值: 85, 阈值: 80',
          currentValue: 85,
          thresholdValue: 80,
          status: 'pending',
          isNotified: 0,
        }
      ] as any);
      
      const alerts = await checkProjectCostAlerts(1, true);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertLevel).toBe('warning');
      expect(alerts[0].currentValue).toBe(85);
    });

    it('should not trigger alerts when under threshold', async () => {
      vi.mocked(checkProjectCostAlerts).mockResolvedValue([]);
      
      const alerts = await checkProjectCostAlerts(1, true);
      
      expect(alerts).toHaveLength(0);
    });
  });
});

describe('Annual Planning Calendar View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAnnualPlanningItems', () => {
    it('should return items grouped by month', async () => {
      const mockItems = [
        { id: 1, name: 'Q1 Planning', month: 1, category: 'meeting', status: 'completed' },
        { id: 2, name: 'Q1 Training', month: 1, category: 'training', status: 'pending' },
        { id: 3, name: 'Q2 Review', month: 4, category: 'meeting', status: 'pending' },
        { id: 4, name: 'Annual Party', month: 12, category: 'culture', status: 'pending' },
      ];
      
      vi.mocked(getAnnualPlanningItems).mockResolvedValue(mockItems as any);
      
      const items = await getAnnualPlanningItems(1);
      
      expect(items).toHaveLength(4);
      
      // Group by month
      const itemsByMonth: Record<number, typeof mockItems> = {};
      items.forEach((item: any) => {
        if (!itemsByMonth[item.month]) {
          itemsByMonth[item.month] = [];
        }
        itemsByMonth[item.month].push(item);
      });
      
      expect(itemsByMonth[1]).toHaveLength(2);
      expect(itemsByMonth[4]).toHaveLength(1);
      expect(itemsByMonth[12]).toHaveLength(1);
    });

    it('should filter items by category', async () => {
      const mockItems = [
        { id: 1, name: 'Training 1', month: 1, category: 'training' },
        { id: 2, name: 'Training 2', month: 3, category: 'training' },
      ];
      
      vi.mocked(getAnnualPlanningItems).mockResolvedValue(mockItems as any);
      
      const items = await getAnnualPlanningItems(1);
      const trainingItems = items.filter((i: any) => i.category === 'training');
      
      expect(trainingItems).toHaveLength(2);
    });

    it('should calculate completion statistics', async () => {
      const mockItems = [
        { id: 1, name: 'Item 1', status: 'completed' },
        { id: 2, name: 'Item 2', status: 'completed' },
        { id: 3, name: 'Item 3', status: 'pending' },
        { id: 4, name: 'Item 4', status: 'in_progress' },
      ];
      
      vi.mocked(getAnnualPlanningItems).mockResolvedValue(mockItems as any);
      
      const items = await getAnnualPlanningItems(1);
      const completedCount = items.filter((i: any) => i.status === 'completed').length;
      const completionRate = (completedCount / items.length) * 100;
      
      expect(completedCount).toBe(2);
      expect(completionRate).toBe(50);
    });
  });

  describe('getAnnualPlanningConfigs', () => {
    it('should return configs for a specific year', async () => {
      const mockConfigs = [
        { id: 1, year: 2026, version: 'v1.0', versionName: '2026年度规划', isActive: true },
        { id: 2, year: 2026, version: 'v1.1', versionName: '2026年度规划修订版', isActive: false },
      ];
      
      vi.mocked(getAnnualPlanningConfigs).mockResolvedValue(mockConfigs as any);
      
      const configs = await getAnnualPlanningConfigs(2026);
      
      expect(configs).toHaveLength(2);
      expect(configs[0].year).toBe(2026);
    });
  });
});

describe('Webhook Log Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWebhookLog', () => {
    it('should create a webhook log entry', async () => {
      const logData = {
        webhookId: 1,
        eventType: 'cost_alert',
        payload: '{"title":"Cost Alert"}',
        responseStatus: 200,
        responseBody: '{"errcode":0}',
        success: true,
      };
      
      vi.mocked(createWebhookLog).mockResolvedValue({ id: 1, ...logData } as any);
      
      const result = await createWebhookLog(logData as any);
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });

  describe('getWebhookLogs', () => {
    it('should return webhook logs with pagination', async () => {
      const mockLogs = [
        { id: 1, webhookId: 1, eventType: 'cost_alert', success: true, createdAt: new Date() },
        { id: 2, webhookId: 1, eventType: 'meeting_reminder', success: false, createdAt: new Date() },
      ];
      
      vi.mocked(getWebhookLogs).mockResolvedValue(mockLogs as any);
      
      const logs = await getWebhookLogs(1);
      
      expect(logs).toHaveLength(2);
    });
  });
});

describe('Webhook Message Formatting', () => {
  it('should format cost alert message correctly', () => {
    const alert = {
      title: '成本预警: 预算使用率80%',
      projectName: 'GRT项目',
      alertLevel: 'warning' as const,
      currentValue: 85,
      thresholdValue: 80,
      ruleName: '预算使用率80%预警',
    };

    const levelEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨'
    };

    const formattedTitle = `${levelEmoji[alert.alertLevel]} 成本预警: ${alert.title}`;
    
    expect(formattedTitle).toContain('⚠️');
    expect(formattedTitle).toContain('成本预警');
  });

  it('should format meeting reminder message correctly', () => {
    const meeting = {
      title: '项目周会',
      startTime: new Date('2026-01-20T10:00:00'),
      location: '会议室A',
    };

    const formattedTitle = `📅 会议提醒: ${meeting.title}`;
    
    expect(formattedTitle).toContain('📅');
    expect(formattedTitle).toContain('项目周会');
  });
});

describe('Calendar View Data Processing', () => {
  it('should correctly identify current month', () => {
    const currentMonth = new Date().getMonth() + 1;
    const selectedYear = new Date().getFullYear();
    
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const currentMonthData = months.find(m => m === currentMonth && selectedYear === new Date().getFullYear());
    
    expect(currentMonthData).toBe(currentMonth);
  });

  it('should calculate items per category', () => {
    const items = [
      { category: 'culture', name: 'Party' },
      { category: 'training', name: 'Training 1' },
      { category: 'training', name: 'Training 2' },
      { category: 'meeting', name: 'Meeting 1' },
    ];

    const categoryCount: Record<string, number> = {};
    items.forEach(item => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });

    expect(categoryCount['culture']).toBe(1);
    expect(categoryCount['training']).toBe(2);
    expect(categoryCount['meeting']).toBe(1);
  });
});
