/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT Employee Points & Credit System Schema                    ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  CEO Directive: 员工积分奖惩制度                                 ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. point_rules          — 积分规则配置 (actions → points)     ║
 * ║    2. point_transactions   — 积分流水记录                        ║
 * ║    3. point_balances       — 员工积分余额                        ║
 * ║    4. point_redemption_catalog — 积分兑换目录                    ║
 * ║    5. point_redemptions    — 兑换申请记录                        ║
 * ║    6. point_thresholds     — 积分阈值处罚规则                    ║
 * ║    7. point_enforcement_log — 阈值处罚执行记录                   ║
 * ║    8. daily_compliance_checks — 每日合规检查 (计划/总结)          ║
 * ║                                                                 ║
 * ║  Integrates with:                                               ║
 * ║    - employee_xp (existing gamification)                        ║
 * ║    - attendance_clock_records (clock-in/out triggers)            ║
 * ║    - employee_daily_logs (work summary)                         ║
 * ║    - planning_plans / planning_tasks (daily work plan)          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  decimal,
  text,
  boolean,
  timestamp,
  json,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────

export const pointRuleCategoryEnum = pgEnum("point_rule_category", [
  "daily_compliance",   // 每日合规 (计划/总结)
  "task_completion",    // 任务完成
  "quality",            // 质量贡献
  "collaboration",      // 协作
  "training",           // 培训
  "innovation",         // 创新
  "attendance",         // 考勤
  "penalty",            // 处罚
  "management",         // 管理类
]);

export const pointTransactionTypeEnum = pgEnum("point_transaction_type", [
  "award",    // 奖励
  "penalty",  // 处罚
  "redeem",   // 兑换消费
  "adjust",   // 管理调整
  "expire",   // 过期
]);

export const redemptionStatusEnum = pgEnum("point_redemption_status", [
  "pending",    // 待审批
  "approved",   // 已批准
  "rejected",   // 已拒绝
  "fulfilled",  // 已兑现
  "cancelled",  // 已取消
]);

export const complianceCheckTypeEnum = pgEnum("compliance_check_type", [
  "morning_plan",    // 上班15分钟内提交工作计划
  "evening_summary", // 下班前提交工作总结
  "next_day_plan",   // 完成次日工作计划
]);

// ── Table 1: Point Rules — 积分规则配置 ───────────────────

export const pointRules = pgTable("point_rules", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  category: pointRuleCategoryEnum("category").notNull(),
  description: text("description"),
  /** Points awarded (positive) or deducted (negative) */
  points: integer("points").notNull(),
  /** Max times this rule can trigger per day per employee */
  maxPerDay: integer("max_per_day").default(1),
  /** Max times per month */
  maxPerMonth: integer("max_per_month"),
  /** Whether this rule is currently active */
  isActive: boolean("is_active").notNull().default(true),
  /** Auto-trigger: system evaluates automatically; manual: manager grants */
  triggerMode: varchar("trigger_mode", { length: 20 }).notNull().default("auto"),
  /**
   * Role-based multipliers (CEO directive):
   * - staff/employee: ×1 (base)
   * - engineer+: ×10
   * - manager+: ×100
   * - bu_gm+: ×100
   * JSON map of role → multiplier
   */
  roleMultipliers: json("role_multipliers").$type<Record<string, number>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_point_rules_category").on(table.category),
  index("idx_point_rules_code").on(table.code),
]);

// ── Table 2: Point Transactions — 积分流水 ────────────────

export const pointTransactions = pgTable("point_transactions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  ruleCode: varchar("rule_code", { length: 80 }),
  type: pointTransactionTypeEnum("type").notNull(),
  points: integer("points").notNull(),
  balanceAfter: integer("balance_after"),
  description: text("description"),
  /** Source that triggered this transaction */
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: varchar("source_id", { length: 100 }),
  /** Who granted/deducted (null for auto) */
  grantedBy: integer("granted_by"),
  transactionDate: varchar("transaction_date", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_point_txn_employee").on(table.employeeId),
  index("idx_point_txn_date").on(table.transactionDate),
  index("idx_point_txn_rule").on(table.ruleCode),
  index("idx_point_txn_type").on(table.type),
]);

