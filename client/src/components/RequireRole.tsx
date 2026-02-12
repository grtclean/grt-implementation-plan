/**
 * GRT 5.0 角色权限控制组件
 * 
 * 用于保护需要特定角色权限的页面和组件
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, ShieldAlert } from "lucide-react";
import { ReactNode } from "react";
import { Redirect } from "wouter";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

// 角色类型
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

// 角色层级
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  manager: 3,
  user: 2,
  viewer: 1,
};

// 角色显示名称
const ROLE_NAMES: Record<UserRole, string> = {
  admin: '系统管理员',
  manager: '部门经理',
  user: '普通用户',
  viewer: '只读用户',
};

interface RequireRoleProps {
  children: ReactNode;
  minRole?: UserRole;
  allowedRoles?: UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

/**
 * 检查用户角色是否满足最低要求
 */
function isRoleAtLeast(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * 检查用户角色是否在允许列表中
 */
function isRoleAllowed(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * 访问被拒绝的默认UI
 */
function AccessDeniedCard({ 
  userRole, 
  minRole, 
  allowedRoles 
}: { 
  userRole: UserRole; 
  minRole?: UserRole; 
  allowedRoles?: UserRole[];
}) {
  const requiredRoleText = minRole 
    ? `需要 ${ROLE_NAMES[minRole]} 或更高权限`
    : allowedRoles 
      ? `需要以下角色之一: ${allowedRoles.map(r => ROLE_NAMES[r]).join('、')}`
      : '需要更高权限';

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full border-destructive/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-destructive">访问受限</CardTitle>
          <CardDescription>
            您没有访问此页面的权限
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <span className="font-medium">您的当前角色：</span>
              <span className="ml-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                {ROLE_NAMES[userRole]}
              </span>
            </p>
            <p>
              <span className="font-medium">访问要求：</span>
              <span className="ml-2 text-destructive">{requiredRoleText}</span>
            </p>
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              如需更高权限，请联系系统管理员
            </p>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.history.back()}
          >
            返回上一页
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 角色权限控制组件
 * 
 * @param minRole - 最低角色要求（角色层级检查）
 * @param allowedRoles - 允许的角色列表（精确匹配）
 * @param fallback - 权限不足时显示的自定义内容
 * @param redirectTo - 权限不足时重定向的路径
 * @param showAccessDenied - 是否显示访问被拒绝的默认UI（默认true）
 */
export function RequireRole({
  children,
  minRole,
  allowedRoles,
  fallback,
  redirectTo,
  showAccessDenied = true,
}: RequireRoleProps) {
  const { user, loading, isAuthenticated } = useAuth();

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 未登录
  if (!isAuthenticated || !user) {
    return <Redirect to="/" />;
  }

  const userRole = (user.role || 'user') as UserRole;

  // 检查权限
  let hasAccess = false;
  
  if (minRole) {
    hasAccess = isRoleAtLeast(userRole, minRole);
  } else if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = isRoleAllowed(userRole, allowedRoles);
  } else {
    // 如果没有指定权限要求，默认允许访问
    hasAccess = true;
  }

  // 权限不足
  if (!hasAccess) {
    // 重定向
    if (redirectTo) {
      return <Redirect to={redirectTo} />;
    }
    
    // 自定义fallback
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // 显示访问被拒绝UI
    if (showAccessDenied) {
      return (
        <AccessDeniedCard 
          userRole={userRole} 
          minRole={minRole} 
          allowedRoles={allowedRoles} 
        />
      );
    }
    
    // 不显示任何内容
    return null;
  }

  return <>{children}</>;
}

/**
 * 仅管理员可访问
 */
export function RequireAdmin({ children, ...props }: Omit<RequireRoleProps, 'minRole'>) {
  return (
    <RequireRole minRole="admin" {...props}>
      {children}
    </RequireRole>
  );
}

/**
 * 经理及以上可访问
 */
export function RequireManager({ children, ...props }: Omit<RequireRoleProps, 'minRole'>) {
  return (
    <RequireRole minRole="manager" {...props}>
      {children}
    </RequireRole>
  );
}

/**
 * 普通用户及以上可访问
 */
export function RequireUser({ children, ...props }: Omit<RequireRoleProps, 'minRole'>) {
  return (
    <RequireRole minRole="user" {...props}>
      {children}
    </RequireRole>
  );
}

export default RequireRole;
