/**
 * 金蝶K/3 表结构发现与数据提取SQL
 * 主数据库: AIS20260122124030
 *
 * 金蝶K/3 核心表命名规则:
 * - t_ICItem: 物料主数据
 * - t_Supplier: 供应商
 * - t_Organization: 组织机构
 * - t_Account: 会计科目
 * - t_Voucher / t_VoucherEntry: 凭证
 * - t_APBill / t_ARBill: 应付/应收
 * - t_POOrder / t_POOrderEntry: 采购订单
 * - t_SEOrder / t_SEOrderEntry: 销售订单
 * - t_ICStockBill / t_ICStockBillEntry: 出入库单
 * - t_ICInventory: 即时库存
 * - t_BOS_Bill*: BOS扩展单据
 */

// Database discovery
export const KINGDEE_DISCOVERY_QUERY = `
  SELECT
    t.TABLE_NAME AS tableName,
    t.TABLE_TYPE AS tableType,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = t.TABLE_NAME) AS columnCount,
    p.rows AS rowCount
  FROM INFORMATION_SCHEMA.TABLES t
  LEFT JOIN sys.partitions p ON p.object_id = OBJECT_ID(t.TABLE_NAME) AND p.index_id IN (0, 1)
  WHERE t.TABLE_SCHEMA = 'dbo' AND t.TABLE_TYPE = 'BASE TABLE'
  ORDER BY t.TABLE_NAME
`;

export const KINGDEE_COLUMNS_QUERY = (tableName: string) => `
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

export const KINGDEE_PREVIEW_QUERY = (tableName: string) =>
  `SELECT TOP 50 * FROM [${tableName.replace(/[^a-zA-Z0-9_]/g, '')}]`;

// ============ 金蝶K/3 财务核心表提取 ============

// 会计科目 (Chart of Accounts)
export const EXTRACT_GL_ACCOUNTS = `
  SELECT TOP (@batchSize)
    FAcctID AS accountId,
    FNumber AS accountCode,
    FName AS accountName,
    FParentID AS parentId,
    FDetail AS isDetail,
    FDC AS balanceDirection,
    FGroupID AS groupId,
    FLevel AS level,
    FDelete AS isDeleted
  FROM t_Account
  WHERE FDelete = 0
  ORDER BY FNumber
  OFFSET @offset ROWS
`;

// 凭证主表 (GL Vouchers)
export const EXTRACT_VOUCHERS = `
  SELECT TOP (@batchSize)
    FVoucherID AS voucherId,
    FDate AS voucherDate,
    FNumber AS voucherNumber,
    FTransNo AS transNo,
    FGroupID AS groupId,
    FYear AS fiscalYear,
    FPeriod AS fiscalPeriod,
    FSerialNum AS serialNum,
    FEntryCount AS entryCount,
    FDebitTotal AS debitTotal,
    FCreditTotal AS creditTotal,
    FChecked AS isChecked,
    FPosted AS isPosted,
    FPreparerID AS preparerId,
    FCheckerID AS checkerId,
    FPosterID AS posterId,
    FExplanation AS explanation
  FROM t_Voucher
  ORDER BY FDate DESC, FNumber
  OFFSET @offset ROWS
`;

// 凭证明细 (Voucher Entries)
export const EXTRACT_VOUCHER_ENTRIES = `
  SELECT
    FEntryID AS entryId,
    FVoucherID AS voucherId,
    FExplanation AS explanation,
    FAccountID AS accountId,
    FDebit AS debitAmount,
    FCredit AS creditAmount,
    FAmountFor AS foreignAmount,
    FCurrencyID AS currencyId,
    FExchangeRate AS exchangeRate,
    FDeptID AS deptId,
    FEmpID AS empId,
    FCustomerID AS customerId,
    FSupplierID AS supplierId,
    FItemID AS itemId,
    FProjectID AS projectId,
    FQuantity AS quantity,
    FUnitPrice AS unitPrice
  FROM t_VoucherEntry
  WHERE FVoucherID = @voucherId
  ORDER BY FEntryID
