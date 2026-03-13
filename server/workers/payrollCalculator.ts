/**
 * Smart Payroll Calculator Engine — 薪资自动化计算引擎
 *
 * Core computation pipeline:
 *   1. Read salary_structures → fixed pay components
 *   2. Read attendance_records → deductions + overtime pay
 *   3. Read performance_evaluations → performance bonus + MBO
 *   4. Read payroll_excellence_awards → special bonus
 *   5. Compute social insurance (五险一金) individual portions
 *   6. Compute progressive individual income tax (7-bracket, 2019 reform)
 *   7. Write payroll_ledgers entry with full breakdown
 *
 * ALL monetary calculations use integer arithmetic (cents/分) internally,
 * converting to DECIMAL(14,2) strings only at the DB boundary.
 *
 * Designed to run as an async worker via ai_tasks queue.
 */

import { requireDb } from "../db";
import { eq, and } from "drizzle-orm";
import {
  salaryStructures,
  attendanceRecords,
  performanceEvaluations,
  payrollLedgers,
  payrollExcellenceAwards,
} from "../../drizzle/smart-payroll-schema";
import { hrmEmployees, aiTasks } from "../../drizzle/schema";
import { perfCompositeScores } from "../../drizzle/perf-calibration-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("payroll-calculator");

// ── Chinese Individual Income Tax Brackets (2019 Reform) ──
// 综合所得年度税率表 (applied cumulatively / 累计预扣法)
// Bracket: [lower, upper, rate, quickDeduction]  (all in 分/cents)

interface TaxBracket {
  lower: number;   // cents
  upper: number;   // cents (Infinity for last bracket)
  rate: number;    // e.g. 0.03
  quickDeduction: number; // cents
  level: number;
}

const TAX_BRACKETS: TaxBracket[] = [
  { lower: 0,           upper: 3600000,      rate: 0.03, quickDeduction: 0,          level: 1 }, //  0 – 36,000
  { lower: 3600000,     upper: 14400000,     rate: 0.10, quickDeduction: 252000,     level: 2 }, // 36,000 – 144,000
  { lower: 14400000,    upper: 30000000,     rate: 0.20, quickDeduction: 1692000,    level: 3 }, // 144,000 – 300,000
  { lower: 30000000,    upper: 42000000,     rate: 0.25, quickDeduction: 3192000,    level: 4 }, // 300,000 – 420,000
  { lower: 42000000,    upper: 66000000,     rate: 0.30, quickDeduction: 5292000,    level: 5 }, // 420,000 – 660,000
  { lower: 66000000,    upper: 96000000,     rate: 0.35, quickDeduction: 8592000,    level: 6 }, // 660,000 – 960,000
  { lower: 96000000,    upper: Infinity,     rate: 0.45, quickDeduction: 18192000,   level: 7 }, // 960,000+
];

// 月度免征额 5000元 (60000/年)
const MONTHLY_EXEMPTION_CENTS = 500000; // 5000元 = 500000分

// ── Social Insurance Rates (Individual Portion) ──────────
const PENSION_RATE = 0.08;       // 养老保险 8%
const MEDICAL_RATE = 0.02;       // 医疗保险 2%
const UNEMPLOYMENT_RATE = 0.005; // 失业保险 0.5%
// Housing fund rate is per-employee from salary_structures

// ── Performance Grade Coefficients ───────────────────────
const GRADE_COEFFICIENTS: Record<string, number> = {
  S: 1.50,  // 卓越
  A: 1.20,  // 优秀
  B: 1.00,  // 良好
  C: 0.80,  // 合格
  D: 0.60,  // 不合格
};

// ── GRT 三档绩效工资系数算法 (CEO Excel 逆向) ─────────────
//
// 绩效工资1系数 = IF(本月得分<75, 0, IF(本月>2024均分+3 OR 本月>2025均分, 1, 0))
// 绩效工资2系数 = IF(本月得分>=2025均分, 1, IF(2025均分-本月<=3, 0.5, 0))
// 绩效工资3系数 = manual override only (CEO discretion)
//
// 绩效工资扣除 = 基数 × (1 - 系数)
// 绩效工资调整 = -(绩效1扣除 + 绩效2扣除 + 绩效3扣除)
//
interface PerfWageResult {
  wage1Coeff: number; // 0 | 1
  wage2Coeff: number; // 0 | 0.5 | 1
  wage3Coeff: number; // typically manual
  wage1Earned: number; // cents
  wage2Earned: number;
  wage3Earned: number;
  wage1Deducted: number;
  wage2Deducted: number;
  wage3Deducted: number;
  totalAdjustment: number; // cents (negative = deducted)
}

