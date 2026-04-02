/**
 * Supplier Governance Schema — 供应商治理体系
 *
 * CEO 倪亚东批复: 2026-03 采购邮件
 * 6 tables covering: audit plans, qualification, committee review,
 * quarterly spot-checks, elimination tracking
 *
 * Key roles:
 *   沈迎凤(采购经理)   — audit plan owner, monthly report
 *   金晓锋(质量经理)   — quality audit, quarterly spot-check (5 orders)
 *   戴晓燕(销售经理)   — audit reviewer, quarterly spot-check (5 orders)
 *   王秀萍(财务)       — committee member, bid oversight
 *   倪微薇(AI数智部)   — special approval
 *   周辉/徐树奎(BU经理) — final sign-off
 */

import {
  pgTable, serial, varchar, text, timestamp, integer, json, boolean, index, pgEnum,
  decimal,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────

export const auditStatusEnum = pgEnum("supplier_audit_status", [
  "planned", "in_progress", "completed", "cancelled",
]);

export const qualAppStatusEnum = pgEnum("supplier_qual_app_status", [
  "draft",              // 采购工程师草稿
  "submitted",          // 已提交申请
  "quality_review",     // 质量体系审核中 (金晓锋/戴晓燕)
  "quality_passed",     // 质量审核通过
  "quality_rejected",   // 质量审核不通过
  "commercial_review",  // 商务洽谈中 (沈迎凤)
  "special_approval",   // 特批中 (倪微薇)
  "pending_sign_off",   // 待BU经理签字批准
  "approved",           // 已批准准入
  "rejected",           // 最终驳回
]);

export const spotCheckResultEnum = pgEnum("spot_check_result", [
  "conforming", "minor_issue", "major_issue", "critical",
]);

export const eliminationStatusEnum = pgEnum("elimination_status", [
  "proposed", "under_review", "approved", "executed", "cancelled",
]);

// ── 1. Supplier Audit Plans (沈经理制定审核计划) ─────────────

export const supplierAuditPlans = pgTable("supplier_audit_plans", {
  id: serial("id").primaryKey(),
  planCode: varchar("plan_code", { length: 30 }).notNull(),  // SAP-2026-Q1-001
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  year: integer("year").notNull(),
  quarter: integer("quarter"),                               // 1-4 or null for monthly
  month: integer("month"),                                   // 1-12
  planType: varchar("plan_type", { length: 30 }).notNull(),  // regular / new_supplier / elimination / spot_check
  supplierIds: json("supplier_ids").$type<number[]>(),       // target supplier IDs
  auditTeam: json("audit_team").$type<string[]>(),           // ["金晓锋","戴晓燕","沈迎凤"]
  plannedStartDate: varchar("planned_start_date", { length: 10 }),
  plannedEndDate: varchar("planned_end_date", { length: 10 }),
  status: auditStatusEnum("status").notNull().default("planned"),
  createdBy: varchar("created_by", { length: 50 }),          // 沈迎凤
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (t) => [
  index("sap_year_quarter_idx").on(t.year, t.quarter),
  index("sap_status_idx").on(t.status),
]);

// ── 2. Supplier Audits (审核执行记录) ────────────────────────

export const supplierAudits = pgTable("supplier_audits", {
  id: serial("id").primaryKey(),
  auditCode: varchar("audit_code", { length: 30 }).notNull(), // SA-2026-001
  planId: integer("plan_id"),                                  // FK to audit_plans
  supplierId: integer("supplier_id").notNull(),
  supplierName: varchar("supplier_name", { length: 200 }).notNull(),
  auditType: varchar("audit_type", { length: 30 }).notNull(), // initial / periodic / special / spot_check
  auditDate: varchar("audit_date", { length: 10 }),
  // ISO体系检查
  hasIso9001: boolean("has_iso_9001").default(false),
  hasIso14001: boolean("has_iso_14001").default(false),
  hasIatf16949: boolean("has_iatf_16949").default(false),
  isoStatus: varchar("iso_status", { length: 30 }),           // valid / expired / none
  isoCertExpiry: varchar("iso_cert_expiry", { length: 10 }),
  // 材料工艺体系检查
  materialProcessScore: integer("material_process_score"),     // 0-100
  qualitySystemScore: integer("quality_system_score"),         // 0-100
  deliveryCapabilityScore: integer("delivery_capability_score"), // 0-100
  priceCompetitivenessScore: integer("price_competitiveness_score"), // 0-100
  overallScore: integer("overall_score"),                      // 0-100
  overallGrade: varchar("overall_grade", { length: 5 }),       // A/B/C/D/F
  // 结论
  findings: json("findings").$type<Array<{ category: string; description: string; severity: string }>>(),
  recommendation: varchar("recommendation", { length: 30 }),   // approve / conditional / reject / eliminate
  correctiveActions: json("corrective_actions").$type<Array<{ action: string; deadline: string; responsible: string }>>(),
  // 审核人员
  leadAuditor: varchar("lead_auditor", { length: 50 }),        // 金晓锋 or 戴晓燕
  auditTeam: json("audit_team").$type<string[]>(),
  financialParticipant: varchar("financial_participant", { length: 50 }), // 王秀萍
  status: auditStatusEnum("status").notNull().default("planned"),
  reportUrl: varchar("report_url", { length: 500 }),
  createdBy: varchar("created_by", { length: 50 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (t) => [
  index("sa_supplier_idx").on(t.supplierId),
  index("sa_status_idx").on(t.status),
  index("sa_plan_idx").on(t.planId),
]);

// ── 3. New Supplier Qualification Applications (新供应商准入) ─

export const supplierQualificationApps = pgTable("supplier_qualification_apps", {
  id: serial("id").primaryKey(),
  appCode: varchar("app_code", { length: 30 }).notNull(),     // SQA-2026-001
  // 供应商基本信息
  supplierName: varchar("supplier_name", { length: 200 }).notNull(),
  supplierContact: varchar("supplier_contact", { length: 100 }),
  supplierPhone: varchar("supplier_phone", { length: 50 }),
  supplierEmail: varchar("supplier_email", { length: 200 }),
  supplierAddress: text("supplier_address"),
  businessLicense: varchar("business_license", { length: 100 }),
  // 资质信息
  hasIso9001: boolean("has_iso_9001").default(false),
  hasIso14001: boolean("has_iso_14001").default(false),
  hasIatf16949: boolean("has_iatf_16949").default(false),
  otherCertifications: json("other_certifications").$type<string[]>(),
  // 供应品类
  supplyCategory: varchar("supply_category", { length: 100 }),  // 泵阀/电气/结构件/标准件/密封件
  supplyMaterials: json("supply_materials").$type<string[]>(),
  estimatedAnnualVolume: varchar("estimated_annual_volume", { length: 100 }),
  // 流程状态
  status: qualAppStatusEnum("status").notNull().default("draft"),
  // 申请人 (采购工程师)
  applicant: varchar("applicant", { length: 50 }),
  applicantDept: varchar("applicant_dept", { length: 50 }),
  appliedAt: timestamp("applied_at", { mode: "string" }),
  // 质量审核 (戴晓燕/金晓锋)
  qualityReviewer: varchar("quality_reviewer", { length: 50 }),
  qualityReviewResult: varchar("quality_review_result", { length: 30 }), // pass/fail/conditional
  qualityReviewNotes: text("quality_review_notes"),
  qualityReviewedAt: timestamp("quality_reviewed_at", { mode: "string" }),
  // 商务洽谈 (沈迎凤)
  commercialReviewer: varchar("commercial_reviewer", { length: 50 }),
  commercialNotes: text("commercial_notes"),
  commercialReviewedAt: timestamp("commercial_reviewed_at", { mode: "string" }),
  // 特批 (倪微薇 — 仅需要时)
  requiresSpecialApproval: boolean("requires_special_approval").default(false),
  specialApprover: varchar("special_approver", { length: 50 }),
  specialApprovalNotes: text("special_approval_notes"),
  specialApprovedAt: timestamp("special_approved_at", { mode: "string" }),
  // BU经理签字批准 (周辉/徐树奎)
  signOffApprover: varchar("sign_off_approver", { length: 50 }),
  signOffNotes: text("sign_off_notes"),
  signOffAt: timestamp("sign_off_at", { mode: "string" }),
  // 关联
  resultingSupplierId: integer("resulting_supplier_id"),        // 准入后创建的supplier ID
  createdBy: varchar("created_by", { length: 50 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (t) => [
  index("sqa_status_idx").on(t.status),
  index("sqa_applicant_idx").on(t.applicant),
]);

// ── 4. Evaluation Committee Reviews (评标委员会) ─────────────

export const supplierCommitteeReviews = pgTable("supplier_committee_reviews", {
  id: serial("id").primaryKey(),
  reviewCode: varchar("review_code", { length: 30 }).notNull(), // SCR-2026-001
  reviewType: varchar("review_type", { length: 30 }).notNull(), // bid_evaluation / quarterly_review / elimination_review
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  // 相关供应商/项目
  supplierId: integer("supplier_id"),
  supplierName: varchar("supplier_name", { length: 200 }),
  projectNo: varchar("project_no", { length: 50 }),
  // 委员会成员评分
  committeMembers: json("committee_members").$type<Array<{
    name: string;
    role: string;    // 监督者/评标委员/财务监督
    score: number | null;
    comments: string;
    votedAt: string | null;
  }>>(),
  // 结论
  finalDecision: varchar("final_decision", { length: 30 }),    // approve / reject / conditional / defer
  finalScore: decimal("final_score", { precision: 5, scale: 2 }),
  decisionNotes: text("decision_notes"),
  meetingDate: varchar("meeting_date", { length: 10 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending / in_progress / completed
  createdBy: varchar("created_by", { length: 50 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (t) => [
  index("scr_supplier_idx").on(t.supplierId),
  index("scr_status_idx").on(t.status),
]);

// ── 5. Quarterly Spot Checks (季度抽检) ──────────────────────

export const supplierSpotChecks = pgTable("supplier_spot_checks", {
  id: serial("id").primaryKey(),
  checkCode: varchar("check_code", { length: 30 }).notNull(), // SSC-2026-Q1-001
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),                       // 1-4
  // 抽检订单信息
  purchaseOrderId: integer("purchase_order_id"),
  poNumber: varchar("po_number", { length: 50 }),
  supplierId: integer("supplier_id").notNull(),
  supplierName: varchar("supplier_name", { length: 200 }).notNull(),
  materialName: varchar("material_name", { length: 200 }),
  // 抽检执行
  inspector: varchar("inspector", { length: 50 }).notNull(),   // 金晓锋 or 戴晓燕
  inspectionDate: varchar("inspection_date", { length: 10 }),
  // 检查项
  documentCheck: spotCheckResultEnum("document_check"),         // 单据符合性
  qualityCheck: spotCheckResultEnum("quality_check"),           // 质量符合性
  deliveryCheck: spotCheckResultEnum("delivery_check"),         // 交期符合性
  priceCheck: spotCheckResultEnum("price_check"),               // 价格合理性
  processCheck: spotCheckResultEnum("process_check"),           // 工艺符合性
  overallResult: spotCheckResultEnum("overall_result"),
  // 详情
  findings: text("findings"),
  correctiveActions: text("corrective_actions"),
  reportUrl: varchar("report_url", { length: 500 }),
  // 财务参与
  financialParticipant: varchar("financial_participant", { length: 50 }), // 王秀萍
  financialNotes: text("financial_notes"),
  createdBy: varchar("created_by", { length: 50 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (t) => [
  index("ssc_year_quarter_idx").on(t.year, t.quarter),
  index("ssc_inspector_idx").on(t.inspector),
  index("ssc_supplier_idx").on(t.supplierId),
]);

// ── 6. Supplier Elimination Records (供应商淘汰记录) ─────────

export const supplierEliminationRecords = pgTable("supplier_elimination_records", {
  id: serial("id").primaryKey(),
  eliminationCode: varchar("elimination_code", { length: 30 }).notNull(), // SER-2026-001
  supplierId: integer("supplier_id").notNull(),
  supplierName: varchar("supplier_name", { length: 200 }).notNull(),
  // 淘汰原因
  reason: varchar("reason", { length: 50 }).notNull(),         // no_iso / quality_failure / delivery_failure / price / single_source_replacement
  reasonDetail: text("reason_detail"),
  // 评估数据
  lastAuditScore: integer("last_audit_score"),
  defectRate: decimal("defect_rate", { precision: 5, scale: 2 }),
  riskScore: integer("risk_score"),
  // 替代供应商
  replacementSupplierId: integer("replacement_supplier_id"),
  replacementSupplierName: varchar("replacement_supplier_name", { length: 200 }),
  // 流程
  status: eliminationStatusEnum("status").notNull().default("proposed"),
  proposedBy: varchar("proposed_by", { length: 50 }),          // 沈迎凤
  proposedAt: timestamp("proposed_at", { mode: "string" }),
  reviewedBy: varchar("reviewed_by", { length: 50 }),          // 金晓锋/戴晓燕
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  approvedBy: varchar("approved_by", { length: 50 }),          // 周辉/徐树奎
  approvedAt: timestamp("approved_at", { mode: "string" }),
  executedAt: timestamp("executed_at", { mode: "string" }),
  // 月度报告 (沈经理)
  monthlyReportMonth: varchar("monthly_report_month", { length: 7 }), // 2026-03
  createdBy: varchar("created_by", { length: 50 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (t) => [
  index("ser_supplier_idx").on(t.supplierId),
  index("ser_status_idx").on(t.status),
]);
