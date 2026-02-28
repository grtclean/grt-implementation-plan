/**
 * Sandbox Engines — 3 AI task handlers for task-worker
 *
 * 1. DOC_PARSING      — 6-dimension capability matrix from document text
 * 2. COMPENSATION_RULE — Red-line JSON config check (salary/bonus boundaries)
 * 3. INCIDENT_ANALYSIS — ≥3 actionable steps investigation report
 *
 * Each engine is registered with `registerTaskHandler()` and invoked by
 * the task worker when a matching `taskType` task enters the queue.
 */
import { registerTaskHandler, type TaskHandler } from "./task-worker.service";
import { registerFinanceAgentHandler } from "./finance-agent.service";
import { registerProjectAgentHandlers } from "./project-agent-engines";
import { invokeLLM } from "../_core/llm";

// ══════════════════════════════════════════════════════════════
// Engine 1: DOC_PARSING — 6-Dimension Capability Matrix
// ══════════════════════════════════════════════════════════════

const DIMENSIONS = ["T", "S", "D", "C", "K", "L"] as const;

const DIMENSION_NAMES: Record<string, string> = {
  T: "Technical Skill (技术能力)",
  S: "Soft Skill (沟通协作)",
  D: "Drive & Innovation (创新驱动)",
  C: "Customer Orientation (客户导向)",
  K: "Knowledge & Compliance (知识合规)",
  L: "Leadership (领导力)",
};

interface DocParsingInput {
  documentText?: string;
  employeeName?: string;
  role?: string;
  department?: string;
}

interface DocParsingResult {
  employeeName: string;
  scores: Record<string, number>;
  overallScore: number;
  grade: string;
  narrative: string;
  keyFindings: string[];
  improvementAreas: Array<{ dimension: string; currentScore: number; recommendation: string }>;
  source: "llm" | "algorithmic";
}

const docParsingHandler: TaskHandler = async (_taskId, input) => {
  const data = input as unknown as DocParsingInput;
  const documentText = data.documentText || "";
  const employeeName = data.employeeName || "未知员工";
  const role = data.role || "employee";

  // Try LLM first
  try {
    const llmResult = await invokeLLM({
      system: [
        "你是GRT集团的HR能力评估AI。基于TSDCKL六维能力模型分析文档内容。",
        "六维说明:",
        ...DIMENSIONS.map(d => `- ${d}: ${DIMENSION_NAMES[d]}`),
        "",
        "评分规则: 0-100分，每0.25个等级为一步 (即允许 62.5, 67.75 等精度)。",
        "返回JSON(不要markdown代码块):",
        '{"scores":{"T":number,"S":number,...},"narrative":"评估摘要","keyFindings":["..."],"improvementAreas":[{"dimension":"T","currentScore":65,"recommendation":"..."}]}',
      ].join("\n"),
      prompt: `员工: ${employeeName}, 岗位: ${role}\n文档内容:\n${documentText.slice(0, 3000)}`,
    });

    const content = llmResult.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const scores: Record<string, number> = {};
      for (const d of DIMENSIONS) {
        scores[d] = roundToQuarter(parsed.scores?.[d] ?? 50);
      }
      const vals = Object.values(scores);
      const overallScore = roundToQuarter(vals.reduce((a, b) => a + b, 0) / vals.length);

      return {
        employeeName,
        scores,
        overallScore,
        grade: scoreToGrade(overallScore),
        narrative: parsed.narrative || "LLM评估完成",
        keyFindings: parsed.keyFindings || [],
        improvementAreas: parsed.improvementAreas || [],
        source: "llm",
      } satisfies DocParsingResult as unknown as Record<string, unknown>;
    }
  } catch (err) {
    console.warn("[DOC_PARSING] LLM failed, using algorithmic:", err);
  }

  // Algorithmic fallback: keyword scoring
  const scores = algorithmicDocScoring(documentText);
  const vals = Object.values(scores);
  const overallScore = roundToQuarter(vals.reduce((a, b) => a + b, 0) / vals.length);

  return {
    employeeName,
    scores,
    overallScore,
    grade: scoreToGrade(overallScore),
    narrative: "基于关键词算法评估（LLM不可用时的回退方案）",
    keyFindings: [`基于文档关键词匹配完成${DIMENSIONS.length}维评估`],
    improvementAreas: DIMENSIONS
      .filter(d => scores[d] < 60)
      .map(d => ({ dimension: d, currentScore: scores[d], recommendation: `${DIMENSION_NAMES[d]}需提升至60分以上` })),
    source: "algorithmic",
  } satisfies DocParsingResult as unknown as Record<string, unknown>;
};