// ── Table 3: Point Balances — 员工积分余额 ────────────────

export const pointBalances = pgTable("point_balances", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().unique(),
  currentBalance: integer("current_balance").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  totalPenalties: integer("total_penalties").notNull().default(0),
  /** Year-to-date points */
  ytdPoints: integer("ytd_points").notNull().default(0),
  /** Threshold status */
  isOnObservation: boolean("is_on_observation").notNull().default(false),
  isExcellenceSuspended: boolean("is_excellence_suspended").notNull().default(false),
  excellenceSuspendedUntil: varchar("excellence_suspended_until", { length: 10 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_point_balance_employee").on(table.employeeId),
  index("idx_point_balance_observation").on(table.isOnObservation),
]);

// ── Table 4: Redemption Catalog — 积分兑换目录 ────────────

export const pointRedemptionCatalog = pgTable("point_redemption_catalog", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  description: text("description"),
  /** Points required to redeem */
  pointsCost: integer("points_cost").notNull(),
  /** Monetary equivalent in CNY (for reference) */
  monetaryValue: decimal("monetary_value", { precision: 14, scale: 2 }),
  /** Category: leave, travel, gift, training */
  category: varchar("category", { length: 50 }).notNull(),
  /** Available quantity (-1 = unlimited) */
  availableQty: integer("available_qty").notNull().default(-1),
  /** Min points balance required to be eligible */
  minBalance: integer("min_balance").default(0),
  isActive: boolean("is_active").notNull().default(true),
  /** JSON for additional metadata (travel destination, duration, etc.) */
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_redemption_catalog_category").on(table.category),
  index("idx_redemption_catalog_active").on(table.isActive),
]);

// ── Table 5: Redemption Requests — 兑换申请 ──────────────

export const pointRedemptions = pgTable("point_redemptions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  catalogItemId: integer("catalog_item_id").notNull(),
  catalogCode: varchar("catalog_code", { length: 80 }),
  pointsSpent: integer("points_spent").notNull(),
  status: redemptionStatusEnum("status").notNull().default("pending"),
  /** Requested dates for leave/travel */
  requestedStartDate: varchar("requested_start_date", { length: 10 }),
  requestedEndDate: varchar("requested_end_date", { length: 10 }),
  employeeNotes: text("employee_notes"),
  /** Approval chain */
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  /** Fulfillment */
  fulfilledAt: timestamp("fulfilled_at"),
  fulfilledBy: integer("fulfilled_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_redemption_employee").on(table.employeeId),
  index("idx_redemption_status").on(table.status),
  index("idx_redemption_catalog").on(table.catalogItemId),
]);

// ── Table 6: Point Thresholds — 积分阈值规则 ─────────────

