/**
 * 三单匹配引擎 (Three-Way Matching)
 * PO采购订单 ↔ GRN收货单 ↔ Invoice发票
 *
 * 匹配规则:
 * - 金额容差: ±1% 或 ±100元(取较小值)
 * - 数量容差: ±2%
 * - 完全匹配: 三单金额/数量一致
 * - 部分匹配: 收货数量 < PO数量(分批到货)
 * - 异常: 超量收货、价格偏差、无PO收货
 */

import { createChildLogger } from '../lib/logger';

const log = createChildLogger('bill-matching');

export interface MatchInput {
  poNumber: string;
  poAmount: number;
  poQuantity: number;
  receiptNumber?: string;
  receiptAmount?: number;
  receiptQuantity?: number;
  invoiceNumber?: string;
  invoiceAmount?: number;
  invoiceTaxAmount?: number;
}

export interface MatchResult {
  poNumber: string;
  matchStatus: 'full_match' | 'partial_match' | 'quantity_mismatch' | 'price_mismatch' | 'no_receipt' | 'no_invoice' | 'exception';
  quantityVariance: number;
  amountVariance: number;
  variancePercent: number;
  canPay: boolean;
  blockReason?: string;
  details: string;
}

/**
 * Perform three-way match for a payment request
 */
export function performMatch(input: MatchInput): MatchResult {
  const result: MatchResult = {
    poNumber: input.poNumber,
    matchStatus: 'exception',
    quantityVariance: 0,
    amountVariance: 0,
    variancePercent: 0,
    canPay: false,
    details: '',
  };

  // Check receipt exists
  if (!input.receiptNumber || input.receiptQuantity === undefined) {
    result.matchStatus = 'no_receipt';
    result.blockReason = '未找到收货记录';
    result.details = `PO ${input.poNumber} 无对应收货单`;
    return result;
  }

  // Check invoice exists
  if (!input.invoiceNumber || input.invoiceAmount === undefined) {
    result.matchStatus = 'no_invoice';
    result.blockReason = '未找到发票';
    result.details = `PO ${input.poNumber} 无对应发票`;
    return result;
  }

  // Quantity check (PO vs Receipt)
  result.quantityVariance = input.receiptQuantity - input.poQuantity;
  const qtyVariancePercent = Math.abs(result.quantityVariance) / input.poQuantity * 100;

  if (qtyVariancePercent > 2) {
    result.matchStatus = 'quantity_mismatch';
    result.blockReason = `数量偏差 ${qtyVariancePercent.toFixed(1)}% 超过2%容差`;
    result.details = `PO数量=${input.poQuantity}, 收货数量=${input.receiptQuantity}`;
    return result;
  }

  // Amount check (PO vs Invoice, excluding tax)
  const invoiceExTax = input.invoiceAmount - (input.invoiceTaxAmount || 0);
  result.amountVariance = invoiceExTax - input.poAmount;
  result.variancePercent = Math.abs(result.amountVariance) / input.poAmount * 100;
  const amountTolerance = Math.min(input.poAmount * 0.01, 100);

  if (Math.abs(result.amountVariance) > amountTolerance) {
    result.matchStatus = 'price_mismatch';
    result.blockReason = `金额偏差 ¥${Math.abs(result.amountVariance).toFixed(2)} 超过容差 ¥${amountTolerance.toFixed(2)}`;
    result.details = `PO金额=${input.poAmount}, 发票不含税=${invoiceExTax}`;
    return result;
  }

  // Partial match check
  if (input.receiptQuantity < input.poQuantity) {
    result.matchStatus = 'partial_match';
    result.canPay = true;
    result.details = `部分到货: 收货${input.receiptQuantity}/${input.poQuantity}, 可按到货比例付款`;
    return result;
  }

  // Full match
  result.matchStatus = 'full_match';
  result.canPay = true;
  result.details = '三单匹配通过: PO↔收货↔发票 金额数量一致';
  log.info({ poNumber: input.poNumber }, '三单匹配通过');
  return result;
}

/**
 * Batch match for multiple POs
 */
export function batchMatch(inputs: MatchInput[]): MatchResult[] {
  return inputs.map(performMatch);
}

/**
 * Get match summary statistics
 */
export function getMatchSummary(results: MatchResult[]): {
  total: number;
  fullMatch: number;
  partialMatch: number;
  exceptions: number;
  canPayCount: number;
  blockedCount: number;
} {
  return {
    total: results.length,
    fullMatch: results.filter(r => r.matchStatus === 'full_match').length,
    partialMatch: results.filter(r => r.matchStatus === 'partial_match').length,
    exceptions: results.filter(r => !r.canPay).length,
    canPayCount: results.filter(r => r.canPay).length,
    blockedCount: results.filter(r => !r.canPay).length,
  };
}
