/**
 * 数据脱敏代理层 (De-identification Proxy)
 *
 * 功能：在LLM交互前对敏感数据进行脱敏处理，防止核心知识产权泄露
 *
 * 脱敏规则：
 * 1. 客户分级价格 → 替换为占位符
 * 2. 核心工艺配方 → 替换为通用描述
 * 3. 客户名称 → 替换为匿名标识
 * 4. 联系方式 → 部分遮蔽
 * 5. 财务数据 → 范围化处理
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("deident-proxy");

// 脱敏规则类型
export interface DeidentificationRule {
  id: string;
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  category: 'price' | 'formula' | 'customer' | 'contact' | 'financial' | 'custom';
  isActive: boolean;
}

// 脱敏结果
export interface DeidentificationResult {
  originalText: string;
  deidentifiedText: string;
  appliedRules: string[];
  sensitiveDataFound: number;
  timestamp: Date;
}

// 还原映射
interface ReidentificationMap {
  sessionId: string;
  mappings: Map<string, string>;
  createdAt: Date;
  expiresAt: Date;
}

// 默认脱敏规则
const defaultRules: DeidentificationRule[] = [
  // 价格脱敏
  {
    id: 'PRICE_001',
    name: '客户分级价格',
    pattern: /(?:价格|单价|报价|成本)[：:]\s*(?:¥|￥|RMB|CNY)?\s*[\d,]+(?:\.\d{1,2})?(?:元|万)?/gi,
    replacement: '[价格已脱敏]',
    category: 'price',
    isActive: true
  },
  {
    id: 'PRICE_002',
    name: '金额数字',
    pattern: /(?:¥|￥|RMB|CNY)\s*[\d,]+(?:\.\d{1,2})?(?:元|万)?/g,
    replacement: '[金额已脱敏]',
    category: 'price',
    isActive: true
  },
  
  // 工艺配方脱敏
  {
    id: 'FORMULA_001',
    name: '清洗工艺参数',
    pattern: /(?:超声波频率|清洗温度|清洗时间|药剂浓度)[：:]\s*[\d.]+\s*(?:kHz|℃|°C|分钟|min|%|ppm)?/gi,
    replacement: '[工艺参数已脱敏]',
    category: 'formula',
    isActive: true
  },
  {
    id: 'FORMULA_002',
    name: '配方比例',
    pattern: /(?:配方|配比|浓度)[：:]\s*[\d.]+\s*[:%]/gi,
    replacement: '[配方已脱敏]',
    category: 'formula',
    isActive: true
  },
  
  // 客户信息脱敏
  {
    id: 'CUSTOMER_001',
    name: '公司名称',
    pattern: /(?:[\u4e00-\u9fa5]{2,}(?:集团|公司|企业|有限|股份|科技|电子|机械|制造|工业)[\u4e00-\u9fa5]*)/g,
    replacement: (match: string) => `[客户${match.length > 10 ? 'A' : 'B'}]`,
    category: 'customer',
    isActive: true
  },
  
  // 联系方式脱敏
  {
    id: 'CONTACT_001',
    name: '手机号码',
    pattern: /1[3-9]\d{9}/g,
    replacement: (match: string) => `${match.slice(0, 3)}****${match.slice(-4)}`,
    category: 'contact',
    isActive: true
  },
  {
    id: 'CONTACT_002',
    name: '邮箱地址',
    pattern: /[\w.-]+@[\w.-]+\.\w+/g,
    replacement: (match: string) => {
      const [local, domain] = match.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    },
    category: 'contact',
    isActive: true
  },
  {
    id: 'CONTACT_003',
    name: '身份证号',
    pattern: /\d{17}[\dXx]/g,
    replacement: (match: string) => `${match.slice(0, 6)}********${match.slice(-4)}`,
    category: 'contact',
    isActive: true
  },
  
  // 财务数据脱敏
  {
    id: 'FINANCIAL_001',
    name: '银行账号',
    pattern: /\d{16,19}/g,
    replacement: (match: string) => `${match.slice(0, 4)}****${match.slice(-4)}`,
    category: 'financial',
    isActive: true
  }
];

// 会话映射存储（用于还原）
const sessionMappings = new Map<string, ReidentificationMap>();

/**
 * 数据脱敏代理类
 */
export class DeidentificationProxy {
  private rules: DeidentificationRule[];
  private enableReidentification: boolean;

  constructor(rules: DeidentificationRule[] = defaultRules, enableReidentification = false) {
    this.rules = rules;
    this.enableReidentification = enableReidentification;
  }

