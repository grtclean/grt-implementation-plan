/**
 * GRT 5.0 审批流程系统数据库Schema
 * 
 * 包含:
 * - 审批流程定义
 * - 审批任务
 * - 审批历史
 * - 审批权限配置
 */

import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, index, unique } from 'drizzle-orm/mysql-core';

/**
 * 审批流程定义表
 * 定义不同类型单据的审批流程
 */
export const approvalProcesses = mysqlTable('approval_processes', {
  id: int().autoincrement().notNull(),
  processCode: varchar({ length: 50 }).notNull(),
  processName: varchar({ length: 100 }).notNull(),
  documentType: mysqlEnum(['purchase_request', 'purchase_order', 'material_creation', 'supplier_registration', 'inventory_adjustment', 'other']).notNull(),
  
  // 流程配置
  description: text(),
  processDefinition: text().notNull(), // JSON格式的流程定义
  
  // 流程级别
  approvalLevels: int().notNull(), // 审批级数
  levelDefinition: text().notNull(), // JSON格式的各级审批定义
  
  // 状态
  isActive: mysqlEnum(['yes', 'no']).default('yes').notNull(),
  version: int().default(1),
  
  createdBy: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedBy: int(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_process_code').on(table.processCode),
  index('idx_document_type').on(table.documentType),
]);

/**
 * 审批权限配置表
 * 定义不同角色的审批权限
 */
export const approvalPermissions = mysqlTable('approval_permissions', {
  id: int().autoincrement().notNull(),
  roleId: int().notNull(),
  roleName: varchar({ length: 100 }).notNull(),
  
  // 审批权限
  documentType: mysqlEnum(['purchase_request', 'purchase_order', 'material_creation', 'supplier_registration', 'inventory_adjustment', 'all']).notNull(),
  approvalLevel: int().notNull(), // 可审批的级别
  maxApprovalAmount: int(), // 最大审批金额
  
  // 权限范围
  scope: mysqlEnum(['self', 'department', 'company']).default('department').notNull(),
  applicableDepartments: text(), // JSON array
  
  // 状态
  isActive: mysqlEnum(['yes', 'no']).default('yes').notNull(),
  
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_role_document').on(table.roleId, table.documentType),
  index('idx_role_id').on(table.roleId),
  index('idx_document_type').on(table.documentType),
]);

/**
 * 审批任务表
 * 记录待审批的任务
 */
export const approvalTasks = mysqlTable('approval_tasks', {
  id: int().autoincrement().notNull(),
  taskCode: varchar({ length: 50 }).notNull(),
  
  // 关联单据
  documentType: mysqlEnum(['purchase_request', 'purchase_order', 'material_creation', 'supplier_registration', 'inventory_adjustment', 'other']).notNull(),
  documentId: int().notNull(),
  documentCode: varchar({ length: 50 }).notNull(),
  
  // 审批信息
  processId: int().notNull(),
  currentLevel: int().notNull(),
  totalLevels: int().notNull(),
  
  // 审批人
  assignedTo: int().notNull(),
  assignedToName: varchar({ length: 100 }),
  assignedToRole: varchar({ length: 100 }),
  
  // 单据信息
  documentTitle: varchar({ length: 200 }),
  documentAmount: int(),
  submittedBy: int().notNull(),
  submittedByName: varchar({ length: 100 }),
  submittedAt: timestamp({ mode: 'string' }).notNull(),
  
  // 任务状态
  status: mysqlEnum(['pending', 'approved', 'rejected', 'returned', 'cancelled']).default('pending').notNull(),
  
  // 审批备注
  approvalNotes: text(),
  approvalTime: timestamp({ mode: 'string' }),
  
  // 期限
  dueDate: timestamp({ mode: 'string' }),
  isOverdue: mysqlEnum(['yes', 'no']).default('no'),
  
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
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
export const approvalHistory = mysqlTable('approval_history', {
  id: int().autoincrement().notNull(),
  
  // 关联单据
  documentType: mysqlEnum(['purchase_request', 'purchase_order', 'material_creation', 'supplier_registration', 'inventory_adjustment', 'other']).notNull(),
  documentId: int().notNull(),
  documentCode: varchar({ length: 50 }).notNull(),
  
  // 审批信息
  processId: int().notNull(),
  approvalLevel: int().notNull(),
  
  // 审批人
  approvedBy: int().notNull(),
  approvedByName: varchar({ length: 100 }),
  approvedByRole: varchar({ length: 100 }),
  
  // 审批动作
  action: mysqlEnum(['approved', 'rejected', 'returned', 'reassigned']).notNull(),
  actionReason: text(),
  comments: text(),
  
  // 时间戳
  actionTime: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  
  // 审批后状态
  nextApprover: int(),
  nextApproverName: varchar({ length: 100 }),
  
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index('idx_document_id').on(table.documentId),
  index('idx_approved_by').on(table.approvedBy),
  index('idx_action_time').on(table.actionTime),
]);

/**
 * 审批规则表
 * 定义审批的业务规则
 */
export const approvalRules = mysqlTable('approval_rules', {
  id: int().autoincrement().notNull(),
  ruleCode: varchar({ length: 50 }).notNull(),
  ruleName: varchar({ length: 100 }).notNull(),
  
  // 规则条件
  documentType: mysqlEnum(['purchase_request', 'purchase_order', 'material_creation', 'supplier_registration', 'inventory_adjustment', 'all']).notNull(),
  condition: text().notNull(), // JSON格式的条件表达式
  
  // 规则动作
  action: text().notNull(), // JSON格式的动作定义
  
  // 规则优先级
  priority: int().default(0),
  
  // 状态
  isActive: mysqlEnum(['yes', 'no']).default('yes').notNull(),
  
  createdBy: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedBy: int(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_rule_code').on(table.ruleCode),
  index('idx_document_type').on(table.documentType),
  index('idx_priority').on(table.priority),
]);

/**
 * 审批统计表
 * 存储审批相关的统计数据
 */
export const approvalStatistics = mysqlTable('approval_statistics', {
  id: int().autoincrement().notNull(),
  statisticDate: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  
  // 待审批统计
  pendingTasksCount: int().default(0),
  overdueTasksCount: int().default(0),
  
  // 审批效率
  averageApprovalTime: int(), // 平均审批时间（分钟）
  rejectionRate: int(), // 拒绝率（百分比）
  
  // 审批人统计
  approverCount: int().default(0),
  topApprover: varchar({ length: 100 }),
  
  // 文档类型统计
  documentTypeStats: text(), // JSON格式的统计数据
  
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index('idx_statistic_date').on(table.statisticDate),
]);

/**
 * 审批委托表
 * 记录审批权限的委托
 */
export const approvalDelegations = mysqlTable('approval_delegations', {
  id: int().autoincrement().notNull(),
  delegationCode: varchar({ length: 50 }).notNull(),
  
  // 委托人
  delegatedFrom: int().notNull(),
  delegatedFromName: varchar({ length: 100 }),
  
  // 被委托人
  delegatedTo: int().notNull(),
  delegatedToName: varchar({ length: 100 }),
  
  // 委托范围
  documentTypes: text().notNull(), // JSON array
  approvalLevels: text(), // JSON array
  
  // 委托期限
  startDate: timestamp({ mode: 'string' }).notNull(),
  endDate: timestamp({ mode: 'string' }).notNull(),
  
  // 状态
  status: mysqlEnum(['active', 'expired', 'cancelled']).default('active').notNull(),
  
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_delegation_code').on(table.delegationCode),
  index('idx_delegated_from').on(table.delegatedFrom),
  index('idx_delegated_to').on(table.delegatedTo),
]);
