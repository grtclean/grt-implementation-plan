export function transformLot(row: any): any {
  return {
    lotNumber: String(row.lot_number || '').trim(),
    materialCode: String(row.material_code || '').trim(),
    materialName: row.material_name || null,
    initialQty: row.initial_qty ? Number(row.initial_qty) : 0,
    currentQty: row.current_qty ? Number(row.current_qty) : 0,
    unit: row.unit || '个',
    supplierLotNumber: row.supplier_lot || null,
    supplierName: row.supplier_name || null,
    warehouseCode: row.warehouse_code || null,
    productionDate: row.production_date ? new Date(row.production_date).toISOString() : null,
    expiryDate: row.expiry_date ? new Date(row.expiry_date).toISOString() : null,
    status: row.status === '停用' ? 'expired' : 'active',
  };
}

export function validateLot(row: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!row.lot_number) errors.push('缺少批次号');
  if (!row.material_code) errors.push('缺少物料编码');
  return { ok: errors.length === 0, errors };
}