function computePerformanceWages(
  wage1Base: number, // cents
  wage2Base: number,
  wage3Base: number,
  monthlyScore: number,  // 本月绩效得分 (0-100)
  avg2024: number,       // 2024平均得分
  avg2025: number,       // 2025平均得分
  override1?: number | null, // manual override in cents (null = use formula)
  override2?: number | null,
  override3?: number | null,
): PerfWageResult {
  // 绩效工资1系数: earn only if score>=75 AND (score > avg2024+3 OR score > avg2025)
  let wage1Coeff = 0;
  if (monthlyScore >= 75 && (monthlyScore > avg2024 + 3 || monthlyScore > avg2025)) {
    wage1Coeff = 1;
  }

  // 绩效工资2系数: full if score >= avg2025, half if within 3 points, else 0
  let wage2Coeff = 0;
  if (monthlyScore >= avg2025) {
    wage2Coeff = 1;
  } else if (avg2025 - monthlyScore <= 3) {
    wage2Coeff = 0.5;
  }

  // 绩效工资3系数: manual/CEO discretion (default 0 unless overridden)
  const wage3Coeff = 0;

  // Apply overrides if set
  const wage1Earned = override1 !== null && override1 !== undefined
    ? override1
    : Math.round(wage1Base * wage1Coeff);
  const wage2Earned = override2 !== null && override2 !== undefined
    ? override2
    : Math.round(wage2Base * wage2Coeff);
  const wage3Earned = override3 !== null && override3 !== undefined
    ? override3
    : Math.round(wage3Base * wage3Coeff);

  const wage1Deducted = wage1Base - wage1Earned;
  const wage2Deducted = wage2Base - wage2Earned;
  const wage3Deducted = wage3Base - wage3Earned;
  const totalAdjustment = -(wage1Deducted + wage2Deducted + wage3Deducted);

  return {
    wage1Coeff, wage2Coeff, wage3Coeff,
    wage1Earned, wage2Earned, wage3Earned,
    wage1Deducted, wage2Deducted, wage3Deducted,
    totalAdjustment,
  };
}

// ── Helper: Convert yuan string to cents ─────────────────

function yuanToCents(yuan: string | number | null | undefined): number {
  if (yuan === null || yuan === undefined) return 0;
  return Math.round(Number(yuan) * 100);
}

