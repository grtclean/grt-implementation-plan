/**
 * GRT 5.0 总账核心 + 固定资产 + 税务发票 Schema
 *
 * P0-1: 总账 (GL) — glAccounts, glEntries, accountBalances
 * P0-2: 固定资产 — fixedAssets, assetDepreciation, assetDisposal
 * P0-3: 税务发票 — taxInvoices
 * P0-4: 角色配置 — financeRoleAssignments
 * 附加: 成本中心, 期末结账, 辅助核算维度
 */

import { pgTable, serial, integer, varchar, text, timestamp, decimal, boolean, index, unique } from 'drizzle-orm/pg-core';
import { users } from './schema';

// ═══════════════════════════════════════════════════════════════
// P0-1: General Ledger (总账)
// ═══════════════════════════════════════════════════════════════

/**
 * 会计科目表 — mirrors Kingdee t_Account
 * 4-level hierarchy: 1xxx 资产 / 2xxx 负债 / 3xxx 权益 / 4xxx 收入 / 5xxx 费用 / 6xxx 成本
 */
export const glAccounts = pgTable('gl_accounts', {
  id: serial().primaryKey(),
  accountCode: varchar({ length: 20 }).notNull(),
  accountName: varchar({ length: 200 }).notNull(),

  // 科目层级
  parentAccountId: integer(), // self-ref to gl_accounts.id
  level: integer().notNull().default(1), // 1-4

  // 科目类型
  accountType: varchar({ length: 50 }).notNull(), // asset/liability/equity/revenue/expense/cost
  balanceDirection: varchar({ length: 10 }).notNull(), // debit/credit

  // 明细标记 — only detail accounts can post
  isDetailAccount: boolean().default(true),

  // 科目分组
  accountGroup: varchar({ length: 50 }), // 1001=现金, 1002=银行存款, etc.

  // Kingdee ERP legacy
  erpLegacyCode: varchar({ length: 50 }), // Kingdee FNumber preserved

  isActive: boolean().default(true),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('gl_accounts_uk_account_code').on(table.accountCode),
  index('gl_accounts_idx_parent').on(table.parentAccountId),
  index('gl_accounts_idx_account_type').on(table.accountType),
  index('gl_accounts_idx_is_active').on(table.isActive),
]);

/**
 * 总账分录/凭证
 * entryCode format: JE-YYYYMM-NNNN
 */
export const glEntries = pgTable('gl_entries', {
  id: serial().primaryKey(),
  entryCode: varchar({ length: 50 }).notNull(), // JE-YYYYMM-NNNN

  // 凭证日期与会计期间
  voucherDate: timestamp({ mode: 'string' }).notNull(),
  fiscalYear: integer().notNull(),
  fiscalPeriod: integer().notNull(), // 1-12

  // 期间内顺序号
  voucherNumber: integer(), // sequential within period

  // 科目
  accountId: integer().notNull(), // ref gl_accounts
  accountCode: varchar({ length: 20 }),

  // 借贷金额
  debitAmount: decimal({ precision: 14, scale: 2 }).default('0'),
  creditAmount: decimal({ precision: 14, scale: 2 }).default('0'),

  // 摘要
  description: text().notNull(),

  // ─── 辅助核算维度 ───
  projectCode: varchar({ length: 50 }),
  departmentCode: varchar({ length: 50 }),
  supplierId: integer(),
  customerId: integer(),
  costCenterCode: varchar({ length: 50 }),

  // 来源单据
  sourceDocType: varchar({ length: 50 }), // reimbursement/payment/receipt/depreciation/accrual/manual/migration
  sourceDocId: integer(),
  sourceDocCode: varchar({ length: 50 }),

  // 过账状态
  isPosted: boolean().default(false),
  postedAt: timestamp({ mode: 'string' }),
  postedBy: integer(), // ref users

  // 冲销
  isReversed: boolean().default(false),
  reversalEntryId: integer(),

  // Kingdee ERP legacy
  erpLegacyVoucherId: varchar({ length: 50 }), // Kingdee FVoucherID

  createdBy: integer(), // ref users
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('gl_entries_uk_entry_code').on(table.entryCode),
  index('gl_entries_idx_account_id').on(table.accountId),
  index('gl_entries_idx_fiscal_period').on(table.fiscalYear, table.fiscalPeriod),
  index('gl_entries_idx_project_code').on(table.projectCode),
  index('gl_entries_idx_voucher_date').on(table.voucherDate),
  index('gl_entries_idx_source_doc').on(table.sourceDocType, table.sourceDocId),
]);

/**
 * 科目余额快照 — per period
 * Period 0 = opening balance, 1-12 = monthly
 */
