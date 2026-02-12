/**
 * 通用审批流程引擎Schema定义
 * 基于杰瑞德ERP流程图设计，支持多种业务类型审批
 * 
 * 支持的审批类型：
 * - lead_assignment: 线索分配审批（销售经理/GM）
 * - opportunity_proposal: 商机方案审批（事业部部长→GM）
 * - contract_signing: 合同签订审批（技术协议确认）
 * - purchase_order: 采购订单审批（多级审批）
 * - project_approval: 项目立项审批
 * - design_review: 设计评审审批
 * - production_release: 生产放行审批
 * - red_blue_config: 红蓝对抗配置审批
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  decimal,
  index,
  mysqlEnum,
  datetime,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

/**
 * 审批流程模板表
 * 定义不同业务类型的审批流程模板
 */
export const approvalTemplates = mysqlTable(
  'grt_approval_templates',
  {
    id: int().autoincrement().primaryKey(),
    
    // 模板标识
    templateCode: varchar('template_code', { length: 64 }).notNull().unique(),
    templateName: varchar('template_name', { length: 128 }).notNull(),
    
    // 业务类型
    businessType: mysqlEnum('business_type', [
      'lead_assignment',      // 线索分配
      'opportunity_proposal', // 商机方案
      'contract_signing',     // 合同签订
      'purchase_order',       // 采购订单
      'project_approval',     // 项目立项
      'design_review',        // 设计评审
      'production_release',   // 生产放行
      'red_blue_config',      // 红蓝对抗配置
      'expense_claim',        // 费用报销
      'leave_request',        // 请假申请
      'other',                // 其他
    ]).notNull(),
    
    // 模板配置
    description: text('description'),
    
    // 审批步骤配置（JSON数组）
    // 格式: [{ stepNumber, stepName, approverRole, approverType, conditions, timeout }]
    steps: json('steps').notNull(),
    
    // 条件规则（JSON）
    // 格式: { amountThreshold, departmentRules, urgencyRules }
    conditionRules: json('condition_rules'),
    
    // 通知配置（JSON）
    // 格式: { notifyOnSubmit, notifyOnApprove, notifyOnReject, emailTemplate }
    notificationConfig: json('notification_config'),
    
    // 超时配置
    defaultTimeoutHours: int('default_timeout_hours').default(48),
    autoApproveOnTimeout: boolean('auto_approve_on_timeout').default(false),
    escalateOnTimeout: boolean('escalate_on_timeout').default(true),
    
    // 状态
    isActive: boolean('is_active').default(true),
    version: varchar('version', { length: 20 }).default('1.0'),
    
    // 创建信息
    createdBy: int('created_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    templateCodeIdx: index('approval_template_code_idx').on(table.templateCode),
    businessTypeIdx: index('approval_template_business_type_idx').on(table.businessType),
  })
);

/**
 * 审批实例表
 * 记录每个具体的审批请求
 */
