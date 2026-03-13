/**
 * Marketing Platform Schema — 营销数字平台
 *
 * 13 tables across 5 modules:
 *   M1: Annual Plan + KPI + Budget (3 tables)
 *   M2: Asset Quality + VI Rules (3 tables)
 *   M3: Exhibition Campaign (4 tables)
 *   M4: Historical Assets (1 table)
 *   M5: Broadcast Matrix (2 tables)
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
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ══════════════════════════════════════════════════════════════
// M1: Annual Marketing Plan + KPI + Budget
// ══════════════════════════════════════════════════════════════

/** Table 1: mkt_annual_plans — Marketing annual strategy linked to OKR */
export const mktAnnualPlans = pgTable(
  "mkt_annual_plans",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    okrObjectiveId: integer("okr_objective_id"),
    status: varchar("status", { length: 30 }).notNull().default("draft"),
    totalBudget: decimal("total_budget", { precision: 14, scale: 2 }),
    approvedBudget: decimal("approved_budget", { precision: 14, scale: 2 }),
    actualSpend: decimal("actual_spend", { precision: 14, scale: 2 }).default("0"),
    budgetStatus: varchar("budget_status", { length: 30 }).default("pending"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_plan_year_idx").on(table.year),
    index("mkt_plan_status_idx").on(table.status),
    index("mkt_plan_okr_idx").on(table.okrObjectiveId),
  ],
);

export type MktAnnualPlan = InferSelectModel<typeof mktAnnualPlans>;
export type NewMktAnnualPlan = InferInsertModel<typeof mktAnnualPlans>;

/** Table 2: mkt_kpi_targets — Quantitative KPIs with RAG status */
export const mktKpiTargets = pgTable(
  "mkt_kpi_targets",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    targetValue: decimal("target_value", { precision: 14, scale: 2 }).notNull(),
    currentValue: decimal("current_value", { precision: 14, scale: 2 }).default("0"),
    unit: varchar("unit", { length: 30 }).notNull(),
    ragStatus: varchar("rag_status", { length: 10 }).default("gray"),
    lastCheckinAt: timestamp("last_checkin_at", { mode: "string" }),
    checkinHistory: jsonb("checkin_history").default([]),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_kpi_plan_idx").on(table.planId),
    index("mkt_kpi_rag_idx").on(table.ragStatus),
  ],
);

export type MktKpiTarget = InferSelectModel<typeof mktKpiTargets>;
export type NewMktKpiTarget = InferInsertModel<typeof mktKpiTargets>;

/** Table 3: mkt_budget_line_items — Budget breakdown by category */
export const mktBudgetLineItems = pgTable(
  "mkt_budget_line_items",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id").notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    description: text("description"),
    plannedAmount: decimal("planned_amount", { precision: 14, scale: 2 }).notNull(),
    actualAmount: decimal("actual_amount", { precision: 14, scale: 2 }).default("0"),
    redLineLimit: decimal("red_line_limit", { precision: 14, scale: 2 }),
    status: varchar("status", { length: 30 }).default("active"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_budget_plan_idx").on(table.planId),
    index("mkt_budget_cat_idx").on(table.category),
  ],
);

export type MktBudgetLineItem = InferSelectModel<typeof mktBudgetLineItems>;
export type NewMktBudgetLineItem = InferInsertModel<typeof mktBudgetLineItems>;

// ══════════════════════════════════════════════════════════════
// M2: Asset Quality + VI Rules
// ══════════════════════════════════════════════════════════════

/** Table 4: mkt_asset_quality_specs — Quality spec dictionary per asset type */
export const mktAssetQualitySpecs = pgTable(
  "mkt_asset_quality_specs",
  {
    id: serial("id").primaryKey(),
    assetType: varchar("asset_type", { length: 50 }).notNull(),
    specName: varchar("spec_name", { length: 200 }).notNull(),
    requirements: jsonb("requirements").default({}),
    isActive: boolean("is_active").default(true),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_spec_type_idx").on(table.assetType),
  ],
);

export type MktAssetQualitySpec = InferSelectModel<typeof mktAssetQualitySpecs>;
export type NewMktAssetQualitySpec = InferInsertModel<typeof mktAssetQualitySpecs>;

