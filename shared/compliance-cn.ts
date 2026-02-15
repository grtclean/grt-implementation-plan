/**
 * GRT智能系统 - 中国劳动法合规常量与类型
 * 覆盖：劳动合同法/加班规则/年假/产假/五险一金
 */

// ============================================================
// 加班限制 (劳动合同法 §36, §41, §44)
// ============================================================
export const CN_OVERTIME_LIMITS = {
  /** 月加班上限（小时） */
  monthlyMaxHours: 36,
  /** 标准工时（小时/天） */
  standardDailyHours: 8,
  /** 标准工时（小时/周） */
  standardWeeklyHours: 40,
  /** 工作日加班工资倍率 */
  weekdayMultiplier: 1.5,
  /** 周末加班工资倍率 */
  weekendMultiplier: 2.0,
  /** 法定节假日加班工资倍率 */
  holidayMultiplier: 3.0,
  /** 每日加班上限（小时）—— 一般不超过1h, 特殊不超过3h */
  dailyMaxHours: 3,
} as const;

// ============================================================
// 带薪年假 (职工带薪年休假条例 §3)
// ============================================================
export const CN_ANNUAL_LEAVE = [
  { minYears: 1, maxYears: 10, days: 5, label: "1-10年工龄" },
  { minYears: 10, maxYears: 20, days: 10, label: "10-20年工龄" },
  { minYears: 20, maxYears: Infinity, days: 15, label: "20年以上工龄" },
] as const;

// ============================================================
// 产假/陪产假
// ============================================================
export const CN_MATERNITY_LEAVE = {
  baseDays: 98,
  /** 难产加15天 */
  difficultBirthExtra: 15,
  /** 多胞胎每多一个加15天 */
  multipleExtra: 15,
  /** 各省延长产假（示例） */
  regionalExtensions: {
    上海: 60,
    江苏: 60,
    浙江: 60,
    广东: 80,
    北京: 60,
  } as Record<string, number>,
  /** 陪产假（各省不同） */
  paternityLeave: {
    上海: 10,
    江苏: 15,
    浙江: 15,
    广东: 15,
    北京: 15,
  } as Record<string, number>,
} as const;

// ============================================================
// 五险一金费率 — GRT运营城市 (2026基准)
// ============================================================
export interface SocialInsuranceRates {
  city: string;
  /** 养老保险 — 单位/个人缴费比例 */
  pension: { employer: number; employee: number };
  /** 医疗保险 */
  medical: { employer: number; employee: number };
  /** 失业保险 */
  unemployment: { employer: number; employee: number };
  /** 工伤保险（单位缴纳，行业差异） */
  workInjury: { employer: number; employee: number };
  /** 生育保险（已并入医疗） */
  maternity: { employer: number; employee: number };
  /** 住房公积金 — 默认比例区间 */
  housingFund: { min: number; max: number; default: number };
  /** 缴费基数上限（元/月） */
  baseCeiling: number;
  /** 缴费基数下限（元/月） */
  baseFloor: number;
}

export const CN_SOCIAL_INSURANCE_RATES: SocialInsuranceRates[] = [
  {
    city: "上海",
    pension: { employer: 0.16, employee: 0.08 },
    medical: { employer: 0.095, employee: 0.02 },
    unemployment: { employer: 0.005, employee: 0.005 },
    workInjury: { employer: 0.0026, employee: 0 },
    maternity: { employer: 0, employee: 0 }, // 已并入医疗
    housingFund: { min: 0.05, max: 0.12, default: 0.07 },
    baseCeiling: 36549,
    baseFloor: 7310,
  },
  {
    city: "苏州",
    pension: { employer: 0.16, employee: 0.08 },
    medical: { employer: 0.08, employee: 0.02 },
    unemployment: { employer: 0.005, employee: 0.005 },
    workInjury: { employer: 0.004, employee: 0 },
    maternity: { employer: 0, employee: 0 },
    housingFund: { min: 0.05, max: 0.12, default: 0.08 },
    baseCeiling: 31884,
    baseFloor: 4494,
  },
  {
    city: "无锡",
    pension: { employer: 0.16, employee: 0.08 },
    medical: { employer: 0.08, employee: 0.02 },
    unemployment: { employer: 0.005, employee: 0.005 },
    workInjury: { employer: 0.004, employee: 0 },
    maternity: { employer: 0, employee: 0 },
    housingFund: { min: 0.05, max: 0.12, default: 0.08 },
    baseCeiling: 31884,
    baseFloor: 4494,
  },
];

// ============================================================
// 类型定义
// ============================================================

export interface CNOvertimeAnalysis {
  totalOvertimeHours: number;
  monthlyLimit: number;
  complianceStatus: "合规" | "预警" | "违规";
  violations: Array<{ date: string; type: string; hours: number; issue: string }>;
  weekdayOT: number;
  weekendOT: number;
  holidayOT: number;
  overtimePay: number;
  recommendations: string[];
}

export interface SocialInsuranceResult {
  city: string;
  baseSalary: number;
  employeeContribution: {
    pension: number;
    medical: number;
    unemployment: number;
    housingFund: number;
    total: number;
  };
  employerContribution: {
    pension: number;
    medical: number;
    unemployment: number;
    workInjury: number;
    housingFund: number;
    total: number;
  };
  totalMonthly: number;
  annualCost: number;
  breakdown: Array<{ item: string; employerRate: string; employerAmount: number; employeeRate: string; employeeAmount: number }>;
  comparisonWithBenchmark: string;
  recommendations: string[];
}

export interface CNComplianceAlert {
  alertId: string;
  type: "overtime" | "leave" | "contract" | "insurance" | "other";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  affectedEmployees: number;
  regulation: string;
  deadline?: string;
  recommendations: string[];
}

/**
 * 根据工龄获取年假天数
 */
export function getAnnualLeaveDays(yearsOfService: number): number {
  if (yearsOfService < 1) return 0;
  for (const tier of CN_ANNUAL_LEAVE) {
    if (yearsOfService >= tier.minYears && yearsOfService < tier.maxYears) {
      return tier.days;
    }
  }
  return 15;
}

/**
 * 获取城市社保费率
 */
export function getCityRates(city: string): SocialInsuranceRates | undefined {
  return CN_SOCIAL_INSURANCE_RATES.find((r) => r.city === city);
}
