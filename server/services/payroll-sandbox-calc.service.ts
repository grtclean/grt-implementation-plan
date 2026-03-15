/**
 * Payroll Sandbox Calculation Engine — 薪资沙盘计算引擎
 *
 * Implements the CEO's exact Excel formulas for the payroll sandbox.
 * All monetary calculations use integer arithmetic (cents/分) internally.
 *
 * Pipeline:
 *   1. Load salary structures (fixed pay components)
 *   2. Apply attendance deductions + overtime pay
 *   3. Compute 三档绩效工资 with evidence-based coefficients
 *   4. Apply allowances (cash subsidy, travel/car)
 *   5. Compute social insurance + housing fund
 *   6. Compute progressive individual income tax (累计预扣法)
 *   7. Generate calc results + final results + anomaly detection
 *
 * ═══════════════════════════════════════════════════════════════════
 *  INVARIANTS / 不变量清单 (202601 pilot 及后续月份均需保持)
 * ═══════════════════════════════════════════════════════════════════
 *
 * [I-1] 货币精度: 内部用整数(分/cents)，DB边界转 DECIMAL(14,2)
 * [I-2] 综合工资 = 基本工资 + 岗位工资 + 技能补贴 + 周六加班固定
 *       这是 CEO Excel 已固化的定义，不可拆分或合并
 * [I-3] 应发 = 综合工资 + 绩效调整 - 事假扣款 - 病假扣款
 *             + 加班费 + 全勤奖 + 考核奖金
 * [I-4] 实发 = 应发 + 其它收入 - 社保(个人) - 公积金(个人) - 个税
 * [I-5] 包薪制员工(CEO/CFO): 应发 = 综合工资，无组件拆分
 * [I-6] 202601种子数据(0049 SQL): 47社保+9绩效+35现金补贴+16出差车补+9个税快照
 *       ↑ 此种子数据在任何版本中不可删除或覆盖
 *
 * ═══════════════════════════════════════════════════════════════════
 *  FORMULAS / 公式清单 (每条标注: GRT自定义 vs 法规)
 * ═══════════════════════════════════════════════════════════════════
 *
 * [F-1] 事假扣款 = 事假小时 × (基本工资 / 116)
 *       来源: GRT内部制度 | divisor=116 取自CEO Excel
 *
 * [F-2] 病假扣款 = 病假小时 × (综合工资 / 应出勤天 / 8) × 0.1962
 *       来源: GRT内部制度 | 系数0.1962源自上海市病假工资计算标准
 *
 * [F-3] 加班费 = 时薪 × 倍数 (平时1.5x, 周末2x, 节假日3x)
 *       来源: 《劳动法》第44条 | 时薪 = 综合工资 / 应出勤天 / 8
 *
 * [F-4] 绩效工资1系数 = IF(score<75, 0, IF(score>avg2024+3 OR score>avg2025, 1, 0))
 *       来源: GRT绩效制度(CEO审定)
 *
 * [F-5] 绩效工资2系数 = IF(score>=avg2025, 1, IF(avg2025-score<=3, 0.5, 0))
 *       来源: GRT绩效制度(CEO审定)
 *
 * [F-6] 绩效工资3系数 = 手动(CEO审批), 默认0
 *       来源: GRT绩效制度(CEO审定)
 *
 * [F-7] 个人所得税: 累计预扣法 (7级超额累进税率)
 *       来源: 《个人所得税法》2019年修正 + 国税总局公告2018年第61号
 *       免征额: 5000元/月 | 税率阶梯: 3%/10%/20%/25%/30%/35%/45%
 *       ↑ 此为法规公式，税率阶梯和免征额可通过 RegulatoryParams 更新
 *
 * ═══════════════════════════════════════════════════════════════════
 *  REGULATORY PARAMS / 可更新法规参数
 * ═══════════════════════════════════════════════════════════════════
 *
 * 所有法规参数均提供 DEFAULT_* 硬编码默认值，运行时可通过
 * RegulatoryParams 接口覆盖。当法规更新时：
 *   1. 在 ps_social_fund_policy 表插入新版本
 *   2. 在 router 调用 calc.run 时传入最新参数
 *   3. 旧月份的计算结果不受影响(已锁定)
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ps-calc-engine");

// ═══════════════════════════════════════════════════════════
//  DEFAULT REGULATORY PARAMETERS (可通过DB覆盖)
// ═══════════════════════════════════════════════════════════

/** 个税7级累进税率阶梯 — 单位: 分(cents) [法规: 2019年《个税法》] */
export const DEFAULT_TAX_BRACKETS = [
  { lower: 0,        upper: 3600000,   rate: 0.03, qd: 0,         level: 1 },
  { lower: 3600000,  upper: 14400000,  rate: 0.10, qd: 252000,    level: 2 },
  { lower: 14400000, upper: 30000000,  rate: 0.20, qd: 1692000,   level: 3 },
  { lower: 30000000, upper: 42000000,  rate: 0.25, qd: 3192000,   level: 4 },
  { lower: 42000000, upper: 66000000,  rate: 0.30, qd: 5292000,   level: 5 },
  { lower: 66000000, upper: 96000000,  rate: 0.35, qd: 8592000,   level: 6 },
  { lower: 96000000, upper: Infinity,  rate: 0.45, qd: 18192000,  level: 7 },
] as const;

/** 每月基本减除费用 — 5000元/月 = 500000分 [法规: 《个税法》第6条] */
export const DEFAULT_MONTHLY_EXEMPTION_CENTS = 500000;

/** 加班费倍数 [法规: 《劳动法》第44条] */
export const DEFAULT_OT_MULTIPLIERS = {
  weekday: 1.5,
  weekend: 2.0,
  holiday: 3.0,
} as const;

/** GRT事假扣款除数 [GRT内部制度 — CEO Excel] */
export const DEFAULT_PERSONAL_LEAVE_DIVISOR = 116;

/** GRT病假扣款系数 [上海市标准] */
export const DEFAULT_SICK_LEAVE_COEFF = 0.1962;

/** 绩效工资1最低分数线 [GRT内部制度] */
export const DEFAULT_PERF_WAGE1_MIN_SCORE = 75;

/** 绩效工资1比较差值 [GRT内部制度] */
export const DEFAULT_PERF_WAGE1_AVG_DELTA = 3;

/** 绩效工资2半薪差值阈值 [GRT内部制度] */
export const DEFAULT_PERF_WAGE2_HALF_THRESHOLD = 3;

/**
 * RegulatoryParams — 运行时可注入的法规参数
 * 当法规更新（如个税阶梯调整、免征额提高、加班倍数修改），
 * 只需在调用 computeTax/computeAttendance 时传入新参数。
 * 不传则使用 DEFAULT_* 值。
 */
export interface RegulatoryParams {
  taxBrackets?: typeof DEFAULT_TAX_BRACKETS[number][];
  monthlyExemptionCents?: number;
  otMultipliers?: { weekday: number; weekend: number; holiday: number };
  personalLeaveDivisor?: number;
  sickLeaveCoeff?: number;
  perfWage1MinScore?: number;
  perfWage1AvgDelta?: number;
  perfWage2HalfThreshold?: number;
}

// ── Helpers ──
export function y2c(yuan: string | number | null | undefined): number {
  if (yuan === null || yuan === undefined || yuan === "") return 0;
  return Math.round(Number(yuan) * 100);
}

