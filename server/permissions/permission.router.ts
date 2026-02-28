/**
 * Role Permission Router — fast config-based permission checks
 *
 * Registered as: appRouter.rolePermission
 * Role: Lightweight, in-memory permission query layer.
 *       Uses static ROLE_PERMISSIONS config (no DB calls).
 *       Ideal for client-side page access checks and menu filtering.
 *
 * Related routers:
 *   - permission (server/permission-management/) = DB-backed RBAC source of truth
 *   - permissionManagement (server/routers/) = admin collaboration features
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { 
  UserRole, 
  Permission,
  ROLE_PERMISSIONS, 
  HUB_PAGE_PERMISSIONS,
  getUserPermissions,
  canAccessPage,
  hasPermission,
  isRoleAtLeast
} from "./config";

export const permissionRouter = router({
  /**
   * 获取当前用户的权限列表
   */
  getMyPermissions: protectedProcedure.query(({ ctx }) => {
    const userRole = (ctx.user.role || 'user') as UserRole;
    return {
      role: userRole,
      permissions: getUserPermissions(userRole),
    };
  }),

  /**
   * 检查当前用户是否有指定权限
   */
  checkPermission: protectedProcedure
    .input(z.object({
      permission: z.string(),
    }))
    .query(({ ctx, input }) => {
      const userRole = (ctx.user.role || 'user') as UserRole;
      return {
        hasPermission: hasPermission(userRole, input.permission as Permission),
      };
    }),

  /**
   * 检查当前用户是否可以访问指定页面
   */
  checkPageAccess: protectedProcedure
    .input(z.object({
      pagePath: z.string(),
    }))
    .query(({ ctx, input }) => {
      const userRole = (ctx.user.role || 'user') as UserRole;
      const pageConfig = HUB_PAGE_PERMISSIONS[input.pagePath];
      
      return {
        canAccess: canAccessPage(userRole, input.pagePath),
        pageConfig: pageConfig ? {
          minRole: pageConfig.minRole,
          requiredPermissions: pageConfig.requiredPermissions,
          description: pageConfig.description,
        } : null,
      };
    }),

  /**
   * 获取所有页面权限配置（管理员）
   */
  getAllPagePermissions: adminProcedure.query(() => {
    return Object.entries(HUB_PAGE_PERMISSIONS).map(([path, config]) => ({
      path,
      ...config,
    }));
  }),

  /**
   * 获取所有角色权限配置（管理员）
   */
  getAllRolePermissions: adminProcedure.query(() => {
    return Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({
      role,
      permissions,
      permissionCount: permissions.length,
    }));
  }),

  /**
   * 获取可访问的菜单项
   */
  getAccessibleMenuItems: protectedProcedure.query(({ ctx }) => {
    const userRole = (ctx.user.role || 'user') as UserRole;
    
    const accessiblePages = Object.entries(HUB_PAGE_PERMISSIONS)
      .filter(([path]) => canAccessPage(userRole, path))
      .map(([path, config]) => ({
        path,
        description: config.description,
      }));
    
    return {
      role: userRole,
      accessiblePages,
    };
  }),

  /**
   * 检查角色层级
   */
  checkRoleLevel: protectedProcedure
    .input(z.object({
      requiredRole: z.enum(['admin', 'manager', 'user', 'viewer']),
    }))
    .query(({ ctx, input }) => {
      const userRole = (ctx.user.role || 'user') as UserRole;
      return {
        hasRequiredRole: isRoleAtLeast(userRole, input.requiredRole),
        currentRole: userRole,
        requiredRole: input.requiredRole,
      };
    }),
});
