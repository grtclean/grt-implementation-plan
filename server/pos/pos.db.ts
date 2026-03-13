/**
 * POS项目管理数据库操作服务
 * 实现projects_v2、project_stages_v2等表的CRUD操作
 */

import { eq, and, like, desc, sql, count, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { requireDb } from "../db";
import {
  projects,
  projectsV2,
  projectStagesV2,
  projectVersions,
  poSuggestions,
  mesSync,
  stageReviews,
} from "../../drizzle/schema";

// ==================== 项目CRUD操作 ====================

/**
 * 创建新项目
 */
export async function createProject(data: {
  projectCode: string;
  projectName: string;
  customerId: number;
  pm?: number;
  techLeader?: number;
  salesOwner?: number;
  serviceOwner?: number;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  plannedStartDate?: string;
  plannedEndDate?: string;
  budget?: number;
  description?: string;
  createdBy?: number;
}) {
  const db = await requireDb();
  
  const insertData: any = {
    projectCode: data.projectCode,
    projectName: data.projectName,
    customerId: data.customerId,
    pm: data.pm,
    techLeader: data.techLeader,
    salesOwner: data.salesOwner,
    serviceOwner: data.serviceOwner,
    priority: data.priority || 'P2',
    description: data.description,
    createdBy: data.createdBy,
    currentStage: 'M0',
    status: 'Draft',
  };
  if (data.plannedStartDate) insertData.plannedStartDate = data.plannedStartDate;
  if (data.plannedEndDate) insertData.plannedEndDate = data.plannedEndDate;
  if (data.budget) insertData.budget = String(data.budget);
  
  const result = await db.insert(projectsV2).values(insertData);
  
  const projectId = result[0].insertId;
  
  // 自动创建M0-M12阶段记录
  const stages = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'] as const;
  const stageNames: Record<string, string> = {
    'M0': '立项启动',
    'M1': '需求调研',
    'M2': '方案设计',
    'M3': '项目评审',
    'M4': '设计冻结',
    'M5': '详细设计',
    'M6': '采购准备',
    'M7': '生产制造',
    'M8': '组装调试',
    'M9': '测试验收',
    'M10': '发货交付',
    'M11': '现场安装',
    'M12': '终验收',
  };
  
  for (const stageCode of stages) {
    await db.insert(projectStagesV2).values({
      projectId,
      stageCode,
      stageName: stageNames[stageCode],
      status: stageCode === 'M0' ? 'InProgress' : 'NotStarted',
      completionPercent: 0,
    });
  }
  
  return { id: projectId, ...data };
}

/**
 * 获取项目列表 - 从projects表读取数据
 */
export async function listProjects(params: {
  page?: number;
  pageSize?: number;
  currentStage?: string;
  status?: string;
  customerId?: number;
  search?: string;
}) {
  const db = await requireDb();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  // 构建查询条件
  const conditions = [];
  if (params.currentStage) {
    // currentPhase字段对应M0-M12阶段
    conditions.push(eq(projects.currentPhase, params.currentStage));
  }
  if (params.status) {
    // 状态映射: Draft->draft, Active->active, etc.
    const statusMap: Record<string, string> = {
      'Draft': 'draft',
      'Active': 'active',
      'OnHold': 'on_hold',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
    };
    conditions.push(eq(projects.status, (statusMap[params.status] || params.status.toLowerCase()) as any));
  }
  if (params.customerId) {
    conditions.push(eq(projects.customerId, params.customerId));
  }
  if (params.search) {
    conditions.push(
      sql`(${projects.projectCode} LIKE ${`%${params.search}%`} OR ${projects.name} LIKE ${`%${params.search}%`})`
    );
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  // 查询数据
  const rawItems = await db
    .select()
    .from(projects)
    .where(whereClause)
    .orderBy(desc(projects.createdAt))
    .limit(pageSize)
    .offset(offset);
  
  // 转换为POS项目格式
  const items = rawItems.map(p => ({
    id: p.id,
    projectCode: p.projectCode || `PRJ-${p.id}`,
    projectName: p.name,
    customerId: p.customerId || 0,
    currentStage: p.currentPhase || 'M0',
    pm: p.managerId,
    status: p.status === 'draft' ? 'Draft' : 
            p.status === 'active' ? 'Active' : 
            p.status === 'on_hold' ? 'OnHold' : 
            p.status === 'completed' ? 'Completed' : 'Cancelled',
    priority: p.priority === 'critical' ? 'P0' : 
              p.priority === 'high' ? 'P1' : 
              p.priority === 'medium' ? 'P2' : 'P3',
    plannedStartDate: p.plannedStartDate,
    plannedEndDate: p.plannedEndDate,
    actualStartDate: p.actualStartDate,
    actualEndDate: p.actualEndDate,
    budget: p.budget ? String(p.budget) : null,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  
  // 查询总数
  const totalResult = await db
    .select({ count: count() })
    .from(projects)
    .where(whereClause);
  
  const total = totalResult[0]?.count || 0;
  
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取项目详情
 */
export async function getProjectById(id: number) {
  const db = await requireDb();
  
  const projects = await db
    .select()
    .from(projectsV2)
    .where(eq(projectsV2.id, id))
    .limit(1);
  
  if (projects.length === 0) {
    return null;
  }
  
  // 获取项目阶段
  const stages = await db
    .select()
    .from(projectStagesV2)
    .where(eq(projectStagesV2.projectId, id))
    .orderBy(projectStagesV2.stageCode)
    .limit(1000);

  // 获取项目版本
  const versions = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, id))
    .orderBy(desc(projectVersions.createdAt))
    .limit(1000);

  return {
    ...projects[0],
    stages,
    versions,
  };
}

/**
 * 更新项目
 */
export async function updateProject(id: number, data: {
  projectName?: string;
  currentStage?: string;
  status?: string;
  priority?: string;
  pm?: number;
  techLeader?: number;
  salesOwner?: number;
  serviceOwner?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  budget?: number;
  description?: string;
  sceneSnapshot?: string;
  decisionSnapshot?: string;
  activeVersion?: string;
}) {
  const db = await requireDb();
  
  const updateData: any = {};
  if (data.projectName !== undefined) updateData.projectName = data.projectName;
  if (data.currentStage !== undefined) updateData.currentStage = data.currentStage;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.pm !== undefined) updateData.pm = data.pm;
  if (data.techLeader !== undefined) updateData.techLeader = data.techLeader;
  if (data.salesOwner !== undefined) updateData.salesOwner = data.salesOwner;
  if (data.serviceOwner !== undefined) updateData.serviceOwner = data.serviceOwner;
  if (data.plannedStartDate !== undefined) updateData.plannedStartDate = data.plannedStartDate;
  if (data.plannedEndDate !== undefined) updateData.plannedEndDate = data.plannedEndDate;
  if (data.actualStartDate !== undefined) updateData.actualStartDate = data.actualStartDate;
  if (data.actualEndDate !== undefined) updateData.actualEndDate = data.actualEndDate;
  if (data.budget !== undefined) updateData.budget = String(data.budget);
  if (data.description !== undefined) updateData.description = data.description;
  if (data.sceneSnapshot !== undefined) updateData.sceneSnapshot = data.sceneSnapshot;
  if (data.decisionSnapshot !== undefined) updateData.decisionSnapshot = data.decisionSnapshot;
  if (data.activeVersion !== undefined) updateData.activeVersion = data.activeVersion;
  
  await db.update(projectsV2).set(updateData).where(eq(projectsV2.id, id));
  
  return { success: true, id };
}

/**
 * 删除项目
 */
export async function deleteProject(id: number) {
  const db = await requireDb();
  
  // 删除相关阶段
  await db.delete(projectStagesV2).where(eq(projectStagesV2.projectId, id));
  
  // 删除相关版本
  await db.delete(projectVersions).where(eq(projectVersions.projectId, id));
  
  // 删除项目
  await db.delete(projectsV2).where(eq(projectsV2.id, id));
  
  return { success: true, id };
}

// ==================== 阶段CRUD操作 ====================

/**
 * 获取项目阶段列表
 */
export async function getProjectStages(projectId: number) {
  const db = await requireDb();
  
  const stages = await db
    .select()
    .from(projectStagesV2)
    .where(eq(projectStagesV2.projectId, projectId))
    .orderBy(projectStagesV2.stageCode)
    .limit(1000);

  return stages;
}

/**
 * 获取阶段详情
 */
export async function getStageById(id: number) {
  const db = await requireDb();
  
  const stages = await db
    .select()
    .from(projectStagesV2)
    .where(eq(projectStagesV2.id, id))
    .limit(1);
  
  if (stages.length === 0) {
    return null;
  }
  
  // 获取阶段评审记录
  const reviews = await db
    .select()
    .from(stageReviews)
    .where(eq(stageReviews.stageId, id))
    .orderBy(desc(stageReviews.createdAt))
    .limit(1000);

  return {
    ...stages[0],
    reviews,
  };
}

/**
 * 更新阶段状态
 */
export async function updateStageStatus(id: number, status: string) {
  const db = await requireDb();
  
  const updateData: any = { status };
  
  // 如果状态变为InProgress，记录实际开始日期
  if (status === 'InProgress') {
    updateData.actualStartDate = new Date().toISOString().split('T')[0];
  }
  // 如果状态变为Completed，记录实际结束日期
  if (status === 'Completed') {
    updateData.actualEndDate = new Date().toISOString().split('T')[0];
    updateData.completionPercent = 100;
  }
  
  await db.update(projectStagesV2).set(updateData).where(eq(projectStagesV2.id, id));
  
  return { success: true, id };
}

/**
 * 更新阶段输入/输出物
 */
export async function updateStageInputOutput(id: number, data: {
  inputJson?: string;
  outputJson?: string;
}) {
  const db = await requireDb();
  
  const updateData: any = {};
  if (data.inputJson !== undefined) updateData.inputJson = data.inputJson;
  if (data.outputJson !== undefined) updateData.outputJson = data.outputJson;
  
  await db.update(projectStagesV2).set(updateData).where(eq(projectStagesV2.id, id));
  
  return { success: true, id };
}

/**
 * 更新阶段任务列表
 */
export async function updateStageTasks(id: number, tasksJson: string) {
  const db = await requireDb();
  
  await db.update(projectStagesV2).set({ tasksJson }).where(eq(projectStagesV2.id, id));
  
  return { success: true, id };
}

/**
 * 添加阶段审计日志
 */
export async function addStageAuditLog(id: number, action: string, userId: number, details?: string) {
  const db = await requireDb();
  
  // 获取现有审计日志
  const stages = await db
    .select({ auditLog: projectStagesV2.auditLog })
    .from(projectStagesV2)
    .where(eq(projectStagesV2.id, id))
    .limit(1);
  
  const existingLogs = stages[0]?.auditLog ? JSON.parse(stages[0].auditLog) : [];
  
  // 添加新日志
  const newLog = {
    id: Date.now(),
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
  };
  existingLogs.push(newLog);
  
  await db.update(projectStagesV2).set({ auditLog: JSON.stringify(existingLogs) }).where(eq(projectStagesV2.id, id));
  
  return newLog;
}

/**
 * 更新阶段负责人
 */
export async function updateStageOwner(id: number, owner: number) {
  const db = await requireDb();
  
  await db.update(projectStagesV2).set({ owner }).where(eq(projectStagesV2.id, id));
  
  return { success: true, id };
}

/**
 * 更新阶段日期
 */
export async function updateStageDates(id: number, data: {
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}) {
  const db = await requireDb();
  
  // 转换日期字符串为Date对象或null
  const updateData: any = {};
  if (data.plannedStartDate !== undefined) updateData.plannedStartDate = data.plannedStartDate;
  if (data.plannedEndDate !== undefined) updateData.plannedEndDate = data.plannedEndDate;
  if (data.actualStartDate !== undefined) updateData.actualStartDate = data.actualStartDate;
  if (data.actualEndDate !== undefined) updateData.actualEndDate = data.actualEndDate;
  
  await db.update(projectStagesV2).set(updateData).where(eq(projectStagesV2.id, id));
  
  return { success: true, id };
}

// ==================== 阶段完成与自动推进 ====================

/**
 * 阶段顺序定义 (M0 → M12)
 */
const STAGE_ORDER = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'] as const;

/**
 * M0 退出条件校验
 * - pm (项目经理) 必须已分配
 * - budget 必须 > 0
 */
function validateM0ExitCriteria(project: {
  pm: number | null;
  budget: string | null;
}): string[] {
  const missing: string[] = [];
  if (!project.pm) {
    missing.push('项目经理 (pm) 未分配');
  }
  if (!project.budget || Number(project.budget) <= 0) {
    missing.push('项目预算 (budget) 必须大于 0');
  }
  return missing;
}

/**
 * 完成当前阶段并自动推进到下一阶段
 *
 * 1. 校验阶段存在且处于 InProgress
 * 2. 针对特定阶段校验退出条件 (M0)
 * 3. 将当前阶段标记为 Completed, completionPercent = 100
 * 4. 将下一阶段标记为 InProgress
 * 5. 更新项目的 currentStage
 */
export async function completeStage(input: {
  projectId: number;
  stageCode: string;
}): Promise<{
  success: true;
  completedStage: string;
  nextStage: string | null;
}> {
  const db = await requireDb();

  // ---------- 1. 获取项目 ----------
  const projectRows = await db
    .select()
    .from(projectsV2)
    .where(eq(projectsV2.id, input.projectId))
    .limit(1);

  if (projectRows.length === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `项目 ${input.projectId} 不存在`,
    });
  }

  const project = projectRows[0];

  // ---------- 2. 获取当前阶段记录, 校验状态为 InProgress ----------
  const currentStageRows = await db
    .select()
    .from(projectStagesV2)
    .where(
      and(
        eq(projectStagesV2.projectId, input.projectId),
        eq(projectStagesV2.stageCode, input.stageCode as any),
      ),
    )
    .limit(1);

  if (currentStageRows.length === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `项目 ${input.projectId} 中未找到阶段 ${input.stageCode}`,
    });
  }

  const currentStageRecord = currentStageRows[0];

  if (currentStageRecord.status !== 'InProgress') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `阶段 ${input.stageCode} 当前状态为 ${currentStageRecord.status}，只有 InProgress 状态的阶段才能完成`,
    });
  }

  // ---------- 3. 阶段退出条件校验 ----------
  if (input.stageCode === 'M0') {
    const missing = validateM0ExitCriteria({
      pm: project.pm,
      budget: project.budget,
    });
    if (missing.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `M0 退出条件未满足: ${missing.join('; ')}`,
      });
    }
  }

  // ---------- 4. 标记当前阶段为 Completed ----------
  const today = new Date().toISOString().split('T')[0];

  await db
    .update(projectStagesV2)
    .set({
      status: 'Completed' as any,
      completionPercent: 100,
      actualEndDate: today,
    })
    .where(eq(projectStagesV2.id, currentStageRecord.id));

  // ---------- 5. 找到下一阶段并设为 InProgress ----------
  const currentIndex = STAGE_ORDER.indexOf(input.stageCode as any);
  let nextStageCode: string | null = null;

  if (currentIndex >= 0 && currentIndex < STAGE_ORDER.length - 1) {
    nextStageCode = STAGE_ORDER[currentIndex + 1];

    const nextStageRows = await db
      .select()
      .from(projectStagesV2)
      .where(
        and(
          eq(projectStagesV2.projectId, input.projectId),
          eq(projectStagesV2.stageCode, nextStageCode as any),
        ),
      )
      .limit(1);

    if (nextStageRows.length > 0) {
      await db
        .update(projectStagesV2)
        .set({
          status: 'InProgress' as any,
          actualStartDate: today,
        })
        .where(eq(projectStagesV2.id, nextStageRows[0].id));
    }

    // ---------- 6. 更新项目 currentStage ----------
    await db
      .update(projectsV2)
      .set({ currentStage: nextStageCode as any })
      .where(eq(projectsV2.id, input.projectId));
  }

  return {
    success: true,
    completedStage: input.stageCode,
    nextStage: nextStageCode,
  };
}

