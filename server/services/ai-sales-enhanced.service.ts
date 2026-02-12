/**
 * AI销售增强功能服务
 * 功能：ZOPA计算引擎、情绪分析与谈判策略
 */

import { requireDb } from "../db";
import { invokeLLM } from "../_core/llm";

// ==================== ZOPA计算引擎 ====================

/**
 * ZOPA (Zone of Possible Agreement) 计算器
 * 计算谈判双方可能达成协议的区间
 */
export class ZOPACalculator {
  /**
   * 计算ZOPA区间
   * @param params ZOPA计算参数
   * @returns ZOPA计算结果
   */
  static calculate(params: ZOPAParams): ZOPAResult {
    const {
      sellerReservationPrice, // 卖方底价
      sellerTargetPrice, // 卖方目标价
      buyerReservationPrice, // 买方最高可接受价
      buyerTargetPrice, // 买方目标价
      marketBenchmark, // 市场基准价
    } = params;

    // 计算ZOPA存在性
    const zopaExists = buyerReservationPrice >= sellerReservationPrice;
    
    // 计算ZOPA范围
    const zopaLow = Math.max(sellerReservationPrice, buyerTargetPrice);
    const zopaHigh = Math.min(buyerReservationPrice, sellerTargetPrice);
    const zopaWidth = zopaExists ? zopaHigh - zopaLow : 0;

    // 计算最优成交点（基于市场基准和双方目标）
    let optimalPrice = 0;
    if (zopaExists) {
      // 加权计算最优点
      const midPoint = (zopaLow + zopaHigh) / 2;
      const marketWeight = 0.3;
      const targetWeight = 0.7;
      
      if (marketBenchmark && marketBenchmark >= zopaLow && marketBenchmark <= zopaHigh) {
        optimalPrice = marketBenchmark * marketWeight + midPoint * targetWeight;
      } else {
        optimalPrice = midPoint;
      }
    }

    // 计算谈判空间分析
    const sellerFlexibility = sellerTargetPrice - sellerReservationPrice;
    const buyerFlexibility = buyerReservationPrice - buyerTargetPrice;
    const totalFlexibility = sellerFlexibility + buyerFlexibility;

    // 计算谈判力量对比
    const sellerPower = buyerFlexibility / (totalFlexibility || 1);
    const buyerPower = sellerFlexibility / (totalFlexibility || 1);

    // 生成策略建议
    const strategies = this.generateStrategies(
      zopaExists,
      zopaWidth,
      sellerPower,
      buyerPower,
      optimalPrice,
      params
    );

    return {
      zopaExists,
      zopaRange: zopaExists ? { low: zopaLow, high: zopaHigh } : null,
      zopaWidth,
      optimalPrice: Math.round(optimalPrice * 100) / 100,
      sellerFlexibility,
      buyerFlexibility,
      powerBalance: {
        seller: Math.round(sellerPower * 100),
        buyer: Math.round(buyerPower * 100),
      },
      strategies,
      riskAssessment: this.assessRisk(params, zopaExists, zopaWidth),
    };
  }

  /**
   * 生成谈判策略建议
   */
  private static generateStrategies(
    zopaExists: boolean,
    zopaWidth: number,
    sellerPower: number,
    buyerPower: number,
    optimalPrice: number,
    params: ZOPAParams
  ): NegotiationStrategy[] {
    const strategies: NegotiationStrategy[] = [];

    if (!zopaExists) {
      strategies.push({
        type: "expand_zopa",
        priority: "high",
        title: "扩大谈判空间",
        description: "当前双方底线无交集，需要通过增值服务或调整条款来创造谈判空间",
        actions: [
          "提供额外增值服务以提升价值感知",
          "调整付款条件或交付周期",
          "捆绑其他产品或服务",
          "探索非价格因素的让步空间",
        ],
      });
      return strategies;
    }

    // 根据谈判力量对比推荐策略
    if (sellerPower > 0.6) {
      strategies.push({
        type: "anchor_high",
        priority: "high",
        title: "高锚定策略",
        description: "卖方具有较强谈判优势，建议采用高锚定策略",
        actions: [
          `建议开价: ¥${Math.round(params.sellerTargetPrice * 1.1)}`,
          "强调产品独特价值和市场稀缺性",
          "展示成功案例和客户背书",
          "设定明确的价格底线",
        ],
      });
    } else if (buyerPower > 0.6) {
      strategies.push({
        type: "value_defense",
        priority: "high",
        title: "价值防守策略",
        description: "买方谈判优势较强，需要强化价值主张",
        actions: [
          "详细阐述产品ROI和长期价值",
          "提供定制化解决方案",
          "强调服务保障和售后支持",
          "考虑分阶段交付以降低风险感知",
        ],
      });
    }

    // 通用策略
    strategies.push({
      type: "optimal_target",
      priority: "medium",
      title: "最优成交目标",
      description: `基于ZOPA分析，建议目标成交价: ¥${optimalPrice.toLocaleString()}`,
      actions: [
        `理想成交区间: ¥${Math.round(optimalPrice * 0.95).toLocaleString()} - ¥${Math.round(optimalPrice * 1.05).toLocaleString()}`,
        "准备3-4个让步阶梯",
        "每次让步幅度递减",
        "保留最后的让步空间用于促成交易",
      ],
    });

    if (zopaWidth > params.sellerReservationPrice * 0.2) {
      strategies.push({
        type: "package_deal",
        priority: "medium",
        title: "打包交易策略",
        description: "谈判空间较大，可考虑打包交易以获取更多价值",
        actions: [
          "提议长期合作协议",
          "捆绑维保服务",
          "提供培训和技术支持",
          "探索追加订单可能性",
        ],
      });
    }

    return strategies;
  }

