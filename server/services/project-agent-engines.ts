/**
 * Project Agent Engines — 3 AI task handlers for project lifecycle reviews
 *
 * 1. PROJECT_BOM_REVIEW      — BOM completeness + cost + customer req matching
 * 2. PROJECT_DRAWING_REVIEW   — Dimension, tolerance, GD&T, revision control
 * 3. PROJECT_DELAY_PREDICTION — Milestone progress + budget utilization → risk
 *
 * Each handler: invokeLLM() → parse → write to project_agent_reviews
 * Fallback: heuristic scoring when LLM unavailable
 */
import { registerTaskHandler, type TaskHandler } from "./task-worker.service";
import { invokeLLM } from "../_core/llm";
import { requireDb } from "../db";
import { projectAgentReviews } from "../../drizzle/project-agent-schema";
import { eq } from "drizzle-orm";

// ══════════════════════════════════════════════════════════════
// Engine 1: PROJECT_BOM_REVIEW
// ══════════════════════════════════════════════════════════════

interface BomReviewInput {
  reviewId: number;
  bomItems?: Array<{ partName: string; spec: string; qty: number; unitCost: number }>;
  budget?: number;
  customerRequirements?: string;
  projectName?: string;
}

const bomReviewHandler: TaskHandler = async (_taskId, input) => {
  const data = input as unknown as BomReviewInput;
  const db = await requireDb();

  // Mark processing
  await db.update(projectAgentReviews)
    .set({ status: "processing", updatedAt: new Date().toISOString() })
    .where(eq(projectAgentReviews.id, data.reviewId));

  let result: {
    verdict: string;
    confidence: number;
    findings: Array<{ severity: string; category: string; message: string; recommendation: string }>;
    narrative: string;
  };

  try {
    const llmResult = await invokeLLM({
      system: "You are a senior industrial equipment BOM reviewer. Analyze the BOM for completeness, cost reasonableness, and customer requirement alignment. Respond in JSON.",
      prompt: `Review this BOM for a cleaning machine project "${data.projectName || "Unknown"}":

BOM Items: ${JSON.stringify(data.bomItems || [])}
Budget: ¥${data.budget || 0}
Customer Requirements: ${data.customerRequirements || "None specified"}

Respond with this exact JSON structure:
{
  "verdict": "pass|fail|conditional",
  "confidence": <0-100>,
  "findings": [{"severity": "critical|error|warning|info", "category": "<string>", "message": "<string>", "recommendation": "<string>"}],
  "narrative": "<2-3 sentence summary>"
}`,
    });

    const content = llmResult.content || llmResult.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : bomReviewFallback(data);
  } catch {
    result = bomReviewFallback(data);
  }

  // Write result
  await db.update(projectAgentReviews)
    .set({
      status: "completed",
      verdict: result.verdict,
      confidence: result.confidence,
      findings: result.findings as any,
      narrative: result.narrative,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projectAgentReviews.id, data.reviewId));

  return { success: true, verdict: result.verdict };
};

function bomReviewFallback(data: BomReviewInput) {
  const items = data.bomItems || [];
  const totalCost = items.reduce((s, i) => s + (i.qty * i.unitCost), 0);
  const budget = data.budget || 0;
  const overBudget = budget > 0 && totalCost > budget;
  const costRatio = budget > 0 ? totalCost / budget : 0;
  const hasExplosionSpec = items.some(i => /防爆|explosion/i.test(i.spec || ""));

  const findings: Array<{ severity: string; category: string; message: string; recommendation: string }> = [];

  if (items.length === 0) {
    findings.push({ severity: "critical", category: "completeness", message: "BOM 为空，无法评审", recommendation: "请补充完整BOM清单" });
  }
  if (overBudget) {
    findings.push({
      severity: costRatio > 1.2 ? "error" : "warning",
      category: "cost",
      message: `BOM总成本 ¥${totalCost} 超出预算 ¥${budget} (${((costRatio - 1) * 100).toFixed(0)}%)`,
      recommendation: "审查高成本物料，考虑替代方案",
    });
  }
  if (!hasExplosionSpec && /防爆|explosion/i.test(data.customerRequirements || "")) {
    findings.push({ severity: "error", category: "compliance", message: "客户要求防爆但BOM中缺少防爆等级说明", recommendation: "补充防爆等级物料规格" });
  }
  if (items.length < 5) {
    findings.push({ severity: "warning", category: "completeness", message: `BOM仅含${items.length}项，可能不完整`, recommendation: "确认是否遗漏辅助物料" });
  }

  const hasCritical = findings.some(f => f.severity === "critical");
  const hasError = findings.some(f => f.severity === "error");
  const verdict = hasCritical ? "fail" : hasError ? "conditional" : "pass";
  const confidence = 65;

  return {
    verdict,
    confidence,
    findings,
    narrative: `算法评审：BOM共${items.length}项，总成本¥${totalCost}。${findings.length}条发现(${hasCritical ? "含关键问题" : hasError ? "含错误" : "无重大问题"})。`,
  };
}