function centsToYuan(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ── GRT Fixed Constants (from CEO Excel reverse-engineering) ──
const GRT_MONTHLY_STANDARD_HOURS_DIVISOR = 116; // 事假扣款 = personalLeaveHours × (baseSalary / 116)
const SICK_LEAVE_COEFFICIENT = 0.1962;           // 病假扣款 = sickLeaveHours × hourlyRate × 0.1962

// ── Helper: Compute attendance deduction & overtime (Excel-aligned) ──
//
// NEW formulas from CEO's real Excel:
//   事假扣款 = personalLeaveHours × (baseSalary / 116)
//   病假扣款 = sickLeaveHours × (comprehensiveSalary / scheduledDays / 8) × 0.1962
//   加班费: based on comprehensiveSalary hourly rate

interface AttendanceInput {
  scheduledDays: number;
  actualDays: string | number;
  personalLeaveDays: string | number;
  sickLeaveDays: string | number;
  absentDays: string | number;
  lateDays: number;
  weekdayOvertimeHours: string | number;
  weekendOvertimeHours: string | number;
  holidayOvertimeHours: string | number;
  // Hour-based (Excel-aligned, preferred)
  personalLeaveHours?: string | number;
  sickLeaveHours?: string | number;
}

interface AttendanceResult {
  deductionCents: number;
  overtimePayCents: number;
  personalLeaveDeductionCents: number;
  sickLeaveDeductionCents: number;
}

function computeAttendance(
  attendance: AttendanceInput,
  dailyPayCents: number,
  hourlyPayCents: number,
  baseSalaryCents?: number,
  comprehensiveSalaryCents?: number,
): AttendanceResult {
  // ── 事假扣款 (Personal Leave Deduction) ──
  // Excel formula: personalLeaveHours × (baseSalary / 116)
  let personalLeaveDeductionCents: number;
  const personalLeaveHours = Number(attendance.personalLeaveHours ?? 0);
  if (personalLeaveHours > 0 && baseSalaryCents) {
    personalLeaveDeductionCents = Math.round(personalLeaveHours * (baseSalaryCents / GRT_MONTHLY_STANDARD_HOURS_DIVISOR));
  } else {
    // Fallback to day-based for legacy data
    personalLeaveDeductionCents = Math.round(Number(attendance.personalLeaveDays) * dailyPayCents);
  }

  // ── 病假扣款 (Sick Leave Deduction) ──
  // Excel formula: sickLeaveHours × (comprehensiveSalary / scheduledDays / 8) × 0.1962
  let sickLeaveDeductionCents: number;
  const sickLeaveHours = Number(attendance.sickLeaveHours ?? 0);
  if (sickLeaveHours > 0 && comprehensiveSalaryCents && attendance.scheduledDays > 0) {
    const compHourlyRate = comprehensiveSalaryCents / attendance.scheduledDays / 8;
    sickLeaveDeductionCents = Math.round(sickLeaveHours * compHourlyRate * SICK_LEAVE_COEFFICIENT);
  } else {
    // Fallback to day-based for legacy data
    sickLeaveDeductionCents = Math.round(Number(attendance.sickLeaveDays) * dailyPayCents * 0.4);
  }

  // 旷工扣款: 每天扣日薪的3倍
  const absentDeduction = Math.round(Number(attendance.absentDays) * dailyPayCents * 3);

  // 迟到扣款: 每次50元
  const lateDeduction = attendance.lateDays * 5000; // 50元 = 5000分

  const deductionCents = personalLeaveDeductionCents + sickLeaveDeductionCents + absentDeduction + lateDeduction;

  // 加班费: 工作日1.5x, 周末2x, 节假日3x (based on comprehensive salary hourly rate)
  const otHourlyRate = comprehensiveSalaryCents && attendance.scheduledDays > 0
    ? Math.round(comprehensiveSalaryCents / attendance.scheduledDays / 8)
    : hourlyPayCents;
  const weekdayOT = Math.round(Number(attendance.weekdayOvertimeHours) * otHourlyRate * 1.5);
  const weekendOT = Math.round(Number(attendance.weekendOvertimeHours) * otHourlyRate * 2.0);
  const holidayOT = Math.round(Number(attendance.holidayOvertimeHours) * otHourlyRate * 3.0);
  const overtimePayCents = weekdayOT + weekendOT + holidayOT;

  return { deductionCents, overtimePayCents, personalLeaveDeductionCents, sickLeaveDeductionCents };
}

// ── Helper: Compute social insurance (个人部分) ──────────

function computeSocialInsurance(
  socialInsuranceBaseCents: number,
  housingFundBaseCents: number,
  housingFundRate: number,
  socialInsuranceActualCents = 0,  // Per-employee override (0 = use formula)
  housingFundActualCents = 0,      // Per-employee override (0 = use formula)
): {
  pensionCents: number;
  medicalCents: number;
  unemploymentCents: number;
  housingFundCents: number;
  socialInsuranceTotalCents: number;
  totalCents: number;
} {
  // If actual amounts are provided, use them directly (CEO Excel has per-employee overrides)
  if (socialInsuranceActualCents > 0 || housingFundActualCents > 0) {
    const siTotal = socialInsuranceActualCents > 0 ? socialInsuranceActualCents : (
      Math.round(socialInsuranceBaseCents * PENSION_RATE) +
      Math.round(socialInsuranceBaseCents * MEDICAL_RATE) +
      Math.round(socialInsuranceBaseCents * UNEMPLOYMENT_RATE)
    );
    const hfTotal = housingFundActualCents > 0 ? housingFundActualCents :
      Math.round(housingFundBaseCents * housingFundRate);
    return {
      pensionCents: 0, medicalCents: 0, unemploymentCents: 0,
      housingFundCents: hfTotal,
      socialInsuranceTotalCents: siTotal,
      totalCents: siTotal + hfTotal,
    };
  }

  const pensionCents = Math.round(socialInsuranceBaseCents * PENSION_RATE);
  const medicalCents = Math.round(socialInsuranceBaseCents * MEDICAL_RATE);
  const unemploymentCents = Math.round(socialInsuranceBaseCents * UNEMPLOYMENT_RATE);
  const housingFundCents = Math.round(housingFundBaseCents * housingFundRate);
  const socialInsuranceTotalCents = pensionCents + medicalCents + unemploymentCents;

  return {
    pensionCents,
    medicalCents,
    unemploymentCents,
    housingFundCents,
    socialInsuranceTotalCents,
    totalCents: socialInsuranceTotalCents + housingFundCents,
  };
}

// ── Helper: Compute progressive income tax (累计预扣法) ──

function computeIncomeTax(
  monthlyTaxableIncomeCents: number,
  cumulativeTaxableIncomeCents: number,
  cumulativeTaxPaidCents: number,
): {
  currentMonthTaxCents: number;
  newCumulativeTaxableIncomeCents: number;
  newCumulativeTaxPaidCents: number;
  bracketLevel: number;
} {
  // 累计应纳税所得额
  const newCumulative = cumulativeTaxableIncomeCents + monthlyTaxableIncomeCents;

  // Find applicable bracket
  let bracket = TAX_BRACKETS[0];
  for (const b of TAX_BRACKETS) {
    if (newCumulative > b.lower) bracket = b;
    else break;
  }

  // 累计应缴税额 = 累计应纳税所得额 × 税率 - 速算扣除数
  const cumulativeTaxDue = Math.round(newCumulative * bracket.rate) - bracket.quickDeduction;
  const safeCumulativeTaxDue = Math.max(0, cumulativeTaxDue);

  // 本月应缴 = 累计应缴 - 已缴
  const currentMonthTaxCents = Math.max(0, safeCumulativeTaxDue - cumulativeTaxPaidCents);

  return {
    currentMonthTaxCents,
    newCumulativeTaxableIncomeCents: newCumulative,
    newCumulativeTaxPaidCents: cumulativeTaxPaidCents + currentMonthTaxCents,
    bracketLevel: bracket.level,
  };
}

// ── Main: Calculate Single Employee Payroll ──────────────

export interface PayrollCalculationInput {
  employeeId: number;
  period: string; // YYYY-MM
  cumulativeTaxableIncome?: number; // yuan, from previous months
  cumulativeTaxPaid?: number;       // yuan, from previous months
}

export interface PayrollCalculationResult {
  success: boolean;
  employeeId: number;
  period: string;
  ledgerCode: string;
  breakdown: {
    baseSalary: string;
    positionWage: string;
    skillSubsidy: string;
    saturdayShiftPremium: string;
    comprehensiveSalary: string;
    totalAllowances: string;
    overtimePay: string;
    performanceBonus: string;
    performanceWage1: string;
    performanceWage2: string;
    performanceWage3: string;
    perfWageAdjustment: string; // 绩效工资调整 (negative = deducted)
    specialBonus: string;
    projectBonus: string;
    perfectAttendanceBonus: string;
    personalLeaveDeduction: string;
    sickLeaveDeduction: string;
    cashSubsidy: string;
    travelCarSubsidy: string;
    otherIncome: string;
    grossPay: string;
    attendanceDeduction: string;
    pensionEmployee: string;
    medicalEmployee: string;
    unemploymentEmployee: string;
    housingFundEmployee: string;
    totalSocialInsurance: string;
    specialTaxDeduction: string;
    taxableIncome: string;
    incomeTax: string;
    totalDeductions: string;
    netPay: string;
    taxBracket: number;
  };
  error?: string;
}

export async function calculateEmployeePayroll(
  input: PayrollCalculationInput,
): Promise<PayrollCalculationResult> {
  const { employeeId, period } = input;
  const ledgerCode = `PAY-${period}-${String(employeeId).padStart(4, "0")}`;

  try {
    const db = await requireDb();

    // 1. Fetch salary structure
    const [structure] = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.employeeId, employeeId))
      .orderBy(salaryStructures.effectiveFrom)
      .limit(1);

    if (!structure) {
      return { success: false, employeeId, period, ledgerCode, breakdown: emptyBreakdown(), error: "No salary structure found" };
    }

    // 2. Fetch attendance record
    const [attendance] = await db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.period, period),
      ))
      .limit(1);

    // 3. Fetch performance evaluation
    const [perfEval] = await db
      .select()
      .from(performanceEvaluations)
      .where(and(
        eq(performanceEvaluations.employeeId, employeeId),
        eq(performanceEvaluations.period, period),
      ))
      .limit(1);

    // 4. Fetch excellence awards
    const awards = await db
      .select()
      .from(payrollExcellenceAwards)
      .where(and(
        eq(payrollExcellenceAwards.employeeId, employeeId),
        eq(payrollExcellenceAwards.period, period),
      ))
      .limit(10);

    // ── Calculate in cents ──

    const baseSalaryCents = yuanToCents(structure.baseSalary);
    const positionWageCents = yuanToCents(structure.positionWage);
    const skillSubsidyCents = yuanToCents(structure.skillSubsidy);
    const saturdayShiftPremiumCents = yuanToCents(structure.saturdayShiftPremium);
    const cashSubsidyCents = yuanToCents(structure.cashSubsidy);
    const travelCarSubsidyCents = yuanToCents(structure.travelCarSubsidy);
    const specialTaxDeductionCents = yuanToCents(structure.specialTaxDeduction);

    // Legacy allowances (kept for backward compat, but new data uses Excel columns)
    const allowancesCents =
      yuanToCents(structure.positionAllowance) +
      yuanToCents(structure.confidentialityAllowance) +
      yuanToCents(structure.technicalAllowance) +
      yuanToCents(structure.seniorityAllowance) +
      yuanToCents(structure.mealAllowance) +
      yuanToCents(structure.transportAllowance) +
      yuanToCents(structure.communicationAllowance);

    // ── 三档绩效工资 (GRT CEO Excel 逆向算法) ──
    const wage1BaseCents = yuanToCents(structure.performanceWage1Base);
    const wage2BaseCents = yuanToCents(structure.performanceWage2Base);
    const wage3BaseCents = yuanToCents(structure.performanceWage3Base);

    const monthlyPerfScore = perfEval ? Number(perfEval.mboScore) : 0;
    const bds = (perfEval?.businessDataSnapshot as Record<string, number | undefined>) ?? {};
    const avg2024 = bds.avg2024 ?? 75;
    const avg2025 = bds.avg2025 ?? 80;

    const perfWages = computePerformanceWages(
      wage1BaseCents, wage2BaseCents, wage3BaseCents,
      monthlyPerfScore, avg2024, avg2025,
    );

    // ── Comprehensive salary (综合工资) ──
    // For lump-sum employees (CEO/CFO/黄晓兰): use stored comprehensiveSalary as-is
    // For breakdown employees: baseSalary + positionWage + skillSubsidy + perfWage1 + perfWage2 + perfWage3 + saturdayShiftPremium
    let comprehensiveSalaryCents: number;
    const isLumpSum = (structure as Record<string, unknown>).isLumpSum;
    if (isLumpSum) {
      comprehensiveSalaryCents = yuanToCents(structure.comprehensiveSalary);
    } else {
      comprehensiveSalaryCents = baseSalaryCents + positionWageCents + skillSubsidyCents +
        wage1BaseCents + wage2BaseCents + wage3BaseCents + saturdayShiftPremiumCents;
      // If comprehensiveSalary was explicitly set (from Excel), prefer it
      const storedComp = yuanToCents(structure.comprehensiveSalary);
      if (storedComp > 0) {
        comprehensiveSalaryCents = storedComp;
      }
    }

    // Attendance
    const scheduledDays = attendance?.scheduledDays ?? 21.75;
    const dailyPayCents = Math.round(comprehensiveSalaryCents / scheduledDays);
    const hourlyPayCents = Math.round(dailyPayCents / 8);

    let attendanceDeductionCents = 0;
    let overtimePayCents = 0;
    let personalLeaveDeductionCents = 0;
    let sickLeaveDeductionCents = 0;
    if (attendance) {
      const attResult = computeAttendance(
        attendance, dailyPayCents, hourlyPayCents,
        baseSalaryCents, comprehensiveSalaryCents,
      );
      attendanceDeductionCents = attResult.deductionCents;
      overtimePayCents = attResult.overtimePayCents;
      personalLeaveDeductionCents = attResult.personalLeaveDeductionCents;
      sickLeaveDeductionCents = attResult.sickLeaveDeductionCents;
    }

    // ── Perfect attendance bonus (全勤奖) ──
    let perfectAttendanceBonusCents = 0;
    const perfAttendEligible = (structure as Record<string, unknown>).perfectAttendanceEligible;
    if (perfAttendEligible && attendance) {
      const plHours = Number(attendance.personalLeaveHours ?? attendance.personalLeaveDays ?? 0);
      const slHours = Number(attendance.sickLeaveHours ?? attendance.sickLeaveDays ?? 0);
      const lateCount = Number(attendance.lateDays ?? 0);
      if (plHours === 0 && slHours === 0 && lateCount === 0) {
        perfectAttendanceBonusCents = yuanToCents(
          (structure as Record<string, unknown>).perfectAttendanceAmount ?? "300",
        );
      }
    }

    // Performance — use calibrated finalGrade from perf_composite_scores when available
    let performanceBonusCents = 0;
    let projectBonusCents = 0;
    if (perfEval) {
      let effectiveGrade = perfEval.evaluationGrade;
      try {
        const [calibrated] = await db
          .select()
          .from(perfCompositeScores)
          .where(and(
            eq(perfCompositeScores.employeeId, employeeId),
            eq(perfCompositeScores.period, period),
          ))
          .limit(1);
        if (calibrated && (calibrated.status === "finalized" || calibrated.status === "locked") && calibrated.finalGrade) {
          effectiveGrade = calibrated.finalGrade;
          log.info({ employeeId, period, rawGrade: perfEval.evaluationGrade, calibratedGrade: calibrated.finalGrade }, "Using calibrated grade");
        }
      } catch {
        // Calibration table may not exist yet
      }
      const gradeCoeff = GRADE_COEFFICIENTS[effectiveGrade] ?? 1.0;
      const deptCoeff = Number(perfEval.departmentCoefficient);
      const perfBaseCents = yuanToCents(structure.performanceBase);
      performanceBonusCents = Math.round(perfBaseCents * gradeCoeff * deptCoeff);
      projectBonusCents = yuanToCents(perfEval.projectBonus);
    }

    // Excellence awards (special bonus)
    const specialBonusCents = awards.reduce((sum, a) => sum + yuanToCents(a.awardAmount), 0);

    // ── Gross pay (应发工资) — matching Excel ──
    // 应发工资 = 综合工资 + 绩效工资调整(neg) - 事假扣款 - 病假扣款 + 加班费 + 全勤奖 + 考核奖金 + 其它
    // Note: 现金补贴 and 出差车补 are separate from 应发工资 (added to 本月总收入)
    const grossPayCents = comprehensiveSalaryCents + perfWages.totalAdjustment
      - personalLeaveDeductionCents - sickLeaveDeductionCents
      + overtimePayCents + perfectAttendanceBonusCents
      + performanceBonusCents + specialBonusCents + projectBonusCents;

    // Social insurance — support per-employee actual amounts
    const socialInsuranceBaseCents = yuanToCents(structure.socialInsuranceBase);
    const housingFundBaseCents = yuanToCents(structure.housingFundBase);
    const housingFundRate = Number(structure.housingFundRate);
    const socialInsuranceActualCents = yuanToCents(structure.socialInsuranceActual);
    const housingFundActualCents = yuanToCents(structure.housingFundActual);
    const social = computeSocialInsurance(
      socialInsuranceBaseCents, housingFundBaseCents, housingFundRate,
      socialInsuranceActualCents, housingFundActualCents,
    );

    // Taxable income = grossPay - socialInsurance - 5000(exemption) - specialTaxDeduction
    const monthlyTaxableIncomeCents = Math.max(0,
      grossPayCents - social.totalCents - MONTHLY_EXEMPTION_CENTS - specialTaxDeductionCents,
    );

    // Income tax (cumulative method)
    const cumulativeTaxableIncomeCents = yuanToCents(input.cumulativeTaxableIncome ?? 0);
    const cumulativeTaxPaidCents = yuanToCents(input.cumulativeTaxPaid ?? 0);
    const tax = computeIncomeTax(monthlyTaxableIncomeCents, cumulativeTaxableIncomeCents, cumulativeTaxPaidCents);

    // ── Net pay (实发工资) = 应发工资 - 社保 - 公积金 - 个税 ──
    const totalDeductionsCents = social.totalCents + tax.currentMonthTaxCents;
    const netPayCents = grossPayCents - totalDeductionsCents;

    // 5. Write to payroll_ledgers
    await db.insert(payrollLedgers).values({
      ledgerCode,
      employeeId,
      period,
      baseSalary: centsToYuan(baseSalaryCents),
      positionWage: centsToYuan(positionWageCents),
      skillSubsidy: centsToYuan(skillSubsidyCents),
      saturdayShiftPremium: centsToYuan(saturdayShiftPremiumCents),
      comprehensiveSalary: centsToYuan(comprehensiveSalaryCents),
      cashSubsidy: centsToYuan(cashSubsidyCents),
      travelCarSubsidy: centsToYuan(travelCarSubsidyCents),
      totalAllowances: centsToYuan(allowancesCents),
      overtimePay: centsToYuan(overtimePayCents),
      performanceBonus: centsToYuan(performanceBonusCents),
      performanceWage1: centsToYuan(perfWages.wage1Earned),
      performanceWage2: centsToYuan(perfWages.wage2Earned),
      performanceWage3: centsToYuan(perfWages.wage3Earned),
      perfectAttendanceBonus: centsToYuan(perfectAttendanceBonusCents),
      personalLeaveDeduction: centsToYuan(personalLeaveDeductionCents),
      sickLeaveDeduction: centsToYuan(sickLeaveDeductionCents),
      specialBonus: centsToYuan(specialBonusCents),
      projectBonus: centsToYuan(projectBonusCents),
      specialTaxDeduction: centsToYuan(specialTaxDeductionCents),
      grossPay: centsToYuan(grossPayCents),
      attendanceDeduction: centsToYuan(attendanceDeductionCents),
      pensionEmployee: centsToYuan(social.pensionCents),
      medicalEmployee: centsToYuan(social.medicalCents),
      unemploymentEmployee: centsToYuan(social.unemploymentCents),
      housingFundEmployee: centsToYuan(social.housingFundCents),
      totalSocialInsurance: centsToYuan(social.totalCents),
      taxableIncome: centsToYuan(monthlyTaxableIncomeCents),
      cumulativeTaxableIncome: centsToYuan(tax.newCumulativeTaxableIncomeCents),
      cumulativeTaxPaid: centsToYuan(tax.newCumulativeTaxPaidCents),
      incomeTax: centsToYuan(tax.currentMonthTaxCents),
      taxBracket: tax.bracketLevel,
      totalDeductions: centsToYuan(totalDeductionsCents),
      netPay: centsToYuan(netPayCents),
      status: "DRAFT",
      department: structure.department,
      buCode: structure.buCode,
      calculationDetails: {
        calculatedAt: new Date().toISOString(),
        dailyPay: centsToYuan(dailyPayCents),
        hourlyPay: centsToYuan(hourlyPayCents),
        gradeCoeff: perfEval ? GRADE_COEFFICIENTS[perfEval.evaluationGrade] : null,
        deptCoeff: perfEval ? Number(perfEval.departmentCoefficient) : null,
        mboScore: perfEval ? Number(perfEval.mboScore) : null,
        awardCount: awards.length,
        isLumpSum: !!isLumpSum,
        comprehensiveSalary: centsToYuan(comprehensiveSalaryCents),
        perfWages: {
          wage1Coeff: perfWages.wage1Coeff,
          wage2Coeff: perfWages.wage2Coeff,
          wage3Coeff: perfWages.wage3Coeff,
          wage1Deducted: centsToYuan(perfWages.wage1Deducted),
          wage2Deducted: centsToYuan(perfWages.wage2Deducted),
          wage3Deducted: centsToYuan(perfWages.wage3Deducted),
          monthlyScore: monthlyPerfScore,
          avg2024, avg2025,
        },
      },
    });

    const breakdown = {
      baseSalary: centsToYuan(baseSalaryCents),
      positionWage: centsToYuan(positionWageCents),
      skillSubsidy: centsToYuan(skillSubsidyCents),
      saturdayShiftPremium: centsToYuan(saturdayShiftPremiumCents),
      comprehensiveSalary: centsToYuan(comprehensiveSalaryCents),
      totalAllowances: centsToYuan(allowancesCents),
      overtimePay: centsToYuan(overtimePayCents),
      performanceBonus: centsToYuan(performanceBonusCents),
      performanceWage1: centsToYuan(perfWages.wage1Earned),
      performanceWage2: centsToYuan(perfWages.wage2Earned),
      performanceWage3: centsToYuan(perfWages.wage3Earned),
      perfWageAdjustment: centsToYuan(perfWages.totalAdjustment),
      specialBonus: centsToYuan(specialBonusCents),
      projectBonus: centsToYuan(projectBonusCents),
      perfectAttendanceBonus: centsToYuan(perfectAttendanceBonusCents),
      personalLeaveDeduction: centsToYuan(personalLeaveDeductionCents),
      sickLeaveDeduction: centsToYuan(sickLeaveDeductionCents),
      cashSubsidy: centsToYuan(cashSubsidyCents),
      travelCarSubsidy: centsToYuan(travelCarSubsidyCents),
      otherIncome: "0.00",
      grossPay: centsToYuan(grossPayCents),
      attendanceDeduction: centsToYuan(attendanceDeductionCents),
      pensionEmployee: centsToYuan(social.pensionCents),
      medicalEmployee: centsToYuan(social.medicalCents),
      unemploymentEmployee: centsToYuan(social.unemploymentCents),
      housingFundEmployee: centsToYuan(social.housingFundCents),
      totalSocialInsurance: centsToYuan(social.totalCents),
      specialTaxDeduction: centsToYuan(specialTaxDeductionCents),
      taxableIncome: centsToYuan(monthlyTaxableIncomeCents),
      incomeTax: centsToYuan(tax.currentMonthTaxCents),
      totalDeductions: centsToYuan(totalDeductionsCents),
      netPay: centsToYuan(netPayCents),
      taxBracket: tax.bracketLevel,
    };

    log.info({ employeeId, period, netPay: breakdown.netPay, taxBracket: tax.bracketLevel }, "Payroll calculated");
    return { success: true, employeeId, period, ledgerCode, breakdown };
  } catch (err) {
    log.error({ err, employeeId, period }, "Payroll calculation failed");
    return { success: false, employeeId, period, ledgerCode, breakdown: emptyBreakdown(), error: String(err) };
  }
}

