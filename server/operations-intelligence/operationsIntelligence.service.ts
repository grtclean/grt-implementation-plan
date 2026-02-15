/**
 * 运营智能服务 (Operations Intelligence Service)
 * Phase E: 供应链与质量智能 — 供应商评估 · 库存优化 · 质量预测 · 生产效率
 *
 * 4 core AI functions using invokeLLM() with structured JSON output.
 */

// ============================================================
// Types
// ============================================================

export interface SupplierAssessmentResult {
  overallScore: number;
  grade: string;
  strengths: string[];
  risks: Array<{ risk: string; severity: string; mitigation: string }>;
  recommendations: string[];
  comparisonBenchmark: string;
}

export interface InventoryOptimizationResult {
  reorderPoint: number;
  safetyStock: number;
  economicOrderQty: number;
  abcClassification: string;
  currentStatus: string;
  costSavingOpportunity: string;
  recommendations: string[];
}

export interface QualityPredictionResult {
  trendDirection: string;
  predictedDefectRate: number;
  confidenceLevel: number;
  rootCauseAnalysis: Array<{ cause: string; probability: number; impact: string }>;
  preventiveActions: string[];
  qualityScore: number;
}

export interface ProductionEfficiencyResult {
  oeeScore: number;
  bottleneckIdentified: boolean;
  bottleneckDescription: string;
  efficiencyRating: string;
  improvementAreas: Array<{ area: string; currentValue: string; targetValue: string; impact: string }>;
  recommendations: string[];
  estimatedSavings: string;
}

// ============================================================
// 1. Supplier Assessment (供应商评估)
// ============================================================

export async function assessSupplier(params: {
  supplierName: string;
  category: string;
  deliveryOnTime: number;
  qualityPassRate: number;
  avgLeadDays: number;
  priceCompetitiveness?: string;
  responseTime?: string;
  certifications?: string;
}): Promise<SupplierAssessmentResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT供应链管理专家，负责供应商绩效评估与风险分析。

GRT背景知识：
- GRT生产工业清洗设备（碳氢真空清洗机、水基清洗线、超声波清洗机）
- 年产约150台设备
- 主要采购品类：泵阀(水泵/真空泵/化学泵)、电气元件(PLC/传感器/变频器)、结构件(不锈钢板/型材)、标准件(螺栓/密封件)、特种喷嘴
- 典型交期：标准件1-2周、电气件2-4周、泵阀3-6周、特种件4-8周
- 质量标准：ISO 16232 / VDA 19清洁度标准
- 关键供应商评估维度：质量、交期、价格、服务响应、资质认证

请基于供应商数据进行综合评估，返回JSON格式结果。
评分标准：
- A级(90-100)：战略合作供应商，优先采购
- B级(75-89)：合格供应商，正常采购
- C级(60-74)：观察供应商，限制采购
- D级(<60)：淘汰供应商，停止采购`;

  const userPrompt = `供应商名称: ${params.supplierName}
