/**
 * GRT智能人才网格 - Safety_Filter 安全红线规则
 * 
 * 在llmService.ts中实现Safety_Filter
 * 确保所有AI建议在下发至操作工前必须通过安全规则库校验
 */

import { ErrorCodes, type ErrorCode } from './errorCodes';

// ============================================================================
// 物理参数类型定义
// ============================================================================

export type PhysicalParameterType = 
  | 'temperature'    // 温度
  | 'pressure'       // 压力
  | 'speed'          // 转速
  | 'voltage'        // 电压
  | 'current'        // 电流
  | 'flow_rate'      // 流量
  | 'concentration'  // 浓度
  | 'ph_value'       // pH值
  | 'time_duration'  // 时间
  | 'frequency';     // 频率

// ============================================================================
// 安全规则接口定义
// ============================================================================

export interface SafetyRule {
  ruleId: string;
  ruleName: string;
  category: 'physical' | 'chemical' | 'electrical' | 'operational';
  priority: 'critical' | 'high' | 'medium' | 'low';
  conditions: RuleCondition[];
  actions: RuleAction;
  isActive: boolean;
  version: string;
  effectiveDate: Date;
}

export interface RuleCondition {
  conditionType: 'parameter_check' | 'material_check' | 'equipment_check' | 'operator_check';
  parameter?: PhysicalParameterType;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'not_between';
  value: number | string | [number, number];
  unit?: string;
  materialType?: string;
  equipmentType?: string;
}

export interface RuleAction {
  intercept: boolean;
  errorCode: ErrorCode;
  notificationTargets: NotificationTarget[];
  loggingConfig: LoggingConfig;
  alternativeAction?: string;
}

export interface NotificationTarget {
  targetType: 'supervisor' | 'safety_officer' | 'operator' | 'system_admin';
  method: 'email' | 'sms' | 'in_app' | 'push';
  priority: 'immediate' | 'normal' | 'low';
}

export interface LoggingConfig {
  logLevel: 'error' | 'warn' | 'info';
  includeContext: boolean;
  retentionDays: number;
}

// ============================================================================
// 物理参数限制定义
// ============================================================================

export interface PhysicalLimit {
  parameterType: PhysicalParameterType;
  unit: string;
  absoluteMin?: number;
  absoluteMax?: number;
  warningMin?: number;
  warningMax?: number;
  defaultValue?: number;
  equipmentSpecific?: EquipmentSpecificLimit[];
  materialSpecific?: MaterialSpecificLimit[];
}

export interface EquipmentSpecificLimit {
  equipmentType: string;
  equipmentModel?: string;
  minValue?: number;
  maxValue?: number;
  warningThreshold?: number;
}

export interface MaterialSpecificLimit {
  materialType: string;
  materialGrade?: string;
  minValue?: number;
  maxValue?: number;
  notes?: string;
}

// ============================================================================
// 默认物理参数限制库
// ============================================================================

