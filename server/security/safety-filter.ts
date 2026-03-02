/**
 * 安全过滤器 (Safety Filter)
 * 
 * 功能：在AI建议发送给操作员前进行安全检查
 * 
 * 检查规则：
 * 1. 物理参数超限检查（温度、压力、速度等）
 * 2. 危险操作检测（高压、高温、化学品等）
 * 3. 合规性检查（法规、标准、认证要求）
 * 4. 权限验证（操作员资质证书）
 */

import { createChildLogger } from "../lib/logger";
const log = createChildLogger("safety-filter");

// 安全规则类型
export interface SafetyRule {
  id: string;
  name: string;
  description: string;
  category: 'physical_limit' | 'dangerous_operation' | 'compliance' | 'permission';
  severity: 'critical' | 'high' | 'medium' | 'low';
  check: (content: string, context?: SafetyContext) => SafetyCheckResult;
  isActive: boolean;
}

// 安全上下文
export interface SafetyContext {
  userId?: string;
  userRole?: string;
  userCertifications?: string[];
  equipmentModel?: string;
  projectId?: string;
  operationType?: string;
}

// 安全检查结果
export interface SafetyCheckResult {
  passed: boolean;
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message?: string;
  details?: Record<string, any>;
}

// 安全过滤结果
export interface SafetyFilterResult {
  allowed: boolean;
  originalContent: string;
  filteredContent?: string;
  violations: SafetyCheckResult[];
  warnings: SafetyCheckResult[];
  timestamp: Date;
  errorCode?: string;
}

// 物理参数限制配置
const physicalLimits = {
  temperature: { min: -40, max: 200, unit: '℃' },
  pressure: { min: 0, max: 10, unit: 'MPa' },
  voltage: { min: 0, max: 480, unit: 'V' },
  current: { min: 0, max: 100, unit: 'A' },
  speed: { min: 0, max: 3000, unit: 'rpm' },
  frequency: { min: 20, max: 130, unit: 'kHz' },
  concentration: { min: 0, max: 100, unit: '%' }
};

// 危险关键词
const dangerousKeywords = [
  '高压电', '强酸', '强碱', '易燃', '易爆', '有毒', '腐蚀性',
  '辐射', '高温', '低温', '真空', '高压气体', '激光'
];

// 需要认证的操作
const certificationRequirements: Record<string, string[]> = {
  'ultrasonic_advanced': ['高级超声波调试证书', 'Advanced Ultrasonic Certificate'],
  'high_voltage': ['高压电工证', 'High Voltage Electrician License'],
  'chemical_handling': ['化学品操作证', 'Chemical Handling Certificate'],
  'laser_operation': ['激光设备操作证', 'Laser Equipment Operator License']
};

