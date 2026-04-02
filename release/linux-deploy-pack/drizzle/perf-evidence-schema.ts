/**
 * Performance Evidence & Review — Drizzle Schema
 *
 * 7 tables for the CEO's 绩效-薪酬联动试算沙盘 initiative.
 * Architecture: Evidence → AI Review → Supervisor Confirm → Anomaly Detection → Approval → Lock → Post-Payout
 *
 * Integrates with payroll-sandbox-schema.ts via cycleId → payrollSandboxCycles.id
 *
 * Naming: ps_ prefix = "payroll sandbox" (consistent with payroll-sandbox-schema)
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
import { payrollSandboxCycles, psPositionCategoryEnum } from "./payroll-sandbox-schema";

// ── Enums ────────────────────────────────────────────────

export const psEvidenceTypeEnum = pgEnum("ps_evidence_type_enum", [
  "task_timeliness",     // 任务及时性
  "internal_feedback",   // 内部反馈
  "external_feedback",   // 外部反馈
  "quality_rework",      // 质量返工
  "ai_commentary",       // AI评语
]);

export const psReviewStatusEnum = pgEnum("ps_review_status_enum", [
  "pending_evidence",      // 待举证
  "ai_suggested",          // AI已建议
  "supervisor_confirmed",  // 主管已确认
  "frozen",                // 已冻结
  "disputed",              // 有争议
]);

export const psBonusTierEnum = pgEnum("ps_bonus_tier_enum", [
  "tier_s",    // 150%
  "tier_a",    // 120%
  "tier_b",    // 100%
  "tier_c",    // 80%
  "tier_d",    // 60%
  "tier_zero", // 0%
]);

export const psAnomalyCategoryEnum = pgEnum("ps_anomaly_category_enum", [
  "evidence_insufficient",    // 举证不足
  "perf_quality_conflict",    // 绩效质量冲突
  "allowance_no_basis",       // 补贴无依据
  "social_fund_mismatch",     // 社保基数不匹配
  "tax_bracket_anomaly",      // 税率档次异常
  "net_pay_volatility",       // 实发波动异常
]);

export const psAnomalySeverityEnum = pgEnum("ps_anomaly_severity_enum", [
  "info",      // 提示
  "warning",   // 警告
  "critical",  // 严重
]);

export const psApprovalStageEnum = pgEnum("ps_approval_stage_enum", [
  "hr_initial",            // HR初审
  "finance_review",        // 财务复核
  "dept_manager_confirm",  // 部门经理确认
  "exec_approve",          // 高管审批
]);

export const psApprovalActionEnum = pgEnum("ps_approval_action_enum", [
  "pending",   // 待处理
  "approved",  // 通过
  "rejected",  // 驳回
  "returned",  // 退回
]);

// ── 1. Performance Evidence — 绩效举证 (工序7) ───────────

export const psPerfEvidence = pgTable("ps_perf_evidence", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),
  evidenceType: psEvidenceTypeEnum("evidence_type").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  score: decimal("score", { precision: 5, scale: 1 }),                   // 0-100 partial score
  weight: decimal("weight", { precision: 3, scale: 2 }).default("1.00"), // weight in final calc
  sourceSystem: varchar("source_system", { length: 50 }),                // task_board, crm, quality, gemini
  sourceId: varchar("source_id", { length: 100 }),                       // reference ID in source
  attachmentUrl: text("attachment_url"),
  submittedAt: timestamp("submitted_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_evidence_cycle_employee_idx").on(table.cycleId, table.employeeName),
]);

// ── 2. Performance Review — 绩效评审结论 (工序7) ─────────

export const psPerfReview = pgTable("ps_perf_review", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),
  department: varchar("department", { length: 100 }),
  positionCategory: psPositionCategoryEnum("position_category"),

  // ── Evidence summary ──
  evidenceCount: integer("evidence_count").default(0),
  aiSuggestedScore: decimal("ai_suggested_score", { precision: 5, scale: 1 }),
  aiSuggestReason: text("ai_suggest_reason"),
  aiRiskFlags: json("ai_risk_flags"),                                    // string[]
  aiGeneratedAt: timestamp("ai_generated_at", { mode: "string" }),

  // ── Supervisor ──
  supervisorScore: decimal("supervisor_score", { precision: 5, scale: 1 }),
  supervisorId: integer("supervisor_id"),
  supervisorName: varchar("supervisor_name", { length: 100 }),
  supervisorComment: text("supervisor_comment"),
  supervisorConfirmedAt: timestamp("supervisor_confirmed_at", { mode: "string" }),

  // ── Final ──
  finalScore: decimal("final_score", { precision: 5, scale: 1 }),
  bonusTier: psBonusTierEnum("bonus_tier"),
  bonusAmount: decimal("bonus_amount", { precision: 14, scale: 2 }).default("0"),
  perfWage1: decimal("perf_wage1", { precision: 14, scale: 2 }).default("0"),
  perfWage2: decimal("perf_wage2", { precision: 14, scale: 2 }).default("0"),
  perfWage3: decimal("perf_wage3", { precision: 14, scale: 2 }).default("0"),
  perfCoeff1: decimal("perf_coeff1", { precision: 5, scale: 2 }),
  perfCoeff2: decimal("perf_coeff2", { precision: 5, scale: 2 }),
  perfCoeff3: decimal("perf_coeff3", { precision: 5, scale: 2 }),

  // ── Status ──
  status: psReviewStatusEnum("status").default("pending_evidence"),
  frozenAt: timestamp("frozen_at", { mode: "string" }),
  frozenById: integer("frozen_by_id"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_review_cycle_idx").on(table.cycleId),
  index("ps_review_employee_idx").on(table.employeeName),
]);

// ── 3. Social Fund Policy — 社保政策版本 (工序8) ─────────

export const psSocialFundPolicy = pgTable("ps_social_fund_policy", {
  id: serial("id").primaryKey(),
  policyVersion: varchar("policy_version", { length: 20 }).notNull(),   // e.g. "2026-H1"
  effectiveFrom: varchar("effective_from", { length: 10 }).notNull(),   // YYYY-MM-DD
  effectiveTo: varchar("effective_to", { length: 10 }),
  region: varchar("region", { length: 50 }).default("上海"),

  // 费率
  pensionRate: decimal("pension_rate", { precision: 5, scale: 4 }).default("0.0800"),          // 养老8%
  medicalRate: decimal("medical_rate", { precision: 5, scale: 4 }).default("0.0200"),          // 医疗2%
  unemploymentRate: decimal("unemployment_rate", { precision: 5, scale: 4 }).default("0.0050"),// 失业0.5%
  housingFundRateMin: decimal("housing_fund_rate_min", { precision: 5, scale: 4 }),            // 5%
  housingFundRateMax: decimal("housing_fund_rate_max", { precision: 5, scale: 4 }),            // 12%

  // 基数上下限
  socialInsuranceBase: json("social_insurance_base"),                    // {min: number, max: number}
  housingFundBase: json("housing_fund_base"),                            // {min: number, max: number}

  // 扩展法规参数 (JSON blob matching RegulatoryParams from calc service)
  // Stores: taxBrackets, monthlyExemptionCents, otMultipliers, personalLeaveDivisor,
  //         sickLeaveCoeff, perfWage1MinScore, perfWage1AvgDelta, perfWage2HalfThreshold
  regulatoryOverrides: json("regulatory_overrides"),

  remarks: text("remarks"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// ── 4. Anomaly — 异常检测结果 (工序4/10) ─────────────────

export const psAnomaly = pgTable("ps_anomaly", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeId: integer("employee_id"),
  category: psAnomalyCategoryEnum("category").notNull(),
  severity: psAnomalySeverityEnum("severity").notNull().default("warning"),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  fieldName: varchar("field_name", { length: 50 }),                      // which field triggered this
  expectedValue: varchar("expected_value", { length: 100 }),
  actualValue: varchar("actual_value", { length: 100 }),
  suggestedAction: text("suggested_action"),                             // GPT/Gemini suggested fix
  resolvedById: integer("resolved_by_id"),
  resolvedAt: timestamp("resolved_at", { mode: "string" }),
  resolution: text("resolution"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_anomaly_cycle_idx").on(table.cycleId),
  index("ps_anomaly_category_idx").on(table.category),
  index("ps_anomaly_resolved_idx").on(table.isResolved),
]);

// ── 5. Approval Flow — 审批工作流 (工序11) ───────────────

export const psApprovalFlow = pgTable("ps_approval_flow", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  stage: psApprovalStageEnum("stage").notNull(),
  stageOrder: integer("stage_order").notNull(),                          // 1=HR, 2=Finance, 3=DeptManager, 4=Exec
  action: psApprovalActionEnum("action").notNull().default("pending"),
  reviewerId: integer("reviewer_id"),
  reviewerName: varchar("reviewer_name", { length: 100 }),
  comment: text("comment"),
  checklist: json("checklist"),                                          // {item: string, checked: boolean}[]
  actionAt: timestamp("action_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_approval_cycle_stage_idx").on(table.cycleId, table.stageOrder),
]);

// ── 6. Lock Record — 锁定/冻结审计 (工序12) ─────────────

export const psLockRecord = pgTable("ps_lock_record", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  lockType: varchar("lock_type", { length: 30 }).notNull(),              // "performance" | "salary" | "tax" | "adjustment" | "full"
  lockedById: integer("locked_by_id").notNull(),
  lockedByName: varchar("locked_by_name", { length: 100 }),
  lockedAt: timestamp("locked_at", { mode: "string" }).defaultNow().notNull(),
  unlockedById: integer("unlocked_by_id"),
  unlockedAt: timestamp("unlocked_at", { mode: "string" }),
  reason: text("reason"),
  snapshotHash: varchar("snapshot_hash", { length: 64 }),                // SHA-256 for tamper detection
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ps_lock_cycle_idx").on(table.cycleId),
]);

// ── 7. Post-Payout Metrics — 发薪后复盘 (工序14) ────────

export const psPostPayoutMetrics = pgTable("ps_post_payout_metrics", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  period: varchar("period", { length: 7 }).notNull(),                    // YYYY-MM
  department: varchar("department", { length: 100 }),

  // 金额汇总
  totalGrossPay: decimal("total_gross_pay", { precision: 16, scale: 2 }),
  totalNetPay: decimal("total_net_pay", { precision: 16, scale: 2 }),
  totalPerfBonus: decimal("total_perf_bonus", { precision: 16, scale: 2 }),

  // 质量指标
  anomalyCount: integer("anomaly_count").default(0),
  manualAdjustCount: integer("manual_adjust_count").default(0),
  taxAnomalyCount: integer("tax_anomaly_count").default(0),

  // 效率指标
  approvalHours: decimal("approval_hours", { precision: 8, scale: 1 }), // hours from submit to final approve
  excelMatchRate: decimal("excel_match_rate", { precision: 5, scale: 1 }), // percentage

  // 环比变化
  grossPayDeltaPct: decimal("gross_pay_delta_pct", { precision: 5, scale: 2 }),  // vs previous month
  netPayDeltaPct: decimal("net_pay_delta_pct", { precision: 5, scale: 2 }),
  perfBonusDeltaPct: decimal("perf_bonus_delta_pct", { precision: 5, scale: 2 }),

  // AI摘要
  gptSummary: text("gpt_summary"),                                       // GPT generated executive summary
  generatedAt: timestamp("generated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  index("ps_post_payout_cycle_idx").on(table.cycleId),
]);

// ── Relations ────────────────────────────────────────────

export const psPerfEvidenceRelations = relations(psPerfEvidence, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psPerfEvidence.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psPerfReviewRelations = relations(psPerfReview, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psPerfReview.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psAnomalyRelations = relations(psAnomaly, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psAnomaly.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psApprovalFlowRelations = relations(psApprovalFlow, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psApprovalFlow.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psLockRecordRelations = relations(psLockRecord, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psLockRecord.cycleId], references: [payrollSandboxCycles.id] }),
}));

export const psPostPayoutMetricsRelations = relations(psPostPayoutMetrics, ({ one }) => ({
  cycle: one(payrollSandboxCycles, { fields: [psPostPayoutMetrics.cycleId], references: [payrollSandboxCycles.id] }),
}));

// ── Type exports ─────────────────────────────────────────

export type PsPerfEvidence = InferSelectModel<typeof psPerfEvidence>;
export type InsertPsPerfEvidence = InferInsertModel<typeof psPerfEvidence>;
export type PsPerfReview = InferSelectModel<typeof psPerfReview>;
export type InsertPsPerfReview = InferInsertModel<typeof psPerfReview>;
export type PsSocialFundPolicy = InferSelectModel<typeof psSocialFundPolicy>;
export type InsertPsSocialFundPolicy = InferInsertModel<typeof psSocialFundPolicy>;
export type PsAnomaly = InferSelectModel<typeof psAnomaly>;
export type InsertPsAnomaly = InferInsertModel<typeof psAnomaly>;
export type PsApprovalFlow = InferSelectModel<typeof psApprovalFlow>;
export type InsertPsApprovalFlow = InferInsertModel<typeof psApprovalFlow>;
export type PsLockRecord = InferSelectModel<typeof psLockRecord>;
export type InsertPsLockRecord = InferInsertModel<typeof psLockRecord>;
export type PsPostPayoutMetrics = InferSelectModel<typeof psPostPayoutMetrics>;
export type InsertPsPostPayoutMetrics = InferInsertModel<typeof psPostPayoutMetrics>;