export function c2y(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ── Performance Wage Coefficients (三档绩效工资) ──
export interface PerfWageInput {
  monthlyScore: number;
  avg2024: number;
  avg2025: number;
  wage1Base: number; // cents
  wage2Base: number;
  wage3Base: number;
}

export interface PerfWageResult {
  coeff1: number; // 0 | 1
  coeff2: number; // 0 | 0.5 | 1
  coeff3: number; // manual, default 0
  wage1: number;  // cents earned
  wage2: number;
  wage3: number;
  deduction1: number; // cents deducted
  deduction2: number;
  deduction3: number;
  totalAdjustment: number; // negative = deducted
}

export function computePerfWages(input: PerfWageInput, reg?: RegulatoryParams): PerfWageResult {
  const { monthlyScore, avg2024, avg2025, wage1Base, wage2Base, wage3Base } = input;
  const minScore = reg?.perfWage1MinScore ?? DEFAULT_PERF_WAGE1_MIN_SCORE;
  const avgDelta = reg?.perfWage1AvgDelta ?? DEFAULT_PERF_WAGE1_AVG_DELTA;
  const halfThreshold = reg?.perfWage2HalfThreshold ?? DEFAULT_PERF_WAGE2_HALF_THRESHOLD;

  // [F-4] 绩效工资1系数: IF(score<minScore, 0, IF(score > avg2024+avgDelta OR score > avg2025, 1, 0))
  let coeff1 = 0;
  if (monthlyScore >= minScore && (monthlyScore > avg2024 + avgDelta || monthlyScore > avg2025)) {
    coeff1 = 1;
  }

  // [F-5] 绩效工资2系数: IF(score >= avg2025, 1, IF(avg2025 - score <= halfThreshold, 0.5, 0))
  let coeff2 = 0;
  if (monthlyScore >= avg2025) {
    coeff2 = 1;
  } else if (avg2025 - monthlyScore <= halfThreshold) {
    coeff2 = 0.5;
  }

  // 绩效工资3: manual/CEO discretion, default 0
  const coeff3 = 0;

  const wage1 = Math.round(wage1Base * coeff1);
  const wage2 = Math.round(wage2Base * coeff2);
  const wage3 = Math.round(wage3Base * coeff3);

  const deduction1 = wage1Base - wage1;
  const deduction2 = wage2Base - wage2;
  const deduction3 = wage3Base - wage3;
  const totalAdjustment = -(deduction1 + deduction2 + deduction3);

  return { coeff1, coeff2, coeff3, wage1, wage2, wage3, deduction1, deduction2, deduction3, totalAdjustment };
}

// ── Attendance Calculation ──
export interface AttendanceCalcInput {
  scheduledDays: number;     // 应出勤天数
  actualDays: number;        // 实际出勤天数
  personalLeaveHours: number;
  sickLeaveHours: number;
  weekdayOtHours: number;
  weekendOtHours: number;
  holidayOtHours: number;
  baseSalaryCents: number;
  comprehensiveSalaryCents: number;
}

export interface AttendanceCalcResult {
  personalLeaveDeduction: number; // cents
  sickLeaveDeduction: number;
  weekdayOtPay: number;
  weekendOtPay: number;
  holidayOtPay: number;
  totalOtPay: number;
  totalDeduction: number;
}

export function computeAttendance(input: AttendanceCalcInput, reg?: RegulatoryParams): AttendanceCalcResult {
  const {
    scheduledDays, personalLeaveHours, sickLeaveHours,
    weekdayOtHours, weekendOtHours, holidayOtHours,
    baseSalaryCents, comprehensiveSalaryCents,
  } = input;
  const divisor = reg?.personalLeaveDivisor ?? DEFAULT_PERSONAL_LEAVE_DIVISOR;
  const sickCoeff = reg?.sickLeaveCoeff ?? DEFAULT_SICK_LEAVE_COEFF;
  const ot = reg?.otMultipliers ?? DEFAULT_OT_MULTIPLIERS;

  // [F-1] 事假扣款 = personalLeaveHours × (baseSalary / divisor)
  const personalLeaveDeduction = Math.round(personalLeaveHours * (baseSalaryCents / divisor));

  // [F-2] 病假扣款 = sickLeaveHours × (comprehensiveSalary / scheduledDays / 8) × sickCoeff
  const hourlyRate = scheduledDays > 0 ? comprehensiveSalaryCents / scheduledDays / 8 : 0;
  const sickLeaveDeduction = Math.round(sickLeaveHours * hourlyRate * sickCoeff);

  // [F-3] 加班费 = 时薪 × 倍数 (法规: 《劳动法》第44条)
  const otHourlyBase = scheduledDays > 0 ? comprehensiveSalaryCents / scheduledDays / 8 : 0;
  const weekdayOtPay = Math.round(weekdayOtHours * otHourlyBase * ot.weekday);
  const weekendOtPay = Math.round(weekendOtHours * otHourlyBase * ot.weekend);
  const holidayOtPay = Math.round(holidayOtHours * otHourlyBase * ot.holiday);
  const totalOtPay = weekdayOtPay + weekendOtPay + holidayOtPay;
  const totalDeduction = personalLeaveDeduction + sickLeaveDeduction;

  return { personalLeaveDeduction, sickLeaveDeduction, weekdayOtPay, weekendOtPay, holidayOtPay, totalOtPay, totalDeduction };
}

// ── Tax Calculation (累计预扣法) ──
export interface TaxCalcInput {
  monthlyTaxableIncome: number;   // cents (应纳税所得额 for this month)
  cumulativeIncomePrior: number;  // cents (previous months cumulative)
  cumulativeDeductionPrior: number;
  cumulativeTaxPaidPrior: number;
  monthIndex: number;              // 1-12
  specialDeduction: number;        // cents (专项附加扣除)
}

export interface TaxCalcResult {
  incomeTax: number;                // cents (本月应扣个税)
  cumulativeTaxableIncome: number;  // cents
  taxBracket: number;               // 1-7
}

export function computeTax(input: TaxCalcInput, reg?: RegulatoryParams): TaxCalcResult {
  const {
    monthlyTaxableIncome, cumulativeIncomePrior, cumulativeDeductionPrior,
    cumulativeTaxPaidPrior, monthIndex, specialDeduction,
  } = input;
  const brackets = reg?.taxBrackets ?? DEFAULT_TAX_BRACKETS;
  const exemption = reg?.monthlyExemptionCents ?? DEFAULT_MONTHLY_EXEMPTION_CENTS;

  // [F-7] 累计应纳税所得额 = 累计收入 - 累计减除费用 - 累计专项扣除 - 累计专项附加扣除
  const cumulativeIncome = cumulativeIncomePrior + monthlyTaxableIncome;
  const cumulativeExemption = exemption * monthIndex;
  const cumulativeSpecial = specialDeduction * monthIndex;
  const cumulativeTaxableIncome = Math.max(0,
    cumulativeIncome - cumulativeExemption - cumulativeDeductionPrior - cumulativeSpecial
  );

  // Find bracket from (potentially updated) tax table
  let bracket = brackets[0];
  for (const b of brackets) {
    if (cumulativeTaxableIncome > b.lower) bracket = b;
    else break;
  }

  // 本月应扣 = 累计应纳税额 - 累计已缴
  const cumulativeTaxDue = Math.max(0,
    Math.round(cumulativeTaxableIncome * bracket.rate) - bracket.qd
  );
  const incomeTax = Math.max(0, cumulativeTaxDue - cumulativeTaxPaidPrior);

  return { incomeTax, cumulativeTaxableIncome, taxBracket: bracket.level };
}

// ── Full Employee Calculation ──
export interface EmployeeCalcInput {
  employeeName: string;
  department: string;
  positionGrade: string;
  isLumpSum: boolean;

  // Fixed pay (from salary_structures)
  baseSalary: number;       // cents
  positionWage: number;
  skillSubsidy: number;
  saturdayShiftPremium: number;
  comprehensiveSalary: number;

  // Performance
  perfWage1Base: number;
  perfWage2Base: number;
  perfWage3Base: number;
  monthlyScore: number;
  avg2024: number;
  avg2025: number;

  // Attendance
  scheduledDays: number;
  actualDays: number;
  personalLeaveHours: number;
  sickLeaveHours: number;
  weekdayOtHours: number;
  weekendOtHours: number;
  holidayOtHours: number;

  // Allowances
  cashSubsidy: number;     // cents
  travelCarSubsidy: number;

  // Social insurance
  socialInsurance: number; // cents (personal portion)
  housingFund: number;

  // Tax
  cumulativeIncomePrior: number;
  cumulativeDeductionPrior: number;
  cumulativeTaxPaidPrior: number;
  monthIndex: number;
  specialDeduction: number;

  // Bonuses
  perfectAttendanceBonus: number;
  assessmentBonus: number;
  otherIncome: number;

  // Excel reference values (for comparison)
  excelGrossPay?: number;
  excelNetPay?: number;
  excelTax?: number;
}

export interface EmployeeCalcResult {
  employeeName: string;
  department: string;
  positionGrade: string;
  isLumpSum: boolean;

  // Fixed pay
  baseSalary: string;
  positionWage: string;
  skillSubsidy: string;
  saturdayShiftPremium: string;
  comprehensiveSalary: string;

  // Performance
  perfWage1: string;
  perfWage2: string;
  perfWage3: string;
  perfAdjustment: string;
  perfCoeff1: string;
  perfCoeff2: string;
  perfCoeff3: string;
  perfDeduction1: string;
  perfDeduction2: string;
  perfDeduction3: string;

  // Attendance
  actualAttendanceDays: string;
  personalLeaveHours: string;
  sickLeaveHours: string;
  personalLeaveDeduction: string;
  sickLeaveDeduction: string;
  weekdayOtHours: string;
  weekendOtHours: string;
  holidayOtHours: string;
  weekdayOtPay: string;
  weekendOtPay: string;
  holidayOtPay: string;

  // Allowances
  cashSubsidy: string;
  travelCarSubsidy: string;
  perfectAttendanceBonus: string;
  assessmentBonus: string;

  // Totals
  grossPay: string;
  otherIncome: string;
  socialInsurance: string;
  housingFund: string;
  incomeTax: string;
  netPay: string;

  // Calculation log
  calculationLog: Record<string, any>;
  formulaDetails: Record<string, string>;
}

/**
 * calculateEmployee — 单员工全量计算
 * @param input  员工全维度输入
 * @param reg    可选法规参数覆盖 (不传使用DEFAULT_*)
 */
export function calculateEmployee(input: EmployeeCalcInput, reg?: RegulatoryParams): EmployeeCalcResult {
  const formulas: Record<string, string> = {};

  // ── [I-5] Lump sum employees (CEO/CFO — no component breakdown) ──
  if (input.isLumpSum) {
    const gross = input.comprehensiveSalary;
    const deductions = input.socialInsurance + input.housingFund;
    const taxInput: TaxCalcInput = {
      monthlyTaxableIncome: gross - deductions,
      cumulativeIncomePrior: input.cumulativeIncomePrior,
      cumulativeDeductionPrior: input.cumulativeDeductionPrior + deductions,
      cumulativeTaxPaidPrior: input.cumulativeTaxPaidPrior,
      monthIndex: input.monthIndex,
      specialDeduction: input.specialDeduction,
    };
    const tax = computeTax(taxInput, reg);
    const netPay = gross - deductions - tax.incomeTax + input.otherIncome;

    formulas.grossPay = "包薪制: comprehensiveSalary";
    formulas.netPay = "grossPay - socialInsurance - housingFund - incomeTax + otherIncome";

    return {
      employeeName: input.employeeName,
      department: input.department,
      positionGrade: input.positionGrade,
      isLumpSum: true,
      baseSalary: "0", positionWage: "0", skillSubsidy: "0",
      saturdayShiftPremium: "0", comprehensiveSalary: c2y(input.comprehensiveSalary),
      perfWage1: "0", perfWage2: "0", perfWage3: "0", perfAdjustment: "0",
      perfCoeff1: "0", perfCoeff2: "0", perfCoeff3: "0",
      perfDeduction1: "0", perfDeduction2: "0", perfDeduction3: "0",
      actualAttendanceDays: String(input.actualDays),
      personalLeaveHours: "0", sickLeaveHours: "0",
      personalLeaveDeduction: "0", sickLeaveDeduction: "0",
      weekdayOtHours: "0", weekendOtHours: "0", holidayOtHours: "0",
      weekdayOtPay: "0", weekendOtPay: "0", holidayOtPay: "0",
      cashSubsidy: c2y(input.cashSubsidy),
      travelCarSubsidy: c2y(input.travelCarSubsidy),
      perfectAttendanceBonus: "0", assessmentBonus: "0",
      grossPay: c2y(gross), otherIncome: c2y(input.otherIncome),
      socialInsurance: c2y(input.socialInsurance),
      housingFund: c2y(input.housingFund),
      incomeTax: c2y(tax.incomeTax), netPay: c2y(netPay),
      calculationLog: { engine: "sandbox-v2", type: "lumpSum", taxBracket: tax.taxBracket },
      formulaDetails: formulas,
    };
  }

  // ── Standard employee calculation ──

  // 1. [F-4/F-5/F-6] Performance wages
  const perf = computePerfWages({
    monthlyScore: input.monthlyScore,
    avg2024: input.avg2024,
    avg2025: input.avg2025,
    wage1Base: input.perfWage1Base,
    wage2Base: input.perfWage2Base,
    wage3Base: input.perfWage3Base,
  }, reg);
  formulas.perfWage1 = `base(${c2y(input.perfWage1Base)}) × coeff(${perf.coeff1}) = ${c2y(perf.wage1)}`;
  formulas.perfWage2 = `base(${c2y(input.perfWage2Base)}) × coeff(${perf.coeff2}) = ${c2y(perf.wage2)}`;
  formulas.perfAdjustment = `-(ded1 + ded2 + ded3) = ${c2y(perf.totalAdjustment)}`;

  // 2. [F-1/F-2/F-3] Attendance deductions + overtime
  const att = computeAttendance({
    scheduledDays: input.scheduledDays,
    actualDays: input.actualDays,
    personalLeaveHours: input.personalLeaveHours,
    sickLeaveHours: input.sickLeaveHours,
    weekdayOtHours: input.weekdayOtHours,
    weekendOtHours: input.weekendOtHours,
    holidayOtHours: input.holidayOtHours,
    baseSalaryCents: input.baseSalary,
    comprehensiveSalaryCents: input.comprehensiveSalary,
  }, reg);
  const _div = reg?.personalLeaveDivisor ?? DEFAULT_PERSONAL_LEAVE_DIVISOR;
  const _sc = reg?.sickLeaveCoeff ?? DEFAULT_SICK_LEAVE_COEFF;
  const _ot = reg?.otMultipliers ?? DEFAULT_OT_MULTIPLIERS;
  formulas.personalLeaveDeduction = `[F-1] ${input.personalLeaveHours}h × (baseSalary / ${_div}) = ${c2y(att.personalLeaveDeduction)}`;
  formulas.sickLeaveDeduction = `[F-2] ${input.sickLeaveHours}h × hourlyRate × ${_sc} = ${c2y(att.sickLeaveDeduction)}`;
  formulas.weekdayOtPay = `[F-3] ${input.weekdayOtHours}h × hourlyRate × ${_ot.weekday} = ${c2y(att.weekdayOtPay)}`;
  formulas.weekendOtPay = `[F-3] ${input.weekendOtHours}h × hourlyRate × ${_ot.weekend} = ${c2y(att.weekendOtPay)}`;
  formulas.holidayOtPay = `[F-3] ${input.holidayOtHours}h × hourlyRate × ${_ot.holiday} = ${c2y(att.holidayOtPay)}`;

  // 3. [I-3] Gross pay
  const grossPay = input.comprehensiveSalary
    + perf.totalAdjustment
    - att.personalLeaveDeduction
    - att.sickLeaveDeduction
    + att.totalOtPay
    + input.perfectAttendanceBonus
    + input.assessmentBonus;

  formulas.grossPay = `综合工资(${c2y(input.comprehensiveSalary)}) + 绩效调整(${c2y(perf.totalAdjustment)}) - 事假扣款(${c2y(att.personalLeaveDeduction)}) - 病假扣款(${c2y(att.sickLeaveDeduction)}) + 加班费(${c2y(att.totalOtPay)}) + 全勤奖(${c2y(input.perfectAttendanceBonus)}) + 考核奖金(${c2y(input.assessmentBonus)})`;

  // 4. [F-7] Tax (累计预扣法)
  const deductions = input.socialInsurance + input.housingFund;
  const taxableForMonth = grossPay + input.otherIncome - deductions;
  const tax = computeTax({
    monthlyTaxableIncome: Math.max(0, taxableForMonth),
    cumulativeIncomePrior: input.cumulativeIncomePrior,
    cumulativeDeductionPrior: input.cumulativeDeductionPrior + deductions,
    cumulativeTaxPaidPrior: input.cumulativeTaxPaidPrior,
    monthIndex: input.monthIndex,
    specialDeduction: input.specialDeduction,
  }, reg);
  formulas.incomeTax = `[F-7] 累计预扣法: bracket=${tax.taxBracket}, cumTaxable=${c2y(tax.cumulativeTaxableIncome)}, tax=${c2y(tax.incomeTax)}`;

  // 5. [I-4] Net pay = 应发 + 其它 - 社保 - 公积金 - 个税
  const netPay = grossPay + input.otherIncome - deductions - tax.incomeTax;
  formulas.netPay = `[I-4] grossPay(${c2y(grossPay)}) + other(${c2y(input.otherIncome)}) - social(${c2y(input.socialInsurance)}) - housing(${c2y(input.housingFund)}) - tax(${c2y(tax.incomeTax)})`;

  return {
    employeeName: input.employeeName,
    department: input.department,
    positionGrade: input.positionGrade,
    isLumpSum: false,
    baseSalary: c2y(input.baseSalary),
    positionWage: c2y(input.positionWage),
    skillSubsidy: c2y(input.skillSubsidy),
    saturdayShiftPremium: c2y(input.saturdayShiftPremium),
    comprehensiveSalary: c2y(input.comprehensiveSalary),
    perfWage1: c2y(perf.wage1),
    perfWage2: c2y(perf.wage2),
    perfWage3: c2y(perf.wage3),
    perfAdjustment: c2y(perf.totalAdjustment),
    perfCoeff1: String(perf.coeff1),
    perfCoeff2: String(perf.coeff2),
    perfCoeff3: String(perf.coeff3),
    perfDeduction1: c2y(perf.deduction1),
    perfDeduction2: c2y(perf.deduction2),
    perfDeduction3: c2y(perf.deduction3),
    actualAttendanceDays: String(input.actualDays),
    personalLeaveHours: String(input.personalLeaveHours),
    sickLeaveHours: String(input.sickLeaveHours),
    personalLeaveDeduction: c2y(att.personalLeaveDeduction),
    sickLeaveDeduction: c2y(att.sickLeaveDeduction),
    weekdayOtHours: String(input.weekdayOtHours),
    weekendOtHours: String(input.weekendOtHours),
    holidayOtHours: String(input.holidayOtHours),
    weekdayOtPay: c2y(att.weekdayOtPay),
    weekendOtPay: c2y(att.weekendOtPay),
    holidayOtPay: c2y(att.holidayOtPay),
    cashSubsidy: c2y(input.cashSubsidy),
    travelCarSubsidy: c2y(input.travelCarSubsidy),
    perfectAttendanceBonus: c2y(input.perfectAttendanceBonus),
    assessmentBonus: c2y(input.assessmentBonus),
    grossPay: c2y(grossPay),
    otherIncome: c2y(input.otherIncome),
    socialInsurance: c2y(input.socialInsurance),
    housingFund: c2y(input.housingFund),
    incomeTax: c2y(tax.incomeTax),
    netPay: c2y(netPay),
    calculationLog: {
      engine: "sandbox-v2",
      type: "standard",
      taxBracket: tax.taxBracket,
      cumulativeTaxableIncome: c2y(tax.cumulativeTaxableIncome),
      timestamp: new Date().toISOString(),
    },
    formulaDetails: formulas,
  };
}

// ── Anomaly Detection ──
export interface AnomalyItem {
  employeeName: string;
  category: "evidence_insufficient" | "perf_quality_conflict" | "allowance_no_basis" | "social_fund_mismatch" | "tax_bracket_anomaly" | "net_pay_volatility";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  fieldName?: string;
  expectedValue?: string;
  actualValue?: string;
  suggestedAction?: string;
}

export function detectAnomalies(
  calcResult: EmployeeCalcResult,
  excelGross?: number,
  excelNet?: number,
  excelTax?: number,
  evidenceCount?: number,
  hasAllowanceBasis?: boolean,
): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];
  const name = calcResult.employeeName;

  // 1. Evidence insufficient
  if (evidenceCount !== undefined && evidenceCount < 2) {
    anomalies.push({
      employeeName: name,
      category: "evidence_insufficient",
      severity: "warning",
      title: `${name} 绩效证据不足`,
      description: `仅有 ${evidenceCount} 条绩效证据，建议至少3条`,
      suggestedAction: "补充工作任务完成记录、客户反馈等证据",
    });
  }

  // 2. Allowance no basis
  if (hasAllowanceBasis === false && Number(calcResult.cashSubsidy) > 0) {
    anomalies.push({
      employeeName: name,
      category: "allowance_no_basis",
      severity: "warning",
      title: `${name} 现金补贴缺少依据`,
      description: `现金补贴 ${calcResult.cashSubsidy}元 无offer/表单支撑`,
      fieldName: "cashSubsidy",
      actualValue: calcResult.cashSubsidy,
      suggestedAction: "确认补贴来源：offer协议 / 补贴申请表 / 制度规则",
    });
  }

  // 3. Tax bracket anomaly (large tax for low salary)
  const gross = Number(calcResult.grossPay);
  const tax = Number(calcResult.incomeTax);
  if (gross > 0 && gross < 8000 && tax > 500) {
    anomalies.push({
      employeeName: name,
      category: "tax_bracket_anomaly",
      severity: "critical",
      title: `${name} 个税异常偏高`,
      description: `应发 ${calcResult.grossPay}元 但个税 ${calcResult.incomeTax}元，可能存在累计税额计算错误`,
      fieldName: "incomeTax",
      expectedValue: "< 100",
      actualValue: calcResult.incomeTax,
      suggestedAction: "检查累计预扣参数（前期是否有大额收入）",
    });
  }

  // 4. Net pay volatility (>30% from Excel reference)
  if (excelNet !== undefined && excelNet > 0) {
    const sysNet = Number(calcResult.netPay);
    const diff = Math.abs(sysNet - excelNet);
    const pct = (diff / excelNet) * 100;
    if (pct > 30) {
      anomalies.push({
        employeeName: name,
        category: "net_pay_volatility",
        severity: "critical",
        title: `${name} 实发波动过大 (${pct.toFixed(1)}%)`,
        description: `系统: ${calcResult.netPay}元, Excel: ${(excelNet / 100).toFixed(2)}元, 差异: ${(diff / 100).toFixed(2)}元`,
        fieldName: "netPay",
        expectedValue: (excelNet / 100).toFixed(2),
        actualValue: calcResult.netPay,
        suggestedAction: "逐项核对薪资组成，查找偏差源",
      });
    } else if (pct > 5) {
      anomalies.push({
        employeeName: name,
        category: "net_pay_volatility",
        severity: "warning",
        title: `${name} 实发差异 ${pct.toFixed(1)}%`,
        description: `系统: ${calcResult.netPay}元, Excel: ${(excelNet / 100).toFixed(2)}元`,
        fieldName: "netPay",
        expectedValue: (excelNet / 100).toFixed(2),
        actualValue: calcResult.netPay,
      });
    }
  }

  // 5. Gross pay comparison
  if (excelGross !== undefined && excelGross > 0) {
    const sysGross = Number(calcResult.grossPay);
    const diff = Math.abs(sysGross - excelGross / 100);
    if (diff > 1) {
      anomalies.push({
        employeeName: name,
        category: "net_pay_volatility",
        severity: diff > 500 ? "critical" : "warning",
        title: `${name} 应发差异 ${diff.toFixed(2)}元`,
        description: `系统: ${calcResult.grossPay}元, Excel: ${(excelGross / 100).toFixed(2)}元`,
        fieldName: "grossPay",
        expectedValue: (excelGross / 100).toFixed(2),
        actualValue: calcResult.grossPay,
      });
    }
  }

  return anomalies;
}