  /**
   * 风险评估
   */
  private static assessRisk(
    params: ZOPAParams,
    zopaExists: boolean,
    zopaWidth: number
  ): RiskAssessment {
    const risks: string[] = [];
    let riskLevel: "low" | "medium" | "high" = "low";

    if (!zopaExists) {
      risks.push("双方底线无交集，谈判破裂风险高");
      riskLevel = "high";
    } else if (zopaWidth < params.sellerReservationPrice * 0.05) {
      risks.push("谈判空间狭窄，容易陷入僵局");
      riskLevel = "medium";
    }

    if (params.buyerReservationPrice < params.marketBenchmark * 0.8) {
      risks.push("买方预算明显低于市场价，可能存在预期管理问题");
      riskLevel = riskLevel === "high" ? "high" : "medium";
    }

    if (params.sellerReservationPrice > params.marketBenchmark * 1.2) {
      risks.push("卖方底价高于市场价，竞争力不足");
      riskLevel = riskLevel === "high" ? "high" : "medium";
    }

    return {
      level: riskLevel,
      risks,
      mitigations: this.generateMitigations(risks),
    };
  }

  /**
   * 生成风险缓解措施
   */
  private static generateMitigations(risks: string[]): string[] {
    const mitigations: string[] = [];
    
    if (risks.some(r => r.includes("无交集"))) {
      mitigations.push("考虑分期付款或租赁方案");
      mitigations.push("探索战略合作而非单纯买卖");
    }
    
    if (risks.some(r => r.includes("狭窄"))) {
      mitigations.push("准备多个备选方案");
      mitigations.push("设定明确的谈判时限");
    }
    
    if (risks.some(r => r.includes("预算"))) {
      mitigations.push("帮助客户争取内部预算");
      mitigations.push("提供分阶段实施方案");
    }

    return mitigations;
  }
}

// ==================== 情绪分析与谈判策略 ====================

/**
 * 情绪分析引擎
 * 分析客户沟通中的情绪倾向
 */
