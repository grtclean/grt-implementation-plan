/**
 * v1.7.1 BOM数据批量导入服务
 * BOM Import Service
 * 
 * 功能：
 * 1. CSV/Excel格式BOM清单批量导入
 * 2. BOM模板下载
 * 3. 导入数据验证（物料编码格式、数量校验、重复检测）
 * 4. 外部数据平台/ERP BOM数据同步
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { addBomChecklistItems } from "./bomVerification.service";

// ============================================================
// 1. BOM导入模板
// ============================================================

/** BOM导入模板CSV头部 */
const BOM_TEMPLATE_HEADERS = [
  '物料编码',      // material_code (必填)
  '物料名称',      // material_name (必填)
  '物料规格',      // material_spec
  '需求数量',      // required_qty (必填)
  '是否关键物料',  // is_critical (Y/N)
  '工序代码',      // process_code (T1-T15)
  '供应商',        // supplier
  '备注',          // remarks
];

/** 生成BOM导入模板CSV */
export function generateBomTemplate(): string {
  const headers = BOM_TEMPLATE_HEADERS.join(',');
  const sampleRows = [
    'MAT-001,清洗喷嘴组件,DN50不锈钢,4,Y,T3,上海精密,主清洗区核心部件',
    'MAT-002,传动链条,08B-1标准链,2,Y,T4,东莞链条,主传动系统',
    'MAT-003,密封垫片,NBR φ80×φ60×3,12,N,T3,苏州密封,',
    'MAT-004,PLC控制器,S7-1200 CPU1214C,1,Y,T6,西门子,电气控制核心',
    'MAT-005,液位传感器,4-20mA输出,3,N,T6,E+H,液位监测',
  ];
  
  return [headers, ...sampleRows].join('\n');
}

// ============================================================
// 2. CSV解析与验证
// ============================================================

/** 解析CSV文本为结构化数据 */
export function parseBomCsv(csvText: string): {
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
} {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, field: '', message: '文件为空或缺少数据行' }] };
  }
  
  // 跳过表头
  const dataLines = lines.slice(1);
  const rows: any[] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;
    
    const rowNumber = i + 2; // 1-based, accounting for header
    const fields = parseCSVLine(line);
    
    const materialCode = (fields[0] || '').trim();
    const materialName = (fields[1] || '').trim();
    const materialSpec = (fields[2] || '').trim();
    const requiredQtyStr = (fields[3] || '').trim();
    const isCriticalStr = (fields[4] || '').trim().toUpperCase();
    const processCode = (fields[5] || '').trim().toUpperCase();
    const supplier = (fields[6] || '').trim();
    const remarks = (fields[7] || '').trim();
    
    // 验证必填字段
    if (!materialCode) {
      errors.push({ row: rowNumber, field: '物料编码', message: '物料编码不能为空' });
      continue;
    }
    if (!materialName) {
      errors.push({ row: rowNumber, field: '物料名称', message: '物料名称不能为空' });
      continue;
    }
    
    // 验证物料编码格式（允许字母、数字、连字符）
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
  
  return { rows, errors };
}

/** 解析单行CSV（处理引号内的逗号） */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

/** 检测重复物料编码 */
export function detectDuplicates(rows: Array<{ materialCode: string; rowNumber: number }>): Array<{ row: number; materialCode: string; duplicateOf: number }> {
  const seen = new Map<string, number>();
  const duplicates: Array<{ row: number; materialCode: string; duplicateOf: number }> = [];
  
  for (const row of rows) {
    if (seen.has(row.materialCode)) {
      duplicates.push({
        row: row.rowNumber,
        materialCode: row.materialCode,
        duplicateOf: seen.get(row.materialCode)!,
      });
    } else {
      seen.set(row.materialCode, row.rowNumber);
    }
  }
  
  return duplicates;
}

// ============================================================
// 3. BOM批量导入执行
// ============================================================

