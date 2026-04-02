export function transformWarehouse(row: any): any {
  return {
    warehouseCode: String(row.warehouse_code || '').trim(),
    warehouseName: String(row.warehouse_name || '').trim(),
    warehouseType: row.warehouse_type || 'general',
    address: row.address || null,
    managerName: row.manager_name || null,
    contactPhone: row.contact_phone || null,
    erpWarehouseCode: String(row.warehouse_code || '').trim(),
    erpSyncStatus: 'synced',
    isActive: row.status !== '停用',
  };
}

export function validateWarehouse(row: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!row.warehouse_code) errors.push('缺少仓库编码');
  if (!row.warehouse_name) errors.push('缺少仓库名称');
  return { ok: errors.length === 0, errors };
}
