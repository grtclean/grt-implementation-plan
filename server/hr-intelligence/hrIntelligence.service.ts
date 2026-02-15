/**
 * HR智能服务 (HR Intelligence Service)
 * Phase F: HR与人才智能 — 人才评估 · 培训推荐 · 薪酬分析 · 人力规划
 *
 * 4 core AI functions using invokeLLM() with structured JSON output.
 */

// ============================================================
// Types
// ============================================================

export interface TalentAssessmentResult {
  talentGrade: string;
  potentialLevel: string;
  strengths: string[];
  developmentAreas: string[];
  careerPaths: Array<{ role: string; readiness: string; timeframe: string }>;
  successionReadiness: string;
  recommendations: string[];
}

export interface TrainingRecommendationResult {
  skillGaps: Array<{ skill: string; currentLevel: string; targetLevel: string; priority: string }>;
  recommendedCourses: Array<{ name: string; type: string; duration: string; priority: string; relevance: string }>;
  learningPath: string;
  estimatedTime: string;
  recommendations: string[];
}

export interface CompensationAnalysisResult {
  marketPosition: string;
  competitivenessScore: number;
  equityAnalysis: string;
  adjustmentSuggestion: string;
  salaryRange: { min: number; mid: number; max: number };
  recommendations: string[];
}

export interface WorkforcePlanningResult {
  optimalHeadcount: number;
  hiringNeeds: Array<{ role: string; count: number; priority: string; timeline: string }>;
  skillRequirements: string[];
  budgetAllocation: { hiring: number; training: number; retention: number };
  riskFactors: Array<{ factor: string; impact: string; mitigation: string }>;
  recommendations: string[];
}

// ============================================================
// 1. Talent Assessment (人才评估)
// ============================================================

export async function assessTalent(params: {
  employeeName: string;
  role: string;
  department: string;
  yearsOfExperience: number;
  skillTags?: string;
  performanceSummary?: string;
  certifications?: string;
}): Promise<TalentAssessmentResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT人力资源管理专家，负责人才盘点与评估分析。

GRT背景知识：
- GRT约140人的工业清洗设备制造企业
- 5个事业部：海外、商用车、乘用车、半导体、工业通用
- 人才盘点等级：A（核心骨干）、B（胜任）、C（待发展）、D（需改进）
- 核心岗位族群：研发工程师、项目经理、生产技术、销售/BD、售后服务、职能支持
- 关键能力维度：专业技术能力、项目管理能力、沟通协作能力、创新能力、领导力
- 潜力评估：高潜（可跨级晋升）、中潜（可同级拓展）、低潜（需深耕当前岗位）

请基于员工信息进行综合人才评估，返回JSON格式结果。
评级标准：
- A级：绩效优秀+高潜力，战略级人才，重点培养
- B级：绩效良好+中等潜力，骨干人才，稳定发展
- C级：绩效达标+潜力待观察，发展中人才，针对性培养
- D级：绩效不达标或潜力不足，需改进或调整`;

  const userPrompt = `员工姓名: ${params.employeeName}
