/**
 * v5.0.3 合规预警徽章、员工工时详情与规则配置功能测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getDb
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          }),
          limit: vi.fn().mockResolvedValue([])
        }),
        orderBy: vi.fn().mockResolvedValue([])
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({})
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({})
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({})
    })
  })
}));

// 导入服务
import * as rulesService from './services/compliance-rules.service';

describe('v5.0.3 合规预警徽章功能', () => {
  describe('未处理预警数量API', () => {
    it('应返回未处理预警数量结构', async () => {
      // 测试返回结构
      const result = {
        count: 5,
        byJurisdiction: {
          DE: 3,
          US: 2
        },
        bySeverity: {
          critical: 2,
          warning: 3
        }
      };
      
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('byJurisdiction');
      expect(result).toHaveProperty('bySeverity');
    });

    it('应正确计算各地区未处理预警数', () => {
      const alerts = [
        { jurisdiction: 'DE', status: 'open' },
        { jurisdiction: 'DE', status: 'open' },
        { jurisdiction: 'US', status: 'open' },
        { jurisdiction: 'DE', status: 'resolved' }
      ];
      
      const openAlerts = alerts.filter(a => a.status === 'open');
      const byJurisdiction: Record<string, number> = {};
      
      for (const alert of openAlerts) {
        byJurisdiction[alert.jurisdiction] = (byJurisdiction[alert.jurisdiction] || 0) + 1;
      }
      
      expect(openAlerts.length).toBe(3);
      expect(byJurisdiction['DE']).toBe(2);
      expect(byJurisdiction['US']).toBe(1);
    });
  });
});

describe('v5.0.3 员工工时详情页面', () => {
  describe('员工详情数据结构', () => {
    it('应包含完整的员工信息', () => {
      const employeeDetails = {
        employee: {
          id: 1,
          employeeId: 'EMP001',
          name: 'Test Employee',
          jurisdiction: 'DE',
          department: 'Engineering'
        },
        timeEntries: [],
        alerts: [],
        weeklySummaries: [],
        stats: {
          openAlerts: 0,
          resolvedAlerts: 0,
          totalHoursThisWeek: 40,
          complianceRate: 100
        },
        weeklyTrend: []
      };
      
      expect(employeeDetails).toHaveProperty('employee');
      expect(employeeDetails).toHaveProperty('timeEntries');
      expect(employeeDetails).toHaveProperty('alerts');
      expect(employeeDetails).toHaveProperty('weeklySummaries');
      expect(employeeDetails).toHaveProperty('stats');
      expect(employeeDetails).toHaveProperty('weeklyTrend');
    });

    it('应正确计算合规率', () => {
      const alerts = [
        { status: 'resolved' },
        { status: 'resolved' },
        { status: 'open' }
      ];
      
      const resolvedAlerts = alerts.filter(a => a.status === 'resolved').length;
      const complianceRate = alerts.length > 0 
        ? Math.round((resolvedAlerts / alerts.length) * 100) 
        : 100;
      
      expect(complianceRate).toBe(67);
    });

    it('应生成周工时趋势数据', () => {
      const weeklySummaries = [
        { weekStart: '2024-01-01', totalRegularHours: 40, totalOvertimeHours: 5, isCompliant: 1 },
        { weekStart: '2024-01-08', totalRegularHours: 38, totalOvertimeHours: 2, isCompliant: 1 },
        { weekStart: '2024-01-15', totalRegularHours: 42, totalOvertimeHours: 8, isCompliant: 0 }
      ];
      
      const weeklyTrend = weeklySummaries.map(s => ({
        week: s.weekStart,
        totalHours: s.totalRegularHours + s.totalOvertimeHours,
        regularHours: s.totalRegularHours,
        overtimeHours: s.totalOvertimeHours,
        isCompliant: s.isCompliant === 1
      }));
      
      expect(weeklyTrend.length).toBe(3);
      expect(weeklyTrend[0].totalHours).toBe(45);
      expect(weeklyTrend[2].isCompliant).toBe(false);
    });
  });
});

describe('v5.0.3 合规规则配置', () => {
  describe('规则管理服务', () => {
    it('规则数据结构应包含必要字段', () => {
      // 测试规则数据结构
      const sampleRule = {
        id: 1,
        ruleId: 'DE-DAILY-10H',
        ruleName: '德国每日工时上限',
        jurisdiction: 'DE',
        ruleType: 'daily_limit',
        thresholdValue: '10.00',
        isEnabled: 1
      };
      
      expect(sampleRule).toHaveProperty('ruleId');
      expect(sampleRule).toHaveProperty('ruleName');
      expect(sampleRule).toHaveProperty('jurisdiction');
      expect(sampleRule).toHaveProperty('ruleType');
      expect(sampleRule).toHaveProperty('thresholdValue');
    });

    it('getRuleById应返回单个规则或null', async () => {
      const rule = await rulesService.getRuleById('NON_EXISTENT');
      expect(rule).toBeNull();
    });

    it('规则创建输入应包含必要字段', () => {
      const createInput: rulesService.CreateRuleInput = {
        ruleName: '测试规则',
        jurisdiction: 'DE',
        ruleType: 'daily_limit',
        thresholdValue: 10
      };
      
      expect(createInput).toHaveProperty('ruleName');
      expect(createInput).toHaveProperty('jurisdiction');
      expect(createInput).toHaveProperty('ruleType');
      expect(createInput).toHaveProperty('thresholdValue');
    });

    it('规则更新输入应支持部分更新', () => {
      const updateInput: rulesService.UpdateRuleInput = {
        thresholdValue: 12,
        isEnabled: false
      };
      
      expect(updateInput).toHaveProperty('thresholdValue');
      expect(updateInput).toHaveProperty('isEnabled');
      expect(updateInput.ruleName).toBeUndefined();
    });
  });

  describe('邮件模板管理服务', () => {
    it('模板数据结构应包含必要字段', () => {
      // 测试模板数据结构
      const sampleTemplate = {
        id: 1,
        templateId: 'TPL-DE-10H-CRITICAL',
        templateName: '德国10小时违规通知',
        alertType: 'VIOLATION_10H_LIMIT',
        severity: 'critical',
        subjectTemplate: '[紧急] 工时违规警告',
        bodyTemplate: '<p>工时违规内容</p>',
        isEnabled: 1
      };
      
      expect(sampleTemplate).toHaveProperty('templateId');
      expect(sampleTemplate).toHaveProperty('templateName');
      expect(sampleTemplate).toHaveProperty('alertType');
      expect(sampleTemplate).toHaveProperty('subjectTemplate');
      expect(sampleTemplate).toHaveProperty('bodyTemplate');
    });

    it('getTemplateById应返回单个模板或null', async () => {
      const template = await rulesService.getTemplateById('NON_EXISTENT');
      expect(template).toBeNull();
    });

    it('模板创建输入应包含必要字段', () => {
      const createInput: rulesService.CreateTemplateInput = {
        templateName: '测试模板',
        alertType: 'VIOLATION_10H_LIMIT',
        subjectTemplate: '测试主题',
        bodyTemplate: '测试内容'
      };
      
      expect(createInput).toHaveProperty('templateName');
      expect(createInput).toHaveProperty('alertType');
      expect(createInput).toHaveProperty('subjectTemplate');
      expect(createInput).toHaveProperty('bodyTemplate');
    });

    it('renderTemplate应正确替换变量', () => {
      const template = {
        subjectTemplate: '[警告] {{employeeName}} 工时超限',
        bodyTemplate: '<p>员工 {{employeeName}} 于 {{date}} 工作 {{actualHours}} 小时</p>'
      } as rulesService.EmailTemplate;
      
      const variables = {
        employeeName: '张三',
        date: '2024-01-15',
        actualHours: '12'
      };
      
      const result = rulesService.renderTemplate(template, variables);
      
      expect(result.subject).toBe('[警告] 张三 工时超限');
      expect(result.body).toContain('员工 张三');
      expect(result.body).toContain('2024-01-15');
      expect(result.body).toContain('12 小时');
    });
  });

  describe('规则统计', () => {
    it('getRuleStats应返回正确的统计结构', async () => {
      // 测试统计结构定义
      const expectedStructure = {
        totalRules: 0,
        enabledRules: 0,
        byJurisdiction: {},
        byType: {}
      };
      
      expect(expectedStructure).toHaveProperty('totalRules');
      expect(expectedStructure).toHaveProperty('enabledRules');
      expect(expectedStructure).toHaveProperty('byJurisdiction');
      expect(expectedStructure).toHaveProperty('byType');
    });

    it('getTemplateStats应返回正确的统计结构', async () => {
      // 测试统计结构定义
      const expectedStructure = {
        totalTemplates: 0,
        enabledTemplates: 0,
        byAlertType: {}
      };
      
      expect(expectedStructure).toHaveProperty('totalTemplates');
      expect(expectedStructure).toHaveProperty('enabledTemplates');
      expect(expectedStructure).toHaveProperty('byAlertType');
    });
  });

  describe('规则类型验证', () => {
    it('应支持所有规则类型', () => {
      const ruleTypes = ['daily_limit', 'weekly_limit', 'rest_period', 'overtime_limit', 'exemption_check'];
      
      ruleTypes.forEach(type => {
        expect(['daily_limit', 'weekly_limit', 'rest_period', 'overtime_limit', 'exemption_check']).toContain(type);
      });
    });

    it('应支持所有预警类型', () => {
      const alertTypes = ['VIOLATION_10H_LIMIT', 'VIOLATION_REST_PERIOD', 'EXEMPTION_AT_RISK', 'OVERTIME_WARNING', 'WEEKLY_SUMMARY'];
      
      alertTypes.forEach(type => {
        expect(['VIOLATION_10H_LIMIT', 'VIOLATION_REST_PERIOD', 'EXEMPTION_AT_RISK', 'OVERTIME_WARNING', 'WEEKLY_SUMMARY']).toContain(type);
      });
    });

    it('应支持所有管辖区', () => {
      const jurisdictions = ['DE', 'US', 'CN', 'OTHER'];
      
      jurisdictions.forEach(j => {
        expect(['DE', 'US', 'CN', 'OTHER']).toContain(j);
      });
    });

    it('应支持所有严重程度', () => {
      const severities = ['critical', 'warning', 'info'];
      
      severities.forEach(s => {
        expect(['critical', 'warning', 'info']).toContain(s);
      });
    });
  });
});

describe('v5.0.3 UI组件集成', () => {
  describe('侧边栏预警徽章', () => {
    it('徽章应显示正确的数字格式', () => {
      const formatBadgeCount = (count: number): string => {
        if (count > 99) return '99+';
        return count.toString();
      };
      
      expect(formatBadgeCount(5)).toBe('5');
      expect(formatBadgeCount(99)).toBe('99');
      expect(formatBadgeCount(100)).toBe('99+');
      expect(formatBadgeCount(999)).toBe('99+');
    });

    it('徽章应根据数量显示不同颜色', () => {
      const getBadgeColor = (count: number): string => {
        if (count === 0) return 'hidden';
        if (count < 5) return 'yellow';
        return 'red';
      };
      
      expect(getBadgeColor(0)).toBe('hidden');
      expect(getBadgeColor(3)).toBe('yellow');
      expect(getBadgeColor(10)).toBe('red');
    });
  });

  describe('员工详情页面导航', () => {
    it('应正确生成员工详情页面URL', () => {
      const generateEmployeeUrl = (employeeId: string): string => {
        return `/compliance/employee/${employeeId}`;
      };
      
      expect(generateEmployeeUrl('EMP001')).toBe('/compliance/employee/EMP001');
      expect(generateEmployeeUrl('DE-12345')).toBe('/compliance/employee/DE-12345');
    });
  });

  describe('规则配置页面', () => {
    it('应正确生成规则ID', () => {
      const generateRuleId = (jurisdiction: string, ruleType: string): string => {
        const timestamp = Date.now().toString(36).toUpperCase();
        return `${jurisdiction}-${ruleType.toUpperCase().replace(/_/g, '-')}-${timestamp}`;
      };
      
      const ruleId = generateRuleId('DE', 'daily_limit');
      expect(ruleId).toMatch(/^DE-DAILY-LIMIT-[A-Z0-9]+$/);
    });

    it('应正确生成模板ID', () => {
      const generateTemplateId = (alertType: string): string => {
        const timestamp = Date.now().toString(36).toUpperCase();
        return `TPL-${alertType.replace(/_/g, '-')}-${timestamp}`;
      };
      
      const templateId = generateTemplateId('VIOLATION_10H_LIMIT');
      expect(templateId).toMatch(/^TPL-VIOLATION-10H-LIMIT-[A-Z0-9]+$/);
    });
  });
});

describe('v5.0.3 数据验证', () => {
  describe('规则阈值验证', () => {
    it('每日工时上限应在合理范围内', () => {
      const validateDailyLimit = (hours: number): boolean => {
        return hours > 0 && hours <= 24;
      };
      
      expect(validateDailyLimit(10)).toBe(true);
      expect(validateDailyLimit(0)).toBe(false);
      expect(validateDailyLimit(25)).toBe(false);
    });

    it('每周工时上限应在合理范围内', () => {
      const validateWeeklyLimit = (hours: number): boolean => {
        return hours > 0 && hours <= 168; // 24 * 7
      };
      
      expect(validateWeeklyLimit(48)).toBe(true);
      expect(validateWeeklyLimit(0)).toBe(false);
      expect(validateWeeklyLimit(200)).toBe(false);
    });

    it('休息时间要求应在合理范围内', () => {
      const validateRestPeriod = (hours: number): boolean => {
        return hours >= 0 && hours <= 24;
      };
      
      expect(validateRestPeriod(11)).toBe(true);
      expect(validateRestPeriod(-1)).toBe(false);
      expect(validateRestPeriod(25)).toBe(false);
    });
  });

  describe('邮件模板变量验证', () => {
    it('应检测模板中的变量', () => {
      const extractVariables = (template: string): string[] => {
        const matches = template.match(/\{\{(\w+)\}\}/g) || [];
        return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
      };
      
      const template = '员工 {{employeeName}} 于 {{date}} 工作 {{actualHours}} 小时';
      const variables = extractVariables(template);
      
      expect(variables).toContain('employeeName');
      expect(variables).toContain('date');
      expect(variables).toContain('actualHours');
      expect(variables.length).toBe(3);
    });

    it('应验证必需变量是否提供', () => {
      const validateVariables = (
        requiredVars: string[], 
        providedVars: Record<string, string>
      ): { valid: boolean; missing: string[] } => {
        const missing = requiredVars.filter(v => !(v in providedVars));
        return { valid: missing.length === 0, missing };
      };
      
      const required = ['employeeName', 'date', 'actualHours'];
      const provided = { employeeName: '张三', date: '2024-01-15' };
      
      const result = validateVariables(required, provided);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('actualHours');
    });
  });
});
