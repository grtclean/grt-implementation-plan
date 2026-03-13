/**
 * Security & Compliance Schema — 安全防线闭环
 *
 * 三张核心表:
 *   audit_logs            — 敏感操作审计日志 (异步无阻塞写入)
 *   whistleblower_reports — 举报箱 (非对称加密内容)
 *   compliance_commitments — 月度自律承诺书签署状态
 */
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════

export const auditActionTypeEnum = pgEnum("audit_action_type", [
  "LOGIN",
  "LOGOUT",
  "DOWNLOAD_CAD",
  "DOWNLOAD_BOM",
  "DOWNLOAD_PDF",
  "EXPORT_DATA",
  "UNAUTHORIZED_ACCESS",
  "PERMISSION_ESCALATION",
  "BULK_QUERY",
  "SENSITIVE_VIEW",
  "CONFIG_CHANGE",
  "DATA_DELETE",
  "API_KEY_ACCESS",
  "AFTER_HOURS_ACCESS",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "PENDING",
  "INVESTIGATING",
  "RESOLVED",
  "DISMISSED",
]);

// ═══════════════════════════════════════════════════════════
// 1. audit_logs — 敏感操作审计日志
// ═══════════════════════════════════════════════════════════

export const securityAuditLogs = pgTable("compliance_audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userName: varchar("user_name", { length: 200 }),
  actionType: auditActionTypeEnum("action_type").notNull(),
  resourceType: varchar("resource_type", { length: 100 }),
  resourceId: varchar("resource_id", { length: 200 }),
  resourceName: varchar("resource_name", { length: 500 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  riskLevel: varchar("risk_level", { length: 20 }).default("low"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("sal_user_idx").on(table.userId),
  index("sal_action_idx").on(table.actionType),
  index("sal_created_idx").on(table.createdAt),
  index("sal_risk_idx").on(table.riskLevel),
]);

export type SecurityAuditLog = InferSelectModel<typeof securityAuditLogs>;
export type NewSecurityAuditLog = InferInsertModel<typeof securityAuditLogs>;

// ═══════════════════════════════════════════════════════════
// 2. whistleblower_reports — 举报箱
//    encryptedContent: 使用 RSA 公钥加密后的 Base64 字符串,
//    解密需总裁办持有的 RSA 私钥 — 保证只有总裁办能阅读举报原文。
//    加密算法: RSA-OAEP + SHA-256 (2048-bit key pair)
// ═══════════════════════════════════════════════════════════

export const whistleblowerReports = pgTable("whistleblower_reports", {
  id: serial("id").primaryKey(),
  /** RSA-OAEP 加密后的举报内容 (Base64), 仅总裁办 RSA 私钥可解密 */
  encryptedContent: text("encrypted_content").notNull(),
  /** 举报类别: 信息泄露/贪腐/违规操作/其他 */
  category: varchar("category", { length: 50 }).notNull(),
  /** 是否匿名 */
  isAnonymous: boolean("is_anonymous").default(true).notNull(),
  /** 举报人 ID (匿名时为 null) */
  reporterId: integer("reporter_id"),
  /** 被举报人姓名 (明文, 便于快速检索) */
  targetName: varchar("target_name", { length: 200 }),
  /** 处理状态 */
  status: reportStatusEnum("status").default("PENDING").notNull(),
  /** 调查备注 (总裁办填写) */
  investigationNotes: text("investigation_notes"),
  /** 处理人 */
  handledBy: varchar("handled_by", { length: 200 }),
  handledAt: timestamp("handled_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("wr_status_idx").on(table.status),
  index("wr_category_idx").on(table.category),
  index("wr_created_idx").on(table.createdAt),
]);

export type WhistleblowerReport = InferSelectModel<typeof whistleblowerReports>;
export type NewWhistleblowerReport = InferInsertModel<typeof whistleblowerReports>;

// ═══════════════════════════════════════════════════════════
// 3. compliance_commitments — 月度自律承诺书签署
// ═══════════════════════════════════════════════════════════

export const complianceCommitments = pgTable("compliance_commitments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userName: varchar("user_name", { length: 200 }),
  /** 承诺周期, 格式 "YYYY-MM" (如 "2026-03") */
  period: varchar("period", { length: 7 }).notNull(),
  /** 是否已同意并签署 */
  isAgreed: boolean("is_agreed").default(false).notNull(),
  /** 签署时间 */
  signedAt: timestamp("signed_at", { mode: "string" }),
  /** 签署时 IP */
  signedFromIp: varchar("signed_from_ip", { length: 45 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("cc_user_period_idx").on(table.userId, table.period),
  index("cc_period_idx").on(table.period),
]);

export type ComplianceCommitment = InferSelectModel<typeof complianceCommitments>;
export type NewComplianceCommitment = InferInsertModel<typeof complianceCommitments>;
