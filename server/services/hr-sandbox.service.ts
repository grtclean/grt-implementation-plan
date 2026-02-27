/**
 * HR Sandbox Capability Model — Parsing Engine
 *
 * Three core functions:
 *   1. parseCapabilityModel(taskId) — LLM analysis with algorithmic fallback
 *   2. algorithmicFallback(input) — keyword scoring + gap analysis
 *   3. whatIfSimulate(baseScores, adjustments, role) — pure slider simulation
 */
import { requireDb } from "../db";
import { aiTasks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import {
  CAPABILITY_DICTIONARY,
  ROLE_CRITERIA,
  EMPLOYEE_ASSESSMENTS,
  computeGrade,
} from "../routers/capability-system.router";

// ─── Types ──────────────────────────────────────────────────

interface ParsedScores { T: number; S: number; D: number; C: number; K: number; L: number }

interface GapItem {
  pillar: string;
  code: string;
  actual: number;
  target: number;
  gap: number;
  priority: "high" | "medium" | "low";
}

interface Recommendation {
  pillar: string;
  code: string;
  action: string;
  timeframe: string;
  expectedLift: number;
  priority: "high" | "medium" | "low";
}

export interface ParsingResult {
  parsedScores: ParsedScores;
  gaps: GapItem[];
  recommendations: Recommendation[];
  developmentPath: string;
  confidenceLevel: number;
  overallScore: number;
  overallGrade: string;
  source: "llm" | "algorithmic";
}

export interface WhatIfResult {
  before: { scores: ParsedScores; overallScore: number; grade: string };
  after: { scores: ParsedScores; overallScore: number; grade: string };
  deltas: Array<{ code: string; pillar: string; before: number; after: number; delta: number }>;
}

// ─── Parse Capability Model ─────────────────────────────────

export async function parseCapabilityModel(taskId: number): Promise<ParsingResult> {
  const db = await requireDb();

  // 1. Read task input
  const [task] = await db.select().from(aiTasks).where(eq(aiTasks.id, taskId));
  if (!task) throw new Error(`Task ${taskId} not found`);

  const input = task.inputData as Record<string, unknown>;
  const employeeId = input.employeeId as number | undefined;
  const role = (input.role as string) || "employee";
  const freeformText = (input.freeformText as string) || "";
  const currentScores = input.currentScores as ParsedScores | undefined;

  // 2. Mark processing
  await db.update(aiTasks)
    .set({ status: "processing", startedAt: new Date().toISOString() })
    .where(eq(aiTasks.id, taskId));

  // Resolve employee data
  const employee = employeeId
    ? EMPLOYEE_ASSESSMENTS.find(e => e.employeeId === employeeId)
    : undefined;

  const criteria = ROLE_CRITERIA.find(r => r.role === role)
    || ROLE_CRITERIA.find(r => r.role === "employee")!;

  // 3. Try LLM
  try {
    const result = await llmParse(employee, criteria, role, freeformText, currentScores);

    // 6. Write result
    await db.update(aiTasks).set({
      status: "completed",
      resultData: result as unknown as Record<string, unknown>,
      completedAt: new Date().toISOString(),
    }).where(eq(aiTasks.id, taskId));

    return result;
  } catch (err) {
    console.warn("[HR Sandbox] LLM failed, falling back to algorithmic:", err);

    // 5. Fallback
    const result = algorithmicFallback(employee, criteria, role, freeformText, currentScores);

    await db.update(aiTasks).set({
      status: "completed",
      resultData: result as unknown as Record<string, unknown>,
      completedAt: new Date().toISOString(),
    }).where(eq(aiTasks.id, taskId));

    return result;
  }
}

// ─── LLM Parse ──────────────────────────────────────────────

async function llmParse(
  employee: typeof EMPLOYEE_ASSESSMENTS[0] | undefined,
  criteria: typeof ROLE_CRITERIA[0],
  role: string,
  freeformText: string,
  currentScores?: ParsedScores,
): Promise<ParsingResult> {
  const pillarDesc = CAPABILITY_DICTIONARY.map(p =>
    `${p.code}(${p.name}): ${p.description}. 评分标准: ${p.scoringRules.join("; ")}`
  ).join("\n");

  const targetsDesc = Object.entries(criteria.targets)
    .map(([code, target]) => `${code}: ${target}`)
    .join(", ");

  const systemPrompt = [
    "你是GRT集团的HR能力评估AI专家。基于TSDCKL六维能力模型进行员工能力解析。",
    "",
    "六维能力标准:",
    pillarDesc,
    "",
    `当前岗位: ${criteria.roleName}(${role})`,
    `岗位目标分数: ${targetsDesc}`,
    "",
    "请返回严格的JSON格式（不要markdown代码块）:",
    '{"parsedScores":{"T":number,"S":number,"D":number,"C":number,"K":number,"L":number},',
    '"gaps":[{"code":"T","gap":number,"priority":"high|medium|low"},...],',
    '"recommendations":[{"code":"T","action":"具体行动","timeframe":"3个月","expectedLift":10,"priority":"high|medium|low"},...],',
    '"developmentPath":"整体发展路径描述",',
    '"confidenceLevel":0.85}',
  ].join("\n");

  const userParts: string[] = [];
  if (employee) {
    userParts.push(`员工: ${employee.name}(${employee.nameEn}), 部门: ${employee.department}, 岗位: ${employee.roleName}`);
    userParts.push(`当前评分: T=${employee.scores.T}, S=${employee.scores.S}, D=${employee.scores.D}, C=${employee.scores.C}, K=${employee.scores.K}, L=${employee.scores.L}`);
  }
  if (currentScores) {
    userParts.push(`手动输入分数: T=${currentScores.T}, S=${currentScores.S}, D=${currentScores.D}, C=${currentScores.C}, K=${currentScores.K}, L=${currentScores.L}`);
  }
  if (freeformText) {
    userParts.push(`自由文本描述: ${freeformText}`);
  }
  if (userParts.length === 0) {
    userParts.push("请基于岗位标准生成默认能力画像。");
  }

  const llmResult = await invokeLLM({
    system: systemPrompt,
    prompt: userParts.join("\n"),
  });

  const content = llmResult.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in LLM response");

  const parsed = JSON.parse(jsonMatch[0]) as {
    parsedScores: ParsedScores;
    gaps: Array<{ code: string; gap: number; priority: string }>;
    recommendations: Array<{ code: string; action: string; timeframe: string; expectedLift: number; priority: string }>;
    developmentPath: string;
    confidenceLevel: number;
  };

  // Enrich gaps and recommendations with pillar names
  const scores = parsed.parsedScores;
  const gaps: GapItem[] = CAPABILITY_DICTIONARY.map(p => {
    const actual = scores[p.code as keyof ParsedScores] || 0;
    const target = criteria.targets[p.code] || 60;
    const gap = target - actual;
    const llmGap = parsed.gaps.find(g => g.code === p.code);
    return {
      pillar: p.name,
      code: p.code,
      actual,
      target,
      gap,
      priority: (llmGap?.priority as GapItem["priority"]) || (gap > 15 ? "high" : gap > 8 ? "medium" : "low"),
    };
  }).sort((a, b) => b.gap - a.gap);

  const recommendations: Recommendation[] = parsed.recommendations.map(r => {
    const pillar = CAPABILITY_DICTIONARY.find(p => p.code === r.code);
    return {
      pillar: pillar?.name || r.code,
      code: r.code,
      action: r.action,
      timeframe: r.timeframe || "3个月",
      expectedLift: r.expectedLift || 5,
      priority: (r.priority as Recommendation["priority"]) || "medium",
    };
  });

  const vals = Object.values(scores);
  const overallScore = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

  return {
    parsedScores: scores,
    gaps,
    recommendations,
    developmentPath: parsed.developmentPath || "综合提升路径待定",
    confidenceLevel: parsed.confidenceLevel || 0.85,
    overallScore,
    overallGrade: computeGrade(overallScore),
    source: "llm",
  };
}

// ─── Algorithmic Fallback ───────────────────────────────────

function algorithmicFallback(
  employee: typeof EMPLOYEE_ASSESSMENTS[0] | undefined,
  criteria: typeof ROLE_CRITERIA[0],
  role: string,
  freeformText: string,
  currentScores?: ParsedScores,
): ParsingResult {
  let scores: ParsedScores;
  let confidence: number;

  if (currentScores) {
    scores = { ...currentScores };
    confidence = 0.7;
  } else if (employee) {
    scores = { T: employee.scores.T, S: employee.scores.S, D: employee.scores.D, C: employee.scores.C, K: employee.scores.K, L: employee.scores.L };
    confidence = 0.7;
  } else {
    // Start from baseline and adjust via keywords
    scores = { T: 50, S: 50, D: 50, C: 50, K: 50, L: 50 };
    confidence = 0.3;
  }

  // Keyword boosting from freeformText
  if (freeformText) {
    const text = freeformText.toLowerCase();
    const boosts: Array<[RegExp, keyof ParsedScores, number]> = [
      [/专利|patent|发明/i, "D", 10],
      [/iatf|iso|标准|审核/i, "K", 8],
      [/带队|管理|领导|mentor/i, "L", 8],
      [/客户满意|customer satisfaction/i, "C", 6],
      [/沟通|presentation|演讲/i, "S", 6],
      [/编程|python|plc|cad|solidworks/i, "T", 8],
      [/培训|training|授课/i, "L", 5],
      [/创新|改善|kaizen/i, "D", 6],
    ];
    for (const [pattern, dim, boost] of boosts) {
      if (pattern.test(text)) {
        scores[dim] = Math.min(100, scores[dim] + boost);
        confidence = Math.min(0.6, confidence + 0.05);
      }
    }
  }

  // Compute gaps
  const gaps: GapItem[] = CAPABILITY_DICTIONARY.map(p => {
    const actual = scores[p.code as keyof ParsedScores] || 0;
    const target = criteria.targets[p.code] || 60;
    const gap = target - actual;
    return {
      pillar: p.name,
      code: p.code,
      actual,
      target,
      gap,
      priority: gap > 15 ? "high" as const : gap > 8 ? "medium" as const : "low" as const,
    };
  }).sort((a, b) => b.gap - a.gap);

  // Generate recommendations from gaps
  const recommendations: Recommendation[] = gaps
    .filter(g => g.gap > 0)
    .map(g => ({
      pillar: g.pillar,
      code: g.code,
      action: g.priority === "high"
        ? `报名${g.pillar}高级培训课程，每周投入4小时实践`
        : g.priority === "medium"
        ? `参与1-2个${g.pillar}相关项目获得实战经验`
        : `保持当前学习节奏，关注${g.pillar}领域动态`,
      timeframe: g.priority === "high" ? "1-3个月" : g.priority === "medium" ? "3-6个月" : "持续",
      expectedLift: g.priority === "high" ? 12 : g.priority === "medium" ? 8 : 3,
      priority: g.priority,
    }));

  const vals = Object.values(scores);
  const overallScore = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

  return {
    parsedScores: scores,
    gaps,
    recommendations,
    developmentPath: gaps.filter(g => g.priority === "high").length > 0
      ? `重点突破: ${gaps.filter(g => g.priority === "high").map(g => g.pillar).join("、")}，预计3个月内可见明显提升`
      : "能力均衡发展，建议持续精进优势维度",
    confidenceLevel: confidence,
    overallScore,
    overallGrade: computeGrade(overallScore),
    source: "algorithmic",
  };
}

// ─── What-If Simulation (Pure Function) ─────────────────────

export function whatIfSimulate(
  baseScores: ParsedScores,
  adjustments: Partial<ParsedScores>,
  role: string,
): WhatIfResult {
  const criteria = ROLE_CRITERIA.find(r => r.role === role)
    || ROLE_CRITERIA.find(r => r.role === "employee")!;

  const afterScores: ParsedScores = { ...baseScores };
  for (const [key, val] of Object.entries(adjustments)) {
    if (val !== undefined) {
      afterScores[key as keyof ParsedScores] = Math.max(0, Math.min(100, val));
    }
  }

  const beforeVals = Object.values(baseScores);
  const afterVals = Object.values(afterScores);
  const beforeOverall = Math.round(beforeVals.reduce((a, b) => a + b, 0) / beforeVals.length);
  const afterOverall = Math.round(afterVals.reduce((a, b) => a + b, 0) / afterVals.length);

  const deltas = CAPABILITY_DICTIONARY.map(p => {
    const code = p.code as keyof ParsedScores;
    return {
      code: p.code,
      pillar: p.name,
      before: baseScores[code],
      after: afterScores[code],
      delta: afterScores[code] - baseScores[code],
    };
  });

  return {
    before: { scores: baseScores, overallScore: beforeOverall, grade: computeGrade(beforeOverall) },
    after: { scores: afterScores, overallScore: afterOverall, grade: computeGrade(afterOverall) },
    deltas,
  };
}