export const accountBalances = pgTable('account_balances', {
  id: serial().primaryKey(),
  accountId: integer().notNull(), // ref gl_accounts
  accountCode: varchar({ length: 20 }),

  fiscalYear: integer().notNull(),
  fiscalPeriod: integer().notNull(), // 0=opening, 1-12=monthly

  // 余额
  beginBalance: decimal({ precision: 14, scale: 2 }).default('0'),
  periodDebit: decimal({ precision: 14, scale: 2 }).default('0'),
  periodCredit: decimal({ precision: 14, scale: 2 }).default('0'),
  endBalance: decimal({ precision: 14, scale: 2 }).default('0'),

  // 可选维度
  projectCode: varchar({ length: 50 }),
  costCenterCode: varchar({ length: 50 }),

  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  // Unique per account+period+dimension combination
  unique('account_balances_uk_composite').on(
    table.accountId,
    table.fiscalYear,
    table.fiscalPeriod,
    table.projectCode,
    table.costCenterCode,
  ),
  index('account_balances_idx_fiscal_period').on(table.fiscalYear, table.fiscalPeriod),
  index('account_balances_idx_account_id').on(table.accountId),
]);

// ═══════════════════════════════════════════════════════════════
// P0-2: Fixed Assets (固定资产)
// ═══════════════════════════════════════════════════════════════

/**
 * 固定资产卡片
 * assetCode format: FA-{CAT}-{YYYY}-{NNN}
 */
export const fixedAssets = pgTable('fixed_assets', {
  id: serial().primaryKey(),
  assetCode: varchar({ length: 50 }).notNull(), // FA-{CAT}-{YYYY}-{NNN}
  assetName: varchar({ length: 200 }).notNull(),
  description: text(),

  // 资产分类
  assetCategory: varchar({ length: 50 }).notNull(), // it_equipment/office_equipment/production_equipment/vehicle/building/other

  // 购置信息
  acquisitionDate: timestamp({ mode: 'string' }).notNull(),
  acquisitionCost: decimal({ precision: 14, scale: 2 }).notNull(),
  salvageValue: decimal({ precision: 14, scale: 2 }).default('0'),
  salvageRate: decimal({ precision: 5, scale: 2 }).default('5'), // 残值率%

  // 折旧参数
  usefulLifeMonths: integer().notNull(), // 使用年限(月)
  depreciationMethod: varchar({ length: 50 }).default('straight_line'), // straight_line/declining_balance/units_of_production

  // 累计折旧与净值
  accumulatedDepreciation: decimal({ precision: 14, scale: 2 }).default('0'),
  netBookValue: decimal({ precision: 14, scale: 2 }), // computed: cost - accumulated

  // 归属
  departmentCode: varchar({ length: 50 }),
  costCenterCode: varchar({ length: 50 }),
  responsiblePersonId: integer(), // ref users
  responsiblePersonName: varchar({ length: 100 }),
  location: varchar({ length: 200 }),

  // 采购关联
  purchaseOrderId: integer(),
  supplierId: integer(),
  invoiceNumber: varchar({ length: 50 }),

  // 项目关联
  projectCode: varchar({ length: 50 }),

  // GL关联
  glAccountCode: varchar({ length: 20 }), // asset GL account
  depreciationGlAccountCode: varchar({ length: 20 }), // depreciation expense account
  accumulatedDepreciationGlAccountCode: varchar({ length: 20 }),

  // 状态
  status: varchar({ length: 50 }).default('active'), // active/fully_depreciated/disposed/impaired

  // ERP legacy
  erpLegacyCode: varchar({ length: 50 }),

  createdBy: integer(), // ref users
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('fixed_assets_uk_asset_code').on(table.assetCode),
  index('fixed_assets_idx_asset_category').on(table.assetCategory),
  index('fixed_assets_idx_status').on(table.status),
  index('fixed_assets_idx_department_code').on(table.departmentCode),
]);

/**
 * 每月折旧记录
 */
export const assetDepreciation = pgTable('asset_depreciation', {
  id: serial().primaryKey(),
  assetId: integer().notNull(), // ref fixed_assets
  assetCode: varchar({ length: 50 }),

  fiscalYear: integer(),
  fiscalPeriod: integer(),

  depreciationAmount: decimal({ precision: 14, scale: 2 }).notNull(),
  accumulatedAfter: decimal({ precision: 14, scale: 2 }).notNull(),
  netBookValueAfter: decimal({ precision: 14, scale: 2 }).notNull(),

  glEntryId: integer(), // link to GL posting

  status: varchar({ length: 50 }).default('calculated'), // calculated/posted/reversed

  calculatedAt: timestamp({ mode: 'string' }),
  postedAt: timestamp({ mode: 'string' }),
}, (table) => [
  index('asset_depreciation_idx_asset_id').on(table.assetId),
  index('asset_depreciation_idx_fiscal_period').on(table.fiscalYear, table.fiscalPeriod),
]);

