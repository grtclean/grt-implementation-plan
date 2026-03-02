/**
 * 客户自助报修智能服务 (Customer Self-Service Repair Service)
 * Phase 21 P0: US-006 — 自动分类 · 优先级评估 · 知识库匹配
 */


import { createChildLogger } from "../lib/logger";
const log = createChildLogger("customer-repair");

export interface RepairTriageResult {
  ticketCategory: string;
  priority: string;
  urgencyScore: number;
  possibleCauses: Array<{ cause: string; probability: number; description: string }>;
  selfHelpSteps: string[];
  knowledgeBaseMatches: Array<{ title: string; relevance: number; summary: string }>;
  estimatedResponseTime: string;
  recommendedAction: string;
  spareParts: Array<{ part: string; likelihood: string }>;
  recommendations: string[];
}

export async function triageRepairRequest(params: {
  customerName: string;
  equipmentModel: string;
  serialNumber?: string;
  faultDescription: string;
  errorCodes?: string;
  faultPhotos?: string;
  operatingEnvironment?: string;
  urgencyLevel?: string;
}): Promise<RepairTriageResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT客户服务智能分诊系统，负责对客户报修请求进行自动分类、优先级评估和初步诊断。

GRT客户报修分诊规则：
- 故障分类：
  · 机械故障：泵/阀/密封/管路/结构件(40%占比)
  · 电气故障：PLC/传感器/电机/变频器/加热(30%)
  · 软件故障：程序/通讯/HMI界面(10%)
  · 工艺问题：清洗效果/干燥/洁净度不达标(15%)
  · 安全类：泄漏/过热/异味/防爆(5%)

- 优先级评估：
  · P1-紧急(2h响应)：停机、安全隐患、生产线停滞
  · P2-高(4h响应)：性能严重下降、客户交期影响
  · P3-普通(24h响应)：功能部分受限、有替代方案
  · P4-低(48h响应)：外观/非关键功能、咨询类

- 自助排查建议：对于常见问题，提供客户可自行执行的简单排查步骤

请对报修请求进行智能分诊，返回JSON格式。`;

  const userPrompt = `客户名称: ${params.customerName}
设备型号: ${params.equipmentModel}
${params.serialNumber ? `设备序列号: ${params.serialNumber}` : ""}
故障描述: ${params.faultDescription}
${params.errorCodes ? `错误代码: ${params.errorCodes}` : ""}
${params.faultPhotos ? `故障照片描述: ${params.faultPhotos}` : ""}
${params.operatingEnvironment ? `运行环境: ${params.operatingEnvironment}` : ""}
${params.urgencyLevel ? `客户自评紧急度: ${params.urgencyLevel}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "repair_triage",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ticketCategory: { type: "string" },
              priority: { type: "string", enum: ["P1-紧急", "P2-高", "P3-普通", "P4-低"] },
              urgencyScore: { type: "number" },
              possibleCauses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    cause: { type: "string" },
                    probability: { type: "number" },
                    description: { type: "string" },
                  },
                  required: ["cause", "probability", "description"],
                  additionalProperties: false,
                },
              },
              selfHelpSteps: { type: "array", items: { type: "string" } },
              knowledgeBaseMatches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    relevance: { type: "number" },
                    summary: { type: "string" },
                  },
                  required: ["title", "relevance", "summary"],
                  additionalProperties: false,
                },
              },
              estimatedResponseTime: { type: "string" },
              recommendedAction: { type: "string" },
              spareParts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    part: { type: "string" },
                    likelihood: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["part", "likelihood"],
                  additionalProperties: false,
                },
              },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["ticketCategory", "priority", "urgencyScore", "possibleCauses", "selfHelpSteps", "knowledgeBaseMatches", "estimatedResponseTime", "recommendedAction", "spareParts", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response from LLM");
  } catch (error) {
    log.error({ err: error }, "[CustomerRepair] triageRepairRequest failed:");
    return {
      ticketCategory: "待分类",
      priority: "P3-普通",
      urgencyScore: 50,
      possibleCauses: [{ cause: "AI服务不可用", probability: 0, description: "请人工分诊" }],
      selfHelpSteps: ["请联系售后热线获取即时帮助"],
      knowledgeBaseMatches: [],
      estimatedResponseTime: "24小时内",
      recommendedAction: "请等待售后工程师联系",
      spareParts: [],
      recommendations: ["AI服务暂时不可用，工单已创建，售后团队将尽快处理"],
    };
  }
}