export const pointThresholds = pgTable("point_thresholds", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  /** Threshold value (points below which action triggers) */
  threshold: integer("threshold").notNull(),
  /** Direction: 'below' = triggers when balance < threshold */
  direction: varchar("direction", { length: 10 }).notNull().default("below"),
  /** Action to take */
  action: varchar("action", { length: 100 }).notNull(),
  /** Duration of enforcement in days (null = indefinite until recovery) */
  durationDays: integer("duration_days"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Table 7: Enforcement Log — 阈值处罚执行 ──────────────

export const pointEnforcementLog = pgTable("point_enforcement_log", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  thresholdId: integer("threshold_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  pointsAtTrigger: integer("points_at_trigger").notNull(),
  enforcedAt: timestamp("enforced_at").defaultNow().notNull(),
  /** When the enforcement was lifted (null = still active) */
  liftedAt: timestamp("lifted_at"),
  liftedReason: text("lifted_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_enforcement_employee").on(table.employeeId),
  index("idx_enforcement_action").on(table.action),
]);

// ── Table 8: Daily Compliance Checks — 每日合规 ──────────

export const dailyComplianceChecks = pgTable("daily_compliance_checks", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  checkDate: varchar("check_date", { length: 10 }).notNull(),
  checkType: complianceCheckTypeEnum("check_type").notNull(),
  /** Whether the check passed */
  passed: boolean("passed").notNull().default(false),
  /** Deadline for this check (ISO timestamp) */
  deadline: timestamp("deadline"),
  /** When the employee actually completed it */
  completedAt: timestamp("completed_at"),
  /** Points awarded or deducted */
  pointsApplied: integer("points_applied").default(0),
  /** Reference to the plan/log that satisfied the check */
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: varchar("source_id", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("daily_compliance_emp_date_type_uniq").on(table.employeeId, table.checkDate, table.checkType),
  index("idx_compliance_employee").on(table.employeeId),
  index("idx_compliance_date").on(table.checkDate),
]);

// ── Table 9: Suggestion Submissions — 合理化建议通道 ──────

export const suggestionStatusEnum = pgEnum("suggestion_status", [
  "draft",        // 草稿
  "submitted",    // 已提交
  "under_review", // 评审中
  "effective",    // 有效建议
  "outstanding",  // 突出价值建议
  "major",        // 重大价值建议
  "rejected",     // 未采纳
  "implemented",  // 已实施
]);

export const suggestionSubmissions = pgTable("suggestion_submissions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  /** Suggestion title */
  title: varchar("title", { length: 300 }).notNull(),
  /** Full description */
  description: text("description").notNull(),
  /** Problem being solved */
  problemStatement: text("problem_statement"),
  /** Expected benefit / value */
  expectedBenefit: text("expected_benefit"),
  /** Implementation approach */
  implementationPlan: text("implementation_plan"),
  /** Estimated cost savings (CNY) */
  estimatedSavings: decimal("estimated_savings", { precision: 14, scale: 2 }),
  /** Target department / area */
  targetDepartment: varchar("target_department", { length: 100 }),
  /** Category: process / quality / safety / cost / innovation / management */
  category: varchar("category", { length: 50 }).notNull().default("process"),
  /** Status workflow */
  status: suggestionStatusEnum("status").notNull().default("submitted"),
  /** Evaluation by department manager */
  evaluatorId: integer("evaluator_id"),
  evaluatorNotes: text("evaluator_notes"),
  evaluatedAt: timestamp("evaluated_at"),
  /** CEO approval (for outstanding/major tiers) */
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  /** Points awarded */
  pointsAwarded: integer("points_awarded").default(0),
  /** Announcement ID (for auto-announcement) */
  announcementId: integer("announcement_id"),
  /** Whether announcement has been published */
  announcementPublished: boolean("announcement_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_suggestion_employee").on(table.employeeId),
  index("idx_suggestion_status").on(table.status),
  index("idx_suggestion_category").on(table.category),
]);

export type SuggestionSubmission = InferSelectModel<typeof suggestionSubmissions>;
export type InsertSuggestionSubmission = InferInsertModel<typeof suggestionSubmissions>;

// ── Table 10: Point Approval Requests — 积分审批 ─────────

export const pointApprovalStatusEnum = pgEnum("point_approval_status", [
  "pending",   // 待审批
  "approved",  // 已批准
  "rejected",  // 已拒绝
]);

export const pointApprovalRequests = pgTable("point_approval_requests", {
  id: serial("id").primaryKey(),
  /** Manager who initiated the request */
  requesterId: integer("requester_id").notNull(),
  /** Target employee receiving points */
  targetEmployeeId: integer("target_employee_id").notNull(),
  /** Rule code or 'manager_award' / 'manager_penalty' */
  ruleCode: varchar("rule_code", { length: 80 }),
  /** Requested points (positive or negative) */
  requestedPoints: integer("requested_points").notNull(),
  /** Reason / description */
  description: text("description").notNull(),
  /** Source event type */
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: varchar("source_id", { length: 100 }),
  /** Approval status */
  status: pointApprovalStatusEnum("status").notNull().default("pending"),
  /** Approver (superior / CEO) */
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  /** Whether points have been applied */
  pointsApplied: boolean("points_applied").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_point_approval_requester").on(table.requesterId),
  index("idx_point_approval_status").on(table.status),
  index("idx_point_approval_target").on(table.targetEmployeeId),
]);

export type PointApprovalRequest = InferSelectModel<typeof pointApprovalRequests>;
export type InsertPointApprovalRequest = InferInsertModel<typeof pointApprovalRequests>;

// ── Table 11: Community Posts — 公司社区动态 ─────────────

export const communityPostTypeEnum = pgEnum("community_post_type", [
  "announcement",     // 系统通告 (积分里程碑、建议公告等)
  "notice",           // 一般通知 (非紧急知晓类)
  "discussion",       // 讨论帖
  "achievement",      // 成就分享
  "suggestion_share", // 合理化建议公示
  "knowledge",        // 知识分享
  "tech_forum",       // 技术论坛讨论帖 (客户/员工)
  "product_qa",       // 产品问答 (客户提问)
]);

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  /** Author: 0 = system auto-generated */
  authorId: integer("author_id").notNull().default(0),
  postType: communityPostTypeEnum("post_type").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  /** Whether content passed sensitive word check */
  contentClean: boolean("content_clean").notNull().default(true),
  /** Priority: normal/important/urgent — controls pinning */
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  /** Scope: company_wide / department / bu */
  scope: varchar("scope", { length: 30 }).notNull().default("company_wide"),
  scopeValue: varchar("scope_value", { length: 100 }),
  /** Source link (e.g., points system, suggestion ID) */
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: varchar("source_id", { length: 100 }),
  /** Engagement counters */
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  /** Pinned to top */
  isPinned: boolean("is_pinned").notNull().default(false),
  /** Whether this post requires acknowledgement */
  requiresAck: boolean("requires_ack").notNull().default(false),
  ackCount: integer("ack_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_community_post_type").on(table.postType),
  index("idx_community_post_scope").on(table.scope),
  index("idx_community_post_pinned").on(table.isPinned),
  index("idx_community_post_created").on(table.createdAt),
]);

