/**
 * v1.7.0 质量检查与工序联动服务
 * Quality-Process Interlock Service
 * 
 * 功能：
 * 1. CCD检测严重缺陷时自动暂停后续工序
 * 2. 质量预警通知自动发送给质量工程师
 * 3. 工序解锁审批流程
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("quality-interlock");

// T1-T15工序顺序映射
const PROCESS_ORDER: Record<string, number> = {
  T1: 1, T2: 2, T3: 3, T4: 4, T5: 5,
  T6: 6, T7: 7, T8: 8, T9: 9, T10: 10,
  T11: 11, T12: 12, T13: 13, T14: 14, T15: 15,
};

const PROCESS_NAMES: Record<string, string> = {
  T1: '机加工', T2: '冷作', T3: '机械部件装配', T4: '机械装配', T5: '机械总装',
  T6: '电气装配', T7: '设备调试', T8: '跑和', T9: '包装', T10: '发货',
  T11: '卸车', T12: '就位', T13: '水电气连接', T14: '现场调试', T15: '终验收',
};

// 关键质量检查工序（T5机械总装、T10发货前检查）
const CRITICAL_CHECK_STAGES = ['T5', 'T10', 'T7', 'T14'];

// ============================================================
// 1. 工序锁定管理
// ============================================================

/** 获取工序后续所有工序代码 */
function getDownstreamProcesses(processCode: string): string[] {
  const order = PROCESS_ORDER[processCode];
  if (!order) return [];
  return Object.entries(PROCESS_ORDER)
    .filter(([_, o]) => o > order)
    .map(([code]) => code)
    .sort((a, b) => PROCESS_ORDER[a] - PROCESS_ORDER[b]);
}

