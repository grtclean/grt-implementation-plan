/**
 * Payroll Agent Service — orchestrates payroll notifications with AI-powered performance summaries
 * v2.0.0 — 6 capabilities: calculate, summarize, compose email, send, status, orchestrate
 *
 * Function signatures support BOTH the service's native pattern AND the router's calling pattern:
 *   - generatePerformanceSummary(params) — raw PerfSummaryInput
 *   - generatePerformanceSummary(cycleId, employeeName, additionalContext?) — DB-lookup overload
 *   - composeSalaryNotification(params) — raw SalaryNotificationInput
 *   - composeSalaryNotification(cycleId, employeeName, perfSummary) — DB-lookup overload
 *   - orchestratePayrollNotifications(cycleId, options) — positional
 *   - orchestratePayrollNotifications({ cycleId, ...options }) — single-object
 *   - getAgentStatus(cycleId) — service pattern
 *   - getAgentStatus(db, cycleId) — router pattern (db ignored, uses requireDb())
 *   - executePayrollCalculation(cycleId) — NEW full pipeline
 */

import { requireDb } from "../db";
import { eq, and, lte, gte, or, isNull, desc } from "drizzle-orm";
import { invokeLLMWithProvider } from "../_core/llm";
import { sendEmail, generateHtmlEmail } from "./email.service";
import type { EmailMessage } from "./email.service";
import { createChildLogger } from "../lib/logger";
import {
  calculateEmployee, detectAnomalies, y2c, c2y,
  type RegulatoryParams, type EmployeeCalcInput,
} from "./payroll-sandbox-calc.service";
import {
  payrollSandboxCycles, psCalcResult, psFinalResult,
  psPerformanceInput, psAttendanceInput, psSocialFundInput,
  psAllowanceInput, psTaxSnapshot,
} from "../../drizzle/payroll-sandbox-schema";
import { psPerfReview, psPerfEvidence, psAnomaly, psSocialFundPolicy } from "../../drizzle/perf-evidence-schema";
import { salaryStructures } from "../../drizzle/smart-payroll-schema";
import { hrmEmployees } from "../../drizzle/schema";
import { taskNotifications } from "../../drizzle/schema";

const log = createChildLogger("payroll-agent");

// ── Interfaces ──────────────────────────────────────────────
export interface PerfSummaryInput {
  employeeName: string;
  department: string;
  position: string;
  period: string;
  monthlyScore: number;
  avg2024: number;
  avg2025: number;
  perfCoeff1: number;
  perfCoeff2: number;
  perfCoeff3: number;
  supervisorComment?: string;
  aiSuggestReason?: string;
  evidenceSummary?: string[];
  attendanceDays?: number;
  scheduledDays?: number;
  personalLeaveHours?: number;
  sickLeaveHours?: number;
  overtimeHours?: number;
}
export interface PerfSummaryOutput {
  monthlySummary: string;
  strengths: string[];
  improvements: string[];
  nextMonthGoals: string[];
  overallTone: "excellent" | "good" | "needs_improvement" | "warning";
}

/** Extended output returned by the DB-lookup overload (adds goals alias + perfScore) */
export interface PerfSummaryOutputExtended extends PerfSummaryOutput {
  goals: string[];       // alias for nextMonthGoals (router expects .goals)
  perfScore: number;     // the raw monthlyScore from DB
}

export interface SalaryNotificationInput {
  employeeName: string;
  email: string;
  department: string;
  position: string;
  period: string;
  periodLabel: string;
  comprehensiveSalary: string;
  perfWage1: string;
  perfWage2: string;
  perfWage3: string;
  perfAdjustment: string;
  personalLeaveDeduction: string;
  sickLeaveDeduction: string;
  overtimePay: string;
  cashSubsidy: string;
  travelCarSubsidy: string;
  perfectAttendanceBonus: string;
  grossPay: string;
  socialInsurance: string;
  housingFund: string;
  incomeTax: string;
  netPay: string;
  perfSummary: PerfSummaryOutput;
}
export interface SalaryNotificationOutput {
  to: string;
  subject: string;
  html: string;
}
export interface OrchestrationResult {
  cycleId: number;
  period: string;
  totalEmployees: number;
  summariesGenerated: number;
  emailsComposed: number;
  emailsSent: number;
  emailsFailed: number;
  errors: Array<{ employeeName: string; error: string }>;
  dryRun: boolean;
}
export interface AgentStatus {
  cycleId: number;
  period: string;
  cycleStatus: string;
  totalEmployees: number;
  employeesWithEmail: number;
  employeesWithPerf: number;
  employeesWithAttendance: number;
  canSendNotifications: boolean;
  canCalculate: boolean;
  calculatedAt?: string;
  lastRunAt?: string;
  lastRunResult?: Partial<OrchestrationResult>;
}
export interface CalculationResult {
  cycleId: number;
  period: string;
  employeesCalculated: number;
  anomaliesDetected: number;
  totalGrossPay: string;
  totalNetPay: string;
  totalTax: string;
  duration: number; // ms
}

// ── 1. Generate Performance Summary (AI) ────────────────────

/**
 * Overload 1: Raw PerfSummaryInput
 * Overload 2: DB-lookup by cycleId + employeeName (returns extended output with .goals + .perfScore)
 */
