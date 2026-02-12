/**
 * AI助手API网关
 * 
 * 功能：
 * 1. 统一的API请求路由
 * 2. 认证和授权检查
 * 3. 请求日志和审计
 * 4. 速率限制
 * 5. 错误处理和重试机制
 */

import { getDb, requireDb } from "../db";
import { aiAssistantConfigs, aiAssistantLogs, aiKnowledgeBases } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { 
  ALL_ASSISTANTS, 
  getAssistantConfig, 
  getAssistantsByCategory, 
  getAssistantsByRole,
  isAssistantEnabled,
  type AiAssistantConfig 
} from "./config";

// 速率限制缓存（简单实现，生产环境应使用Redis）
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

// 会话上下文缓存
const sessionContextCache = new Map<string, { messages: any[]; lastAccess: number }>();

// 清理过期的会话上下文（每5分钟）
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30分钟
  const entries = Array.from(sessionContextCache.entries());
  for (const [key, value] of entries) {
    if (now - value.lastAccess > maxAge) {
      sessionContextCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * 检查速率限制
 */
export function checkRateLimit(
  assistantId: string, 
  userId: number, 
  limitPerMinute: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${assistantId}:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分钟窗口
  
  let record = rateLimitCache.get(key);
  
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
    rateLimitCache.set(key, record);
  }
  
  const remaining = Math.max(0, limitPerMinute - record.count);
  
  if (record.count >= limitPerMinute) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }
  
  record.count++;
  return { allowed: true, remaining: remaining - 1, resetAt: record.resetAt };
}

/**
 * 获取或创建会话上下文
 */
export function getSessionContext(sessionId: string): any[] {
  const context = sessionContextCache.get(sessionId);
  if (context) {
    context.lastAccess = Date.now();
    return context.messages;
  }
  return [];
}

/**
 * 更新会话上下文
 */
export function updateSessionContext(sessionId: string, messages: any[]): void {
  sessionContextCache.set(sessionId, {
    messages: messages.slice(-20), // 保留最近20条消息
    lastAccess: Date.now()
  });
}

/**
 * 清除会话上下文
 */
export function clearSessionContext(sessionId: string): void {
  sessionContextCache.delete(sessionId);
}

/**
 * 记录AI助手调用日志
 */
export async function logAssistantCall(params: {
  assistantId: string;
  userId?: number;
  userName?: string;
  sessionId?: string;
  requestType: string;
  requestSummary?: string;
  responseSummary?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  responseTimeMs?: number;
  status: "success" | "error" | "timeout" | "rate_limited";
  errorMessage?: string;
  metadata?: any;
}): Promise<number | null> {
  const db = await requireDb();
  if (!db) return null;
  
  try {
    const result = await db.insert(aiAssistantLogs).values({
      assistantId: params.assistantId,
      userId: params.userId,
      userName: params.userName,
      sessionId: params.sessionId,
      requestType: params.requestType,
      requestSummary: params.requestSummary,
      responseSummary: params.responseSummary,
      inputTokens: params.inputTokens || 0,
      outputTokens: params.outputTokens || 0,
      totalTokens: params.totalTokens || 0,
      responseTimeMs: params.responseTimeMs,
      status: params.status,
      errorMessage: params.errorMessage,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });
    
    return (result as any).insertId ? Number((result as any).insertId) : null;
  } catch (error) {
    console.error("[AI Gateway] Failed to log assistant call:", error);
    return null;
  }
}

/**
 * 获取助手调用日志
 */
