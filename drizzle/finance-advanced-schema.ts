/**
 * GRT 5.0 财务高级功能Schema
 *
 * P2-1: 银行对账 (银行流水导入+自动匹配)
 * P2-2: 项目挣值管理 (EVA/EVM)
 * P2-3: 多币种 (汇率表+外币重估)
 * P2-4: 财务报表模板 (资产负债表/利润表自动生成)
 * P2-5: 项目成本对标 (历史项目→新项目报价参考)
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
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ─── P2-1: 银行对账 ─────────────────────────────────────────────

/** 1. 银行流水导入 */
export const bankStatements = pgTable(
  "bank_statements",
  {
    id: serial("id").primaryKey(),
    /** 关联银行账户 */
    bankAccountId: integer("bank_account_id").notNull(),
    bankAccountNumber: varchar("bank_account_number", { length: 50 }).notNull(),
    /** 对账单日期 */
    statementDate: timestamp("statement_date", { mode: "string" }).notNull(),
    /** 交易日期 */
    transactionDate: timestamp("transaction_date", { mode: "string" }).notNull(),
    /** 银行交易流水号 */
    transactionRef: varchar("transaction_ref", { length: 100 }),
    description: text("description"),
    debitAmount: decimal("debit_amount", { precision: 14, scale: 2 }).default("0"),
    creditAmount: decimal("credit_amount", { precision: 14, scale: 2 }).default("0"),
    /** 交易后余额 */
    balance: decimal("balance", { precision: 14, scale: 2 }),
    counterpartyName: varchar("counterparty_name", { length: 200 }),
    counterpartyAccount: varchar("counterparty_account", { length: 50 }),
    /** 导入批次 */
    importBatchId: varchar("import_batch_id", { length: 50 }),
    /** unmatched/auto_matched/manual_matched/exception */
    matchStatus: varchar("match_status", { length: 50 }).default("unmatched"),
    /** payment/receipt/salary/expense/transfer */
    matchedDocType: varchar("matched_doc_type", { length: 50 }),
    matchedDocId: integer("matched_doc_id"),
    matchedDocCode: varchar("matched_doc_code", { length: 50 }),
    matchedAt: timestamp("matched_at", { mode: "string" }),
    matchedBy: integer("matched_by").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("bs_bank_account_idx").on(table.bankAccountId),
    index("bs_statement_date_idx").on(table.statementDate),
    index("bs_match_status_idx").on(table.matchStatus),
    index("bs_transaction_ref_idx").on(table.transactionRef),
    index("bs_import_batch_idx").on(table.importBatchId),
  ]
);

/** 2. 银行对账记录 */
export const bankReconciliations = pgTable(
  "bank_reconciliations",
  {
    id: serial("id").primaryKey(),
    bankAccountId: integer("bank_account_id").notNull(),
    /** 对账截止日 */
    reconciliationDate: timestamp("reconciliation_date", { mode: "string" }).notNull(),
    /** 银行对账单余额 */
    bankBalance: decimal("bank_balance", { precision: 14, scale: 2 }).notNull(),
    /** 账面余额 */
    bookBalance: decimal("book_balance", { precision: 14, scale: 2 }).notNull(),
    /** 调节后银行余额 */
    adjustedBankBalance: decimal("adjusted_bank_balance", { precision: 14, scale: 2 }),
    /** 调节后账面余额 */
    adjustedBookBalance: decimal("adjusted_book_balance", { precision: 14, scale: 2 }),
    /** 未达银行 (已记账未到银行) */
    outstandingChecks: decimal("outstanding_checks", { precision: 14, scale: 2 }).default("0"),
    /** 未达账面 (银行已收未记账) */
    depositsInTransit: decimal("deposits_in_transit", { precision: 14, scale: 2 }).default("0"),
    otherAdjustments: decimal("other_adjustments", { precision: 14, scale: 2 }).default("0"),
    isReconciled: boolean("is_reconciled").default(false),
    /** 差异 (应=0) */
    difference: decimal("difference", { precision: 14, scale: 2 }).default("0"),
    reconciledBy: integer("reconciled_by").references(() => users.id),
    reconciledAt: timestamp("reconciled_at", { mode: "string" }),
    /** draft/in_progress/reconciled/approved */
    status: varchar("status", { length: 50 }).default("draft"),
    approvedBy: integer("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("br_bank_account_idx").on(table.bankAccountId),
    index("br_recon_date_idx").on(table.reconciliationDate),
    index("br_status_idx").on(table.status),
  ]
);

// ─── P2-2: 项目挣值管理 (EVM) ───────────────────────────────────

/** 3. 项目挣值管理 EVM */
export const projectEarnedValue = pgTable(
  "project_earned_value",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    projectCode: varchar("project_code", { length: 50 }).notNull(),
    snapshotDate: timestamp("snapshot_date", { mode: "string" }).notNull(),
    /** YYYY-MM */
    fiscalPeriod: varchar("fiscal_period", { length: 10 }),
    /** Budget at Completion (完工预算) */
    bac: decimal("bac", { precision: 14, scale: 2 }).notNull(),
    /** Planned Value (计划值) */
    pv: decimal("pv", { precision: 14, scale: 2 }).notNull(),
    /** Earned Value (挣值) */
    ev: decimal("ev", { precision: 14, scale: 2 }).notNull(),
    /** Actual Cost (实际成本) */
    ac: decimal("ac", { precision: 14, scale: 2 }).notNull(),
    /** Schedule Variance = EV - PV */
    sv: decimal("sv", { precision: 14, scale: 2 }),
    /** Cost Variance = EV - AC */
    cv: decimal("cv", { precision: 14, scale: 2 }),
    /** Schedule Performance Index = EV/PV */
    spi: decimal("spi", { precision: 6, scale: 4 }),
    /** Cost Performance Index = EV/AC */
    cpi: decimal("cpi", { precision: 6, scale: 4 }),
    /** Estimate at Completion = BAC/CPI */
    eac: decimal("eac", { precision: 14, scale: 2 }),
    /** Estimate to Complete = EAC - AC */
    etc: decimal("etc", { precision: 14, scale: 2 }),
    /** Variance at Completion = BAC - EAC */
    vac: decimal("vac", { precision: 14, scale: 2 }),
    /** To-Complete Performance Index = (BAC-EV)/(BAC-AC) */
    tcpi: decimal("tcpi", { precision: 6, scale: 4 }),
    /** EV/BAC * 100 */
    percentComplete: decimal("percent_complete", { precision: 5, scale: 2 }),
    /** on_track/at_risk/behind_schedule/over_budget/critical */
    status: varchar("status", { length: 50 }).default("on_track"),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("pev_project_snapshot_uq").on(table.projectCode, table.snapshotDate),
    index("pev_project_code_idx").on(table.projectCode),
    index("pev_snapshot_date_idx").on(table.snapshotDate),
    index("pev_status_idx").on(table.status),
  ]
);