// ══════════════════════════════════════════════════════════════
// Engine 2: PROJECT_DRAWING_REVIEW
// ══════════════════════════════════════════════════════════════

interface DrawingReviewInput {
  reviewId: number;
  drawingList?: Array<{ name: string; version: string; hasGDT: boolean; dimensions: number }>;
  designStandards?: string;
  projectName?: string;
}

const drawingReviewHandler: TaskHandler = async (_taskId, input) => {
  const data = input as unknown as DrawingReviewInput;
  const db = await requireDb();

  await db.update(projectAgentReviews)
    .set({ status: "processing", updatedAt: new Date().toISOString() })
    .where(eq(projectAgentReviews.id, data.reviewId));

  let result: {
    verdict: string;
    confidence: number;
    findings: Array<{ severity: string; category: string; message: string; recommendation: string }>;
    narrative: string;
  };

  try {
    const llmResult = await invokeLLM({
      system: "You are a senior mechanical design reviewer. Check drawings for dimension completeness, tolerance specs, GD&T compliance, and revision control. Respond in JSON.",
      prompt: `Review drawings for project "${data.projectName || "Unknown"}":

Drawings: ${JSON.stringify(data.drawingList || [])}
Design Standards: ${data.designStandards || "GB/T standard"}

Respond with this exact JSON structure:
{
  "verdict": "pass|fail|conditional",
  "confidence": <0-100>,
  "findings": [{"severity": "critical|error|warning|info", "category": "<string>", "message": "<string>", "recommendation": "<string>"}],
  "narrative": "<2-3 sentence summary>"
}`,
    });

    const content = llmResult.content || llmResult.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : drawingReviewFallback(data);
  } catch {
    result = drawingReviewFallback(data);
  }

  await db.update(projectAgentReviews)
    .set({
      status: "completed",
      verdict: result.verdict,
      confidence: result.confidence,
      findings: result.findings as any,
      narrative: result.narrative,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projectAgentReviews.id, data.reviewId));

  return { success: true, verdict: result.verdict };
};

function drawingReviewFallback(data: DrawingReviewInput) {
  const drawings = data.drawingList || [];
  const findings: Array<{ severity: string; category: string; message: string; recommendation: string }> = [];

  if (drawings.length === 0) {
    findings.push({ severity: "critical", category: "completeness", message: "无图纸提交", recommendation: "请提交设计图纸" });
  }

  const noGDT = drawings.filter(d => !d.hasGDT);
  if (noGDT.length > 0) {
    findings.push({
      severity: "error",
      category: "GD&T",
      message: `${noGDT.length}份图纸缺少GD&T标注: ${noGDT.map(d => d.name).join(", ")}`,
      recommendation: "按GB/T 1182添加形位公差标注",
    });
  }

  const lowDim = drawings.filter(d => d.dimensions < 10);
  if (lowDim.length > 0) {
    findings.push({
      severity: "warning",
      category: "dimension",
      message: `${lowDim.length}份图纸标注尺寸偏少(<10)`,
      recommendation: "检查是否遗漏关键尺寸",
    });
  }

  const oldVersions = drawings.filter(d => d.version < "B");
  if (oldVersions.length > 0) {
    findings.push({ severity: "info", category: "revision", message: `${oldVersions.length}份图纸为初版`, recommendation: "确认版本是否经过内部评审" });
  }

  const hasCritical = findings.some(f => f.severity === "critical");
  const hasError = findings.some(f => f.severity === "error");
  const verdict = hasCritical ? "fail" : hasError ? "conditional" : "pass";

  return {
    verdict,
    confidence: 60,
    findings,
    narrative: `算法评审：共${drawings.length}份图纸。${findings.length}条发现。${noGDT.length > 0 ? `${noGDT.length}份缺GD&T。` : ""}`,
  };
}

// ══════════════════════════════════════════════════════════════
// Engine 3: PROJECT_DELAY_PREDICTION
// ══════════════════════════════════════════════════════════════

interface DelayPredictionInput {
  reviewId: number;
  projectName?: string;
  currentPhase?: string;
  healthStatus?: string;
  budget?: number;
  actualCost?: number;
  completionPercent?: number;
  milestones?: Array<{ code: string; status: string; plannedDate?: string; actualDate?: string }>;
}

