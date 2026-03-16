/**
 * AI assistant dual-layer architecture
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, and } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  employeeDigitalAssistants, EmployeeDigitalAssistant, functionalAiAssistants, FunctionalAiAssistant,
  aiProcessSuggestions, AiProcessSuggestion, aiSuggestionExecutionLogs, AiSuggestionExecutionLog,
} from "../../drizzle/schema";

// ============================================
// AI助手双层体系架构 - v2.1.0
// RFC-023: AI助手双层体系架构
// ============================================

// ============================================
// 员工数字助手(DA)管理
// ============================================

/**
 * 创建员工数字助手
 * 自动生成 {employeeId}-DA 格式的助手代码
 */
export async function createEmployeeDA(data: {
  employeeId: string;
  displayName?: string;
  workHabits?: object;
  preferences?: object;
  expertise?: string[];
  communicationStyle?: string;
}): Promise<EmployeeDigitalAssistant | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const assistantCode = `${data.employeeId}-DA`;
  
  const result = await db.insert(employeeDigitalAssistants).values({
    employeeId: data.employeeId,
    assistantCode,
    displayName: data.displayName || `${data.employeeId}的数字助手`,
    workHabits: data.workHabits ? JSON.stringify(data.workHabits) : null,
    preferences: data.preferences ? JSON.stringify(data.preferences) : null,
    expertise: data.expertise ? JSON.stringify(data.expertise) : null,
    communicationStyle: data.communicationStyle,
  });
  
  const [created] = await db.select().from(employeeDigitalAssistants)
    .where(eq(employeeDigitalAssistants.assistantCode, assistantCode))
    .limit(1000);
  return created || null;
}

/**
 * 获取员工的数字助手
 */
export async function getEmployeeDAByEmployeeId(employeeId: string): Promise<EmployeeDigitalAssistant | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const [da] = await db.select().from(employeeDigitalAssistants)
    .where(eq(employeeDigitalAssistants.employeeId, employeeId))
    .limit(1000);
  return da || null;
}

/**
 * 获取所有员工数字助手
 */
export async function getAllEmployeeDAs(filters?: {
  isActive?: boolean;
}): Promise<EmployeeDigitalAssistant[]> {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(employeeDigitalAssistants);
  
  if (filters?.isActive !== undefined) {
    query = query.where(eq(employeeDigitalAssistants.isActive, filters.isActive as any)) as typeof query;
  }
  
  return await query.orderBy(desc(employeeDigitalAssistants.createdAt)).limit(1000);
}

/**
 * 更新员工数字助手
 */
export async function updateEmployeeDA(
  id: number,
  data: Partial<{
    displayName: string;
    workHabits: object;
    preferences: object;
    expertise: string[];
    communicationStyle: string;
    canTaskAssist: boolean;
    canScheduleManage: boolean;
    canDocumentDraft: boolean;
    canDataAnalysis: boolean;
    canCommunicationProxy: boolean;
    isActive: boolean;
  }>
): Promise<EmployeeDigitalAssistant | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const updateData: Record<string, any> = {};
  
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.workHabits !== undefined) updateData.workHabits = JSON.stringify(data.workHabits);
  if (data.preferences !== undefined) updateData.preferences = JSON.stringify(data.preferences);
  if (data.expertise !== undefined) updateData.expertise = JSON.stringify(data.expertise);
  if (data.communicationStyle !== undefined) updateData.communicationStyle = data.communicationStyle;
  if (data.canTaskAssist !== undefined) updateData.canTaskAssist = data.canTaskAssist;
  if (data.canScheduleManage !== undefined) updateData.canScheduleManage = data.canScheduleManage;
  if (data.canDocumentDraft !== undefined) updateData.canDocumentDraft = data.canDocumentDraft;
  if (data.canDataAnalysis !== undefined) updateData.canDataAnalysis = data.canDataAnalysis;
  if (data.canCommunicationProxy !== undefined) updateData.canCommunicationProxy = data.canCommunicationProxy;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  
  await db.update(employeeDigitalAssistants)
    .set(updateData)
    .where(eq(employeeDigitalAssistants.id, id));
  
  const [updated] = await db.select().from(employeeDigitalAssistants)
    .where(eq(employeeDigitalAssistants.id, id));
  return updated || null;
}

