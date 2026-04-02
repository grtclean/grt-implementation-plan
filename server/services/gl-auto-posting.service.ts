/**
 * 总账自动过账服务
 * 事件驱动: 业务审批通过 → 自动生成GL分录
 *
 * 触发场景:
 * 1. 报销审批通过 → DR 费用科目 / CR 银行存款
 * 2. 供应商付款执行 → DR 应付账款 / CR 银行存款
 * 3. 客户收款确认 → DR 银行存款 / CR 应收账款
 * 4. 固定资产折旧 → DR 折旧费用 / CR 累计折旧
 * 5. 工资发放 → DR 应付工资 / CR 银行存款
 * 6. 固定费用付款 → DR 管理费用 / CR 银行存款
 * 7. 采购入库 → DR 原材料/库存 / CR 应付账款
 */

import { createChildLogger } from '../lib/logger';

const log = createChildLogger('gl-auto-posting');

export interface GLPostingRequest {
  sourceDocType: string; // reimbursement/supplier_payment/customer_receipt/depreciation/salary/fixed_expense/procurement
  sourceDocId: number;
  sourceDocCode: string;
  description: string;
  amount: number;
  projectCode?: string;
  departmentCode?: string;
  costCenterCode?: string;
  supplierId?: number;
  customerId?: number;
  userId: number;
}

export interface GLPostingResult {
  success: boolean;
  entryCode?: string;
  debitAccountCode: string;
  creditAccountCode: string;
  amount: number;
  message: string;
}

// Default account mapping for auto-posting (configurable)
const ACCOUNT_MAPPING: Record<string, { debit: string; credit: string; description: string }> = {
  // 报销 → 费用科目 / 银行存款
  'reimbursement_travel': { debit: '6602-01', credit: '1002-01', description: '差旅费报销' },
  'reimbursement_procurement': { debit: '6602-02', credit: '1002-01', description: '采购费报销' },
  'reimbursement_entertainment': { debit: '6601-03', credit: '1002-01', description: '业务招待费' },
  'reimbursement_other': { debit: '6602-99', credit: '1002-01', description: '其他费用报销' },

  // 供应商付款 → 应付 / 银行
  'supplier_payment_prepay': { debit: '1123-01', credit: '1002-01', description: '预付供应商货款' },
  'supplier_payment_delivery': { debit: '2202-01', credit: '1002-01', description: '供应商到货付款' },
  'supplier_payment_acceptance': { debit: '2202-01', credit: '1002-01', description: '供应商验收付款' },
  'supplier_payment_warranty': { debit: '2202-02', credit: '1002-01', description: '质保金释放' },

  // 客户收款 → 银行 / 应收
  'customer_receipt': { debit: '1002-01', credit: '1122-01', description: '客户回款' },

  // 折旧 → 折旧费用 / 累计折旧
  'depreciation': { debit: '6602-08', credit: '1602-01', description: '固定资产月度折旧' },

  // 工资 → 应付工资 / 银行
  'salary_payment': { debit: '2211-01', credit: '1002-01', description: '工资发放' },

  // 固定费用 → 管理费用 / 银行
  'fixed_expense_rent': { debit: '6602-04', credit: '1002-01', description: '办公室租金' },
  'fixed_expense_utilities': { debit: '6602-05', credit: '1002-01', description: '水电费' },
  'fixed_expense_property': { debit: '6602-06', credit: '1002-01', description: '物业费' },

  // 采购入库 → 原材料 / 应付
  'procurement_receipt': { debit: '1405-01', credit: '2202-01', description: '原材料采购入库' },
};

/**
 * Generate GL entry code
 */
function generateEntryCode(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `JE-${ym}-${seq}`;
}

/**
 * Create a GL posting from a business event
 */
export function createGLPosting(request: GLPostingRequest): GLPostingResult {
  const mapping = ACCOUNT_MAPPING[request.sourceDocType];

  if (!mapping) {
    log.warn({ sourceDocType: request.sourceDocType }, '未找到科目映射，使用默认管理费用科目');
    return {
      success: false,
      debitAccountCode: '6602-99',
      creditAccountCode: '1002-01',
      amount: request.amount,
      message: `未知单据类型: ${request.sourceDocType}`,
    };
  }

  const entryCode = generateEntryCode();

  log.info({
    entryCode,
    sourceDocType: request.sourceDocType,
    sourceDocCode: request.sourceDocCode,
    amount: request.amount,
    debit: mapping.debit,
    credit: mapping.credit,
    projectCode: request.projectCode,
  }, '自动过账: ' + mapping.description);

  return {
    success: true,
    entryCode,
    debitAccountCode: mapping.debit,
    creditAccountCode: mapping.credit,
    amount: request.amount,
    message: `自动过账成功: ${mapping.description} ¥${request.amount}`,
  };
}

/**
 * Batch post multiple entries (e.g., monthly depreciation for all assets)
 */
export function batchGLPosting(requests: GLPostingRequest[]): GLPostingResult[] {
  log.info({ count: requests.length }, '批量自动过账开始');
  const results = requests.map(createGLPosting);
  const successCount = results.filter(r => r.success).length;
  log.info({ total: requests.length, success: successCount }, '批量自动过账完成');
  return results;
}

/**
 * Get the account mapping configuration (for admin UI)
 */
export function getAccountMappings(): Record<string, { debit: string; credit: string; description: string }> {
  return { ...ACCOUNT_MAPPING };
}

/**
 * Resolve which posting type to use based on reimbursement type
 */
export function resolveReimbursementPostingType(reimbursementType: string): string {
  const map: Record<string, string> = {
    'travel': 'reimbursement_travel',
    'procurement': 'reimbursement_procurement',
    'entertainment': 'reimbursement_entertainment',
    'material': 'reimbursement_procurement',
    'other': 'reimbursement_other',
  };
  return map[reimbursementType] || 'reimbursement_other';
}

/**
 * Resolve which posting type to use based on payment stage
 */
export function resolvePaymentPostingType(paymentStage: string): string {
  const map: Record<string, string> = {
    'prepayment': 'supplier_payment_prepay',
    'delivery': 'supplier_payment_delivery',
    'acceptance': 'supplier_payment_acceptance',
    'warranty_release': 'supplier_payment_warranty',
  };
  return map[paymentStage] || 'supplier_payment_delivery';
}

/**
 * Resolve fixed expense posting type
 */
export function resolveFixedExpensePostingType(expenseType: string): string {
  const map: Record<string, string> = {
    'rent': 'fixed_expense_rent',
    'utilities': 'fixed_expense_utilities',
    'property_mgmt': 'fixed_expense_property',
  };
  return map[expenseType] || 'fixed_expense_rent';
}