function algorithmicDocScoring(text: string): Record<string, number> {
  const lc = text.toLowerCase();
  const scores: Record<string, number> = {};
  const keywords: Record<string, RegExp[]> = {
    T: [/技术|编程|plc|cad|solidworks|python|java|焊接|装配/gi],
    S: [/沟通|协作|演讲|presentation|团队|协调|客户关系/gi],
    D: [/创新|专利|kaizen|改善|研发|新方法|突破/gi],
    C: [/客户|满意度|需求|nps|反馈|服务质量/gi],
    K: [/iatf|iso|合规|标准|审核|认证|法规/gi],
    L: [/领导|管理|带队|mentor|培训|指导|决策/gi],
  };

  for (const d of DIMENSIONS) {
    let count = 0;
    for (const re of keywords[d]) {
      const matches = lc.match(re);
      count += matches ? matches.length : 0;
    }
    scores[d] = roundToQuarter(Math.min(95, 45 + count * 5));
  }
  return scores;
}

// ══════════════════════════════════════════════════════════════
// Engine 2: COMPENSATION_RULE — Red-Line Config Check
// ══════════════════════════════════════════════════════════════

interface CompensationRuleInput {
  ruleConfig: {
    salaryCapMultiplier?: number;   // e.g. 1.3 = max 130% of band midpoint
    bonusFloor?: number;            // minimum bonus coefficient
    bonusCeiling?: number;          // maximum bonus coefficient
    frozenBUIds?: number[];         // BUs currently frozen (no payouts)
    maxRaisePercent?: number;       // max annual raise %
  };
  employeeData: {
    userId: number;
    buId: number;
    currentSalary: number;
    bandMidpoint: number;
    proposedBonus: number;
    proposedRaise: number;         // percentage
    kpiScore: number;
  };
}

interface CompensationRuleResult {
  passed: boolean;
  violations: Array<{
    rule: string;
    threshold: string;
    actual: string;
    severity: "MINOR" | "MAJOR" | "CRITICAL";
  }>;
  adjustedBonus: number;
  adjustedRaise: number;
  notes: string[];
}

