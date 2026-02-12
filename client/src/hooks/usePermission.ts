/**
 * GRT 5.0 权限检查 Hook
 * 
 * 提供便捷的权限检查功能
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo } from "react";

// 角色类型
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

// 权限类型
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

// 角色权限映射（与后端保持一致）
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
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

// 角色层级
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  manager: 3,
  user: 2,
  viewer: 1,
};

/**
 * 权限检查 Hook
 */
export function usePermission() {
  const { user, isAuthenticated } = useAuth();
  
  const userRole = useMemo(() => {
    if (!isAuthenticated || !user) return 'viewer' as UserRole;
    return (user.role || 'user') as UserRole;
  }, [user, isAuthenticated]);
  
  const permissions = useMemo(() => {
    return ROLE_PERMISSIONS[userRole] || [];
  }, [userRole]);
  
  /**
   * 检查是否有指定权限
   */
  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };
  
  /**
   * 检查是否有所有指定权限
   */
  const hasAllPermissions = (perms: Permission[]): boolean => {
    return perms.every(p => permissions.includes(p));
  };
  
  /**
   * 检查是否有任一指定权限
   */
  const hasAnyPermission = (perms: Permission[]): boolean => {
    return perms.some(p => permissions.includes(p));
  };
  
  /**
   * 检查角色是否满足最低要求
   */
  const isRoleAtLeast = (minRole: UserRole): boolean => {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
  };
  
  /**
   * 检查是否是管理员
   */
  const isAdmin = userRole === 'admin';
  
  /**
   * 检查是否是经理或以上
   */
  const isManager = isRoleAtLeast('manager');
  
  return {
    userRole,
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isRoleAtLeast,
    isAdmin,
    isManager,
    isAuthenticated,
  };
}

export default usePermission;
