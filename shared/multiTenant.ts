/**
 * GRT智能系统 - 多租户/多组织架构支持
 * 版本: v2.6.2
 * 
 * 规范：
 * - 所有Collection强制增加organization_id字段
 * - 支持超级管理员（GRT总部）与组织管理员（分公司/客户公司）层级
 * - RAG向量索引按organization_id物理隔离
 */

// 组织类型
export const ORGANIZATION_TYPES = ['headquarters', 'subsidiary', 'partner', 'customer'] as const;
export type OrganizationType = typeof ORGANIZATION_TYPES[number];

// 数据隔离级别
export const DATA_ISOLATION_LEVELS = ['strict', 'shared', 'hybrid'] as const;
export type DataIsolationLevel = typeof DATA_ISOLATION_LEVELS[number];

// 用户角色
export const USER_ROLES = [
  'super_admin',    // 超级管理员 - GRT总部
  'org_admin',      // 组织管理员 - 分公司/客户公司
  'dept_admin',     // 部门管理员
  'employee',       // 普通员工
  'customer',       // 客户用户
  'guest'           // 访客
] as const;
export type UserRole = typeof USER_ROLES[number];

// 组织接口
export interface Organization {
  id: number;
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  parentOrganizationId: string | null;
  region: string;
  timezone: string;
  defaultCurrency: string;
  defaultLanguage: string;
  dataIsolationLevel: DataIsolationLevel;
  storageQuotaGb: number;
  apiRateLimit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 租户上下文
export interface TenantContext {
  organizationId: string;
  organizationType: OrganizationType;
  userRole: UserRole;
  dataIsolationLevel: DataIsolationLevel;
  parentOrganizationId: string | null;
}

// 权限定义
export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  scope: 'global' | 'organization' | 'department' | 'self';
}

// 角色权限矩阵
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    { resource: '*', action: 'manage', scope: 'global' }
  ],
  org_admin: [
    { resource: 'users', action: 'manage', scope: 'organization' },
    { resource: 'projects', action: 'manage', scope: 'organization' },
    { resource: 'reports', action: 'manage', scope: 'organization' },
    { resource: 'settings', action: 'manage', scope: 'organization' },
    { resource: 'audit_logs', action: 'read', scope: 'organization' }
  ],
  dept_admin: [
    { resource: 'users', action: 'read', scope: 'department' },
    { resource: 'projects', action: 'manage', scope: 'department' },
    { resource: 'reports', action: 'manage', scope: 'department' },
    { resource: 'tasks', action: 'manage', scope: 'department' }
  ],
  employee: [
    { resource: 'projects', action: 'read', scope: 'organization' },
    { resource: 'tasks', action: 'manage', scope: 'self' },
    { resource: 'reports', action: 'create', scope: 'self' },
    { resource: 'knowledge_base', action: 'read', scope: 'organization' }
  ],
  customer: [
    { resource: 'projects', action: 'read', scope: 'self' },
    { resource: 'reports', action: 'read', scope: 'self' },
    { resource: 'knowledge_base', action: 'read', scope: 'self' }
  ],
  guest: [
    { resource: 'knowledge_base', action: 'read', scope: 'self' }
  ]
};

/**
 * 检查用户是否有权限执行操作
 */
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: Permission['action'],
  targetScope: Permission['scope']
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  
  return permissions.some(perm => {
    // 超级管理员拥有所有权限
    if (perm.resource === '*' && perm.action === 'manage' && perm.scope === 'global') {
      return true;
    }
    
    // 检查资源匹配
    if (perm.resource !== resource && perm.resource !== '*') {
      return false;
    }
    
    // 检查操作匹配（manage包含所有操作）
    if (perm.action !== action && perm.action !== 'manage') {
      return false;
    }
    
    // 检查范围匹配
    const scopeHierarchy = ['global', 'organization', 'department', 'self'];
    const permScopeIndex = scopeHierarchy.indexOf(perm.scope);
    const targetScopeIndex = scopeHierarchy.indexOf(targetScope);
    
    return permScopeIndex <= targetScopeIndex;
  });
}

/**
 * 获取用户可访问的组织ID列表
 */
