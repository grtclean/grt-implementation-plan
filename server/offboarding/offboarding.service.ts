/**
 * 员工离职数据管理服务 (Employee Offboarding Service)
 * 
 * 核心功能：
 * 1. 离职记录管理（创建、更新、查询）
 * 2. 工作交接清单管理
 * 3. 绩效归属处理（离职前/后数据标注，主管确认贡献比例）
 * 4. 资产/Profile交接管理
 * 5. 多级审批流程（主管→HR→财务→IT）
 * 6. 离职员工数据查询（按周期过滤，标注已离职）
 */

import { requireDb } from "../db";
import {
  employeeOffboarding,
  offboardingHandoverItems,
  performanceAttribution,
  assetHandover,
  offboardingApprovals,
  offboardingDataQueryLog,
  hrmEmployees,
} from "../../drizzle/schema";
import { eq, and, desc, asc, sql, like, or, inArray, gte, lte } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("offboarding");

// ============================================================
// 通知辅助函数
// ============================================================

const APPROVAL_LEVEL_LABELS: Record<string, string> = {
  supervisor: '主管',
  hr: 'HR人事',
  finance: '财务',
  it: 'IT信息',
};

async function sendOffboardingNotification(title: string, content: string) {
  try {
    await notifyOwner({ title, content });
    log.info({ title }, "Notification sent");
  } catch (error) {
    log.warn({ err: error, title }, "Failed to send notification");
  }
}

// ============================================================
// Types
// ============================================================

export interface CreateOffboardingInput {
  employeeId: number;
  employeeName: string;
  department: string;
  position: string;
  hireDate?: string;
  offboardingDate: string;
  lastWorkingDate: string;
  reason: 'resignation' | 'termination' | 'retirement' | 'contract_end' | 'mutual_agreement' | 'other';
  reasonDetail?: string;
  successorType: 'replacement' | 'new_position' | 'backup' | 'none';
  successorId?: number;
  successorName?: string;
  backupPersonId?: number;
  backupPersonName?: string;
  dataRetentionPolicy?: 'permanent' | 'archive_after_year' | 'archive_after_3years';
  performanceDataHandling?: 'keep_under_original' | 'transfer_to_successor' | 'split_by_date';
  profileHandling?: 'transfer_to_successor' | 'create_new_for_successor' | 'archive';
  phoneHandling?: 'transfer_to_successor' | 'return_to_pool' | 'deactivate';
  companyPhone?: string;
  emailHandling?: 'forward_to_successor' | 'forward_to_manager' | 'auto_reply_then_deactivate' | 'deactivate';
  emailForwardTo?: string;
  emailForwardDuration?: number;
  notes?: string;
  createdBy: number;
}

export interface CreateHandoverItemInput {
  offboardingId: number;
  category: 'project' | 'task' | 'client' | 'document' | 'system_access' | 'knowledge' | 'equipment' | 'other';
  itemName: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  relatedProjectId?: number;
  relatedClientId?: number;
  handoverToId?: number;
  handoverToName?: string;
  notes?: string;
  attachmentUrl?: string;
}

export interface CreatePerformanceAttributionInput {
  offboardingId: number;
  kpiName: string;
  kpiCategory?: string;
  period: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  attributionType: 'pre_departure' | 'post_departure' | 'shared';
  originalEmployeeId: number;
  originalEmployeeName: string;
  originalContributionPercent?: number;
  successorId?: number;
  successorName?: string;
  successorContributionPercent?: number;
  targetValue?: number;
  actualValue?: number;
  unit?: string;
  dataSourceNote?: string;
}

export interface CreateAssetHandoverInput {
  offboardingId: number;
  assetCategory: 'profile' | 'email_account' | 'phone_number' | 'laptop' | 'monitor' | 'access_card' | 'keys' | 'software_license' | 'system_account' | 'cloud_storage' | 'vpn_access' | 'other';
  assetName: string;
  assetDescription?: string;
  assetIdentifier?: string;
  handlingAction: 'transfer_to_successor' | 'return_to_company' | 'deactivate' | 'forward' | 'archive' | 'delete' | 'keep_active_temporary';
  transferToId?: number;
  transferToName?: string;
  temporaryRetainUntil?: string;
  notes?: string;
}

export interface ApprovalDecisionInput {
  approvalId: number;
  decision: 'approved' | 'rejected' | 'returned';
  comments?: string;
  checklistItems?: { item: string; checked: boolean }[];
}

// ============================================================
// 1. 离职记录管理
// ============================================================

/** 创建离职记录 */
export async function createOffboarding(input: CreateOffboardingInput) {
  const db = await requireDb();
  const result = await db.insert(employeeOffboarding).values({
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    department: input.department,
    position: input.position,
    hireDate: input.hireDate || null,
    offboardingDate: input.offboardingDate,
    lastWorkingDate: input.lastWorkingDate,
    reason: input.reason,
    reasonDetail: input.reasonDetail || null,
    successorType: input.successorType,
    successorId: input.successorId || null,
    successorName: input.successorName || null,
    backupPersonId: input.backupPersonId || null,
    backupPersonName: input.backupPersonName || null,
    dataRetentionPolicy: input.dataRetentionPolicy || 'permanent',
    performanceDataHandling: input.performanceDataHandling || 'keep_under_original',
    profileHandling: input.profileHandling || 'archive',
    phoneHandling: input.phoneHandling || 'return_to_pool',
    companyPhone: input.companyPhone || null,
    emailHandling: input.emailHandling || 'forward_to_successor',
    emailForwardTo: input.emailForwardTo || null,
    emailForwardDuration: input.emailForwardDuration || 90,
    notes: input.notes || null,
    createdBy: input.createdBy,
    status: 'draft',
    approvalStatus: 'draft',
  });
  
  const insertId = result[0].insertId;
  
  // 自动创建4级审批记录
  await initializeApprovals(insertId);
  
  // 自动生成默认资产交接项
  await generateDefaultAssetItems(insertId, input);
  
  return { id: insertId, message: '离职记录创建成功' };
}

