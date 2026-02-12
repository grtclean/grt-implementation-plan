/**
 * v1.7.2 薪酬审批工作流服务
 * Salary Approval Workflow Service
 * 
 * 功能：
 * 1. 审批工作流定义管理（CRUD）
 * 2. 薪酬审批提交与流转（计算→主管审核→HR确认→财务发放）
 * 3. 审批操作（approve/reject/cancel）
 * 4. 审批历史与统计
 * 5. 与通知系统集成
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ============================================================
// 类型定义
// ============================================================

interface WorkflowStep {
  step: number;
  role: string;
  title: string;
  required: boolean;
  description?: string;
}

interface ApprovalHistoryEntry {
  step: number;
  role: string;
  approver: string;
  approverName?: string;
  action: 'approve' | 'reject' | 'cancel' | 'submit';
  comment: string;
  timestamp: number;
}

// ============================================================
// 1. 工作流定义管理
// ============================================================

/** 获取所有审批工作流定义 */
export async function getApprovalWorkflows(activeOnly = true) {
  const db = await requireDb();
  const condition = activeOnly ? sql`WHERE is_active = 1` : sql``;
  const rows = (await db.execute(sql`
    SELECT * FROM salary_approval_workflows ${condition}
    ORDER BY created_at DESC
  `)).rows;
  return (rows as any[]).map(row => ({
    ...row,
    steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps,
  }));
}

/** 获取单个工作流定义 */
export async function getWorkflowById(workflowId: number) {
  const db = await requireDb();
  const rows = (await db.execute(sql`
    SELECT * FROM salary_approval_workflows WHERE id = ${workflowId}
  `)).rows;
  const row = (rows as any[])[0];
  if (!row) return null;
  return {
    ...row,
    steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps,
  };
}

