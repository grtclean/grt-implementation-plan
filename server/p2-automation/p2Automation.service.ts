/**
 * P2 自动化智能服务 (P2 Automation Intelligence)
 * Phase 21 P2: 工单→知识库 · NPS调查 · 评审→报价 · 质量月报 · BOM冻结通知 · 验收通知
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("p2-automation");

export interface TicketToKBResult {
  articleTitle: string;
  summary: string;
  symptoms: string[];
  rootCause: string;
  solutionSteps: Array<{ step: number; description: string; notes: string }>;
  preventionTips: string[];
  tags: string[];
  applicableModels: string[];
  difficulty: string;
  estimatedTime: string;
  recommendations: string[];
}

export interface NPSSurveyResult {
  surveyId: string;
  customerName: string;
  questions: Array<{ id: number; question: string; type: string; options: string[] }>;
  npsQuestion: string;
  trendAnalysis: { currentPeriodAvg: number; previousPeriodAvg: number; trend: string; topIssues: string[] };
  recommendations: string[];
}

export interface ReviewToQuotationResult {
  quotationDraft: { projectName: string; productLine: string; configuration: string; specifications: Array<{ parameter: string; value: string; source: string }>; estimatedPrice: string; deliveryTime: string; warranty: string };
  mappedParameters: Array<{ reviewParam: string; quotationField: string; value: string; confidence: number }>;
  missingInfo: string[];
  recommendations: string[];
}

export interface QualityMonthlyReportResult {
  reportMonth: string;
  executiveSummary: string;
  overallPassRate: number;
  metrics: Array<{ metric: string; value: string; target: string; status: string; trend: string }>;
  defectPareto: Array<{ defectType: string; count: number; percentage: string; cumulativePercent: string }>;
  ncrSummary: { total: number; open: number; closed: number; avgClosureTime: string };
  customerComplaintSummary: string;
  monthOverMonth: Array<{ metric: string; thisMonth: string; lastMonth: string; change: string }>;
  actionItems: Array<{ item: string; owner: string; deadline: string }>;
  recommendations: string[];
}

export interface BOMFreezeNotificationResult {
  notificationId: string;
  bomId: string;
  projectName: string;
  schedulingTask: { priority: string; suggestedStartDate: string; estimatedDuration: string; prerequisites: string[] };
  materialReadiness: Array<{ material: string; status: string; leadTime: string; action: string }>;
  longLeadItems: string[];
  notificationContent: string;
  recipients: Array<{ role: string; name: string }>;
  recommendations: string[];
}

export interface AcceptanceNotificationResult {
  notificationId: string;
  customerNotification: { subject: string; body: string; attachments: string[] };
  acceptanceReport: { reportTitle: string; projectInfo: string; inspectionSummary: string; testItems: Array<{ item: string; standard: string; result: string; status: string }>; complianceStatement: string; nextSteps: string[]; signoffRequired: Array<{ role: string; responsibility: string }> };
  scheduleSuggestion: string;
  recommendations: string[];
}

// ============================================================
// 1. Convert Ticket to Knowledge Base Article
// ============================================================
export async function convertTicketToKB(params: {
  ticketId: string; ticketTitle: string; faultDescription: string; resolution: string; equipmentModel: string; resolvedBy?: string;
}): Promise<TicketToKBResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT知识库编辑专家，负责将已解决的售后工单转化为结构化知识库文章。

转化原则：
- 提取关键字、标签、适用设备型号
- 格式化为可搜索的知识库文章，包含：标题、摘要、症状、根因、解决步骤、预防建议、标签
- 解决步骤应详细且可操作，适合现场工程师参考
- 标签应涵盖：设备类型、故障类型、解决方法、相关零部件
- 评估难度等级(初级/中级/高级)和预计处理时间

GRT设备类型：碳氢真空清洗机、水基清洗线、超声波清洗机、喷淋清洗机、钝化线。
常见故障类型：泄漏、堵塞、温度异常、压力异常、电气故障、PLC报警、清洁度不达标。

请将工单转化为知识库文章，返回JSON格式。`;
  const userPrompt = `工单号: ${params.ticketId}\n工单标题: ${params.ticketTitle}\n故障描述: ${params.faultDescription}\n解决方案: ${params.resolution}\n设备型号: ${params.equipmentModel}\n${params.resolvedBy ? `解决人: ${params.resolvedBy}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "ticket_to_kb", strict: true, schema: { type: "object", properties: {
        articleTitle: { type: "string" },
        summary: { type: "string" },
        symptoms: { type: "array", items: { type: "string" } },
        rootCause: { type: "string" },
        solutionSteps: { type: "array", items: { type: "object", properties: { step: { type: "number" }, description: { type: "string" }, notes: { type: "string" } }, required: ["step", "description", "notes"], additionalProperties: false } },
        preventionTips: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        applicableModels: { type: "array", items: { type: "string" } },
        difficulty: { type: "string" },
        estimatedTime: { type: "string" },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["articleTitle", "summary", "symptoms", "rootCause", "solutionSteps", "preventionTips", "tags", "applicableModels", "difficulty", "estimatedTime", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "convertTicketToKB failed");
    return { articleTitle: params.ticketTitle, summary: "AI服务不可用", symptoms: [], rootCause: "待分析", solutionSteps: [], preventionTips: [], tags: [], applicableModels: [params.equipmentModel], difficulty: "待评估", estimatedTime: "待评估", recommendations: ["请人工编写知识库文章"] };
  }
}

// ============================================================
// 2. Generate NPS Satisfaction Survey
// ============================================================
export async function generateNPSSurvey(params: {
  ticketId: string; customerName: string; serviceType: string; engineerName: string; resolutionSummary: string; historicalNPS?: string;
}): Promise<NPSSurveyResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT售后满意度调查设计专家，负责在服务完成后生成NPS满意度调查问卷。

设计原则：
- 根据服务类型(安装/维修/保养/技术支持)定制问题
- 问题类型包括：评分(1-10)、单选、多选、开放式
- 必须包含标准NPS问题："您有多大可能将GRT推荐给同事或合作伙伴？"
- 如提供历史NPS数据，生成趋势分析(同比/环比)
- 问卷控制在5-8个问题，避免过长导致回收率下降
- 关注：响应速度、专业程度、问题解决效果、沟通态度、整体满意度

请生成满意度调查问卷，返回JSON格式。`;
  const userPrompt = `工单号: ${params.ticketId}\n客户: ${params.customerName}\n服务类型: ${params.serviceType}\n工程师: ${params.engineerName}\n解决摘要: ${params.resolutionSummary}\n${params.historicalNPS ? `历史NPS数据: ${params.historicalNPS}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "nps_survey", strict: true, schema: { type: "object", properties: {
        surveyId: { type: "string" },
        customerName: { type: "string" },
        questions: { type: "array", items: { type: "object", properties: { id: { type: "number" }, question: { type: "string" }, type: { type: "string" }, options: { type: "array", items: { type: "string" } } }, required: ["id", "question", "type", "options"], additionalProperties: false } },
        npsQuestion: { type: "string" },
        trendAnalysis: { type: "object", properties: { currentPeriodAvg: { type: "number" }, previousPeriodAvg: { type: "number" }, trend: { type: "string" }, topIssues: { type: "array", items: { type: "string" } } }, required: ["currentPeriodAvg", "previousPeriodAvg", "trend", "topIssues"], additionalProperties: false },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["surveyId", "customerName", "questions", "npsQuestion", "trendAnalysis", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "generateNPSSurvey failed");
    return { surveyId: `NPS-${Date.now()}`, customerName: params.customerName, questions: [], npsQuestion: "您有多大可能将GRT推荐给同事或合作伙伴？(0-10分)", trendAnalysis: { currentPeriodAvg: 0, previousPeriodAvg: 0, trend: "无数据", topIssues: [] }, recommendations: ["请人工设计调查问卷"] };
  }
}

// ============================================================
// 3. Link Technical Review to Quotation
// ============================================================
export async function linkReviewToQuotation(params: {
  reviewId: string; projectName: string; reviewConclusions: string; technicalParameters: string; approvedSpecs?: string;
}): Promise<ReviewToQuotationResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT售前报价专家，负责将技术评审结论自动映射到报价模板参数。

映射规则：
- 从评审结论中提取已批准的技术规格
- 将技术参数映射到报价单对应字段(设备型号、配置、选项)
- 识别缺失信息，标记为需要补充
- 评估每个映射的置信度(0-1)

GRT产品线：
- 碳氢真空清洗机：GRT-HC系列，标准/高配/旗舰配置
- 水基清洗线：GRT-WB系列，单槽/多槽/全自动
- 超声波清洗机：GRT-US系列，台式/落地/定制
- 标准交货期：标准8-12周，定制12-16周
- 标准质保：设备1年，关键部件2年

请提取评审结论并生成报价草案，返回JSON格式。`;
  const userPrompt = `评审编号: ${params.reviewId}\n项目名称: ${params.projectName}\n评审结论: ${params.reviewConclusions}\n技术参数: ${params.technicalParameters}\n${params.approvedSpecs ? `已批准规格: ${params.approvedSpecs}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "review_to_quotation", strict: true, schema: { type: "object", properties: {
        quotationDraft: { type: "object", properties: { projectName: { type: "string" }, productLine: { type: "string" }, configuration: { type: "string" }, specifications: { type: "array", items: { type: "object", properties: { parameter: { type: "string" }, value: { type: "string" }, source: { type: "string" } }, required: ["parameter", "value", "source"], additionalProperties: false } }, estimatedPrice: { type: "string" }, deliveryTime: { type: "string" }, warranty: { type: "string" } }, required: ["projectName", "productLine", "configuration", "specifications", "estimatedPrice", "deliveryTime", "warranty"], additionalProperties: false },
        mappedParameters: { type: "array", items: { type: "object", properties: { reviewParam: { type: "string" }, quotationField: { type: "string" }, value: { type: "string" }, confidence: { type: "number" } }, required: ["reviewParam", "quotationField", "value", "confidence"], additionalProperties: false } },
        missingInfo: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["quotationDraft", "mappedParameters", "missingInfo", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "linkReviewToQuotation failed");
    return { quotationDraft: { projectName: params.projectName, productLine: "待定", configuration: "待定", specifications: [], estimatedPrice: "待定", deliveryTime: "待定", warranty: "标准质保1年" }, mappedParameters: [], missingInfo: ["评审数据解析失败，请人工填写"], recommendations: ["请人工编写报价单"] };
  }
}

// ============================================================
// 4. Generate Quality Monthly Report
// ============================================================
export async function generateQualityMonthlyReport(params: {
  month: string; inspectionData: string; defectData: string; ncrData?: string; customerComplaints?: string; previousMonthData?: string;
}): Promise<QualityMonthlyReportResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT质量管理分析专家，负责生成月度质量报告。

报告要求：
- 分析检验合格率(目标≥98%)
- 缺陷帕累托分析(Top5缺陷类型及占比)
- NCR(不合格品报告)趋势分析：新增、关闭、平均关闭时间
- 客户投诉汇总及分类
- 月度环比对比(与上月比较)
- 管理层摘要：简洁、突出关键问题和改进方向
- 行动项：明确责任人和截止日期

GRT质量标准：
- 进料检验(IQC)：关键物料100%检验
- 过程检验(IPQC)：每班次首件检验 + 巡检
- 终检(FQC)：全数检验 + 出货检验
- 清洁度检验：按客户标准(VDA 19/ISO 16232)

请生成月度质量报告，返回JSON格式。`;
  const userPrompt = `报告月份: ${params.month}\n检验数据: ${params.inspectionData}\n缺陷数据: ${params.defectData}\n${params.ncrData ? `NCR数据: ${params.ncrData}` : ""}\n${params.customerComplaints ? `客户投诉: ${params.customerComplaints}` : ""}\n${params.previousMonthData ? `上月数据: ${params.previousMonthData}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "quality_monthly_report", strict: true, schema: { type: "object", properties: {
        reportMonth: { type: "string" },
        executiveSummary: { type: "string" },
        overallPassRate: { type: "number" },
        metrics: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, value: { type: "string" }, target: { type: "string" }, status: { type: "string" }, trend: { type: "string" } }, required: ["metric", "value", "target", "status", "trend"], additionalProperties: false } },
        defectPareto: { type: "array", items: { type: "object", properties: { defectType: { type: "string" }, count: { type: "number" }, percentage: { type: "string" }, cumulativePercent: { type: "string" } }, required: ["defectType", "count", "percentage", "cumulativePercent"], additionalProperties: false } },
        ncrSummary: { type: "object", properties: { total: { type: "number" }, open: { type: "number" }, closed: { type: "number" }, avgClosureTime: { type: "string" } }, required: ["total", "open", "closed", "avgClosureTime"], additionalProperties: false },
        customerComplaintSummary: { type: "string" },
        monthOverMonth: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, thisMonth: { type: "string" }, lastMonth: { type: "string" }, change: { type: "string" } }, required: ["metric", "thisMonth", "lastMonth", "change"], additionalProperties: false } },
        actionItems: { type: "array", items: { type: "object", properties: { item: { type: "string" }, owner: { type: "string" }, deadline: { type: "string" } }, required: ["item", "owner", "deadline"], additionalProperties: false } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["reportMonth", "executiveSummary", "overallPassRate", "metrics", "defectPareto", "ncrSummary", "customerComplaintSummary", "monthOverMonth", "actionItems", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "generateQualityMonthlyReport failed");
    return { reportMonth: params.month, executiveSummary: "AI服务不可用", overallPassRate: 0, metrics: [], defectPareto: [], ncrSummary: { total: 0, open: 0, closed: 0, avgClosureTime: "N/A" }, customerComplaintSummary: "AI服务不可用", monthOverMonth: [], actionItems: [], recommendations: ["请人工编写质量月报"] };
  }
}

// ============================================================
// 5. BOM Freeze → Production Scheduling Notification
// ============================================================
export async function triggerBOMFreezeNotification(params: {
  bomId: string; projectName: string; bomVersion: string; frozenBy: string; materialCount: number; criticalParts?: string;
}): Promise<BOMFreezeNotificationResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT生产计划调度专家，负责在BOM冻结后生成生产准备数据和通知。

调度规则：
- 分析BOM物料清单，评估物料就绪状态
- 识别长交期物料(>4周)，提前预警
- 根据物料齐套情况建议排产优先级(紧急/高/中/低)
- 生成通知内容，通知生产部、采购部、仓库
- 建议开工日期(基于物料齐套预计时间)

GRT生产准备标准：
- 标准件：库存周期1-2周
- 外购件(泵/电机/PLC)：交期4-8周
- 钣金/焊接件：交期2-4周
- 表面处理(电镀/喷涂)：交期1-2周
- 关键长交期件需在BOM冻结后立即下单

请分析BOM并生成排产准备通知，返回JSON格式。`;
  const userPrompt = `BOM编号: ${params.bomId}\n项目名称: ${params.projectName}\nBOM版本: ${params.bomVersion}\n冻结人: ${params.frozenBy}\n物料数量: ${params.materialCount}\n${params.criticalParts ? `关键部件: ${params.criticalParts}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "bom_freeze_notification", strict: true, schema: { type: "object", properties: {
        notificationId: { type: "string" },
        bomId: { type: "string" },
        projectName: { type: "string" },
        schedulingTask: { type: "object", properties: { priority: { type: "string" }, suggestedStartDate: { type: "string" }, estimatedDuration: { type: "string" }, prerequisites: { type: "array", items: { type: "string" } } }, required: ["priority", "suggestedStartDate", "estimatedDuration", "prerequisites"], additionalProperties: false },
        materialReadiness: { type: "array", items: { type: "object", properties: { material: { type: "string" }, status: { type: "string" }, leadTime: { type: "string" }, action: { type: "string" } }, required: ["material", "status", "leadTime", "action"], additionalProperties: false } },
        longLeadItems: { type: "array", items: { type: "string" } },
        notificationContent: { type: "string" },
        recipients: { type: "array", items: { type: "object", properties: { role: { type: "string" }, name: { type: "string" } }, required: ["role", "name"], additionalProperties: false } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["notificationId", "bomId", "projectName", "schedulingTask", "materialReadiness", "longLeadItems", "notificationContent", "recipients", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "triggerBOMFreezeNotification failed");
    return { notificationId: `BOMN-${Date.now()}`, bomId: params.bomId, projectName: params.projectName, schedulingTask: { priority: "待评估", suggestedStartDate: "待定", estimatedDuration: "待定", prerequisites: [] }, materialReadiness: [], longLeadItems: [], notificationContent: "AI服务不可用，请人工评估排产计划", recipients: [], recommendations: ["请人工评估BOM物料齐套情况"] };
  }
}

// ============================================================
// 6. Final QC Pass → Acceptance Notification
// ============================================================
export async function generateAcceptanceNotification(params: {
  projectName: string; inspectionResult: string; customerName: string; equipmentModel: string; inspectionDate: string; inspector?: string;
}): Promise<AcceptanceNotificationResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT质量验收与客户通知专家，负责在终检合格后生成客户通知和FAT/SAT验收报告模板。

通知与报告要求：
- 客户通知：正式、专业，包含项目信息、检验通过确认、下一步安排
- 验收报告：包含检验摘要、测试项目、合规声明、签署要求
- 测试项目应覆盖：外观检查、尺寸检验、功能测试、清洁度测试、安全测试
- 合规声明引用适用标准(CE/UL/客户标准)
- 建议FAT/SAT安排时间(通常终检通过后1-2周)

GRT验收流程：
- FAT(Factory Acceptance Test)：工厂验收，客户到厂
- SAT(Site Acceptance Test)：现场验收，设备到客户现场
- 标准FAT项目：10-15项检测
- 标准SAT项目：安装确认 + 运行确认 + 性能确认(IQ/OQ/PQ)

请生成验收通知和报告模板，返回JSON格式。`;
  const userPrompt = `项目名称: ${params.projectName}\n检验结果: ${params.inspectionResult}\n客户: ${params.customerName}\n设备型号: ${params.equipmentModel}\n检验日期: ${params.inspectionDate}\n${params.inspector ? `检验员: ${params.inspector}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "acceptance_notification", strict: true, schema: { type: "object", properties: {
        notificationId: { type: "string" },
        customerNotification: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" }, attachments: { type: "array", items: { type: "string" } } }, required: ["subject", "body", "attachments"], additionalProperties: false },
        acceptanceReport: { type: "object", properties: { reportTitle: { type: "string" }, projectInfo: { type: "string" }, inspectionSummary: { type: "string" }, testItems: { type: "array", items: { type: "object", properties: { item: { type: "string" }, standard: { type: "string" }, result: { type: "string" }, status: { type: "string" } }, required: ["item", "standard", "result", "status"], additionalProperties: false } }, complianceStatement: { type: "string" }, nextSteps: { type: "array", items: { type: "string" } }, signoffRequired: { type: "array", items: { type: "object", properties: { role: { type: "string" }, responsibility: { type: "string" } }, required: ["role", "responsibility"], additionalProperties: false } } }, required: ["reportTitle", "projectInfo", "inspectionSummary", "testItems", "complianceStatement", "nextSteps", "signoffRequired"], additionalProperties: false },
        scheduleSuggestion: { type: "string" },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["notificationId", "customerNotification", "acceptanceReport", "scheduleSuggestion", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    log.error({ err: error }, "generateAcceptanceNotification failed");
    return { notificationId: `ACC-${Date.now()}`, customerNotification: { subject: `${params.projectName} - 设备检验通过通知`, body: "AI服务不可用，请人工编写通知", attachments: [] }, acceptanceReport: { reportTitle: `${params.projectName} 验收报告`, projectInfo: `客户: ${params.customerName}, 设备: ${params.equipmentModel}`, inspectionSummary: params.inspectionResult, testItems: [], complianceStatement: "待填写", nextSteps: [], signoffRequired: [] }, scheduleSuggestion: "建议终检通过后1-2周安排FAT", recommendations: ["请人工编写验收通知和报告"] };
  }
}