export const DEFAULT_PHYSICAL_LIMITS: PhysicalLimit[] = [
  {
    parameterType: 'temperature',
    unit: '°C',
    absoluteMin: -40,
    absoluteMax: 200,
    warningMin: 0,
    warningMax: 150,
    defaultValue: 60,
    materialSpecific: [
      { materialType: 'aluminum', maxValue: 80, notes: '铝材高温易变形' },
      { materialType: 'plastic', maxValue: 60, notes: '塑料耐温有限' },
      { materialType: 'stainless_steel', maxValue: 150, notes: '不锈钢耐高温' },
      { materialType: 'copper', maxValue: 100, notes: '铜材中等耐温' }
    ],
    equipmentSpecific: [
      { equipmentType: 'ultrasonic_cleaner', maxValue: 80 },
      { equipmentType: 'spray_washer', maxValue: 90 },
      { equipmentType: 'immersion_tank', maxValue: 95 }
    ]
  },
  {
    parameterType: 'pressure',
    unit: 'bar',
    absoluteMin: 0,
    absoluteMax: 20,
    warningMin: 0.5,
    warningMax: 15,
    defaultValue: 3,
    equipmentSpecific: [
      { equipmentType: 'high_pressure_washer', maxValue: 15 },
      { equipmentType: 'spray_washer', maxValue: 8 },
      { equipmentType: 'ultrasonic_cleaner', maxValue: 2 }
    ]
  },
  {
    parameterType: 'speed',
    unit: 'rpm',
    absoluteMin: 0,
    absoluteMax: 10000,
    warningMin: 100,
    warningMax: 8000,
    defaultValue: 1500,
    equipmentSpecific: [
      { equipmentType: 'centrifugal_dryer', maxValue: 3000 },
      { equipmentType: 'rotary_basket', maxValue: 500 },
      { equipmentType: 'agitator', maxValue: 200 }
    ]
  },
  {
    parameterType: 'voltage',
    unit: 'V',
    absoluteMin: 0,
    absoluteMax: 480,
    warningMin: 180,
    warningMax: 440,
    defaultValue: 380
  },
  {
    parameterType: 'current',
    unit: 'A',
    absoluteMin: 0,
    absoluteMax: 100,
    warningMin: 0.5,
    warningMax: 80,
    defaultValue: 10
  },
  {
    parameterType: 'flow_rate',
    unit: 'L/min',
    absoluteMin: 0,
    absoluteMax: 500,
    warningMin: 5,
    warningMax: 400,
    defaultValue: 50
  },
  {
    parameterType: 'concentration',
    unit: '%',
    absoluteMin: 0,
    absoluteMax: 100,
    warningMin: 1,
    warningMax: 20,
    defaultValue: 5,
    materialSpecific: [
      { materialType: 'aluminum', maxValue: 5, notes: '铝材对碱性清洗剂敏感' },
      { materialType: 'copper', maxValue: 8, notes: '铜材中等耐腐蚀' }
    ]
  },
  {
    parameterType: 'ph_value',
    unit: 'pH',
    absoluteMin: 0,
    absoluteMax: 14,
    warningMin: 5,
    warningMax: 10,
    defaultValue: 7,
    materialSpecific: [
      { materialType: 'aluminum', minValue: 6, maxValue: 9, notes: '铝材需中性环境' },
      { materialType: 'stainless_steel', minValue: 4, maxValue: 11, notes: '不锈钢耐酸碱' }
    ]
  },
  {
    parameterType: 'time_duration',
    unit: 'min',
    absoluteMin: 0,
    absoluteMax: 480,
    warningMin: 1,
    warningMax: 120,
    defaultValue: 15
  },
  {
    parameterType: 'frequency',
    unit: 'kHz',
    absoluteMin: 20,
    absoluteMax: 200,
    warningMin: 25,
    warningMax: 80,
    defaultValue: 40
  }
];

// ============================================================================
// Safety Filter 核心类
// ============================================================================

export interface SafetyFilterConfig {
  filterId: string;
  rules: SafetyRule[];
  physicalLimits: PhysicalLimit[];
  strictMode: boolean;
  bypassRoles?: string[];
}

export interface AISuggestion {
  suggestionId: string;
  suggestionType: 'parameter_change' | 'action' | 'process_modification';
  targetParameter?: PhysicalParameterType;
  suggestedValue?: number;
  unit?: string;
  materialType?: string;
  equipmentType?: string;
  operatorId?: string;
  operatorSkillLevel?: number;
  context?: Record<string, unknown>;
}

export interface SafetyCheckResult {
  passed: boolean;
  errorCode?: ErrorCode;
  errorMessage?: string;
  violatedRules: string[];
  warnings: string[];
  suggestions: string[];
  intercepted: boolean;
  logId?: string;
}

export class SafetyFilter {
  private config: SafetyFilterConfig;
  private rules: Map<string, SafetyRule>;
  private limits: Map<PhysicalParameterType, PhysicalLimit>;
  