// ==================== 版本CRUD操作 ====================

/**
 * 创建项目版本
 */
export async function createProjectVersion(data: {
  projectId: number;
  versionCode: string;
  baseProjectCode?: string;
  deltaInput?: string;
  versionJson?: string;
  changesSummary?: string;
  createdBy?: number;
}) {
  const db = await requireDb();
  
  const result = await db.insert(projectVersions).values({
    projectId: data.projectId,
    versionCode: data.versionCode,
    baseProjectCode: data.baseProjectCode,
    deltaInput: data.deltaInput,
    versionJson: data.versionJson,
    changesSummary: data.changesSummary,
    createdBy: data.createdBy,
    status: 'Draft',
  });
  
  return { id: result[0].insertId, ...data };
}

/**
 * 获取项目版本列表
 */
export async function getProjectVersions(projectId: number) {
  const db = await requireDb();

  const versions = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(desc(projectVersions.createdAt))
    .limit(1000);
  
  return versions;
}

/**
 * 激活项目版本
 */
export async function activateProjectVersion(id: number, userId: number) {
  const db = await requireDb();
  
  // 获取版本信息
  const versions = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.id, id))
    .limit(1);
  
  if (versions.length === 0) {
    throw new Error('版本不存在');
  }
  
  const version = versions[0];
  
  // 将其他版本设为Archived
  await db
    .update(projectVersions)
    .set({ status: 'Archived' })
    .where(and(
      eq(projectVersions.projectId, version.projectId),
      eq(projectVersions.status, 'Active')
    ));
  
  // 激活当前版本
  await db
    .update(projectVersions)
    .set({
      status: 'Active',
      activatedBy: userId,
      activatedAt: new Date().toISOString(),
    })
    .where(eq(projectVersions.id, id));
  
  // 更新项目的activeVersion
  await db
    .update(projectsV2)
    .set({ activeVersion: version.versionCode })
    .where(eq(projectsV2.id, version.projectId));
  
  return { success: true, id };
}

