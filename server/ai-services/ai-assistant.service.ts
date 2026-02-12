/**
 * AI Assistant Service - 核心AI助手服务
 * 
 * 提供四种AI助手功能：
 * 1. AI方案助手 - 基于历史案例推荐清洗设备方案
 * 2. AI报价助手 - 智能生成设备报价
 * 3. AI计划助手 - 智能规划工作计划
 * 4. AI KPI助手 - 绩效评估和提醒
 */

import { invokeLLM } from "../_core/llm";

// AI助手类型
export type AIAssistantType = 'solution' | 'quotation' | 'planning' | 'kpi';

// 对话消息类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// AI方案助手输入
export interface SolutionInput {
  product: string;           // 产品类型
  cleanlinessLevel: string;  // 清洁度要求
  cycleTime: number;         // 节拍（秒）
  loadingForm: string;       // 上下料形式
  additionalRequirements?: string;
}

// AI报价助手输入
export interface QuotationInput {
  projectName: string;
  equipmentType: string;
  specifications: Record<string, any>;
  quantity: number;
  customerId?: string;
}

// AI计划助手输入
export interface PlanningInput {
  planType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  context: {
    companyPlan?: string;
    customerFeedback?: string[];
    projectStatus?: string[];
    meetingMinutes?: string[];
    supervisorAssignments?: string[];
    kpiStatus?: string;
    unfinishedPlans?: string[];
  };
  userId: string;
}

// AI KPI助手输入
export interface KPIInput {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  metrics: {
    tasksCompleted?: number;
    tasksTotal?: number;
    projectProgress?: number;
    customerSatisfaction?: number;
    trainingHours?: number;
  };
}

// 系统提示词
const SYSTEM_PROMPTS: Record<AIAssistantType, string> = {
  solution: `你是GRT智能系统的AI方案助手。你的职责是：
1. 根据客户需求推荐合适的工业清洗设备方案
2. 参考历史案例和GRT的成功项目经验
3. 考虑产品类型、清洁度要求、节拍和上下料形式
4. 提供专业的技术建议和方案对比

回答时请：
- 使用专业但易懂的语言
- 提供具体的设备型号建议
- 说明推荐理由和适用场景
- 如果引用行业案例，请注明来源`,

  quotation: `你是GRT智能系统的AI报价助手。你的职责是：
1. 根据项目需求生成专业的设备报价
2. 参考年度成本基准（人工工时、分摊成本）
3. 考虑设备配置、数量和客户等级
4. 提供合理的价格区间和优惠建议

回答时请：
- 列出详细的报价明细
- 说明价格构成和计算依据
- 提供不同配置的价格对比
- 注明有效期和付款条件`,

  planning: `你是GRT智能系统的AI计划助手。你的职责是：
1. 根据多种输入制定工作计划
2. 整合公司计划、客户反馈、项目状态等信息
3. 优化任务优先级和时间安排
4. 跟踪计划执行情况并提供更新建议

回答时请：
- 按优先级排列任务
- 设定明确的时间节点
- 考虑资源约束和依赖关系
- 提供风险提示和备选方案`,

  kpi: `你是GRT智能系统的AI KPI助手。你的职责是：
1. 科学评估员工绩效表现
2. 提供实时评分和趋势分析
3. 建议合适的沟通时机和内容
4. 发送理性的任务提醒

回答时请：
- 基于数据进行客观评估
- 提供具体的改进建议
- 使用积极正面的沟通方式
- 平衡激励与督促`
};

/**
 * 与AI助手对话
 */
export async function chatWithAssistant(
  type: AIAssistantType,
  messages: ChatMessage[],
  context?: Record<string, any>
): Promise<string> {
  const systemPrompt = SYSTEM_PROMPTS[type];
  
  // 构建上下文信息
  let contextInfo = '';
  if (context) {
    contextInfo = `\n\n当前上下文信息：\n${JSON.stringify(context, null, 2)}`;
  }

  const llmMessages = [
    { role: 'system' as const, content: systemPrompt + contextInfo },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }))
  ];

  try {
    const response = await invokeLLM({
      messages: llmMessages,
    });

    return response.choices[0]?.message?.content || '抱歉，我无法生成回复。';
  } catch (error) {
    console.error(`AI ${type} assistant error:`, error);
    throw new Error(`AI助手服务暂时不可用，请稍后重试。`);
  }
}

