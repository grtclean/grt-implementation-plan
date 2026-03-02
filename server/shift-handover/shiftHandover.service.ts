/**
 * 数字化交接班服务 (Digital Shift Handover Service)
 * Phase 21 P0: US-004 — 结构化交接 · AI风险识别 · 历史追溯
 */

// ============================================================
// Types
// ============================================================


import { createChildLogger } from "../lib/logger";
const log = createChildLogger("shift-handover");

export interface ShiftHandoverAnalysisResult {
  riskLevel: string;
  riskItems: Array<{ item: string; severity: string; description: string; suggestedAction: string }>;
  keyAttentionPoints: string[];
  continuityCheck: Array<{ task: string; status: string; handoverNote: string }>;
  safetyReminders: string[];
  equipmentStatusSummary: string;
  recommendations: string[];
}

// ============================================================
// 1. Shift Handover AI Analysis
// ============================================================

export async function analyzeShiftHandover(params: {
  currentShift: string;
  nextShift: string;
  handoverPerson: string;
  productionOutput: string;
  equipmentStatus: string;
  qualityIssues?: string;
  abnormalEvents?: string;
  pendingTasks: string;
  safetyNotes?: string;
  materialStatus?: string;
}): Promise<ShiftHandoverAnalysisResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT生产交接班管理专家，负责分析交接班内容，识别风险项，确保班次间信息无缝衔接。

GRT交接班背景：
- GRT工厂实行两班制(白班8:00-17:00/夜班17:00-次日8:00)或三班制
- 清洗设备生产特点：
  · 设备运行参数(真空度/温度/超声频率)需逐班确认
  · 清洗介质(碳氢溶剂/水基清洗液)需定期更换，需交接液位和浓度
  · 模具/夹具更换需交接当前装夹状态
  · 安全类：碳氢溶剂易燃易爆，必须交接通风和防护状态

交接班风险评估标准：
- 🔴高风险：设备异常未排除、质量问题未闭环、安全隐患存在
- 🟡中风险：待办任务紧急、物料即将短缺、参数需要调整
- 🟢低风险：正常生产状态，无待处理异常

请分析交接班内容，识别风险和关注点，返回JSON格式。`;

  const userPrompt = `当前班次: ${params.currentShift}
交接班次: ${params.nextShift}
交接人: ${params.handoverPerson}
生产完成情况: ${params.productionOutput}
设备状态: ${params.equipmentStatus}
${params.qualityIssues ? `质量问题: ${params.qualityIssues}` : ""}
${params.abnormalEvents ? `异常事件: ${params.abnormalEvents}` : ""}
待办事项: ${params.pendingTasks}
${params.safetyNotes ? `安全事项: ${params.safetyNotes}` : ""}
${params.materialStatus ? `物料状态: ${params.materialStatus}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "shift_handover_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              riskLevel: { type: "string", enum: ["high", "medium", "low"] },
              riskItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    item: { type: "string" },
                    severity: { type: "string", enum: ["high", "medium", "low"] },
                    description: { type: "string" },
                    suggestedAction: { type: "string" },
                  },
                  required: ["item", "severity", "description", "suggestedAction"],
                  additionalProperties: false,
                },
              },
              keyAttentionPoints: { type: "array", items: { type: "string" } },
              continuityCheck: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task: { type: "string" },
                    status: { type: "string", enum: ["completed", "in_progress", "pending", "blocked"] },
                    handoverNote: { type: "string" },
                  },
                  required: ["task", "status", "handoverNote"],
                  additionalProperties: false,
                },
              },
              safetyReminders: { type: "array", items: { type: "string" } },
              equipmentStatusSummary: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["riskLevel", "riskItems", "keyAttentionPoints", "continuityCheck", "safetyReminders", "equipmentStatusSummary", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response from LLM");
  } catch (error) {
    log.error({ err: error }, "[ShiftHandover] analyzeShiftHandover failed:");
    return {
      riskLevel: "medium",
      riskItems: [{ item: "AI服务不可用", severity: "medium", description: "请人工确认交接内容", suggestedAction: "逐项核对" }],
      keyAttentionPoints: ["AI服务暂时不可用，请人工审核交接内容"],
      continuityCheck: [],
      safetyReminders: ["请确认所有安全设施正常"],
      equipmentStatusSummary: "请人工确认设备状态",
      recommendations: ["请人工完成交接班确认"],
    };
  }
}