// ==================== 评审CRUD操作 ====================

/**
 * 创建阶段评审
 */
export async function createStageReview(data: {
  projectId: number;
  stageId: number;
  reviewType: string;
  reviewCarriage?: string;
  responsible?: number;
  completionDate?: string;
  comments?: string;
}) {
  const db = await requireDb();
  
  const insertData: any = {
    projectId: data.projectId,
    stageId: data.stageId,
    reviewType: data.reviewType,
    reviewCarriage: data.reviewCarriage || 'General',
    responsible: data.responsible,
    comments: data.comments,
    conclusion: 'Pending',
  };
  if (data.completionDate) insertData.completionDate = data.completionDate;
  
  const result = await db.insert(stageReviews).values(insertData);
  
  return { id: result[0].insertId, ...data };
}

/**
 * 更新评审结论
 */
export async function updateReviewConclusion(id: number, conclusion: string, comments?: string, risks?: string) {
  const db = await requireDb();
  
  await db.update(stageReviews).set({
    conclusion: conclusion as any,
    comments,
    risks,
  }).where(eq(stageReviews.id, id));
  
  return { success: true, id };
}

/**
 * 获取阶段评审列表
 */
export async function getStageReviews(stageId: number) {
  const db = await requireDb();

  const reviews = await db
    .select()
    .from(stageReviews)
    .where(eq(stageReviews.stageId, stageId))
    .orderBy(desc(stageReviews.createdAt))
    .limit(1000);
  
  return reviews;
}

// ==================== 统计查询 ====================

/**
 * 获取项目统计数据
 */
export async function getProjectStatistics() {
  const db = await requireDb();
  
  // 按状态统计
  const statusStats = await db
    .select({
      status: projectsV2.status,
      count: count(),
    })
    .from(projectsV2)
    .groupBy(projectsV2.status);
  
  // 按阶段统计
  const stageStats = await db
    .select({
      currentStage: projectsV2.currentStage,
      count: count(),
    })
    .from(projectsV2)
    .groupBy(projectsV2.currentStage);
  
  // 总数
  const totalResult = await db.select({ count: count() }).from(projectsV2);
  const total = totalResult[0]?.count || 0;
  
  return {
    total,
    byStatus: statusStats,
    byStage: stageStats,
  };
}