岗位角色: ${params.role}
所属部门: ${params.department}
工作年限: ${params.yearsOfExperience}年
${params.skillTags ? `技能标签: ${params.skillTags}` : ""}
${params.performanceSummary ? `绩效概述: ${params.performanceSummary}` : ""}
${params.certifications ? `持有证书: ${params.certifications}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "talent_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              talentGrade: { type: "string", enum: ["A", "B", "C", "D"] },
              potentialLevel: { type: "string", enum: ["high", "medium", "low"] },
              strengths: { type: "array", items: { type: "string" } },
              developmentAreas: { type: "array", items: { type: "string" } },
              careerPaths: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    role: { type: "string" },
                    readiness: { type: "string", enum: ["ready", "1-2years", "3+years"] },
                    timeframe: { type: "string" },
                  },
                  required: ["role", "readiness", "timeframe"],
                  additionalProperties: false,
                },
              },
              successionReadiness: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["talentGrade", "potentialLevel", "strengths", "developmentAreas", "careerPaths", "successionReadiness", "recommendations"],
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
    console.error("[HRIntelligence] assessTalent failed:", error);
    return {
      talentGrade: "C",
      potentialLevel: "medium",
      strengths: [],
      developmentAreas: [],
      careerPaths: [],
      successionReadiness: "AI服务暂时不可用",
      recommendations: ["AI服务暂时不可用，请人工进行人才评估"],
    };
  }
}

// ============================================================
// 2. Training Recommendation (培训推荐)
// ============================================================

export async function recommendTraining(params: {
  role: string;
  currentSkills: string;
  targetSkills: string;
  experienceLevel: string;
  learningPreference?: string;
  department?: string;
}): Promise<TrainingRecommendationResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT培训与发展专家，负责员工技能提升规划。

GRT背景知识：
- 核心技能体系：机械设计、电气工程、PLC编程、清洗工艺、质量管理、项目管理、客户服务
- 技能等级：L1(入门) → L2(基础) → L3(熟练) → L4(精通) → L5(专家)
- 4种培训模式：
  * 线上学习(online)：视频课程、在线测试
  * 课堂培训(classroom)：内部讲师、外部专家
  * 在岗训练(OJT)：师徒制、轮岗实践
  * 导师辅导(mentoring)：1对1指导、专家带教
- 认证体系：初级工程师 → 中级工程师 → 高级工程师 → 首席专家
- 年度培训预算约占人力成本3-5%
- 培训周期：短期(1-2周)、中期(1-3月)、长期(3-12月)

请基于员工技能现状和目标，规划个性化培训方案，返回JSON格式结果。`;

  const userPrompt = `岗位角色: ${params.role}
当前技能: ${params.currentSkills}
目标技能: ${params.targetSkills}
经验等级: ${params.experienceLevel}
${params.learningPreference ? `学习偏好: ${params.learningPreference}` : ""}
${params.department ? `所属部门: ${params.department}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "training_recommendation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              skillGaps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    skill: { type: "string" },
                    currentLevel: { type: "string" },
                    targetLevel: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["skill", "currentLevel", "targetLevel", "priority"],
                  additionalProperties: false,
                },
              },
              recommendedCourses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string", enum: ["online", "classroom", "OJT", "mentoring"] },
                    duration: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    relevance: { type: "string" },
                  },
                  required: ["name", "type", "duration", "priority", "relevance"],
                  additionalProperties: false,
                },
              },
              learningPath: { type: "string" },
              estimatedTime: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["skillGaps", "recommendedCourses", "learningPath", "estimatedTime", "recommendations"],
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
    console.error("[HRIntelligence] recommendTraining failed:", error);
    return {
      skillGaps: [],
      recommendedCourses: [],
      learningPath: "AI服务暂时不可用",
      estimatedTime: "待评估",
      recommendations: ["AI服务暂时不可用，请人工规划培训方案"],
    };
  }
}

// ============================================================
// 3. Compensation Analysis (薪酬分析)
// ============================================================

export async function analyzeCompensation(params: {
  position: string;
  department: string;
  experienceYears: number;
  currentSalary: number;
  location?: string;
  performanceGrade?: string;
  education?: string;
}): Promise<CompensationAnalysisResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT薪酬管理与人力成本分析专家。

GRT背景知识：
- 约140人规模的制造企业，总部在中国
- 薪酬结构：基本工资(60-70%) + 绩效奖金(15-25%) + 补贴福利(10-15%)
- 市场定位策略：核心岗位P75，一般岗位P50
- 薪酬带宽：每级带宽约40-60%（最低值到最高值）
- 典型薪资范围（年薪，万元）：
  * 初级工程师：8-15万
  * 中级工程师：15-25万
  * 高级工程师：25-40万
  * 项目经理：20-35万
  * 部门经理：30-50万
  * 总监级：50-80万
- 绩效对薪酬影响：A(+15-20%)、B+(+8-12%)、B(+3-5%)、C(0%)、D(-5-10%)
- 年度调薪预算：一般为工资总额的5-8%

请基于岗位和薪酬数据进行竞争力分析，返回JSON格式结果。`;

  const userPrompt = `岗位名称: ${params.position}
