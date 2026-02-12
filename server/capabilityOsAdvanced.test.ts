import { describe, it, expect } from 'vitest';
import {
  calculateLevelFromPoints,
  calculateEvidenceScore,
  distributePointsToDomains,
  LEVEL_THRESHOLDS,
  CAPABILITY_DOMAINS,
  EVIDENCE_SCORE_RULES,
  validateLevelCalculation,
} from './services/capabilityLevelService';
import {
  formatNotificationContent,
  NotificationType,
} from './services/capabilityNotificationService';

describe('Capability Level Service - Advanced Tests', () => {
  describe('calculateLevelFromPoints', () => {
    it('should return L1 for 0 points', () => {
      expect(calculateLevelFromPoints(0)).toBe(1);
    });

    it('should return L1 for 99 points', () => {
      expect(calculateLevelFromPoints(99)).toBe(1);
    });

    it('should return L2 for 100 points', () => {
      expect(calculateLevelFromPoints(100)).toBe(2);
    });

    it('should return L2 for 299 points', () => {
      expect(calculateLevelFromPoints(299)).toBe(2);
    });

    it('should return L3 for 300 points', () => {
      expect(calculateLevelFromPoints(300)).toBe(3);
    });

    it('should return L4 for 600 points', () => {
      expect(calculateLevelFromPoints(600)).toBe(4);
    });

    it('should return L5 for 1000+ points', () => {
      expect(calculateLevelFromPoints(1000)).toBe(5);
      expect(calculateLevelFromPoints(5000)).toBe(5);
    });
  });

  describe('calculateEvidenceScore', () => {
    it('should return base score with default multipliers', () => {
      expect(calculateEvidenceScore(50)).toBe(50);
    });

    it('should apply quality multiplier correctly', () => {
      expect(calculateEvidenceScore(50, 1.5)).toBe(75);
    });

    it('should apply all multipliers correctly', () => {
      expect(calculateEvidenceScore(50, 1.5, 1.2, 1.1)).toBe(99);
    });

    it('should round to nearest integer', () => {
      expect(calculateEvidenceScore(33, 1.1, 1.1, 1.1)).toBe(44);
    });
  });

  describe('distributePointsToDomains', () => {
    it('should distribute points evenly across domains', () => {
      const result = distributePointsToDomains(100, ['T', 'S', 'D']);
      expect(result).toEqual({ T: 33, S: 33, D: 33 });
    });

    it('should handle single domain', () => {
      const result = distributePointsToDomains(100, ['T']);
      expect(result).toEqual({ T: 100 });
    });

    it('should handle all six domains', () => {
      const result = distributePointsToDomains(120, ['T', 'S', 'D', 'C', 'K', 'L']);
      expect(result).toEqual({ T: 20, S: 20, D: 20, C: 20, K: 20, L: 20 });
    });
  });

  describe('LEVEL_THRESHOLDS', () => {
    it('should have 5 levels', () => {
      expect(LEVEL_THRESHOLDS.length).toBe(5);
    });

    it('should have continuous thresholds', () => {
      for (let i = 0; i < LEVEL_THRESHOLDS.length - 1; i++) {
        expect(LEVEL_THRESHOLDS[i].maxPoints + 1).toBe(LEVEL_THRESHOLDS[i + 1].minPoints);
      }
    });
  });

  describe('CAPABILITY_DOMAINS', () => {
    it('should have 6 domains (TSDCKL)', () => {
      expect(CAPABILITY_DOMAINS.length).toBe(6);
    });

    it('should have weights summing to 1.0', () => {
      const totalWeight = CAPABILITY_DOMAINS.reduce((sum, d) => sum + d.weight, 0);
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
    });

    it('should include all TSDCKL codes', () => {
      const codes = CAPABILITY_DOMAINS.map(d => d.code);
      expect(codes).toContain('T');
      expect(codes).toContain('S');
      expect(codes).toContain('D');
      expect(codes).toContain('C');
      expect(codes).toContain('K');
      expect(codes).toContain('L');
    });
  });

  describe('EVIDENCE_SCORE_RULES', () => {
    it('should have at least 10 evidence types', () => {
      expect(EVIDENCE_SCORE_RULES.length).toBeGreaterThanOrEqual(10);
    });

    it('should have TIER1_DELIVERY with highest base score', () => {
      const tier1 = EVIDENCE_SCORE_RULES.find(r => r.code === 'TIER1_DELIVERY');
      expect(tier1).toBeDefined();
      expect(tier1!.baseScore).toBe(100);
    });

    it('should have each rule with valid domains', () => {
      const validDomains = ['T', 'S', 'D', 'C', 'K', 'L'];
      EVIDENCE_SCORE_RULES.forEach(rule => {
        rule.domains.forEach(domain => {
          expect(validDomains).toContain(domain);
        });
      });
    });
  });

  describe('validateLevelCalculation', () => {
    it('should return true for valid configuration', () => {
      expect(validateLevelCalculation()).toBe(true);
    });
  });
});

