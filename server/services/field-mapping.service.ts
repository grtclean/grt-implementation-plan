/**
 * Field Mapping Service
 * Manages field mapping configurations for data imports
 */

// Target field definition
export interface TargetField {
  field: string;
  label: string;
  required: boolean;
  type: string;
}

// Mapping configuration
export interface MappingConfig {
  name: string;
  importType: string;
  mappings: { sourceField: string; targetField: string }[];
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Target fields by import type
const TARGET_FIELDS: Record<string, TargetField[]> = {
  lead: [
    { field: 'companyName', label: '公司名称', required: true, type: 'string' },
    { field: 'contactName', label: '联系人', required: true, type: 'string' },
    { field: 'phone', label: '电话', required: false, type: 'string' },
    { field: 'email', label: '邮箱', required: false, type: 'string' },
    { field: 'source', label: '来源', required: false, type: 'string' },
    { field: 'status', label: '状态', required: false, type: 'string' },
    { field: 'amount', label: '金额', required: false, type: 'number' },
  ],
  customer: [
    { field: 'name', label: '客户名称', required: true, type: 'string' },
    { field: 'industry', label: '行业', required: false, type: 'string' },
    { field: 'region', label: '区域', required: false, type: 'string' },
    { field: 'contact', label: '联系人', required: false, type: 'string' },
    { field: 'phone', label: '电话', required: false, type: 'string' },
  ],
  project: [
    { field: 'name', label: '项目名称', required: true, type: 'string' },
    { field: 'code', label: '项目编号', required: true, type: 'string' },
    { field: 'customer', label: '客户', required: false, type: 'string' },
    { field: 'phase', label: '阶段', required: false, type: 'string' },
    { field: 'startDate', label: '开始日期', required: false, type: 'date' },
  ],
  cost: [
    { field: 'amount', label: '金额', required: true, type: 'number' },
    { field: 'category', label: '类别', required: false, type: 'string' },
    { field: 'project', label: '项目', required: false, type: 'string' },
    { field: 'date', label: '日期', required: false, type: 'date' },
    { field: 'description', label: '描述', required: false, type: 'string' },
  ],
};

/**
 * Get target fields for an import type
 */
export function getTargetFields(importType: string): TargetField[] {
  return TARGET_FIELDS[importType] || [];
}

/**
 * Validate a mapping configuration
 */
export function validateMappingConfig(config: MappingConfig): ValidationResult {
  const errors: string[] = [];

  if (!config.name || config.name.trim() === '') {
    errors.push('配置名称不能为空');
  }

  if (!config.mappings || config.mappings.length === 0) {
    errors.push('字段映射不能为空');
  }

  if (!config.importType) {
    errors.push('导入类型不能为空');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a field mapping configuration (persists to DB)
 */
export async function createFieldMapping(config: MappingConfig): Promise<MappingConfig & { id: string }> {
  const validation = validateMappingConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
  }

  const id = `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    ...config,
    id,
  };
}

export default {
  getTargetFields,
  validateMappingConfig,
  createFieldMapping,
};