export const approvalInstances = mysqlTable(
  'grt_approval_instances',
  {
    id: int().autoincrement().primaryKey(),
    
    // 实例标识
    instanceCode: varchar('instance_code', { length: 64 }).notNull().unique(),
    
    // 关联模板
    templateId: int('template_id').notNull(),
    templateCode: varchar('template_code', { length: 64 }).notNull(),
    businessType: varchar('business_type', { length: 64 }).notNull(),
    
    // 关联业务
    businessId: varchar('business_id', { length: 64 }).notNull(), // 关联的业务记录ID
    businessTable: varchar('business_table', { length: 64 }).notNull(), // 关联的业务表名
    businessTitle: varchar('business_title', { length: 256 }), // 业务标题
    
    // 申请人信息
    applicantId: int('applicant_id').notNull(),
    applicantName: varchar('applicant_name', { length: 128 }).notNull(),
    applicantDepartment: varchar('applicant_department', { length: 128 }),
    
    // 审批内容摘要
    summary: text('summary'),
    
    // 金额（如适用）
    amount: decimal('amount', { precision: 15, scale: 2 }),
    currency: varchar('currency', { length: 8 }).default('CNY'),
    
    // 紧急程度
    urgency: mysqlEnum('urgency', ['low', 'normal', 'high', 'urgent']).default('normal'),
    
    // 审批状态
    status: mysqlEnum('status', [
      'draft',           // 草稿
      'pending',         // 待审批
      'in_progress',     // 审批中
      'approved',        // 已批准
      'rejected',        // 已拒绝
      'cancelled',       // 已取消
      'withdrawn',       // 已撤回
      'expired',         // 已过期
    ]).default('draft'),
    
    // 当前步骤
    currentStep: int('current_step').default(1),
    totalSteps: int('total_steps').notNull(),
    
    // 当前审批人
    currentApproverId: int('current_approver_id'),
    currentApproverName: varchar('current_approver_name', { length: 128 }),
    
    // 最终结果
    finalResult: mysqlEnum('final_result', ['approved', 'rejected']),
    finalComment: text('final_comment'),
    
    // 附件
    attachments: json('attachments'), // JSON数组: [{ name, url, type }]
    
    // 时间戳
    submittedAt: timestamp('submitted_at'),
    completedAt: timestamp('completed_at'),
    dueDate: timestamp('due_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    instanceCodeIdx: index('approval_instance_code_idx').on(table.instanceCode),
    templateIdIdx: index('approval_instance_template_idx').on(table.templateId),
    businessIdIdx: index('approval_instance_business_idx').on(table.businessId),
    applicantIdIdx: index('approval_instance_applicant_idx').on(table.applicantId),
    statusIdx: index('approval_instance_status_idx').on(table.status),
  })
);

/**
 * 审批步骤记录表
 * 记录每个审批步骤的执行情况
 */
export const approvalStepRecords = mysqlTable(
  'grt_approval_step_records',
  {
    id: int().autoincrement().primaryKey(),
    
    // 关联实例
    instanceId: int('instance_id').notNull(),
    instanceCode: varchar('instance_code', { length: 64 }).notNull(),
    
    // 步骤信息
    stepNumber: int('step_number').notNull(),
    stepName: varchar('step_name', { length: 128 }).notNull(),
    
    // 审批人角色
    approverRole: varchar('approver_role', { length: 64 }).notNull(),
    approverType: mysqlEnum('approver_type', [
      'user',           // 指定用户
      'role',           // 指定角色
      'department_head', // 部门负责人
      'supervisor',     // 直接上级
      'gm',             // 总经理
      'auto',           // 自动审批
    ]).default('user'),
    
    // 实际审批人
    approverId: int('approver_id'),
    approverName: varchar('approver_name', { length: 128 }),
    approverEmail: varchar('approver_email', { length: 128 }),
    
    // 审批状态
    status: mysqlEnum('status', [
      'pending',        // 待审批
      'approved',       // 已批准
      'rejected',       // 已拒绝
      'skipped',        // 已跳过
      'delegated',      // 已委托
      'timeout',        // 已超时
    ]).default('pending'),
    
    // 审批意见
    action: mysqlEnum('action', [
      'approve',        // 批准
      'reject',         // 拒绝
      'return',         // 退回
      'delegate',       // 委托
      'add_approver',   // 加签
    ]),
    comment: text('comment'),
    
    // 委托信息
    delegatedTo: int('delegated_to'),
    delegatedToName: varchar('delegated_to_name', { length: 128 }),
    delegateReason: text('delegate_reason'),
    
    // 时间信息
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    dueAt: timestamp('due_at'),
    completedAt: timestamp('completed_at'),
    
    // 处理时长（分钟）
    processingTime: int('processing_time'),
  },
  (table) => ({
    instanceIdIdx: index('approval_step_instance_idx').on(table.instanceId),
    approverIdIdx: index('approval_step_approver_idx').on(table.approverId),
    statusIdx: index('approval_step_status_idx').on(table.status),
  })
);

/**
 * 审批操作日志表
 * 记录所有审批相关的操作历史
 */