// ── Batch: Calculate All Employees for a Period ──────────

export async function calculateBatchPayroll(
  period: string,
  employeeIds?: number[],
): Promise<{ total: number; success: number; failed: number; results: PayrollCalculationResult[] }> {
  const db = await requireDb();

  // Get employee list
  let ids = employeeIds;
  if (!ids || ids.length === 0) {
    const employees = await db.select({ id: salaryStructures.employeeId }).from(salaryStructures).limit(1000);
    ids = employees.map((e) => e.id);
  }

  const results: PayrollCalculationResult[] = [];
  let success = 0;
  let failed = 0;

  for (const id of ids) {
    // Look up cumulative YTD tax data from the most recent prior period's ledger
    let cumulativeTaxableIncome: number | undefined;
    let cumulativeTaxPaid: number | undefined;

    try {
      // Parse period to find prior months in same tax year
      const [yearStr, monthStr] = period.split("-");
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);

      if (month > 1) {
        // Query the most recent prior ledger in the same tax year
        const prevPeriod = `${year}-${String(month - 1).padStart(2, "0")}`;
        const [prevLedger] = await db
          .select({
            cumulativeTaxableIncome: payrollLedgers.cumulativeTaxableIncome,
            cumulativeTaxPaid: payrollLedgers.cumulativeTaxPaid,
          })
          .from(payrollLedgers)
          .where(
            and(
              eq(payrollLedgers.employeeId, id),
              eq(payrollLedgers.period, prevPeriod),
            ),
          )
          .limit(1);

        if (prevLedger) {
          cumulativeTaxableIncome = Number(prevLedger.cumulativeTaxableIncome);
          cumulativeTaxPaid = Number(prevLedger.cumulativeTaxPaid);
        }
      }
      // January resets to 0 (new tax year)
    } catch {
      // If lookup fails, calculate from 0 (conservative — may slightly overpay first month)
    }

    const result = await calculateEmployeePayroll({
      employeeId: id,
      period,
      cumulativeTaxableIncome,
      cumulativeTaxPaid,
    });
    results.push(result);
    if (result.success) success++;
    else failed++;
  }

  log.info({ period, total: ids.length, success, failed }, "Batch payroll calculation completed");
  return { total: ids.length, success, failed, results };
}