export async function generatePerformanceSummary(
  params: PerfSummaryInput,
): Promise<PerfSummaryOutput>;
export async function generatePerformanceSummary(
  cycleId: number,
  employeeName: string,
  additionalContext?: string,
): Promise<PerfSummaryOutputExtended | null>;
export async function generatePerformanceSummary(
  paramsOrCycleId: PerfSummaryInput | number,
  employeeName?: string,
  additionalContext?: string,
): Promise<PerfSummaryOutput | PerfSummaryOutputExtended | null> {
  // Overload 2: DB-lookup pattern
  if (typeof paramsOrCycleId === "number") {
    const cycleId = paramsOrCycleId;
    const name = employeeName!;
    const db = await requireDb();

    // Load cycle
    const [cycle] = await db.select().from(payrollSandboxCycles)
      .where(eq(payrollSandboxCycles.id, cycleId)).limit(1);
    if (!cycle) {
      log.warn({ cycleId }, "Cycle not found for perf summary");
      return null;
    }

    // Load calc result for this employee
    const [calc] = await db.select().from(psCalcResult)
      .where(and(eq(psCalcResult.cycleId, cycleId), eq(psCalcResult.employeeName, name)))
      .limit(1);

    // Load perf input
    const [perfInput] = await db.select().from(psPerformanceInput)
      .where(and(eq(psPerformanceInput.cycleId, cycleId), eq(psPerformanceInput.employeeName, name)))
      .limit(1);

    // Load attendance
    const [attendance] = await db.select().from(psAttendanceInput)
      .where(and(eq(psAttendanceInput.cycleId, cycleId), eq(psAttendanceInput.employeeName, name)))
      .limit(1);

    // Load review + evidence
    const [review] = await db.select().from(psPerfReview)
      .where(and(eq(psPerfReview.cycleId, cycleId), eq(psPerfReview.employeeName, name)))
      .limit(1);
    const evidences = await db.select().from(psPerfEvidence)
      .where(and(eq(psPerfEvidence.cycleId, cycleId), eq(psPerfEvidence.employeeName, name)))
      .limit(100);

    if (!calc && !perfInput) {
      log.warn({ cycleId, employee: name }, "No calc/perf data found for employee");
      return null;
    }

    const monthlyScore = parseFloat(perfInput?.monthlyScore ?? "0");

    const totalOtHours = calc
      ? parseFloat(calc.weekdayOvertimeHours ?? "0")
        + parseFloat(calc.weekendOvertimeHours ?? "0")
        + parseFloat(calc.holidayOvertimeHours ?? "0")
      : 0;

    const summaryInput: PerfSummaryInput = {
      employeeName: name,
      department: calc?.department ?? perfInput?.department ?? "",
      position: perfInput?.position ?? "",
      period: cycle.period,
      monthlyScore,
      avg2024: parseFloat(perfInput?.avg2024Score ?? "0"),
      avg2025: parseFloat(perfInput?.avg2025Score ?? "0"),
      perfCoeff1: parseFloat(calc?.perfCoeff1 ?? "0"),
      perfCoeff2: parseFloat(calc?.perfCoeff2 ?? "0"),
      perfCoeff3: parseFloat(calc?.perfCoeff3 ?? "0"),
      supervisorComment: review?.supervisorComment ?? undefined,
      aiSuggestReason: review?.aiSuggestReason ?? (additionalContext || undefined),
      evidenceSummary: evidences.length ? evidences.map((e) => e.title) : undefined,
      attendanceDays: attendance ? parseFloat(attendance.actualAttendance ?? "0") : undefined,
      scheduledDays: attendance?.scheduledDays ?? undefined,
      personalLeaveHours: calc ? (parseFloat(calc.personalLeaveHours ?? "0") || undefined) : undefined,
      sickLeaveHours: calc ? (parseFloat(calc.sickLeaveHours ?? "0") || undefined) : undefined,
      overtimeHours: totalOtHours || undefined,
    };

    const baseSummary = await generatePerformanceSummaryCore(summaryInput);

    // Extend with .goals alias and .perfScore
    return {
      ...baseSummary,
      goals: baseSummary.nextMonthGoals,
      perfScore: monthlyScore,
    };
  }

  // Overload 1: Raw PerfSummaryInput
  return generatePerformanceSummaryCore(paramsOrCycleId);
}

