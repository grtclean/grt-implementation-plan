/**
 * R&D NPI/NPD Module — New Product Introduction & Development
 *
 * Dual-track R&D lifecycle: Concept → EVT → DVT → PVT → Mass Production
 * Architecturally isolated from M0-M12 stage-gate pipeline.
 *
 * 9 enums, 10 tables, 48 indexes, 20 type exports
 */
import {
  pgTable, serial, integer, varchar, text, timestamp, decimal,
  index, boolean, pgEnum, jsonb, unique,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════

export const rndProjectCategory = pgEnum("rnd_project_category", [
  "robotics", "vision_ai", "fluid_mechanics", "mechatronics", "software",
]);

export const rndStage = pgEnum("rnd_stage", [
  "concept", "evt", "dvt", "pvt", "mass_production",
]);

export const rndProjectStatus = pgEnum("rnd_project_status", [
  "draft", "active", "on_hold", "cancelled", "completed",
]);

export const rndGateDecision = pgEnum("rnd_gate_decision", [
  "pending", "approved", "conditional", "rejected", "deferred",
]);

export const rndBomComponentSource = pgEnum("rnd_bom_component_source", [
  "avl_approved", "prototype", "experimental", "3d_printed", "cots",
]);

export const rndBomSnapshotReason = pgEnum("rnd_bom_snapshot_reason", [
  "gate_freeze", "manual_baseline", "pre_promotion",
]);

export const rndTestType = pgEnum("rnd_test_type", [
  "unit_test", "integration_test", "stress_test", "environmental", "compliance", "performance",
]);

export const rndTestVerdict = pgEnum("rnd_test_verdict", [
  "pass", "fail", "conditional", "not_run",
]);

export const rndRoutingStepType = pgEnum("rnd_routing_step_type", [
  "assembly", "inspection", "eol_test", "packaging", "labeling",
]);

// ═══════════════════════════════════════════════════════════════
// Table 1: rnd_projects — R&D Portfolio
// ═══════════════════════════════════════════════════════════════

export const rndProjects = pgTable("rnd_projects", {
  id: serial("id").primaryKey(),
  projectCode: varchar("project_code", { length: 50 }).notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  nameEn: varchar("name_en", { length: 300 }),
  category: rndProjectCategory("category").notNull(),
  currentStage: rndStage("current_stage").default("concept"),
  status: rndProjectStatus("status").default("draft"),
  parentProjectId: integer("parent_project_id"),
  parentProjectCode: varchar("parent_project_code", { length: 50 }),
  leadEngineerId: integer("lead_engineer_id"),
  ctoSignoffRequired: boolean("cto_signoff_required").default(true),
  ceoSignoffRequired: boolean("ceo_signoff_required").default(false),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  actualSpend: decimal("actual_spend", { precision: 15, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  plannedStartDate: timestamp("planned_start_date", { mode: "string" }),
  plannedEndDate: timestamp("planned_end_date", { mode: "string" }),
  actualStartDate: timestamp("actual_start_date", { mode: "string" }),
  actualEndDate: timestamp("actual_end_date", { mode: "string" }),
  targetSpecs: jsonb("target_specs"),
  riskLevel: varchar("risk_level", { length: 20 }).default("medium"),
  completionPercent: integer("completion_percent").default(0),
  buCode: varchar("bu_code", { length: 50 }),
  description: text("description"),
  tags: jsonb("tags"),
  createdBy: integer("created_by"),
  version: integer("version").default(1),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  unique("rnd_projects_uk_code").on(table.projectCode),
  index("rnd_projects_idx_category").on(table.category),
  index("rnd_projects_idx_stage").on(table.currentStage),
  index("rnd_projects_idx_status").on(table.status),
  index("rnd_projects_idx_bu").on(table.buCode),
  index("rnd_projects_idx_lead").on(table.leadEngineerId),
  index("rnd_projects_idx_created").on(table.createdAt),
]);

// ═══════════════════════════════════════════════════════════════
// Table 2: rnd_gate_reviews — Stage-Gate + CTO/CEO Sign-off
// ═══════════════════════════════════════════════════════════════

export const rndGateReviews = pgTable("rnd_gate_reviews", {
  id: serial("id").primaryKey(),
  rndProjectId: integer("rnd_project_id").notNull(),
  gateStage: rndStage("gate_stage").notNull(),
  reviewRound: integer("review_round").default(1),
  decision: rndGateDecision("decision").default("pending"),
  reviewerId: integer("reviewer_id"),
  reviewerName: varchar("reviewer_name", { length: 200 }),
  reviewerRole: varchar("reviewer_role", { length: 100 }),
  ctoApproved: boolean("cto_approved").default(false),
  ctoApprovedBy: integer("cto_approved_by"),
  ctoApprovedAt: timestamp("cto_approved_at", { mode: "string" }),
  ctoComment: text("cto_comment"),
  ceoApproved: boolean("ceo_approved").default(false),
  ceoApprovedBy: integer("ceo_approved_by"),
  ceoApprovedAt: timestamp("ceo_approved_at", { mode: "string" }),
  ceoComment: text("ceo_comment"),
  checklistJson: jsonb("checklist_json"),
  checklistPassed: integer("checklist_passed").default(0),
  checklistTotal: integer("checklist_total").default(0),
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
  conditions: text("conditions"),
  actionItems: jsonb("action_items"),
  attachments: jsonb("attachments"),
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("rnd_gate_reviews_idx_project").on(table.rndProjectId),
  index("rnd_gate_reviews_idx_stage").on(table.gateStage),
  index("rnd_gate_reviews_idx_decision").on(table.decision),
  index("rnd_gate_reviews_idx_reviewer").on(table.reviewerId),
  index("rnd_gate_reviews_idx_created").on(table.createdAt),
]);

// ═══════════════════════════════════════════════════════════════
// Table 3: rnd_sandbox_boms — Version-Controlled R&D BOM
// ═══════════════════════════════════════════════════════════════

export const rndSandboxBoms = pgTable("rnd_sandbox_boms", {
  id: serial("id").primaryKey(),
  rndProjectId: integer("rnd_project_id").notNull(),
  bomCode: varchar("bom_code", { length: 50 }).notNull(),
  versionMajor: integer("version_major").default(0),
  versionMinor: integer("version_minor").default(1),
  versionLabel: varchar("version_label", { length: 20 }).default("v0.1"),
  status: varchar("status", { length: 30 }).default("draft"),
  parentBomId: integer("parent_bom_id"),
  totalEstimatedCost: decimal("total_estimated_cost", { precision: 15, scale: 2 }).default("0"),
  totalComponents: integer("total_components").default(0),
  avlApprovedCount: integer("avl_approved_count").default(0),
  experimentalCount: integer("experimental_count").default(0),
  frozenAt: timestamp("frozen_at", { mode: "string" }),
  frozenBy: integer("frozen_by"),
  frozenForGate: rndStage("frozen_for_gate"),
  promotedToBomMasterId: integer("promoted_to_bom_master_id"),
  promotedAt: timestamp("promoted_at", { mode: "string" }),
  promotedBy: integer("promoted_by"),
  description: text("description"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  unique("rnd_sandbox_boms_uk_code_version").on(table.bomCode, table.versionLabel),
  index("rnd_sandbox_boms_idx_project").on(table.rndProjectId),
  index("rnd_sandbox_boms_idx_status").on(table.status),
  index("rnd_sandbox_boms_idx_parent").on(table.parentBomId),
  index("rnd_sandbox_boms_idx_created").on(table.createdAt),
]);

// ═══════════════════════════════════════════════════════════════
// Table 4: rnd_sandbox_bom_items — R&D BOM Line Items
// ═══════════════════════════════════════════════════════════════

export const rndSandboxBomItems = pgTable("rnd_sandbox_bom_items", {
  id: serial("id").primaryKey(),
  sandboxBomId: integer("sandbox_bom_id").notNull(),
  parentItemId: integer("parent_item_id"),
  level: integer("level").default(1),
  sequence: integer("sequence").default(10),
  partNumber: varchar("part_number", { length: 100 }).notNull(),
  partName: varchar("part_name", { length: 300 }).notNull(),
  componentSource: rndBomComponentSource("component_source").default("cots"),
  quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("pcs"),
  unitCost: decimal("unit_cost", { precision: 12, scale: 4 }).default("0"),
  extendedCost: decimal("extended_cost", { precision: 15, scale: 2 }).default("0"),
  supplierName: varchar("supplier_name", { length: 200 }),
  leadTimeDays: integer("lead_time_days"),
  isCriticalPath: boolean("is_critical_path").default(false),
  requiresCustomTooling: boolean("requires_custom_tooling").default(false),
  avlMaterialCode: varchar("avl_material_code", { length: 50 }),
  substitutes: jsonb("substitutes"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("rnd_bom_items_idx_bom").on(table.sandboxBomId),
  index("rnd_bom_items_idx_parent").on(table.parentItemId),
  index("rnd_bom_items_idx_part").on(table.partNumber),
  index("rnd_bom_items_idx_source").on(table.componentSource),
  index("rnd_bom_items_idx_critical").on(table.isCriticalPath),
]);

// ═══════════════════════════════════════════════════════════════
// Table 5: rnd_bom_snapshots — Gate-Freeze Snapshots
// ═══════════════════════════════════════════════════════════════

export const rndBomSnapshots = pgTable("rnd_bom_snapshots", {
  id: serial("id").primaryKey(),
  sandboxBomId: integer("sandbox_bom_id").notNull(),
  rndProjectId: integer("rnd_project_id").notNull(),
  snapshotReason: rndBomSnapshotReason("snapshot_reason").notNull(),
  gateStage: rndStage("gate_stage"),
  bomHeaderSnapshot: jsonb("bom_header_snapshot"),
  bomItemsSnapshot: jsonb("bom_items_snapshot"),
  totalCost: decimal("total_cost", { precision: 15, scale: 2 }),
  avlCompliancePercent: decimal("avl_compliance_percent", { precision: 5, scale: 2 }),
  snapshotBy: integer("snapshot_by"),
  snapshotLabel: varchar("snapshot_label", { length: 100 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("rnd_bom_snapshots_idx_bom").on(table.sandboxBomId),
  index("rnd_bom_snapshots_idx_project").on(table.rndProjectId),
  index("rnd_bom_snapshots_idx_stage").on(table.gateStage),
  index("rnd_bom_snapshots_idx_created").on(table.createdAt),
]);

// ═══════════════════════════════════════════════════════════════
// Table 6: rnd_test_records — Dynamic V&V Matrix
// ═══════════════════════════════════════════════════════════════

export const rndTestRecords = pgTable("rnd_test_records", {
  id: serial("id").primaryKey(),
  rndProjectId: integer("rnd_project_id").notNull(),
  gateStage: rndStage("gate_stage").notNull(),
  testCode: varchar("test_code", { length: 50 }).notNull(),
  testName: varchar("test_name", { length: 300 }).notNull(),
  testType: rndTestType("test_type").notNull(),
  testMetrics: jsonb("test_metrics"),
  passCriteria: jsonb("pass_criteria"),
  verdict: rndTestVerdict("verdict").default("not_run"),
  environmentConditions: jsonb("environment_conditions"),
  testEquipment: jsonb("test_equipment"),
  evidenceUrls: jsonb("evidence_urls"),
  executedBy: integer("executed_by"),
  executedAt: timestamp("executed_at", { mode: "string" }),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  suiteId: integer("suite_id"),
  isMandatory: boolean("is_mandatory").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("rnd_test_records_idx_project").on(table.rndProjectId),
  index("rnd_test_records_idx_stage").on(table.gateStage),
  index("rnd_test_records_idx_type").on(table.testType),
  index("rnd_test_records_idx_verdict").on(table.verdict),
  index("rnd_test_records_idx_code").on(table.testCode),
  index("rnd_test_records_idx_created").on(table.createdAt),
]);

// ═══════════════════════════════════════════════════════════════
// Table 7: rnd_test_suites — V&V Templates
// ═══════════════════════════════════════════════════════════════

export const rndTestSuites = pgTable("rnd_test_suites", {
  id: serial("id").primaryKey(),
  rndProjectId: integer("rnd_project_id").notNull(),
  suiteCode: varchar("suite_code", { length: 50 }).notNull(),
  suiteName: varchar("suite_name", { length: 300 }).notNull(),
  targetGate: rndStage("target_gate"),
  projectCategory: rndProjectCategory("project_category"),
  testTemplates: jsonb("test_templates"),
  totalTests: integer("total_tests").default(0),
  passedTests: integer("passed_tests").default(0),
  failedTests: integer("failed_tests").default(0),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  unique("rnd_test_suites_uk_project_code").on(table.rndProjectId, table.suiteCode),
  index("rnd_test_suites_idx_project").on(table.rndProjectId),
  index("rnd_test_suites_idx_gate").on(table.targetGate),
  index("rnd_test_suites_idx_created").on(table.createdAt),
]);

// ═══════════════════════════════════════════════════════════════
// Table 8: rnd_assembly_routings — Standard Product Routing
// ═══════════════════════════════════════════════════════════════

export const rndAssemblyRoutings = pgTable("rnd_assembly_routings", {
  id: serial("id").primaryKey(),
  rndProjectId: integer("rnd_project_id").notNull(),
  sandboxBomId: integer("sandbox_bom_id"),
  routingCode: varchar("routing_code", { length: 50 }).notNull(),
  version: varchar("version", { length: 20 }).default("1.0"),
  routingName: varchar("routing_name", { length: 300 }),
  status: varchar("status", { length: 30 }).default("draft"),
  totalCycleTimeMinutes: decimal("total_cycle_time_minutes", { precision: 10, scale: 2 }).default("0"),
  activatedAtStage: rndStage("activated_at_stage"),
  description: text("description"),
  createdBy: integer("created_by"),
  activatedAt: timestamp("activated_at", { mode: "string" }),
  frozenAt: timestamp("frozen_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  unique("rnd_routings_uk_code_version").on(table.routingCode, table.version),
  index("rnd_routings_idx_project").on(table.rndProjectId),
  index("rnd_routings_idx_status").on(table.status),
  index("rnd_routings_idx_created").on(table.createdAt),
]);

// ═══════════════════════════════════════════════════════════════
// Table 9: rnd_routing_steps — SOP Steps
// ═══════════════════════════════════════════════════════════════

export const rndRoutingSteps = pgTable("rnd_routing_steps", {
  id: serial("id").primaryKey(),
  routingId: integer("routing_id").notNull(),
  stepNumber: integer("step_number").notNull(),
  stepType: rndRoutingStepType("step_type").notNull(),
  stepName: varchar("step_name", { length: 300 }).notNull(),
  standardCycleTimeMinutes: decimal("standard_cycle_time_minutes", { precision: 8, scale: 2 }),
  actualCycleTimeMinutes: decimal("actual_cycle_time_minutes", { precision: 8, scale: 2 }),
  workInstructions: jsonb("work_instructions"),
  toolsRequired: jsonb("tools_required"),
  inspectionCriteria: jsonb("inspection_criteria"),
  consumedBomItemIds: jsonb("consumed_bom_item_ids"),
  workerSkillLevel: varchar("worker_skill_level", { length: 50 }),
  workerCount: integer("worker_count").default(1),
  predecessorStepId: integer("predecessor_step_id"),
  isOptional: boolean("is_optional").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("rnd_steps_idx_routing").on(table.routingId),
  index("rnd_steps_idx_type").on(table.stepType),
  index("rnd_steps_idx_number").on(table.routingId, table.stepNumber),
]);

// ═══════════════════════════════════════════════════════════════
// Table 10: rnd_activity_log — Audit Trail
// ═══════════════════════════════════════════════════════════════

export const rndActivityLog = pgTable("rnd_activity_log", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  userId: integer("user_id"),
  userName: varchar("user_name", { length: 200 }),
  changeSummary: text("change_summary"),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("rnd_activity_log_idx_entity").on(table.entityType, table.entityId),
  index("rnd_activity_log_idx_action").on(table.action),
  index("rnd_activity_log_idx_user").on(table.userId),
  index("rnd_activity_log_idx_created").on(table.createdAt),
  index("rnd_activity_log_idx_type").on(table.entityType),
]);

// ═══════════════════════════════════════════════════════════════
// Type Exports
// ═══════════════════════════════════════════════════════════════

export type RndProject = InferSelectModel<typeof rndProjects>;
export type InsertRndProject = InferInsertModel<typeof rndProjects>;
export type RndGateReview = InferSelectModel<typeof rndGateReviews>;
export type InsertRndGateReview = InferInsertModel<typeof rndGateReviews>;
export type RndSandboxBom = InferSelectModel<typeof rndSandboxBoms>;
export type InsertRndSandboxBom = InferInsertModel<typeof rndSandboxBoms>;
export type RndSandboxBomItem = InferSelectModel<typeof rndSandboxBomItems>;
export type InsertRndSandboxBomItem = InferInsertModel<typeof rndSandboxBomItems>;
export type RndBomSnapshot = InferSelectModel<typeof rndBomSnapshots>;
export type InsertRndBomSnapshot = InferInsertModel<typeof rndBomSnapshots>;
export type RndTestRecord = InferSelectModel<typeof rndTestRecords>;
export type InsertRndTestRecord = InferInsertModel<typeof rndTestRecords>;
export type RndTestSuite = InferSelectModel<typeof rndTestSuites>;
export type InsertRndTestSuite = InferInsertModel<typeof rndTestSuites>;
export type RndAssemblyRouting = InferSelectModel<typeof rndAssemblyRoutings>;
export type InsertRndAssemblyRouting = InferInsertModel<typeof rndAssemblyRoutings>;
export type RndRoutingStep = InferSelectModel<typeof rndRoutingSteps>;
export type InsertRndRoutingStep = InferInsertModel<typeof rndRoutingSteps>;
export type RndActivityLogEntry = InferSelectModel<typeof rndActivityLog>;
export type InsertRndActivityLogEntry = InferInsertModel<typeof rndActivityLog>;
