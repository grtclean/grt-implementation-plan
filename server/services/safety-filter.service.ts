/**
 * 安全过滤器服务
 * AI建议安全检查，防止物理超限和危险操作
 */


import { createChildLogger } from "../lib/logger";
const log = createChildLogger("safety-filter-svc");

export interface SafetyRule {
  id: string;
  name: string;
  category: 'physical' | 'chemical' | 'electrical' | 'operational';
  description: string;
  limits: SafetyLimit[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface SafetyLimit {
  parameter: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
  forbiddenValues?: string[];
}

export interface SafetyCheckResult {
  passed: boolean;
  violations: SafetyViolation[];
  warnings: SafetyWarning[];
  timestamp: string;
}

export interface SafetyViolation {
  ruleId: string;
  ruleName: string;
  parameter: string;
  actualValue: string | number;
  limit: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  errorCode: string;
  message: string;
}

export interface SafetyWarning {
  ruleId: string;
  ruleName: string;
  message: string;
  recommendation: string;
}

// 安全规则库
const safetyRules: SafetyRule[] = [
  {
    id: "SR-001",
    name: "超声波功率限制",
    category: "physical",
    description: "超声波清洗设备功率不得超过设备额定功率",
    limits: [
      { parameter: "ultrasonicPower", unit: "W", maxValue: 5000 }
    ],
    severity: "critical"
  },
  {
    id: "SR-002",
    name: "清洗温度限制",
    category: "physical",
    description: "清洗液温度不得超过安全上限",
    limits: [
      { parameter: "temperature", unit: "°C", minValue: 10, maxValue: 90 }
    ],
    severity: "high"
  },
  {
    id: "SR-003",
    name: "化学品浓度限制",
    category: "chemical",
    description: "清洗剂浓度必须在安全范围内",
    limits: [
      { parameter: "chemicalConcentration", unit: "%", minValue: 0.5, maxValue: 10 }
    ],
    severity: "high"
  },
  {
    id: "SR-004",
    name: "电气安全限制",
    category: "electrical",
    description: "设备运行电压必须在额定范围内",
    limits: [
      { parameter: "voltage", unit: "V", minValue: 380, maxValue: 420 }
    ],
    severity: "critical"
  },
  {
    id: "SR-005",
    name: "压力限制",
    category: "physical",
    description: "喷淋压力不得超过设备额定压力",
    limits: [
      { parameter: "pressure", unit: "bar", maxValue: 15 }
    ],
    severity: "high"
  },
  {
    id: "SR-006",
    name: "运行速度限制",
    category: "operational",
    description: "传送带速度不得超过安全上限",
    limits: [
      { parameter: "conveyorSpeed", unit: "m/min", maxValue: 10 }
    ],
    severity: "medium"
  },
  {
    id: "SR-007",
    name: "禁止化学品",
    category: "chemical",
    description: "禁止使用特定危险化学品",
    limits: [
      { parameter: "chemical", unit: "", forbiddenValues: ["氢氟酸", "浓硫酸", "氰化物"] }
    ],
    severity: "critical"
  },
  {
    id: "SR-008",
    name: "真空度限制",
    category: "physical",
    description: "真空干燥设备真空度限制",
    limits: [
      { parameter: "vacuum", unit: "Pa", minValue: 100, maxValue: 101325 }
    ],
    severity: "high"
  }
];

/**
 * 检查AI建议是否安全
 */
export function checkAISuggestion(
  suggestion: Record<string, any>
): SafetyCheckResult {
  const violations: SafetyViolation[] = [];
  const warnings: SafetyWarning[] = [];

  for (const rule of safetyRules) {
    for (const limit of rule.limits) {
      const value = suggestion[limit.parameter];
      
      if (value === undefined) continue;

      // 检查禁止值
      if (limit.forbiddenValues && limit.forbiddenValues.includes(value)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          parameter: limit.parameter,
          actualValue: value,
          limit: `禁止使用: ${limit.forbiddenValues.join(", ")}`,
          severity: rule.severity,
          errorCode: "AI_003",
          message: `安全违规：${rule.description}。${limit.parameter}值"${value}"在禁止列表中。`
        });
        continue;
      }

      // 检查数值范围
      if (typeof value === 'number') {
        if (limit.minValue !== undefined && value < limit.minValue) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            parameter: limit.parameter,
            actualValue: value,
            limit: `最小值: ${limit.minValue}${limit.unit}`,
            severity: rule.severity,
            errorCode: "AI_003",
            message: `安全违规：${rule.description}。${limit.parameter}值${value}${limit.unit}低于最小限制${limit.minValue}${limit.unit}。`
          });
        }

        if (limit.maxValue !== undefined && value > limit.maxValue) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            parameter: limit.parameter,
            actualValue: value,
            limit: `最大值: ${limit.maxValue}${limit.unit}`,
            severity: rule.severity,
            errorCode: "AI_003",
            message: `安全违规：${rule.description}。${limit.parameter}值${value}${limit.unit}超过最大限制${limit.maxValue}${limit.unit}。`
          });
        }

        // 接近限制时发出警告
        if (limit.maxValue !== undefined) {
          const warningThreshold = limit.maxValue * 0.9;
          if (value >= warningThreshold && value <= limit.maxValue) {
            warnings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              message: `${limit.parameter}值${value}${limit.unit}接近最大限制${limit.maxValue}${limit.unit}`,
              recommendation: `建议将${limit.parameter}降低至${Math.round(limit.maxValue * 0.8)}${limit.unit}以下`
            });
          }
        }
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
    timestamp: new Date().toISOString()
  };
}

/**
 * 过滤AI建议
 */
export function filterAISuggestion(
  suggestion: Record<string, any>
): {
  filtered: Record<string, any>;
  intercepted: boolean;
  checkResult: SafetyCheckResult;
} {
  const checkResult = checkAISuggestion(suggestion);

  if (!checkResult.passed) {
    // 有严重违规，拦截建议
    const hasCritical = checkResult.violations.some(v => v.severity === 'critical');
    
    if (hasCritical) {
      return {
        filtered: {},
        intercepted: true,
        checkResult
      };
    }

    // 非严重违规，尝试修正
    const filtered = { ...suggestion };
    for (const violation of checkResult.violations) {
      // 移除违规参数
      delete filtered[violation.parameter];
    }

    return {
      filtered,
      intercepted: false,
      checkResult
    };
  }

  return {
    filtered: suggestion,
    intercepted: false,
    checkResult
  };
}

/**
 * 获取安全规则列表
 */
export function getSafetyRules(): SafetyRule[] {
  return safetyRules;
}

/**
 * 添加安全规则
 */
export function addSafetyRule(rule: SafetyRule): void {
  safetyRules.push(rule);
}

/**
 * 更新安全规则
 */
export function updateSafetyRule(ruleId: string, updates: Partial<SafetyRule>): boolean {
  const index = safetyRules.findIndex(r => r.id === ruleId);
  if (index === -1) return false;
  
  safetyRules[index] = { ...safetyRules[index], ...updates };
  return true;
}

/**
 * 记录安全事件
 */
export function logSafetyEvent(
  eventType: 'violation' | 'warning' | 'interception',
  details: Record<string, any>
): void {
  log.info({ eventType, details }, "Safety event recorded");
  // 实际实现中应写入数据库或日志系统
}