/**
 * AI方案推荐
 */
export async function recommendSolution(input: SolutionInput): Promise<{
  recommendation: string;
  suggestedModels: string[];
  confidence: number;
}> {
  const prompt = `请根据以下需求推荐合适的工业清洗设备方案：

产品类型：${input.product}
清洁度要求：${input.cleanlinessLevel}
节拍要求：${input.cycleTime}秒
上下料形式：${input.loadingForm}
${input.additionalRequirements ? `其他要求：${input.additionalRequirements}` : ''}

请提供：
1. 推荐的设备型号（最多3个）
2. 每个型号的适用理由
3. 推荐置信度（0-100）
4. 注意事项和建议`;

  const response = await chatWithAssistant('solution', [
    { role: 'user', content: prompt }
  ]);

  // 解析响应（简化处理，实际应使用结构化输出）
  return {
    recommendation: response,
    suggestedModels: extractModels(response),
    confidence: 85
  };
}

/**
 * AI报价生成
 */
export async function generateQuotation(input: QuotationInput): Promise<{
  quotation: string;
  totalPrice: number;
  breakdown: Record<string, number>;
}> {
  const prompt = `请为以下项目生成设备报价：

项目名称：${input.projectName}
设备类型：${input.equipmentType}
数量：${input.quantity}
规格配置：${JSON.stringify(input.specifications, null, 2)}

请提供：
1. 详细的报价明细
2. 总价和各项费用分解
3. 付款条件建议
4. 有效期说明`;

  const response = await chatWithAssistant('quotation', [
    { role: 'user', content: prompt }
  ]);

  return {
    quotation: response,
    totalPrice: 0, // 需要从响应中解析
    breakdown: {}
  };
}

/**
 * AI计划建议
 */
export async function suggestPlan(input: PlanningInput): Promise<{
  plan: string;
  tasks: Array<{ title: string; priority: string; dueDate: string }>;
}> {
  const contextStr = Object.entries(input.context)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  const prompt = `请为用户制定${input.planType === 'daily' ? '今日' : input.planType === 'weekly' ? '本周' : input.planType === 'monthly' ? '本月' : input.planType === 'quarterly' ? '本季度' : '年度'}工作计划：

参考信息：
${contextStr}

请提供：
1. 按优先级排列的任务清单
2. 每个任务的建议完成时间
3. 需要关注的风险点
4. 资源协调建议`;

  const response = await chatWithAssistant('planning', [
    { role: 'user', content: prompt }
  ], input.context);

  return {
    plan: response,
    tasks: []
  };
}

/**
 * AI KPI评估
 */
export async function evaluateKPI(input: KPIInput): Promise<{
  evaluation: string;
  score: number;
  suggestions: string[];
}> {
  const metricsStr = Object.entries(input.metrics)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const prompt = `请评估以下${input.period === 'daily' ? '今日' : input.period === 'weekly' ? '本周' : input.period === 'monthly' ? '本月' : input.period === 'quarterly' ? '本季度' : '年度'}绩效数据：

绩效指标：
${metricsStr}

请提供：
1. 综合评分（0-100）
2. 各项指标分析
3. 改进建议
4. 激励性评语`;

  const response = await chatWithAssistant('kpi', [
    { role: 'user', content: prompt }
  ]);

  return {
    evaluation: response,
    score: 85,
    suggestions: []
  };
}

// 辅助函数：从响应中提取设备型号
function extractModels(response: string): string[] {
  // 简化实现，实际应使用更复杂的解析逻辑
  const modelPatterns = [
    /GRT-\w+/g,
    /[A-Z]{2,}-\d+/g,
  ];
  
  const models: string[] = [];
  for (const pattern of modelPatterns) {
    const matches = response.match(pattern);
    if (matches) {
      models.push(...matches);
    }
  }
  
  return Array.from(new Set(models)).slice(0, 3);
}
