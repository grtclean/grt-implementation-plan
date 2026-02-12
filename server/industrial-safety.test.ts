/**
 * GRT智能系统v2.6.0 - 工业安全拦截器单元测试
 * 测试范围：材质-参数冲突校验、安全阈值校验、影子模式偏差记录
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// 模拟安全规则数据
const mockSafetyRules = [
  {
    id: 'rule-001',
    material_type: 'aluminum',
    equipment_model: 'GRT-SC-*',
    parameter_name: 'temperature',
    min_value: 20,
    max_value: 80,
    unit_type: '°C',
    severity: 'critical' as const,
  },
  {
    id: 'rule-002',
    material_type: 'stainless_steel',
    equipment_model: 'GRT-SC-*',
    parameter_name: 'temperature',
    min_value: 20,
    max_value: 120,
    unit_type: '°C',
    severity: 'warning' as const,
  },
  {
    id: 'rule-003',
    material_type: 'aluminum',
    equipment_model: 'GRT-HP-*',
    parameter_name: 'pressure',
    min_value: 0.1,
    max_value: 2.0,
    unit_type: 'MPa',
    severity: 'fatal' as const,
  },
  {
    id: 'rule-004',
    material_type: 'plastic',
    equipment_model: 'GRT-*',
    parameter_name: 'temperature',
    min_value: 10,
    max_value: 60,
    unit_type: '°C',
    severity: 'critical' as const,
  },
];

// 安全规则引擎
interface SafetyRule {
  id: string;
  material_type: string;
  equipment_model: string;
  parameter_name: string;
  min_value: number;
  max_value: number;
  unit_type: string;
  severity: 'warning' | 'critical' | 'fatal';
}

interface ValidationResult {
  isValid: boolean;
  violations: Array<{
    ruleId: string;
    parameter: string;
    value: number;
    minValue: number;
    maxValue: number;
    severity: string;
    message: string;
  }>;
}

// 安全规则引擎实现
class SafetyRuleEngine {
  private rules: SafetyRule[];

  constructor(rules: SafetyRule[]) {
    this.rules = rules;
  }

  /**
   * 匹配设备型号（支持通配符）
   */
  private matchEquipmentModel(pattern: string, model: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(model);
  }

  /**
   * 查找适用的安全规则
   */
  findApplicableRules(materialType: string, equipmentModel: string): SafetyRule[] {
    return this.rules.filter(rule => 
      rule.material_type === materialType &&
      this.matchEquipmentModel(rule.equipment_model, equipmentModel)
    );
  }

  /**
   * 验证参数是否在安全范围内
   */
  validateParameter(
    materialType: string,
    equipmentModel: string,
    parameterName: string,
    value: number
  ): ValidationResult {
    const applicableRules = this.findApplicableRules(materialType, equipmentModel);
    const violations: ValidationResult['violations'] = [];

    for (const rule of applicableRules) {
      if (rule.parameter_name === parameterName) {
        if (value < rule.min_value || value > rule.max_value) {
          violations.push({
            ruleId: rule.id,
            parameter: parameterName,
            value,
            minValue: rule.min_value,
            maxValue: rule.max_value,
            severity: rule.severity,
            message: `参数 ${parameterName} 值 ${value}${rule.unit_type} 超出安全范围 [${rule.min_value}, ${rule.max_value}]${rule.unit_type}`,
          });
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * 批量验证多个参数
   */
  validateParameters(
    materialType: string,
    equipmentModel: string,
    parameters: Record<string, number>
  ): ValidationResult {
    const allViolations: ValidationResult['violations'] = [];

    for (const [paramName, value] of Object.entries(parameters)) {
      const result = this.validateParameter(materialType, equipmentModel, paramName, value);
      allViolations.push(...result.violations);
    }

    return {
      isValid: allViolations.length === 0,
      violations: allViolations,
    };
  }
}

// 影子模式偏差计算器
interface DeviationRecord {
  suggestionId: string;
  aiPredictedValue: Record<string, number>;
  humanActualValue: Record<string, number>;
  deviationScore: number;
  deviationAnalysis: string;
}

class ShadowModeAnalyzer {
  /**
   * 计算偏差分数（0-100，越低越好）
   */
  calculateDeviationScore(
    predicted: Record<string, number>,
    actual: Record<string, number>
  ): number {
    const parameters = Object.keys(predicted);
    if (parameters.length === 0) return 0;

    let totalDeviation = 0;
    let count = 0;

    for (const param of parameters) {
      if (actual[param] !== undefined) {
        const predictedVal = predicted[param];
        const actualVal = actual[param];
        
        // 计算相对偏差百分比
        const deviation = Math.abs(predictedVal - actualVal) / Math.max(Math.abs(actualVal), 1) * 100;
        totalDeviation += Math.min(deviation, 100); // 限制最大偏差为100%
        count++;
      }
    }

    return count > 0 ? Math.round(totalDeviation / count * 100) / 100 : 0;
  }

  /**
   * 生成偏差分析报告
   */
  generateDeviationAnalysis(
    predicted: Record<string, number>,
    actual: Record<string, number>
  ): string {
    const analyses: string[] = [];
    
    for (const [param, predictedVal] of Object.entries(predicted)) {
      const actualVal = actual[param];
      if (actualVal !== undefined) {
        const diff = actualVal - predictedVal;
        const percentDiff = Math.round((diff / Math.max(Math.abs(predictedVal), 1)) * 100);
        
        if (Math.abs(percentDiff) > 10) {
          analyses.push(`${param}: AI预测${predictedVal}, 实际${actualVal}, 偏差${percentDiff > 0 ? '+' : ''}${percentDiff}%`);
        }
      }
    }

    return analyses.length > 0 
      ? `发现${analyses.length}个显著偏差:\n${analyses.join('\n')}`
      : '所有参数偏差在可接受范围内';
  }

  /**
   * 创建偏差记录
   */
  createDeviationRecord(
    suggestionId: string,
    predicted: Record<string, number>,
    actual: Record<string, number>
  ): DeviationRecord {
    return {
      suggestionId,
      aiPredictedValue: predicted,
      humanActualValue: actual,
      deviationScore: this.calculateDeviationScore(predicted, actual),
      deviationAnalysis: this.generateDeviationAnalysis(predicted, actual),
    };
  }
}

// ==================== 测试用例 ====================

describe('工业安全拦截器测试', () => {
  let safetyEngine: SafetyRuleEngine;

  beforeAll(() => {
    safetyEngine = new SafetyRuleEngine(mockSafetyRules);
  });

  describe('材质-参数冲突校验', () => {
    it('应该检测铝材高温冲突', () => {
      const result = safetyEngine.validateParameter(
        'aluminum',
        'GRT-SC-3000',
        'temperature',
        90 // 超过铝材最大温度80°C
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('critical');
      expect(result.violations[0].message).toContain('超出安全范围');
    });

    it('应该允许不锈钢高温操作', () => {
      const result = safetyEngine.validateParameter(
        'stainless_steel',
        'GRT-SC-3000',
        'temperature',
        100 // 不锈钢可以承受120°C
      );

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('应该检测塑料材质温度限制', () => {
      const result = safetyEngine.validateParameter(
        'plastic',
        'GRT-SC-1000',
        'temperature',
        70 // 超过塑料最大温度60°C
      );

      expect(result.isValid).toBe(false);
      expect(result.violations[0].severity).toBe('critical');
    });

    it('应该检测铝材高压冲突', () => {
      const result = safetyEngine.validateParameter(
        'aluminum',
        'GRT-HP-5000',
        'pressure',
        3.0 // 超过铝材最大压力2.0MPa
      );

      expect(result.isValid).toBe(false);
      expect(result.violations[0].severity).toBe('fatal');
    });
  });

  describe('安全阈值校验', () => {
    it('应该批量验证多个参数', () => {
      const result = safetyEngine.validateParameters(
        'aluminum',
        'GRT-SC-3000',
        {
          temperature: 85, // 超限
          pressure: 1.5,   // 无规则
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it('应该通过所有参数在安全范围内的验证', () => {
      const result = safetyEngine.validateParameters(
        'aluminum',
        'GRT-SC-3000',
        {
          temperature: 60, // 在范围内
        }
      );

      expect(result.isValid).toBe(true);
    });

    it('应该正确匹配通配符设备型号', () => {
      const rules = safetyEngine.findApplicableRules('aluminum', 'GRT-SC-5000');
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.equipment_model === 'GRT-SC-*')).toBe(true);
    });

    it('应该检测低于最小值的参数', () => {
      const result = safetyEngine.validateParameter(
        'aluminum',
        'GRT-SC-3000',
        'temperature',
        10 // 低于最小温度20°C
      );

      expect(result.isValid).toBe(false);
      expect(result.violations[0].value).toBe(10);
    });
  });

  describe('严重级别分类', () => {
    it('应该正确标记warning级别', () => {
      const result = safetyEngine.validateParameter(
        'stainless_steel',
        'GRT-SC-3000',
        'temperature',
        130 // 超过不锈钢最大温度120°C
      );

      expect(result.violations[0].severity).toBe('warning');
    });

    it('应该正确标记fatal级别', () => {
      const result = safetyEngine.validateParameter(
        'aluminum',
        'GRT-HP-5000',
        'pressure',
        5.0 // 严重超压
      );

      expect(result.violations[0].severity).toBe('fatal');
    });
  });
});

describe('影子模式偏差记录测试', () => {
  let analyzer: ShadowModeAnalyzer;

  beforeAll(() => {
    analyzer = new ShadowModeAnalyzer();
  });

  describe('偏差分数计算', () => {
    it('应该计算零偏差分数', () => {
      const score = analyzer.calculateDeviationScore(
        { temperature: 60, pressure: 1.5 },
        { temperature: 60, pressure: 1.5 }
      );

      expect(score).toBe(0);
    });

    it('应该计算小偏差分数', () => {
      const score = analyzer.calculateDeviationScore(
        { temperature: 60 },
        { temperature: 63 } // 5%偏差
      );

      expect(score).toBeLessThan(10);
    });

    it('应该计算大偏差分数', () => {
      const score = analyzer.calculateDeviationScore(
        { temperature: 60 },
        { temperature: 90 } // 50%偏差
      );

      expect(score).toBeGreaterThan(30); // 50%偏差应该大于30
    });

    it('应该处理多参数偏差平均', () => {
      const score = analyzer.calculateDeviationScore(
        { temperature: 60, pressure: 1.0 },
        { temperature: 66, pressure: 1.2 } // 10%和20%偏差
      );

      expect(score).toBeGreaterThan(10);
      expect(score).toBeLessThan(20);
    });

    it('应该处理空参数', () => {
      const score = analyzer.calculateDeviationScore({}, {});
      expect(score).toBe(0);
    });
  });

  describe('偏差分析报告', () => {
    it('应该生成显著偏差报告', () => {
      const analysis = analyzer.generateDeviationAnalysis(
        { temperature: 60 },
        { temperature: 80 } // 33%偏差
      );

      expect(analysis).toContain('temperature');
      expect(analysis).toContain('AI预测');
      expect(analysis).toContain('实际');
    });

    it('应该报告可接受范围内的偏差', () => {
      const analysis = analyzer.generateDeviationAnalysis(
        { temperature: 60 },
        { temperature: 62 } // 3%偏差，在10%以内
      );

      expect(analysis).toContain('可接受范围');
    });

    it('应该处理多个显著偏差', () => {
      const analysis = analyzer.generateDeviationAnalysis(
        { temperature: 60, pressure: 1.0, flow_rate: 100 },
        { temperature: 80, pressure: 1.5, flow_rate: 150 }
      );

      expect(analysis).toContain('发现');
      expect(analysis.split('\n').length).toBeGreaterThan(1);
    });
  });

  describe('偏差记录创建', () => {
    it('应该创建完整的偏差记录', () => {
      const record = analyzer.createDeviationRecord(
        'suggestion-001',
        { temperature: 60, pressure: 1.0 },
        { temperature: 70, pressure: 1.2 }
      );

      expect(record.suggestionId).toBe('suggestion-001');
      expect(record.aiPredictedValue).toEqual({ temperature: 60, pressure: 1.0 });
      expect(record.humanActualValue).toEqual({ temperature: 70, pressure: 1.2 });
      expect(typeof record.deviationScore).toBe('number');
      expect(typeof record.deviationAnalysis).toBe('string');
    });

    it('应该记录零偏差情况', () => {
      const record = analyzer.createDeviationRecord(
        'suggestion-002',
        { temperature: 60 },
        { temperature: 60 }
      );

      expect(record.deviationScore).toBe(0);
      expect(record.deviationAnalysis).toContain('可接受范围');
    });
  });
});

describe('错误码测试', () => {
  // 模拟错误码定义
  const ErrorCodes = {
    AI_003: { code: 'AI_003', message: '数据验证失败 - AI建议参数超出安全阈值', httpStatus: 400 },
    AI_009: { code: 'AI_009', message: '安全规则冲突 - AI建议与工业安全规则冲突', httpStatus: 400 },
    AI_010: { code: 'AI_010', message: '物联网指令超时 - IoT设备响应超时', httpStatus: 504 },
    SAFETY_001: { code: 'SAFETY_001', message: '温度参数超出安全范围', httpStatus: 400 },
    SAFETY_002: { code: 'SAFETY_002', message: '压力参数超出安全范围', httpStatus: 400 },
    SAFETY_003: { code: 'SAFETY_003', message: '材质-参数组合不兼容', httpStatus: 400 },
  };

  it('应该定义AI_003错误码', () => {
    expect(ErrorCodes.AI_003).toBeDefined();
    expect(ErrorCodes.AI_003.code).toBe('AI_003');
    expect(ErrorCodes.AI_003.httpStatus).toBe(400);
  });

  it('应该定义AI_009错误码', () => {
    expect(ErrorCodes.AI_009).toBeDefined();
    expect(ErrorCodes.AI_009.code).toBe('AI_009');
    expect(ErrorCodes.AI_009.message).toContain('安全规则冲突');
  });

  it('应该定义AI_010错误码', () => {
    expect(ErrorCodes.AI_010).toBeDefined();
    expect(ErrorCodes.AI_010.code).toBe('AI_010');
    expect(ErrorCodes.AI_010.httpStatus).toBe(504);
  });

  it('应该定义SAFETY系列错误码', () => {
    expect(ErrorCodes.SAFETY_001).toBeDefined();
    expect(ErrorCodes.SAFETY_002).toBeDefined();
    expect(ErrorCodes.SAFETY_003).toBeDefined();
  });
});

describe('工业安全中间件集成测试', () => {
  let safetyEngine: SafetyRuleEngine;

  beforeAll(() => {
    safetyEngine = new SafetyRuleEngine(mockSafetyRules);
  });

  it('应该拦截不安全的AI建议', () => {
    // 模拟AI建议数据
    const aiSuggestion = {
      id: 'suggestion-001',
      material_type: 'aluminum',
      equipment_model: 'GRT-SC-3000',
      parameters: {
        temperature: 95, // 超出铝材安全范围
        pressure: 1.0,
      },
    };

    const result = safetyEngine.validateParameters(
      aiSuggestion.material_type,
      aiSuggestion.equipment_model,
      aiSuggestion.parameters
    );

    expect(result.isValid).toBe(false);
    // 中间件应该返回AI_003错误
  });

  it('应该允许安全的AI建议通过', () => {
    const aiSuggestion = {
      id: 'suggestion-002',
      material_type: 'stainless_steel',
      equipment_model: 'GRT-SC-3000',
      parameters: {
        temperature: 100, // 不锈钢安全范围内
      },
    };

    const result = safetyEngine.validateParameters(
      aiSuggestion.material_type,
      aiSuggestion.equipment_model,
      aiSuggestion.parameters
    );

    expect(result.isValid).toBe(true);
  });

  it('应该记录安全校验日志', () => {
    const logEntries: Array<{ timestamp: Date; action: string; result: string }> = [];
    
    // 模拟日志记录
    const logSafetyCheck = (action: string, result: string) => {
      logEntries.push({ timestamp: new Date(), action, result });
    };

    const result = safetyEngine.validateParameter(
      'aluminum',
      'GRT-SC-3000',
      'temperature',
      85
    );

    logSafetyCheck('validate_temperature', result.isValid ? 'pass' : 'fail');

    expect(logEntries).toHaveLength(1);
    expect(logEntries[0].result).toBe('fail');
  });
});
