/**
 * MES工单同步服务
 * 实现M6阶段自动创建MES工单和双向进度同步
 */

import { eq, and, desc } from "drizzle-orm";
import { requireDb } from "../db";
import { projectsV2, projectStagesV2, mesSync } from "../../drizzle/schema";
import { sendNotification, type NotificationConfig } from "./notification.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("mes-sync");

// MES工单类型
export type MESWorkOrderType = 'Production' | 'Assembly' | 'Testing' | 'Debugging' | 'Packaging';

// MES工单状态
export type MESWorkOrderStatus = 'Created' | 'Released' | 'InProgress' | 'Completed' | 'Cancelled' | 'OnHold';

// MES同步状态
export type MESSyncStatus = 'Pending' | 'Syncing' | 'Synced' | 'Failed' | 'Conflict';

// MES工单接口
export interface MESWorkOrder {
  id: number;
  workOrderCode: string;
  projectId: number;
  stageCode: string;
  workOrderType: MESWorkOrderType;
  items: MESWorkOrderItem[];
  status: MESWorkOrderStatus;
  syncStatus: MESSyncStatus;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  progress: number;
  createdBy?: number;
  createdAt: string;
  lastSyncAt?: string;
  mesReference?: string; // MES系统中的工单号
}

// MES工单项
export interface MESWorkOrderItem {
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  plannedStartDate: string;
  plannedEndDate: string;
  completedQuantity?: number;
  status?: 'Pending' | 'InProgress' | 'Completed';
}

// MES进度更新
export interface MESProgressUpdate {
  workOrderCode: string;
  mesStatus: string;
  completedQuantity: number;
  totalQuantity: number;
  completionRate: number;
  lastUpdated: string;
  operations: MESOperation[];
}

// MES工序
export interface MESOperation {
  opCode: string;
  opName: string;
  status: 'Pending' | 'InProgress' | 'Completed';
  progress?: number;
  completedAt?: string;
}

/**
 * 从项目M6阶段自动创建MES工单
 */