/**
 * 记录员工DA活动时间
 */
export async function recordEmployeeDAActivity(id: number): Promise<void> {
  const db = await requireDb();
  if (!db) return;
  
  await db.update(employeeDigitalAssistants)
    .set({ lastActiveAt: new Date().toISOString() })
    .where(eq(employeeDigitalAssistants.id, id));
}

// ============================================
// 功能型AI助手管理
// ============================================

/**
 * 获取所有功能型AI助手
 */
export async function getAllFunctionalAssistants(filters?: {
  isActive?: boolean;
  assistantType?: string;
}): Promise<FunctionalAiAssistant[]> {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(functionalAiAssistants);
  
  const conditions = [];
  if (filters?.isActive !== undefined) {
    conditions.push(eq(functionalAiAssistants.isActive, filters.isActive as any));
  }
  if (filters?.assistantType) {
    conditions.push(eq(functionalAiAssistants.assistantType, filters.assistantType as any));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  return await query.orderBy(functionalAiAssistants.assistantType).limit(1000);
}

/**
 * 获取指定类型的功能型AI助手
 */
export async function getFunctionalAssistantByType(
  assistantType: "solution" | "quotation" | "planning" | "kpi" | "interview" | "purchase" | "engineering" | "quality"
): Promise<FunctionalAiAssistant | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const [assistant] = await db.select().from(functionalAiAssistants)
    .where(eq(functionalAiAssistants.assistantType, assistantType))
    .limit(1000);
  return assistant || null;
}

/**
 * 更新功能型AI助手配置
 */
export async function updateFunctionalAssistant(
  id: number,
  data: Partial<{
    displayName: string;
    description: string;
    systemPrompt: string;
    temperature: string;
    maxTokens: number;
    dataAccess: string[];
    actions: string[];
    integrations: string[];
    isActive: boolean;
    version: string;
  }>
): Promise<FunctionalAiAssistant | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const updateData: Record<string, any> = {};
  
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
  if (data.temperature !== undefined) updateData.temperature = data.temperature;
  if (data.maxTokens !== undefined) updateData.maxTokens = data.maxTokens;
  if (data.dataAccess !== undefined) updateData.dataAccess = JSON.stringify(data.dataAccess);
  if (data.actions !== undefined) updateData.actions = JSON.stringify(data.actions);
  if (data.integrations !== undefined) updateData.integrations = JSON.stringify(data.integrations);
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.version !== undefined) updateData.version = data.version;
  
  await db.update(functionalAiAssistants)
    .set(updateData)
    .where(eq(functionalAiAssistants.id, id));
  
  const [updated] = await db.select().from(functionalAiAssistants)
    .where(eq(functionalAiAssistants.id, id));
  return updated || null;
}

// ============================================
// AI流程建议管理
// ============================================

/**
 * 创建AI流程建议
 */
export async function createAiProcessSuggestion(data: {
  processType: string;
  processId: string;
  stepCode: string;
  stepName?: string;
  suggestionMode: "full_process" | "current_step" | "single_action";
  suggestionSummary?: string;
  suggestionDetails?: string[];
  suggestedActions?: Array<{ actionId: string; actionName: string; description: string }>;
  references?: Array<{ type: string; title: string; url: string }>;
  priority?: "high" | "medium" | "low";
  estimatedTime?: number;
  assistantId?: number;
  assistantType?: string;
}): Promise<AiProcessSuggestion | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(aiProcessSuggestions).values({
    processType: data.processType,
    processId: data.processId,
    stepCode: data.stepCode,
    stepName: data.stepName,
    suggestionMode: data.suggestionMode,
    suggestionSummary: data.suggestionSummary,
    suggestionDetails: data.suggestionDetails ? JSON.stringify(data.suggestionDetails) : null,
    suggestedActions: data.suggestedActions ? JSON.stringify(data.suggestedActions) : null,
    references: data.references ? JSON.stringify(data.references) : null,
    priority: data.priority || "medium",
    estimatedTime: data.estimatedTime,
    assistantId: data.assistantId,
    assistantType: data.assistantType,
  });
  
  const [created] = await db.select().from(aiProcessSuggestions)
    .orderBy(desc(aiProcessSuggestions.id))
    .limit(1);
  return created || null;
}

