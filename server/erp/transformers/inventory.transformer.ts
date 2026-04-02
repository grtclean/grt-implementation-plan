export function transformInventory(row: any): any {
  return {
    materialCode: String(row.material_code || '').trim(),
    warehouseCode: String(row.warehouse_code || '').trim(),
    quantityOnHand: parseInt(row.quantity_on_hand, 10) || 0,
    quantityReserved: parseInt(row.quantity_reserved, 10) || 0,
    quantityAvailable: parseInt(row.quantity_available, 10) || 0,
    lastCountDate: row.last_count_date ? new Date(row.last_count_date).toISOString() : null,
  };
}

export function validateInventory(row: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!row.material_code) errors.push('缺少物料编码');
  if (row.quantity_on_hand !== undefined && isNaN(Number(row.quantity_on_hand))) errors.push('在手数量格式错误');
  return { ok: errors.length === 0, errors };
}
