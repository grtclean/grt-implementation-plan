/**
 * Agent安全沙箱服务 — Zero Trust模式
 *
 * L1-L4自动化分级:
 * L1 只读查询 — Agent只能读取已授权的数据，不能写入
 * L2 建议辅助 — Agent可生成建议/草稿，必须人工确认后执行
 * L3 受控执行 — Agent可自动执行低风险操作，高风险需HITL
 * L4 全自动 — Agent可自主执行(仅限预定义安全操作)
 *
 * HITL节点: 高风险操作强制人工确认
 * SQL注入防护: Agent生成的查询必须通过参数化检查
 */

import { createChildLogger } from '../lib/logger';

const log = createChildLogger('agent-security');

export type AutomationLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface AgentPermissionBoundary {
  agentCode: string;
  automationLevel: AutomationLevel;
  allowedReadTables: string[];
  allowedWriteTables: string[];
  forbiddenTables: string[]; // 绝对禁止访问
  maxWriteRowsPerExecution: number;
  requireHITL: boolean; // 是否需要人工确认
  hitlTriggers: string[]; // 触发HITL的条件
  allowedBuCodes: string[]; // BU数据隔离
}

// Default permission boundaries per agent category
const AGENT_PERMISSIONS: Record<string, AgentPermissionBoundary> = {
  'quotation_assistant': {
    agentCode: 'quotation_assistant',
    automationLevel: 'L2',
    allowedReadTables: ['materials', 'project_cost_benchmarks', 'bom_masters', 'bom_items', 'suppliers'],
    allowedWriteTables: [], // L2: no writes, suggestions only
    forbiddenTables: ['payroll_ledgers', 'salary_structures', 'gl_entries', 'bank_accounts'],
    maxWriteRowsPerExecution: 0,
    requireHITL: true,
    hitlTriggers: ['bom_generation', 'price_suggestion'],
    allowedBuCodes: ['*'], // all BUs
  },
  'payroll_calculator': {
    agentCode: 'payroll_calculator',
    automationLevel: 'L3',
    allowedReadTables: ['salary_structures', 'attendance_records', 'performance_evaluations', 'payroll_ledgers'],
    allowedWriteTables: ['payroll_ledgers', 'payroll_approval_logs'],
    forbiddenTables: ['gl_accounts', 'gl_entries', 'bank_accounts', 'users'], // 不能直接操作GL和用户表
    maxWriteRowsPerExecution: 200,
    requireHITL: true,
    hitlTriggers: ['salary_calculation_complete', 'bonus_adjustment', 'deduction_override'],
    allowedBuCodes: ['*'],
  },
  'finance_auditor': {
    agentCode: 'finance_auditor',
    automationLevel: 'L2',
    allowedReadTables: ['gl_entries', 'account_balances', 'expense_claims', 'project_reimbursements', 'cost_records'],
    allowedWriteTables: ['finance_alert_instances'], // can create alerts only
    forbiddenTables: ['payroll_ledgers', 'salary_structures', 'bank_accounts'],
    maxWriteRowsPerExecution: 50,
    requireHITL: false,
    hitlTriggers: ['anomaly_detected', 'threshold_breach'],
    allowedBuCodes: ['*'],
  },
  'sop_generator': {
    agentCode: 'sop_generator',
    automationLevel: 'L2',
    allowedReadTables: ['knowledge_assets', 'knowledge_vector_chunks', 'sop_templates'],
    allowedWriteTables: [], // suggestions only
    forbiddenTables: ['payroll_ledgers', 'gl_entries', 'bank_accounts', 'users'],
    maxWriteRowsPerExecution: 0,
    requireHITL: true,
    hitlTriggers: ['sop_draft_generated'],
    allowedBuCodes: ['*'],
  },
  'alert_scanner': {
    agentCode: 'alert_scanner',
    automationLevel: 'L4',
    allowedReadTables: ['finance_alert_rules', 'project_reimbursements', 'supplier_payment_tracking', 'customer_payment_tracking', 'labor_cost_pools'],
    allowedWriteTables: ['finance_alert_instances'],
    forbiddenTables: ['payroll_ledgers', 'gl_entries', 'bank_accounts'],
    maxWriteRowsPerExecution: 100,
    requireHITL: false,
    hitlTriggers: [],
    allowedBuCodes: ['*'],
  },
};

/**
 * Validate an agent's data access request against its permission boundary
 */
export function validateAgentAccess(
  agentCode: string,
  tableName: string,
  accessType: 'read' | 'write',
  buCode?: string
): { allowed: boolean; reason?: string } {
  const boundary = AGENT_PERMISSIONS[agentCode];
  if (!boundary) {
    return { allowed: false, reason: `Agent ${agentCode} 未注册权限边界` };
  }

  // Check forbidden tables (absolute block)
  if (boundary.forbiddenTables.includes(tableName)) {
    log.warn({ agentCode, tableName, accessType }, 'Agent尝试访问禁止表 — 已拦截');
    return { allowed: false, reason: `表 ${tableName} 对 Agent ${agentCode} 绝对禁止访问` };
  }

  // Check BU isolation
  if (buCode && !boundary.allowedBuCodes.includes('*') && !boundary.allowedBuCodes.includes(buCode)) {
    return { allowed: false, reason: `Agent ${agentCode} 无权访问 BU ${buCode} 的数据` };
  }

  // Check read access
  if (accessType === 'read') {
    if (!boundary.allowedReadTables.includes(tableName) && !boundary.allowedReadTables.includes('*')) {
      return { allowed: false, reason: `Agent ${agentCode} 无 ${tableName} 表的读取权限` };
    }
    return { allowed: true };
  }

  // Check write access
  if (accessType === 'write') {
    if (boundary.automationLevel === 'L1' || boundary.automationLevel === 'L2') {
      return { allowed: false, reason: `Agent ${agentCode} 为 ${boundary.automationLevel} 级，不允许写入操作` };
    }
    if (!boundary.allowedWriteTables.includes(tableName)) {
      return { allowed: false, reason: `Agent ${agentCode} 无 ${tableName} 表的写入权限` };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: '未知访问类型' };
}

/**
 * Check if HITL is required for an agent action
 */
export function requiresHITL(agentCode: string, actionType: string): boolean {
  const boundary = AGENT_PERMISSIONS[agentCode];
  if (!boundary) return true; // Unknown agent always needs HITL
  if (boundary.requireHITL) return true;
  return boundary.hitlTriggers.includes(actionType);
}

/**
 * Validate SQL query safety (prevent injection from agent-generated queries)
 */
export function validateQuerySafety(query: string): { safe: boolean; reason?: string } {
  const dangerousPatterns = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE)\s/i,
    /--/,
    /\/\*/,
    /xp_cmdshell/i,
    /EXEC\s*\(/i,
    /UNION\s+SELECT/i,
    /INTO\s+OUTFILE/i,
    /LOAD_FILE/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      log.error({ query: query.substring(0, 200) }, 'Agent SQL注入尝试已拦截');
      return { safe: false, reason: `检测到危险SQL模式: ${pattern.source}` };
    }
  }

  return { safe: true };
}

/**
 * Get permission boundary for an agent
 */
export function getAgentBoundary(agentCode: string): AgentPermissionBoundary | null {
  return AGENT_PERMISSIONS[agentCode] || null;
}

/**
 * List all registered agent boundaries
 */
export function listAgentBoundaries(): AgentPermissionBoundary[] {
  return Object.values(AGENT_PERMISSIONS);
}
