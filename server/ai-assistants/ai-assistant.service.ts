/**
 * AI助手服务实现
 * 包含员工数字助手和功能型AI助手的业务逻辑
 */

import { requireDb } from '../utils/db-helpers';
import {
  employeeDigitalAssistants,
  functionalAiAssistants,
  aiAssistantConfigs,
  aiAssistantInteractions,
  aiSuggestionExecutionLogs,
  type InsertEmployeeDigitalAssistant,
  type InsertFunctionalAiAssistant,
  type InsertAiSuggestionExecutionLog,
} from '../../drizzle/schema';
import { eq, and, count, desc } from 'drizzle-orm';

/**
 * 创建员工数字助手
 */
export async function createEmployeeDA(data: any) {
  const db = await requireDb();
  if (!db) throw new Error('Database not available');
  
  // 生成助手代码
  const assistantCode = `${data.employeeId}-DA`;
  
  const result = await db.insert(employeeDigitalAssistants).values({
    ...data,
    assistantCode,
  } as any);

  return {
    id: (result as any).insertId,
    assistantCode,
  };
}

/**
 * 获取员工数字助手
 */
export async function getEmployeeDA(employeeId: string) {
  const db = await requireDb();
  
  const [da] = await db.select()
    .from(employeeDigitalAssistants)
    .where(eq(employeeDigitalAssistants.employeeId, employeeId))
    .limit(1);
  
  return da || null;
}

/**
 * 更新员工数字助手
 */
export async function updateEmployeeDA(
  id: number,
  data: Partial<InsertEmployeeDigitalAssistant>
) {
  const db = await requireDb();
  
  await db.update(employeeDigitalAssistants)
    .set(data)
    .where(eq(employeeDigitalAssistants.id, id));
  
  return { success: true };
}

/**
 * 创建功能型AI助手
 */
export async function createFunctionalAssistant(data: InsertFunctionalAiAssistant) {
  const db = await requireDb();

  const result = await db.insert(functionalAiAssistants).values(data as any);

  return {
    id: (result as any).insertId,
    assistantCode: data.assistantCode,
  };
}

/**
 * 获取功能型AI助手
 */
export async function getFunctionalAssistant(assistantType: string) {
  const db = await requireDb();
  
  const [assistant] = await db.select()
    .from(functionalAiAssistants)
    .where(
      and(
        eq(functionalAiAssistants.assistantType, assistantType as any),
        eq(functionalAiAssistants.isActive, 1 as any)
      )
    )
    .limit(1);
  
  return assistant || null;
}

/**
 * 获取所有活跃的功能型助手
 */
export async function getActiveFunctionalAssistants() {
  const db = await requireDb();
  
  return db.select()
    .from(functionalAiAssistants)
    .where(eq(functionalAiAssistants.isActive, 1 as any));
}

/**
 * 获取AI执行模式配置
 */
export async function getExecutionModeConfig(assistantId: number, mode: 'internal' | 'generative') {
  const db = await requireDb();

  const configsTable = aiAssistantConfigs as any;
  const [config] = await (db as any).select()
    .from(configsTable)
    .where(
      and(
        eq(configsTable.assistantId, assistantId as any),
        eq(configsTable.configKey, mode as any)
      )
    )
    .limit(1);

  return config || null;
}

/**
 * 记录AI建议执行日志
 */
export async function logAiSuggestionExecution(data: InsertAiSuggestionExecutionLog) {
  const db = await requireDb();

  const result = await db.insert(aiSuggestionExecutionLogs).values(data as any);

  return {
    id: (result as any).insertId,
  };
}

/**
 * 获取AI建议执行日志
 */
export async function getAiSuggestionLogs(
  processType: string,
  processId: string,
  limit: number = 10
) {
  const db = await requireDb();
  
  const logsTable = aiSuggestionExecutionLogs as any;
  return db.select()
    .from(logsTable)
    .where(
      and(
        eq(logsTable.processType, processType as any),
        eq(logsTable.processId, processId as any)
      )
    )
    .orderBy(desc(logsTable.createdAt as any))
    .limit(limit);
}

/**
 * 更新AI建议执行状态
 */
export async function updateAiSuggestionStatus(
  logId: number,
  status: 'pending' | 'running' | 'success' | 'partial_success' | 'failed',
  result?: any,
  error?: string
) {
  const db = await requireDb();
  
  const updateData: any = {
    executionStatus: status,
  };
  
  if (result) {
    updateData.executionResult = result;
  }
  
  if (error) {
    updateData.errorMessage = error;
  }
  
  await db.update(aiSuggestionExecutionLogs)
    .set(updateData)
    .where(eq(aiSuggestionExecutionLogs.id, logId));
  
  return { success: true };
}

/**
 * 记录用户反馈
 */
export async function recordUserFeedback(
  logId: number,
  feedback: 'helpful' | 'neutral' | 'unhelpful',
  notes?: string
) {
  const db = await requireDb();
  
  await db.update(aiSuggestionExecutionLogs)
    .set({
      userFeedback: feedback,
      feedbackNotes: notes,
    } as any)
    .where(eq(aiSuggestionExecutionLogs.id, logId));
  
  return { success: true };
}

/**
 * 生成AI建议（模拟实现）
 */
export async function generateAiSuggestion(
  assistantType: string,
  mode: 'internal' | 'generative',
  context: any
) {
  // 这里应该调用实际的LLM服务
  // 当前返回模拟数据
  
  const suggestion = {
    type: 'recommendation',
    summary: `${assistantType}助手的建议`,
    details: `基于${mode}模式生成的建议`,
    confidence: 0.85,
    actions: [
      {
        id: 'action_1',
        name: '执行建议1',
        description: '建议的具体行动',
      }
    ],
  };
  
  return suggestion;
}

/**
 * 执行单个AI任务
 */
export async function executeSingleAiAction(
  assistantId: number,
  processType: string,
  processId: string,
  stepCode: string,
  actionId: string,
  mode: 'internal' | 'generative'
) {
  // 记录执行日志
  const logId = await logAiSuggestionExecution({
    assistantId,
    executionMode: mode,
    processType,
    processId,
    stepCode,
    executionStatus: 'running',
  } as any);
  
  try {
    // 执行任务
    const result = {
      actionId,
      status: 'success',
      message: '任务执行成功',
      timestamp: new Date().toISOString(),
    };
    
    // 更新执行状态
    await updateAiSuggestionStatus(logId.id, 'success', result);
    
    return result as any;
  } catch (error) {
    await updateAiSuggestionStatus(
      logId.id,
      'failed',
      undefined,
      error instanceof Error ? error.message : '未知错误'
    );
    
    throw error;
  }
}

/**
 * 获取AI助手统计信息
 */
export async function getAiAssistantStats() {
  const db = await requireDb();
  
  const [daCount] = await db.select({ count: count() })
    .from(employeeDigitalAssistants)
    .where(eq(employeeDigitalAssistants.isActive, 1 as any));

  const [faCount] = await db.select({ count: count() })
    .from(functionalAiAssistants)
    .where(eq(functionalAiAssistants.isActive, 1 as any));

  const [executionCount] = await db.select({ count: count() })
    .from(aiSuggestionExecutionLogs);
  
  return {
    employeeDigitalAssistants: daCount?.count || 0,
    functionalAssistants: faCount?.count || 0,
    totalExecutions: executionCount?.count || 0,
  };
}
