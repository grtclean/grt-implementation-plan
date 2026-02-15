/**
 * 质量高级智能服务 (Quality Advanced Intelligence Service)
 * Phase 21 P1: US-007 合格证 · US-008 SPC · US-009 NCR
 */

// ============================================================
// Types
// ============================================================

export interface ProductCertificateResult {
  certificateNumber: string;
  productName: string;
  batchNumber: string;
  inspectionSummary: string;
  testItems: Array<{ item: string; standard: string; result: string; verdict: string }>;
  overallVerdict: string;
  cleanlinessCode: string;
  qrCodeData: string;
  validUntil: string;
  issuedBy: string;
  recommendations: string[];
}

export interface SPCAnalysisResult {
  processCapability: { cp: number; cpk: number; pp: number; ppk: number };
  controlLimits: { ucl: number; lcl: number; cl: number };
  outOfControlPoints: Array<{ index: number; value: number; rule: string; description: string }>;
  trendAnalysis: string;
  distributionType: string;
  chartData: Array<{ sample: number; value: number; ucl: number; lcl: number; cl: number }>;
  stabilityScore: number;
  recommendations: string[];
}

export interface NCRAnalysisResult {
  ncrNumber: string;
  severity: string;
  rootCauseAnalysis: Array<{ cause: string; category: string; probability: number; evidence: string }>;
  dispositionOptions: Array<{ option: string; description: string; costImpact: string; timeImpact: string; recommended: boolean }>;
  correctiveActions: Array<{ action: string; owner: string; deadline: string; priority: string }>;
  preventiveActions: string[];
  impactAssessment: string;
  recommendations: string[];
}

// ============================================================
// 1. Product Certificate Generation (US-007)
// ============================================================

export async function generateCertificate(params: {
  productName: string;
  batchNumber: string;
  customerName: string;
  inspectionData: string;
  cleanlinessResult: string;
  standard: string;
  inspectorName?: string;
}): Promise<ProductCertificateResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT质量认证专家，负责根据检测数据生成产品合格证。

合格证要求：
- 合格证编号：GRT-CERT-年月日-序号
- 包含全部检测项目及结果
- 明确标注清洁度等级编码(ISO 16232)
- 生成QR码数据(JSON格式，含证书编号、批次、结论)
- 有效期通常为出厂后12个月

GRT产品合格证标准内容：
1. 产品信息(名称、型号、批次)
2. 检测项目逐项列出(标准→实测→结论)
3. 清洁度等级编码
4. 综合判定(合格/不合格)
5. 检测人/审核人/批准人

请生成完整合格证内容，返回JSON格式。`;

  const userPrompt = `产品名称: ${params.productName}
