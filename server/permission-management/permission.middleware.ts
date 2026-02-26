/**
 * 权限系统中间件
 * 用于tRPC路由的权限检查
 */

import { TRPCError } from '@trpc/server';
import { permissionService } from './permission.service';

/**
 * 权限检查中间件工厂函数
 * @param permissionCode 所需的权限编码
 */
export function createPermissionMiddleware(permissionCode: string) {
  return async ({ ctx, next }: any) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const hasPermission = await permissionService.checkPermission(
      ctx.user.openId || String(ctx.user.id),
      permissionCode
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have permission: ${permissionCode}`,
      });
    }

    return next({ ctx });
  };
}

/**
 * 角色检查中间件工厂函数
 * @param roleNames 允许的角色名称数组
 */
export function createRoleMiddleware(roleNames: string[]) {
  return async ({ ctx, next }: any) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    // Admin bypass: users with role='admin' in users table pass all role checks
    if (ctx.user.role === 'admin') {
      return next({ ctx });
    }

    let hasRole = false;
    for (const roleName of roleNames) {
      const result = await permissionService.checkRole(ctx.user.openId || String(ctx.user.id), roleName);
      if (result) {
        hasRole = true;
        break;
      }
    }

    if (!hasRole) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have required role. Required: ${roleNames.join(', ')}`,
      });
    }

    return next({ ctx });
  };
}

/**
 * 认证检查中间件工厂函数
 * @param certificateCode 所需的认证编码
 */
export function createCertificationMiddleware(certificateCode: string) {
  return async ({ ctx, next }: any) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const hasCertification = await permissionService.checkCertification(
      ctx.user.openId || String(ctx.user.id),
      certificateCode
    );

    if (!hasCertification) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have required certification: ${certificateCode}`,
      });
    }

    return next({ ctx });
  };
}

/**
 * 数据范围检查中间件
 * 用于限制用户访问的数据范围
 */
export function createDataScopeMiddleware() {
  return async ({ ctx, next }: any) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const dataScope = await permissionService.getUserDataScope(ctx.user.openId || String(ctx.user.id));
    ctx.dataScope = dataScope;

    return next({ ctx });
  };
}

/**
 * 权限日志中间件
 * 记录所有权限相关的操作
 */
export function createAuditMiddleware() {
  return async ({ ctx, next, meta }: any) => {
    const startTime = Date.now();

    try {
      const result = await next({ ctx });
      const duration = Date.now() - startTime;

      // 记录成功的操作
      if (ctx.user) {
        await permissionService.logAuditEvent(
          ctx.user.openId || String(ctx.user.id),
          meta?.operation || 'unknown',
          undefined,
          undefined,
          undefined,
          'success'
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // 记录失败的操作
      if (ctx.user) {
        await permissionService.logAuditEvent(
          ctx.user.openId || String(ctx.user.id),
          meta?.operation || 'unknown',
          undefined,
          undefined,
          undefined,
          'error',
          (error as any)?.message
        );
      }

      throw error;
    }
  };
}

/**
 * 组合中间件：权限 + 数据范围
 */
export function createPermissionAndDataScopeMiddleware(permissionCode: string) {
  return async ({ ctx, next }: any) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    // 检查权限
    const hasPermission = await permissionService.checkPermission(
      ctx.user.openId || String(ctx.user.id),
      permissionCode
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have permission: ${permissionCode}`,
      });
    }

    // 获取数据范围
    const dataScope = await permissionService.getUserDataScope(ctx.user.openId || String(ctx.user.id));
    ctx.dataScope = dataScope;

    return next({ ctx });
  };
}