export function getAccessibleOrganizations(
  userRole: UserRole,
  userOrganizationId: string,
  allOrganizations: Organization[]
): string[] {
  // 超级管理员可访问所有组织
  if (userRole === 'super_admin') {
    return allOrganizations.map(org => org.organizationId);
  }
  
  // 组织管理员可访问本组织及下属组织
  if (userRole === 'org_admin') {
    const accessibleOrgs = [userOrganizationId];
    
    // 递归获取下属组织
    const getChildOrgs = (parentId: string): string[] => {
      const children = allOrganizations
        .filter(org => org.parentOrganizationId === parentId)
        .map(org => org.organizationId);
      
      return children.concat(children.flatMap(getChildOrgs));
    };
    
    return accessibleOrgs.concat(getChildOrgs(userOrganizationId));
  }
  
  // 其他角色只能访问本组织
  return [userOrganizationId];
}

/**
 * 数据隔离规则
 */
export interface DataIsolationRule {
  level: DataIsolationLevel;
  database: 'separate_schema' | 'row_level_security';
  storage: 'separate_bucket' | 'prefix_isolation';
  vectorIndex: 'separate_index' | 'metadata_filter';
  encryption: 'tenant_key' | 'shared_key';
}

// 数据隔离规则配置
export const DATA_ISOLATION_RULES: Record<DataIsolationLevel, DataIsolationRule> = {
  strict: {
    level: 'strict',
    database: 'separate_schema',
    storage: 'separate_bucket',
    vectorIndex: 'separate_index',
    encryption: 'tenant_key'
  },
  shared: {
    level: 'shared',
    database: 'row_level_security',
    storage: 'prefix_isolation',
    vectorIndex: 'metadata_filter',
    encryption: 'shared_key'
  },
  hybrid: {
    level: 'hybrid',
    database: 'row_level_security',
    storage: 'prefix_isolation',
    vectorIndex: 'separate_index',
    encryption: 'tenant_key'
  }
};

/**
 * 获取RAG索引名称
 */
export function getRAGIndexName(organizationId: string, indexType: string): string {
  return `grt_rag_${organizationId}_${indexType}`;
}

/**
 * 验证组织ID格式
 */
export function isValidOrganizationId(organizationId: string): boolean {
  // 组织ID格式: 小写字母、数字、连字符，长度3-50
  const pattern = /^[a-z0-9-]{3,50}$/;
  return pattern.test(organizationId);
}

/**
 * 生成组织ID
 */
export function generateOrganizationId(name: string, type: OrganizationType): string {
  const prefix = type === 'headquarters' ? 'hq' : type.substring(0, 3);
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30);
  const timestamp = Date.now().toString(36).substring(-6);
  
  return `${prefix}-${slug}-${timestamp}`;
}

/**
 * 租户中间件配置
 */
export interface TenantMiddlewareConfig {
  headerName: string;
  queryParamName: string;
  cookieName: string;
  defaultOrganizationId: string;
  enforceIsolation: boolean;
}

// 默认租户中间件配置
export const DEFAULT_TENANT_MIDDLEWARE_CONFIG: TenantMiddlewareConfig = {
  headerName: 'X-Organization-ID',
  queryParamName: 'org_id',
  cookieName: 'grt_org_id',
  defaultOrganizationId: 'grt-headquarters',
  enforceIsolation: true
};

/**
 * 从请求中提取租户上下文
 */
export function extractTenantContext(
  headers: Record<string, string>,
  query: Record<string, string>,
  cookies: Record<string, string>,
  config: TenantMiddlewareConfig = DEFAULT_TENANT_MIDDLEWARE_CONFIG
): string {
  // 优先级: Header > Query > Cookie > Default
  return headers[config.headerName] ||
         query[config.queryParamName] ||
         cookies[config.cookieName] ||
         config.defaultOrganizationId;
}

/**
 * 核心数据分类（用于混合隔离模式）
 */
export const CORE_DATA_TABLES = [
  'grt_ai_solutions',           // AI方案
  'parts_catalog',              // 备件目录（含分级价格）
  'knowledge_base',             // 知识库（含核心工艺）
  'industrial_safety_rules',    // 工业安全规则
  'cleaning_algorithms'         // 清洗算法配方
] as const;

/**
 * 检查表是否为核心数据表
 */
export function isCoreDataTable(tableName: string): boolean {
  return CORE_DATA_TABLES.includes(tableName as any);
}