/** 创建审批工作流 */
export async function createApprovalWorkflow(params: {
  workflowName: string;
  workflowCode: string;
  description?: string;
  steps: WorkflowStep[];
  autoTrigger?: boolean;
  triggerCondition?: string;
  createdBy?: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  const result = (await db.execute(sql`
    INSERT INTO salary_approval_workflows
    (workflow_name, workflow_code, description, steps, auto_trigger, trigger_condition, is_active, created_by, created_at)
    VALUES (${params.workflowName}, ${params.workflowCode}, ${params.description || null},
            ${JSON.stringify(params.steps)}, ${params.autoTrigger ? 1 : 0},
            ${params.triggerCondition || null}, 1, ${params.createdBy || null}, ${now})
  `)).rows;
  return { id: (result as any)[0]?.id, created: true };
}

/** 更新审批工作流 */
export async function updateApprovalWorkflow(workflowId: number, params: {
  workflowName?: string;
  description?: string;
  steps?: WorkflowStep[];
  autoTrigger?: boolean;
  triggerCondition?: string;
  isActive?: boolean;
}) {
  const db = await requireDb();
  const now = Date.now();
  const sets: string[] = [];
  const values: any[] = [];

  if (params.workflowName !== undefined) { sets.push('workflow_name = ?'); values.push(params.workflowName); }
  if (params.description !== undefined) { sets.push('description = ?'); values.push(params.description); }
  if (params.steps !== undefined) { sets.push('steps = ?'); values.push(JSON.stringify(params.steps)); }
  if (params.autoTrigger !== undefined) { sets.push('auto_trigger = ?'); values.push(params.autoTrigger ? 1 : 0); }
  if (params.triggerCondition !== undefined) { sets.push('trigger_condition = ?'); values.push(params.triggerCondition); }
  if (params.isActive !== undefined) { sets.push('is_active = ?'); values.push(params.isActive ? 1 : 0); }
  sets.push('updated_at = ?'); values.push(now);

  if (sets.length <= 1) return { updated: false, message: '没有需要更新的字段' };

  await db.execute(sql`
    UPDATE salary_approval_workflows 
    SET ${sql.raw(sets.join(', '))}
    WHERE id = ${workflowId}
  `);
  return { updated: true };
}

// ============================================================
// 2. 审批记录管理
// ============================================================

/** 提交薪酬审批 */
export async function submitSalaryApproval(params: {
  workflowId: number;
  bonusRecordId?: number;
  batchTitle: string;
  periodStart?: number;
  periodEnd?: number;
  totalAmount: number;
  workerCount: number;
  submittedBy?: string;
  submittedByName?: string;
}) {
  const db = await requireDb();
  const now = Date.now();

  // 验证工作流存在且启用
  const workflow = await getWorkflowById(params.workflowId);
  if (!workflow) throw new Error('审批工作流不存在');
  if (!workflow.is_active) throw new Error('审批工作流已停用');

  // 生成批次号
  const batchCode = `SAL-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(now).slice(-6)}`;

  // 初始审批历史
  const initialHistory: ApprovalHistoryEntry[] = [{
    step: 0,
    role: 'submitter',
    approver: params.submittedBy || 'unknown',
    approverName: params.submittedByName,
    action: 'submit',
    comment: '提交审批',
    timestamp: now,
  }];

  const result = (await db.execute(sql`
    INSERT INTO salary_approval_records
    (workflow_id, bonus_record_id, batch_code, batch_title,
     period_start, period_end, total_amount, worker_count,
     current_step, status, approval_history,
     submitted_by, submitted_by_name, submitted_at, created_at)
    VALUES (${params.workflowId}, ${params.bonusRecordId || null},
            ${batchCode}, ${params.batchTitle},
            ${params.periodStart || null}, ${params.periodEnd || null},
            ${params.totalAmount}, ${params.workerCount},
            1, 'in_progress', ${JSON.stringify(initialHistory)},
            ${params.submittedBy || null}, ${params.submittedByName || null},
            ${now}, ${now})
  `)).rows;

  return {
    id: (result as any)[0]?.id,
    batchCode,
    status: 'in_progress',
    currentStep: 1,
    nextApprover: (workflow.steps as WorkflowStep[])[0]?.role || 'unknown',
    message: `审批已提交，等待${(workflow.steps as WorkflowStep[])[0]?.title || '审核'}`,
  };
}

/** 审批操作（approve/reject） */
export async function processApproval(params: {
  recordId: number;
  action: 'approve' | 'reject';
  approver: string;
  approverName?: string;
  comment?: string;
}) {
  const db = await requireDb();
  const now = Date.now();

  // 获取审批记录
  const records = (await db.execute(sql`
    SELECT * FROM salary_approval_records WHERE id = ${params.recordId}
  `)).rows;
  const record = (records as any[])[0];
  if (!record) throw new Error('审批记录不存在');
  if (record.status !== 'in_progress') throw new Error(`当前状态为 ${record.status}，无法操作`);

  // 获取工作流定义
  const workflow = await getWorkflowById(record.workflow_id);
  if (!workflow) throw new Error('关联工作流不存在');

  const steps = workflow.steps as WorkflowStep[];
  const currentStep = record.current_step;
  const currentStepDef = steps.find(s => s.step === currentStep);

  // 更新审批历史
  const history: ApprovalHistoryEntry[] = typeof record.approval_history === 'string'
    ? JSON.parse(record.approval_history)
    : (record.approval_history || []);

  history.push({
    step: currentStep,
    role: currentStepDef?.role || 'unknown',
    approver: params.approver,
    approverName: params.approverName,
    action: params.action,
    comment: params.comment || '',
    timestamp: now,
  });

  if (params.action === 'reject') {
    // 拒绝 → 状态变为rejected
    await db.execute(sql`
      UPDATE salary_approval_records 
      SET status = 'rejected', 
          reject_reason = ${params.comment || '审批拒绝'},
          approval_history = ${JSON.stringify(history)},
          completed_at = ${now},
          completed_by = ${params.approver},
          updated_at = ${now}
      WHERE id = ${params.recordId}
    `);
    return {
      status: 'rejected',
      currentStep,
      message: `审批已被${currentStepDef?.title || '审核人'}拒绝`,
    };
  }

  // 批准 → 检查是否还有下一步
  const nextStep = steps.find(s => s.step === currentStep + 1);

  if (nextStep) {
    // 还有下一步
    await db.execute(sql`
      UPDATE salary_approval_records 
      SET current_step = ${currentStep + 1},
          approval_history = ${JSON.stringify(history)},
          updated_at = ${now}
      WHERE id = ${params.recordId}
    `);
    return {
      status: 'in_progress',
      currentStep: currentStep + 1,
      nextApprover: nextStep.role,
      message: `${currentStepDef?.title || '当前步骤'}已通过，等待${nextStep.title}`,
    };
  } else {
    // 最后一步 → 审批完成
    await db.execute(sql`
      UPDATE salary_approval_records 
      SET status = 'approved',
          current_step = ${currentStep},
          approval_history = ${JSON.stringify(history)},
          completed_at = ${now},
          completed_by = ${params.approver},
          updated_at = ${now}
      WHERE id = ${params.recordId}
    `);
    return {
      status: 'approved',
      currentStep,
      message: '所有审批步骤已完成，薪酬已批准发放',
    };
  }
}

/** 取消审批 */
export async function cancelApproval(params: {
  recordId: number;
  cancelledBy: string;
  reason?: string;
}) {
  const db = await requireDb();
  const now = Date.now();

  const records2 = (await db.execute(sql`
    SELECT * FROM salary_approval_records WHERE id = ${params.recordId}
  `)).rows;
  const record = (records2 as any[])[0];
  if (!record) throw new Error('审批记录不存在');
  if (record.status === 'approved') throw new Error('已批准的审批不能取消');
  if (record.status === 'cancelled') throw new Error('审批已取消');

  const history: ApprovalHistoryEntry[] = typeof record.approval_history === 'string'
    ? JSON.parse(record.approval_history)
    : (record.approval_history || []);

  history.push({
    step: record.current_step,
    role: 'canceller',
    approver: params.cancelledBy,
    action: 'cancel',
    comment: params.reason || '取消审批',
    timestamp: now,
  });

  await db.execute(sql`
    UPDATE salary_approval_records 
    SET status = 'cancelled',
        cancel_reason = ${params.reason || '取消审批'},
        approval_history = ${JSON.stringify(history)},
        completed_at = ${now},
        updated_at = ${now}
    WHERE id = ${params.recordId}
  `);

  return { status: 'cancelled', message: '审批已取消' };
}

// ============================================================
// 3. 查询与统计
// ============================================================

/** 获取审批记录列表 */
export async function getApprovalRecords(params: {
  status?: string;
  workflowId?: number;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const conditions: string[] = [];
  if (params.status) conditions.push(`r.status = '${params.status}'`);
  if (params.workflowId) conditions.push(`r.workflow_id = ${params.workflowId}`);
  if (params.startTime) conditions.push(`r.submitted_at >= ${params.startTime}`);
  if (params.endTime) conditions.push(`r.submitted_at <= ${params.endTime}`);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  const rows = (await db.execute(sql.raw(`
    SELECT r.*, w.workflow_name, w.steps as workflow_steps
    FROM salary_approval_records r
    LEFT JOIN salary_approval_workflows w ON r.workflow_id = w.id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `))).rows;

  const countResult = (await db.execute(sql.raw(`
    SELECT COUNT(*) as total FROM salary_approval_records r ${where}
  `))).rows;

  return {
    records: (rows as any[]).map(row => ({
      ...row,
      approval_history: typeof row.approval_history === 'string' ? JSON.parse(row.approval_history) : row.approval_history,
      workflow_steps: typeof row.workflow_steps === 'string' ? JSON.parse(row.workflow_steps) : row.workflow_steps,
    })),
    total: (countResult as any[])[0]?.total || 0,
    limit,
    offset,
  };
}

/** 获取单个审批记录详情 */
export async function getApprovalDetail(recordId: number) {
  const db = await requireDb();
  const rows = (await db.execute(sql`
    SELECT r.*, w.workflow_name, w.steps as workflow_steps, w.description as workflow_description
    FROM salary_approval_records r
    LEFT JOIN salary_approval_workflows w ON r.workflow_id = w.id
    WHERE r.id = ${recordId}
  `)).rows;
  const row = (rows as any[])[0];
  if (!row) return null;
  return {
    ...row,
    approval_history: typeof row.approval_history === 'string' ? JSON.parse(row.approval_history) : row.approval_history,
    workflow_steps: typeof row.workflow_steps === 'string' ? JSON.parse(row.workflow_steps) : row.workflow_steps,
  };
}

/** 获取审批统计 */
export async function getApprovalStats() {
  const db = await requireDb();
  const rows = (await db.execute(sql`
    SELECT
      status,
      COUNT(*) as count,
      SUM(total_amount) as total_amount,
      SUM(worker_count) as total_workers
    FROM salary_approval_records
    GROUP BY status
  `)).rows;

  const stats: Record<string, { count: number; totalAmount: number; totalWorkers: number }> = {};
  for (const row of rows as any[]) {
    stats[row.status] = {
      count: Number(row.count),
      totalAmount: Number(row.total_amount || 0),
      totalWorkers: Number(row.total_workers || 0),
    };
  }

  // 平均审批时长（已完成的）
  const avgRows = (await db.execute(sql`
    SELECT AVG(completed_at - submitted_at) as avg_duration
    FROM salary_approval_records
    WHERE status IN ('approved', 'rejected') AND completed_at IS NOT NULL AND submitted_at IS NOT NULL
  `)).rows;
  const avgDuration = (avgRows as any[])[0]?.avg_duration || 0;

  return {
    byStatus: stats,
    avgApprovalDurationMs: Number(avgDuration),
    avgApprovalDurationHours: Number(avgDuration) / (1000 * 60 * 60),
  };
}

/** 获取待我审批的记录 */
export async function getPendingApprovalsForRole(role: string) {
  const db = await requireDb();
  
  // 获取所有进行中的审批记录
  const rows = (await db.execute(sql`
    SELECT r.*, w.steps as workflow_steps, w.workflow_name
    FROM salary_approval_records r
    LEFT JOIN salary_approval_workflows w ON r.workflow_id = w.id
    WHERE r.status = 'in_progress'
    ORDER BY r.created_at DESC
  `)).rows;

  // 过滤出当前步骤角色匹配的记录
  const pending = (rows as any[]).filter(row => {
    const steps: WorkflowStep[] = typeof row.workflow_steps === 'string' 
      ? JSON.parse(row.workflow_steps) 
      : row.workflow_steps;
    const currentStepDef = steps.find(s => s.step === row.current_step);
    return currentStepDef?.role === role;
  });

  return pending.map(row => ({
    ...row,
    approval_history: typeof row.approval_history === 'string' ? JSON.parse(row.approval_history) : row.approval_history,
    workflow_steps: typeof row.workflow_steps === 'string' ? JSON.parse(row.workflow_steps) : row.workflow_steps,
  }));
}

export default {
  getApprovalWorkflows,
  getWorkflowById,
  createApprovalWorkflow,
  updateApprovalWorkflow,
  submitSalaryApproval,
  processApproval,
  cancelApproval,
  getApprovalRecords,
  getApprovalDetail,
  getApprovalStats,
  getPendingApprovalsForRole,
};