/** Table 5: mkt_asset_reviews — QA gate: submit → approve/reject */
export const mktAssetReviews = pgTable(
  "mkt_asset_reviews",
  {
    id: serial("id").primaryKey(),
    assetName: varchar("asset_name", { length: 200 }).notNull(),
    assetType: varchar("asset_type", { length: 50 }).notNull(),
    assetUrl: text("asset_url"),
    specId: integer("spec_id"),
    submittedBy: integer("submitted_by").notNull(),
    reviewerBy: integer("reviewer_by"),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    viComplianceResult: jsonb("vi_compliance_result"),
    reviewNotes: text("review_notes"),
    submittedAt: timestamp("submitted_at", { mode: "string" }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_review_status_idx").on(table.status),
    index("mkt_review_type_idx").on(table.assetType),
    index("mkt_review_submitter_idx").on(table.submittedBy),
  ],
);

export type MktAssetReview = InferSelectModel<typeof mktAssetReviews>;
export type NewMktAssetReview = InferInsertModel<typeof mktAssetReviews>;

/** Table 6: mkt_vi_rules — Brand VI system rules by region */
export const mktViRules = pgTable(
  "mkt_vi_rules",
  {
    id: serial("id").primaryKey(),
    region: varchar("region", { length: 20 }).notNull().default("global"),
    category: varchar("category", { length: 50 }).notNull(),
    ruleName: varchar("rule_name", { length: 200 }).notNull(),
    ruleContent: jsonb("rule_content").default({}),
    isActive: boolean("is_active").default(true),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_vi_region_idx").on(table.region),
    index("mkt_vi_category_idx").on(table.category),
  ],
);

export type MktViRule = InferSelectModel<typeof mktViRules>;
export type NewMktViRule = InferInsertModel<typeof mktViRules>;

// ══════════════════════════════════════════════════════════════
// M3: Exhibition Campaign (Stage Gate E0→E3)
// ══════════════════════════════════════════════════════════════

/** Table 7: mkt_exhibitions — Exhibition-as-project with stage gate */
export const mktExhibitions = pgTable(
  "mkt_exhibitions",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    venue: varchar("venue", { length: 300 }),
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 50 }),
    startDate: timestamp("start_date", { mode: "string" }),
    endDate: timestamp("end_date", { mode: "string" }),
    stage: varchar("stage", { length: 10 }).notNull().default("E0"),
    budget: decimal("budget", { precision: 14, scale: 2 }),
    budgetApproved: boolean("budget_approved").default(false),
    demoEquipment: jsonb("demo_equipment").default([]),
    boothInfo: jsonb("booth_info").default({}),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_exh_stage_idx").on(table.stage),
    index("mkt_exh_start_idx").on(table.startDate),
    index("mkt_exh_country_idx").on(table.country),
  ],
);

export type MktExhibition = InferSelectModel<typeof mktExhibitions>;
export type NewMktExhibition = InferInsertModel<typeof mktExhibitions>;