const compensationRuleHandler: TaskHandler = async (_taskId, input) => {
  const data = input as unknown as CompensationRuleInput;
  const rules = data.ruleConfig || {};
  const emp = data.employeeData;

  const violations: CompensationRuleResult["violations"] = [];
  const notes: string[] = [];
  let adjustedBonus = emp.proposedBonus;
  let adjustedRaise = emp.proposedRaise;

  // Rule 1: Frozen BU check
  if (rules.frozenBUIds?.includes(emp.buId)) {
    violations.push({
      rule: "BU_FROZEN",
      threshold: "BU is frozen — no payouts allowed",
      actual: `BU ${emp.buId} is in frozen list`,
      severity: "CRITICAL",
    });
    adjustedBonus = 0;
    adjustedRaise = 0;
    notes.push(`BU ${emp.buId} 已被冻结，所有薪酬调整暂停`);
  }

  // Rule 2: Salary cap
  const capMultiplier = rules.salaryCapMultiplier ?? 1.3;
  const salaryCap = emp.bandMidpoint * capMultiplier;
  const newSalary = emp.currentSalary * (1 + emp.proposedRaise / 100);
  if (newSalary > salaryCap) {
    violations.push({
      rule: "SALARY_CAP_EXCEEDED",
      threshold: `Max ${(capMultiplier * 100).toFixed(0)}% of band midpoint (¥${salaryCap.toFixed(0)})`,
      actual: `Proposed: ¥${newSalary.toFixed(0)}`,
      severity: "MAJOR",
    });
    adjustedRaise = Math.max(0, ((salaryCap / emp.currentSalary) - 1) * 100);
    notes.push(`调薪上限 ${capMultiplier * 100}%，已自动调整至 ${adjustedRaise.toFixed(1)}%`);
  }

  // Rule 3: Bonus floor/ceiling
  const bonusFloor = rules.bonusFloor ?? 0;
  const bonusCeiling = rules.bonusCeiling ?? 3.0;
  if (emp.proposedBonus < bonusFloor) {
    violations.push({
      rule: "BONUS_BELOW_FLOOR",
      threshold: `Min bonus coefficient: ${bonusFloor}`,
      actual: `Proposed: ${emp.proposedBonus}`,
      severity: "MINOR",
    });
    adjustedBonus = bonusFloor;
  }
  if (emp.proposedBonus > bonusCeiling) {
    violations.push({
      rule: "BONUS_ABOVE_CEILING",
      threshold: `Max bonus coefficient: ${bonusCeiling}`,
      actual: `Proposed: ${emp.proposedBonus}`,
      severity: "MAJOR",
    });
    adjustedBonus = bonusCeiling;
    notes.push(`奖金系数超限，已封顶至 ${bonusCeiling}`);
  }

  // Rule 4: Max raise percent
  const maxRaise = rules.maxRaisePercent ?? 20;
  if (emp.proposedRaise > maxRaise) {
    violations.push({
      rule: "RAISE_EXCEEDS_MAX",
      threshold: `Max annual raise: ${maxRaise}%`,
      actual: `${emp.proposedRaise}%`,
      severity: "MAJOR",
    });
    adjustedRaise = Math.min(adjustedRaise, maxRaise);
    notes.push(`年度调薪不超过 ${maxRaise}%`);
  }

  // Rule 5: KPI minimum for bonus eligibility
  if (emp.kpiScore < 60 && emp.proposedBonus > 1.0) {
    violations.push({
      rule: "LOW_KPI_HIGH_BONUS",
      threshold: "KPI < 60 → bonus coefficient ≤ 1.0",
      actual: `KPI=${emp.kpiScore}, bonus=${emp.proposedBonus}`,
      severity: "MAJOR",
    });
    adjustedBonus = Math.min(adjustedBonus, 1.0);
    notes.push(`KPI不达标(${emp.kpiScore})，奖金系数已降至1.0`);
  }

  return {
    passed: violations.length === 0,
    violations,
    adjustedBonus,
    adjustedRaise,
    notes,
  } satisfies CompensationRuleResult as unknown as Record<string, unknown>;
};

// ══════════════════════════════════════════════════════════════
// Engine 3: INCIDENT_ANALYSIS — Investigation Report
// ══════════════════════════════════════════════════════════════

interface IncidentAnalysisInput {
  incidentTitle: string;
  incidentDescription: string;
  severity: "MINOR" | "MAJOR" | "CRITICAL";
  sourceModule: string;
  affectedBU?: string;
  relatedDocuments?: string[];
}

interface IncidentAnalysisResult {
  summary: string;
  rootCauseAnalysis: string;
  actionItems: Array<{
    step: number;
    description: string;
    responsible: string;
    deadline: string;
    priority: "high" | "medium" | "low";
  }>;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendedEscalation: boolean;
  preventionMeasures: string[];
  source: "llm" | "algorithmic";
}

