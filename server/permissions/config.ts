/**
 * GRT 5.0 角色权限配置
 * 
 * 角色层级：
 * - admin: 系统管理员，拥有所有权限
 * - manager: 部门经理，可管理团队和审批
 * - user: 普通用户，可使用基础功能
 * - viewer: 只读用户，仅可查看数据
 */

// 角色类型定义
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

// 权限类型定义
export type Permission = 
  // 系统管理权限
  | 'system:admin'
  | 'system:config'
  | 'system:security'
  | 'system:deployment'
  
  // 用户管理权限
  | 'user:manage'
  | 'user:view'
  
  // 液态用工权限
  | 'liquid-workforce:admin'
  | 'liquid-workforce:manage'
  | 'liquid-workforce:bid'
  | 'liquid-workforce:view'
  
  // AI销售权限
  | 'ai-sales:admin'
  | 'ai-sales:negotiate'
  | 'ai-sales:view'
  
  // 门径管理权限
  | 'stage-gate:admin'
  | 'stage-gate:approve'
  | 'stage-gate:manage'
  | 'stage-gate:view'
  
  // 个人智能体权限
  | 'personal-agent:admin'
  | 'personal-agent:config'
  | 'personal-agent:use'
  | 'personal-agent:view'
  
  // 项目管理权限
  | 'project:admin'
  | 'project:manage'
  | 'project:edit'
  | 'project:view'
  
  // 社群管理权限
  | 'community:admin'
  | 'community:moderate'
  | 'community:reply'
  | 'community:view'
  
  // ERP集成权限
  | 'erp:admin'
  | 'erp:sync'
  | 'erp:view'
  
  // 培训管理权限
  | 'training:admin'
  | 'training:manage'
  | 'training:view';

// 角色权限映射
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // 管理员拥有所有权限
    'system:admin', 'system:config', 'system:security', 'system:deployment',
    'user:manage', 'user:view',
    'liquid-workforce:admin', 'liquid-workforce:manage', 'liquid-workforce:bid', 'liquid-workforce:view',
    'ai-sales:admin', 'ai-sales:negotiate', 'ai-sales:view',
    'stage-gate:admin', 'stage-gate:approve', 'stage-gate:manage', 'stage-gate:view',
    'personal-agent:admin', 'personal-agent:config', 'personal-agent:use', 'personal-agent:view',
    'project:admin', 'project:manage', 'project:edit', 'project:view',
    'community:admin', 'community:moderate', 'community:reply', 'community:view',
    'erp:admin', 'erp:sync', 'erp:view',
    'training:admin', 'training:manage', 'training:view',
  ],
  
  manager: [
    // 经理拥有管理和操作权限
    'user:view',
    'liquid-workforce:manage', 'liquid-workforce:bid', 'liquid-workforce:view',
    'ai-sales:negotiate', 'ai-sales:view',
    'stage-gate:approve', 'stage-gate:manage', 'stage-gate:view',
    'personal-agent:config', 'personal-agent:use', 'personal-agent:view',
    'project:manage', 'project:edit', 'project:view',
    'community:moderate', 'community:reply', 'community:view',
    'erp:sync', 'erp:view',
    'training:manage', 'training:view',
  ],
  
  user: [
    // 普通用户拥有基础操作权限
    'liquid-workforce:bid', 'liquid-workforce:view',
    'ai-sales:view',
    'stage-gate:view',
    'personal-agent:use', 'personal-agent:view',
    'project:edit', 'project:view',
    'community:reply', 'community:view',
    'erp:view',
    'training:view',
  ],
  
  viewer: [
    // 只读用户仅有查看权限
    'liquid-workforce:view',
    'ai-sales:view',
    'stage-gate:view',
    'personal-agent:view',
    'project:view',
    'community:view',
    'erp:view',
    'training:view',
  ],
};