/**
 * 资产处置
 */
export const assetDisposal = pgTable('asset_disposal', {
  id: serial().primaryKey(),
  assetId: integer().notNull(), // ref fixed_assets
  assetCode: varchar({ length: 50 }),

  disposalDate: timestamp({ mode: 'string' }).notNull(),
  disposalMethod: varchar({ length: 50 }), // sale/scrap/donation/transfer
  disposalAmount: decimal({ precision: 14, scale: 2 }).default('0'), // proceeds
  netBookValueAtDisposal: decimal({ precision: 14, scale: 2 }),
  gainOrLoss: decimal({ precision: 14, scale: 2 }), // computed

  buyerName: varchar({ length: 200 }),
  buyerContact: varchar({ length: 100 }),
  reason: text(),

  approvedBy: integer(), // ref users
  approvedAt: timestamp({ mode: 'string' }),

  glEntryId: integer(), // link to GL posting

  status: varchar({ length: 50 }).default('pending'), // pending/approved/completed

  createdBy: integer(), // ref users
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('asset_disposal_idx_asset_id').on(table.assetId),
  index('asset_disposal_idx_status').on(table.status),
]);

// ═══════════════════════════════════════════════════════════════
// P0-3: Tax Invoices (增值税发票管理)
// ═══════════════════════════════════════════════════════════════

/**
 * 增值税发票管理
 * Covers both 进项 (input) and 销项 (output) invoices
 */
export const taxInvoices = pgTable('tax_invoices', {
  id: serial().primaryKey(),
  invoiceNumber: varchar({ length: 50 }).notNull(),
  invoiceCode: varchar({ length: 20 }), // 发票代码

  invoiceType: varchar({ length: 50 }).notNull(), // special_vat/general_vat/electronic/receipt
  direction: varchar({ length: 10 }).notNull(), // input(进项)/output(销项)
  invoiceDate: timestamp({ mode: 'string' }).notNull(),

  // 交易对方
  counterpartyName: varchar({ length: 200 }).notNull(),
  counterpartyTaxId: varchar({ length: 50 }),

  // 金额
  taxAmount: decimal({ precision: 14, scale: 2 }).notNull(),
  taxExclusiveAmount: decimal({ precision: 14, scale: 2 }).notNull(),
  taxInclusiveAmount: decimal({ precision: 14, scale: 2 }).notNull(),
  taxRate: decimal({ precision: 5, scale: 2 }).notNull(), // 13/9/6/3/0

  // 明细行 — JSON array
  items: text(), // [{name, spec, unit, qty, unitPrice, amount, taxRate, taxAmount}]

  // 业务关联
  projectCode: varchar({ length: 50 }),
  contractNumber: varchar({ length: 50 }),
  purchaseOrderId: integer(),
  supplierId: integer(),
  customerId: integer(),

  // GL关联
  glEntryId: integer(), // link to GL posting

  // 进项认证
  certificationStatus: varchar({ length: 50 }).default('pending'), // pending/certified/rejected
  certifiedAt: timestamp({ mode: 'string' }),

  // 状态
  status: varchar({ length: 50 }).default('draft'), // draft/validated/posted/void

  // ERP legacy
  erpLegacyId: varchar({ length: 50 }),

  createdBy: integer(), // ref users
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('tax_invoices_uk_invoice_number').on(table.invoiceNumber),
  index('tax_invoices_idx_direction').on(table.direction),
  index('tax_invoices_idx_invoice_date').on(table.invoiceDate),
  index('tax_invoices_idx_counterparty').on(table.counterpartyName),
  index('tax_invoices_idx_project_code').on(table.projectCode),
  index('tax_invoices_idx_status').on(table.status),
]);

// ═══════════════════════════════════════════════════════════════
// P0-4: Finance Role Assignments (财务角色指派)
// ═══════════════════════════════════════════════════════════════

/**
 * 财务角色指派 — 替代硬编码
 *
 * Default assignments (seed data):
 *   finance_specialist → 王汝月 GRT101 (report initial review)
 *   finance_reviewer   → 王秀萍 GRT054 (secondary review)
 *   finance_approver   → 倪微薇 GRT105 (>10K approval), amountThreshold=null
 *   cashier            → 黄晓兰 GRT002 (bank execution)
 *   payroll_submitter  → 倪微薇 GRT105
 *   payroll_executor   → 黄晓兰 GRT002
 */
