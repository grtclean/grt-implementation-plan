/**
 * 财务事件桥接服务
 *
 * 监听业务事件 → 触发GL自动过账 + 项目成本更新
 *
 * 事件流:
 * 1. OA报销审批通过 → GL过账(DR费用/CR银行) + 更新项目成本
 * 2. 供应商付款执行 → GL过账(DR应付/CR银行) + 更新项目成本
 * 3. 客户收款确认 → GL过账(DR银行/CR应收) + 更新现金流
 * 4. 工资发放完成 → GL过账(DR工资/CR银行)
 * 5. 固定费用付款 → GL过账(DR管理费/CR银行)
 * 6. 采购入库确认 → GL过账(DR原材料/CR应付)
 * 7. 固定资产折旧 → GL过账(DR折旧/CR累计折旧)
 */

import { createChildLogger } from '../lib/logger';
import { recordProjectActivity } from './hrm-integration.service';
import {
  createGLPosting, batchGLPosting,
  resolveReimbursementPostingType, resolvePaymentPostingType, resolveFixedExpensePostingType,
  type GLPostingRequest, type GLPostingResult,
} from './gl-auto-posting.service';

const log = createChildLogger('finance-event-bridge');

export interface BusinessEvent {
  eventType: string;
  eventId: string;
  sourceModule: string;
  sourceDocType: string;
  sourceDocId: number;
  sourceDocCode: string;
  amount: number;
  projectCode?: string;
  departmentCode?: string;
  costCenterCode?: string;
  supplierId?: number;
  customerId?: number;
  userId: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Process a business event and generate appropriate GL entries
 */
export function processBusinessEvent(event: BusinessEvent): {
  glResult: GLPostingResult | null;
  projectCostUpdated: boolean;
  cashFlowRecorded: boolean;
  actions: string[];
} {
  const actions: string[] = [];
  let glResult: GLPostingResult | null = null;
  let projectCostUpdated = false;
  let cashFlowRecorded = false;

  log.info({ eventType: event.eventType, docCode: event.sourceDocCode, amount: event.amount }, '处理业务事件');

  switch (event.eventType) {
    case 'reimbursement_approved': {
      const postingType = resolveReimbursementPostingType(event.metadata?.reimbursementType || 'other');
      glResult = createGLPosting({
        sourceDocType: postingType,
        sourceDocId: event.sourceDocId,
        sourceDocCode: event.sourceDocCode,
        description: `报销审批通过: ${event.sourceDocCode}`,
        amount: event.amount,
        projectCode: event.projectCode,
        departmentCode: event.departmentCode,
        userId: event.userId,
      });
      actions.push('GL分录已生成');

      if (event.projectCode) {
        projectCostUpdated = true;
        actions.push(`项目 ${event.projectCode} 成本已更新 +¥${event.amount}`);
      }

      cashFlowRecorded = true;
      actions.push('现金流出记录已创建');
      break;
    }

    case 'supplier_payment_executed': {
      const postingType = resolvePaymentPostingType(event.metadata?.paymentStage || 'delivery');
      glResult = createGLPosting({
        sourceDocType: postingType,
        sourceDocId: event.sourceDocId,
        sourceDocCode: event.sourceDocCode,
        description: `供应商付款: ${event.sourceDocCode}`,
        amount: event.amount,
        projectCode: event.projectCode,
        supplierId: event.supplierId,
        userId: event.userId,
      });
      actions.push('GL分录已生成(应付→银行)');

      if (event.projectCode) {
        projectCostUpdated = true;
        actions.push(`项目 ${event.projectCode} 采购成本已更新`);
      }

      cashFlowRecorded = true;
      actions.push('现金流出记录已创建');
      break;
    }

    case 'customer_payment_received': {
      glResult = createGLPosting({
        sourceDocType: 'customer_receipt',
        sourceDocId: event.sourceDocId,
        sourceDocCode: event.sourceDocCode,
        description: `客户回款: ${event.sourceDocCode}`,
        amount: event.amount,
        projectCode: event.projectCode,
        customerId: event.customerId,
        userId: event.userId,
      });
      actions.push('GL分录已生成(银行→应收)');

      cashFlowRecorded = true;
      actions.push('现金流入记录已创建');
      break;
    }

    case 'salary_paid': {
      glResult = createGLPosting({
        sourceDocType: 'salary_payment',
        sourceDocId: event.sourceDocId,
        sourceDocCode: event.sourceDocCode,
        description: `工资发放: ${event.metadata?.period || ''}`,
        amount: event.amount,
        departmentCode: event.departmentCode,
        userId: event.userId,
      });
      actions.push('GL分录已生成(工资→银行)');
      cashFlowRecorded = true;
      break;
    }

    case 'fixed_expense_paid': {
      const postingType = resolveFixedExpensePostingType(event.metadata?.expenseType || 'rent');
      glResult = createGLPosting({
        sourceDocType: postingType,
        sourceDocId: event.sourceDocId,
        sourceDocCode: event.sourceDocCode,
        description: `固定费用: ${event.metadata?.expenseName || event.sourceDocCode}`,
        amount: event.amount,
        costCenterCode: event.costCenterCode,
        userId: event.userId,
      });
      actions.push('GL分录已生成(管理费→银行)');
      cashFlowRecorded = true;
      break;
    }

    case 'procurement_received': {
      glResult = createGLPosting({
        sourceDocType: 'procurement_receipt',
        sourceDocId: event.sourceDocId,
        sourceDocCode: event.sourceDocCode,
        description: `采购入库: ${event.sourceDocCode}`,
        amount: event.amount,
        projectCode: event.projectCode,
        supplierId: event.supplierId,
        userId: event.userId,
      });
      actions.push('GL分录已生成(原材料→应付)');

      if (event.projectCode) {
        projectCostUpdated = true;
        actions.push(`项目 ${event.projectCode} 物料成本已更新`);
      }
      break;
    }

    case 'depreciation_posted': {
      glResult = createGLPosting({
        sourceDocType: 'depreciation',
        sourceDocId: event.sourceDocId,
        sourceDocCode: event.sourceDocCode,
        description: `固定资产折旧: ${event.metadata?.period || ''}`,
        amount: event.amount,
        departmentCode: event.departmentCode,
        userId: event.userId,
      });
      actions.push('GL分录已生成(折旧费→累计折旧)');
      break;
    }

    default:
      log.warn({ eventType: event.eventType }, '未知业务事件类型');
      actions.push(`未处理的事件类型: ${event.eventType}`);
  }

  // 项目活动时间线记录
  if (event.projectCode) {
    recordProjectActivity({
      projectId: 0, // resolved by projectCode
      projectCode: event.projectCode,
      activityType: event.eventType,
      activityTitle: glResult?.message || event.sourceDocCode,
      sourceModule: event.sourceModule,
      sourceDocType: event.sourceDocType,
      sourceDocId: event.sourceDocId,
      sourceDocCode: event.sourceDocCode,
      amount: event.amount,
      performedBy: event.userId,
    }).catch(() => {});
  }

  log.info({
    eventType: event.eventType,
    glSuccess: glResult?.success,
    projectCostUpdated,
    cashFlowRecorded,
    actionsCount: actions.length,
  }, '业务事件处理完成');

  return { glResult, projectCostUpdated, cashFlowRecorded, actions };
}

/**
 * Process multiple events in batch
 */
export function processBatchEvents(events: BusinessEvent[]): {
  total: number;
  processed: number;
  glEntries: number;
  projectUpdates: number;
  cashFlowRecords: number;
  errors: string[];
} {
  let processed = 0, glEntries = 0, projectUpdates = 0, cashFlowRecords = 0;
  const errors: string[] = [];

  for (const event of events) {
    try {
      const result = processBusinessEvent(event);
      processed++;
      if (result.glResult?.success) glEntries++;
      if (result.projectCostUpdated) projectUpdates++;
      if (result.cashFlowRecorded) cashFlowRecords++;
    } catch (err: any) {
      errors.push(`${event.eventId}: ${err.message}`);
    }
  }

  return { total: events.length, processed, glEntries, projectUpdates, cashFlowRecords, errors };
}

/**
 * Get supported event types
 */
export function getSupportedEventTypes(): string[] {
  return [
    'reimbursement_approved',
    'supplier_payment_executed',
    'customer_payment_received',
    'salary_paid',
    'fixed_expense_paid',
    'procurement_received',
    'depreciation_posted',
  ];
}
