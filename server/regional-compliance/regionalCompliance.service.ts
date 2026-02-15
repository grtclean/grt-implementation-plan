/**
 * 区域合规与本地化智能服务 (Regional Compliance & Localization)
 * Phase I: CN劳动法 · 五险一金 · 区域认证 · 工作日计算 · VAT · 内容本地化
 */

// ============================================================
// Result Types
// ============================================================

export interface CNOvertimeAnalysisResult {
  totalOvertimeHours: number;
  monthlyLimit: number;
  complianceStatus: string;
  violations: Array<{ date: string; type: string; hours: number; issue: string }>;
  weekdayOT: number;
  weekendOT: number;
  holidayOT: number;
  overtimePay: number;
  recommendations: string[];
}

export interface SocialInsuranceCalcResult {
  city: string;
  baseSalary: number;
  employeeContribution: { pension: number; medical: number; unemployment: number; housingFund: number; total: number };
  employerContribution: { pension: number; medical: number; unemployment: number; workInjury: number; housingFund: number; total: number };
  totalMonthly: number;
  annualCost: number;
  breakdown: Array<{ item: string; employerRate: string; employerAmount: number; employeeRate: string; employeeAmount: number }>;
  comparisonWithBenchmark: string;
  recommendations: string[];
}

export interface RegionalCertificationResult {
  requiredCerts: Array<{ certName: string; region: string; standard: string; status: string }>;
  certificationGaps: Array<{ cert: string; gap: string; action: string }>;
  timeline: { totalWeeks: number; phases: Array<{ phase: string; weeks: number; description: string }> };
  estimatedCost: string;
  documentChecklist: Array<{ document: string; required: boolean; status: string }>;
  testingRequirements: Array<{ test: string; lab: string; duration: string }>;
  recommendations: string[];
}

export interface WorkingDaysResult {
  endDate: string;
  workingDays: number;
  holidaysEncountered: Array<{ date: string; name: string }>;
  calendarDays: number;
  bufferDays: number;
  criticalPeriods: Array<{ period: string; reason: string }>;
  recommendations: string[];
}

export interface VATCalcResult {
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  taxType: string;
  breakdown: Array<{ item: string; rate: string; amount: number; notes: string }>;
  invoiceRequirements: string;
  notes: string[];
  recommendations: string[];
}

export interface ContentLocalizationResult {
  translatedContent: string;
  terminology: Array<{ source: string; target: string; notes: string }>;
  qualityScore: number;
  culturalNotes: string[];
  warnings: string[];
  alternatives: string[];
}

// ============================================================
// 1. CN Overtime Compliance Analysis
// ============================================================
export async function analyzeCNOvertime(params: {
  employeeData: string;
  month: string;
  overtimeRecords: string;
}): Promise<CNOvertimeAnalysisResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是中国劳动合同法合规专家，负责分析员工加班数据是否符合法规要求。

核心规则：
- 月加班上限：36小时（劳动合同法§41）
- 工作日加班：1.5倍工资（§44.1）
- 休息日加班：2倍工资，可安排调休抵扣（§44.2）
- 法定节假日加班：3倍工资，不可调休抵扣（§44.3）
- 每日加班一般不超过1小时，特殊情况不超过3小时