// ── Async Worker: Process ai_tasks queue entry ───────────

export async function processPayrollTask(taskId: number): Promise<void> {
  const db = await requireDb();

  // Lock task
  await db.update(aiTasks)
    .set({ status: "processing", startedAt: new Date().toISOString() })
    .where(eq(aiTasks.id, taskId));

  try {
    const [task] = await db.select().from(aiTasks).where(eq(aiTasks.id, taskId)).limit(1);
    if (!task || !task.inputData) throw new Error("Task not found or missing input");

    const input = task.inputData as { period: string; employeeIds?: number[] };
    const result = await calculateBatchPayroll(input.period, input.employeeIds);

    await db.update(aiTasks)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        resultData: {
          total: result.total,
          success: result.success,
          failed: result.failed,
          summary: result.results.map((r) => ({
            employeeId: r.employeeId,
            ledgerCode: r.ledgerCode,
            success: r.success,
            netPay: r.breakdown.netPay,
            error: r.error,
          })),
        },
      })
      .where(eq(aiTasks.id, taskId));

    log.info({ taskId, period: input.period, total: result.total }, "Payroll task completed");
  } catch (err) {
    await db.update(aiTasks)
      .set({ status: "failed", errorMessage: String(err), completedAt: new Date().toISOString() })
      .where(eq(aiTasks.id, taskId));
    log.error({ err, taskId }, "Payroll task failed");
  }
}

