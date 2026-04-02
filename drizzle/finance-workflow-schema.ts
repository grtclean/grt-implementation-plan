/**
 * GRT 5.0 财务工作流Schema
 *
 * 覆盖:
 * - 项目关联报销申请 (travel, procurement, budget)
 * - 供应商付款跟踪 (预付/付款/余款/质保金)
 * - 客户收款跟踪 (付款周期/发票)
 * - 银行账户注册
 * - 固定费用管理 (房租/水电/物业)
 * - 物料盘点单
 * - 金蝶迁移批次跟踪
 */

import { pgTable, serial, integer, varchar, text, timestamp, decimal, boolean, index, unique, json } from 'drizzle-orm/pg-core';
import { users } from './schema';

// ============================================
// 项目关联报销申请 (Project-Linked Reimbursement)
// ============================================
export const projectReimbursements = pgTable('project_reimbursements', {
  id: serial().primaryKey(),
  // 申请信息
  requestCode: varchar({ length: 50 }).notNull(),
  applicantId: integer().notNull().references(() => users.id),
  applicantName: varchar({ length: 100 }).notNull(),
  department: varchar({ length: 100 }),
  buCode: varchar({ length: 50 }),
  // 项目关联
  projectId: integer(),
  projectCode: varchar({ length: 50 }),
  projectName: varchar({ length: 200 }),
  // 报销类型
  reimbursementType: varchar({ length: 50 }).notNull(), // travel/procurement/material/entertainment/other
  // OA关联
  oaFormId: integer(),
  oaFormCode: varchar({ length: 50 }),
  // 金额
  totalAmount: decimal({ precision: 14, scale: 2 }).notNull(),
  approvedAmount: decimal({ precision: 14, scale: 2 }),
  currency: varchar({ length: 3 }).default('CNY'),
  // 明细 (JSON array of line items)
  lineItems: text(), // [{description, amount, category, receiptNo, receiptDate}]
  // 出差信息 (if travel)
  travelDestination: varchar({ length: 200 }),
  travelStartDate: timestamp({ mode: 'string' }),
  travelEndDate: timestamp({ mode: 'string' }),
  // 政策合规
  policyCompliant: boolean().default(true),
  policyViolations: text(), // JSON array of violations
  // 审批流程
  status: varchar({ length: 50 }).default('draft').notNull(),
  // draft → submitted → finance_review → finance_approved → director_approved → cashier_processing → paid → rejected
  currentReviewerId: integer().references(() => users.id),
  currentReviewerName: varchar({ length: 100 }),
  // 审批链
  financeSpecialistId: integer().references(() => users.id), // 王汝月 — 初审
  financeSpecialistApprovedAt: timestamp({ mode: 'string' }),
  financeReviewerId: integer().references(() => users.id), // 王秀萍 — 复查
  financeReviewerApprovedAt: timestamp({ mode: 'string' }),
  directorApprovalId: integer().references(() => users.id), // 倪微薇 — >10K审批
  directorApprovedAt: timestamp({ mode: 'string' }),
  cashierId: integer().references(() => users.id), // 黄晓兰 — 银行执行
  cashierProcessedAt: timestamp({ mode: 'string' }),
  // 银行付款
  payeeBankAccount: varchar({ length: 50 }),
  payeeBankName: varchar({ length: 100 }),
  payeeAccountName: varchar({ length: 100 }),
  paymentTransactionId: varchar({ length: 100 }),
  paidAt: timestamp({ mode: 'string' }),
  // 否决/打回
  rejectedBy: integer().references(() => users.id),
  rejectedAt: timestamp({ mode: 'string' }),
  rejectionReason: text(),
  // 附件
  attachments: text(), // JSON array of file URLs
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('project_reimbursements_uk_code').on(table.requestCode),
  index('project_reimbursements_idx_applicant').on(table.applicantId),
  index('project_reimbursements_idx_project').on(table.projectId),
  index('project_reimbursements_idx_status').on(table.status),
  index('project_reimbursements_idx_type').on(table.reimbursementType),
]);