/** 执行BOM批量导入 */
export async function executeBomImport(params: {
  projectId: string;
  verificationId: number;
  csvText: string;
  importedBy?: string;
  importedByName?: string;
  skipDuplicates?: boolean;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  // 1. 解析CSV
  const { rows, errors: parseErrors } = parseBomCsv(params.csvText);
  
  if (parseErrors.length > 0 && rows.length === 0) {
    return {
      success: false,
      imported: 0,
      errors: parseErrors,
      message: '所有数据行都存在错误，导入中止',
    };
  }
  
  // 2. 检测重复
  const duplicates = detectDuplicates(rows);
  const duplicateWarnings = duplicates.map(d => ({
    row: d.row,
    field: '物料编码',
    message: `物料编码 ${d.materialCode} 与第${d.duplicateOf}行重复`,
  }));
  
  // 3. 过滤重复（如果设置了跳过重复）
  let importRows = rows;
  if (params.skipDuplicates && duplicates.length > 0) {
    const duplicateRows = new Set(duplicates.map(d => d.row));
    importRows = rows.filter(r => !duplicateRows.has(r.rowNumber));
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
    VALUES (${params.projectId}, ${params.verificationId}, 'csv_import',
            ${rows.length}, ${importRows.length},
            ${parseErrors.length}, ${duplicates.length + existingDuplicates.length},
            'completed', ${JSON.stringify({ parseErrors, duplicateWarnings, existingDuplicates })},
            ${params.importedBy || null}, ${params.importedByName || null}, ${now})
  `);
  
  return {
    success: true,
    imported: importRows.length,
    totalRows: rows.length,
    errors: parseErrors,
    duplicateWarnings,
    existingDuplicates,
    message: `成功导入 ${importRows.length} 条BOM清单项`,
  };
}

// ============================================================
// 4. 导入历史管理
// ============================================================

/** 获取导入历史 */
export async function getImportHistory(projectId: string, limit?: number) {
  const db = await requireDb();
  const queryLimit = limit || 20;
  
  const rows = (await db.execute(sql`
    SELECT * FROM bom_import_history
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT ${queryLimit}
  `)).rows;
  return rows;
}

/** 回滚导入（删除指定导入批次的所有清单项） */
export async function rollbackImport(importId: number) {
  const db = await requireDb();
  const now = Date.now();
  
  // 获取导入记录
  const records = (await db.execute(sql`
    SELECT * FROM bom_import_history WHERE id = ${importId}
  `)).rows;
  const record = (records as any[])[0];
  if (!record) {
    throw new Error('导入记录不存在');
  }
  
  if (record.import_status === 'rolled_back') {
    throw new Error('该导入已被回滚');
  }
  
  // 删除该批次导入的清单项（通过verification_id和时间范围）
  const importTime = Number(record.created_at);
  await db.execute(sql`
    DELETE FROM bom_checklist_items 
    WHERE verification_id = ${record.verification_id}
      AND created_at >= ${importTime - 1000}
      AND created_at <= ${importTime + 60000}
  `);
  
  // 更新导入记录状态
  await db.execute(sql`
    UPDATE bom_import_history SET 
      import_status = 'rolled_back',
      rolled_back_at = ${now}
    WHERE id = ${importId}
  `);
  
  return { success: true, message: '导入已回滚' };
}

// ============================================================
// 5. 外部数据平台/ERP数据同步
// ============================================================

/** 从外部数据平台获取BOM数据（通过API） */
export async function syncFromExternalSync(params: {
  projectId: string;
  verificationId: number;
  formId: string;
  fieldMapping: Record<string, string>;
  importedBy?: string;
}) {
  const db = await requireDb();
  const now = Date.now();

  // 外部数据平台API配置
  const apiKey = process.env.EXT_SYNC_API_KEY;
  const corpId = process.env.EXT_SYNC_CORP_ID;

  if (!apiKey || !corpId) {
    return {
      success: false,
      message: '外部数据平台API未配置，请在系统设置中配置EXT_SYNC_API_KEY和EXT_SYNC_CORP_ID',
    };
  }

  try {
    // 调用外部数据平台数据查询API
    const response = await fetch(`${process.env.EXT_SYNC_API_URL || 'https://api.external-sync.example.com'}/api/v5/corp/${corpId}/app/entry/${params.formId}/data/list`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 500,
        fields: Object.values(params.fieldMapping),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        message: `外部数据平台API调用失败: ${response.status} ${errText}`,
      };
    }

    const data = await response.json();
    const records = data.data || [];

    if (records.length === 0) {
      return { success: false, message: '外部数据平台表单中没有数据' };
    }
    
    // 转换数据格式
    const items = records.map((record: any) => {
      const fields = record.fields || record;
      return {
        projectId: params.projectId,
        processCode: fields[params.fieldMapping.processCode] || 'T1',
        materialCode: fields[params.fieldMapping.materialCode] || '',
        materialName: fields[params.fieldMapping.materialName] || '',
        materialSpec: fields[params.fieldMapping.materialSpec] || '',
        requiredQty: Number(fields[params.fieldMapping.requiredQty]) || 1,
        isCritical: fields[params.fieldMapping.isCritical] === 'Y' || fields[params.fieldMapping.isCritical] === '是',
      };
    }).filter((item: any) => item.materialCode && item.materialName);
    
    if (items.length === 0) {
      return { success: false, message: '转换后没有有效的BOM数据' };
    }
    
    // 导入数据
    await addBomChecklistItems(params.verificationId, items);
    
    // 记录同步历史
    await db.execute(sql`
      INSERT INTO bom_import_history 
      (project_id, verification_id, file_name, total_rows, imported_rows,
       error_rows, duplicate_rows, import_status, error_details,
       imported_by, imported_by_name, created_at)
      VALUES (${params.projectId}, ${params.verificationId}, ${'ext_sync_' + params.formId},
              ${records.length}, ${items.length},
              ${records.length - items.length}, 0,
              'completed', ${JSON.stringify({ source: 'externalSync', formId: params.formId })},
              ${params.importedBy || 'system'}, ${'外部数据平台同步'}, ${now})
    `);
    
    return {
      success: true,
      imported: items.length,
      totalRecords: records.length,
      message: `从外部数据平台成功同步 ${items.length} 条BOM数据`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `外部数据平台同步失败: ${error.message}`,
    };
  }
}