// ═══════════════════════════════════════════════════════════
//  SALARY REFERENCE DATA — 202602 真实薪资基准 (from CEO Excel)
// ═══════════════════════════════════════════════════════════

/**
 * 202602 薪资参考数据 — 来自 data/副本202602-薪资稿V1 （无密码）.xlsx → Sheet "3.计薪汇总"
 * 97 名员工全量薪资组件基准
 *
 * 用途:
 *   1. 薪资沙盘验算: 与系统计算结果交叉比对
 *   2. 异常检测: detectAnomalies 的 excelGross/excelNet 参考值
 *   3. 工时→薪酬联动: 工时报工×时薪 = 人工成本
 */
export interface SalaryReferenceRecord {
  seq: number;
  dept: string;
  name: string;
  grade: string | number;
  isLumpSum: boolean;
  /** 基本工资 (元) */
  baseSalary: number;
  /** 岗位工资 (元) */
  positionWage: number;
  /** 技能补贴 (元) */
  skillSubsidy: number;
  /** 绩效工资1/2/3 基数 (元) */
  perfWage1: number;
  perfWage2: number;
  perfWage3: number;
  /** 周六加班固定 (元) */
  satOT: number;
  /** 综合工资 (元) */
  comprehensiveSalary: number;
  /** 绩效工资调整 (元, 负数=扣除) */
  perfAdjust: number;
  /** 出勤天数 */
  attendDays: number;
  /** 事假/病假 (小时) */
  personalLeaveH: number;
  sickLeaveH: number;
  /** 事假/病假扣款 (元) */
  personalLeaveDed: number;
  sickLeaveDed: number;
  /** 加班 (小时) */
  weekdayOTh: number;
  weekendOTh: number;
  holidayOTh: number;
  /** 加班费 (元) */
  weekdayOTpay: number;
  weekendOTpay: number;
  holidayOTpay: number;
  /** 全勤奖 (元) */
  fullAttBonus: number;
  /** 考核奖金 (元) */
  assessBonus: number;
  /** 应发工资 (元) */
  grossPay: number;
  /** 其它收入 (元) */
  otherIncome: number;
  /** 社保个人 (元) */
  socialIns: number;
  /** 公积金个人 (元) */
  housingFund: number;
  /** 个税 (元) */
  tax: number;
  /** 实发 (元) */
  netPay: number;
  /** 绩效得分 (2024平均/2025平均/本月) */
  avg2024: number;
  avg2025: number;
  monthScore: number;
  /** 绩效系数 1/2/3 */
  coeff1: number;
  coeff2: number;
  coeff3: number;
}

