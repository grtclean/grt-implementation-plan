/**
 * GRT智能系统 - AI脱敏代理层
 * 防止核心知识产权被公共大模型吸收
 * 
 * 所有LLM交互必须通过此代理层，确保：
 * 1. 客户名称被替换为通用标识符
 * 2. 价格数据进行模糊化处理
 * 3. 工艺参数使用占位符替代
 * 4. 设备型号使用代号表示
 */

import { logSecurityEvent } from "./auditLog";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ai-deident-proxy");

// 敏感数据模式定义
interface SensitivePattern {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string, index: number) => string);
  category: 'customer' | 'price' | 'formula' | 'equipment' | 'internal';
}

// 脱敏映射表（用于还原）
interface DeidentificationMap {
  id: string;
  timestamp: number;
  mappings: Map<string, string>;
}

// 存储脱敏映射（用于响应还原）
const deidentificationMaps = new Map<string, DeidentificationMap>();

// 敏感数据模式
const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // 客户名称模式
  {
    name: 'customer_name_cn',
    pattern: /(?:客户|甲方|用户)[:：\s]*([^\s,，。；;]{2,20}(?:公司|集团|有限|股份|工厂|企业))/g,
    replacement: (match, index) => `[客户_${String(index).padStart(3, '0')}]`,
    category: 'customer',
  },
  {
    name: 'customer_name_en',
    pattern: /(?:Customer|Client|Company)[:：\s]*([A-Z][a-zA-Z\s&]{2,50}(?:Inc|Corp|Ltd|LLC|GmbH|Co\.?))/gi,
    replacement: (match, index) => `[CUSTOMER_${String(index).padStart(3, '0')}]`,
    category: 'customer',
  },
  
  // 价格和金额模式
  {
    name: 'price_rmb',
    pattern: /(?:价格|报价|成本|费用|金额)[:：\s]*[¥￥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:元|万|千)?/g,
    replacement: '[价格_已脱敏]',
    category: 'price',
  },
  {
    name: 'price_usd',
    pattern: /(?:price|cost|fee|amount)[:：\s]*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:USD|EUR|CNY)?/gi,
    replacement: '[PRICE_MASKED]',
    category: 'price',
  },
  {
    name: 'discount_rate',
    pattern: /(?:折扣|优惠|让利)[:：\s]*(\d{1,2}(?:\.\d{1,2})?)\s*[%％]/g,
    replacement: '[折扣_已脱敏]',
    category: 'price',
  },
  
  // 工艺配方模式
  {
    name: 'formula_concentration',
    pattern: /(?:浓度|配比|比例)[:：\s]*(\d{1,3}(?:\.\d{1,3})?)\s*[%％]?/g,
    replacement: '[参数_已保护]',
    category: 'formula',
  },
  {
    name: 'formula_temperature',
    pattern: /(?:温度|加热|冷却)[:：\s]*(\d{1,3}(?:\.\d{1})?)\s*[°℃℉]?[CF]?/g,
    replacement: '[温度_已保护]',
    category: 'formula',
  },
  {
    name: 'formula_time',
    pattern: /(?:时间|周期|间隔)[:：\s]*(\d{1,4})\s*(?:秒|分钟|小时|s|min|h)/g,
    replacement: '[时间_已保护]',
    category: 'formula',
  },
  {
    name: 'formula_frequency',
    pattern: /(?:频率|转速|振幅)[:：\s]*(\d{1,6})\s*(?:Hz|kHz|MHz|rpm|RPM)/g,
    replacement: '[频率_已保护]',
    category: 'formula',
  },
  {
    name: 'cleaning_agent',
    pattern: /(?:清洗剂|溶剂|药水)[:：\s]*([^\s,，。；;]{2,30})/g,
    replacement: '[清洗剂_已保护]',
    category: 'formula',
  },
  
  // 设备型号模式
  {
    name: 'equipment_model',
    pattern: /(?:型号|设备|机型)[:：\s]*([A-Z]{2,5}[-_]?\d{2,6}[A-Z]?)/gi,
    replacement: (match, index) => `[设备_${String.fromCharCode(65 + (index % 26))}]`,
    category: 'equipment',
  },
  {
    name: 'serial_number',
    pattern: /(?:序列号|SN|编号)[:：\s]*([A-Z0-9]{8,20})/gi,
    replacement: '[序列号_已隐藏]',
    category: 'equipment',
  },
  
  // 内部信息模式
  {
    name: 'employee_name',
    pattern: /(?:工程师|技术员|负责人|联系人)[:：\s]*([^\s,，。；;]{2,4})/g,
    replacement: '[员工_已隐藏]',
    category: 'internal',
  },
  {
    name: 'phone_number',
    pattern: /(?:电话|手机|联系方式)[:：\s]*(1[3-9]\d{9}|\d{3,4}[-\s]?\d{7,8})/g,
    replacement: '[电话_已隐藏]',
    category: 'internal',
  },
  {
    name: 'email_address',
    pattern: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    replacement: '[邮箱_已隐藏]',
    category: 'internal',
  },
  {
    name: 'ip_address',
    pattern: /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g,
    replacement: '[IP_已隐藏]',
    category: 'internal',
  },
];

