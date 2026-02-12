/**
 * AI执行模式服务
 * 支持系统内AI（internal）和泛式AI（generative）两种执行模式
 */

import { invokeLLM } from "../_core/llm";
import { v4 as uuidv4 } from "uuid";

// AI执行模式类型
export type AIExecutionMode = "internal" | "generative" | "shadow";

// 执行请求参数
export interface ExecuteRequest {
  assistantType: string;
  mode: AIExecutionMode;
  content: string;
  context?: {
    processType?: string;
    processId?: string;
    stepCode?: string;
    suggestionMode?: string;
  };
}

// 执行结果
export interface ExecuteResult {
  content: string;
  mode: AIExecutionMode;
  sessionId: string;
  timestamp: Date;
  tokensUsed?: number;
}

// 采纳记录
export interface AdoptionRecord {
  sessionId: string;
  isAdopted: boolean;
  feedback?: string;
  timestamp: Date;
}

// 内存存储（生产环境应使用数据库）
const sessionStore = new Map<string, ExecuteResult>();
const adoptionStore = new Map<string, AdoptionRecord>();

// 助手类型配置
const assistantConfigs: Record<string, {
  systemPrompt: string;
  internalKnowledge?: string;
}> = {
  solution: {
    systemPrompt: `你是GRT工业清洗设备的方案设计助手。你的职责是：
1. 根据用户输入的产品、清洁度要求、节拍和上下料形式，推荐合适的清洗方案
2. 参考GRT已有的成功案例和行业最佳实践
3. 提供详细的技术参数建议和设备选型建议
4. 如果参考了行业案例，需要注明来源

请用专业、简洁的语言回答，重点突出技术要点和实施建议。`,
    internalKnowledge: `GRT主要设备型号：
- GRT-SC系列：通过式清洗机，适用于大批量连续清洗
- GRT-UC系列：超声波清洗机，适用于精密零件
- GRT-VC系列：真空干燥清洗机，适用于高清洁度要求
- GRT-HC系列：高压喷淋清洗机，适用于去除顽固污垢

清洁度等级：
- 600μ以下：普通清洗，适用于一般机加工件
- 300μ以下：精密清洗，适用于液压件、气动件
- 100μ以下：高精密清洗，适用于新能源电池壳体
- 50μ以下：超精密清洗，适用于半导体零件`
  },
  quotation: {
    systemPrompt: `你是GRT工业清洗设备的报价助手。你的职责是：
1. 根据设备配置和客户需求，提供合理的报价建议
2. 分析成本结构，优化报价方案
3. 提供竞争力分析和价格策略建议

请提供专业的报价分析和建议。`,
  },
  planning: {
    systemPrompt: `你是GRT的计划管理助手。你的职责是：
1. 帮助制定工作计划（日/周/月计划）
2. 跟踪计划执行情况
3. 提供计划调整建议
4. 协调资源分配

请根据输入信息提供合理的计划建议。`,
  },
  kpi: {
    systemPrompt: `你是GRT的KPI管理助手。你的职责是：
1. 评估员工绩效表现
2. 提供改进建议
3. 生成绩效报告
4. 提醒关键时间节点

请提供客观、公正的绩效分析。`,
  },
  engineering: {
    systemPrompt: `你是GRT的工程技术助手。你的职责是：
1. 提供技术问题解答
2. 协助故障诊断
3. 推荐解决方案
4. 记录技术知识

请提供专业的技术支持。`,
  },
  default: {
    systemPrompt: `你是GRT智能系统的AI助手。请根据用户的问题提供专业、准确的回答。
如果涉及工业清洗设备相关问题，请结合GRT的产品和技术特点进行回答。`,
  }
};

/**
 * 获取助手配置
 */
function getAssistantConfig(assistantType: string) {
  return assistantConfigs[assistantType] || assistantConfigs.default;
}

/**
 * 执行AI请求
 */
