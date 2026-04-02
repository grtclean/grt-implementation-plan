/**
 * 财务角色解析服务
 * 从 financeRoleAssignments 表动态查询角色负责人
 * 替代硬编码的人员名称
 */

import { createChildLogger } from '../lib/logger';

const log = createChildLogger('finance-role');

// In-memory cache of role assignments (refreshed every 5 minutes)
let roleCache: Map<string, RoleAssignment[]> = new Map();
let roleCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export interface RoleAssignment {
  roleCode: string;
  roleName: string;
  userId: number;
  userName: string;
  buCode: string | null;
  amountThreshold: number | null;
  isActive: boolean;
}

// Default assignments (used before DB is loaded or as fallback)
const DEFAULT_ASSIGNMENTS: RoleAssignment[] = [
  { roleCode: 'finance_specialist', roleName: '财务专员(报销初审)', userId: 0, userName: '王汝月', buCode: null, amountThreshold: null, isActive: true },
  { roleCode: 'finance_reviewer', roleName: '财务复核', userId: 0, userName: '王秀萍', buCode: null, amountThreshold: null, isActive: true },
  { roleCode: 'finance_approver', roleName: '高级财务审批(>10K)', userId: 0, userName: '倪微薇', buCode: null, amountThreshold: null, isActive: true },
  { roleCode: 'cashier', roleName: '出纳/银行执行', userId: 0, userName: '黄晓兰', buCode: null, amountThreshold: null, isActive: true },
  { roleCode: 'payroll_submitter', roleName: '工资提交人(保密)', userId: 0, userName: '倪微薇', buCode: null, amountThreshold: null, isActive: true },
  { roleCode: 'payroll_executor', roleName: '工资审核执行(保密)', userId: 0, userName: '黄晓兰', buCode: null, amountThreshold: null, isActive: true },
];

/**
 * Get the assigned user for a finance role
 * @param roleCode - the role to resolve
 * @param buCode - optional BU scope (null for global roles)
 * @param amount - optional amount for threshold-based routing
 */
export function resolveRole(
  roleCode: string,
  buCode?: string | null,
  amount?: number
): RoleAssignment | null {
  const assignments = getAssignments();

  // First try BU-specific assignment
  if (buCode) {
    const buMatch = assignments.find(a =>
      a.roleCode === roleCode && a.buCode === buCode && a.isActive &&
      (a.amountThreshold === null || amount === undefined || amount <= a.amountThreshold)
    );
    if (buMatch) return buMatch;
  }

  // Fall back to global assignment
  const globalMatch = assignments.find(a =>
    a.roleCode === roleCode && a.buCode === null && a.isActive &&
    (a.amountThreshold === null || amount === undefined || amount <= a.amountThreshold)
  );

  return globalMatch || null;
}

/**
 * Get all assignments for a role
 */
export function resolveAllForRole(roleCode: string): RoleAssignment[] {
  return getAssignments().filter(a => a.roleCode === roleCode && a.isActive);
}

/**
 * Resolve the approval chain for a reimbursement
 * Returns ordered list of approvers based on amount
 */
export function resolveReimbursementChain(amount: number, buCode?: string): RoleAssignment[] {
  const chain: RoleAssignment[] = [];

  // Step 1: Finance specialist (initial review)
  const specialist = resolveRole('finance_specialist', buCode);
  if (specialist) chain.push(specialist);

  // Step 2: Finance reviewer (secondary review)
  const reviewer = resolveRole('finance_reviewer', buCode);
  if (reviewer) chain.push(reviewer);

  // Step 3: Director approval (if amount > 10,000)
  if (amount > 10000) {
    const approver = resolveRole('finance_approver', buCode, amount);
    if (approver) chain.push(approver);
  }

  // Step 4: Cashier (bank execution)
  const cashier = resolveRole('cashier', buCode);
  if (cashier) chain.push(cashier);

  return chain;
}

/**
 * Resolve the large asset acceptance chain
 */
export function resolveLargeAssetChain(buCode?: string): string[] {
  return [
    'pre_acceptance',       // 预验收
    'user_dept_approval',   // 使用部门批准
    'quality_approval',     // 质量部门批准
    'procurement_confirm',  // 采购工程师确认(附验收证明)
    'bu_manager_approval',  // 事业部经理批准
    'procurement_manager',  // 采购经理最终确认
    'finance_confirm',      // 王秀萍确认付款合规
    'cashier_execute',      // 黄晓兰银行执行
  ];
}

/**
 * Refresh cache from database
 */
export function refreshCache(dbAssignments: RoleAssignment[]): void {
  roleCache.clear();
  for (const a of dbAssignments) {
    const key = `${a.roleCode}:${a.buCode || 'global'}`;
    if (!roleCache.has(key)) roleCache.set(key, []);
    roleCache.get(key)!.push(a);
  }
  roleCacheTime = Date.now();
  log.info({ count: dbAssignments.length }, '财务角色缓存已刷新');
}

function getAssignments(): RoleAssignment[] {
  if (roleCache.size > 0 && Date.now() - roleCacheTime < CACHE_TTL) {
    const all: RoleAssignment[] = [];
    roleCache.forEach(v => all.push(...v));
    return all;
  }
  return DEFAULT_ASSIGNMENTS;
}
