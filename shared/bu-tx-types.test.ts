/**
 * BU和TX类型定义单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BUSINESS_UNITS,
  DEFAULT_TRANSACTION_TYPES,
  TX_CATEGORIES,
  PROJECT_ROLES,
  getBUByCode,
  getTXByCode,
  getTXCategoryInfo,
  type BusinessUnit,
  type TransactionType,
  type TXCategory,
} from './bu-tx-types';

describe('Business Unit (BU) 定义', () => {
  it('应该包含5个业务单元 (BU1-BU5)', () => {
    expect(DEFAULT_BUSINESS_UNITS).toHaveLength(5);
  });

  it('所有BU应该有正确的代码格式', () => {
    const expectedCodes = ['BU1', 'BU2', 'BU3', 'BU4', 'BU5'];
    const actualCodes = DEFAULT_BUSINESS_UNITS.map(bu => bu.code);
    expect(actualCodes).toEqual(expectedCodes);
  });

  it('BU1应该是海外事业部', () => {
    const bu1 = getBUByCode('BU1');
    expect(bu1).toBeDefined();
    expect(bu1?.name).toContain('海外');
  });

  it('BU2应该是商用车事业部', () => {
    const bu2 = getBUByCode('BU2');
    expect(bu2).toBeDefined();
    expect(bu2?.name).toContain('商用车');
  });

  it('BU3应该是乘用车事业部', () => {
    const bu3 = getBUByCode('BU3');
    expect(bu3).toBeDefined();
    expect(bu3?.name).toContain('乘用车');
  });

  it('BU4应该是半导体事业部', () => {
    const bu4 = getBUByCode('BU4');
    expect(bu4).toBeDefined();
    expect(bu4?.name).toContain('半导体');
  });

  it('BU5应该是工业通用事业部', () => {
    const bu5 = getBUByCode('BU5');
    expect(bu5).toBeDefined();
    expect(bu5?.name).toContain('通用');
  });

  it('所有BU应该有描述信息', () => {
    DEFAULT_BUSINESS_UNITS.forEach(bu => {
      expect(bu.description).toBeDefined();
      expect(bu.description?.length).toBeGreaterThan(0);
    });
  });

  it('所有BU应该是激活状态', () => {
    DEFAULT_BUSINESS_UNITS.forEach(bu => {
      expect(bu.isActive).toBe(true);
    });
  });

  it('getBUByCode应该返回正确的BU', () => {
    const bu = getBUByCode('BU3');
    expect(bu).toBeDefined();
    expect(bu?.code).toBe('BU3');
  });

  it('getBUByCode对于无效代码应该返回undefined', () => {
    const bu = getBUByCode('BU99');
    expect(bu).toBeUndefined();
  });
});

describe('Transaction (TX) 工序类型定义', () => {
  it('应该包含15个工序类型 (TX-001到TX-015)', () => {
    expect(DEFAULT_TRANSACTION_TYPES).toHaveLength(15);
  });

  it('所有TX应该有正确的代码格式', () => {
    DEFAULT_TRANSACTION_TYPES.forEach((tx, index) => {
      const expectedCode = `TX-${String(index + 1).padStart(3, '0')}`;
      expect(tx.code).toBe(expectedCode);
    });
  });

  it('TX-001应该是需求分析', () => {
    const tx = getTXByCode('TX-001');
    expect(tx).toBeDefined();
    expect(tx?.name).toBe('需求分析');
  });

  it('TX-006应该是机械装配', () => {
    const tx = getTXByCode('TX-006');
    expect(tx).toBeDefined();
    expect(tx?.name).toBe('机械装配');
  });

  it('TX-015应该是终验收', () => {
    const tx = getTXByCode('TX-015');
    expect(tx).toBeDefined();
    expect(tx?.name).toBe('终验收');
  });

  it('所有TX应该有有效的类别', () => {
    const validCategories: TXCategory[] = ['manufacturing', 'assembly', 'testing', 'delivery', 'installation', 'other'];
    DEFAULT_TRANSACTION_TYPES.forEach(tx => {
      expect(validCategories).toContain(tx.category);
    });
  });

  it('所有TX应该有预计工期', () => {
    DEFAULT_TRANSACTION_TYPES.forEach(tx => {
      expect(tx.estimatedDays).toBeDefined();
      expect(tx.estimatedDays).toBeGreaterThan(0);
    });
  });

  it('getTXByCode应该返回正确的TX', () => {
    const tx = getTXByCode('TX-009');
    expect(tx).toBeDefined();
    expect(tx?.code).toBe('TX-009');
    expect(tx?.name).toBe('调试');
  });

  it('getTXByCode对于无效代码应该返回undefined', () => {
    const tx = getTXByCode('TX-999');
    expect(tx).toBeUndefined();
  });
});

describe('TX类别定义', () => {
  it('应该包含6个类别', () => {
    expect(TX_CATEGORIES).toHaveLength(6);
  });

  it('每个类别应该有名称和颜色', () => {
    TX_CATEGORIES.forEach(category => {
      expect(category.code).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.color).toBeDefined();
      expect(category.color).toMatch(/^bg-/);
    });
  });

  it('getTXCategoryInfo应该返回正确的类别信息', () => {
    const info = getTXCategoryInfo('assembly');
    expect(info).toBeDefined();
    expect(info?.name).toBe('装配集成');
  });
});

describe('项目角色定义', () => {
  it('应该包含8个项目角色', () => {
    expect(PROJECT_ROLES).toHaveLength(8);
  });

  it('应该包含销售与项目工程师角色', () => {
    const salesRole = PROJECT_ROLES.find(r => r.code === 'Sales');
    expect(salesRole).toBeDefined();
    expect(salesRole?.name).toContain('销售');
  });

  it('应该包含机械设计与项目工程师角色', () => {
    const mechRole = PROJECT_ROLES.find(r => r.code === 'Mech');
    expect(mechRole).toBeDefined();
    expect(mechRole?.name).toContain('机械');
  });

  it('应该包含电气设计与项目工程师角色', () => {
    const elecRole = PROJECT_ROLES.find(r => r.code === 'Elec');
    expect(elecRole).toBeDefined();
    expect(elecRole?.name).toContain('电气');
  });

  it('应该包含采购与项目工程师角色', () => {
    const procRole = PROJECT_ROLES.find(r => r.code === 'Procurement');
    expect(procRole).toBeDefined();
    expect(procRole?.name).toContain('采购');
  });

  it('每个角色应该有描述信息', () => {
    PROJECT_ROLES.forEach(role => {
      expect(role.description).toBeDefined();
      expect(role.description.length).toBeGreaterThan(0);
    });
  });
});
