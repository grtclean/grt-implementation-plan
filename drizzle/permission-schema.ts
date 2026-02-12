/**
 * 权限系统数据库Schema定义
 * 包含用户、角色、权限、数据范围等完整权限管理体系
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  mysqlEnum,
  json,
  primaryKey,
  foreignKey,
  index,
} from 'drizzle-orm/mysql-core';

/**
 * 扩展User表 - 添加权限相关字段
 * 注意：这个表应该与现有的users表合并或扩展
 */
export const userPermissions = mysqlTable(
  'grt_user_permissions',
  {
    id: int().autoincrement().primaryKey(),

    // 用户关联
    userId: varchar('user_id', { length: 64 }).notNull(),

    // 基本权限信息
    role: mysqlEnum('role', [
      'admin',
      'development_specialist',
      'development_engineer',
      'sales_manager',
      'project_manager',
      'engineer',
      'field_service_engineer',
      'procurement_officer',
      'finance_officer',
      'hr_specialist',
      'guest',
      'external_customer',
      'external_technical',
    ]).notNull(),

    // 部门信息
    department: varchar('department', { length: 64 }),
    departmentId: varchar('department_id', { length: 64 }),

    // 数据范围
    dataScope: mysqlEnum('data_scope', [
      'global',
      'department',
      'team',
      'self',
      'project',
      'customer',
    ]).default('self'),

    // 权限标签（JSON数组）
    permissionTags: json('permission_tags'),

    // 状态
    isActive: boolean('is_active').default(true),
    isLocked: boolean('is_locked').default(false),

    // 凭证认证
    qualificationCertificates: json('qualification_certificates'), // 认证列表

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    lastLoginAt: timestamp('last_login_at'),
    lockedAt: timestamp('locked_at'),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    roleIdx: index('role_idx').on(table.role),
    departmentIdx: index('department_idx').on(table.department),
  })
);

/**
 * 角色表
 * 定义系统中的所有角色及其基本属性
 */
export const roles = mysqlTable(
  'grt_roles',
  {
    id: int().autoincrement().primaryKey(),

    // 角色基本信息
    name: varchar('name', { length: 64 }).notNull().unique(),
    displayName: varchar('display_name', { length: 128 }).notNull(),
    description: text('description'),

    // 角色类型
    roleType: mysqlEnum('role_type', [
      'system',    // 系统内置角色
      'department', // 部门角色
      'custom',    // 自定义角色
    ]).default('custom'),

    // 数据范围
    defaultDataScope: mysqlEnum('default_data_scope', [
      'global',
      'department',
      'team',
      'self',
      'project',
      'customer',
    ]).default('self'),

    // 状态
    isActive: boolean('is_active').default(true),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    nameIdx: index('role_name_idx').on(table.name),
  })
);

/**
 * 权限表
 * 定义系统中的所有权限
 */
export const permissions = mysqlTable(
  'grt_permissions',
  {
    id: int().autoincrement().primaryKey(),

    // 权限基本信息
    code: varchar('code', { length: 128 }).notNull().unique(), // 权限编码（如 user:create）
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description'),

    // 权限分类
    category: varchar('category', { length: 64 }).notNull(), // 如 user, project, crm等
    module: varchar('module', { length: 64 }).notNull(), // 所属模块

    // 权限操作
    action: mysqlEnum('action', [
      'create',
      'read',
      'update',
      'delete',
      'export',
      'import',
      'approve',
      'reject',
      'execute',
      'admin',
    ]).notNull(),

    // 权限级别
    level: int('level').default(1), // 1=基础, 2=中级, 3=高级, 4=管理员

    // 状态
    isActive: boolean('is_active').default(true),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    codeIdx: index('permission_code_idx').on(table.code),
    categoryIdx: index('permission_category_idx').on(table.category),
  })
);

/**
 * 角色权限关联表
 * 定义每个角色拥有的权限
 */
