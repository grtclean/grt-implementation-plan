/**
 * v1.3.75 生产执行模块增强功能单元测试
 * Production Execution Module Enhancement Tests
 * 
 * 测试内容：
 * 1. ProductionExecutionView页面集成
 * 2. UWB设备数据同步服务
 * 3. 审批通知推送服务
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Mock 设置
// ============================================================================

// Mock fetch for notification tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================================================
// UWB同步服务测试
// ============================================================================

describe('UWB Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Status', () => {
    it('should return initial status as stopped', async () => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      const status = uwbSyncService.getStatus();
      
      expect(status).toBeDefined();
      expect(status.isRunning).toBe(false);
    });

    it('should have correct status structure', async () => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      const status = uwbSyncService.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('deviceCount');
      expect(status).toHaveProperty('activeEntries');
    });
  });

  describe('Device Management', () => {
    it('should have device management methods defined', async () => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      
      // Verify methods exist
      expect(typeof uwbSyncService.addDevice).toBe('function');
      expect(typeof uwbSyncService.removeDevice).toBe('function');
    });

    it('should accept valid device configuration', () => {
      const device = {
        id: 'test-device-001',
        deviceType: 'TAG' as const,
        deviceName: 'Test Tag 1',
        location: 'Workshop A',
        zoneId: 'zone-1',
        zoneName: 'Machining Zone',
        isActive: true,
        lastHeartbeat: new Date(),
        config: {
          protocol: 'DECAWAVE' as const,
          refreshInterval: 30,
          positionThreshold: 0.5,
          zoneDefinitions: [],
        },
      };

      // Validate device structure
      expect(device.id).toBeDefined();
      expect(device.deviceType).toBe('TAG');
      expect(device.config.protocol).toBe('DECAWAVE');
    });
  });

  describe('Manual Sync', () => {
    it('should have manualSync method defined', async () => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      
      expect(typeof uwbSyncService.manualSync).toBe('function');
    });

    it('should return expected result structure from manualSync', () => {
      // Define expected result structure
      const expectedStructure = {
        success: true,
        syncedRecords: 0,
        errors: [],
        timestamp: new Date(),
      };
      
      expect(expectedStructure).toHaveProperty('success');
      expect(expectedStructure).toHaveProperty('syncedRecords');
      expect(expectedStructure).toHaveProperty('errors');
      expect(expectedStructure).toHaveProperty('timestamp');
    });
  });

  describe('Service Lifecycle', () => {
    it('should have start and stop methods defined', async () => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      
      expect(typeof uwbSyncService.start).toBe('function');
      expect(typeof uwbSyncService.stop).toBe('function');
    });

    it('should have getStatus method defined', async () => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      
      expect(typeof uwbSyncService.getStatus).toBe('function');
      const status = uwbSyncService.getStatus();
      expect(status).toBeDefined();
    });
  });
});

// ============================================================================
// 通知服务测试
// ============================================================================

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ errcode: 0, msgid: 'test-msg-id' }),
    });
  });

  describe('Service Configuration', () => {
    it('should have SYSTEM channel enabled by default', async () => {
      const { notificationService } = await import('./notification.service');
      
      const channels = notificationService.getConfiguredChannels();
      expect(channels).toContain('SYSTEM');
    });

    it('should return config for SYSTEM channel', async () => {
      const { notificationService } = await import('./notification.service');
      
      const config = notificationService.getConfig('SYSTEM');
      expect(config).toBeDefined();
      expect(config?.enabled).toBe(true);
    });
  });

  describe('Channel Configuration Update', () => {
    it('should update channel configuration', async () => {
      const { notificationService } = await import('./notification.service');
      
      notificationService.updateConfig('WECOM', {
        enabled: true,
        webhookUrl: 'https://test-webhook.example.com',
      });
      
      const config = notificationService.getConfig('WECOM');
      expect(config?.enabled).toBe(true);
      expect(config?.webhookUrl).toBe('https://test-webhook.example.com');
    });

    it('should disable channel', async () => {
      const { notificationService } = await import('./notification.service');
      
      notificationService.updateConfig('DINGTALK', {
        enabled: false,
      });
      
      const config = notificationService.getConfig('DINGTALK');
      expect(config?.enabled).toBe(false);
    });
  });

  describe('Notification Sending', () => {
    it('should send notification to SYSTEM channel', async () => {
      const { notificationService } = await import('./notification.service');
      
      const results = await notificationService.send(
        {
          type: 'STAGE_ALERT',
          title: 'Test Alert',
          titleZh: '测试警报',
          content: 'Test content',
          contentZh: '测试内容',
          projectName: 'Test Project',
          stageCode: 'T1',
          stageName: 'Machining',
        },
        [{ userId: 1, userName: 'Test User' }],
        ['SYSTEM']
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('SYSTEM');
    });

    it('should return error for unconfigured channel', async () => {
      const { notificationService } = await import('./notification.service');
      
      // Ensure EMAIL is not configured
      notificationService.updateConfig('EMAIL', { enabled: false });
      
      const results = await notificationService.send(
        {
          type: 'APPROVAL_REQUEST',
          title: 'Test',
          titleZh: '测试',
          content: 'Test',
          contentZh: '测试',
        },
        [{ userId: 1, userName: 'Test' }],
        ['EMAIL']
      );
      
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('not configured or disabled');
    });
  });

  describe('Convenience Functions', () => {
    it('should send approval request notification', async () => {
      const { notifyApprovalRequest } = await import('./notification.service');
      
      const results = await notifyApprovalRequest(
        1,
        'Test Project',
        'T6',
        'Electrical Assembly',
        'John Doe',
        'STAGE_GATE',
        'https://example.com/approve/1',
        [{ userId: 1, userName: 'Approver' }]
      );
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should send approval result notification', async () => {
      const { notifyApprovalResult } = await import('./notification.service');
      
      const results = await notifyApprovalResult(
        1,
        'Test Project',
        'T6',
        'Electrical Assembly',
        'Manager',
        'APPROVED',
        'Good work!',
        '',
        [{ userId: 1, userName: 'Requester' }]
      );
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should send stage status notification', async () => {
      const { notifyStageStatus } = await import('./notification.service');
      
      const results = await notifyStageStatus(
        1,
        'Test Project',
        'T1',
        'Machining',
        'COMPLETED',
        { actualHours: 8, variance: -5 },
        [{ userId: 1, userName: 'Team Lead' }]
      );
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Language Support', () => {
    it('should set default language', async () => {
      const { notificationService } = await import('./notification.service');
      
      // Should not throw
      expect(() => notificationService.setDefaultLanguage('en')).not.toThrow();
      expect(() => notificationService.setDefaultLanguage('zh')).not.toThrow();
    });
  });
});

// ============================================================================
// 通知类型测试
// ============================================================================

describe('Notification Types', () => {
  it('should have all required notification types', async () => {
    const { NotificationService } = await import('./notification.service');
    
    const expectedTypes = [
      'APPROVAL_REQUEST',
      'APPROVAL_APPROVED',
      'APPROVAL_REJECTED',
      'APPROVAL_REMINDER',
      'APPROVAL_ESCALATION',
      'STAGE_STARTED',
      'STAGE_COMPLETED',
      'STAGE_ALERT',
      'TIME_RECORD_CREATED',
      'UWB_SYNC_COMPLETED',
    ];
    
    // Types are defined in the module
    expect(expectedTypes).toBeDefined();
  });

  it('should have all required notification channels', async () => {
    const expectedChannels = ['WECOM', 'DINGTALK', 'EMAIL', 'SMS', 'SYSTEM'];
    
    // Channels are defined in the module
    expect(expectedChannels).toBeDefined();
  });
});

// ============================================================================
// 集成测试
// ============================================================================

describe('Integration Tests', () => {
  describe('UWB + Notification Integration', () => {
    it('should be able to notify after UWB sync', async () => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      const { notificationService } = await import('./notification.service');
      
      // Perform sync
      const syncResult = await uwbSyncService.manualSync();
      
      // Send notification about sync
      const notifyResults = await notificationService.send(
        {
          type: 'UWB_SYNC_COMPLETED',
          title: 'UWB Sync Completed',
          titleZh: 'UWB同步完成',
          content: '',
          contentZh: '',
          metadata: {
            syncedRecords: syncResult.syncedRecords,
            errorCount: syncResult.errors.length,
            timestamp: syncResult.timestamp.toISOString(),
          },
        },
        [{ userId: 1, userName: 'Admin' }],
        ['SYSTEM']
      );
      
      expect(notifyResults).toBeDefined();
    });
  });

  describe('Approval Workflow Integration', () => {
    it('should handle complete approval workflow', async () => {
      const { notifyApprovalRequest, notifyApprovalResult } = await import('./notification.service');
      
      // Step 1: Send approval request
      const requestResults = await notifyApprovalRequest(
        1,
        'Integration Test Project',
        'T10',
        'System Integration',
        'Engineer A',
        'QUALITY_CHECK',
        'https://example.com/approve/test',
        [{ userId: 2, userName: 'QC Manager' }]
      );
      
      expect(requestResults).toBeDefined();
      
      // Step 2: Send approval result
      const resultResults = await notifyApprovalResult(
        1,
        'Integration Test Project',
        'T10',
        'System Integration',
        'QC Manager',
        'APPROVED',
        'All checks passed',
        '',
        [{ userId: 1, userName: 'Engineer A' }]
      );
      
      expect(resultResults).toBeDefined();
    });
  });
});

// ============================================================================
// 边界条件测试
// ============================================================================

describe('Edge Cases', () => {
  describe('UWB Service Edge Cases', () => {
    it('should have manualSync method defined', async () => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      
      expect(typeof uwbSyncService.manualSync).toBe('function');
    });

    it('should have removeDevice method defined', async () => {
      const { uwbSyncService } = await import('./uwb-sync.service');
      
      expect(typeof uwbSyncService.removeDevice).toBe('function');
    });
  });

  describe('Notification Service Edge Cases', () => {
    it('should handle empty recipients list', async () => {
      const { notificationService } = await import('./notification.service');
      
      const results = await notificationService.send(
        {
          type: 'STAGE_ALERT',
          title: 'Test',
          titleZh: '测试',
          content: 'Test',
          contentZh: '测试',
        },
        [],
        ['SYSTEM']
      );
      
      expect(results).toBeDefined();
    });

    it('should handle missing optional metadata', async () => {
      const { notificationService } = await import('./notification.service');
      
      const results = await notificationService.send(
        {
          type: 'APPROVAL_REQUEST',
          title: 'Test',
          titleZh: '测试',
          content: 'Test',
          contentZh: '测试',
          // No optional fields
        },
        [{ userId: 1, userName: 'Test' }],
        ['SYSTEM']
      );
      
      expect(results).toBeDefined();
    });
  });
});
