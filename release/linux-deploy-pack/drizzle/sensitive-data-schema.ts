/**
 * GRT 5.0 敏感数据策略Schema
 * 字段级访问控制与导出审批
 */

import { pgTable, serial, integer, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './schema';

export const sensitiveFieldPolicies = pgTable('sensitive_field_policies', {
  id: serial().primaryKey(),
  tableName: varchar({ length: 100 }).notNull(),
  fieldName: varchar({ length: 100 }).notNull(),
  sensitivityLevel: integer().notNull(), // 1=internal, 2=confidential, 3=secret, 4=top_secret
  requiredLevel: integer().notNull().default(2), // minimum user level to see raw value
  watermarkOnView: boolean().default(false),
  requireApprovalForExport: boolean().default(true),
  maskingRule: varchar({ length: 50 }).default('stars'), // stars, partial, hash, redact
  description: text(),
  isActive: boolean().default(true),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('sensitive_field_policies_idx_table').on(table.tableName),
  index('sensitive_field_policies_idx_level').on(table.sensitivityLevel),
]);

export const dataExportRequests = pgTable('data_export_requests', {
  id: serial().primaryKey(),
  requesterId: integer().notNull().references(() => users.id),
  requesterName: varchar({ length: 100 }).notNull(),
  tableName: varchar({ length: 100 }).notNull(),
  fieldNames: text().notNull(), // JSON array of field names
  filterConditions: text(), // JSON filter conditions
  purpose: text().notNull(),
  status: varchar({ length: 50 }).default('pending').notNull(), // pending/approved/rejected/downloaded/expired
  approvedBy: integer().references(() => users.id),
  approvedAt: timestamp({ mode: 'string' }),
  rejectedReason: text(),
  downloadToken: varchar({ length: 100 }),
  downloadCount: integer().default(0),
  maxDownloads: integer().default(1),
  expiresAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('data_export_requests_idx_requester').on(table.requesterId),
  index('data_export_requests_idx_status').on(table.status),
  index('data_export_requests_idx_token').on(table.downloadToken),
]);