/** 获取离职记录列表 */
export async function listOffboardings(filters?: {
  status?: string;
  department?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await requireDb();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let conditions: any[] = [];
  if (filters?.status) {
    conditions.push(eq(employeeOffboarding.status, filters.status as any));
  }
  if (filters?.department) {
    conditions.push(eq(employeeOffboarding.department, filters.department));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(employeeOffboarding.employeeName, `%${filters.search}%`),
        like(employeeOffboarding.department, `%${filters.search}%`),
        like(employeeOffboarding.position, `%${filters.search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select()
      .from(employeeOffboarding)
      .where(whereClause)
      .orderBy(desc(employeeOffboarding.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(employeeOffboarding)
      .where(whereClause),
  ]);

  return {
    items,
    total: countResult[0]?.count || 0,
    page,
    pageSize,
  };
}

/** 获取单个离职记录详情 */
export async function getOffboardingDetail(id: number) {
  const db = await requireDb();
  const [record] = await db.select()
    .from(employeeOffboarding)
    .where(eq(employeeOffboarding.id, id))
    .limit(1000);

  if (!record) return null;

  const [handoverItems, perfAttributions, assets, approvals] = await Promise.all([
    db.select().from(offboardingHandoverItems)
      .where(eq(offboardingHandoverItems.offboardingId, id))
      .orderBy(asc(offboardingHandoverItems.id))
      .limit(1000),
    db.select().from(performanceAttribution)
      .where(eq(performanceAttribution.offboardingId, id))
      .orderBy(asc(performanceAttribution.id))
      .limit(1000),
    db.select().from(assetHandover)
      .where(eq(assetHandover.offboardingId, id))
      .orderBy(asc(assetHandover.id))
      .limit(1000),
    db.select().from(offboardingApprovals)
      .where(eq(offboardingApprovals.offboardingId, id))
      .orderBy(asc(offboardingApprovals.approvalOrder))
      .limit(1000),
  ]);

  // 计算交接进度
  const totalHandover = handoverItems.length;
  const completedHandover = handoverItems.filter(i => i.status === 'completed' || i.status === 'verified').length;
  const handoverProgress = totalHandover > 0 ? Math.round((completedHandover / totalHandover) * 100) : 0;

  // 计算资产交接进度
  const totalAssets = assets.length;
  const completedAssets = assets.filter(a => a.status === 'completed' || a.status === 'verified').length;
  const assetProgress = totalAssets > 0 ? Math.round((completedAssets / totalAssets) * 100) : 0;

  // 计算审批进度
  const totalApprovals = approvals.length;
  const completedApprovals = approvals.filter(a => a.decision === 'approved').length;
  const approvalProgress = totalApprovals > 0 ? Math.round((completedApprovals / totalApprovals) * 100) : 0;

  return {
    ...record,
    handoverItems,
    performanceAttributions: perfAttributions,
    assetHandovers: assets,
    approvals,
    progress: {
      handover: { total: totalHandover, completed: completedHandover, percent: handoverProgress },
      assets: { total: totalAssets, completed: completedAssets, percent: assetProgress },
      approval: { total: totalApprovals, completed: completedApprovals, percent: approvalProgress },
    },
  };
}

/** 更新离职记录 */
export async function updateOffboarding(id: number, updates: Partial<CreateOffboardingInput>) {
  const db = await requireDb();
  await db.update(employeeOffboarding)
    .set({
      ...updates,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    } as any)
    .where(eq(employeeOffboarding.id, id));

  return { success: true, message: '离职记录更新成功' };
}

/** 提交离职申请（启动审批流程） */
export async function submitOffboarding(id: number) {
  const db = await requireDb();
  // 更新状态为审批中
  await db.update(employeeOffboarding)
    .set({
      status: 'in_progress',
      approvalStatus: 'pending_supervisor',
    })
    .where(eq(employeeOffboarding.id, id));

  // 激活第一级审批（主管）
  await db.update(offboardingApprovals)
    .set({
      submittedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(
      eq(offboardingApprovals.offboardingId, id),
      eq(offboardingApprovals.approvalOrder, 1)
    ));

  // 获取离职记录详情用于通知
  const [offboardingRecord] = await db.select()
    .from(employeeOffboarding)
    .where(eq(employeeOffboarding.id, id))
    .limit(1000);

  // 发送通知给主管
  await sendOffboardingNotification(
    `📋 离职审批通知 - ${offboardingRecord?.employeeName || '员工'}`,
    `员工 ${offboardingRecord?.employeeName || '(未知)'} (${offboardingRecord?.department || ''} - ${offboardingRecord?.position || ''}) 已提交离职申请，离职日期：${offboardingRecord?.offboardingDate || '待定'}。\n\n请主管尽快审批。\n\n离职原因：${offboardingRecord?.reason || '未说明'}\n继任方式：${offboardingRecord?.successorType || '未指定'}\n继任者：${offboardingRecord?.successorName || '暂无'}`
  );

  return { success: true, message: '离职申请已提交，等待主管审批' };
}

// ============================================================
// 2. 工作交接清单管理
// ============================================================

/** 添加交接项 */
export async function addHandoverItem(input: CreateHandoverItemInput) {
  const db = await requireDb();
  const result = await db.insert(offboardingHandoverItems).values({
    offboardingId: input.offboardingId,
    category: input.category,
    itemName: input.itemName,
    description: input.description || null,
    priority: input.priority || 'medium',
    relatedProjectId: input.relatedProjectId || null,
    relatedClientId: input.relatedClientId || null,
    handoverToId: input.handoverToId || null,
    handoverToName: input.handoverToName || null,
    notes: input.notes || null,
    attachmentUrl: input.attachmentUrl || null,
    status: 'pending',
  });

  return { id: result[0].insertId, message: '交接项添加成功' };
}

/** 批量添加交接项 */
export async function batchAddHandoverItems(items: CreateHandoverItemInput[]) {
  if (items.length === 0) return { count: 0 };
  const db = await requireDb();

  await db.insert(offboardingHandoverItems).values(
    items.map(item => ({
      offboardingId: item.offboardingId,
      category: item.category,
      itemName: item.itemName,
      description: item.description || null,
      priority: item.priority || 'medium',
      relatedProjectId: item.relatedProjectId || null,
      relatedClientId: item.relatedClientId || null,
      handoverToId: item.handoverToId || null,
      handoverToName: item.handoverToName || null,
      notes: item.notes || null,
      attachmentUrl: item.attachmentUrl || null,
      status: 'pending' as const,
    }))
  );

  return { count: items.length, message: `${items.length}个交接项添加成功` };
}

/** 更新交接项状态 */
export async function updateHandoverItemStatus(
  itemId: number,
  status: 'pending' | 'in_progress' | 'completed' | 'verified',
  verifiedBy?: number
) {
  const db = await requireDb();
  const updates: any = { status };
  if (status === 'completed') {
    updates.completionDate = sql`CURRENT_DATE`;
  }
  if (status === 'verified' && verifiedBy) {
    updates.verifiedBy = verifiedBy;
    updates.verifiedAt = sql`CURRENT_TIMESTAMP`;
  }

  await db.update(offboardingHandoverItems)
    .set(updates)
    .where(eq(offboardingHandoverItems.id, itemId));

  return { success: true, message: '交接项状态更新成功' };
}

/** 获取交接清单 */
export async function getHandoverItems(offboardingId: number) {
  const db = await requireDb();
  return db.select()
    .from(offboardingHandoverItems)
    .where(eq(offboardingHandoverItems.offboardingId, offboardingId))
    .orderBy(asc(offboardingHandoverItems.priority), asc(offboardingHandoverItems.id))
    .limit(1000);
}

// ============================================================
// 3. 绩效归属管理
// ============================================================

/** 添加绩效归属记录 */
export async function addPerformanceAttribution(input: CreatePerformanceAttributionInput) {
  const db = await requireDb();
  const result = await db.insert(performanceAttribution).values({
    offboardingId: input.offboardingId,
    kpiName: input.kpiName,
    kpiCategory: input.kpiCategory || null,
    period: input.period,
    periodType: input.periodType,
    attributionType: input.attributionType,
    originalEmployeeId: input.originalEmployeeId,
    originalEmployeeName: input.originalEmployeeName,
    originalContributionPercent: input.originalContributionPercent ?? 100,
    successorId: input.successorId || null,
    successorName: input.successorName || null,
    successorContributionPercent: input.successorContributionPercent ?? 0,
    targetValue: input.targetValue?.toString() || null,
    actualValue: input.actualValue?.toString() || null,
    unit: input.unit || null,
    dataSourceNote: input.dataSourceNote || null,
    status: 'pending_confirmation',
  });

  return { id: result[0].insertId, message: '绩效归属记录添加成功' };
}

/** 主管确认绩效归属 */
export async function confirmPerformanceAttribution(
  id: number,
  confirmedBy: number,
  confirmedByName: string,
  originalContributionPercent: number,
  successorContributionPercent: number,
  confirmationNotes?: string
) {
  // 确保贡献比例合计为100
  if (originalContributionPercent + successorContributionPercent !== 100) {
    throw new Error('离职者和继任者的贡献比例合计必须为100%');
  }

  const db = await requireDb();
  await db.update(performanceAttribution)
    .set({
      confirmedBy,
      confirmedByName,
      confirmedAt: sql`CURRENT_TIMESTAMP`,
      originalContributionPercent,
      successorContributionPercent,
      confirmationNotes: confirmationNotes || null,
      status: 'confirmed',
    })
    .where(eq(performanceAttribution.id, id));

  return { success: true, message: '绩效归属已确认' };
}

/** 自动标注绩效数据（离职前/后） */
export async function autoAnnotatePerformanceData(offboardingId: number) {
  const db = await requireDb();
  const [record] = await db.select()
    .from(employeeOffboarding)
    .where(eq(employeeOffboarding.id, offboardingId))
    .limit(1000);

  if (!record) throw new Error('离职记录不存在');

  // 获取所有未标注的绩效记录
  const pendingRecords = await db.select()
    .from(performanceAttribution)
    .where(and(
      eq(performanceAttribution.offboardingId, offboardingId),
      eq(performanceAttribution.status, 'pending_confirmation')
    ))
    .limit(1000);

  const offboardingDate = new Date(record.offboardingDate);
  let annotatedCount = 0;

  for (const perf of pendingRecords) {
    const periodDate = parsePeriodToDate(perf.period);
    let attributionType: 'pre_departure' | 'post_departure' | 'shared' = 'pre_departure';

    if (periodDate > offboardingDate) {
      attributionType = 'post_departure';
    } else if (isOverlappingPeriod(perf.period, perf.periodType, offboardingDate)) {
      attributionType = 'shared';
    }

    const dataSourceNote = attributionType === 'pre_departure'
      ? `离职前数据 - 由${record.employeeName}在${record.offboardingDate}前完成`
      : attributionType === 'post_departure'
        ? `离职后数据 - 由${record.successorName || '继任者'}在${record.offboardingDate}后接管`
        : `跨期数据 - ${record.employeeName}(离职前)与${record.successorName || '继任者'}(离职后)共同贡献`;

    await db.update(performanceAttribution)
      .set({ attributionType, dataSourceNote })
      .where(eq(performanceAttribution.id, perf.id));

    annotatedCount++;
  }

  return { annotatedCount, message: `${annotatedCount}条绩效记录已自动标注` };
}

/** 获取绩效归属记录 */
export async function getPerformanceAttributions(offboardingId: number) {
  const db = await requireDb();
  return db.select()
    .from(performanceAttribution)
    .where(eq(performanceAttribution.offboardingId, offboardingId))
    .orderBy(desc(performanceAttribution.period))
    .limit(1000);
}

// ============================================================
// 4. 资产/Profile交接管理
// ============================================================

/** 添加资产交接项 */
export async function addAssetHandover(input: CreateAssetHandoverInput) {
  const db = await requireDb();
  const result = await db.insert(assetHandover).values({
    offboardingId: input.offboardingId,
    assetCategory: input.assetCategory,
    assetName: input.assetName,
    assetDescription: input.assetDescription || null,
    assetIdentifier: input.assetIdentifier || null,
    handlingAction: input.handlingAction,
    transferToId: input.transferToId || null,
    transferToName: input.transferToName || null,
    temporaryRetainUntil: input.temporaryRetainUntil || null,
    status: 'pending',
    notes: input.notes || null,
  });

  return { id: result[0].insertId, message: '资产交接项添加成功' };
}

/** 更新资产交接状态 */
export async function updateAssetHandoverStatus(
  itemId: number,
  status: 'pending' | 'in_progress' | 'completed' | 'verified',
  completedBy?: number,
  verifiedBy?: number
) {
  const db = await requireDb();
  const updates: any = { status };
  if (status === 'completed' && completedBy) {
    updates.completedAt = sql`CURRENT_TIMESTAMP`;
    updates.completedBy = completedBy;
  }
  if (status === 'verified' && verifiedBy) {
    updates.verifiedBy = verifiedBy;
    updates.verifiedAt = sql`CURRENT_TIMESTAMP`;
  }

  await db.update(assetHandover)
    .set(updates)
    .where(eq(assetHandover.id, itemId));

  return { success: true, message: '资产交接状态更新成功' };
}

/** 获取资产交接列表 */
export async function getAssetHandovers(offboardingId: number) {
  const db = await requireDb();
  return db.select()
    .from(assetHandover)
    .where(eq(assetHandover.offboardingId, offboardingId))
    .orderBy(asc(assetHandover.id))
    .limit(1000);
}

/** 自动生成默认资产交接项 */
async function generateDefaultAssetItems(offboardingId: number, input: CreateOffboardingInput) {
  const db = await requireDb();
  const defaultItems: CreateAssetHandoverInput[] = [
    {
      offboardingId,
      assetCategory: 'profile',
      assetName: `${input.employeeName}的系统Profile`,
      assetDescription: '员工在系统中的个人资料和配置',
      handlingAction: input.profileHandling === 'transfer_to_successor' ? 'transfer_to_successor' : 'archive',
      transferToId: input.successorId,
      transferToName: input.successorName,
    },
    {
      offboardingId,
      assetCategory: 'email_account',
      assetName: `${input.employeeName}的企业邮箱`,
      assetDescription: `邮件处理方式: ${getEmailHandlingLabel(input.emailHandling || 'forward_to_successor')}`,
      handlingAction: input.emailHandling === 'deactivate' ? 'deactivate' : 'forward',
      transferToId: input.successorId,
      transferToName: input.emailForwardTo || input.successorName,
    },
  ];

  if (input.companyPhone) {
    defaultItems.push({
      offboardingId,
      assetCategory: 'phone_number',
      assetName: `公司电话: ${input.companyPhone}`,
      assetDescription: `电话处理方式: ${getPhoneHandlingLabel(input.phoneHandling || 'return_to_pool')}`,
      assetIdentifier: input.companyPhone,
      handlingAction: input.phoneHandling === 'transfer_to_successor' ? 'transfer_to_successor' : 'return_to_company',
      transferToId: input.phoneHandling === 'transfer_to_successor' ? input.successorId : undefined,
      transferToName: input.phoneHandling === 'transfer_to_successor' ? input.successorName : undefined,
    });
  }

  defaultItems.push({
    offboardingId,
    assetCategory: 'system_account',
    assetName: `${input.employeeName}的系统登录账号`,
    assetDescription: 'GRT系统、外部数据平台等系统账号',
    handlingAction: 'deactivate',
  });

  defaultItems.push({
    offboardingId,
    assetCategory: 'vpn_access',
    assetName: `${input.employeeName}的VPN访问权限`,
    handlingAction: 'deactivate',
  });

  for (const item of defaultItems) {
    await db.insert(assetHandover).values({
      ...item,
      status: 'pending',
    } as any);
  }
}

// ============================================================
// 5. 多级审批流程
// ============================================================

/** 初始化4级审批 */
async function initializeApprovals(offboardingId: number) {
  const db = await requireDb();
  const approvalLevels = [
    { level: 'supervisor' as const, order: 1, role: '直属主管' },
    { level: 'hr' as const, order: 2, role: '人事部门' },
    { level: 'finance' as const, order: 3, role: '财务部门' },
    { level: 'it' as const, order: 4, role: 'IT部门' },
  ];

  for (const level of approvalLevels) {
    await db.insert(offboardingApprovals).values({
      offboardingId,
      approvalLevel: level.level,
      approvalOrder: level.order,
      approverId: 0,
      approverName: `待分配 (${level.role})`,
      approverRole: level.role,
      decision: 'pending',
    });
  }
}

/** 处理审批决定 */
export async function processApprovalDecision(input: ApprovalDecisionInput) {
  const db = await requireDb();
  const [approval] = await db.select()
    .from(offboardingApprovals)
    .where(eq(offboardingApprovals.id, input.approvalId))
    .limit(1000);

  if (!approval) throw new Error('审批记录不存在');

  await db.update(offboardingApprovals)
    .set({
      decision: input.decision,
      comments: input.comments || null,
      checklistItems: input.checklistItems ? JSON.stringify(input.checklistItems) : null,
      decidedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(offboardingApprovals.id, input.approvalId));

  if (input.decision === 'approved') {
    const allApprovals = await db.select()
      .from(offboardingApprovals)
      .where(eq(offboardingApprovals.offboardingId, approval.offboardingId))
      .orderBy(asc(offboardingApprovals.approvalOrder))
      .limit(1000);

    const currentIndex = allApprovals.findIndex(a => a.id === input.approvalId);
    const nextApproval = allApprovals[currentIndex + 1];

    if (nextApproval) {
      const nextStatusMap: Record<string, string> = {
        'hr': 'pending_hr',
        'finance': 'pending_finance',
        'it': 'pending_it',
      };

      await db.update(employeeOffboarding)
        .set({
          approvalStatus: (nextStatusMap[nextApproval.approvalLevel] || 'pending_hr') as any,
        })
        .where(eq(employeeOffboarding.id, approval.offboardingId));

      await db.update(offboardingApprovals)
        .set({ submittedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(offboardingApprovals.id, nextApproval.id));

      // 获取离职记录详情用于通知
      const [offboardingForNotify] = await db.select()
        .from(employeeOffboarding)
        .where(eq(employeeOffboarding.id, approval.offboardingId))
        .limit(1000);

      // 通知下一级审批人
      await sendOffboardingNotification(
        `📋 离职审批通知 - 等待${APPROVAL_LEVEL_LABELS[nextApproval.approvalLevel] || nextApproval.approvalLevel}审批`,
        `员工 ${offboardingForNotify?.employeeName || '(未知)'} 的离职申请已通过${APPROVAL_LEVEL_LABELS[approval.approvalLevel] || approval.approvalLevel}审批。\n\n现等待 ${nextApproval.approverName || APPROVAL_LEVEL_LABELS[nextApproval.approvalLevel] || '下一级'} 审批。\n\n部门：${offboardingForNotify?.department || ''}\n岗位：${offboardingForNotify?.position || ''}\n离职日期：${offboardingForNotify?.offboardingDate || '待定'}`
      );

      return { success: true, message: `${approval.approverRole}已审批通过，等待${nextApproval.approverRole}审批` };
    } else {
      await db.update(employeeOffboarding)
        .set({
          approvalStatus: 'approved',
          status: 'approval_complete',
        })
        .where(eq(employeeOffboarding.id, approval.offboardingId));

      // 获取离职记录详情用于通知
      const [completedOffboarding] = await db.select()
        .from(employeeOffboarding)
        .where(eq(employeeOffboarding.id, approval.offboardingId))
        .limit(1000);

      // 通知所有审批已完成
      await sendOffboardingNotification(
        `✅ 离职审批全部通过 - ${completedOffboarding?.employeeName || '员工'}`,
        `员工 ${completedOffboarding?.employeeName || '(未知)'} 的离职申请已通过所有审批（主管→HR→财务→IT）。\n\n离职流程进入完成阶段，请确认所有交接项已完成。\n\n部门：${completedOffboarding?.department || ''}\n岗位：${completedOffboarding?.position || ''}\n离职日期：${completedOffboarding?.offboardingDate || '待定'}\n继任者：${completedOffboarding?.successorName || '暂无'}`
      );

      return { success: true, message: '所有审批已通过，离职流程进入完成阶段' };
    }
  } else if (input.decision === 'rejected') {
    await db.update(employeeOffboarding)
      .set({
        approvalStatus: 'cancelled',
        status: 'cancelled',
      })
      .where(eq(employeeOffboarding.id, approval.offboardingId));

    // 通知离职申请被拒绝
    const [rejectedOffboarding] = await db.select()
      .from(employeeOffboarding)
      .where(eq(employeeOffboarding.id, approval.offboardingId))
      .limit(1000);

    await sendOffboardingNotification(
      `❌ 离职申请被拒绝 - ${rejectedOffboarding?.employeeName || '员工'}`,
      `员工 ${rejectedOffboarding?.employeeName || '(未知)'} 的离职申请已被 ${approval.approverName || APPROVAL_LEVEL_LABELS[approval.approvalLevel] || '审批人'} 拒绝。\n\n拒绝原因：${input.comments || '未说明'}\n\n部门：${rejectedOffboarding?.department || ''}\n岗位：${rejectedOffboarding?.position || ''}`
    );

    return { success: true, message: `${approval.approverRole}已拒绝离职申请` };
  } else {
    await db.update(employeeOffboarding)
      .set({
        approvalStatus: 'draft',
        status: 'draft',
      })
      .where(eq(employeeOffboarding.id, approval.offboardingId));

    await db.update(offboardingApprovals)
      .set({ decision: 'pending', decidedAt: null, submittedAt: null })
      .where(eq(offboardingApprovals.offboardingId, approval.offboardingId));

    return { success: true, message: `${approval.approverRole}已退回离职申请，请修改后重新提交` };
  }
}

/** 分配审批人 */
export async function assignApprover(
  offboardingId: number,
  approvalLevel: 'supervisor' | 'hr' | 'finance' | 'it',
  approverId: number,
  approverName: string
) {
  const db = await requireDb();
  await db.update(offboardingApprovals)
    .set({ approverId, approverName })
    .where(and(
      eq(offboardingApprovals.offboardingId, offboardingId),
      eq(offboardingApprovals.approvalLevel, approvalLevel)
    ));

  return { success: true, message: `${approvalLevel}审批人已分配` };
}

/** 获取审批列表 */
export async function getApprovals(offboardingId: number) {
  const db = await requireDb();
  return db.select()
    .from(offboardingApprovals)
    .where(eq(offboardingApprovals.offboardingId, offboardingId))
    .orderBy(asc(offboardingApprovals.approvalOrder))
    .limit(1000);
}

/** 获取待审批列表（某个审批人的） */
export async function getPendingApprovals(approverId: number) {
  const db = await requireDb();
  const pendingApprovals = await db.select()
    .from(offboardingApprovals)
    .where(and(
      eq(offboardingApprovals.approverId, approverId),
      eq(offboardingApprovals.decision, 'pending')
    ))
    .orderBy(desc(offboardingApprovals.createdAt))
    .limit(1000);

  const offboardingIds = pendingApprovals.map(a => a.offboardingId);
  if (offboardingIds.length === 0) return [];

  const offboardings = await db.select()
    .from(employeeOffboarding)
    .where(inArray(employeeOffboarding.id, offboardingIds))
    .limit(1000);

  const offboardingMap = new Map(offboardings.map(o => [o.id, o]));

  return pendingApprovals.map(approval => ({
    ...approval,
    offboarding: offboardingMap.get(approval.offboardingId),
  }));
}

// ============================================================
// 6. 离职员工数据查询
// ============================================================

/** 查询离职员工数据（带标注） */
export async function queryOffboardedEmployeeData(params: {
  targetEmployeeId: number;
  queryType: 'performance' | 'project' | 'client' | 'task' | 'all';
  queryPeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  startDate?: string;
  endDate?: string;
  queryUserId: number;
}) {
  const db = await requireDb();
  const [offboarding] = await db.select()
    .from(employeeOffboarding)
    .where(eq(employeeOffboarding.employeeId, params.targetEmployeeId))
    .limit(1000);

  const isOffboarded = !!offboarding;
  const offboardingDate = offboarding?.offboardingDate;

  let performanceData: any[] = [];
  if (params.queryType === 'performance' || params.queryType === 'all') {
    let perfConditions: any[] = [
      eq(performanceAttribution.originalEmployeeId, params.targetEmployeeId),
    ];
    if (params.startDate) {
      perfConditions.push(gte(performanceAttribution.period, params.startDate));
    }
    if (params.endDate) {
      perfConditions.push(lte(performanceAttribution.period, params.endDate));
    }

    performanceData = await db.select()
      .from(performanceAttribution)
      .where(and(...perfConditions))
      .orderBy(desc(performanceAttribution.period))
      .limit(1000);
  }

  const annotatedData = performanceData.map(item => ({
    ...item,
    employeeStatus: isOffboarded ? '（已离职）' : '在职',
    dataAnnotation: item.attributionType === 'pre_departure' ? '离职前'
      : item.attributionType === 'post_departure' ? '离职后'
      : '跨期',
    offboardingDate,
  }));

  await db.insert(offboardingDataQueryLog).values({
    queryUserId: params.queryUserId,
    queryType: params.queryType,
    queryPeriod: params.queryPeriod,
    targetEmployeeId: params.targetEmployeeId,
    isOffboarded: isOffboarded ? 1 : 0,
    offboardingDate: offboardingDate || null,
    resultCount: annotatedData.length,
    queryParams: JSON.stringify(params),
  });

  return {
    employeeId: params.targetEmployeeId,
    isOffboarded,
    offboardingDate,
    employeeStatus: isOffboarded ? '已离职' : '在职',
    data: annotatedData,
    queryPeriod: params.queryPeriod,
    total: annotatedData.length,
  };
}

/** 完成离职流程 */
export async function completeOffboarding(id: number) {
  const db = await requireDb();
  const handoverItems = await db.select()
    .from(offboardingHandoverItems)
    .where(eq(offboardingHandoverItems.offboardingId, id))
    .limit(1000);

  const pendingHandover = handoverItems.filter(i => i.status === 'pending' || i.status === 'in_progress');
  if (pendingHandover.length > 0) {
    return { success: false, message: `还有${pendingHandover.length}个交接项未完成` };
  }

  const approvals = await db.select()
    .from(offboardingApprovals)
    .where(eq(offboardingApprovals.offboardingId, id))
    .limit(1000);

  const pendingApprovals = approvals.filter(a => a.decision !== 'approved');
  if (pendingApprovals.length > 0) {
    return { success: false, message: `还有${pendingApprovals.length}个审批未通过` };
  }

  const [record] = await db.select()
    .from(employeeOffboarding)
    .where(eq(employeeOffboarding.id, id))
    .limit(1000);

  if (record) {
    await db.update(hrmEmployees)
      .set({ status: 'resigned' })
      .where(eq(hrmEmployees.id, record.employeeId));
  }

  await db.update(employeeOffboarding)
    .set({
      status: 'completed',
      approvalStatus: 'completed',
      completedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(employeeOffboarding.id, id));

  // 获取离职记录详情用于通知
  const [completedRecord] = await db.select()
    .from(employeeOffboarding)
    .where(eq(employeeOffboarding.id, id))
    .limit(1000);

  // 通知离职流程完成
  await sendOffboardingNotification(
    `🎯 离职流程已完成 - ${completedRecord?.employeeName || '员工'}`,
    `员工 ${completedRecord?.employeeName || '(未知)'} 的离职流程已全部完成。\n\n部门：${completedRecord?.department || ''}\n岗位：${completedRecord?.position || ''}\n离职日期：${completedRecord?.offboardingDate || ''}\n最后工作日：${completedRecord?.lastWorkingDate || ''}\n继任者：${completedRecord?.successorName || '暂无'}\n\n所有交接项已确认完成，所有审批已通过。员工状态已更新为「已离职」。`
  );

  return { success: true, message: '离职流程已完成' };
}

// ============================================================
// 7. 离职交接进度统计（Dashboard用）
// ============================================================

/** 获取离职交接进度概览（用于首页Dashboard看板） */
export async function getOffboardingDashboardStats() {
  const db = await requireDb();

  // 获取进行中的离职记录
  const activeOffboardings = await db.select()
    .from(employeeOffboarding)
    .where(or(
      eq(employeeOffboarding.status, 'in_progress'),
      eq(employeeOffboarding.status, 'approval_complete')
    ))
    .orderBy(asc(employeeOffboarding.offboardingDate))
    .limit(1000);

  // 获取每个离职记录的交接进度
  const dashboardItems = [];
  for (const record of activeOffboardings) {
    // 交接项统计
    const handoverItems = await db.select()
      .from(offboardingHandoverItems)
      .where(eq(offboardingHandoverItems.offboardingId, record.id))
      .limit(1000);

    const totalHandover = handoverItems.length;
    const completedHandover = handoverItems.filter(i => i.status === 'completed' || i.status === 'verified').length;
    const handoverProgress = totalHandover > 0 ? Math.round((completedHandover / totalHandover) * 100) : 0;

    // 资产交接统计
    const assetItems = await db.select()
      .from(assetHandover)
      .where(eq(assetHandover.offboardingId, record.id))
      .limit(1000);

    const totalAssets = assetItems.length;
    const completedAssets = assetItems.filter(i => i.status === 'completed' || i.status === 'verified').length;
    const assetProgress = totalAssets > 0 ? Math.round((completedAssets / totalAssets) * 100) : 0;

    // 审批进度
    const approvals = await db.select()
      .from(offboardingApprovals)
      .where(eq(offboardingApprovals.offboardingId, record.id))
      .orderBy(asc(offboardingApprovals.approvalOrder))
      .limit(1000);

    const totalApprovals = approvals.length;
    const completedApprovals = approvals.filter(a => a.decision === 'approved').length;
    const currentApproval = approvals.find(a => a.decision === 'pending' && a.submittedAt !== null);
    const approvalProgress = totalApprovals > 0 ? Math.round((completedApprovals / totalApprovals) * 100) : 0;

    // 绩效归属统计
    const perfRecords = await db.select()
      .from(performanceAttribution)
      .where(eq(performanceAttribution.offboardingId, record.id))
      .limit(1000);

    const totalPerf = perfRecords.length;
    const confirmedPerf = perfRecords.filter(p => p.confirmedBy !== null).length;
    const perfProgress = totalPerf > 0 ? Math.round((confirmedPerf / totalPerf) * 100) : 0;

    // 计算总体进度
    const overallProgress = Math.round(
      (handoverProgress * 0.35 + assetProgress * 0.25 + approvalProgress * 0.25 + perfProgress * 0.15)
    );

    // 计算剩余天数
    const offboardingDate = new Date(record.offboardingDate);
    const today = new Date();
    const daysRemaining = Math.ceil((offboardingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    dashboardItems.push({
      id: record.id,
      employeeName: record.employeeName,
      department: record.department,
      position: record.position,
      offboardingDate: record.offboardingDate,
      lastWorkingDate: record.lastWorkingDate,
      successorName: record.successorName,
      successorType: record.successorType,
      status: record.status,
      approvalStatus: record.approvalStatus,
      daysRemaining,
      handover: { total: totalHandover, completed: completedHandover, progress: handoverProgress },
      assets: { total: totalAssets, completed: completedAssets, progress: assetProgress },
      approvals: { total: totalApprovals, completed: completedApprovals, progress: approvalProgress, currentLevel: currentApproval?.approvalLevel || null },
      performance: { total: totalPerf, confirmed: confirmedPerf, progress: perfProgress },
      overallProgress,
    });
  }

  // 总体统计
  const [overallStats] = await db.select({
    total: sql<number>`count(*)`,
    active: sql<number>`sum(case when status in ('in_progress', 'approval_complete') then 1 else 0 end)`,
    pendingApproval: sql<number>`sum(case when "approvalStatus"::text like 'pending_%' then 1 else 0 end)`,
    completedThisMonth: sql<number>`sum(case when status = 'completed' and completed_at >= date_trunc('month', NOW()) then 1 else 0 end)`,
  }).from(employeeOffboarding);

  return {
    summary: {
      total: overallStats?.total || 0,
      active: overallStats?.active || 0,
      pendingApproval: overallStats?.pendingApproval || 0,
      completedThisMonth: overallStats?.completedThisMonth || 0,
    },
    items: dashboardItems,
  };
}

// ============================================================
// 8. 外部数据平台员工数据自动填充
// ============================================================

/** 从外部数据平台搜索员工信息（用于离职表单自动填充） */
export async function searchExtSyncEmployees(keyword: string) {
  try {
    // 先从本地数据库搜索
    const db = await requireDb();
    const localResults = await db.execute(sql`
      SELECT 
        id, employee_id as employeeId, name, department, position,
        bu_code as buCode, email, phone, hire_date as hireDate,
        status
      FROM company_employees
      WHERE status = 'active'
        AND (name LIKE ${`%${keyword}%`} OR employee_id LIKE ${`%${keyword}%`} OR department LIKE ${`%${keyword}%`})
      ORDER BY name
      LIMIT 20
    `);

    const employees = (localResults[0] as any[]) || [];

    // 从外部同步映射表获取数据（本地DB，无需调用外部API）
    let externalSyncMembers: any[] = [];
    try {
      const extResult = await db.execute(sql`
        SELECT jdy_name as name, jdy_username as username,
               jdy_departments as departments, jdy_status as status
        FROM jiandaoyun_user_mappings
        WHERE jdy_name LIKE ${`%${keyword}%`} OR jdy_username LIKE ${`%${keyword}%`}
        ORDER BY jdy_name LIMIT 10
      `);
      externalSyncMembers = ((extResult as any)[0] || []).map((m: any) => ({
        source: 'externalSync',
        username: m.username,
        name: m.name,
        departments: m.departments,
        status: m.status,
      }));
    } catch (e) {
      log.warn({ err: e }, "Failed to query external sync mappings");
    }

    return {
      localEmployees: employees,
      externalSyncMembers,
      totalLocal: employees.length,
      totalExternalSync: externalSyncMembers.length,
    };
  } catch (error: any) {
    log.error({ err: error }, "searchExternalSyncEmployees error");
    return { localEmployees: [], externalSyncMembers: [], totalLocal: 0, totalExternalSync: 0 };
  }
}

/** 获取离职统计 */
export async function getOffboardingStats() {
  const db = await requireDb();
  const [stats] = await db.select({
    total: sql<number>`count(*)`,
    draft: sql<number>`sum(case when status = 'draft' then 1 else 0 end)`,
    inProgress: sql<number>`sum(case when status = 'in_progress' then 1 else 0 end)`,
    completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
    cancelled: sql<number>`sum(case when status = 'cancelled' then 1 else 0 end)`,
  }).from(employeeOffboarding);

  return {
    total: stats?.total || 0,
    draft: stats?.draft || 0,
    inProgress: stats?.inProgress || 0,
    completed: stats?.completed || 0,
    cancelled: stats?.cancelled || 0,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function parsePeriodToDate(period: string): Date {
  if (period.includes('Q')) {
    const [year, quarter] = period.split('-Q');
    const month = (parseInt(quarter) - 1) * 3;
    return new Date(parseInt(year), month, 1);
  }
  if (period.includes('W')) {
    const [year, week] = period.split('-W');
    const d = new Date(parseInt(year), 0, 1);
    d.setDate(d.getDate() + (parseInt(week) - 1) * 7);
    return d;
  }
  return new Date(period);
}

function isOverlappingPeriod(period: string, periodType: string, offboardingDate: Date): boolean {
  const periodStart = parsePeriodToDate(period);
  let periodEnd: Date;

  switch (periodType) {
    case 'daily':
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
      break;
    case 'weekly':
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);
      break;
    case 'monthly':
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      break;
    case 'quarterly':
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 3);
      break;
    case 'annual':
      periodEnd = new Date(periodStart);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      break;
    default:
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  return offboardingDate >= periodStart && offboardingDate <= periodEnd;
}

function getEmailHandlingLabel(handling: string): string {
  const labels: Record<string, string> = {
    'forward_to_successor': '转发给继任者',
    'forward_to_manager': '转发给主管',
    'auto_reply_then_deactivate': '自动回复后停用',
    'deactivate': '直接停用',
  };
  return labels[handling] || handling;
}

function getPhoneHandlingLabel(handling: string): string {
  const labels: Record<string, string> = {
    'transfer_to_successor': '转移给继任者',
    'return_to_pool': '归还号码池',
    'deactivate': '停用',
  };
  return labels[handling] || handling;
}