批次号: ${params.batchNumber}
客户: ${params.customerName}
检测数据: ${params.inspectionData}
清洁度结果: ${params.cleanlinessResult}
执行标准: ${params.standard}
${params.inspectorName ? `检测员: ${params.inspectorName}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "product_certificate",
          strict: true,
          schema: {
            type: "object",
            properties: {
              certificateNumber: { type: "string" },
              productName: { type: "string" },
              batchNumber: { type: "string" },
              inspectionSummary: { type: "string" },
              testItems: { type: "array", items: { type: "object", properties: { item: { type: "string" }, standard: { type: "string" }, result: { type: "string" }, verdict: { type: "string", enum: ["pass", "fail"] } }, required: ["item", "standard", "result", "verdict"], additionalProperties: false } },
              overallVerdict: { type: "string", enum: ["合格", "不合格"] },
              cleanlinessCode: { type: "string" },
              qrCodeData: { type: "string" },
              validUntil: { type: "string" },
              issuedBy: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["certificateNumber", "productName", "batchNumber", "inspectionSummary", "testItems", "overallVerdict", "cleanlinessCode", "qrCodeData", "validUntil", "issuedBy", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    console.error("[QualityAdvanced] generateCertificate failed:", error);
    return { certificateNumber: "CERT-ERROR", productName: params.productName, batchNumber: params.batchNumber, inspectionSummary: "AI服务不可用", testItems: [], overallVerdict: "不合格", cleanlinessCode: "待定", qrCodeData: "{}", validUntil: "待定", issuedBy: "系统", recommendations: ["请人工生成合格证"] };
  }
}

// ============================================================
// 2. SPC Control Chart Analysis (US-008)
// ============================================================

export async function analyzeSPC(params: {
  processName: string;
  measurementParameter: string;
  sampleData: string;
  specification: string;
  subgroupSize?: number;
  chartType?: string;
}): Promise<SPCAnalysisResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT统计过程控制(SPC)专家，负责分析清洗过程数据的稳定性和能力。

SPC分析要求：
- 计算控制限(UCL/LCL/CL)
- 识别失控点(Western Electric规则)：
  · 规则1：单点超出3σ
  · 规则2：连续9点在中心线同一侧
  · 规则3：连续6点递增或递减
  · 规则4：连续14点交替上下
- 计算过程能力指数(Cp/Cpk/Pp/Ppk)
- 能力等级：Cpk≥1.67优秀, ≥1.33良好, ≥1.0一般, <1.0不足
- 生成控制图数据点(含控制限)
- 分析趋势和分布类型

GRT清洗过程典型监控参数：
- 清洁度颗粒数(最常见)
- 残余质量(mg)
- 清洗温度(°C)
- 超声功率(W)
- 真空度(mbar)

请分析SPC数据，返回JSON格式。`;

  const userPrompt = `工序名称: ${params.processName}
监控参数: ${params.measurementParameter}
样本数据: ${params.sampleData}
规格要求: ${params.specification}
${params.subgroupSize ? `子组大小: ${params.subgroupSize}` : ""}
${params.chartType ? `图表类型: ${params.chartType}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "spc_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              processCapability: { type: "object", properties: { cp: { type: "number" }, cpk: { type: "number" }, pp: { type: "number" }, ppk: { type: "number" } }, required: ["cp", "cpk", "pp", "ppk"], additionalProperties: false },
              controlLimits: { type: "object", properties: { ucl: { type: "number" }, lcl: { type: "number" }, cl: { type: "number" } }, required: ["ucl", "lcl", "cl"], additionalProperties: false },
              outOfControlPoints: { type: "array", items: { type: "object", properties: { index: { type: "number" }, value: { type: "number" }, rule: { type: "string" }, description: { type: "string" } }, required: ["index", "value", "rule", "description"], additionalProperties: false } },
              trendAnalysis: { type: "string" },
              distributionType: { type: "string" },
              chartData: { type: "array", items: { type: "object", properties: { sample: { type: "number" }, value: { type: "number" }, ucl: { type: "number" }, lcl: { type: "number" }, cl: { type: "number" } }, required: ["sample", "value", "ucl", "lcl", "cl"], additionalProperties: false } },
              stabilityScore: { type: "number" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["processCapability", "controlLimits", "outOfControlPoints", "trendAnalysis", "distributionType", "chartData", "stabilityScore", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    console.error("[QualityAdvanced] analyzeSPC failed:", error);
    return { processCapability: { cp: 0, cpk: 0, pp: 0, ppk: 0 }, controlLimits: { ucl: 0, lcl: 0, cl: 0 }, outOfControlPoints: [], trendAnalysis: "AI服务不可用", distributionType: "未知", chartData: [], stabilityScore: 0, recommendations: ["请人工分析SPC数据"] };
  }
}

// ============================================================
// 3. NCR Non-Conformance Analysis (US-009)
// ============================================================

export async function analyzeNCR(params: {
  productName: string;
  batchNumber: string;
  defectDescription: string;
  defectCategory: string;
  detectionStage: string;
  quantity: number;
  severity?: string;
  previousOccurrences?: string;
}): Promise<NCRAnalysisResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT不合格品管理专家，负责NCR(不合格品报告)的根因分析和处置建议。

NCR处理流程：
1. 发起NCR → 2. 根因分析(5Why/鱼骨图) → 3. 处置决定 → 4. 纠正措施 → 5. 预防措施 → 6. 关闭验证

处置选项：
- 返工(Rework)：可修复到合格状态
- 返修(Repair)：修复但有偏差，需让步接收
- 让步接收(Concession)：不影响功能，客户同意使用
- 报废(Scrap)：无法修复
- 降级使用(Downgrade)：用于低要求场合

GRT常见不合格类型：
- 清洁度超标：颗粒度/残余质量超标
- 焊接缺陷：气孔/裂纹/未熔合
- 尺寸偏差：加工精度不足
- 表面缺陷：划伤/锈蚀/氧化
- 功能异常：泄漏/噪音/温度异常

严重性等级：
- Critical：影响安全或法规合规
- Major：影响功能或性能
- Minor：外观或非关键特性

请分析NCR并给出处置建议，返回JSON格式。`;

  const userPrompt = `产品名称: ${params.productName}
批次号: ${params.batchNumber}
缺陷描述: ${params.defectDescription}
缺陷类别: ${params.defectCategory}
检出阶段: ${params.detectionStage}
不合格数量: ${params.quantity}件
${params.severity ? `严重性: ${params.severity}` : ""}
${params.previousOccurrences ? `历史发生: ${params.previousOccurrences}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ncr_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ncrNumber: { type: "string" },
              severity: { type: "string", enum: ["critical", "major", "minor"] },
              rootCauseAnalysis: { type: "array", items: { type: "object", properties: { cause: { type: "string" }, category: { type: "string" }, probability: { type: "number" }, evidence: { type: "string" } }, required: ["cause", "category", "probability", "evidence"], additionalProperties: false } },
              dispositionOptions: { type: "array", items: { type: "object", properties: { option: { type: "string" }, description: { type: "string" }, costImpact: { type: "string" }, timeImpact: { type: "string" }, recommended: { type: "boolean" } }, required: ["option", "description", "costImpact", "timeImpact", "recommended"], additionalProperties: false } },
              correctiveActions: { type: "array", items: { type: "object", properties: { action: { type: "string" }, owner: { type: "string" }, deadline: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] } }, required: ["action", "owner", "deadline", "priority"], additionalProperties: false } },
              preventiveActions: { type: "array", items: { type: "string" } },
              impactAssessment: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["ncrNumber", "severity", "rootCauseAnalysis", "dispositionOptions", "correctiveActions", "preventiveActions", "impactAssessment", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    console.error("[QualityAdvanced] analyzeNCR failed:", error);
    return { ncrNumber: `NCR-${Date.now()}`, severity: "major", rootCauseAnalysis: [], dispositionOptions: [], correctiveActions: [], preventiveActions: ["请人工分析"], impactAssessment: "AI服务不可用", recommendations: ["请人工处理NCR"] };
  }
}
