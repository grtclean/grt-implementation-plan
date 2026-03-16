/**
 * Annual planning management — configs, items, update logs, AI auto-update
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, and } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  annualPlanningConfigs, annualPlanningItems, annualPlanningUpdateLogs,
} from "../../drizzle/schema";

// ============================================
// 年度规划管理模块 (Annual Planning Management)
// ============================================

// --- Annual Planning Configs ---

/**
 * Get all annual planning configs
 */
export async function getAnnualPlanningConfigs(filters?: {
  year?: number;
  status?: "draft" | "active" | "archived";
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(annualPlanningConfigs);
  const conditions = [];
  
  if (filters?.year) {
    conditions.push(eq(annualPlanningConfigs.year, filters.year));
  }
  if (filters?.status) {
    conditions.push(eq(annualPlanningConfigs.status, filters.status));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(annualPlanningConfigs.year)).limit(1000);
}

/**
 * Get active annual planning config for a year
 */
export async function getActiveAnnualPlanningConfig(year: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(annualPlanningConfigs)
    .where(and(
      eq(annualPlanningConfigs.year, year),
      eq(annualPlanningConfigs.status, "active")
    ))
    .limit(1000);
  return result[0] || null;
}

/**
 * Get annual planning config by ID
 */
export async function getAnnualPlanningConfigById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.id, id));
  return result[0] || null;
}

/**
 * Create annual planning config
 */
