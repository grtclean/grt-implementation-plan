/**
 * Finance Agent Service — AI 费用审核拦截引擎
 *
 * Analyzes expense claims against BU budget targets and policy rules.
 * Pattern: LLM analysis + algorithmic fallback, registered as TaskHandler.
 */
import { registerTaskHandler, type TaskHandler } from "./task-worker.service";
import { invokeLLM } from "../_core/llm";
import { requireDb } from "../db";
import {
  expenseClaims,
  buSalesPlans,
  buSalesPlanDetails,
  aiTasks,
} from "../../drizzle/schema";
import { eq, and, sql, inArray, gte, lte } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("finance-agent-svc");

// ── Types ──────────────────────────────────────────────────────

export interface BuBudgetContext {
  buName: string;
  quarterTarget: number;
  quarterActual: number;
  completionPct: number;
  currentExpenseRatio: number;
  redLineRatio: number;
  projectedRatio: number;
}

export interface PolicyViolation {
  rule: string;
  detail: string;
  severity: "critical" | "warning";
}

export interface AiDiagnosticReport {
  decision: "pass" | "intercept" | "warn";
  score: number;
  interceptReason?: string;
  buContext: BuBudgetContext;
  diagnosis: string;
  recommendations: string[];
  policyViolations: PolicyViolation[];
  source: "llm" | "algorithmic";
}

// ── Policy Rules (hardcoded) ────────────────────────────────────

export const POLICY_RULES = [
  { id: "R001", name: "费用率红线", description: "事业部费用率不得超过产值的5%", threshold: 0.05, severity: "critical" as const },
  { id: "R002", name: "单笔上限", description: "单笔报销超过5万元需提前预审批", threshold: 50000, severity: "critical" as const },
  { id: "R003", name: "差旅标准", description: "差旅单笔不得超过2万元", threshold: 20000, severity: "warning" as const },
  { id: "R004", name: "餐费标准", description: "餐费不得超过200元/人/天", threshold: 200, severity: "warning" as const },
  { id: "R005", name: "设备采购标准", description: "设备采购单笔不超过1万元免预审", threshold: 10000, severity: "warning" as const },
];

// ── Helper: get current quarter boundaries ──────────────────────

function getCurrentQuarterBounds(): { start: string; end: string; quarter: number } {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1).toISOString().slice(0, 10);
  const endMonth = q * 3;
  const end = new Date(year, endMonth, 0).toISOString().slice(0, 10);
  return { start, end, quarter: q };
}

// ── Helper: fetch BU budget context ─────────────────────────────