供应类别: ${params.category}
准时交付率: ${params.deliveryOnTime}%
质量合格率: ${params.qualityPassRate}%
平均交期: ${params.avgLeadDays}天
${params.priceCompetitiveness ? `价格竞争力: ${params.priceCompetitiveness}` : ""}
${params.responseTime ? `响应速度: ${params.responseTime}` : ""}
${params.certifications ? `资质认证: ${params.certifications}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "supplier_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallScore: { type: "number" },
              grade: { type: "string", enum: ["A", "B", "C", "D"] },
              strengths: { type: "array", items: { type: "string" } },
              risks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    risk: { type: "string" },
                    severity: { type: "string", enum: ["high", "medium", "low"] },
                    mitigation: { type: "string" },
                  },
                  required: ["risk", "severity", "mitigation"],
                  additionalProperties: false,
                },
              },
              recommendations: { type: "array", items: { type: "string" } },
              comparisonBenchmark: { type: "string" },
            },
            required: ["overallScore", "grade", "strengths", "risks", "recommendations", "comparisonBenchmark"],
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
    console.error("[OperationsIntelligence] assessSupplier failed:", error);
    return {
      overallScore: 0,
      grade: "D",
      strengths: [],
      risks: [{ risk: "AI服务暂时不可用", severity: "high", mitigation: "请稍后重试或人工评估" }],
      recommendations: ["AI服务暂时不可用，请人工评估供应商"],
      comparisonBenchmark: "暂无数据",
    };
  }
}

// ============================================================
// 2. Inventory Optimization (库存优化)
// ============================================================

export async function optimizeInventory(params: {
  materialName: string;
  currentStock: number;
  avgDailyUsage: number;
  leadTimeDays: number;
  unitCost?: number;
  demandVariability?: string;
  serviceLevel?: string;
}): Promise<InventoryOptimizationResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT库存管理与供应链优化专家。

GRT背景知识：
- GRT年产约150台工业清洗设备，月均12-13台
- 库存策略：标准件JIT（准时制），长交期件安全库存
- 典型物料分类：
  * A类（高价值/低数量）：泵、PLC、变频器、特种阀门 → 精确管控
  * B类（中价值/中数量）：传感器、密封件、连接器 → 定期检查
  * C类（低价值/高数量）：螺栓、垫片、管接头 → 批量采购
- 服务水平目标：A类99%、B类95%、C类90%
- 仓库面积有限，需控制在库资金占用

请基于物料数据计算最优库存参数，返回JSON格式结果。`;

  const userPrompt = `物料名称: ${params.materialName}
当前库存: ${params.currentStock}
日均消耗量: ${params.avgDailyUsage}
采购交期: ${params.leadTimeDays}天
${params.unitCost != null ? `单价: ${params.unitCost}元` : ""}
${params.demandVariability ? `需求波动性: ${params.demandVariability}` : ""}
${params.serviceLevel ? `目标服务水平: ${params.serviceLevel}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "inventory_optimization",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reorderPoint: { type: "number" },
              safetyStock: { type: "number" },
              economicOrderQty: { type: "number" },
              abcClassification: { type: "string", enum: ["A", "B", "C"] },
              currentStatus: { type: "string", enum: ["optimal", "overstock", "understock", "critical"] },
              costSavingOpportunity: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["reorderPoint", "safetyStock", "economicOrderQty", "abcClassification", "currentStatus", "costSavingOpportunity", "recommendations"],
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
    console.error("[OperationsIntelligence] optimizeInventory failed:", error);
    return {
      reorderPoint: 0,
      safetyStock: 0,
      economicOrderQty: 0,
      abcClassification: "C",
      currentStatus: "optimal",
      costSavingOpportunity: "AI服务暂时不可用",
      recommendations: ["AI服务暂时不可用，请人工分析库存"],
    };
  }
}

// ============================================================
// 3. Quality Trend Prediction (质量趋势预测)
// ============================================================

export async function predictQualityTrend(params: {
  processName: string;
  recentDefectRate: number;
  inspectionCount: number;
  defectTypes?: string;
  materialBatch?: string;
  equipmentAge?: number;
}): Promise<QualityPredictionResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT质量管理与预测分析专家。

GRT背景知识：
- 产品：工业清洗设备，执行ISO 16232 / VDA 19清洁度标准
- 生产工序T1-T15：BOM确认→下料→焊接→机加工→表面处理→装配→电气接线→管路安装→调试→清洁度测试→FAT→包装→发运→安装→SAT
- 典型缺陷模式：
  * 焊接工序：气孔、裂纹、变形（与焊工技能和保护气体相关）
  * 机加工：尺寸超差、表面粗糙度不合格（与刀具磨损和设备精度相关）
  * 装配：漏装、错装、力矩不足（与SOP执行和经验相关）
  * 清洁度：颗粒超标、残留物超标（与清洗工艺参数和滤芯相关）
- 质量目标：一次合格率≥95%，清洁度合格率≥98%
- 设备寿命预警：>5年需加强精度校验，>10年建议更新

请基于质量数据预测趋势和分析根因，返回JSON格式结果。`;

  const userPrompt = `工序名称: ${params.processName}
