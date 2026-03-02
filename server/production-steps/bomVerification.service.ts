/**
 * v1.7.0 物料流转与BOM自动校验服务
 * BOM Verification Service
 * 
 * 功能：
 * 1. 物料进入下一工序前自动校验BOM清单
 * 2. 校验不通过自动拦截和通知
 * 3. 放行审批流程
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("bom-verification");

const PROCESS_NAMES: Record<string, string> = {
  T1: '机加工', T2: '冷作', T3: '机械部件装配', T4: '机械装配', T5: '机械总装',
  T6: '电气装配', T7: '设备调试', T8: '跑和', T9: '包装', T10: '发货',
  T11: '卸车', T12: '就位', T13: '水电气连接', T14: '现场调试', T15: '终验收',
};

// ============================================================
// 1. BOM校验记录管理
// ============================================================

/** 创建BOM校验记录 */
export async function createBomVerification(params: {
  projectId: string;
  fromProcess: string;
  toProcess: string;
  materialFlowId?: number;
  verifiedBy?: string;
  verifiedByName?: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  const result = (await db.execute(sql`
    INSERT INTO bom_verification_records
    (project_id, from_process, to_process, material_flow_id,
     verification_status, total_items, verified_items, missing_items, extra_items, pass_rate,
     verified_by, verified_by_name, created_at, updated_at)
    VALUES (${params.projectId}, ${params.fromProcess}, ${params.toProcess},
            ${params.materialFlowId || null},
            'pending', 0, 0, 0, 0, 0,
            ${params.verifiedBy || null}, ${params.verifiedByName || null},
            ${now}, ${now})
  `)).rows;

  return { id: (result as any)[0]?.id, status: 'pending', createdAt: now };
}

/** 获取BOM校验记录列表 */
export async function getBomVerifications(projectId: string, options?: {
  fromProcess?: string;
  toProcess?: string;
  status?: string;
}) {
  const db = await requireDb();
  
  if (options?.status) {
    const rows = (await db.execute(sql`
      SELECT * FROM bom_verification_records
      WHERE project_id = ${projectId} AND verification_status = ${options.status}
      ORDER BY created_at DESC
    `)).rows;
    return rows;
  }

  if (options?.fromProcess) {
    const rows = (await db.execute(sql`
      SELECT * FROM bom_verification_records
      WHERE project_id = ${projectId} AND from_process = ${options.fromProcess}
      ORDER BY created_at DESC
    `)).rows;
    return rows;
  }

  const rows = (await db.execute(sql`
    SELECT * FROM bom_verification_records
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
  `)).rows;
  return rows;
}

/** 获取单个BOM校验记录详情（含清单项） */
export async function getBomVerificationDetail(verificationId: number) {
  const db = await requireDb();
  
  const records = (await db.execute(sql`
    SELECT * FROM bom_verification_records WHERE id = ${verificationId}
  `)).rows;
  const record = (records as any[])[0];
  if (!record) return null;

  const items = (await db.execute(sql`
    SELECT * FROM bom_checklist_items
    WHERE verification_id = ${verificationId}
    ORDER BY is_critical DESC, material_code ASC
  `)).rows;

  return { ...record, items: items as any[] };
}

// ============================================================
// 2. BOM校验清单项管理
// ============================================================

/** 批量添加BOM校验清单项 */
export async function addBomChecklistItems(verificationId: number, items: Array<{
  projectId: string;
  processCode: string;
  materialCode: string;
  materialName: string;
  materialSpec?: string;
  requiredQty: number;
  isCritical?: boolean;
}>) {
  const db = await requireDb();
  const now = Date.now();
  
  for (const item of items) {
    await db.execute(sql`
      INSERT INTO bom_checklist_items 
      (verification_id, project_id, process_code, material_code, material_name,
       material_spec, required_qty, actual_qty, check_status, is_critical, created_at)
      VALUES (${verificationId}, ${item.projectId}, ${item.processCode},
              ${item.materialCode}, ${item.materialName},
              ${item.materialSpec || null}, ${item.requiredQty}, 0,
              'pending', ${item.isCritical ? 1 : 0}, ${now})
    `);
  }
  
  // 更新校验记录的总项数
  await db.execute(sql`
    UPDATE bom_verification_records SET 
      total_items = ${items.length},
      updated_at = ${now}
    WHERE id = ${verificationId}
  `);
  
  return { added: items.length };
}

/** 更新单个清单项的检查状态 */
export async function updateChecklistItemStatus(itemId: number, params: {
  checkStatus: 'pending' | 'present' | 'missing' | 'excess' | 'wrong_spec';
  actualQty?: number;
  remarks?: string;
  checkedBy?: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  await db.execute(sql`
    UPDATE bom_checklist_items SET
      check_status = ${params.checkStatus},
      actual_qty = ${params.actualQty ?? 0},
      remarks = ${params.remarks || null},
      checked_by = ${params.checkedBy || null},
      checked_at = ${now}
    WHERE id = ${itemId}
  `);
  
  // 获取该项所属的校验记录ID
  const itemRows = (await db.execute(sql`
    SELECT verification_id FROM bom_checklist_items WHERE id = ${itemId}
  `)).rows;
  const verificationId = (itemRows as any[])[0]?.verification_id;
  
  if (verificationId) {
    await recalculateVerificationStats(verificationId);
  }
  
  return { success: true };
}

/** 批量更新清单项状态 */
export async function batchUpdateChecklistItems(items: Array<{
  id: number;
  checkStatus: string;
  actualQty?: number;
  remarks?: string;
  checkedBy?: string;
}>) {
  const db = await requireDb();
  const now = Date.now();
  let verificationId: number | null = null;
  
  for (const item of items) {
    await db.execute(sql`
      UPDATE bom_checklist_items SET
        check_status = ${item.checkStatus},
        actual_qty = ${item.actualQty ?? 0},
        remarks = ${item.remarks || null},
        checked_by = ${item.checkedBy || null},
        checked_at = ${now}
      WHERE id = ${item.id}
    `);
    
    if (!verificationId) {
      const rows = (await db.execute(sql`
        SELECT verification_id FROM bom_checklist_items WHERE id = ${item.id}
      `)).rows;
      verificationId = (rows as any[])[0]?.verification_id;
    }
  }
  
  if (verificationId) {
    await recalculateVerificationStats(verificationId);
  }
  
  return { updated: items.length };
}

/** 重新计算校验记录的统计数据 */
async function recalculateVerificationStats(verificationId: number) {
  const db = await requireDb();
  const now = Date.now();
  
  const stats = (await db.execute(sql`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN check_status != 'pending' THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN check_status = 'missing' THEN 1 ELSE 0 END) as missing,
      SUM(CASE WHEN check_status = 'excess' THEN 1 ELSE 0 END) as extra
    FROM bom_checklist_items
    WHERE verification_id = ${verificationId}
  `)).rows;

  const s = (stats as any[])[0];
  const total = s?.total || 0;
  const verified = s?.verified || 0;
  const missing = s?.missing || 0;
  const extra = s?.extra || 0;
  const passRate = total > 0 ? ((verified - missing - extra) / total * 100) : 0;
  
  await db.execute(sql`
    UPDATE bom_verification_records SET
      total_items = ${total},
      verified_items = ${verified},
      missing_items = ${missing},
      extra_items = ${extra},
      pass_rate = ${Math.max(0, passRate).toFixed(2)},
      updated_at = ${now}
    WHERE id = ${verificationId}
  `);
}

// ============================================================
// 3. BOM自动校验流程
// ============================================================

/** 
 * 执行BOM自动校验
 * 在物料从一个工序流转到下一个工序时自动触发
 */
export async function executeBomVerification(params: {
  verificationId: number;
  projectId: string;
  fromProcess: string;
  toProcess: string;
  verifiedBy?: string;
  verifiedByName?: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  // 获取校验清单项
  const items = (await db.execute(sql`
    SELECT * FROM bom_checklist_items
    WHERE verification_id = ${params.verificationId}
  `)).rows;
  const checkItems = items as any[];
  
  if (checkItems.length === 0) {
    return { 
      status: 'passed', 
      message: '无BOM清单项需要校验',
      totalItems: 0,
      missingItems: 0,
    };
  }
  
  // 检查是否所有项都已验证
  const pendingItems = checkItems.filter(i => i.check_status === 'pending');
  if (pendingItems.length > 0) {
    return {
      status: 'incomplete',
      message: `还有${pendingItems.length}项未完成校验`,
      totalItems: checkItems.length,
      pendingItems: pendingItems.length,
    };
  }
  
  // 统计校验结果
  const missingItems = checkItems.filter(i => i.check_status === 'missing');
  const criticalMissing = missingItems.filter(i => i.is_critical);
  const wrongSpecItems = checkItems.filter(i => i.check_status === 'wrong_spec');
  
  // 判断校验结果
  let verificationStatus: string;
  let message: string;
  
  if (criticalMissing.length > 0) {
    verificationStatus = 'failed';
    message = `关键物料缺失${criticalMissing.length}项，不允许流转`;
  } else if (missingItems.length > 0 || wrongSpecItems.length > 0) {
    verificationStatus = 'failed';
    message = `物料缺失${missingItems.length}项，规格不符${wrongSpecItems.length}项`;
  } else {
    verificationStatus = 'passed';
    message = '所有BOM清单项校验通过';
  }
  
  // 更新校验记录状态
  await db.execute(sql`
    UPDATE bom_verification_records SET
      verification_status = ${verificationStatus},
      verified_by = ${params.verifiedBy || null},
      verified_by_name = ${params.verifiedByName || null},
      verified_at = ${now},
      updated_at = ${now}
    WHERE id = ${params.verificationId}
  `);
  
  // 校验不通过时发送通知
  if (verificationStatus === 'failed') {
    const missingNames = missingItems.map(i => i.material_name).join('、');
    
    try {
      await notifyOwner({
        title: `⚠️ BOM校验不通过 - ${PROCESS_NAMES[params.fromProcess]}→${PROCESS_NAMES[params.toProcess]}`,
        content: `项目 ${params.projectId}\n从 ${params.fromProcess} 到 ${params.toProcess} 的物料流转BOM校验不通过。\n${message}\n缺失物料：${missingNames || '无'}\n请及时处理。`,
      });
    } catch (e) {
      log.error({ err: e }, '[BomVerification] Notification error:');
    }
  }
  
  return {
    status: verificationStatus,
    message,
    totalItems: checkItems.length,
    missingItems: missingItems.length,
    criticalMissing: criticalMissing.length,
    wrongSpecItems: wrongSpecItems.length,
  };
}

/** 放行审批（即使校验不通过也允许流转） */
export async function waiveBomVerification(params: {
  verificationId: number;
  waivedBy: string;
  waivedReason: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  await db.execute(sql`
    UPDATE bom_verification_records SET
      verification_status = 'waived',
      waived_by = ${params.waivedBy},
      waived_reason = ${params.waivedReason},
      waived_at = ${now},
      updated_at = ${now}
    WHERE id = ${params.verificationId}
  `);
  
  return { success: true, message: '已放行' };
}

/** 获取BOM校验统计概览 */
export async function getBomVerificationStats(projectId: string) {
  const db = await requireDb();
  
  const stats = (await db.execute(sql`
    SELECT
      COUNT(*) as total_verifications,
      SUM(CASE WHEN verification_status = 'passed' THEN 1 ELSE 0 END) as passed,
      SUM(CASE WHEN verification_status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN verification_status = 'waived' THEN 1 ELSE 0 END) as waived,
      SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
      AVG(CASE WHEN verification_status != 'pending' THEN pass_rate ELSE NULL END) as avg_pass_rate
    FROM bom_verification_records
    WHERE project_id = ${projectId}
  `)).rows;

  // 获取各工序的校验情况
  const processStats = (await db.execute(sql`
    SELECT
      from_process, to_process,
      COUNT(*) as total,
      SUM(CASE WHEN verification_status = 'passed' THEN 1 ELSE 0 END) as passed,
      SUM(CASE WHEN verification_status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM bom_verification_records
    WHERE project_id = ${projectId}
    GROUP BY from_process, to_process
    ORDER BY from_process
  `)).rows;

  return {
    summary: (stats as any[])[0] || {},
    byProcess: processStats as any[],
  };
}

/** 获取清单项列表 */
export async function getChecklistItems(verificationId: number) {
  const db = await requireDb();
  const rows = (await db.execute(sql`
    SELECT * FROM bom_checklist_items
    WHERE verification_id = ${verificationId}
    ORDER BY is_critical DESC, material_code ASC
  `)).rows;
  return rows;
}
