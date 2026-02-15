/**
 * 销售与财务智能服务 (Sales & Finance Intelligence Service)
 * Phase G: 销售预测 · 客户流失 · 预算异常 · 成本优化
 *
 * 4 core AI functions using invokeLLM() with structured JSON output.
 */

// ============================================================
// Types
// ============================================================

export interface SalesForecastResult {
  forecastRevenue: number;
  confidenceLevel: number;
  quarterlyBreakdown: Array<{ quarter: string; revenue: number; probability: number }>;
  growthRate: number;
  keyDrivers: string[];
  risks: Array<{ risk: string; impact: string; probability: number }>;
  recommendations: string[];
}

export interface ChurnPredictionResult {
  churnProbability: number;
  riskLevel: string;
  churnFactors: Array<{ factor: string; weight: number; description: string }>;
  retentionActions: Array<{ action: string; priority: string; expectedImpact: string; timeline: string }>;
  customerHealthScore: number;
  recommendations: string[];
}

export interface BudgetAnalysisResult {
  variancePercent: number;
  anomalyScore: number;
  anomalies: Array<{ category: string; allocated: number; actual: number; variance: number; severity: string; explanation: string }>;
  trendAnalysis: string;
  forecastToYearEnd: number;
  recommendations: string[];
}

export interface CostOptimizationResult {
  optimizedTotal: number;
  savingsPercent: number;
  optimizations: Array<{ area: string; currentCost: number; optimizedCost: number; savingsPercent: number; suggestion: string }>;
  marginAnalysis: { currentMargin: number; targetMargin: number; achievable: number };
  riskAssessment: string;
  recommendations: string[];
}

// ============================================================
// 1. Sales Forecast (销售预测)
// ============================================================

export async function forecastSales(params: {
  businessUnit: string;
  productLine: string;
  historicalRevenue: number;
  currentPipeline: number;
  seasonality?: string;
  marketCondition?: string;
  timeHorizon?: string;
}): Promise<SalesForecastResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT销售预测与营收分析专家。

GRT背景知识：
- GRT生产工业清洗设备，5大事业部：海外、商用车、乘用车、半导体、工业通用
- 年产约150台设备，年营收约1.5-2亿元
- 产品线：碳氢真空清洗机（均价80-150万）、水基清洗线（均价50-120万）、超声波清洗机（均价30-80万）、定制设备（均价100-300万）
- 典型销售周期：3-6个月（标准设备），6-12个月（大型定制项目）
- 季节性特征：Q1淡季（春节影响，约20%营收），Q2回暖（约25%），Q3平稳（约25%），Q4旺季（年底赶工，约30%）
- 各BU营收占比：乘用车30%、商用车20%、半导体25%、工业通用15%、海外10%
- 市场增长：半导体和新能源汽车驱动增长，传统工业平稳
- 典型赢单率：商机→报价60%，报价→合同40%

请基于销售数据进行营收预测，返回JSON格式结果。`;

  const userPrompt = `事业部: ${params.businessUnit}
