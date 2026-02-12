/**
 * AI Version Generation Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM module
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn()
}));

// Mock the db module
vi.mock('../db', () => ({
  requireDb: vi.fn()
}));

import { 
  generateProjectSummary, 
  findSimilarProjects, 
  generateAIVersions 
} from './ai-version.service';
import { invokeLLM } from '../_core/llm';
import { requireDb } from '../db';

describe('AI Version Generation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateProjectSummary', () => {
    it('should generate project summary using LLM', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '这是一个GRT智能清洗系统升级项目，主要目标是提升清洁度和生产效率。'
          }
        }]
      };
      
      vi.mocked(invokeLLM).mockResolvedValue(mockResponse);

      const project = {
        id: 1,
        name: 'GRT智能清洗系统升级项目',
        description: '升级现有清洗系统',
        customerName: '测试客户',
        productType: '精密零件',
        cleanlinessLevel: 'Class 100',
        cycleTime: '60秒',
        budget: 500
      };

      const summary = await generateProjectSummary(project);

      expect(summary).toBe('这是一个GRT智能清洗系统升级项目，主要目标是提升清洁度和生产效率。');
      expect(invokeLLM).toHaveBeenCalledTimes(1);
    });

    it('should return error message when LLM fails', async () => {
      vi.mocked(invokeLLM).mockRejectedValue(new Error('LLM error'));

      const project = {
        id: 1,
        name: 'Test Project'
      };

      const summary = await generateProjectSummary(project);

      expect(summary).toBe('项目摘要生成失败，请稍后重试');
    });

    it('should return default message when LLM returns empty content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: ''
          }
        }]
      };
      
      vi.mocked(invokeLLM).mockResolvedValue(mockResponse);

      const project = {
        id: 1,
        name: 'Test Project'
      };

      const summary = await generateProjectSummary(project);

      expect(summary).toBe('无法生成项目摘要');
    });
  });

  describe('findSimilarProjects', () => {
    it('should return mock data when database is not available', async () => {
      vi.mocked(requireDb).mockResolvedValue(null);

      const project = {
        id: 1,
        name: 'Test Project',
        productType: '精密零件'
      };

      const similarProjects = await findSimilarProjects(project);

      expect(Array.isArray(similarProjects)).toBe(true);
      expect(similarProjects.length).toBeGreaterThan(0);
      // Should return mock data
      expect(similarProjects[0]).toHaveProperty('id');
      expect(similarProjects[0]).toHaveProperty('name');
      expect(similarProjects[0]).toHaveProperty('similarity');
    });

    it('should return mock data when no historical projects found', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };
      
      vi.mocked(requireDb).mockResolvedValue(mockDb as any);

      const project = {
        id: 1,
        name: 'Test Project',
        productType: '精密零件'
      };

      const similarProjects = await findSimilarProjects(project);

      expect(Array.isArray(similarProjects)).toBe(true);
      expect(similarProjects.length).toBeGreaterThan(0);
    });
  });

  describe('generateAIVersions', () => {
    it('should generate three AI versions (AIV0, AIV1, AIV2)', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              versions: [
                {
                  versionCode: 'AIV0',
                  versionName: '基础版',
                  description: '基础清洗功能',
                  features: ['基础清洗', '手动操作'],
                  estimatedCost: 200,
                  estimatedDuration: '8周',
                  riskLevel: 'low',
                  recommendation: '适合预算有限的客户'
                },
                {
                  versionCode: 'AIV1',
                  versionName: '标准版',
                  description: '标准清洗功能',
                  features: ['自动清洗', '数据监控'],
                  estimatedCost: 400,
                  estimatedDuration: '12周',
                  riskLevel: 'medium',
                  recommendation: '适合大多数客户'
                },
                {
                  versionCode: 'AIV2',
                  versionName: '高级版',
                  description: '智能清洗功能',
                  features: ['AI优化', 'IoT集成', '预测性维护'],
                  estimatedCost: 600,
                  estimatedDuration: '16周',
                  riskLevel: 'medium',
                  recommendation: '适合追求高效率的客户'
                }
              ]
            })
          }
        }]
      };
      
      vi.mocked(invokeLLM).mockResolvedValue(mockResponse);

      const project = {
        id: 1,
        name: 'GRT智能清洗系统升级项目',
        customerName: '测试客户',
        productType: '精密零件',
        cleanlinessLevel: 'Class 100',
        cycleTime: '60秒',
        budget: 500
      };

      const versions = await generateAIVersions(project);

      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBe(3);
      
      // Check AIV0
      expect(versions[0].versionCode).toBe('AIV0');
      expect(versions[0].versionName).toBe('基础版');
      
      // Check AIV1
      expect(versions[1].versionCode).toBe('AIV1');
      expect(versions[1].versionName).toBe('标准版');
      
      // Check AIV2
      expect(versions[2].versionCode).toBe('AIV2');
      expect(versions[2].versionName).toBe('高级版');
    });

    it('should return mock versions when LLM fails', async () => {
      vi.mocked(invokeLLM).mockRejectedValue(new Error('LLM error'));

      const project = {
        id: 1,
        name: 'Test Project',
        budget: 500
      };

      const versions = await generateAIVersions(project);

      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBe(3);
      // Should return mock data with correct version codes
      expect(versions.map(v => v.versionCode)).toEqual(['AIV0', 'AIV1', 'AIV2']);
    });
  });
});
