/**
 * GRT 5.0 项目财务增强Schema
 *
 * P1-1: 投标项目管理 (商机→投标→中标→项目)
 * P1-3: 工时成本池 (售价-利润-采购=目标工时池)
 * P1-4: AP/AR账龄快照
 * P1-6: 预算版本管理
 * P1-8: 预警矩阵
 * P1-9: 现金流跟踪
 * P1-10: 报销政策规则引擎
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ============================================================
// 1. bidProjects — 投标项目 (商机→投标→中标→项目全程追溯)
// ============================================================

export const bidProjects = pgTable(
  "bid_projects",
  {
    id: serial("id").primaryKey(),
    /** BID-{BU}-{YYYY}-{NNN} */
    bidCode: varchar("bid_code", { length: 50 }).notNull().unique(),
    /** OPP-{BU}-{YYYY}-{NNN}, nullable (can start from bid directly) */
    opportunityCode: varchar("opportunity_code", { length: 50 }),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    customerId: integer("customer_id"),
    projectTitle: varchar("project_title", { length: 300 }).notNull(),
    projectDescription: text("project_description"),
    buCode: varchar("bu_code", { length: 50 }).notNull(),
    salesRepId: integer("sales_rep_id").references(() => users.id),
    salesRepName: varchar("sales_rep_name", { length: 100 }),
    technicalLeadId: integer("technical_lead_id").references(() => users.id),
    technicalLeadName: varchar("technical_lead_name", { length: 100 }),
    /** Estimated contract value */
    estimatedAmount: decimal("estimated_amount", { precision: 14, scale: 2 }).notNull(),
    /** From sandbox reference */
    estimatedCost: decimal("estimated_cost", { precision: 14, scale: 2 }),
    /** Target margin % */
    grossMarginTarget: decimal("gross_margin_target", { precision: 5, scale: 2 }),
    bidDeadline: timestamp("bid_deadline", { mode: "string" }),
    bidSubmittedDate: timestamp("bid_submitted_date", { mode: "string" }),
    /** JSON array of document URLs */
    bidDocumentUrls: text("bid_document_urls"),
    /** JSON: [{name, estimatedPrice}] */
    competitorInfo: text("competitor_info"),
    /** draft/submitted/technical_review/commercial_review/approved/bid_submitted/evaluation/won/lost/cancelled */
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    wonDate: timestamp("won_date", { mode: "string" }),
    lostReason: text("lost_reason"),
    /** Linked PRJ after winning */
    formalProjectId: integer("formal_project_id"),
    /** PRJ-{BU}-{YYYY}-{NNN} */
    formalProjectCode: varchar("formal_project_code", { length: 50 }),
    approvedBy: integer("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { mode: "string" }),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("bp_bu_code_idx").on(table.buCode),
    index("bp_status_idx").on(table.status),
    index("bp_sales_rep_idx").on(table.salesRepId),
    index("bp_customer_name_idx").on(table.customerName),
    index("bp_bid_deadline_idx").on(table.bidDeadline),
  ]
);

// ============================================================
// 2. laborCostPools — 项目工时成本目标池
// ============================================================