// ── Table 12: Community Sensitive Words — 敏感词库 ───────

export const communitySensitiveWords = pgTable("community_sensitive_words", {
  id: serial("id").primaryKey(),
  word: varchar("word", { length: 100 }).notNull(),
  /** Category: profanity/political/discrimination/confidential/custom */
  category: varchar("category", { length: 50 }).notNull().default("custom"),
  /** Action: block (reject post) / mask (replace with ***) / flag (allow but alert) */
  action: varchar("action", { length: 20 }).notNull().default("mask"),
  /** Replacement text for mask action */
  replacement: varchar("replacement", { length: 50 }).notNull().default("***"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_sensitive_word").on(table.word),
  index("idx_sensitive_category").on(table.category),
]);

// ── Table 13: Community Acknowledgements — 已读确认 ──────

export const communityAcks = pgTable("community_acks", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  ackedAt: timestamp("acked_at").defaultNow().notNull(),
}, (table) => [
  index("idx_community_ack_post").on(table.postId),
  index("idx_community_ack_emp").on(table.employeeId),
]);

export type CommunityPost = InferSelectModel<typeof communityPosts>;
export type InsertCommunityPost = InferInsertModel<typeof communityPosts>;
export type CommunitySensitiveWord = InferSelectModel<typeof communitySensitiveWords>;
export type CommunityAck = InferSelectModel<typeof communityAcks>;

// ── Table 14: Community Comments — 论坛评论/回复 ─────────

export const communityComments = pgTable("community_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  authorId: integer("author_id").notNull(),
  authorType: varchar("author_type", { length: 20 }).notNull().default("customer"),
  authorName: varchar("author_name", { length: 100 }).notNull(),
  authorCompany: varchar("author_company", { length: 200 }),
  parentId: integer("parent_id"),
  content: text("content").notNull(),
  contentClean: boolean("content_clean").notNull().default(true),
  sensitiveWordsDetected: text("sensitive_words_detected"),
  isApproved: boolean("is_approved").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_community_comment_post").on(table.postId),
  index("idx_community_comment_parent").on(table.parentId),
  index("idx_community_comment_author").on(table.authorId),
]);