/** Core AI summary generator (always called internally) */
async function generatePerformanceSummaryCore(
  params: PerfSummaryInput,
): Promise<PerfSummaryOutput> {
  const systemPrompt = `You are GRT's HR performance analyst. Generate a concise monthly performance summary in Chinese for an employee. Be constructive, specific, and professional. Output ONLY valid JSON with fields: monthlySummary (string, 2-3 sentences), strengths (string[], 2-3 items), improvements (string[], 1-3 items), nextMonthGoals (string[], 3-5 specific measurable goals), overallTone ("excellent"|"good"|"needs_improvement"|"warning").`;

  const userPrompt = `员工: ${params.employeeName}
部门: ${params.department} | 岗位: ${params.position}
考核周期: ${params.period}
本月得分: ${params.monthlyScore} | 2024均分: ${params.avg2024} | 2025均分: ${params.avg2025}
绩效系数: 系数1=${params.perfCoeff1}, 系数2=${params.perfCoeff2}, 系数3=${params.perfCoeff3}
${params.supervisorComment ? `主管评语: ${params.supervisorComment}` : ""}
${params.aiSuggestReason ? `AI建议理由: ${params.aiSuggestReason}` : ""}
${params.evidenceSummary?.length ? `绩效证据: ${params.evidenceSummary.join("; ")}` : ""}
${params.attendanceDays != null ? `出勤: ${params.attendanceDays}/${params.scheduledDays ?? "?"}天` : ""}
${params.personalLeaveHours ? `事假: ${params.personalLeaveHours}h` : ""}${params.sickLeaveHours ? ` 病假: ${params.sickLeaveHours}h` : ""}${params.overtimeHours ? ` 加班: ${params.overtimeHours}h` : ""}`;

  try {
    log.info({ employee: params.employeeName, period: params.period }, "Invoking AI for performance summary");
    const result = await invokeLLMWithProvider({
      provider: "gemini",
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 2048,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");
    const parsed = JSON.parse(jsonMatch[0]) as PerfSummaryOutput;

    // Validate required fields
    if (!parsed.monthlySummary || !Array.isArray(parsed.strengths)) {
      throw new Error("AI response missing required fields");
    }

    const validTones = ["excellent", "good", "needs_improvement", "warning"] as const;
    if (!validTones.includes(parsed.overallTone as typeof validTones[number])) {
      parsed.overallTone = params.monthlyScore >= 85 ? "excellent" : params.monthlyScore >= 70 ? "good" : "needs_improvement";
    }

    log.info({ employee: params.employeeName, tone: parsed.overallTone }, "AI summary generated");
    return parsed;
  } catch (err) {
    log.warn({ employee: params.employeeName, error: (err as Error).message }, "AI summary failed, using fallback");
    return buildFallbackSummary(params);
  }
}

function buildFallbackSummary(params: PerfSummaryInput): PerfSummaryOutput {
  const score = params.monthlyScore;
  const tone: PerfSummaryOutput["overallTone"] =
    score >= 90 ? "excellent" : score >= 75 ? "good" : score >= 60 ? "needs_improvement" : "warning";

  return {
    monthlySummary: `${params.employeeName}在${params.period}周期内绩效得分为${score}分。` +
      (score >= 75 ? "整体表现良好，达到岗位预期。" : "部分指标有待提升，建议加强关注。"),
    strengths: [
      params.perfCoeff1 >= 1 ? "绩效工资1系数达标，核心工作完成度好" : "按时出勤，遵守公司制度",
      params.evidenceSummary?.length ? `提交了${params.evidenceSummary.length}项绩效证据` : "积极配合团队工作",
    ],
    improvements: score < 75
      ? ["建议提升月度绩效得分至部门平均水平以上", "加强与主管的绩效沟通频率"]
      : ["继续保持当前工作质量，争取更高绩效等级"],
    nextMonthGoals: [
      `绩效得分目标: ≥${Math.max(score + 3, 75)}分`,
      "完成至少2项可量化的绩效证据提交",
      "参加1次部门技能培训或分享会",
    ],
    overallTone: tone,
  };
}

// ── 2. Compose Salary Notification Email ────────────────────

/**
 * Overload 1: Raw SalaryNotificationInput
 * Overload 2: DB-lookup by cycleId + employeeName + perfSummary
 */
export function composeSalaryNotification(
  params: SalaryNotificationInput,
): SalaryNotificationOutput;
export async function composeSalaryNotification(
  cycleId: number,
  employeeName: string,
  perfSummary: PerfSummaryOutput | PerfSummaryOutputExtended,
): Promise<SalaryNotificationOutput>;
export function composeSalaryNotification(
  paramsOrCycleId: SalaryNotificationInput | number,
  employeeName?: string,
  perfSummaryArg?: PerfSummaryOutput | PerfSummaryOutputExtended,
): SalaryNotificationOutput | Promise<SalaryNotificationOutput> {
  // Overload 2: DB-lookup pattern
  if (typeof paramsOrCycleId === "number") {
    return composeSalaryNotificationFromDb(paramsOrCycleId, employeeName!, perfSummaryArg!);
  }

  // Overload 1: Raw SalaryNotificationInput
  return composeSalaryNotificationCore(paramsOrCycleId);
}

/** DB-lookup composer: loads calc result + employee email, then delegates to core */
async function composeSalaryNotificationFromDb(
  cycleId: number,
  employeeName: string,
  perfSummary: PerfSummaryOutput,
): Promise<SalaryNotificationOutput> {
  const db = await requireDb();

  const [cycle] = await db.select().from(payrollSandboxCycles)
    .where(eq(payrollSandboxCycles.id, cycleId)).limit(1);
  if (!cycle) throw new Error(`Cycle ${cycleId} not found`);

  const [calc] = await db.select().from(psCalcResult)
    .where(and(eq(psCalcResult.cycleId, cycleId), eq(psCalcResult.employeeName, employeeName)))
    .limit(1);
  if (!calc) throw new Error(`No calc result for "${employeeName}" in cycle ${cycleId}`);

  const [perfInput] = await db.select().from(psPerformanceInput)
    .where(and(eq(psPerformanceInput.cycleId, cycleId), eq(psPerformanceInput.employeeName, employeeName)))
    .limit(1);

  // Get employee email
  const employees = await db.select({ name: hrmEmployees.name, email: hrmEmployees.email })
    .from(hrmEmployees).limit(500);
  const empInfo = employees.find((e) => e.name === employeeName);
  const email = empInfo?.email ?? "";

  const period = cycle.period;
  const periodLabel = `${period.slice(0, 4)}年${parseInt(period.slice(5), 10)}月`;

  const totalOtPay = (parseFloat(calc.weekdayOvertimePay ?? "0")
    + parseFloat(calc.weekendOvertimePay ?? "0")
    + parseFloat(calc.holidayOvertimePay ?? "0")).toFixed(2);

  const emailInput: SalaryNotificationInput = {
    employeeName,
    email,
    department: calc.department ?? "",
    position: perfInput?.position ?? "",
    period,
    periodLabel,
    comprehensiveSalary: calc.comprehensiveSalary ?? "0",
    perfWage1: calc.perfWage1 ?? "0",
    perfWage2: calc.perfWage2 ?? "0",
    perfWage3: calc.perfWage3 ?? "0",
    perfAdjustment: calc.perfAdjustment ?? "0",
    personalLeaveDeduction: calc.personalLeaveDeduction ?? "0",
    sickLeaveDeduction: calc.sickLeaveDeduction ?? "0",
    overtimePay: totalOtPay,
    cashSubsidy: calc.cashSubsidy ?? "0",
    travelCarSubsidy: calc.travelCarSubsidy ?? "0",
    perfectAttendanceBonus: calc.perfectAttendanceBonus ?? "0",
    grossPay: calc.grossPay ?? "0",
    socialInsurance: calc.socialInsurance ?? "0",
    housingFund: calc.housingFund ?? "0",
    incomeTax: calc.incomeTax ?? "0",
    netPay: calc.netPay ?? "0",
    perfSummary,
  };

  return composeSalaryNotificationCore(emailInput);
}

/** Core email composer (shared by both overloads) */
function composeSalaryNotificationCore(
  params: SalaryNotificationInput,
): SalaryNotificationOutput {
  const { perfSummary } = params;

  const strengthsList = perfSummary.strengths.map((s) => `• ${s}`).join("<br/>");
  const improvementsList = perfSummary.improvements.map((s) => `• ${s}`).join("<br/>");
  const goalsList = perfSummary.nextMonthGoals.map((g, i) => `${i + 1}. ${g}`).join("<br/>");

  const contentHtml = `
<table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse; font-size:14px; color:#333;">
  <tr><td colspan="4" style="background:#f97316; color:#fff; font-size:16px; font-weight:bold; padding:12px;">══ 薪资明细 ══</td></tr>
  <tr style="background:#fafafa;"><td style="padding:8px;">综合工资</td><td colspan="3" style="padding:8px; font-weight:bold;">¥${params.comprehensiveSalary}</td></tr>
  <tr><td style="padding:8px;">绩效工资1</td><td style="padding:8px;">¥${params.perfWage1}</td><td style="padding:8px;">绩效工资2</td><td style="padding:8px;">¥${params.perfWage2}</td></tr>
  <tr style="background:#fafafa;"><td style="padding:8px;">绩效工资3</td><td style="padding:8px;">¥${params.perfWage3}</td><td style="padding:8px;">绩效调整</td><td style="padding:8px;">¥${params.perfAdjustment}</td></tr>
  <tr><td style="padding:8px;">事假扣款</td><td style="padding:8px;">-¥${params.personalLeaveDeduction}</td><td style="padding:8px;">病假扣款</td><td style="padding:8px;">-¥${params.sickLeaveDeduction}</td></tr>
  <tr style="background:#fafafa;"><td style="padding:8px;">加班费</td><td style="padding:8px;">+¥${params.overtimePay}</td><td style="padding:8px;">全勤奖</td><td style="padding:8px;">¥${params.perfectAttendanceBonus}</td></tr>
  <tr><td style="padding:8px;">现金补贴</td><td style="padding:8px;">¥${params.cashSubsidy}</td><td style="padding:8px;">出差车补</td><td style="padding:8px;">¥${params.travelCarSubsidy}</td></tr>
  <tr><td colspan="4" style="border-top:2px solid #e5e7eb; padding:8px;"></td></tr>
  <tr style="background:#fff7ed;"><td style="padding:8px; font-weight:bold;">应发合计</td><td colspan="3" style="padding:8px; font-weight:bold; font-size:15px;">¥${params.grossPay}</td></tr>
  <tr><td style="padding:8px;">社保(个人)</td><td style="padding:8px;">-¥${params.socialInsurance}</td><td style="padding:8px;">公积金(个人)</td><td style="padding:8px;">-¥${params.housingFund}</td></tr>
  <tr style="background:#fafafa;"><td style="padding:8px;">个人所得税</td><td colspan="3" style="padding:8px;">-¥${params.incomeTax}</td></tr>
  <tr style="background:#f97316; color:#fff;"><td style="padding:12px; font-weight:bold; font-size:16px;">实发工资</td><td colspan="3" style="padding:12px; font-weight:bold; font-size:18px;">¥${params.netPay}</td></tr>
</table>

<div style="margin-top:24px;">
  <h3 style="color:#f97316; border-bottom:2px solid #f97316; padding-bottom:6px;">══ 本月绩效总结 ══</h3>
  <p style="line-height:1.8;">${perfSummary.monthlySummary}</p>
  <p style="margin-top:12px;"><strong>亮点:</strong><br/>${strengthsList}</p>
  <p style="margin-top:8px;"><strong>待改进:</strong><br/>${improvementsList}</p>
</div>

<div style="margin-top:20px;">
  <h3 style="color:#f97316; border-bottom:2px solid #f97316; padding-bottom:6px;">══ 下月工作目标 ══</h3>
  <p style="line-height:2;">${goalsList}</p>
</div>`;

  const html = generateHtmlEmail({
    title: `GRT薪资通知 - ${params.periodLabel}`,
    greeting: `尊敬的 ${params.employeeName}：<br/>您的 ${params.periodLabel} 薪资已结算，以下为详细信息：`,
    content: contentHtml,
    footer: "此邮件由GRT薪酬系统自动发送，如有疑问请联系人力资源部。",
  });

  return {
    to: params.email,
    subject: `GRT薪资通知 - ${params.periodLabel} | ${params.employeeName}`,
    html,
  };
}

// ── 3. Orchestrate Payroll Notifications ────────────────────

/**
 * Accepts EITHER positional args OR a single-object:
 *   orchestratePayrollNotifications(cycleId, { dryRun, ... })
 *   orchestratePayrollNotifications({ cycleId, dryRun, ... })
 */
export async function orchestratePayrollNotifications(
  cycleIdOrObj: number | {
    cycleId: number;
    dryRun?: boolean;
    includeGoals?: boolean;
    employeeFilter?: string[];
  },
  options?: {
    dryRun?: boolean;
    includeGoals?: boolean;
    employeeFilter?: string[];
  },
): Promise<OrchestrationResult> {
  // Normalize arguments
  let cycleId: number;
  let dryRun: boolean;
  let includeGoals: boolean;
  let employeeFilter: string[] | undefined;

  if (typeof cycleIdOrObj === "object") {
    // Single-object pattern: { cycleId, dryRun, ... }
    cycleId = cycleIdOrObj.cycleId;
    dryRun = cycleIdOrObj.dryRun ?? false;
    includeGoals = cycleIdOrObj.includeGoals ?? true;
    employeeFilter = cycleIdOrObj.employeeFilter;
  } else {
    // Positional pattern: (cycleId, options)
    cycleId = cycleIdOrObj;
    dryRun = options?.dryRun ?? false;
    includeGoals = options?.includeGoals ?? true;
    employeeFilter = options?.employeeFilter;
  }

  const db = await requireDb();

  log.info({ cycleId, dryRun, employeeFilter }, "Starting payroll notification orchestration");

  // 1. Load & verify cycle
  const [cycle] = await db.select().from(payrollSandboxCycles).where(eq(payrollSandboxCycles.id, cycleId)).limit(1);
  if (!cycle) throw new Error(`Cycle ${cycleId} not found`);

  const validStatuses = ["calculated", "reviewing", "approved", "locked"];
  if (!validStatuses.includes(cycle.status)) {
    throw new Error(`Cycle ${cycleId} status "${cycle.status}" is not sendable (need: ${validStatuses.join("/")})`);
  }

  const period = cycle.period;
  const periodLabel = `${period.slice(0, 4)}年${parseInt(period.slice(5), 10)}月`;

  // 2-6. Load all data
  const calcResults = await db.select().from(psCalcResult).where(eq(psCalcResult.cycleId, cycleId)).limit(500);
  const perfInputs = await db.select().from(psPerformanceInput).where(eq(psPerformanceInput.cycleId, cycleId)).limit(500);
  const perfReviews = await db.select().from(psPerfReview).where(eq(psPerfReview.cycleId, cycleId)).limit(500);
  const perfEvidences = await db.select().from(psPerfEvidence).where(eq(psPerfEvidence.cycleId, cycleId)).limit(2000);
  const attendances = await db.select().from(psAttendanceInput).where(eq(psAttendanceInput.cycleId, cycleId)).limit(500);

  // 7. Build name→email map from hrmEmployees
  const employees = await db.select({ name: hrmEmployees.name, email: hrmEmployees.email, id: hrmEmployees.id })
    .from(hrmEmployees).limit(500);
  const nameEmailMap = new Map<string, { email: string | null; id: number }>();
  for (const emp of employees) {
    nameEmailMap.set(emp.name, { email: emp.email, id: emp.id });
  }

  // Build lookup maps
  const perfInputMap = new Map(perfInputs.map((p) => [p.employeeName, p]));
  const reviewMap = new Map(perfReviews.map((r) => [r.employeeName, r]));
  const attendanceMap = new Map(attendances.map((a) => [a.employeeName, a]));
  const evidenceMap = new Map<string, typeof perfEvidences>();
  for (const ev of perfEvidences) {
    const list = evidenceMap.get(ev.employeeName) ?? [];
    list.push(ev);
    evidenceMap.set(ev.employeeName, list);
  }

  // Filter employees if specified
  const targetResults = employeeFilter
    ? calcResults.filter((r) => employeeFilter!.includes(r.employeeName))
    : calcResults;

  const result: OrchestrationResult = {
    cycleId, period, totalEmployees: targetResults.length,
    summariesGenerated: 0, emailsComposed: 0, emailsSent: 0, emailsFailed: 0,
    errors: [], dryRun,
  };

  // 8. Process each employee sequentially
  for (const calc of targetResults) {
    const empName = calc.employeeName;
    try {
      const empInfo = nameEmailMap.get(empName);
      if (!empInfo?.email) {
        log.warn({ employee: empName }, "No email found, skipping");
        result.errors.push({ employeeName: empName, error: "no_email" });
        continue;
      }

      const perfInput = perfInputMap.get(empName);
      const review = reviewMap.get(empName);
      const attendance = attendanceMap.get(empName);
      const evidences = evidenceMap.get(empName) ?? [];

      // a. Build PerfSummaryInput
      const totalOtHours = parseFloat(calc.weekdayOvertimeHours ?? "0")
        + parseFloat(calc.weekendOvertimeHours ?? "0")
        + parseFloat(calc.holidayOvertimeHours ?? "0");

      const summaryInput: PerfSummaryInput = {
        employeeName: empName,
        department: calc.department ?? "",
        position: perfInput?.position ?? "",
        period,
        monthlyScore: parseFloat(perfInput?.monthlyScore ?? "0"),
        avg2024: parseFloat(perfInput?.avg2024Score ?? "0"),
        avg2025: parseFloat(perfInput?.avg2025Score ?? "0"),
        perfCoeff1: parseFloat(calc.perfCoeff1 ?? "0"),
        perfCoeff2: parseFloat(calc.perfCoeff2 ?? "0"),
        perfCoeff3: parseFloat(calc.perfCoeff3 ?? "0"),
        supervisorComment: review?.supervisorComment ?? undefined,
        aiSuggestReason: review?.aiSuggestReason ?? undefined,
        evidenceSummary: evidences.length ? evidences.map((e) => e.title) : undefined,
        attendanceDays: attendance ? parseFloat(attendance.actualAttendance ?? "0") : undefined,
        scheduledDays: attendance?.scheduledDays ?? undefined,
        personalLeaveHours: parseFloat(calc.personalLeaveHours ?? "0") || undefined,
        sickLeaveHours: parseFloat(calc.sickLeaveHours ?? "0") || undefined,
        overtimeHours: totalOtHours || undefined,
      };

      // b. Generate AI summary (use core directly to avoid DB re-lookup)
      const perfSummary = await generatePerformanceSummaryCore(summaryInput);
      result.summariesGenerated++;

      // Remove goals if not requested
      if (!includeGoals) perfSummary.nextMonthGoals = [];

      // c. Compose email
      const totalOtPay = (parseFloat(calc.weekdayOvertimePay ?? "0")
        + parseFloat(calc.weekendOvertimePay ?? "0")
        + parseFloat(calc.holidayOvertimePay ?? "0")).toFixed(2);

      const emailInput: SalaryNotificationInput = {
        employeeName: empName,
        email: empInfo.email,
        department: calc.department ?? "",
        position: perfInput?.position ?? "",
        period,
        periodLabel,
        comprehensiveSalary: calc.comprehensiveSalary ?? "0",
        perfWage1: calc.perfWage1 ?? "0",
        perfWage2: calc.perfWage2 ?? "0",
        perfWage3: calc.perfWage3 ?? "0",
        perfAdjustment: calc.perfAdjustment ?? "0",
        personalLeaveDeduction: calc.personalLeaveDeduction ?? "0",
        sickLeaveDeduction: calc.sickLeaveDeduction ?? "0",
        overtimePay: totalOtPay,
        cashSubsidy: calc.cashSubsidy ?? "0",
        travelCarSubsidy: calc.travelCarSubsidy ?? "0",
        perfectAttendanceBonus: calc.perfectAttendanceBonus ?? "0",
        grossPay: calc.grossPay ?? "0",
        socialInsurance: calc.socialInsurance ?? "0",
        housingFund: calc.housingFund ?? "0",
        incomeTax: calc.incomeTax ?? "0",
        netPay: calc.netPay ?? "0",
        perfSummary,
      };

      const notification = composeSalaryNotificationCore(emailInput);
      result.emailsComposed++;

      // d. Send or skip
      if (!dryRun) {
        try {
          const emailMsg: EmailMessage = { to: notification.to, subject: notification.subject, html: notification.html };
          const sendResult = await sendEmail(emailMsg);
          if (sendResult.success) {
            result.emailsSent++;
            log.info({ employee: empName, messageId: sendResult.messageId }, "Salary email sent");
          } else {
            result.emailsFailed++;
            result.errors.push({ employeeName: empName, error: sendResult.error ?? "send_failed" });
            log.error({ employee: empName, error: sendResult.error }, "Email send failed");
          }
        } catch (sendErr) {
          result.emailsFailed++;
          result.errors.push({ employeeName: empName, error: (sendErr as Error).message });
          log.error({ employee: empName, error: (sendErr as Error).message }, "Email send exception");
        }
      }

      // e. Insert notification record
      try {
        await db.insert(taskNotifications).values({
          notificationId: `payroll-${cycleId}-${empName}-${Date.now()}`,
          taskId: `payroll-cycle-${cycleId}`,
          recipientId: empInfo.id,
          channel: "email",
          subject: notification.subject,
          content: `薪资通知已${dryRun ? "生成(未发送)" : "发送"}: ${periodLabel}`,
          priority: "medium",
          sentAt: dryRun ? undefined : new Date().toISOString(),
          status: dryRun ? "pending" : "sent",
        });
      } catch (notifErr) {
        log.warn({ employee: empName, error: (notifErr as Error).message }, "Failed to insert notification record");
      }
    } catch (empErr) {
      result.errors.push({ employeeName: empName, error: (empErr as Error).message });
      log.error({ employee: empName, error: (empErr as Error).message }, "Employee processing failed");
    }
  }

  log.info({
    cycleId, period, total: result.totalEmployees,
    sent: result.emailsSent, failed: result.emailsFailed, dryRun,
  }, "Orchestration complete");

  return result;
}

// ── 4. Get Agent Status ─────────────────────────────────────

/**
 * Accepts EITHER:
 *   getAgentStatus(cycleId)         — service pattern
 *   getAgentStatus(db, cycleId)     — router pattern (db ignored)
 */
export async function getAgentStatus(cycleId: number): Promise<AgentStatus>;
export async function getAgentStatus(db: any, cycleId: number): Promise<AgentStatus>;
export async function getAgentStatus(
  dbOrCycleId: any,
  maybeCycleId?: number,
): Promise<AgentStatus> {
  // Normalize: if second arg is a number, first arg is db (ignored)
  const cycleId: number = typeof maybeCycleId === "number" ? maybeCycleId : dbOrCycleId;
  const db = await requireDb();

  const [cycle] = await db.select().from(payrollSandboxCycles).where(eq(payrollSandboxCycles.id, cycleId)).limit(1);
  if (!cycle) throw new Error(`Cycle ${cycleId} not found`);

  const calcResults = await db.select({ name: psCalcResult.employeeName })
    .from(psCalcResult).where(eq(psCalcResult.cycleId, cycleId)).limit(500);

  const perfInputs = await db.select({ name: psPerformanceInput.employeeName })
    .from(psPerformanceInput).where(eq(psPerformanceInput.cycleId, cycleId)).limit(500);

  const attendances = await db.select({ name: psAttendanceInput.employeeName })
    .from(psAttendanceInput).where(eq(psAttendanceInput.cycleId, cycleId)).limit(500);

  // Count employees with email
  const employeeNames = calcResults.map((r) => r.name);
  const employees = await db.select({ name: hrmEmployees.name, email: hrmEmployees.email })
    .from(hrmEmployees).limit(500);
  const withEmail = employees.filter((e) => e.email && employeeNames.includes(e.name));

  const perfNameSet = new Set(perfInputs.map((p) => p.name));
  const attNameSet = new Set(attendances.map((a) => a.name));

  const validSendStatuses = ["calculated", "reviewing", "approved", "locked"];
  const validCalcStatuses = ["draft", "ready"];

  return {
    cycleId,
    period: cycle.period,
    cycleStatus: cycle.status,
    totalEmployees: calcResults.length,
    employeesWithEmail: withEmail.length,
    employeesWithPerf: employeeNames.filter((n) => perfNameSet.has(n)).length,
    employeesWithAttendance: employeeNames.filter((n) => attNameSet.has(n)).length,
    canSendNotifications: validSendStatuses.includes(cycle.status) && withEmail.length > 0,
    canCalculate: validCalcStatuses.includes(cycle.status),
    calculatedAt: cycle.calculatedAt ?? undefined,
  };
}

// ── 5. Execute Payroll Calculation Pipeline ──────────────────

/**
 * Full payroll calculation pipeline — mirrors `calc.run` in payroll-sandbox.router.ts.
 *
 * Steps:
 *   1. Load cycle, mark as "calculating"
 *   2. Load regulatory policy (date range match)
 *   3. Load 5 input tables + salary structures
 *   4. For each employee with social fund data: calculateEmployee()
 *   5. Write psCalcResult + psFinalResult
 *   6. Run detectAnomalies(), write psAnomaly
 *   7. Update cycle status → "calculated"
 *   8. Return summary stats
 */
export async function executePayrollCalculation(
  cycleId: number,
): Promise<CalculationResult> {
  const startTime = Date.now();
  const db = await requireDb();

  log.info({ cycleId }, "Starting payroll calculation pipeline");

  // 1. Mark cycle as calculating
  await db.update(payrollSandboxCycles).set({
    status: "calculating",
    updatedAt: new Date().toISOString(),
  }).where(eq(payrollSandboxCycles.id, cycleId));

  // Load cycle
  const [cycle] = await db.select().from(payrollSandboxCycles)
    .where(eq(payrollSandboxCycles.id, cycleId)).limit(1);
  if (!cycle) throw new Error(`Cycle ${cycleId} not found`);

  // 2. Load active regulatory policy for this cycle's period
  const cycleDate = `${cycle.period.slice(0, 4)}-${cycle.period.slice(4)}-01`; // "202601" → "2026-01-01"
  const [activePolicy] = await db.select().from(psSocialFundPolicy)
    .where(and(
      lte(psSocialFundPolicy.effectiveFrom, cycleDate),
      or(
        isNull(psSocialFundPolicy.effectiveTo),
        gte(psSocialFundPolicy.effectiveTo, cycleDate),
      ),
    ))
    .orderBy(desc(psSocialFundPolicy.id))
    .limit(1);

  // Build RegulatoryParams from active policy (if any)
  const reg: RegulatoryParams | undefined = activePolicy?.regulatoryOverrides
    ? (activePolicy.regulatoryOverrides as RegulatoryParams)
    : undefined;

  if (activePolicy) {
    log.info({ policyId: activePolicy.id, version: activePolicy.policyVersion, hasOverrides: !!reg }, "Loaded regulatory policy for calc run");
  } else {
    log.info({ cycleDate }, "No active regulatory policy found, using DEFAULT_* constants");
  }

  // 3. Load all input tables for this cycle
  const socials = await db.select().from(psSocialFundInput).where(eq(psSocialFundInput.cycleId, cycleId)).limit(500);
  const performances = await db.select().from(psPerformanceInput).where(eq(psPerformanceInput.cycleId, cycleId)).limit(500);
  const allowances = await db.select().from(psAllowanceInput).where(eq(psAllowanceInput.cycleId, cycleId)).limit(1000);
  const attendances = await db.select().from(psAttendanceInput).where(eq(psAttendanceInput.cycleId, cycleId)).limit(500);
  const taxSnapshots = await db.select().from(psTaxSnapshot).where(eq(psTaxSnapshot.cycleId, cycleId)).limit(500);

  // Load ALL salary structures and build employeeId→structure map
  const allStructures = await db.select().from(salaryStructures).limit(1000);
  const structByEmployeeId = new Map<number, typeof allStructures[0]>();
  for (const s of allStructures) {
    // Keep the latest (highest id) per employee
    const existing = structByEmployeeId.get(s.employeeId);
    if (!existing || s.id > existing.id) {
      structByEmployeeId.set(s.employeeId, s);
    }
  }

  // Build lookup maps by employeeName
  const perfMap = new Map(performances.map((p) => [p.employeeName, p]));
  const attMap = new Map(attendances.map((a) => [a.employeeName, a]));
  const taxMap = new Map(taxSnapshots.map((t) => [t.employeeName, t]));
  const allowMap = new Map<string, { cashSubsidy: number; travelCar: number }>();
  for (const a of allowances) {
    const existing = allowMap.get(a.employeeName) ?? { cashSubsidy: 0, travelCar: 0 };
    if (a.allowanceType === "cash_subsidy") existing.cashSubsidy += Number(a.amount);
    else if (a.allowanceType === "travel_car") existing.travelCar += Number(a.amount);
    allowMap.set(a.employeeName, existing);
  }

  // Clear previous calc results and anomalies for this cycle
  await db.delete(psCalcResult).where(eq(psCalcResult.cycleId, cycleId));
  await db.delete(psFinalResult).where(eq(psFinalResult.cycleId, cycleId));
  await db.delete(psAnomaly).where(eq(psAnomaly.cycleId, cycleId));

  const calcRows: any[] = [];
  const finalRows: any[] = [];
  const anomalyRows: any[] = [];
  let totalGrossCents = 0;
  let totalNetCents = 0;
  let totalTaxCents = 0;

  // 4. For each employee with social fund data: calculate
  for (const emp of socials) {
    const perf = perfMap.get(emp.employeeName);
    const att = attMap.get(emp.employeeName);
    const tax = taxMap.get(emp.employeeName);
    const allow = allowMap.get(emp.employeeName) ?? { cashSubsidy: 0, travelCar: 0 };

    // Look up salary structure by employeeId
    const struct = emp.employeeId ? structByEmployeeId.get(emp.employeeId) : undefined;

    // Build EmployeeCalcInput combining salary structure + input tables
    const calcInput: EmployeeCalcInput = {
      employeeName: emp.employeeName,
      department: emp.department ?? "",
      positionGrade: struct?.positionGrade ?? "",
      isLumpSum: struct?.isLumpSum ?? false,

      // Fixed pay from salary structures (fallback to 0)
      baseSalary: y2c(struct?.baseSalary),
      positionWage: y2c(struct?.positionWage),
      skillSubsidy: y2c(struct?.skillSubsidy),
      saturdayShiftPremium: y2c(struct?.saturdayShiftPremium),
      comprehensiveSalary: y2c(struct?.comprehensiveSalary),

      // Performance — wage bases from perf input (already snapshotted from salary_structures)
      perfWage1Base: y2c(perf?.perfWage1Base),
      perfWage2Base: y2c(perf?.perfWage2Base),
      perfWage3Base: y2c(perf?.perfWage3Base),
      monthlyScore: Number(perf?.monthlyScore ?? 0),
      avg2024: Number(perf?.avg2024Score ?? 0),
      avg2025: Number(perf?.avg2025Score ?? 0),

      // Attendance
      scheduledDays: att?.scheduledDays ?? cycle.workDays,
      actualDays: Number(att?.actualAttendance ?? 0),
      personalLeaveHours: Number(att?.personalLeaveHours ?? 0),
      sickLeaveHours: Number(att?.sickLeaveHours ?? 0),
      weekdayOtHours: Number(att?.weekdayOvertimeForPay ?? 0),
      weekendOtHours: Number(att?.weekendOvertimeForPay ?? 0),
      holidayOtHours: Number(att?.holidayOvertimeForPay ?? 0),

      // Allowances (yuan → cents)
      cashSubsidy: Math.round(allow.cashSubsidy * 100),
      travelCarSubsidy: Math.round(allow.travelCar * 100),

      // Social insurance (from social fund input)
      socialInsurance: y2c(emp.socialInsurancePersonal),
      housingFund: y2c(emp.housingFundPersonal),

      // Tax (from tax snapshot)
      cumulativeIncomePrior: y2c(tax?.cumulativeIncomePrior),
      cumulativeDeductionPrior: y2c(tax?.cumulativeDeductionPrior),
      cumulativeTaxPaidPrior: y2c(tax?.cumulativeTaxPaidPrior),
      monthIndex: tax?.monthIndex ?? 1,
      specialDeduction: y2c(tax?.specialDeduction),

      // Bonuses (perfect attendance from salary structure)
      perfectAttendanceBonus: struct?.perfectAttendanceEligible ? y2c(struct.perfectAttendanceAmount) : 0,
      assessmentBonus: 0,
      otherIncome: 0,

      // Excel reference values (not available here)
      excelGrossPay: undefined,
      excelNetPay: undefined,
      excelTax: undefined,
    };

    // Run the real calc engine
    const result = calculateEmployee(calcInput, reg);

    // Detect anomalies
    const anomalies = detectAnomalies(result);

    // Accumulate totals (cents)
    totalGrossCents += y2c(result.grossPay);
    totalNetCents += y2c(result.netPay);
    totalTaxCents += y2c(result.incomeTax);

    // 5. Build psCalcResult row
    calcRows.push({
      cycleId,
      employeeName: emp.employeeName,
      employeeId: emp.employeeId,
      department: emp.department,
      positionGrade: result.positionGrade || null,
      baseSalary: result.baseSalary,
      positionWage: result.positionWage,
      skillSubsidy: result.skillSubsidy,
      saturdayShiftPremium: result.saturdayShiftPremium,
      comprehensiveSalary: result.comprehensiveSalary,
      perfWage1: result.perfWage1,
      perfWage2: result.perfWage2,
      perfWage3: result.perfWage3,
      perfAdjustment: result.perfAdjustment,
      perfCoeff1: result.perfCoeff1,
      perfCoeff2: result.perfCoeff2,
      perfCoeff3: result.perfCoeff3,
      perfDeduction1: result.perfDeduction1,
      perfDeduction2: result.perfDeduction2,
      perfDeduction3: result.perfDeduction3,
      actualAttendanceDays: result.actualAttendanceDays,
      personalLeaveHours: result.personalLeaveHours,
      sickLeaveHours: result.sickLeaveHours,
      personalLeaveDeduction: result.personalLeaveDeduction,
      sickLeaveDeduction: result.sickLeaveDeduction,
      weekdayOvertimeHours: result.weekdayOtHours,
      weekendOvertimeHours: result.weekendOtHours,
      holidayOvertimeHours: result.holidayOtHours,
      weekdayOvertimePay: result.weekdayOtPay,
      weekendOvertimePay: result.weekendOtPay,
      holidayOvertimePay: result.holidayOtPay,
      cashSubsidy: result.cashSubsidy,
      travelCarSubsidy: result.travelCarSubsidy,
      perfectAttendanceBonus: result.perfectAttendanceBonus,
      assessmentBonus: result.assessmentBonus,
      grossPay: result.grossPay,
      otherIncome: result.otherIncome,
      socialInsurance: result.socialInsurance,
      housingFund: result.housingFund,
      incomeTax: result.incomeTax,
      netPay: result.netPay,
      calculationLog: result.calculationLog,
      formulaDetails: result.formulaDetails,
      isLumpSum: result.isLumpSum,
    });

    // Build psFinalResult row
    finalRows.push({
      cycleId,
      employeeName: emp.employeeName,
      employeeId: emp.employeeId,
      department: emp.department,
      positionGrade: result.positionGrade || null,
      grossPay: result.grossPay,
      socialInsurance: result.socialInsurance,
      housingFund: result.housingFund,
      incomeTax: result.incomeTax,
      otherIncome: result.otherIncome,
      netPay: result.netPay,
      // Excel refs will be null until imported separately
      excelGrossPay: null,
      excelNetPay: null,
      excelTax: null,
      grossDiff: "0",
      netDiff: "0",
      taxDiff: "0",
      isMatched: false,
    });

    // 6. Store anomalies
    for (const a of anomalies) {
      anomalyRows.push({
        cycleId,
        employeeName: a.employeeName,
        employeeId: emp.employeeId,
        category: a.category,
        severity: a.severity,
        title: a.title,
        description: a.description,
        fieldName: a.fieldName ?? null,
        expectedValue: a.expectedValue ?? null,
        actualValue: a.actualValue ?? null,
        suggestedAction: a.suggestedAction ?? null,
      });
    }
  }

  // Batch insert results
  if (calcRows.length > 0) {
    await db.insert(psCalcResult).values(calcRows);
  }
  if (finalRows.length > 0) {
    await db.insert(psFinalResult).values(finalRows);
  }
  if (anomalyRows.length > 0) {
    await db.insert(psAnomaly).values(anomalyRows);
  }

  // 7. Update cycle status and totals
  const calculatedAt = new Date().toISOString();
  await db.update(payrollSandboxCycles).set({
    status: "calculated",
    calculatedAt,
    totalEmployees: calcRows.length,
    totalGrossPay: c2y(totalGrossCents),
    totalNetPay: c2y(totalNetCents),
    totalTax: c2y(totalTaxCents),
    updatedAt: calculatedAt,
  }).where(eq(payrollSandboxCycles.id, cycleId));

  const duration = Date.now() - startTime;

  log.info({
    cycleId,
    period: cycle.period,
    employees: calcRows.length,
    anomalies: anomalyRows.length,
    durationMs: duration,
  }, "Payroll calculation pipeline completed");

  // 8. Return summary stats
  return {
    cycleId,
    period: cycle.period,
    employeesCalculated: calcRows.length,
    anomaliesDetected: anomalyRows.length,
    totalGrossPay: c2y(totalGrossCents),
    totalNetPay: c2y(totalNetCents),
    totalTax: c2y(totalTaxCents),
    duration,
  };
}
