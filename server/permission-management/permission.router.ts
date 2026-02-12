/**
 * 权限管理tRPC路由
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { permissionService } from './permission.service';
import { TRPCError } from '@trpc/server';
import { createRoleMiddleware } from './permission.middleware';
import { requireDb } from '../utils/db-helpers';
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  qualificationCertificates,
  permissionAuditLogs,
} from '../../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

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
      const hasPermission = await permissionService.checkPermission(
        String(ctx.user.id),
        input.permissionCode
      );
      return { hasPermission };
    }),

  /**
   * 获取用户所有权限
   */
  getUserPermissions: protectedProcedure.query(async ({ ctx }) => {
    const permissions = await permissionService.getUserPermissions(String(ctx.user.id));
    return { permissions };
  }),

  /**
   * 获取用户数据范围
   */
  getUserDataScope: protectedProcedure.query(async ({ ctx }) => {
    const dataScope = await permissionService.getUserDataScope(String(ctx.user.id));
    return { dataScope };
  }),

  /**
   * 获取用户认证列表
   */
  getUserCertifications: protectedProcedure.query(async ({ ctx }) => {
    const certifications = await permissionService.getUserCertifications(
      String(ctx.user.id)
    );
    return { certifications };
  }),

  /**
   * 管理员：获取所有角色
   */
  getAllRoles: protectedProcedure
    .use(createRoleMiddleware(['admin']))
    .query(async () => {
      const db = await requireDb();
      const allRoles = await (db as any).select().from(roles);
      return { roles: allRoles };
    }),

  /**
   * 管理员：创建角色
   */
  createRole: protectedProcedure
    .use(createRoleMiddleware(['admin']))
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
      const existing = await (db as any)
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
      const result = await (db as any).insert(roles).values({
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        defaultDataScope: input.defaultDataScope,
        roleType: 'custom',
      });

      // 记录审计日志
      await permissionService.logAuditEvent(
        String(ctx.user.id),
        'create_role',
        undefined,
        undefined,
        undefined,
        'success'
      );

      return { roleId: result.insertId };
    }),

  /**
   * 管理员：编辑角色
   */
  updateRole: protectedProcedure
    .use(createRoleMiddleware(['admin']))
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

      await (db as any)
        .update(roles)
        .set({
          displayName: input.displayName,
          description: input.description,
          isActive: input.isActive,
        })
        .where(eq(roles.id, input.roleId));

      // 记录审计日志
      await permissionService.logAuditEvent(
        String(ctx.user.id),
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
  deleteRole: protectedProcedure
    .use(createRoleMiddleware(['admin']))
    .input(z.object({ roleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // 检查是否有用户拥有此角色
      const userCount = await (db as any)
        .select()
        .from(userRoles)
        .where(eq(userRoles.roleId, input.roleId as any));

      if (userCount.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete role with assigned users',
        });
      }

      // 删除角色权限关联
      await (db as any)
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, input.roleId));

      // 删除角色
      await (db as any).delete(roles).where(eq(roles.id, input.roleId));

      // 记录审计日志
      await permissionService.logAuditEvent(
        String(ctx.user.id),
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
    .use(createRoleMiddleware(['admin']))
    .query(async () => {
      const db = await requireDb();
      const allPermissions = await (db as any).select().from(permissions);
      return { permissions: allPermissions };
    }),

  /**
   * 管理员：分配权限给角色
   */
  assignPermissionToRole: protectedProcedure
    .use(createRoleMiddleware(['admin']))
    .input(
      z.object({
        roleId: z.number(),
        permissionIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // 删除现有权限
      await (db as any)
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, input.roleId));

      // 添加新权限
      if (input.permissionIds.length > 0) {
        await (db as any).insert(rolePermissions).values(
          input.permissionIds.map((permissionId) => ({
            roleId: input.roleId,
            permissionId,
          }))
        );
      }

      // 记录审计日志
      await permissionService.logAuditEvent(
        String(ctx.user.id),
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
    .use(createRoleMiddleware(['admin']))
    .input(
      z.object({
        userId: z.string(),
        roleId: z.number(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await permissionService.assignRoleToUser(
        input.userId,
        '',
        String(ctx.user.id),
        input.endDate
      );
      return { success: true };
    }),

  /**
   * 管理员：撤销用户角色
   */
  revokeRoleFromUser: protectedProcedure
    .use(createRoleMiddleware(['admin']))
    .input(
      z.object({
        userId: z.string(),
        roleId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      await (db as any)
        .update(userRoles)
        .set({ isActive: false } as any)
        .where(
          and(
            eq(userRoles.userId, input.userId as any),
            eq(userRoles.roleId, input.roleId as any)
          )
        );

      // 记录审计日志
      await permissionService.logAuditEvent(
        String(ctx.user.id),
        'revoke_role',
        input.userId,
        input.roleId,
        undefined,
        'success'
      );

      return { success: true };
    }),

  /**
   * 管理员：获取审计日志
   */
  getAuditLogs: protectedProcedure
    .use(createRoleMiddleware(['admin']))
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        userId: z.string().optional(),
        actionType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      let query = (db as any).select().from(permissionAuditLogs);

      if (input.userId) {
        query = query.where(eq(permissionAuditLogs.operatorId, input.userId));
      }

      if (input.actionType) {
        query = query.where(eq(permissionAuditLogs.actionType, input.actionType as any));
      }

      const logs = await query.limit(input.limit).offset(input.offset);
      return { logs };
    }),

  /**
   * 管理员：添加用户认证
   */
  addUserCertification: protectedProcedure
    .use(createRoleMiddleware(['admin']))
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

      await (db as any).insert(qualificationCertificates).values({
        userId: input.userId,
        certificateCode: input.certificateCode,
        certificateName: input.certificateName,
        certificateLevel: input.certificateLevel,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate,
        issuingOrganization: input.issuingOrganization,
        status: 'active',
      } as any);

      // 记录审计日志
      await permissionService.logAuditEvent(
        String(ctx.user.id),
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
  revokeUserCertification: protectedProcedure
    .use(createRoleMiddleware(['admin']))
    .input(
      z.object({
        userId: z.string(),
        certificateCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      await (db as any)
        .update(qualificationCertificates)
        .set({ status: 'revoked' } as any)
        .where(
          and(
            eq((qualificationCertificates as any).userId, input.userId),
            eq(qualificationCertificates.certificateCode, input.certificateCode)
          )
        );

      // 记录审计日志
      await permissionService.logAuditEvent(
        String(ctx.user.id),
        'revoke_permission',
        input.userId,
        undefined,
        undefined,
        'success'
      );

      return { success: true };
    }),
});
