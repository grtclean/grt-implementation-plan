/**
 * Annual Goal Setting & Incentive Tracking Schema
 *
 * 年度目标协定与激励追踪 — 7张核心表
 * 支持：双签仪式、多维权重、季度检查点、年中调整、激励试算
 */
import { pgTable, serial, integer, varchar, text, decimal, boolean, timestamp, json, uniqueIndex, index } from "drizzle-orm/pg-core";

// ══════════════════════════════════════════
// 1. 年度目标协定 — 核心记录 (一人一年一条)
// ══════════════════════════════════════════
export const annualGoalAgreements = pgTable("annual_goal_agreements", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeOpenId: varchar("employee_open_id", { length: 50 }),
  managerId: integer("manager_id").notNull(),
  managerName: varchar("manager_name", { length: 100 }).notNull(),
  year: integer("year").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  // draft | negotiation | signed | active | adjustment_pending | in_review | year_end_review | finalized | archived
  version: integer("version").notNull().default(1),

  // 薪酬基准
  baseSalaryGrade: varchar("base_salary_grade", { length: 20 }),
  baseSalarySnapshot: decimal("base_salary_snapshot", { precision: 14, scale: 2 }),

  // 职业路径升级选项
  careerPathOptionJson: json("career_path_option_json"),
  // { currentRole, upgradeRole, upgradeTitle, salaryDeltaPct, bonusCapMultiplier, requirements }
  careerPathAccepted: boolean("career_path_accepted").default(false),

  // 绩效等级定义 (差/中/良/优 → 0/1/2/3 个月)
  performanceLevelsJson: json("performance_levels_json").notNull().default(JSON.stringify([
    { level: "差", code: "D", bonusMonths: 0 },
    { level: "中", code: "C", bonusMonths: 1 },
    { level: "良", code: "B", bonusMonths: 2 },
    { level: "优", code: "A", bonusMonths: 3 },
  ])),
  bonusCapMonths: decimal("bonus_cap_months", { precision: 4, scale: 1 }).default("3.0"),
  projectedBonusMonths: decimal("projected_bonus_months", { precision: 4, scale: 1 }).default("0.0"),

  // 总权重验证
  totalWeightValidation: decimal("total_weight_validation", { precision: 5, scale: 2 }).default("0.00"),

  // 交付件
  deliverableDeadline: timestamp("deliverable_deadline"),
  deliverableDescription: text("deliverable_description"),

  // 沟通渠道
  communicationChannel: varchar("communication_channel", { length: 30 }).default("email"),
  // face_to_face | wechat | email | in_system

  // 双签
  signedByEmployee: boolean("signed_by_employee").default(false),
  signedByManager: boolean("signed_by_manager").default(false),
  employeeSignedAt: timestamp("employee_signed_at"),
  managerSignedAt: timestamp("manager_signed_at"),
  documentUrl: text("document_url"),

  // 组织
  department: varchar("department", { length: 100 }),
  buCode: varchar("bu_code", { length: 50 }),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("aga_employee_year_idx").on(t.employeeId, t.year),
  index("aga_manager_year_idx").on(t.managerId, t.year),
  index("aga_status_idx").on(t.status),
  index("aga_bu_idx").on(t.buCode),
]);

