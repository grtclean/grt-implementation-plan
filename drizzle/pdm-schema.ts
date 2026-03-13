/**
 * PDM — Product Data Management Schema
 * 7 tables for full lifecycle product data management:
 * pdm_products, pdm_baselines, pdm_eco_workflow, pdm_requirements,
 * pdm_readiness_checks, pdm_as_built_deviations, pdm_field_insights
 */
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { projects, users } from "./schema";

// ────────── Enums ──────────

export const pdmProductFamilyEnum = pgEnum("pdm_product_family", [
  "USC", // Ultrasonic Cleaning
  "SPR", // Spray Cleaning
  "IMM", // Immersion Cleaning
]);

export const pdmLifecycleStatusEnum = pgEnum("pdm_lifecycle_status", [
  "concept",
  "design",
  "released",
  "production",
  "service",
  "eol",
]);

export const pdmBaselineStatusEnum = pgEnum("pdm_baseline_status", [
  "draft",
  "approved",
  "superseded",
]);

export const pdmEcoStepTypeEnum = pgEnum("pdm_eco_step_type", [
  "ecr_submit",
  "impact_analysis",
  "review",
  "approval",
  "execute",
  "verify",
  "close",
]);

export const pdmEcoStepStatusEnum = pgEnum("pdm_eco_step_status", [
  "pending",
  "in_progress",
  "completed",
  "skipped",
  "rejected",
]);

export const pdmRequirementCategoryEnum = pgEnum("pdm_requirement_category", [
  "functional",
  "performance",
  "safety",
  "cleanliness",
  "regulatory",
]);

export const pdmVerificationStatusEnum = pgEnum("pdm_verification_status", [
  "not_started",
  "in_progress",
  "passed",
  "failed",
  "waived",
]);

export const pdmReadinessCheckTypeEnum = pgEnum("pdm_readiness_check_type", [
  "bom_approved",
  "plm_released",
  "plc_promoted",
  "eplan_exported",
  "standards_validated",
  "fmea_completed",
  "conflict_free",
]);

export const pdmReadinessStatusEnum = pgEnum("pdm_readiness_status", [
  "not_checked",
  "passed",
  "failed",
  "waived",
]);

export const pdmDeviationTypeEnum = pgEnum("pdm_deviation_type", [
  "material_substitution",
  "process_change",
  "quantity_change",
]);

export const pdmDeviationSeverityEnum = pgEnum("pdm_deviation_severity", [
  "minor",
  "major",
  "critical",
]);

export const pdmInsightTypeEnum = pgEnum("pdm_insight_type", [
  "recurring_failure",
  "design_weakness",
  "improvement_opportunity",
]);

export const pdmInsightStatusEnum = pgEnum("pdm_insight_status", [
  "open",
  "investigating",
  "eco_created",
  "resolved",
  "dismissed",
]);

// ────────── 1. pdm_products — Product Master (the spine) ──────────

export const pdmProducts = pgTable(
  "pdm_products",
  {
    id: serial("id").primaryKey(),
    productCode: varchar("product_code", { length: 50 }).notNull().unique(),
    productName: varchar("product_name", { length: 200 }).notNull(),
    productFamily: pdmProductFamilyEnum("product_family").notNull(),
    productCategory: varchar("product_category", { length: 100 }),
    description: text("description"),
    stationCount: integer("station_count").default(0),
    lifecycleStatus: pdmLifecycleStatusEnum("lifecycle_status")
      .default("concept")
      .notNull(),
    defaultProjectId: integer("default_project_id").references(
      () => projects.id
    ),
    latestBaselineId: integer("latest_baseline_id"), // self-ref set after baseline creation
    buCode: varchar("bu_code", { length: 50 }),
    maturityLevel: integer("maturity_level").default(0), // 0-100
    totalProjectsBuilt: integer("total_projects_built").default(0),
    standards: jsonb("standards").$type<string[]>(), // ["ISO 9001","IATF 16949","CE"]
    customerSegments: jsonb("customer_segments").$type<string[]>(), // ["automotive","semiconductor"]
    createdBy: integer("created_by").references(() => users.id),
    updatedBy: integer("updated_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_pdm_products_family").on(t.productFamily),
    index("idx_pdm_products_lifecycle").on(t.lifecycleStatus),
    index("idx_pdm_products_bu").on(t.buCode),
  ]
);

// ────────── 2. pdm_baselines — Configuration Snapshots ──────────

