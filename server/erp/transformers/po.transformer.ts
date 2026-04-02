export function transformPO(row: any): any {
  return {
    poNumber: String(row.po_number || '').trim(),
    poDate: row.po_date ? new Date(row.po_date).toISOString() : new Date().toISOString(),
    supplierCode: String(row.supplier_code || '').trim(),
    supplierName: String(row.supplier_name || '').trim(),
    materialCode: String(row.material_code || '').trim(),
    materialName: row.material_name || '',
    quantity: parseInt(row.quantity, 10) || 0,
    unitPrice: row.unit_price ? String(row.unit_price) : '0',
    totalAmount: row.total_amount ? String(row.total_amount) : '0',
    expectedDeliveryDate: row.delivery_date ? new Date(row.delivery_date).toISOString() : null,
    paymentTerms: row.payment_terms || null,
    status: mapPOStatus(row.po_status),
    erpPoNumber: String(row.po_number || '').trim(),
  };
}

export function validatePO(row: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!row.po_number) errors.push('缺少采购订单号');
  if (!row.supplier_code) errors.push('缺少供应商编码');
  if (!row.quantity || isNaN(Number(row.quantity))) errors.push('数量无效');
  return { ok: errors.length === 0, errors };
}

function mapPOStatus(status: string | null): string {
  const map: Record<string, string> = {
    '草稿': 'draft', '已审批': 'approved', '已下达': 'released',
    '部分收货': 'partial', '已完成': 'completed', '已关闭': 'closed',
  };
  return map[status || ''] || 'draft';
}
