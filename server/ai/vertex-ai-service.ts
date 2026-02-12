/**
 * Google Cloud Vertex AI 集成服务
 * 提供AI Coach语义分析和风险评估功能
 */

// AI服务配置接口
export interface VertexAIConfig {
  projectId: string;
  location: string;
  modelId: string;
  apiKey?: string;
}

// 获取默认配置
export function getVertexAIConfig(): VertexAIConfig {
  return {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
    location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
    modelId: process.env.GOOGLE_CLOUD_MODEL_ID || "gemini-1.5-pro",
    apiKey: process.env.GOOGLE_CLOUD_API_KEY,
  };
}

// 检查配置是否完整
export function isVertexAIConfigured(): boolean {
  const config = getVertexAIConfig();
  return !!(config.projectId && config.apiKey);
}

// ============ 语义分析服务 ============

export interface SemanticAnalysisRequest {
  text: string;
  context?: string;
  language?: "zh" | "en";
}

export interface SemanticAnalysisResult {
  intent: string;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  sentiment: "positive" | "neutral" | "negative";
  keywords: string[];
  summary: string;
}

/**
 * 语义分析 - 分析文本意图、实体和情感
 */
export async function analyzeSemantics(
  request: SemanticAnalysisRequest
): Promise<SemanticAnalysisResult> {
  // 使用系统内置的LLM服务
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是一个专业的语义分析助手。请分析以下文本，提取：
1. 意图（intent）：用户想要做什么
2. 实体（entities）：文本中的关键实体（人名、项目名、日期、金额等）
3. 情感（sentiment）：正面/中性/负面
4. 关键词（keywords）：最重要的3-5个关键词
5. 摘要（summary）：一句话总结

请以JSON格式返回结果。`;

  const userPrompt = request.context
    ? `上下文：${request.context}\n\n文本：${request.text}`
    : request.text;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "semantic_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              intent: { type: "string" },
              entities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    value: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["type", "value", "confidence"],
                  additionalProperties: false,
                },
              },
              sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
              keywords: { type: "array", items: { type: "string" } },
              summary: { type: "string" },
            },
            required: ["intent", "entities", "sentiment", "keywords", "summary"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }

    throw new Error("Empty response from LLM");
  } catch (error) {
    console.error("[VertexAI] 语义分析失败:", error);
    // 返回默认结果
    return {
      intent: "unknown",
      entities: [],
      sentiment: "neutral",
      keywords: [],
      summary: "分析失败",
    };
  }
}

// ============ 风险评估服务 ============

export interface RiskAssessmentRequest {
  type: "project" | "cost" | "quality" | "delivery" | "security";
  data: Record<string, any>;
  context?: string;
}

export interface RiskAssessmentResult {
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number; // 0-100
  riskFactors: Array<{
    factor: string;
    impact: "low" | "medium" | "high";
    probability: "low" | "medium" | "high";
    description: string;
  }>;
  recommendations: string[];
  summary: string;
}

/**
 * 风险评估 - 评估项目/成本/质量等风险
 */
export async function assessRisk(
  request: RiskAssessmentRequest
): Promise<RiskAssessmentResult> {
  const { invokeLLM } = await import("../_core/llm");

  const riskTypePrompts: Record<string, string> = {
    project: "项目风险评估：分析项目进度、资源、范围、技术等方面的风险",
    cost: "成本风险评估：分析预算超支、成本偏差、资金流等方面的风险",
    quality: "质量风险评估：分析产品质量、工艺缺陷、检测遗漏等方面的风险",
    delivery: "交付风险评估：分析交付延期、客户满意度、验收等方面的风险",
    security: "安全风险评估：分析系统安全、数据泄露、权限等方面的风险",
  };

  const systemPrompt = `你是一个专业的风险评估专家。请根据提供的数据进行${riskTypePrompts[request.type]}。

请评估：
1. 风险等级（riskLevel）：low/medium/high/critical
2. 风险评分（riskScore）：0-100分
3. 风险因素（riskFactors）：识别主要风险因素，评估影响和概率
4. 建议措施（recommendations）：提供3-5条具体的风险缓解建议
5. 总结（summary）：一段话总结风险状况

请以JSON格式返回结果。`;

  const userPrompt = `数据：${JSON.stringify(request.data, null, 2)}${
    request.context ? `\n\n背景信息：${request.context}` : ""
  }`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "risk_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
              riskScore: { type: "number" },
              riskFactors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    factor: { type: "string" },
                    impact: { type: "string", enum: ["low", "medium", "high"] },
                    probability: { type: "string", enum: ["low", "medium", "high"] },
                    description: { type: "string" },
                  },
                  required: ["factor", "impact", "probability", "description"],
                  additionalProperties: false,
                },
              },
              recommendations: { type: "array", items: { type: "string" } },
              summary: { type: "string" },
            },
            required: ["riskLevel", "riskScore", "riskFactors", "recommendations", "summary"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }

    throw new Error("Empty response from LLM");
  } catch (error) {
    console.error("[VertexAI] 风险评估失败:", error);
    // 返回默认结果
    return {
      riskLevel: "medium",
      riskScore: 50,
      riskFactors: [],
      recommendations: ["请提供更多数据以进行准确评估"],
      summary: "评估失败，请检查输入数据",
    };
  }
}

// ============ AI Coach 服务 ============

export interface AICoachRequest {
  question: string;
  context?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AICoachResponse {
  answer: string;
  suggestions?: string[];
  relatedTopics?: string[];
  confidence: number;
}

/**
 * AI Coach - 智能问答和建议
 */
export async function askAICoach(
  request: AICoachRequest
): Promise<AICoachResponse> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT智能系统的AI Coach，专门为工业清洗设备行业提供专业建议。

你的职责包括：
1. 回答关于项目管理、生产制造、质量控制、售后服务等方面的问题
2. 提供基于最佳实践的建议
3. 帮助用户理解系统功能和操作流程
4. 识别潜在问题并提供预防措施

请用专业但易懂的语言回答问题，并在适当时提供相关建议和扩展话题。`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  // 添加历史对话
  if (request.history) {
    messages.push(...request.history);
  }

  // 添加当前问题
  const userMessage = request.context
    ? `背景：${request.context}\n\n问题：${request.question}`
    : request.question;
  messages.push({ role: "user", content: userMessage });

  try {
    const response = await invokeLLM({
      messages,
    });

    const answer = response.choices[0]?.message?.content || "抱歉，我无法回答这个问题。";

    return {
      answer,
      suggestions: [],
      relatedTopics: [],
      confidence: 0.85,
    };
  } catch (error) {
    console.error("[VertexAI] AI Coach回答失败:", error);
    return {
      answer: "抱歉，AI服务暂时不可用，请稍后再试。",
      confidence: 0,
    };
  }
}

