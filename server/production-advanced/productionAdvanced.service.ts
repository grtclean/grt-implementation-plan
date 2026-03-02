/**
 * 生产高级智能服务 (Production Advanced Intelligence Service)
 * Phase 21 P1: US-010 缺料预警 · US-011 工位领料 · US-012 异常上报 · US-018 日报生成
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("production-advanced");

export interface MaterialShortageResult {
  alertLevel: string;
  shortageItems: Array<{ material: string; currentStock: number; safetyStock: number; dailyUsage: number; daysRemaining: number; suggestedOrderQty: number; urgency: string }>;
  schedulingImpact: string;
  purchaseSuggestions: Array<{ material: string; supplier: string; quantity: number; estimatedLeadTime: string; estimatedCost: string }>;
  alternativeMaterials: Array<{ original: string; alternative: string; compatibility: string }>;
  recommendations: string[];
}

export interface WorkstationRequisitionResult {
  requisitionNumber: string;
  workstation: string;
  items: Array<{ material: string; requiredQty: number; availableStock: number; allocatedQty: number; status: string; location: string }>;
  pickingRoute: string[];
  estimatedPickTime: string;
  shortfalls: Array<{ material: string; deficit: number; suggestion: string }>;
  recommendations: string[];
}

export interface ProductionExceptionResult {
  exceptionId: string;
  classification: string;
  severity: string;
  escalationLevel: string;
  escalationTargets: Array<{ role: string; name: string; reason: string }>;
  immediateActions: string[];
  rootCauseHypothesis: Array<{ cause: string; probability: number }>;
  impactScope: string;
  estimatedDowntime: string;
  recommendations: string[];
}

export interface DailyReportResult {
  reportDate: string;
  summary: string;
  productionMetrics: Array<{ metric: string; planned: string; actual: string; achievement: string; status: string }>;
  qualitySummary: { totalInspected: number; passRate: string; mainDefects: string[] };
  equipmentStatus: Array<{ equipment: string; status: string; utilizationRate: string; issues: string }>;
  abnormalEvents: Array<{ time: string; event: string; status: string; impact: string }>;
  tomorrowPlan: string[];
  keyHighlights: string[];
  recommendations: string[];
}

// ============================================================
// 1. Material Shortage Alert (US-010)
// ============================================================
export async function analyzeShortage(params: {
  productionPlan: string; currentInventory: string; pendingOrders?: string; historicalUsage?: string;
}): Promise<MaterialShortageResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT物料管理专家，负责分析生产计划与库存，预测缺料风险并生成采购建议。

GRT物料分类：泵阀(交期3-6周)、电气件(2-4周)、结构件(1-3周)、标准件(1-2周)、密封件(1-2周)、特种件(4-8周)。
安全库存策略：关键件=2周用量，通用件=1周用量。

请分析缺料风险，返回JSON格式。`;
  const userPrompt = `生产计划: ${params.productionPlan}\n当前库存: ${params.currentInventory}\n${params.pendingOrders ? `在途订单: ${params.pendingOrders}` : ""}\n${params.historicalUsage ? `历史用量: ${params.historicalUsage}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "material_shortage", strict: true, schema: { type: "object", properties: {
        alertLevel: { type: "string", enum: ["critical", "warning", "normal"] },
        shortageItems: { type: "array", items: { type: "object", properties: { material: { type: "string" }, currentStock: { type: "number" }, safetyStock: { type: "number" }, dailyUsage: { type: "number" }, daysRemaining: { type: "number" }, suggestedOrderQty: { type: "number" }, urgency: { type: "string", enum: ["urgent", "high", "medium", "low"] } }, required: ["material", "currentStock", "safetyStock", "dailyUsage", "daysRemaining", "suggestedOrderQty", "urgency"], additionalProperties: false } },
        schedulingImpact: { type: "string" },
        purchaseSuggestions: { type: "array", items: { type: "object", properties: { material: { type: "string" }, supplier: { type: "string" }, quantity: { type: "number" }, estimatedLeadTime: { type: "string" }, estimatedCost: { type: "string" } }, required: ["material", "supplier", "quantity", "estimatedLeadTime", "estimatedCost"], additionalProperties: false } },
        alternativeMaterials: { type: "array", items: { type: "object", properties: { original: { type: "string" }, alternative: { type: "string" }, compatibility: { type: "string" } }, required: ["original", "alternative", "compatibility"], additionalProperties: false } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["alertLevel", "shortageItems", "schedulingImpact", "purchaseSuggestions", "alternativeMaterials", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "analyzeShortage failed");
    return { alertLevel: "warning", shortageItems: [], schedulingImpact: "AI服务不可用", purchaseSuggestions: [], alternativeMaterials: [], recommendations: ["请人工检查库存"] };
  }
}

// ============================================================
// 2. Workstation Requisition (US-011)
// ============================================================
export async function optimizeRequisition(params: {
  workstation: string; productionOrder: string; bomMaterials: string; warehouseInventory: string;
}): Promise<WorkstationRequisitionResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT仓库物流专家，负责根据工位生产任务生成最优领料单，规划拣货路线。

GRT仓库布局：原材料区(A区)、半成品区(B区)、标准件区(C区)、电气件区(D区)。
领料单要求：按库位排序，生成最短拣货路线，标注库存不足项。

请生成领料单，返回JSON格式。`;
  const userPrompt = `工位: ${params.workstation}\n生产工单: ${params.productionOrder}\nBOM物料: ${params.bomMaterials}\n仓库库存: ${params.warehouseInventory}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "workstation_requisition", strict: true, schema: { type: "object", properties: {
        requisitionNumber: { type: "string" },
        workstation: { type: "string" },
        items: { type: "array", items: { type: "object", properties: { material: { type: "string" }, requiredQty: { type: "number" }, availableStock: { type: "number" }, allocatedQty: { type: "number" }, status: { type: "string", enum: ["ready", "partial", "shortage"] }, location: { type: "string" } }, required: ["material", "requiredQty", "availableStock", "allocatedQty", "status", "location"], additionalProperties: false } },
        pickingRoute: { type: "array", items: { type: "string" } },
        estimatedPickTime: { type: "string" },
        shortfalls: { type: "array", items: { type: "object", properties: { material: { type: "string" }, deficit: { type: "number" }, suggestion: { type: "string" } }, required: ["material", "deficit", "suggestion"], additionalProperties: false } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["requisitionNumber", "workstation", "items", "pickingRoute", "estimatedPickTime", "shortfalls", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "optimizeRequisition failed");
    return { requisitionNumber: `REQ-${Date.now()}`, workstation: params.workstation, items: [], pickingRoute: [], estimatedPickTime: "待定", shortfalls: [], recommendations: ["请人工生成领料单"] };
  }
}

// ============================================================
// 3. Production Exception Report (US-012)
// ============================================================
export async function analyzeException(params: {
  exceptionType: string; description: string; location: string; affectedOrders?: string; equipmentId?: string; reporterName: string;
}): Promise<ProductionExceptionResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT生产异常管理专家，负责分类异常、评估影响、确定升级路径。

异常分类：设备故障/质量异常/物料问题/安全事件/工艺偏差/人员问题。
升级规则：
- L1(班组长)：一般异常，30min内可解决
- L2(生产主管)：影响当日计划，需资源协调
- L3(生产经理/总监)：停机>2h或安全事件或客户交期影响

请分析异常并确定升级路径，返回JSON格式。`;
  const userPrompt = `异常类型: ${params.exceptionType}\n描述: ${params.description}\n位置: ${params.location}\n${params.affectedOrders ? `影响工单: ${params.affectedOrders}` : ""}\n${params.equipmentId ? `设备编号: ${params.equipmentId}` : ""}\n报告人: ${params.reporterName}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "production_exception", strict: true, schema: { type: "object", properties: {
        exceptionId: { type: "string" },
        classification: { type: "string" },
        severity: { type: "string", enum: ["critical", "major", "minor"] },
        escalationLevel: { type: "string", enum: ["L1", "L2", "L3"] },
        escalationTargets: { type: "array", items: { type: "object", properties: { role: { type: "string" }, name: { type: "string" }, reason: { type: "string" } }, required: ["role", "name", "reason"], additionalProperties: false } },
        immediateActions: { type: "array", items: { type: "string" } },
        rootCauseHypothesis: { type: "array", items: { type: "object", properties: { cause: { type: "string" }, probability: { type: "number" } }, required: ["cause", "probability"], additionalProperties: false } },
        impactScope: { type: "string" },
        estimatedDowntime: { type: "string" },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["exceptionId", "classification", "severity", "escalationLevel", "escalationTargets", "immediateActions", "rootCauseHypothesis", "impactScope", "estimatedDowntime", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "analyzeException failed");
    return { exceptionId: `EXC-${Date.now()}`, classification: params.exceptionType, severity: "major", escalationLevel: "L2", escalationTargets: [], immediateActions: ["请立即通知生产主管"], rootCauseHypothesis: [], impactScope: "待评估", estimatedDowntime: "待定", recommendations: ["请人工处理异常"] };
  }
}

// ============================================================
// 4. Production Daily Report (US-018)
// ============================================================
export async function generateDailyReport(params: {
  date: string; productionData: string; qualityData: string; equipmentData?: string; abnormalEvents?: string; tomorrowPlan?: string;
}): Promise<DailyReportResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT生产日报编写专家，负责汇总当日生产数据生成格式化日报。

日报标准格式：
1. 概况摘要(2-3句话)
2. 生产指标(计划vs实际，达成率)
3. 质量概况(合格率，主要缺陷)
4. 设备状态(利用率，异常)
5. 异常事件(如有)
6. 明日计划
7. 重点提示

请生成日报内容，返回JSON格式。`;
  const userPrompt = `日期: ${params.date}\n生产数据: ${params.productionData}\n质量数据: ${params.qualityData}\n${params.equipmentData ? `设备数据: ${params.equipmentData}` : ""}\n${params.abnormalEvents ? `异常事件: ${params.abnormalEvents}` : ""}\n${params.tomorrowPlan ? `明日计划: ${params.tomorrowPlan}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "daily_report", strict: true, schema: { type: "object", properties: {
        reportDate: { type: "string" },
        summary: { type: "string" },
        productionMetrics: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, planned: { type: "string" }, actual: { type: "string" }, achievement: { type: "string" }, status: { type: "string", enum: ["above", "on_target", "below"] } }, required: ["metric", "planned", "actual", "achievement", "status"], additionalProperties: false } },
        qualitySummary: { type: "object", properties: { totalInspected: { type: "number" }, passRate: { type: "string" }, mainDefects: { type: "array", items: { type: "string" } } }, required: ["totalInspected", "passRate", "mainDefects"], additionalProperties: false },
        equipmentStatus: { type: "array", items: { type: "object", properties: { equipment: { type: "string" }, status: { type: "string" }, utilizationRate: { type: "string" }, issues: { type: "string" } }, required: ["equipment", "status", "utilizationRate", "issues"], additionalProperties: false } },
        abnormalEvents: { type: "array", items: { type: "object", properties: { time: { type: "string" }, event: { type: "string" }, status: { type: "string" }, impact: { type: "string" } }, required: ["time", "event", "status", "impact"], additionalProperties: false } },
        tomorrowPlan: { type: "array", items: { type: "string" } },
        keyHighlights: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["reportDate", "summary", "productionMetrics", "qualitySummary", "equipmentStatus", "abnormalEvents", "tomorrowPlan", "keyHighlights", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "generateDailyReport failed");
    return { reportDate: params.date, summary: "AI服务不可用", productionMetrics: [], qualitySummary: { totalInspected: 0, passRate: "0%", mainDefects: [] }, equipmentStatus: [], abnormalEvents: [], tomorrowPlan: [], keyHighlights: [], recommendations: ["请人工编写日报"] };
  }
}