// 默认安全规则
const defaultSafetyRules: SafetyRule[] = [
  // 物理参数超限检查
  {
    id: 'SAFETY_001',
    name: '温度超限检查',
    description: '检查温度参数是否在安全范围内',
    category: 'physical_limit',
    severity: 'critical',
    check: (content: string) => {
      const tempMatch = content.match(/(?:温度|temperature)[：:\s]*(-?\d+(?:\.\d+)?)\s*(?:℃|°C|度)?/gi);
      if (tempMatch) {
        for (const match of tempMatch) {
          const value = parseFloat(match.replace(/[^\d.-]/g, ''));
          if (value < physicalLimits.temperature.min || value > physicalLimits.temperature.max) {
            return {
              passed: false,
              ruleId: 'SAFETY_001',
              ruleName: '温度超限检查',
              severity: 'critical',
              message: `温度值 ${value}℃ 超出安全范围 (${physicalLimits.temperature.min}~${physicalLimits.temperature.max}℃)`,
              details: { value, limits: physicalLimits.temperature }
            };
          }
        }
      }
      return { passed: true, ruleId: 'SAFETY_001', ruleName: '温度超限检查', severity: 'critical' };
    },
    isActive: true
  },
  {
    id: 'SAFETY_002',
    name: '压力超限检查',
    description: '检查压力参数是否在安全范围内',
    category: 'physical_limit',
    severity: 'critical',
    check: (content: string) => {
      const pressureMatch = content.match(/(?:压力|pressure)[：:\s]*(\d+(?:\.\d+)?)\s*(?:MPa|mpa|兆帕)?/gi);
      if (pressureMatch) {
        for (const match of pressureMatch) {
          const value = parseFloat(match.replace(/[^\d.]/g, ''));
          if (value > physicalLimits.pressure.max) {
            return {
              passed: false,
              ruleId: 'SAFETY_002',
              ruleName: '压力超限检查',
              severity: 'critical',
              message: `压力值 ${value}MPa 超出安全范围 (最大 ${physicalLimits.pressure.max}MPa)`,
              details: { value, limits: physicalLimits.pressure }
            };
          }
        }
      }
      return { passed: true, ruleId: 'SAFETY_002', ruleName: '压力超限检查', severity: 'critical' };
    },
    isActive: true
  },
  {
    id: 'SAFETY_003',
    name: '电压超限检查',
    description: '检查电压参数是否在安全范围内',
    category: 'physical_limit',
    severity: 'critical',
    check: (content: string) => {
      const voltageMatch = content.match(/(?:电压|voltage)[：:\s]*(\d+(?:\.\d+)?)\s*(?:V|伏)?/gi);
      if (voltageMatch) {
        for (const match of voltageMatch) {
          const value = parseFloat(match.replace(/[^\d.]/g, ''));
          if (value > physicalLimits.voltage.max) {
            return {
              passed: false,
              ruleId: 'SAFETY_003',
              ruleName: '电压超限检查',
              severity: 'critical',
              message: `电压值 ${value}V 超出安全范围 (最大 ${physicalLimits.voltage.max}V)`,
              details: { value, limits: physicalLimits.voltage }
            };
          }
        }
      }
      return { passed: true, ruleId: 'SAFETY_003', ruleName: '电压超限检查', severity: 'critical' };
    },
    isActive: true
  },
  
  // 危险操作检测
  {
    id: 'SAFETY_010',
    name: '危险关键词检测',
    description: '检测内容中是否包含危险操作关键词',
    category: 'dangerous_operation',
    severity: 'high',
    check: (content: string) => {
      const foundKeywords = dangerousKeywords.filter(kw => content.includes(kw));
      if (foundKeywords.length > 0) {
        return {
          passed: false,
          ruleId: 'SAFETY_010',
          ruleName: '危险关键词检测',
          severity: 'high',
          message: `检测到危险操作关键词: ${foundKeywords.join(', ')}`,
          details: { keywords: foundKeywords }
        };
      }
      return { passed: true, ruleId: 'SAFETY_010', ruleName: '危险关键词检测', severity: 'high' };
    },
    isActive: true
  },
  
  // 权限验证
  {
    id: 'SAFETY_020',
    name: '超声波高级操作权限',
    description: '检查用户是否具有超声波高级操作资质',
    category: 'permission',
    severity: 'high',
    check: (content: string, context?: SafetyContext) => {
      const requiresAdvanced = /(?:高级|advanced|高频|高功率).*(?:超声波|ultrasonic)/gi.test(content);
      if (requiresAdvanced) {
        const requiredCerts = certificationRequirements['ultrasonic_advanced'];
        const userCerts = context?.userCertifications || [];
        const hasCert = requiredCerts.some(cert => userCerts.includes(cert));
        if (!hasCert) {
          return {
            passed: false,
            ruleId: 'SAFETY_020',
            ruleName: '超声波高级操作权限',
            severity: 'high',
            message: `此操作需要持有: ${requiredCerts.join(' 或 ')}`,
            details: { requiredCerts, userCerts }
          };
        }
      }
      return { passed: true, ruleId: 'SAFETY_020', ruleName: '超声波高级操作权限', severity: 'high' };
    },
    isActive: true
  },
  {
    id: 'SAFETY_021',
    name: '高压电操作权限',
    description: '检查用户是否具有高压电操作资质',
    category: 'permission',
    severity: 'critical',
    check: (content: string, context?: SafetyContext) => {
      const requiresHighVoltage = /(?:高压|380V|480V|high.?voltage)/gi.test(content);
      if (requiresHighVoltage) {
        const requiredCerts = certificationRequirements['high_voltage'];
        const userCerts = context?.userCertifications || [];
        const hasCert = requiredCerts.some(cert => userCerts.includes(cert));
        if (!hasCert) {
          return {
            passed: false,
            ruleId: 'SAFETY_021',
            ruleName: '高压电操作权限',
            severity: 'critical',
            message: `此操作需要持有: ${requiredCerts.join(' 或 ')}`,
            details: { requiredCerts, userCerts }
          };
        }
      }
      return { passed: true, ruleId: 'SAFETY_021', ruleName: '高压电操作权限', severity: 'critical' };
    },
    isActive: true
  }
];

