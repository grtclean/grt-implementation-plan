/**
 * Payroll Sandbox — Drizzle Schema
 *
 * 10 tables for the CEO's payroll sandbox initiative.
 * Architecture: Input Tables → Calc Engine → Result Tables → Adjustment → Payout
 *
 * Pilot month: 202601 (January 2026)
 *
 * Data sensitivity rules:
 * - ps_payout: bank accounts, ID numbers — HR/Finance only
 * - AI sandbox: NEVER sees bank/ID/phone, only aggregated amounts
 * - All monetary amounts: DECIMAL(14,2), never floats
 *
 * Naming: ps_ prefix = "payroll sandbox"
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  text,
  timestamp,
  json,
  boolean,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────

export const psCycleStatusEnum = pgEnum("ps_cycle_status_enum", [
  "draft",         // 草稿 — 刚创建
  "importing",     // 导入中 — 正在从Excel/CSV导入
  "imported",      // 已导入 — 输入数据就绪
  "calculating",   // 计算中 — AI引擎正在计算
  "calculated",    // 已计算 — 结果已生成
  "reviewing",     // 审核中 — HR/Finance审核
  "approved",      // 已审批 — CEO审批通过
  "locked",        // 已锁定 — 发薪完成，不可修改
]);

export const psAllowanceTypeEnum = pgEnum("ps_allowance_type_enum", [
  "cash_subsidy",       // 现金补贴
  "travel_car",         // 出差车补
  "meal",               // 餐补
  "communication",      // 通讯补贴
  "housing",            // 住房补贴
  "other",              // 其他
]);

export const psAdjustTypeEnum = pgEnum("ps_adjust_type_enum", [
  "perf_wage_override",   // 绩效工资手动调整
  "attendance_correction", // 考勤修正
  "bonus_addition",       // 奖金追加
  "deduction_correction", // 扣款修正
  "retroactive",          // 补发/追扣
  "other",                // 其他
]);

export const psAdjustStatusEnum = pgEnum("ps_adjust_status_enum", [
  "draft",      // 草稿
  "pending",    // 待审批
  "approved",   // 已审批
  "rejected",   // 已驳回
  "applied",    // 已应用到结果
]);

export const psPayoutStatusEnum = pgEnum("ps_payout_status_enum", [
  "pending",     // 待发放
  "processing",  // 发放中
  "completed",   // 已完成
  "failed",      // 失败
  "cancelled",   // 已取消
]);

export const psPositionCategoryEnum = pgEnum("ps_position_category_enum", [
  "indirect",    // 间接人员 (管理/技术/销售)
  "direct",      // 直接人员 (生产一线)
]);

// ── 1. Payroll Sandbox Cycles — 工资周期 ─────────────────

export const payrollSandboxCycles = pgTable("payroll_sandbox_cycles", {
  id: serial("id").primaryKey(),
  period: varchar("period", { length: 7 }).notNull().unique(),  // YYYY-MM
  name: varchar("name", { length: 100 }).notNull(),              // e.g. "2026年1月工资"
  status: psCycleStatusEnum("status").notNull().default("draft"),

  // 工作日参数
  workDays: integer("work_days").notNull().default(22),           // 本月应出勤天数
  dailyWorkHours: decimal("daily_work_hours", { precision: 4, scale: 1 }).notNull().default("8.0"),

  // 统计快照 (计算完成后写入)
  totalEmployees: integer("total_employees").default(0),
  totalGrossPay: decimal("total_gross_pay", { precision: 16, scale: 2 }).default("0"),
  totalNetPay: decimal("total_net_pay", { precision: 16, scale: 2 }).default("0"),
  totalTax: decimal("total_tax", { precision: 16, scale: 2 }).default("0"),
  totalSocialInsurance: decimal("total_social_insurance", { precision: 16, scale: 2 }).default("0"),

  // 导入元数据
  importedAt: timestamp("imported_at", { mode: "string" }),
  importedById: integer("imported_by_id"),
  calculatedAt: timestamp("calculated_at", { mode: "string" }),
  approvedAt: timestamp("approved_at", { mode: "string" }),
  approvedById: integer("approved_by_id"),
  lockedAt: timestamp("locked_at", { mode: "string" }),

  remarks: text("remarks"),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// ── 2. Attendance Input — 考勤导入 ──────────────────────

export const psAttendanceInput = pgTable("ps_attendance_input", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),                              // FK to users (matched after import)
  department: varchar("department", { length: 100 }),
  employeeCode: varchar("employee_code", { length: 50 }),          // 工号
  position: varchar("position", { length: 100 }),                  // 职位
  attendanceGroup: varchar("attendance_group", { length: 50 }),    // 考勤组 (6天工人/6天办公室/5天办公室)

  // 出勤统计
  restDays: integer("rest_days").default(0),                       // 休息天数
  scheduledDays: integer("scheduled_days").default(0),             // 应出勤天数
  actualAttendance: decimal("actual_attendance", { precision: 5, scale: 1 }).default("0"),  // 实际出勤
  workHours: decimal("work_hours", { precision: 7, scale: 1 }).default("0"),                // 工作时长(小时)

  // 异常
  lateCount: integer("late_count").default(0),                     // 迟到次数
  severeLateCount: integer("severe_late_count").default(0),        // 严重迟到次数
  absentLateDays: decimal("absent_late_days", { precision: 5, scale: 1 }).default("0"),   // 旷工迟到天数
  earlyLeaveCount: integer("early_leave_count").default(0),        // 早退次数
  absentDays: decimal("absent_days", { precision: 5, scale: 1 }).default("0"),            // 旷工天数
  clockMissUpper: integer("clock_miss_upper").default(0),          // 上班缺卡次数
  clockMissLower: integer("clock_miss_lower").default(0),          // 下班缺卡次数

  // 请假明细
  annualLeaveDays: decimal("annual_leave_days", { precision: 5, scale: 1 }).default("0"),       // 年假(天)
  personalLeaveHours: decimal("personal_leave_hours", { precision: 7, scale: 1 }).default("0"), // 事假(小时)
  sickLeaveHours: decimal("sick_leave_hours", { precision: 7, scale: 1 }).default("0"),         // 病假(小时)
  compensatoryLeaveHours: decimal("compensatory_leave_hours", { precision: 7, scale: 1 }).default("0"), // 调休(小时)
  maternityDays: decimal("maternity_days", { precision: 5, scale: 1 }).default("0"),            // 产假(天)
  paternityDays: decimal("paternity_days", { precision: 5, scale: 1 }).default("0"),            // 陪产假(天)
  marriageDays: decimal("marriage_days", { precision: 5, scale: 1 }).default("0"),              // 婚假(天)
  menstrualDays: decimal("menstrual_days", { precision: 5, scale: 1 }).default("0"),            // 例假(天)
  bereavementDays: decimal("bereavement_days", { precision: 5, scale: 1 }).default("0"),        // 丧假(天)
  nursingHours: decimal("nursing_hours", { precision: 7, scale: 1 }).default("0"),              // 哺乳假(小时)

  // 加班统计 (小时)
  totalOvertimeHours: decimal("total_overtime_hours", { precision: 7, scale: 1 }).default("0"),
  overtimeForPayHours: decimal("overtime_for_pay_hours", { precision: 7, scale: 1 }).default("0"),    // 转加班费的总计
  weekdayOvertimeForPay: decimal("weekday_overtime_for_pay", { precision: 7, scale: 1 }).default("0"), // 工作日(转加班费)
  weekendOvertimeForPay: decimal("weekend_overtime_for_pay", { precision: 7, scale: 1 }).default("0"), // 休息日(转加班费)
  holidayOvertimeForPay: decimal("holiday_overtime_for_pay", { precision: 7, scale: 1 }).default("0"), // 节假日(转加班费)
  weekdayOvertime: decimal("weekday_overtime", { precision: 7, scale: 1 }).default("0"),       // 工作日(不转费)
  weekendOvertime: decimal("weekend_overtime", { precision: 7, scale: 1 }).default("0"),       // 休息日(不转费)
  holidayOvertime: decimal("holiday_overtime", { precision: 7, scale: 1 }).default("0"),       // 节假日(不转费)
  saturdaySupplement: decimal("saturday_supplement", { precision: 7, scale: 1 }).default("0"), // 周六补充

  // 原始数据
  rawData: json("raw_data"),                                       // 原始CSV行JSON
  dataSource: varchar("data_source", { length: 50 }).default("csv_import"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_attendance_cycle_idx").on(table.cycleId),
  index("ps_attendance_employee_idx").on(table.employeeName),
]);

// ── 3. Performance Input — 绩效导入 ────────────────────

export const psPerformanceInput = pgTable("ps_performance_input", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),
  employeeGrtId: varchar("employee_grt_id", { length: 20 }),       // GRT工号 (e.g. GRT003)
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),                  // 职务
  positionCategory: psPositionCategoryEnum("position_category"),   // 职务类别 (间接/直接)
  isEvaluated: boolean("is_evaluated").default(true),              // 是否考核

  // 月度得分 (0-100)
  monthlyScore: decimal("monthly_score", { precision: 5, scale: 1 }),       // 本月绩效得分

  // 历史平均 (用于系数计算)
  avg2024Score: decimal("avg_2024_score", { precision: 5, scale: 2 }),      // 2024年平均得分
  avg2025Score: decimal("avg_2025_score", { precision: 5, scale: 2 }),      // 2025年平均得分
  preset2026Score: decimal("preset_2026_score", { precision: 5, scale: 2 }),// 2026预设得分

  // 系数 (由引擎计算，也可手动填入)
  perfCoeff1: decimal("perf_coeff_1", { precision: 5, scale: 2 }),          // 绩效工资1系数
  perfCoeff2: decimal("perf_coeff_2", { precision: 5, scale: 2 }),          // 绩效工资2系数
  perfCoeff3: decimal("perf_coeff_3", { precision: 5, scale: 2 }),          // 绩效工资3系数

  // 绩效工资基数 (从salary_structures快照过来)
  perfWage1Base: decimal("perf_wage1_base", { precision: 14, scale: 2 }).default("0"),
  perfWage2Base: decimal("perf_wage2_base", { precision: 14, scale: 2 }).default("0"),
  perfWage3Base: decimal("perf_wage3_base", { precision: 14, scale: 2 }).default("0"),

  rawData: json("raw_data"),
  dataSource: varchar("data_source", { length: 50 }).default("csv_import"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_perf_cycle_idx").on(table.cycleId),
  index("ps_perf_employee_idx").on(table.employeeName),
]);

// ── 4. Allowance Input — 补贴导入 ──────────────────────

export const psAllowanceInput = pgTable("ps_allowance_input", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),
  allowanceType: psAllowanceTypeEnum("allowance_type").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  department: varchar("department", { length: 100 }),
  remarks: text("remarks"),

  rawData: json("raw_data"),
  dataSource: varchar("data_source", { length: 50 }).default("csv_import"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_allowance_cycle_idx").on(table.cycleId),
  index("ps_allowance_employee_idx").on(table.employeeName),
]);

// ── 5. Social Fund Input — 社保公积金导入 ──────────────

export const psSocialFundInput = pgTable("ps_social_fund_input", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),
  department: varchar("department", { length: 100 }),
  hireDate: varchar("hire_date", { length: 20 }),                  // 入职日期
  lastWorkDate: varchar("last_work_date", { length: 20 }),         // 最后工作日

  // 社保+医保 (个人部分)
  socialInsurancePersonal: decimal("social_insurance_personal", { precision: 14, scale: 2 }).notNull().default("0"),
  // 公积金 (个人部分)
  housingFundPersonal: decimal("housing_fund_personal", { precision: 14, scale: 2 }).notNull().default("0"),
  // 合计
  totalPersonal: decimal("total_personal", { precision: 14, scale: 2 }).notNull().default("0"),

  rawData: json("raw_data"),
  dataSource: varchar("data_source", { length: 50 }).default("csv_import"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_social_cycle_idx").on(table.cycleId),
  index("ps_social_employee_idx").on(table.employeeName),
]);

// ── 6. Tax Snapshot — 累计个税快照 ─────────────────────

export const psTaxSnapshot = pgTable("ps_tax_snapshot", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),

  // 累计预扣法 所需参数
  cumulativeIncomePrior: decimal("cumulative_income_prior", { precision: 16, scale: 2 }).notNull().default("0"),     // 本月前累计收入
  cumulativeDeductionPrior: decimal("cumulative_deduction_prior", { precision: 16, scale: 2 }).notNull().default("0"), // 本月前累计扣除
  cumulativeTaxPaidPrior: decimal("cumulative_tax_paid_prior", { precision: 16, scale: 2 }).notNull().default("0"),   // 本月前累计已缴个税
  monthIndex: integer("month_index").notNull().default(1),          // 第N个月 (1月=1)

  // 专项附加扣除 (每月)
  specialDeduction: decimal("special_deduction", { precision: 14, scale: 2 }).notNull().default("0"),   // 专项附加扣除
  basicExemption: decimal("basic_exemption", { precision: 14, scale: 2 }).notNull().default("5000"),    // 基本减除费用 (5000/月)

  remarks: text("remarks"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_tax_cycle_idx").on(table.cycleId),
  index("ps_tax_employee_idx").on(table.employeeName),
]);

// ── 7. Calculation Result — 中间计算结果 ───────────────

export const psCalcResult = pgTable("ps_calc_result", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),
  department: varchar("department", { length: 100 }),
  positionGrade: varchar("position_grade", { length: 20 }),

  // ── 固薪项 (从salary_structures快照) ──
  baseSalary: decimal("base_salary", { precision: 14, scale: 2 }).notNull().default("0"),             // 基本工资
  positionWage: decimal("position_wage", { precision: 14, scale: 2 }).notNull().default("0"),         // 岗位工资
  skillSubsidy: decimal("skill_subsidy", { precision: 14, scale: 2 }).notNull().default("0"),         // 技能补贴
  saturdayShiftPremium: decimal("saturday_shift_premium", { precision: 14, scale: 2 }).notNull().default("0"), // 周六加班固定
  comprehensiveSalary: decimal("comprehensive_salary", { precision: 14, scale: 2 }).notNull().default("0"),   // 综合工资

  // ── 绩效工资 (3档) ──
  perfWage1: decimal("perf_wage1", { precision: 14, scale: 2 }).notNull().default("0"),               // 绩效工资1 = base × coeff
  perfWage2: decimal("perf_wage2", { precision: 14, scale: 2 }).notNull().default("0"),               // 绩效工资2
  perfWage3: decimal("perf_wage3", { precision: 14, scale: 2 }).notNull().default("0"),               // 绩效工资3
  perfAdjustment: decimal("perf_adjustment", { precision: 14, scale: 2 }).notNull().default("0"),     // 绩效工资调整 (negative = deducted)
  perfCoeff1: decimal("calc_perf_coeff1", { precision: 5, scale: 2 }),
  perfCoeff2: decimal("calc_perf_coeff2", { precision: 5, scale: 2 }),
  perfCoeff3: decimal("calc_perf_coeff3", { precision: 5, scale: 2 }),
  perfDeduction1: decimal("perf_deduction1", { precision: 14, scale: 2 }).notNull().default("0"),     // 绩效工资1扣除
  perfDeduction2: decimal("perf_deduction2", { precision: 14, scale: 2 }).notNull().default("0"),     // 绩效工资2扣除
  perfDeduction3: decimal("perf_deduction3", { precision: 14, scale: 2 }).notNull().default("0"),     // 绩效工资3扣除

  // ── 出勤相关 ──
  actualAttendanceDays: decimal("actual_attendance_days", { precision: 5, scale: 1 }).notNull().default("0"),
  personalLeaveHours: decimal("personal_leave_hours", { precision: 7, scale: 1 }).notNull().default("0"),
  sickLeaveHours: decimal("sick_leave_hours", { precision: 7, scale: 1 }).notNull().default("0"),
  personalLeaveDeduction: decimal("personal_leave_deduction", { precision: 14, scale: 2 }).notNull().default("0"),
  sickLeaveDeduction: decimal("sick_leave_deduction", { precision: 14, scale: 2 }).notNull().default("0"),

  // ── 加班 ──
  weekdayOvertimeHours: decimal("weekday_ot_hours", { precision: 7, scale: 1 }).notNull().default("0"),
  weekendOvertimeHours: decimal("weekend_ot_hours", { precision: 7, scale: 1 }).notNull().default("0"),
  holidayOvertimeHours: decimal("holiday_ot_hours", { precision: 7, scale: 1 }).notNull().default("0"),
  weekdayOvertimePay: decimal("weekday_ot_pay", { precision: 14, scale: 2 }).notNull().default("0"),
  weekendOvertimePay: decimal("weekend_ot_pay", { precision: 14, scale: 2 }).notNull().default("0"),
  holidayOvertimePay: decimal("holiday_ot_pay", { precision: 14, scale: 2 }).notNull().default("0"),

  // ── 补贴 ──
  cashSubsidy: decimal("cash_subsidy", { precision: 14, scale: 2 }).notNull().default("0"),
  travelCarSubsidy: decimal("travel_car_subsidy", { precision: 14, scale: 2 }).notNull().default("0"),

  // ── 奖金 ──
  perfectAttendanceBonus: decimal("perfect_attendance_bonus", { precision: 14, scale: 2 }).notNull().default("0"),
  assessmentBonus: decimal("assessment_bonus", { precision: 14, scale: 2 }).notNull().default("0"),    // 考核奖金

  // ── 汇总 ──
  grossPay: decimal("gross_pay", { precision: 14, scale: 2 }).notNull().default("0"),                  // 应发工资
  otherIncome: decimal("other_income", { precision: 14, scale: 2 }).notNull().default("0"),            // 其它

  // ── 扣除 ──
  socialInsurance: decimal("social_insurance", { precision: 14, scale: 2 }).notNull().default("0"),    // 社保个人
  housingFund: decimal("housing_fund", { precision: 14, scale: 2 }).notNull().default("0"),            // 公积金个人
  incomeTax: decimal("income_tax", { precision: 14, scale: 2 }).notNull().default("0"),                // 个税

  // ── 结果 ──
  netPay: decimal("net_pay", { precision: 14, scale: 2 }).notNull().default("0"),                      // 实发 = 应发 - 社保 - 公积金 - 个税 + 其它

  // ── 计算详情 ──
  calculationLog: json("calculation_log"),                         // 步骤明细JSON
  formulaDetails: json("formula_details"),                         // 每个字段的公式解释
  diffFromExcel: json("diff_from_excel"),                          // 与Excel原表差异

  isLumpSum: boolean("is_lump_sum").notNull().default(false),      // 包薪制 (CEO/CFO)
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_calc_cycle_idx").on(table.cycleId),
  index("ps_calc_employee_idx").on(table.employeeName),
]);

// ── 8. Final Result — 最终结果 (对标Excel) ─────────────

export const psFinalResult = pgTable("ps_final_result", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  calcResultId: integer("calc_result_id"),                         // FK → ps_calc_result
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),
  department: varchar("department", { length: 100 }),
  positionGrade: varchar("position_grade", { length: 20 }),

  // 与Excel完全对齐的最终数字 (调整后)
  grossPay: decimal("gross_pay", { precision: 14, scale: 2 }).notNull(),
  socialInsurance: decimal("social_insurance", { precision: 14, scale: 2 }).notNull().default("0"),
  housingFund: decimal("housing_fund", { precision: 14, scale: 2 }).notNull().default("0"),
  incomeTax: decimal("income_tax", { precision: 14, scale: 2 }).notNull().default("0"),
  otherIncome: decimal("other_income", { precision: 14, scale: 2 }).notNull().default("0"),
  netPay: decimal("net_pay", { precision: 14, scale: 2 }).notNull(),

  // Excel参考值 (导入时存下来用于对比)
  excelGrossPay: decimal("excel_gross_pay", { precision: 14, scale: 2 }),
  excelNetPay: decimal("excel_net_pay", { precision: 14, scale: 2 }),
  excelTax: decimal("excel_tax", { precision: 14, scale: 2 }),

  // 差异
  grossDiff: decimal("gross_diff", { precision: 14, scale: 2 }).default("0"),  // 系统-Excel差值
  netDiff: decimal("net_diff", { precision: 14, scale: 2 }).default("0"),
  taxDiff: decimal("tax_diff", { precision: 14, scale: 2 }).default("0"),
  isMatched: boolean("is_matched").default(false),                             // |diff| < 0.01

  // 审核
  reviewedById: integer("reviewed_by_id"),
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  reviewNote: text("review_note"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_result_cycle_idx").on(table.cycleId),
  index("ps_result_employee_idx").on(table.employeeName),
]);

// ── 9. Adjustment — 手动调整 ──────────────────────────

export const psAdjustment = pgTable("ps_adjustment", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  resultId: integer("result_id"),                                  // FK → ps_final_result
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),

  adjustType: psAdjustTypeEnum("adjust_type").notNull(),
  fieldName: varchar("field_name", { length: 50 }),                // 调整的字段名
  originalValue: decimal("original_value", { precision: 14, scale: 2 }),
  adjustedValue: decimal("adjusted_value", { precision: 14, scale: 2 }).notNull(),
  adjustAmount: decimal("adjust_amount", { precision: 14, scale: 2 }).notNull(),  // 调整金额 (正=加, 负=减)

  reason: text("reason").notNull(),                                // 调整原因 (必填)
  status: psAdjustStatusEnum("status").notNull().default("draft"),

  // 审批
  createdById: integer("created_by_id"),
  approvedById: integer("approved_by_id"),
  approvedAt: timestamp("approved_at", { mode: "string" }),
  rejectedReason: text("rejected_reason"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_adjust_cycle_idx").on(table.cycleId),
  index("ps_adjust_employee_idx").on(table.employeeName),
  index("ps_adjust_status_idx").on(table.status),
]);

// ── 10. Payout — 发薪记录 (⚠️ 高敏感) ────────────────
// 安全: 仅 HR/Finance + CEO 可访问
// AI沙盘: 永远不传入此表数据

export const psPayout = pgTable("ps_payout", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  resultId: integer("result_id"),                                  // FK → ps_final_result
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),

  // 发薪金额
  netPayAmount: decimal("net_pay_amount", { precision: 14, scale: 2 }).notNull(),

  // ⚠️ 以下为高敏感字段 — 不可传给AI, 不可批量导出
  bankName: varchar("bank_name", { length: 100 }),                 // 开户行
  bankAccount: varchar("bank_account", { length: 50 }),            // 银行卡号
  idNumber: varchar("id_number", { length: 20 }),                  // 身份证号
  phoneNumber: varchar("phone_number", { length: 20 }),            // 手机号

  // 发薪状态
  status: psPayoutStatusEnum("status").notNull().default("pending"),
  paidAt: timestamp("paid_at", { mode: "string" }),
  paymentRef: varchar("payment_ref", { length: 100 }),             // 银行流水号
  failureReason: text("failure_reason"),

  processedById: integer("processed_by_id"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_payout_cycle_idx").on(table.cycleId),
  index("ps_payout_status_idx").on(table.status),
]);

// ── Relations ────────────────────────────────────────────

export const payrollSandboxCyclesRelations = relations(payrollSandboxCycles, ({ many }) => ({
  attendanceInputs: many(psAttendanceInput),
  performanceInputs: many(psPerformanceInput),
  allowanceInputs: many(psAllowanceInput),
  socialFundInputs: many(psSocialFundInput),
  taxSnapshots: many(psTaxSnapshot),
  calcResults: many(psCalcResult),
  finalResults: many(psFinalResult),
  adjustments: many(psAdjustment),
  payouts: many(psPayout),
}));

export const psAttendanceInputRelations = relations(psAttendanceInput, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psAttendanceInput.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psPerformanceInputRelations = relations(psPerformanceInput, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psPerformanceInput.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psAllowanceInputRelations = relations(psAllowanceInput, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psAllowanceInput.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psSocialFundInputRelations = relations(psSocialFundInput, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psSocialFundInput.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psTaxSnapshotRelations = relations(psTaxSnapshot, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psTaxSnapshot.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psCalcResultRelations = relations(psCalcResult, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psCalcResult.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psFinalResultRelations = relations(psFinalResult, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psFinalResult.cycleId], references: [payrollSandboxCycles.id] }),
  calcResult: one(psCalcResult, { fields: [psFinalResult.calcResultId], references: [psCalcResult.id] }),
}));

export const psAdjustmentRelations = relations(psAdjustment, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psAdjustment.cycleId], references: [payrollSandboxCycles.id] }),
  result: one(psFinalResult, { fields: [psAdjustment.resultId], references: [psFinalResult.id] }),
}));

export const psPayoutRelations = relations(psPayout, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psPayout.cycleId], references: [payrollSandboxCycles.id] }),
  result: one(psFinalResult, { fields: [psPayout.resultId], references: [psFinalResult.id] }),
}));

// ── Type exports ─────────────────────────────────────────

export type PayrollSandboxCycle = InferSelectModel<typeof payrollSandboxCycles>;
export type InsertPayrollSandboxCycle = InferInsertModel<typeof payrollSandboxCycles>;
export type PsAttendanceInput = InferSelectModel<typeof psAttendanceInput>;
export type InsertPsAttendanceInput = InferInsertModel<typeof psAttendanceInput>;
export type PsPerformanceInput = InferSelectModel<typeof psPerformanceInput>;
export type InsertPsPerformanceInput = InferInsertModel<typeof psPerformanceInput>;
export type PsAllowanceInput = InferSelectModel<typeof psAllowanceInput>;
export type InsertPsAllowanceInput = InferInsertModel<typeof psAllowanceInput>;
export type PsSocialFundInput = InferSelectModel<typeof psSocialFundInput>;
export type InsertPsSocialFundInput = InferInsertModel<typeof psSocialFundInput>;
export type PsTaxSnapshot = InferSelectModel<typeof psTaxSnapshot>;
export type InsertPsTaxSnapshot = InferInsertModel<typeof psTaxSnapshot>;
export type PsCalcResult = InferSelectModel<typeof psCalcResult>;
export type InsertPsCalcResult = InferInsertModel<typeof psCalcResult>;
export type PsFinalResult = InferSelectModel<typeof psFinalResult>;
export type InsertPsFinalResult = InferInsertModel<typeof psFinalResult>;
export type PsAdjustment = InferSelectModel<typeof psAdjustment>;
export type InsertPsAdjustment = InferInsertModel<typeof psAdjustment>;
export type PsPayout = InferSelectModel<typeof psPayout>;
export type InsertPsPayout = InferInsertModel<typeof psPayout>;
