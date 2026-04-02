/**
 * M12项目成本结转服务
 *
 * 项目进入M12(交付与售后)阶段时:
 * 1. 汇总所有项目成本(人工工时T1-T15, 差旅, 非标外协, 物料, 采购)
 * 2. 对比合同金额计算毛利
 * 3. 生成财务利润分析表
 * 4. 结转至GL(DR项目成本/CR在制品)
 * 5. 触发知识回流(提取变更日志中的工业参数)
 */

import { createChildLogger } from '../lib/logger';

const log = createChildLogger('m12-settlement');

export interface ProjectCostSummary {
  projectCode: string;
  projectName: string;
  buCode: string;
  // Revenue
  contractAmount: number;
  receivedAmount: number;
  outstandingAR: number;
  // Cost breakdown
  materialCost: number;
  laborCost: number;
  laborHours: number;
  t1to15Breakdown: Array<{ stage: string; hours: number; cost: number }>;
  mechanicalCost: number;
  electricalCost: number;
  procurementDeptCost: number;
  travelCost: number;
  subcontractCost: number;
  overheadCost: number;
  totalCost: number;
  // Profit analysis
  grossProfit: number;
  grossMarginPercent: number;
  // Target comparison
  targetCost: number;
  costVariance: number;
  overTargetAmount: number;
  // Timeline
  plannedDurationDays: number;
  actualDurationDays: number;
  scheduleVarianceDays: number;
}

export interface M12SettlementResult {
  projectCode: string;
  settlementDate: string;
  costSummary: ProjectCostSummary;
  glEntriesGenerated: number;
  knowledgeItemsExtracted: number;
  status: 'completed' | 'partial' | 'failed';
  warnings: string[];
  errors: string[];
}

/**
 * Execute M12 cost settlement for a project
 */
export async function settleProjectCosts(
  projectCode: string,
  userId: number
): Promise<M12SettlementResult> {
  log.info({ projectCode }, 'M12成本结转开始');

  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Aggregate all project costs
    const costSummary = await aggregateProjectCosts(projectCode);

    // 2. Validate completeness
    if (costSummary.outstandingAR > 0) {
      warnings.push(`尚有未收款 ¥${costSummary.outstandingAR.toFixed(2)}，建议催收后再结转`);
    }
    if (costSummary.laborHours === 0) {
      warnings.push('无工时记录，请确认T1-T15工时已全部登记');
    }

    // 3. Calculate profit analysis
    costSummary.grossProfit = costSummary.contractAmount - costSummary.totalCost;
    costSummary.grossMarginPercent = costSummary.contractAmount > 0
      ? (costSummary.grossProfit / costSummary.contractAmount) * 100
      : 0;
    costSummary.costVariance = costSummary.totalCost - costSummary.targetCost;
    costSummary.overTargetAmount = Math.max(0, costSummary.costVariance);

    // 4. Generate GL entries (in production: actual GL posting)
    const glEntries = generateSettlementGLEntries(costSummary);

    // 5. Extract knowledge items for KG feedback
    const knowledgeItems = extractKnowledgeItems(projectCode, costSummary);

    log.info({
      projectCode,
      grossProfit: costSummary.grossProfit,
      grossMargin: costSummary.grossMarginPercent.toFixed(1) + '%',
      glEntries: glEntries.length,
      knowledgeItems: knowledgeItems.length,
    }, 'M12成本结转完成');

    return {
      projectCode,
      settlementDate: new Date().toISOString(),
      costSummary,
      glEntriesGenerated: glEntries.length,
      knowledgeItemsExtracted: knowledgeItems.length,
      status: errors.length > 0 ? 'partial' : 'completed',
      warnings,
      errors,
    };
  } catch (err: any) {
    log.error({ err, projectCode }, 'M12成本结转失败');
    return {
      projectCode,
      settlementDate: new Date().toISOString(),
      costSummary: emptyProjectCostSummary(projectCode),
      glEntriesGenerated: 0,
      knowledgeItemsExtracted: 0,
      status: 'failed',
      warnings,
      errors: [err.message],
    };
  }
}

/**
 * Aggregate all costs for a project (would query real DB in production)
 */
async function aggregateProjectCosts(projectCode: string): Promise<ProjectCostSummary> {
  // In production: query from laborCostPools, costRecords, projectReimbursements,
  // supplierPaymentTracking, customerPaymentTracking, etc.
  return {
    projectCode,
    projectName: '',
    buCode: '',
    contractAmount: 0,
    receivedAmount: 0,
    outstandingAR: 0,
    materialCost: 0,
    laborCost: 0,
    laborHours: 0,
    t1to15Breakdown: [],
    mechanicalCost: 0,
    electricalCost: 0,
    procurementDeptCost: 0,
    travelCost: 0,
    subcontractCost: 0,
    overheadCost: 0,
    totalCost: 0,
    grossProfit: 0,
    grossMarginPercent: 0,
    targetCost: 0,
    costVariance: 0,
    overTargetAmount: 0,
    plannedDurationDays: 0,
    actualDurationDays: 0,
    scheduleVarianceDays: 0,
  };
}

function generateSettlementGLEntries(summary: ProjectCostSummary): Array<{ debit: string; credit: string; amount: number; description: string }> {
  const entries = [];
  if (summary.totalCost > 0) {
    entries.push({
      debit: '6401', // 主营业务成本
      credit: '5001', // 生产成本-在制品
      amount: summary.totalCost,
      description: `项目 ${summary.projectCode} M12成本结转`,
    });
  }
  if (summary.contractAmount > 0 && summary.receivedAmount > 0) {
    entries.push({
      debit: '1122', // 应收账款
      credit: '6001', // 主营业务收入
      amount: summary.contractAmount,
      description: `项目 ${summary.projectCode} 收入确认`,
    });
  }
  return entries;
}

function extractKnowledgeItems(projectCode: string, summary: ProjectCostSummary): Array<{ type: string; content: string }> {
  const items = [];
  // Extract lessons learned from cost analysis
  if (summary.overTargetAmount > 0) {
    items.push({
      type: 'cost_lesson',
      content: `项目 ${projectCode} 超目标成本 ¥${summary.overTargetAmount.toFixed(2)}`,
    });
  }
  if (summary.grossMarginPercent < 20) {
    items.push({
      type: 'margin_warning',
      content: `项目 ${projectCode} 毛利率仅 ${summary.grossMarginPercent.toFixed(1)}%，低于20%基准`,
    });
  }
  return items;
}

function emptyProjectCostSummary(projectCode: string): ProjectCostSummary {
  return {
    projectCode, projectName: '', buCode: '',
    contractAmount: 0, receivedAmount: 0, outstandingAR: 0,
    materialCost: 0, laborCost: 0, laborHours: 0, t1to15Breakdown: [],
    mechanicalCost: 0, electricalCost: 0, procurementDeptCost: 0,
    travelCost: 0, subcontractCost: 0, overheadCost: 0, totalCost: 0,
    grossProfit: 0, grossMarginPercent: 0,
    targetCost: 0, costVariance: 0, overTargetAmount: 0,
    plannedDurationDays: 0, actualDurationDays: 0, scheduleVarianceDays: 0,
  };
}