// ============================================
// 供应商付款跟踪 (Supplier Payment Tracking)
// ============================================
export const supplierPaymentTracking = pgTable('supplier_payment_tracking', {
  id: serial().primaryKey(),
  // 供应商/采购单关联
  supplierId: integer().notNull(),
  supplierCode: varchar({ length: 50 }).notNull(),
  supplierName: varchar({ length: 200 }).notNull(),
  purchaseOrderId: integer(),
  poNumber: varchar({ length: 50 }),
  contractNumber: varchar({ length: 50 }),
  // 项目关联
  projectId: integer(),
  projectCode: varchar({ length: 50 }),
  // 合同总金额
  contractAmount: decimal({ precision: 14, scale: 2 }).notNull(),
  currency: varchar({ length: 3 }).default('CNY'),
  // 付款阶段
  prepaymentAmount: decimal({ precision: 14, scale: 2 }).default('0'), // 预付款
  prepaymentDate: timestamp({ mode: 'string' }),
  prepaymentStatus: varchar({ length: 50 }).default('pending'), // pending/paid/na
  deliveryPaymentAmount: decimal({ precision: 14, scale: 2 }).default('0'), // 到货付款
  deliveryPaymentDate: timestamp({ mode: 'string' }),
  deliveryPaymentStatus: varchar({ length: 50 }).default('pending'),
  acceptancePaymentAmount: decimal({ precision: 14, scale: 2 }).default('0'), // 验收付款
  acceptancePaymentDate: timestamp({ mode: 'string' }),
  acceptancePaymentStatus: varchar({ length: 50 }).default('pending'),
  warrantyDepositAmount: decimal({ precision: 14, scale: 2 }).default('0'), // 质保金
  warrantyDepositDueDate: timestamp({ mode: 'string' }),
  warrantyDepositStatus: varchar({ length: 50 }).default('held'), // held/released/deducted
  warrantyMonths: integer().default(12),
  // 累计
  totalPaidAmount: decimal({ precision: 14, scale: 2 }).default('0'),
  remainingAmount: decimal({ precision: 14, scale: 2 }).default('0'),
  // 发票
  invoiceNumbers: text(), // JSON array
  invoiceTotalAmount: decimal({ precision: 14, scale: 2 }).default('0'),
  // 验收流程 (大额资产)
  isLargeAsset: boolean().default(false),
  preAcceptanceStatus: varchar({ length: 50 }), // pending/passed/failed
  preAcceptanceDate: timestamp({ mode: 'string' }),
  preAcceptanceBy: integer().references(() => users.id),
  finalAcceptanceStatus: varchar({ length: 50 }),
  finalAcceptanceDate: timestamp({ mode: 'string' }),
  finalAcceptanceBy: integer().references(() => users.id),
  qualityApprovalBy: integer().references(() => users.id), // 质量部门
  userDeptApprovalBy: integer().references(() => users.id), // 使用部门
  procurementConfirmBy: integer().references(() => users.id), // 采购工程师
  buManagerApprovalBy: integer().references(() => users.id), // 事业部经理
  procurementManagerConfirmBy: integer().references(() => users.id), // 采购经理
  financeConfirmBy: integer().references(() => users.id), // 王秀萍
  cashierExecuteBy: integer().references(() => users.id), // 黄晓兰
  // 银行账户
  supplierBankName: varchar({ length: 100 }),
  supplierBankAccount: varchar({ length: 50 }),
  supplierAccountName: varchar({ length: 100 }),
  // 通知
  notifyProcurementRep: boolean().default(true),
  notifyCustomerRep: boolean().default(false),
  // 状态
  status: varchar({ length: 50 }).default('active').notNull(),
  notes: text(),
  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('supplier_payment_idx_supplier').on(table.supplierId),
  index('supplier_payment_idx_po').on(table.purchaseOrderId),
  index('supplier_payment_idx_project').on(table.projectId),
  index('supplier_payment_idx_status').on(table.status),
]);

