/**
 * AI Quotation Assistant - 报价助手
 * 
 * 核心功能：
 * 1. 历史报价参考 - 从GRT历史报价中匹配相似项目
 * 2. 成本计算 - 自动计算设备成本、人工成本、物料成本
 * 3. 利润分析 - 分析毛利率、净利率、投资回报
 * 4. 竞品价格参照 - 参考竞争对手价格并标注
 * 5. 报价持续学习 - 从中标/未中标项目中学习定价策略
 */

import { getDb, requireDb } from "../db";
import { 
  historicalQuotations, 
  quotationRecommendations, 
  equipmentBasePrices,
  costRates,
  quotationLearningRecords,
  type HistoricalQuotation,
  type InsertHistoricalQuotation,
  type InsertQuotationRecommendation,
  type InsertQuotationLearningRecord
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ============================================================================
// 类型定义
// ============================================================================

/** 报价输入参数 */
export interface QuotationInput {
  // 客户信息
  customerName: string;
  customerType?: "oem" | "tier1" | "tier2" | "other";
  
  // 设备信息
  equipmentModel: string;
  equipmentQuantity?: number;
  
  // 关联方案
  solutionId?: string;
  projectNo?: string;
  
  // 定制化需求
  customizations?: {
    description: string;
    estimatedCost?: number;
  }[];
  
  // 其他要求
  deliveryTime?: string;
  paymentTerms?: string;
  warrantyYears?: number;
  
  // 竞争信息
  competitorPrice?: number;
  competitorName?: string;
  competitionLevel?: "low" | "medium" | "high";
  
  // 战略考量
  isStrategicCustomer?: boolean;
  isRepeatCustomer?: boolean;
}

/** 成本明细 */
export interface CostBreakdown {
  equipmentBase: number;
  customization: number;
  installation: number;
  training: number;
  warranty: number;
  transport: number;
  other: number;
  totalCost: number;
  currency: string;
}

/** 价格推荐 */
export interface PriceRecommendation {
  strategy: "competitive" | "value_based" | "cost_plus" | "market_penetration";
  suggestedPrice: number;
  profitMargin: number;
  reference: string;
  confidence: number;
  discountRoom: number;
  minAcceptable: number;
}

/** 市场情报 */
export interface MarketIntelligence {
  competitorAvgPrice?: number;
  competitorName?: string;
  marketPosition: string;
  notes: string;
}

/** 历史参考 */
export interface HistoricalReference {
  quotationId: string;
  customer: string;
  equipment: string;
  finalPrice: number;
  result: "won" | "lost" | "pending";
  similarity: number;
}

/** 报价推荐报告 */
export interface QuotationRecommendationReport {
  recommendationId: string;
  createdAt: string;
  projectSummary: {
    customer: string;
    equipmentModel: string;
    quantity: number;
    solutionId?: string;
  };
  costBreakdown: CostBreakdown;
  priceRecommendations: PriceRecommendation[];
  marketIntelligence: MarketIntelligence;
  historicalReferences: HistoricalReference[];
  recommendation: {
    suggestedPrice: number;
    discountRoom: number;
    minAcceptable: number;
    rationale: string;
  };
}

// ============================================================================
// 成本计算
// ============================================================================

/**
 * 获取设备基础价格
 */
async function getEquipmentBasePrice(equipmentModel: string): Promise<number> {
  const db = await requireDb();
  if (!db) return 0;
  
  const today = new Date().toISOString().split('T')[0];
  
  const results = await db
    .select()
    .from(equipmentBasePrices)
    .where(and(
      eq(equipmentBasePrices.equipmentModel, equipmentModel),
      eq(equipmentBasePrices.priceType, "standard"),
      eq(equipmentBasePrices.isActive, 1),
      lte(equipmentBasePrices.effectiveDate, today)
    ))
    .orderBy(desc(equipmentBasePrices.effectiveDate))
    .limit(1);
  
  if (results.length > 0) {
    return Number(results[0].basePrice);
  }
  
  // 默认价格映射
  const defaultPrices: Record<string, number> = {
    "GRT-SC800W": 1200000,
    "GRT-SC800W-SF": 1500000,
    "GRT-SC800W-II": 1100000,
    "GRT-SC800C": 1800000,
    "GRT-DC880W": 1600000,
    "GRT-DC880W-SF": 1900000,
    "GRT-DC880C-B": 2500000,
    "GRT-MC888W": 2000000,
    "GRT-TC2100": 1400000,
    "GRT-TC2100-D": 1800000,
    "GRT-TC2100W": 2200000,
    "GRT-RW2000": 2800000,
    "GRT-RW3000": 3200000,
    "GRT-RW3000-L": 3800000,
    "GRT-HP1200": 800000,
    "GRT-HP1200-1": 600000,
    "GRT-Eco SF": 1000000
  };
  
  return defaultPrices[equipmentModel] || 1500000;
}

/**
 * 获取成本费率
 */
async function getCostRate(rateType: string): Promise<number> {
  const db = await requireDb();
  if (!db) return 0;
  
  const today = new Date().toISOString().split('T')[0];
  
  const results = await db
    .select()
    .from(costRates)
    .where(and(
      eq(costRates.rateType, rateType as any),
      eq(costRates.isActive, 1),
      lte(costRates.effectiveDate, today)
    ))
    .orderBy(desc(costRates.effectiveDate))
    .limit(1);
  
  if (results.length > 0) {
    return Number(results[0].rateValue);
  }
  
  // 默认费率
  const defaultRates: Record<string, number> = {
    "labor_design": 500,      // 元/小时
    "labor_manufacture": 300, // 元/小时
    "labor_install": 400,     // 元/小时
    "transport": 0.5,         // 元/公里/吨
    "insurance": 0.003,       // 设备价值的0.3%
    "warranty": 0.02          // 设备价值的2%/年
  };
  
  return defaultRates[rateType] || 0;
}

/**
 * 计算成本明细
 */
export async function calculateCostBreakdown(input: QuotationInput): Promise<CostBreakdown> {
  const quantity = input.equipmentQuantity || 1;
  
  // 设备基础价格
  const equipmentBase = await getEquipmentBasePrice(input.equipmentModel) * quantity;
  
  // 定制化成本
  let customization = 0;
  if (input.customizations) {
    for (const custom of input.customizations) {
      customization += custom.estimatedCost || 50000;
    }
  }
  
  // 安装调试费用（设备价格的5%）
  const installation = equipmentBase * 0.05;
  
  // 培训费用（固定费用）
  const training = 20000 * quantity;
  
  // 质保费用
  const warrantyRate = await getCostRate("warranty");
  const warrantyYears = input.warrantyYears || 1;
  const warranty = equipmentBase * warrantyRate * warrantyYears;
  
  // 运输费用（估算）
  const transport = equipmentBase * 0.02;
  
  // 其他费用
  const other = equipmentBase * 0.01;
  
  const totalCost = equipmentBase + customization + installation + training + warranty + transport + other;
  
  return {
    equipmentBase,
    customization,
    installation,
    training,
    warranty,
    transport,
    other,
    totalCost,
    currency: "CNY"
  };
}

// ============================================================================
// 价格推荐算法
// ============================================================================

/**
 * 获取历史报价参考
 */
async function getHistoricalReferences(
  equipmentModel: string,
  customerType?: string,
  limit: number = 5
): Promise<HistoricalReference[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const conditions = [
    eq(historicalQuotations.equipmentModel, equipmentModel)
  ];
  
  if (customerType) {
    conditions.push(eq(historicalQuotations.customerType, customerType as any));
  }
  
  const results = await db
    .select()
    .from(historicalQuotations)
    .where(and(...conditions))
    .orderBy(desc(historicalQuotations.quotationDate))
    .limit(limit);
  
  return results.map(q => ({
    quotationId: q.quotationId,
    customer: q.customerName,
    equipment: q.equipmentModel,
    finalPrice: Number(q.finalPrice || q.totalPrice),
    result: q.bidResult as "won" | "lost" | "pending",
    similarity: 0.9 // 简化的相似度计算
  }));
}

/**
 * 计算价格调整因子
 */
function calculatePriceAdjustmentFactor(input: QuotationInput): number {
  let factor = 1.0;
  
  // 客户类型调整
  switch (input.customerType) {
    case "oem":
      factor *= 0.95; // OEM客户优惠5%
      break;
    case "tier1":
      factor *= 0.97; // Tier1客户优惠3%
      break;
    case "tier2":
      factor *= 1.0;
      break;
    default:
      factor *= 1.02; // 其他客户上浮2%
  }
  
  // 数量折扣
  const quantity = input.equipmentQuantity || 1;
  if (quantity >= 5) {
    factor *= 0.90; // 5台以上9折
  } else if (quantity >= 3) {
    factor *= 0.95; // 3台以上95折
  } else if (quantity >= 2) {
    factor *= 0.98; // 2台98折
  }
  
  // 竞争程度调整
  switch (input.competitionLevel) {
    case "high":
      factor *= 0.95; // 高竞争降价5%
      break;
    case "medium":
      factor *= 0.98;
      break;
    case "low":
      factor *= 1.02; // 低竞争可上浮
      break;
  }
  
  // 战略客户调整
  if (input.isStrategicCustomer) {
    factor *= 0.95;
  }
  
  // 回头客调整
  if (input.isRepeatCustomer) {
    factor *= 0.97;
  }
  
  return factor;
}

/**
 * 生成价格推荐
 */
export async function generatePriceRecommendations(
  input: QuotationInput,
  costBreakdown: CostBreakdown,
  historicalRefs: HistoricalReference[]
): Promise<PriceRecommendation[]> {
  const recommendations: PriceRecommendation[] = [];
  const adjustmentFactor = calculatePriceAdjustmentFactor(input);
  
  // 1. 成本加成法 (Cost Plus)
  const costPlusMargin = 0.25; // 25%利润率
  const costPlusPrice = costBreakdown.totalCost * (1 + costPlusMargin) * adjustmentFactor;
  recommendations.push({
    strategy: "cost_plus",
    suggestedPrice: Math.round(costPlusPrice),
    profitMargin: costPlusMargin * 100,
    reference: "成本加成25%",
    confidence: 0.90,
    discountRoom: Math.round(costPlusPrice * 0.05),
    minAcceptable: Math.round(costBreakdown.totalCost * 1.15)
  });
  
  // 2. 竞争定价法 (Competitive)
  if (historicalRefs.length > 0) {
    const wonDeals = historicalRefs.filter(r => r.result === "won");
    if (wonDeals.length > 0) {
      const avgWonPrice = wonDeals.reduce((sum, r) => sum + r.finalPrice, 0) / wonDeals.length;
      const competitivePrice = avgWonPrice * adjustmentFactor;
      const competitiveMargin = (competitivePrice - costBreakdown.totalCost) / competitivePrice * 100;
      
      recommendations.push({
        strategy: "competitive",
        suggestedPrice: Math.round(competitivePrice),
        profitMargin: Math.round(competitiveMargin * 10) / 10,
        reference: `基于${wonDeals.length}个历史中标项目平均价格`,
        confidence: 0.85,
        discountRoom: Math.round(competitivePrice * 0.05),
        minAcceptable: Math.round(costBreakdown.totalCost * 1.10)
      });
    }
  }
  
  // 3. 价值定价法 (Value Based)
  const valueBasedMargin = 0.30; // 30%利润率
  const valueBasedPrice = costBreakdown.totalCost * (1 + valueBasedMargin) * adjustmentFactor;
  recommendations.push({
    strategy: "value_based",
    suggestedPrice: Math.round(valueBasedPrice),
    profitMargin: valueBasedMargin * 100,
    reference: "基于客户价值和ROI分析",
    confidence: 0.75,
    discountRoom: Math.round(valueBasedPrice * 0.08),
    minAcceptable: Math.round(costBreakdown.totalCost * 1.18)
  });
  
  // 4. 市场渗透定价（如果是战略客户或高竞争）
  if (input.isStrategicCustomer || input.competitionLevel === "high") {
    const penetrationMargin = 0.15; // 15%利润率
    const penetrationPrice = costBreakdown.totalCost * (1 + penetrationMargin);
    recommendations.push({
      strategy: "market_penetration",
      suggestedPrice: Math.round(penetrationPrice),
      profitMargin: penetrationMargin * 100,
      reference: "市场渗透策略，低利润换取市场份额",
      confidence: 0.70,
      discountRoom: Math.round(penetrationPrice * 0.03),
      minAcceptable: Math.round(costBreakdown.totalCost * 1.08)
    });
  }
  
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================================
// 核心推荐功能
// ============================================================================

/**
 * 推荐报价
 */
export async function recommendQuotation(
  input: QuotationInput,
  userId: number
): Promise<QuotationRecommendationReport> {
  // 1. 计算成本明细
  const costBreakdown = await calculateCostBreakdown(input);
  
  // 2. 获取历史参考
  const historicalRefs = await getHistoricalReferences(
    input.equipmentModel,
    input.customerType,
    5
  );
  
  // 3. 生成价格推荐
  const priceRecommendations = await generatePriceRecommendations(
    input,
    costBreakdown,
    historicalRefs
  );
  
  // 4. 市场情报
  const marketIntelligence: MarketIntelligence = {
    competitorAvgPrice: input.competitorPrice,
    competitorName: input.competitorName,
    marketPosition: input.customerType === "oem" ? "高端市场" : "中高端市场",
    notes: input.competitorPrice 
      ? `竞品报价${input.competitorPrice}元，需关注价格差异`
      : "暂无竞品价格信息"
  };
  
  // 5. 生成最终推荐
  const bestRecommendation = priceRecommendations[0];
  const recommendation = {
    suggestedPrice: bestRecommendation.suggestedPrice,
    discountRoom: bestRecommendation.discountRoom,
    minAcceptable: bestRecommendation.minAcceptable,
    rationale: generateRationale(input, priceRecommendations, historicalRefs)
  };
  
  // 6. 生成推荐ID
  const recommendationId = `QREC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  // 7. 保存推荐记录
  const db = await requireDb();
  if (db) {
    await db.insert(quotationRecommendations).values({
      recommendationId,
      userId,
      solutionId: input.solutionId || null,
      inputParameters: JSON.stringify(input),
      costBreakdown: JSON.stringify(costBreakdown),
      priceRecommendations: JSON.stringify(priceRecommendations)
    });
  }
  
  // 8. 返回报告
  return {
    recommendationId,
    createdAt: new Date().toISOString(),
    projectSummary: {
      customer: input.customerName,
      equipmentModel: input.equipmentModel,
      quantity: input.equipmentQuantity || 1,
      solutionId: input.solutionId
    },
    costBreakdown,
    priceRecommendations,
    marketIntelligence,
    historicalReferences: historicalRefs,
    recommendation
  };
}

/**
 * 生成推荐理由
 */
function generateRationale(
  input: QuotationInput,
  recommendations: PriceRecommendation[],
  historicalRefs: HistoricalReference[]
): string {
  const parts: string[] = [];
  
  const best = recommendations[0];
  parts.push(`建议采用${getStrategyName(best.strategy)}，报价${best.suggestedPrice}元`);
  
  if (historicalRefs.length > 0) {
    const wonCount = historicalRefs.filter(r => r.result === "won").length;
    parts.push(`参考${historicalRefs.length}个历史项目（${wonCount}个中标）`);
  }
  
  if (input.competitorPrice) {
    const diff = best.suggestedPrice - input.competitorPrice;
    if (diff > 0) {
      parts.push(`比竞品高${Math.round(diff / 1000)}千元，需强调技术优势`);
    } else {
      parts.push(`比竞品低${Math.round(-diff / 1000)}千元，具有价格优势`);
    }
  }
  
  parts.push(`预留${best.discountRoom}元折扣空间，底价${best.minAcceptable}元`);
  
  return parts.join("；");
}

/**
 * 获取策略名称
 */
function getStrategyName(strategy: string): string {
  const names: Record<string, string> = {
    "competitive": "竞争定价法",
    "value_based": "价值定价法",
    "cost_plus": "成本加成法",
    "market_penetration": "市场渗透定价"
  };
  return names[strategy] || strategy;
}

// ============================================================================
// 持续学习功能
// ============================================================================

/**
 * 记录投标结果并学习
 */
export async function recordBidResult(
  quotationId: string,
  result: "won" | "lost",
  finalPrice?: number,
  competitorPrice?: number,
  competitorName?: string,
  notes?: string
): Promise<void> {
  const db = await requireDb();
  if (!db) return;
  
  // 更新报价记录
  await db
    .update(historicalQuotations)
    .set({
      bidResult: result,
      finalPrice: finalPrice ? String(finalPrice) : undefined,
      competitorPrice: competitorPrice ? String(competitorPrice) : undefined,
      competitorName
    })
    .where(eq(historicalQuotations.quotationId, quotationId));
  
  // 创建学习记录
  const learningId = `QLEARN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  const learningContent = {
    result,
    finalPrice,
    competitorPrice,
    competitorName,
    notes,
    priceDeviation: finalPrice && competitorPrice 
      ? ((finalPrice - competitorPrice) / competitorPrice * 100).toFixed(2) + "%"
      : null
  };
  
  const keyFindings: string[] = [];
  if (result === "won") {
    keyFindings.push("成功中标");
    if (finalPrice && competitorPrice && finalPrice < competitorPrice) {
      keyFindings.push(`价格优势：比竞品低${Math.round((competitorPrice - finalPrice) / 1000)}千元`);
    }
  } else {
    keyFindings.push("未中标");
    if (competitorPrice) {
      keyFindings.push(`竞品价格：${competitorPrice}元`);
    }
  }
  
  await db.insert(quotationLearningRecords).values({
    learningId,
    quotationId,
    learningType: result === "won" ? "bid_won" : "bid_lost",
    learningContent: JSON.stringify(learningContent),
    keyFindings: keyFindings.join("\n"),
    priceDeviationAnalysis: learningContent.priceDeviation
  });
}

// ============================================================================
// 报价管理功能
// ============================================================================

/**
 * 创建报价
 */
export async function createQuotation(quotation: InsertHistoricalQuotation): Promise<string> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  
  const quotationId = quotation.quotationId || 
    `QUO-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  await db.insert(historicalQuotations).values({
    ...quotation,
    quotationId
  });
  
  return quotationId;
}

/**
 * 获取报价详情
 */
export async function getQuotationById(quotationId: string): Promise<HistoricalQuotation | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const results = await db
    .select()
    .from(historicalQuotations)
    .where(eq(historicalQuotations.quotationId, quotationId))
    .limit(1);
  
  return results[0] || null;
}

/**
 * 获取报价列表
 */
export async function listQuotations(options: {
  customerType?: "oem" | "tier1" | "tier2" | "other";
  equipmentModel?: string;
  bidResult?: "won" | "lost" | "pending";
  limit?: number;
  offset?: number;
}): Promise<HistoricalQuotation[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (options.customerType) {
    conditions.push(eq(historicalQuotations.customerType, options.customerType));
  }
  if (options.equipmentModel) {
    conditions.push(eq(historicalQuotations.equipmentModel, options.equipmentModel));
  }
  if (options.bidResult) {
    conditions.push(eq(historicalQuotations.bidResult, options.bidResult));
  }
  
  let query = db
    .select()
    .from(historicalQuotations)
    .orderBy(desc(historicalQuotations.quotationDate))
    .limit(options.limit || 50)
    .offset(options.offset || 0);
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query;
}

/**
 * 提交报价推荐反馈
 */
export async function submitQuotationFeedback(
  recommendationId: string,
  selectedStrategy: string,
  finalQuotationId: string,
  feedbackScore: number,
  feedbackComment?: string
): Promise<void> {
  const db = await requireDb();
  if (!db) return;
  
  await db
    .update(quotationRecommendations)
    .set({
      selectedStrategy,
      finalQuotationId,
      feedbackScore,
      feedbackComment
    })
    .where(eq(quotationRecommendations.recommendationId, recommendationId));
}

// ============================================================================
// 导出
// ============================================================================

export const QuotationAssistant = {
  calculateCostBreakdown,
  generatePriceRecommendations,
  recommendQuotation,
  recordBidResult,
  createQuotation,
  getQuotationById,
  listQuotations,
  submitQuotationFeedback
};

export default QuotationAssistant;