export async function getAssistantLogs(params: {
  assistantId?: string;
  userId?: number;
  sessionId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const db = await requireDb();
  if (!db) return [];
  
  try {
    let query = db.select().from(aiAssistantLogs);
    
    const conditions = [];
    if (params.assistantId) {
      conditions.push(eq(aiAssistantLogs.assistantId, params.assistantId));
    }
    if (params.userId) {
      conditions.push(eq(aiAssistantLogs.userId, params.userId));
    }
    if (params.sessionId) {
      conditions.push(eq(aiAssistantLogs.sessionId, params.sessionId));
    }
    if (params.status) {
      conditions.push(eq(aiAssistantLogs.status, params.status as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const logs = await query
      .orderBy(desc(aiAssistantLogs.createdAt))
      .limit(params.limit || 50)
      .offset(params.offset || 0);
    
    return logs;
  } catch (error) {
    console.error("[AI Gateway] Failed to get assistant logs:", error);
    return [];
  }
}

/**
 * 获取助手统计信息
 */
export async function getAssistantStats(assistantId: string): Promise<{
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  totalTokens: number;
  avgRating: number | null;
}> {
  const db = await requireDb();
  if (!db) {
    return { totalCalls: 0, successRate: 0, avgResponseTime: 0, totalTokens: 0, avgRating: null };
  }
  
  try {
    const stats = await db
      .select({
        totalCalls: sql<number>`COUNT(*)`,
        successCount: sql<number>`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
        avgResponseTime: sql<number>`AVG(responseTimeMs)`,
        totalTokens: sql<number>`SUM(totalTokens)`,
        avgRating: sql<number>`AVG(userRating)`,
      })
      .from(aiAssistantLogs)
      .where(eq(aiAssistantLogs.assistantId, assistantId));
    
    const result = stats[0];
    return {
      totalCalls: Number(result.totalCalls) || 0,
      successRate: result.totalCalls > 0 
        ? (Number(result.successCount) / Number(result.totalCalls)) * 100 
        : 0,
      avgResponseTime: Number(result.avgResponseTime) || 0,
      totalTokens: Number(result.totalTokens) || 0,
      avgRating: result.avgRating ? Number(result.avgRating) : null,
    };
  } catch (error) {
    console.error("[AI Gateway] Failed to get assistant stats:", error);
    return { totalCalls: 0, successRate: 0, avgResponseTime: 0, totalTokens: 0, avgRating: null };
  }
}

/**
 * 调用AI助手
 */
export async function invokeAssistant(params: {
  assistantId: string;
  userId?: number;
  userName?: string;
  sessionId?: string;
  requestType: string;
  messages: Array<{ role: string; content: string }>;
  context?: any;
}): Promise<{
  success: boolean;
  response?: string;
  error?: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  responseTimeMs?: number;
}> {
  const startTime = Date.now();
  
  // 获取助手配置
  const config = getAssistantConfig(params.assistantId);
  if (!config) {
    await logAssistantCall({
      ...params,
      status: "error",
      errorMessage: `Assistant not found: ${params.assistantId}`,
      responseTimeMs: Date.now() - startTime,
    });
    return { success: false, error: `Assistant not found: ${params.assistantId}` };
  }
  
  // 检查助手是否启用
  if (!config.isEnabled) {
    await logAssistantCall({
      ...params,
      status: "error",
      errorMessage: `Assistant is disabled: ${params.assistantId}`,
      responseTimeMs: Date.now() - startTime,
    });
    return { success: false, error: `Assistant is disabled: ${params.assistantId}` };
  }
  
  // 检查速率限制
  if (params.userId) {
    const rateLimit = checkRateLimit(
      params.assistantId, 
      params.userId, 
      config.rateLimit
    );
    
    if (!rateLimit.allowed) {
      await logAssistantCall({
        ...params,
        status: "rate_limited",
        errorMessage: `Rate limit exceeded. Reset at: ${new Date(rateLimit.resetAt).toISOString()}`,
        responseTimeMs: Date.now() - startTime,
      });
      return { 
        success: false, 
        error: `Rate limit exceeded. Please try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds.` 
      };
    }
  }
  
  try {
    // 构建消息列表
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
    
    // 添加系统提示词
    if (config.systemPrompt) {
      messages.push({ role: "system", content: config.systemPrompt });
    }
    
    // 添加会话上下文
    if (params.sessionId) {
      const contextMessages = getSessionContext(params.sessionId);
      messages.push(...contextMessages);
    }
    
    // 添加用户消息
    for (const msg of params.messages) {
      messages.push({ 
        role: msg.role as "user" | "assistant", 
        content: msg.content 
      });
    }
    
    // 调用LLM
    const response = await invokeLLM({
      messages,
      // 可以根据config.modelConfig添加更多参数
    });
    
    const responseTimeMs = Date.now() - startTime;
    const rawContent = response.choices?.[0]?.message?.content;
    const responseContent = typeof rawContent === 'string' 
      ? rawContent 
      : (Array.isArray(rawContent) ? JSON.stringify(rawContent) : "");
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    // 更新会话上下文
    if (params.sessionId) {
      const updatedMessages = [
        ...getSessionContext(params.sessionId),
        ...params.messages.map(m => ({ role: m.role, content: m.content })),
        { role: "assistant", content: responseContent }
      ];
      updateSessionContext(params.sessionId, updatedMessages);
    }
    
    // 记录成功日志
    const lastMessage = params.messages[params.messages.length - 1];
    const requestSummary = typeof lastMessage?.content === 'string' 
      ? lastMessage.content.substring(0, 200) 
      : JSON.stringify(lastMessage?.content).substring(0, 200);
    
    await logAssistantCall({
      ...params,
      requestSummary,
      responseSummary: responseContent.substring(0, 200),
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      responseTimeMs,
      status: "success",
    });
    
    return {
      success: true,
      response: responseContent,
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      responseTimeMs,
    };
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    const isTimeout = error.message?.includes("timeout") || responseTimeMs > 30000;
    
    const lastMsg = params.messages[params.messages.length - 1];
    const reqSummary = typeof lastMsg?.content === 'string' 
      ? lastMsg.content.substring(0, 200) 
      : JSON.stringify(lastMsg?.content).substring(0, 200);
    
    await logAssistantCall({
      ...params,
      requestSummary: reqSummary,
      status: isTimeout ? "timeout" : "error",
      errorMessage: error.message || String(error),
      responseTimeMs,
    });
    
    return {
      success: false,
      error: error.message || "Unknown error occurred",
      responseTimeMs,
    };
  }
}

/**
 * 获取可用的AI助手列表
 */
export function getAvailableAssistants(params?: {
  category?: "business" | "role" | "planning";
  role?: string;
  enabledOnly?: boolean;
}): AiAssistantConfig[] {
  let assistants = ALL_ASSISTANTS;
  
  if (params?.category) {
    assistants = getAssistantsByCategory(params.category);
  }
  
  if (params?.role) {
    assistants = assistants.filter(a => a.allowedRoles.includes(params.role!));
  }
  
  if (params?.enabledOnly !== false) {
    assistants = assistants.filter(a => a.isEnabled);
  }
  
  return assistants;
}

/**
 * 初始化AI助手配置到数据库
 */
export async function initializeAssistantConfigs(): Promise<{
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
}> {
  const db = await requireDb();
  if (!db) {
    return { success: false, created: 0, updated: 0, errors: ["Database not available"] };
  }
  
  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  
  for (const config of ALL_ASSISTANTS) {
    try {
      // 检查是否已存在
      const existing = await db
        .select()
        .from(aiAssistantConfigs)
        .where(eq(aiAssistantConfigs.assistantId, config.id))
        .limit(1);
      
      if (existing.length > 0) {
        // 更新现有配置
        await db
          .update(aiAssistantConfigs)
          .set({
            name: config.displayName,
            description: config.description,
            category: config.category as any,
            systemPrompt: config.systemPrompt,
            allowedRoles: JSON.stringify(config.allowedRoles),
            isEnabled: config.isEnabled ? 1 : 0,
            rateLimitPerMinute: config.rateLimit,
            maxContextLength: config.modelConfig.maxTokens,
            temperature: String(config.modelConfig.temperature),
          } as any)
          .where(eq(aiAssistantConfigs.assistantId, config.id));
        updated++;
      } else {
        // 创建新配置
        await db.insert(aiAssistantConfigs).values({
          assistantId: config.id,
          name: config.displayName,
          description: config.description,
          category: config.category as any,
          systemPrompt: config.systemPrompt,
          allowedRoles: JSON.stringify(config.allowedRoles),
          isEnabled: config.isEnabled ? 1 : 0,
          rateLimitPerMinute: config.rateLimit,
          maxContextLength: config.modelConfig.maxTokens,
          temperature: String(config.modelConfig.temperature),
        } as any);
        created++;
      }
    } catch (error: any) {
      errors.push(`Failed to initialize ${config.id}: ${error.message}`);
    }
  }
  
  return {
    success: errors.length === 0,
    created,
    updated,
    errors,
  };
}

/**
 * 更新用户对助手的评分
 */
export async function updateAssistantRating(
  logId: number,
  rating: number,
  feedback?: string
): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  try {
    await db
      .update(aiAssistantLogs)
      .set({
        userRating: rating,
        userFeedback: feedback,
      })
      .where(eq(aiAssistantLogs.id, logId));
    return true;
  } catch (error) {
    console.error("[AI Gateway] Failed to update rating:", error);
    return false;
  }
}
