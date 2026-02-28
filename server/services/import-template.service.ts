/**
 * Import Template Service
 * Provides template definitions, CSV/Excel generation, and data validation for batch imports
 */

export type TemplateType =
  | 'agent_unit'
  | 'calibration_data'
  | 'toothpaste_test'
  | 'geofence_config'
  | 'uwb_anchor'
  | 'uwb_tag';

export interface ColumnDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'enum' | 'date' | 'boolean';
  required: boolean;
  enumValues?: string[];
  description?: string;
}

export interface TemplateDefinition {
  type: TemplateType;
  name: string;
  description: string;
  version: string;
  columns: ColumnDefinition[];
  sampleData: Record<string, unknown>[];
  instructions: string;
}

export interface ExcelTemplateData {
  sheetName: string;
  headers: string[];
  data: any[][];
  instructions: string;
  columnInfo: { name: string; type: string; required: boolean; description: string }[];
}

export interface ValidationResult {
  valid: boolean;
  errors: { row: number; column: string; message: string }[];
  validRows: number;
  invalidRows: number;
}

// ==================== Template Definitions ====================

const TEMPLATE_DEFINITIONS: Record<TemplateType, TemplateDefinition> = {
  agent_unit: {
    type: 'agent_unit',
    name: '智能体单体批量导入模板',
    description: '用于批量导入智能体单体数据',
    version: '1.0',
    columns: [
      { name: 'serial_number', label: 'SN码', type: 'string', required: true, description: '智能体单体序列号' },
      { name: 'model', label: '型号', type: 'string', required: true, description: '设备型号' },
      { name: 'status', label: '状态', type: 'enum', required: true, enumValues: ['pending', 'calibrating', 'passed', 'failed', 'retired'], description: '当前状态' },
      { name: 'production_date', label: '生产日期', type: 'date', required: false, description: '生产日期(YYYY-MM-DD)' },
    ],
    sampleData: [
      { serial_number: 'GRT-2024-001', model: 'GRT-A100', status: 'pending', production_date: '2024-01-15' },
      { serial_number: 'GRT-2024-002', model: 'GRT-A100', status: 'calibrating', production_date: '2024-01-16' },
    ],
    instructions: '请按照模板格式填写数据。SN码、型号和状态为必填项。生产日期格式为YYYY-MM-DD。',
  },
  calibration_data: {
    type: 'calibration_data',
    name: '标定数据批量导入模板',
    description: '用于批量导入标定测量数据',
    version: '1.0',
    columns: [
      { name: 'serial_number', label: 'SN码', type: 'string', required: true, description: '智能体单体序列号' },
      { name: 'parameter', label: '参数', type: 'enum', required: true, enumValues: ['pressure', 'temperature', 'humidity', 'voltage', 'current'], description: '标定参数类型' },
      { name: 'value', label: '测量值', type: 'number', required: true, description: '实际测量值' },
      { name: 'target_value', label: '目标值', type: 'number', required: true, description: '标定目标值' },
      { name: 'tolerance', label: '容差', type: 'number', required: true, description: '允许的偏差范围' },
      { name: 'calibration_date', label: '标定日期', type: 'date', required: true, description: '标定日期(YYYY-MM-DD)' },
    ],
    sampleData: [
      { serial_number: 'GRT-2024-001', parameter: 'pressure', value: 2.48, target_value: 2.5, tolerance: 0.1, calibration_date: '2024-01-15' },
      { serial_number: 'GRT-2024-001', parameter: 'temperature', value: 25.1, target_value: 25.0, tolerance: 0.5, calibration_date: '2024-01-15' },
    ],
    instructions: '请按照模板格式填写标定数据。所有字段均为必填项。',
  },
  toothpaste_test: {
    type: 'toothpaste_test',
    name: '牙膏测试数据批量导入模板',
    description: '用于批量导入牙膏产品测试数据',
    version: '1.0',
    columns: [
      { name: 'batch_number', label: '批次号', type: 'string', required: true, description: '生产批次号' },
      { name: 'test_type', label: '测试类型', type: 'enum', required: true, enumValues: ['viscosity', 'pH', 'fluoride', 'abrasion'], description: '测试类型' },
      { name: 'value', label: '测量值', type: 'number', required: true, description: '测试结果' },
      { name: 'test_date', label: '测试日期', type: 'date', required: true, description: '测试日期(YYYY-MM-DD)' },
    ],
    sampleData: [
      { batch_number: 'TP-2024-001', test_type: 'viscosity', value: 120.5, test_date: '2024-01-15' },
    ],
    instructions: '请按照模板格式填写牙膏测试数据。',
  },
  geofence_config: {
    type: 'geofence_config',
    name: '地理围栏配置批量导入模板',
    description: '用于批量导入地理围栏配置',
    version: '1.0',
    columns: [
      { name: 'name', label: '围栏名称', type: 'string', required: true, description: '围栏名称' },
      { name: 'type', label: '类型', type: 'enum', required: true, enumValues: ['rectangle', 'circle', 'polygon'], description: '围栏类型' },
      { name: 'coordinates', label: '坐标', type: 'string', required: true, description: '坐标数据(JSON格式)' },
      { name: 'alert_level', label: '告警级别', type: 'enum', required: true, enumValues: ['info', 'warning', 'critical'], description: '告警级别' },
    ],
    sampleData: [
      { name: '标定区', type: 'rectangle', coordinates: '{"minX":20,"minY":0,"maxX":40,"maxY":15}', alert_level: 'info' },
    ],
    instructions: '请按照模板格式填写地理围栏配置。坐标字段请使用JSON格式。',
  },
  uwb_anchor: {
    type: 'uwb_anchor',
    name: 'UWB锚点批量导入模板',
    description: '用于批量导入UWB定位锚点数据',
    version: '1.0',
    columns: [
      { name: 'anchor_id', label: '锚点ID', type: 'string', required: true, description: 'UWB锚点唯一标识' },
      { name: 'x', label: 'X坐标', type: 'number', required: true, description: 'X轴坐标(米)' },
      { name: 'y', label: 'Y坐标', type: 'number', required: true, description: 'Y轴坐标(米)' },
      { name: 'z', label: 'Z坐标', type: 'number', required: true, description: 'Z轴坐标(米)' },
    ],
    sampleData: [
      { anchor_id: 'ANC-001', x: 0, y: 0, z: 2.5 },
      { anchor_id: 'ANC-002', x: 10, y: 0, z: 2.5 },
    ],
    instructions: '请按照模板格式填写UWB锚点数据。坐标单位为米。',
  },
  uwb_tag: {
    type: 'uwb_tag',
    name: 'UWB标签批量导入模板',
    description: '用于批量导入UWB定位标签数据',
    version: '1.0',
    columns: [
      { name: 'tag_id', label: '标签ID', type: 'string', required: true, description: 'UWB标签唯一标识' },
      { name: 'associated_unit', label: '关联单体', type: 'string', required: false, description: '关联的智能体单体SN码' },
      { name: 'update_rate', label: '更新频率', type: 'number', required: false, description: '位置更新频率(Hz)' },
    ],
    sampleData: [
      { tag_id: 'TAG-001', associated_unit: 'GRT-2024-001', update_rate: 10 },
    ],
    instructions: '请按照模板格式填写UWB标签数据。',
  },
};