/** Table 8: mkt_exhibition_tasks — Stage-driven tasks */
export const mktExhibitionTasks = pgTable(
  "mkt_exhibition_tasks",
  {
    id: serial("id").primaryKey(),
    exhibitionId: integer("exhibition_id").notNull(),
    stage: varchar("stage", { length: 10 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    assignedTo: integer("assigned_to"),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    dueDate: timestamp("due_date", { mode: "string" }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_task_exh_idx").on(table.exhibitionId),
    index("mkt_task_stage_idx").on(table.stage),
    index("mkt_task_status_idx").on(table.status),
  ],
);

export type MktExhibitionTask = InferSelectModel<typeof mktExhibitionTasks>;
export type NewMktExhibitionTask = InferInsertModel<typeof mktExhibitionTasks>;

/** Table 9: mkt_lead_captures — On-site business card OCR → CRM sync */
export const mktLeadCaptures = pgTable(
  "mkt_lead_captures",
  {
    id: serial("id").primaryKey(),
    exhibitionId: integer("exhibition_id").notNull(),
    companyName: varchar("company_name", { length: 200 }),
    contactName: varchar("contact_name", { length: 100 }),
    contactTitle: varchar("contact_title", { length: 100 }),
    email: varchar("email", { length: 200 }),
    phone: varchar("phone", { length: 50 }),
    notes: text("notes"),
    ocrData: jsonb("ocr_data"),
    syncStatus: varchar("sync_status", { length: 30 }).default("pending"),
    crmLeadId: integer("crm_lead_id"),
    capturedBy: integer("captured_by"),
    capturedAt: timestamp("captured_at", { mode: "string" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_lead_exh_idx").on(table.exhibitionId),
    index("mkt_lead_sync_idx").on(table.syncStatus),
  ],
);

export type MktLeadCapture = InferSelectModel<typeof mktLeadCaptures>;
export type NewMktLeadCapture = InferInsertModel<typeof mktLeadCaptures>;

/** Table 10: mkt_exhibition_roi — Post-event ROI analysis */
export const mktExhibitionRoi = pgTable(
  "mkt_exhibition_roi",
  {
    id: serial("id").primaryKey(),
    exhibitionId: integer("exhibition_id").notNull(),
    totalSpend: decimal("total_spend", { precision: 14, scale: 2 }),
    leadsGenerated: integer("leads_generated").default(0),
    m0ProjectsGenerated: integer("m0_projects_generated").default(0),
    estimatedRevenue: decimal("estimated_revenue", { precision: 14, scale: 2 }),
    roiPercentage: decimal("roi_percentage", { precision: 8, scale: 2 }),
    aiNarrative: text("ai_narrative"),
    metrics: jsonb("metrics").default({}),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_roi_exh_idx").on(table.exhibitionId),
  ],
);

export type MktExhibitionRoi = InferSelectModel<typeof mktExhibitionRoi>;
export type NewMktExhibitionRoi = InferInsertModel<typeof mktExhibitionRoi>;

// ══════════════════════════════════════════════════════════════
// M4: Historical Assets
// ══════════════════════════════════════════════════════════════

/** Table 11: mkt_historical_assets — Vectorized archive */
export const mktHistoricalAssets = pgTable(
  "mkt_historical_assets",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    assetType: varchar("asset_type", { length: 50 }).notNull(),
    year: integer("year"),
    region: varchar("region", { length: 50 }),
    industry: varchar("industry", { length: 100 }),
    fileUrl: text("file_url"),
    thumbnailUrl: text("thumbnail_url"),
    tags: jsonb("tags").default([]),
    vectorized: boolean("vectorized").default(false),
    knowledgeBaseId: integer("knowledge_base_id"),
    exhibitionId: integer("exhibition_id"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_hist_type_idx").on(table.assetType),
    index("mkt_hist_year_idx").on(table.year),
    index("mkt_hist_region_idx").on(table.region),
    index("mkt_hist_vectorized_idx").on(table.vectorized),
  ],
);

export type MktHistoricalAsset = InferSelectModel<typeof mktHistoricalAssets>;
export type NewMktHistoricalAsset = InferInsertModel<typeof mktHistoricalAssets>;

// ══════════════════════════════════════════════════════════════
// M5: Broadcast Matrix
// ══════════════════════════════════════════════════════════════

/** Table 12: mkt_broadcast_channels — Physical screen registry */
export const mktBroadcastChannels = pgTable(
  "mkt_broadcast_channels",
  {
    id: serial("id").primaryKey(),
    channelCode: varchar("channel_code", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    location: varchar("location", { length: 300 }),
    screenType: varchar("screen_type", { length: 50 }),
    resolution: varchar("resolution", { length: 30 }),
    isOnline: boolean("is_online").default(false),
    lastHeartbeat: timestamp("last_heartbeat", { mode: "string" }),
    config: jsonb("config").default({}),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_channel_code_idx").on(table.channelCode),
    index("mkt_channel_online_idx").on(table.isOnline),
  ],
);

export type MktBroadcastChannel = InferSelectModel<typeof mktBroadcastChannels>;
export type NewMktBroadcastChannel = InferInsertModel<typeof mktBroadcastChannels>;

/** Table 13: mkt_broadcast_schedules — Time-slot playlists per channel */
export const mktBroadcastSchedules = pgTable(
  "mkt_broadcast_schedules",
  {
    id: serial("id").primaryKey(),
    channelId: integer("channel_id").notNull(),
    contentTitle: varchar("content_title", { length: 200 }).notNull(),
    contentType: varchar("content_type", { length: 50 }).notNull(),
    contentUrl: text("content_url"),
    contentRefId: integer("content_ref_id"),
    startTime: timestamp("start_time", { mode: "string" }).notNull(),
    endTime: timestamp("end_time", { mode: "string" }).notNull(),
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("mkt_sched_channel_idx").on(table.channelId),
    index("mkt_sched_time_idx").on(table.startTime, table.endTime),
    index("mkt_sched_active_idx").on(table.isActive),
  ],
);

export type MktBroadcastSchedule = InferSelectModel<typeof mktBroadcastSchedules>;
export type NewMktBroadcastSchedule = InferInsertModel<typeof mktBroadcastSchedules>;
