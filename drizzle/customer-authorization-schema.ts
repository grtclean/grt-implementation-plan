/**
 * Customer Authorization & Document Version Control Schema
 * 客户授权与文档版本有效控制系统
 *
 * 4 tables:
 *   customer_authorizations          — 主授权记录
 *   customer_authorization_documents — 授权文档清单
 *   customer_nda_agreements          — NDA/IP 协议签署
 *   customer_access_audit_logs       — 客户访问审计
 */
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  smallint,
  boolean,
  json,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════

export const customerAuthStatusEnum = pgEnum("customer_auth_status", [
  "pending_nda",
  "active",
  "suspended",
  "revoked",
  "expired",
]);

export const docCategoryEnum = pgEnum("customer_doc_category", [
  "operation_manual",
  "maintenance_manual",
  "basic_wiring",
  "electrical_drawing",
  "bom",
  "factory_params",
  "pid_tuning",
  "plc_source_code",
  "hmi_variable_table",
  "historical_data",
  "fat_certificate",
  "sat_certificate",
  "design_rationale",
  "custom",
]);

export const ndaStatusEnum = pgEnum("customer_nda_status", [
  "pending",
  "signed",
  "countersigned",
  "expired",
  "revoked",
]);

export const accessActionTypeEnum = pgEnum("customer_access_action", [
  "portal_login",
  "doc_view",
  "doc_download",
  "nda_signed",
  "access_revoked",
  "tier_upgraded",
]);

export const accessRiskLevelEnum = pgEnum("customer_access_risk", [
  "low",
  "medium",
  "high",
]);

// ═══════════════════════════════════════════════════════════
// 1. customer_authorizations — 主授权记录
// ═══════════════════════════════════════════════════════════