  /**
   * 对文本进行脱敏处理
   */
  deidentify(text: string, sessionId?: string): DeidentificationResult {
    let deidentifiedText = text;
    const appliedRules: string[] = [];
    let sensitiveDataFound = 0;
    const mappings = new Map<string, string>();

    for (const rule of this.rules) {
      if (!rule.isActive) continue;

      const matches = text.match(rule.pattern);
      if (matches) {
        sensitiveDataFound += matches.length;
        appliedRules.push(rule.id);

        if (typeof rule.replacement === 'function') {
          deidentifiedText = deidentifiedText.replace(rule.pattern, (match) => {
            const placeholder = rule.replacement as (m: string) => string;
            const result = placeholder(match);
            if (this.enableReidentification && sessionId) {
              mappings.set(result, match);
            }
            return result;
          });
        } else {
          deidentifiedText = deidentifiedText.replace(rule.pattern, (match) => {
            if (this.enableReidentification && sessionId) {
              mappings.set(rule.replacement as string, match);
            }
            return rule.replacement as string;
          });
        }
      }
    }

    // 存储映射用于还原
    if (this.enableReidentification && sessionId && mappings.size > 0) {
      sessionMappings.set(sessionId, {
        sessionId,
        mappings,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000) // 1小时后过期
      });
    }

    return {
      originalText: text,
      deidentifiedText,
      appliedRules,
      sensitiveDataFound,
      timestamp: new Date()
    };
  }

  /**
   * 批量脱敏处理
   */
  deidentifyBatch(texts: string[], sessionId?: string): DeidentificationResult[] {
    return texts.map((text, index) => 
      this.deidentify(text, sessionId ? `${sessionId}_${index}` : undefined)
    );
  }

  /**
   * 还原脱敏数据（仅在启用还原功能时可用）
   */
  reidentify(text: string, sessionId: string): string {
    if (!this.enableReidentification) {
      log.warn({}, "Reidentification is disabled");
      return text;
    }

    const mapping = sessionMappings.get(sessionId);
    if (!mapping) {
      log.warn({ sessionId }, "No mapping found for session");
      return text;
    }

    // 检查是否过期
    if (new Date() > mapping.expiresAt) {
      sessionMappings.delete(sessionId);
      log.warn({ sessionId }, "Mapping expired for session");
      return text;
    }

    let reidentifiedText = text;
    mapping.mappings.forEach((original, placeholder) => {
      reidentifiedText = reidentifiedText.replace(placeholder, original);
    });

    return reidentifiedText;
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: DeidentificationRule): void {
    this.rules.push(rule);
  }

  /**
   * 更新规则
   */
  updateRule(ruleId: string, updates: Partial<DeidentificationRule>): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
      return true;
    }
    return false;
  }

  /**
   * 启用/禁用规则
   */
  toggleRule(ruleId: string, isActive: boolean): boolean {
    return this.updateRule(ruleId, { isActive });
  }

  /**
   * 获取所有规则
   */
  getRules(): DeidentificationRule[] {
    return this.rules;
  }

  /**
   * 清理过期的会话映射
   */
  cleanupExpiredMappings(): number {
    const now = new Date();
    let cleaned = 0;
    sessionMappings.forEach((mapping, sessionId) => {
      if (now > mapping.expiresAt) {
        sessionMappings.delete(sessionId);
        cleaned++;
      }
    });
    return cleaned;
  }

  /**
   * 获取脱敏统计
   */
  getStatistics(): {
    totalRules: number;
    activeRules: number;
    rulesByCategory: Record<string, number>;
    activeSessions: number;
  } {
    const rulesByCategory: Record<string, number> = {};
    let activeRules = 0;

    for (const rule of this.rules) {
      rulesByCategory[rule.category] = (rulesByCategory[rule.category] || 0) + 1;
      if (rule.isActive) activeRules++;
    }

    return {
      totalRules: this.rules.length,
      activeRules,
      rulesByCategory,
      activeSessions: sessionMappings.size
    };
  }
}

// 导出单例
export const deidentificationProxy = new DeidentificationProxy();

/**
 * LLM请求脱敏中间件
 */
export async function deidentifyLLMRequest(
  messages: Array<{ role: string; content: string }>,
  sessionId?: string
): Promise<{
  deidentifiedMessages: Array<{ role: string; content: string }>;
  report: {
    totalSensitiveData: number;
    appliedRules: string[];
  };
}> {
  let totalSensitiveData = 0;
  const allAppliedRules = new Set<string>();

  const deidentifiedMessages = messages.map((msg, index) => {
    const result = deidentificationProxy.deidentify(
      msg.content,
      sessionId ? `${sessionId}_msg_${index}` : undefined
    );
    totalSensitiveData += result.sensitiveDataFound;
    result.appliedRules.forEach(rule => allAppliedRules.add(rule));

    return {
      role: msg.role,
      content: result.deidentifiedText
    };
  });

  return {
    deidentifiedMessages,
    report: {
      totalSensitiveData,
      appliedRules: Array.from(allAppliedRules)
    }
  };
}
