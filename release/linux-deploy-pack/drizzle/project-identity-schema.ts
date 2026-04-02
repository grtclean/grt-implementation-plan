/**
 * GRT 5.0 项目身份统一Schema
 *
 * 黄金主键: projects.id (serial)
 * 项目编号生命周期: OPP-xxx → BID-xxx → PRJ-xxx
 *
 * 状态机:
 * OPPORTUNITY → BID_SUBMITTED → BID_WON → PROJECT_INITIATED → M0-M12 → ARCHIVED
 *                              → BID_LOST → ARCHIVED
 */

import { pgTable, serial, integer, varchar, text, timestamp, boolean, decimal, index, unique } from 'drizzle-orm/pg-core';
import { users } from './schema';

// 项目身份统一映射表 (Pre-ID → Formal-ID 平滑迁移)
export const projectIdentityMap = pgTable('project_identity_map', {
  id: serial().primaryKey(),
  // 统一追溯链
  opportunityCode: varchar({ length: 50 }), // OPP-BU-YYYY-NNN
  bidCode: varchar({ length: 50 }), // BID-BU-YYYY-NNN
  formalProjectCode: varchar({ length: 50 }), // PRJ-YYYY-NNNNNN
  formalProjectId: integer(), // FK to projects.id (set when project is created)
  // 生命周期状态机
  currentStage: varchar({ length: 50 }).notNull().default('opportunity'),
  // opportunity → bid_submitted → bid_evaluation → bid_won → project_initiated → active → completed → archived
  // bid_lost → archived
  stageHistory: text(), // JSON: [{stage, enteredAt, exitedAt, triggeredBy}]
  // 客户
  customerName: varchar({ length: 200 }),
  customerId: integer(),
  // BU
  buCode: varchar({ length: 50 }),
  // 关键金额
  estimatedValue: decimal({ precision: 14, scale: 2 }),
  // 责任人
  ownerId: integer().references(() => users.id),
  ownerName: varchar({ length: 100 }),
  // 审计
  createdBy: integer().references(() => users.id),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('project_identity_map_uk_opp').on(table.opportunityCode),
  unique('project_identity_map_uk_bid').on(table.bidCode),
  unique('project_identity_map_uk_prj').on(table.formalProjectCode),
  index('project_identity_map_idx_stage').on(table.currentStage),
  index('project_identity_map_idx_customer').on(table.customerId),
  index('project_identity_map_idx_bu').on(table.buCode),
]);

// 项目编号计数器 (确保PRJ/BID/OPP编号不重复)
export const projectCodeSequences = pgTable('project_code_sequences', {
  id: serial().primaryKey(),
  prefix: varchar({ length: 20 }).notNull(), // PRJ/BID/OPP
  buCode: varchar({ length: 10 }),
  fiscalYear: integer().notNull(),
  currentSequence: integer().notNull().default(0),
  format: varchar({ length: 100 }).notNull().default('{PREFIX}-{BU}-{YEAR}-{SEQ:3}'),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('project_code_seq_uk').on(table.prefix, table.buCode, table.fiscalYear),
]);

// 项目主键引用审计 (追踪哪些表引用了project_id)
export const projectReferenceAudit = pgTable('project_reference_audit', {
  id: serial().primaryKey(),
  tableName: varchar({ length: 100 }).notNull(),
  referenceType: varchar({ length: 20 }).notNull(), // fk_enforced / denormalized / varchar_only
  columnName: varchar({ length: 100 }).notNull(), // projectId / projectCode / projectNumber
  hasForeignKey: boolean().default(false),
  hasIndex: boolean().default(false),
  notes: text(),
  auditedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('project_ref_audit_uk').on(table.tableName, table.columnName),
]);

// 项目活动时间线 (跨模块统一记录)
export const projectActivityTimeline = pgTable('project_activity_timeline', {
  id: serial().primaryKey(),
  projectId: integer().notNull(),
  projectCode: varchar({ length: 50 }),
  // 活动信息
  activityType: varchar({ length: 50 }).notNull(), // oa_submitted/oa_approved/po_created/design_uploaded/test_completed/gl_posted/phase_advanced/payment_executed/invoice_registered/milestone_reached
  activityTitle: varchar({ length: 200 }).notNull(),
  activityDescription: text(),
  // 来源
  sourceModule: varchar({ length: 50 }).notNull(), // oa/procurement/design/quality/finance/project/hrm
  sourceDocType: varchar({ length: 50 }),
  sourceDocId: integer(),
  sourceDocCode: varchar({ length: 50 }),
  // 阶段
  projectPhase: varchar({ length: 10 }), // M0-M12
  // 金额(如有)
  amount: decimal({ precision: 14, scale: 2 }),
  // 操作人
  performedBy: integer().references(() => users.id),
  performedByName: varchar({ length: 100 }),
  // 时间
  performedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('project_timeline_idx_project').on(table.projectId),
  index('project_timeline_idx_type').on(table.activityType),
  index('project_timeline_idx_module').on(table.sourceModule),
  index('project_timeline_idx_phase').on(table.projectPhase),
  index('project_timeline_idx_time').on(table.performedAt),
]);
