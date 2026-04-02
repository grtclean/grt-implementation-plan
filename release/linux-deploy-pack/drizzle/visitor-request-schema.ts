/**
 * 客户来访申请系统数据库Schema定义
 * 支持多国家规则、审批流程、来访证生成
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  decimal,
  index,
} from 'drizzle-orm/pg-core';

/**
 * 来访申请表
 */
export const visitorRequests = pgTable(
  'grt_visitor_requests',
  {
    id: serial().primaryKey(),

    // 申请者信息
    applicantName: varchar('applicant_name', { length: 128 }).notNull(),
    applicantId: varchar('applicant_id', { length: 64 }).notNull(),
    applicantEmail: varchar('applicant_email', { length: 128 }).notNull(),
    applicantPhone: varchar('applicant_phone', { length: 32 }).notNull(),
    applicantCompany: varchar('applicant_company', { length: 256 }),
    applicantPosition: varchar('applicant_position', { length: 128 }),

    // 来访信息
    visitPurpose: text('visit_purpose').notNull(),
    visitDate: timestamp('visit_date').notNull(),
    visitEndDate: timestamp('visit_end_date'),
    estimatedDuration: integer('estimated_duration'), // 分钟
    numberOfVisitors: integer('number_of_visitors').default(1),

    // 工厂和地点信息
    factoryId: integer('factory_id').notNull(),
    factoryName: varchar('factory_name', { length: 256 }).notNull(),
    country: varchar('country', { length: 64 }).notNull(), // 国家代码：CN, US, DE等
    region: varchar('region', { length: 128 }),
    department: varchar('department', { length: 128 }),
    area: varchar('area', { length: 256 }), // 具体区域/车间

    // 访问权限
    needsFactoryAccess: boolean('needs_factory_access').default(false),
    needsProductionFloor: boolean('needs_production_floor').default(false),
    needsLabAccess: boolean('needs_lab_access').default(false),
    needsOfficeAccess: boolean('needs_office_access').default(true),
    accessLevel: varchar('access_level', { length: 50 }).default('public'),

    // 联系人信息
    contactPersonId: varchar('contact_person_id', { length: 64 }).notNull(),
    contactPersonName: varchar('contact_person_name', { length: 128 }).notNull(),
    contactPersonEmail: varchar('contact_person_email', { length: 128 }).notNull(),
    contactPersonPhone: varchar('contact_person_phone', { length: 32 }).notNull(),

    // 审批信息
    supervisorId: varchar('supervisor_id', { length: 64 }), // 直接主管
    supervisorName: varchar('supervisor_name', { length: 128 }),
    approvalStatus: varchar('approval_status', { length: 50 }).default('draft'),
    approvalNotes: text('approval_notes'),
    rejectionReason: text('rejection_reason'),

    // 来访证信息
    visitorPassId: varchar('visitor_pass_id', { length: 64 }),
    visitorPassCode: varchar('visitor_pass_code', { length: 128 }),
    visitorPassQrCode: text('visitor_pass_qr_code'),
    passGeneratedAt: timestamp('pass_generated_at'),
    passExpiresAt: timestamp('pass_expires_at'),

    // 安全信息
    backgroundCheckRequired: boolean('background_check_required').default(false),
    backgroundCheckStatus: varchar('background_check_status', { length: 50 }).default('not_required'),
    nda_signed: boolean('nda_signed').default(false),
    ndaSignedAt: timestamp('nda_signed_at'),

    // 国家特定规则
    countryRules: json('country_rules'), // 存储该国家适用的规则版本

    // 状态
    status: varchar('status', { length: 50 }).default('active'),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    submittedAt: timestamp('submitted_at'),
    approvedAt: timestamp('approved_at'),
  },
  (table) => ({
    applicantIdIdx: index('visitor_applicant_id_idx').on(table.applicantId),
    factoryIdIdx: index('visitor_factory_id_idx').on(table.factoryId),
    visitDateIdx: index('visitor_visit_date_idx').on(table.visitDate),
    approvalStatusIdx: index('visitor_approval_status_idx').on(table.approvalStatus),
    countryIdx: index('visitor_country_idx').on(table.country),
  })
);

/**
 * 来访者详情表
 * 记录每个来访者的具体信息
 */
export const visitorDetails = pgTable(
  'grt_visitor_details',
  {
    id: serial().primaryKey(),

    // 关联信息
    requestId: integer('request_id').notNull(),

    // 来访者信息
    visitorName: varchar('visitor_name', { length: 128 }).notNull(),
    visitorId: varchar('visitor_id', { length: 64 }).notNull(),
    visitorEmail: varchar('visitor_email', { length: 128 }),
    visitorPhone: varchar('visitor_phone', { length: 32 }),
    visitorCompany: varchar('visitor_company', { length: 256 }),
    visitorPosition: varchar('visitor_position', { length: 128 }),

    // 身份信息
    idType: varchar('id_type', { length: 32 }), // passport, id_card, driver_license等
    idNumber: varchar('id_number', { length: 64 }),
    nationality: varchar('nationality', { length: 64 }),

    // 来访证
    visitorPassId: varchar('visitor_pass_id', { length: 64 }),
    passCode: varchar('pass_code', { length: 128 }),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    requestIdIdx: index('visitor_detail_request_id_idx').on(table.requestId),
    visitorIdIdx: index('visitor_detail_visitor_id_idx').on(table.visitorId),
  })
);