export type CommunityComment = InferSelectModel<typeof communityComments>;

// ── Table 15: Elite Benefit Applications — 精英福利申请 ────

export const eliteBenefitStatusEnum = pgEnum("elite_benefit_status", [
  "pending",      // 待审核
  "approved",     // 已批准
  "rejected",     // 已拒绝
  "active",       // 生效中
  "expired",      // 已过期
  "revoked",      // 被撤销 (条件不再满足)
]);

export const eliteBenefitTypeEnum = pgEnum("elite_benefit_type", [
  "alternating_rest",  // 大小休 (3个月)
  "five_day_week",     // 五天工作制 (持续，需连续两次高水准交付)
]);

export const eliteBenefitApplications = pgTable("elite_benefit_applications", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  benefitType: eliteBenefitTypeEnum("benefit_type").notNull(),
  status: eliteBenefitStatusEnum("status").default("pending").notNull(),

  // Eligibility snapshot at application time
  pointBalance: integer("point_balance").notNull(),           // ≥5000 required
  kpiAvg6m: decimal("kpi_avg_6m", { precision: 5, scale: 2 }), // ≥83 required
  skillLevel: varchar("skill_level", { length: 10 }),         // ≥L3 required
  highDeliveryCount: integer("high_delivery_count"),          // for five_day_week: ≥2 consecutive
  eligibilityDetails: json("eligibility_details"),            // full check snapshot

  // Duration
  startDate: varchar("start_date", { length: 10 }),          // YYYY-MM-DD
  endDate: varchar("end_date", { length: 10 }),               // for alternating_rest: 3 months out
  durationMonths: integer("duration_months"),                 // 3 for alternating_rest, null for ongoing

  // Approval
  approvedBy: integer("approved_by"),
  approvalNotes: text("approval_notes"),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),

  // Revocation (if conditions no longer met)
  revokedAt: timestamp("revoked_at"),
  revocationReason: text("revocation_reason"),

  // Downgrade tracking — CEO指令: 动态考评循环
  revocationCount: integer("revocation_count").default(0),    // 被撤销次数，影响下次申请冷却期
  cooldownUntil: varchar("cooldown_until", { length: 10 }),   // 冷却截止日期 (每撤销一次+1个月)

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_elite_benefit_emp").on(table.employeeId),
  index("idx_elite_benefit_status").on(table.status),
]);

export type EliteBenefitApplication = InferSelectModel<typeof eliteBenefitApplications>;
export type InsertEliteBenefitApplication = InferInsertModel<typeof eliteBenefitApplications>;

// ── Table 15: Elite Benefit Monthly Reviews — 精英福利月度考评 ──

export const eliteBenefitReviews = pgTable("elite_benefit_reviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),         // FK → elite_benefit_applications
  employeeId: integer("employee_id").notNull(),
  reviewPeriod: varchar("review_period", { length: 7 }).notNull(), // YYYY-MM
  benefitType: varchar("benefit_type", { length: 30 }).notNull(),

  // Monthly snapshot
  kpiScore: decimal("kpi_score", { precision: 5, scale: 2 }),
  pointBalance: integer("point_balance"),
  skillLevel: varchar("skill_level", { length: 10 }),
  deliveryScore: decimal("delivery_score", { precision: 5, scale: 2 }),

  // Violation flags
  kpiBelowThreshold: boolean("kpi_below_threshold").default(false), // KPI < 80
  pointsBelowThreshold: boolean("points_below_threshold").default(false), // points < 5000
  skillDowngraded: boolean("skill_downgraded").default(false),

  // Consecutive violation tracking
  consecutiveKpiViolations: integer("consecutive_kpi_violations").default(0), // 连续KPI<80月数
  consecutivePointViolations: integer("consecutive_point_violations").default(0),

  // Outcome
  outcome: varchar("outcome", { length: 30 }).default("pass").notNull(), // pass | warning | commitment | revoked
  commitmentDeadline: varchar("commitment_deadline", { length: 10 }), // 承诺改善截止日
  commitmentContent: text("commitment_content"),  // 员工承诺内容
  commitmentResult: varchar("commitment_result", { length: 20 }), // met | not_met | pending

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_elite_review_app").on(table.applicationId),
  index("idx_elite_review_emp_period").on(table.employeeId, table.reviewPeriod),
]);

