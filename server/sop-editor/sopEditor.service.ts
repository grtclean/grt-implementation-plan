/**
 * SOP工艺卡片智能服务 (SOP Process Card Editor Service)
 * Phase 21 P0: US-005 — AI工序生成 · 参数推荐 · 质检点绑定
 */


import { createChildLogger } from "../lib/logger";
const log = createChildLogger("sop-editor");

export interface ProcessCardResult {
  processName: string;
  totalSteps: number;
  estimatedCycleTime: string;
  steps: Array<{
    stepNumber: number;
    stepName: string;
    description: string;
    equipmentRequired: string;
    parameters: Array<{ name: string; value: string; unit: string; tolerance: string }>;
    qualityCheckpoint: { required: boolean; method: string; standard: string; acceptCriteria: string };
    safetyNotes: string;
    estimatedTime: string;
    bomMaterials: string[];
  }>;
  toolsRequired: string[];
  safetyWarnings: string[];
  recommendations: string[];
}

export async function generateProcessCard(params: {
  productType: string;
  workpieceDescription: string;
  cleaningMethod: string;
  cleanlinessTarget: string;
  materialType?: string;
  batchSize?: number;
  specialRequirements?: string;
  existingSOPReference?: string;
}): Promise<ProcessCardResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT工艺工程师，负责生成清洗设备的标准工艺卡片(SOP Process Card)。

GRT工艺卡片标准结构：
每道工序必须包含：
1. 工序名称和编号
2. 设备要求
3. 工艺参数(温度/时间/压力/频率/浓度等，含公差范围)
4. 质检点(是否需要检测、检测方法、判定标准)
5. 安全注意事项
6. 预估工时
7. 关联BOM物料

GRT典型清洗工艺流程：
- 碳氢真空清洗：上料 → 粗洗(浸泡+超声) → 精洗(真空蒸馏) → 蒸汽清洗 → 真空干燥 → 下料/检测
- 水基清洗：上料 → 预清洗(喷淋) → 主清洗(浸泡+喷淋) → 漂洗1 → 漂洗2(纯水) → 热风干燥 → 检测
- 超声波清洗：上料 → 超声清洗(28kHz) → 超声精洗(40kHz) → 漂洗 → 干燥 → 检测

工艺参数范围(典型)：
- 碳氢溶剂温度：40-80°C
- 水基清洗液浓度：2-8%
- 超声功率密度：10-40W/L
- 超声频率：25kHz(粗洗)、40kHz(精洗)、80kHz(超精洗)
- 清洗时间：2-15min/工序
- 真空度：<10mbar(真空干燥)
- 烘干温度：60-120°C

请生成完整的工艺卡片，每道工序都包含详细参数和质检点，返回JSON格式。`;

  const userPrompt = `产品类型: ${params.productType}
工件描述: ${params.workpieceDescription}
清洗方式: ${params.cleaningMethod}
清洁度目标: ${params.cleanlinessTarget}
${params.materialType ? `工件材料: ${params.materialType}` : ""}
${params.batchSize ? `批次数量: ${params.batchSize}件` : ""}
${params.specialRequirements ? `特殊要求: ${params.specialRequirements}` : ""}
${params.existingSOPReference ? `参考SOP: ${params.existingSOPReference}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "process_card",
          strict: true,
          schema: {
            type: "object",
            properties: {
              processName: { type: "string" },
              totalSteps: { type: "number" },
              estimatedCycleTime: { type: "string" },
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    stepNumber: { type: "number" },
                    stepName: { type: "string" },
                    description: { type: "string" },
                    equipmentRequired: { type: "string" },
                    parameters: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          value: { type: "string" },
                          unit: { type: "string" },
                          tolerance: { type: "string" },
                        },
                        required: ["name", "value", "unit", "tolerance"],
                        additionalProperties: false,
                      },
                    },
                    qualityCheckpoint: {
                      type: "object",
                      properties: {
                        required: { type: "boolean" },
                        method: { type: "string" },
                        standard: { type: "string" },
                        acceptCriteria: { type: "string" },
                      },
                      required: ["required", "method", "standard", "acceptCriteria"],
                      additionalProperties: false,
                    },
                    safetyNotes: { type: "string" },
                    estimatedTime: { type: "string" },
                    bomMaterials: { type: "array", items: { type: "string" } },
                  },
                  required: ["stepNumber", "stepName", "description", "equipmentRequired", "parameters", "qualityCheckpoint", "safetyNotes", "estimatedTime", "bomMaterials"],
                  additionalProperties: false,
                },
              },
              toolsRequired: { type: "array", items: { type: "string" } },
              safetyWarnings: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["processName", "totalSteps", "estimatedCycleTime", "steps", "toolsRequired", "safetyWarnings", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response from LLM");
  } catch (error) {
    log.error({ err: error }, "[SOPEditor] generateProcessCard failed:");
    return {
      processName: "工艺卡片生成失败",
      totalSteps: 0,
      estimatedCycleTime: "待定",
      steps: [],
      toolsRequired: [],
      safetyWarnings: ["AI服务暂时不可用"],
      recommendations: ["请人工编写工艺卡片"],
    };
  }
}