const delayPredictionHandler: TaskHandler = async (_taskId, input) => {
  const data = input as unknown as DelayPredictionInput;
  const db = await requireDb();

  await db.update(projectAgentReviews)
    .set({ status: "processing", updatedAt: new Date().toISOString() })
    .where(eq(projectAgentReviews.id, data.reviewId));

  let result: {
    verdict: string;
    confidence: number;
    riskScore: number;
    predictedDelay: number;
    riskFactors: Array<{ factor: string; weight: number; description: string }>;
    narrative: string;
  };

  try {
    const llmResult = await invokeLLM({
      system: "You are a project risk analyst. Predict delay risk based on milestone progress, budget utilization, and health indicators. Respond in JSON.",
      prompt: `Predict delay risk for project "${data.projectName || "Unknown"}":

Current Phase: ${data.currentPhase || "Unknown"}
Health Status: ${data.healthStatus || "unknown"}
Budget: ¥${data.budget || 0}, Actual Cost: ¥${data.actualCost || 0}
Completion: ${data.completionPercent || 0}%
Milestones: ${JSON.stringify(data.milestones || [])}

Respond with this exact JSON structure:
{
  "verdict": "on_track|at_risk",
  "confidence": <0-100>,
  "riskScore": <0-100>,
  "predictedDelay": <days>,
  "riskFactors": [{"factor": "<string>", "weight": <0-1>, "description": "<string>"}],
  "narrative": "<2-3 sentence summary>"
}`,
    });

    const content = llmResult.content || llmResult.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : delayPredictionFallback(data);
  } catch {
    result = delayPredictionFallback(data);
  }

  await db.update(projectAgentReviews)
    .set({
      status: "completed",
      verdict: result.verdict,
      confidence: result.confidence,
      riskScore: result.riskScore,
      predictedDelay: result.predictedDelay,
      riskFactors: result.riskFactors as any,
      narrative: result.narrative,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projectAgentReviews.id, data.reviewId));

  return { success: true, riskScore: result.riskScore };
};

function delayPredictionFallback(data: DelayPredictionInput) {
  const riskFactors: Array<{ factor: string; weight: number; description: string }> = [];
  let score = 0;

  // Factor 1: Health status
  const healthMap: Record<string, number> = { green: 0, yellow: 25, red: 50 };
  const healthScore = healthMap[data.healthStatus || "green"] ?? 15;
  if (healthScore > 0) {
    riskFactors.push({ factor: "健康状态", weight: 0.3, description: `项目健康状态: ${data.healthStatus || "unknown"}` });
  }
  score += healthScore * 0.3;

  // Factor 2: Budget utilization
  const budgetRatio = (data.budget && data.budget > 0) ? (data.actualCost || 0) / data.budget : 0;
  if (budgetRatio > 0.9) {
    riskFactors.push({ factor: "预算利用率", weight: 0.25, description: `已用${(budgetRatio * 100).toFixed(0)}%预算` });
    score += (budgetRatio > 1.1 ? 80 : budgetRatio > 1 ? 60 : 40) * 0.25;
  }

  // Factor 3: Milestone delays
  const milestones = data.milestones || [];
  const delayed = milestones.filter(m => {
    if (!m.plannedDate || m.status === "completed") return false;
    return new Date(m.plannedDate) < new Date();
  });
  if (delayed.length > 0) {
    const delayFraction = delayed.length / Math.max(milestones.length, 1);
    riskFactors.push({ factor: "里程碑延期", weight: 0.3, description: `${delayed.length}/${milestones.length}个里程碑已延期` });
    score += Math.min(delayFraction * 100, 80) * 0.3;
  }

  // Factor 4: Completion vs phase progress
  const phaseProgressMap: Record<string, number> = { M0: 0, M1: 8, M2: 15, M3: 25, M4: 35, M5: 50, M6: 60, M7: 70, M8: 80, M9: 85, M10: 90, M11: 95, M12: 100 };
  const expectedProgress = phaseProgressMap[data.currentPhase || "M0"] ?? 0;
  const actualProgress = data.completionPercent || 0;
  if (expectedProgress > 0 && actualProgress < expectedProgress * 0.7) {
    riskFactors.push({ factor: "进度滞后", weight: 0.15, description: `实际${actualProgress}% vs 预期${expectedProgress}%` });
    score += 60 * 0.15;
  }

  const riskScore = Math.round(Math.min(score, 100));
  const predictedDelay = riskScore > 70 ? Math.round(riskScore * 0.5) : riskScore > 40 ? Math.round(riskScore * 0.3) : 0;
  const verdict = riskScore > 50 ? "at_risk" : "on_track";

  return {
    verdict,
    confidence: 60,
    riskScore,
    predictedDelay,
    riskFactors,
    narrative: `算法预测：风险得分${riskScore}/100，预计延期${predictedDelay}天。${riskFactors.map(f => f.description).join("；")}。`,
  };
}

// ── Registration ─────────────────────────────────────────────

export function registerProjectAgentHandlers(): void {
  registerTaskHandler("PROJECT_BOM_REVIEW", bomReviewHandler);
  registerTaskHandler("PROJECT_DRAWING_REVIEW", drawingReviewHandler);
  registerTaskHandler("PROJECT_DELAY_PREDICTION", delayPredictionHandler);
}
