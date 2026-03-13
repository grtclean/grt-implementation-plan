import {
  pgTable, serial, varchar, text, integer, boolean, timestamp, decimal, json,
  pgEnum, index, uniqueIndex,
} from "drizzle-orm/pg-core";

/* ── Enums ────────────────────────────────────────────────── */

export const authDomainEnum = pgEnum("auth_domain", [
  "travel",        // 出差申请
  "procurement",   // 采购
  "budget",        // 预算执行
  "project",       // 项目执行
  "customer",      // 客户沟通
  "material",      // 材料特性
  "expense",       // 费用报销
  "contract",      // 合同签署
]);

export const creditTierEnum = pgEnum("credit_tier", [
  "platinum",   // 白金 — score >= 95
  "gold",       // 金牌 — score >= 85
  "silver",     // 银牌 — score >= 70
  "bronze",     // 铜牌 — score >= 50
  "restricted", // 受限 — score < 50
]);

export const postFactoStatusEnum = pgEnum("post_facto_status", [
  "pending_doc",     // 待补交材料
  "pending_review",  // 待审核
  "approved",        // 已批准
  "rejected",        // 已驳回
  "overdue",         // 已逾期
  "escalated",       // 已升级
  "waived",          // 已豁免
]);

export const auditEventTypeEnum = pgEnum("auth_audit_event_type", [
  "approval",        // 常规审批
  "green_channel",   // 绿色通道
  "post_facto",      // 事后补交
  "delegation",      // 授权委托
  "escalation",      // 升级
  "override",        // 手动覆盖
  "credit_change",   // 信用变更
  "policy_change",   // 策略变更
]);

export const integrityEventEnum = pgEnum("integrity_event_type", [
  "on_time_approval",     // 按时审批
  "accurate_expense",     // 精确报销
  "proactive_disclosure", // 主动披露
  "transparent_comm",     // 透明沟通
  "late_submission",      // 迟交
  "inaccurate_report",    // 不准确报告
  "post_facto_violation", // 事后补交违规
  "policy_bypass",        // 策略绕行
  "public_recognition",   // 公开表彰
]);

/* ── Table 1: Authorization Policies (授权策略配置) ───────── */

export const authorizationPolicies = pgTable("authorization_policies", {
  id: serial("id").primaryKey(),
  policyCode: varchar("policy_code", { length: 64 }).notNull().unique(),
  domain: authDomainEnum("domain").notNull(),
  policyName: varchar("policy_name", { length: 200 }).notNull(),
  description: text("description"),

  // Threshold rules: [{ level, minAmount, maxAmount, approverRole, autoApprove, isRequired }]
  thresholdRules: json("threshold_rules").$type<ThresholdRule[]>().notNull(),

  // Duration-based rules (for travel): [{ maxDays, approverLevel }]
  durationRules: json("duration_rules").$type<DurationRule[]>(),

  // Scope
  buScope: varchar("bu_scope", { length: 20 }), // null = global
  isActive: boolean("is_active").default(true).notNull(),
  version: integer("version").default(1).notNull(),

  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_auth_policy_domain").on(t.domain),
]);

/* ── Table 2: Employee Credit Tiers (员工信用等级) ─────────── */

export const employeeCreditTiers = pgTable("employee_credit_tiers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  employeeName: varchar("employee_name", { length: 100 }),

  // Overall credit
  creditScore: decimal("credit_score", { precision: 5, scale: 2 }).default("80.00").notNull(),
  creditTier: creditTierEnum("credit_tier").default("silver").notNull(),
  tierCalculatedAt: timestamp("tier_calculated_at"),

  // Component scores (0-100 each)
  approvalComplianceScore: decimal("approval_compliance_score", { precision: 5, scale: 2 }).default("80.00"),
  financialIntegrityScore: decimal("financial_integrity_score", { precision: 5, scale: 2 }).default("80.00"),
  taskDeliveryScore: decimal("task_delivery_score", { precision: 5, scale: 2 }).default("80.00"),
  peerTrustScore: decimal("peer_trust_score", { precision: 5, scale: 2 }).default("80.00"),

  // Counters
  totalApprovals: integer("total_approvals").default(0),
  onTimeSubmissions: integer("on_time_submissions").default(0),
  lateSubmissions: integer("late_submissions").default(0),
  postFactoCount: integer("post_facto_count").default(0),
  postFactoWithinPolicy: integer("post_facto_within_policy").default(0),
  violationCount: integer("violation_count").default(0),
  rewardCount: integer("reward_count").default(0),

  // Green channel eligibility
  greenChannelEligible: boolean("green_channel_eligible").default(false),
  greenChannelMaxAmount: decimal("green_channel_max_amount", { precision: 14, scale: 2 }).default("0"),
  lastGreenChannelUsedAt: timestamp("last_green_channel_used_at"),

  lastReviewedBy: integer("last_reviewed_by"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("idx_credit_tier_user").on(t.userId),
  index("idx_credit_tier_score").on(t.creditScore),
  index("idx_credit_tier_tier").on(t.creditTier),
]);