// ── Table 16: Workstation Presets — 员工工作台预设 ─────────

export const workstationPresets = pgTable("workstation_presets", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().unique(),
  /** GRT employee code (e.g., GRT001) */
  employeeCode: varchar("employee_code", { length: 20 }),
  /** Mapped system role */
  systemRole: varchar("system_role", { length: 30 }).notNull().default("employee"),
  /** BU code (BU1-BU5, HQ, FIN, HR, IT, SUP) */
  buCode: varchar("bu_code", { length: 10 }),
  /** Dashboard layout template key */
  dashboardLayout: varchar("dashboard_layout", { length: 50 }).notNull().default("standard-workspace"),
  /** Quick-access pinned menu paths */
  pinnedMenuPaths: json("pinned_menu_paths").$type<string[]>().notNull(),
  /** First page after login */
  defaultLandingPage: varchar("default_landing_page", { length: 100 }).notNull().default("/personal-dashboard"),
  /** Dashboard widget configuration */
  widgetConfig: json("widget_config").$type<Array<{ id: string; title: string; size: string; position: number }>>().notNull(),
  /** AI assistant capability level 1-5 */
  aiAssistantLevel: integer("ai_assistant_level").notNull().default(2),
  /** 智能早报 modules */
  briefingModules: json("briefing_modules").$type<string[]>().notNull(),
  /** KPI tracking widgets */
  kpiWidgets: json("kpi_widgets").$type<string[]>().notNull(),
  /** Work schedule: six_day / five_day / alternating / shift */
  workSchedule: varchar("work_schedule", { length: 20 }).notNull().default("six_day"),
  /** Attendance group name */
  attendanceGroup: varchar("attendance_group", { length: 50 }),
  /** Feature flags */
  canAccessSalary: boolean("can_access_salary").notNull().default(false),
  canAccessFinance: boolean("can_access_finance").notNull().default(false),
  canApproveOrders: boolean("can_approve_orders").notNull().default(false),
  canManageTeam: boolean("can_manage_team").notNull().default(false),
  canViewAllBU: boolean("can_view_all_bu").notNull().default(false),
  /** Performance tier: elite / standard / new_hire / probation */
  performanceTier: varchar("performance_tier", { length: 20 }).notNull().default("standard"),
  /** Latest KPI score */
  kpiScore: decimal("kpi_score", { precision: 5, scale: 2 }),
  /** Salary grade from payroll */
  salaryGrade: varchar("salary_grade", { length: 10 }),
  /** User can customize (overrides seed defaults) */
  isCustomized: boolean("is_customized").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_workstation_emp").on(table.employeeId),
  index("idx_workstation_role").on(table.systemRole),
]);

// ── Type Exports ──────────────────────────────────────────

export type PointRule = InferSelectModel<typeof pointRules>;
export type InsertPointRule = InferInsertModel<typeof pointRules>;
export type PointTransaction = InferSelectModel<typeof pointTransactions>;
export type InsertPointTransaction = InferInsertModel<typeof pointTransactions>;
export type PointBalance = InferSelectModel<typeof pointBalances>;
export type InsertPointBalance = InferInsertModel<typeof pointBalances>;
export type PointRedemptionCatalogItem = InferSelectModel<typeof pointRedemptionCatalog>;
export type InsertPointRedemptionCatalogItem = InferInsertModel<typeof pointRedemptionCatalog>;
export type PointRedemption = InferSelectModel<typeof pointRedemptions>;
export type InsertPointRedemption = InferInsertModel<typeof pointRedemptions>;
export type PointThreshold = InferSelectModel<typeof pointThresholds>;
export type DailyComplianceCheck = InferSelectModel<typeof dailyComplianceChecks>;
export type WorkstationPreset = InferSelectModel<typeof workstationPresets>;
export type InsertWorkstationPreset = InferInsertModel<typeof workstationPresets>;