产品线: ${params.productLine}
历史营收: ${params.historicalRevenue}万元
当前在谈商机: ${params.currentPipeline}万元
${params.seasonality ? `当前季节性: ${params.seasonality}` : ""}
${params.marketCondition ? `市场状况: ${params.marketCondition}` : ""}
${params.timeHorizon ? `预测周期: ${params.timeHorizon}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sales_forecast",
          strict: true,
          schema: {
            type: "object",
            properties: {
              forecastRevenue: { type: "number" },
              confidenceLevel: { type: "number" },
              quarterlyBreakdown: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    quarter: { type: "string" },
                    revenue: { type: "number" },
                    probability: { type: "number" },
                  },
                  required: ["quarter", "revenue", "probability"],
                  additionalProperties: false,
                },
              },
              growthRate: { type: "number" },
              keyDrivers: { type: "array", items: { type: "string" } },
              risks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    risk: { type: "string" },
                    impact: { type: "string" },
                    probability: { type: "number" },
                  },
                  required: ["risk", "impact", "probability"],
                  additionalProperties: false,
                },
              },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["forecastRevenue", "confidenceLevel", "quarterlyBreakdown", "growthRate", "keyDrivers", "risks", "recommendations"],
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
    console.error("[SalesFinanceIntelligence] forecastSales failed:", error);
    return {
      forecastRevenue: 0,
      confidenceLevel: 0,
      quarterlyBreakdown: [],
      growthRate: 0,
      keyDrivers: [],
      risks: [{ risk: "AI服务暂时不可用", impact: "高", probability: 100 }],
      recommendations: ["AI服务暂时不可用，请人工进行销售预测"],
    };
  }
}

// ============================================================
// 2. Customer Churn Prediction (客户流失预测)
// ============================================================

export async function predictChurn(params: {
  customerName: string;
  industry: string;
  contractValue: number;
  lastOrderDate: string;
  orderFrequency: string;
  satisfactionScore?: number;
  complaintCount?: number;
  competitorActivity?: string;
}): Promise<ChurnPredictionResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT客户关系管理与流失预测专家。

GRT背景知识：
- GRT约有200个活跃客户，主要分布在汽车制造、半导体、工业通用、食品医药、航空航天等行业
- 设备类型：碳氢真空清洗机、水基清洗线、超声波清洗机
- 典型订单周期：新设备采购1-3年，维护保养年度，配件更换半年-1年
- 客户生命周期价值：首台设备80-200万，后续维保+配件年均10-30万
- 流失预警信号：
  * 订单间隔超出正常周期50%以上
  * 满意度评分持续下降（<7分预警，<5分危险）
  * 投诉次数增加（>3次/年需关注）
  * 竞争对手活动频繁
  * 联系频率下降
- 行业留存率：汽车制造85%、半导体90%、工业通用75%
- 挽留策略：技术升级方案、维保优惠、培训增值、快速响应承诺

请基于客户数据预测流失风险，返回JSON格式结果。`;

  const userPrompt = `客户名称: ${params.customerName}
所属行业: ${params.industry}
合同金额: ${params.contractValue}万元
最近订单日期: ${params.lastOrderDate}
订单频率: ${params.orderFrequency}
${params.satisfactionScore != null ? `满意度评分: ${params.satisfactionScore}/10` : ""}
${params.complaintCount != null ? `投诉次数: ${params.complaintCount}` : ""}
${params.competitorActivity ? `竞品动态: ${params.competitorActivity}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "churn_prediction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              churnProbability: { type: "number" },
              riskLevel: { type: "string", enum: ["high", "medium", "low"] },
              churnFactors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    factor: { type: "string" },
                    weight: { type: "number" },
                    description: { type: "string" },
                  },
                  required: ["factor", "weight", "description"],
                  additionalProperties: false,
                },
              },
              retentionActions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    action: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    expectedImpact: { type: "string" },
                    timeline: { type: "string" },
                  },
                  required: ["action", "priority", "expectedImpact", "timeline"],
                  additionalProperties: false,
                },
              },
              customerHealthScore: { type: "number" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["churnProbability", "riskLevel", "churnFactors", "retentionActions", "customerHealthScore", "recommendations"],
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
    console.error("[SalesFinanceIntelligence] predictChurn failed:", error);
    return {
      churnProbability: 0,
      riskLevel: "low",
      churnFactors: [],
      retentionActions: [{ action: "AI服务暂时不可用，请人工分析", priority: "high", expectedImpact: "待评估", timeline: "即时" }],
      customerHealthScore: 0,
      recommendations: ["AI服务暂时不可用，请人工分析客户流失风险"],
    };
  }
}

// ============================================================
// 3. Budget Anomaly Analysis (预算异常分析)
// ============================================================

export async function analyzeBudget(params: {
  department: string;
  budgetPeriod: string;
  allocatedBudget: number;
  actualSpend: number;
  categories: string;
  overrunItems?: string;
  comparisonPeriod?: string;
}): Promise<BudgetAnalysisResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT财务预算分析与异常检测专家。

GRT背景知识：
- GRT年营收约1.5-2亿元，员工约200人
- 典型预算结构：人力35-40%、物料25-30%、设备10-15%、差旅5-8%、其他10-15%
- 7大部门：研发部、生产部、销售部、客服部、财务部、人力资源部、行政管理部
- 部门预算基准（年度）：
  * 研发部：2000-3000万（占营收15-20%）
  * 生产部：3000-5000万（含物料采购）
  * 销售部：1500-2500万（含差旅和市场推广）
  * 客服部：500-800万
  * 财务/HR/行政：各200-500万
- 异常阈值：偏差>10%预警（黄色），>20%严重（红色），>30%异常（紧急）
- 季节性支出模式：Q1低（节后恢复），Q2-Q3正常，Q4高（年底采购集中）
- 常见预算超支原因：原材料涨价、项目追加、紧急采购、汇率波动

请基于预算数据检测异常并分析趋势，返回JSON格式结果。`;

  const userPrompt = `部门: ${params.department}