export async function fetchBuBudgetContext(departmentId: number | null): Promise<BuBudgetContext> {
  const db = await requireDb();
  const { start, end, quarter } = getCurrentQuarterBounds();
  const year = new Date().getFullYear();

  // Default context when no budget data available
  const defaultCtx: BuBudgetContext = {
    buName: `部门${departmentId ?? "未知"}`,
    quarterTarget: 10_000_000,
    quarterActual: 7_000_000,
    completionPct: 70,
    currentExpenseRatio: 3.5,
    redLineRatio: 5,
    projectedRatio: 4.2,
  };

  try {
    // Try to find BU sales plan for this department
    const [plan] = await db
      .select()
      .from(buSalesPlans)
      .where(eq(buSalesPlans.year, year))
      .limit(1);

    if (!plan) return defaultCtx;

    // Get quarter detail
    const [detail] = await db
      .select()
      .from(buSalesPlanDetails)
      .where(
        and(
          eq(buSalesPlanDetails.buSalesPlanId, plan.id),
          eq(buSalesPlanDetails.periodType, "quarter"),
          eq(buSalesPlanDetails.periodValue, quarter),
        ),
      )
      .limit(1);

    const quarterTarget = detail?.outputTarget ? Number(detail.outputTarget) : defaultCtx.quarterTarget;

    // Sum approved expenses this quarter
    const [expenseSum] = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenseClaims.totalAmount}), 0)` })
      .from(expenseClaims)
      .where(
        and(
          inArray(expenseClaims.status, ["approved", "paid"]),
          gte(expenseClaims.createdAt, start),
          lte(expenseClaims.createdAt, end),
        ),
      );

    const approvedTotal = Number(expenseSum?.total ?? 0);
    const currentExpenseRatio = quarterTarget > 0 ? (approvedTotal / quarterTarget) * 100 : 0;
    const completionPct = detail?.salesTarget ? (Number(detail.salesTarget) / quarterTarget) * 100 : 70;

    return {
      buName: plan.departmentId ?? defaultCtx.buName,
      quarterTarget,
      quarterActual: Number(detail?.salesTarget ?? quarterTarget * 0.7),
      completionPct: Math.round(completionPct),
      currentExpenseRatio: Math.round(currentExpenseRatio * 100) / 100,
      redLineRatio: 5,
      projectedRatio: Math.round((currentExpenseRatio * 1.2) * 100) / 100,
    };
  } catch {
    return defaultCtx;
  }
}

// ── Policy check ────────────────────────────────────────────────

function checkPolicyViolations(
  amount: number,
  claimType: string,
  buContext: BuBudgetContext,
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  // R001: Expense ratio exceeds 5% red line
  if (buContext.projectedRatio > 5) {
    violations.push({
      rule: "R001",
      detail: `费用率达${buContext.projectedRatio}%, 超出5%红线`,
      severity: "critical",
    });
  }

  // R002: Single claim > 50k
  if (amount > 50000) {
    violations.push({
      rule: "R002",
      detail: `单笔金额${amount.toLocaleString()}元, 超出5万元预审批线`,
      severity: "critical",
    });
  }

  // R003: Travel > 20k
  if (claimType === "travel" && amount > 20000) {
    violations.push({
      rule: "R003",
      detail: `差旅报销${amount.toLocaleString()}元, 超出2万元标准`,
      severity: "warning",
    });
  }

  // R004: Meal > 200/person/day (approximate check: > 2000 total)
  if (claimType === "meal" && amount > 2000) {
    violations.push({
      rule: "R004",
      detail: `餐费总额${amount.toLocaleString()}元, 可能超出200元/人/天标准`,
      severity: "warning",
    });
  }

  // R005: Equipment > 10k
  if (claimType === "equipment" && amount > 10000) {
    violations.push({
      rule: "R005",
      detail: `设备采购${amount.toLocaleString()}元, 超出1万元免预审线`,
      severity: "warning",
    });
  }

  return violations;
}

// ── LLM Analysis ────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是GRT集团的Finance Agent AI财务审计专家。
审核费用报销申请，结合事业部预算目标和费用政策做出决策。

决策规则:
- 费用率超5%红线 → intercept
- 存在critical违规 → intercept
- 接近红线(4-5%) → warn
- 正常 → pass

评分规则: 基础100分, critical违规扣25分, warning违规扣10分, 费用率超标额外扣30分

返回严格JSON (无markdown):
{"decision":"pass|intercept|warn","score":75,"interceptReason":"...","diagnosis":"2-3句分析","recommendations":["建议1","建议2"]}`;

async function llmAnalyze(
  claim: { amount: number; type: string; title: string | null; description: string | null },
  buContext: BuBudgetContext,
  violations: PolicyViolation[],
): Promise<{ decision: "pass" | "intercept" | "warn"; score: number; interceptReason?: string; diagnosis: string; recommendations: string[] }> {
  const userPrompt = `报销信息:
- 金额: ${claim.amount}元
- 类型: ${claim.type}
- 标题: ${claim.title ?? "无"}
- 描述: ${claim.description ?? "无"}

事业部预算:
- BU: ${buContext.buName}
- 季度产值目标: ${buContext.quarterTarget.toLocaleString()}元
- 季度已完成: ${buContext.quarterActual.toLocaleString()}元 (${buContext.completionPct}%)
- 当前费用率: ${buContext.currentExpenseRatio}%
- 预计费用率: ${buContext.projectedRatio}%
- 红线: ${buContext.redLineRatio}%

已检测到的违规:
${violations.length > 0 ? violations.map(v => `- [${v.severity}] ${v.rule}: ${v.detail}`).join("\n") : "无"}

请给出审核决策。`;

  const result = await invokeLLM({ system: SYSTEM_PROMPT, prompt: userPrompt });
  const content = result.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM returned no JSON");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    decision: parsed.decision || "warn",
    score: typeof parsed.score === "number" ? parsed.score : 50,
    interceptReason: parsed.interceptReason,
    diagnosis: parsed.diagnosis || "AI分析完成",
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
  };
}

// ── Algorithmic Fallback ────────────────────────────────────────