/**
 * 获取全过程AI建议
 */
export async function getFullProcessSuggestions(
  processType: string,
  processId: string
): Promise<AiProcessSuggestion[]> {
  const db = await requireDb();
  if (!db) return [];
  
  return await db.select().from(aiProcessSuggestions)
    .where(and(
      eq(aiProcessSuggestions.processType, processType),
      eq(aiProcessSuggestions.processId, processId),
      eq(aiProcessSuggestions.suggestionMode, "full_process")
    ))
    .orderBy(aiProcessSuggestions.stepCode)
    .limit(1000);
}

/**
 * 获取当前步骤AI建议
 */
export async function getCurrentStepSuggestion(
  processType: string,
  processId: string,
  stepCode: string
): Promise<AiProcessSuggestion | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const [suggestion] = await db.select().from(aiProcessSuggestions)
    .where(and(
      eq(aiProcessSuggestions.processType, processType),
      eq(aiProcessSuggestions.processId, processId),
      eq(aiProcessSuggestions.stepCode, stepCode),
      eq(aiProcessSuggestions.suggestionMode, "current_step")
    ))
    .orderBy(desc(aiProcessSuggestions.createdAt))
    .limit(1);
  
  return suggestion || null;
}

/**
 * 标记AI建议已应用
 */
export async function markSuggestionApplied(
  id: number,
  appliedBy: string,
  applyResult?: object
): Promise<AiProcessSuggestion | null> {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(aiProcessSuggestions)
    .set({
      isApplied: true as any,
      appliedAt: new Date().toISOString(),
      appliedBy,
      applyResult: applyResult ? JSON.stringify(applyResult) : null,
    })
    .where(eq(aiProcessSuggestions.id, id));
  
  const [updated] = await db.select().from(aiProcessSuggestions)
    .where(eq(aiProcessSuggestions.id, id));
  return updated || null;
}

/**
 * 创建AI建议执行日志
 */
export async function createSuggestionExecutionLog(data: {
  suggestionId: number;
  actionId: string;
  actionName?: string;
  executedBy: string;
}): Promise<AiSuggestionExecutionLog | null> {
  const db = await requireDb();
  if (!db) return null;
  
  await db.insert(aiSuggestionExecutionLogs).values({
    suggestionId: data.suggestionId,
    actionId: data.actionId,
    actionName: data.actionName,
    executedBy: data.executedBy,
    status: "pending",
    startedAt: new Date().toISOString(),
  });
  
  const [created] = await db.select().from(aiSuggestionExecutionLogs)
    .orderBy(desc(aiSuggestionExecutionLogs.id))
    .limit(1);
  return created || null;
}

/**
 * 更新AI建议执行状态
 */
export async function updateSuggestionExecutionStatus(
  id: number,
  status: "pending" | "running" | "completed" | "failed",
  result?: object,
  errorMessage?: string,
  nextSuggestion?: string
): Promise<AiSuggestionExecutionLog | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const updateData: Record<string, any> = { status };
  
  if (result !== undefined) updateData.result = JSON.stringify(result);
  if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
  if (nextSuggestion !== undefined) updateData.nextSuggestion = nextSuggestion;
  
  if (status === "completed" || status === "failed") {
    updateData.completedAt = new Date().toISOString();
  }
  
  await db.update(aiSuggestionExecutionLogs)
    .set(updateData)
    .where(eq(aiSuggestionExecutionLogs.id, id));
  
  const [updated] = await db.select().from(aiSuggestionExecutionLogs)
    .where(eq(aiSuggestionExecutionLogs.id, id));
  return updated || null;
}

/**
 * 获取建议的执行日志
 */
export async function getSuggestionExecutionLogs(suggestionId: number): Promise<AiSuggestionExecutionLog[]> {
  const db = await requireDb();
  if (!db) return [];
  
  return await db.select().from(aiSuggestionExecutionLogs)
    .where(eq(aiSuggestionExecutionLogs.suggestionId, suggestionId))
    .orderBy(desc(aiSuggestionExecutionLogs.createdAt))
    .limit(1000);
}
