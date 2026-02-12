/**
 * 案例库管理服务单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  importCase,
  batchImportCases,
  getCases,
  deleteCase,
  updateCase,
  getCaseStatistics,
  SAMPLE_CASES,
  CaseData
} from './case-library.service';
import {
  initializeMeetingOwnerConfigs,
  getMeetingOwnerConfigs,
  updateMeetingOwnerConfig,
  assignMeetingOwner,
  DEFAULT_MO_CONFIGS
} from './meeting-owner-init.service';

// Mock database
vi.mock('../db', () => ({
  requireDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockImplementation(({ sql, args }) => {
      // Mock different queries based on SQL content
      if (sql.includes('INSERT INTO customer_solution_case_library')) {
        return Promise.resolve({ rows: [], rowsAffected: 1 });
      }
      if (sql.includes('SELECT COUNT(*) as total FROM customer_solution_case_library')) {
        return Promise.resolve({ rows: [{ total: 8 }] });
      }
      if (sql.includes('SELECT * FROM customer_solution_case_library')) {
        return Promise.resolve({
          rows: SAMPLE_CASES.slice(0, 3).map((c, i) => ({
            id: `case_${i}`,
            case_number: c.caseNumber,
            project_name: c.projectName,
            customer_name: c.customerName,
            industry: c.industry,
            product_type: c.productType,
            cleanliness_standard: c.cleanlinessStandard,
            cleanliness_value: c.cleanlinessValue,
            part_type: c.partType,
            part_material: c.partMaterial,
            process_flow: c.processFlow,
            technical_solution: c.technicalSolution,
            equipment_used: c.equipmentUsed,
            delivery_result: c.deliveryResult,
            lessons_learned: c.lessonsLearned,
            key_success_factors: c.keySuccessFactors,
            project_phase: c.projectPhase,
            process_stages: c.processStages,
            attachments: JSON.stringify(c.attachments || []),
            tags: JSON.stringify(c.tags),
            created_by: c.createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        });
      }
      if (sql.includes('DELETE FROM customer_solution_case_library')) {
        return Promise.resolve({ rows: [], rowsAffected: 1 });
      }
      if (sql.includes('UPDATE customer_solution_case_library')) {
        return Promise.resolve({ rows: [], rowsAffected: 1 });
      }
      if (sql.includes('GROUP BY industry')) {
        return Promise.resolve({
          rows: [
            { industry: '汽车制造', count: 2 },
            { industry: '新能源汽车', count: 1 },
            { industry: '半导体', count: 1 }
          ]
        });
      }
      if (sql.includes('GROUP BY product_type')) {
        return Promise.resolve({
          rows: [
            { product_type: '变速箱壳体', count: 1 },
            { product_type: '电池托盘', count: 1 }
          ]
        });
      }
      if (sql.includes('GROUP BY cleanliness_standard')) {
        return Promise.resolve({
          rows: [
            { cleanliness_standard: 'VDA 19.1', count: 2 },
            { cleanliness_standard: 'ISO 16232', count: 1 }
          ]
        });
      }
      if (sql.includes('GROUP BY project_phase')) {
        return Promise.resolve({
          rows: [
            { project_phase: 'M8', count: 2 },
            { project_phase: 'M10', count: 1 }
          ]
        });
      }
      if (sql.includes('SELECT id FROM meeting_owners')) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('INSERT INTO meeting_owners')) {
        return Promise.resolve({ rows: [], rowsAffected: 1 });
      }
      if (sql.includes('SELECT * FROM meeting_owners')) {
        return Promise.resolve({
          rows: DEFAULT_MO_CONFIGS.slice(0, 3).map((c, i) => ({
            id: `mo_${i}`,
            meeting_type: c.meetingType,
            meeting_type_name: c.meetingTypeName,
            default_owner_role: c.defaultOwnerRole,
            auto_report_enabled: c.autoReportEnabled ? 1 : 0,
            report_frequency: c.reportFrequency,
            evidence_required: c.evidenceRequired ? 1 : 0,
            evidence_types: JSON.stringify(c.evidenceTypes),
            reminder_days: c.reminderDays,
            escalation_days: c.escalationDays,
            description: c.description
          }))
        });
      }
      if (sql.includes('UPDATE meeting_owners')) {
        return Promise.resolve({ rows: [], rowsAffected: 1 });
      }
      return Promise.resolve({ rows: [] });
    })
  })
}));

describe('案例库管理服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SAMPLE_CASES 示例数据', () => {
    it('应该包含至少8个示例案例', () => {
      expect(SAMPLE_CASES.length).toBeGreaterThanOrEqual(8);
    });

    it('每个案例应该包含必要字段', () => {
      SAMPLE_CASES.forEach(caseData => {
        expect(caseData.caseNumber).toBeDefined();
        expect(caseData.projectName).toBeDefined();
        expect(caseData.customerName).toBeDefined();
        expect(caseData.industry).toBeDefined();
        expect(caseData.productType).toBeDefined();
        expect(caseData.cleanlinessStandard).toBeDefined();
        expect(caseData.technicalSolution).toBeDefined();
        expect(caseData.deliveryResult).toBeDefined();
        expect(caseData.tags).toBeInstanceOf(Array);
      });
    });

    it('案例应该覆盖多个行业', () => {
      const industries = new Set(SAMPLE_CASES.map(c => c.industry));
      expect(industries.size).toBeGreaterThanOrEqual(5);
    });

    it('案例应该覆盖多种清洁度标准', () => {
      const standards = new Set(SAMPLE_CASES.map(c => c.cleanlinessStandard));
      expect(standards.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('importCase', () => {
    it('应该成功导入单个案例', async () => {
      const testCase: CaseData = {
        caseNumber: 'TEST-001',
        projectName: '测试项目',
        customerName: '测试客户',
        industry: '汽车制造',
        productType: '测试产品',
        cleanlinessStandard: 'VDA 19.1',
        partType: '测试零件',
        processFlow: '测试流程',
        technicalSolution: '测试方案',
        deliveryResult: '成功',
        projectPhase: 'M8',
        tags: ['测试'],
        createdBy: 'test'
      };

      const result = await importCase(testCase);
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });
  });

  describe('batchImportCases', () => {
    it('应该成功批量导入案例', async () => {
      const testCases: CaseData[] = [
        {
          caseNumber: 'BATCH-001',
          projectName: '批量测试1',
          customerName: '客户1',
          industry: '汽车制造',
          productType: '产品1',
          cleanlinessStandard: 'VDA 19.1',
          partType: '零件1',
          processFlow: '流程1',
          technicalSolution: '方案1',
          deliveryResult: '成功',
          projectPhase: 'M8',
          tags: ['批量'],
          createdBy: 'test'
        },
        {
          caseNumber: 'BATCH-002',
          projectName: '批量测试2',
          customerName: '客户2',
          industry: '新能源汽车',
          productType: '产品2',
          cleanlinessStandard: 'ISO 16232',
          partType: '零件2',
          processFlow: '流程2',
          technicalSolution: '方案2',
          deliveryResult: '成功',
          projectPhase: 'M10',
          tags: ['批量'],
          createdBy: 'test'
        }
      ];

      const result = await batchImportCases(testCases);
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('getCases', () => {
    it('应该返回案例列表和总数', async () => {
      const result = await getCases();
      expect(result.cases).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('应该支持按行业筛选', async () => {
      const result = await getCases({ industry: '汽车制造' });
      expect(result.cases).toBeInstanceOf(Array);
    });

    it('应该支持关键词搜索', async () => {
      const result = await getCases({ keyword: '清洗' });
      expect(result.cases).toBeInstanceOf(Array);
    });
  });

  describe('deleteCase', () => {
    it('应该成功删除案例', async () => {
      const result = await deleteCase('test_case_id');
      expect(result.success).toBe(true);
    });
  });

  describe('updateCase', () => {
    it('应该成功更新案例', async () => {
      const result = await updateCase('test_case_id', {
        projectName: '更新后的项目名称',
        tags: ['更新', '测试']
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getCaseStatistics', () => {
    it('应该返回统计信息', async () => {
      const stats = await getCaseStatistics();
      expect(stats.totalCases).toBeGreaterThanOrEqual(0);
      expect(stats.byIndustry).toBeInstanceOf(Array);
      expect(stats.byProductType).toBeInstanceOf(Array);
      expect(stats.byCleanlinessStandard).toBeInstanceOf(Array);
      expect(stats.byProjectPhase).toBeInstanceOf(Array);
    });
  });
});

describe('Meeting Owner配置服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DEFAULT_MO_CONFIGS 默认配置', () => {
    it('应该包含至少12种会议类型', () => {
      expect(DEFAULT_MO_CONFIGS.length).toBeGreaterThanOrEqual(12);
    });

    it('每个配置应该包含必要字段', () => {
      DEFAULT_MO_CONFIGS.forEach(config => {
        expect(config.meetingType).toBeDefined();
        expect(config.meetingTypeName).toBeDefined();
        expect(config.defaultOwnerRole).toBeDefined();
        expect(typeof config.autoReportEnabled).toBe('boolean');
        expect(config.reportFrequency).toBeDefined();
        expect(typeof config.evidenceRequired).toBe('boolean');
        expect(config.evidenceTypes).toBeInstanceOf(Array);
        expect(typeof config.reminderDays).toBe('number');
        expect(typeof config.escalationDays).toBe('number');
      });
    });

    it('应该包含内部管理类会议', () => {
      const internalMeetings = DEFAULT_MO_CONFIGS.filter(c => 
        ['employee_interview', 'performance_dialogue', 'production_weekly', 
         'monthly_operation_analysis', 'monthly_planning', 'annual_planning', 
         'annual_summary'].includes(c.meetingType)
      );
      expect(internalMeetings.length).toBeGreaterThanOrEqual(7);
    });

    it('应该包含客户项目类会议', () => {
      const customerMeetings = DEFAULT_MO_CONFIGS.filter(c => 
        ['customer_first_contact', 'customer_drawing_review', 
         'customer_pre_acceptance', 'customer_final_acceptance',
         'customer_solution_confirmation'].includes(c.meetingType)
      );
      expect(customerMeetings.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('initializeMeetingOwnerConfigs', () => {
    it('应该成功初始化MO配置', async () => {
      const result = await initializeMeetingOwnerConfigs();
      expect(result.created).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeInstanceOf(Array);
    });
  });

  describe('getMeetingOwnerConfigs', () => {
    it('应该返回MO配置列表', async () => {
      const configs = await getMeetingOwnerConfigs();
      expect(configs).toBeInstanceOf(Array);
      configs.forEach(config => {
        expect(config.meetingType).toBeDefined();
        expect(config.meetingTypeName).toBeDefined();
      });
    });
  });

  describe('updateMeetingOwnerConfig', () => {
    it('应该成功更新MO配置', async () => {
      const result = await updateMeetingOwnerConfig('production_weekly', {
        defaultOwnerRole: '新生产经理',
        reminderDays: 2
      });
      expect(result.success).toBe(true);
    });
  });

  describe('assignMeetingOwner', () => {
    it('应该成功指派MO负责人', async () => {
      const result = await assignMeetingOwner(
        'production_weekly',
        'user_123',
        '张三'
      );
      expect(result.success).toBe(true);
    });
  });
});