预算周期: ${params.budgetPeriod}
预算金额: ${params.allocatedBudget}万元
实际支出: ${params.actualSpend}万元
费用明细: ${params.categories}
${params.overrunItems ? `超支项目: ${params.overrunItems}` : ""}
${params.comparisonPeriod ? `对比周期: ${params.comparisonPeriod}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "budget_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              variancePercent: { type: "number" },
              anomalyScore: { type: "number" },
              anomalies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    allocated: { type: "number" },
                    actual: { type: "number" },
                    variance: { type: "number" },
                    severity: { type: "string", enum: ["critical", "warning", "normal"] },
                    explanation: { type: "string" },
                  },
                  required: ["category", "allocated", "actual", "variance", "severity", "explanation"],
                  additionalProperties: false,
                },
              },
              trendAnalysis: { type: "string" },
              forecastToYearEnd: { type: "number" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["variancePercent", "anomalyScore", "anomalies", "trendAnalysis", "forecastToYearEnd", "recommendations"],
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
    console.error("[SalesFinanceIntelligence] analyzeBudget failed:", error);
    return {
      variancePercent: 0,
      anomalyScore: 0,
      anomalies: [],
      trendAnalysis: "AI服务暂时不可用",
      forecastToYearEnd: 0,
      recommendations: ["AI服务暂时不可用，请人工分析预算数据"],
    };
  }
}

// ============================================================
// 4. Cost Optimization (成本优化)
// ============================================================

export async function optimizeCost(params: {
  projectName: string;
  totalBudget: number;
  costBreakdown: string;
  targetMargin: number;
  materialCosts?: string;
  laborHours?: number;
  overheadRate?: number;
}): Promise<CostOptimizationResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT项目成本优化与利润分析专家。

GRT背景知识：
- GRT生产工业清洗设备，典型项目周期3-12个月
- 项目成本结构：材料40-50%、人工20-25%、外协10-15%、管理费8-12%、利润10-15%
- 典型项目规模：小型30-80万、中型80-200万、大型200-500万
- 成本优化杠杆：
  * 材料：替代供应商（降5-10%）、批量采购（降3-5%）、标准化设计（降5-8%）、国产替代（降10-20%）
  * 人工：工艺优化（降10-15%）、模块化装配（降5-10%）、技能培训（降3-5%）
  * 外协：自制比例提升（降5-10%）、供应商整合（降3-5%）
  * 管理费：流程优化（降2-3%）
- 目标毛利率：标准设备15-20%、定制设备20-30%、维保服务40-50%
- 成本基准：碳氢清洗机材料成本30-60万、水基清洗线材料成本20-50万
- 风险因素：原材料涨价、交期延误、设计变更、质量返工

请基于项目成本数据优化成本结构，返回JSON格式结果。`;

  const userPrompt = `项目名称: ${params.projectName}
项目总预算: ${params.totalBudget}万元
成本构成: ${params.costBreakdown}
目标毛利率: ${params.targetMargin}%
${params.materialCosts ? `材料明细: ${params.materialCosts}` : ""}
${params.laborHours != null ? `人工工时: ${params.laborHours}小时` : ""}
${params.overheadRate != null ? `管理费率: ${params.overheadRate}%` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cost_optimization",
          strict: true,
          schema: {
            type: "object",
            properties: {
              optimizedTotal: { type: "number" },
              savingsPercent: { type: "number" },
              optimizations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    area: { type: "string" },
                    currentCost: { type: "number" },
                    optimizedCost: { type: "number" },
                    savingsPercent: { type: "number" },
                    suggestion: { type: "string" },
                  },
                  required: ["area", "currentCost", "optimizedCost", "savingsPercent", "suggestion"],
                  additionalProperties: false,
                },
              },
              marginAnalysis: {
                type: "object",
                properties: {
                  currentMargin: { type: "number" },
                  targetMargin: { type: "number" },
                  achievable: { type: "number" },
                },
                required: ["currentMargin", "targetMargin", "achievable"],
                additionalProperties: false,
              },
              riskAssessment: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["optimizedTotal", "savingsPercent", "optimizations", "marginAnalysis", "riskAssessment", "recommendations"],
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
    console.error("[SalesFinanceIntelligence] optimizeCost failed:", error);
    return {
      optimizedTotal: 0,
      savingsPercent: 0,
      optimizations: [],
      marginAnalysis: { currentMargin: 0, targetMargin: params.targetMargin, achievable: 0 },
      riskAssessment: "AI服务暂时不可用",
      recommendations: ["AI服务暂时不可用，请人工分析成本优化方案"],
    };
  }
}