/** 当CCD检测发现严重缺陷时，自动锁定后续工序 */
export async function triggerProcessLock(params: {
  projectId: string;
  processCode: string;
  checkResultId?: number;
  defectId?: number;
  severity: 'critical' | 'major' | 'minor';
  reason: string;
  lockedBy?: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  // 只有critical和major级别才自动锁定
  if (params.severity === 'minor') {
    return { locked: false, message: '轻微缺陷不触发工序锁定' };
  }

  const downstreamProcesses = getDownstreamProcesses(params.processCode);
  if (downstreamProcesses.length === 0) {
    return { locked: false, message: '无后续工序需要锁定' };
  }

  // 确定锁定范围：critical锁定所有后续，major只锁定下一个工序
  const processesToLock = params.severity === 'critical' 
    ? downstreamProcesses 
    : [downstreamProcesses[0]];

  const lockedRecords: any[] = [];
  
  for (const targetProcess of processesToLock) {
    // 检查是否已经锁定
    const existing = (await db.execute(sql`
      SELECT id FROM quality_process_locks
      WHERE project_id = ${params.projectId}
        AND locked_process_code = ${targetProcess}
        AND status = 'locked'
      LIMIT 1
    `)).rows;

    if ((existing as any[]).length > 0) continue;

    const lockReason = `${PROCESS_NAMES[params.processCode] || params.processCode}工序检测到${params.severity === 'critical' ? '严重' : '重要'}缺陷：${params.reason}`;

    const result = (await db.execute(sql`
      INSERT INTO quality_process_locks
      (project_id, locked_process_code, trigger_process_code, trigger_check_result_id,
       trigger_defect_id, lock_reason, severity, status, locked_by, locked_at, created_at, updated_at)
      VALUES (${params.projectId}, ${targetProcess}, ${params.processCode},
              ${params.checkResultId || null}, ${params.defectId || null},
              ${lockReason}, ${params.severity}, 'locked',
              ${params.lockedBy || 'system'}, ${now}, ${now}, ${now})
    `)).rows;

    lockedRecords.push({
      id: (result as any)[0]?.id,
      processCode: targetProcess,
      processName: PROCESS_NAMES[targetProcess],
    });
  }

  // 自动发送质量预警通知
  if (lockedRecords.length > 0) {
    const lockedNames = lockedRecords.map(r => `${r.processCode}(${r.processName})`).join('、');
    
    await createQualityAlert({
      projectId: params.projectId,
      processCode: params.processCode,
      alertType: params.severity === 'critical' ? 'defect_critical' : 'defect_major',
      title: `质量缺陷预警 - ${PROCESS_NAMES[params.processCode] || params.processCode}`,
      message: `${params.reason}\n\n已自动锁定后续工序：${lockedNames}\n请质量工程师尽快处理。`,
      severity: params.severity === 'critical' ? 'critical' : 'high',
      recipientRole: 'quality_engineer',
      relatedDefectId: params.defectId,
      relatedCheckResultId: params.checkResultId,
    });

    // 同时发送系统通知
    try {
      await notifyOwner({
        title: `⚠️ 质量预警：${PROCESS_NAMES[params.processCode]}发现${params.severity === 'critical' ? '严重' : '重要'}缺陷`,
        content: `项目 ${params.projectId}\n缺陷描述：${params.reason}\n已锁定工序：${lockedNames}\n请及时处理。`,
      });
    } catch (e) {
      log.error({ err: e }, '[QualityInterlock] Notification error:');
    }
  }

  // 联动排程：阻塞依赖被锁定工序的排程任务 (#45)
  let blockedTaskCount = 0;
  if (lockedRecords.length > 0) {
    const lockedCodes = processesToLock;
    for (const code of lockedCodes) {
      const blockReason = `质量锁定：${PROCESS_NAMES[params.processCode] || params.processCode}发现${params.severity === 'critical' ? '严重' : '重要'}缺陷，工序${code}已被锁定`;
      // Block scheduling tasks whose task_type maps to the locked process code,
      // or whose required_resources / bu_code references the locked process.
      // We match tasks that are pending or scheduled and contain the locked process code.
      await db.execute(sql`
        UPDATE scheduling_tasks SET
          status = 'blocked',
          block_reason = ${blockReason},
          blocked_by_lock_process = ${code},
          updated_at = ${now}
        WHERE status IN ('pending', 'scheduled')
          AND (
            bu_code = ${code}
            OR task_name LIKE ${'%' + code + '%'}
            OR required_resources LIKE ${'%' + code + '%'}
          )
      `);
      // Count affected rows from a separate query for the return value
      const countRows = (await db.execute(sql`
        SELECT COUNT(*) as cnt FROM scheduling_tasks
        WHERE status = 'blocked' AND blocked_by_lock_process = ${code}
      `)).rows;
      blockedTaskCount += Number((countRows as any[])[0]?.cnt || 0);
    }
  }

  return {
    locked: lockedRecords.length > 0,
    lockedCount: lockedRecords.length,
    lockedProcesses: lockedRecords,
    blockedTaskCount,
    message: lockedRecords.length > 0
      ? `已锁定${lockedRecords.length}个后续工序，阻塞${blockedTaskCount}个排程任务`
      : '所有后续工序已处于锁定状态',
  };
}

/** 获取项目的工序锁定状态 */
export async function getProcessLocks(projectId: string, status?: string) {
  const db = await requireDb();
  if (status) {
    const rows = (await db.execute(sql`
      SELECT * FROM quality_process_locks
      WHERE project_id = ${projectId} AND status = ${status}
      ORDER BY locked_at DESC
    `)).rows;
    return rows;
  }
  const rows = (await db.execute(sql`
    SELECT * FROM quality_process_locks
    WHERE project_id = ${projectId}
    ORDER BY FIELD(status, 'locked', 'unlock_requested', 'approved', 'rejected', 'auto_released'), locked_at DESC
  `)).rows;
  return rows;
}

/** 检查工序是否被锁定 */
export async function isProcessLocked(projectId: string, processCode: string): Promise<{ locked: boolean; lockInfo?: any }> {
  const db = await requireDb();
  const rows = (await db.execute(sql`
    SELECT * FROM quality_process_locks
    WHERE project_id = ${projectId}
      AND locked_process_code = ${processCode}
      AND status = 'locked'
    ORDER BY locked_at DESC LIMIT 1
  `)).rows;
  const locks = rows as any[];
  if (locks.length > 0) {
    return { locked: true, lockInfo: locks[0] };
  }
  return { locked: false };
}

/** 申请解锁工序 */
export async function requestUnlock(params: {
  lockId: number;
  requestedBy: string;
  unlockReason: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  // 获取锁定记录
  const lockRows = (await db.execute(sql`
    SELECT * FROM quality_process_locks WHERE id = ${params.lockId} AND status = 'locked'
  `)).rows;
  const lock = (lockRows as any[])[0];
  if (!lock) {
    throw new Error('锁定记录不存在或已处理');
  }

  await db.execute(sql`
    UPDATE quality_process_locks SET
      status = 'unlock_requested',
      unlock_requested_by = ${params.requestedBy},
      unlock_requested_at = ${now},
      unlock_reason = ${params.unlockReason},
      updated_at = ${now}
    WHERE id = ${params.lockId}
  `);

  // 发送解锁申请通知
  await createQualityAlert({
    projectId: lock.project_id,
    processCode: lock.locked_process_code,
    alertType: 'unlock_request',
    title: `工序解锁申请 - ${PROCESS_NAMES[lock.locked_process_code] || lock.locked_process_code}`,
    message: `${params.requestedBy} 申请解锁工序 ${lock.locked_process_code}(${PROCESS_NAMES[lock.locked_process_code]})\n原因：${params.unlockReason}\n原始锁定原因：${lock.lock_reason}`,
    severity: 'medium',
    recipientRole: 'project_manager',
    relatedLockId: params.lockId,
  });

  return { success: true, message: '解锁申请已提交' };
}

/** 审批解锁申请 */
export async function approveUnlock(params: {
  lockId: number;
  approvedBy: string;
  approved: boolean;
  comments?: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  const newStatus = params.approved ? 'approved' : 'rejected';
  
  await db.execute(sql`
    UPDATE quality_process_locks SET
      status = ${newStatus},
      approved_by = ${params.approvedBy},
      approved_at = ${now},
      approval_comments = ${params.comments || null},
      updated_at = ${now}
    WHERE id = ${params.lockId} AND status = 'unlock_requested'
  `);

  // 获取锁定记录信息
  const lockRows2 = (await db.execute(sql`
    SELECT * FROM quality_process_locks WHERE id = ${params.lockId}
  `)).rows;
  const lock = (lockRows2 as any[])[0];

  if (lock) {
    await createQualityAlert({
      projectId: lock.project_id,
      processCode: lock.locked_process_code,
      alertType: params.approved ? 'unlock_approved' : 'unlock_rejected',
      title: `工序解锁${params.approved ? '已批准' : '被拒绝'} - ${PROCESS_NAMES[lock.locked_process_code] || lock.locked_process_code}`,
      message: `工序 ${lock.locked_process_code} 的解锁申请已${params.approved ? '批准' : '被拒绝'}。\n审批人：${params.approvedBy}\n${params.comments ? `审批意见：${params.comments}` : ''}`,
      severity: 'low',
      recipientRole: 'all',
      relatedLockId: params.lockId,
    });

    // 联动排程：批准解锁时恢复被阻塞的排程任务 (#45)
    if (params.approved && lock.locked_process_code) {
      const processCode = lock.locked_process_code as string;
      // Check if there are other active locks on this same process code for the same project
      const otherLocks = (await db.execute(sql`
        SELECT id FROM quality_process_locks
        WHERE project_id = ${lock.project_id}
          AND locked_process_code = ${processCode}
          AND status = 'locked'
          AND id != ${params.lockId}
        LIMIT 1
      `)).rows;

      // Only unblock if no other active locks remain for this process
      if ((otherLocks as any[]).length === 0) {
        await db.execute(sql`
          UPDATE scheduling_tasks SET
            status = 'pending',
            block_reason = ${null},
            blocked_by_lock_process = ${null},
            updated_at = ${now}
          WHERE status = 'blocked'
            AND blocked_by_lock_process = ${processCode}
        `);
      }
    }
  }

  return { success: true, status: newStatus };
}

/** 获取工序锁定状态概览（用于前端仪表盘） */
export async function getProcessLockSummary(projectId: string) {
  const db = await requireDb();
  
  const summary = (await db.execute(sql`
    SELECT
      COUNT(*) as total_locks,
      SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as active_locks,
      SUM(CASE WHEN status = 'unlock_requested' THEN 1 ELSE 0 END) as pending_requests,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_unlocks,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_unlocks,
      SUM(CASE WHEN severity = 'critical' AND status = 'locked' THEN 1 ELSE 0 END) as critical_locks
    FROM quality_process_locks
    WHERE project_id = ${projectId}
  `)).rows;

  // 获取每个工序的锁定状态
  const processStatus = (await db.execute(sql`
    SELECT locked_process_code, status, severity, lock_reason, locked_at
    FROM quality_process_locks
    WHERE project_id = ${projectId} AND status IN ('locked', 'unlock_requested')
    ORDER BY locked_process_code
  `)).rows;

  return {
    summary: (summary as any[])[0] || {},
    lockedProcesses: processStatus as any[],
  };
}

/** 获取因质量锁定而被阻塞的排程任务 (#45) */
export async function getBlockedByQualityTasks(projectId?: string, processCode?: string) {
  const db = await requireDb();

  if (projectId && processCode) {
    const rows = (await db.execute(sql`
      SELECT * FROM scheduling_tasks
      WHERE status = 'blocked'
        AND blocked_by_lock_process IS NOT NULL
        AND (project_id = ${projectId} OR bu_code = ${processCode})
      ORDER BY priority DESC, created_at DESC
    `)).rows;
    return rows as any[];
  }

  if (projectId) {
    const rows = (await db.execute(sql`
      SELECT * FROM scheduling_tasks
      WHERE status = 'blocked'
        AND blocked_by_lock_process IS NOT NULL
        AND project_id = ${projectId}
      ORDER BY priority DESC, created_at DESC
    `)).rows;
    return rows as any[];
  }

  const rows = (await db.execute(sql`
    SELECT * FROM scheduling_tasks
    WHERE status = 'blocked'
      AND blocked_by_lock_process IS NOT NULL
    ORDER BY priority DESC, created_at DESC
  `)).rows;
  return rows as any[];
}

// ============================================================
// 2. 质量预警通知管理
// ============================================================

/** 创建质量预警通知 */
export async function createQualityAlert(params: {
  projectId: string;
  processCode: string;
  alertType: string;
  title: string;
  message: string;
  severity: string;
  recipientRole: string;
  recipientId?: string;
  recipientName?: string;
  relatedLockId?: number;
  relatedDefectId?: number;
  relatedCheckResultId?: number;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  const result = (await db.execute(sql`
    INSERT INTO quality_alert_notifications
    (project_id, process_code, alert_type, title, message, severity,
     recipient_role, recipient_id, recipient_name,
     related_lock_id, related_defect_id, related_check_result_id,
     is_read, is_actioned, created_at)
    VALUES (${params.projectId}, ${params.processCode}, ${params.alertType},
            ${params.title}, ${params.message}, ${params.severity},
            ${params.recipientRole}, ${params.recipientId || null}, ${params.recipientName || null},
            ${params.relatedLockId || null}, ${params.relatedDefectId || null}, ${params.relatedCheckResultId || null},
            0, 0, ${now})
  `)).rows;

  return { id: (result as any)[0]?.id, ...params, createdAt: now };
}

/** 获取质量预警通知列表 */
export async function getQualityAlerts(projectId: string, options?: {
  unreadOnly?: boolean;
  alertType?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const limit = options?.limit || 50;
  
  if (options?.unreadOnly) {
    const rows = (await db.execute(sql`
      SELECT * FROM quality_alert_notifications
      WHERE project_id = ${projectId} AND is_read = 0
      ORDER BY created_at DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  if (options?.alertType) {
    const rows = (await db.execute(sql`
      SELECT * FROM quality_alert_notifications
      WHERE project_id = ${projectId} AND alert_type = ${options.alertType}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  const rows = (await db.execute(sql`
    SELECT * FROM quality_alert_notifications
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `)).rows;
  return rows;
}

/** 标记通知已读 */
export async function markAlertRead(alertId: number) {
  const db = await requireDb();
  const now = Date.now();
  await db.execute(sql`
    UPDATE quality_alert_notifications SET is_read = 1, read_at = ${now} WHERE id = ${alertId}
  `);
  return { success: true };
}

/** 标记通知已处理 */
export async function markAlertActioned(alertId: number, actionTaken: string) {
  const db = await requireDb();
  const now = Date.now();
  await db.execute(sql`
    UPDATE quality_alert_notifications SET 
      is_actioned = 1, actioned_at = ${now}, action_taken = ${actionTaken}
    WHERE id = ${alertId}
  `);
  return { success: true };
}

/** 批量标记已读 */
export async function markAllAlertsRead(projectId: string) {
  const db = await requireDb();
  const now = Date.now();
  await db.execute(sql`
    UPDATE quality_alert_notifications SET is_read = 1, read_at = ${now}
    WHERE project_id = ${projectId} AND is_read = 0
  `);
  return { success: true };
}

/** 获取未读通知数量 */
export async function getUnreadAlertCount(projectId: string) {
  const db = await requireDb();
  const rows = (await db.execute(sql`
    SELECT COUNT(*) as count FROM quality_alert_notifications
    WHERE project_id = ${projectId} AND is_read = 0
  `)).rows;
  return (rows as any[])[0]?.count || 0;
}

// ============================================================
// 3. 质量联动触发器（集成到现有质量检查流程）
// ============================================================

/** 
 * 在提交质量检查结果后自动触发联动
 * 当检查结果为fail且存在critical/major缺陷时自动锁定后续工序
 */
export async function onQualityCheckCompleted(params: {
  projectId: string;
  processCode: string;
  checkResultId: number;
  result: 'pass' | 'fail' | 'conditional_pass' | 'pending';
  defects?: Array<{ id: number; severity: string; description: string }>;
  inspectorId?: string;
}) {
  // 只有检查不通过才触发联动
  if (params.result !== 'fail') {
    return { triggered: false, message: '检查通过，无需联动' };
  }

  // 检查是否在关键检查工序
  const isCriticalStage = CRITICAL_CHECK_STAGES.includes(params.processCode);
  
  // 查找最严重的缺陷
  const criticalDefects = params.defects?.filter(d => d.severity === 'critical') || [];
  const majorDefects = params.defects?.filter(d => d.severity === 'major') || [];
  
  if (criticalDefects.length === 0 && majorDefects.length === 0) {
    // 如果是关键工序，即使没有严重缺陷也发送警告通知
    if (isCriticalStage) {
      await createQualityAlert({
        projectId: params.projectId,
        processCode: params.processCode,
        alertType: 'quality_trend_warning',
        title: `质量趋势预警 - ${PROCESS_NAMES[params.processCode]}`,
        message: `关键工序 ${params.processCode} 检查未通过，请关注质量趋势。`,
        severity: 'medium',
        recipientRole: 'quality_engineer',
        relatedCheckResultId: params.checkResultId,
      });
    }
    return { triggered: false, message: '无严重缺陷，仅发送趋势预警' };
  }

  // 触发工序锁定
  const worstDefect = criticalDefects[0] || majorDefects[0];
  const severity = criticalDefects.length > 0 ? 'critical' as const : 'major' as const;
  
  const lockResult = await triggerProcessLock({
    projectId: params.projectId,
    processCode: params.processCode,
    checkResultId: params.checkResultId,
    defectId: worstDefect?.id,
    severity,
    reason: worstDefect?.description || '质量检查不通过',
    lockedBy: params.inspectorId || 'system',
  });

  return {
    triggered: true,
    severity,
    defectCount: { critical: criticalDefects.length, major: majorDefects.length },
    lockResult,
  };
}