近期缺陷率: ${params.recentDefectRate}%
检验数量: ${params.inspectionCount}
${params.defectTypes ? `缺陷类型: ${params.defectTypes}` : ""}
${params.materialBatch ? `材料批次: ${params.materialBatch}` : ""}
${params.equipmentAge != null ? `设备使用年限: ${params.equipmentAge}年` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quality_prediction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              trendDirection: { type: "string", enum: ["improving", "stable", "declining", "critical"] },
              predictedDefectRate: { type: "number" },
              confidenceLevel: { type: "number" },
              rootCauseAnalysis: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    cause: { type: "string" },
                    probability: { type: "number" },
                    impact: { type: "string" },
                  },
                  required: ["cause", "probability", "impact"],
                  additionalProperties: false,
                },
              },
              preventiveActions: { type: "array", items: { type: "string" } },
              qualityScore: { type: "number" },
            },
            required: ["trendDirection", "predictedDefectRate", "confidenceLevel", "rootCauseAnalysis", "preventiveActions", "qualityScore"],
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
    console.error("[OperationsIntelligence] predictQualityTrend failed:", error);
    return {
      trendDirection: "stable",
      predictedDefectRate: 0,
      confidenceLevel: 0,
      rootCauseAnalysis: [],
      preventiveActions: ["AI服务暂时不可用，请人工分析质量趋势"],
      qualityScore: 0,
    };
  }
}

// ============================================================
// 4. Production Efficiency Analysis (生产效率分析)
// ============================================================

export async function analyzeProductionEfficiency(params: {
  processStep: string;
  plannedCycleTime: number;
  actualCycleTime: number;
  throughput: number;
  downtime: number;
  workerCount?: number;
  defectRate?: number;
}): Promise<ProductionEfficiencyResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT生产效率分析与OEE优化专家。

GRT背景知识：
- 生产工序T1-T15流程：
  T1(BOM确认/备料) → T2(下料/切割) → T3(折弯/成型) → T4(焊接) → T5(机加工) → T6(表面处理/抛光) → T7(预装配) → T8(电气接线) → T9(管路安装) → T10(系统调试) → T11(清洁度测试) → T12(FAT验收) → T13(包装) → T14(发运) → T15(现场SAT)
- 典型节拍时间：
  * 焊接(T4): 120-240分钟/台
  * 装配(T7): 180-360分钟/台
  * 电气(T8): 90-180分钟/台
  * 调试(T10): 240-480分钟/台
- 班次：8小时/班，通常单班制
- OEE = 可用率 × 性能率 × 质量率
  * 行业优秀：>85%
  * 行业平均：60-70%
  * 需改善：<60%
- 停机原因分布：设备故障(25%)、换型(20%)、物料等待(30%)、人员缺席(10%)、其他(15%)

请基于生产数据计算OEE并识别瓶颈，返回JSON格式结果。`;

  const userPrompt = `工序步骤: ${params.processStep}
计划节拍: ${params.plannedCycleTime}分钟
实际节拍: ${params.actualCycleTime}分钟
产量: ${params.throughput}件/班
停机率: ${params.downtime}%
${params.workerCount != null ? `人员数量: ${params.workerCount}人` : ""}
${params.defectRate != null ? `缺陷率: ${params.defectRate}%` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "production_efficiency",
          strict: true,
          schema: {
            type: "object",
            properties: {
              oeeScore: { type: "number" },
              bottleneckIdentified: { type: "boolean" },
              bottleneckDescription: { type: "string" },
              efficiencyRating: { type: "string", enum: ["excellent", "good", "average", "poor"] },
              improvementAreas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    area: { type: "string" },
                    currentValue: { type: "string" },
                    targetValue: { type: "string" },
                    impact: { type: "string" },
                  },
                  required: ["area", "currentValue", "targetValue", "impact"],
                  additionalProperties: false,
                },
              },
              recommendations: { type: "array", items: { type: "string" } },
              estimatedSavings: { type: "string" },
            },
            required: ["oeeScore", "bottleneckIdentified", "bottleneckDescription", "efficiencyRating", "improvementAreas", "recommendations", "estimatedSavings"],
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
    console.error("[OperationsIntelligence] analyzeProductionEfficiency failed:", error);
    return {
      oeeScore: 0,
      bottleneckIdentified: false,
      bottleneckDescription: "AI服务暂时不可用",
      efficiencyRating: "average",
      improvementAreas: [],
      recommendations: ["AI服务暂时不可用，请人工分析生产效率"],
      estimatedSavings: "待评估",
    };
  }
}
