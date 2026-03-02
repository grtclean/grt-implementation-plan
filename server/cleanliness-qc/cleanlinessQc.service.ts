/**
 * 清洁度质检智能服务 (Cleanliness QC Intelligence Service)
 * Phase 21 P0: 检测模板 · 自动判定 · 报告生成
 *
 * 3 AI functions covering the full cleanliness inspection workflow.
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("cleanliness-qc");

// ============================================================
// Types
// ============================================================

export interface CleanlinessInspectionResult {
  inspectionId: string;
  structuredData: {
    particleCounts: Array<{ sizeRange: string; count: number; limit: number; status: string }>;
    maxParticle: { size: number; limit: number; status: string };
    residualMass: { value: number; limit: number; unit: string; status: string };
    totalParticleArea: { value: number; limit: number; unit: string; status: string };
  };
  standard: string;
  cleanlinessCode: string;
  summary: string;
}

export interface ComplianceJudgmentResult {
  overallVerdict: string;
  verdictConfidence: number;
  itemResults: Array<{
    item: string;
    measuredValue: string;
    standardLimit: string;
    verdict: string;
    margin: string;
  }>;
  criticalFindings: string[];
  borderlineCases: string[];
  recommendations: string[];
}

export interface QCReportResult {
  reportTitle: string;
  executiveSummary: string;
  inspectionDetails: string;
  chartData: {
    particleDistribution: Array<{ sizeRange: string; count: number; limit: number }>;
    trendComparison: Array<{ batch: string; cleanlinessLevel: number }>;
  };
  conclusion: string;
  signoffItems: Array<{ role: string; requirement: string }>;
  recommendations: string[];
}

// ============================================================
// 1. Cleanliness Inspection — Structured Data Entry (US-001)
// ============================================================

export async function inspectCleanliness(params: {
  batchNumber: string;
  workpieceType: string;
  cleaningMethod: string;
  standard: string;
  cleanlinessClass?: string;
  particleData: string;
  residualMass?: number;
  maxParticleSize?: number;
  inspectionMethod?: string;
  notes?: string;
}): Promise<CleanlinessInspectionResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT清洁度检测专家，负责将原始检测数据结构化并按ISO 16232/VDA 19标准分类。

GRT清洁度检测背景：
- 检测标准体系：
  · ISO 16232：汽车零部件清洁度，颗粒度等级编码(如 A/B/C/D/E/F/G/H/I/J/K)
  · VDA 19：德国汽车工业清洁度标准（与ISO 16232对应）
  · 自定义标准：根据客户特殊要求制定

- 清洁度编码规则(ISO 16232)：
  · 按颗粒尺寸分档：>5μm, >15μm, >25μm, >50μm, >100μm, >150μm, >200μm, >400μm, >600μm, >1000μm
  · 每档对应等级A~V(数量越少等级越高)
  · 示例编码：CCC/D-D(15/25/50/100-200)

- 检测方法：
  · 颗粒萃取：压力冲洗法、超声波萃取法、摇晃法
  · 颗粒分析：显微镜计数法、自动颗粒计数仪、重量法
  · 残余质量：滤膜称重法(mg)

- GRT设备清洁度目标(典型)：
  · 碳氢真空清洗后：颗粒度达到ISO 16232 D级以上
  · 超声波清洗后：可达B/C级
  · 水基清洗：根据工艺参数，通常C/D级

请将原始颗粒数据结构化为标准格式，计算清洁度等级编码，返回JSON格式结果。`;

  const userPrompt = `批次号: ${params.batchNumber}
工件类型: ${params.workpieceType}
清洗方式: ${params.cleaningMethod}
执行标准: ${params.standard}
${params.cleanlinessClass ? `清洁度等级要求: ${params.cleanlinessClass}` : ""}
颗粒数据(原始): ${params.particleData}
${params.residualMass !== undefined ? `残余质量: ${params.residualMass}mg` : ""}
${params.maxParticleSize !== undefined ? `最大颗粒尺寸: ${params.maxParticleSize}μm` : ""}
${params.inspectionMethod ? `检测方法: ${params.inspectionMethod}` : ""}
${params.notes ? `备注: ${params.notes}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cleanliness_inspection",
          strict: true,
          schema: {
            type: "object",
            properties: {
              inspectionId: { type: "string" },
              structuredData: {
                type: "object",
                properties: {
                  particleCounts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sizeRange: { type: "string" },
                        count: { type: "number" },
                        limit: { type: "number" },
                        status: { type: "string", enum: ["pass", "fail", "warning"] },
                      },
                      required: ["sizeRange", "count", "limit", "status"],
                      additionalProperties: false,
                    },
                  },
                  maxParticle: {
                    type: "object",
                    properties: {
                      size: { type: "number" },
                      limit: { type: "number" },
                      status: { type: "string", enum: ["pass", "fail", "warning"] },
                    },
                    required: ["size", "limit", "status"],
                    additionalProperties: false,
                  },
                  residualMass: {
                    type: "object",
                    properties: {
                      value: { type: "number" },
                      limit: { type: "number" },
                      unit: { type: "string" },
                      status: { type: "string", enum: ["pass", "fail", "warning"] },
                    },
                    required: ["value", "limit", "unit", "status"],
                    additionalProperties: false,
                  },
                  totalParticleArea: {
                    type: "object",
                    properties: {
                      value: { type: "number" },
                      limit: { type: "number" },
                      unit: { type: "string" },
                      status: { type: "string", enum: ["pass", "fail", "warning"] },
                    },
                    required: ["value", "limit", "unit", "status"],
                    additionalProperties: false,
                  },
                },
                required: ["particleCounts", "maxParticle", "residualMass", "totalParticleArea"],
                additionalProperties: false,
              },
              standard: { type: "string" },
              cleanlinessCode: { type: "string" },
              summary: { type: "string" },
            },
            required: ["inspectionId", "structuredData", "standard", "cleanlinessCode", "summary"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response from LLM");
  } catch (error) {
    log.error({ err: error }, "inspectCleanliness failed");
    return {
      inspectionId: `INS-${Date.now()}`,
      structuredData: {
        particleCounts: [],
        maxParticle: { size: 0, limit: 0, status: "fail" },
        residualMass: { value: 0, limit: 0, unit: "mg", status: "fail" },
        totalParticleArea: { value: 0, limit: 0, unit: "mm²", status: "fail" },
      },
      standard: params.standard,
      cleanlinessCode: "待定",
      summary: "AI服务暂时不可用，请人工录入检测数据",
    };
  }
}

// ============================================================
// 2. Compliance Auto-Judgment (US-002)
// ============================================================

export async function judgeCompliance(params: {
  batchNumber: string;
  standard: string;
  cleanlinessClass: string;
  particleData: string;
  residualMass?: number;
  maxParticleSize?: number;
  customerSpecialLimits?: string;
}): Promise<ComplianceJudgmentResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT清洁度合规判定专家，负责将检测数据与标准限值逐项对比并给出合格/不合格判定。

判定规则：
- 逐项对比每个粒径档位的颗粒数量与标准限值
- 任何一项超标 → 整体判定为"不合格"
- 所有项目均在限值内 → 判定"合格"
- 接近限值(>80%)的项目 → 标记为"边界"需关注

ISO 16232清洁度等级限值参考：
- A级: >5μm ≤1000颗, >15μm ≤500颗, >25μm ≤100颗, >50μm ≤20颗, >100μm ≤5颗
- B级: 各档位限值约为A级的2倍
- C级: 各档位限值约为A级的5倍
- D级: 各档位限值约为A级的10倍

残余质量限值(典型)：
- 高清洁度(半导体)：≤0.5mg
- 标准(汽车)：≤1.0~3.0mg
- 一般(工业)：≤5.0mg

请严格按照标准进行逐项判定，返回JSON格式结果。`;

  const userPrompt = `批次号: ${params.batchNumber}
执行标准: ${params.standard}
清洁度等级要求: ${params.cleanlinessClass}
颗粒数据: ${params.particleData}
${params.residualMass !== undefined ? `残余质量: ${params.residualMass}mg` : ""}
${params.maxParticleSize !== undefined ? `最大颗粒: ${params.maxParticleSize}μm` : ""}
${params.customerSpecialLimits ? `客户特殊限值: ${params.customerSpecialLimits}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "compliance_judgment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallVerdict: { type: "string", enum: ["合格", "不合格", "有条件合格"] },
              verdictConfidence: { type: "number" },
              itemResults: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    item: { type: "string" },
                    measuredValue: { type: "string" },
                    standardLimit: { type: "string" },
                    verdict: { type: "string", enum: ["pass", "fail", "warning"] },
                    margin: { type: "string" },
                  },
                  required: ["item", "measuredValue", "standardLimit", "verdict", "margin"],
                  additionalProperties: false,
                },
              },
              criticalFindings: { type: "array", items: { type: "string" } },
              borderlineCases: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["overallVerdict", "verdictConfidence", "itemResults", "criticalFindings", "borderlineCases", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response from LLM");
  } catch (error) {
    log.error({ err: error }, "judgeCompliance failed");
    return {
      overallVerdict: "不合格",
      verdictConfidence: 0,
      itemResults: [],
      criticalFindings: ["AI服务暂时不可用，请人工判定"],
      borderlineCases: [],
      recommendations: ["请人工对比标准限值进行判定"],
    };
  }
}

// ============================================================
// 3. QC Report Generation (US-003)
// ============================================================

export async function generateQCReport(params: {
  batchNumber: string;
  workpieceType: string;
  cleaningMethod: string;
  standard: string;
  inspectionData: string;
  judgmentResult: string;
  inspectorName?: string;
  historicalBatches?: string;
}): Promise<QCReportResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT质量报告撰写专家，负责生成符合ISO 16232/VDA 19标准的清洁度检测报告。

报告要求：
- 标题包含批次号、工件类型、检测日期
- 执行摘要(1-2段)概述检测结论
- 检测详情包含全部数据和对比结果
- 提供颗粒分布图表数据(柱状图)
- 提供趋势对比数据(如有历史批次)
- 结论明确合格/不合格及理由
- 签审要求列出需要签字的角色

GRT报告模板风格：
- 正式、专业、数据驱动
- 中文为主，关键术语保留英文
- 数值精确到小数点后2位
- 不合格项使用红色标注提示(通过标记)

请生成完整的检测报告内容，返回JSON格式。`;

  const userPrompt = `批次号: ${params.batchNumber}
工件类型: ${params.workpieceType}
清洗方式: ${params.cleaningMethod}
执行标准: ${params.standard}
检测数据: ${params.inspectionData}
判定结果: ${params.judgmentResult}
${params.inspectorName ? `检测员: ${params.inspectorName}` : ""}
${params.historicalBatches ? `历史批次数据: ${params.historicalBatches}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "qc_report",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reportTitle: { type: "string" },
              executiveSummary: { type: "string" },
              inspectionDetails: { type: "string" },
              chartData: {
                type: "object",
                properties: {
                  particleDistribution: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sizeRange: { type: "string" },
                        count: { type: "number" },
                        limit: { type: "number" },
                      },
                      required: ["sizeRange", "count", "limit"],
                      additionalProperties: false,
                    },
                  },
                  trendComparison: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        batch: { type: "string" },
                        cleanlinessLevel: { type: "number" },
                      },
                      required: ["batch", "cleanlinessLevel"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["particleDistribution", "trendComparison"],
                additionalProperties: false,
              },
              conclusion: { type: "string" },
              signoffItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    role: { type: "string" },
                    requirement: { type: "string" },
                  },
                  required: ["role", "requirement"],
                  additionalProperties: false,
                },
              },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["reportTitle", "executiveSummary", "inspectionDetails", "chartData", "conclusion", "signoffItems", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response from LLM");
  } catch (error) {
    log.error({ err: error }, "generateQCReport failed");
    return {
      reportTitle: "清洁度检测报告(生成失败)",
      executiveSummary: "AI服务暂时不可用，请人工编写报告",
      inspectionDetails: "",
      chartData: { particleDistribution: [], trendComparison: [] },
      conclusion: "待人工判定",
      signoffItems: [{ role: "质量工程师", requirement: "检测确认" }],
      recommendations: ["请人工编写检测报告"],
    };
  }
}