export const customerAuthorizations = pgTable("customer_authorizations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  customerId: integer("customer_id"),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 100 }).notNull(),
  contactEmail: varchar("contact_email", { length: 200 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  /** 1=基础买方 | 2=技术联系人 | 3=工程伙伴 | 4=战略合作 */
  accessTier: smallint("access_tier").notNull().default(1),
  workspaceId: integer("workspace_id"),
  portalUserId: integer("portal_user_id"),
  status: customerAuthStatusEnum("status").notNull().default("pending_nda"),
  ndaRequired: boolean("nda_required").notNull().default(true),
  ndaSignedAt: timestamp("nda_signed_at"),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  grantedByUserId: integer("granted_by_user_id"),
  grantedByName: varchar("granted_by_name", { length: 100 }),
  revokedByUserId: integer("revoked_by_user_id"),
  revokedReason: text("revoked_reason"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_cust_auth_project").on(table.projectId),
  index("idx_cust_auth_company").on(table.companyName),
  index("idx_cust_auth_status").on(table.status),
  index("idx_cust_auth_portal_user").on(table.portalUserId),
]);

export type CustomerAuthorization = InferSelectModel<typeof customerAuthorizations>;
export type NewCustomerAuthorization = InferInsertModel<typeof customerAuthorizations>;

// ═══════════════════════════════════════════════════════════
// 2. customer_authorization_documents — 授权文档清单
// ═══════════════════════════════════════════════════════════

export const customerAuthorizationDocuments = pgTable("customer_authorization_documents", {
  id: serial("id").primaryKey(),
  authorizationId: integer("authorization_id").notNull(),
  docCategory: docCategoryEnum("doc_category").notNull(),
  docLabel: varchar("doc_label", { length: 300 }),
  sourceType: varchar("source_type", { length: 50 }), // plm | workspace | upload | plc_module
  sourceId: integer("source_id"),
  sourceVersion: varchar("source_version", { length: 50 }),
  filePath: text("file_path"),
  watermarkRequired: boolean("watermark_required").notNull().default(true),
  allowDownload: boolean("allow_download").notNull().default(false),
  allowPrint: boolean("allow_print").notNull().default(false),
  expiryOverride: timestamp("expiry_override"),
  isActive: boolean("is_active").notNull().default(true),
  addedByUserId: integer("added_by_user_id"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
  accessCount: integer("access_count").notNull().default(0),
}, (table) => [
  index("idx_cust_auth_doc_auth_id").on(table.authorizationId),
  index("idx_cust_auth_doc_category").on(table.docCategory),
]);

export type CustomerAuthorizationDocument = InferSelectModel<typeof customerAuthorizationDocuments>;
export type NewCustomerAuthorizationDocument = InferInsertModel<typeof customerAuthorizationDocuments>;

// ═══════════════════════════════════════════════════════════
// 3. customer_nda_agreements — NDA/IP 协议签署
// ═══════════════════════════════════════════════════════════

export const customerNdaAgreements = pgTable("customer_nda_agreements", {
  id: serial("id").primaryKey(),
  authorizationId: integer("authorization_id").notNull(),
  templateVersion: varchar("template_version", { length: 20 }).notNull().default("1.0"),
  /** SHA-256 hash of the full NDA text at signing time — proves exact version signed */
  fullTextHash: varchar("full_text_hash", { length: 64 }),
  signerName: varchar("signer_name", { length: 100 }),
  signerEmail: varchar("signer_email", { length: 200 }),
  signerTitle: varchar("signer_title", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at"),
  /** Unique token sent via email for NDA signing */
  signatureToken: varchar("signature_token", { length: 128 }),
  tokenExpiresAt: timestamp("token_expires_at"),
  isCountersigned: boolean("is_countersigned").notNull().default(false),
  countersignedBy: varchar("countersigned_by", { length: 100 }),
  countersignedAt: timestamp("countersigned_at"),
  pdfPath: text("pdf_path"),
  status: ndaStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_cust_nda_auth_id").on(table.authorizationId),
  uniqueIndex("idx_cust_nda_token").on(table.signatureToken),
]);

export type CustomerNdaAgreement = InferSelectModel<typeof customerNdaAgreements>;
export type NewCustomerNdaAgreement = InferInsertModel<typeof customerNdaAgreements>;

// ═══════════════════════════════════════════════════════════
// 4. customer_access_audit_logs — 客户访问审计
// ═══════════════════════════════════════════════════════════

export const customerAccessAuditLogs = pgTable("customer_access_audit_logs", {
  id: serial("id").primaryKey(),
  authorizationId: integer("authorization_id"),
  documentId: integer("document_id"),
  portalUserId: integer("portal_user_id"),
  customerCompany: varchar("customer_company", { length: 200 }),
  actionType: accessActionTypeEnum("action_type").notNull(),
  docCategory: varchar("doc_category", { length: 50 }),
  docLabel: varchar("doc_label", { length: 300 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  watermarkToken: varchar("watermark_token", { length: 128 }),
  riskLevel: accessRiskLevelEnum("risk_level").notNull().default("low"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_cust_audit_auth_id").on(table.authorizationId),
  index("idx_cust_audit_action").on(table.actionType),
  index("idx_cust_audit_portal_user").on(table.portalUserId),
  index("idx_cust_audit_created").on(table.createdAt),
]);

export type CustomerAccessAuditLog = InferSelectModel<typeof customerAccessAuditLogs>;
export type NewCustomerAccessAuditLog = InferInsertModel<typeof customerAccessAuditLogs>;

// ═══════════════════════════════════════════════════════════
// Tier → Document Category Access Matrix (code constant)
// ═══════════════════════════════════════════════════════════

export type DocCategory =
  | "operation_manual" | "maintenance_manual" | "basic_wiring" | "electrical_drawing"
  | "bom" | "factory_params" | "pid_tuning" | "plc_source_code"
  | "hmi_variable_table" | "historical_data" | "fat_certificate" | "sat_certificate"
  | "design_rationale" | "custom";

export interface TierAccess {
  viewable: boolean;
  downloadable: boolean;
}

/**
 * TIER_DOC_MATRIX[tier][category] → { viewable, downloadable }
 * Tier 1=基础买方, 2=技术联系人, 3=工程伙伴, 4=战略合作
 */
export const TIER_DOC_MATRIX: Record<number, Record<DocCategory, TierAccess>> = {
  1: {
    operation_manual:    { viewable: true,  downloadable: true },
    basic_wiring:        { viewable: true,  downloadable: true },
    fat_certificate:     { viewable: true,  downloadable: true },
    sat_certificate:     { viewable: false, downloadable: false },
    maintenance_manual:  { viewable: false, downloadable: false },
    electrical_drawing:  { viewable: false, downloadable: false },
    bom:                 { viewable: false, downloadable: false },
    factory_params:      { viewable: false, downloadable: false },
    plc_source_code:     { viewable: false, downloadable: false },
    hmi_variable_table:  { viewable: false, downloadable: false },
    pid_tuning:          { viewable: false, downloadable: false },
    historical_data:     { viewable: false, downloadable: false },
    design_rationale:    { viewable: false, downloadable: false },
    custom:              { viewable: false, downloadable: false },
  },
  2: {
    operation_manual:    { viewable: true,  downloadable: true },
    basic_wiring:        { viewable: true,  downloadable: true },
    fat_certificate:     { viewable: true,  downloadable: true },
    sat_certificate:     { viewable: true,  downloadable: true },
    maintenance_manual:  { viewable: true,  downloadable: true },
    electrical_drawing:  { viewable: true,  downloadable: true },
    bom:                 { viewable: true,  downloadable: true },
    factory_params:      { viewable: true,  downloadable: true },
    plc_source_code:     { viewable: false, downloadable: false },
    hmi_variable_table:  { viewable: false, downloadable: false },
    pid_tuning:          { viewable: false, downloadable: false },
    historical_data:     { viewable: false, downloadable: false },
    design_rationale:    { viewable: false, downloadable: false },
    custom:              { viewable: false, downloadable: false },
  },
  3: {
    operation_manual:    { viewable: true,  downloadable: true },
    basic_wiring:        { viewable: true,  downloadable: true },
    fat_certificate:     { viewable: true,  downloadable: true },
    sat_certificate:     { viewable: true,  downloadable: true },
    maintenance_manual:  { viewable: true,  downloadable: true },
    electrical_drawing:  { viewable: true,  downloadable: true },
    bom:                 { viewable: true,  downloadable: true },
    factory_params:      { viewable: true,  downloadable: true },
    plc_source_code:     { viewable: true,  downloadable: false },  // view only
    hmi_variable_table:  { viewable: true,  downloadable: true },
    pid_tuning:          { viewable: true,  downloadable: true },
    historical_data:     { viewable: true,  downloadable: true },
    design_rationale:    { viewable: false, downloadable: false },
    custom:              { viewable: false, downloadable: false },
  },
  4: {
    operation_manual:    { viewable: true,  downloadable: true },
    basic_wiring:        { viewable: true,  downloadable: true },
    fat_certificate:     { viewable: true,  downloadable: true },
    sat_certificate:     { viewable: true,  downloadable: true },
    maintenance_manual:  { viewable: true,  downloadable: true },
    electrical_drawing:  { viewable: true,  downloadable: true },
    bom:                 { viewable: true,  downloadable: true },
    factory_params:      { viewable: true,  downloadable: true },
    plc_source_code:     { viewable: true,  downloadable: true },
    hmi_variable_table:  { viewable: true,  downloadable: true },
    pid_tuning:          { viewable: true,  downloadable: true },
    historical_data:     { viewable: true,  downloadable: true },
    design_rationale:    { viewable: true,  downloadable: true },
    custom:              { viewable: true,  downloadable: true },
  },
};

/** Get the risk level for a document category */
export function getDocRiskLevel(category: DocCategory): "low" | "medium" | "high" {
  switch (category) {
    case "plc_source_code":
    case "design_rationale":
    case "pid_tuning":
      return "high";
    case "electrical_drawing":
    case "bom":
    case "hmi_variable_table":
    case "factory_params":
      return "medium";
    default:
      return "low";
  }
}
