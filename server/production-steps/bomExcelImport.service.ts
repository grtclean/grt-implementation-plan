/**
 * v1.7.2 BOM Excel格式导入服务
 * BOM Excel Import Service
 * 
 * 功能：
 * 1. .xlsx文件解析（使用SheetJS）
 * 2. Excel模板生成（带格式和数据验证）
 * 3. 与现有CSV导入服务集成
 */

import * as XLSX from 'xlsx';
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { addBomChecklistItems } from "./bomVerification.service";
import { detectDuplicates } from "./bomImport.service";

// ============================================================
// 1. Excel模板生成
// ============================================================

/** BOM导入Excel模板列定义 */
const EXCEL_COLUMNS = [
  { header: '物料编码', key: 'materialCode', width: 18 },
  { header: '物料名称', key: 'materialName', width: 25 },
  { header: '物料规格', key: 'materialSpec', width: 25 },
  { header: '需求数量', key: 'requiredQty', width: 12 },
  { header: '是否关键物料', key: 'isCritical', width: 15 },
  { header: '工序代码', key: 'processCode', width: 12 },
  { header: '供应商', key: 'supplier', width: 20 },
  { header: '备注', key: 'remarks', width: 30 },
];

/** 生成BOM导入Excel模板（返回Buffer） */
export function generateBomExcelTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  // 创建数据表
  const sampleData = [
    {
      '物料编码': 'MAT-001',
      '物料名称': '清洗喷嘴组件',
      '物料规格': 'DN50不锈钢',
      '需求数量': 4,
      '是否关键物料': 'Y',
      '工序代码': 'T3',
      '供应商': '上海精密',
      '备注': '主清洗区核心部件',
    },
    {
      '物料编码': 'MAT-002',
      '物料名称': '传动链条',
      '物料规格': '08B-1标准链',
      '需求数量': 2,
      '是否关键物料': 'Y',
      '工序代码': 'T4',
      '供应商': '东莞链条',
      '备注': '主传动系统',
    },
    {
      '物料编码': 'MAT-003',
      '物料名称': '密封垫片',
      '物料规格': 'NBR φ80×φ60×3',
      '需求数量': 12,
      '是否关键物料': 'N',
      '工序代码': 'T3',
      '供应商': '苏州密封',
      '备注': '',
    },
    {
      '物料编码': 'MAT-004',
      '物料名称': 'PLC控制器',
      '物料规格': 'S7-1200 CPU1214C',
      '需求数量': 1,
      '是否关键物料': 'Y',
      '工序代码': 'T6',
      '供应商': '西门子',
      '备注': '电气控制核心',
    },
    {
      '物料编码': 'MAT-005',
      '物料名称': '液位传感器',
      '物料规格': '4-20mA输出',
      '需求数量': 3,
      '是否关键物料': 'N',
      '工序代码': 'T6',
      '供应商': 'E+H',
      '备注': '液位监测',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // 设置列宽
  ws['!cols'] = EXCEL_COLUMNS.map(col => ({ wch: col.width }));

  // 创建说明表
  const instructionData = [
    { '字段': '物料编码', '说明': '必填，仅允许字母、数字、连字符（如MAT-001）', '示例': 'MAT-001' },
    { '字段': '物料名称', '说明': '必填，物料的中文名称', '示例': '清洗喷嘴组件' },
    { '字段': '物料规格', '说明': '选填，物料的规格型号', '示例': 'DN50不锈钢' },
    { '字段': '需求数量', '说明': '必填，必须为正整数', '示例': '4' },
    { '字段': '是否关键物料', '说明': '选填，Y=是 / N=否，默认N', '示例': 'Y' },
    { '字段': '工序代码', '说明': '选填，T1-T15，默认T1', '示例': 'T3' },
    { '字段': '供应商', '说明': '选填，供应商名称', '示例': '上海精密' },
    { '字段': '备注', '说明': '选填，备注信息', '示例': '主清洗区核心部件' },
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructionData);
  wsInstructions['!cols'] = [{ wch: 15 }, { wch: 45 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, ws, 'BOM清单');
  XLSX.utils.book_append_sheet(wb, wsInstructions, '填写说明');

  // 生成Buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

// ============================================================
// 2. Excel文件解析
// ============================================================

/** 解析Excel文件为结构化BOM数据 */
export function parseExcelBom(buffer: Buffer): {
  rows: Array<{
    materialCode: string;
    materialName: string;
    materialSpec: string;
    requiredQty: number;
    isCritical: boolean;
    processCode: string;
    supplier: string;
    remarks: string;
    rowNumber: number;
  }>;
  errors: Array<{ row: number; field: string; message: string }>;
  sheetName: string;
} {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    return {
      rows: [],
      errors: [{ row: 0, field: '', message: `无法解析Excel文件: ${(err as Error).message}` }],
      sheetName: '',
    };
  }

  // 使用第一个工作表（跳过"填写说明"表）
  const sheetName = wb.SheetNames.find(name => name !== '填写说明') || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  if (!ws) {
    return {
      rows: [],
      errors: [{ row: 0, field: '', message: 'Excel文件中没有工作表' }],
      sheetName: '',
    };
  }

  // 转换为JSON
  const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  if (rawData.length === 0) {
    return {
      rows: [],
      errors: [{ row: 0, field: '', message: '工作表中没有数据' }],
      sheetName,
    };
  }

  const rows: any[] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  // 列名映射（支持中英文）
  const columnMap: Record<string, string[]> = {
    materialCode: ['物料编码', 'Material Code', 'materialCode', 'material_code', 'code'],
    materialName: ['物料名称', 'Material Name', 'materialName', 'material_name', 'name'],
    materialSpec: ['物料规格', 'Material Spec', 'materialSpec', 'material_spec', 'spec'],
    requiredQty: ['需求数量', 'Required Qty', 'requiredQty', 'required_qty', 'qty', '数量'],
    isCritical: ['是否关键物料', 'Is Critical', 'isCritical', 'is_critical', 'critical', '关键'],
    processCode: ['工序代码', 'Process Code', 'processCode', 'process_code', 'process', '工序'],
    supplier: ['供应商', 'Supplier', 'supplier'],
    remarks: ['备注', 'Remarks', 'remarks', 'note', 'notes'],
  };

  /** 从行数据中获取字段值 */
  function getFieldValue(row: any, fieldKey: string): string {
    const possibleNames = columnMap[fieldKey] || [];
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null) {
        return String(row[name]).trim();
      }
    }
    return '';
  }

  for (let i = 0; i < rawData.length; i++) {
    const rawRow = rawData[i];
    const rowNumber = i + 2; // 1-based, accounting for header

    const materialCode = getFieldValue(rawRow, 'materialCode');
    const materialName = getFieldValue(rawRow, 'materialName');
    const materialSpec = getFieldValue(rawRow, 'materialSpec');
    const requiredQtyStr = getFieldValue(rawRow, 'requiredQty');
    const isCriticalStr = getFieldValue(rawRow, 'isCritical').toUpperCase();
    const processCode = getFieldValue(rawRow, 'processCode').toUpperCase();
    const supplier = getFieldValue(rawRow, 'supplier');
    const remarks = getFieldValue(rawRow, 'remarks');

    // 验证必填字段
    if (!materialCode) {
      errors.push({ row: rowNumber, field: '物料编码', message: '物料编码不能为空' });
      continue;
    }
    if (!materialName) {
      errors.push({ row: rowNumber, field: '物料名称', message: '物料名称不能为空' });
      continue;
    }

    // 验证物料编码格式
    if (!/^[A-Za-z0-9\-_]+$/.test(materialCode)) {
      errors.push({ row: rowNumber, field: '物料编码', message: `物料编码格式不正确: ${materialCode}（仅允许字母、数字、连字符）` });
      continue;
    }

    // 验证数量
    const requiredQty = Number(requiredQtyStr);
    if (isNaN(requiredQty) || requiredQty <= 0) {
      errors.push({ row: rowNumber, field: '需求数量', message: `需求数量必须为正数: ${requiredQtyStr}` });
      continue;
    }

    // 验证工序代码
    const validProcessCodes = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12','T13','T14','T15'];
    if (processCode && !validProcessCodes.includes(processCode)) {
      errors.push({ row: rowNumber, field: '工序代码', message: `无效的工序代码: ${processCode}` });
      continue;
    }

    rows.push({
      materialCode,
      materialName,
      materialSpec,
      requiredQty,
      isCritical: isCriticalStr === 'Y' || isCriticalStr === 'YES' || isCriticalStr === '是',
      processCode: processCode || 'T1',
      supplier,
      remarks,
      rowNumber,
    });
  }

  return { rows, errors, sheetName };
}