// ── Exported tax utilities (for preview/frontend) ────────

export { TAX_BRACKETS, MONTHLY_EXEMPTION_CENTS, GRADE_COEFFICIENTS, GRT_MONTHLY_STANDARD_HOURS_DIVISOR, SICK_LEAVE_COEFFICIENT };
export { computeIncomeTax, computeSocialInsurance, computeAttendance, computePerformanceWages };
export { yuanToCents, centsToYuan };

// ── Utility ──────────────────────────────────────────────

function emptyBreakdown(): PayrollCalculationResult["breakdown"] {
  return {
    baseSalary: "0.00", positionWage: "0.00", skillSubsidy: "0.00",
    saturdayShiftPremium: "0.00", comprehensiveSalary: "0.00",
    totalAllowances: "0.00", overtimePay: "0.00",
    performanceBonus: "0.00",
    performanceWage1: "0.00", performanceWage2: "0.00", performanceWage3: "0.00",
    perfWageAdjustment: "0.00",
    specialBonus: "0.00", projectBonus: "0.00",
    perfectAttendanceBonus: "0.00",
    personalLeaveDeduction: "0.00", sickLeaveDeduction: "0.00",
    cashSubsidy: "0.00", travelCarSubsidy: "0.00", otherIncome: "0.00",
    grossPay: "0.00", attendanceDeduction: "0.00",
    pensionEmployee: "0.00", medicalEmployee: "0.00", unemploymentEmployee: "0.00",
    housingFundEmployee: "0.00", totalSocialInsurance: "0.00",
    specialTaxDeduction: "0.00",
    taxableIncome: "0.00", incomeTax: "0.00",
    totalDeductions: "0.00", netPay: "0.00", taxBracket: 1,
  };
}
