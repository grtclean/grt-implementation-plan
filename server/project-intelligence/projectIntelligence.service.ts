/**
 * 项目智能服务 (Project Intelligence Service)
 * Phase D: AI项目智能 — 知识问答 · 相似项目 · 变更影响 · 风险预测
 *
 * 4 core AI functions using invokeLLM + existing knowledge base & embedding services.
 */

import { createChildLogger } from "../lib/logger";
const log = createChildLogger("project-intel");

// ============================================================
// Types
// ============================================================

export interface KnowledgeAnswer {
  answer: string;
  sources: Array<{ title: string; category: string; matchScore: number }>;
}

export interface SimilarProjectMatch {
  caseId: string;
  customer: string;
  industry: string;
  equipment: string;
  similarity: number;
  explanation: string;
}

export interface ChangeImpactResult {
  impactAreas: Array<{
    area: string;
    severity: string;
    description: string;
  }>;
  affectedItems: Array<{
    type: string;
    name: string;
    impact: string;
  }>;
  recommendations: string[];
  riskScore: number;
  estimatedEffort: string;
}

export interface RiskPredictionResult {
  overallRisk: string;
  riskScore: number;
  riskFactors: Array<{
    factor: string;
    probability: string;
    impact: string;
    score: number;
    mitigation: string;
  }>;
  predictions: Array<{
    metric: string;
    prediction: string;
    confidence: number;
  }>;
  recommendations: string[];
}

// ============================================================
// 1. Project Knowledge Q&A (知识库问答)
// ============================================================