export const rolePermissions = mysqlTable(
  'grt_role_permissions',
  {
    id: int().autoincrement().primaryKey(),

    // 关联信息
    roleId: int('role_id').notNull(),
    permissionId: int('permission_id').notNull(),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    rolePermissionPk: primaryKey({
      name: 'role_permission_pk',
      columns: [table.roleId, table.permissionId],
    }),
    roleIdIdx: index('role_id_idx').on(table.roleId),
    permissionIdIdx: index('permission_id_idx').on(table.permissionId),
  })
);

/**
 * 用户角色关联表
 * 定义每个用户拥有的角色
 */
export const userRoles = mysqlTable(
  'grt_user_roles',
  {
    id: int().autoincrement().primaryKey(),

    // 关联信息
    userId: varchar('user_id', { length: 64 }).notNull(),
    roleId: int('role_id').notNull(),

    // 有效期
    startDate: timestamp('start_date').defaultNow(),
    endDate: timestamp('end_date'),

    // 状态
    isActive: boolean('is_active').default(true),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    roleIdIdx: index('role_id_idx').on(table.roleId),
  })
);

/**
 * 数据范围表
 * 定义数据访问的范围限制
 */
export const dataScopes = mysqlTable(
  'grt_data_scopes',
  {
    id: int().autoincrement().primaryKey(),

    // 范围定义
    scopeType: mysqlEnum('scope_type', [
      'global',
      'department',
      'team',
      'self',
      'project',
      'customer',
    ]).notNull(),

    // 关联信息
    userId: varchar('user_id', { length: 64 }),
    roleId: int('role_id'),
    departmentId: varchar('department_id', { length: 64 }),

    // 范围限制
    allowedDepartments: json('allowed_departments'), // 允许访问的部门ID列表
    allowedTeams: json('allowed_teams'),             // 允许访问的团队ID列表
    allowedProjects: json('allowed_projects'),       // 允许访问的项目ID列表
    allowedCustomers: json('allowed_customers'),     // 允许访问的客户ID列表

    // 状态
    isActive: boolean('is_active').default(true),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('data_scope_user_id_idx').on(table.userId),
    roleIdIdx: index('data_scope_role_id_idx').on(table.roleId),
  })
);

/**
 * 权限审计日志表
 * 记录所有权限相关的操作
 */
export const permissionAuditLogs = mysqlTable(
  'grt_permission_audit_logs',
  {
    id: int().autoincrement().primaryKey(),

    // 操作者信息
    operatorId: varchar('operator_id', { length: 64 }).notNull(),
    operatorName: varchar('operator_name', { length: 128 }),

    // 操作信息
    action: varchar('action', { length: 64 }).notNull(), // 如 grant_permission, revoke_permission等
    actionType: mysqlEnum('action_type', [
      'grant_permission',
      'revoke_permission',
      'create_role',
      'update_role',
      'delete_role',
      'assign_role',
      'revoke_role',
      'access_denied',
      'data_access',
    ]).notNull(),

    // 目标信息
    targetUserId: varchar('target_user_id', { length: 64 }),
    targetRoleId: int('target_role_id'),
    targetPermissionId: int('target_permission_id'),

    // 操作详情
    details: json('details'),
    result: mysqlEnum('result', ['success', 'denied', 'error']).notNull(),
    reason: text('reason'),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    operatorIdIdx: index('audit_operator_id_idx').on(table.operatorId),
    targetUserIdIdx: index('audit_target_user_id_idx').on(table.targetUserId),
    actionTypeIdx: index('audit_action_type_idx').on(table.actionType),
    createdAtIdx: index('audit_created_at_idx').on(table.createdAt),
  })
);

/**
 * 临时权限表
 * 管理临时权限提升和特殊访问权限
 */
