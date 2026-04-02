export function transformBom(row: any): any {
  return {
    erpBomId: String(row.bom_id || ''),
    productCode: String(row.product_code || '').trim(),
    productName: String(row.product_name || '').trim(),
    bomType: row.bom_type || 'standard',
    currentVersion: row.version || '1.0',
    status: row.status === '停用' ? 'inactive' : 'active',
    standardQty: row.standard_qty ? Number(row.standard_qty) : 1,
    standardUnit: row.standard_unit || '个',
  };
}

export function validateBom(row: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!row.bom_id) errors.push('缺少BOM ID');
  if (!row.product_code) errors.push('缺少产品编码');
  return { ok: errors.length === 0, errors };
}
