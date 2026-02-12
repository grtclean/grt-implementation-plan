import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GeminiJudgmentEngine,
  checkSafety,
  routeQuery,
} from './ai-services/geminiJudgmentEngine';

// Mock the LLM module
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '测试响应' } }],
  }),
}));

describe('Gemini Judgment Engine', () => {
  let engine: GeminiJudgmentEngine;

  beforeEach(() => {
    engine = new GeminiJudgmentEngine();
    vi.clearAllMocks();
  });

  describe('Safety Check', () => {
    it('should detect sensitive price information', async () => {
      const result = await checkSafety({
        content: '客户A的价格是100元',
        contentType: 'ai_response',
      });

      expect(result.safe).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.riskLevel).toBe('critical');
    });

    it('should detect API keys in content', async () => {
      const result = await checkSafety({
        content: 'API_KEY=sk-12345',
        contentType: 'user_input',
      });

      expect(result.safe).toBe(false);
      expect(result.violations.some(v => v.includes('API'))).toBe(true);
    });

    it('should pass safe content', async () => {
      const result = await checkSafety({
        content: '今天天气很好',
        contentType: 'user_input',
      });

      expect(result.safe).toBe(true);
      expect(result.violations.length).toBe(0);
      expect(result.riskLevel).toBe('low');
    });

    it('should detect formula parameters', async () => {
      const result = await checkSafety({
        content: '配方参数：浓度30%',
        contentType: 'ai_response',
      });

      expect(result.safe).toBe(false);
      expect(result.riskLevel).toBe('critical');
    });

    it('should sanitize sensitive content', async () => {
      const result = await checkSafety({
        content: '客户价格是100元',
        contentType: 'user_input',
      });

      expect(result.sanitizedContent).toContain('[已脱敏]');
    });
  });

  describe('Query Routing', () => {
    it('should route code queries to Claude', async () => {
      const result = await routeQuery({
        query: '帮我写一段代码实现排序',
        userRole: 'developer',
      });

      expect(result.route).toBe('claude');
      expect(result.requiredCapabilities).toContain('code_generation');
    });

    it('should route price queries to internal LLM', async () => {
      const result = await routeQuery({
        query: '查询客户报价信息',
        userRole: 'sales',
      });

      expect(result.route).toBe('internal_llm');
      expect(result.reason).toContain('敏感');
    });

    it('should route analysis queries to Gemini', async () => {
      const result = await routeQuery({
        query: '分析这个项目的风险',
        userRole: 'manager',
      });

      expect(result.route).toBe('gemini');
      expect(result.requiredCapabilities).toContain('analysis');
    });

    it('should route domain queries to specialized', async () => {
      const result = await routeQuery({
        query: '超声波清洗设备的喷淋参数',
        userRole: 'engineer',
      });

      expect(result.route).toBe('specialized');
      expect(result.requiredCapabilities).toContain('domain_knowledge');
    });

    it('should route general queries to internal LLM', async () => {
      const result = await routeQuery({
        query: '今天天气怎么样',
        userRole: 'user',
      });

      expect(result.route).toBe('internal_llm');
      expect(result.requiredCapabilities).toContain('general_qa');
    });

    it('should route debugging queries to Claude', async () => {
      const result = await routeQuery({
        query: '这个bug怎么修复',
        userRole: 'developer',
      });

      expect(result.route).toBe('claude');
      expect(result.requiredCapabilities).toContain('debugging');
    });
  });

  describe('Judge Function', () => {
    it('should return judgment result', async () => {
      const result = await engine.judge({
        context: '客户询问产品价格',
        question: '是否应该给予折扣',
      });

      expect(result).toHaveProperty('decision');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
    });
  });

  describe('Business Evaluation', () => {
    it('should evaluate lead scoring', async () => {
      const result = await engine.evaluateBusinessLogic({
        type: 'lead_scoring',
        data: {
          budget: 100000,
          authority: true,
          need: 'high',
          timeline: '3months',
        },
      });

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('action');
      expect(['approve', 'reject', 'review', 'escalate']).toContain(result.action);
    });

    it('should evaluate risk', async () => {
      const result = await engine.evaluateBusinessLogic({
        type: 'risk_evaluation',
        data: {
          projectSize: 'large',
          complexity: 'high',
          timeline: 'tight',
        },
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations', async () => {
      const result = await engine.getRecommendations({
        userId: 'user123',
        context: 'solution',
        currentState: {
          product: '精密零件',
          cleanliness: 'high',
        },
      });

      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('reasoning');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Risk Assessment', () => {
    it('should assess project risk', async () => {
      const result = await engine.assessRisk({
        type: 'project',
        factors: {
          budget: 500000,
          timeline: '6months',
          complexity: 'high',
        },
      });

      expect(result).toHaveProperty('overallRisk');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('recommendations');
      expect(['low', 'medium', 'high', 'critical']).toContain(result.overallRisk);
    });
  });
});
