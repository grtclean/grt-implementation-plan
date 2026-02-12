/**
 * GRT 5.0 权限验证中间件
 */

import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";
import { 
  Permission, 
  UserRole, 
  hasPermission, 
  hasAllPermissions, 
  hasAnyPermission,
  isRoleAtLeast 
} from "./config";

// 错误消息
const PERMISSION_DENIED_MSG = '您没有执行此操作的权限 (10003)';
const ROLE_REQUIRED_MSG = '您的角色级别不足 (10004)';

type MiddlewareOpts = { 
  ctx: TrpcContext; 
  next: (opts?: { ctx: TrpcContext }) => Promise<any>;
};

/**
 * 创建需要特定权限的中间件
 */
export function requirePermission(permission: Permission) {
  return async (opts: MiddlewareOpts) => {
    const { ctx, next } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
    }
    
    const userRole = (ctx.user.role || 'user') as UserRole;
    
    if (!hasPermission(userRole, permission)) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: PERMISSION_DENIED_MSG 
      });
    }
    
    return next({ ctx });
  };
}

/**
 * 创建需要所有指定权限的中间件
 */
export function requireAllPermissions(permissions: Permission[]) {
  return async (opts: MiddlewareOpts) => {
    const { ctx, next } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
    }
    
    const userRole = (ctx.user.role || 'user') as UserRole;
    
    if (!hasAllPermissions(userRole, permissions)) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: PERMISSION_DENIED_MSG 
      });
    }
    
    return next({ ctx });
  };
}

/**
 * 创建需要任一指定权限的中间件
 */
export function requireAnyPermission(permissions: Permission[]) {
  return async (opts: MiddlewareOpts) => {
    const { ctx, next } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
    }
    
    const userRole = (ctx.user.role || 'user') as UserRole;
    
    if (!hasAnyPermission(userRole, permissions)) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: PERMISSION_DENIED_MSG 
      });
    }
    
    return next({ ctx });
  };
}

/**
 * 创建需要最低角色级别的中间件
 */
export function requireRole(minRole: UserRole) {
  return async (opts: MiddlewareOpts) => {
    const { ctx, next } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
    }
    
    const userRole = (ctx.user.role || 'user') as UserRole;
    
    if (!isRoleAtLeast(userRole, minRole)) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: ROLE_REQUIRED_MSG 
      });
    }
    
    return next({ ctx });
  };
}
