/**
 * 权限管理服务
 * 处理所有权限相关的业务逻辑
 */

import { TRPCError } from '@trpc/server';
import { requireDb } from '../utils/db-helpers';
import {
  roles,
  permissions,
  rolePermissions,
  dataScopes,
  permissionAuditLogs,
  temporaryPermissions,
  qualificationCertificates,
  userPermissions,
  permissionBlacklist,
} from '../../drizzle/schema';
// Import userRoles from permission-schema directly — schema.ts exports a different
// userRoles mapped to the old "user_roles" table (integer IDs, smallint is_active).
// The RBAC system uses "grt_user_roles" (varchar user_id, boolean is_active).
import { userRoles } from '../../drizzle/permission-schema';
import { eq, and, or, gte, lte, inArray, isNull, sql } from 'drizzle-orm';

/**
 * 权限服务类
 */
export class PermissionService {
  /**
   * 检查用户是否拥有特定权限
   */
  async checkPermission(userId: string, permissionCode: string): Promise<boolean> {
    const db: any = await requireDb();

    // 检查用户是否在黑名单中
    const isBlacklisted = await db
      .select()
      .from(permissionBlacklist)
      .where(
        and(
          eq(permissionBlacklist.blacklistValue, userId),
          eq(permissionBlacklist.blacklistType, 'user'),
          eq(permissionBlacklist.isActive, true as any),
          or(
            isNull(permissionBlacklist.endDate),
            gte(permissionBlacklist.endDate, sql`now()`)
          )
        )
      )
      .limit(1);

    if (isBlacklisted.length > 0) {
      return false;
    }

    // 获取用户的所有角色
    const userRoleRecords = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId as any),
          eq(userRoles.isActive, true as any),
          lte(userRoles.startDate, sql`now()`),
          or(
            isNull(userRoles.endDate),
            gte(userRoles.endDate, sql`now()`)
          )
        )
      )
      .limit(1000);

    const roleIds = userRoleRecords.map((r: any) => r.roleId);

    if (roleIds.length === 0) {
      return false;
    }

    // 获取权限ID
    const permissionRecord = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.code, permissionCode))
      .limit(1);

    if (permissionRecord.length === 0) {
      return false;
    }

    const permissionId = permissionRecord[0].id;

    // 检查用户的任何角色是否拥有该权限
    const hasPermission = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          inArray(rolePermissions.roleId, roleIds as any),
          eq(rolePermissions.permissionId, permissionId)
        )
      )
      .limit(1);

    if (hasPermission.length > 0) {
      return true;
    }

    // 检查临时权限
    const tempPermission = await db
      .select()
      .from(temporaryPermissions)
      .where(
        and(
          eq(temporaryPermissions.userId, userId),
          eq(temporaryPermissions.permissionId, permissionId),
          eq(temporaryPermissions.status, 'approved' as any),
          lte(temporaryPermissions.startDate, sql`now()`),
          gte(temporaryPermissions.endDate, sql`now()`)
        )
      )
      .limit(1);

    return tempPermission.length > 0;
  }

  /**
   * 检查用户是否拥有特定角色
   */
  async checkRole(userId: string, roleName: string): Promise<boolean> {
    const db: any = await requireDb();

    const roleRecord = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (roleRecord.length === 0) {
      return false;
    }

    const roleId = roleRecord[0].id;

    const userRole = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId as any),
          eq(userRoles.roleId, roleId as any),
          eq(userRoles.isActive, true as any),
          lte(userRoles.startDate, sql`now()`),
          or(
            isNull(userRoles.endDate),
            gte(userRoles.endDate, sql`now()`)
          )
        )
      )
      .limit(1);

    return userRole.length > 0;
  }

  /**
   * 获取用户的所有权限
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const db: any = await requireDb();

    // 获取用户的所有角色
    const userRoleRecords = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId as any),
          eq(userRoles.isActive, true as any),
          lte(userRoles.startDate, sql`now()`),
          or(
            isNull(userRoles.endDate),
            gte(userRoles.endDate, sql`now()`)
          )
        )
      )
      .limit(1000);

    const roleIds = userRoleRecords.map((r: any) => r.roleId);

    if (roleIds.length === 0) {
      return [];
    }

    // 获取这些角色的所有权限
    const rolePerms = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(inArray(rolePermissions.roleId, roleIds as any))
      .limit(1000);

    const permissionIds = rolePerms.map((p: any) => p.permissionId);

    if (permissionIds.length === 0) {
      return [];
    }

    // 获取权限编码
    const perms = await db
      .select({ code: permissions.code })
      .from(permissions)
      .where(inArray(permissions.id, permissionIds as any))
      .limit(1000);

    return perms.map((p: any) => p.code);
  }

  /**
   * 获取用户的数据范围
   */
  async getUserDataScope(userId: string): Promise<{
    scopeType: string;
    allowedDepartments?: string[];
    allowedTeams?: string[];
    allowedProjects?: string[];
    allowedCustomers?: string[];
  } | null> {
    const db: any = await requireDb();

    const scope = await db
      .select()
      .from(dataScopes)
      .where(
        and(
          eq(dataScopes.userId, userId),
          eq(dataScopes.isActive, true as any)
        )
      )
      .limit(1);

    if (scope.length === 0) {
      return null;
    }

    const s: any = scope[0];
    return {
      scopeType: s.scopeType,
      allowedDepartments: s.allowedDepartments as string[] | undefined,
      allowedTeams: s.allowedTeams as string[] | undefined,
      allowedProjects: s.allowedProjects as string[] | undefined,
      allowedCustomers: s.allowedCustomers as string[] | undefined,
    };
  }

  /**
   * 分配权限给用户
   */
  async grantPermissionToUser(
    userId: string,
    permissionCode: string,
    operatorId: string,
    reason?: string
  ): Promise<void> {
    const db: any = await requireDb();

    // 获取权限ID
    const permissionRecord = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.code, permissionCode))
      .limit(1);

    if (permissionRecord.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Permission not found',
      });
    }

    const permissionId = permissionRecord[0].id;

    // 创建临时权限
    await db.insert(temporaryPermissions).values({
      userId,
      permissionId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时
      reason,
      approvedBy: operatorId,
      approvalDate: new Date(),
      status: 'approved',
    });

    // 记录审计日志
    await this.logAuditEvent(
      operatorId,
      'grant_permission',
      userId,
      null as any,
      permissionId,
      'success',
      reason
    );
  }

  /**
   * 撤销用户权限
   */
  async revokePermissionFromUser(
    userId: string,
    permissionCode: string,
    operatorId: string,
    reason?: string
  ): Promise<void> {
    const db: any = await requireDb();

    // 获取权限ID
    const permissionRecord = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.code, permissionCode))
      .limit(1);

    if (permissionRecord.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Permission not found',
      });
    }

    const permissionId = permissionRecord[0].id;

    // 撤销临时权限
    await db
      .update(temporaryPermissions)
      .set({ status: 'revoked' } as any)
      .where(
        and(
          eq(temporaryPermissions.userId, userId),
          eq(temporaryPermissions.permissionId, permissionId),
          eq(temporaryPermissions.status, 'approved' as any)
        )
      );

    // 记录审计日志
    await this.logAuditEvent(
      operatorId,
      'revoke_permission',
      userId,
      null as any,
      permissionId,
      'success',
      reason
    );
  }

  /**
   * 分配角色给用户
   */
  async assignRoleToUser(
    userId: string,
    roleName: string,
    operatorId: string,
    endDate?: Date
  ): Promise<void> {
    const db: any = await requireDb();

    // 获取角色ID
    const roleRecord = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (roleRecord.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Role not found',
      });
    }

    const roleId = roleRecord[0].id;

    // 检查是否已经分配
    const existing = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId as any),
          eq(userRoles.roleId, roleId as any)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User already has this role',
      });
    }

    // 分配角色
    await db.insert(userRoles).values({
      userId,
      roleId,
      endDate,
      isActive: true,
    } as any);

    // 记录审计日志
    await this.logAuditEvent(
      operatorId,
      'assign_role',
      userId,
      roleId as any,
      undefined,
      'success'
    );
  }

  /**
   * 分配角色给用户 (by role ID directly)
   */
  async assignRoleToUserById(
    userId: string,
    roleId: number,
    operatorId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    const db: any = await requireDb();

    // 检查是否已经分配
    const existing = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId as any),
          eq(userRoles.roleId, roleId as any),
          eq(userRoles.isActive, true as any)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User already has this role',
      });
    }

    // 分配角色
    await db.insert(userRoles).values({
      userId,
      roleId,
      startDate: startDate || new Date(),
      endDate,
      isActive: true,
    } as any);

    // 记录审计日志
    await this.logAuditEvent(
      operatorId,
      'assign_role',
      userId,
      roleId as any,
      undefined,
      'success'
    );
  }

  /**
   * 撤销用户角色
   */
  async revokeRoleFromUser(
    userId: string,
    roleName: string,
    operatorId: string
  ): Promise<void> {
    const db: any = await requireDb();

    // 获取角色ID
    const roleRecord = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (roleRecord.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Role not found',
      });
    }

    const roleId = roleRecord[0].id;

    // 撤销角色
    await db
      .update(userRoles)
      .set({ isActive: false } as any)
      .where(
        and(
          eq(userRoles.userId, userId as any),
          eq(userRoles.roleId, roleId as any)
        )
      );

    // 记录审计日志
    await this.logAuditEvent(
      operatorId,
      'revoke_role',
      userId,
      roleId as any,
      undefined,
      'success'
    );
  }

  /**
   * 记录审计日志
   */
  async logAuditEvent(
    operatorId: string,
    action: string,
    targetUserId?: string,
    targetRoleId?: number,
    targetPermissionId?: number,
    result: 'success' | 'denied' | 'error' = 'success',
    reason?: string
  ): Promise<void> {
    const db: any = await requireDb();

    const actionTypeMap: Record<string, unknown> = {
      'grant_permission': 'grant_permission',
      'revoke_permission': 'revoke_permission',
      'create_role': 'create_role',
      'update_role': 'update_role',
      'delete_role': 'delete_role',
      'assign_role': 'assign_role',
      'revoke_role': 'revoke_role',
      'access_denied': 'access_denied',
      'data_access': 'data_access',
    };

    await db.insert(permissionAuditLogs).values({
      operatorId,
      action,
      actionType: actionTypeMap[action] || 'data_access',
      targetUserId,
      targetRoleId,
      targetPermissionId,
      result,
      reason,
    } as any);
  }

  /**
   * 检查用户是否拥有认证
   */
  async checkCertification(
    userId: string,
    certificateCode: string
  ): Promise<boolean> {
    const db: any = await requireDb();

    const cert = await db
      .select()
      .from(qualificationCertificates)
      .where(
        and(
          eq((qualificationCertificates as any).userId, userId),
          eq(qualificationCertificates.certificateCode, certificateCode),
          eq((qualificationCertificates as any).status, 'active'),
          or(
            isNull(qualificationCertificates.expiryDate),
            gte(qualificationCertificates.expiryDate, sql`now()`)
          )
        )
      )
      .limit(1);

    return cert.length > 0;
  }

  /**
   * 获取用户的所有认证
   */
  async getUserCertifications(userId: string): Promise<
    Array<{
      code: string;
      name: string;
      level?: string;
      expiryDate?: Date;
    }>
  > {
    const db: any = await requireDb();

    const certs = await db
      .select({
        code: qualificationCertificates.certificateCode,
        name: qualificationCertificates.certificateName,
        level: qualificationCertificates.certificateLevel,
        expiryDate: qualificationCertificates.expiryDate,
      })
      .from(qualificationCertificates)
      .where(
        and(
          eq((qualificationCertificates as any).userId, userId),
          eq((qualificationCertificates as any).status, 'active')
        )
      )
      .limit(1000);

    return certs as any;
  }
}

/**
 * 导出单例
 */
export const permissionService = new PermissionService();
