/**
 * 天思ERP表结构发现与数据提取SQL
 * 所有查询针对 DB_GRT (MSSQL)
 */

// 列出所有用户表
export const DISCOVERY_QUERY = `
  SELECT
    t.TABLE_NAME AS tableName,
    t.TABLE_TYPE AS tableType,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = t.TABLE_NAME) AS columnCount,
    p.rows AS [rowCount]
  FROM INFORMATION_SCHEMA.TABLES t
  LEFT JOIN sys.partitions p ON p.object_id = OBJECT_ID(t.TABLE_NAME) AND p.index_id IN (0, 1)
  WHERE t.TABLE_SCHEMA = 'dbo' AND t.TABLE_TYPE = 'BASE TABLE'
  ORDER BY t.TABLE_NAME
`;

// 列出某张表的所有列
export const COLUMNS_QUERY = (tableName: string) => `
  SELECT
    COLUMN_NAME AS columnName,
    DATA_TYPE AS dataType,
    CHARACTER_MAXIMUM_LENGTH AS maxLength,
    IS_NULLABLE AS isNullable,
    COLUMN_DEFAULT AS defaultValue,
    ORDINAL_POSITION AS ordinal
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = @tableName
  ORDER BY ORDINAL_POSITION
`;

// 预览某张表的数据 (安全限制50行)
export const PREVIEW_QUERY = (tableName: string) =>
  `SELECT TOP 50 * FROM [${tableName.replace(/[^a-zA-Z0-9_]/g, '')}]`;

// ============ 实体提取SQL ============

// 物料提取
export const EXTRACT_MATERIALS = `
  SELECT TOP (@batchSize)
    material_code, material_name, material_spec, material_type,
    unit_price, manufacturer, manufacturer_code,
    min_stock, max_stock, category,
    unit, description, status
  FROM materials
  WHERE material_code NOT IN (SELECT COALESCE(erp_material_code, '') FROM materials WHERE erp_material_code IS NOT NULL)
  ORDER BY material_code
  OFFSET @offset ROWS
`;

// 供应商提取
export const EXTRACT_SUPPLIERS = `
  SELECT TOP (@batchSize)
    supplier_code, supplier_name, supplier_category,
    contact_person, contact_phone, contact_email,
    address, tax_id, quality_rating, payment_terms, status
  FROM suppliers
  ORDER BY supplier_code
  OFFSET @offset ROWS
`;

// BOM提取
export const EXTRACT_BOMS = `
  SELECT TOP (@batchSize)
    bom_id, product_code, product_name, bom_type,
    version, status, standard_qty, standard_unit
  FROM bom_master
  ORDER BY bom_id
  OFFSET @offset ROWS
`;

// BOM明细提取
export const EXTRACT_BOM_ITEMS = `
  SELECT
    item_id, bom_id, material_code, material_name, material_spec,
    quantity, unit, scrap_rate, source_type, process_code, lead_time, unit_cost
  FROM bom_items
  WHERE bom_id = @bomId
  ORDER BY item_id
`;

// 采购订单提取
export const EXTRACT_PURCHASE_ORDERS = `
  SELECT TOP (@batchSize)
    po_number, po_date, supplier_code, supplier_name,
    material_code, material_name, quantity, unit_price,
    total_amount, delivery_date, po_status, payment_terms
  FROM purchase_orders
  ORDER BY po_date DESC
  OFFSET @offset ROWS
`;

// 库存提取
export const EXTRACT_INVENTORY = `
  SELECT TOP (@batchSize)
    material_code, warehouse_code,
    quantity_on_hand, quantity_reserved, quantity_available,
    last_count_date
  FROM inventory
  ORDER BY material_code
  OFFSET @offset ROWS
`;

// 仓库提取
export const EXTRACT_WAREHOUSES = `
  SELECT
    warehouse_code, warehouse_name, warehouse_type,
    address, manager_name, contact_phone, status
  FROM warehouses
  ORDER BY warehouse_code
`;

// 批次提取
export const EXTRACT_LOTS = `
  SELECT TOP (@batchSize)
    lot_number, material_code, material_name,
    initial_qty, current_qty, unit,
    supplier_lot, supplier_name, warehouse_code,
    production_date, expiry_date, status
  FROM inventory_lots
  ORDER BY lot_number
  OFFSET @offset ROWS
`;

// ============ 统计SQL ============

export const COUNT_ENTITY = (tableName: string) =>
  `SELECT COUNT(*) AS cnt FROM [${tableName.replace(/[^a-zA-Z0-9_]/g, '')}]`;

export const SUM_FIELD = (tableName: string, fieldName: string) =>
  `SELECT ISNULL(SUM(CAST([${fieldName.replace(/[^a-zA-Z0-9_]/g, '')}] AS DECIMAL(18,2))), 0) AS total FROM [${tableName.replace(/[^a-zA-Z0-9_]/g, '')}]`;