// ==================== Public API ====================

/**
 * Get all available template metadata.
 */
export function getAllTemplates(): { type: TemplateType; name: string; description: string; version: string }[] {
  return Object.values(TEMPLATE_DEFINITIONS).map((t) => ({
    type: t.type,
    name: t.name,
    description: t.description,
    version: t.version,
  }));
}

/**
 * Get a full template definition by type.
 */
export function getTemplateDefinition(type: TemplateType): TemplateDefinition | null {
  return TEMPLATE_DEFINITIONS[type] ?? null;
}

/**
 * Generate a CSV string for a given template type.
 */
export function generateCSVTemplate(type: TemplateType): string {
  const template = TEMPLATE_DEFINITIONS[type];
  if (!template) {
    throw new Error(`Unknown template type: ${type}`);
  }

  const headerLabels = template.columns.map((c) => c.label);
  const headerNames = template.columns.map((c) => c.name);

  const rows: string[] = [];
  // Header row with labels
  rows.push(headerLabels.join(','));

  // Sample data rows
  for (const sample of template.sampleData) {
    const row = headerNames.map((name) => {
      const val = sample[name];
      if (val === undefined || val === null) return '';
      const str = String(val);
      // Escape commas
      if (str.includes(',') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Generate data for Excel template creation.
 */
export function generateExcelTemplateData(type: TemplateType): ExcelTemplateData {
  const template = TEMPLATE_DEFINITIONS[type];
  if (!template) {
    throw new Error(`Unknown template type: ${type}`);
  }

  const headers = template.columns.map((c) => c.label);
  const headerNames = template.columns.map((c) => c.name);

  const data = template.sampleData.map((sample) =>
    headerNames.map((name) => sample[name] ?? '')
  );

  const columnInfo = template.columns.map((c) => ({
    name: c.label,
    type: c.type,
    required: c.required,
    description: c.description || '',
  }));

  return {
    sheetName: template.name,
    headers,
    data,
    instructions: template.instructions,
    columnInfo,
  };
}

/**
 * Validate import data against a template definition.
 */
export function validateImportData(
  type: TemplateType,
  data: Record<string, unknown>[]
): ValidationResult {
  const template = TEMPLATE_DEFINITIONS[type];
  if (!template) {
    throw new Error(`Unknown template type: ${type}`);
  }

  const errors: { row: number; column: string; message: string }[] = [];
  let validRows = 0;
  let invalidRows = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    let rowValid = true;

    for (const col of template.columns) {
      const val = row[col.name];

      // Required field check
      if (col.required && (val === undefined || val === null || val === '')) {
        errors.push({ row: i + 1, column: col.name, message: `${col.label}为必填项` });
        rowValid = false;
        continue;
      }

      if (val === undefined || val === null || val === '') {
        continue; // Optional and empty, skip
      }

      // Type-specific validation
      switch (col.type) {
        case 'number':
          if (typeof val !== 'number' && isNaN(Number(val))) {
            errors.push({ row: i + 1, column: col.name, message: `${col.label}必须为数字` });
            rowValid = false;
          }
          break;
        case 'enum':
          if (col.enumValues && !col.enumValues.includes(String(val))) {
            errors.push({
              row: i + 1,
              column: col.name,
              message: `${col.label}值无效，允许的值为: ${col.enumValues.join(', ')}`,
            });
            rowValid = false;
          }
          break;
        case 'date':
          // Validate date format: YYYY-MM-DD
          if (!/^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
            errors.push({
              row: i + 1,
              column: col.name,
              message: `${col.label}格式错误，请使用YYYY-MM-DD格式`,
            });
            rowValid = false;
          }
          break;
        case 'boolean':
          if (typeof val !== 'boolean' && !['true', 'false', '0', '1'].includes(String(val).toLowerCase())) {
            errors.push({ row: i + 1, column: col.name, message: `${col.label}必须为布尔值` });
            rowValid = false;
          }
          break;
      }
    }

    if (rowValid) {
      validRows++;
    } else {
      invalidRows++;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validRows,
    invalidRows,
  };
}