export class EmotionAnalyzer {
  /**
   * 分析文本情绪
   * @param text 待分析文本
   * @returns 情绪分析结果
   */
  static async analyze(text: string): Promise<EmotionResult> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是一个专业的销售情绪分析专家。分析客户沟通文本中的情绪倾向，并给出谈判建议。
输出JSON格式：
{
  "primaryEmotion": "positive|negative|neutral|anxious|frustrated|interested|skeptical",
  "emotionScore": 0-100 (正面程度),
  "confidence": 0-100,
  "signals": ["检测到的情绪信号"],
  "concerns": ["客户可能的顾虑"],
  "opportunities": ["销售机会点"],
  "suggestedTone": "建议的回应语气",
  "suggestedApproach": "建议的沟通策略"
}`,
          },
          {
            role: "user",
            content: `分析以下客户沟通内容的情绪：\n\n${text}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "emotion_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                primaryEmotion: { type: "string" },
                emotionScore: { type: "number" },
                confidence: { type: "number" },
                signals: { type: "array", items: { type: "string" } },
                concerns: { type: "array", items: { type: "string" } },
                opportunities: { type: "array", items: { type: "string" } },
                suggestedTone: { type: "string" },
                suggestedApproach: { type: "string" },
              },
              required: [
                "primaryEmotion",
                "emotionScore",
                "confidence",
                "signals",
                "concerns",
                "opportunities",
                "suggestedTone",
                "suggestedApproach",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("情绪分析失败:", error);
      return {
        primaryEmotion: "neutral",
        emotionScore: 50,
        confidence: 0,
        signals: [],
        concerns: [],
        opportunities: [],
        suggestedTone: "专业友好",
        suggestedApproach: "标准销售流程",
      };
    }
  }

  /**
   * 批量分析沟通历史
   * @param messages 沟通记录列表
   * @returns 情绪趋势分析
   */
  static async analyzeTrend(
    messages: { content: string; timestamp: string }[]
  ): Promise<EmotionTrend> {
    const results: EmotionResult[] = [];
    
    for (const msg of messages.slice(-10)) { // 最多分析最近10条
      const result = await this.analyze(msg.content);
      results.push(result);
    }

    // 计算趋势
    const scores = results.map(r => r.emotionScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    let trend: "improving" | "declining" | "stable" = "stable";
    if (scores.length >= 3) {
      const recentAvg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const earlierAvg = scores.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(scores.length - 3, 1);
      
      if (recentAvg - earlierAvg > 10) trend = "improving";
      else if (earlierAvg - recentAvg > 10) trend = "declining";
    }

    // 统计主要情绪
    const emotionCounts: Record<string, number> = {};
    results.forEach(r => {
      emotionCounts[r.primaryEmotion] = (emotionCounts[r.primaryEmotion] || 0) + 1;
    });

    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";

    return {
      averageScore: Math.round(avgScore),
      trend,
      dominantEmotion,
      emotionDistribution: emotionCounts,
      analysisCount: results.length,
      recommendation: this.getTrendRecommendation(trend, dominantEmotion, avgScore),
    };
  }

  /**
   * 根据趋势生成建议
   */
  private static getTrendRecommendation(
    trend: string,
    dominantEmotion: string,
    avgScore: number
  ): string {
    if (trend === "declining") {
      return "客户情绪呈下降趋势，建议暂停推进，先解决客户顾虑";
    }
    if (trend === "improving") {
      return "客户情绪正在改善，可以适时推进下一步";
    }
    if (avgScore < 40) {
      return "客户整体情绪偏负面，建议重新评估方案或安排高层沟通";
    }
    if (avgScore > 70) {
      return "客户情绪积极，是推进成交的好时机";
    }
    return "客户情绪稳定，按正常节奏推进";
  }
}

/**
 * 谈判策略推荐器
 */
export class NegotiationStrategyRecommender {
  /**
   * 基于情绪和ZOPA生成综合谈判策略
   */
  static async recommend(
    zopaResult: ZOPAResult,
    emotionResult: EmotionResult,
    context: NegotiationContext
  ): Promise<ComprehensiveStrategy> {
    // 基础策略来自ZOPA
    const baseStrategies = zopaResult.strategies;

    // 根据情绪调整策略
    const adjustedStrategies = this.adjustForEmotion(baseStrategies, emotionResult);

    // 生成话术建议
    const talkingPoints = await this.generateTalkingPoints(
      zopaResult,
      emotionResult,
      context
    );

    // 生成时机建议
    const timing = this.suggestTiming(emotionResult, context);

    return {
      strategies: adjustedStrategies,
      talkingPoints,
      timing,
      overallRecommendation: this.getOverallRecommendation(zopaResult, emotionResult),
      successProbability: this.estimateSuccessProbability(zopaResult, emotionResult),
    };
  }

  /**
   * 根据情绪调整策略
   */
  private static adjustForEmotion(
    strategies: NegotiationStrategy[],
    emotion: EmotionResult
  ): NegotiationStrategy[] {
    return strategies.map(strategy => {
      const adjusted = { ...strategy };

      // 如果客户情绪负面，降低激进策略的优先级
      if (emotion.emotionScore < 40) {
        if (strategy.type === "anchor_high") {
          adjusted.priority = "low";
          adjusted.description += " (建议暂缓，先改善客户情绪)";
        }
      }

      // 如果客户情绪积极，提升成交策略优先级
      if (emotion.emotionScore > 70) {
        if (strategy.type === "optimal_target") {
          adjusted.priority = "high";
          adjusted.description += " (客户情绪积极，可加速推进)";
        }
      }

      return adjusted;
    });
  }