export const financeRoleAssignments = pgTable('finance_role_assignments', {
  id: serial().primaryKey(),
  roleCode: varchar({ length: 50 }).notNull(), // finance_specialist/finance_reviewer/finance_approver/cashier/payroll_submitter/payroll_executor/procurement_approver/bu_approver
  roleName: varchar({ length: 100 }).notNull(), // 中文角色名

  userId: integer().notNull(), // ref users
  userName: varchar({ length: 100 }).notNull(),

  buCode: varchar({ length: 50 }), // null=global, specific BU code for BU-scoped roles
  amountThreshold: decimal({ precision: 14, scale: 2 }), // max amount this person can approve, null=unlimited

  isActive: boolean().default(true),

  effectiveDate: timestamp({ mode: 'string' }).notNull(),
  expiryDate: timestamp({ mode: 'string' }), // null=no expiry

  assignedBy: integer(), // ref users
  assignedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),

  notes: text(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('finance_role_assignments_idx_role_bu').on(table.roleCode, table.buCode),
  index('finance_role_assignments_idx_user_id').on(table.userId),
  index('finance_role_assignments_idx_is_active').on(table.isActive),
]);

// ═══════════════════════════════════════════════════════════════
// Additional: Cost Centers (成本中心主数据)
// ═══════════════════════════════════════════════════════════════

/**
 * 成本中心主数据
 */
export const costCenters = pgTable('cost_centers', {
  id: serial().primaryKey(),
  costCenterCode: varchar({ length: 50 }).notNull(),
  costCenterName: varchar({ length: 200 }).notNull(),

  parentCostCenterId: integer(), // self-ref

  buCode: varchar({ length: 50 }),
  departmentCode: varchar({ length: 50 }),
  responsiblePersonId: integer(), // ref users
  responsiblePersonName: varchar({ length: 100 }),

  budgetAmount: decimal({ precision: 14, scale: 2 }),

  isActive: boolean().default(true),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('cost_centers_uk_code').on(table.costCenterCode),
  index('cost_centers_idx_bu_code').on(table.buCode),
  index('cost_centers_idx_is_active').on(table.isActive),
]);

// ═══════════════════════════════════════════════════════════════
// Additional: Period Close (期末结账检查表)
// ═══════════════════════════════════════════════════════════════

/**
 * 期末结账检查表
 * checkItem values: 应收确认/应付确认/折旧计提/工资计提/费用计提/试算平衡/结转损益
 */
export const periodCloseChecklists = pgTable('period_close_checklists', {
  id: serial().primaryKey(),
  fiscalYear: integer().notNull(),
  fiscalPeriod: integer().notNull(),

  checkItem: varchar({ length: 200 }).notNull(), // 应收确认/应付确认/折旧计提/工资计提/费用计提/试算平衡/结转损益

  status: varchar({ length: 50 }).default('pending'), // pending/in_progress/completed/skipped

  completedBy: integer(), // ref users
  completedAt: timestamp({ mode: 'string' }),
  notes: text(),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('period_close_checklists_uk_composite').on(table.fiscalYear, table.fiscalPeriod, table.checkItem),
  index('period_close_checklists_idx_fiscal_period').on(table.fiscalYear, table.fiscalPeriod),
]);

// ============================================
// 新员工学习进度跟踪
// ============================================
export const onboardingTaskCompletions = pgTable('onboarding_task_completions', {
  id: serial().primaryKey(),
  userId: integer().notNull().references(() => users.id),
  taskId: varchar({ length: 50 }).notNull(),
  roleFamily: varchar({ length: 50 }),
  phase: varchar({ length: 50 }),
  score: integer().default(0),
  notes: text(),
  // 经理评审
  managerReviewStatus: varchar({ length: 20 }), // pending_review/reviewed/needs_improvement
  managerReviewerId: integer(),
  managerReviewedAt: timestamp({ mode: 'string' }),
  managerFeedback: text(),
  completedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('onboarding_completions_idx_user').on(table.userId),
  index('onboarding_completions_idx_task').on(table.taskId),
]);

// 定时任务执行日志
export const taskExecutionLogs = pgTable('task_execution_logs', {
  id: serial().primaryKey(),
  taskCode: varchar({ length: 50 }).notNull(),
  taskName: varchar({ length: 200 }),
  status: varchar({ length: 20 }).notNull(), // success/failed/skipped
  durationMs: integer().default(0),
  resultSummary: text(), // JSON
  errorMessage: text(),
  executedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('task_exec_logs_idx_code').on(table.taskCode),
  index('task_exec_logs_idx_status').on(table.status),
  index('task_exec_logs_idx_date').on(table.executedAt),
]);
