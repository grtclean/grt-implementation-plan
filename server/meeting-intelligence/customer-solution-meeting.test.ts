/**
 * 客户方案沟通确认会议服务单元测试
 * Customer Solution Meeting Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../db', () => ({
  requireDb: vi.fn(() => Promise.resolve({
    execute: vi.fn().mockResolvedValue({ rows: [] })
  }))
}));

vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          title: '测试方案',
          summary: '测试方案摘要',
          equipmentConfig: { mainEquipment: 'GRT-2000' },
          processFlow: [],
          confidence: 85,
          analysis: '测试分析'
        })
      }
    }]
  })
}));

vi.mock('../_core/voiceTranscription', () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    text: '这是测试转写文本',
    segments: []
  })
}));

vi.mock('../storage', () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: 'https://storage.example.com/test-file.pdf',
    key: 'test-file.pdf'
  })
}));

// Import service functions after mocking
import {
  createCustomerSolutionMeeting,
  getCustomerSolutionMeeting,
  listCustomerSolutionMeetings,
  matchCases,
  generateSolutionSuggestion,
  searchTechnicalDocs,
  createSolutionVersion,
  getSolutionVersions
} from './customer-solution-meeting.service';

import { requireDb } from '../db';

describe('客户方案沟通确认会议服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('会议管理', () => {
    it('应该能创建客户方案会议', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await createCustomerSolutionMeeting({
        title: '测试客户方案会议',
        meetingType: 'external',
        meetingMode: 'online',
        status: 'scheduled',
        customerName: '测试客户',
        customerRequirements: '需要清洗设备方案',
        cleanlinessLevel: 'VDA 19.1',
        productType: '汽车零部件',
        partMaterial: '铝合金',
        cycleTime: 60,
        organizerId: 'user-1',
        organizerName: '张三',
        aiCaseMatchingEnabled: true,
        aiSolutionSuggestionEnabled: true,
        aiVoiceRecognitionEnabled: true,
        createdBy: 'user-1'
      });

      expect(result).toHaveProperty('id');
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('应该能获取会议详情', async () => {
      const mockMeeting = {
        id: 'meeting-1',
        title: '测试会议',
        meeting_type: 'external',
        meeting_mode: 'online',
        status: 'scheduled',
        customer_name: '测试客户',
        organizer_id: 'user-1',
        organizer_name: '张三',
        ai_case_matching_enabled: true,
        ai_solution_suggestion_enabled: true,
        ai_voice_recognition_enabled: true,
        internal_participants: '[]',
        external_participants: '[]'
      };

      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: [mockMeeting] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await getCustomerSolutionMeeting('meeting-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('meeting-1');
      expect(result?.title).toBe('测试会议');
      expect(result?.meetingType).toBe('external');
    });

    it('应该能获取会议列表', async () => {
      const mockMeetings = [
        {
          id: 'meeting-1',
          title: '会议1',
          meeting_type: 'external',
          meeting_mode: 'online',
          status: 'scheduled',
          organizer_id: 'user-1',
          organizer_name: '张三',
          ai_case_matching_enabled: true,
          ai_solution_suggestion_enabled: true,
          ai_voice_recognition_enabled: true,
          internal_participants: '[]',
          external_participants: '[]'
        },
        {
          id: 'meeting-2',
          title: '会议2',
          meeting_type: 'internal',
          meeting_mode: 'offline',
          status: 'completed',
          organizer_id: 'user-2',
          organizer_name: '李四',
          ai_case_matching_enabled: true,
          ai_solution_suggestion_enabled: true,
          ai_voice_recognition_enabled: true,
          internal_participants: '[]',
          external_participants: '[]'
        }
      ];

      const mockDb = {
        execute: vi.fn()
          .mockResolvedValueOnce({ rows: [{ total: 2 }] })
          .mockResolvedValueOnce({ rows: mockMeetings })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await listCustomerSolutionMeetings({
        page: 1,
        pageSize: 10
      });

      expect(result.total).toBe(2);
      expect(result.meetings).toHaveLength(2);
    });
  });

  describe('AI案例匹配', () => {
    it('应该能执行案例匹配', async () => {
      const mockCases = [
        {
          id: 'case-1',
          case_number: 'CASE-001',
          case_name: '汽车零部件清洗案例',
          product_type: '汽车零部件',
          part_material: '铝合金',
          cleanliness_level: 'VDA 19.1',
          cycle_time: 60,
          customer_industry: '汽车',
          success_rate: 98,
          customer_satisfaction: 4.5
        }
      ];

      const mockDb = {
        execute: vi.fn()
          .mockResolvedValueOnce({ rows: mockCases })
          .mockResolvedValueOnce({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await matchCases({
        meetingId: 'meeting-1',
        productType: '汽车零部件',
        partMaterial: '铝合金',
        cleanlinessLevel: 'VDA 19.1',
        cycleTime: 60
      });

      expect(result).toHaveProperty('matchedCases');
      expect(result).toHaveProperty('aiAnalysis');
      expect(result).toHaveProperty('recommendations');
    });

    it('应该能计算案例相似度', async () => {
      const mockCases = [
        {
          id: 'case-1',
          case_number: 'CASE-001',
          case_name: '完全匹配案例',
          product_type: '汽车零部件',
          part_material: '铝合金',
          cleanliness_level: 'VDA 19.1',
          cycle_time: 60,
          customer_industry: '汽车',
          success_rate: 98,
          customer_satisfaction: 5
        }
      ];

      const mockDb = {
        execute: vi.fn()
          .mockResolvedValueOnce({ rows: mockCases })
          .mockResolvedValueOnce({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await matchCases({
        meetingId: 'meeting-1',
        productType: '汽车零部件',
        partMaterial: '铝合金',
        cleanlinessLevel: 'VDA 19.1',
        cycleTime: 60,
        customerIndustry: '汽车'
      });

      expect(result.matchedCases.length).toBeGreaterThan(0);
      // 完全匹配应该有高相似度
      expect(result.matchedCases[0].similarityScore).toBeGreaterThan(80);
    });
  });

  describe('智能方案建议', () => {
    it('应该能生成方案建议', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await generateSolutionSuggestion({
        meetingId: 'meeting-1',
        customerRequirements: '需要清洗汽车发动机零部件，清洁度要求VDA 19.1',
        productType: '汽车零部件',
        partMaterial: '铝合金',
        cleanlinessLevel: 'VDA 19.1',
        cycleTime: 60
      });

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('equipmentConfig');
      expect(result).toHaveProperty('confidence');
    });

    it('应该能基于参考案例生成方案', async () => {
      const mockCases = [
        {
          id: 'case-1',
          case_name: '参考案例',
          solution_summary: '使用GRT-2000设备',
          equipment_config: '{"mainEquipment": "GRT-2000"}',
          process_flow: '[]'
        }
      ];

      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: mockCases })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await generateSolutionSuggestion({
        meetingId: 'meeting-1',
        customerRequirements: '需要清洗设备方案',
        referenceCaseIds: ['case-1']
      });

      expect(result).toHaveProperty('referenceCases');
      expect(result.referenceCases).toContain('case-1');
    });
  });

  describe('技术资料检索', () => {
    it('应该能搜索技术资料', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          doc_number: 'DOC-001',
          doc_title: '清洗工艺指南',
          doc_type: 'guide',
          project_phase: 'M3',
          process_step: 'T5',
          doc_summary: '清洗工艺操作指南',
          view_count: 100,
          reference_count: 50,
          keywords: '["清洗", "工艺"]',
          tags: '["指南", "操作"]'
        }
      ];

      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: mockDocs })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await searchTechnicalDocs({
        query: '清洗工艺',
        projectPhase: 'M3',
        limit: 10
      });

      expect(result).toHaveLength(1);
      expect(result[0].docTitle).toBe('清洗工艺指南');
    });

    it('应该能按项目阶段筛选资料', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      await searchTechnicalDocs({
        query: '',
        projectPhase: 'M5'
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('project_phase = ?')
        })
      );
    });

    it('应该能按工序步骤筛选资料', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      await searchTechnicalDocs({
        query: '',
        processStep: 'T10'
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sql: expect.stringContaining('process_step = ?')
        })
      );
    });
  });

  describe('方案版本管理', () => {
    it('应该能创建方案版本', async () => {
      const mockDb = {
        execute: vi.fn()
          .mockResolvedValueOnce({ rows: [{ max_version: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await createSolutionVersion({
        meetingId: 'meeting-1',
        solutionTitle: '方案V1',
        solutionSummary: '初版方案',
        solutionContent: { description: '方案内容' },
        equipmentConfig: { mainEquipment: 'GRT-2000' },
        processFlow: [{ step: 1, name: '清洗', description: '超声波清洗' }],
        aiGenerated: true,
        aiConfidence: 85,
        createdBy: 'user-1'
      });

      expect(result).toHaveProperty('id');
      expect(result.versionNumber).toBe(1);
    });

    it('应该能递增版本号', async () => {
      const mockDb = {
        execute: vi.fn()
          .mockResolvedValueOnce({ rows: [{ max_version: 3 }] })
          .mockResolvedValueOnce({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await createSolutionVersion({
        meetingId: 'meeting-1',
        solutionTitle: '方案V4',
        solutionContent: {},
        createdBy: 'user-1'
      });

      expect(result.versionNumber).toBe(4);
    });

    it('应该能获取方案版本列表', async () => {
      const mockVersions = [
        {
          id: 'version-2',
          meeting_id: 'meeting-1',
          version_number: 2,
          version_status: 'draft',
          solution_title: '方案V2',
          solution_content: '{}',
          ai_generated: true,
          ai_confidence: 90,
          reference_cases: '[]'
        },
        {
          id: 'version-1',
          meeting_id: 'meeting-1',
          version_number: 1,
          version_status: 'approved',
          solution_title: '方案V1',
          solution_content: '{}',
          ai_generated: false,
          reference_cases: '[]'
        }
      ];

      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: mockVersions })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await getSolutionVersions('meeting-1');

      expect(result).toHaveLength(2);
      expect(result[0].versionNumber).toBe(2);
      expect(result[1].versionNumber).toBe(1);
    });
  });

  describe('会议类型', () => {
    it('应该支持对内会议类型', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await createCustomerSolutionMeeting({
        title: '内部方案讨论会',
        meetingType: 'internal',
        meetingMode: 'offline',
        status: 'scheduled',
        organizerId: 'user-1',
        organizerName: '张三',
        aiCaseMatchingEnabled: true,
        aiSolutionSuggestionEnabled: true,
        aiVoiceRecognitionEnabled: true,
        createdBy: 'user-1'
      });

      expect(result).toHaveProperty('id');
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['internal'])
        })
      );
    });

    it('应该支持对外会议类型', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const result = await createCustomerSolutionMeeting({
        title: '客户方案沟通会',
        meetingType: 'external',
        meetingMode: 'online',
        status: 'scheduled',
        customerName: '某汽车公司',
        organizerId: 'user-1',
        organizerName: '张三',
        aiCaseMatchingEnabled: true,
        aiSolutionSuggestionEnabled: true,
        aiVoiceRecognitionEnabled: true,
        createdBy: 'user-1'
      });

      expect(result).toHaveProperty('id');
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['external'])
        })
      );
    });
  });

  describe('清洁度要求', () => {
    it('应该能存储VDA 19.1清洁度要求', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      await createCustomerSolutionMeeting({
        title: '测试会议',
        meetingType: 'external',
        status: 'scheduled',
        cleanlinessLevel: 'VDA 19.1',
        cleanlinessStandard: 'Class A',
        cleanlinessDetails: {
          particleSize: '≤500μm',
          particleCount: '≤100',
          residualOil: '≤0.5mg/cm²'
        },
        organizerId: 'user-1',
        organizerName: '张三',
        aiCaseMatchingEnabled: true,
        aiSolutionSuggestionEnabled: true,
        aiVoiceRecognitionEnabled: true,
        createdBy: 'user-1'
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['VDA 19.1', 'Class A'])
        })
      );
    });

    it('应该能存储ISO 16232清洁度要求', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: [] })
      };
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      await createCustomerSolutionMeeting({
        title: '测试会议',
        meetingType: 'external',
        status: 'scheduled',
        cleanlinessLevel: 'ISO 16232',
        cleanlinessStandard: 'Level 3',
        organizerId: 'user-1',
        organizerName: '张三',
        aiCaseMatchingEnabled: true,
        aiSolutionSuggestionEnabled: true,
        aiVoiceRecognitionEnabled: true,
        createdBy: 'user-1'
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['ISO 16232', 'Level 3'])
        })
      );
    });
  });
});
