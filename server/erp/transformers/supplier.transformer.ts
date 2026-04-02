export function transformSupplier(row: any): any {
  return {
    supplierCode: String(row.supplier_code || '').trim(),
    supplierName: String(row.supplier_name || '').trim(),
    supplierCategory: row.supplier_category || 'general',
    contactPerson: row.contact_person || null,
    contactPhone: row.contact_phone || null,
    contactEmail: row.contact_email || null,
    address: row.address || null,
    taxId: row.tax_id || null,
    qualityRating: row.quality_rating || 'C',
    paymentTerms: row.payment_terms || null,
    status: row.status === '停用' ? 'inactive' : 'active',
    erpSupplierCode: String(row.supplier_code || '').trim(),
    erpSyncStatus: 'synced',
  };
}

export function validateSupplier(row: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!row.supplier_code) errors.push('缺少供应商编码');
  if (!row.supplier_name) errors.push('缺少供应商名称');
  return { ok: errors.length === 0, errors };
}