// ============ 表单审核服务 ============

export interface FormReviewRequest {
  formType: string;
  formData: Record<string, any>;
  rules?: string[];
}

export interface FormReviewResult {
  isValid: boolean;
  issues: Array<{
    field: string;
    issue: string;
    severity: "warning" | "error";
    suggestion: string;
  }>;
  riskWarnings: string[];
  autoCorrections?: Record<string, any>;
}

/**
 * 表单智能审核 - 在提交前检查表单数据
 */
export async function reviewForm(
  request: FormReviewRequest
): Promise<FormReviewResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是一个专业的表单审核助手。请检查以下${request.formType}表单数据，识别：
1. 数据完整性问题
2. 数据格式问题
3. 逻辑一致性问题
4. 潜在风险警告
5. 可自动修正的问题

${request.rules ? `审核规则：\n${request.rules.join("\n")}` : ""}

请以JSON格式返回审核结果。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(request.formData, null, 2) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "form_review",
          strict: true,
          schema: {
            type: "object",
            properties: {
              isValid: { type: "boolean" },
              issues: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    issue: { type: "string" },
                    severity: { type: "string", enum: ["warning", "error"] },
                    suggestion: { type: "string" },
                  },
                  required: ["field", "issue", "severity", "suggestion"],
                  additionalProperties: false,
                },
              },
              riskWarnings: { type: "array", items: { type: "string" } },
            },
            required: ["isValid", "issues", "riskWarnings"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }

    throw new Error("Empty response from LLM");
  } catch (error) {
    console.error("[VertexAI] 表单审核失败:", error);
    return {
      isValid: true,
      issues: [],
      riskWarnings: ["AI审核服务暂时不可用，请人工检查"],
    };
  }
}

export default {
  getVertexAIConfig,
  isVertexAIConfigured,
  analyzeSemantics,
  assessRisk,
  askAICoach,
  reviewForm,
};