function algorithmicFallback(
  claim: { amount: number; type: string },
  buContext: BuBudgetContext,
  violations: PolicyViolation[],
): { decision: "pass" | "intercept" | "warn"; score: number; interceptReason?: string; diagnosis: string; recommendations: string[] } {
  let score = 100;
  let decision = "pass" as "pass" | "intercept" | "warn";
  let interceptReason: string | undefined;
  const recommendations: string[] = [];

  // Expense ratio check
  if (buContext.projectedRatio > 5) {
    score -= 30;
    decision = "intercept";
    interceptReason = `费用率达${buContext.projectedRatio}%, 超出5%红线`;
    recommendations.push("请先提供订单转化证明补充附件");
    recommendations.push("建议将此申请拆分为两期提交");
  } else if (buContext.projectedRatio > 4) {
    score -= 15;
    decision = "warn";
    recommendations.push("费用率接近红线, 建议控制后续支出");
  }

  // Per-violation deductions
  for (const v of violations) {
    if (v.severity === "critical") {
      score -= 25;
      decision = "intercept";
      if (!interceptReason) interceptReason = v.detail;
    } else {
      score -= 10;
      if (decision !== "intercept") decision = "warn";
    }
  }

  // Category-specific checks
  if (claim.type === "travel" && claim.amount > 20000) {
    recommendations.push("差旅费用较高, 建议选择经济型出行方案");
  }
  if (claim.type === "equipment" && claim.amount > 10000) {
    recommendations.push("设备采购建议走集中采购流程以获得优惠");
  }

  score = Math.max(0, Math.min(100, score));

  const diagnosis = decision === "intercept"
    ? `当前${buContext.buName}Q${getCurrentQuarterBounds().quarter}产值仅完成${buContext.completionPct}%, 费用率${buContext.projectedRatio}%已超出管控红线。经营能力评测需加强费用管控意识。`
    : decision === "warn"
    ? `费用申请基本合规, 但${buContext.buName}费用率${buContext.projectedRatio}%接近5%红线, 请注意后续费用控制。`
    : `费用申请合规, ${buContext.buName}费用率${buContext.currentExpenseRatio}%处于健康范围。`;

  return { decision, score, interceptReason, diagnosis, recommendations };
}

// ── Main Analysis Function ──────────────────────────────────────

export async function analyzeExpenseClaim(
  taskId: number,
  input: Record<string, unknown>,
): Promise<AiDiagnosticReport> {
  const db = await requireDb();
  const claimId = input.claimId as number;

  // 1. Read expense claim
  const [claim] = await db
    .select()
    .from(expenseClaims)
    .where(eq(expenseClaims.id, claimId));

  if (!claim) throw new Error(`Expense claim ${claimId} not found`);

  const amount = Number(claim.totalAmount);
  const claimType = claim.claimType ?? "other";

  // 2. Fetch BU budget context
  const buContext = await fetchBuBudgetContext(claim.departmentId);

  // 3. Check policy violations
  const policyViolations = checkPolicyViolations(amount, claimType, buContext);

  // 4. Try LLM, fallback to algorithmic
  let analysisResult: { decision: "pass" | "intercept" | "warn"; score: number; interceptReason?: string; diagnosis: string; recommendations: string[] };
  let source: "llm" | "algorithmic" = "llm";

  try {
    analysisResult = await llmAnalyze(
      { amount, type: claimType, title: claim.claimTitle, description: claim.description },
      buContext,
      policyViolations,
    );
  } catch (err) {
    log.warn({ err: err }, "[Finance Agent] LLM failed, falling back to algorithmic:");
    source = "algorithmic";
    analysisResult = algorithmicFallback({ amount, type: claimType }, buContext, policyViolations);
  }

  // 5. Build full report
  const report: AiDiagnosticReport = {
    ...analysisResult,
    buContext,
    policyViolations,
    source,
  };

  // 6. Write results to expense_claims
  const newStatus = report.decision === "intercept" ? "ai_reviewing" : "pending_review";
  await db
    .update(expenseClaims)
    .set({
      aiAuditResult: report,
      aiAuditScore: report.score,
      aiAuditFlags: JSON.stringify(policyViolations.map(v => v.rule)),
      requiresManualReview: report.decision === "intercept" ? 1 : 0,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(expenseClaims.id, claimId));

  return report;
}

// ── Task Handler ────────────────────────────────────────────────

const financeAgentHandler: TaskHandler = async (taskId, input) => {
  const report = await analyzeExpenseClaim(taskId, input);
  return report as unknown as Record<string, unknown>;
};

export function registerFinanceAgentHandler(): void {
  registerTaskHandler("FINANCE_AGENT_REVIEW", financeAgentHandler);
}