请分析提供的加班数据，判断合规状态，计算加班工资，识别违规事项。
返回JSON格式。`;

  const userPrompt = `员工信息:\n${params.employeeData}\n\n分析月份: ${params.month}\n\n加班记录:\n${params.overtimeRecords}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "cn_overtime_analysis", strict: true, schema: { type: "object", properties: {
        totalOvertimeHours: { type: "number" },
        monthlyLimit: { type: "number" },
        complianceStatus: { type: "string" },
        violations: { type: "array", items: { type: "object", properties: { date: { type: "string" }, type: { type: "string" }, hours: { type: "number" }, issue: { type: "string" } }, required: ["date", "type", "hours", "issue"], additionalProperties: false } },
        weekdayOT: { type: "number" },
        weekendOT: { type: "number" },
        holidayOT: { type: "number" },
        overtimePay: { type: "number" },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["totalOvertimeHours", "monthlyLimit", "complianceStatus", "violations", "weekdayOT", "weekendOT", "holidayOT", "overtimePay", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    console.error("[RegionalCompliance] analyzeCNOvertime failed:", error);
    return { totalOvertimeHours: 0, monthlyLimit: 36, complianceStatus: "AI服务不可用", violations: [], weekdayOT: 0, weekendOT: 0, holidayOT: 0, overtimePay: 0, recommendations: ["请联系IT支持"] };
  }
}

// ============================================================
// 2. Social Insurance Calculator (五险一金)
// ============================================================
export async function calculateSocialInsurance(params: {
  city: string;
  baseSalary: number;
  housingFundRate: number;
  employeeCount?: number;
}): Promise<SocialInsuranceCalcResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是中国五险一金计算专家，精通各城市社保缴费基数和比例。

GRT运营城市社保参考（2026年）：
- 上海：养老16%/8%，医疗9.5%/2%，失业0.5%/0.5%，工伤0.26%，公积金5-12%（默认7%）
- 苏州/无锡：养老16%/8%，医疗8%/2%，失业0.5%/0.5%，工伤0.4%，公积金5-12%（默认8%）

缴费基数有上下限，超出部分按上限或下限计算。
请根据输入计算五险一金明细，并与城市平均水平对比。返回JSON格式。`;

  const userPrompt = `城市: ${params.city}\n基数工资: ${params.baseSalary}元/月\n住房公积金比例: ${params.housingFundRate}%\n${params.employeeCount ? `员工人数: ${params.employeeCount}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "social_insurance_calc", strict: true, schema: { type: "object", properties: {
        city: { type: "string" },
        baseSalary: { type: "number" },
        employeeContribution: { type: "object", properties: { pension: { type: "number" }, medical: { type: "number" }, unemployment: { type: "number" }, housingFund: { type: "number" }, total: { type: "number" } }, required: ["pension", "medical", "unemployment", "housingFund", "total"], additionalProperties: false },
        employerContribution: { type: "object", properties: { pension: { type: "number" }, medical: { type: "number" }, unemployment: { type: "number" }, workInjury: { type: "number" }, housingFund: { type: "number" }, total: { type: "number" } }, required: ["pension", "medical", "unemployment", "workInjury", "housingFund", "total"], additionalProperties: false },
        totalMonthly: { type: "number" },
        annualCost: { type: "number" },
        breakdown: { type: "array", items: { type: "object", properties: { item: { type: "string" }, employerRate: { type: "string" }, employerAmount: { type: "number" }, employeeRate: { type: "string" }, employeeAmount: { type: "number" } }, required: ["item", "employerRate", "employerAmount", "employeeRate", "employeeAmount"], additionalProperties: false } },
        comparisonWithBenchmark: { type: "string" },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["city", "baseSalary", "employeeContribution", "employerContribution", "totalMonthly", "annualCost", "breakdown", "comparisonWithBenchmark", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    console.error("[RegionalCompliance] calculateSocialInsurance failed:", error);
    return { city: params.city, baseSalary: params.baseSalary, employeeContribution: { pension: 0, medical: 0, unemployment: 0, housingFund: 0, total: 0 }, employerContribution: { pension: 0, medical: 0, unemployment: 0, workInjury: 0, housingFund: 0, total: 0 }, totalMonthly: 0, annualCost: 0, breakdown: [], comparisonWithBenchmark: "AI服务不可用", recommendations: ["请联系IT支持"] };
  }
}

// ============================================================
// 3. Regional Certification Assessment (CE/UL/CCC)
// ============================================================
export async function assessRegionalCertification(params: {
  equipmentModel: string;
  targetMarkets: string;
  currentCerts?: string;
  designPhase: string;
}): Promise<RegionalCertificationResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT工业清洗设备产品认证专家，精通以下认证体系：

- CE认证 (EU): 机械指令2006/42/EC, EMC指令2014/30/EU, LVD指令2014/35/EU
- UL认证 (US): UL 73 (电动机操作商用分配设备), UL 508A (工业控制面板)
- CCC认证 (CN): GB 5226.1 机械电气安全, GB 4706系列

GRT产品线：碳氢真空清洗机、水基清洗线、超声波清洗机、定制设备
每类设备认证要求和测试项目不同。

请评估设备在目标市场的认证需求、差距、时间表和费用。返回JSON格式。`;

  const userPrompt = `设备型号: ${params.equipmentModel}\n目标市场: ${params.targetMarkets}\n现有认证: ${params.currentCerts}\n设计阶段: ${params.designPhase}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "regional_certification", strict: true, schema: { type: "object", properties: {
        requiredCerts: { type: "array", items: { type: "object", properties: { certName: { type: "string" }, region: { type: "string" }, standard: { type: "string" }, status: { type: "string" } }, required: ["certName", "region", "standard", "status"], additionalProperties: false } },
        certificationGaps: { type: "array", items: { type: "object", properties: { cert: { type: "string" }, gap: { type: "string" }, action: { type: "string" } }, required: ["cert", "gap", "action"], additionalProperties: false } },
        timeline: { type: "object", properties: { totalWeeks: { type: "number" }, phases: { type: "array", items: { type: "object", properties: { phase: { type: "string" }, weeks: { type: "number" }, description: { type: "string" } }, required: ["phase", "weeks", "description"], additionalProperties: false } } }, required: ["totalWeeks", "phases"], additionalProperties: false },
        estimatedCost: { type: "string" },
        documentChecklist: { type: "array", items: { type: "object", properties: { document: { type: "string" }, required: { type: "boolean" }, status: { type: "string" } }, required: ["document", "required", "status"], additionalProperties: false } },
        testingRequirements: { type: "array", items: { type: "object", properties: { test: { type: "string" }, lab: { type: "string" }, duration: { type: "string" } }, required: ["test", "lab", "duration"], additionalProperties: false } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["requiredCerts", "certificationGaps", "timeline", "estimatedCost", "documentChecklist", "testingRequirements", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    console.error("[RegionalCompliance] assessRegionalCertification failed:", error);
    return { requiredCerts: [], certificationGaps: [], timeline: { totalWeeks: 0, phases: [] }, estimatedCost: "AI服务不可用", documentChecklist: [], testingRequirements: [], recommendations: ["请联系IT支持"] };
  }
}

// ============================================================
// 4. Working Days Calculator
// ============================================================
export async function calculateWorkingDaysAI(params: {
  startDate: string;
  estimatedDays: number;
  region: string;
  includeBuffer: boolean;
}): Promise<WorkingDaysResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT项目交期计算专家，精通各地区工作日历：

- 中国：法定节假日+调休工作日（春节/国庆前后调休）
- 德国：联邦假期+州假期(柏林)
- 美国：联邦假期
- 全部地区：GRT年末停工(12月最后一周)

请根据起始日期和所需工作天数，考虑地区假期，计算预期结束日期。
识别交期内的关键风险期（如春节、圣诞等长假）。
如果需要缓冲天数，添加10%额外工作日。返回JSON格式。`;

  const userPrompt = `起始日期: ${params.startDate}\n所需工作天数: ${params.estimatedDays}\n区域: ${params.region}\n是否包含缓冲: ${params.includeBuffer ? "是" : "否"}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "working_days_calc", strict: true, schema: { type: "object", properties: {
        endDate: { type: "string" },
        workingDays: { type: "number" },
        holidaysEncountered: { type: "array", items: { type: "object", properties: { date: { type: "string" }, name: { type: "string" } }, required: ["date", "name"], additionalProperties: false } },
        calendarDays: { type: "number" },
        bufferDays: { type: "number" },
        criticalPeriods: { type: "array", items: { type: "object", properties: { period: { type: "string" }, reason: { type: "string" } }, required: ["period", "reason"], additionalProperties: false } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["endDate", "workingDays", "holidaysEncountered", "calendarDays", "bufferDays", "criticalPeriods", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    console.error("[RegionalCompliance] calculateWorkingDaysAI failed:", error);
    return { endDate: "", workingDays: params.estimatedDays, holidaysEncountered: [], calendarDays: 0, bufferDays: 0, criticalPeriods: [], recommendations: ["请联系IT支持"] };
  }
}

// ============================================================
// 5. VAT / Tax Calculator
// ============================================================
export async function calculateVAT(params: {
  amount: number;
  currency: string;
  fromRegion: string;
  toRegion: string;
  productType: string;
  isB2B: boolean;
}): Promise<VATCalcResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT国际贸易税务专家，精通以下税种计算：

- 中国增值税: 货物13%、建筑运输9%、服务6%，出口退税13%
- EU VAT: 德国19%、法国20%、意大利22%等，B2B反向征收(reverse charge)
- US Sales Tax: 各州税率不同(CA 7.25%, TX 6.25%等)，部分州免税

跨境交易注意：
- CN→EU: 出口免征增值税+可申请退税，进口方缴纳进口VAT
- CN→US: 出口免征增值税，进口方可能缴纳关税+sales tax
- EU B2B: reverse charge，购买方自行申报VAT
- 需区分设备/零配件/技术服务的不同税率

请计算税费明细，列出发票要求和注意事项。返回JSON格式。`;

  const userPrompt = `金额: ${params.amount} ${params.currency}\n出发地: ${params.fromRegion}\n目的地: ${params.toRegion}\n产品类型: ${params.productType}\nB2B交易: ${params.isB2B ? "是" : "否"}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "vat_calculation", strict: true, schema: { type: "object", properties: {
        netAmount: { type: "number" },
        taxAmount: { type: "number" },
        totalAmount: { type: "number" },
        taxRate: { type: "number" },
        taxType: { type: "string" },
        breakdown: { type: "array", items: { type: "object", properties: { item: { type: "string" }, rate: { type: "string" }, amount: { type: "number" }, notes: { type: "string" } }, required: ["item", "rate", "amount", "notes"], additionalProperties: false } },
        invoiceRequirements: { type: "string" },
        notes: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
      }, required: ["netAmount", "taxAmount", "totalAmount", "taxRate", "taxType", "breakdown", "invoiceRequirements", "notes", "recommendations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    console.error("[RegionalCompliance] calculateVAT failed:", error);
    return { netAmount: params.amount, taxAmount: 0, totalAmount: params.amount, taxRate: 0, taxType: "AI服务不可用", breakdown: [], invoiceRequirements: "", notes: ["AI服务不可用"], recommendations: ["请联系IT支持"] };
  }
}

// ============================================================
// 6. AI Content Localization
// ============================================================
export async function localizeContent(params: {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  contentType: string;
  industry: string;
}): Promise<ContentLocalizationResult> {
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = `你是GRT工业清洗设备技术翻译与本地化专家。

专业术语规范：
- 清洗度/清洁度 → Cleanliness / Sauberkeit
- 超声波清洗 → Ultrasonic cleaning / Ultraschallreinigung
- 真空干燥 → Vacuum drying / Vakuumtrocknung
- 碳氢清洗剂 → Hydrocarbon solvent / Kohlenwasserstoff-Lösungsmittel
- 水基清洗 → Aqueous cleaning / Wässrige Reinigung

本地化要求：
- 安全警示必须符合目标市场法规(CE标识要求/OSHA/GB)
- 测量单位转换(mm↔inch, °C↔°F, bar↔PSI)
- 日期/数字格式本地化
- 文化适配(避免不当比喻或图片)

请翻译内容并标注专业术语、质量评分和文化注意事项。返回JSON格式。`;

  const userPrompt = `源语言: ${params.sourceLanguage}\n目标语言: ${params.targetLanguage}\n内容类型: ${params.contentType}\n行业: ${params.industry}\n\n待翻译内容:\n${params.content}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_schema", json_schema: { name: "content_localization", strict: true, schema: { type: "object", properties: {
        translatedContent: { type: "string" },
        terminology: { type: "array", items: { type: "object", properties: { source: { type: "string" }, target: { type: "string" }, notes: { type: "string" } }, required: ["source", "target", "notes"], additionalProperties: false } },
        qualityScore: { type: "number" },
        culturalNotes: { type: "array", items: { type: "string" } },
        warnings: { type: "array", items: { type: "string" } },
        alternatives: { type: "array", items: { type: "string" } },
      }, required: ["translatedContent", "terminology", "qualityScore", "culturalNotes", "warnings", "alternatives"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    if (content) return JSON.parse(content);
    throw new Error("Empty response");
  } catch (error) {
    console.error("[RegionalCompliance] localizeContent failed:", error);
    return { translatedContent: "AI服务不可用", terminology: [], qualityScore: 0, culturalNotes: [], warnings: ["AI服务当前不可用"], alternatives: [] };
  }
}