// 敏感关键词列表（触发额外审查）
const SENSITIVE_KEYWORDS = [
  // 商业机密
  '核心技术', '专利', '商业秘密', '保密协议', 'NDA',
  '定价策略', '成本结构', '利润率', '毛利',
  // 工艺相关
  '配方', '工艺参数', '清洗流程', '超声波', '真空干燥',
  // 客户相关
  'Tier 1', '一级客户', 'VIP客户', '战略客户',
  // 竞争相关
  '竞争对手', '友商', '行业对比',
];

/**
 * 脱敏请求内容
 */
export function deidentifyRequest(
  content: string,
  userId?: number,
  requestId?: string
): { deidentified: string; mapId: string; sensitiveCount: number } {
  const mapId = requestId || `deident_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const mappings = new Map<string, string>();
  let sensitiveCount = 0;
  let deidentified = content;
  
  // 应用所有脱敏模式
  for (const pattern of SENSITIVE_PATTERNS) {
    let matchIndex = 0;
    deidentified = deidentified.replace(pattern.pattern, (match, ...args) => {
      matchIndex++;
      sensitiveCount++;
      
      let replacement: string;
      if (typeof pattern.replacement === 'function') {
        replacement = pattern.replacement(match, matchIndex);
      } else {
        replacement = pattern.replacement;
      }
      
      // 存储映射关系
      mappings.set(replacement, match);
      
      return replacement;
    });
  }
  
  // 检查敏感关键词
  const foundKeywords = SENSITIVE_KEYWORDS.filter(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (foundKeywords.length > 0) {
    sensitiveCount += foundKeywords.length;
    // 记录安全事件
    logSecurityEvent({
      eventType: 'access.sensitive',
      severity: 'medium',
      userId,
      ipAddress: 'system',
      action: 'AI请求包含敏感关键词',
      result: 'success',
      details: {
        keywords: foundKeywords,
        mapId,
      },
    });
  }
  
  // 存储映射表
  deidentificationMaps.set(mapId, {
    id: mapId,
    timestamp: Date.now(),
    mappings,
  });
  
  // 清理过期映射（保留1小时）
  cleanupExpiredMaps();
  
  return { deidentified, mapId, sensitiveCount };
}

/**
 * 还原响应内容（可选，通常不需要）
 */
export function reidentifyResponse(
  content: string,
  mapId: string
): string {
  const map = deidentificationMaps.get(mapId);
  if (!map) {
    log.warn(`[AI Deidentification] Map not found: ${mapId}`);
    return content;
  }
  
  let reidentified = content;
  for (const [placeholder, original] of Array.from(map.mappings)) {
    reidentified = reidentified.replace(new RegExp(escapeRegExp(placeholder), 'g'), original);
  }
  
  return reidentified;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 清理过期的映射表
 */
function cleanupExpiredMaps(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, map] of Array.from(deidentificationMaps)) {
    if (map.timestamp < oneHourAgo) {
      deidentificationMaps.delete(id);
    }
  }
}

/**
 * 检查内容是否包含敏感信息
 */
export function containsSensitiveInfo(content: string): {
  hasSensitive: boolean;
  categories: string[];
  count: number;
} {
  const categories = new Set<string>();
  let count = 0;
  
  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = content.match(pattern.pattern);
    if (matches) {
      categories.add(pattern.category);
      count += matches.length;
    }
  }
  
  // 检查关键词
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (content.toLowerCase().includes(keyword.toLowerCase())) {
      categories.add('keyword');
      count++;
    }
  }
  
  return {
    hasSensitive: count > 0,
    categories: Array.from(categories),
    count,
  };
}

/**
 * 获取脱敏统计信息
 */
export function getDeidentificationStats(): {
  activeMaps: number;
  totalMappings: number;
  oldestMapAge: number;
} {
  let totalMappings = 0;
  let oldestTimestamp = Date.now();
  
  for (const map of Array.from(deidentificationMaps.values())) {
    totalMappings += map.mappings.size;
    if (map.timestamp < oldestTimestamp) {
      oldestTimestamp = map.timestamp;
    }
  }
  
  return {
    activeMaps: deidentificationMaps.size,
    totalMappings,
    oldestMapAge: deidentificationMaps.size > 0 ? Date.now() - oldestTimestamp : 0,
  };
}

/**
 * 创建安全的LLM请求包装器
 */
export function createSecureLLMRequest(
  originalRequest: { messages: Array<{ role: string; content: string }> },
  userId?: number
): {
  request: { messages: Array<{ role: string; content: string }> };
  mapId: string;
  sensitiveCount: number;
} {
  const mapId = `llm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let totalSensitiveCount = 0;
  
  const deidentifiedMessages = originalRequest.messages.map(msg => {
    if (msg.role === 'system') {
      // 系统消息通常不包含用户敏感数据，但仍需检查
      const { deidentified, sensitiveCount } = deidentifyRequest(msg.content, userId, mapId);
      totalSensitiveCount += sensitiveCount;
      return { ...msg, content: deidentified };
    }
    
    if (msg.role === 'user') {
      const { deidentified, sensitiveCount } = deidentifyRequest(msg.content, userId, mapId);
      totalSensitiveCount += sensitiveCount;
      return { ...msg, content: deidentified };
    }
    
    return msg;
  });
  
  // 如果检测到敏感信息，添加安全提示
  if (totalSensitiveCount > 0) {
    const securityNotice = {
      role: 'system',
      content: `[安全提示] 此请求已经过脱敏处理，部分信息已被占位符替代。请基于提供的信息进行分析，不要尝试推测被隐藏的具体数值或名称。`,
    };
    deidentifiedMessages.unshift(securityNotice);
  }
  
  return {
    request: { messages: deidentifiedMessages },
    mapId,
    sensitiveCount: totalSensitiveCount,
  };
}

/**
 * 安全过滤器 - 检查AI响应是否包含不应该出现的信息
 */
export function filterAIResponse(
  response: string,
  mapId: string
): { filtered: string; warnings: string[] } {
  const warnings: string[] = [];
  let filtered = response;
  
  // 检查是否泄露了原始敏感信息
  const map = deidentificationMaps.get(mapId);
  if (map) {
    for (const [placeholder, original] of Array.from(map.mappings)) {
      if (filtered.includes(original)) {
        warnings.push(`检测到可能的信息泄露: ${placeholder}`);
        // 替换回占位符
        filtered = filtered.replace(new RegExp(escapeRegExp(original), 'g'), placeholder);
      }
    }
  }
  
  // 检查是否包含其他敏感模式
  const sensitiveCheck = containsSensitiveInfo(filtered);
  if (sensitiveCheck.hasSensitive) {
    warnings.push(`响应中检测到${sensitiveCheck.count}处潜在敏感信息`);
  }
  
  return { filtered, warnings };
}