// ============================================
// 客户收款跟踪 (Customer Payment Tracking)
// ============================================
export const customerPaymentTracking = pgTable('customer_payment_tracking', {
  id: serial().primaryKey(),
  // 客户/项目关联
  customerId: integer(),
  customerCode: varchar({ length: 50 }),
  customerName: varchar({ length: 200 }).notNull(),
  projectId: integer(),
  projectCode: varchar({ length: 50 }),
  contractNumber: varchar({ length: 50 }),
  // 合同金额
  contractAmount: decimal({ precision: 14, scale: 2 }).notNull(),
  currency: varchar({ length: 3 }).default('CNY'),
  // 付款里程碑
  milestones: text(), // JSON: [{name, percentage, amount, dueDate, invoiceNo, status, paidDate}]
  // 累计
  totalInvoicedAmount: decimal({ precision: 14, scale: 2 }).default('0'),
  totalReceivedAmount: decimal({ precision: 14, scale: 2 }).default('0'),
  remainingAmount: decimal({ precision: 14, scale: 2 }).default('0'),
  // 最近发票
  latestInvoiceNo: varchar({ length: 50 }),
  latestInvoiceDate: timestamp({ mode: 'string' }),
  latestInvoiceAmount: decimal({ precision: 14, scale: 2 }),
  // 逾期
  overdueAmount: decimal({ precision: 14, scale: 2 }).default('0'),
  overdueDays: integer().default(0),
  // 状态
  status: varchar({ length: 50 }).default('active').notNull(),
  notes: text(),
  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('customer_payment_idx_customer').on(table.customerId),
  index('customer_payment_idx_project').on(table.projectId),
  index('customer_payment_idx_status').on(table.status),
]);

// ============================================
// 银行账户注册 (Bank Account Registry)
// ============================================
export const bankAccounts = pgTable('bank_accounts', {
  id: serial().primaryKey(),
  // 账户类型
  accountType: varchar({ length: 50 }).notNull(), // company/supplier/employee/customer
  // 关联实体
  entityId: integer(),
  entityType: varchar({ length: 50 }), // supplier/employee/customer
  entityName: varchar({ length: 200 }),
  // 银行信息
  bankName: varchar({ length: 200 }).notNull(),
  bankBranch: varchar({ length: 200 }),
  accountNumber: varchar({ length: 50 }).notNull(),
  accountName: varchar({ length: 200 }).notNull(),
  swiftCode: varchar({ length: 20 }),
  currency: varchar({ length: 3 }).default('CNY'),
  // 状态
  isDefault: boolean().default(false),
  isActive: boolean().default(true),
  // 审计
  lastUsedAt: timestamp({ mode: 'string' }),
  lastUsedFor: varchar({ length: 200 }),
  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('bank_accounts_idx_entity').on(table.entityType, table.entityId),
  index('bank_accounts_idx_type').on(table.accountType),
]);

// ============================================
// 固定费用管理 (Fixed Expense Management)
// ============================================
export const fixedExpenses = pgTable('fixed_expenses', {
  id: serial().primaryKey(),
  // 费用类型
  expenseCode: varchar({ length: 50 }).notNull(),
  expenseType: varchar({ length: 50 }).notNull(), // rent/utilities/property_mgmt/insurance/telecom/other
  expenseName: varchar({ length: 200 }).notNull(),
  description: text(),
  // 金额
  monthlyAmount: decimal({ precision: 14, scale: 2 }).notNull(),
  annualAmount: decimal({ precision: 14, scale: 2 }),
  currency: varchar({ length: 3 }).default('CNY'),
  // 责任人
  responsiblePersonId: integer().references(() => users.id),
  responsiblePersonName: varchar({ length: 100 }),
  department: varchar({ length: 100 }),
  // 供应商/收款方
  payeeName: varchar({ length: 200 }),
  payeeBankName: varchar({ length: 200 }),
  payeeBankAccount: varchar({ length: 50 }),
  payeeAccountName: varchar({ length: 200 }),
  // 付款周期
  paymentCycle: varchar({ length: 50 }).default('monthly'), // monthly/quarterly/semi_annual/annual
  paymentDueDay: integer().default(25), // day of month
  // 合同
  contractNumber: varchar({ length: 50 }),
  contractStartDate: timestamp({ mode: 'string' }),
  contractEndDate: timestamp({ mode: 'string' }),
  // 审批流程
  approvalRequired: boolean().default(true),
  approvalThreshold: decimal({ precision: 14, scale: 2 }).default('10000'),
  // 报警
  alertBeforeDueDays: integer().default(5),
  // 状态
  isActive: boolean().default(true),
  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('fixed_expenses_uk_code').on(table.expenseCode),
  index('fixed_expenses_idx_type').on(table.expenseType),
  index('fixed_expenses_idx_responsible').on(table.responsiblePersonId),
]);