/**
 * 安全过滤器类
 */
export class SafetyFilter {
  private rules: SafetyRule[];

  constructor(rules: SafetyRule[] = defaultSafetyRules) {
    this.rules = rules;
  }

  /**
   * 执行安全检查
   */
  check(content: string, context?: SafetyContext): SafetyFilterResult {
    const violations: SafetyCheckResult[] = [];
    const warnings: SafetyCheckResult[] = [];

    for (const rule of this.rules) {
      if (!rule.isActive) continue;

      const result = rule.check(content, context);
      if (!result.passed) {
        if (result.severity === 'critical' || result.severity === 'high') {
          violations.push(result);
        } else {
          warnings.push(result);
        }
      }
    }

    const allowed = violations.length === 0;
    const errorCode = violations.length > 0 ? 'AI_003' : undefined;

    return {
      allowed,
      originalContent: content,
      violations,
      warnings,
      timestamp: new Date(),
      errorCode
    };
  }

  /**
   * 过滤AI建议内容
   */
  filterAISuggestion(
    suggestion: string,
    context?: SafetyContext
  ): SafetyFilterResult {
    const checkResult = this.check(suggestion, context);

    if (!checkResult.allowed) {
      // 记录安全拦截日志
      log.error({ errorCode: checkResult.errorCode }, "AI suggestion intercepted");
      log.error({ violations: checkResult.violations.map(v => v.message) }, "Violation details");
      
      // 生成安全提示替代内容
      checkResult.filteredContent = this.generateSafeAlternative(checkResult);
    }

    return checkResult;
  }

  /**
   * 生成安全替代内容
   */
  private generateSafeAlternative(result: SafetyFilterResult): string {
    const messages = [
      '⚠️ 安全提示：AI建议已被安全系统拦截',
      '',
      '拦截原因：'
    ];

    for (const violation of result.violations) {
      messages.push(`• [${violation.ruleId}] ${violation.message}`);
    }

    messages.push('');
    messages.push('建议操作：');
    messages.push('1. 请联系具有相应资质的工程师处理');
    messages.push('2. 检查操作参数是否在安全范围内');
    messages.push('3. 如有疑问，请联系安全管理员');

    return messages.join('\n');
  }

  /**
   * 添加规则
   */
  addRule(rule: SafetyRule): void {
    this.rules.push(rule);
  }

  /**
   * 获取所有规则
   */
  getRules(): SafetyRule[] {
    return this.rules;
  }

  /**
   * 启用/禁用规则
   */
  toggleRule(ruleId: string, isActive: boolean): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.isActive = isActive;
      return true;
    }
    return false;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalRules: number;
    activeRules: number;
    rulesByCategory: Record<string, number>;
    rulesBySeverity: Record<string, number>;
  } {
    const rulesByCategory: Record<string, number> = {};
    const rulesBySeverity: Record<string, number> = {};
    let activeRules = 0;

    for (const rule of this.rules) {
      rulesByCategory[rule.category] = (rulesByCategory[rule.category] || 0) + 1;
      rulesBySeverity[rule.severity] = (rulesBySeverity[rule.severity] || 0) + 1;
      if (rule.isActive) activeRules++;
    }

    return {
      totalRules: this.rules.length,
      activeRules,
      rulesByCategory,
      rulesBySeverity
    };
  }
}

// 导出单例
export const safetyFilter = new SafetyFilter();

/**
 * AI建议安全过滤中间件
 */
export function filterAISuggestionMiddleware(
  suggestion: string,
  context?: SafetyContext
): { safe: boolean; content: string; errorCode?: string } {
  const result = safetyFilter.filterAISuggestion(suggestion, context);
  
  return {
    safe: result.allowed,
    content: result.allowed ? result.originalContent : (result.filteredContent || ''),
    errorCode: result.errorCode
  };
}
