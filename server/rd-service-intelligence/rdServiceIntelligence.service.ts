/**
 * 研发与客服智能服务 (R&D & Service Intelligence Service)
 * Phase H: 需求分析 · 设计审查 · 故障诊断 · 预防维护
 *
 * 4 core AI functions using invokeLLM() with structured JSON output.
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("rd-service");

// ============================================================
// Types
// ============================================================

export interface RequirementsAnalysisResult {
  feasibilityScore: number;
  technicalSpecs: Array<{ parameter: string; recommendedValue: string; rationale: string }>;
  recommendedProductLine: string;
  riskFlags: Array<{ flag: string; severity: string; description: string }>;
  clarificationNeeded: string[];
  costEstimate: { min: number; max: number };
  recommendations: string[];
}

export interface DesignReviewResult {
  overallScore: number;
  grade: string;
  issues: Array<{ issue: string; severity: string; category: string; suggestion: string }>;
  complianceCheck: Array<{ standard: string; status: string; notes: string }>;
  materialCompatibility: string;
  recommendations: string[];
}

export interface FaultDiagnosisResult {
  diagnosis: string;
  confidence: number;
  rootCauses: Array<{ cause: string; probability: number; description: string }>;
  repairSteps: Array<{ step: number; description: string; estimatedTime: string; partsNeeded: string }>;
  urgency: string;
  preventiveMeasures: string[];
  recommendations: string[];
}

export interface MaintenancePlanResult {
  healthScore: number;
  nextMaintenanceDate: string;
  maintenancePlan: Array<{ item: string; interval: string; nextDue: string; priority: string; estimatedCost: number }>;
  sparePartsNeeded: Array<{ part: string; quantity: number; leadTime: string }>;
  riskAssessment: string;
  costForecast: number;
  recommendations: string[];
}

// ============================================================
// 1. Requirements Analysis (AI需求智能分析)
// ============================================================

export async function analyzeRequirements(params: {
  projectName: string;
  customerName: string;
  industry: string;
  cleaningTarget: string;
  cleanlinessStandard?: string;
  throughput?: string;
  specialRequirements?: string;
  budget?: number;
}): Promise<RequirementsAnalysisResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT需求分析专家，负责评估客户清洗设备需求的可行性与技术方案推荐。

GRT背景知识：
- GRT生产工业清洗设备，三大产品线：碳氢真空清洗机、水基清洗线、超声波清洗机
- 年产约150台设备，服务汽车、半导体、工业通用、食品医药、航空航天等行业
- 清洁度标准：ISO 16232 / VDA 19
- 行业需求特点：
  · 汽车制造：高清洁度 + 高产能，VDA 19标准，碳氢真空或水基清洗
  · 半导体：超洁净 + 颗粒控制，ISO 14644洁净室，超声波精密清洗
  · 工业通用：性价比 + 多功能，灵活配置，水基或超声波
  · 食品医药：GMP合规 + 无残留，不锈钢316L，水基清洗
  · 航空航天：高可靠性 + 特殊材料，定制化方案

可行性评分标准：
- 90-100：高度匹配，标准方案即可满足
- 70-89：基本匹配，需要部分定制
- 50-69：需要较大定制，技术挑战中等
- <50：技术挑战大，需深度评估

请基于客户需求进行可行性分析，返回JSON格式结果。`;

  const userPrompt = `项目名称: ${params.projectName}
客户名称: ${params.customerName}
所属行业: ${params.industry}
清洗对象: ${params.cleaningTarget}
${params.cleanlinessStandard ? `清洁度标准: ${params.cleanlinessStandard}` : ""}
${params.throughput ? `产能要求: ${params.throughput}` : ""}
${params.specialRequirements ? `特殊需求: ${params.specialRequirements}` : ""}
${params.budget ? `预算范围: ${params.budget}万元` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "requirements_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              feasibilityScore: { type: "number" },
              technicalSpecs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    parameter: { type: "string" },
                    recommendedValue: { type: "string" },
                    rationale: { type: "string" },
                  },
                  required: ["parameter", "recommendedValue", "rationale"],
                  additionalProperties: false,
                },
              },
              recommendedProductLine: { type: "string" },
              riskFlags: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    flag: { type: "string" },
                    severity: { type: "string", enum: ["high", "medium", "low"] },
                    description: { type: "string" },
                  },
                  required: ["flag", "severity", "description"],
                  additionalProperties: false,
                },
              },
              clarificationNeeded: { type: "array", items: { type: "string" } },
              costEstimate: {
                type: "object",
                properties: {
                  min: { type: "number" },
                  max: { type: "number" },
                },
                required: ["min", "max"],
                additionalProperties: false,
              },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["feasibilityScore", "technicalSpecs", "recommendedProductLine", "riskFlags", "clarificationNeeded", "costEstimate", "recommendations"],
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
    log.error({ err: error }, "analyzeRequirements failed");
    return {
      feasibilityScore: 0,
      technicalSpecs: [],
      recommendedProductLine: "暂无推荐",
      riskFlags: [{ flag: "AI服务不可用", severity: "high", description: "请稍后重试或人工分析" }],
      clarificationNeeded: ["AI服务暂时不可用，请人工分析需求"],
      costEstimate: { min: 0, max: 0 },
      recommendations: ["AI服务暂时不可用，请人工分析需求"],
    };
  }
}

// ============================================================
// 2. Design Review (AI设计审查)
// ============================================================

export async function reviewDesign(params: {
  projectName: string;
  designPhase: string;
  designDescription: string;
  keyParameters: string;
  materialsUsed?: string;
  previousIssues?: string;
  standardsRequired?: string;
}): Promise<DesignReviewResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT设计审查专家，负责审核清洗设备各阶段设计方案的质量与合规性。

GRT背景知识：
- GRT设计流程：概念设计 → 详细设计 → BOM设计 → 原型制造
- 常见设计缺陷：
  · 焊接应力：不锈钢薄壁焊接变形，需预留补偿
  · 密封失效：真空腔体法兰密封面精度不足
  · 泵选型：流量/扬程匹配不当导致清洗效果差
  · PLC I/O分配：预留不足导致后期扩展困难
  · 管路设计：死角导致清洗液残留
- 材料兼容性：
  · 碳氢清洗：304/316L不锈钢，耐碳氢溶剂
  · 水基清洗：316L不锈钢，耐碱/酸性清洗液
  · 超声波：钛合金振板，316L槽体
- 认证要求：CE/UL安全认证、ATEX防爆(碳氢)、EMC电磁兼容
- 历史缺陷分布：概念设计30%、详细设计45%、BOM设计15%、原型制造10%

评审等级：
- A(90-100)：优秀，无重大问题
- B(75-89)：良好，少量改进项
- C(60-74)：一般，需整改后复审
- D(<60)：不合格，重新设计

请基于设计信息进行全面审查，返回JSON格式结果。`;

  const userPrompt = `项目名称: ${params.projectName}
设计阶段: ${params.designPhase}
设计描述: ${params.designDescription}
关键参数: ${params.keyParameters}
${params.materialsUsed ? `使用材料: ${params.materialsUsed}` : ""}
${params.previousIssues ? `历史问题: ${params.previousIssues}` : ""}
${params.standardsRequired ? `标准要求: ${params.standardsRequired}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "design_review",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallScore: { type: "number" },
              grade: { type: "string", enum: ["A", "B", "C", "D"] },
              issues: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    issue: { type: "string" },
                    severity: { type: "string", enum: ["high", "medium", "low"] },
                    category: { type: "string" },
                    suggestion: { type: "string" },
                  },
                  required: ["issue", "severity", "category", "suggestion"],
                  additionalProperties: false,
                },
              },
              complianceCheck: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    standard: { type: "string" },
                    status: { type: "string", enum: ["pass", "fail", "pending"] },
                    notes: { type: "string" },
                  },
                  required: ["standard", "status", "notes"],
                  additionalProperties: false,
                },
              },
              materialCompatibility: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["overallScore", "grade", "issues", "complianceCheck", "materialCompatibility", "recommendations"],
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
    log.error({ err: error }, "reviewDesign failed");
    return {
      overallScore: 0,
      grade: "D",
      issues: [{ issue: "AI服务暂时不可用", severity: "high", category: "系统", suggestion: "请稍后重试或人工审查" }],
      complianceCheck: [],
      materialCompatibility: "暂无数据",
      recommendations: ["AI服务暂时不可用，请人工审查设计"],
    };
  }
}

// ============================================================
// 3. Fault Diagnosis (AI故障诊断)
// ============================================================

export async function diagnoseFault(params: {
  equipmentModel: string;
  symptomDescription: string;
  errorCodes?: string;
  operatingConditions?: string;
  lastMaintenanceDate?: string;
  equipmentAge?: number;
}): Promise<FaultDiagnosisResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT设备故障诊断专家，负责快速定位清洗设备故障原因并提供维修方案。

GRT背景知识：
- GRT设备型号：
  · 碳氢真空清洗机：真空系统、碳氢溶剂回收、蒸馏再生、干燥系统
  · 水基清洗线：多槽清洗、漂洗、干燥，PLC自动控制
  · 超声波清洗机：超声波换能器、发生器、温控系统
  · 定制设备：根据客户需求特殊设计
- 常见故障模式：
  · 真空系统：真空泄漏(O型圈老化)、真空泵油乳化、真空度不足
  · 泵系统：机械密封泄漏、叶轮磨损、轴承过热、电机过载
  · 超声波：换能器脱胶、发生器功率衰减、频率漂移
  · 加热系统：加热管烧毁、温控器失灵、热电偶断路
  · PLC控制：通讯故障(RS485/Ethernet)、I/O模块损坏、程序丢失
  · 管路系统：阀门卡死、过滤器堵塞、管路腐蚀泄漏
- 典型MTBF数据：真空泵8000h、超声换能器12000h、加热管6000h
- 紧急程度分类：
  · critical：停机故障，需立即处理
  · high：性能严重下降，24h内处理
  · medium：功能部分受限，1周内处理
  · low：预防性维护，可计划安排

请基于故障描述进行诊断分析，返回JSON格式结果。`;

  const userPrompt = `设备型号: ${params.equipmentModel}
故障描述: ${params.symptomDescription}
${params.errorCodes ? `错误代码: ${params.errorCodes}` : ""}
${params.operatingConditions ? `运行工况: ${params.operatingConditions}` : ""}
${params.lastMaintenanceDate ? `上次维护: ${params.lastMaintenanceDate}` : ""}
${params.equipmentAge ? `设备年限: ${params.equipmentAge}年` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fault_diagnosis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              diagnosis: { type: "string" },
              confidence: { type: "number" },
              rootCauses: {
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
              repairSteps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    step: { type: "number" },
                    description: { type: "string" },
                    estimatedTime: { type: "string" },
                    partsNeeded: { type: "string" },
                  },
                  required: ["step", "description", "estimatedTime", "partsNeeded"],
                  additionalProperties: false,
                },
              },
              urgency: { type: "string", enum: ["critical", "high", "medium", "low"] },
              preventiveMeasures: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["diagnosis", "confidence", "rootCauses", "repairSteps", "urgency", "preventiveMeasures", "recommendations"],
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
    log.error({ err: error }, "diagnoseFault failed");
    return {
      diagnosis: "AI服务暂时不可用",
      confidence: 0,
      rootCauses: [{ cause: "AI服务不可用", probability: 0, description: "请稍后重试或联系技术支持" }],
      repairSteps: [{ step: 1, description: "请联系技术支持进行人工诊断", estimatedTime: "待定", partsNeeded: "无" }],
      urgency: "medium",
      preventiveMeasures: ["请稍后重试AI诊断服务"],
      recommendations: ["AI服务暂时不可用，请联系技术支持进行人工诊断"],
    };
  }
}

// ============================================================
// 4. Maintenance Planning (AI预防性维护)
// ============================================================

export async function planMaintenance(params: {
  equipmentModel: string;
  installDate: string;
  operatingHours: number;
  lastMaintenanceDate: string;
  maintenanceHistory?: string;
  environmentCondition?: string;
  usageIntensity?: string;
}): Promise<MaintenancePlanResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT设备维护规划专家，负责制定预防性维护计划和备件管理方案。

GRT背景知识：
- GRT设备维护周期标准：
  · 真空泵：2000h换油、4000h大修、8000h更换
  · 超声波换能器：年度检测、12000h更换
  · 过滤器：季度更换(标准)、月度更换(恶劣环境)
  · 密封件：半年检查、年度更换
  · 加热管：半年检测、6000h更换
  · PLC电池：2年更换
  · 传感器校准：季度
- 环境修正系数：
  · 标准环境：×1.0
  · 恶劣环境(高温/高湿/粉尘)：×0.7(缩短维护周期)
  · 洁净室：×1.2(延长维护周期)
- 使用强度修正：
  · 轻度(<8h/天)：×1.2
  · 正常(8-16h/天)：×1.0
  · 高强度(>16h/天)：×0.75
- 维护成本基准(万元)：
  · 小保养：0.3-0.5
  · 中保养：1-2
  · 大修：3-8
- 设备健康评分标准：
  · 90-100：健康，正常使用
  · 70-89：良好，注意预防维护
  · 50-69：注意，需要安排维护
  · <50：警告，尽快维护

请基于设备信息制定维护计划，返回JSON格式结果。`;

  const userPrompt = `设备型号: ${params.equipmentModel}
安装日期: ${params.installDate}
运行工时: ${params.operatingHours}小时
上次维护: ${params.lastMaintenanceDate}
${params.maintenanceHistory ? `维护历史: ${params.maintenanceHistory}` : ""}
${params.environmentCondition ? `环境条件: ${params.environmentCondition}` : ""}
${params.usageIntensity ? `使用强度: ${params.usageIntensity}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "maintenance_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              healthScore: { type: "number" },
              nextMaintenanceDate: { type: "string" },
              maintenancePlan: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    item: { type: "string" },
                    interval: { type: "string" },
                    nextDue: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    estimatedCost: { type: "number" },
                  },
                  required: ["item", "interval", "nextDue", "priority", "estimatedCost"],
                  additionalProperties: false,
                },
              },
              sparePartsNeeded: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    part: { type: "string" },
                    quantity: { type: "number" },
                    leadTime: { type: "string" },
                  },
                  required: ["part", "quantity", "leadTime"],
                  additionalProperties: false,
                },
              },
              riskAssessment: { type: "string" },
              costForecast: { type: "number" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["healthScore", "nextMaintenanceDate", "maintenancePlan", "sparePartsNeeded", "riskAssessment", "costForecast", "recommendations"],
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
    log.error({ err: error }, "planMaintenance failed");
    return {
      healthScore: 0,
      nextMaintenanceDate: "待定",
      maintenancePlan: [{ item: "AI服务不可用", interval: "待定", nextDue: "待定", priority: "high", estimatedCost: 0 }],
      sparePartsNeeded: [],
      riskAssessment: "AI服务暂时不可用，请人工评估设备状态",
      costForecast: 0,
      recommendations: ["AI服务暂时不可用，请人工制定维护计划"],
    };
  }
}
