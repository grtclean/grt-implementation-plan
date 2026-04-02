/**
 * 敏感数据字段级访问控制中间件
 * 根据 sensitive_field_policies 表规则，按用户level脱敏
 *
 * Level规则:
 * - level < required_level: 显示 '***' 或按 masking_rule 脱敏
 * - level >= required_level: 显示原始值
 */

import { createChildLogger } from '../lib/logger';

const log = createChildLogger('sensitive-data');

// In-memory policy cache (refreshed periodically)
let policyCache: SensitiveFieldPolicy[] = [];
let policyCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface SensitiveFieldPolicy {
  tableName: string;
  fieldName: string;
  sensitivityLevel: number;
  requiredLevel: number;
  watermarkOnView: boolean;
  requireApprovalForExport: boolean;
  maskingRule: string; // 'stars' | 'partial' | 'hash' | 'redact'
}

// Default policies (used before DB is loaded)
const DEFAULT_POLICIES: SensitiveFieldPolicy[] = [
  { tableName: 'materials', fieldName: 'standardCost', sensitivityLevel: 3, requiredLevel: 4, watermarkOnView: true, requireApprovalForExport: true, maskingRule: 'stars' },
  { tableName: 'materials', fieldName: 'lastPurchasePrice', sensitivityLevel: 3, requiredLevel: 4, watermarkOnView: true, requireApprovalForExport: true, maskingRule: 'stars' },
  { tableName: 'supplier_materials', fieldName: 'unitPrice', sensitivityLevel: 3, requiredLevel: 4, watermarkOnView: true, requireApprovalForExport: true, maskingRule: 'stars' },
  { tableName: 'purchase_orders', fieldName: 'unitPrice', sensitivityLevel: 2, requiredLevel: 3, watermarkOnView: false, requireApprovalForExport: true, maskingRule: 'stars' },
  { tableName: 'purchase_orders', fieldName: 'totalAmount', sensitivityLevel: 2, requiredLevel: 3, watermarkOnView: false, requireApprovalForExport: true, maskingRule: 'stars' },
  { tableName: 'suppliers', fieldName: 'contactPhone', sensitivityLevel: 2, requiredLevel: 3, watermarkOnView: false, requireApprovalForExport: true, maskingRule: 'partial' },
  { tableName: 'suppliers', fieldName: 'contactEmail', sensitivityLevel: 2, requiredLevel: 3, watermarkOnView: false, requireApprovalForExport: true, maskingRule: 'partial' },
  { tableName: 'supplier_penalties', fieldName: 'fineAmount', sensitivityLevel: 3, requiredLevel: 5, watermarkOnView: true, requireApprovalForExport: true, maskingRule: 'stars' },
  { tableName: 'purchase_invoices', fieldName: 'invoiceAmount', sensitivityLevel: 2, requiredLevel: 3, watermarkOnView: false, requireApprovalForExport: true, maskingRule: 'stars' },
  { tableName: 'purchase_invoices', fieldName: 'totalAmount', sensitivityLevel: 2, requiredLevel: 3, watermarkOnView: false, requireApprovalForExport: true, maskingRule: 'stars' },
];

/**
 * Get policies (from cache or default)
 */
export function getPolicies(): SensitiveFieldPolicy[] {
  if (policyCache.length > 0 && Date.now() - policyCacheTime < CACHE_TTL) {
    return policyCache;
  }
  return DEFAULT_POLICIES;
}

/**
 * Refresh policy cache from database
 */
export async function refreshPolicyCache(dbPolicies: SensitiveFieldPolicy[]): Promise<void> {
  policyCache = dbPolicies;
  policyCacheTime = Date.now();
  log.info({ count: dbPolicies.length }, '敏感数据策略缓存已刷新');
}

/**
 * Apply masking to a single value based on rule
 */
export function maskValue(value: any, rule: string): string {
  if (value === null || value === undefined) return '';
  const str = String(value);

  switch (rule) {
    case 'stars':
      return '***';
    case 'partial':
      if (str.length <= 3) return '***';
      return str.substring(0, 2) + '***' + str.substring(str.length - 2);
    case 'hash':
      return `[HASH:${str.length}]`;
    case 'redact':
      return '[REDACTED]';
    default:
      return '***';
  }
}

/**
 * Apply sensitive data masking to a data row
 * @param tableName - the source table name (e.g., 'materials')
 * @param row - the data object
 * @param userLevel - the requesting user's role level (0-10)
 * @returns masked row + watermark flag
 */
export function maskRow(
  tableName: string,
  row: Record<string, any>,
  userLevel: number
): { data: Record<string, any>; requiresWatermark: boolean } {
  const policies = getPolicies();
  const tablePolicies = policies.filter(p => p.tableName === tableName);

  if (tablePolicies.length === 0) {
    return { data: row, requiresWatermark: false };
  }

  let requiresWatermark = false;
  const masked = { ...row };

  for (const policy of tablePolicies) {
    if (policy.fieldName in masked && userLevel < policy.requiredLevel) {
      masked[policy.fieldName] = maskValue(masked[policy.fieldName], policy.maskingRule);
      if (policy.watermarkOnView) {
        requiresWatermark = true;
      }
    }
  }

  return { data: masked, requiresWatermark };
}

/**
 * Apply masking to an array of rows
 */
export function maskRows(
  tableName: string,
  rows: Record<string, any>[],
  userLevel: number
): { data: Record<string, any>[]; requiresWatermark: boolean } {
  let requiresWatermark = false;
  const maskedRows = rows.map(row => {
    const result = maskRow(tableName, row, userLevel);
    if (result.requiresWatermark) requiresWatermark = true;
    return result.data;
  });
  return { data: maskedRows, requiresWatermark };
}

/**
 * Check if a user can export specific fields
 */
export function canExport(
  tableName: string,
  fieldNames: string[],
  userLevel: number
): { allowed: boolean; blockedFields: string[]; requiresApproval: boolean } {
  const policies = getPolicies();
  const blockedFields: string[] = [];
  let requiresApproval = false;

  for (const fieldName of fieldNames) {
    const policy = policies.find(p => p.tableName === tableName && p.fieldName === fieldName);
    if (policy) {
      if (userLevel < policy.requiredLevel) {
        blockedFields.push(fieldName);
      }
      if (policy.requireApprovalForExport) {
        requiresApproval = true;
      }
    }
  }

  return {
    allowed: blockedFields.length === 0,
    blockedFields,
    requiresApproval,
  };
}