所属部门: ${params.department}
工作年限: ${params.experienceYears}年
当前年薪: ${params.currentSalary}万元
${params.location ? `工作地点: ${params.location}` : ""}
${params.performanceGrade ? `绩效等级: ${params.performanceGrade}` : ""}
${params.education ? `学历: ${params.education}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "compensation_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              marketPosition: { type: "string", enum: ["above", "at", "below"] },
              competitivenessScore: { type: "number" },
              equityAnalysis: { type: "string" },
              adjustmentSuggestion: { type: "string" },
              salaryRange: {
                type: "object",
                properties: {
                  min: { type: "number" },
                  mid: { type: "number" },
                  max: { type: "number" },
                },
                required: ["min", "mid", "max"],
                additionalProperties: false,
              },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["marketPosition", "competitivenessScore", "equityAnalysis", "adjustmentSuggestion", "salaryRange", "recommendations"],
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
    console.error("[HRIntelligence] analyzeCompensation failed:", error);
    return {
      marketPosition: "at",
      competitivenessScore: 0,
      equityAnalysis: "AI服务暂时不可用",
      adjustmentSuggestion: "请人工分析薪酬竞争力",
      salaryRange: { min: 0, mid: 0, max: 0 },
      recommendations: ["AI服务暂时不可用，请人工进行薪酬分析"],
    };
  }
}

// ============================================================
// 4. Workforce Planning (人力规划)
// ============================================================

export async function planWorkforce(params: {
  department: string;
  currentHeadcount: number;
  plannedProjects: string;
  attritionRate: number;
  budgetConstraint?: string;
  growthTarget?: string;
  timeHorizon?: string;
}): Promise<WorkforcePlanningResult> {
  const { invokeLLM } = await import("../_core/llm");

  const systemPrompt = `你是GRT人力规划与组织发展专家。

GRT背景知识：
- 约140人规模，5个事业部
- 部门人员配置参考：
  * 研发中心：~35人（机械设计、电气、软件、工艺）
  * 生产制造：~45人（装配、焊接、电气、调试、仓储）
  * 销售市场：~20人（国内销售、海外销售、市场、投标）
  * 售后服务：~28人（现场工程师、远程支持、备件）
  * 职能支持：~12人（HR、财务、IT、行政）
- 人均产值目标：约80-100万元/人/年
- 行业平均流失率：15-20%（制造业）
- 招聘周期：普通岗位1-2月，中高级岗位2-4月
- 人力成本占收入比：约35-40%
- 关键人才保留策略：晋升通道、技能补贴、项目奖金

请基于部门需求规划人力配置方案，返回JSON格式结果。`;

  const userPrompt = `部门名称: ${params.department}
现有人数: ${params.currentHeadcount}
计划项目: ${params.plannedProjects}
流失率: ${params.attritionRate}%
${params.budgetConstraint ? `预算约束: ${params.budgetConstraint}` : ""}
${params.growthTarget ? `增长目标: ${params.growthTarget}` : ""}
${params.timeHorizon ? `规划周期: ${params.timeHorizon}` : ""}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "workforce_planning",
          strict: true,
          schema: {
            type: "object",
            properties: {
              optimalHeadcount: { type: "number" },
              hiringNeeds: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    role: { type: "string" },
                    count: { type: "number" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    timeline: { type: "string" },
                  },
                  required: ["role", "count", "priority", "timeline"],
                  additionalProperties: false,
                },
              },
              skillRequirements: { type: "array", items: { type: "string" } },
              budgetAllocation: {
                type: "object",
                properties: {
                  hiring: { type: "number" },
                  training: { type: "number" },
                  retention: { type: "number" },
                },
                required: ["hiring", "training", "retention"],
                additionalProperties: false,
              },
              riskFactors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    factor: { type: "string" },
                    impact: { type: "string", enum: ["high", "medium", "low"] },
                    mitigation: { type: "string" },
                  },
                  required: ["factor", "impact", "mitigation"],
                  additionalProperties: false,
                },
              },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["optimalHeadcount", "hiringNeeds", "skillRequirements", "budgetAllocation", "riskFactors", "recommendations"],
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
    console.error("[HRIntelligence] planWorkforce failed:", error);
    return {
      optimalHeadcount: 0,
      hiringNeeds: [],
      skillRequirements: [],
      budgetAllocation: { hiring: 0, training: 0, retention: 0 },
      riskFactors: [{ factor: "AI服务暂时不可用", impact: "high", mitigation: "请稍后重试或人工规划" }],
      recommendations: ["AI服务暂时不可用，请人工进行人力规划"],
    };
  }
}