export const pdmBaselines = pgTable(
  "pdm_baselines",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => pdmProducts.id),
    projectId: integer("project_id").references(() => projects.id),
    gateStage: varchar("gate_stage", { length: 20 }).notNull(), // M3, M5, M8, M9, M12
    baselineName: varchar("baseline_name", { length: 200 }).notNull(),
    bomMasterId: integer("bom_master_id"), // FK to bom_masters
    bomVersion: varchar("bom_version", { length: 20 }),
    plmDocumentIds: jsonb("plm_document_ids").$type<number[]>(),
    plcProjectId: integer("plc_project_id"),
    plcVersionTag: varchar("plc_version_tag", { length: 50 }),
    stationSnapshot: jsonb("station_snapshot").$type<
      Array<{
        stationCode: string;
        stationName: string;
        stationType: string;
        cycleTime?: number;
      }>
    >(),
    status: pdmBaselineStatusEnum("status").default("draft").notNull(),
    previousBaselineId: integer("previous_baseline_id"), // self-ref for version chain
    approvedBy: integer("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { mode: "string" }),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_pdm_baselines_product").on(t.productId),
    index("idx_pdm_baselines_project").on(t.projectId),
    index("idx_pdm_baselines_gate").on(t.gateStage),
    index("idx_pdm_baselines_status").on(t.status),
  ]
);

// ────────── 3. pdm_eco_workflow — ECO Workflow Steps ──────────

export const pdmEcoWorkflow = pgTable(
  "pdm_eco_workflow",
  {
    id: serial("id").primaryKey(),
    ecoId: integer("eco_id").notNull(), // FK to engineering_change_orders / changeEvents
    stepType: pdmEcoStepTypeEnum("step_type").notNull(),
    stepOrder: integer("step_order").notNull(), // 1-7
    status: pdmEcoStepStatusEnum("status").default("pending").notNull(),
    assigneeId: integer("assignee_id").references(() => users.id),
    assigneeName: varchar("assignee_name", { length: 128 }),
    impactedBomIds: jsonb("impacted_bom_ids").$type<number[]>(),
    impactedDocIds: jsonb("impacted_doc_ids").$type<number[]>(),
    impactedStationIds: jsonb("impacted_station_ids").$type<number[]>(),
    costImpact: jsonb("cost_impact").$type<{
      materialDelta?: number;
      laborDelta?: number;
      toolingDelta?: number;
      totalDelta?: number;
    }>(),
    productionImpact: jsonb("production_impact").$type<{
      delayDays?: number;
      reworkNeeded?: boolean;
      scrapEstimate?: number;
    }>(),
    fieldRetrofitNeeded: boolean("field_retrofit_needed").default(false),
    decision: varchar("decision", { length: 50 }), // approved/rejected/deferred
    decisionNotes: text("decision_notes"),
    completedAt: timestamp("completed_at", { mode: "string" }),
    completedBy: integer("completed_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_pdm_eco_workflow_eco").on(t.ecoId),
    index("idx_pdm_eco_workflow_step").on(t.stepType),
    index("idx_pdm_eco_workflow_status").on(t.status),
    index("idx_pdm_eco_workflow_assignee").on(t.assigneeId),
  ]
);

// ────────── 4. pdm_requirements — Requirements Traceability ──────────