  constructor(config: SafetyFilterConfig) {
    this.config = config;
    this.rules = new Map(config.rules.map(r => [r.ruleId, r]));
    this.limits = new Map(config.physicalLimits.map(l => [l.parameterType, l]));
  }
  
  /**
   * 主要校验方法 - 检查AI建议是否安全
   */
  async checkSuggestion(suggestion: AISuggestion): Promise<SafetyCheckResult> {
    const result: SafetyCheckResult = {
      passed: true,
      violatedRules: [],
      warnings: [],
      suggestions: [],
      intercepted: false
    };
    
    // 1. 物理参数限制检查
    if (suggestion.targetParameter && suggestion.suggestedValue !== undefined) {
      const paramResult = this.checkPhysicalParameter(
        suggestion.targetParameter,
        suggestion.suggestedValue,
        suggestion.materialType,
        suggestion.equipmentType
      );
      
      if (!paramResult.passed) {
        result.passed = false;
        result.errorCode = paramResult.errorCode;
        result.errorMessage = paramResult.errorMessage;
        result.intercepted = true;
        result.violatedRules.push(...paramResult.violatedRules);
      }
      
      result.warnings.push(...paramResult.warnings);
      result.suggestions.push(...paramResult.suggestions);
    }
    
    // 2. 安全规则检查
    for (const rule of Array.from(this.rules.values())) {
      if (!rule.isActive) continue;
      
      const ruleResult = this.evaluateRule(rule, suggestion);
      if (!ruleResult.passed) {
        result.passed = false;
        result.violatedRules.push(rule.ruleId);
        
        if (rule.actions.intercept) {
          result.intercepted = true;
          result.errorCode = rule.actions.errorCode;
          result.errorMessage = `违反安全规则: ${rule.ruleName}`;
        }
      }
      
      result.warnings.push(...ruleResult.warnings);
    }
    
    // 3. 操作员资质检查
    if (suggestion.operatorId && suggestion.operatorSkillLevel !== undefined) {
      const qualResult = this.checkOperatorQualification(
        suggestion.operatorSkillLevel,
        suggestion.targetParameter
      );
      
      if (!qualResult.passed) {
        result.passed = false;
        result.errorCode = 'AI_012';
        result.errorMessage = qualResult.errorMessage;
        result.intercepted = true;
      }
      
      result.warnings.push(...qualResult.warnings);
    }
    
    // 4. 记录日志
    if (!result.passed || result.warnings.length > 0) {
      result.logId = await this.logSafetyCheck(suggestion, result);
    }
    
    return result;
  }
  