// ══════════════════════════════════════════
// 2. 目标维度 — 加权技能维度 (例: 70%营销 + 30%销售)
// ══════════════════════════════════════════
export const annualGoalDimensions = pgTable("annual_goal_dimensions", {
  id: serial("id").primaryKey(),
  agreementId: integer("agreement_id").notNull(),
  dimensionName: varchar("dimension_name", { length: 200 }).notNull(),
  dimensionNameEn: varchar("dimension_name_en", { length: 200 }),
  dimensionCode: varchar("dimension_code", { length: 50 }).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(), // e.g. 70.00
  description: text("description"),
  kpiTargetsJson: json("kpi_targets_json"), // [{kpiName, targetValue, unit, scoringMethod}]
  currentScore: decimal("current_score", { precision: 5, scale: 2 }).default("0.00"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("agd_agreement_dim_idx").on(t.agreementId, t.dimensionCode),
  index("agd_agreement_idx").on(t.agreementId),
]);

// ══════════════════════════════════════════
// 3. 季度检查点 — 进度评分
// ══════════════════════════════════════════
export const annualGoalCheckpoints = pgTable("annual_goal_checkpoints", {
  id: serial("id").primaryKey(),
  agreementId: integer("agreement_id").notNull(),
  checkpointType: varchar("checkpoint_type", { length: 20 }).notNull(),
  // Q1 | Q2 | mid_year | Q3 | Q4 | year_end
  scheduledDate: timestamp("scheduled_date").notNull(),
  actualDate: timestamp("actual_date"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  // pending | scheduled | in_progress | completed | skipped
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
  performanceLevelCode: varchar("performance_level_code", { length: 5 }),
  dimensionScoresJson: json("dimension_scores_json"),
  // [{dimensionId, dimensionName, weight, score, evidence}]
  managerComments: text("manager_comments"),
  employeeSelfAssessment: text("employee_self_assessment"),
  projectedBonusMonths: decimal("projected_bonus_months", { precision: 4, scale: 1 }),
  reviewedBy: integer("reviewed_by"),
  reviewedByName: varchar("reviewed_by_name", { length: 100 }),
  attachments: json("attachments"), // [{name, url, type}]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("agc_agreement_type_idx").on(t.agreementId, t.checkpointType),
  index("agc_agreement_idx").on(t.agreementId),
]);

// ══════════════════════════════════════════
// 4. 年中调整 — 审批工作流
// ══════════════════════════════════════════
export const annualGoalAdjustments = pgTable("annual_goal_adjustments", {
  id: serial("id").primaryKey(),
  agreementId: integer("agreement_id").notNull(),
  adjustmentType: varchar("adjustment_type", { length: 30 }).notNull(),
  // dimension_reweight | add_dimension | remove_dimension | target_change | career_path_change | bonus_structure_change
  reason: text("reason").notNull(),
  triggerEvent: varchar("trigger_event", { length: 200 }),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  // draft | pending_manager | pending_hr | approved | rejected | withdrawn
  previousStateJson: json("previous_state_json").notNull(),
  proposedStateJson: json("proposed_state_json").notNull(),
  requestedBy: integer("requested_by").notNull(),
  requestedByName: varchar("requested_by_name", { length: 100 }),
  approvedBy: integer("approved_by"),
  approvedByName: varchar("approved_by_name", { length: 100 }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  effectiveDate: timestamp("effective_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("agadj_agreement_idx").on(t.agreementId),
  index("agadj_status_idx").on(t.status),
]);

// ══════════════════════════════════════════
// 5. 审计日志 — 完整变更历史
// ══════════════════════════════════════════
export const annualGoalAuditLog = pgTable("annual_goal_audit_log", {
  id: serial("id").primaryKey(),
  agreementId: integer("agreement_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  // created | signed | checkpoint_completed | adjustment_applied | status_changed | score_updated
  previousValue: json("previous_value"),
  newValue: json("new_value"),
  changedBy: integer("changed_by").notNull(),
  changedByName: varchar("changed_by_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("agal_agreement_idx").on(t.agreementId, t.createdAt),
]);

// ══════════════════════════════════════════
// 6. 目标沟通消息 — 系统内消息通道
// ══════════════════════════════════════════
export const annualGoalMessages = pgTable("annual_goal_messages", {
  id: serial("id").primaryKey(),
  agreementId: integer("agreement_id").notNull(),
  threadId: varchar("thread_id", { length: 50 }),
  senderId: integer("sender_id").notNull(),
  senderName: varchar("sender_name", { length: 100 }),
  messageType: varchar("message_type", { length: 30 }).notNull().default("text"),
  // text | file | system_notification | checkpoint_reminder
  content: text("content").notNull(),
  attachments: json("attachments"), // [{name, url, mimeType}]
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("agm_agreement_idx").on(t.agreementId, t.createdAt),
  index("agm_sender_idx").on(t.senderId),
]);

// ══════════════════════════════════════════
// 7. 激励试算快照 — 自动计算
// ══════════════════════════════════════════
export const annualIncentiveProjections = pgTable("annual_incentive_projections", {
  id: serial("id").primaryKey(),
  agreementId: integer("agreement_id").notNull(),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  triggerType: varchar("trigger_type", { length: 30 }).notNull(),
  // checkpoint | adjustment | manual_recalc | career_path_change
  baseSalary: decimal("base_salary", { precision: 14, scale: 2 }),
  compositeScore: decimal("composite_score", { precision: 5, scale: 2 }),
  performanceLevelCode: varchar("performance_level_code", { length: 5 }),
  bonusMonths: decimal("bonus_months", { precision: 4, scale: 1 }),
  careerMultiplier: decimal("career_multiplier", { precision: 4, scale: 2 }).default("1.00"),
  salaryAdjustmentPct: decimal("salary_adjustment_pct", { precision: 5, scale: 2 }).default("0.00"),
  projectedBonusAmount: decimal("projected_bonus_amount", { precision: 14, scale: 2 }),
  projectedNewSalary: decimal("projected_new_salary", { precision: 14, scale: 2 }),
  dimensionBreakdownJson: json("dimension_breakdown_json"),
  // [{dimension, weight, score, weightedScore}]
  calculationDetailsJson: json("calculation_details_json"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("aip_agreement_idx").on(t.agreementId, t.calculatedAt),
]);

// ══════════════════════════════════════════
// Type exports
// ══════════════════════════════════════════
export type AnnualGoalAgreement = typeof annualGoalAgreements.$inferSelect;
export type NewAnnualGoalAgreement = typeof annualGoalAgreements.$inferInsert;
export type AnnualGoalDimension = typeof annualGoalDimensions.$inferSelect;
export type AnnualGoalCheckpoint = typeof annualGoalCheckpoints.$inferSelect;
export type AnnualGoalAdjustment = typeof annualGoalAdjustments.$inferSelect;
export type AnnualGoalMessage = typeof annualGoalMessages.$inferSelect;
export type AnnualIncentiveProjection = typeof annualIncentiveProjections.$inferSelect;
