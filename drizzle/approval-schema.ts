/**
 * GRT 5.0 审批流程系统数据库Schema
 * 
 * 包含:
 * - 审批流程定义
 * - 审批任务
 * - 审批历史
 * - 审批权限配置
 */

import { pgTable, serial, integer, varchar, text, timestamp, index, unique } from 'drizzle-orm/pg-core';

/**
 * 审批流程定义表
 * 定义不同类型单据的审批流程
 */
export const approvalProcesses = pgTable('approval_processes', {
  id: serial().primaryKey(),
  processCode: varchar({ length: 50 }).notNull(),
  processName: varchar({ length: 100 }).notNull(),
  documentType: varchar({ length: 50 }).notNull(),

  // 流程配置
  description: text(),
  processDefinition: text().notNull(), // JSON格式的流程定义

  // 流程级别
  approvalLevels: integer().notNull(), // 审批级数
  levelDefinition: text().notNull(), // JSON格式的各级审批定义

  // 状态
  isActive: varchar({ length: 50 }).default('yes').notNull(),
  version: integer().default(1),

  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedBy: integer(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('uk_process_code').on(table.processCode),
  index('idx_document_type').on(table.documentType),
]);

/**
 * 审批权限配置表
 * 定义不同角色的审批权限
 */
export const approvalPermissions = pgTable('approval_permissions', {
  id: serial().primaryKey(),
  roleId: integer().notNull(),
  roleName: varchar({ length: 100 }).notNull(),

  // 审批权限
  documentType: varchar({ length: 50 }).notNull(),
  approvalLevel: integer().notNull(), // 可审批的级别
  maxApprovalAmount: integer(), // 最大审批金额

  // 权限范围
  scope: varchar({ length: 50 }).default('department').notNull(),
  applicableDepartments: text(), // JSON array

  // 状态
  isActive: varchar({ length: 50 }).default('yes').notNull(),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('uk_role_document').on(table.roleId, table.documentType),
  index('idx_role_id').on(table.roleId),
  index('idx_document_type').on(table.documentType),
]);

/**
 * 审批任务表
 * 记录待审批的任务
 */
export const approvalTasks = pgTable('approval_tasks', {
  id: serial().primaryKey(),
  taskCode: varchar({ length: 50 }).notNull(),

  // 关联单据
  documentType: varchar({ length: 50 }).notNull(),
  documentId: integer().notNull(),
  documentCode: varchar({ length: 50 }).notNull(),

  // 审批信息
  processId: integer().notNull(),
  currentLevel: integer().notNull(),
  totalLevels: integer().notNull(),

  // 审批人
  assignedTo: integer().notNull(),
  assignedToName: varchar({ length: 100 }),
  assignedToRole: varchar({ length: 100 }),

  // 单据信息
  documentTitle: varchar({ length: 200 }),
  documentAmount: integer(),
  submittedBy: integer().notNull(),
  submittedByName: varchar({ length: 100 }),
  submittedAt: timestamp({ mode: 'string' }).notNull(),

  // 任务状态
  status: varchar({ length: 50 }).default('pending').notNull(),

  // 审批备注
  approvalNotes: text(),
  approvalTime: timestamp({ mode: 'string' }),

  // 期限
  dueDate: timestamp({ mode: 'string' }),
  isOverdue: varchar({ length: 50 }).default('no'),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('uk_task_code').on(table.taskCode),
  index('idx_document_id').on(table.documentId),
  index('idx_assigned_to').on(table.assignedTo),
  index('idx_status').on(table.status),
  index('idx_current_level').on(table.currentLevel),
]);

/**
 * 审批历史表
 * 记录所有审批动作
 */
export const approvalHistory = pgTable('approval_history', {
  id: serial().primaryKey(),

  // 关联单据
  documentType: varchar({ length: 50 }).notNull(),
  documentId: integer().notNull(),
  documentCode: varchar({ length: 50 }).notNull(),

  // 审批信息
  processId: integer().notNull(),
  approvalLevel: integer().notNull(),

  // 审批人
  approvedBy: integer().notNull(),
  approvedByName: varchar({ length: 100 }),
  approvedByRole: varchar({ length: 100 }),

  // 审批动作
  action: varchar({ length: 50 }).notNull(),
  actionReason: text(),
  comments: text(),

  // 时间戳
  actionTime: timestamp({ mode: 'string' }).defaultNow().notNull(),

  // 审批后状态
  nextApprover: integer(),
  nextApproverName: varchar({ length: 100 }),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_document_id').on(table.documentId),
  index('idx_approved_by').on(table.approvedBy),
  index('idx_action_time').on(table.actionTime),
]);

/**
 * 审批规则表
 * 定义审批的业务规则
 */
export const approvalRules = pgTable('approval_rules', {
  id: serial().primaryKey(),
  ruleCode: varchar({ length: 50 }).notNull(),
  ruleName: varchar({ length: 100 }).notNull(),

  // 规则条件
  documentType: varchar({ length: 50 }).notNull(),
  condition: text().notNull(), // JSON格式的条件表达式

  // 规则动作
  action: text().notNull(), // JSON格式的动作定义

  // 规则优先级
  priority: integer().default(0),

  // 状态
  isActive: varchar({ length: 50 }).default('yes').notNull(),

  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedBy: integer(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('uk_rule_code').on(table.ruleCode),
  index('idx_document_type').on(table.documentType),
  index('idx_priority').on(table.priority),
]);

/**
 * 审批统计表
 * 存储审批相关的统计数据
 */
export const approvalStatistics = pgTable('approval_statistics', {
  id: serial().primaryKey(),
  statisticDate: timestamp({ mode: 'string' }).defaultNow().notNull(),

  // 待审批统计
  pendingTasksCount: integer().default(0),
  overdueTasksCount: integer().default(0),

  // 审批效率
  averageApprovalTime: integer(), // 平均审批时间（分钟）
  rejectionRate: integer(), // 拒绝率（百分比）

  // 审批人统计
  approverCount: integer().default(0),
  topApprover: varchar({ length: 100 }),

  // 文档类型统计
  documentTypeStats: text(), // JSON格式的统计数据

  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_statistic_date').on(table.statisticDate),
]);

/**
 * 审批委托表
 * 记录审批权限的委托
 */
export const approvalDelegations = pgTable('approval_delegations', {
  id: serial().primaryKey(),
  delegationCode: varchar({ length: 50 }).notNull(),

  // 委托人
  delegatedFrom: integer().notNull(),
  delegatedFromName: varchar({ length: 100 }),

  // 被委托人
  delegatedTo: integer().notNull(),
  delegatedToName: varchar({ length: 100 }),

  // 委托范围
  documentTypes: text().notNull(), // JSON array
  approvalLevels: text(), // JSON array

  // 委托期限
  startDate: timestamp({ mode: 'string' }).notNull(),
  endDate: timestamp({ mode: 'string' }).notNull(),

  // 状态
  status: varchar({ length: 50 }).default('active').notNull(),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('uk_delegation_code').on(table.delegationCode),
  index('idx_delegated_from').on(table.delegatedFrom),
  index('idx_delegated_to').on(table.delegatedTo),
]);