/**
 * 202602 薪资参考数据 — 97 employees
 * 来源: data/副本202602-薪资稿V1 （无密码）.xlsx → Sheet "3.计薪汇总"
 *
 * AGGREGATE TOTALS:
 *   综合工资总额: ¥1,035,991
 *   应发工资总额: ¥1,027,627
 *   社保合计: ¥57,195 | 公积金合计: ¥28,703 | 个税合计: ¥17,358
 *   实发总额: ¥924,371
 */
export const SALARY_REFERENCE_202602: SalaryReferenceRecord[] = [
  // ─── 总经办 ───
  { seq: 1, dept: "总经办", name: "倪亚东", grade: "", isLumpSum: true, baseSalary: 0, positionWage: 0, skillSubsidy: 0, perfWage1: 0, perfWage2: 0, perfWage3: 0, satOT: 0, comprehensiveSalary: 35000, perfAdjust: 0, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 35000, otherIncome: 0, socialIns: 743.72, housingFund: 3520, tax: 1650.17, netPay: 29086.11, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 2, dept: "总经办", name: "倪微薇", grade: "", isLumpSum: true, baseSalary: 0, positionWage: 0, skillSubsidy: 0, perfWage1: 0, perfWage2: 0, perfWage3: 0, satOT: 0, comprehensiveSalary: 20000, perfAdjust: 0, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 20000, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 450, netPay: 19550, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  // ─── 运营部 ───
  { seq: 3, dept: "运营部", name: "曹二", grade: "", isLumpSum: false, baseSalary: 7000, positionWage: 5500, skillSubsidy: 5000, perfWage1: 2000, perfWage2: 2000, perfWage3: 2000, satOT: 3500, comprehensiveSalary: 25000, perfAdjust: -6000, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 5735.29, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 6000, grossPay: 31035.29, otherIncome: 0, socialIns: 743.72, housingFund: 0, tax: 1723.82, netPay: 28567.75, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  // ─── 事业一部 ───
  { seq: 4, dept: "事业一部", name: "杨勇", grade: "", isLumpSum: false, baseSalary: 6000, positionWage: 3800, skillSubsidy: 2800, perfWage1: 1100, perfWage2: 1100, perfWage3: 1200, satOT: 2000, comprehensiveSalary: 18000, perfAdjust: -3400, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 78, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 11522.06, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 26422.06, otherIncome: 0, socialIns: 1260, housingFund: 1440, tax: 589.51, netPay: 23132.55, avg2024: 78.67, avg2025: 0, monthScore: 77.3, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 5, dept: "事业一部", name: "刘奥运", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 1200, perfWage1: 500, perfWage2: 500, perfWage3: 500, satOT: 922, comprehensiveSalary: 7922, perfAdjust: -1500, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 39, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 3414.34, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 5000, grossPay: 15136.34, otherIncome: 0, socialIns: 857.26, housingFund: 1260, tax: 0, netPay: 13019.08, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 6, dept: "事业一部", name: "李柯瑶", grade: 2, isLumpSum: false, baseSalary: 2280, positionWage: 0, skillSubsidy: 98, perfWage1: 0, perfWage2: 0, perfWage3: 0, satOT: 922, comprehensiveSalary: 3300, perfAdjust: 0, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 39, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 1422.79, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 4722.79, otherIncome: 500, socialIns: 0, housingFund: 0, tax: 3.88, netPay: 5218.91, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  // ─── 事业二部 ───
  { seq: 7, dept: "事业二部", name: "沙建梅", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 600, perfWage2: 600, perfWage3: 600, satOT: 1300, comprehensiveSalary: 10600, perfAdjust: -1200, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 3040.44, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 12740.44, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 847.34, netPay: 11035.84, avg2024: 76.61, avg2025: 0, monthScore: 82, coeff1: 1, coeff2: 0, coeff3: 0 },
  { seq: 8, dept: "事业二部", name: "田炜钰", grade: 2, isLumpSum: false, baseSalary: 2280, positionWage: 0, skillSubsidy: 98, perfWage1: 0, perfWage2: 0, perfWage3: 0, satOT: 922, comprehensiveSalary: 3300, perfAdjust: 0, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 948.53, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 4248.53, otherIncome: 600, socialIns: 0, housingFund: 0, tax: 7.88, netPay: 4840.65, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 9, dept: "事业二部", name: "朱宇浩", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 1200, perfWage1: 500, perfWage2: 500, perfWage3: 500, satOT: 922, comprehensiveSalary: 7922, perfAdjust: -1500, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 13, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 1138.78, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 10200.78, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 175.66, netPay: 9167.86, avg2024: 73.78, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 10, dept: "事业二部", name: "胡杨", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 500, perfWage2: 500, perfWage3: 500, satOT: 1300, comprehensiveSalary: 10300, perfAdjust: -1500, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 2958.09, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 12058.09, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 635.60, netPay: 11422.49, avg2024: 69.28, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 11, dept: "事业二部", name: "朱文韬", grade: 2, isLumpSum: false, baseSalary: 2280, positionWage: 0, skillSubsidy: 98, perfWage1: 0, perfWage2: 0, perfWage3: 0, satOT: 922, comprehensiveSalary: 3300, perfAdjust: 0, attendDays: 6, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 1164.71, otherIncome: 1578.93, socialIns: 0, housingFund: 0, tax: 8.23, netPay: 2735.41, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  // ─── 财务部 ───
  { seq: 12, dept: "财务部", name: "黄晓兰", grade: "", isLumpSum: true, baseSalary: 0, positionWage: 0, skillSubsidy: 0, perfWage1: 0, perfWage2: 0, perfWage3: 0, satOT: 0, comprehensiveSalary: 35000, perfAdjust: 0, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 35000, otherIncome: 0, socialIns: 1260, housingFund: 3520, tax: 52.95, netPay: 30167.05, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 13, dept: "财务部", name: "王秀萍", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 1200, perfWage1: 500, perfWage2: 500, perfWage3: 500, satOT: 922, comprehensiveSalary: 7922, perfAdjust: -500, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 13, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 1138.78, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 11200.78, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 973.07, netPay: 9370.45, avg2024: 82.47, avg2025: 0, monthScore: 92, coeff1: 1, coeff2: 1, coeff3: 0 },
  { seq: 14, dept: "财务部", name: "王汝月", grade: 2, isLumpSum: false, baseSalary: 2280, positionWage: 0, skillSubsidy: 98, perfWage1: 0, perfWage2: 0, perfWage3: 0, satOT: 922, comprehensiveSalary: 3300, perfAdjust: 0, attendDays: 14, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 13, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 948.53, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 3668.44, otherIncome: 858.01, socialIns: 0, housingFund: 0, tax: 6.88, netPay: 4519.57, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  // ─── 事业三部 ───
  { seq: 15, dept: "事业三部", name: "马康风", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 900, perfWage1: 300, perfWage2: 300, perfWage3: 300, satOT: 922, comprehensiveSalary: 7222, perfAdjust: -900, attendDays: 9, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 3826.24, otherIncome: 1470, socialIns: 0, housingFund: 0, tax: 6.40, netPay: 5289.84, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 16, dept: "事业三部", name: "季蔚正", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 600, perfWage2: 600, perfWage3: 600, satOT: 922, comprehensiveSalary: 10222, perfAdjust: -1800, attendDays: 10, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 4954.24, otherIncome: 1785.93, socialIns: 0, housingFund: 0, tax: 162.00, netPay: 6578.17, avg2024: 75, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 17, dept: "事业三部", name: "沈迎凤", grade: "", isLumpSum: false, baseSalary: 5000, positionWage: 3200, skillSubsidy: 2200, perfWage1: 800, perfWage2: 800, perfWage3: 800, satOT: 2000, comprehensiveSalary: 14800, perfAdjust: -1600, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 4247.06, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 3500, grossPay: 21247.06, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 587.50, netPay: 19802.30, avg2024: 78.33, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 18, dept: "事业三部", name: "倪亚琴", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 900, perfWage1: 300, perfWage2: 300, perfWage3: 300, satOT: 922, comprehensiveSalary: 7222, perfAdjust: -300, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 7222, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 530.93, netPay: 6691.07, avg2024: 84.63, avg2025: 0, monthScore: 87.1, coeff1: 1, coeff2: 1, coeff3: 0 },
  // ─── 事业四部 ───
  { seq: 19, dept: "事业四部", name: "张洵", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 600, perfWage2: 600, perfWage3: 600, satOT: 922, comprehensiveSalary: 10222, perfAdjust: -600, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 9922, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 543.47, netPay: 9378.53, avg2024: 82.97, avg2025: 0, monthScore: 86.7, coeff1: 1, coeff2: 1, coeff3: 0 },
  { seq: 20, dept: "事业四部", name: "滕顺英", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 900, perfWage1: 300, perfWage2: 300, perfWage3: 300, satOT: 922, comprehensiveSalary: 7222, perfAdjust: -900, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 6622, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 376.84, netPay: 6245.16, avg2024: 79.59, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  // ─── 事业一部 (续) ───
  { seq: 21, dept: "事业一部", name: "戴晓燕", grade: "", isLumpSum: false, baseSalary: 5000, positionWage: 3200, skillSubsidy: 2200, perfWage1: 800, perfWage2: 800, perfWage3: 800, satOT: 1800, comprehensiveSalary: 14800, perfAdjust: -2400, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 4247.06, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 3500, grossPay: 20447.06, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 882.26, netPay: 19564.80, avg2024: 63.38, avg2025: 0, monthScore: 59.2, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 22, dept: "事业一部", name: "冯艳", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 1200, perfWage1: 500, perfWage2: 500, perfWage3: 500, satOT: 922, comprehensiveSalary: 7922, perfAdjust: -1500, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 2277.57, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 11339.57, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 809.83, netPay: 10529.74, avg2024: 68.53, avg2025: 0, monthScore: 60, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 23, dept: "事业一部", name: "王志强", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 600, perfWage2: 600, perfWage3: 600, satOT: 1300, comprehensiveSalary: 10600, perfAdjust: -1800, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 3040.44, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 14480.44, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 971.64, netPay: 12651.54, avg2024: 75.50, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 24, dept: "事业一部", name: "韩保程", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 500, perfWage2: 500, perfWage3: 500, satOT: 1300, comprehensiveSalary: 10300, perfAdjust: -1500, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 13, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 1479.78, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 10579.78, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 382.98, netPay: 10196.80, avg2024: 60.22, avg2025: 0, monthScore: 60, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 25, dept: "事业一部", name: "董纾雨", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 900, perfWage1: 300, perfWage2: 300, perfWage3: 300, satOT: 922, comprehensiveSalary: 7222, perfAdjust: -900, attendDays: 10, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 3719.41, otherIncome: 750, socialIns: 0, housingFund: 0, tax: 46.76, netPay: 4422.65, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  // ─── 设计部 ───
  { seq: 26, dept: "设计部", name: "刘健康", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 600, perfWage2: 600, perfWage3: 600, satOT: 1300, comprehensiveSalary: 10600, perfAdjust: -1800, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 3040.44, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 14480.44, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 680.68, netPay: 12942.50, avg2024: 67.17, avg2025: 0, monthScore: 61.2, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 27, dept: "设计部", name: "刘坤", grade: "", isLumpSum: false, baseSalary: 4200, positionWage: 2800, skillSubsidy: 1800, perfWage1: 700, perfWage2: 700, perfWage3: 700, satOT: 1300, comprehensiveSalary: 12200, perfAdjust: -2100, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 3505.15, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 16245.15, otherIncome: 0, socialIns: 1260, housingFund: 1260, tax: 166.82, netPay: 13559.33, avg2024: 71.44, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 28, dept: "设计部", name: "金晓锋", grade: "", isLumpSum: false, baseSalary: 5000, positionWage: 3200, skillSubsidy: 2200, perfWage1: 800, perfWage2: 800, perfWage3: 800, satOT: 2000, comprehensiveSalary: 14800, perfAdjust: -1600, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 13, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 2123.53, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 3500, grossPay: 19123.53, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 496.88, netPay: 17769.39, avg2024: 79.37, avg2025: 0, monthScore: 81.2, coeff1: 1, coeff2: 0, coeff3: 0 },
  // ─── 采购部 ───
  { seq: 29, dept: "采购部", name: "马柯", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 900, perfWage1: 300, perfWage2: 300, perfWage3: 300, satOT: 922, comprehensiveSalary: 7222, perfAdjust: -900, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 6322, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 452.47, netPay: 5869.53, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 30, dept: "采购部", name: "黄潇潇", grade: 2, isLumpSum: false, baseSalary: 2280, positionWage: 0, skillSubsidy: 98, perfWage1: 0, perfWage2: 0, perfWage3: 0, satOT: 922, comprehensiveSalary: 3300, perfAdjust: 0, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 13, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 948.53, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 4248.53, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 66.77, netPay: 4181.76, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  // ─── 生产部 (制造核心) ───
  { seq: 31, dept: "生产部", name: "张腾飞", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 500, perfWage2: 500, perfWage3: 500, satOT: 1300, comprehensiveSalary: 10300, perfAdjust: -1500, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 13, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 1479.78, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 12919.78, otherIncome: 0, socialIns: 1260, housingFund: 0, tax: 1046.23, netPay: 10613.55, avg2024: 82.48, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 32, dept: "生产部", name: "李树锋", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 1200, perfWage1: 500, perfWage2: 500, perfWage3: 500, satOT: 922, comprehensiveSalary: 7922, perfAdjust: -1500, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 9062, otherIncome: 0, socialIns: 857.26, housingFund: 1058.54, tax: 0, netPay: 7146.20, avg2024: 72.47, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 33, dept: "生产部", name: "李亚超", grade: 3, isLumpSum: false, baseSalary: 3000, positionWage: 1800, skillSubsidy: 900, perfWage1: 300, perfWage2: 300, perfWage3: 300, satOT: 922, comprehensiveSalary: 7222, perfAdjust: -900, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 6322, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 775.07, netPay: 5546.93, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 34, dept: "生产部", name: "李鹏飞", grade: 2, isLumpSum: false, baseSalary: 2280, positionWage: 0, skillSubsidy: 98, perfWage1: 0, perfWage2: 0, perfWage3: 0, satOT: 922, comprehensiveSalary: 3300, perfAdjust: 0, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 13, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 948.53, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 0, assessBonus: 0, grossPay: 4248.53, otherIncome: 500, socialIns: 0, housingFund: 0, tax: 251.25, netPay: 4497.28, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  // ─── 生产部(工人) ───
  { seq: 42, dept: "生产部", name: "匡凯旋", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 600, perfWage2: 600, perfWage3: 600, satOT: 1300, comprehensiveSalary: 10600, perfAdjust: -1200, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 13, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 1520.22, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 13560.22, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 570.58, netPay: 12132.38, avg2024: 78.17, avg2025: 0, monthScore: 82.6, coeff1: 1, coeff2: 0, coeff3: 0 },
  { seq: 43, dept: "生产部", name: "廉龙海", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 600, perfWage2: 600, perfWage3: 600, satOT: 1300, comprehensiveSalary: 10600, perfAdjust: -1800, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 3040.44, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 14480.44, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 764.04, netPay: 12859.14, avg2024: 79.75, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 47, dept: "生产部", name: "钱佳奇", grade: "", isLumpSum: false, baseSalary: 5000, positionWage: 3200, skillSubsidy: 2200, perfWage1: 800, perfWage2: 800, perfWage3: 800, satOT: 2000, comprehensiveSalary: 14800, perfAdjust: -800, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 0, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 0, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 3500, grossPay: 17800, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 1011.52, netPay: 15931.22, avg2024: 86.70, avg2025: 0, monthScore: 88.6, coeff1: 1, coeff2: 1, coeff3: 0 },
  { seq: 50, dept: "生产部", name: "孙坚", grade: "", isLumpSum: false, baseSalary: 5000, positionWage: 3200, skillSubsidy: 2200, perfWage1: 800, perfWage2: 800, perfWage3: 800, satOT: 2000, comprehensiveSalary: 14800, perfAdjust: -1600, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 13, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 2123.53, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 15623.53, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 300, netPay: 15323.53, avg2024: 80.59, avg2025: 0, monthScore: 81, coeff1: 1, coeff2: 0, coeff3: 0 },
  // ─── 售后部 ───
  { seq: 62, dept: "售后部", name: "殷金刚", grade: "", isLumpSum: false, baseSalary: 3600, positionWage: 2300, skillSubsidy: 1600, perfWage1: 600, perfWage2: 600, perfWage3: 600, satOT: 1300, comprehensiveSalary: 10600, perfAdjust: -1800, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 26, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 3040.44, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 2340, grossPay: 14480.44, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 605.68, netPay: 13017.50, avg2024: 73.28, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  { seq: 63, dept: "售后部", name: "徐树奎", grade: "", isLumpSum: false, baseSalary: 6000, positionWage: 3800, skillSubsidy: 2800, perfWage1: 1100, perfWage2: 1100, perfWage3: 1200, satOT: 2000, comprehensiveSalary: 18000, perfAdjust: -3400, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 78, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 11522.06, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 26422.06, otherIncome: 0, socialIns: 0, housingFund: 1260, tax: 224.31, netPay: 24937.75, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
  // ─── 质量部 ───
  { seq: 69, dept: "质量部", name: "洪香龙", grade: "", isLumpSum: false, baseSalary: 6000, positionWage: 3800, skillSubsidy: 2800, perfWage1: 1100, perfWage2: 1100, perfWage3: 1200, satOT: 2000, comprehensiveSalary: 18000, perfAdjust: -2200, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 52, weekendOTh: 0, holidayOTh: 0, weekdayOTpay: 7681.37, weekendOTpay: 0, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 23781.37, otherIncome: 0, socialIns: 0, housingFund: 0, tax: 503.19, netPay: 23278.18, avg2024: 77.56, avg2025: 0, monthScore: 79.6, coeff1: 1, coeff2: 0, coeff3: 0 },
  // ─── 仓储部 ───
  { seq: 84, dept: "仓储部", name: "周辉", grade: "", isLumpSum: false, baseSalary: 6000, positionWage: 3800, skillSubsidy: 2800, perfWage1: 1100, perfWage2: 1100, perfWage3: 1200, satOT: 2000, comprehensiveSalary: 18000, perfAdjust: -3400, attendDays: 17, personalLeaveH: 0, sickLeaveH: 0, personalLeaveDed: 0, sickLeaveDed: 0, weekdayOTh: 78, weekendOTh: 16, holidayOTh: 0, weekdayOTpay: 11522.06, weekendOTpay: 2647.06, holidayOTpay: 0, fullAttBonus: 300, assessBonus: 0, grossPay: 29069.12, otherIncome: 0, socialIns: 857.26, housingFund: 0, tax: 527.76, netPay: 27684.10, avg2024: 0, avg2025: 0, monthScore: 0, coeff1: 0, coeff2: 0, coeff3: 0 },
];

/**
 * 工时→薪酬联动参考: 按部门/工种的平均时薪 (元/小时)
 * 基于 202602 综合工资 / (应出勤天 × 8h) 推算
 */
export const DEPT_HOURLY_RATES: Record<string, { avgHourly: number; minHourly: number; maxHourly: number; headcount: number }> = {
  "总经办":     { avgHourly: 201.5, minHourly: 147.1, maxHourly: 257.4, headcount: 2 },
  "运营部":     { avgHourly: 183.8, minHourly: 183.8, maxHourly: 183.8, headcount: 1 },
  "设计部":     { avgHourly: 92.2,  minHourly: 77.9,  maxHourly: 108.8, headcount: 3 },
  "事业一部":   { avgHourly: 74.3,  minHourly: 24.3,  maxHourly: 132.4, headcount: 8 },
  "事业二部":   { avgHourly: 56.3,  minHourly: 24.3,  maxHourly: 75.7,  headcount: 5 },
  "事业三部":   { avgHourly: 70.3,  minHourly: 53.1,  maxHourly: 108.8, headcount: 4 },
  "事业四部":   { avgHourly: 56.4,  minHourly: 53.1,  maxHourly: 75.2,  headcount: 2 },
  "生产部":     { avgHourly: 62.7,  minHourly: 24.3,  maxHourly: 108.8, headcount: 20 },
  "采购部":     { avgHourly: 38.7,  minHourly: 24.3,  maxHourly: 53.1,  headcount: 2 },
  "售后部":     { avgHourly: 80.1,  minHourly: 44.1,  maxHourly: 132.4, headcount: 8 },
  "质量部":     { avgHourly: 96.6,  minHourly: 53.1,  maxHourly: 132.4, headcount: 4 },
  "仓储部":     { avgHourly: 82.1,  minHourly: 24.3,  maxHourly: 132.4, headcount: 6 },
  "财务部":     { avgHourly: 103.6, minHourly: 24.3,  maxHourly: 257.4, headcount: 3 },
  "人事行政部": { avgHourly: 34.4,  minHourly: 10.3,  maxHourly: 56.1,  headcount: 4 },
};

/**
 * 将 SalaryReferenceRecord → EmployeeCalcInput 转换
 * 用于薪资沙盘验算: 把 Excel 参考数据喂入 calculateEmployee() 比对
 */
export function referenceToCalcInput(ref: SalaryReferenceRecord, monthIndex: number = 2): EmployeeCalcInput {
  return {
    employeeName: ref.name,
    department: ref.dept,
    positionGrade: String(ref.grade),
    isLumpSum: ref.isLumpSum,
    baseSalary: y2c(ref.baseSalary),
    positionWage: y2c(ref.positionWage),
    skillSubsidy: y2c(ref.skillSubsidy),
    saturdayShiftPremium: y2c(ref.satOT),
    comprehensiveSalary: y2c(ref.comprehensiveSalary),
    perfWage1Base: y2c(ref.perfWage1),
    perfWage2Base: y2c(ref.perfWage2),
    perfWage3Base: y2c(ref.perfWage3),
    monthlyScore: ref.monthScore,
    avg2024: ref.avg2024,
    avg2025: ref.avg2025,
    scheduledDays: 17,
    actualDays: ref.attendDays,
    personalLeaveHours: ref.personalLeaveH,
    sickLeaveHours: ref.sickLeaveH,
    weekdayOtHours: ref.weekdayOTh,
    weekendOtHours: ref.weekendOTh,
    holidayOtHours: ref.holidayOTh,
    cashSubsidy: 0,
    travelCarSubsidy: 0,
    socialInsurance: y2c(ref.socialIns),
    housingFund: y2c(ref.housingFund),
    cumulativeIncomePrior: 0,
    cumulativeDeductionPrior: 0,
    cumulativeTaxPaidPrior: 0,
    monthIndex,
    specialDeduction: 0,
    perfectAttendanceBonus: y2c(ref.fullAttBonus),
    assessmentBonus: y2c(ref.assessBonus),
    otherIncome: y2c(ref.otherIncome),
    excelGrossPay: y2c(ref.grossPay),
    excelNetPay: y2c(ref.netPay),
    excelTax: y2c(ref.tax),
  };
}