`;

// 应付账款 (Accounts Payable)
export const EXTRACT_AP_BILLS = `
  SELECT TOP (@batchSize)
    FInterID AS billId,
    FBillNo AS billNo,
    FDate AS billDate,
    FSupplyID AS supplierId,
    FAmount AS totalAmount,
    FAmountPaid AS paidAmount,
    FStatus AS status,
    FCurrencyID AS currencyId,
    FDeptID AS deptId,
    FNote AS notes,
    FSettleDate AS settlementDate
  FROM t_APBill
  ORDER BY FDate DESC
  OFFSET @offset ROWS
`;

// 应收账款 (Accounts Receivable)
export const EXTRACT_AR_BILLS = `
  SELECT TOP (@batchSize)
    FInterID AS billId,
    FBillNo AS billNo,
    FDate AS billDate,
    FCustomerID AS customerId,
    FAmount AS totalAmount,
    FAmountReceived AS receivedAmount,
    FStatus AS status,
    FCurrencyID AS currencyId,
    FDeptID AS deptId,
    FNote AS notes,
    FSettleDate AS settlementDate
  FROM t_ARBill
  ORDER BY FDate DESC
  OFFSET @offset ROWS
`;

// 采购订单 (Purchase Orders)
export const EXTRACT_K3_PO = `
  SELECT TOP (@batchSize)
    o.FInterID AS poId,
    o.FBillNo AS poNumber,
    o.FDate AS poDate,
    o.FSupplyID AS supplierId,
    o.FStatus AS status,
    o.FNote AS notes,
    e.FEntryID AS lineId,
    e.FItemID AS itemId,
    e.FQty AS quantity,
    e.FPrice AS unitPrice,
    e.FAmount AS lineAmount,
    e.FAuxQty AS auxQty,
    e.FUnitID AS unitId
  FROM t_POOrder o
  JOIN t_POOrderEntry e ON o.FInterID = e.FInterID
  ORDER BY o.FDate DESC
  OFFSET @offset ROWS
`;

// 物料/存货 (Items/Materials)
export const EXTRACT_K3_ITEMS = `
  SELECT TOP (@batchSize)
    FItemID AS itemId,
    FNumber AS itemCode,
    FName AS itemName,
    FModel AS model,
    FFullName AS fullName,
    FShortNumber AS shortNumber,
    FParentID AS parentId,
    FUnitID AS unitId,
    FUnitGroupID AS unitGroupId,
    FDetail AS isDetail,
    FDeleted AS isDeleted,
    FErpClsID AS erpClassId
  FROM t_ICItem
  WHERE FDeleted = 0
  ORDER BY FNumber
  OFFSET @offset ROWS
`;

// 供应商
export const EXTRACT_K3_SUPPLIERS = `
  SELECT TOP (@batchSize)
    FItemID AS supplierId,
    FNumber AS supplierCode,
    FName AS supplierName,
    FShortName AS shortName,
    FAddress AS address,
    FPhone AS phone,
    FFax AS fax,
    FContact AS contactPerson,
    FEmail AS email,
    FTaxNum AS taxId,
    FBankName AS bankName,
    FBankAcct AS bankAccount,
    FPayCondition AS paymentTerms,
    FDeleted AS isDeleted
  FROM t_Supplier
  WHERE FDeleted = 0
  ORDER BY FNumber
  OFFSET @offset ROWS
`;

// 客户
export const EXTRACT_K3_CUSTOMERS = `
  SELECT TOP (@batchSize)
    FItemID AS customerId,
    FNumber AS customerCode,
    FName AS customerName,
    FShortName AS shortName,
    FAddress AS address,
    FPhone AS phone,
    FContact AS contactPerson,
    FEmail AS email,
    FTaxNum AS taxId,
    FBankName AS bankName,
    FBankAcct AS bankAccount,
    FPayCondition AS paymentTerms,
    FDeleted AS isDeleted
  FROM t_Customer
  WHERE FDeleted = 0
  ORDER BY FNumber
  OFFSET @offset ROWS