export async function createAnnualPlanningConfig(data: {
  year: number;
  version: string;
  versionName: string;
  status?: "draft" | "active" | "archived";
  basedOnId?: number;
  effectiveDate?: string;
  notes?: string;
  creatorId: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(annualPlanningConfigs).values(data);
  
  // Log the creation
  await createAnnualPlanningUpdateLog({
    configId: result[0].insertId,
    updateType: "create",
    description: `创建年度规划配置: ${data.versionName}`,
    operatorId: data.creatorId
  });
  
  return { id: result[0].insertId, ...data };
}

/**
 * Update annual planning config
 */
export async function updateAnnualPlanningConfig(id: number, data: Partial<{
  version: string;
  versionName: string;
  status: "draft" | "active" | "archived";
  effectiveDate: string;
  archivedDate: string;
  notes: string;
}>, operatorId: number) {
  const db = await requireDb();
  if (!db) return null;
  
  // Get current data for logging
  const current = await getAnnualPlanningConfigById(id);
  
  await db.update(annualPlanningConfigs).set(data).where(eq(annualPlanningConfigs.id, id));
  
  // Log the update
  await createAnnualPlanningUpdateLog({
    configId: id,
    updateType: "update",
    description: `更新年度规划配置`,
    beforeData: JSON.stringify(current),
    afterData: JSON.stringify(data),
    operatorId
  });
  
  return { success: true };
}

/**
 * Activate annual planning config (and archive previous active one)
 */
export async function activateAnnualPlanningConfig(id: number, operatorId: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const config = await getAnnualPlanningConfigById(id);
  if (!config) return { success: false, message: "Config not found" };
  
  // Archive current active config for the same year
  const currentActive = await getActiveAnnualPlanningConfig(config.year);
  if (currentActive && currentActive.id !== id) {
    await db.update(annualPlanningConfigs)
      .set({ status: "archived", archivedDate: new Date().toISOString() })
      .where(eq(annualPlanningConfigs.id, currentActive.id));
    
    await createAnnualPlanningUpdateLog({
      configId: currentActive.id,
      updateType: "archive",
      description: `归档年度规划配置: ${currentActive.versionName}`,
      operatorId
    });
  }
  
  // Activate the new config
  await db.update(annualPlanningConfigs)
    .set({ status: "active", effectiveDate: new Date().toISOString() })
    .where(eq(annualPlanningConfigs.id, id));
  
  return { success: true };
}

// --- Annual Planning Items ---

/**
 * Get annual planning items for a config
 */
export async function getAnnualPlanningItems(configId: number, filters?: {
  category?: "culture" | "training" | "meeting" | "event" | "other";
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  month?: number;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(annualPlanningItems);
  const conditions = [eq(annualPlanningItems.configId, configId)];
  
  if (filters?.category) {
    conditions.push(eq(annualPlanningItems.category, filters.category));
  }
  if (filters?.status) {
    conditions.push(eq(annualPlanningItems.status, filters.status));
  }
  if (filters?.month) {
    conditions.push(eq(annualPlanningItems.month, filters.month));
  }
  
  query = query.where(and(...conditions)) as any;
  
  return query.orderBy(annualPlanningItems.sortOrder, annualPlanningItems.startDate).limit(1000);
}

/**
 * Get annual planning item by ID
 */
export async function getAnnualPlanningItemById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(annualPlanningItems).where(eq(annualPlanningItems.id, id));
  return result[0] || null;
}

/**
 * Create annual planning item
 */
export async function createAnnualPlanningItem(data: {
  configId: number;
  category?: "culture" | "training" | "meeting" | "event" | "other";
  name: string;
  description?: string;
  tasks?: string;
  frequency?: "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  startDate?: string;
  endDate?: string;
  weekNumber?: number;
  month?: number;
  responsibleUserId?: number;
  responsibleUserName?: string;
  participantIds?: string;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  sortOrder?: number;
  isTemplate?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(annualPlanningItems).values(data);
  return { id: result[0].insertId, ...data };
}

/**
 * Update annual planning item
 */
export async function updateAnnualPlanningItem(id: number, data: Partial<{
  category: "culture" | "training" | "meeting" | "event" | "other";
  name: string;
  description: string;
  tasks: string;
  frequency: "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate: string;
  weekNumber: number;
  month: number;
  responsibleUserId: number;
  responsibleUserName: string;
  participantIds: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  sortOrder: number;
}>) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(annualPlanningItems).set(data).where(eq(annualPlanningItems.id, id));
  return { success: true };
}

/**
 * Delete annual planning item
 */
export async function deleteAnnualPlanningItem(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.delete(annualPlanningItems).where(eq(annualPlanningItems.id, id));
  return { success: true };
}

// --- Annual Planning Update Logs ---

/**
 * Create annual planning update log
 */
export async function createAnnualPlanningUpdateLog(data: {
  configId: number;
  updateType: "create" | "copy" | "update" | "archive" | "ai_update";
  description?: string;
  beforeData?: string;
  afterData?: string;
  operatorId: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(annualPlanningUpdateLogs).values(data);
  return { id: result[0].insertId, ...data };
}

/**
 * Get update logs for a config
 */
export async function getAnnualPlanningUpdateLogs(configId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select()
    .from(annualPlanningUpdateLogs)
    .where(eq(annualPlanningUpdateLogs.configId, configId))
    .orderBy(desc(annualPlanningUpdateLogs.createdAt))
    .limit(1000);
}

// --- AI Auto-Update Functions ---

/**
 * Copy annual planning to new year
 * This is the main function for AI-driven year-over-year updates
 */
export async function copyAnnualPlanningToNewYear(
  sourceConfigId: number,
  targetYear: number,
  operatorId: number,
  options?: {
    resetStatus?: boolean;
    adjustDates?: boolean;
    newVersionName?: string;
  }
) {
  const db = await requireDb();
  if (!db) return null;
  
  // Get source config
  const sourceConfig = await getAnnualPlanningConfigById(sourceConfigId);
  if (!sourceConfig) return { success: false, message: "Source config not found" };
  
  // Calculate year difference for date adjustment
  const yearDiff = targetYear - sourceConfig.year;
  
  // Create new config
  const newConfig = await createAnnualPlanningConfig({
    year: targetYear,
    version: "v1",
    versionName: options?.newVersionName || `${targetYear}年度规划`,
    status: "draft",
    basedOnId: sourceConfigId,
    notes: `基于${sourceConfig.year}年度规划(${sourceConfig.versionName})复制创建`,
    creatorId: operatorId
  });
  
  if (!newConfig) return { success: false, message: "Failed to create new config" };
  
  // Get source items
  const sourceItems = await getAnnualPlanningItems(sourceConfigId);
  
  // Copy items with date adjustment
  let copiedCount = 0;
  for (const item of sourceItems) {
    const newItem: any = {
      configId: newConfig.id,
      category: item.category,
      name: item.name,
      description: item.description,
      tasks: item.tasks,
      frequency: item.frequency,
      weekNumber: item.weekNumber,
      month: item.month,
      responsibleUserId: item.responsibleUserId,
      responsibleUserName: item.responsibleUserName,
      participantIds: item.participantIds,
      status: options?.resetStatus ? "pending" : item.status,
      sortOrder: item.sortOrder,
      isTemplate: item.isTemplate
    };
    
    // Adjust dates if requested
    if (options?.adjustDates && item.startDate) {
      const newStartDate = new Date(item.startDate);
      newStartDate.setFullYear(newStartDate.getFullYear() + yearDiff);
      newItem.startDate = newStartDate;
    }
    if (options?.adjustDates && item.endDate) {
      const newEndDate = new Date(item.endDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + yearDiff);
      newItem.endDate = newEndDate;
    }
    
    await createAnnualPlanningItem(newItem);
    copiedCount++;
  }
  
  // Log the copy operation
  await createAnnualPlanningUpdateLog({
    configId: newConfig.id,
    updateType: "copy",
    description: `从${sourceConfig.year}年度规划复制${copiedCount}个项目`,
    beforeData: JSON.stringify({ sourceConfigId, sourceYear: sourceConfig.year }),
    afterData: JSON.stringify({ targetYear, copiedCount, options }),
    operatorId
  });
  
  return {
    success: true,
    newConfigId: newConfig.id,
    copiedItemsCount: copiedCount,
    message: `成功创建${targetYear}年度规划，复制了${copiedCount}个项目`
  };
}

/**
 * AI-driven batch update for annual planning items
 * Updates dates, resets status, and adjusts for new year
 */
export async function aiUpdateAnnualPlanning(
  configId: number,
  operatorId: number,
  updates: {
    itemId: number;
    changes: Partial<{
      name: string;
      description: string;
      startDate: string;
      endDate: string;
      status: "pending" | "in_progress" | "completed" | "cancelled";
      responsibleUserId: number;
      responsibleUserName: string;
    }>;
  }[]
) {
  const db = await requireDb();
  if (!db) return null;
  
  const results: Array<{ itemId: number; success: boolean; message?: string }> = [];
  
  for (const update of updates) {
    try {
      await updateAnnualPlanningItem(update.itemId, update.changes);
      results.push({ itemId: update.itemId, success: true });
    } catch (error) {
      results.push({ itemId: update.itemId, success: false, message: String(error) });
    }
  }
  
  // Log the AI update
  await createAnnualPlanningUpdateLog({
    configId,
    updateType: "ai_update",
    description: `AI批量更新${updates.length}个项目`,
    afterData: JSON.stringify(results),
    operatorId
  });
  
  return {
    success: true,
    totalUpdates: updates.length,
    successfulUpdates: results.filter(r => r.success).length,
    failedUpdates: results.filter(r => !r.success).length,
    details: results
  };
}

/**
 * Initialize sample annual planning data
 */
export async function initSampleAnnualPlanningData(creatorId: number) {
  const db = await requireDb();
  if (!db) return { success: false, message: "Database not available" };
  
  // Check if data already exists
  const existing = await getAnnualPlanningConfigs({ year: 2026 });
  if (existing.length > 0) {
    return { success: false, message: "Annual planning data already exists for 2026" };
  }
  
  // Create 2026 config
  const config = await createAnnualPlanningConfig({
    year: 2026,
    version: "v1",
    versionName: "2026年度规划-初版",
    status: "active",
    effectiveDate: new Date().toISOString(),
    notes: "GRT系统2026年度规划",
    creatorId
  });
  
  if (!config) return { success: false, message: "Failed to create config" };
  
  // Sample planning items based on JianDaoYun structure
  const sampleItems = [
    // Culture activities
    {
      category: "culture" as const,
      name: "卓越文化月度活动",
      description: "每月组织一次卓越文化主题活动，提升团队凝聚力",
      tasks: JSON.stringify([
        "1. 确定活动主题和名称",
        "2. 产出活动策划方案（预算、目标、过程、参与者、总结、资料准备）",
        "3. 申请批准",
        "4. 做抄送和outlook会议的发送"
      ]),
      frequency: "monthly" as const,
      month: 1,
      responsibleUserName: "沈迎风",
      status: "pending" as const,
      sortOrder: 1,
      isTemplate: 1
    },
    {
      category: "culture" as const,
      name: "年度团建活动",
      description: "年度大型团队建设活动",
      tasks: JSON.stringify([
        "1. 策划活动方案",
        "2. 预算审批",
        "3. 场地预订",
        "4. 活动执行",
        "5. 总结反馈"
      ]),
      frequency: "yearly" as const,
      month: 6,
      responsibleUserName: "Bonnie",
      status: "pending" as const,
      sortOrder: 2,
      isTemplate: 1
    },
    // Training activities
    {
      category: "training" as const,
      name: "新员工入职培训",
      description: "每季度新员工入职培训",
      tasks: JSON.stringify([
        "1. 准备培训材料",
        "2. 安排培训讲师",
        "3. 组织培训考核",
        "4. 收集反馈"
      ]),
      frequency: "quarterly" as const,
      month: 1,
      responsibleUserName: "刘奕运",
      status: "pending" as const,
      sortOrder: 10,
      isTemplate: 1
    },
    {
      category: "training" as const,
      name: "安全生产培训",
      description: "年度安全生产培训",
      tasks: JSON.stringify([
        "1. 更新安全培训内容",
        "2. 组织全员培训",
        "3. 培训考核",
        "4. 颁发证书"
      ]),
      frequency: "yearly" as const,
      month: 3,
      responsibleUserName: "刘坤",
      status: "pending" as const,
      sortOrder: 11,
      isTemplate: 1
    },
    // Meeting activities
    {
      category: "meeting" as const,
      name: "公司季度经营会",
      description: "季度经营分析与目标回顾",
      tasks: JSON.stringify([
        "1. 收集各部门数据",
        "2. 准备经营分析报告",
        "3. 组织会议",
        "4. 形成会议纪要"
      ]),
      frequency: "quarterly" as const,
      month: 1,
      responsibleUserName: "倪总",
      status: "pending" as const,
      sortOrder: 20,
      isTemplate: 1
    },
    {
      category: "meeting" as const,
      name: "年度总结大会",
      description: "年度工作总结与新年规划",
      tasks: JSON.stringify([
        "1. 各部门年度总结",
        "2. 优秀员工评选",
        "3. 新年度目标发布",
        "4. 年度表彰"
      ]),
      frequency: "yearly" as const,
      month: 12,
      responsibleUserName: "Camellia",
      status: "pending" as const,
      sortOrder: 21,
      isTemplate: 1
    },
    // Events
    {
      category: "event" as const,
      name: "客户答谢会",
      description: "年度客户答谢活动",
      tasks: JSON.stringify([
        "1. 确定邀请客户名单",
        "2. 策划活动内容",
        "3. 场地布置",
        "4. 活动执行",
        "5. 后续跟进"
      ]),
      frequency: "yearly" as const,
      month: 11,
      responsibleUserName: "销售部",
      status: "pending" as const,
      sortOrder: 30,
      isTemplate: 1
    }
  ];
  
  // Insert sample items
  for (const item of sampleItems) {
    await createAnnualPlanningItem({
      configId: config.id,
      ...item
    });
  }
  
  return {
    success: true,
    configId: config.id,
    itemsCount: sampleItems.length,
    message: `成功初始化2026年度规划，包含${sampleItems.length}个项目模板`
  };
}