export async function executeAI(request: ExecuteRequest): Promise<ExecuteResult> {
  const sessionId = uuidv4();
  const config = getAssistantConfig(request.assistantType);
  
  // 构建系统提示
  let systemPrompt = config.systemPrompt;
  
  // 根据执行模式调整提示
  if (request.mode === "internal") {
    // 系统内AI：使用内部知识库，快速响应
    systemPrompt += `\n\n【执行模式：系统内AI】
请基于GRT内部知识库和已有案例进行回答，优先使用已验证的方案和数据。
回答应简洁明了，突出实用性。`;
    
    if (config.internalKnowledge) {
      systemPrompt += `\n\n【内部知识库】\n${config.internalKnowledge}`;
    }
  } else if (request.mode === "generative") {
    // 泛式AI：广泛分析，深度推理
    systemPrompt += `\n\n【执行模式：泛式AI】
请进行广泛的分析和深度推理，可以参考行业最佳实践和前沿技术。
回答应全面深入，提供多角度的分析和建议。
如果参考了外部资料或行业案例，请注明来源。`;
  } else if (request.mode === "shadow") {
    // 影子模式：后台比对，不干预
    systemPrompt += `\n\n【执行模式：影子模式】
这是一个后台比对模式，请提供你的分析和建议，但这些建议不会直接执行。
请详细说明你的推理过程，以便后续进行人机决策比对分析。`;
  }
  
  // 添加上下文信息
  if (request.context) {
    const contextInfo = [];
    if (request.context.processType) contextInfo.push(`流程类型: ${request.context.processType}`);
    if (request.context.processId) contextInfo.push(`流程ID: ${request.context.processId}`);
    if (request.context.stepCode) contextInfo.push(`当前步骤: ${request.context.stepCode}`);
    if (request.context.suggestionMode) contextInfo.push(`建议模式: ${request.context.suggestionMode}`);
    
    if (contextInfo.length > 0) {
      systemPrompt += `\n\n【当前上下文】\n${contextInfo.join('\n')}`;
    }
  }
  
  try {
    // 调用LLM
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.content }
      ],
      // Note: token limits are controlled by the LLM provider configuration
    });
    
    const content = typeof response.choices[0]?.message?.content === 'string'
      ? response.choices[0].message.content
      : JSON.stringify(response.choices[0]?.message?.content);
    
    const result: ExecuteResult = {
      content,
      mode: request.mode,
      sessionId,
      timestamp: new Date(),
      tokensUsed: response.usage?.total_tokens,
    };
    
    // 存储会话
    sessionStore.set(sessionId, result);
    
    return result;
  } catch (error) {
    console.error("[AI Execution Error]", error);
    throw new Error(`AI执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 记录采纳反馈
 */
export function recordAdoption(
  sessionId: string,
  isAdopted: boolean,
  feedback?: string
): AdoptionRecord {
  const record: AdoptionRecord = {
    sessionId,
    isAdopted,
    feedback,
    timestamp: new Date(),
  };
  
  adoptionStore.set(sessionId, record);
  
  return record;
}

/**
 * 获取模式配置
 */
export function getModeConfig(assistantType: string) {
  const config = getAssistantConfig(assistantType);
  return {
    assistantType,
    hasInternalKnowledge: !!config.internalKnowledge,
    supportedModes: ["internal", "generative", "shadow"] as AIExecutionMode[],
  };
}

/**
 * 获取效果统计
 */
export function getEffectivenessStats(assistantType?: string, mode?: "internal" | "generative") {
  let sessions = Array.from(sessionStore.values());
  const adoptions = Array.from(adoptionStore.values());
  
  // 根据模式过滤
  if (mode) {
    sessions = sessions.filter(s => s.mode === mode);
  }
  
  const totalSessions = sessions.length;
  const adoptedCount = adoptions.filter(a => a.isAdopted).length;
  const adoptionRate = totalSessions > 0 ? (adoptedCount / totalSessions * 100).toFixed(1) : "0";
  
  const byMode = {
    internal: sessions.filter(s => s.mode === "internal").length,
    generative: sessions.filter(s => s.mode === "generative").length,
    shadow: sessions.filter(s => s.mode === "shadow").length,
  };
  
  // 返回数组格式以匹配前端期望
  return [{
    executionMode: mode || "all",
    assistantType: assistantType || "all",
    totalCount: totalSessions,
    adoptedCount,
    adoptionRate: parseFloat(adoptionRate),
    avgResponseTime: 0,
  }];
}

/**
 * 获取最近日志
 */
export function getRecentLogs(limit: number = 10) {
  const sessions = Array.from(sessionStore.values())
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
  
  return sessions.map(s => ({
    sessionId: s.sessionId,
    mode: s.mode,
    timestamp: s.timestamp,
    tokensUsed: s.tokensUsed,
    contentPreview: s.content.substring(0, 100) + (s.content.length > 100 ? '...' : ''),
  }));
}