// ============================================================
// 3. Excel批量导入执行
// ============================================================

/** 执行Excel BOM批量导入 */
export async function executeExcelBomImport(params: {
  projectId: string;
  verificationId: number;
  fileBuffer: Buffer;
  fileName: string;
  importedBy?: string;
  importedByName?: string;
  skipDuplicates?: boolean;
}) {
  const db = await requireDb();
  const now = Date.now();

  // 1. 解析Excel
  const { rows, errors: parseErrors, sheetName } = parseExcelBom(params.fileBuffer);

  if (parseErrors.length > 0 && rows.length === 0) {
    return {
      success: false,
      imported: 0,
      errors: parseErrors,
      sheetName,
      message: '所有数据行都存在错误，导入中止',
    };
  }

  // 2. 检测文件内重复
  const duplicates = detectDuplicates(rows);
  const duplicateWarnings = duplicates.map(d => ({
    row: d.row,
    field: '物料编码',
    message: `物料编码 ${d.materialCode} 与第${d.duplicateOf}行重复`,
  }));

  // 3. 过滤重复
  let importRows = rows;
  if (params.skipDuplicates && duplicates.length > 0) {
    const duplicateRowNums = new Set(duplicates.map(d => d.row));
    importRows = rows.filter(r => !duplicateRowNums.has(r.rowNumber));
  }

  // 4. 检查数据库中已有的物料编码
  const existingDuplicates: Array<{ row: number; materialCode: string }> = [];
  for (const row of importRows) {
    const existing = (await db.execute(sql`
      SELECT id FROM bom_checklist_items
      WHERE verification_id = ${params.verificationId}
        AND material_code = ${row.materialCode}
      LIMIT 1
    `)).rows;
    if ((existing as any[]).length > 0) {
      existingDuplicates.push({ row: row.rowNumber, materialCode: row.materialCode });
    }
  }

  if (params.skipDuplicates && existingDuplicates.length > 0) {
    const existingCodes = new Set(existingDuplicates.map(d => d.materialCode));
    importRows = importRows.filter(r => !existingCodes.has(r.materialCode));
  }

  // 5. 执行导入
  if (importRows.length === 0) {
    return {
      success: false,
      imported: 0,
      errors: [...parseErrors, ...duplicateWarnings],
      existingDuplicates,
      sheetName,
      message: '没有可导入的有效数据',
    };
  }

  const items = importRows.map(row => ({
    projectId: params.projectId,
    processCode: row.processCode,
    materialCode: row.materialCode,
    materialName: row.materialName,
    materialSpec: row.materialSpec,
    requiredQty: row.requiredQty,
    isCritical: row.isCritical,
  }));

  await addBomChecklistItems(params.verificationId, items);

  // 6. 记录导入历史
  await db.execute(sql`
    INSERT INTO bom_import_history 
    (project_id, verification_id, file_name, total_rows, imported_rows, 
     error_rows, duplicate_rows, import_status, error_details,
     imported_by, imported_by_name, created_at)
    VALUES (${params.projectId}, ${params.verificationId}, ${params.fileName},
            ${rows.length}, ${importRows.length},
            ${parseErrors.length}, ${duplicates.length + existingDuplicates.length},
            'completed', ${JSON.stringify({ parseErrors, duplicateWarnings, existingDuplicates, sheetName })},
            ${params.importedBy || null}, ${params.importedByName || null}, ${now})
  `);

  return {
    success: true,
    imported: importRows.length,
    totalRows: rows.length,
    errors: parseErrors,
    duplicateWarnings,
    existingDuplicates,
    sheetName,
    message: `成功从Excel导入 ${importRows.length} 条BOM清单项（工作表: ${sheetName}）`,
  };
}

// ============================================================
// 4. 文件类型检测
// ============================================================

/** 检测文件类型并返回解析方式 */
export function detectFileType(fileName: string): 'csv' | 'xlsx' | 'unknown' {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  return 'unknown';
}

export default {
  generateBomExcelTemplate,
  parseExcelBom,
  executeExcelBomImport,
  detectFileType,
};