export const laborCostPools = pgTable(
  "labor_cost_pools",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    projectCode: varchar("project_code", { length: 50 }).notNull(),
    buCode: varchar("bu_code", { length: 50 }),
    /** 设备售价 */
    equipmentSellingPrice: decimal("equipment_selling_price", { precision: 14, scale: 2 }).notNull(),
    /** 理论利润 */
    theoreticalProfit: decimal("theoretical_profit", { precision: 14, scale: 2 }).notNull(),
    /** 利润率% */
    profitRate: decimal("profit_rate", { precision: 5, scale: 2 }),
    /** 采购成本 */
    procurementCost: decimal("procurement_cost", { precision: 14, scale: 2 }).notNull(),
    /** = sellingPrice - profit - procurement */
    targetLaborPool: decimal("target_labor_pool", { precision: 14, scale: 2 }).notNull(),
    /** 实际累计工时成本 */
    actualLaborCost: decimal("actual_labor_cost", { precision: 14, scale: 2 }).default("0"),
    /** actual/target % */
    laborUtilization: decimal("labor_utilization", { precision: 5, scale: 2 }).default("0"),

    // T01–T15 Hours & Cost (方案设计 through 15 stages)
    t01Hours: decimal("t01_hours", { precision: 8, scale: 2 }).default("0"),
    t01Cost: decimal("t01_cost", { precision: 14, scale: 2 }).default("0"),
    t02Hours: decimal("t02_hours", { precision: 8, scale: 2 }).default("0"),
    t02Cost: decimal("t02_cost", { precision: 14, scale: 2 }).default("0"),
    t03Hours: decimal("t03_hours", { precision: 8, scale: 2 }).default("0"),
    t03Cost: decimal("t03_cost", { precision: 14, scale: 2 }).default("0"),
    t04Hours: decimal("t04_hours", { precision: 8, scale: 2 }).default("0"),
    t04Cost: decimal("t04_cost", { precision: 14, scale: 2 }).default("0"),
    t05Hours: decimal("t05_hours", { precision: 8, scale: 2 }).default("0"),
    t05Cost: decimal("t05_cost", { precision: 14, scale: 2 }).default("0"),
    t06Hours: decimal("t06_hours", { precision: 8, scale: 2 }).default("0"),
    t06Cost: decimal("t06_cost", { precision: 14, scale: 2 }).default("0"),
    t07Hours: decimal("t07_hours", { precision: 8, scale: 2 }).default("0"),
    t07Cost: decimal("t07_cost", { precision: 14, scale: 2 }).default("0"),
    t08Hours: decimal("t08_hours", { precision: 8, scale: 2 }).default("0"),
    t08Cost: decimal("t08_cost", { precision: 14, scale: 2 }).default("0"),
    t09Hours: decimal("t09_hours", { precision: 8, scale: 2 }).default("0"),
    t09Cost: decimal("t09_cost", { precision: 14, scale: 2 }).default("0"),
    t10Hours: decimal("t10_hours", { precision: 8, scale: 2 }).default("0"),
    t10Cost: decimal("t10_cost", { precision: 14, scale: 2 }).default("0"),
    t11Hours: decimal("t11_hours", { precision: 8, scale: 2 }).default("0"),
    t11Cost: decimal("t11_cost", { precision: 14, scale: 2 }).default("0"),
    t12Hours: decimal("t12_hours", { precision: 8, scale: 2 }).default("0"),
    t12Cost: decimal("t12_cost", { precision: 14, scale: 2 }).default("0"),
    t13Hours: decimal("t13_hours", { precision: 8, scale: 2 }).default("0"),
    t13Cost: decimal("t13_cost", { precision: 14, scale: 2 }).default("0"),
    t14Hours: decimal("t14_hours", { precision: 8, scale: 2 }).default("0"),
    t14Cost: decimal("t14_cost", { precision: 14, scale: 2 }).default("0"),
    t15Hours: decimal("t15_hours", { precision: 8, scale: 2 }).default("0"),
    t15Cost: decimal("t15_cost", { precision: 14, scale: 2 }).default("0"),

    // Department cost breakdowns
    mechanicalHours: decimal("mechanical_hours", { precision: 8, scale: 2 }).default("0"),
    mechanicalCost: decimal("mechanical_cost", { precision: 14, scale: 2 }).default("0"),
    electricalHours: decimal("electrical_hours", { precision: 8, scale: 2 }).default("0"),
    electricalCost: decimal("electrical_cost", { precision: 14, scale: 2 }).default("0"),
    procurementDeptCost: decimal("procurement_dept_cost", { precision: 14, scale: 2 }).default("0"),
    salesPersonCost: decimal("sales_person_cost", { precision: 14, scale: 2 }).default("0"),
    /** 超目标成本(仅统计,不计产值) */
    overTargetCost: decimal("over_target_cost", { precision: 14, scale: 2 }).default("0"),
    isOverTarget: boolean("is_over_target").default(false),

    /** active/closed/archived */
    status: varchar("status", { length: 50 }).notNull().default("active"),
    fiscalYear: integer("fiscal_year"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("lcp_project_code_idx").on(table.projectCode),
    index("lcp_bu_code_idx").on(table.buCode),
    index("lcp_status_idx").on(table.status),
  ]
);

// ============================================================
// 3. apAgingSnapshots — 应付账龄快照
// ============================================================

