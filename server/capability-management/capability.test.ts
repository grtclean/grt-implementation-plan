/**
 * 能力管理系统单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  CAPABILITY_LEVELS,
  CAPABILITY_DOMAINS,
  calculateCapabilityLevel,
  getCapabilityLevelDetails,
  getCapabilityDomainDetails,
  getAllCapabilityDomains,
  getAllCapabilityLevels,
} from './capability.service';

describe('能力管理系统', () => {
  describe('能力等级定义', () => {
    it('应该定义5个能力等级', () => {
      expect(Object.keys(CAPABILITY_LEVELS)).toHaveLength(5);
    });

    it('应该包含L1-L5等级', () => {
      expect(CAPABILITY_LEVELS).toHaveProperty('L1');
      expect(CAPABILITY_LEVELS).toHaveProperty('L2');
      expect(CAPABILITY_LEVELS).toHaveProperty('L3');
      expect(CAPABILITY_LEVELS).toHaveProperty('L4');
      expect(CAPABILITY_LEVELS).toHaveProperty('L5');
    });

    it('每个等级应该有名称、分数范围和描述', () => {
      Object.values(CAPABILITY_LEVELS).forEach(level => {
        expect(level).toHaveProperty('name');
        expect(level).toHaveProperty('minScore');
        expect(level).toHaveProperty('maxScore');
        expect(level).toHaveProperty('description');
      });
    });
  });

  describe('能力域定义', () => {
    it('应该定义6个能力域', () => {
      expect(Object.keys(CAPABILITY_DOMAINS)).toHaveLength(6);
    });

    it('应该包含T、S、D、C、K、L域', () => {
      expect(CAPABILITY_DOMAINS).toHaveProperty('T');
      expect(CAPABILITY_DOMAINS).toHaveProperty('S');
      expect(CAPABILITY_DOMAINS).toHaveProperty('D');
      expect(CAPABILITY_DOMAINS).toHaveProperty('C');
      expect(CAPABILITY_DOMAINS).toHaveProperty('K');
      expect(CAPABILITY_DOMAINS).toHaveProperty('L');
    });

    it('每个域应该有名称、代码和描述', () => {
      Object.values(CAPABILITY_DOMAINS).forEach(domain => {
        expect(domain).toHaveProperty('name');
        expect(domain).toHaveProperty('code');
        expect(domain).toHaveProperty('description');
      });
    });
  });

  describe('calculateCapabilityLevel', () => {
    it('分数0-20应返回L1', () => {
      expect(calculateCapabilityLevel(0)).toBe('L1');
      expect(calculateCapabilityLevel(10)).toBe('L1');
      expect(calculateCapabilityLevel(20)).toBe('L1');
    });

    it('分数21-40应返回L2', () => {
      expect(calculateCapabilityLevel(21)).toBe('L2');
      expect(calculateCapabilityLevel(30)).toBe('L2');
      expect(calculateCapabilityLevel(40)).toBe('L2');
    });

    it('分数41-60应返回L3', () => {
      expect(calculateCapabilityLevel(41)).toBe('L3');
      expect(calculateCapabilityLevel(50)).toBe('L3');
      expect(calculateCapabilityLevel(60)).toBe('L3');
    });

    it('分数61-80应返回L4', () => {
      expect(calculateCapabilityLevel(61)).toBe('L4');
      expect(calculateCapabilityLevel(70)).toBe('L4');
      expect(calculateCapabilityLevel(80)).toBe('L4');
    });

    it('分数81-100应返回L5', () => {
      expect(calculateCapabilityLevel(81)).toBe('L5');
      expect(calculateCapabilityLevel(90)).toBe('L5');
      expect(calculateCapabilityLevel(100)).toBe('L5');
    });
  });

  describe('getCapabilityLevelDetails', () => {
    it('应该返回有效等级的详情', () => {
      const l1 = getCapabilityLevelDetails('L1');
      expect(l1).not.toBeNull();
      expect(l1?.name).toBe('初级');
    });

    it('应该为无效等级返回null', () => {
      const invalid = getCapabilityLevelDetails('L6');
      expect(invalid).toBeNull();
    });
  });

  describe('getCapabilityDomainDetails', () => {
    it('应该返回有效域的详情', () => {
      const t = getCapabilityDomainDetails('T');
      expect(t).not.toBeNull();
      expect(t?.name).toBe('技术能力');
    });

    it('应该为无效域返回null', () => {
      const invalid = getCapabilityDomainDetails('X');
      expect(invalid).toBeNull();
    });
  });

  describe('getAllCapabilityDomains', () => {
    it('应该返回所有能力域', () => {
      const domains = getAllCapabilityDomains();
      expect(domains).toHaveLength(6);
    });

    it('返回的域应该包含必要属性', () => {
      const domains = getAllCapabilityDomains();
      domains.forEach(domain => {
        expect(domain).toHaveProperty('name');
        expect(domain).toHaveProperty('code');
        expect(domain).toHaveProperty('description');
      });
    });
  });

  describe('getAllCapabilityLevels', () => {
    it('应该返回所有能力等级', () => {
      const levels = getAllCapabilityLevels();
      expect(levels).toHaveLength(5);
    });

    it('返回的等级应该包含code属性', () => {
      const levels = getAllCapabilityLevels();
      levels.forEach(level => {
        expect(level).toHaveProperty('code');
        expect(level).toHaveProperty('name');
        expect(level).toHaveProperty('minScore');
        expect(level).toHaveProperty('maxScore');
        expect(level).toHaveProperty('description');
      });
    });
  });
});