  /**
   * 生成话术建议
   */
  private static async generateTalkingPoints(
    zopa: ZOPAResult,
    emotion: EmotionResult,
    context: NegotiationContext
  ): Promise<string[]> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是一个专业的销售话术专家。根据谈判分析结果，生成3-5条具体的话术建议。
输出JSON格式：{ "talkingPoints": ["话术1", "话术2", ...] }`,
          },
          {
            role: "user",
            content: `谈判背景：
- 产品/服务：${context.productName || "未指定"}
- 客户行业：${context.customerIndustry || "未指定"}
- 谈判阶段：${context.stage || "初期"}
- ZOPA存在：${zopa.zopaExists ? "是" : "否"}
- 最优价格：¥${zopa.optimalPrice}
- 客户情绪：${emotion.primaryEmotion} (${emotion.emotionScore}分)
- 客户顾虑：${emotion.concerns.join(", ") || "未知"}

请生成针对性的话术建议。`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "talking_points",
            strict: true,
            schema: {
              type: "object",
              properties: {
                talkingPoints: { type: "array", items: { type: "string" } },
              },
              required: ["talkingPoints"],
              additionalProperties: false,
            },
          },
        },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.talkingPoints || [];
    } catch (error) {
      return [
        "强调产品的核心价值和差异化优势",
        "了解客户的具体需求和痛点",
        "提供灵活的合作方案",
      ];
    }
  }

  /**
   * 建议沟通时机
   */
  private static suggestTiming(
    emotion: EmotionResult,
    context: NegotiationContext
  ): TimingSuggestion {
    if (emotion.emotionScore < 30) {
      return {
        action: "wait",
        reason: "客户情绪较差，建议等待情绪改善后再联系",
        suggestedWait: "2-3天",
      };
    }

    if (emotion.emotionScore > 70 && emotion.primaryEmotion === "interested") {
      return {
        action: "act_now",
        reason: "客户兴趣高涨，建议立即跟进",
        suggestedWait: "立即",
      };
    }

    return {
      action: "schedule",
      reason: "客户情绪稳定，可按计划推进",
      suggestedWait: "1-2天内",
    };
  }

  /**
   * 生成总体建议
   */
  private static getOverallRecommendation(
    zopa: ZOPAResult,
    emotion: EmotionResult
  ): string {
    if (!zopa.zopaExists && emotion.emotionScore < 50) {
      return "当前谈判条件不成熟，建议重新评估方案或暂时搁置";
    }
    if (zopa.zopaExists && emotion.emotionScore > 60) {
      return "谈判条件良好，建议积极推进成交";
    }
    if (zopa.zopaExists && emotion.emotionScore < 50) {
      return "价格空间存在，但需先改善客户关系";
    }
    return "继续保持沟通，寻找突破口";
  }

  /**
   * 估算成功概率
   */
  private static estimateSuccessProbability(
    zopa: ZOPAResult,
    emotion: EmotionResult
  ): number {
    let probability = 50; // 基础概率

    // ZOPA因素
    if (zopa.zopaExists) {
      probability += 20;
      probability += Math.min(zopa.zopaWidth / 10000, 10); // 空间越大概率越高
    } else {
      probability -= 30;
    }

    // 情绪因素
    probability += (emotion.emotionScore - 50) * 0.3;

    // 限制范围
    return Math.max(5, Math.min(95, Math.round(probability)));
  }
}

// ==================== 类型定义 ====================

export interface ZOPAParams {
  sellerReservationPrice: number;
  sellerTargetPrice: number;
  buyerReservationPrice: number;
  buyerTargetPrice: number;
  marketBenchmark?: number;
}

export interface ZOPAResult {
  zopaExists: boolean;
  zopaRange: { low: number; high: number } | null;
  zopaWidth: number;
  optimalPrice: number;
  sellerFlexibility: number;
  buyerFlexibility: number;
  powerBalance: { seller: number; buyer: number };
  strategies: NegotiationStrategy[];
  riskAssessment: RiskAssessment;
}

export interface NegotiationStrategy {
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  actions: string[];
}

export interface RiskAssessment {
  level: "low" | "medium" | "high";
  risks: string[];
  mitigations: string[];
}

export interface EmotionResult {
  primaryEmotion: string;
  emotionScore: number;
  confidence: number;
  signals: string[];
  concerns: string[];
  opportunities: string[];
  suggestedTone: string;
  suggestedApproach: string;
}

export interface EmotionTrend {
  averageScore: number;
  trend: "improving" | "declining" | "stable";
  dominantEmotion: string;
  emotionDistribution: Record<string, number>;
  analysisCount: number;
  recommendation: string;
}

export interface NegotiationContext {
  productName?: string;
  customerIndustry?: string;
  stage?: string;
  previousInteractions?: number;
}

export interface ComprehensiveStrategy {
  strategies: NegotiationStrategy[];
  talkingPoints: string[];
  timing: TimingSuggestion;
  overallRecommendation: string;
  successProbability: number;
}

export interface TimingSuggestion {
  action: "act_now" | "schedule" | "wait";
  reason: string;
  suggestedWait: string;
}