`;

// 即时库存 (Real-time Inventory)
export const EXTRACT_K3_INVENTORY = `
  SELECT TOP (@batchSize)
    FItemID AS itemId,
    FStockID AS warehouseId,
    FBatchNo AS batchNo,
    FQty AS quantity,
    FAmount AS amount,
    FAuxQty AS auxQty
  FROM t_ICInventory
  WHERE FQty > 0
  ORDER BY FItemID
  OFFSET @offset ROWS
`;

// 出入库单 (Stock Bills — receipts & issues)
export const EXTRACT_K3_STOCK_BILLS = `
  SELECT TOP (@batchSize)
    b.FInterID AS billId,
    b.FBillNo AS billNo,
    b.FDate AS billDate,
    b.FTranType AS transType,
    b.FDeptID AS deptId,
    b.FSupplyID AS supplierId,
    b.FEmpID AS empId,
    b.FStatus AS status,
    b.FCheckerID AS checkerId,
    e.FEntryID AS lineId,
    e.FItemID AS itemId,
    e.FStockID AS warehouseId,
    e.FQty AS quantity,
    e.FPrice AS unitPrice,
    e.FAmount AS lineAmount,
    e.FBatchNo AS batchNo
  FROM t_ICStockBill b
  JOIN t_ICStockBillEntry e ON b.FInterID = e.FInterID
  ORDER BY b.FDate DESC
  OFFSET @offset ROWS
`;

// 部门 (Departments)
export const EXTRACT_K3_DEPARTMENTS = `
  SELECT
    FItemID AS deptId,
    FNumber AS deptCode,
    FName AS deptName,
    FParentID AS parentId,
    FDetail AS isDetail,
    FDeleted AS isDeleted
  FROM t_Department
  WHERE FDeleted = 0
  ORDER BY FNumber
`;

// 员工 (Employees in K/3)
export const EXTRACT_K3_EMPLOYEES = `
  SELECT TOP (@batchSize)
    FItemID AS empId,
    FNumber AS empCode,
    FName AS empName,
    FDeptID AS deptId,
    FDeleted AS isDeleted
  FROM t_Emp
  WHERE FDeleted = 0
  ORDER BY FNumber
  OFFSET @offset ROWS
`;

// 科目余额 (Account Balances)
export const EXTRACT_ACCOUNT_BALANCES = `
  SELECT
    FAcctID AS accountId,
    FYear AS fiscalYear,
    FPeriod AS fiscalPeriod,
    FBeginBalance AS beginBalance,
    FDebit AS periodDebit,
    FCredit AS periodCredit,
    FEndBalance AS endBalance
  FROM t_Balance
  WHERE FYear = @year
  ORDER BY FAcctID, FPeriod
`;

// ============ 统计SQL ============

export const KINGDEE_COUNT_ENTITY = (tableName: string) =>
  `SELECT COUNT(*) AS cnt FROM [${tableName.replace(/[^a-zA-Z0-9_]/g, '')}]`;

export const KINGDEE_SUM_FIELD = (tableName: string, fieldName: string) =>
  `SELECT ISNULL(SUM(CAST([${fieldName.replace(/[^a-zA-Z0-9_]/g, '')}] AS DECIMAL(18,2))), 0) AS total FROM [${tableName.replace(/[^a-zA-Z0-9_]/g, '')}]`;

// 多数据库查询
export const KINGDEE_LIST_DATABASES = `
  SELECT name, database_id, create_date
  FROM sys.databases
  WHERE name LIKE 'AIS%' OR name LIKE 'K3%'
  ORDER BY name
`;
