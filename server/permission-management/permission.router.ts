/**
 * RBAC Permission Router — DB-backed source of truth
 *
 * Registered as: appRouter.permission
 * Role: Main RBAC system with full DB persistence.
 *       Manages roles, permissions, user-role assignments, audit logs.
 *       This is the authoritative permission store.
 *
 * Related routers:
 *   - rolePermission (server/permissions/) = fast config-based checks (read-only cache layer)
 *   - permissionManagement (server/routers/) = admin collaboration features + AI suggestions
 */

import { z } from 'zod';
import {protectedProcedure, router, requirePermission} from '../_core/trpc';
import { permissionService } from './permission.service';
import { TRPCError } from '@trpc/server';
import { createRoleMiddleware } from './permission.middleware';
import { requireDb } from '../utils/db-helpers';
import {
  roles,
  permissions,
  rolePermissions,
  qualificationCertificates,
  permissionAuditLogs,
} from '../../drizzle/schema';
// Import userRoles from permission-schema — schema.ts exports a different
// userRoles mapped to the old "user_roles" table (integer IDs, smallint is_active).
// The RBAC system uses "grt_user_roles" (varchar user_id, boolean is_active).
import { userRoles } from '../../drizzle/permission-schema';
import { eq, and, inArray, gte, lte, isNull, or, desc, sql, type SQL } from 'drizzle-orm';

/**
 * 权限管理路由
 */
