/**
 * Smart Payroll Engine — Drizzle Schema
 *
 * 4 core tables + 2 supporting tables for the GRT payroll computation pipeline.
 * All monetary amounts stored as DECIMAL(14,2) — never floats.
 *
 * Tables:
 * 1. salary_structures — fixed pay components per employee
 * 2. attendance_records — monthly attendance & leave deductions
 * 3. performance_evaluations — MBO scoring & bonus calculation
 * 4. payroll_ledgers — master payslip with state machine
 * 5. payroll_approval_logs — audit trail for every state transition
 * 6. payroll_excellence_awards — 评优表 (outstanding contributors)
 *
 * Status machine: DRAFT → HR_VERIFIED → FINANCE_APPROVED → CEO_APPROVED → PAID
 *
 * Chinese tax law: 7-bracket progressive individual income tax (2019 reform)
 * Social insurance: 五险一金 (pension 8%, medical 2%, unemployment 0.5%, housing fund 12%)
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
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────

export const payrollStatusEnum = pgEnum("payroll_status_enum", [
  "DRAFT",
  "HR_VERIFIED",
  "FINANCE_APPROVED",
  "CEO_APPROVED",
  "PAID",
  "REJECTED",
  "VOIDED",
]);

export const leaveTypeEnum = pgEnum("leave_type_enum", [
  "annual",      // 年假
  "sick",        // 病假
  "personal",    // 事假
  "maternity",   // 产假
  "paternity",   // 陪产假
  "bereavement", // 丧假
  "marriage",    // 婚假
  "work_injury", // 工伤假
]);

export const evaluationGradeEnum = pgEnum("evaluation_grade_enum", [
  "S",  // 卓越 (150%)
  "A",  // 优秀 (120%)
  "B",  // 良好 (100%)
  "C",  // 合格 (80%)
  "D",  // 不合格 (60%)
]);

export const awardTypeEnum = pgEnum("award_type_enum", [
  "outstanding_contributor",  // 突出贡献奖
  "innovation",               // 创新奖
  "quality_excellence",       // 质量标兵
  "safety_champion",          // 安全卫士
  "team_collaboration",       // 团队协作奖
  "customer_service",         // 客户服务奖
]);

// ── 1. Salary Structures — 薪资架构 ─────────────────────

export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  effectiveFrom: varchar("effective_from", { length: 10 }).notNull(), // YYYY-MM-DD
  effectiveTo: varchar("effective_to", { length: 10 }),               // null = current

  // 固薪组成 (all DECIMAL(14,2), stored as strings for precision)
  baseSalary: decimal("base_salary", { precision: 14, scale: 2 }).notNull(),           // 基本工资
  positionAllowance: decimal("position_allowance", { precision: 14, scale: 2 }).notNull().default("0"), // 岗位津贴
  confidentialityAllowance: decimal("confidentiality_allowance", { precision: 14, scale: 2 }).notNull().default("0"), // 保密津贴
  technicalAllowance: decimal("technical_allowance", { precision: 14, scale: 2 }).notNull().default("0"), // 技术津贴
  seniorityAllowance: decimal("seniority_allowance", { precision: 14, scale: 2 }).notNull().default("0"), // 工龄津贴
  mealAllowance: decimal("meal_allowance", { precision: 14, scale: 2 }).notNull().default("0"),           // 餐补
  transportAllowance: decimal("transport_allowance", { precision: 14, scale: 2 }).notNull().default("0"), // 交通补贴
  communicationAllowance: decimal("communication_allowance", { precision: 14, scale: 2 }).notNull().default("0"), // 通讯补贴

  // 社保公积金基数
  socialInsuranceBase: decimal("social_insurance_base", { precision: 14, scale: 2 }).notNull(), // 社保缴纳基数
  housingFundBase: decimal("housing_fund_base", { precision: 14, scale: 2 }).notNull(),         // 公积金缴纳基数
  housingFundRate: decimal("housing_fund_rate", { precision: 5, scale: 4 }).notNull().default("0.1200"), // 公积金比例(默认12%)

  // 绩效工资基数 (三档绩效工资)
  performanceBase: decimal("performance_base", { precision: 14, scale: 2 }).notNull().default("0"),  // 绩效工资总基数
  performanceWage1Base: decimal("perf_wage1_base", { precision: 14, scale: 2 }).notNull().default("0"), // 绩效工资1基数 (月度KPI)
  performanceWage2Base: decimal("perf_wage2_base", { precision: 14, scale: 2 }).notNull().default("0"), // 绩效工资2基数 (季度/项目)
  performanceWage3Base: decimal("perf_wage3_base", { precision: 14, scale: 2 }).notNull().default("0"), // 绩效工资3基数 (年度/特殊)

  // ── Excel-aligned salary components (Phase: CEO Excel 对齐) ──
  positionWage: decimal("position_wage", { precision: 14, scale: 2 }).notNull().default("0"),           // 岗位工资
  skillSubsidy: decimal("skill_subsidy", { precision: 14, scale: 2 }).notNull().default("0"),           // 技能补贴
  saturdayShiftPremium: decimal("saturday_shift_premium", { precision: 14, scale: 2 }).notNull().default("0"), // 周六加班固定
  comprehensiveSalary: decimal("comprehensive_salary", { precision: 14, scale: 2 }).notNull().default("0"),   // 综合工资 (base for hourly calc)
  cashSubsidy: decimal("cash_subsidy", { precision: 14, scale: 2 }).notNull().default("0"),             // 现金补贴
  travelCarSubsidy: decimal("travel_car_subsidy", { precision: 14, scale: 2 }).notNull().default("0"),   // 出差车补
  isLumpSum: boolean("is_lump_sum").notNull().default(false),                                            // CEO/CFO no component breakdown
  specialTaxDeduction: decimal("special_tax_deduction", { precision: 14, scale: 2 }).notNull().default("0"), // 专项扣除 monthly
  socialInsuranceActual: decimal("social_insurance_actual", { precision: 14, scale: 2 }).notNull().default("0"), // Per-employee 社保 override (0=use formula)
  housingFundActual: decimal("housing_fund_actual", { precision: 14, scale: 2 }).notNull().default("0"),       // Per-employee 公积金 override (0=use formula)
  perfectAttendanceEligible: boolean("perfect_attendance_eligible").notNull().default(false),             // 全勤奖 eligible
  perfectAttendanceAmount: decimal("perfect_attendance_amount", { precision: 14, scale: 2 }).notNull().default("300.00"), // 全勤奖 amount

  positionGrade: varchar("position_grade", { length: 20 }),  // 岗位等级 (12A, 11B, 10B, 10C, 9A, 9B, 9C, 8, 8A, 7, 6, 5, 4, 3, 2)
  department: varchar("department", { length: 100 }),
  buCode: varchar("bu_code", { length: 20 }),                // 事业部编码

  remarks: text("remarks"),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("salary_structures_employee_idx").on(table.employeeId),
  index("salary_structures_effective_idx").on(table.effectiveFrom),
]);

// ── 2. Attendance Records — 考勤记录 ────────────────────

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM

  // 出勤统计
  scheduledDays: integer("scheduled_days").notNull(),         // 应出勤天数
  actualDays: decimal("actual_days", { precision: 5, scale: 1 }).notNull(), // 实际出勤天数(支持0.5天)
  lateDays: integer("late_days").notNull().default(0),        // 迟到次数
  earlyLeaveDays: integer("early_leave_days").notNull().default(0), // 早退次数
  absentDays: decimal("absent_days", { precision: 5, scale: 1 }).notNull().default("0"), // 旷工天数

  // 假期明细
  annualLeaveDays: decimal("annual_leave_days", { precision: 5, scale: 1 }).notNull().default("0"),   // 年假
  sickLeaveDays: decimal("sick_leave_days", { precision: 5, scale: 1 }).notNull().default("0"),       // 病假
  personalLeaveDays: decimal("personal_leave_days", { precision: 5, scale: 1 }).notNull().default("0"), // 事假
  otherLeaveDays: decimal("other_leave_days", { precision: 5, scale: 1 }).notNull().default("0"),     // 其他假

  // ── Hour-based leave tracking (Excel-aligned) ──
  personalLeaveHours: decimal("personal_leave_hours", { precision: 6, scale: 1 }).notNull().default("0"), // 事假(小时)
  sickLeaveHours: decimal("sick_leave_hours", { precision: 6, scale: 1 }).notNull().default("0"),         // 病假(小时)
  annualLeaveHours: decimal("annual_leave_hours", { precision: 6, scale: 1 }).notNull().default("0"),     // 年假(小时)
  compensatoryLeaveHours: decimal("compensatory_leave_hours", { precision: 6, scale: 1 }).notNull().default("0"), // 调休(小时)
  lateCount: integer("late_count").notNull().default(0),                                                   // 迟到次数
  missingClockCount: integer("missing_clock_count").notNull().default(0),                                   // 缺卡次数

  // 加班统计 (小时)
  weekdayOvertimeHours: decimal("weekday_overtime_hours", { precision: 6, scale: 1 }).notNull().default("0"),   // 工作日加班(1.5x)
  weekendOvertimeHours: decimal("weekend_overtime_hours", { precision: 6, scale: 1 }).notNull().default("0"),   // 周末加班(2x)
  holidayOvertimeHours: decimal("holiday_overtime_hours", { precision: 6, scale: 1 }).notNull().default("0"),   // 节假日加班(3x)

  // 计算结果 (由引擎写入)
  attendanceDeduction: decimal("attendance_deduction", { precision: 14, scale: 2 }).notNull().default("0"), // 考勤扣款合计
  overtimePay: decimal("overtime_pay", { precision: 14, scale: 2 }).notNull().default("0"),                 // 加班费合计

  // ── Excursion tracking (from attendance_excursions rollup) ──
  unauthorizedExcursions: integer("unauthorized_excursions").notNull().default(0), // 非休息时段离岗次数

  dataSource: varchar("data_source", { length: 50 }).default("manual"), // manual | attendance_machine | dingtalk | clock_rollup
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("attendance_records_employee_period_idx").on(table.employeeId, table.period),
]);

// ── 3. Performance Evaluations — 绩效考核 ───────────────

export const performanceEvaluations = pgTable("performance_evaluations", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM

  // MBO 评分 (0-100)
  mboScore: decimal("mbo_score", { precision: 5, scale: 2 }).notNull(),
  evaluationGrade: evaluationGradeEnum("evaluation_grade").notNull(),

  // 系数与权重
  departmentCoefficient: decimal("department_coefficient", { precision: 5, scale: 4 }).notNull().default("1.0000"), // 部门系数(0.8-1.2)
  individualCoefficient: decimal("individual_coefficient", { precision: 5, scale: 4 }).notNull().default("1.0000"), // 个人系数

  // 绩效奖金计算 (由引擎写入)
  performanceBonus: decimal("performance_bonus", { precision: 14, scale: 2 }).notNull().default("0"),   // 绩效奖金
  specialBonus: decimal("special_bonus", { precision: 14, scale: 2 }).notNull().default("0"),           // 专项奖金(评优等)
  projectBonus: decimal("project_bonus", { precision: 14, scale: 2 }).notNull().default("0"),           // 项目奖金

  // M0-M12 业务数据关联
  businessDataSnapshot: json("business_data_snapshot"),  // 关联的 M0-M12 历史业务指标快照

  evaluatorId: integer("evaluator_id"),           // 评估人
  department: varchar("department", { length: 100 }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("perf_eval_employee_period_idx").on(table.employeeId, table.period),
]);

// ── 4. Payroll Ledgers — 工资总账 ────────────────────────

export const payrollLedgers = pgTable("payroll_ledgers", {
  id: serial("id").primaryKey(),
  ledgerCode: varchar("ledger_code", { length: 30 }).notNull(),   // PAY-YYYY-MM-NNNN
  employeeId: integer("employee_id").notNull(),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM

  // ── 收入项 ──
  baseSalary: decimal("base_salary", { precision: 14, scale: 2 }).notNull(),                     // 基本工资
  totalAllowances: decimal("total_allowances", { precision: 14, scale: 2 }).notNull(),           // 津贴合计
  overtimePay: decimal("overtime_pay", { precision: 14, scale: 2 }).notNull().default("0"),       // 加班费
  performanceBonus: decimal("performance_bonus", { precision: 14, scale: 2 }).notNull().default("0"), // 绩效奖金(旧字段,向后兼容)

  // ── 三档绩效工资 (CEO特殊条件手动调整) ──
  performanceWage1: decimal("perf_wage1", { precision: 14, scale: 2 }).notNull().default("0"),     // 绩效工资1 (月度KPI系数×基数)
  performanceWage1Override: decimal("perf_wage1_override", { precision: 14, scale: 2 }),            // 人为调整值(null=使用计算值)
  performanceWage1Reason: text("perf_wage1_reason"),                                                // 调整原因
  performanceWage2: decimal("perf_wage2", { precision: 14, scale: 2 }).notNull().default("0"),     // 绩效工资2 (季度/项目绩效)
  performanceWage2Override: decimal("perf_wage2_override", { precision: 14, scale: 2 }),
  performanceWage2Reason: text("perf_wage2_reason"),
  performanceWage3: decimal("perf_wage3", { precision: 14, scale: 2 }).notNull().default("0"),     // 绩效工资3 (年度/特殊绩效)
  performanceWage3Override: decimal("perf_wage3_override", { precision: 14, scale: 2 }),
  performanceWage3Reason: text("perf_wage3_reason"),
  overrideApprovedById: integer("override_approved_by_id"),                                         // 调整批准人(必须为CEO)
  overrideApprovedAt: timestamp("override_approved_at", { mode: "string" }),

  // ── Excel-aligned income components ──
  positionWage: decimal("ledger_position_wage", { precision: 14, scale: 2 }).notNull().default("0"),           // 岗位工资 snapshot
  skillSubsidy: decimal("ledger_skill_subsidy", { precision: 14, scale: 2 }).notNull().default("0"),           // 技能补贴 snapshot
  saturdayShiftPremium: decimal("ledger_saturday_shift_premium", { precision: 14, scale: 2 }).notNull().default("0"), // 周六加班固定
  comprehensiveSalary: decimal("ledger_comprehensive_salary", { precision: 14, scale: 2 }).notNull().default("0"),   // 综合工资 computed
  cashSubsidy: decimal("ledger_cash_subsidy", { precision: 14, scale: 2 }).notNull().default("0"),             // 现金补贴
  travelCarSubsidy: decimal("ledger_travel_car_subsidy", { precision: 14, scale: 2 }).notNull().default("0"),   // 出差车补
  perfectAttendanceBonus: decimal("perfect_attendance_bonus", { precision: 14, scale: 2 }).notNull().default("0"), // 全勤奖
  personalLeaveDeduction: decimal("personal_leave_deduction", { precision: 14, scale: 2 }).notNull().default("0"), // 事假扣款
  sickLeaveDeduction: decimal("sick_leave_deduction", { precision: 14, scale: 2 }).notNull().default("0"),     // 病假扣款
  reconciliationAdjustment: decimal("reconciliation_adjustment", { precision: 14, scale: 2 }).notNull().default("0"), // 差值调控
  specialTaxDeduction: decimal("ledger_special_tax_deduction", { precision: 14, scale: 2 }).notNull().default("0"), // 专项扣除
  otherIncome: decimal("other_income", { precision: 14, scale: 2 }).notNull().default("0"),                     // 其它收入
  kpiBonusAmount: decimal("kpi_bonus_amount", { precision: 14, scale: 2 }).notNull().default("0"),             // 考核奖金

  specialBonus: decimal("special_bonus", { precision: 14, scale: 2 }).notNull().default("0"),     // 专项奖金
  projectBonus: decimal("project_bonus", { precision: 14, scale: 2 }).notNull().default("0"),     // 项目奖金
  grossPay: decimal("gross_pay", { precision: 14, scale: 2 }).notNull(),                         // 应发工资合计

  // ── 扣除项 ──
  attendanceDeduction: decimal("attendance_deduction", { precision: 14, scale: 2 }).notNull().default("0"), // 考勤扣款
  pensionEmployee: decimal("pension_employee", { precision: 14, scale: 2 }).notNull().default("0"),         // 养老保险(个人8%)
  medicalEmployee: decimal("medical_employee", { precision: 14, scale: 2 }).notNull().default("0"),         // 医疗保险(个人2%)
  unemploymentEmployee: decimal("unemployment_employee", { precision: 14, scale: 2 }).notNull().default("0"), // 失业保险(个人0.5%)
  housingFundEmployee: decimal("housing_fund_employee", { precision: 14, scale: 2 }).notNull().default("0"), // 公积金(个人)
  totalSocialInsurance: decimal("total_social_insurance", { precision: 14, scale: 2 }).notNull().default("0"), // 五险一金个人合计

  // ── 个税 ──
  taxableIncome: decimal("taxable_income", { precision: 14, scale: 2 }).notNull().default("0"),   // 应纳税所得额
  cumulativeTaxableIncome: decimal("cumulative_taxable_income", { precision: 14, scale: 2 }).notNull().default("0"), // 累计应纳税所得额
  cumulativeTaxPaid: decimal("cumulative_tax_paid", { precision: 14, scale: 2 }).notNull().default("0"),             // 累计已缴个税
  incomeTax: decimal("income_tax", { precision: 14, scale: 2 }).notNull().default("0"),           // 本月应扣个税
  taxBracket: integer("tax_bracket").default(1),                                                   // 适用税率档 (1-7)

  // ── 净额 ──
  totalDeductions: decimal("total_deductions", { precision: 14, scale: 2 }).notNull(),           // 扣除合计
  netPay: decimal("net_pay", { precision: 14, scale: 2 }).notNull(),                             // 实发工资

  // ── 状态机 ──
  status: payrollStatusEnum("status").notNull().default("DRAFT"),

  // ── 审批信息 ──
  submittedById: integer("submitted_by_id"),
  submittedAt: timestamp("submitted_at", { mode: "string" }),
  hrVerifiedById: integer("hr_verified_by_id"),
  hrVerifiedAt: timestamp("hr_verified_at", { mode: "string" }),
  financeApprovedById: integer("finance_approved_by_id"),
  financeApprovedAt: timestamp("finance_approved_at", { mode: "string" }),
  ceoApprovedById: integer("ceo_approved_by_id"),
  ceoApprovedAt: timestamp("ceo_approved_at", { mode: "string" }),
  paidAt: timestamp("paid_at", { mode: "string" }),
  rejectedById: integer("rejected_by_id"),
  rejectedAt: timestamp("rejected_at", { mode: "string" }),
  rejectionReason: text("rejection_reason"),

  // ── 计算明细 ──
  calculationDetails: json("calculation_details"),   // Full breakdown JSON
  aiTaskId: integer("ai_task_id"),                   // Reference to ai_tasks queue

  department: varchar("department", { length: 100 }),
  buCode: varchar("bu_code", { length: 20 }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("payroll_ledgers_employee_period_idx").on(table.employeeId, table.period),
  index("payroll_ledgers_status_idx").on(table.status),
  index("payroll_ledgers_ledger_code_idx").on(table.ledgerCode),
  index("payroll_ledgers_period_idx").on(table.period),
]);

// ── 5. Approval Audit Logs — 审批日志 ────────────────────

export const payrollApprovalLogs = pgTable("payroll_approval_logs", {
  id: serial("id").primaryKey(),
  ledgerId: integer("ledger_id").notNull(),
  fromStatus: payrollStatusEnum("from_status").notNull(),
  toStatus: payrollStatusEnum("to_status").notNull(),
  operatorId: integer("operator_id").notNull(),
  operatorName: varchar("operator_name", { length: 100 }),
  operatorRole: varchar("operator_role", { length: 50 }),
  reason: text("reason"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("payroll_approval_logs_ledger_idx").on(table.ledgerId),
]);

// ── 6. Excellence Awards — 评优表 ────────────────────────

export const payrollExcellenceAwards = pgTable("payroll_excellence_awards", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
  awardType: awardTypeEnum("award_type").notNull(),
  awardAmount: decimal("award_amount", { precision: 14, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  nominatedById: integer("nominated_by_id"),
  approvedById: integer("approved_by_id"),
  department: varchar("department", { length: 100 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("excellence_awards_period_idx").on(table.period),
]);

// ── 7. Payroll Confidentiality Access — 薪资保密授权 ────
//
// 严格保密：只有此表中的授权人员可以访问薪资数据
// 默认授权: 倪亚东(CEO), 刘奥运(董秘), 倪微薇(AI部门经理)
//

export const payrollAccessControl = pgTable("payroll_access_control", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),             // 被授权用户ID
  employeeGrtId: varchar("employee_grt_id", { length: 20 }).notNull(), // GRT工号
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  accessLevel: varchar("access_level", { length: 20 }).notNull().default("full"),
  // full = 查看所有薪资数据 + 审批
  // department = 只能查看本部门
  // self = 只能查看自己
  canViewAll: boolean("can_view_all").notNull().default(false),         // 可查看全员薪资
  canApprove: boolean("can_approve").notNull().default(false),          // 可审批薪资发放
  canOverridePerf: boolean("can_override_perf").notNull().default(false), // 可手动调整绩效工资1/2/3
  canExport: boolean("can_export").notNull().default(false),            // 可导出薪资报表
  grantedById: integer("granted_by_id"),            // 授权人(必须为CEO)
  grantedAt: timestamp("granted_at", { mode: "string" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "string" }),              // null = 永久
  isActive: boolean("is_active").notNull().default(true),
  remarks: text("remarks"),
});

// ── 8. Performance Wage Override Audit — 绩效工资调整审计 ──

export const perfWageOverrideAudit = pgTable("perf_wage_override_audit", {
  id: serial("id").primaryKey(),
  ledgerId: integer("ledger_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  period: varchar("period", { length: 7 }).notNull(),
  wageSlot: varchar("wage_slot", { length: 10 }).notNull(), // "wage1" | "wage2" | "wage3"
  calculatedValue: decimal("calculated_value", { precision: 14, scale: 2 }).notNull(),
  overrideValue: decimal("override_value", { precision: 14, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  operatorId: integer("operator_id").notNull(),
  operatorName: varchar("operator_name", { length: 100 }),
  approvedById: integer("approved_by_id"),
  approvedAt: timestamp("approved_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("perf_override_audit_period_idx").on(table.period),
  index("perf_override_audit_employee_idx").on(table.employeeId),
]);

// ── Type exports ─────────────────────────────────────────

export type SalaryStructure = InferSelectModel<typeof salaryStructures>;
export type InsertSalaryStructure = InferInsertModel<typeof salaryStructures>;
export type AttendanceRecord = InferSelectModel<typeof attendanceRecords>;
export type InsertAttendanceRecord = InferInsertModel<typeof attendanceRecords>;
export type PerformanceEvaluation = InferSelectModel<typeof performanceEvaluations>;
export type InsertPerformanceEvaluation = InferInsertModel<typeof performanceEvaluations>;
export type PayrollLedger = InferSelectModel<typeof payrollLedgers>;
export type InsertPayrollLedger = InferInsertModel<typeof payrollLedgers>;
export type PayrollApprovalLog = InferSelectModel<typeof payrollApprovalLogs>;
export type PayrollExcellenceAward = InferSelectModel<typeof payrollExcellenceAwards>;
export type PayrollAccessControl = InferSelectModel<typeof payrollAccessControl>;
export type PerfWageOverrideAudit = InferSelectModel<typeof perfWageOverrideAudit>;