export const apAgingSnapshots = pgTable(
  "ap_aging_snapshots",
  {
    id: serial("id").primaryKey(),
    snapshotDate: timestamp("snapshot_date", { mode: "string" }).notNull(),
    supplierId: integer("supplier_id").notNull(),
    supplierCode: varchar("supplier_code", { length: 50 }),
    supplierName: varchar("supplier_name", { length: 200 }),
    totalOutstanding: decimal("total_outstanding", { precision: 14, scale: 2 }).default("0"),
    current0to30: decimal("current_0_to_30", { precision: 14, scale: 2 }).default("0"),
    days31to60: decimal("days_31_to_60", { precision: 14, scale: 2 }).default("0"),
    days61to90: decimal("days_61_to_90", { precision: 14, scale: 2 }).default("0"),
    days91to120: decimal("days_91_to_120", { precision: 14, scale: 2 }).default("0"),
    over120Days: decimal("over_120_days", { precision: 14, scale: 2 }).default("0"),
    oldestInvoiceDate: timestamp("oldest_invoice_date", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("ap_snapshot_date_idx").on(table.snapshotDate),
    index("ap_supplier_id_idx").on(table.supplierId),
  ]
);

// ============================================================
// 4. arAgingSnapshots — 应收账龄快照
// ============================================================

export const arAgingSnapshots = pgTable(
  "ar_aging_snapshots",
  {
    id: serial("id").primaryKey(),
    snapshotDate: timestamp("snapshot_date", { mode: "string" }).notNull(),
    customerId: integer("customer_id"),
    customerCode: varchar("customer_code", { length: 50 }),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    projectId: integer("project_id"),
    projectCode: varchar("project_code", { length: 50 }),
    totalOutstanding: decimal("total_outstanding", { precision: 14, scale: 2 }).default("0"),
    current0to30: decimal("current_0_to_30", { precision: 14, scale: 2 }).default("0"),
    days31to60: decimal("days_31_to_60", { precision: 14, scale: 2 }).default("0"),
    days61to90: decimal("days_61_to_90", { precision: 14, scale: 2 }).default("0"),
    days91to120: decimal("days_91_to_120", { precision: 14, scale: 2 }).default("0"),
    over120Days: decimal("over_120_days", { precision: 14, scale: 2 }).default("0"),
    /** 坏账准备 (5% of 31-60, 10% of 61-90, 30% of 91-120, 50% of 120+) */
    badDebtProvision: decimal("bad_debt_provision", { precision: 14, scale: 2 }).default("0"),
    oldestInvoiceDate: timestamp("oldest_invoice_date", { mode: "string" }),
    /** Days Sales Outstanding */
    dso: integer("dso"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("ar_snapshot_date_idx").on(table.snapshotDate),
    index("ar_customer_id_idx").on(table.customerId),
    index("ar_project_code_idx").on(table.projectCode),
  ]
);

// ============================================================
// 5. budgetVersions — 预算版本管理
// ============================================================

export const budgetVersions = pgTable(
  "budget_versions",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    projectCode: varchar("project_code", { length: 50 }).notNull(),
    /** original/revised/forecast/actual */
    versionType: varchar("version_type", { length: 50 }).notNull(),
    /** 1, 2, 3... */
    versionNumber: integer("version_number").notNull(),
    /** e.g. "Original 2026", "Rev.1 March" */
    versionName: varchar("version_name", { length: 100 }),
    totalBudget: decimal("total_budget", { precision: 14, scale: 2 }).notNull(),
    materialBudget: decimal("material_budget", { precision: 14, scale: 2 }).default("0"),
    laborBudget: decimal("labor_budget", { precision: 14, scale: 2 }).default("0"),
    procurementBudget: decimal("procurement_budget", { precision: 14, scale: 2 }).default("0"),
    travelBudget: decimal("travel_budget", { precision: 14, scale: 2 }).default("0"),
    overheadBudget: decimal("overhead_budget", { precision: 14, scale: 2 }).default("0"),
    contingencyBudget: decimal("contingency_budget", { precision: 14, scale: 2 }).default("0"),
    approvedBy: integer("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { mode: "string" }),
    /** Only one active version per type */
    isActive: boolean("is_active").default(true),
    effectiveDate: timestamp("effective_date", { mode: "string" }),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bv_project_type_version_idx").on(
      table.projectId,
      table.versionType,
      table.versionNumber
    ),
    index("bv_project_code_idx").on(table.projectCode),
    index("bv_version_type_idx").on(table.versionType),
    index("bv_is_active_idx").on(table.isActive),
  ]
);

// ============================================================
// 6. cashFlowRecords — 现金流跟踪
// ============================================================

export const cashFlowRecords = pgTable(
  "cash_flow_records",
  {
    id: serial("id").primaryKey(),
    recordDate: timestamp("record_date", { mode: "string" }).notNull(),
    /** operating/investing/financing */
    flowType: varchar("flow_type", { length: 50 }).notNull(),
    /** inflow/outflow */
    flowDirection: varchar("flow_direction", { length: 10 }).notNull(),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    description: text("description").notNull(),
    projectCode: varchar("project_code", { length: 50 }),
    counterpartyName: varchar("counterparty_name", { length: 200 }),
    bankAccountId: integer("bank_account_id"),
    /** payment/receipt/salary/expense/asset_purchase/loan/other */
    sourceDocType: varchar("source_doc_type", { length: 50 }),
    sourceDocId: integer("source_doc_id"),
    sourceDocCode: varchar("source_doc_code", { length: 50 }),
    fiscalYear: integer("fiscal_year"),
    fiscalPeriod: integer("fiscal_period"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("cfr_record_date_idx").on(table.recordDate),
    index("cfr_flow_type_idx").on(table.flowType),
    index("cfr_flow_direction_idx").on(table.flowDirection),
    index("cfr_project_code_idx").on(table.projectCode),
    index("cfr_fiscal_idx").on(table.fiscalYear, table.fiscalPeriod),
  ]
);

// ============================================================
// 7. financeAlertRules — 财务预警规则矩阵
// ============================================================

export const financeAlertRules = pgTable(
  "finance_alert_rules",
  {
    id: serial("id").primaryKey(),
    alertCode: varchar("alert_code", { length: 50 }).notNull().unique(),
    alertName: varchar("alert_name", { length: 200 }).notNull(),
    /** budget/labor/margin/payment/collection/invoice/acceptance/expense/bank/payroll/warranty/cashflow */
    alertCategory: varchar("alert_category", { length: 50 }).notNull(),
    description: text("description"),
    /** Yellow alert threshold (% or absolute) */
    yellowThreshold: decimal("yellow_threshold", { precision: 10, scale: 2 }),
    /** Red alert threshold */
    redThreshold: decimal("red_threshold", { precision: 10, scale: 2 }),
    /** percent/amount/days/count */
    thresholdUnit: varchar("threshold_unit", { length: 20 }).default("percent"),
    /** JSON array: ["project_manager","finance_specialist"] */
    recipientRoles: text("recipient_roles"),
    /** JSON array: ["bu_manager","ceo"] */
    escalationRoles: text("escalation_roles"),
    escalationAfterDays: integer("escalation_after_days").default(3),
    isActive: boolean("is_active").default(true),
    displayOnDashboard: boolean("display_on_dashboard").default(true),
    /** ceo/bu/project/finance */
    dashboardPosition: varchar("dashboard_position", { length: 50 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("far_alert_category_idx").on(table.alertCategory),
    index("far_is_active_idx").on(table.isActive),
  ]
);

// ============================================================
// 8. financeAlertInstances — 预警实例/触发记录
// ============================================================

export const financeAlertInstances = pgTable(
  "finance_alert_instances",
  {
    id: serial("id").primaryKey(),
    alertRuleId: integer("alert_rule_id").notNull(),
    alertCode: varchar("alert_code", { length: 50 }).notNull(),
    /** yellow/red */
    severity: varchar("severity", { length: 10 }).notNull(),
    /** The actual value that triggered */
    triggerValue: decimal("trigger_value", { precision: 14, scale: 2 }),
    /** The threshold it crossed */
    thresholdValue: decimal("threshold_value", { precision: 14, scale: 2 }),
    projectCode: varchar("project_code", { length: 50 }),
    /** supplier/customer/project/employee */
    entityType: varchar("entity_type", { length: 50 }),
    entityId: integer("entity_id"),
    entityName: varchar("entity_name", { length: 200 }),
    message: text("message").notNull(),
    /** open/acknowledged/resolved/dismissed */
    status: varchar("status", { length: 50 }).notNull().default("open"),
    acknowledgedBy: integer("acknowledged_by").references(() => users.id),
    acknowledgedAt: timestamp("acknowledged_at", { mode: "string" }),
    resolvedBy: integer("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { mode: "string" }),
    resolvedNotes: text("resolved_notes"),
    triggeredAt: timestamp("triggered_at", { mode: "string" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("fai_alert_code_idx").on(table.alertCode),
    index("fai_severity_idx").on(table.severity),
    index("fai_status_idx").on(table.status),
    index("fai_project_code_idx").on(table.projectCode),
    index("fai_triggered_at_idx").on(table.triggeredAt),
  ]
);

// ============================================================
// 9. expensePolicyRules — 报销政策规则引擎
// ============================================================

export const expensePolicyRules = pgTable(
  "expense_policy_rules",
  {
    id: serial("id").primaryKey(),
    ruleCode: varchar("rule_code", { length: 50 }).notNull().unique(),
    ruleName: varchar("rule_name", { length: 200 }).notNull(),
    /** accommodation/meals/transport/entertainment/communication/other */
    category: varchar("category", { length: 50 }).notNull(),
    /** tier1/tier2/tier3/all */
    cityTier: varchar("city_tier", { length: 10 }),
    /** Minimum level for this tier (null = all) */
    employeeLevel: integer("employee_level"),
    /** Max per occurrence */
    maxAmount: decimal("max_amount", { precision: 14, scale: 2 }).notNull(),
    /** Max per day */
    maxDailyAmount: decimal("max_daily_amount", { precision: 14, scale: 2 }),
    requiresReceipt: boolean("requires_receipt").default(true),
    requiresPreApproval: boolean("requires_pre_approval").default(false),
    preApprovalThreshold: decimal("pre_approval_threshold", { precision: 14, scale: 2 }),
    validFrom: timestamp("valid_from", { mode: "string" }).notNull(),
    validTo: timestamp("valid_to", { mode: "string" }),
    isActive: boolean("is_active").default(true),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("epr_category_idx").on(table.category),
    index("epr_city_tier_idx").on(table.cityTier),
    index("epr_is_active_idx").on(table.isActive),
  ]
);