export const permissionRouter = router({
  /**
   * 检查用户权限
   */
  checkPermission: protectedProcedure
    .input(z.object({ permissionCode: z.string() }))
    .query(async ({ ctx, input }) => {
      // Admin bypass: users with role='admin' in users table have all permissions
      if (ctx.user!.role === 'admin') {
        return { hasPermission: true };
      }
      const hasPermission = await permissionService.checkPermission(
        ctx.user!.openId || String(ctx.user!.id),
        input.permissionCode
      );
      return { hasPermission };
    }),

  /**
   * 获取用户所有权限
   */
  getUserPermissions: protectedProcedure.query(async ({ ctx }) => {
    const permissions = await permissionService.getUserPermissions(ctx.user!.openId || String(ctx.user!.id));
    return { permissions };
  }),

  /**
   * 获取用户数据范围
   */
  getUserDataScope: protectedProcedure.query(async ({ ctx }) => {
    const dataScope = await permissionService.getUserDataScope(ctx.user!.openId || String(ctx.user!.id));
    return { dataScope };
  }),

  /**
   * 获取用户认证列表
   */
  getUserCertifications: protectedProcedure.query(async ({ ctx }) => {
    const certifications = await permissionService.getUserCertifications(
      ctx.user!.openId || String(ctx.user!.id)
    );
    return { certifications };
  }),

  /**
   * 管理员：获取所有角色
   */
  getAllRoles: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .query(async () => {
      const db = await requireDb();
      const allRoles = await db.select().from(roles).limit(1000);
      return { roles: allRoles };
    }),

  /**
   * 管理员：创建角色
   */
  createRole: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(
      z.object({
        name: z.string().min(1),
        displayName: z.string().min(1),
        description: z.string().optional(),
        defaultDataScope: z.enum([
          'global',
          'department',
          'team',
          'self',
          'project',
          'customer',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // 检查角色名称是否已存在
      const existing = await db
        .select()
        .from(roles)
        .where(eq(roles.name, input.name))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Role name already exists',
        });
      }

      // 创建角色
      const result = await db.insert(roles).values({
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        defaultDataScope: input.defaultDataScope,
        roleType: 'custom',
      }).returning({ id: roles.id });

      // 记录审计日志
      await permissionService.logAuditEvent(
        ctx.user!.openId || String(ctx.user!.id),
        'create_role',
        undefined,
        result[0]?.id,
        undefined,
        'success'
      );

      return { roleId: result[0]?.id };
    }),

  /**
   * 管理员：编辑角色
   */
  updateRole: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(
      z.object({
        roleId: z.number(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      const updateData: Record<string, unknown> = {};
      if (input.displayName !== undefined) updateData.displayName = input.displayName;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(roles)
          .set(updateData)
          .where(eq(roles.id, input.roleId));
      }

      // 记录审计日志
      await permissionService.logAuditEvent(
        ctx.user!.openId || String(ctx.user!.id),
        'update_role',
        undefined,
        input.roleId,
        undefined,
        'success'
      );

      return { success: true };
    }),

  /**
   * 管理员：删除角色
   */
  deleteRole: requirePermission('system:permissions:assign')
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(z.object({ roleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // 检查是否有用户拥有此角色
      const userCount = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.roleId, input.roleId))
        .limit(1000);

      if (userCount.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete role with assigned users',
        });
      }

      // 删除角色权限关联
      await db
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, input.roleId));

      // 删除角色
      await db.delete(roles).where(eq(roles.id, input.roleId));

      // 记录审计日志
      await permissionService.logAuditEvent(
        ctx.user!.openId || String(ctx.user!.id),
        'delete_role',
        undefined,
        input.roleId,
        undefined,
        'success'
      );

      return { success: true };
    }),

  /**
   * 管理员：获取所有权限
   */
  getAllPermissions: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .query(async () => {
      const db = await requireDb();
      const allPermissions = await db.select().from(permissions).limit(1000);
      return { permissions: allPermissions };
    }),

  /**
   * 管理员：分配权限给角色
   */
  assignPermissionToRole: requirePermission('system:permissions:assign')
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(
      z.object({
        roleId: z.number(),
        permissionIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // 删除现有权限
      await db
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, input.roleId));

      // 添加新权限
      if (input.permissionIds.length > 0) {
        await db.insert(rolePermissions).values(
          input.permissionIds.map((permissionId) => ({
            roleId: input.roleId,
            permissionId,
          }))
        );
      }

      // 记录审计日志
      await permissionService.logAuditEvent(
        ctx.user!.openId || String(ctx.user!.id),
        'grant_permission',
        undefined,
        input.roleId,
        undefined,
        'success'
      );

      return { success: true };
    }),

  /**
   * 管理员：分配角色给用户
   */
  assignRoleToUser: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(
      z.object({
        userId: z.string(),
        roleId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await permissionService.assignRoleToUserById(
        input.userId,
        input.roleId,
        ctx.user!.openId || String(ctx.user!.id),
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined
      );
      return { success: true };
    }),

  /**
   * 管理员：撤销用户角色
   */
  revokeRoleFromUser: requirePermission('system:permissions:assign')
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(
      z.object({
        userId: z.string(),
        roleId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // Verify the record exists before revoking
      const existing = await db
        .select({ id: userRoles.id })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.roleId, input.roleId),
            eq(userRoles.isActive, true)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Active user role assignment not found',
        });
      }

      await db
        .update(userRoles)
        .set({ isActive: false })
        .where(
          and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.roleId, input.roleId)
          )
        );

      // 记录审计日志
      await permissionService.logAuditEvent(
        ctx.user!.openId || String(ctx.user!.id),
        'revoke_role',
        input.userId,
        input.roleId,
        undefined,
        'success'
      );

      return { success: true };
    }),

  /**
   * 管理员：获取用户的角色分配
   */
  getUserRoles: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const records = await db
        .select({
          id: userRoles.id,
          userId: userRoles.userId,
          roleId: userRoles.roleId,
          startDate: userRoles.startDate,
          endDate: userRoles.endDate,
          isActive: userRoles.isActive,
          createdAt: userRoles.createdAt,
          roleName: roles.name,
          roleDisplayName: roles.displayName,
          roleLevel: roles.level,
          roleCategory: roles.category,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, input.userId));
      return { userRoles: records };
    }),

  /**
   * 管理员：获取角色的权限列表
   */
  getRolePermissions: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(z.object({ roleId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const records = await db
        .select({
          permissionId: rolePermissions.permissionId,
          roleId: rolePermissions.roleId,
          code: permissions.code,
          name: permissions.name,
          description: permissions.description,
          module: permissions.module,
          category: permissions.category,
          action: permissions.action,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, input.roleId));
      return { permissions: records };
    }),

  /**
   * 管理员：获取每个角色的活跃用户数
   */
  getRoleMemberCounts: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .query(async () => {
      const db = await requireDb();
      const records = await db
        .select({
          roleId: userRoles.roleId,
          count: sql<number>`count(*)::int`,
        })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.isActive, true),
            lte(userRoles.startDate, sql`now()`),
            or(
              isNull(userRoles.endDate),
              gte(userRoles.endDate, sql`now()`)
            )
          )
        )
        .groupBy(userRoles.roleId);
      const counts: Record<number, number> = {};
      for (const r of records) {
        counts[r.roleId] = r.count;
      }
      return { counts };
    }),

  /**
   * 管理员：获取用户的有效权限（从所有活跃角色派生）
   */
  getUserEffectivePermissions: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Get active roles
      const activeRoles = await db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.isActive, true),
            lte(userRoles.startDate, sql`now()`),
            or(
              isNull(userRoles.endDate),
              gte(userRoles.endDate, sql`now()`)
            )
          )
        )
        .limit(1000);

      const roleIds = activeRoles.map((r: { roleId: number }) => r.roleId);
      if (roleIds.length === 0) return { permissions: [] };

      // Get all permissions from these roles
      const perms = await db
        .select({
          id: permissions.id,
          code: permissions.code,
          name: permissions.name,
          description: permissions.description,
          module: permissions.module,
          category: permissions.category,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(inArray(rolePermissions.roleId, roleIds));

      // Deduplicate by permission id
      const seen = new Set<number>();
      const unique = perms.filter((p: { id: number; code: string; name: string; description: string | null; module: string; category: string }) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      return { permissions: unique };
    }),

  /**
   * 管理员：获取所有角色-权限映射
   */
  getAllRolePermissionMappings: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .query(async () => {
      const db = await requireDb();
      const records = await db
        .select({
          roleId: rolePermissions.roleId,
          permissionId: rolePermissions.permissionId,
        })
        .from(rolePermissions)
        .limit(1000);
      return { mappings: records };
    }),

  /**
   * 管理员：获取审计日志
   */
  getAuditLogs: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        userId: z.string().optional(),
        actionType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      const conditions: SQL[] = [];

      if (input.userId) {
        conditions.push(eq(permissionAuditLogs.operatorId, input.userId));
      }

      if (input.actionType) {
        conditions.push(eq(permissionAuditLogs.actionType, input.actionType));
      }

      if (input.startDate) {
        conditions.push(gte(permissionAuditLogs.createdAt, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(permissionAuditLogs.createdAt, new Date(input.endDate)));
      }

      let query = db
        .select()
        .from(permissionAuditLogs)
        .orderBy(desc(permissionAuditLogs.createdAt));

      if (conditions.length > 0) {
// @ts-ignore missing property
        query = query.where(and(...conditions));
      }

      const logs = await query.limit(input.limit).offset(input.offset);
      return { logs };
    }),

  /**
   * 管理员：添加用户认证
   */
  addUserCertification: protectedProcedure
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(
      z.object({
        userId: z.string(),
        certificateCode: z.string(),
        certificateName: z.string(),
        certificateLevel: z.string().optional(),
        issueDate: z.date(),
        expiryDate: z.date().optional(),
        issuingOrganization: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      await (db.insert(qualificationCertificates) as any).values({
        userId: input.userId,
        certificateCode: input.certificateCode,
        certificateName: input.certificateName,
        certificateLevel: input.certificateLevel,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate,
        issuingOrganization: input.issuingOrganization,
        status: 'active',
      });

      // 记录审计日志
      await permissionService.logAuditEvent(
        ctx.user!.openId || String(ctx.user!.id),
        'grant_permission',
        input.userId,
        undefined,
        undefined,
        'success'
      );

      return { success: true };
    }),

  /**
   * 管理员：撤销用户认证
   */
  revokeUserCertification: requirePermission('system:permissions:assign')
    .use(createRoleMiddleware(['admin', 'super_admin']))
    .input(
      z.object({
        userId: z.string(),
        certificateCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      await db
        .update(qualificationCertificates)
        .set({ status: 'revoked' } as Record<string, unknown>)
        .where(
          and(
            eq((qualificationCertificates as unknown as { userId: typeof qualificationCertificates.certificateCode }).userId, input.userId),
            eq(qualificationCertificates.certificateCode, input.certificateCode)
          )
        );

      // 记录审计日志
      await permissionService.logAuditEvent(
        ctx.user!.openId || String(ctx.user!.id),
        'revoke_permission',
        input.userId,
        undefined,
        undefined,
        'success'
      );

      return { success: true };
    }),
});
