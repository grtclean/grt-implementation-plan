/**
 * Enterprise Document Governance Platform — 企业文档治理平台
 *
 * Three-layer governance model:
 *   Layer 1: Registry  — 395 documents catalogued with metadata, compliance tracking
 *   Layer 2: Templates — PLM-style version control (V1.0 → V1.1 → V2.0)
 *   Layer 3: Instances — User-created docs from templates, OA approval flow
 *
 * 6 tables, 30+ indexes, 12 type exports
 */
import {
  pgTable, serial, integer, varchar, text, timestamp,
  index, boolean, jsonb, uniqueIndex,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════
// Table 1: org_document_registry — 文档注册表 (395 initial rows)
// ═══════════════════════════════════════════════════════════════

export const orgDocumentRegistry = pgTable("org_document_registry", {
  id: serial("id").primaryKey(),
  docCode: varchar("doc_code", { length: 80 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  titleEn: varchar("title_en", { length: 500 }),
  description: text("description"),

  // Classification
  domain: varchar("domain", { length: 100 }).notNull(),         // "00-公司治理"
  subdomain: varchar("subdomain", { length: 100 }).notNull(),   // "01-组织架构"
  docType: varchar("doc_type", { length: 30 }).notNull(),       // readme|template|policy|sop|register|report

  // Lifecycle
  status: varchar("status", { length: 30 }).default("active").notNull(), // draft|active|under_review|superseded|archived

  // Content
  filePath: varchar("file_path", { length: 500 }),
  markdownContent: text("markdown_content"),
  contentHash: varchar("content_hash", { length: 64 }),         // SHA-256

  // Versioning
  currentVersion: varchar("current_version", { length: 20 }).default("V1.0").notNull(),
  versionMajor: integer("version_major").default(1).notNull(),
  versionMinor: integer("version_minor").default(0).notNull(),
  totalVersions: integer("total_versions").default(1).notNull(),

  // Ownership
  ownerRole: varchar("owner_role", { length: 50 }),
  ownerUserId: integer("owner_user_id"),
  approverRole: varchar("approver_role", { length: 50 }),

  // BU scope
  buCode: varchar("bu_code", { length: 50 }),                   // null = 全公司
  allBus: boolean("all_bus").default(true).notNull(),

  // Review compliance
  reviewFrequency: varchar("review_frequency", { length: 30 }), // monthly|quarterly|annual|on_change
  lastReviewedAt: timestamp("last_reviewed_at", { mode: "string" }),
  nextReviewDueAt: timestamp("next_review_due_at", { mode: "string" }),
  reviewOverdue: boolean("review_overdue").default(false).notNull(),

  // System mapping (JSON arrays)
  systemRoutes: jsonb("system_routes"),   // string[]
  systemRoles: jsonb("system_roles"),     // string[]
  tags: jsonb("tags"),                    // string[]
  relatedDocIds: jsonb("related_doc_ids"), // number[]

  // Usage counters
  usageCount: integer("usage_count").default(0).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  downloadCount: integer("download_count").default(0).notNull(),

  // Audit
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("org_doc_registry_uk_doc_code").on(table.docCode),
  index("org_doc_registry_idx_domain").on(table.domain),
  index("org_doc_registry_idx_subdomain").on(table.subdomain),
  index("org_doc_registry_idx_doc_type").on(table.docType),
  index("org_doc_registry_idx_status").on(table.status),
  index("org_doc_registry_idx_owner_role").on(table.ownerRole),
  index("org_doc_registry_idx_bu_code").on(table.buCode),
  index("org_doc_registry_idx_review_overdue").on(table.reviewOverdue),
  index("org_doc_registry_idx_file_path").on(table.filePath),
]);

export type OrgDocumentRegistry = InferSelectModel<typeof orgDocumentRegistry>;
export type InsertOrgDocumentRegistry = InferInsertModel<typeof orgDocumentRegistry>;

// ═══════════════════════════════════════════════════════════════
// Table 2: org_document_versions — 版本历史
// ═══════════════════════════════════════════════════════════════

export const orgDocumentVersions = pgTable("org_document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),

  // Version
  versionString: varchar("version_string", { length: 20 }).notNull(),
  versionMajor: integer("version_major").notNull(),
  versionMinor: integer("version_minor").notNull(),

  // Content snapshot
  markdownContent: text("markdown_content"),
  contentHash: varchar("content_hash", { length: 64 }),

  // Change metadata
  changeReason: text("change_reason"),
  changeType: varchar("change_type", { length: 20 }).notNull(), // minor|major|initial

  // Creator
  createdBy: integer("created_by"),
  createdByName: varchar("created_by_name", { length: 100 }),
  isLatest: boolean("is_latest").default(true).notNull(),

  // Review
  reviewStatus: varchar("review_status", { length: 30 }).default("approved").notNull(), // draft|pending_review|approved|rejected
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  reviewComment: text("review_comment"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("org_doc_versions_idx_document").on(table.documentId),
  index("org_doc_versions_idx_latest").on(table.documentId, table.isLatest),
  index("org_doc_versions_idx_review_status").on(table.reviewStatus),
]);

export type OrgDocumentVersion = InferSelectModel<typeof orgDocumentVersions>;
export type InsertOrgDocumentVersion = InferInsertModel<typeof orgDocumentVersions>;

// ═══════════════════════════════════════════════════════════════
// Table 3: org_document_instances — 文档实例
// ═══════════════════════════════════════════════════════════════

export const orgDocumentInstances = pgTable("org_document_instances", {
  id: serial("id").primaryKey(),
  instanceCode: varchar("instance_code", { length: 50 }).notNull(),

  // Template reference
  templateId: integer("template_id").notNull(),
  templateVersion: varchar("template_version", { length: 20 }),

  // Content
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  markdownContent: text("markdown_content"),
  formData: jsonb("form_data"),           // structured fields

  // Context
  projectId: integer("project_id"),
  projectCode: varchar("project_code", { length: 50 }),
  buCode: varchar("bu_code", { length: 50 }),
  stageCode: varchar("stage_code", { length: 20 }),  // M0-M12

  // Approval
  status: varchar("status", { length: 30 }).default("draft").notNull(), // draft|pending|approved|rejected|superseded
  approvalFlowId: integer("approval_flow_id"),
  currentApproverId: integer("current_approver_id"),
  currentApprovalStep: integer("current_approval_step").default(0),
  approvedAt: timestamp("approved_at", { mode: "string" }),

  // Audit
  createdBy: integer("created_by"),
  createdByName: varchar("created_by_name", { length: 100 }),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("org_doc_instances_uk_code").on(table.instanceCode),
  index("org_doc_instances_idx_template").on(table.templateId),
  index("org_doc_instances_idx_project").on(table.projectId),
  index("org_doc_instances_idx_bu").on(table.buCode),
  index("org_doc_instances_idx_status").on(table.status),
  index("org_doc_instances_idx_stage").on(table.stageCode),
  index("org_doc_instances_idx_created").on(table.createdAt),
]);

export type OrgDocumentInstance = InferSelectModel<typeof orgDocumentInstances>;
export type InsertOrgDocumentInstance = InferInsertModel<typeof orgDocumentInstances>;

// ═══════════════════════════════════════════════════════════════
// Table 4: org_document_links — 交叉引用
// ═══════════════════════════════════════════════════════════════

export const orgDocumentLinks = pgTable("org_document_links", {
  id: serial("id").primaryKey(),
  sourceDocId: integer("source_doc_id").notNull(),
  targetDocId: integer("target_doc_id"),

  // Target type
  targetType: varchar("target_type", { length: 30 }).notNull(), // document|system_route|project|plm_document|oa_template
  targetEntityId: integer("target_entity_id"),
  targetPath: varchar("target_path", { length: 500 }),

  // Link semantics
  linkType: varchar("link_type", { length: 30 }).notNull(),     // references|supersedes|requires|implements|generates
  description: text("description"),

  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("org_doc_links_idx_source").on(table.sourceDocId),
  index("org_doc_links_idx_target_doc").on(table.targetDocId),
  index("org_doc_links_idx_target_type").on(table.targetType),
  index("org_doc_links_idx_link_type").on(table.linkType),
]);

export type OrgDocumentLink = InferSelectModel<typeof orgDocumentLinks>;
export type InsertOrgDocumentLink = InferInsertModel<typeof orgDocumentLinks>;

// ═══════════════════════════════════════════════════════════════
// Table 5: org_document_audit_log — 审计日志
// ═══════════════════════════════════════════════════════════════

export const orgDocumentAuditLog = pgTable("org_document_audit_log", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id"),
  instanceId: integer("instance_id"),

  action: varchar("action", { length: 30 }).notNull(), // view|download|edit|create_version|approve|reject|create_instance
  userId: integer("user_id"),
  userName: varchar("user_name", { length: 100 }),
  userRole: varchar("user_role", { length: 50 }),

  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("org_doc_audit_idx_document").on(table.documentId),
  index("org_doc_audit_idx_instance").on(table.instanceId),
  index("org_doc_audit_idx_user").on(table.userId),
  index("org_doc_audit_idx_action").on(table.action),
  index("org_doc_audit_idx_created").on(table.createdAt),
]);

export type OrgDocumentAuditLog = InferSelectModel<typeof orgDocumentAuditLog>;
export type InsertOrgDocumentAuditLog = InferInsertModel<typeof orgDocumentAuditLog>;

// ═══════════════════════════════════════════════════════════════
// Table 6: org_document_review_schedule — 定期评审计划
// ═══════════════════════════════════════════════════════════════

export const orgDocumentReviewSchedule = pgTable("org_document_review_schedule", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  scheduledDate: timestamp("scheduled_date", { mode: "string" }).notNull(),

  reviewerId: integer("reviewer_id"),
  reviewerName: varchar("reviewer_name", { length: 100 }),

  status: varchar("status", { length: 30 }).default("pending").notNull(), // pending|in_progress|completed|skipped|overdue
  completedAt: timestamp("completed_at", { mode: "string" }),
  resultVersionId: integer("result_version_id"),
  notes: text("notes"),
}, (table) => [
  index("org_doc_review_idx_document").on(table.documentId),
  index("org_doc_review_idx_status").on(table.status),
  index("org_doc_review_idx_scheduled").on(table.scheduledDate),
  index("org_doc_review_idx_reviewer").on(table.reviewerId),
]);

export type OrgDocumentReviewSchedule = InferSelectModel<typeof orgDocumentReviewSchedule>;
export type InsertOrgDocumentReviewSchedule = InferInsertModel<typeof orgDocumentReviewSchedule>;