/**
 * 审批流程表
 * 记录来访申请的审批历史
 */
export const approvalWorkflows = pgTable(
  'grt_approval_workflows',
  {
    id: serial().primaryKey(),

    // 关联信息
    requestId: integer('request_id').notNull(),

    // 审批步骤
    stepNumber: integer('step_number').notNull(),
    stepName: varchar('step_name', { length: 128 }).notNull(),
    approverRole: varchar('approver_role', { length: 128 }).notNull(),

    // 审批者信息
    approverId: varchar('approver_id', { length: 64 }),
    approverName: varchar('approver_name', { length: 128 }),
    approverEmail: varchar('approver_email', { length: 128 }),

    // 审批状态
    status: varchar('status', { length: 50 }).default('pending'),
    comments: text('comments'),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    requestIdIdx: index('approval_request_id_idx').on(table.requestId),
    stepNumberIdx: index('approval_step_number_idx').on(table.stepNumber),
  })
);

/**
 * 来访证表
 * 存储生成的来访证信息
 */
export const visitorPasses = pgTable(
  'grt_visitor_passes',
  {
    id: serial().primaryKey(),

    // 关联信息
    requestId: integer('request_id').notNull(),
    visitorDetailId: integer('visitor_detail_id').notNull(),

    // 证件信息
    passCode: varchar('pass_code', { length: 128 }).notNull().unique(),
    qrCode: text('qr_code').notNull(),
    barCode: text('bar_code'),

    // 访问权限
    accessLevel: varchar('access_level', { length: 50 }).default('public'),
    allowedAreas: json('allowed_areas'), // 允许访问的区域列表
    restrictions: text('restrictions'), // 访问限制说明

    // 有效期
    issuedAt: timestamp('issued_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    isActive: boolean('is_active').default(true),

    // 使用记录
    checkedInAt: timestamp('checked_in_at'),
    checkedOutAt: timestamp('checked_out_at'),
    checkedInBy: varchar('checked_in_by', { length: 64 }),
    checkedOutBy: varchar('checked_out_by', { length: 64 }),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    requestIdIdx: index('pass_request_id_idx').on(table.requestId),
    passCodeIdx: index('pass_code_idx').on(table.passCode),
    expiresAtIdx: index('pass_expires_at_idx').on(table.expiresAt),
  })
);

/**
 * 国家规则表
 * 定义不同国家的来访规则
 */
export const countryRules = pgTable(
  'grt_country_rules',
  {
    id: serial().primaryKey(),

    // 国家信息
    countryCode: varchar('country_code', { length: 8 }).notNull().unique(), // CN, US, DE等
    countryName: varchar('country_name', { length: 128 }).notNull(),
    region: varchar('region', { length: 128 }),

    // 规则版本
    ruleVersion: varchar('rule_version', { length: 32 }).notNull(),
    effectiveDate: timestamp('effective_date').notNull(),
    expiryDate: timestamp('expiry_date'),

    // 审批流程
    approvalSteps: json('approval_steps').notNull(), // 审批步骤配置
    requiresBackgroundCheck: boolean('requires_background_check').default(false),
    requiresNda: boolean('requires_nda').default(false),
    requiresVisa: boolean('requires_visa').default(false),

    // 访问权限
    defaultAccessLevel: varchar('default_access_level', { length: 50 }).default('public'),
    allowFactoryAccess: boolean('allow_factory_access').default(false),
    allowProductionFloor: boolean('allow_production_floor').default(false),
    allowLabAccess: boolean('allow_lab_access').default(false),

    // 时间限制
    maxVisitDuration: integer('max_visit_duration'), // 天数
    maxVisitorsPerRequest: integer('max_visitors_per_request').default(10),
    advanceNoticeRequired: integer('advance_notice_required').default(3), // 天数

    // 其他规则
    rules: json('rules'), // 额外的国家特定规则
    description: text('description'),

    // 状态
    isActive: boolean('is_active').default(true),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    countryCodeIdx: index('country_rules_code_idx').on(table.countryCode),
    effectiveDateIdx: index('country_rules_effective_date_idx').on(table.effectiveDate),
  })
);

/**
 * 访问日志表
 * 记录来访者的进出记录
 */
export const accessLogs = pgTable(
  'grt_access_logs',
  {
    id: serial().primaryKey(),

    // 关联信息
    visitorPassId: integer('visitor_pass_id').notNull(),
    requestId: integer('request_id').notNull(),

    // 访问信息
    accessType: varchar('access_type', { length: 50 }).notNull(),
    area: varchar('area', { length: 256 }),
    location: varchar('location', { length: 256 }),

    // 操作人员
    operatorId: varchar('operator_id', { length: 64 }),
    operatorName: varchar('operator_name', { length: 128 }),

    // 时间戳
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    notes: text('notes'),
  },
  (table) => ({
    visitorPassIdIdx: index('access_log_pass_id_idx').on(table.visitorPassId),
    requestIdIdx: index('access_log_request_id_idx').on(table.requestId),
    timestampIdx: index('access_log_timestamp_idx').on(table.timestamp),
  })
);

/**
 * 导出类型定义
 */
export type VisitorRequest = typeof visitorRequests.$inferSelect;
export type VisitorDetail = typeof visitorDetails.$inferSelect;
export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type VisitorPass = typeof visitorPasses.$inferSelect;
export type CountryRule = typeof countryRules.$inferSelect;
export type AccessLog = typeof accessLogs.$inferSelect;
