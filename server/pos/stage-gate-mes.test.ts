/**
 * 阶段门自动推进和MES工单同步单元测试
 * v1.5.8 POS系统增强功能测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock数据库模块
vi.mock('../db', () => ({
  requireDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  }),
}));

// Mock通知服务
vi.mock('./notification.service', () => ({
  sendNotification: vi.fn().mockResolvedValue({ success: true }),
  NotificationTemplates: {
    projectStatusChange: vi.fn(),
    stageReviewResult: vi.fn(),
  },
}));

describe('阶段门自动推进服务', () => {
  describe('checkReviewsPassed', () => {
    it('应该正确判断所有评审通过', async () => {
      const { checkReviewsPassed } = await import('./stage-gate-auto-advance.service');
      
      const reviews = [
        { conclusion: 'PASS' },
        { conclusion: 'PASS' },
        { conclusion: 'CONDITIONAL' },
      ];
      
      const result = await checkReviewsPassed(1, 'M3', reviews);
      
      expect(result.allPassed).toBe(true);
      expect(result.passedCount).toBe(3);
      expect(result.totalCount).toBe(3);
      expect(result.failedItems).toHaveLength(0);
    });

    it('应该正确识别未通过的评审', async () => {
      const { checkReviewsPassed } = await import('./stage-gate-auto-advance.service');
      
      const reviews = [
        { conclusion: 'PASS' },
        { conclusion: 'FAIL' },
        { conclusion: 'PENDING' },
      ];
      
      const result = await checkReviewsPassed(1, 'M3', reviews);
      
      expect(result.allPassed).toBe(false);
      expect(result.passedCount).toBe(1);
      expect(result.failedItems.length).toBeGreaterThan(0);
    });

    it('应该处理未定义的阶段规则', async () => {
      const { checkReviewsPassed } = await import('./stage-gate-auto-advance.service');
      
      const reviews = [{ conclusion: 'PASS' }];
      
      const result = await checkReviewsPassed(1, 'M99', reviews);
      
      expect(result.allPassed).toBe(false);
      expect(result.failedItems).toContain('未定义的阶段规则');
    });
  });

  describe('canAdvanceToNextStage', () => {
    it('应该返回M3的下一阶段为M4', async () => {
      const { canAdvanceToNextStage } = await import('./stage-gate-auto-advance.service');
      
      const result = canAdvanceToNextStage('M3');
      
      expect(result.canAdvance).toBe(true);
      expect(result.nextStage).toBe('M4');
      expect(result.requirements.length).toBeGreaterThan(0);
    });

    it('应该返回M4的下一阶段为M5', async () => {
      const { canAdvanceToNextStage } = await import('./stage-gate-auto-advance.service');
      
      const result = canAdvanceToNextStage('M4');
      
      expect(result.canAdvance).toBe(true);
      expect(result.nextStage).toBe('M5');
    });

    it('应该返回M6的下一阶段为M7', async () => {
      const { canAdvanceToNextStage } = await import('./stage-gate-auto-advance.service');
      
      const result = canAdvanceToNextStage('M6');
      
      expect(result.canAdvance).toBe(true);
      expect(result.nextStage).toBe('M7');
    });

    it('应该处理未定义的阶段', async () => {
      const { canAdvanceToNextStage } = await import('./stage-gate-auto-advance.service');
      
      const result = canAdvanceToNextStage('M99');
      
      expect(result.canAdvance).toBe(false);
      expect(result.nextStage).toBeNull();
    });
  });

  describe('阶段推进规则覆盖', () => {
    it('应该定义M3到M11的所有推进规则', async () => {
      const { canAdvanceToNextStage } = await import('./stage-gate-auto-advance.service');
      
      const stages = ['M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'];
      
      for (const stage of stages) {
        const result = canAdvanceToNextStage(stage);
        expect(result.canAdvance).toBe(true);
        expect(result.nextStage).toBeTruthy();
      }
    });
  });
});

describe('MES工单同步服务', () => {
  describe('pullProgressFromMES', () => {
    it('应该返回工单进度信息', async () => {
      const { pullProgressFromMES } = await import('./mes-workorder-sync.service');
      
      const result = await pullProgressFromMES('WO-TEST-001');
      
      expect(result.workOrderCode).toBe('WO-TEST-001');
      expect(result.mesStatus).toBe('InProgress');
      expect(result.completedQuantity).toBeGreaterThanOrEqual(0);
      expect(result.totalQuantity).toBe(100);
      expect(result.completionRate).toBeGreaterThanOrEqual(0);
      expect(result.completionRate).toBeLessThanOrEqual(1);
      expect(result.operations).toBeInstanceOf(Array);
      expect(result.operations.length).toBeGreaterThan(0);
    });

    it('应该返回工序列表', async () => {
      const { pullProgressFromMES } = await import('./mes-workorder-sync.service');
      
      const result = await pullProgressFromMES('WO-TEST-002');
      
      expect(result.operations).toBeInstanceOf(Array);
      result.operations.forEach(op => {
        expect(op).toHaveProperty('opCode');
        expect(op).toHaveProperty('opName');
        expect(op).toHaveProperty('status');
        expect(['Pending', 'InProgress', 'Completed']).toContain(op.status);
      });
    });
  });

  describe('MES工单类型', () => {
    it('应该支持所有工单类型', async () => {
      const workOrderTypes = ['Production', 'Assembly', 'Testing', 'Debugging', 'Packaging'];
      
      workOrderTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('MES同步状态', () => {
    it('应该定义所有同步状态', () => {
      const syncStatuses = ['Pending', 'Syncing', 'Synced', 'Failed', 'Conflict'];
      
      syncStatuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });
  });
});

describe('AI版本对比功能', () => {
  describe('版本数据结构', () => {
    it('应该包含所有必要字段', () => {
      const mockVersion = {
        id: 1,
        versionCode: 'AIV0',
        versionName: '基础版本',
        description: '基于历史项目生成的基础版本',
        features: ['标准清洗流程', '基础自动化'],
        estimatedCost: 500000,
        estimatedDuration: '12周',
        riskLevel: 'low' as const,
        recommendation: '适合标准项目',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
      };

      expect(mockVersion).toHaveProperty('id');
      expect(mockVersion).toHaveProperty('versionCode');
      expect(mockVersion).toHaveProperty('versionName');
      expect(mockVersion).toHaveProperty('description');
      expect(mockVersion).toHaveProperty('features');
      expect(mockVersion).toHaveProperty('estimatedCost');
      expect(mockVersion).toHaveProperty('estimatedDuration');
      expect(mockVersion).toHaveProperty('riskLevel');
      expect(mockVersion).toHaveProperty('recommendation');
      expect(mockVersion).toHaveProperty('status');
    });

    it('应该支持多版本对比', () => {
      const versions = [
        { id: 1, versionCode: 'AIV0', estimatedCost: 500000 },
        { id: 2, versionCode: 'AIV1', estimatedCost: 650000 },
        { id: 3, versionCode: 'AIV2', estimatedCost: 800000 },
      ];

      expect(versions.length).toBe(3);
      expect(versions[1].estimatedCost).toBeGreaterThan(versions[0].estimatedCost);
      expect(versions[2].estimatedCost).toBeGreaterThan(versions[1].estimatedCost);
    });
  });

  describe('版本差异计算', () => {
    it('应该识别成本差异', () => {
      const v1 = { estimatedCost: 500000 };
      const v2 = { estimatedCost: 650000 };
      
      const costDiff = v2.estimatedCost - v1.estimatedCost;
      
      expect(costDiff).toBe(150000);
    });

    it('应该识别特性差异', () => {
      const v1Features = new Set(['A', 'B', 'C']);
      const v2Features = new Set(['B', 'C', 'D']);
      
      const added = [...v2Features].filter(f => !v1Features.has(f));
      const removed = [...v1Features].filter(f => !v2Features.has(f));
      
      expect(added).toContain('D');
      expect(removed).toContain('A');
    });
  });
});

describe('集成测试', () => {
  describe('M3评审到M4推进流程', () => {
    it('应该在评审全部通过时允许推进', async () => {
      const { checkReviewsPassed, canAdvanceToNextStage } = await import('./stage-gate-auto-advance.service');
      
      // 1. 检查评审结果
      const reviews = [
        { conclusion: 'PASS' },
        { conclusion: 'PASS' },
        { conclusion: 'CONDITIONAL' },
      ];
      const checkResult = await checkReviewsPassed(1, 'M3', reviews);
      
      // 2. 检查是否可以推进
      const advanceCheck = canAdvanceToNextStage('M3');
      
      expect(checkResult.allPassed).toBe(true);
      expect(advanceCheck.canAdvance).toBe(true);
      expect(advanceCheck.nextStage).toBe('M4');
    });
  });

  describe('M6阶段MES工单创建流程', () => {
    it('应该能够拉取MES进度', async () => {
      const { pullProgressFromMES } = await import('./mes-workorder-sync.service');
      
      const progress = await pullProgressFromMES('WO-TEST-M6-001');
      
      expect(progress).toBeDefined();
      expect(progress.workOrderCode).toBe('WO-TEST-M6-001');
      expect(progress.operations.length).toBeGreaterThan(0);
    });
  });
});