export const temporaryPermissions = mysqlTable(
  'grt_temporary_permissions',
  {
    id: int().autoincrement().primaryKey(),

    // 用户信息
    userId: varchar('user_id', { length: 64 }).notNull(),

    // 权限信息
    permissionId: int('permission_id'),
    roleId: int('role_id'),

    // 有效期
    startDate: timestamp('start_date').defaultNow().notNull(),
    endDate: timestamp('end_date').notNull(),

    // 原因和审批
    reason: text('reason'),
    approvedBy: varchar('approved_by', { length: 64 }),
    approvalDate: timestamp('approval_date'),

    // 状态
    status: mysqlEnum('status', [
      'pending',
      'approved',
      'rejected',
      'expired',
      'revoked',
    ]).default('pending'),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('temp_perm_user_id_idx').on(table.userId),
    endDateIdx: index('temp_perm_end_date_idx').on(table.endDate),
  })
);

/**
 * 凭证认证表
 * 管理用户的各类认证和证书
 */
export const qualificationCertificates = mysqlTable(
  'grt_qualification_certificates',
  {
    id: int().autoincrement().primaryKey(),

    // 用户信息
    userId: varchar('user_id', { length: 64 }).notNull(),

    // 认证信息
    certificateCode: varchar('certificate_code', { length: 128 }).notNull(),
    certificateName: varchar('certificate_name', { length: 256 }).notNull(),
    certificateLevel: varchar('certificate_level', { length: 32 }), // 如 L1, L2, L3等

    // 有效期
    issueDate: timestamp('issue_date').notNull(),
    expiryDate: timestamp('expiry_date'),

    // 发证机构
    issuingOrganization: varchar('issuing_organization', { length: 256 }),

    // 认证详情
    description: text('description'),
    certificateNumber: varchar('certificate_number', { length: 128 }),

    // 状态
    status: mysqlEnum('status', [
      'active',
      'expired',
      'revoked',
      'suspended',
    ]).default('active'),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('cert_user_id_idx').on(table.userId),
    certificateCodeIdx: index('cert_code_idx').on(table.certificateCode),
  })
);

/**
 * 权限黑名单表
 * 管理被禁止访问的用户和资源
 */
export const permissionBlacklist = mysqlTable(
  'grt_permission_blacklist',
  {
    id: int().autoincrement().primaryKey(),

    // 黑名单类型
    blacklistType: mysqlEnum('blacklist_type', [
      'user',
      'ip',
      'email',
      'department',
    ]).notNull(),

    // 黑名单值
    blacklistValue: varchar('blacklist_value', { length: 256 }).notNull(),

    // 黑名单原因
    reason: text('reason'),

    // 有效期
    startDate: timestamp('start_date').defaultNow().notNull(),
    endDate: timestamp('end_date'),

    // 状态
    isActive: boolean('is_active').default(true),

    // 操作者
    createdBy: varchar('created_by', { length: 64 }),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    blacklistValueIdx: index('blacklist_value_idx').on(table.blacklistValue),
    blacklistTypeIdx: index('blacklist_type_idx').on(table.blacklistType),
  })
);

/**
 * 权限配置表
 * 存储系统级别的权限配置
 */
export const permissionConfigs = mysqlTable(
  'grt_permission_configs',
  {
    id: int().autoincrement().primaryKey(),

    // 配置键
    configKey: varchar('config_key', { length: 128 }).notNull().unique(),
    configValue: json('config_value').notNull(),

    // 配置描述
    description: text('description'),

    // 配置类型
    configType: varchar('config_type', { length: 64 }), // 如 security, audit等

    // 状态
    isActive: boolean('is_active').default(true),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    configKeyIdx: index('config_key_idx').on(table.configKey),
  })
);

/**
 * 导出类型定义
 */
export type UserPermission = typeof userPermissions.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type DataScope = typeof dataScopes.$inferSelect;
export type PermissionAuditLog = typeof permissionAuditLogs.$inferSelect;
export type TemporaryPermission = typeof temporaryPermissions.$inferSelect;
export type QualificationCertificate = typeof qualificationCertificates.$inferSelect;
export type PermissionBlacklist = typeof permissionBlacklist.$inferSelect;
export type PermissionConfig = typeof permissionConfigs.$inferSelect;