/* ── Table 3: Green Channel Rules (绿色通道规则) ──────────── */

export const greenChannelRules = pgTable("green_channel_rules", {
  id: serial("id").primaryKey(),
  domain: authDomainEnum("domain").notNull(),
  creditTierRequired: creditTierEnum("credit_tier_required").notNull(),

  maxAmountAllowed: decimal("max_amount_allowed", { precision: 14, scale: 2 }).notNull(),
  autoApproveThreshold: decimal("auto_approve_threshold", { precision: 14, scale: 2 }).default("0"),
  maxDurationDays: integer("max_duration_days"), // for travel domain

  requirePostFactoDoc: boolean("require_post_facto_doc").default(true).notNull(),
  postFactoDeadlineDays: integer("post_facto_deadline_days").default(3).notNull(),
  cooldownDays: integer("cooldown_days").default(7).notNull(),
  monthlyUsageLimit: integer("monthly_usage_limit").default(3).notNull(),

  buScope: varchar("bu_scope", { length: 20 }),
  isActive: boolean("is_active").default(true).notNull(),

  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_gc_rule_domain_tier").on(t.domain, t.creditTierRequired),
]);

/* ── Table 4: Green Channel Usages (绿色通道使用记录) ──────── */

export const greenChannelUsages = pgTable("green_channel_usages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }),
  approvalInstanceId: integer("approval_instance_id"),
  domain: authDomainEnum("domain").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description"),

  creditTierAtUsage: creditTierEnum("credit_tier_at_usage").notNull(),
  ruleId: integer("rule_id"), // FK to green_channel_rules

  // Post-facto tracking
  postFactoRequired: boolean("post_facto_required").default(true),
  postFactoDeadline: timestamp("post_facto_deadline"),
  postFactoSubmittedAt: timestamp("post_facto_submitted_at"),
  postFactoStatus: postFactoStatusEnum("post_facto_status").default("pending_doc"),
  postFactoDocuments: json("post_facto_documents").$type<string[]>(),

  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_gc_usage_user").on(t.userId),
  index("idx_gc_usage_domain").on(t.domain),
  index("idx_gc_usage_status").on(t.postFactoStatus),
]);

/* ── Table 5: Post-Facto Submissions (事后补交记录) ────────── */

