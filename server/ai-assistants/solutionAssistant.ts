/**
 * AI Solution Assistant - 方案准备助手
 * 
 * 核心功能：
 * 1. GRT方案优先推荐 - 从历史成功案例中优先匹配
 * 2. 工艺参数处理 - 解析产品、清洁度、节拍、上下料等
 * 3. 同行方案参照 - 参考行业方案并标注备注
 * 4. 持续学习 - 从已交付项目中学习
 * 5. 设备关联 - 关联设备型号和项目号
 */

import { getDb, requireDb } from "../db";
import { 
  historicalSolutions, 
  solutionRecommendations, 
  processTemplates,
  solutionLearningRecords,
  type HistoricalSolution,
  type InsertHistoricalSolution,
  type InsertSolutionRecommendation,
  type InsertSolutionLearningRecord
} from "../../drizzle/schema";
import { eq, like, and, or, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ai-solution-assistant");

// ============================================================================
// 类型定义
// ============================================================================

/** 工艺参数输入 */
export interface ProcessParameters {
  // 产品信息
  workpieceName: string;
  workpieceType?: string;
  workpieceMaterial?: string;
  workpieceDimensions?: string;
  workpieceWeight?: number;
  
  // 清洁度要求
  cleanlinessStandard?: string;
  cleanlinessValue?: string;
  particleSize?: string;
  residueLimit?: string;
  
  // 节拍要求
  targetCycleTime?: number;
  dailyCapacity?: number;
  shifts?: number;
  
  // 上下料
  loadingMethod?: string;
  unloadingMethod?: string;
  palletSpec?: string;
  
  // 特殊要求
  blindHoleCleaning?: boolean;
  deburring?: boolean;
  rustPrevention?: boolean;
  
  // 其他
  additionalRequirements?: string;
}

/** 方案推荐结果 */
export interface SolutionRecommendation {
  rank: number;
  source: "grt_internal" | "competitor" | "industry_standard" | "ai_generated";
  solutionId: string;
  solutionName: string;
  projectNo?: string;
  equipmentModel: string;
  similarityScore: number;
  customerReference?: string;
  highlights: string[];
  notes: string;
  processFlow?: string[];
  estimatedCycleTime?: number;
}

/** 推荐报告 */
export interface RecommendationReport {
  recommendationId: string;
  createdAt: string;
  inputSummary: {
    workpiece: string;
    cleanliness: string;
    cycleTime: string;
    loading: string;
  };
  recommendations: SolutionRecommendation[];
  processFlowSuggestion: {
    steps: string[];
    estimatedCycleTime: number;
    equipmentRecommendation: string;
  };
}

// ============================================================================
// 工艺参数解析
// ============================================================================

/**
 * 使用AI解析自然语言工艺参数
 */
export async function parseProcessParameters(naturalLanguageInput: string): Promise<ProcessParameters> {
  const systemPrompt = `你是GRT工业清洗设备的工艺参数解析助手。请从用户输入中提取以下工艺参数，以JSON格式返回：

{
  "workpieceName": "工件名称",
  "workpieceType": "工件类型（shell/shaft/gear/valve/cylinder/precision/other）",
  "workpieceMaterial": "材质（铝合金/铸铁/不锈钢等）",
  "workpieceDimensions": "尺寸（如500×400×300mm）",
  "workpieceWeight": 重量数值（kg）,
  "cleanlinessStandard": "清洁度标准（VDA19.1/ISO16232/GJB420等）",
  "cleanlinessValue": "清洁度指标值",
  "particleSize": "颗粒度要求",
  "residueLimit": "残留物限制",
  "targetCycleTime": 目标节拍数值（秒）,
  "dailyCapacity": 日产量数值,
  "shifts": 班次数值,
  "loadingMethod": "上料方式（人工/机器人/AGV/输送线）",
  "unloadingMethod": "下料方式",
  "palletSpec": "托盘规格",
  "blindHoleCleaning": 是否需要盲孔清洗（true/false）,
  "deburring": 是否需要去毛刺（true/false）,
  "rustPrevention": 是否需要防锈处理（true/false）,
  "additionalRequirements": "其他要求"
}

如果某个参数无法从输入中提取，请设为null。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: naturalLanguageInput }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "process_parameters",
          strict: true,
          schema: {
            type: "object",
            properties: {
              workpieceName: { type: ["string", "null"] },
              workpieceType: { type: ["string", "null"] },
              workpieceMaterial: { type: ["string", "null"] },
              workpieceDimensions: { type: ["string", "null"] },
              workpieceWeight: { type: ["number", "null"] },
              cleanlinessStandard: { type: ["string", "null"] },
              cleanlinessValue: { type: ["string", "null"] },
              particleSize: { type: ["string", "null"] },
              residueLimit: { type: ["string", "null"] },
              targetCycleTime: { type: ["number", "null"] },
              dailyCapacity: { type: ["number", "null"] },
              shifts: { type: ["number", "null"] },
              loadingMethod: { type: ["string", "null"] },
              unloadingMethod: { type: ["string", "null"] },
              palletSpec: { type: ["string", "null"] },
              blindHoleCleaning: { type: ["boolean", "null"] },
              deburring: { type: ["boolean", "null"] },
              rustPrevention: { type: ["boolean", "null"] },
              additionalRequirements: { type: ["string", "null"] }
            },
            required: ["workpieceName"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("AI响应为空或格式错误");
    }

    return JSON.parse(content) as ProcessParameters;
  } catch (error) {
    log.error({ err: error }, "[Solution Assistant] 参数解析失败:");
    // 返回基础参数
    return {
      workpieceName: naturalLanguageInput,
      additionalRequirements: naturalLanguageInput
    };
  }
}

// ============================================================================
// 方案匹配算法
// ============================================================================

/**
 * 计算方案相似度
 */
function calculateSimilarity(params: ProcessParameters, solution: HistoricalSolution): number {
  let score = 0;
  let totalWeight = 0;

  // 工件类型匹配 (30%)
  const workpieceWeight = 0.30;
  totalWeight += workpieceWeight;
  if (params.workpieceType && solution.workpieceCategory) {
    if (params.workpieceType === solution.workpieceCategory) {
      score += workpieceWeight * 1.0;
    } else if (isRelatedWorkpiece(params.workpieceType, solution.workpieceCategory)) {
      score += workpieceWeight * 0.5;
    }
  } else if (params.workpieceName && solution.workpieceType) {
    if (solution.workpieceType.includes(params.workpieceName) || 
        params.workpieceName.includes(solution.workpieceType || "")) {
      score += workpieceWeight * 0.8;
    }
  }

  // 清洁度要求匹配 (25%)
  const cleanlinessWeight = 0.25;
  totalWeight += cleanlinessWeight;
  if (params.cleanlinessStandard && solution.cleanlinessStandard) {
    if (params.cleanlinessStandard === solution.cleanlinessStandard) {
      score += cleanlinessWeight * 1.0;
    } else if (isCompatibleCleanliness(params.cleanlinessStandard, solution.cleanlinessStandard)) {
      score += cleanlinessWeight * 0.8;
    }
  }

  // 节拍要求匹配 (20%)
  const cycleTimeWeight = 0.20;
  totalWeight += cycleTimeWeight;
  if (params.targetCycleTime && solution.cycleTime) {
    const deviation = Math.abs(params.targetCycleTime - solution.cycleTime) / params.targetCycleTime;
    if (solution.cycleTime <= params.targetCycleTime) {
      score += cycleTimeWeight * 1.0;
    } else if (deviation < 0.1) {
      score += cycleTimeWeight * 0.9;
    } else if (deviation < 0.2) {
      score += cycleTimeWeight * 0.7;
    }
  }

  // 工件尺寸匹配 (15%)
  const dimensionWeight = 0.15;
  totalWeight += dimensionWeight;
  if (params.workpieceDimensions && solution.workpieceDimensions) {
    // 简单的尺寸兼容性检查
    score += dimensionWeight * 0.8;
  }

  // 特殊要求匹配 (10%)
  const specialWeight = 0.10;
  totalWeight += specialWeight;
  if (solution.specialRequirements) {
    try {
      const specialReqs = JSON.parse(solution.specialRequirements);
      let matchCount = 0;
      let totalReqs = 0;
      
      if (params.blindHoleCleaning !== undefined) {
        totalReqs++;
        if (specialReqs.blindHoleCleaning === params.blindHoleCleaning) matchCount++;
      }
      if (params.deburring !== undefined) {
        totalReqs++;
        if (specialReqs.deburring === params.deburring) matchCount++;
      }
      if (params.rustPrevention !== undefined) {
        totalReqs++;
        if (specialReqs.rustPrevention === params.rustPrevention) matchCount++;
      }
      
      if (totalReqs > 0) {
        score += specialWeight * (matchCount / totalReqs);
      }
    } catch {
      // 忽略解析错误
    }
  }

  return totalWeight > 0 ? score / totalWeight : 0;
}

/**
 * 检查工件类型是否相关
 */
function isRelatedWorkpiece(type1: string, type2: string): boolean {
  const relatedGroups = [
    ["shell", "cylinder", "valve"],
    ["shaft", "gear"],
    ["precision", "valve"]
  ];
  
  for (const group of relatedGroups) {
    if (group.includes(type1) && group.includes(type2)) {
      return true;
    }
  }
  return false;
}

/**
 * 检查清洁度标准是否兼容
 */
function isCompatibleCleanliness(standard1: string, standard2: string): boolean {
  const compatibleGroups = [
    ["VDA19.1", "ISO16232", "PV3349", "PV3370"],
    ["GJB420", "NAS1638"],
    ["ISO4407", "ISO4406"]
  ];
  
  for (const group of compatibleGroups) {
    if (group.some(s => standard1.includes(s)) && group.some(s => standard2.includes(s))) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// 核心推荐功能
// ============================================================================

/**
 * 推荐方案
 */
export async function recommendSolutions(
  params: ProcessParameters,
  userId: number,
  maxResults: number = 5
): Promise<RecommendationReport> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  
  // 1. 获取所有可参考的历史方案
  const allSolutions = await db
    .select()
    .from(historicalSolutions)
    .where(and(
      eq(historicalSolutions.isActive, 1),
      eq(historicalSolutions.isReference, 1)
    ))
    .orderBy(desc(historicalSolutions.successRate));

  // 2. 计算相似度并排序
  const scoredSolutions = allSolutions.map(solution => ({
    solution,
    score: calculateSimilarity(params, solution)
  })).sort((a, b) => {
    // 优先GRT内部方案
    if (a.solution.sourceType === "grt_internal" && b.solution.sourceType !== "grt_internal") {
      return -1;
    }
    if (a.solution.sourceType !== "grt_internal" && b.solution.sourceType === "grt_internal") {
      return 1;
    }
    // 然后按相似度排序
    return b.score - a.score;
  });

  // 3. 生成推荐结果
  const recommendations: SolutionRecommendation[] = scoredSolutions
    .slice(0, maxResults)
    .map((item, index) => {
      const solution = item.solution;
      const highlights: string[] = [];
      
      if (solution.sourceType === "grt_internal") {
        highlights.push("GRT内部成功案例，推荐优先考虑");
      }
      if (solution.successRate && Number(solution.successRate) >= 95) {
        highlights.push(`高成功率：${solution.successRate}%`);
      }
      if (solution.cycleTime && params.targetCycleTime && solution.cycleTime <= params.targetCycleTime) {
        highlights.push(`节拍满足要求（${solution.cycleTime}秒/件）`);
      }
      if (solution.cleanlinessStandard) {
        highlights.push(`清洁度标准：${solution.cleanlinessStandard}`);
      }

      let processFlow: string[] | undefined;
      if (solution.processFlow) {
        try {
          processFlow = JSON.parse(solution.processFlow);
        } catch {
          // 忽略解析错误
        }
      }

      return {
        rank: index + 1,
        source: solution.sourceType as "grt_internal" | "competitor" | "industry_standard",
        solutionId: solution.solutionId,
        solutionName: solution.solutionName,
        projectNo: solution.projectNo || undefined,
        equipmentModel: solution.equipmentModel || "待定",
        similarityScore: Math.round(item.score * 100) / 100,
        customerReference: solution.customerName || undefined,
        highlights,
        notes: solution.sourceType === "grt_internal" 
          ? "GRT内部成功案例" 
          : solution.sourceType === "competitor"
            ? "竞品方案参照（需标注来源）"
            : "行业标准方案",
        processFlow,
        estimatedCycleTime: solution.cycleTime || undefined
      };
    });

  // 4. 生成推荐ID
  const recommendationId = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // 5. 生成工艺流程建议
  const processFlowSuggestion = await generateProcessFlowSuggestion(params, recommendations);

  // 6. 保存推荐记录
  await db.insert(solutionRecommendations).values({
    recommendationId,
    userId,
    inputParameters: JSON.stringify(params),
    recommendations: JSON.stringify(recommendations)
  });

  // 7. 返回推荐报告
  return {
    recommendationId,
    createdAt: new Date().toISOString(),
    inputSummary: {
      workpiece: params.workpieceName,
      cleanliness: params.cleanlinessStandard 
        ? `${params.cleanlinessStandard}${params.cleanlinessValue ? `, ${params.cleanlinessValue}` : ""}`
        : "未指定",
      cycleTime: params.targetCycleTime ? `${params.targetCycleTime}秒/件` : "未指定",
      loading: params.loadingMethod || "未指定"
    },
    recommendations,
    processFlowSuggestion
  };
}

/**
 * 生成工艺流程建议
 */
async function generateProcessFlowSuggestion(
  params: ProcessParameters,
  recommendations: SolutionRecommendation[]
): Promise<{
  steps: string[];
  estimatedCycleTime: number;
  equipmentRecommendation: string;
}> {
  // 从推荐方案中提取最佳工艺流程
  const bestRecommendation = recommendations[0];
  
  if (bestRecommendation?.processFlow && bestRecommendation.processFlow.length > 0) {
    return {
      steps: bestRecommendation.processFlow,
      estimatedCycleTime: bestRecommendation.estimatedCycleTime || params.targetCycleTime || 60,
      equipmentRecommendation: bestRecommendation.equipmentModel
    };
  }

  // 根据工件类型生成默认工艺流程
  const defaultFlows: Record<string, string[]> = {
    shell: [
      "上料",
      "预清洗（喷淋）",
      "超声波清洗",
      "定点高压清洗",
      "漂洗",
      "热风干燥",
      "真空干燥",
      "冷却",
      "下料"
    ],
    shaft: [
      "上料",
      "退磁",
      "定点清洗",
      "旋转湍流超声清洗",
      "热风干燥",
      "真空干燥",
      "下料"
    ],
    gear: [
      "上料",
      "退磁",
      "定点高压清洗",
      "旋转索流漂洗",
      "精漂洗",
      "热风真空干燥",
      "冷却",
      "下料"
    ],
    precision: [
      "上料",
      "定点高压清洗",
      "切水",
      "旋转索流漂洗",
      "精漂洗",
      "热风真空干燥",
      "冷却",
      "下料"
    ]
  };

  const workpieceType = params.workpieceType || "shell";
  const steps = defaultFlows[workpieceType] || defaultFlows.shell;

  // 根据工件类型推荐设备
  const equipmentMap: Record<string, string> = {
    shell: "GRT-TC2100W",
    shaft: "GRT-SC800W-SF",
    gear: "GRT-MC888W",
    precision: "GRT-Eco SF",
    valve: "GRT-HP1200",
    cylinder: "GRT-RW2000"
  };

  return {
    steps,
    estimatedCycleTime: params.targetCycleTime || 60,
    equipmentRecommendation: equipmentMap[workpieceType] || "GRT-SC800W"
  };
}

// ============================================================================
// 持续学习功能
// ============================================================================

/**
 * 从项目交付中学习
 */
export async function learnFromProjectDelivery(
  solutionId: string,
  projectNo: string,
  learningContent: {
    actualCycleTime?: number;
    actualCleanliness?: string;
    customerFeedback?: string;
    issuesEncountered?: string[];
    optimizations?: string[];
    performanceMetrics?: Record<string, number>;
  }
): Promise<void> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  
  const learningId = `LEARN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  // 提取关键发现
  const keyFindings: string[] = [];
  
  if (learningContent.actualCycleTime) {
    keyFindings.push(`实际节拍：${learningContent.actualCycleTime}秒`);
  }
  if (learningContent.actualCleanliness) {
    keyFindings.push(`实际清洁度：${learningContent.actualCleanliness}`);
  }
  if (learningContent.customerFeedback) {
    keyFindings.push(`客户反馈：${learningContent.customerFeedback}`);
  }
  if (learningContent.optimizations && learningContent.optimizations.length > 0) {
    keyFindings.push(`优化措施：${learningContent.optimizations.join("、")}`);
  }

  await db.insert(solutionLearningRecords).values({
    learningId,
    solutionId,
    projectNo,
    learningType: "project_delivery",
    learningContent: JSON.stringify(learningContent),
    keyFindings: keyFindings.join("\n")
  });

  // 更新方案的成功率
  if (learningContent.customerFeedback) {
    const feedbackScore = analyzeFeedbackScore(learningContent.customerFeedback);
    await db
      .update(historicalSolutions)
      .set({
        successRate: sql`(${historicalSolutions.successRate} + ${feedbackScore}) / 2`,
        lessonsLearned: sql`CONCAT(COALESCE(${historicalSolutions.lessonsLearned}, ''), '\n', ${keyFindings.join("\n")})`
      })
      .where(eq(historicalSolutions.solutionId, solutionId));
  }
}

/**
 * 分析反馈评分
 */
function analyzeFeedbackScore(feedback: string): number {
  const positiveKeywords = ["满意", "优秀", "很好", "出色", "超预期", "excellent", "good", "great"];
  const negativeKeywords = ["不满意", "问题", "差", "失败", "poor", "bad", "issue"];
  
  let score = 80; // 基础分
  
  for (const keyword of positiveKeywords) {
    if (feedback.includes(keyword)) {
      score += 5;
    }
  }
  
  for (const keyword of negativeKeywords) {
    if (feedback.includes(keyword)) {
      score -= 10;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// 方案管理功能
// ============================================================================

/**
 * 创建新方案
 */
export async function createSolution(solution: InsertHistoricalSolution): Promise<string> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  
  const solutionId = solution.solutionId || 
    `SOL-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  await db.insert(historicalSolutions).values({
    ...solution,
    solutionId
  });
  
  return solutionId;
}

/**
 * 获取方案详情
 */
export async function getSolutionById(solutionId: string): Promise<HistoricalSolution | null> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  
  const results = await db
    .select()
    .from(historicalSolutions)
    .where(eq(historicalSolutions.solutionId, solutionId))
    .limit(1);
  
  return results[0] || null;
}

/**
 * 获取方案列表
 */
export async function listSolutions(options: {
  sourceType?: "grt_internal" | "competitor" | "industry_standard";
  workpieceCategory?: string;
  equipmentModel?: string;
  limit?: number;
  offset?: number;
}): Promise<HistoricalSolution[]> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [eq(historicalSolutions.isActive, 1)];
  
  if (options.sourceType) {
    conditions.push(eq(historicalSolutions.sourceType, options.sourceType));
  }
  if (options.workpieceCategory) {
    conditions.push(eq(historicalSolutions.workpieceCategory, options.workpieceCategory as any));
  }
  if (options.equipmentModel) {
    conditions.push(eq(historicalSolutions.equipmentModel, options.equipmentModel));
  }
  
  return db
    .select()
    .from(historicalSolutions)
    .where(and(...conditions))
    .orderBy(desc(historicalSolutions.successRate))
    .limit(options.limit || 50)
    .offset(options.offset || 0);
}

/**
 * 提交推荐反馈
 */
export async function submitRecommendationFeedback(
  recommendationId: string,
  selectedSolutionId: string,
  feedbackScore: number,
  feedbackComment?: string
): Promise<void> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(solutionRecommendations)
    .set({
      selectedSolutionId,
      feedbackScore,
      feedbackComment
    })
    .where(eq(solutionRecommendations.recommendationId, recommendationId));
}

// ============================================================================
// 导出
// ============================================================================

export const SolutionAssistant = {
  parseProcessParameters,
  recommendSolutions,
  learnFromProjectDelivery,
  createSolution,
  getSolutionById,
  listSolutions,
  submitRecommendationFeedback
};

export default SolutionAssistant;