// Hub页面权限配置
export const HUB_PAGE_PERMISSIONS: Record<string, {
  minRole: UserRole;
  requiredPermissions: Permission[];
  description: string;
}> = {
  '/liquid-workforce-hub': {
    minRole: 'viewer',
    requiredPermissions: ['liquid-workforce:view'],
    description: '液态用工中心',
  },
  '/liquid-workforce-enhanced': {
    minRole: 'viewer',
    requiredPermissions: ['liquid-workforce:view'],
    description: '液态用工增强版',
  },
  '/ai-sales-hub': {
    minRole: 'viewer',
    requiredPermissions: ['ai-sales:view'],
    description: 'AI销售中心',
  },
  '/ai-sales-enhanced': {
    minRole: 'viewer',
    requiredPermissions: ['ai-sales:view'],
    description: 'AI销售增强版',
  },
  '/stage-gate-hub': {
    minRole: 'viewer',
    requiredPermissions: ['stage-gate:view'],
    description: '门径管理中心',
  },
  '/stage-gate-enhanced': {
    minRole: 'viewer',
    requiredPermissions: ['stage-gate:view'],
    description: '门径管理增强版',
  },
  '/personal-agent-hub': {
    minRole: 'viewer',
    requiredPermissions: ['personal-agent:view'],
    description: '个人智能体中心',
  },
  '/personal-agent-enhanced': {
    minRole: 'viewer',
    requiredPermissions: ['personal-agent:view'],
    description: '个人智能体增强版',
  },
  '/project-hub': {
    minRole: 'viewer',
    requiredPermissions: ['project:view'],
    description: '项目中心',
  },
  '/project-enhanced': {
    minRole: 'viewer',
    requiredPermissions: ['project:view'],
    description: '项目增强版',
  },
  '/social-community-hub': {
    minRole: 'viewer',
    requiredPermissions: ['community:view'],
    description: '社群管理中心',
  },
  '/social-community-enhanced': {
    minRole: 'viewer',
    requiredPermissions: ['community:view'],
    description: '社群管理增强版',
  },
  '/security': {
    minRole: 'admin',
    requiredPermissions: ['system:security'],
    description: '安全监控',
  },
  '/system-deployment': {
    minRole: 'admin',
    requiredPermissions: ['system:deployment'],
    description: '系统部署',
  },
  '/admin/erp-configuration': {
    minRole: 'admin',
    requiredPermissions: ['erp:admin'],
    description: 'ERP配置',
  },
  '/admin/erp-connection': {
    minRole: 'admin',
    requiredPermissions: ['erp:admin'],
    description: 'ERP连接管理',
  },
  '/admin/webhooks': {
    minRole: 'admin',
    requiredPermissions: ['system:config'],
    description: 'Webhook管理',
  },
  '/admin/certificates': {
    minRole: 'admin',
    requiredPermissions: ['training:admin'],
    description: '证书模板',
  },
  '/training': {
    minRole: 'user',
    requiredPermissions: ['training:view'],
    description: '培训管理',
  },
};

// 检查用户是否有指定权限
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

// 检查用户是否有所有指定权限
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(userRole, p));
}

// 检查用户是否有任一指定权限
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(userRole, p));
}

// 获取用户所有权限
export function getUserPermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole] || [];
}

// 角色层级比较（返回true表示role1 >= role2）
export function isRoleAtLeast(role1: UserRole, role2: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    admin: 4,
    manager: 3,
    user: 2,
    viewer: 1,
  };
  return hierarchy[role1] >= hierarchy[role2];
}

// 检查页面访问权限
export function canAccessPage(userRole: UserRole, pagePath: string): boolean {
  const pageConfig = HUB_PAGE_PERMISSIONS[pagePath];
  if (!pageConfig) {
    // 未配置的页面默认允许访问
    return true;
  }
  
  // 检查角色层级
  if (!isRoleAtLeast(userRole, pageConfig.minRole)) {
    return false;
  }
  
  // 检查具体权限
  return hasAllPermissions(userRole, pageConfig.requiredPermissions);
}