export async function createWorkOrderFromM6Stage(
  projectId: number,
  userId?: number
): Promise<{
  success: boolean;
  workOrders: MESWorkOrder[];
  message: string;
}> {
  const db = await requireDb();

  try {
    // 1. 获取项目信息
    const projects = await db
      .select()
      .from(projectsV2)
      .where(eq(projectsV2.id, projectId))
      .limit(1);

    if (projects.length === 0) {
      return {
        success: false,
        workOrders: [],
        message: '项目不存在',
      };
    }

    const project = projects[0];

    // 2. 检查项目是否在M6阶段
    if (project.currentStage !== 'M6') {
      return {
        success: false,
        workOrders: [],
        message: `项目当前阶段为 ${project.currentStage}，需要在M6阶段才能创建生产工单`,
      };
    }

    // 3. 获取M6阶段信息
    const m6Stage = await db
      .select()
      .from(projectStagesV2)
      .where(and(
        eq(projectStagesV2.projectId, projectId),
        eq(projectStagesV2.stageCode, 'M6')
      ))
      .limit(1);

    // 4. 创建生产工单
    const workOrders: MESWorkOrder[] = [];
    const timestamp = Date.now();
    const projectCode = project.projectCode || `PRJ-${projectId}`;

    // 生产工单
    const productionWO: MESWorkOrder = {
      id: timestamp,
      workOrderCode: `WO-${projectCode}-PROD-${timestamp}`,
      projectId,
      stageCode: 'M7',
      workOrderType: 'Production',
      items: [
        {
          itemCode: `${projectCode}-001`,
          itemName: '主机架',
          quantity: 1,
          unit: '套',
          plannedStartDate: new Date().toISOString().split('T')[0],
          plannedEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        {
          itemCode: `${projectCode}-002`,
          itemName: '清洗槽',
          quantity: 3,
          unit: '个',
          plannedStartDate: new Date().toISOString().split('T')[0],
          plannedEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      ],
      status: 'Created',
      syncStatus: 'Pending',
      plannedStartDate: new Date().toISOString().split('T')[0],
      plannedEndDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    workOrders.push(productionWO);

    // 装配工单
    const assemblyWO: MESWorkOrder = {
      id: timestamp + 1,
      workOrderCode: `WO-${projectCode}-ASSY-${timestamp}`,
      projectId,
      stageCode: 'M8',
      workOrderType: 'Assembly',
      items: [
        {
          itemCode: `${projectCode}-ASSY-001`,
          itemName: '整机装配',
          quantity: 1,
          unit: '套',
          plannedStartDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          plannedEndDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      ],
      status: 'Created',
      syncStatus: 'Pending',
      plannedStartDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      plannedEndDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    workOrders.push(assemblyWO);

    // 调试工单
    const testingWO: MESWorkOrder = {
      id: timestamp + 2,
      workOrderCode: `WO-${projectCode}-TEST-${timestamp}`,
      projectId,
      stageCode: 'M9',
      workOrderType: 'Testing',
      items: [
        {
          itemCode: `${projectCode}-TEST-001`,
          itemName: '功能测试',
          quantity: 1,
          unit: '项',
          plannedStartDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          plannedEndDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        {
          itemCode: `${projectCode}-TEST-002`,
          itemName: 'FAT测试',
          quantity: 1,
          unit: '项',
          plannedStartDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          plannedEndDate: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      ],
      status: 'Created',
      syncStatus: 'Pending',
      plannedStartDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      plannedEndDate: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    workOrders.push(testingWO);

    // 5. 保存工单到数据库（使用mesSync表）
    for (const wo of workOrders) {
      await db.insert(mesSync).values({
        projectId: wo.projectId,
        stageId: null, // 可以后续关联
        mesWorkOrderId: wo.workOrderCode,
        syncStatus: 'Pending',
        syncData: JSON.stringify(wo),
      } as any);
    }

    // 6. 发送通知
    await sendWorkOrderCreatedNotification(projectId, projectCode, workOrders);

    return {
      success: true,
      workOrders,
      message: `已成功创建 ${workOrders.length} 个MES工单，等待同步到MES系统`,
    };
  } catch (error) {
    log.error({ err: error }, "创建工单失败");
    return {
      success: false,
      workOrders: [],
      message: `创建工单失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 同步工单到MES系统
 */
export async function syncWorkOrderToMES(
  workOrderCode: string
): Promise<{
  success: boolean;
  mesReference?: string;
  message: string;
}> {
  const db = await requireDb();

  try {
    // 1. 获取工单信息
    const syncRecords = await db
      .select()
      .from(mesSync)
      .where(eq(mesSync.mesWorkOrderId, workOrderCode))
      .limit(1);

    if (syncRecords.length === 0) {
      return {
        success: false,
        message: '工单不存在',
      };
    }

    const syncRecord = syncRecords[0];

    // 2. 更新同步状态为Syncing
    await db
      .update(mesSync)
      .set({ syncStatus: 'Syncing' })
      .where(eq(mesSync.id, syncRecord.id));

    // 3. 模拟同步到MES（实际应调用MES API）
    // TODO: 调用实际的MES API
    const mesReference = `MES-${Date.now()}`;
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. 更新同步状态为Synced
    await db
      .update(mesSync)
      .set({
        syncStatus: 'Synced',
        lastSyncAt: new Date().toISOString(),
      } as any)
      .where(eq(mesSync.id, syncRecord.id));

    return {
      success: true,
      mesReference,
      message: `工单已成功同步到MES系统，MES工单号: ${mesReference}`,
    };
  } catch (error) {
    log.error({ err: error }, "同步工单失败");
    
    // 更新同步状态为Failed
    const db2 = await requireDb();
    await db2
      .update(mesSync)
      .set({ syncStatus: 'Failed' })
      .where(eq(mesSync.mesWorkOrderId, workOrderCode));

    return {
      success: false,
      message: `同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 从MES拉取进度更新
 */
export async function pullProgressFromMES(
  workOrderCode: string
): Promise<MESProgressUpdate> {
  // 模拟从MES获取进度数据
  // TODO: 调用实际的MES API
  
  return {
    workOrderCode,
    mesStatus: 'InProgress',
    completedQuantity: Math.floor(Math.random() * 80) + 20,
    totalQuantity: 100,
    completionRate: Math.random() * 0.8 + 0.1,
    lastUpdated: new Date().toISOString(),
    operations: [
      { opCode: 'OP10', opName: '下料', status: 'Completed', completedAt: new Date(Date.now() - 86400000).toISOString() },
      { opCode: 'OP20', opName: '加工', status: 'InProgress', progress: 0.6 },
      { opCode: 'OP30', opName: '焊接', status: 'Pending' },
      { opCode: 'OP40', opName: '表面处理', status: 'Pending' },
      { opCode: 'OP50', opName: '检验', status: 'Pending' },
    ],
  };
}

/**
 * 回写进度到项目阶段
 */
export async function writeBackProgressToProject(
  workOrderCode: string,
  projectId: number,
  stageCode: string,
  progress: number,
  status: 'NotStarted' | 'InProgress' | 'Completed' | 'OnHold'
): Promise<{
  success: boolean;
  message: string;
}> {
  const db = await requireDb();

  try {
    // 1. 获取阶段记录
    const stages = await db
      .select()
      .from(projectStagesV2)
      .where(and(
        eq(projectStagesV2.projectId, projectId),
        eq(projectStagesV2.stageCode, stageCode as any)
      ))
      .limit(1);

    if (stages.length === 0) {
      return {
        success: false,
        message: '阶段不存在',
      };
    }

    const stage = stages[0];

    // 2. 更新阶段进度
    const updateData: any = {
      completionPercent: Math.round(progress * 100),
      status,
    };

    if (status === 'InProgress' && !stage.actualStartDate) {
      updateData.actualStartDate = new Date().toISOString().split('T')[0];
    }

    if (status === 'Completed') {
      updateData.actualEndDate = new Date().toISOString().split('T')[0];
      updateData.completionPercent = 100;
    }

    await db
      .update(projectStagesV2)
      .set(updateData)
      .where(eq(projectStagesV2.id, stage.id));

    // 3. 添加审计日志
    const existingLogs = stage.auditLog ? JSON.parse(stage.auditLog) : [];
    existingLogs.push({
      id: Date.now(),
      action: 'MES进度回写',
      source: 'MES',
      workOrderCode,
      progress,
      status,
      timestamp: new Date().toISOString(),
    });

    await db
      .update(projectStagesV2)
      .set({ auditLog: JSON.stringify(existingLogs) })
      .where(eq(projectStagesV2.id, stage.id));

    return {
      success: true,
      message: `进度已回写到项目阶段 ${stageCode}`,
    };
  } catch (error) {
    log.error({ err: error }, "回写进度失败");
    return {
      success: false,
      message: `回写失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 获取项目的所有MES工单
 */
export async function getProjectWorkOrders(
  projectId: number
): Promise<MESWorkOrder[]> {
  const db = await requireDb();

  const syncRecords = await db
    .select()
    .from(mesSync)
    .where(eq(mesSync.projectId, projectId))
    .orderBy(desc(mesSync.createdAt))
    .limit(1000);

  return syncRecords.map(record => {
    const data = record.syncData ? JSON.parse(record.syncData) : {};
    return {
      id: record.id,
      workOrderCode: record.mesWorkOrderId || '',
      projectId: record.projectId,
      stageCode: data.stageCode || '',
      workOrderType: data.workOrderType || 'Production',
      items: data.items || [],
      status: data.status || 'Created',
      syncStatus: record.syncStatus as MESSyncStatus,
      plannedStartDate: data.plannedStartDate || '',
      plannedEndDate: data.plannedEndDate || '',
      actualStartDate: data.actualStartDate,
      actualEndDate: data.actualEndDate,
      progress: data.progress || 0,
      createdBy: data.createdBy,
      createdAt: record.createdAt || '',
      lastSyncAt: record.lastSyncAt,
      mesReference: data.mesReference,
    };
  }) as MESWorkOrder[];
}

/**
 * 发送工单创建通知
 */
async function sendWorkOrderCreatedNotification(
  projectId: number,
  projectCode: string,
  workOrders: MESWorkOrder[]
): Promise<void> {
  try {
    const configs: NotificationConfig[] = [
      { channel: 'feishu' as const, enabled: true, webhookUrl: process.env.FEISHU_WEBHOOK_URL },
      { channel: 'wechat_work' as const, enabled: true, webhookUrl: process.env.WECHAT_WORK_WEBHOOK_URL },
    ].filter(c => c.webhookUrl);

    if (configs.length === 0) return;

    const workOrderList = workOrders
      .map(wo => `• ${wo.workOrderCode} (${wo.workOrderType})`)
      .join('\n');

    const message = {
      title: `📋 MES工单已创建`,
      content: `项目 **${projectCode}** 已自动创建 ${workOrders.length} 个MES工单:\n\n${workOrderList}\n\n请及时同步到MES系统。`,
      type: 'info' as const,
      actionUrl: `/pos/projects/${projectId}/mes`,
    };

    for (const config of configs) {
      await sendNotification(config, message);
    }
  } catch (error) {
    log.error({ err: error }, "发送通知失败");
  }
}

/**
 * 双向同步MES工单
 */
export async function bidirectionalSync(
  workOrderCode: string
): Promise<{
  success: boolean;
  toMES: { success: boolean; message: string };
  fromMES: { success: boolean; progress?: MESProgressUpdate };
  message: string;
}> {
  // 1. 推送到MES
  const toMESResult = await syncWorkOrderToMES(workOrderCode);

  // 2. 从MES拉取
  let fromMESResult: { success: boolean; progress?: MESProgressUpdate } = { success: false };
  if (toMESResult.success) {
    try {
      const progress = await pullProgressFromMES(workOrderCode);
      fromMESResult = { success: true, progress };
    } catch (error) {
      fromMESResult = { success: false };
    }
  }

  return {
    success: toMESResult.success && fromMESResult.success,
    toMES: toMESResult,
    fromMES: fromMESResult,
    message: toMESResult.success && fromMESResult.success
      ? '双向同步成功'
      : '部分同步失败',
  };
}