// ============================================
// 物料盘点单 (Material Inventory Count Sheet)
// ============================================
export const materialInventoryCounts = pgTable('material_inventory_counts', {
  id: serial().primaryKey(),
  // 盘点单号
  countCode: varchar({ length: 50 }).notNull(),
  countDate: timestamp({ mode: 'string' }).notNull(),
  // 盘点范围
  warehouseId: integer(),
  warehouseCode: varchar({ length: 50 }),
  warehouseName: varchar({ length: 200 }),
  projectId: integer(),
  projectCode: varchar({ length: 50 }),
  // 盘点类型
  countType: varchar({ length: 50 }).notNull(), // full/cycle/spot/project_close/year_end
  // 财务关联
  fiscalYear: integer(),
  fiscalPeriod: integer(),
  // 汇总
  totalItems: integer().default(0),
  totalBookValue: decimal({ precision: 14, scale: 2 }).default('0'),
  totalActualValue: decimal({ precision: 14, scale: 2 }).default('0'),
  totalVarianceValue: decimal({ precision: 14, scale: 2 }).default('0'),
  // 盘盈/盘亏
  surplusItems: integer().default(0),
  surplusValue: decimal({ precision: 14, scale: 2 }).default('0'),
  shortageItems: integer().default(0),
  shortageValue: decimal({ precision: 14, scale: 2 }).default('0'),
  matchedItems: integer().default(0),
  // 状态
  status: varchar({ length: 50 }).default('draft').notNull(), // draft/counting/review/finance_review/approved/closed
  // 审批
  countedBy: integer().references(() => users.id),
  countedByName: varchar({ length: 100 }),
  reviewedBy: integer().references(() => users.id),
  financeReviewBy: integer().references(() => users.id),
  approvedBy: integer().references(() => users.id),
  approvedAt: timestamp({ mode: 'string' }),
  // 备注
  notes: text(),
  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('material_inventory_counts_uk_code').on(table.countCode),
  index('material_inventory_counts_idx_warehouse').on(table.warehouseId),
  index('material_inventory_counts_idx_project').on(table.projectId),
  index('material_inventory_counts_idx_status').on(table.status),
  index('material_inventory_counts_idx_type').on(table.countType),
]);

// 盘点明细行
export const materialInventoryCountItems = pgTable('material_inventory_count_items', {
  id: serial().primaryKey(),
  countId: integer().notNull(),
  // 物料信息
  materialId: integer(),
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }).notNull(),
  unit: varchar({ length: 20 }).default('个'),
  // 库位
  locationCode: varchar({ length: 50 }),
  lotNumber: varchar({ length: 50 }),
  // 账面数据
  bookQuantity: decimal({ precision: 10, scale: 2 }).notNull(),
  bookUnitPrice: decimal({ precision: 12, scale: 2 }),
  bookValue: decimal({ precision: 14, scale: 2 }),
  // 实盘数据
  actualQuantity: decimal({ precision: 10, scale: 2 }),
  actualUnitPrice: decimal({ precision: 12, scale: 2 }),
  actualValue: decimal({ precision: 14, scale: 2 }),
  // 差异
  varianceQuantity: decimal({ precision: 10, scale: 2 }),
  varianceValue: decimal({ precision: 14, scale: 2 }),
  varianceReason: text(),
  // 项目归属 (便于项目成本微调)
  projectId: integer(),
  projectCode: varchar({ length: 50 }),
  costCenter: varchar({ length: 50 }),
  // 状态
  status: varchar({ length: 50 }).default('pending'), // pending/counted/reviewed/adjusted
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('material_count_items_idx_count').on(table.countId),
  index('material_count_items_idx_material').on(table.materialCode),
  index('material_count_items_idx_project').on(table.projectId),
]);

// ============================================
// 金蝶迁移批次 (Kingdee Migration Batches)
// ============================================
export const kingdeeMigrationBatches = pgTable('kingdee_migration_batches', {
  id: serial().primaryKey(),
  batchId: varchar({ length: 50 }).notNull(),
  entityType: varchar({ length: 50 }).notNull(), // gl_accounts/vouchers/ap_bills/ar_bills/items/suppliers/customers/inventory/departments/employees
  sourceDatabase: varchar({ length: 100 }).default('AIS20260122124030'),
  status: varchar({ length: 50 }).default('pending'),
  totalRecords: integer().default(0),
  successRecords: integer().default(0),
  failedRecords: integer().default(0),
  skippedRecords: integer().default(0),
  errorLog: text(),
  startedAt: timestamp({ mode: 'string' }).defaultNow(),
  completedAt: timestamp({ mode: 'string' }),
  createdBy: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('kingdee_migration_idx_batch').on(table.batchId),
  index('kingdee_migration_idx_entity').on(table.entityType),
  index('kingdee_migration_idx_status').on(table.status),
]);
