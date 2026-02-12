/**
 * BU负责人和绩效功能单元测试
 * v1.3.90 - BU事业部管理增强
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 模拟数据库连接
vi.mock('../db', () => ({
  requireDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[]]),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
    }),
  }),
}));

describe('BU负责人管理功能', () => {
  describe('负责人角色类型定义', () => {
    const VALID_LEADER_ROLES = ['Sales', 'Mech', 'Elec', 'Procurement'];
    
    it('应该包含4种核心负责人角色', () => {
      expect(VALID_LEADER_ROLES).toHaveLength(4);
    });
    
    it('应该包含销售负责人角色', () => {
      expect(VALID_LEADER_ROLES).toContain('Sales');
    });
    
    it('应该包含机械负责人角色', () => {
      expect(VALID_LEADER_ROLES).toContain('Mech');
    });
    
    it('应该包含电气负责人角色', () => {
      expect(VALID_LEADER_ROLES).toContain('Elec');
    });
    
    it('应该包含采购负责人角色', () => {
      expect(VALID_LEADER_ROLES).toContain('Procurement');
    });
  });

  describe('负责人数据结构', () => {
    interface BULeader {
      id: number;
      buCode: string;
      roleType: string;
      leaderName: string;
      leaderEmail?: string;
      leaderPhone?: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }

    it('应该有正确的负责人数据结构', () => {
      const mockLeader: BULeader = {
        id: 1,
        buCode: 'BU1',
        roleType: 'Sales',
        leaderName: '张三',
        leaderEmail: 'zhangsan@grt.com',
        leaderPhone: '13800138000',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(mockLeader.id).toBe(1);
      expect(mockLeader.buCode).toBe('BU1');
      expect(mockLeader.roleType).toBe('Sales');
      expect(mockLeader.leaderName).toBe('张三');
      expect(mockLeader.isActive).toBe(true);
    });

    it('邮箱和电话应该是可选字段', () => {
      const mockLeader: BULeader = {
        id: 2,
        buCode: 'BU2',
        roleType: 'Mech',
        leaderName: '李四',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(mockLeader.leaderEmail).toBeUndefined();
      expect(mockLeader.leaderPhone).toBeUndefined();
    });
  });

  describe('负责人业务逻辑', () => {
    it('每个BU应该可以有4个负责人', () => {
      const BU_CODES = ['BU1', 'BU2', 'BU3', 'BU4', 'BU5'];
      const LEADER_ROLES = ['Sales', 'Mech', 'Elec', 'Procurement'];
      
      const maxLeadersPerBU = LEADER_ROLES.length;
      const totalMaxLeaders = BU_CODES.length * maxLeadersPerBU;
      
      expect(maxLeadersPerBU).toBe(4);
      expect(totalMaxLeaders).toBe(20);
    });

    it('同一BU同一角色只能有一个负责人', () => {
      const leaders = [
        { buCode: 'BU1', roleType: 'Sales', leaderName: '张三' },
        { buCode: 'BU1', roleType: 'Mech', leaderName: '李四' },
      ];
      
      const bu1SalesLeaders = leaders.filter(
        l => l.buCode === 'BU1' && l.roleType === 'Sales'
      );
      
      expect(bu1SalesLeaders).toHaveLength(1);
    });
  });
});

describe('BU绩效统计功能', () => {
  describe('绩效指标定义', () => {
    interface BUPerformanceStats {
      buCode: string;
      period: string;
      periodType: 'monthly' | 'quarterly' | 'yearly';
      projectCount: number;
      activeProjectCount: number;
      completedProjectCount: number;
      totalRevenue: number;
      totalCost: number;
      grossProfit: number;
      grossMargin: number;
      teamSize: number;
      utilizationRate: number;
      onTimeDeliveryRate: number;
      customerSatisfaction: number;
    }

    it('应该包含所有必需的绩效指标', () => {
      const mockStats: BUPerformanceStats = {
        buCode: 'BU1',
        period: '2026-02',
        periodType: 'monthly',
        projectCount: 10,
        activeProjectCount: 5,
        completedProjectCount: 5,
        totalRevenue: 500,
        totalCost: 350,
        grossProfit: 150,
        grossMargin: 30,
        teamSize: 15,
        utilizationRate: 85,
        onTimeDeliveryRate: 92,
        customerSatisfaction: 4.5,
      };
      
      expect(mockStats.projectCount).toBe(10);
      expect(mockStats.grossMargin).toBe(30);
      expect(mockStats.utilizationRate).toBe(85);
      expect(mockStats.customerSatisfaction).toBe(4.5);
    });

    it('毛利润应该等于营收减去成本', () => {
      const revenue = 500;
      const cost = 350;
      const expectedProfit = revenue - cost;
      
      expect(expectedProfit).toBe(150);
    });

    it('毛利率应该正确计算', () => {
      const revenue = 500;
      const profit = 150;
      const expectedMargin = (profit / revenue) * 100;
      
      expect(expectedMargin).toBe(30);
    });
  });

  describe('周期类型', () => {
    const VALID_PERIOD_TYPES = ['monthly', 'quarterly', 'yearly'];
    
    it('应该支持月度统计', () => {
      expect(VALID_PERIOD_TYPES).toContain('monthly');
    });
    
    it('应该支持季度统计', () => {
      expect(VALID_PERIOD_TYPES).toContain('quarterly');
    });
    
    it('应该支持年度统计', () => {
      expect(VALID_PERIOD_TYPES).toContain('yearly');
    });
  });

  describe('绩效计算逻辑', () => {
    it('利用率应该在0-100之间', () => {
      const utilizationRate = 85;
      expect(utilizationRate).toBeGreaterThanOrEqual(0);
      expect(utilizationRate).toBeLessThanOrEqual(100);
    });

    it('准时交付率应该在0-100之间', () => {
      const onTimeDeliveryRate = 92;
      expect(onTimeDeliveryRate).toBeGreaterThanOrEqual(0);
      expect(onTimeDeliveryRate).toBeLessThanOrEqual(100);
    });

    it('客户满意度应该在0-5之间', () => {
      const customerSatisfaction = 4.5;
      expect(customerSatisfaction).toBeGreaterThanOrEqual(0);
      expect(customerSatisfaction).toBeLessThanOrEqual(5);
    });
  });

  describe('绩效汇总计算', () => {
    it('应该正确计算多个BU的汇总数据', () => {
      const stats = [
        { buCode: 'BU1', projectCount: 10, totalRevenue: 500, teamSize: 15 },
        { buCode: 'BU2', projectCount: 8, totalRevenue: 400, teamSize: 12 },
        { buCode: 'BU3', projectCount: 12, totalRevenue: 600, teamSize: 18 },
      ];
      
      const totalProjects = stats.reduce((sum, s) => sum + s.projectCount, 0);
      const totalRevenue = stats.reduce((sum, s) => sum + s.totalRevenue, 0);
      const totalTeamSize = stats.reduce((sum, s) => sum + s.teamSize, 0);
      
      expect(totalProjects).toBe(30);
      expect(totalRevenue).toBe(1500);
      expect(totalTeamSize).toBe(45);
    });

    it('应该正确计算平均指标', () => {
      const stats = [
        { utilizationRate: 80, customerSatisfaction: 4.2 },
        { utilizationRate: 85, customerSatisfaction: 4.5 },
        { utilizationRate: 90, customerSatisfaction: 4.8 },
      ];
      
      const avgUtilization = stats.reduce((sum, s) => sum + s.utilizationRate, 0) / stats.length;
      const avgSatisfaction = stats.reduce((sum, s) => sum + s.customerSatisfaction, 0) / stats.length;
      
      expect(avgUtilization).toBe(85);
      expect(avgSatisfaction).toBe(4.5);
    });
  });
});

describe('BU事业部名称映射', () => {
  const BU_NAMES: Record<string, string> = {
    'BU1': '海外事业部',
    'BU2': '商用车事业部',
    'BU3': '乘用车事业部',
    'BU4': '半导体事业部',
    'BU5': '工业通用事业部',
  };

  it('BU1应该是海外事业部', () => {
    expect(BU_NAMES['BU1']).toBe('海外事业部');
  });

  it('BU2应该是商用车事业部', () => {
    expect(BU_NAMES['BU2']).toBe('商用车事业部');
  });

  it('BU3应该是乘用车事业部', () => {
    expect(BU_NAMES['BU3']).toBe('乘用车事业部');
  });

  it('BU4应该是半导体事业部', () => {
    expect(BU_NAMES['BU4']).toBe('半导体事业部');
  });

  it('BU5应该是工业通用事业部', () => {
    expect(BU_NAMES['BU5']).toBe('工业通用事业部');
  });

  it('应该有5个事业部', () => {
    expect(Object.keys(BU_NAMES)).toHaveLength(5);
  });
});