export const postFactoSubmissions = pgTable("post_facto_submissions", {
  id: serial("id").primaryKey(),
  originalApprovalId: integer("original_approval_id"),
  greenChannelUsageId: integer("green_channel_usage_id"), // FK to green_channel_usages
  userId: integer("user_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }),
  domain: authDomainEnum("domain").notNull(),

  actionDate: timestamp("action_date").notNull(),       // when action was taken
  submissionDate: timestamp("submission_date"),          // when docs submitted
  deadlineDate: timestamp("deadline_date").notNull(),
  isOverdue: boolean("is_overdue").default(false),

  reason: text("reason"),                        // why prior approval was skipped
  urgencyJustification: text("urgency_justification"),
  supportingDocuments: json("supporting_documents").$type<PostFactoDoc[]>(),

  status: postFactoStatusEnum("status").default("pending_doc").notNull(),
  currentReviewLevel: integer("current_review_level").default(1),
  reviewerId: integer("reviewer_id"),
  reviewerName: varchar("reviewer_name", { length: 100 }),
  reviewComment: text("review_comment"),
  reviewedAt: timestamp("reviewed_at"),

  // Impact
  creditScoreImpact: decimal("credit_score_impact", { precision: 5, scale: 2 }).default("0"),
  penaltyApplied: boolean("penalty_applied").default(false),
  penaltyDetails: text("penalty_details"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_post_facto_user").on(t.userId),
  index("idx_post_facto_status").on(t.status),
  index("idx_post_facto_deadline").on(t.deadlineDate),
]);

/* ── Table 6: Integrity Incentive Records (诚信激励记录) ──── */

export const integrityIncentiveRecords = pgTable("integrity_incentive_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  employeeCode: varchar("employee_code", { length: 20 }),
  employeeName: varchar("employee_name", { length: 100 }),
  period: varchar("period", { length: 10 }).notNull(), // YYYY-MM or YYYY-Q1

  // Positive metrics
  onTimeApprovals: integer("on_time_approvals").default(0),
  accurateExpenseReports: integer("accurate_expense_reports").default(0),
  proactiveDisclosures: integer("proactive_disclosures").default(0),
  transparentCommunications: integer("transparent_communications").default(0),

  // Negative metrics
  lateSubmissionsCount: integer("late_submissions_count").default(0),
  inaccurateReports: integer("inaccurate_reports").default(0),
  postFactoViolations: integer("post_facto_violations").default(0),
  policyBypassAttempts: integer("policy_bypass_attempts").default(0),

  // Calculated
  integrityScore: decimal("integrity_score", { precision: 5, scale: 2 }).default("80.00"),
  bonusPoints: integer("bonus_points").default(0),
  tierChange: varchar("tier_change", { length: 20 }), // upgrade / downgrade / maintain

  // Recognition
  isPubliclyRecognized: boolean("is_publicly_recognized").default(false),
  recognitionType: varchar("recognition_type", { length: 50 }),
  recognitionNote: text("recognition_note"),

  generatedAt: timestamp("generated_at"),
  reviewedBy: integer("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_integrity_user_period").on(t.userId, t.period),
]);

/* ── Table 7: Authorization Audit Trail (授权审计追踪) ───── */

export const authorizationAuditTrail = pgTable("authorization_audit_trail", {
  id: serial("id").primaryKey(),
  eventType: auditEventTypeEnum("event_type").notNull(),
  domain: authDomainEnum("domain"),
  instanceId: integer("instance_id"),

  actorId: integer("actor_id").notNull(),
  actorName: varchar("actor_name", { length: 100 }),
  actorRole: varchar("actor_role", { length: 50 }),

  targetUserId: integer("target_user_id"),
  targetName: varchar("target_name", { length: 100 }),

  amount: decimal("amount", { precision: 14, scale: 2 }),
  decision: varchar("decision", { length: 50 }),
  policyApplied: varchar("policy_applied", { length: 64 }),
  creditTierAtTime: creditTierEnum("credit_tier_at_time"),

  isGreenChannel: boolean("is_green_channel").default(false),
  isPostFacto: boolean("is_post_facto").default(false),

  metadata: json("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_auth_audit_actor").on(t.actorId),
  index("idx_auth_audit_type").on(t.eventType),
  index("idx_auth_audit_domain").on(t.domain),
  index("idx_auth_audit_created").on(t.createdAt),
]);

/* ── TypeScript Types ─────────────────────────────────────── */

export interface ThresholdRule {
  level: number;          // 1=team_lead, 2=dept_manager, 3=bu_gm, 4=vp, 5=ceo
  levelLabel: string;     // 组长 / 部门经理 / 事业部经理 / 副总 / 董事长
  minAmount: number;
  maxAmount: number;      // -1 = unlimited
  approverRole: string;   // role from shared/permissions.ts
  autoApprove: boolean;   // if true + credit tier sufficient, skip this level
  isRequired: boolean;    // mandatory step (cannot be skipped by green channel)
}

export interface DurationRule {
  maxDays: number;
  approverLevel: number;
  description: string;
}

export interface PostFactoDoc {
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  docType: string; // receipt / invoice / approval_form / photo / other
}