export const pdmRequirements = pgTable(
  "pdm_requirements",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    productId: integer("product_id").references(() => pdmProducts.id),
    requirementCode: varchar("requirement_code", { length: 50 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    category: pdmRequirementCategoryEnum("category").notNull(),
    sourceType: varchar("source_type", { length: 50 }), // customer_spec, standard, internal
    sourceReference: varchar("source_reference", { length: 200 }), // doc number or standard
    priority: varchar("priority", { length: 20 }).default("medium"), // low/medium/high/critical
    designStationIds: jsonb("design_station_ids").$type<number[]>(),
    bomItemIds: jsonb("bom_item_ids").$type<number[]>(),
    verificationMethod: varchar("verification_method", { length: 50 }), // test/analysis/inspection/demo
    verificationItemIds: jsonb("verification_item_ids").$type<number[]>(), // FAT/SAT test item IDs
    verificationStatus: pdmVerificationStatusEnum("verification_status")
      .default("not_started")
      .notNull(),
    verificationNotes: text("verification_notes"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_pdm_requirements_project").on(t.projectId),
    index("idx_pdm_requirements_product").on(t.productId),
    index("idx_pdm_requirements_category").on(t.category),
    index("idx_pdm_requirements_verification").on(t.verificationStatus),
  ]
);

// ────────── 5. pdm_readiness_checks — Manufacturing Readiness ──────────

export const pdmReadinessChecks = pgTable(
  "pdm_readiness_checks",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    productId: integer("product_id").references(() => pdmProducts.id),
    checkType: pdmReadinessCheckTypeEnum("check_type").notNull(),
    status: pdmReadinessStatusEnum("status").default("not_checked").notNull(),
    autoValidated: boolean("auto_validated").default(false),
    validationDetails: text("validation_details"),
    waiverApprovedBy: integer("waiver_approved_by").references(() => users.id),
    waiverReason: text("waiver_reason"),
    waivedAt: timestamp("waived_at", { mode: "string" }),
    checkedAt: timestamp("checked_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_pdm_readiness_project").on(t.projectId),
    index("idx_pdm_readiness_type").on(t.checkType),
    index("idx_pdm_readiness_status").on(t.status),
  ]
);

// ────────── 6. pdm_as_built_deviations — As-Built vs As-Designed ──────────

export const pdmAsBuiltDeviations = pgTable(
  "pdm_as_built_deviations",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    productId: integer("product_id").references(() => pdmProducts.id),
    baselineId: integer("baseline_id").references(() => pdmBaselines.id),
    stationCode: varchar("station_code", { length: 20 }),
    deviationType: pdmDeviationTypeEnum("deviation_type").notNull(),
    severity: pdmDeviationSeverityEnum("severity").default("minor").notNull(),
    componentCode: varchar("component_code", { length: 50 }),
    componentName: varchar("component_name", { length: 200 }),
    designedValue: text("designed_value"),
    actualValue: text("actual_value"),
    reason: text("reason"),
    approvalStatus: varchar("approval_status", { length: 30 }).default("pending"), // pending/approved/rejected
    approvedBy: integer("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { mode: "string" }),
    ecoId: integer("eco_id"), // FK to change_events if ECO raised
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_pdm_deviations_project").on(t.projectId),
    index("idx_pdm_deviations_baseline").on(t.baselineId),
    index("idx_pdm_deviations_type").on(t.deviationType),
    index("idx_pdm_deviations_severity").on(t.severity),
  ]
);

// ────────── 7. pdm_field_insights — Service→Design Feedback Loop ──────────

export const pdmFieldInsights = pgTable(
  "pdm_field_insights",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => pdmProducts.id),
    projectId: integer("project_id").references(() => projects.id),
    insightType: pdmInsightTypeEnum("insight_type").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    affectedStationTypes: jsonb("affected_station_types").$type<string[]>(),
    sourceServiceLogIds: jsonb("source_service_log_ids").$type<number[]>(),
    occurrenceCount: integer("occurrence_count").default(1),
    severityScore: integer("severity_score").default(1), // 1-10
    suggestedEcoId: integer("suggested_eco_id"), // FK to change_events
    status: pdmInsightStatusEnum("status").default("open").notNull(),
    resolvedAt: timestamp("resolved_at", { mode: "string" }),
    resolvedBy: integer("resolved_by").references(() => users.id),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_pdm_field_insights_product").on(t.productId),
    index("idx_pdm_field_insights_type").on(t.insightType),
    index("idx_pdm_field_insights_status").on(t.status),
    index("idx_pdm_field_insights_severity").on(t.severityScore),
  ]
);

// ────────── Type Exports ──────────

export type PdmProduct = InferSelectModel<typeof pdmProducts>;
export type InsertPdmProduct = InferInsertModel<typeof pdmProducts>;

export type PdmBaseline = InferSelectModel<typeof pdmBaselines>;
export type InsertPdmBaseline = InferInsertModel<typeof pdmBaselines>;

export type PdmEcoWorkflowStep = InferSelectModel<typeof pdmEcoWorkflow>;
export type InsertPdmEcoWorkflowStep = InferInsertModel<typeof pdmEcoWorkflow>;

export type PdmRequirement = InferSelectModel<typeof pdmRequirements>;
export type InsertPdmRequirement = InferInsertModel<typeof pdmRequirements>;

export type PdmReadinessCheck = InferSelectModel<typeof pdmReadinessChecks>;
export type InsertPdmReadinessCheck = InferInsertModel<typeof pdmReadinessChecks>;

export type PdmAsBuiltDeviation = InferSelectModel<typeof pdmAsBuiltDeviations>;
export type InsertPdmAsBuiltDeviation = InferInsertModel<typeof pdmAsBuiltDeviations>;

export type PdmFieldInsight = InferSelectModel<typeof pdmFieldInsights>;
export type InsertPdmFieldInsight = InferInsertModel<typeof pdmFieldInsights>;