// ─── P2-3: 多币种 ───────────────────────────────────────────────

/** 4. 汇率表 */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: serial("id").primaryKey(),
    /** 源币种 (e.g. CNY) */
    fromCurrency: varchar("from_currency", { length: 3 }).notNull(),
    /** 目标币种 (e.g. USD/EUR/JPY) */
    toCurrency: varchar("to_currency", { length: 3 }).notNull(),
    rateDate: timestamp("rate_date", { mode: "string" }).notNull(),
    /** 1 fromCurrency = rate toCurrency */
    rate: decimal("rate", { precision: 12, scale: 6 }).notNull(),
    /** spot/average/closing */
    rateType: varchar("rate_type", { length: 50 }).default("spot"),
    /** manual/pboc/reuters */
    source: varchar("source", { length: 100 }).default("manual"),
    isActive: boolean("is_active").default(true),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("er_currency_date_type_uq").on(
      table.fromCurrency,
      table.toCurrency,
      table.rateDate,
      table.rateType
    ),
    index("er_rate_date_idx").on(table.rateDate),
    index("er_currency_pair_idx").on(table.fromCurrency, table.toCurrency),
  ]
);

/** 5. 外币重估 */
export const foreignCurrencyRevaluations = pgTable(
  "foreign_currency_revaluations",
  {
    id: serial("id").primaryKey(),
    revaluationDate: timestamp("revaluation_date", { mode: "string" }).notNull(),
    fiscalYear: integer("fiscal_year"),
    fiscalPeriod: integer("fiscal_period"),
    /** GL account ID */
    accountId: integer("account_id").notNull(),
    accountCode: varchar("account_code", { length: 20 }),
    originalCurrency: varchar("original_currency", { length: 3 }).notNull(),
    originalAmount: decimal("original_amount", { precision: 14, scale: 2 }).notNull(),
    /** 交易日汇率 */
    originalRate: decimal("original_rate", { precision: 12, scale: 6 }).notNull(),
    /** 重估日汇率 */
    closingRate: decimal("closing_rate", { precision: 12, scale: 6 }).notNull(),
    /** 功能货币(CNY)金额 */
    revaluatedAmount: decimal("revaluated_amount", { precision: 14, scale: 2 }).notNull(),
    /** 重估损益: gain(+)/loss(-) */
    gainOrLoss: decimal("gain_or_loss", { precision: 14, scale: 2 }).notNull(),
    /** 关联总账凭证 */
    glEntryId: integer("gl_entry_id"),
    /** calculated/posted/reversed */
    status: varchar("status", { length: 50 }).default("calculated"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("fcr_reval_date_idx").on(table.revaluationDate),
    index("fcr_account_code_idx").on(table.accountCode),
    index("fcr_status_idx").on(table.status),
  ]
);

// ─── P2-4: 财务报表模板 ─────────────────────────────────────────

/** 6. 财务报表模板 */
export const financialReportTemplates = pgTable(
  "financial_report_templates",
  {
    id: serial("id").primaryKey(),
    /** BS/PL/CF */
    reportCode: varchar("report_code", { length: 50 }).notNull().unique(),
    /** 资产负债表/利润表/现金流量表 */
    reportName: varchar("report_name", { length: 200 }).notNull(),
    /** balance_sheet/income_statement/cash_flow */
    reportType: varchar("report_type", { length: 50 }).notNull(),
    /** JSON: [{lineNo, name, formula, accountCodes[], indent, isBold, isTotal}] */
    lineItems: text("line_items").notNull(),
    isActive: boolean("is_active").default(true),
    version: integer("version").default(1),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  }
);

/** 7. 报表快照 */
export const financialReportSnapshots = pgTable(
  "financial_report_snapshots",
  {
    id: serial("id").primaryKey(),
    templateId: integer("template_id").notNull(),
    reportCode: varchar("report_code", { length: 50 }).notNull(),
    fiscalYear: integer("fiscal_year").notNull(),
    fiscalPeriod: integer("fiscal_period").notNull(),
    /** JSON: [{lineNo, name, currentPeriod, priorPeriod, ytd, priorYtd}] */
    reportData: text("report_data").notNull(),
    generatedBy: integer("generated_by").references(() => users.id),
    generatedAt: timestamp("generated_at", { mode: "string" }).defaultNow().notNull(),
    /** draft/final/published */
    status: varchar("status", { length: 50 }).default("draft"),
    approvedBy: integer("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { mode: "string" }),
    notes: text("notes"),
  },
  (table) => [
    unique("frs_report_period_uq").on(table.reportCode, table.fiscalYear, table.fiscalPeriod),
    index("frs_report_code_idx").on(table.reportCode),
    index("frs_fiscal_idx").on(table.fiscalYear, table.fiscalPeriod),
  ]
);

// ─── P2-5: 项目成本对标 ─────────────────────────────────────────

/** 8. 项目成本对标/报价参考 */
export const projectCostBenchmarks = pgTable(
  "project_cost_benchmarks",
  {
    id: serial("id").primaryKey(),
    benchmarkCode: varchar("benchmark_code", { length: 50 }).notNull().unique(),
    sourceProjectId: integer("source_project_id"),
    sourceProjectCode: varchar("source_project_code", { length: 50 }),
    sourceProjectName: varchar("source_project_name", { length: 200 }),
    /** 超声波清洗机/喷淋清洗机/真空清洗机/机器人清洗系统 */
    equipmentType: varchar("equipment_type", { length: 100 }).notNull(),
    /** automotive/semiconductor/industrial/medical */
    customerIndustry: varchar("customer_industry", { length: 100 }),
    /** small/medium/large/extra_large */
    projectScale: varchar("project_scale", { length: 50 }),
    totalRevenue: decimal("total_revenue", { precision: 14, scale: 2 }),
    totalCost: decimal("total_cost", { precision: 14, scale: 2 }),
    /** 毛利率 % */
    grossMargin: decimal("gross_margin", { precision: 5, scale: 2 }),
    /** 物料成本占比 % */
    materialCostRatio: decimal("material_cost_ratio", { precision: 5, scale: 2 }),
    /** 工时成本占比 % */
    laborCostRatio: decimal("labor_cost_ratio", { precision: 5, scale: 2 }),
    procurementCostRatio: decimal("procurement_cost_ratio", { precision: 5, scale: 2 }),
    travelCostRatio: decimal("travel_cost_ratio", { precision: 5, scale: 2 }),
    overheadCostRatio: decimal("overhead_cost_ratio", { precision: 5, scale: 2 }),
    totalLaborHours: decimal("total_labor_hours", { precision: 10, scale: 2 }),
    mechanicalHours: decimal("mechanical_hours", { precision: 10, scale: 2 }),
    electricalHours: decimal("electrical_hours", { precision: 10, scale: 2 }),
    projectDurationDays: integer("project_duration_days"),
    /** JSON: [{stage, hours, cost, ratio}] */
    t01to15Breakdown: text("t01_to_15_breakdown"),
    keyLessonsLearned: text("key_lessons_learned"),
    /** 可作为报价模板 */
    isTemplate: boolean("is_template").default(false),
    /** JSON array for searching */
    tags: text("tags"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("pcb_equipment_type_idx").on(table.equipmentType),
    index("pcb_customer_industry_idx").on(table.customerIndustry),
    index("pcb_project_scale_idx").on(table.projectScale),
    index("pcb_is_template_idx").on(table.isTemplate),
  ]
);
