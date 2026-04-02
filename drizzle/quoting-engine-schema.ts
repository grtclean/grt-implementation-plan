/**
 * 非标工业清洗机报价引擎 Schema
 *
 * 4 Tables:
 *   1. quote_rate_configs    — 年度工序/工程费率配置
 *   2. project_quotes        — 报价单主表（含版本链）
 *   3. quote_line_items      — 报价明细行（6大类成本）
 *   4. project_cost_actuals  — 实际成本跟踪（预算 vs 实际）
 *
 * Cost Categories:
 *   A1 制造工时  mfg_labor      (7 processes × hourly rate)
 *   A2 材料采购  material       (BOM procurement)
 *   A3 工程工时  engineering    (sales/mech_rnd/elec_rnd/commissioning/pm/service)
 *   A4 销售费用  sales_expense  (travel/entertainment/other)
 *   A5 质保费用  warranty       (% of contract value)
 *   A6 其他费用  other          (packaging/transport/insurance/tax/contingency)
 */

import {
  pgTable, serial, integer, varchar, text, numeric, boolean, timestamp,
  index, unique,
} from "drizzle-orm/pg-core";

// ═══════════════════════════════════════════════
// 1. 年度费率配置
// ═══════════════════════════════════════════════

export const quoteRateConfigs = pgTable(
  "quote_rate_configs",
  {
    id: serial("id").primaryKey(),
    fiscalYear: integer("fiscal_year").notNull(),
    category: varchar("category", { length: 30 }).notNull(),
    rateCode: varchar("rate_code", { length: 50 }).notNull(),
    rateName: varchar("rate_name", { length: 100 }).notNull(),
    rateNameEn: varchar("rate_name_en", { length: 100 }),
    hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
    fixedAmount: numeric("fixed_amount", { precision: 14, scale: 2 }),
    rateUnit: varchar("rate_unit", { length: 20 }).notNull(),
    allocationBase: varchar("allocation_base", { length: 50 }),
    buCode: varchar("bu_code", { length: 50 }),
    isActive: boolean("is_active").default(true),
    approvedBy: integer("approved_by"),
    approvedAt: timestamp("approved_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_rate_year_code_bu").on(table.fiscalYear, table.rateCode, table.buCode),
    index("idx_rate_year_cat").on(table.fiscalYear, table.category),
  ]
);

// ═══════════════════════════════════════════════
// 2. 报价单主表
// ═══════════════════════════════════════════════

export const projectQuotes = pgTable(
  "project_quotes",
  {
    id: serial("id").primaryKey(),
    quoteCode: varchar("quote_code", { length: 50 }).notNull().unique(),
    projectId: integer("project_id"),
    projectCode: varchar("project_code", { length: 50 }),
    bidProjectId: integer("bid_project_id"),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    customerId: integer("customer_id"),
    equipmentModel: varchar("equipment_model", { length: 100 }),
    equipmentDescription: text("equipment_description"),
    buCode: varchar("bu_code", { length: 50 }).notNull(),
    fiscalYear: integer("fiscal_year").notNull(),

    version: integer("version").notNull().default(1),
    parentQuoteId: integer("parent_quote_id"),
    quoteType: varchar("quote_type", { length: 30 }).notNull().default("initial"),

    totalMfgLaborCost: numeric("total_mfg_labor_cost", { precision: 14, scale: 2 }).default("0"),
    totalMaterialCost: numeric("total_material_cost", { precision: 14, scale: 2 }).default("0"),
    totalEngineeringCost: numeric("total_engineering_cost", { precision: 14, scale: 2 }).default("0"),
    totalSalesExpense: numeric("total_sales_expense", { precision: 14, scale: 2 }).default("0"),
    totalWarrantyProvision: numeric("total_warranty_provision", { precision: 14, scale: 2 }).default("0"),
    totalOtherCost: numeric("total_other_cost", { precision: 14, scale: 2 }).default("0"),
    totalCost: numeric("total_cost", { precision: 14, scale: 2 }).default("0"),
    targetMarginPct: numeric("target_margin_pct", { precision: 5, scale: 2 }),
    targetMarginAmount: numeric("target_margin_amount", { precision: 14, scale: 2 }).default("0"),
    quotedPrice: numeric("quoted_price", { precision: 14, scale: 2 }).default("0"),
    contractValue: numeric("contract_value", { precision: 14, scale: 2 }),

    status: varchar("status", { length: 30 }).notNull().default("draft"),
    preparedBy: integer("prepared_by"),
    reviewedBy: integer("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    approvedBy: integer("approved_by"),
    approvedAt: timestamp("approved_at"),
    orderReceivedDate: timestamp("order_received_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_pq_project").on(table.projectId),
    index("idx_pq_bu").on(table.buCode),
    index("idx_pq_status").on(table.status),
  ]
);

// ═══════════════════════════════════════════════
// 3. 报价明细行
// ═══════════════════════════════════════════════

export const quoteLineItems = pgTable(
  "quote_line_items",
  {
    id: serial("id").primaryKey(),
    quoteId: integer("quote_id").notNull(),
    category: varchar("category", { length: 30 }).notNull(),
    subCategory: varchar("sub_category", { length: 50 }).notNull(),
    itemName: varchar("item_name", { length: 200 }).notNull(),
    itemNameEn: varchar("item_name_en", { length: 200 }),

    estimatedHours: numeric("estimated_hours", { precision: 10, scale: 2 }),
    hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
    rateConfigId: integer("rate_config_id"),
    quantity: numeric("quantity", { precision: 10, scale: 2 }),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    estimatedCost: numeric("estimated_cost", { precision: 14, scale: 2 }).notNull().default("0"),

    bomItemId: integer("bom_item_id"),
    supplierId: integer("supplier_id"),
    poId: integer("po_id"),
    sourceType: varchar("source_type", { length: 30 }),
    sourceRefId: varchar("source_ref_id", { length: 50 }),
    notes: text("notes"),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_qli_quote_cat").on(table.quoteId, table.category),
  ]
);

// ═══════════════════════════════════════════════
// 4. 实际成本跟踪
// ═══════════════════════════════════════════════

export const projectCostActuals = pgTable(
  "project_cost_actuals",
  {
    id: serial("id").primaryKey(),
    quoteId: integer("quote_id").notNull(),
    quoteLineItemId: integer("quote_line_item_id"),
    projectId: integer("project_id").notNull(),

    category: varchar("category", { length: 30 }).notNull(),
    subCategory: varchar("sub_category", { length: 50 }).notNull(),

    budgetHours: numeric("budget_hours", { precision: 10, scale: 2 }).default("0"),
    budgetCost: numeric("budget_cost", { precision: 14, scale: 2 }).default("0"),
    actualHours: numeric("actual_hours", { precision: 10, scale: 2 }).default("0"),
    actualCost: numeric("actual_cost", { precision: 14, scale: 2 }).default("0"),
    varianceHours: numeric("variance_hours", { precision: 10, scale: 2 }).default("0"),
    varianceCost: numeric("variance_cost", { precision: 14, scale: 2 }).default("0"),
    variancePct: numeric("variance_pct", { precision: 8, scale: 2 }).default("0"),
    completionPct: numeric("completion_pct", { precision: 5, scale: 2 }).default("0"),
    forecastFinalCost: numeric("forecast_final_cost", { precision: 14, scale: 2 }).default("0"),

    status: varchar("status", { length: 20 }).default("on_track"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_pca_quote_cat_sub").on(table.quoteId, table.category, table.subCategory),
    index("idx_pca_project").on(table.projectId),
  ]
);