export const approvalActionLogs = mysqlTable(
  'grt_approval_action_logs',
  {
    id: int().autoincrement().primaryKey(),
    
    // 关联信息
    instanceId: int('instance_id').notNull(),
    stepRecordId: int('step_record_id'),
    
    // 操作信息
    action: mysqlEnum('action', [
      'submit',         // 提交
      'approve',        // 批准
      'reject',         // 拒绝
      'return',         // 退回
      'withdraw',       // 撤回
      'cancel',         // 取消
      'delegate',       // 委托
      'add_approver',   // 加签
      'remind',         // 催办
      'comment',        // 评论
      'attach',         // 添加附件
      'escalate',       // 升级
      'timeout',        // 超时
    ]).notNull(),
    
    // 操作人
    operatorId: int('operator_id').notNull(),
    operatorName: varchar('operator_name', { length: 128 }).notNull(),
    operatorRole: varchar('operator_role', { length: 64 }),
    
    // 操作详情
    previousStatus: varchar('previous_status', { length: 32 }),
    newStatus: varchar('new_status', { length: 32 }),
    comment: text('comment'),
    
    // 附加数据
    metadata: json('metadata'),
    
    // IP和设备信息
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    
    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    instanceIdIdx: index('approval_log_instance_idx').on(table.instanceId),
    operatorIdIdx: index('approval_log_operator_idx').on(table.operatorId),
    actionIdx: index('approval_log_action_idx').on(table.action),
    createdAtIdx: index('approval_log_created_at_idx').on(table.createdAt),
  })
);

/**
 * 审批委托表
 * 记录审批权限的委托关系
 */
export const approvalDelegations = mysqlTable(
  'grt_approval_delegations',
  {
    id: int().autoincrement().primaryKey(),
    
    // 委托人
    delegatorId: int('delegator_id').notNull(),
    delegatorName: varchar('delegator_name', { length: 128 }).notNull(),
    
    // 被委托人
    delegateeId: int('delegatee_id').notNull(),
    delegateeName: varchar('delegatee_name', { length: 128 }).notNull(),
    
    // 委托范围
    businessTypes: json('business_types'), // 委托的业务类型列表
    templateIds: json('template_ids'), // 委托的模板ID列表
    
    // 委托期限
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    
    // 委托原因
    reason: text('reason'),
    
    // 状态
    status: mysqlEnum('status', ['active', 'expired', 'cancelled']).default('active'),
    
    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    delegatorIdIdx: index('approval_delegation_delegator_idx').on(table.delegatorId),
    delegateeIdIdx: index('approval_delegation_delegatee_idx').on(table.delegateeId),
    statusIdx: index('approval_delegation_status_idx').on(table.status),
  })
);

/**
 * 红蓝对抗配置表
 * 存储红蓝对抗计划配置，支持持久化
 */