describe('Capability Notification Service - Advanced Tests', () => {
  describe('formatNotificationContent', () => {
    it('should format EVIDENCE_APPROVED notification', () => {
      const result = formatNotificationContent('EVIDENCE_APPROVED', {
        evidenceTitle: '项目A完成',
        score: 50,
      });
      expect(result.title).toBe('证据审核通过');
      expect(result.content).toContain('项目A完成');
      expect(result.content).toContain('50积分');
    });

    it('should format EVIDENCE_REJECTED notification with reason', () => {
      const result = formatNotificationContent('EVIDENCE_REJECTED', {
        evidenceTitle: '项目B',
        reason: '证据不足',
      });
      expect(result.title).toBe('证据审核未通过');
      expect(result.content).toContain('项目B');
      expect(result.content).toContain('证据不足');
    });

    it('should format EVIDENCE_REJECTED notification without reason', () => {
      const result = formatNotificationContent('EVIDENCE_REJECTED', {
        evidenceTitle: '项目C',
      });
      expect(result.title).toBe('证据审核未通过');
      expect(result.content).toContain('项目C');
      expect(result.content).not.toContain('原因');
    });

    it('should format LEVEL_UPGRADED notification', () => {
      const result = formatNotificationContent('LEVEL_UPGRADED', {
        domainName: '技术能力',
        oldLevel: 2,
        newLevel: 3,
      });
      expect(result.title).toBe('能力等级提升');
      expect(result.content).toContain('技术能力');
      expect(result.content).toContain('L2');
      expect(result.content).toContain('L3');
    });

    it('should format REDBLUE_TASK_ASSIGNED notification for red team', () => {
      const result = formatNotificationContent('REDBLUE_TASK_ASSIGNED', {
        taskTitle: '模拟客户验收',
        teamType: 'red',
      });
      expect(result.title).toBe('红蓝对抗任务分配');
      expect(result.content).toContain('红队');
      expect(result.content).toContain('模拟客户验收');
    });

    it('should format REDBLUE_TASK_ASSIGNED notification for blue team', () => {
      const result = formatNotificationContent('REDBLUE_TASK_ASSIGNED', {
        taskTitle: '系统响应测试',
        teamType: 'blue',
      });
      expect(result.title).toBe('红蓝对抗任务分配');
      expect(result.content).toContain('蓝队');
      expect(result.content).toContain('系统响应测试');
    });

    it('should format GATE_STATUS_CHANGED notification', () => {
      const result = formatNotificationContent('GATE_STATUS_CHANGED', {
        gateNumber: 2,
        gateName: '设计评审',
        newStatus: 'passed',
      });
      expect(result.title).toBe('门禁状态变更');
      expect(result.content).toContain('G2');
      expect(result.content).toContain('设计评审');
    });

    it('should return default notification for unknown type', () => {
      const result = formatNotificationContent('UNKNOWN_TYPE' as NotificationType, {});
      expect(result.title).toBe('系统通知');
      expect(result.content).toBe('您有一条新通知');
    });
  });
});
