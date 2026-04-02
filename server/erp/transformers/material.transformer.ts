/**
 * 天思→GRT 物料数据转换器
 */

export function transformMaterial(row: any): any {
  return {
    materialCode: String(row.material_code || '').trim(),
    materialName: String(row.material_name || '').trim(),
    specificationCode: row.material_spec || null,
    materialType: mapMaterialType(row.material_type),
    standardCost: row.unit_price ? String(row.unit_price) : null,
    manufacturer: row.manufacturer || null,
    manufacturerCode: row.manufacturer_code || null,
    minStockLevel: parseInt(row.min_stock, 10) || 0,
    maxStockLevel: parseInt(row.max_stock, 10) || 0,
    categoryCode: row.category || 'UNCATEGORIZED',
    description: row.description || null,
    status: mapStatus(row.status),
    erpMaterialCode: String(row.material_code || '').trim(),
    erpSyncStatus: 'synced',
    erpLastSyncAt: new Date().toISOString(),
  };
}

export function validateMaterial(row: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!row.material_code) errors.push('缺少物料编码 (material_code)');
  if (!row.material_name) errors.push('缺少物料名称 (material_name)');
  if (row.unit_price && isNaN(Number(row.unit_price))) errors.push('单价格式错误');
  return { ok: errors.length === 0, errors };
}

function mapMaterialType(type: string | null): string {
  const map: Record<string, string> = {
    '原材料': 'component',
    '半成品': 'part',
    '成品': 'equipment',
    '辅料': 'consumable',
    '包装': 'consumable',
    '化学品': 'chemical',
  };
  return map[type || ''] || 'other';
}

function mapStatus(status: string | null): string {
  const s = (status || '').toLowerCase();
  if (s === '停用' || s === 'inactive' || s === '0') return 'inactive';
  return 'active';
}