export async function askProjectKnowledge(
  question: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<KnowledgeAnswer> {
  const { invokeLLM } = await import("../_core/llm");
  const { searchDocuments } = await import("../modules/knowledge-base.service");

  // Search knowledge base for relevant context
  let kbResults: Array<{ title: string; category: string; content: string; matchScore: number }> = [];
  try {
    kbResults = await searchDocuments(question, { limit: 5 });
  } catch (err) {
    log.error({ err }, "Knowledge base search failed");
  }

  // Also try embedding search for semantic matches
  let embeddingResults: Array<{ documentTitle: string; similarity: number }> = [];
  try {
    const { searchSimilarByText } = await import("../doc-intelligence/embedding.service");
    embeddingResults = await searchSimilarByText(question, { limit: 3, minSimilarity: 0.2 });
  } catch (err) {
    log.error({ err }, "Embedding search failed");
  }

  // Build context from search results
  const contextParts: string[] = [];
  for (const doc of kbResults) {
    contextParts.push(`[${doc.title}] (${doc.category})\n${doc.content}`);
  }
  for (const emb of embeddingResults) {
    if (!kbResults.some((k) => k.title === emb.documentTitle)) {
      contextParts.push(`[${emb.documentTitle}] (语义匹配, 相似度: ${(emb.similarity * 100).toFixed(0)}%)`);
    }
  }

  const contextBlock = contextParts.length > 0
    ? `以下是从知识库中检索到的相关内容：\n\n${contextParts.join("\n\n---\n\n")}`
    : "知识库中未找到直接相关内容，请基于GRT工业清洗设备领域的通用知识回答。";

  const systemPrompt = `你是GRT项目知识助手，专注于工业清洗设备领域。请基于提供的知识库内容回答问题。

规则：
1. 优先使用知识库中的内容回答，并在回答中引用来源标题
2. 如果知识库内容不足以完整回答，可补充通用工业清洗知识
3. 回答应专业、准确、简洁
4. 使用中文回答

${contextBlock}`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  if (conversationHistory) {
    messages.push(...conversationHistory);
  }
  messages.push({ role: "user", content: question });

  try {
    const response = await invokeLLM({ messages });
    const answer = response.choices[0]?.message?.content || "抱歉，无法生成回答。";

    return {
      answer,
      sources: kbResults.map((r) => ({
        title: r.title,
        category: r.category,
        matchScore: r.matchScore,
      })),
    };
  } catch (error) {
    log.error({ err: error }, "askProjectKnowledge failed");
    return {
      answer: "AI服务暂时不可用，请稍后再试。",
      sources: [],
    };
  }
}

// ============================================================
// 2. Similar Project Finder (相似项目搜索)
// ============================================================

export async function findSimilarProjects(params: {
  industry?: string;
  equipment?: string;
  workpiece?: string;
  material?: string;
  standard?: string;
  description?: string;
}): Promise<{ matches: SimilarProjectMatch[] }> {
  const { invokeLLM } = await import("../_core/llm");
  const { searchDocuments } = await import("../modules/knowledge-base.service");

  // Build search query from params
  const queryParts: string[] = [];
  if (params.industry) queryParts.push(params.industry);
  if (params.equipment) queryParts.push(params.equipment);
  if (params.workpiece) queryParts.push(params.workpiece);
  if (params.material) queryParts.push(params.material);
  if (params.standard) queryParts.push(params.standard);
  if (params.description) queryParts.push(params.description);

  const searchQuery = queryParts.join(" ");
  if (!searchQuery.trim()) {
    return { matches: [] };
  }

  // Search knowledge base for case studies
  let kbResults: Array<{ title: string; category: string; content: string; matchScore: number }> = [];
  try {
    kbResults = await searchDocuments(searchQuery, { limit: 10, category: "case_study" });
    // Also search without category filter for broader results
    if (kbResults.length < 3) {
      const broader = await searchDocuments(searchQuery, { limit: 10 });
      for (const r of broader) {
        if (!kbResults.some((k) => k.title === r.title)) {
          kbResults.push(r);
        }
      }
    }
  } catch (err) {
    log.error({ err }, "KB search for similar projects failed");
  }

  // Also try embedding-based semantic search
  try {
    const { searchSimilarByText } = await import("../doc-intelligence/embedding.service");
    const embResults = await searchSimilarByText(searchQuery, { limit: 5, minSimilarity: 0.15 });
    for (const emb of embResults) {
      if (!kbResults.some((k) => k.title === emb.documentTitle)) {
        kbResults.push({
          title: emb.documentTitle,
          category: "embedding_match",
          content: `语义匹配文档: ${emb.documentTitle}`,
          matchScore: Math.round(emb.similarity * 100),
        });
      }
    }
  } catch (err) {
    log.error({ err }, "Embedding search for similar projects failed");
  }

  if (kbResults.length === 0) {
    return { matches: [] };
  }

  // Use LLM to rank and explain similarities
  const systemPrompt = `你是GRT项目匹配专家。请分析知识库中的项目/案例与用户需求的相似度。

用户搜索条件：
- 行业: ${params.industry || "未指定"}
- 设备型号: ${params.equipment || "未指定"}
- 工件: ${params.workpiece || "未指定"}
- 材料: ${params.material || "未指定"}
- 标准: ${params.standard || "未指定"}
- 描述: ${params.description || "未指定"}

请以JSON格式返回匹配结果。`;

  const kbContext = kbResults
    .slice(0, 8)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content.slice(0, 500)}`)
    .join("\n\n");

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `知识库匹配结果：\n\n${kbContext}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "similar_projects",
          strict: true,
          schema: {
            type: "object",
            properties: {
              matches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    caseId: { type: "string" },
                    customer: { type: "string" },
                    industry: { type: "string" },
                    equipment: { type: "string" },
                    similarity: { type: "number" },
                    explanation: { type: "string" },
                  },
                  required: ["caseId", "customer", "industry", "equipment", "similarity", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["matches"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
    return { matches: [] };
  } catch (error) {
    log.error({ err: error }, "findSimilarProjects LLM failed");
    // Fallback: return KB results as-is
    return {
      matches: kbResults.slice(0, 5).map((r) => ({
        caseId: r.title.match(/IC-\d+/)?.[0] || "N/A",
        customer: "知识库匹配",
        industry: r.category,
        equipment: "N/A",
        similarity: Math.min(r.matchScore, 100),
        explanation: r.content.slice(0, 200),
      })),
    };
  }
}

// ============================================================
// 3. Engineering Change Impact Analysis (变更影响分析)
// ============================================================

export async function analyzeChangeImpact(params: {
  changeType: string;
  changeDescription: string;
  affectedComponent?: string;
  projectId?: string;
}): Promise<ChangeImpactResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT工程变更影响分析专家，专注于工业清洗设备领域。

GRT背景知识：
- 产品：工业清洗设备（碳氢真空清洗机、水基清洗线、超声波清洗机等）
- 年产量：约150台设备
- 项目生命周期：M0-M12阶段（M0启动→M3详细设计→M4采购→M6装配→M8 FAT→M12 SAT）
- 生产流程：T1-T15工序（BOM确认→下料→焊接→机加工→表面处理→装配→电气→调试→验收）
- 变更链：设计变更 → BOM变更 → 采购单变更 → 生产计划变更 → 成本变更

请分析给定的工程变更对BOM、采购单(PO)、生产计划、成本、质量的影响。
返回JSON格式结果。`;

  const userPrompt = `变更类型: ${params.changeType}
变更描述: ${params.changeDescription}
${params.affectedComponent ? `影响组件: ${params.affectedComponent}` : ""}
${params.projectId ? `关联项目: ${params.projectId}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "change_impact_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              impactAreas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    area: { type: "string" },
                    severity: { type: "string", enum: ["low", "medium", "high"] },
                    description: { type: "string" },
                  },
                  required: ["area", "severity", "description"],
                  additionalProperties: false,
                },
              },
              affectedItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    name: { type: "string" },
                    impact: { type: "string" },
                  },
                  required: ["type", "name", "impact"],
                  additionalProperties: false,
                },
              },
              recommendations: { type: "array", items: { type: "string" } },
              riskScore: { type: "number" },
              estimatedEffort: { type: "string" },
            },
            required: ["impactAreas", "affectedItems", "recommendations", "riskScore", "estimatedEffort"],
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
    log.error({ err: error }, "analyzeChangeImpact failed");
    return {
      impactAreas: [
        { area: "BOM", severity: "medium", description: "AI分析暂时不可用，建议人工评估BOM影响" },
      ],
      affectedItems: [],
      recommendations: ["AI服务暂时不可用，请人工评估变更影响"],
      riskScore: 50,
      estimatedEffort: "待评估",
    };
  }
}

// ============================================================
// 4. Project Risk Prediction (项目风险预测)
// ============================================================

export async function predictProjectRisk(params: {
  projectName: string;
  currentStage: string;
  totalBudget?: number;
  daysElapsed?: number;
  daysPlanned?: number;
  gatePassRate?: number;
  openIssues?: number;
}): Promise<RiskPredictionResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT项目风险预测专家，基于历史数据和行业经验进行风险分析。

GRT背景知识：
- 年产约150台工业清洗设备
- 项目周期通常6-12个月（M0→M12）
- 阶段划分：M0(启动) M1(需求) M2(方案) M3(设计) M4(采购) M5(验证) M6(装配) M7(调试) M8(FAT) M9(发运) M10(安装) M11(SAT) M12(移交)
- 典型风险模式：
  * M3阶段BOM不完整 → M4采购延迟 → 整体延期2-4周
  * 长交期外购件(>6周)未提前下单 → 交期风险
  * 门径通过率<80% → 质量风险信号
  * 未关闭问题>10个 → 项目健康度下降

请基于提供的项目数据预测风险。返回JSON格式结果。`;

  const userPrompt = `项目名称: ${params.projectName}
当前阶段: ${params.currentStage}
${params.totalBudget ? `总预算: ${params.totalBudget}万元` : ""}
${params.daysElapsed != null ? `已用天数: ${params.daysElapsed}天` : ""}
${params.daysPlanned != null ? `计划天数: ${params.daysPlanned}天` : ""}
${params.gatePassRate != null ? `门径通过率: ${params.gatePassRate}%` : ""}
${params.openIssues != null ? `未关闭问题数: ${params.openIssues}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "risk_prediction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallRisk: { type: "string", enum: ["low", "medium", "high", "critical"] },
              riskScore: { type: "number" },
              riskFactors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    factor: { type: "string" },
                    probability: { type: "string" },
                    impact: { type: "string" },
                    score: { type: "number" },
                    mitigation: { type: "string" },
                  },
                  required: ["factor", "probability", "impact", "score", "mitigation"],
                  additionalProperties: false,
                },
              },
              predictions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    metric: { type: "string" },
                    prediction: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["metric", "prediction", "confidence"],
                  additionalProperties: false,
                },
              },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["overallRisk", "riskScore", "riskFactors", "predictions", "recommendations"],
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
    log.error({ err: error }, "predictProjectRisk failed");
    return {
      overallRisk: "medium",
      riskScore: 50,
      riskFactors: [],
      predictions: [],
      recommendations: ["AI服务暂时不可用，请人工评估项目风险"],
    };
  }
}