export const redBlueConfigs = mysqlTable(
  'grt_red_blue_configs',
  {
    id: int().autoincrement().primaryKey(),
    
    // 配置标识
    configCode: varchar('config_code', { length: 64 }).notNull().unique(),
    configName: varchar('config_name', { length: 128 }).notNull(),
    
    // 关联项目
    projectId: int('project_id'),
    projectCode: varchar('project_code', { length: 64 }),
    projectName: varchar('project_name', { length: 256 }),
    
    // 客户信息
    customerId: int('customer_id'),
    customerName: varchar('customer_name', { length: 256 }),
    customerTier: mysqlEnum('customer_tier', ['tier1', 'tier2', 'tier3', 'other']).default('other'),
    
    // 红队配置
    redTeamLeaderId: int('red_team_leader_id'),
    redTeamLeaderName: varchar('red_team_leader_name', { length: 128 }),
    redTeamMembers: json('red_team_members'), // [{ id, name, role }]
    redTeamObjectives: text('red_team_objectives'),
    redTeamScenarios: json('red_team_scenarios'), // 模拟场景列表
    
    // 蓝队配置
    blueTeamLeaderId: int('blue_team_leader_id'),
    blueTeamLeaderName: varchar('blue_team_leader_name', { length: 128 }),
    blueTeamMembers: json('blue_team_members'), // [{ id, name, role }]
    blueTeamObjectives: text('blue_team_objectives'),
    blueTeamResources: json('blue_team_resources'), // 可用资源列表
    
    // 对抗计划时间表
    schedule: json('schedule'), // [{ phase, name, startDate, endDate, description }]
    
    // 评估标准
    evaluationCriteria: json('evaluation_criteria'), // [{ criterion, weight, description }]
    
    // 触发条件
    triggerConditions: json('trigger_conditions'), // { customerTier, projectComplexity, isNonStandard, isCrossRegional }
    
    // 状态
    status: mysqlEnum('status', [
      'draft',          // 草稿
      'pending_approval', // 待审批
      'approved',       // 已批准
      'in_progress',    // 进行中
      'completed',      // 已完成
      'cancelled',      // 已取消
    ]).default('draft'),
    
    // 审批信息
    approvalInstanceId: int('approval_instance_id'),
    approvedBy: int('approved_by'),
    approvedAt: timestamp('approved_at'),
    
    // 结果记录
    results: json('results'), // 对抗结果记录
    lessonsLearned: text('lessons_learned'),
    improvementActions: json('improvement_actions'),
    
    // 创建信息
    createdBy: int('created_by').notNull(),
    createdByName: varchar('created_by_name', { length: 128 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    configCodeIdx: index('red_blue_config_code_idx').on(table.configCode),
    projectIdIdx: index('red_blue_project_idx').on(table.projectId),
    customerIdIdx: index('red_blue_customer_idx').on(table.customerId),
    statusIdx: index('red_blue_status_idx').on(table.status),
  })
);

/**
 * 红蓝对抗执行记录表
 * 记录每次对抗的执行情况
 */
export const redBlueExecutions = mysqlTable(
  'grt_red_blue_executions',
  {
    id: int().autoincrement().primaryKey(),
    
    // 关联配置
    configId: int('config_id').notNull(),
    configCode: varchar('config_code', { length: 64 }).notNull(),
    
    // 执行阶段
    phase: varchar('phase', { length: 64 }).notNull(),
    phaseName: varchar('phase_name', { length: 128 }).notNull(),
    
    // 执行时间
    scheduledStart: timestamp('scheduled_start'),
    scheduledEnd: timestamp('scheduled_end'),
    actualStart: timestamp('actual_start'),
    actualEnd: timestamp('actual_end'),
    
    // 红队行动
    redTeamActions: json('red_team_actions'), // [{ action, timestamp, result }]
    redTeamFindings: text('red_team_findings'),
    
    // 蓝队响应
    blueTeamResponses: json('blue_team_responses'), // [{ response, timestamp, effectiveness }]
    blueTeamPerformance: text('blue_team_performance'),
    
    // 评分
    redTeamScore: decimal('red_team_score', { precision: 5, scale: 2 }),
    blueTeamScore: decimal('blue_team_score', { precision: 5, scale: 2 }),
    
    // 发现的问题
    issuesFound: json('issues_found'), // [{ issue, severity, category }]
    
    // 状态
    status: mysqlEnum('status', [
      'scheduled',      // 已计划
      'in_progress',    // 进行中
      'completed',      // 已完成
      'cancelled',      // 已取消
    ]).default('scheduled'),
    
    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    configIdIdx: index('red_blue_exec_config_idx').on(table.configId),
    phaseIdx: index('red_blue_exec_phase_idx').on(table.phase),
    statusIdx: index('red_blue_exec_status_idx').on(table.status),
  })
);

/**
 * 导出类型定义
 */
export type ApprovalTemplate = typeof approvalTemplates.$inferSelect;
export type ApprovalInstance = typeof approvalInstances.$inferSelect;
export type ApprovalStepRecord = typeof approvalStepRecords.$inferSelect;
export type ApprovalActionLog = typeof approvalActionLogs.$inferSelect;
export type ApprovalDelegation = typeof approvalDelegations.$inferSelect;
export type RedBlueConfig = typeof redBlueConfigs.$inferSelect;
export type RedBlueExecution = typeof redBlueExecutions.$inferSelect;

export type NewApprovalTemplate = typeof approvalTemplates.$inferInsert;
export type NewApprovalInstance = typeof approvalInstances.$inferInsert;
export type NewApprovalStepRecord = typeof approvalStepRecords.$inferInsert;
export type NewApprovalActionLog = typeof approvalActionLogs.$inferInsert;
export type NewApprovalDelegation = typeof approvalDelegations.$inferInsert;
export type NewRedBlueConfig = typeof redBlueConfigs.$inferInsert;
export type NewRedBlueExecution = typeof redBlueExecutions.$inferInsert;
