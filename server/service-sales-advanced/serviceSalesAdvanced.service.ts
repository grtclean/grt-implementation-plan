/**
 * 服务与销售高级智能服务 (Service & Sales Advanced Intelligence)
 * Phase 21 P1: US-014 远程协助 · US-015 SLA · US-016 商机转化 · US-017 售后反馈
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("service-sales");

export interface RemoteAssistanceResult {
  sessionSummary: string;
  diagnosticSteps: Array<{ step: number; instruction: string; expectedResult: string; ifFail: string }>;
  visualGuides: Array<{ component: string; location: string; action: string; caution: string }>;
  escalationNeeded: boolean;
  escalationReason: string;
  partsToInspect: string[];
  recommendations: string[];
}

export interface SLADashboardResult {
  overallSLARate: number;
  periodSummary: string;
  metrics: Array<{ metric: string; target: string; actual: string; status: string; trend: string }>;
  ticketAnalysis: { total: number; resolved: number; pending: number; overdue: number; avgResponseHours: number; avgResolutionHours: number };
  topIssues: Array<{ category: string; count: number; avgResolutionTime: string }>;
  engineerPerformance: Array<{ engineer: string; ticketsHandled: number; avgRating: number; slaCompliance: string }>;
  recommendations: string[];
}

export interface OpportunityConversionResult {
  requirementDoc: { projectName: string; customerProfile: string; technicalRequirements: string[]; cleanlinessSpec: string; throughputSpec: string; budgetRange: string; timeline: string };
  riskAssessment: Array<{ risk: string; level: string; mitigation: string }>;
  suggestedTeam: Array<{ role: string; responsibility: string }>;
  estimatedEffort: string;
  recommendations: string[];
}

export interface DesignFeedbackResult {
  patternId: string;
  faultPattern: string;
  frequency: number;
  affectedModels: string[];
  rootCauseHypothesis: string;
  designImprovements: Array<{ area: string; currentDesign: string; suggestedChange: string; expectedBenefit: string; priority: string }>;
  costOfInaction: string;
  recommendations: string[];
}

// ============================================================
// 1. Remote Assistance Session (US-014)
// ============================================================
export async function guideRemoteAssistance(params: {
  equipmentModel: string; faultDescription: string; customerSkillLevel: string; availableTools?: string; previousAttempts?: string;
}): Promise<RemoteAssistanceResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT远程技术支持专家，负责生成逐步引导的远程诊断指令，适配客户的技术水平。

远程协助原则：
- 根据客户技能调整指令复杂度(初级→详细+图示说明，高级→简洁指令)
- 每步指令包含：操作、预期结果、失败时的替代方案
- 标注安全注意事项(断电、泄压、防护)
- 识别需要现场派人的情况(升级判断)

GRT设备远程可操作项：PLC参数查看/修改、传感器读数、报警复位、程序重启、参数备份。
不可远程操作：机械部件更换、密封件更换、管路维修。

请生成远程协助指令，返回JSON格式。`;
  const userPrompt = `设备型号: ${params.equipmentModel}\n故障描述: ${params.faultDescription}\n客户技术水平: ${params.customerSkillLevel}\n${params.availableTools ? `可用工具: ${params.availableTools}` : ""}\n${params.previousAttempts ? `已尝试: ${params.previousAttempts}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "remote_assistance", strict: true, schema: { type: "object", properties: {
        sessionSummary: { type: "string" },
        diagnosticSteps: { type: "array", items: { type: "object", properties: { step: { type: "number" }, instruction: { type: "string" }, expectedResult: { type: "string" }, ifFail: { type: "string" } }, required: ["step", "instruction", "expectedResult", "ifFail"], additionalProperties: false } },
        visualGuides: { type: "array", items: { type: "object", properties: { component: { type: "string" }, location: { type: "string" }, action: { type: "string" }, caution: { type: "string" } }, required: ["component", "location", "action", "caution"], additionalProperties: false } },
        escalationNeeded: { type: "boolean" },
        escalationReason: { type: "string" },
        partsToInspect: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["sessionSummary", "diagnosticSteps", "visualGuides", "escalationNeeded", "escalationReason", "partsToInspect", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "guideRemoteAssistance failed");
    return { sessionSummary: "AI服务不可用", diagnosticSteps: [], visualGuides: [], escalationNeeded: true, escalationReason: "AI服务不可用，建议派人现场", partsToInspect: [], recommendations: ["请联系技术支持"] };
  }
}

// ============================================================
// 2. Service SLA Analysis (US-015)
// ============================================================
export async function analyzeSLA(params: {
  period: string; ticketData: string; slaTargets: string; engineerData?: string;
}): Promise<SLADashboardResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT售后服务运营分析专家，负责分析SLA达标率和服务效能。

GRT SLA标准：
- P1响应: 2h内, 解决: 24h内
- P2响应: 4h内, 解决: 48h内
- P3响应: 24h内, 解决: 1周内
- P4响应: 48h内, 解决: 2周内
- 客户满意度目标: ≥4.0/5.0
- 一次性修复率目标: ≥85%

请分析SLA数据并生成仪表板数据，返回JSON格式。`;
  const userPrompt = `统计周期: ${params.period}\n工单数据: ${params.ticketData}\nSLA目标: ${params.slaTargets}\n${params.engineerData ? `工程师数据: ${params.engineerData}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "sla_dashboard", strict: true, schema: { type: "object", properties: {
        overallSLARate: { type: "number" },
        periodSummary: { type: "string" },
        metrics: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, target: { type: "string" }, actual: { type: "string" }, status: { type: "string", enum: ["met", "at_risk", "missed"] }, trend: { type: "string", enum: ["improving", "stable", "declining"] } }, required: ["metric", "target", "actual", "status", "trend"], additionalProperties: false } },
        ticketAnalysis: { type: "object", properties: { total: { type: "number" }, resolved: { type: "number" }, pending: { type: "number" }, overdue: { type: "number" }, avgResponseHours: { type: "number" }, avgResolutionHours: { type: "number" } }, required: ["total", "resolved", "pending", "overdue", "avgResponseHours", "avgResolutionHours"], additionalProperties: false },
        topIssues: { type: "array", items: { type: "object", properties: { category: { type: "string" }, count: { type: "number" }, avgResolutionTime: { type: "string" } }, required: ["category", "count", "avgResolutionTime"], additionalProperties: false } },
        engineerPerformance: { type: "array", items: { type: "object", properties: { engineer: { type: "string" }, ticketsHandled: { type: "number" }, avgRating: { type: "number" }, slaCompliance: { type: "string" } }, required: ["engineer", "ticketsHandled", "avgRating", "slaCompliance"], additionalProperties: false } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["overallSLARate", "periodSummary", "metrics", "ticketAnalysis", "topIssues", "engineerPerformance", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "analyzeSLA failed");
    return { overallSLARate: 0, periodSummary: "AI服务不可用", metrics: [], ticketAnalysis: { total: 0, resolved: 0, pending: 0, overdue: 0, avgResponseHours: 0, avgResolutionHours: 0 }, topIssues: [], engineerPerformance: [], recommendations: ["请人工统计SLA数据"] };
  }
}

// ============================================================
// 3. Opportunity to Requirement Conversion (US-016)
// ============================================================
export async function convertOpportunity(params: {
  opportunityName: string; customerName: string; industry: string; productInterest: string; budget?: string; notes?: string;
}): Promise<OpportunityConversionResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT售前技术顾问，负责将销售商机信息转化为结构化技术需求文档。

转化规则：
- 从客户行业推断清洁度要求(汽车:VDA 19, 半导体:ISO 14644, 通用:ISO 16232)
- 从产品兴趣推断设备类型和基本参数
- 评估技术风险(非标度、复杂度)
- 建议项目团队配置(PM/机械/电气/工艺)
- 估算项目周期

请转化商机为需求文档，返回JSON格式。`;
  const userPrompt = `商机名称: ${params.opportunityName}\n客户: ${params.customerName}\n行业: ${params.industry}\n产品意向: ${params.productInterest}\n${params.budget ? `预算: ${params.budget}` : ""}\n${params.notes ? `备注: ${params.notes}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "opportunity_conversion", strict: true, schema: { type: "object", properties: {
        requirementDoc: { type: "object", properties: { projectName: { type: "string" }, customerProfile: { type: "string" }, technicalRequirements: { type: "array", items: { type: "string" } }, cleanlinessSpec: { type: "string" }, throughputSpec: { type: "string" }, budgetRange: { type: "string" }, timeline: { type: "string" } }, required: ["projectName", "customerProfile", "technicalRequirements", "cleanlinessSpec", "throughputSpec", "budgetRange", "timeline"], additionalProperties: false },
        riskAssessment: { type: "array", items: { type: "object", properties: { risk: { type: "string" }, level: { type: "string", enum: ["high", "medium", "low"] }, mitigation: { type: "string" } }, required: ["risk", "level", "mitigation"], additionalProperties: false } },
        suggestedTeam: { type: "array", items: { type: "object", properties: { role: { type: "string" }, responsibility: { type: "string" } }, required: ["role", "responsibility"], additionalProperties: false } },
        estimatedEffort: { type: "string" },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["requirementDoc", "riskAssessment", "suggestedTeam", "estimatedEffort", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "convertOpportunity failed");
    return { requirementDoc: { projectName: params.opportunityName, customerProfile: params.customerName, technicalRequirements: [], cleanlinessSpec: "待定", throughputSpec: "待定", budgetRange: "待定", timeline: "待定" }, riskAssessment: [], suggestedTeam: [], estimatedEffort: "待评估", recommendations: ["请人工编写需求文档"] };
  }
}

// ============================================================
// 4. After-Sales → R&D Design Feedback (US-017)
// ============================================================
export async function analyzeFieldFeedback(params: {
  period: string; faultRecords: string; equipmentModels: string; recurringThreshold?: number;
}): Promise<DesignFeedbackResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT产品可靠性分析专家，负责从售后故障数据中识别设计缺陷模式并提出改进建议。

分析方法：
- 统计故障频次，识别Top故障模式(Pareto)
- 关联设备型号和批次，识别共性问题
- 区分随机故障vs系统性设计缺陷
- 对系统性问题提出设计改进建议
- 评估不改进的风险(客户流失、保修成本)

GRT常见设计改进方向：
- 密封结构优化(双密封/唇形密封替代O型圈)
- 泵选型升级(留更大余量)
- PLC程序优化(增加保护逻辑)
- 材料升级(304→316L抗腐蚀)

请分析故障数据并生成设计反馈，返回JSON格式。`;
  const userPrompt = `统计周期: ${params.period}\n故障记录: ${params.faultRecords}\n涉及设备: ${params.equipmentModels}\n${params.recurringThreshold ? `重复故障阈值: ${params.recurringThreshold}次` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "design_feedback", strict: true, schema: { type: "object", properties: {
        patternId: { type: "string" },
        faultPattern: { type: "string" },
        frequency: { type: "number" },
        affectedModels: { type: "array", items: { type: "string" } },
        rootCauseHypothesis: { type: "string" },
        designImprovements: { type: "array", items: { type: "object", properties: { area: { type: "string" }, currentDesign: { type: "string" }, suggestedChange: { type: "string" }, expectedBenefit: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] } }, required: ["area", "currentDesign", "suggestedChange", "expectedBenefit", "priority"], additionalProperties: false } },
        costOfInaction: { type: "string" },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["patternId", "faultPattern", "frequency", "affectedModels", "rootCauseHypothesis", "designImprovements", "costOfInaction", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "analyzeFieldFeedback failed");
    return { patternId: `FP-${Date.now()}`, faultPattern: "AI服务不可用", frequency: 0, affectedModels: [], rootCauseHypothesis: "待分析", designImprovements: [], costOfInaction: "待评估", recommendations: ["请人工分析售后数据"] };
  }
}