  /**
   * 检查物理参数是否在安全范围内
   */
  private checkPhysicalParameter(
    parameterType: PhysicalParameterType,
    value: number,
    materialType?: string,
    equipmentType?: string
  ): SafetyCheckResult {
    const result: SafetyCheckResult = {
      passed: true,
      violatedRules: [],
      warnings: [],
      suggestions: [],
      intercepted: false
    };
    
    const limit = this.limits.get(parameterType);
    if (!limit) {
      result.warnings.push(`未找到参数 ${parameterType} 的限制定义`);
      return result;
    }
    
    // 获取适用的限制值
    let effectiveMin = limit.absoluteMin;
    let effectiveMax = limit.absoluteMax;
    let warningMin = limit.warningMin;
    let warningMax = limit.warningMax;
    
    // 材质特定限制
    if (materialType && limit.materialSpecific) {
      const materialLimit = limit.materialSpecific.find(
        m => m.materialType === materialType
      );
      if (materialLimit) {
        if (materialLimit.minValue !== undefined) effectiveMin = Math.max(effectiveMin ?? -Infinity, materialLimit.minValue);
        if (materialLimit.maxValue !== undefined) effectiveMax = Math.min(effectiveMax ?? Infinity, materialLimit.maxValue);
      }
    }
    
    // 设备特定限制
    if (equipmentType && limit.equipmentSpecific) {
      const equipLimit = limit.equipmentSpecific.find(
        e => e.equipmentType === equipmentType
      );
      if (equipLimit) {
        if (equipLimit.minValue !== undefined) effectiveMin = Math.max(effectiveMin ?? -Infinity, equipLimit.minValue);
        if (equipLimit.maxValue !== undefined) effectiveMax = Math.min(effectiveMax ?? Infinity, equipLimit.maxValue);
      }
    }
    
    // 绝对限制检查
    if (effectiveMin !== undefined && value < effectiveMin) {
      result.passed = false;
      result.intercepted = true;
      result.errorCode = 'AI_003';
      result.errorMessage = `${parameterType} 值 ${value}${limit.unit} 低于最小安全值 ${effectiveMin}${limit.unit}`;
      result.violatedRules.push(`PHYS_MIN_${parameterType.toUpperCase()}`);
      result.suggestions.push(`建议将 ${parameterType} 设置为 ${effectiveMin}${limit.unit} 或以上`);
    }
    
    if (effectiveMax !== undefined && value > effectiveMax) {
      result.passed = false;
      result.intercepted = true;
      result.errorCode = 'AI_003';
      result.errorMessage = `${parameterType} 值 ${value}${limit.unit} 超过最大安全值 ${effectiveMax}${limit.unit}`;
      result.violatedRules.push(`PHYS_MAX_${parameterType.toUpperCase()}`);
      result.suggestions.push(`建议将 ${parameterType} 设置为 ${effectiveMax}${limit.unit} 或以下`);
    }
    
    // 警告阈值检查
    if (result.passed) {
      if (warningMin !== undefined && value < warningMin) {
        result.warnings.push(`${parameterType} 值 ${value}${limit.unit} 接近最小安全边界`);
      }
      if (warningMax !== undefined && value > warningMax) {
        result.warnings.push(`${parameterType} 值 ${value}${limit.unit} 接近最大安全边界`);
      }
    }
    
    return result;
  }
  
  /**
   * 评估单条安全规则
   */
  private evaluateRule(rule: SafetyRule, suggestion: AISuggestion): {
    passed: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    for (const condition of rule.conditions) {
      switch (condition.conditionType) {
        case 'parameter_check':
          if (suggestion.targetParameter === condition.parameter) {
            const checkResult = this.evaluateCondition(
              suggestion.suggestedValue,
              condition.operator,
              condition.value
            );
            if (!checkResult) {
              return { passed: false, warnings };
            }
          }
          break;
          
        case 'material_check':
          if (suggestion.materialType === condition.materialType) {
            // 材质特定规则检查
            if (condition.parameter && suggestion.targetParameter === condition.parameter) {
              const checkResult = this.evaluateCondition(
                suggestion.suggestedValue,
                condition.operator,
                condition.value
              );
              if (!checkResult) {
                return { passed: false, warnings };
              }
            }
          }
          break;
          
        case 'equipment_check':
          if (suggestion.equipmentType === condition.equipmentType) {
            // 设备特定规则检查
            if (condition.parameter && suggestion.targetParameter === condition.parameter) {
              const checkResult = this.evaluateCondition(
                suggestion.suggestedValue,
                condition.operator,
                condition.value
              );
              if (!checkResult) {
                return { passed: false, warnings };
              }
            }
          }
          break;
          
        case 'operator_check':
          // 操作员资质检查在单独方法中处理
          break;
      }
    }
    
    return { passed: true, warnings };
  }
  