const incidentAnalysisHandler: TaskHandler = async (_taskId, input) => {
  const data = input as unknown as IncidentAnalysisInput;

  // Try LLM
  try {
    const llmResult = await invokeLLM({
      system: [
        "你是GRT集团的风控分析AI专家。对安全/质量/合规事件进行根因分析并输出调查报告。",
        "要求: 至少3条可执行的行动步骤(actionItems)，每条需指定负责人和截止日。",
        "返回JSON(不要markdown代码块):",
        '{"summary":"...","rootCauseAnalysis":"...","actionItems":[{"step":1,"description":"...","responsible":"...","deadline":"YYYY-MM-DD","priority":"high|medium|low"}],',
        '"riskLevel":"low|medium|high|critical","recommendedEscalation":true/false,"preventionMeasures":["..."]}',
      ].join("\n"),
      prompt: [
        `事件标题: ${data.incidentTitle}`,
        `严重程度: ${data.severity}`,
        `来源模块: ${data.sourceModule}`,
        `事业部: ${data.affectedBU || "未知"}`,
        `描述: ${data.incidentDescription}`,
        data.relatedDocuments?.length
          ? `相关文档: ${data.relatedDocuments.join(", ")}`
          : "",
      ].filter(Boolean).join("\n"),
    });

    const content = llmResult.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Ensure at least 3 action items
      while ((parsed.actionItems?.length ?? 0) < 3) {
        parsed.actionItems = parsed.actionItems || [];
        parsed.actionItems.push({
          step: parsed.actionItems.length + 1,
          description: `补充行动项 #${parsed.actionItems.length + 1}（需进一步细化）`,
          responsible: "风控部",
          deadline: futureDate(14),
          priority: "medium",
        });
      }
      return {
        ...parsed,
        source: "llm",
      } satisfies IncidentAnalysisResult as unknown as Record<string, unknown>;
    }
  } catch (err) {
    console.warn("[INCIDENT_ANALYSIS] LLM failed, using template:", err);
  }

  // Algorithmic fallback — template-based report
  const riskLevel = data.severity === "CRITICAL" ? "critical" : data.severity === "MAJOR" ? "high" : "medium";

  const actionItems = [
    {
      step: 1,
      description: `立即隔离受影响区域/产品，防止事件扩大（${data.sourceModule}模块）`,
      responsible: "现场负责人",
      deadline: futureDate(1),
      priority: "high" as const,
    },
    {
      step: 2,
      description: `组织跨部门调查小组，收集事件证据（包括日志、照片、当事人陈述）`,
      responsible: "品质/合规经理",
      deadline: futureDate(3),
      priority: "high" as const,
    },
    {
      step: 3,
      description: `编制根因分析报告（5-Why / 鱼骨图），提出纠正预防措施`,
      responsible: "品质工程师",
      deadline: futureDate(7),
      priority: "medium" as const,
    },
    {
      step: 4,
      description: `更新SOP/作业指导书，开展相关人员再培训`,
      responsible: "培训主管",
      deadline: futureDate(14),
      priority: "medium" as const,
    },
  ];

  return {
    summary: `${data.severity}级事件: ${data.incidentTitle}，需立即启动调查流程`,
    rootCauseAnalysis: "待调查小组完成根因分析（建议使用5-Why / 鱼骨图方法）",
    actionItems,
    riskLevel,
    recommendedEscalation: data.severity !== "MINOR",
    preventionMeasures: [
      "加强日常巡检频率",
      "更新风险评估矩阵",
      "完善预警机制触发阈值",
    ],
    source: "algorithmic",
  } satisfies IncidentAnalysisResult as unknown as Record<string, unknown>;
};

// ── Utility ──────────────────────────────────────────────────

function roundToQuarter(n: number): number {
  return Math.round(n * 4) / 4;
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  return "D";
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Registration ─────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// Engine 4: DAILY_PLAN_GENERATION — Async daily work plan via LLM
// ══════════════════════════════════════════════════════════════

const dailyPlanGenerationHandler: TaskHandler = async (_taskId, input) => {
  const userId = Number(input.userId);
  if (!userId) return { ok: false, error: "Missing userId" };

  try {
    // Dynamic import to avoid circular dependency
    const { generateDailyPlan } = await import("./daily-work-plan.service");
    const result = await generateDailyPlan(userId);
    return { ok: true, ...result };
  } catch (err: any) {
    return { ok: false, error: err.message ?? "Daily plan generation failed" };
  }
};

export function registerAllEngines(): void {
  registerTaskHandler("DOC_PARSING", docParsingHandler);
  registerTaskHandler("COMPENSATION_RULE", compensationRuleHandler);
  registerTaskHandler("INCIDENT_ANALYSIS", incidentAnalysisHandler);

  // Finance Agent — AI expense review engine
  registerFinanceAgentHandler();

  // Project Agent — AI project lifecycle reviews
  registerProjectAgentHandlers();

  // Daily Plan — async LLM-powered daily work plan generation
  registerTaskHandler("DAILY_PLAN_GENERATION", dailyPlanGenerationHandler);
}