  /**
   * 评估条件表达式
   */
  private evaluateCondition(
    actualValue: number | undefined,
    operator: RuleCondition['operator'],
    expectedValue: number | string | [number, number]
  ): boolean {
    if (actualValue === undefined) return true;
    
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'greater_than':
        return typeof expectedValue === 'number' && actualValue > expectedValue;
      case 'less_than':
        return typeof expectedValue === 'number' && actualValue < expectedValue;
      case 'between':
        if (Array.isArray(expectedValue)) {
          return actualValue >= expectedValue[0] && actualValue <= expectedValue[1];
        }
        return false;
      case 'not_between':
        if (Array.isArray(expectedValue)) {
          return actualValue < expectedValue[0] || actualValue > expectedValue[1];
        }
        return false;
      default:
        return true;
    }
  }
  
  /**
   * 检查操作员资质
   */
  private checkOperatorQualification(
    skillLevel: number,
    parameterType?: PhysicalParameterType
  ): {
    passed: boolean;
    errorMessage?: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    // 高级参数需要更高技能等级
    const advancedParameters: PhysicalParameterType[] = [
      'pressure', 'voltage', 'current', 'concentration', 'ph_value'
    ];
    
    if (parameterType && advancedParameters.includes(parameterType)) {
      if (skillLevel < 3) {
        return {
          passed: false,
          errorMessage: `操作员技能等级 ${skillLevel} 不足以修改 ${parameterType} 参数（需要等级3或以上）`,
          warnings
        };
      }
      if (skillLevel < 4) {
        warnings.push(`建议由更高技能等级的工程师监督 ${parameterType} 参数修改`);
      }
    }
    
    return { passed: true, warnings };
  }
  
  /**
   * 记录安全检查日志
   */
  private async logSafetyCheck(
    suggestion: AISuggestion,
    result: SafetyCheckResult
  ): Promise<string> {
    const logId = `SAFETY_LOG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 这里应该写入数据库，目前返回日志ID
    console.log('[SafetyFilter] 安全检查日志:', {
      logId,
      suggestion,
      result,
      timestamp: new Date().toISOString()
    });
    
    return logId;
  }
  
  /**
   * 添加新规则
   */
  addRule(rule: SafetyRule): void {
    this.rules.set(rule.ruleId, rule);
  }
  
  /**
   * 移除规则
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }
  
  /**
   * 更新物理参数限制
   */
  updatePhysicalLimit(limit: PhysicalLimit): void {
    this.limits.set(limit.parameterType, limit);
  }
  
  /**
   * 获取所有活动规则
   */
  getActiveRules(): SafetyRule[] {
    return Array.from(this.rules.values()).filter(r => r.isActive);
  }
  
  /**
   * 获取参数的安全范围
   */
  getSafeRange(
    parameterType: PhysicalParameterType,
    materialType?: string,
    equipmentType?: string
  ): { min: number; max: number; unit: string } | null {
    const limit = this.limits.get(parameterType);
    if (!limit) return null;
    
    let min = limit.absoluteMin ?? 0;
    let max = limit.absoluteMax ?? Infinity;
    
    if (materialType && limit.materialSpecific) {
      const materialLimit = limit.materialSpecific.find(m => m.materialType === materialType);
      if (materialLimit) {
        if (materialLimit.minValue !== undefined) min = Math.max(min, materialLimit.minValue);
        if (materialLimit.maxValue !== undefined) max = Math.min(max, materialLimit.maxValue);
      }
    }
    
    if (equipmentType && limit.equipmentSpecific) {
      const equipLimit = limit.equipmentSpecific.find(e => e.equipmentType === equipmentType);
      if (equipLimit) {
        if (equipLimit.minValue !== undefined) min = Math.max(min, equipLimit.minValue);
        if (equipLimit.maxValue !== undefined) max = Math.min(max, equipLimit.maxValue);
      }
    }
    
    return { min, max, unit: limit.unit };
  }
}

// ============================================================================
// 默认Safety Filter实例
// ============================================================================

export const createDefaultSafetyFilter = (): SafetyFilter => {
  return new SafetyFilter({
    filterId: 'GRT_SAFETY_FILTER_V1',
    rules: [
      {
        ruleId: 'RULE_TEMP_ALUMINUM',
        ruleName: '铝材温度限制',
        category: 'physical',
        priority: 'critical',
        conditions: [
          {
            conditionType: 'material_check',
            materialType: 'aluminum',
            parameter: 'temperature',
            operator: 'less_than',
            value: 80
          }
        ],
        actions: {
          intercept: true,
          errorCode: 'AI_003',
          notificationTargets: [
            { targetType: 'supervisor', method: 'in_app', priority: 'immediate' }
          ],
          loggingConfig: { logLevel: 'error', includeContext: true, retentionDays: 365 }
        },
        isActive: true,
        version: '1.0',
        effectiveDate: new Date('2024-01-01')
      },
      {
        ruleId: 'RULE_PRESSURE_HIGH',
        ruleName: '高压设备压力限制',
        category: 'physical',
        priority: 'critical',
        conditions: [
          {
            conditionType: 'equipment_check',
            equipmentType: 'high_pressure_washer',
            parameter: 'pressure',
            operator: 'less_than',
            value: 15
          }
        ],
        actions: {
          intercept: true,
          errorCode: 'AI_009',
          notificationTargets: [
            { targetType: 'safety_officer', method: 'sms', priority: 'immediate' },
            { targetType: 'supervisor', method: 'in_app', priority: 'immediate' }
          ],
          loggingConfig: { logLevel: 'error', includeContext: true, retentionDays: 730 }
        },
        isActive: true,
        version: '1.0',
        effectiveDate: new Date('2024-01-01')
      },
      {
        ruleId: 'RULE_PH_ALUMINUM',
        ruleName: '铝材pH值限制',
        category: 'chemical',
        priority: 'high',
        conditions: [
          {
            conditionType: 'material_check',
            materialType: 'aluminum',
            parameter: 'ph_value',
            operator: 'between',
            value: [6, 9]
          }
        ],
        actions: {
          intercept: true,
          errorCode: 'AI_003',
          notificationTargets: [
            { targetType: 'supervisor', method: 'in_app', priority: 'normal' }
          ],
          loggingConfig: { logLevel: 'warn', includeContext: true, retentionDays: 180 }
        },
        isActive: true,
        version: '1.0',
        effectiveDate: new Date('2024-01-01')
      }
    ],
    physicalLimits: DEFAULT_PHYSICAL_LIMITS,
    strictMode: true
  });
};

// ============================================================================
// LLM Service 集成接口
// ============================================================================

export interface LLMServiceSafetyIntegration {
  /**
   * 在LLM生成建议后调用此方法进行安全校验
   */
  validateAISuggestion(suggestion: AISuggestion): Promise<SafetyCheckResult>;
  
  /**
   * 获取参数的安全建议范围
   */
  getSafeParameterRange(
    parameterType: PhysicalParameterType,
    context: { materialType?: string; equipmentType?: string }
  ): { min: number; max: number; unit: string } | null;
  
  /**
   * 检查操作是否需要更高权限
   */
  checkOperationPermission(
    operatorSkillLevel: number,
    operation: AISuggestion
  ): { allowed: boolean; requiredLevel?: number; reason?: string };
}

/**
 * 创建LLM服务安全集成实例
 */
export const createLLMServiceSafetyIntegration = (): LLMServiceSafetyIntegration => {
  const filter = createDefaultSafetyFilter();
  
  return {
    async validateAISuggestion(suggestion: AISuggestion): Promise<SafetyCheckResult> {
      return filter.checkSuggestion(suggestion);
    },
    
    getSafeParameterRange(
      parameterType: PhysicalParameterType,
      context: { materialType?: string; equipmentType?: string }
    ) {
      return filter.getSafeRange(parameterType, context.materialType, context.equipmentType);
    },
    
    checkOperationPermission(
      operatorSkillLevel: number,
      operation: AISuggestion
    ) {
      const advancedParameters: PhysicalParameterType[] = [
        'pressure', 'voltage', 'current', 'concentration', 'ph_value'
      ];
      
      if (operation.targetParameter && advancedParameters.includes(operation.targetParameter)) {
        if (operatorSkillLevel < 3) {
          return {
            allowed: false,
            requiredLevel: 3,
            reason: `修改 ${operation.targetParameter} 参数需要技能等级3或以上`
          };
        }
      }
      
      return { allowed: true };
    }
  };
};
